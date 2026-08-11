// 対象種族(dexごとの代表フォーム + アローラ/ガラル/ヒスイ/パルデアのリージョンフォーム)を
// gamemaster.pokemon の配列から選び出す共通ロジック。
// public/pokemon-go-stats.json・pokemon-go-moves(ets).json など、全生成スクリプトで共有する。

const REGION_TAGS = ['alolan', 'galarian', 'hisuian', 'paldean'];

export const REGION_PREFIX = {
  alolan: 'アローラ',
  galarian: 'ガラル',
  hisuian: 'ヒスイ',
  paldean: 'パルデア',
};

/**
 * @returns {{ mon: object, regionTag: string | null }[]}
 *   mon: gamemaster.pokemon の1エントリ、regionTag: リージョンフォームなら 'alolan' 等、通常フォームなら null
 */
export function selectRepresentatives(gamemasterPokemon) {
  const byDex = new Map();
  const regionals = [];

  for (const mon of gamemasterPokemon) {
    if (!mon.released) continue;
    if ((mon.tags || []).includes('shadow')) continue;

    const regionTag = REGION_TAGS.find((t) => (mon.tags || []).includes(t));
    if (regionTag) {
      regionals.push({ mon, regionTag });
    } else if (!byDex.has(mon.dex)) {
      byDex.set(mon.dex, mon);
    }
  }

  const base = [...byDex.values()].map((mon) => ({ mon, regionTag: null }));
  return [...base, ...regionals].sort(
    (a, b) => a.mon.dex - b.mon.dex || a.mon.speciesId.localeCompare(b.mon.speciesId),
  );
}

/** リージョンフォームには「アローラ」等の接頭辞を付けた和名を返す */
export function japaneseNameFor(mon, regionTag, jaNameByDex) {
  const baseName = jaNameByDex.get(mon.dex) || mon.speciesName;
  return regionTag ? REGION_PREFIX[regionTag] + baseName : baseName;
}
