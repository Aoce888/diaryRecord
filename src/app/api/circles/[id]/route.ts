import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkUserTextSecurity } from "@/lib/wechat-security";

// 生成 6 位邀请码（大写字母+数字，去除易混淆字符）
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

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
        // 成员列表只展示已通过审核的成员
        members: {
          where: { status: "active" },
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    if (!circle) {
      return NextResponse.json({ error: "圈子不存在" }, { status: 404 });
    }

    // 待审核申请（群主在成员弹窗里同意/拒绝）
    const pendingMembers = await prisma.circleMember.findMany({
      where: { circleId: id, status: "pending" },
      include: { user: { select: { id: true, name: true, avatar: true } } },
      orderBy: { joinedAt: "asc" },
    });

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
      membershipStatus: membership.status,
      members: circle.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        avatar: m.user.avatar,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      pendingMembers: pendingMembers.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        avatar: m.user.avatar,
        role: m.role,
        requestedAt: m.joinedAt,
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

// PATCH /api/circles/:id — 编辑圈子（仅创建者）：改名称/简介 + 重新生成邀请码
export async function PATCH(
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
        { error: "只有创建者才能编辑圈子" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, regenerateInviteCode } = body;

    const data: {
      name?: string;
      description?: string | null;
      inviteCode?: string;
    } = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: "圈子名称不能为空" }, { status: 400 });
      }
      data.name = name.trim();
    }
    if (description !== undefined) {
      data.description = (description || "").trim() || null;
    }

    // 名称/简介有改动才做文本安全检测
    if (data.name !== undefined || data.description !== undefined) {
      const contentCheck = await checkUserTextSecurity(
        user.userId,
        [data.name ?? circle.name, data.description ?? circle.description ?? ""]
          .filter(Boolean)
          .join("\n")
      );
      if (!contentCheck.ok) {
        return NextResponse.json(
          { error: contentCheck.errmsg || "内容违规" },
          { status: 400 }
        );
      }
    }

    // 重新生成邀请码（旧码作废，手动防泄露）
    if (regenerateInviteCode) {
      let newCode = generateInviteCode();
      for (let i = 0; i < 5; i++) {
        const existing = await prisma.circle.findUnique({
          where: { inviteCode: newCode },
        });
        if (!existing) break;
        newCode = generateInviteCode();
      }
      data.inviteCode = newCode;
    }

    const updated = await prisma.circle.update({ where: { id }, data });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      inviteCode: updated.inviteCode,
    });
  } catch (error) {
    console.error("PATCH /api/circles/[id] error:", error);
    return NextResponse.json({ error: "编辑圈子失败" }, { status: 500 });
  }
}
