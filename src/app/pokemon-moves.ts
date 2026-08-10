import { TypeName } from './pokemon-types';

export interface MoveBuff {
  target: 'self' | 'opponent';
  atk: number;
  def: number;
  chance: number;
}

export interface MoveEntry {
  name: string;
  type: TypeName;
  power: number;
  turns: number;
  energyGain?: number;
  energyCost?: number;
  buff?: MoveBuff;
}

export interface MovesetEntry {
  fast: string[];
  charged: string[];
  elite?: string[];
  legacy?: string[];
}

const STAB_MULTIPLIER = 1.2;

export interface DisplayMove {
  id: string;
  entry: MoveEntry;
  elite: boolean;
  legacy: boolean;
  /** タイプ一致(STAB)しているか */
  stab: boolean;
  /** STAB適用後の威力 */
  power: number;
  /** 1ターンあたりのダメージ(STAB適用後の威力 ÷ ターン数) */
  dpt: number;
  /** 1ターンあたりのエネルギー獲得(通常わざのみ) */
  ept: number | null;
}

export function buildDisplayMoves(
  ids: string[],
  moves: Record<string, MoveEntry>,
  eliteIds: string[] | undefined,
  legacyIds: string[] | undefined,
  pokemonTypes: TypeName[],
): DisplayMove[] {
  const eliteSet = new Set(eliteIds ?? []);
  const legacySet = new Set(legacyIds ?? []);
  return ids
    .filter((id) => moves[id])
    .map((id) => {
      const entry = moves[id];
      const stab = pokemonTypes.includes(entry.type);
      const power = stab ? entry.power * STAB_MULTIPLIER : entry.power;
      return {
        id,
        entry,
        elite: eliteSet.has(id),
        legacy: legacySet.has(id),
        stab,
        power,
        dpt: power / entry.turns,
        ept: entry.energyGain !== undefined ? entry.energyGain / entry.turns : null,
      };
    });
}
