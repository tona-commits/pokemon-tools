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

export type SortKey = 'dex' | 'atk' | 'def' | 'hp' | 'glCp';

export function toCsv(rows: PokemonStat[], typeLabel: Record<TypeName, string>): string {
  const header = ['図鑑番号', '名前', 'タイプ1', 'タイプ2', 'こうげき', 'ぼうぎょ', 'HP'];
  const lines = rows.map((r) =>
    [
      r.dex,
      r.name,
      typeLabel[r.types[0]] ?? '',
      r.types[1] ? (typeLabel[r.types[1]] ?? '') : '',
      r.atk,
      r.def,
      r.hp,
    ].join(','),
  );
  // Excelで文字化けしないようUTF-8 BOMを付与する
  const bom = String.fromCharCode(0xfeff);
  return bom + [header.join(','), ...lines].join('\n');
}
