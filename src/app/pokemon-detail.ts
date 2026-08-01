import { Component, computed, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TYPE_COLOR, TYPE_LABEL } from './pokemon-types';
import { PokemonStat } from './pokemon-stats';
import { findMaxLevelUnderCp, GREAT_LEAGUE_CP_CAP, HYPER_LEAGUE_CP_CAP } from './cp-calculator';

const IV_RANGE = Array.from({ length: 16 }, (_, i) => i);

type League = 'great' | 'hyper';

@Component({
  selector: 'app-pokemon-detail',
  imports: [DecimalPipe],
  templateUrl: './pokemon-detail.html',
  styleUrl: './pokemon-detail.scss',
})
export class PokemonDetail {
  readonly pokemon = input.required<PokemonStat>();
  readonly back = output<void>();

  protected readonly typeLabel = TYPE_LABEL;
  protected readonly typeColor = TYPE_COLOR;
  protected readonly ivRange = IV_RANGE;

  protected readonly league = signal<League>('great');

  protected readonly ivAtk = signal(15);
  protected readonly ivDef = signal(15);
  protected readonly ivHp = signal(15);

  protected readonly cpCap = computed(() =>
    this.league() === 'great' ? GREAT_LEAGUE_CP_CAP : HYPER_LEAGUE_CP_CAP,
  );

  protected readonly result = computed(() => {
    const p = this.pokemon();
    return findMaxLevelUnderCp(p.atk, p.def, p.hp, this.ivAtk(), this.ivDef(), this.ivHp(), this.cpCap());
  });
}
