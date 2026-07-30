/**
 * 数据迁移脚本：将 photos 表的数据迁移到 visits.photos JSON 字段
 *
 * 背景：之前每张照片是一条独立的数据库记录（photos 表），
 * 现在改为 JSON 数组直接存在 visits 表的 photos 字段里。
 *
 * 此脚本做的事：
 * 1. 给 visits 表新增 photos 列（如果还没有的话）
 * 2. 从旧 photos 表读取所有照片记录
 * 3. 按 visit_id 分组，URL 按创建顺序排列
 * 4. 更新 visits 表的 photos 字段为 JSON 数组
 * 5. 备份旧 photos 表为 photos_backup
 *
 * 用法：
 *   npx tsx scripts/migrate-photos-to-json.ts              # 正式执行
 *   npx tsx scripts/migrate-photos-to-json.ts --dry-run    # 只预览不写入
 *
 * 要求：需要在 .env 配置 DATABASE_URL
 */

import "dotenv/config";
import mariadb from "mariadb";

const dryRun = process.argv.includes("--dry-run");

function parseUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port) || 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1),
  };
}

async function migrate() {
  const cfg = parseUrl(process.env.DATABASE_URL!);
  const conn = await mariadb.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
  });

  console.log("========== 照片迁移：photos 表 → visits.photos JSON ==========\n");
  if (dryRun) console.log("🔍 Dry-run 模式，只预览不写入\n");

  /* ===== 1. 检查旧 photos 表 ===== */
  const [tableCheck] = await conn.query(
    "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = 'photos'",
    [cfg.database]
  );
  if (!(tableCheck as any).count) {
    console.log("✅ 旧 photos 表不存在，数据库已是新结构。");
    await conn.end();
    return;
  }

  /* ===== 2. 给 visits 表加 photos 列（如果没有的话） ===== */
  const [colCheck] = await conn.query(
    "SELECT COUNT(*) as count FROM information_schema.columns WHERE table_schema = ? AND table_name = 'visits' AND column_name = 'photos'",
    [cfg.database]
  );
  if (!(colCheck as any).count) {
    console.log("📦 visits 表缺少 photos 列 → 新增列...");
    await conn.query("ALTER TABLE visits ADD COLUMN photos TEXT");
    console.log("   ✅ 新增 photos 列完成\n");
  } else {
    console.log("✅ visits.photos 列已存在\n");
  }

  /* ===== 3. 查询旧照片数据 ===== */
  console.log("📸 查询旧 photos 表...");
  const oldPhotos = await conn.query(
    "SELECT id, url, visit_id FROM photos ORDER BY visit_id, id"
  ) as { id: string; url: string; visit_id: string }[];

  console.log(`   共 ${oldPhotos.length} 张照片，涉及 ${new Set(oldPhotos.map((p: any) => p.visit_id)).size} 条记录\n`);

  if (oldPhotos.length === 0) {
    console.log("📭 photos 表为空，直接备份清理。");
    await backupAndDrop(conn, cfg.database);
    await conn.end();
    return;
  }

  /* ===== 4. 按 visit_id 分组 ===== */
  const grouped: Record<string, string[]> = {};
  for (const photo of oldPhotos) {
    if (!grouped[photo.visit_id]) grouped[photo.visit_id] = [];
    grouped[photo.visit_id].push(photo.url);
  }

  /* ===== 5. 预览 + 过滤已有数据 ===== */
  console.log("📋 迁移预览：\n");
  for (const [visitId, urls] of Object.entries(grouped)) {
    const rows = await conn.query("SELECT name, photos FROM visits WHERE id = ?", [visitId]) as { name: string; photos: string }[];
    if (rows.length > 0) {
      const current = (() => {
        try {
          const p = JSON.parse(rows[0].photos || "[]");
          return Array.isArray(p) ? p : [];
        } catch { return []; }
      })();
      if (current.length > 0) {
        console.log(`   ⏭  [${rows[0].name}] 已有 ${current.length} 张，跳过`);
        delete grouped[visitId];
      } else {
        console.log(`   📎 [${rows[0].name}] → ${urls.length} 张`);
      }
    } else {
      console.log(`   ⚠️  记录 ${visitId} 已删除（孤立照片），跳过`);
      delete grouped[visitId];
    }
  }

  const toUpdate = Object.keys(grouped);
  if (toUpdate.length === 0) {
    console.log("\n✅ 无需更新数据，仅备份旧表。\n");
    await backupAndDrop(conn, cfg.database);
    await conn.end();
    return;
  }

  console.log(`\n💾 即将更新 ${toUpdate.length} 条记录...`);

  if (dryRun) {
    console.log("🔍 Dry-run，跳过写入。\n");
  } else {
    for (const [visitId, urls] of Object.entries(grouped)) {
      await conn.query("UPDATE visits SET photos = ? WHERE id = ?", [JSON.stringify(urls), visitId]);
    }
    console.log("✅ 数据迁移完成！\n");
  }

  /* ===== 6. 备份旧 photos 表 ===== */
  await backupAndDrop(conn, cfg.database);
  await conn.end();
}

async function backupAndDrop(conn: mariadb.Connection, dbName: string) {
  const [backupCheck] = await conn.query(
    "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = 'photos_backup'",
    [dbName]
  );
  const alreadyBackedUp = !!(backupCheck as any).count;

  const [oldCheck] = await conn.query(
    "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = 'photos'",
    [dbName]
  );
  const oldExists = !!(oldCheck as any).count;

  if (!oldExists) {
    console.log("✅ 旧 photos 表已不存在。\n");
    return;
  }

  if (!alreadyBackedUp) {
    console.log("📦 备份旧 photos 表 → photos_backup ...");
    if (!dryRun) {
      await conn.query("RENAME TABLE photos TO photos_backup");
      console.log("   ✅ 备份完成\n");
      console.log("   🗑️  确认无误后删除备份：DROP TABLE IF EXISTS photos_backup;\n");
    } else {
      console.log("   🔍 Dry-run，跳过备份。\n");
    }
  } else {
    if (!dryRun) {
      await conn.query("DROP TABLE IF EXISTS photos");
      console.log("🧹 删除旧 photos 表（已有备份）\n");
    }
  }
}

migrate()
  .catch((e) => {
    console.error("❌ 迁移失败:", e);
    process.exit(1);
  });
