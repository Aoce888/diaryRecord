import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  try {
    const where: Record<string, unknown> = {};
    if (type && type !== "all") {
      where.type = type;
    }

    const [visits, total] = await Promise.all([
      prisma.visit.findMany({
        where,
        include: {
          photos: true,
          creator: { select: { id: true, name: true } },
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
        creatorName: v.creator.name,
        creatorId: v.creator.id,
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
  const user = await getCurrentUser();
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
        userId: user.userId,
        editors: { connect: { id: user.userId } },
        photos: {
          create: (photos || []).map((url: string) => ({ url })),
        },
      },
      include: {
        photos: true,
        creator: { select: { id: true, name: true } },
        editors: { select: { id: true, name: true, avatar: true } },
      },
    });

    return NextResponse.json({
      ...visit,
      tags: JSON.parse(visit.tags),
      creatorName: visit.creator.name,
      creatorId: visit.creator.id,
    });
  } catch (error) {
    console.error("POST /api/visits error:", error);
    return NextResponse.json(
      { error: "Failed to create visit" },
      { status: 500 }
    );
  }
}
