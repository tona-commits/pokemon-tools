export type TypeName =
  | 'normal'
  | 'fire'
  | 'water'
  | 'electric'
  | 'grass'
  | 'ice'
  | 'fighting'
  | 'poison'
  | 'ground'
  | 'flying'
  | 'psychic'
  | 'bug'
  | 'rock'
  | 'ghost'
  | 'dragon'
  | 'dark'
  | 'steel'
  | 'fairy';

export interface TypeInfo {
  name: TypeName;
  label: string;
  color: string;
}

export const TYPES: TypeInfo[] = [
  { name: 'normal', label: 'ノーマル', color: '#A8A878' },
  { name: 'fire', label: 'ほのお', color: '#F08030' },
  { name: 'water', label: 'みず', color: '#6890F0' },
  { name: 'electric', label: 'でんき', color: '#F8D030' },
  { name: 'grass', label: 'くさ', color: '#78C850' },
  { name: 'ice', label: 'こおり', color: '#98D8D8' },
  { name: 'fighting', label: 'かくとう', color: '#C03028' },
  { name: 'poison', label: 'どく', color: '#A040A0' },
  { name: 'ground', label: 'じめん', color: '#E0C068' },
  { name: 'flying', label: 'ひこう', color: '#A890F0' },
  { name: 'psychic', label: 'エスパー', color: '#F85888' },
  { name: 'bug', label: 'むし', color: '#A8B820' },
  { name: 'rock', label: 'いわ', color: '#B8A038' },
  { name: 'ghost', label: 'ゴースト', color: '#705898' },
  { name: 'dragon', label: 'ドラゴン', color: '#7038F8' },
  { name: 'dark', label: 'あく', color: '#705848' },
  { name: 'steel', label: 'はがね', color: '#B8B8D0' },
  { name: 'fairy', label: 'フェアリー', color: '#EE99AC' },
];

export const TYPE_LABEL: Record<TypeName, string> = TYPES.reduce(
  (acc, t) => ({ ...acc, [t.name]: t.label }),
  {} as Record<TypeName, string>,
);

export const TYPE_COLOR: Record<TypeName, string> = TYPES.reduce(
  (acc, t) => ({ ...acc, [t.name]: t.color }),
  {} as Record<TypeName, string>,
);

interface DefenseEntry {
  /** 攻撃を受けると「effective」(ばつぐん)になる攻撃タイプ */
  weak: TypeName[];
  /** 攻撃を受けると「not very effective」(いまひとつ)になる攻撃タイプ */
  resist: TypeName[];
}

// 防御側タイプごとの相性表。
// ポケモンGOのタイプ相性は本編シリーズと異なり「効果がない(0倍)」は存在せず、
// 本編で無効だった組み合わせはすべて「いまひとつ」(耐性)として扱われる。
// 例: ノーマルはゴーストが効かない(本編)→ ノーマルはゴーストが「いまひとつ」(GO)
const DEFENSE_CHART: Record<TypeName, DefenseEntry> = {
  normal: { weak: ['fighting'], resist: ['ghost'] },
  fire: {
    weak: ['water', 'ground', 'rock'],
    resist: ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'],
  },
  water: {
    weak: ['electric', 'grass'],
    resist: ['fire', 'water', 'ice', 'steel'],
  },
  electric: { weak: ['ground'], resist: ['electric', 'flying', 'steel'] },
  grass: {
    weak: ['fire', 'ice', 'poison', 'flying', 'bug'],
    resist: ['water', 'electric', 'grass', 'ground'],
  },
  ice: { weak: ['fire', 'fighting', 'rock', 'steel'], resist: ['ice'] },
  fighting: {
    weak: ['flying', 'psychic', 'fairy'],
    resist: ['bug', 'rock', 'dark'],
  },
  poison: {
    weak: ['ground', 'psychic'],
    resist: ['grass', 'fighting', 'poison', 'bug', 'fairy'],
  },
  ground: {
    weak: ['water', 'grass', 'ice'],
    resist: ['poison', 'rock', 'electric'],
  },
  flying: {
    weak: ['electric', 'ice', 'rock'],
    resist: ['grass', 'fighting', 'bug', 'ground'],
  },
  psychic: { weak: ['bug', 'ghost', 'dark'], resist: ['fighting', 'psychic'] },
  bug: { weak: ['fire', 'flying', 'rock'], resist: ['grass', 'fighting', 'ground'] },
  rock: {
    weak: ['water', 'grass', 'fighting', 'ground', 'steel'],
    resist: ['normal', 'fire', 'poison', 'flying'],
  },
  ghost: {
    weak: ['ghost', 'dark'],
    resist: ['poison', 'bug', 'normal', 'fighting'],
  },
  dragon: { weak: ['ice', 'dragon', 'fairy'], resist: ['fire', 'water', 'grass', 'electric'] },
  dark: { weak: ['fighting', 'bug', 'fairy'], resist: ['ghost', 'dark', 'psychic'] },
  steel: {
    weak: ['fire', 'fighting', 'ground'],
    resist: [
      'normal',
      'grass',
      'ice',
      'flying',
      'psychic',
      'bug',
      'rock',
      'dragon',
      'steel',
      'fairy',
      'poison',
    ],
  },
  fairy: {
    weak: ['poison', 'steel'],
    resist: ['fighting', 'bug', 'dark', 'dragon'],
  },
};

/** 単体タイプの相性を「段階」で表す。+1=effective、-1=not very effective、0=neutral */
function singleTier(attackType: TypeName, defendType: TypeName): number {
  const entry = DEFENSE_CHART[defendType];
  if (entry.weak.includes(attackType)) return 1;
  if (entry.resist.includes(attackType)) return -1;
  return 0;
}

// ポケモンGOの実際のダメージ倍率。段階の合計(-2〜2)にそのまま対応する。
const TIER_MULTIPLIER: Record<number, number> = {
  2: 2.56,
  1: 1.6,
  0: 1,
  [-1]: 0.625,
  [-2]: 0.390625,
};

/** 防御側タイプ(1つまたは2つ)に対する、全攻撃タイプの倍率(ポケモンGO仕様)を計算する */
export function calcEffectiveness(defendTypes: TypeName[]): Record<TypeName, number> {
  const result = {} as Record<TypeName, number>;
  for (const t of TYPES) {
    const tierSum = defendTypes.reduce(
      (sum, defendType) => sum + singleTier(t.name, defendType),
      0,
    );
    result[t.name] = TIER_MULTIPLIER[tierSum];
  }
  return result;
}

/** 攻撃側の技タイプ1つに対する、全防御タイプ(単体)への倍率(ポケモンGO仕様)を計算する */
export function calcMoveEffectiveness(attackType: TypeName): Record<TypeName, number> {
  const result = {} as Record<TypeName, number>;
  for (const t of TYPES) {
    result[t.name] = TIER_MULTIPLIER[singleTier(attackType, t.name)];
  }
  return result;
}
