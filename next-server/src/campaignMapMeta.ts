import {readFileSync} from 'node:fs';

export type EnemyPreview={heroId?:number;model?:string;level?:number;star?:number;station?:number};
export type MapMeta={
 type:number;
 boss:boolean;
 chapterId:number;
 stageIndex:number;
 stageCount:number;
 label:string;
 bg?:string;
 maxRounds?:number;
 enemyCount:number;
 enemies:EnemyPreview[];
 rewards:number[][];
 level?:number;
 terminal?:boolean;
};

type File={maps:Record<string,MapMeta>;modules:Record<string,string>;stats:Record<string,number>};
const data=JSON.parse(readFileSync(new URL('../../data/campaign-map-meta.json',import.meta.url),'utf8')) as File;

export function mapMeta(mapId:number):MapMeta|undefined{
 return data.maps[String(mapId)];
}

export function moduleName(moduleId:number):string{
 return data.modules[String(moduleId)]??`Модуль ${moduleId}`;
}

export function mapMetaStats(){
 return data.stats;
}

export function isBossMap(mapId:number){
 return !!mapMeta(mapId)?.boss;
}
