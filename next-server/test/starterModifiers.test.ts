import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateHero} from '../src/heroAttrs.js';
import {unitFixtures} from './unitFixtures.js';
test('starter modifiers reproduce three original battle attribute sets',()=>{for(const u of unitFixtures){const attrs={...u.attrs} as Record<string,number>;for(const k of ['5','9','36','37'])delete attrs[k];const r=calculateHero(u.hero_id,u.level,u.star,true);assert.deepEqual(r.attrs,attrs);assert.deepEqual(r.skills,u.skills)}});
