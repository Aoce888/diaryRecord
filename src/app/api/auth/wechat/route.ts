import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createToken, setAuthCookie } from "@/lib/auth";

const WECHAT_APPID = process.env.WECHAT_APPID;
const WECHAT_SECRET = process.env.WECHAT_SECRET;

export async function POST(request: Request) {
  try {
    const { code, userInfo } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: "缺少微信登录 code" },
        { status: 400 }
      );
    }

    if (!WECHAT_APPID || !WECHAT_SECRET) {
      return NextResponse.json(
        { error: "服务器未配置微信登录参数" },
        { status: 500 }
      );
    }

    // 调用微信 code2Session 获取 openid
    const wxRes = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}&js_code=${code}&grant_type=authorization_code`
    );
    const wxData = (await wxRes.json()) as {
      openid?: string;
      session_key?: string;
      errcode?: number;
      errmsg?: string;
    };

    if (wxData.errcode) {
      console.error("微信 code2Session 失败:", wxData);
      return NextResponse.json(
        { error: `微信登录失败: ${wxData.errmsg}` },
        { status: 500 }
      );
    }

    if (!wxData.openid) {
      return NextResponse.json(
        { error: "微信登录失败，未获取到 openid" },
        { status: 500 }
      );
    }

    // 查找或创建用户
    let user = await prisma.user.findUnique({
      where: { openid: wxData.openid },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          openid: wxData.openid,
          name: userInfo?.nickName || `微信用户`,
          avatar: userInfo?.avatarUrl || "",
          email: null,
          passwordHash: null,
        },
      });
    } else {
      // 更新用户信息（昵称/头像可能变化）
      if (userInfo) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            name: userInfo.nickName || user.name,
            avatar: userInfo.avatarUrl || user.avatar,
          },
        });
      }
    }

    const token = await createToken({
      userId: user.id,
      email: user.email || "",
      name: user.name,
    });

    const response = NextResponse.json({
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      token,
    });
    await setAuthCookie(token);

    return response;
  } catch (error) {
    console.error("WeChat login error:", error);
    return NextResponse.json({ error: "微信登录失败" }, { status: 500 });
  }
}
