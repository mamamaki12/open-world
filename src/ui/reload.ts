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
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.update().catch(() => undefined)));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
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
