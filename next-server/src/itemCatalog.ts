/** Item kind/sell/use metadata from original ItemBase + ItemConsume exports. */
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

export type ItemKind='currency'|'consume'|'material'|'shard'|'personality'|'other';

type ConsumeRow={subType:number;param:number[][]};
type PieceRow={Id:number;RequireCount:number;CardId:number;SubType:number};
type SellMap=Record<string,number>;
type TypeMap=Record<string,number>;
type ConsumeMap=Record<string,ConsumeRow>;
type PersMap=Record<string,{type:number;element:number}>;

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
const PIECES:Record<string,PieceRow>=loadJson('item-piece-original.json',{});
const PERS:PersMap=loadJson('item-personality.json',{});

/** Original EnumType.ItemType → inventory filter kind. */
export function itemKind(itemId:number):ItemKind{
 if(PERS[String(itemId)]||TYPES[String(itemId)]===10)return 'personality';
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

export function personalityElement(itemId:number){
 return PERS[String(itemId)]?.element??0;
}

export function sellPrice(itemId:number):number{
 return SELL[String(itemId)]??0;
}

/** Original ItemPiece subtype 1: hero fragments combine into a card item. */
export function heroPieceRecipe(itemId:number):{itemId:number;need:number;cardId:number}|undefined{
 const p=PIECES[String(itemId)];
 if(!p||p.SubType!==1||p.RequireCount<=0||p.CardId<=0)return undefined;
 return {itemId,need:p.RequireCount,cardId:p.CardId};
}
export function heroPieceRecipes(){
 return Object.values(PIECES)
  .filter(p=>p.SubType===1&&p.RequireCount>0&&p.CardId>0)
  .map(p=>({itemId:p.Id,need:p.RequireCount,cardId:p.CardId}))
  .sort((a,b)=>a.itemId-b.itemId);
}

export function consumeConfig(itemId:number):ConsumeRow|undefined{
 return CONSUME[String(itemId)];
}

export function enrichItem(itemId:number,amount:string){
 const cfg=consumeConfig(itemId);
 const piece=heroPieceRecipe(itemId);
 const price=sellPrice(itemId);
 const kind=itemKind(itemId);
 const element=personalityElement(itemId);
 return {
  itemId,
  amount,
  kind,
  sellPrice:price,
  canSell:price>0,
  usable:!!cfg,
  useSubType:cfg?.subType??null,
  compose:piece?{need:piece.need,cardId:piece.cardId,max:Math.floor(Number(amount)/piece.need)}:undefined,
  canPersonalityDisplace:kind==='personality'&&element>=1&&element<=3,
  element:element||undefined,
  icon:`item-icons/${itemId}.webp`,
 };
}
