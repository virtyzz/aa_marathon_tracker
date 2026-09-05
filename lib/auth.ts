import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { HttpsProxyAgent } from "https-proxy-agent";
import { prisma } from "./prisma";
const discordProxy = process.env.DISCORD_PROXY_URL ? new HttpsProxyAgent(process.env.DISCORD_PROXY_URL) : undefined;
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  // next-auth/middleware выполняется на Edge и не обращается к PostgreSQL.
  // JWT позволяет middleware проверить авторизацию без запроса к БД.
  session: { strategy: "jwt" },
  providers: [DiscordProvider({ clientId: process.env.DISCORD_CLIENT_ID!, clientSecret: process.env.DISCORD_CLIENT_SECRET!, httpOptions: discordProxy ? { agent: discordProxy } : undefined })],
  callbacks: {
    async session({ session, token }) { if (session.user && token.sub) (session.user as typeof session.user & { id: string; discordId?: string | null }).id = token.sub; return session; }
  },
  events: {
    // Adapter сначала создаёт User, затем связывает OAuth Account. Только здесь User гарантированно существует.
    async linkAccount({ user, account }) { if (account.provider === "discord") await prisma.user.update({ where: { id: user.id }, data: { discordId: account.providerAccountId } }); }
  }
};
