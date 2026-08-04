import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkUserTextSecurity } from "@/lib/wechat-security";

// 生成 6 位邀请码（大写字母+数字，去除易混淆字符）
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// POST /api/circles — 创建圈子
export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, coverImage } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "圈子名称不能为空" }, { status: 400 });
    }

    // 文本安全检测（仅小程序用户触发，web 邮箱用户无 openid 自动跳过）
    const contentCheck = await checkUserTextSecurity(
      user.userId,
      [name, description || ""].filter(Boolean).join("\n")
    );
    if (!contentCheck.ok) {
      return NextResponse.json(
        { error: contentCheck.errmsg || "内容违规" },
        { status: 400 }
      );
    }

    // 生成唯一邀请码（最多重试 5 次避免碰撞）
    let inviteCode = generateInviteCode();
    for (let i = 0; i < 5; i++) {
      const existing = await prisma.circle.findUnique({
        where: { inviteCode },
      });
      if (!existing) break;
      inviteCode = generateInviteCode();
    }

    const circle = await prisma.circle.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        coverImage: coverImage || null,
        inviteCode,
        creatorId: user.userId,
        members: {
          create: {
            userId: user.userId,
            role: "owner",
          },
        },
      },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        members: { select: { id: true, role: true, userId: true } },
      },
    });

    return NextResponse.json({
      ...circle,
      memberCount: circle.members.length,
    });
  } catch (error) {
    console.error("POST /api/circles error:", error);
    return NextResponse.json(
      { error: "创建圈子失败" },
      { status: 500 }
    );
  }
}

// GET /api/circles — 我加入的圈子列表
export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const memberships = await prisma.circleMember.findMany({
      where: { userId: user.userId },
      include: {
        circle: {
          include: {
            creator: { select: { id: true, name: true, avatar: true } },
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    const circles = memberships.map((m) => ({
      ...m.circle,
      myRole: m.role,
      memberCount: m.circle._count.members,
    }));

    return NextResponse.json({ circles });
  } catch (error) {
    console.error("GET /api/circles error:", error);
    return NextResponse.json(
      { error: "获取圈子列表失败" },
      { status: 500 }
    );
  }
}
