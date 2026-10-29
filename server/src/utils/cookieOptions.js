const isProduction = process.env.NODE_ENV === "production";

const getCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
  maxAge: 24 * 60 * 60 * 1000,
});

export { getCookieOptions };
