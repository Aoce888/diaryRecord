import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/edit-requests
 * 消息中心：返回「我创建的记录」收到的所有待审批编辑申请（跨记录汇总）
 * 仅创建者可见自己收到的申请
 */
export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const requests = await prisma.editRequest.findMany({
    where: { status: "pending", visit: { userId: user.userId } },
    include: {
      requester: { select: { id: true, name: true, avatar: true } },
      visit: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}
