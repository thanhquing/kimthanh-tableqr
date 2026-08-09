import { HttpException, Injectable } from '@nestjs/common'
import { randomBytes } from 'node:crypto'
import { PrismaService } from '../prisma.service'
const fail=(s:number,c:string,m:string):never=>{throw new HttpException({error:{code:c,message:m,details:null}},s)}
const string=(v:unknown)=>typeof v==='string'?v:undefined; const int=(v:unknown)=>typeof v==='number'&&Number.isInteger(v)?v:undefined
@Injectable() export class AdminService {
 constructor(private readonly prisma:PrismaService){}
 categories(){return this.prisma.menuCategory.findMany({orderBy:{sortOrder:'asc'}})}
 async createCategory(b:Record<string,unknown>){const name=string(b.name),sortOrder=int(b.sortOrder);if(!name||sortOrder===undefined)fail(400,'VALIDATION_ERROR','Danh mục không hợp lệ.');return this.prisma.menuCategory.create({data:{name:name!,sortOrder:sortOrder!}})}
 async updateCategory(id:string,b:Record<string,unknown>){return this.prisma.menuCategory.update({where:{id},data:{...(string(b.name)?{name:string(b.name)}:{}),...(int(b.sortOrder)!==undefined?{sortOrder:int(b.sortOrder)}:{}),...(typeof b.isActive==='boolean'?{isActive:b.isActive}:{})}})}
 async deleteCategory(id:string){if(await this.prisma.menuItem.count({where:{categoryId:id,deletedAt:null}}))fail(409,'CATEGORY_NOT_EMPTY','Danh mục vẫn còn món.');await this.prisma.menuCategory.delete({where:{id}});return {id}}
 items(categoryId?:string){return this.prisma.menuItem.findMany({where:{deletedAt:null,...(categoryId?{categoryId}:{})},orderBy:{sortOrder:'asc'}})}
 async createItem(b:Record<string,unknown>){const categoryId=string(b.categoryId),name=string(b.name),priceVnd=int(b.priceVnd),sortOrder=int(b.sortOrder);if(!categoryId||!name||priceVnd===undefined||sortOrder===undefined)fail(400,'VALIDATION_ERROR','Món không hợp lệ.');return this.prisma.menuItem.create({data:{categoryId:categoryId!,name:name!,priceVnd:priceVnd!,sortOrder:sortOrder!,description:string(b.description)??null,imageUrl:string(b.imageUrl)??null}})}
 async updateItem(id:string,b:Record<string,unknown>){return this.prisma.menuItem.update({where:{id},data:{...(string(b.categoryId)?{categoryId:string(b.categoryId)}:{}),...(string(b.name)?{name:string(b.name)}:{}),...(int(b.priceVnd)!==undefined?{priceVnd:int(b.priceVnd)}:{}),...(int(b.sortOrder)!==undefined?{sortOrder:int(b.sortOrder)}:{}),...(typeof b.description==='string'||b.description===null?{description:b.description}:{}),...(typeof b.imageUrl==='string'||b.imageUrl===null?{imageUrl:b.imageUrl}:{}),...(typeof b.isAvailable==='boolean'?{isAvailable:b.isAvailable}:{})}})}
 async deleteItem(id:string){await this.prisma.menuItem.update({where:{id},data:{deletedAt:new Date()}});return {id}}
 async tables(){const tables=await this.prisma.diningTable.findMany({orderBy:{sortOrder:'asc'}});const base=process.env.GUEST_BASE_URL??'http://localhost:5173';return {tables:tables.map(t=>({...t,qrUrl:`${base}/t/${t.qrToken}`}))}}
 async createTable(b:Record<string,unknown>){const code=string(b.code),displayName=string(b.displayName),sortOrder=int(b.sortOrder);if(!code||!displayName||sortOrder===undefined)fail(400,'VALIDATION_ERROR','Bàn không hợp lệ.');const qrToken=randomBytes(18).toString('base64url');return this.prisma.diningTable.create({data:{code:code!,displayName:displayName!,sortOrder:sortOrder!,qrToken}})}
 updateTable(id:string,b:Record<string,unknown>){return this.prisma.diningTable.update({where:{id},data:{...(string(b.code)?{code:string(b.code)}:{}),...(string(b.displayName)?{displayName:string(b.displayName)}:{}),...(int(b.sortOrder)!==undefined?{sortOrder:int(b.sortOrder)}:{}),...(typeof b.isActive==='boolean'?{isActive:b.isActive}:{})}})}
 async deleteTable(id:string){if(await this.prisma.tableSession.count({where:{tableId:id,status:'OPEN'}}))fail(409,'TABLE_HAS_OPEN_SESSION','Bàn đang có khách.');await this.prisma.diningTable.delete({where:{id}});return {id}}
 restaurant(){return this.prisma.restaurant.findFirstOrThrow()}
 async updateRestaurant(b:Record<string,unknown>){const restaurant=await this.prisma.restaurant.findFirstOrThrow();return this.prisma.restaurant.update({where:{id:restaurant.id},data:{...(string(b.name)?{name:string(b.name)}:{}),...(typeof b.logoUrl==='string'||b.logoUrl===null?{logoUrl:b.logoUrl}:{}),...(typeof b.address==='string'||b.address===null?{address:b.address}:{})}})}
}
