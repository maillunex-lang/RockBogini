/** Approved fantasy display names — IDs and balance unchanged. */
export const heroNames:Record<number,string>={
 11303:'Аэлирис',
 12301:'Вейрисса',
 12402:'Селестари',
};

export function heroDisplayName(heroId:number){
 return heroNames[heroId]??('Герой №'+heroId);
}
