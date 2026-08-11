import { Component, computed, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TYPE_COLOR, TYPE_LABEL, TYPES, TypeName } from './pokemon-types';
import {
  GREAT_LEAGUE_GRAY_CP,
  HYPER_LEAGUE_GRAY_CP,
  LeagueEntry,
  PokemonSelectEvent,
  PokemonStat,
} from './pokemon-stats';

type SearchLeague = 'none' | 'great' | 'hyper';
type SearchSortKey = 'dex' | 'atk' | 'def' | 'hp' | 'total';

interface DisplayRow {
  stat: PokemonStat;
  atk: number;
  def: number;
  hp: number;
  total: number;
  cp: number | null;
  level: number | null;
  isGray: boolean;
}

@Component({
  selector: 'app-pokemon-stats-search',
  imports: [DecimalPipe],
  templateUrl: './pokemon-stats-search.html',
  styleUrl: './pokemon-stats-search.scss',
})
export class PokemonStatsSearch {
  readonly select = output<PokemonSelectEvent>();

  protected readonly types = TYPES;
  protected readonly typeLabel = TYPE_LABEL;
  protected readonly typeColor = TYPE_COLOR;

  protected readonly allStats = signal<PokemonStat[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);

  protected readonly greatLeague = signal<Record<string, LeagueEntry>>({});
  protected readonly hyperLeague = signal<Record<string, LeagueEntry>>({});
  protected readonly league = signal<SearchLeague>('none');

  protected readonly searchTerm = signal('');
  protected readonly showFamily = signal(true);
  protected readonly hideGray = signal(true);
  protected readonly sortKey = signal<SearchSortKey>('dex');
  protected readonly sortDesc = signal(false);

  protected readonly showTypeFilter = signal(false);
  protected readonly typeFilter = signal<TypeName[]>([]);

  private readonly grayThreshold = computed(() =>
    this.league() === 'great' ? GREAT_LEAGUE_GRAY_CP : HYPER_LEAGUE_GRAY_CP,
  );

  protected readonly rows = computed<DisplayRow[]>(() => {
    const league = this.league();
    const gl = this.greatLeague();
    const hl = this.hyperLeague();
    const threshold = this.grayThreshold();

    return this.allStats().map((stat) => {
      if (league === 'none') {
        return {
          stat,
          atk: stat.atk,
          def: stat.def,
          hp: stat.hp,
          total: stat.atk + stat.def + stat.hp,
          cp: null,
          level: null,
          isGray: false,
        };
      }
      const entry = (league === 'great' ? gl : hl)[stat.speciesId];
      if (!entry) {
        return { stat, atk: 0, def: 0, hp: 0, total: -1, cp: null, level: null, isGray: true };
      }
      return {
        stat,
        atk: entry.atk,
        def: entry.def,
        hp: entry.hp,
        total: entry.atk + entry.def + entry.hp,
        cp: entry.cp,
        level: entry.level,
        isGray: entry.cp < threshold,
      };
    });
  });

  protected readonly filteredSorted = computed<DisplayRow[]>(() => {
    const term = this.searchTerm().trim();
    const key = this.sortKey();
    const desc = this.sortDesc();
    const league = this.league();
    const hideGray = this.hideGray();
    const types = this.typeFilter();

    let rows = this.rows();

    if (types.length > 0) {
      rows = rows.filter((r) => r.stat.types.some((t) => types.includes(t)));
    }

    if (term) {
      const digitTerm = term.replace(/^#/, '');
      const matchedIds = new Set(
        rows
          .filter(
            (r) => r.stat.name.includes(term) || (digitTerm !== '' && String(r.stat.dex) === digitTerm),
          )
          .map((r) => r.stat.speciesId),
      );
      if (this.showFamily()) {
        const matchedFamilyIds = new Set(
          rows.filter((r) => matchedIds.has(r.stat.speciesId)).map((r) => r.stat.familyId),
        );
        rows = rows.filter((r) => matchedFamilyIds.has(r.stat.familyId));
      } else {
        rows = rows.filter((r) => matchedIds.has(r.stat.speciesId));
      }
    }

    if (league !== 'none' && hideGray) {
      rows = rows.filter((r) => !r.isGray);
    }

    const valueFor = (r: DisplayRow): number => (key === 'dex' ? r.stat.dex : r[key]);

    return [...rows].sort((a, b) => (desc ? valueFor(b) - valueFor(a) : valueFor(a) - valueFor(b)));
  });

  constructor() {
    fetch('pokemon-go-stats.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: PokemonStat[]) => this.allStats.set(data))
      .catch(() => this.loadError.set(true))
      .finally(() => this.loading.set(false));
  }

  protected toggleType(name: TypeName): void {
    const current = this.typeFilter();
    this.typeFilter.set(
      current.includes(name) ? current.filter((t) => t !== name) : [...current, name],
    );
  }

  protected clearTypeFilter(): void {
    this.typeFilter.set([]);
  }

  protected setLeague(league: SearchLeague): void {
    this.league.set(league);
    if (league === 'great' && Object.keys(this.greatLeague()).length === 0) {
      this.loadLeague('pokemon-go-great-league.json', this.greatLeague);
    }
    if (league === 'hyper' && Object.keys(this.hyperLeague()).length === 0) {
      this.loadLeague('pokemon-go-hyper-league.json', this.hyperLeague);
    }
  }

  protected onSelect(pokemon: PokemonStat): void {
    this.select.emit({ pokemon, league: this.league() === 'hyper' ? 'hyper' : 'great' });
  }

  protected setSort(key: SearchSortKey): void {
    if (this.sortKey() === key) {
      this.sortDesc.set(!this.sortDesc());
    } else {
      this.sortKey.set(key);
      this.sortDesc.set(key !== 'dex');
    }
  }

  private loadLeague(path: string, target: typeof this.greatLeague): void {
    fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: LeagueEntry[]) => {
        const map: Record<string, LeagueEntry> = {};
        for (const entry of data) map[entry.speciesId] = entry;
        target.set(map);
      })
      .catch(() => {
        // 読み込み失敗時は空のまま(該当ポケモンは「対象外」表示になる)
      });
  }
}
