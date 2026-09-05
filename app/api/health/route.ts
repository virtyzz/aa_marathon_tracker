import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET(){try{await prisma.$queryRaw`SELECT 1`;return NextResponse.json({status:"ok",database:"ok",discordOAuthProxy:process.env.DISCORD_PROXY_URL?"configured":"direct"})}catch{return NextResponse.json({status:"unavailable",database:"unavailable"},{status:503})}}
