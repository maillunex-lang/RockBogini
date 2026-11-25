export const ITEM_NAMES:Record<number,string>={
 1:"Coin",
 5:"Adventure Exp",
 7:"Expedition Order",
 22:"Beautiful Warrior Exp",
 10001:"Growth Stone",
 10403:"Special Summon",
 1011403:" Great Pirate Shard",
};
export function itemDisplayName(id:number){return ITEM_NAMES[id]??('Предмет '+id);}
