import { Component, computed, output, signal } from '@angular/core';
import { TYPE_COLOR, TYPE_LABEL, TYPES, TypeName } from './pokemon-types';
import { MoveEntry, MovesetEntry } from './pokemon-moves';
import { PokemonSelectEvent } from './pokemon-stats';
import { PokemonStatsList } from './pokemon-stats-list';

interface MoveListItem {
  id: string;
  entry: MoveEntry;
  category: 'fast' | 'charged';
}

@Component({
  selector: 'app-pokemon-move-search',
  imports: [PokemonStatsList],
  templateUrl: './pokemon-move-search.html',
  styleUrl: './pokemon-move-search.scss',
})
export class PokemonMoveSearch {
  readonly select = output<PokemonSelectEvent>();

  protected readonly types = TYPES;
  protected readonly typeLabel = TYPE_LABEL;
  protected readonly typeColor = TYPE_COLOR;

  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  private readonly moves = signal<Record<string, MoveEntry>>({});
  private readonly movesets = signal<Record<string, MovesetEntry>>({});

  protected readonly searchTerm = signal('');
  protected readonly typeFilter = signal<TypeName | null>(null);
  protected readonly selectedMoveId = signal<string | null>(null);

  protected readonly moveList = computed<MoveListItem[]>(() => {
    const moves = this.moves();
    const term = this.searchTerm().trim();
    const type = this.typeFilter();

    let items = Object.entries(moves).map(([id, entry]) => ({
      id,
      entry,
      category: (entry.energyGain !== undefined ? 'fast' : 'charged') as 'fast' | 'charged',
    }));

    if (term) items = items.filter((m) => m.entry.name.includes(term));
    if (type) items = items.filter((m) => m.entry.type === type);

    return items.sort((a, b) => {
      if (a.entry.type !== b.entry.type) {
        return this.types.findIndex((t) => t.name === a.entry.type) -
          this.types.findIndex((t) => t.name === b.entry.type);
      }
      if (a.category !== b.category) return a.category === 'fast' ? -1 : 1;
      return a.entry.name.localeCompare(b.entry.name, 'ja');
    });
  });

  protected readonly selectedMove = computed<MoveListItem | null>(() => {
    const id = this.selectedMoveId();
    if (!id) return null;
    const entry = this.moves()[id];
    if (!entry) return null;
    return { id, entry, category: entry.energyGain !== undefined ? 'fast' : 'charged' };
  });

  protected readonly speciesIdsForSelectedMove = computed<ReadonlySet<string> | null>(() => {
    const id = this.selectedMoveId();
    if (!id) return null;
    const movesets = this.movesets();
    const result = new Set<string>();
    for (const [speciesId, set] of Object.entries(movesets)) {
      if (set.fast.includes(id) || set.charged.includes(id)) result.add(speciesId);
    }
    return result;
  });

  constructor() {
    Promise.all([
      fetch('pokemon-go-moves.json').then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }),
      fetch('pokemon-go-movesets.json').then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }),
    ])
      .then(([moves, movesets]) => {
        this.moves.set(moves);
        this.movesets.set(movesets);
      })
      .catch(() => this.loadError.set(true))
      .finally(() => this.loading.set(false));
  }

  protected setTypeFilter(type: TypeName): void {
    this.typeFilter.set(this.typeFilter() === type ? null : type);
  }

  protected selectMove(id: string): void {
    this.selectedMoveId.set(id);
  }

  protected backToMoveList(): void {
    this.selectedMoveId.set(null);
  }
}
