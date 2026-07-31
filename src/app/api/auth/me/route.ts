import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json(null, { status: 200 });
  }
  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser) return NextResponse.json(null, { status: 200 });
  return NextResponse.json({
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    avatar: dbUser.avatar,
  });
}

export async function PUT(request: Request) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const { name, avatar } = await request.json();
    const updates: Record<string, string> = {};
    if (name) updates.name = name;
    // 只在头像非空时更新，避免登录流程/旧缓存把空头像误写回数据库
    if (avatar) updates.avatar = avatar;

    const user = await prisma.user.update({
      where: { id: currentUser.userId },
      data: updates,
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
