// postinstall: 创建 Prisma Client 的 Turbopack hash 符号链接
// 扫描 .next/server 中的 @prisma/client-<hash> 引用，创建对应 node_modules 链接
const fs = require("fs");
const path = require("path");

const nextDir = path.join(process.cwd(), ".next/server");
const prismaDir = path.join(process.cwd(), "node_modules/@prisma");

if (!fs.existsSync(nextDir)) {
  process.exit(0);
}

// 从构建产物中提取 hash
function findAllFiles(dir) {
  const files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...findAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }
  } catch {}
  return files;
}

const files = findAllFiles(nextDir);
const hashes = new Set();
const hashRegex = /@prisma\/(client-[a-f0-9]{12,})/g;

for (const file of files) {
  try {
    const content = fs.readFileSync(file, "utf8");
    let match;
    while ((match = hashRegex.exec(content)) !== null) {
      hashes.add(match[1]);
    }
  } catch {}
}

if (hashes.size === 0) {
  process.exit(0);
}

if (!fs.existsSync(prismaDir)) {
  process.exit(0);
}

const clientDir = path.join(prismaDir, "client");
if (!fs.existsSync(clientDir)) {
  process.exit(0);
}

for (const hash of hashes) {
  const linkPath = path.join(prismaDir, hash);
  if (!fs.existsSync(linkPath)) {
    try {
      // 在 Windows 上使用 junction，其他平台用 symlink
      const type = process.platform === "win32" ? "junction" : "dir";
      fs.symlinkSync("client", linkPath, type);
    } catch (e) {
      // Windows 可能需要管理员权限，忽略错误
    }
  }
}
