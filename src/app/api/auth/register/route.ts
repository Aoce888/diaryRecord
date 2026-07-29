import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { createToken, setAuthCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password, name, avatar } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "请填写完整信息" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "该邮箱已注册" },
        { status: 409 }
      );
    }

    const passwordHash = password ? await hash(password, 12) : null;
    const user = await prisma.user.create({
      data: { email: email || null, name, passwordHash, avatar: avatar || "" },
    });

    const token = await createToken({
      userId: user.id,
      email: user.email || "",
      name: user.name,
    });
    const response = NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    });
    await setAuthCookie(token);

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "注册失败" },
      { status: 500 }
    );
  }
}
