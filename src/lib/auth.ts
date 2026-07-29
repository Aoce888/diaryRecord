import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
const TOKEN_EXPIRY = "30d";

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

export async function createToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set("diary-auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: "/",
  });
}

export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("diary-auth-token")?.value;
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.set("diary-auth-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export async function getCurrentUser(request?: Request): Promise<TokenPayload | null> {
  // 1. 优先从 cookie 读取（Web 端）
  const token = await getAuthCookie();
  if (token) {
    const user = await verifyToken(token);
    if (user) return user;
  }
  // 2. 回退到 Authorization 头（小程序 / 第三方客户端）
  if (request) {
    const auth = request.headers.get('authorization');
    if (auth) {
      const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
      return verifyToken(bearer);
    }
  }
  return null;
}
