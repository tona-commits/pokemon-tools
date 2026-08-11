// GBL(対人戦)で使う技データを生成する。
// public/pokemon-go-stats.json と同じ946種(dexごとの代表フォーム)を対象に、
// 各種族の使用可能な技(通常/げんきょう/わざレコード)一覧と、
// 技ごとの日本語名・タイプ・威力・エネルギー・ターン数・追加効果を
// public/pokemon-go-moves.json / public/pokemon-go-movesets.json に出力する。
// 実行: node scripts/generate-moves-json.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// PokeAPIの識別子(ハイフン区切り)に変換できないGO独自の派生技を、
// 元になっている技へ読み替えるための対応表
const MOVE_ALIASES = {
  SUPER_POWER: 'superpower',
  HYDRO_PUMP_BLASTOISE: 'hydro-pump',
  WATER_GUN_FAST_BLASTOISE: 'water-gun',
  AEGISLASH_CHARGE_AIR_SLASH: 'air-slash',
  AEGISLASH_CHARGE_PSYCHO_CUT: 'psycho-cut',
};
const MOVE_PREFIX_ALIASES = [
  ['HIDDEN_POWER_', 'hidden-power'],
  ['TECHNO_BLAST_', 'techno-blast'],
  ['WEATHER_BALL_', 'weather-ball'],
  ['AURA_WHEEL_', 'aura-wheel'],
];

function toIdentifier(moveId) {
  if (MOVE_ALIASES[moveId]) return MOVE_ALIASES[moveId];
  for (const [prefix, identifier] of MOVE_PREFIX_ALIASES) {
    if (moveId.startsWith(prefix)) return identifier;
  }
  return moveId.toLowerCase().replace(/_/g, '-');
}

async function main() {
  const gm = await fetch('https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster.json').then(
    (r) => r.json(),
  );
  const moveNamesCsv = await fetch(
    'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/move_names.csv',
  ).then((r) => r.text());
  const movesCsv = await fetch(
    'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/moves.csv',
  ).then((r) => r.text());

  const idByIdentifier = new Map();
  for (const line of movesCsv.split(/\r?\n/).slice(1)) {
    if (!line) continue;
    const cols = line.split(',');
    idByIdentifier.set(cols[1], Number(cols[0]));
  }

  const jaNameById = new Map();
  for (const line of moveNamesCsv.split(/\r?\n/).slice(1)) {
    if (!line) continue;
    const cols = line.split(',');
    if (Number(cols[1]) === 1) jaNameById.set(Number(cols[0]), cols[2]);
  }

  function jaNameFor(moveId, fallbackEnName) {
    const identifier = toIdentifier(moveId);
    const id = idByIdentifier.get(identifier);
    const name = id !== undefined ? jaNameById.get(id) : undefined;
    return name || fallbackEnName;
  }

  // public/pokemon-go-stats.json と同じ選定ロジック(dexごとに released && 非shadowの最初の1体)
  const byDex = new Map();
  for (const mon of gm.pokemon) {
    if (!mon.released) continue;
    if ((mon.tags || []).includes('shadow')) continue;
    if (!byDex.has(mon.dex)) byDex.set(mon.dex, mon);
  }
  const representatives = [...byDex.values()];

  const usedMoveIds = new Set();
  for (const mon of representatives) {
    for (const id of mon.fastMoves || []) usedMoveIds.add(id);
    for (const id of mon.chargedMoves || []) usedMoveIds.add(id);
  }

  const moves = {};
  for (const moveId of usedMoveIds) {
    const m = gm.moves.find((x) => x.moveId === moveId);
    if (!m) continue;
    const isFast = (m.energyGain || 0) > 0;
    const entry = {
      name: jaNameFor(moveId, m.name),
      type: m.type,
      power: m.power,
      turns: m.turns,
    };
    if (isFast) {
      entry.energyGain = m.energyGain;
    } else {
      entry.energyCost = m.energy;
    }
    if (m.buffs) {
      entry.buff = {
        target: m.buffTarget,
        atk: m.buffs[0],
        def: m.buffs[1],
        chance: Number(m.buffApplyChance),
      };
    }
    moves[moveId] = entry;
  }

  const movesets = {};
  for (const mon of representatives) {
    const entry = {
      fast: mon.fastMoves || [],
      charged: mon.chargedMoves || [],
    };
    if (mon.eliteMoves?.length) entry.elite = mon.eliteMoves;
    if (mon.legacyMoves?.length) entry.legacy = mon.legacyMoves;
    movesets[mon.speciesId] = entry;
  }

  // 種族値検索の「技タイプで絞り込む」用に、各種族が持つ技タイプの集合だけを
  // 軽量な専用ファイルとして書き出す(威力やエネルギーなどは不要なため)
  const moveTypes = {};
  for (const [speciesId, set] of Object.entries(movesets)) {
    const types = new Set();
    for (const id of [...set.fast, ...set.charged]) {
      const m = moves[id];
      if (m) types.add(m.type);
    }
    moveTypes[speciesId] = [...types];
  }

  writeFileSync(join(publicDir, 'pokemon-go-moves.json'), JSON.stringify(moves));
  writeFileSync(join(publicDir, 'pokemon-go-movesets.json'), JSON.stringify(movesets));
  writeFileSync(join(publicDir, 'pokemon-go-move-types.json'), JSON.stringify(moveTypes));

  console.log(
    'moves:', Object.keys(moves).length,
    ' movesets:', Object.keys(movesets).length,
    ' moveTypes:', Object.keys(moveTypes).length,
  );
}

main();
