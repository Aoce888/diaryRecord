#!/bin/bash
set -e
cd /home/myecs/diary-app

echo "===== 1. 备份当前版本 ====="
# 备份前端改动内容 + 构建产物：src/（源码）+ .next/（构建产物，回滚靠它）。
# 服务器本地备份，不进 git。配置文件/项目文件一般不变不入备份；
# .env / node_modules / .git 一律不备份；.next 的 cache 可再生，排除
mkdir -p ~/diary-app-backups
BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)_$$"
mkdir -p ~/diary-app-backups/$BACKUP_NAME
cp -r src ~/diary-app-backups/$BACKUP_NAME/src
cp -r .next ~/diary-app-backups/$BACKUP_NAME/.next
rm -rf ~/diary-app-backups/$BACKUP_NAME/.next/cache
ls -dt ~/diary-app-backups/backup_* 2>/dev/null | tail -n +6 | xargs -r rm -rf

echo "===== 2. 解压 ====="
# 清掉旧 .next（含历史 root 属主的图片缓存，需 sudo；应用现在跑 myecs，新缓存归 myecs）
# 注意：必须在本脚本执行前保证 .deploy.tar.gz 已上传
sudo rm -rf .next 2>/dev/null || true
tar -xzf .deploy.tar.gz
rm -f .deploy.tar.gz

echo "===== 3. 安装依赖 ====="
npm install --omit=dev

echo "===== 4. prisma generate ====="
npx prisma generate

echo "===== 5. Prisma hash-link ====="
HASH=$(grep -roh '@prisma/client-[a-f0-9]\{12,\}' .next/server 2>/dev/null | sed 's/@prisma\///' | sort -u)
if [ -n "$HASH" ]; then
  ln -sf client "node_modules/@prisma/$HASH" 2>/dev/null || true
fi

echo "===== 6. 重启 PM2 ====="
pm2 delete diary-app 2>/dev/null || true
pkill -9 -f 'next-server' 2>/dev/null || true
sleep 2
pm2 start npm --name diary-app -- start -- --port 3001

echo "===== 部署完成 ====="
