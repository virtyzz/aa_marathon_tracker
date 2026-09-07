import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { gameAccountIdSchema } from "@/lib/game-account";
import { mutationError } from "@/lib/api-error";
const schema=z.object({name:z.string().trim().min(1).max(40),server:z.string().trim().max(50).nullable().optional(),note:z.string().trim().max(500).nullable().optional(),gameAccountId:gameAccountIdSchema.optional()});
export async function GET(){try{const user=await requireUser();return NextResponse.json(await prisma.character.findMany({where:{userId:user.id},orderBy:{createdAt:"asc"}}))}catch{return NextResponse.json({error:"Необходим вход"},{status:401})}}
export async function POST(request:Request){try{const user=await requireUser();const input=schema.parse(await request.json());const account=input.gameAccountId?await prisma.gameAccount.findFirst({where:{id:input.gameAccountId,userId:user.id}}):await prisma.gameAccount.findFirst({where:{userId:user.id},orderBy:{createdAt:"asc"}});if(!account)return NextResponse.json({error:"Сначала создайте игровой аккаунт"},{status:400});const {gameAccountId,...data}=input;const character=await prisma.character.create({data:{...data,userId:user.id,gameAccountId:account.id}});return NextResponse.json(character,{status:201})}catch(error){return mutationError(error,"character.create","Персонаж с таким именем и сервером уже есть в этом игровом аккаунте")}}
