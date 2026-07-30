import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status"); // "trash" | undefined
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  try {
    const where: Record<string, unknown> = {};
    if (type && type !== "all") {
      where.type = type;
    }

    if (status === "trash") {
      // 回收站：仅创建者查看已删除的记录
      const user = await getCurrentUser(request);
      if (!user) {
        return NextResponse.json({ error: "请先登录" }, { status: 401 });
      }
      where.deletedAt = { not: null };
      where.userId = user.userId;

      // 清理超过 14 天的记录（物理删除）
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      await prisma.visit.deleteMany({
        where: { userId: user.userId, deletedAt: { not: null, lt: fourteenDaysAgo } },
      });
    } else {
      // 默认：只展示未删除的记录
      where.deletedAt = null;
    }

    const [visits, total] = await Promise.all([
      prisma.visit.findMany({
        where,
        include: {
          creator: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.visit.count({ where }),
    ]);

    return NextResponse.json({
      visits: visits.map((v) => ({
        ...v,
        tags: JSON.parse(v.tags),
        photos: JSON.parse(v.photos),
        creatorName: v.creator.name,
        creatorId: v.creator.id,
        creatorAvatar: (v.creator as any).avatar || null,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/visits error:", error);
    return NextResponse.json(
      { error: "Failed to fetch visits" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json(
      { error: "请先登录" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { type, name, location, date, cost, rating, notes, tags, photos } =
      body;

    const visit = await prisma.visit.create({
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
        userId: user.userId,
        editors: { connect: { id: user.userId } },
      },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        editors: { select: { id: true, name: true, avatar: true } },
      },
    });

    return NextResponse.json({
      ...visit,
      tags: JSON.parse(visit.tags),
      photos: JSON.parse(visit.photos),
      creatorName: visit.creator.name,
      creatorId: visit.creator.id,
      creatorAvatar: (visit as any).creator.avatar || null,
    });
  } catch (error) {
    console.error("POST /api/visits error:", error);
    return NextResponse.json(
      { error: "Failed to create visit" },
      { status: 500 }
    );
  }
}
