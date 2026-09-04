import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma"; import { requireUser } from "@/lib/permissions";
const schema=z.object({name:z.string().trim().min(1).max(40),server:z.string().trim().max(50).nullable().optional(),note:z.string().trim().max(500).nullable().optional()});
async function owned(id:string,userId:string){return prisma.character.findFirst({where:{id,userId}})}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=await requireUser(),{id}=await params;if(!await owned(id,user.id))return NextResponse.json({error:"Не найдено"},{status:404});return NextResponse.json(await prisma.character.update({where:{id},data:schema.parse(await request.json())}))}catch{return NextResponse.json({error:"Некорректные данные"},{status:400})}}
export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){try{const user=await requireUser(),{id}=await params;if(!await owned(id,user.id))return NextResponse.json({error:"Не найдено"},{status:404});await prisma.character.delete({where:{id}});return new NextResponse(null,{status:204})}catch{return NextResponse.json({error:"Не удалось удалить"},{status:400})}}
