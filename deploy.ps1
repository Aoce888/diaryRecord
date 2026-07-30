# 本地构建 + 上传到服务器（服务器不需要再 build）
# 用法：在项目根目录执行 .\deploy.ps1

$SERVER = "myecs@8.134.102.5"
$REMOTE_PATH = "/home/myecs/diary-app"
$BACKUP_KEEP = 5  # 保留的备份数量

Write-Host "========== 1. 生成 Prisma Client ==========" -ForegroundColor Cyan
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "Prisma generate 失败，终止部署" -ForegroundColor Red
    exit 1
}

Write-Host "========== 2. 本地构建 ==========" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "构建失败，终止部署" -ForegroundColor Red
    exit 1
}

Write-Host "========== 3. 打包产物（排除 node_modules / .git / .env / 缓存）==========" -ForegroundColor Cyan
tar -czf .deploy.tar.gz `
    --exclude=node_modules `
    --exclude=.git `
    --exclude=.env `
    --exclude=deploy.ps1 `
    --exclude=.deploy.tar.gz `
    --exclude=.next/cache `
    --exclude=backups `
    --exclude=memory `
    .
if ($LASTEXITCODE -ne 0) {
    Write-Host "打包失败，终止部署" -ForegroundColor Red
    exit 1
}

Write-Host "========== 4. 上传到服务器 ==========" -ForegroundColor Cyan
scp .deploy.tar.gz "$SERVER`:$REMOTE_PATH/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "上传失败，终止部署" -ForegroundColor Red
    Remove-Item .deploy.tar.gz -Force
    exit 1
}

Write-Host "========== 5. 备份当前版本 ==========" -ForegroundColor Cyan
ssh $SERVER "cd $REMOTE_PATH && `
    mkdir -p backups && `
    BACKUP_NAME=backup_\$(date +%Y%m%d_%H%M%S)_\$\$ && `
    (ls -1 | grep -v '^backups$' | grep -v '^\.deploy\.tar\.gz$' | xargs -I{} cp -r {} backups/\$BACKUP_NAME) && `
    ls -dt backups/backup_* 2>/dev/null | tail -n +$($BACKUP_KEEP + 1) | xargs -r rm -rf"

Write-Host "========== 6. 服务器解压 + 安装依赖 + 重启 ==========" -ForegroundColor Cyan
ssh $SERVER "cd $REMOTE_PATH && `
    tar -xzf .deploy.tar.gz && `
    rm -f .deploy.tar.gz && `
    npm install --omit=dev && `
    npx prisma generate && `
    pm2 delete diary-app 2>/dev/null; `
    pkill -9 -f 'next-server' 2>/dev/null || true; `
    sleep 2; `
    pm2 start npm --name diary-app -- start -- --port 3001"
if ($LASTEXITCODE -ne 0) {
    Write-Host "服务器部署步骤异常，请 SSH 检查" -ForegroundColor Red
}

Write-Host "========== 7. 健康检查 ==========" -ForegroundColor Cyan
Start-Sleep -Seconds 8
try {
    $response = Invoke-WebRequest -Uri "https://diary.rfcode.top/" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "部署成功！HTTP 200" -ForegroundColor Green
    } else {
        Write-Host "健康检查异常 (HTTP $($response.StatusCode))，请 SSH 检查服务器日志" -ForegroundColor Yellow
    }
} catch {
    Write-Host "健康检查请求失败: $($_.Exception.Message)，请 SSH 检查" -ForegroundColor Yellow
}

Write-Host "========== 部署完成！==========" -ForegroundColor Green
Remove-Item .deploy.tar.gz -Force -ErrorAction SilentlyContinue
