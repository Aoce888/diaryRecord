<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

**重要：每次修改代码后，推荐使用 `.\deploy.ps1` 本地构建部署。也可在服务器执行 `npm run build && pm2 restart diary-app`。**

**内存优化：修改接口/API/路由后，只需执行 `npm run build && pm2 restart diary-app` 即可，无需额外步骤。**
<!-- END:nextjs-agent-rules -->

---

# 吃喝玩乐日记 (diary-app)

## 项目信息

- **访问地址**：https://diary.rfcode.top
- **服务器端口**：3001
- **数据库**：MySQL 8.0 — `diary_db`
- **项目路径**：`/home/myecs/diary-app`
- **仓库地址**：git@github.com:Aoce888/diaryRecord.git

## 技术栈

Next.js 16 + TypeScript + Tailwind CSS + shadcn/ui + Prisma + MySQL

## 变更历史

### 2026-07-31 — 圈子功能

- 新增 `Circle`、`CircleMember` Prisma 模型（`circles` / `circle_members` 表）
- `Visit` 表新增 `is_private` 字段（私密记录仅创建者可见）
- 新增圈子 API：`/api/circles`（创建/列表）、`/api/circles/[id]`（详情/解散）、`/api/circles/join`（邀请码加入）、`/api/circles/lookup`（查圈子）、`/api/circles/[id]/leave`（退出）、`/api/circles/[id]/members`（成员）
- `GET /api/visits` 支持 `scope=me` / `scope=circle` 可见性过滤；私密记录详情页做权限校验
- 小程序：profile 页「圈子」Tab（创建/加入/退出/解散/邀请码复制）、addVisit 页私密开关、首页 feed 改 `scope=circle`
- 部署：`prisma db push` 同步数据库（MySQL 用户无 shadow db 权限，无法用 migrate dev）+ 手动 SCP 部署

### 2026-07-30 — 本地构建部署脚本

- 新增 `deploy.ps1`：本地 `npm run build` → 打包 → SCP 上传 → 服务器解压 + `prisma generate` + `pm2 restart` 一条龙
- 修复：安装 `proxy-agent`（七牛 SDK 缺少依赖）
- 修复：`scripts/migrate-to-cdn.ts` 中 `config.region` → `config.zone`（新版七牛 SDK API）
- 修复：`tsconfig.json` 排除 `scripts/`，工具脚本不再阻塞 App 构建
- 更新 `AGENTS.md` 部署说明为本地构建 + 上传模式
- 部署方式变更：服务器不再执行 `npm run build`（2GB 内存不足）

### 2026-07-29 — 卡片图片点击放大功能

- 新增 `src/components/image-zoom.tsx`：可复用灯箱组件，支持 ESC 关闭、←/→ 键切换、点击背景关闭
- 修改 `src/components/visit-card.tsx`：卡片封面图点击打开放大预览（阻止冒泡，不跳转详情页）
- 修改 `src/app/visit/[id]/page.tsx`：详情页照片画廊点击打开放大预览，多图可左右切换
- 部署：`npm run build && pm2 restart diary-app`

## 常用操作

### 修改代码后重新部署

> 服务器内存不足（2GB），不支持在服务器上执行 `npm run build`，需要用本地构建 + 上传的方式部署。

**本地（Windows）：**

```powershell
# 一条命令全自动完成
.\deploy.ps1
```

流程：
1. 本地 `npm run build`（Turbopack 快速构建）
2. 打包产物（排除 node_modules / .git / .env / 缓存）
3. SCP 上传到服务器
4. 服务器解压 → `npm install` → `npx prisma generate` → `pm2 restart diary-app`

**如需手动在服务器上操作：**

```bash
cd /home/myecs/diary-app
pm2 restart diary-app
pm2 logs diary-app --lines 10
```

### 本地构建 + 远程部署（推荐）

在 Windows 本地构建，避免服务器构建占用大量内存。

```powershell
# Windows PowerShell，在项目根目录执行
.\deploy.ps1
```

**部署流程：**
1. 本地 `npm run build` 构建
2. tar 打包（排除 `node_modules`、`.git`、`.env`、缓存）
3. scp 上传到服务器 `myecs@8.134.102.5:/home/myecs/diary-app/`
4. 服务器自动备份当前版本到 `~/diary-app-backups/`（保留最近 5 份）
5. 解压 + `npm install --omit=dev` + `prisma generate` + `pm2 restart`
6. 健康检查（HTTP 200 确认服务正常）

**回滚：** SSH 到服务器，`ls ~/diary-app-backups/` 找到备份版本恢复。

### 服务器直接部署

```bash
cd /home/myecs/diary-app

# 1. 构建（服务器内存有限，可能 OOM）
npm run build

# 2. 重启 PM2
pm2 restart diary-app

# 3. 查看状态
pm2 logs diary-app --lines 10
```

### PM2 常用命令

```bash
pm2 restart diary-app      # 重启
pm2 stop diary-app         # 停止
pm2 start diary-app        # 启动
pm2 logs diary-app         # 查看日志
pm2 list                   # 查看所有进程
pm2 save                   # 保存当前进程列表
```

### 数据库操作

```bash
cd /home/myecs/diary-app

# 修改 schema 后推送到数据库
npx prisma db push

# 生成 Prisma Client
npx prisma generate

# 运行迁移（需要确认）
npx prisma migrate dev --name 名称

# 打开数据库浏览器
npx prisma studio
```

### Nginx 配置

```bash
# 配置文件
/etc/nginx/conf.d/diary.conf

# 测试配置
sudo nginx -t

# 重新加载
sudo systemctl reload nginx
```

### SSL 证书

- Let's Encrypt 自动续期（certbot-renew.timer）
- 证书路径：`/etc/letsencrypt/live/diary.rfcode.top/`

### SSH 密钥

- 私钥：`~/.ssh/id_ed25519`
- 公钥：`ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHQbIw3AURpyrdvTXEKARvUb8+LCA8R83xfO7wskkdSn`
- 绑定账号：Aoce888
- SSH 配置：`~/.ssh/config`
