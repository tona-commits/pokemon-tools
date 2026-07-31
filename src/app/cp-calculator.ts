// レベル1.0〜55.0(0.5刻み)に対応するCP係数(CPM)。インデックス = (レベル-1)*2
const CPM: number[] = [
  0.094, 0.135137, 0.166398, 0.192651, 0.215732, 0.236573, 0.25572, 0.27353, 0.29025, 0.306057,
  0.321088, 0.335445, 0.349213, 0.362458, 0.375236, 0.387592, 0.399567, 0.411194, 0.4225, 0.432926,
  0.443108, 0.45306, 0.462798, 0.472336, 0.481685, 0.490856, 0.499858, 0.508702, 0.517394,
  0.525943, 0.534354, 0.542636, 0.550793, 0.558831, 0.566755, 0.574569, 0.582279, 0.589888, 0.5974,
  0.604824, 0.612157, 0.619404, 0.626567, 0.633649, 0.640653, 0.647581, 0.654436, 0.661219,
  0.667934, 0.674582, 0.681165, 0.687685, 0.694144, 0.700543, 0.706884, 0.713169, 0.719399,
  0.725576, 0.7317, 0.734741, 0.737769, 0.740786, 0.743789, 0.746781, 0.749761, 0.752729, 0.755686,
  0.75863, 0.761564, 0.764486, 0.767397, 0.770297, 0.773187, 0.776065, 0.778933, 0.78179, 0.784637,
  0.787474, 0.7903, 0.792804, 0.7953, 0.797804, 0.8003, 0.802804, 0.8053, 0.807804, 0.8103, 0.812804,
  0.8153, 0.817804, 0.8203, 0.822804, 0.8253, 0.827804, 0.8303, 0.832804, 0.8353, 0.837804, 0.8403,
  0.842804, 0.8453, 0.847804, 0.8503, 0.852804, 0.8553, 0.857804, 0.8603, 0.862804, 0.8653,
];

export const GREAT_LEAGUE_CP_CAP = 1500;

export interface LeagueStatsResult {
  level: number;
  cp: number;
  atk: number;
  def: number;
  hp: number;
}

function levelFromIndex(index: number): number {
  return index / 2 + 1;
}

function cpAt(baseAtk: number, baseDef: number, baseHp: number, ivAtk: number, ivDef: number, ivHp: number, cpm: number): number {
  return Math.floor(
    ((baseAtk + ivAtk) * Math.sqrt(baseDef + ivDef) * Math.sqrt(baseHp + ivHp) * cpm * cpm) / 10,
  );
}

/**
 * 指定した個体値(0〜15)で、CPがcpCap未満になる最大レベルとその時のこうげき/ぼうぎょ/HPを求める。
 * どのレベルでもCPがcpCapを超える場合はnullを返す。
 */
export function findMaxLevelUnderCp(
  baseAtk: number,
  baseDef: number,
  baseHp: number,
  ivAtk: number,
  ivDef: number,
  ivHp: number,
  cpCap: number = GREAT_LEAGUE_CP_CAP,
): LeagueStatsResult | null {
  let best: LeagueStatsResult | null = null;

  for (let i = 0; i < CPM.length; i++) {
    const cpm = CPM[i];
    const cp = cpAt(baseAtk, baseDef, baseHp, ivAtk, ivDef, ivHp, cpm);
    if (cp < cpCap) {
      best = {
        level: levelFromIndex(i),
        cp,
        atk: cpm * (baseAtk + ivAtk),
        def: cpm * (baseDef + ivDef),
        hp: Math.max(Math.floor(cpm * (baseHp + ivHp)), 10),
      };
    } else {
      break;
    }
  }

  return best;
}
