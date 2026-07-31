import { Component, computed, output, signal } from '@angular/core';
import { TYPE_COLOR, TYPE_LABEL } from './pokemon-types';
import { PokemonStat, SortKey, toCsv } from './pokemon-stats';

@Component({
  selector: 'app-pokemon-stats-list',
  templateUrl: './pokemon-stats-list.html',
  styleUrl: './pokemon-stats-list.scss',
})
export class PokemonStatsList {
  readonly select = output<PokemonStat>();

  protected readonly typeLabel = TYPE_LABEL;
  protected readonly typeColor = TYPE_COLOR;

  protected readonly allStats = signal<PokemonStat[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);

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

    return [...rows].sort((a, b) => (desc ? b[key] - a[key] : a[key] - b[key]));
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

  protected setSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDesc.set(!this.sortDesc());
    } else {
      this.sortKey.set(key);
      this.sortDesc.set(key !== 'dex');
    }
  }

  protected downloadCsv(): void {
    const csv = toCsv(this.filteredSorted(), this.typeLabel);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pokemon-go-stats.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}
