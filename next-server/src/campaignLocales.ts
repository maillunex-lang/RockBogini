import {readFileSync} from 'node:fs';

type CampaignLocalesFile={
 source:string;
 mapWorldNames:Record<string,string>;
 ui:Record<string,string>;
};

const locales=JSON.parse(readFileSync(new URL('../../data/campaign-locales.json',import.meta.url),'utf8')) as CampaignLocalesFile;

export function mapWorldName(worldId:number):string{
 return locales.mapWorldNames[String(worldId)]??`Область ${worldId}`;
}

export function campaignUi(key:string,fallback:string):string{
 return locales.ui[key]??fallback;
}
