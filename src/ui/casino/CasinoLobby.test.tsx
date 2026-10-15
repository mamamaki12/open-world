import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CasinoPanel } from '../CasinoPanel';

it('opens on a six-game lobby rather than immediately starting the last game', () => {
  const html = renderToStaticMarkup(<CasinoPanel />);
  expect(html).toContain('今夜は、どこで遊ぶ？');
  expect(html.match(/class="casino-game-card"/g)).toHaveLength(6);
  expect(html).not.toContain('casino-game-nav');
});

it('keeps all game cards free from shared wheel and card layout classes', () => {
  const html = renderToStaticMarkup(<CasinoPanel />);
  const buttons = [...html.matchAll(/<button\b[^>]*class="casino-game-card"[^>]*>[\s\S]*?<\/button>/g)].map(match => match[0]);
  expect(buttons).toHaveLength(6);
  for (const label of ['スロット', 'ルーレット', 'ハイ＆ロー', '競馬', '競輪', 'ボートレース']) {
    expect(buttons.some(button => button.includes(label))).toBe(true);
  }
  for (const button of buttons) {
    expect(button).not.toMatch(/class="[^"]*\b(?:wheel|cards)\b/);
  }
});
