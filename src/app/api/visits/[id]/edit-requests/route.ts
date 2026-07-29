import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requests = await prisma.editRequest.findMany({
    where: { visitId: id },
    include: {
      requester: { select: { id: true, name: true, avatar: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(requests);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const { id: visitId } = await params;
    const existing = await prisma.editRequest.findUnique({
      where: { visitId_requesterId: { visitId, requesterId: user.userId } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "已申请过，等待审批" },
        { status: 409 }
      );
    }

    const visit = await prisma.visit.findUnique({ where: { id: visitId } });
    if (!visit || visit.userId === user.userId) {
      return NextResponse.json(
        { error: "无需申请" },
        { status: 400 }
      );
    }

    const req = await prisma.editRequest.create({
      data: {
        visitId,
        requesterId: user.userId,
      },
      include: {
        requester: { select: { id: true, name: true, avatar: true } },
      },
    });

    return NextResponse.json(req);
  } catch (error) {
    console.error("Edit request error:", error);
    return NextResponse.json({ error: "申请失败" }, { status: 500 });
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
    const { id: visitId } = await params;
    const { requestId, action } = await request.json();

    const visit = await prisma.visit.findUnique({ where: { id: visitId } });
    if (!visit || visit.userId !== user.userId) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    const editReq = await prisma.editRequest.findUnique({
      where: { id: requestId },
    });
    if (!editReq || editReq.status !== "pending") {
      return NextResponse.json({ error: "无效的请求" }, { status: 400 });
    }

    if (action === "approve") {
      await prisma.editRequest.update({
        where: { id: requestId },
        data: { status: "approved" },
      });
      await prisma.visit.update({
        where: { id: visitId },
        data: {
          editors: { connect: { id: editReq.requesterId } },
        },
      });
      return NextResponse.json({ success: true });
    } else if (action === "reject") {
      await prisma.editRequest.update({
        where: { id: requestId },
        data: { status: "rejected" },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "无效操作" }, { status: 400 });
  } catch (error) {
    console.error("Edit request action error:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
