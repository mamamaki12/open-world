import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CasinoPanel } from '../CasinoPanel';

it('opens on a six-game lobby rather than immediately starting the last game', () => {
  const html = renderToStaticMarkup(<CasinoPanel />);
  expect(html).toContain('今夜は、どこで遊ぶ？');
  expect(html.match(/class="casino-game-card /g)).toHaveLength(6);
  expect(html).not.toContain('casino-game-nav');
});
