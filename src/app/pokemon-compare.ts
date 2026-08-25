import { Component, computed, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { calcEffectiveness, TYPE_COLOR, TYPE_LABEL, TYPES } from './pokemon-types';
import { League, LeagueEntry, PokemonStat } from './pokemon-stats';
import { buildDisplayMoves, DisplayMove, MoveEntry, MovesetEntry } from './pokemon-moves';

type Screen = 'select' | 'evaluate';

const MAX_SELECTED = 3;

interface ComparisonColumn {
  stat: PokemonStat;
  level: number | null;
  cp: number | null;
  atk: number | null;
  def: number | null;
  hp: number | null;
  effectiveness: Record<string, number>;
  fastMoves: DisplayMove[];
  chargedMoves: DisplayMove[];
}

function symbolForMultiplier(mult: number): string {
  switch (mult) {
    case 2.56:
      return '◎';
    case 1.6:
      return '〇';
    case 1:
      return 'ー';
    case 0.625:
      return '△';
    case 0.390625:
      return '×';
    default:
      return '?';
  }
}

@Component({
  selector: 'app-pokemon-compare',
  imports: [DecimalPipe],
  templateUrl: './pokemon-compare.html',
  styleUrl: './pokemon-compare.scss',
})
export class PokemonCompare {
  protected readonly types = TYPES;
  protected readonly typeLabel = TYPE_LABEL;
  protected readonly typeColor = TYPE_COLOR;
  protected readonly symbolFor = symbolForMultiplier;

  protected readonly screen = signal<Screen>('select');

  protected readonly allStats = signal<PokemonStat[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);

  protected readonly greatLeague = signal<Record<string, LeagueEntry>>({});
  protected readonly hyperLeague = signal<Record<string, LeagueEntry>>({});
  protected readonly league = signal<League>('great');

  protected readonly moves = signal<Record<string, MoveEntry>>({});
  protected readonly movesets = signal<Record<string, MovesetEntry>>({});

  protected readonly searchTerm = signal('');
  protected readonly showFamily = signal(true);
  protected readonly selectedIds = signal<string[]>([]);

  private readonly leagueMap = computed(() =>
    this.league() === 'great' ? this.greatLeague() : this.hyperLeague(),
  );

  protected leagueMapFor(speciesId: string): LeagueEntry | undefined {
    return this.leagueMap()[speciesId];
  }

  protected readonly filteredStats = computed<PokemonStat[]>(() => {
    const term = this.searchTerm().trim();
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
    return rows;
  });

  protected readonly comparisonColumns = computed<ComparisonColumn[]>(() => {
    const leagueMap = this.leagueMap();
    const moves = this.moves();
    const movesets = this.movesets();
    const allStats = this.allStats();

    return this.selectedIds()
      .map((id) => allStats.find((s) => s.speciesId === id))
      .filter((s): s is PokemonStat => !!s)
      .map((stat) => {
        const entry = leagueMap[stat.speciesId] ?? null;
        const moveset = movesets[stat.speciesId];
        return {
          stat,
          level: entry?.level ?? null,
          cp: entry?.cp ?? null,
          atk: entry?.atk ?? null,
          def: entry?.def ?? null,
          hp: entry?.hp ?? null,
          effectiveness: calcEffectiveness(stat.types),
          fastMoves: moveset ? buildDisplayMoves(moveset.fast, moves, moveset.elite, moveset.legacy, stat.types) : [],
          chargedMoves: moveset
            ? buildDisplayMoves(moveset.charged, moves, moveset.elite, moveset.legacy, stat.types)
            : [],
        };
      });
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

    this.loadLeague('pokemon-go-great-league.json', this.greatLeague);

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
      .catch(() => {
        // 技データの読み込みに失敗した場合、比較画面の技欄は空のまま表示する
      });
  }

  protected setLeague(league: League): void {
    this.league.set(league);
    if (league === 'hyper' && Object.keys(this.hyperLeague()).length === 0) {
      this.loadLeague('pokemon-go-hyper-league.json', this.hyperLeague);
    }
  }

  protected isSelected(speciesId: string): boolean {
    return this.selectedIds().includes(speciesId);
  }

  protected toggleSelect(speciesId: string): void {
    const current = this.selectedIds();
    if (current.includes(speciesId)) {
      this.selectedIds.set(current.filter((id) => id !== speciesId));
      return;
    }
    if (current.length < MAX_SELECTED) {
      this.selectedIds.set([...current, speciesId]);
    }
  }

  protected goToEvaluate(): void {
    this.screen.set('evaluate');
  }

  protected backToSelect(): void {
    this.screen.set('select');
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
        // 読み込み失敗時は空のまま(該当ポケモンはCP等が表示されない)
      });
  }
}
