import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// DELETE /api/visits/:id/editors/:userId — 创建者移除协作者的编辑权限
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const { id, userId } = await params;
    const visit = await prisma.visit.findUnique({ where: { id } });
    if (!visit) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }
    if (visit.userId !== user.userId) {
      return NextResponse.json(
        { error: "只有创建者才能移除协作者" },
        { status: 403 }
      );
    }

    // 断开编辑关系（创建者本人不受影响，权限判断走 visit.userId）
    await prisma.visit.update({
      where: { id },
      data: { editors: { disconnect: { id: userId } } },
    });

    // 删除对应的编辑申请记录，让该用户之后可以重新申请
    await prisma.editRequest.deleteMany({
      where: { visitId: id, requesterId: userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/visits/[id]/editors/[userId] error:", error);
    return NextResponse.json({ error: "移除失败" }, { status: 500 });
  }
}
