import {readFileSync} from 'node:fs';
import type {Fighter} from './battle/simulation.js';
export const campaignUnits=JSON.parse(readFileSync(new URL('../../data/campaign-units.json',import.meta.url),'utf8')) as Record<string,{maxRounds:number;bg:string;units:Omit<Fighter,'buffs'>[]}>;
