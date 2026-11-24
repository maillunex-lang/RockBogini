import type {Buff} from './buffs.js';
export function modifiedGroups(buffs:readonly Buff[],types:readonly number[],groups:readonly number[][]):number[][]{
 const pick=(key:'head'|'tail')=>buffs.flatMap(b=>(b[key]??[]).filter(([sel])=>types.includes(sel)).flatMap(([,ids])=>ids));
 const head=pick('head'),tail=pick('tail'),out=groups.map(g=>[...g]);
 if(!out.length)return head.length||tail.length?[[...head,...tail]]:[];
 out[0].unshift(...head);out[out.length-1].push(...tail);return out;
}
