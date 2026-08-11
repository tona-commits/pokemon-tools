import { Component, computed, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TYPE_COLOR, TYPE_LABEL } from './pokemon-types';
import {
  GREAT_LEAGUE_GRAY_CP,
  HYPER_LEAGUE_GRAY_CP,
  LeagueEntry,
  PokemonSelectEvent,
  PokemonStat,
  SortKey,
} from './pokemon-stats';

@Component({
  selector: 'app-pokemon-stats-list',
  imports: [DecimalPipe],
  templateUrl: './pokemon-stats-list.html',
  styleUrl: './pokemon-stats-list.scss',
})
export class PokemonStatsList {
  readonly select = output<PokemonSelectEvent>();

  protected readonly typeLabel = TYPE_LABEL;
  protected readonly typeColor = TYPE_COLOR;
  protected readonly greatLeagueGrayCp = GREAT_LEAGUE_GRAY_CP;
  protected readonly hyperLeagueGrayCp = HYPER_LEAGUE_GRAY_CP;

  protected readonly allStats = signal<PokemonStat[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);

  protected readonly greatLeague = signal<Record<string, LeagueEntry>>({});
  protected readonly hyperLeague = signal<Record<string, LeagueEntry>>({});
  protected readonly showGreatLeague = signal(false);
  protected readonly showHyperLeague = signal(false);

  protected readonly searchTerm = signal('');
  protected readonly showFamily = signal(true);
  protected readonly sortKey = signal<SortKey>('dex');
  protected readonly sortDesc = signal(false);

  protected readonly filteredSorted = computed<PokemonStat[]>(() => {
    const term = this.searchTerm().trim();
    const key = this.sortKey();
    const desc = this.sortDesc();

    let rows = this.allStats();
    if (term) {
      const digitTerm = term.replace(/^#/, '');
      const matched = rows.filter(
        (r) => r.name.includes(term) || (digitTerm !== '' && String(r.dex) === digitTerm),
      );
      if (this.showFamily()) {
        const familyIds = new Set(matched.map((r) => r.familyId));
        rows = rows.filter((r) => familyIds.has(r.familyId));
      } else {
        rows = matched;
      }
    }

    const valueFor = (r: PokemonStat): number => {
      if (key === 'glCp') return this.greatLeague()[r.speciesId]?.cp ?? -1;
      if (key === 'hlCp') return this.hyperLeague()[r.speciesId]?.cp ?? -1;
      return r[key];
    };

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

  protected onSelect(pokemon: PokemonStat): void {
    this.select.emit({ pokemon, league: this.showHyperLeague() ? 'hyper' : 'great' });
  }

  protected setSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDesc.set(!this.sortDesc());
    } else {
      this.sortKey.set(key);
      this.sortDesc.set(key !== 'dex');
    }
  }

  protected toggleGreatLeague(): void {
    if (!this.showGreatLeague() && Object.keys(this.greatLeague()).length === 0) {
      this.loadLeague('pokemon-go-great-league.json', this.greatLeague);
    }
    this.showGreatLeague.set(!this.showGreatLeague());
  }

  protected toggleHyperLeague(): void {
    if (!this.showHyperLeague() && Object.keys(this.hyperLeague()).length === 0) {
      this.loadLeague('pokemon-go-hyper-league.json', this.hyperLeague);
    }
    this.showHyperLeague.set(!this.showHyperLeague());
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
        // 読み込み失敗時はそのタイプの列を空のまま表示する
      });
  }
}
