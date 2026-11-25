/** Lightweight item kind map for inventory filters (original EnumType.ItemType). */
export type ItemKind='currency'|'consume'|'material'|'shard'|'other';

const CURRENCY=new Set([1,2,3,4,5,7,22]);
const MATERIAL=new Set([60,87,95,10001,4903,4904,4905,10451,10480]);
const SHARD=new Set([1011403]);
const CONSUME=new Set([10403,110010]);

export function itemKind(itemId:number):ItemKind{
 if(CURRENCY.has(itemId))return 'currency';
 if(CONSUME.has(itemId))return 'consume';
 if(SHARD.has(itemId)||(itemId>=1010000&&itemId<=1099999))return 'shard';
 if(MATERIAL.has(itemId)||(itemId>=10000&&itemId<110000))return 'material';
 return 'other';
}

export function enrichItem(itemId:number,amount:string){
 return {itemId,amount,kind:itemKind(itemId)};
}
