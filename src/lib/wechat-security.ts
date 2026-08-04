import { prisma } from "@/lib/prisma";

/**
 * 微信内容安全检测（文本）
 *
 * 规则：
 * - 仅小程序用户（有 openid）触发检测；web 邮箱用户无 openid，直接放行，不影响 web 端
 * - 命中违规（errcode 87014）拒绝发布
 * - 其余异常（接口抖动、token 失效等）放行并记日志，避免临时故障阻断正常发布
 */

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60000) {
    return cachedToken.token;
  }

  const appid = process.env.WECHAT_APPID;
  const secret = process.env.WECHAT_SECRET;
  if (!appid || !secret) {
    throw new Error("未配置 WECHAT_APPID / WECHAT_SECRET");
  }

  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`
  );
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    errmsg?: string;
  };

  if (!data.access_token) {
    throw new Error(`获取微信 access_token 失败: ${data.errmsg || "unknown"}`);
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in || 7200) * 1000,
  };
  return cachedToken.token;
}

/**
 * 检测一段文本是否安全
 * @param content 文本内容
 * @param openid 小程序用户 openid
 * @param scene 场景：1-资料 2-评论 3-论坛 4-社交日志
 */
export async function checkTextSecurity(
  content: string,
  openid: string,
  scene: 1 | 2 | 3 | 4 = 4
): Promise<{ ok: boolean; errmsg?: string }> {
  const text = (content || "").trim();
  if (!text) return { ok: true };

  try {
    const token = await getAccessToken();
    const res = await fetch(
      `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: 2,
          scene,
          openid,
          content: text.slice(0, 2500), // 接口单次限制
        }),
      }
    );
    const data = (await res.json()) as { errcode?: number; errmsg?: string };

    if (data.errcode === 87014) {
      return { ok: false, errmsg: "内容含有违法违规信息" };
    }
    if (data.errcode) {
      // 非 87014 的异常：放行并记录，避免接口抖动阻断正常发布
      console.warn("[wechat-security] msg_sec_check 异常:", data);
    }
    return { ok: true };
  } catch (err) {
    console.warn("[wechat-security] 检测失败，放行:", err);
    return { ok: true };
  }
}

/**
 * 按用户做文本安全检测。
 * 只有微信用户（数据库里有 openid）会触发检测；web 邮箱用户直接放行。
 */
export async function checkUserTextSecurity(
  userId: string,
  content: string,
  scene: 1 | 2 | 3 | 4 = 4
): Promise<{ ok: boolean; errmsg?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { openid: true },
  });
  if (!user?.openid) return { ok: true }; // web 用户，无 openid，跳过
  return checkTextSecurity(content, user.openid, scene);
}
