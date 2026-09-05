import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
export async function currentUser() { const session = await getServerSession(authOptions); const user=session?.user; const id=(user as (typeof user & {id?:string})|undefined)?.id; if (id) return prisma.user.findUnique({where:{id}}); if (!user?.email) return null; return prisma.user.findUnique({ where: { email: user.email } }); }
export async function requireUser() { const user = await currentUser(); if (!user) throw new Error("UNAUTHORIZED"); return user; }
export async function requireAdmin() { const user = await requireUser(); const ids = (process.env.ADMIN_DISCORD_IDS ?? "").split(",").map(x=>x.trim()); if (!user.discordId || !ids.includes(user.discordId)) throw new Error("FORBIDDEN"); return user; }
