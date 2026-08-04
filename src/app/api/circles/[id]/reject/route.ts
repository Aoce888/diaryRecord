import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// POST /api/circles/:id/reject — 群主拒绝待审核成员（body: { userId }）
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
    const circle = await prisma.circle.findUnique({ where: { id } });
    if (!circle) {
      return NextResponse.json({ error: "圈子不存在" }, { status: 404 });
    }
    if (circle.creatorId !== user.userId) {
      return NextResponse.json(
        { error: "只有创建者才能审核成员" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId } = body;
    if (!userId) {
      return NextResponse.json({ error: "缺少用户 ID" }, { status: 400 });
    }

    const membership = await prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId: id, userId } },
    });
    if (!membership || membership.status !== "pending") {
      return NextResponse.json(
        { error: "该申请不存在或已处理" },
        { status: 400 }
      );
    }

    await prisma.circleMember.delete({
      where: { circleId_userId: { circleId: id, userId } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/circles/[id]/reject error:", error);
    return NextResponse.json({ error: "审核失败" }, { status: 500 });
  }
}
