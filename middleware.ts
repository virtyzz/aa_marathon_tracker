export { default } from "next-auth/middleware";
// Healthcheck must stay available to Docker without a Discord session.
export const config = { matcher: ["/", "/admin/:path*", "/api/((?!auth|health).*)"] };
