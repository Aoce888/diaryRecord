<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
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

## 常用操作

### 修改代码后重新部署

```bash
cd /home/myecs/diary-app

# 1. 构建
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
