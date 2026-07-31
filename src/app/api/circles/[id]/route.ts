import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/circles/:id — 圈子详情（含成员）
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
    const membership = await prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId: id, userId: user.userId } },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "你不在这个圈子中" },
        { status: 403 }
      );
    }

    const circle = await prisma.circle.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        members: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    if (!circle) {
      return NextResponse.json({ error: "圈子不存在" }, { status: 404 });
    }

    return NextResponse.json({
      id: circle.id,
      name: circle.name,
      description: circle.description,
      coverImage: circle.coverImage,
      inviteCode: circle.inviteCode,
      creatorId: circle.creatorId,
      creatorName: circle.creator.name,
      creatorAvatar: circle.creator.avatar,
      createdAt: circle.createdAt,
      myRole: membership.role,
      members: circle.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        avatar: m.user.avatar,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    });
  } catch (error) {
    console.error("GET /api/circles/[id] error:", error);
    return NextResponse.json({ error: "获取圈子详情失败" }, { status: 500 });
  }
}

// DELETE /api/circles/:id — 解散圈子（仅创建者）
export async function DELETE(
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
        { error: "只有创建者才能解散圈子" },
        { status: 403 }
      );
    }

    // 级联删除所有成员关系（CircleMember onDelete: Cascade）
    await prisma.circle.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/circles/[id] error:", error);
    return NextResponse.json({ error: "解散圈子失败" }, { status: 500 });
  }
}
