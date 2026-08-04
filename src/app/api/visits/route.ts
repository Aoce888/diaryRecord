import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkUserTextSecurity } from "@/lib/wechat-security";

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

      // 可见性范围：小程序专用
      // scope=me     → 仅自己的（含私密）
      // scope=circle → 自己的全部 + 圈子好友的非私密
      const scope = searchParams.get("scope");
      if (scope === "me" || scope === "circle") {
        const user = await getCurrentUser(request);
        if (!user) {
          return NextResponse.json({ error: "请先登录" }, { status: 401 });
        }
        if (scope === "me") {
          where.userId = user.userId;
        } else {
          // 我加入的圈子
          const myMemberships = await prisma.circleMember.findMany({
            where: { userId: user.userId },
            select: { circleId: true },
          });
          const myCircleIds = myMemberships.map((m) => m.circleId);

          // 这些圈子的所有成员
          const circleMembers = myCircleIds.length
            ? await prisma.circleMember.findMany({
                where: { circleId: { in: myCircleIds } },
                select: { userId: true },
              })
            : [];
          const visibleUserIds = [
            ...new Set(circleMembers.map((m) => m.userId)),
          ];

          where.OR = [
            { userId: user.userId },
            { isPrivate: false, userId: { in: visibleUserIds } },
          ];
        }
      }
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
        photos: JSON.parse(v.photos || "[]"),
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
    const { type, name, location, date, cost, rating, notes, tags, photos, isPrivate } =
      body;

    // 文本安全检测（仅小程序用户触发，web 邮箱用户无 openid 自动跳过）
    const contentCheck = await checkUserTextSecurity(
      user.userId,
      [name, location, notes, (tags || []).join(" ")].filter(Boolean).join("\n")
    );
    if (!contentCheck.ok) {
      return NextResponse.json(
        { error: contentCheck.errmsg || "内容违规" },
        { status: 400 }
      );
    }

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
        isPrivate: !!isPrivate,
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
      photos: JSON.parse(visit.photos || "[]"),
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
