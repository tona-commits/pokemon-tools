import { Component, computed, output, signal } from '@angular/core';
import { chunkIntoSets, KanjiItem, KanjiResultMap, loadResults, saveResults } from './kanji-data';

type Screen = 'menu' | 'quiz' | 'summary';

interface AnsweredItem {
  kanji: KanjiItem;
  correct: boolean;
  userAnswer: string;
}

@Component({
  selector: 'app-kanji-feature',
  templateUrl: './kanji-feature.html',
  styleUrl: './kanji-feature.scss',
})
export class KanjiFeature {
  readonly back = output<void>();

  protected readonly screen = signal<Screen>('menu');
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);

  protected readonly allKanji = signal<KanjiItem[]>([]);
  protected readonly results = signal<KanjiResultMap>({});

  protected readonly sets = computed(() => chunkIntoSets(this.allKanji()));

  protected readonly wrongKanji = computed(() =>
    this.allKanji().filter((k) => this.results()[k.kanji]?.correct === false),
  );

  protected readonly quizItems = signal<KanjiItem[]>([]);
  protected quizLabel = '';
  protected readonly currentIndex = signal(0);
  protected readonly answerInput = signal('');
  protected readonly feedback = signal<'none' | 'correct' | 'wrong'>('none');
  private sessionAnswers: AnsweredItem[] = [];
  protected readonly summaryAnswers = signal<AnsweredItem[]>([]);
  protected readonly wrongInSession = computed(() => this.summaryAnswers().filter((a) => !a.correct));

  protected readonly currentItem = computed<KanjiItem | undefined>(
    () => this.quizItems()[this.currentIndex()],
  );

  constructor() {
    this.results.set(loadResults());
    fetch('kanji-grade4.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: KanjiItem[]) => this.allKanji.set(data))
      .catch(() => this.loadError.set(true))
      .finally(() => this.loading.set(false));
  }

  protected isSetComplete(set: KanjiItem[]): boolean {
    const results = this.results();
    return set.every((k) => results[k.kanji]?.correct === true);
  }

  protected startSet(setIndex: number): void {
    const set = this.sets()[setIndex];
    const start = setIndex * 10 + 1;
    const end = start + set.length - 1;
    this.startQuiz(set, `${start}〜${end}問`);
  }

  protected startRetest(): void {
    this.startQuiz(this.wrongKanji(), 'まちがえた問題の復習');
  }

  private startQuiz(items: KanjiItem[], label: string): void {
    this.quizItems.set(items);
    this.quizLabel = label;
    this.sessionAnswers = [];
    this.currentIndex.set(0);
    this.answerInput.set('');
    this.feedback.set('none');
    this.screen.set('quiz');
  }

  protected submitAnswer(): void {
    if (this.feedback() !== 'none') {
      this.goNext();
      return;
    }
    const item = this.currentItem();
    if (!item) return;
    const answer = this.answerInput().trim();
    const correct = item.readings.includes(answer);
    this.sessionAnswers.push({ kanji: item, correct, userAnswer: answer });

    const results = { ...this.results() };
    results[item.kanji] = { correct, answeredAt: new Date().toISOString() };
    this.results.set(results);
    saveResults(results);

    this.feedback.set(correct ? 'correct' : 'wrong');
  }

  private goNext(): void {
    const nextIndex = this.currentIndex() + 1;
    if (nextIndex >= this.quizItems().length) {
      this.summaryAnswers.set(this.sessionAnswers);
      this.screen.set('summary');
      return;
    }
    this.currentIndex.set(nextIndex);
    this.answerInput.set('');
    this.feedback.set('none');
  }

  protected retrySameSet(): void {
    this.startQuiz(this.quizItems(), this.quizLabel);
  }

  protected backToMenu(): void {
    this.screen.set('menu');
  }
}
