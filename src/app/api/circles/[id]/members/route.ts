import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/circles/:id/members — 成员列表
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // 必须是圈子成员才能查看
    const membership = await prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId: id, userId: user.userId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "你不在这个圈子中" }, { status: 403 });
    }

    const members = await prisma.circleMember.findMany({
      where: { circleId: id },
      include: { user: { select: { id: true, name: true, avatar: true } } },
      orderBy: { joinedAt: "asc" },
    });

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        avatar: m.user.avatar,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    });
  } catch (error) {
    console.error("GET /api/circles/[id]/members error:", error);
    return NextResponse.json({ error: "获取成员列表失败" }, { status: 500 });
  }
}
