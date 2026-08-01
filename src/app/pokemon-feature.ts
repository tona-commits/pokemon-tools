import { Component, computed, signal, output } from '@angular/core';
import { calcEffectiveness, TYPE_COLOR, TYPE_LABEL, TYPES, TypeInfo, TypeName } from './pokemon-types';
import { PokemonStatsList } from './pokemon-stats-list';
import { PokemonStatsSearch } from './pokemon-stats-search';
import { PokemonDetail } from './pokemon-detail';
import { PokemonStat } from './pokemon-stats';

interface EffectivenessGroup {
  multiplier: number;
  label: string;
  types: TypeInfo[];
}

type Tab = 'compat' | 'stats' | 'search';

const MAX_SELECTED = 2;

@Component({
  selector: 'app-pokemon-feature',
  imports: [PokemonStatsList, PokemonStatsSearch, PokemonDetail],
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

  protected readonly selectedTypes = signal<TypeName[]>(['fire']);

  protected readonly selectedTypeInfos = computed<TypeInfo[]>(() =>
    this.selectedTypes().map((name) => this.types.find((t) => t.name === name)!),
  );

  protected readonly groups = computed<EffectivenessGroup[]>(() => {
    const defendTypes = this.selectedTypes();
    if (defendTypes.length === 0) return [];
    const effectiveness = calcEffectiveness(defendTypes);

    const buckets = new Map<number, TypeInfo[]>();
    for (const t of this.types) {
      const mult = effectiveness[t.name];
      if (!buckets.has(mult)) buckets.set(mult, []);
      buckets.get(mult)!.push(t);
    }

    const labelFor = (mult: number): string => {
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
    };

    return Array.from(buckets.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([multiplier, types]) => ({ multiplier, label: labelFor(multiplier), types }));
  });

  protected isSelected(name: TypeName): boolean {
    return this.selectedTypes().includes(name);
  }

  protected toggleType(name: TypeName): void {
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

  protected openDetail(pokemon: PokemonStat): void {
    this.selectedPokemon.set(pokemon);
  }

  protected closeDetail(): void {
    this.selectedPokemon.set(null);
  }
}
