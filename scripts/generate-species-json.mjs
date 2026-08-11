// public/pokemon-go-stats.json を生成する。
// pvpoke gamemaster.json から対象種族(dexごとの代表フォーム + リージョンフォーム)を選び、
// 和名はPokeAPIのspecies名(+リージョン接頭辞)を使う。
// 実行: node scripts/generate-species-json.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { selectRepresentatives, japaneseNameFor } from './lib/species.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

async function main() {
  const gm = await fetch('https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster.json').then(
    (r) => r.json(),
  );
  const speciesNamesCsv = await fetch(
    'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv',
  ).then((r) => r.text());

  const jaNameByDex = new Map();
  for (const line of speciesNamesCsv.split(/\r?\n/).slice(1)) {
    if (!line) continue;
    const cols = line.split(',');
    if (Number(cols[1]) === 1) jaNameByDex.set(Number(cols[0]), cols[2]);
  }

  const entries = selectRepresentatives(gm.pokemon);

  const rows = entries.map(({ mon, regionTag }) => ({
    dex: mon.dex,
    name: japaneseNameFor(mon, regionTag, jaNameByDex),
    speciesId: mon.speciesId,
    types: mon.types.filter((t) => t !== 'none'),
    atk: mon.baseStats.atk,
    def: mon.baseStats.def,
    hp: mon.baseStats.hp,
    familyId: mon.family ? mon.family.id : 'FAMILY_' + mon.speciesId.toUpperCase(),
  }));

  writeFileSync(join(publicDir, 'pokemon-go-stats.json'), JSON.stringify(rows));
  console.log('species:', rows.length);
}

main();
