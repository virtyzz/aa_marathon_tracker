import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
const schema=z.object({name:z.string().trim().min(1).max(40),server:z.string().trim().max(50).optional(),note:z.string().trim().max(500).optional()});
export async function GET(){try{const user=await requireUser();return NextResponse.json(await prisma.character.findMany({where:{userId:user.id},orderBy:{createdAt:"asc"}}))}catch{return NextResponse.json({error:"Необходим вход"},{status:401})}}
export async function POST(request:Request){try{const user=await requireUser();const input=schema.parse(await request.json());const character=await prisma.character.create({data:{...input,userId:user.id}});return NextResponse.json(character,{status:201})}catch(error){return NextResponse.json({error:error instanceof z.ZodError?"Проверьте данные персонажа":"Не удалось создать персонажа"},{status:400})}}
