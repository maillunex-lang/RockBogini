import test from 'node:test';
import assert from 'node:assert/strict';
import {modifiedGroups} from '../src/battle/skillMods.js';
import type {Buff} from '../src/battle/buffs.js';
test('head and tail modifiers preserve group order and filter effect type',()=>{const b={head:[[1,[8]],[2,[9]]],tail:[[1,[7]]]} as Buff;assert.deepEqual(modifiedGroups([b],[1],[[1],[2]]),[[8,1],[2,7]]);assert.deepEqual(modifiedGroups([b],[1],[]),[[8,7]]);assert.deepEqual(modifiedGroups([b],[3],[[1]]),[[1]])});
