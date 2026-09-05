import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
const schema=z.object({name:z.string().trim().min(1).max(60)});
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=await requireUser(),{id}=await params,input=schema.parse(await request.json());const account=await prisma.gameAccount.findFirst({where:{id,userId:user.id}});if(!account)return NextResponse.json({error:"Аккаунт не найден"},{status:404});return NextResponse.json(await prisma.gameAccount.update({where:{id},data:input}))}catch{return NextResponse.json({error:"Не удалось изменить аккаунт"},{status:400})}}
export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){try{const user=await requireUser(),{id}=await params;const account=await prisma.gameAccount.findFirst({where:{id,userId:user.id}});if(!account)return NextResponse.json({error:"Аккаунт не найден"},{status:404});await prisma.gameAccount.delete({where:{id}});return new NextResponse(null,{status:204})}catch{return NextResponse.json({error:"Не удалось удалить аккаунт"},{status:400})}}
