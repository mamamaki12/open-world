// 最新版を取り直す。ホーム画面から開くと再読み込みボタンがないので、ゲーム内から呼べるようにする
import { autosave } from '../save/storage';
import { saveEconomy } from '../state/economy';
import { useGame } from '../state/store';
import { persist } from '../session/saves';

const PARAM = 'v';

export async function reloadLatest(): Promise<void> {
  await persist();
  // 自動セーブは少し遅れて書くので、読み込み直す前に今の状態を保存しておく
  autosave(useGame.getState().house);
  saveEconomy();
  try {
    if ('serviceWorker' in navigator) {
      const r = await navigator.serviceWorker.getRegistration(new URL('./', document.baseURI));
      if (r) {
        await r.update();
        if (r.installing) await new Promise<void>(resolve => {
          const worker = r.installing!, timeout = setTimeout(resolve, 10000);
          worker.addEventListener('statechange', () => { if (['installed', 'redundant'].includes(worker.state)) { clearTimeout(timeout); resolve(); } });
        });
        if (r.waiting) await new Promise<void>(resolve => {
          const timeout = setTimeout(resolve, 5000);
          navigator.serviceWorker.addEventListener('controllerchange', () => { clearTimeout(timeout); resolve(); }, { once: true });
          r.waiting!.postMessage('ACTIVATE_UPDATE');
        });
      }
    }
  } catch {
    // キャッシュを消せなくても読み込み直しは続ける
  }
  // ページのアドレスを毎回変えて、ブラウザに残った古い index.html を使わせない
  const url = new URL(location.href);
  url.searchParams.set(PARAM, Date.now().toString(36));
  location.replace(url.toString());
}

/** 読み込み直したあと、アドレスに付けた印を消しておく（共有やブックマークがきれいなままになる） */
export function cleanReloadParam(): void {
  const url = new URL(location.href);
  if (!url.searchParams.has(PARAM)) return;
  url.searchParams.delete(PARAM);
  history.replaceState(history.state, '', url.toString());
}
