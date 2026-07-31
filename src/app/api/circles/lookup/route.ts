import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/circles/lookup?code=XXXXXX — 根据邀请码查找圈子
export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const code = (searchParams.get("code") || "").trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ error: "请输入邀请码" }, { status: 400 });
    }

    const circle = await prisma.circle.findUnique({
      where: { inviteCode: code },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        _count: { select: { members: true } },
      },
    });

    if (!circle) {
      return NextResponse.json({ error: "邀请码无效" }, { status: 404 });
    }

    // 是否已是成员
    const membership = await prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId: circle.id, userId: user.userId } },
    });

    return NextResponse.json({
      id: circle.id,
      name: circle.name,
      description: circle.description,
      coverImage: circle.coverImage,
      creatorName: circle.creator.name,
      creatorAvatar: circle.creator.avatar,
      memberCount: circle._count.members,
      alreadyMember: !!membership,
    });
  } catch (error) {
    console.error("GET /api/circles/lookup error:", error);
    return NextResponse.json({ error: "查找圈子失败" }, { status: 500 });
  }
}
