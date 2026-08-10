import { Component, computed, input, output, signal } from '@angular/core';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { TYPE_COLOR, TYPE_LABEL } from './pokemon-types';
import { PokemonStat } from './pokemon-stats';
import { findMaxLevelUnderCp, GREAT_LEAGUE_CP_CAP, HYPER_LEAGUE_CP_CAP } from './cp-calculator';
import { buildDisplayMoves, MoveEntry, MovesetEntry } from './pokemon-moves';

const IV_RANGE = Array.from({ length: 16 }, (_, i) => i);

type League = 'great' | 'hyper';

@Component({
  selector: 'app-pokemon-detail',
  imports: [DecimalPipe, NgTemplateOutlet],
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

  protected readonly movesLoading = signal(true);
  protected readonly movesError = signal(false);
  private readonly moves = signal<Record<string, MoveEntry>>({});
  private readonly movesets = signal<Record<string, MovesetEntry>>({});

  protected readonly fastMoves = computed(() => {
    const p = this.pokemon();
    const moveset = this.movesets()[p.speciesId];
    if (!moveset) return [];
    return buildDisplayMoves(moveset.fast, this.moves(), moveset.elite, moveset.legacy, p.types);
  });

  protected readonly chargedMoves = computed(() => {
    const p = this.pokemon();
    const moveset = this.movesets()[p.speciesId];
    if (!moveset) return [];
    return buildDisplayMoves(moveset.charged, this.moves(), moveset.elite, moveset.legacy, p.types);
  });

  protected typeColorFor(type: string): string {
    return this.typeColor[type as keyof typeof this.typeColor];
  }

  protected typeLabelFor(type: string): string {
    return this.typeLabel[type as keyof typeof this.typeLabel];
  }

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
      .catch(() => this.movesError.set(true))
      .finally(() => this.movesLoading.set(false));
  }
}
