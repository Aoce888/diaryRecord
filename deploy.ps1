# 本地构建 + 上传到服务器（服务器不需要再 build）
# 用法：在项目根目录执行 .\deploy.ps1

$SERVER = "myecs@8.134.102.5"
$REMOTE_PATH = "/home/myecs/diary-app"
# 备份策略（保留最近 5 份、跳过 node_modules）在 remote-deploy.sh 中实现

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
# 注意：tarball 必须写到项目目录外（否则 tar 在归档 . 的同时在 . 内写文件，
# 目录 mtime 变化会让 tar 以 "file changed as we read it" 退出码 1）
$TARBALL = Join-Path $env:TEMP "diary-deploy.tar.gz"
Remove-Item $TARBALL -Force -ErrorAction SilentlyContinue
tar -czf $TARBALL `
    --exclude=node_modules `
    --exclude=.git `
    --exclude=.env `
    --exclude=deploy.ps1 `
    --exclude=remote-deploy.sh `
    --exclude=.next/cache `
    --exclude=backups `
    --exclude=memory `
    .
if ($LASTEXITCODE -ne 0) {
    Write-Host "打包失败，终止部署" -ForegroundColor Red
    exit 1
}

Write-Host "========== 4. 上传到服务器 ==========" -ForegroundColor Cyan
scp $TARBALL "$SERVER`:$REMOTE_PATH/.deploy.tar.gz"
if ($LASTEXITCODE -ne 0) {
    Write-Host "上传失败，终止部署" -ForegroundColor Red
    Remove-Item $TARBALL -Force
    exit 1
}

Write-Host "========== 5. 上传部署脚本 ==========" -ForegroundColor Cyan
scp remote-deploy.sh "$SERVER`:$REMOTE_PATH/remote-deploy.sh"
if ($LASTEXITCODE -ne 0) {
    Write-Host "上传部署脚本失败，终止部署" -ForegroundColor Red
    Remove-Item $TARBALL -Force
    exit 1
}

Write-Host "========== 6. 服务器部署（备份 → 解压 → 安装 → 重启）==========" -ForegroundColor Cyan
ssh $SERVER "bash $REMOTE_PATH/remote-deploy.sh"
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
Remove-Item $TARBALL -Force -ErrorAction SilentlyContinue
