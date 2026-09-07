import { mutationError } from "@/lib/api-error";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
const schema=z.object({name:z.string().trim().min(1).max(60)});
export async function GET(){try{const user=await requireUser();return NextResponse.json(await prisma.gameAccount.findMany({where:{userId:user.id},orderBy:{createdAt:"asc"},include:{_count:{select:{characters:true}}}}))}catch{return NextResponse.json({error:"Необходим вход"},{status:401})}}
export async function POST(request:Request){try{const user=await requireUser(),input=schema.parse(await request.json());return NextResponse.json(await prisma.gameAccount.create({data:{...input,userId:user.id}}),{status:201})}catch(error){return mutationError(error,"game-account.create","Игровой аккаунт с таким названием уже существует")}}
