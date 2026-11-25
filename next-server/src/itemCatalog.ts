/** Item kind/sell/use metadata from original ItemBase + ItemConsume exports. */
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

export type ItemKind='currency'|'consume'|'material'|'shard'|'other';

type ConsumeRow={subType:number;param:number[][]};
type SellMap=Record<string,number>;
type TypeMap=Record<string,number>;
type ConsumeMap=Record<string,ConsumeRow>;

const here=dirname(fileURLToPath(import.meta.url));
const dataCandidates=[
 join(process.cwd(),'data'),
 join(here,'..','data'),
 join(here,'..','..','data'),
];

function loadJson<T>(name:string,fallback:T):T{
 for(const dir of dataCandidates){
  try{return JSON.parse(readFileSync(join(dir,name),'utf8')) as T}
  catch{/* try next */}
 }
 return fallback;
}

const TYPES:TypeMap=loadJson('item-base-types.json',{});
const SELL:SellMap=loadJson('item-sell-overrides.json',{});
const CONSUME:ConsumeMap=loadJson('item-consume-usable.json',{});

/** Original EnumType.ItemType → inventory filter kind. */
export function itemKind(itemId:number):ItemKind{
 const t=TYPES[String(itemId)];
 if(t===1)return 'currency';
 if(t===2)return 'consume';
 if(t===4)return 'shard';
 if(t===26||t===20||t===31||t===16||t===22)return 'material';
 // fallback heuristics for ids missing from export
 if([1,2,3,4,5,7,22].includes(itemId))return 'currency';
 if(itemId>=1010000&&itemId<=1099999)return 'shard';
 if(CONSUME[String(itemId)])return 'consume';
 if(itemId>=10000&&itemId<110000)return 'material';
 return 'other';
}

export function sellPrice(itemId:number):number{
 return SELL[String(itemId)]??0;
}

export function consumeConfig(itemId:number):ConsumeRow|undefined{
 return CONSUME[String(itemId)];
}

export function enrichItem(itemId:number,amount:string){
 const cfg=consumeConfig(itemId);
 const price=sellPrice(itemId);
 return {
  itemId,
  amount,
  kind:itemKind(itemId),
  sellPrice:price,
  canSell:price>0,
  usable:!!cfg,
  useSubType:cfg?.subType??null,
  icon:`item-icons/${itemId}.webp`,
 };
}
