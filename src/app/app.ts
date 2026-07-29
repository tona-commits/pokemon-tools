import { Component, signal } from '@angular/core';
import { PokemonFeature } from './pokemon-feature';
import { KanjiFeature } from './kanji-feature';

type Screen = 'home' | 'pokemon' | 'kanji';

@Component({
  selector: 'app-root',
  imports: [PokemonFeature, KanjiFeature],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly screen = signal<Screen>('home');

  protected goTo(screen: Screen): void {
    this.screen.set(screen);
  }
}
