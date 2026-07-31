import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// POST /api/circles/join — 通过邀请码加入圈子（body: { inviteCode }）
export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const inviteCode = (body?.inviteCode || "").trim().toUpperCase();

    if (!inviteCode) {
      return NextResponse.json({ error: "请输入邀请码" }, { status: 400 });
    }

    const circle = await prisma.circle.findUnique({
      where: { inviteCode },
    });
    if (!circle) {
      return NextResponse.json({ error: "邀请码无效" }, { status: 404 });
    }

    // 检查是否已是成员
    const existing = await prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId: circle.id, userId: user.userId } },
    });
    if (existing) {
      return NextResponse.json({ error: "你已经在圈子中了" }, { status: 400 });
    }

    await prisma.circleMember.create({
      data: {
        circleId: circle.id,
        userId: user.userId,
        role: "member",
      },
    });

    return NextResponse.json({ success: true, circle: { id: circle.id, name: circle.name } });
  } catch (error) {
    console.error("POST /api/circles/join error:", error);
    return NextResponse.json({ error: "加入圈子失败" }, { status: 500 });
  }
}
