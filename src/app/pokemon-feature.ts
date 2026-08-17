import { Component, computed, signal, output } from '@angular/core';
import {
  calcEffectiveness,
  calcMoveEffectiveness,
  TYPE_COLOR,
  TYPE_LABEL,
  TYPES,
  TypeInfo,
  TypeName,
} from './pokemon-types';
import { PokemonStatsList } from './pokemon-stats-list';
import { PokemonStatsSearch } from './pokemon-stats-search';
import { PokemonMoveSearch } from './pokemon-move-search';
import { PokemonDetail } from './pokemon-detail';
import { League, PokemonSelectEvent, PokemonStat } from './pokemon-stats';

interface EffectivenessGroup {
  multiplier: number;
  label: string;
  types: TypeInfo[];
}

type Tab = 'compat' | 'stats' | 'search' | 'moves';
type CompatMode = 'defense' | 'attack';

const MAX_SELECTED = 2;

function labelForMultiplier(mult: number): string {
  switch (mult) {
    case 2.56:
      return '効果は抜群(弱点タイプ一致) ×2.56';
    case 1.6:
      return '効果は抜群 ×1.6';
    case 1:
      return '効果は普通 ×1';
    case 0.625:
      return '効果はいまひとつ ×0.625';
    case 0.390625:
      return '効果はいまひとつ(耐性タイプ一致) ×0.39';
    default:
      return `×${mult}`;
  }
}

function toGroups(effectiveness: Record<TypeName, number>, types: TypeInfo[]): EffectivenessGroup[] {
  const buckets = new Map<number, TypeInfo[]>();
  for (const t of types) {
    const mult = effectiveness[t.name];
    if (!buckets.has(mult)) buckets.set(mult, []);
    buckets.get(mult)!.push(t);
  }

  return Array.from(buckets.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([multiplier, groupTypes]) => ({ multiplier, label: labelForMultiplier(multiplier), types: groupTypes }));
}

@Component({
  selector: 'app-pokemon-feature',
  imports: [PokemonStatsList, PokemonStatsSearch, PokemonMoveSearch, PokemonDetail],
  templateUrl: './pokemon-feature.html',
  styleUrl: './pokemon-feature.scss',
})
export class PokemonFeature {
  readonly back = output<void>();

  protected readonly types = TYPES;
  protected readonly typeLabel = TYPE_LABEL;
  protected readonly typeColor = TYPE_COLOR;

  protected readonly activeTab = signal<Tab>('compat');
  protected readonly selectedPokemon = signal<PokemonStat | null>(null);
  protected readonly selectedLeague = signal<League>('great');

  protected readonly compatMode = signal<CompatMode>('defense');
  protected readonly selectedTypes = signal<TypeName[]>(['fire']);

  protected readonly selectedTypeInfos = computed<TypeInfo[]>(() =>
    this.selectedTypes().map((name) => this.types.find((t) => t.name === name)!),
  );

  protected readonly groups = computed<EffectivenessGroup[]>(() => {
    const selected = this.selectedTypes();
    if (selected.length === 0) return [];

    if (this.compatMode() === 'attack') {
      return toGroups(calcMoveEffectiveness(selected[0]), this.types);
    }
    return toGroups(calcEffectiveness(selected), this.types);
  });

  protected isSelected(name: TypeName): boolean {
    return this.selectedTypes().includes(name);
  }

  protected setCompatMode(mode: CompatMode): void {
    this.compatMode.set(mode);
    this.selectedTypes.set([]);
  }

  protected toggleType(name: TypeName): void {
    if (this.compatMode() === 'attack') {
      const current = this.selectedTypes();
      this.selectedTypes.set(current[0] === name ? [] : [name]);
      return;
    }

    const current = this.selectedTypes();
    if (current.includes(name)) {
      this.selectedTypes.set(current.filter((t) => t !== name));
      return;
    }
    if (current.length < MAX_SELECTED) {
      this.selectedTypes.set([...current, name]);
      return;
    }
    // 既に2つ選択済みの場合は、古い方を外して新しいタイプに差し替える
    this.selectedTypes.set([current[1], name]);
  }

  protected clearSelection(): void {
    this.selectedTypes.set([]);
  }

  protected setTab(tab: Tab): void {
    this.activeTab.set(tab);
    this.selectedPokemon.set(null);
  }

  protected openDetail(event: PokemonSelectEvent): void {
    this.selectedPokemon.set(event.pokemon);
    this.selectedLeague.set(event.league);
  }

  protected closeDetail(): void {
    this.selectedPokemon.set(null);
  }
}
