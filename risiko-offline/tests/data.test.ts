import { test } from 'node:test';
import assert from 'node:assert/strict';
import { territories, continents, objectives, cards } from '../src/data/mapGraph.ts';
export const overlaps = [[86, 41, 39, 53, 56, 48, 42, 47, 15, 35, 24, 30, 47, 51, 40, 65], [41, 86, 69, 68, 44, 57, 37, 49, 46, 53, 69, 49, 31, 39, 31, 56], [39, 69, 86, 51, 44, 70, 43, 32, 55, 36, 69, 55, 20, 56, 48, 39], [53, 68, 51, 86, 48, 43, 23, 63, 28, 63, 51, 35, 35, 29, 24, 70], [56, 44, 44, 48, 86, 40, 27, 48, 43, 52, 27, 33, 62, 30, 45, 41], [48, 57, 70, 43, 40, 86, 43, 44, 51, 32, 69, 43, 16, 60, 36, 43], [42, 37, 43, 23, 27, 43, 86, 19, 51, 19, 53, 74, 51, 65, 68, 35], [47, 49, 32, 63, 48, 44, 19, 86, 39, 74, 44, 19, 42, 24, 14, 63], [15, 46, 55, 28, 43, 51, 51, 39, 86, 51, 51, 63, 51, 43, 54, 16], [35, 53, 36, 63, 52, 32, 19, 74, 51, 86, 41, 31, 54, 12, 26, 51], [24, 69, 69, 51, 27, 69, 53, 44, 51, 41, 86, 54, 19, 51, 36, 51], [30, 49, 55, 35, 33, 43, 74, 19, 63, 31, 54, 86, 51, 59, 68, 35], [47, 31, 20, 35, 62, 16, 51, 42, 51, 54, 19, 51, 86, 30, 58, 35], [51, 39, 56, 29, 30, 60, 65, 24, 43, 12, 51, 59, 30, 86, 58, 45], [40, 31, 48, 24, 45, 36, 68, 14, 54, 26, 36, 68, 58, 58, 86, 24], [65, 56, 39, 70, 41, 43, 35, 63, 16, 51, 51, 35, 35, 45, 24, 86]];
test('42 territories: symmetric graph, 164 points and six continent totals', () => {
  assert.equal(territories.length, 42);
  assert.equal(territories.reduce((n, t) => n + t.points, 0), 164);
  for (const t of territories) {
    assert.equal(new Set(t.neighbors).size, t.points);
    for (const n of t.neighbors) assert.ok(territories[n].neighbors.includes(t.id), `${t.name} / ${territories[n].name}`);
  }
  for (const c of continents) assert.equal(territories.filter(t => t.continent === c.id).reduce((n, t) => n + t.points, 0), c.points);
});
test('16 objectives: 86 points and published overlaps, with three documented source errata', () => {
  assert.equal(objectives.length, 16);
  assert.equal(new Set(objectives.map(o => o.territories.join(','))).size, 16);
  for (const [i, a] of objectives.entries()) {
    assert.equal(new Set(a.territories).size, a.territories.length);
    assert.equal(a.territories.reduce((n, t) => n + territories[t].points, 0), 86, a.name);
    for (const [j, b] of objectives.entries()) assert.equal(a.territories.filter(t => b.territories.includes(t)).reduce((n, t) => n + territories[t].points, 0), ({
      '0,10': 36,
      '10,0': 36,
      '2,5': 74,
      '5,2': 74,
      '6,10': 54,
      '10,6': 54
    } as Record<string, number>)[`${i},${j}`] ?? overlaps[i][j], `${a.name}/${b.name}`);
  }
});
test('44-card deck has 14 of each regular symbol and 2 jokers', () => {
  assert.equal(cards.length, 44);
  for (const s of ['cannone', 'fante', 'cavaliere']) assert.equal(cards.filter(c => c.symbol === s).length, 14);
  assert.equal(cards.filter(c => c.symbol === 'jolly').length, 2);
});
