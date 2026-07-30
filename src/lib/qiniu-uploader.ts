/**
 * 七牛云直传工具（网页端）
 *
 * 流程：获取 token → 直传七牛 → 返回 CDN URL
 * 路径：public/diaryRecord/{userId}/{subDir}/{timestamp}-{random}.{ext}
 */

const QINIU_UPLOAD_URL = "https://upload-z2.qiniup.com";
const QINIU_CDN_DOMAIN = "https://cdn.rfcode.top";

/**
 * 生成七牛存储路径
 */
function generateKey(userId: string | number, subDir: string, ext: string) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `public/diaryRecord/${userId}/${subDir}/${timestamp}-${random}.${ext}`;
}

/**
 * 获取上传凭证
 */
export async function getUploadToken(): Promise<string> {
  const res = await fetch("/api/upload-token");
  const data = await res.json();
  if (!data.token) {
    throw new Error("获取上传凭证失败");
  }
  return data.token;
}

/**
 * 上传图片到七牛（适用于已登录用户，有 userId）
 * @param file - 文件对象
 * @param userId - 用户 ID
 * @param subDir - 子目录（photos / avatars）
 * @returns CDN URL
 */
export async function uploadImage(
  file: File,
  userId: string | number,
  subDir: string = "photos"
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const key = generateKey(userId, subDir, ext);
  const token = await getUploadToken();

  const formData = new FormData();
  formData.append("token", token);
  formData.append("key", key);
  formData.append("file", file);

  const res = await fetch(QINIU_UPLOAD_URL, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`上传失败: ${res.status}`);
  }

  const data = await res.json();
  return `${QINIU_CDN_DOMAIN}/${data.key || key}`;
}

/**
 * 上传头像（注册时使用，尚无 userId）
 * 路径：public/diaryRecord/temp/avatars/xxx.jpg
 * @returns CDN URL
 */
export async function uploadTempAvatar(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const key = `public/diaryRecord/temp/avatars/${timestamp}-${random}.${ext}`;
  const token = await getUploadToken();

  const formData = new FormData();
  formData.append("token", token);
  formData.append("key", key);
  formData.append("file", file);

  const res = await fetch(QINIU_UPLOAD_URL, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`上传失败: ${res.status}`);
  }

  const data = await res.json();
  return `${QINIU_CDN_DOMAIN}/${data.key || key}`;
}
