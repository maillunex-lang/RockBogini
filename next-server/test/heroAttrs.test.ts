import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateHero} from '../src/heroAttrs.js';
import {fixtures} from './attrsFixtures.js';
test('72 original Elixir hero attribute and skill fixtures',()=>{for(const f of fixtures)assert.deepEqual(calculateHero(f.id,f.level,f.star),{attrs:f.attrs,power:f.power,skills:f.skills},JSON.stringify([f.id,f.level,f.star]))});
