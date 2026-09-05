import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
export async function GET(){try{await requireAdmin();return NextResponse.json(await prisma.adminAuditLog.findMany({include:{actor:{select:{name:true,discordId:true}}},orderBy:{createdAt:"desc"},take:100}))}catch{return NextResponse.json({error:"Доступ запрещён"},{status:403})}}
