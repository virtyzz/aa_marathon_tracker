import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import { prisma } from "./prisma";
const proxyUrl = process.env.DISCORD_PROXY_URL;
const discordProxy = proxyUrl ? (proxyUrl.startsWith("socks") ? new SocksProxyAgent(proxyUrl) : new HttpsProxyAgent(proxyUrl)) : undefined;
const discordProvider = DiscordProvider({ clientId: process.env.DISCORD_CLIENT_ID!, clientSecret: process.env.DISCORD_CLIENT_SECRET! });
// NextAuth глубоко объединяет входной provider config. Агент нужно назначить после
// фабрики, иначе экземпляр SocksProxyAgent теряет методы своего прототипа.
if (discordProxy) {
  // deep merge NextAuth копирует enumerable поля. Связанные методы сохраняют
  // контекст исходного agent-base instance после этого копирования.
  const rawAgent = discordProxy as unknown as { addRequest: Function; createSocket: Function; getName: Function };
  const preservedAgent = Object.assign(discordProxy, {
    addRequest: rawAgent.addRequest.bind(discordProxy),
    createSocket: rawAgent.createSocket.bind(discordProxy),
    getName: rawAgent.getName.bind(discordProxy),
  });
  discordProvider.httpOptions = { agent: preservedAgent };
}
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  pages: { error: "/auth/error" },
  // next-auth/middleware выполняется на Edge и не обращается к PostgreSQL.
  // JWT позволяет middleware проверить авторизацию без запроса к БД.
  session: { strategy: "jwt" },
  providers: [discordProvider],
  callbacks: {
    async session({ session, token }) { if (session.user && token.sub) (session.user as typeof session.user & { id: string; discordId?: string | null }).id = token.sub; return session; }
  },
  events: {
    // Adapter сначала создаёт User, затем связывает OAuth Account. Только здесь User гарантированно существует.
    async linkAccount({ user, account }) { if (account.provider === "discord") await prisma.user.update({ where: { id: user.id }, data: { discordId: account.providerAccountId } }); }
  }
};
