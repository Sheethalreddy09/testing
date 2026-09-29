import { CookieOptions, Request } from "express";
export const PLATFORM_SESSION_COOKIE = "clyptus_platform_session";
export const platformCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});
export function platformToken(req: Pick<Request, "headers">): string {
  const authorization = req.headers.authorization;
  if (authorization)
    return authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const cookie = req.headers.cookie
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${PLATFORM_SESSION_COOKIE}=`));
  try {
    return cookie
      ? decodeURIComponent(cookie.slice(PLATFORM_SESSION_COOKIE.length + 1))
      : "";
  } catch {
    return "";
  }
}
