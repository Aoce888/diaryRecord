import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function canEdit(visitId: string, userId: string) {
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: { editors: { select: { id: true } } },
  });
  if (!visit) return false;
  return visit.userId === userId || visit.editors.some((e) => e.id === userId);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const visit = await prisma.visit.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        editors: { select: { id: true } },
      },
    });

    if (!visit) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }

    return NextResponse.json({
      ...visit,
      tags: JSON.parse(visit.tags),
      photos: JSON.parse(visit.photos || "[]"),
      creatorName: visit.creator.name,
      creatorId: visit.creator.id,
      creatorAvatar: (visit as any).creator.avatar || null,
      editors: visit.editors.map((e: any) => e.id),
    });
  } catch (error) {
    console.error("GET /api/visits/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch visit" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const { id } = await params;

    if (!(await canEdit(id, user.userId))) {
      return NextResponse.json({ error: "无权编辑此记录" }, { status: 403 });
    }

    const body = await request.json();
    const { type, name, location, date, cost, rating, notes, tags, photos } =
      body;

    const visit = await prisma.visit.update({
      where: { id },
      data: {
        type,
        name,
        location,
        date: new Date(date),
        cost: parseFloat(cost),
        rating: parseInt(rating),
        notes,
        tags: JSON.stringify(tags || []),
        photos: JSON.stringify(photos || []),
      },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        editors: { select: { id: true, name: true, avatar: true } },
      },
    });

    return NextResponse.json({
      ...visit,
      tags: JSON.parse(visit.tags),
      photos: JSON.parse(visit.photos || "[]"),
      creatorName: visit.creator.name,
      creatorId: visit.creator.id,
      creatorAvatar: (visit as any).creator.avatar || null,
      editorCount: visit.editors.length,
    });
  } catch (error) {
    console.error("PUT /api/visits/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update visit" },
      { status: 500 }
    );
  }
}

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
    const visit = await prisma.visit.findUnique({ where: { id } });

    if (!visit || visit.userId !== user.userId) {
      return NextResponse.json({ error: "无权删除此记录" }, { status: 403 });
    }

    // 软删除：设置 deletedAt
    await prisma.visit.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    console.error("DELETE /api/visits/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete visit" },
      { status: 500 }
    );
  }
}
