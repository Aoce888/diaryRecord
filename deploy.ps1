# 本地构建 + 上传到服务器（服务器不需要再 build）
# 用法：在项目根目录执行 .\deploy.ps1

$SERVER = "myecs@8.134.102.5"
$REMOTE_PATH = "/home/myecs/diary-app"

Write-Host "========== 1. 本地构建 ==========" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "构建失败，终止部署" -ForegroundColor Red
    exit 1
}

Write-Host "========== 2. 打包产物（排除 node_modules / .git / .env）= " -ForegroundColor Cyan
tar -czf .deploy.tar.gz `
    --exclude=node_modules `
    --exclude=.git `
    --exclude=.env `
    --exclude=deploy.ps1 `
    --exclude=.deploy.tar.gz `
    --exclude=.next/cache `
    .

Write-Host "========== 3. 上传到服务器 ==========" -ForegroundColor Cyan
scp .deploy.tar.gz "$SERVER`:$REMOTE_PATH/"

Write-Host "========== 4. 备份当前版本 ==========" -ForegroundColor Cyan
ssh $SERVER "cd $REMOTE_PATH && `
    mkdir -p backups && `
    cp -r --no-target-directory . backups/backup_\$(date +%Y%m%d_%H%M%S) && `
    ls -dt backups/backup_* 2>/dev/null | tail -n +6 | xargs rm -rf"

Write-Host "========== 5. 服务器解压 + 安装依赖 + 重启 ==========" -ForegroundColor Cyan
ssh $SERVER "cd $REMOTE_PATH && `
    tar -xzf .deploy.tar.gz && `
    rm .deploy.tar.gz && `
    npm install --omit=dev && `
    npx prisma generate && `
    pm2 restart diary-app"

Write-Host "========== 6. 健康检查 ==========" -ForegroundColor Cyan
Start-Sleep -Seconds 8
$code = Invoke-WebRequest -Uri "http://8.134.102.5:3001/" -UseBasicParsing -TimeoutSec 10 -StatusCodeVariable "status" 2>$null
if ($status -eq 200) {
    Write-Host "部署成功！HTTP 200" -ForegroundColor Green
} else {
    Write-Host "健康检查异常 (HTTP $status)，请 SSH 检查服务器日志" -ForegroundColor Yellow
}

Write-Host "========== 部署完成！==========" -ForegroundColor Green
Remove-Item .deploy.tar.gz -Force
