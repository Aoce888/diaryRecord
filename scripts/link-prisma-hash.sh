#!/bin/bash
# 创建 Prisma Client 的 Turbopack hash 符号链接
# 在服务器 npm install 或部署后自动执行
# 扫描 .next 构建产物中的 @prisma/client-<hash> 引用，创建对应的 node_modules symlink

NEXT_DIR=".next/server"
if [ ! -d "$NEXT_DIR" ]; then
  exit 0
fi

HASHES=$(grep -roh '@prisma/client-[a-f0-9]\{12,\}' "$NEXT_DIR" 2>/dev/null | sed 's/@prisma\///' | sort -u)

if [ -z "$HASHES" ]; then
  exit 0
fi

cd node_modules/@prisma 2>/dev/null || exit 0

for HASH in $HASHES; do
  if [ ! -e "$HASH" ]; then
    ln -sf client "$HASH"
  fi
done
