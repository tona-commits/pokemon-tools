import { TypeName } from './pokemon-types';

export interface PokemonStat {
  dex: number;
  name: string;
  speciesId: string;
  types: TypeName[];
  atk: number;
  def: number;
  hp: number;
  familyId: string;
}

export interface LeagueEntry {
  speciesId: string;
  level: number;
  cp: number;
  atk: number;
  def: number;
  hp: number;
}

export type SortKey = 'dex' | 'atk' | 'def' | 'hp' | 'glCp' | 'hlCp';

export type League = 'great' | 'hyper';

export interface PokemonSelectEvent {
  pokemon: PokemonStat;
  league: League;
}

// リーグとして実用的とみなすCPのしきい値。これ未満はグレー表示にする
export const GREAT_LEAGUE_GRAY_CP = 1400;
export const HYPER_LEAGUE_GRAY_CP = 2300;
