import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// POST /api/circles/:id/join — 加入圈子（body: { inviteCode }）
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { inviteCode } = body;

    if (!inviteCode) {
      return NextResponse.json({ error: "请输入邀请码" }, { status: 400 });
    }

    // 查找圈子并校验邀请码
    const circle = await prisma.circle.findUnique({ where: { id } });
    if (!circle) {
      return NextResponse.json({ error: "圈子不存在" }, { status: 404 });
    }
    if (circle.inviteCode !== inviteCode.toUpperCase()) {
      return NextResponse.json({ error: "邀请码错误" }, { status: 403 });
    }

    // 检查是否已有申请/已加入
    const existing = await prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId: id, userId: user.userId } },
    });
    if (existing) {
      if (existing.status === "pending") {
        return NextResponse.json({ error: "已提交申请，等待群主审核" }, { status: 400 });
      }
      return NextResponse.json({ error: "你已经在圈子中了" }, { status: 400 });
    }

    // 凭邀请码加入 → 先进入待审核状态，群主同意后才正式入圈
    await prisma.circleMember.create({
      data: {
        circleId: id,
        userId: user.userId,
        role: "member",
        status: "pending",
      },
    });

    return NextResponse.json({ success: true, pending: true, circleId: id });
  } catch (error) {
    console.error("POST /api/circles/[id]/join error:", error);
    return NextResponse.json({ error: "加入圈子失败" }, { status: 500 });
  }
}
