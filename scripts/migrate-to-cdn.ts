/**
 * 迁移历史数据到七牛云 CDN
 *
 * 用法：
 *   1. SSH 上服务器
 *   2. cd /home/myecs/diary-app
 *   3. npx tsx scripts/migrate-to-cdn.ts
 *
 * 迁移内容：
 *   - 用户头像 → public/diaryRecord/{userId}/avatars/xxx.jpg
 *   - 日记照片 → public/diaryRecord/{userId}/photos/xxx.jpg
 */

import { PrismaClient } from "../src/generated/prisma/client";
import qiniu from "qiniu";
import { readFileSync, existsSync } from "fs";
import { resolve, join } from "path";

// ===================== 配置 =====================
const QINIU_AK = process.env.QINIU_ACCESS_KEY!;
const QINIU_SK = process.env.QINIU_SECRET_KEY!;
const QINIU_BUCKET = process.env.QINIU_BUCKET!;
const QINIU_CDN_DOMAIN = "https://cdn.rfcode.top";
const SERVER_UPLOAD_DIR = resolve(process.cwd(), "public"); // 服务器文件根目录

// ===================== 七牛上传 =====================
const mac = new qiniu.auth.digest.Mac(QINIU_AK, QINIU_SK);
const config = new qiniu.conf.Config();
config.useHttpsDomain = true;
// 华南 z2
config.zone = qiniu.zone.Zone_z2;

function uploadToQiniu(localPath: string, key: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const formUploader = new qiniu.form_up.FormUploader(config);
    const putExtra = new qiniu.form_up.PutExtra();
    const putPolicy = new qiniu.rs.PutPolicy({
      scope: `${QINIU_BUCKET}:${key}`,
    });
    const token = putPolicy.uploadToken(mac);

    formUploader.putFile(token, key, localPath, putExtra, (err, body) => {
      if (err) return reject(err);
      if (body?.key) {
        resolve(`${QINIU_CDN_DOMAIN}/${body.key}`);
      } else {
        reject(new Error("上传返回缺少 key"));
      }
    });
  });
}

// ===================== 主流程 =====================
async function migrate() {
  const prisma = new PrismaClient();
  console.log("开始迁移数据到七牛 CDN...\n");

  // ---------- 1. 迁移头像 ----------
  console.log("=== 1/2 迁移用户头像 ===");
  const users = await prisma.user.findMany({
    where: { avatar: { not: null } },
  });
  console.log(`  共 ${users.length} 个用户有头像`);

  let avatarOk = 0;
  for (const user of users) {
    if (!user.avatar) continue;
    const oldUrl = user.avatar;

    // 从 URL 中提取文件名：/uploads/uuid.jpg → uuid.jpg
    const filename = oldUrl.replace(/^\/uploads\//, "");
    if (!filename || filename === oldUrl) {
      console.log(`  ⏭️  用户 ${user.id} URL 格式异常，跳过：${oldUrl}`);
      continue;
    }

    const serverPath = join(SERVER_UPLOAD_DIR, "uploads", filename);
    if (!existsSync(serverPath)) {
      console.log(`  ⚠️  用户 ${user.id} 文件不存在（可能已被删）：${serverPath}`);
      continue;
    }

    const ext = filename.split(".").pop() || "jpg";
    const key = `public/diaryRecord/${user.id}/avatars/${filename}`;

    try {
      const cdnUrl = await uploadToQiniu(serverPath, key);
      await prisma.user.update({
        where: { id: user.id },
        data: { avatar: cdnUrl },
      });
      avatarOk++;
      console.log(`  ✅ 用户 ${user.id}: ${oldUrl} → ${cdnUrl}`);
    } catch (err) {
      console.error(`  ❌ 用户 ${user.id} 上传失败：`, err);
    }
  }
  console.log(`  头像迁移完成：${avatarOk}/${users.length}\n`);

  // ---------- 2. 迁移照片 ----------
  console.log("=== 2/2 迁移日记照片 ===");
  const photos = await prisma.photo.findMany({
    include: { visit: { select: { userId: true } } },
  });
  console.log(`  共 ${photos.length} 张照片`);

  let photoOk = 0;
  for (const photo of photos) {
    const oldUrl = photo.url;
    const userId = photo.visit.userId;

    // 从 URL 中提取文件名
    const filename = oldUrl.replace(/^\/uploads\//, "");
    if (!filename || filename === oldUrl) {
      console.log(`  ⏭️  照片 ${photo.id} URL 格式异常，跳过：${oldUrl}`);
      continue;
    }

    const serverPath = join(SERVER_UPLOAD_DIR, "uploads", filename);
    if (!existsSync(serverPath)) {
      console.log(`  ⚠️  照片 ${photo.id} 文件不存在：${filename}`);
      continue;
    }

    const key = `public/diaryRecord/${userId}/photos/${filename}`;

    try {
      const cdnUrl = await uploadToQiniu(serverPath, key);
      await prisma.photo.update({
        where: { id: photo.id },
        data: { url: cdnUrl },
      });
      photoOk++;
      console.log(`  ✅ 照片 ${photo.id}: ${cdnUrl}`);
    } catch (err) {
      console.error(`  ❌ 照片 ${photo.id} 上传失败：`, err);
    }
  }
  console.log(`  照片迁移完成：${photoOk}/${photos.length}\n`);

  // ---------- 结果 ----------
  console.log("===== 迁移总结 =====");
  console.log(`头像迁移：${avatarOk}/${users.length}`);
  console.log(`照片迁移：${photoOk}/${photos.length}`);
  console.log("==================");

  await prisma.$disconnect();
}

migrate().catch((err) => {
  console.error("迁移失败：", err);
  process.exit(1);
});
