import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// POST /api/circles/:id/leave — 退出圈子
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
    const membership = await prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId: id, userId: user.userId } },
    });

    if (!membership) {
      return NextResponse.json({ error: "你不在这个圈子中" }, { status: 400 });
    }

    // 创建者不能直接退出，需先转让或解散
    if (membership.role === "owner") {
      return NextResponse.json(
        { error: "创建者不能退出，请先转让或解散圈子" },
        { status: 403 }
      );
    }

    await prisma.circleMember.delete({
      where: { circleId_userId: { circleId: id, userId: user.userId } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/circles/[id]/leave error:", error);
    return NextResponse.json({ error: "退出圈子失败" }, { status: 500 });
  }
}
