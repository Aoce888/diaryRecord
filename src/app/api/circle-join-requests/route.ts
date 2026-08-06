import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/circle-join-requests
 * 消息中心：返回「我创建的圈子」收到的待审核入圈申请（跨圈子汇总）
 * 审批接口：POST /api/circles/:id/approve | /reject（body: { userId }）
 */
export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const pending = await prisma.circleMember.findMany({
    where: { status: "pending", circle: { creatorId: user.userId } },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      circle: { select: { id: true, name: true } },
    },
    orderBy: { joinedAt: "desc" },
  });

  return NextResponse.json(
    pending.map((m) => ({
      id: m.id,
      circleId: m.circle.id,
      circleName: m.circle.name,
      userId: m.user.id,
      name: m.user.name,
      avatar: m.user.avatar,
      requestedAt: m.joinedAt,
    }))
  );
}
