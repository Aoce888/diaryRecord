import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * DELETE /api/visits/[id]/hard
 * 物理删除（彻底删除记录，不可恢复）
 * 仅创建者有权限，用于回收站中的「立即删除」
 */
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

    // 物理删除（cascade 会同时删除关联的 EditRequest）
    await prisma.visit.delete({ where: { id } });
    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    console.error("DELETE /api/visits/[id]/hard error:", error);
    return NextResponse.json(
      { error: "Failed to permanently delete visit" },
      { status: 500 }
    );
  }
}
