// 押せる要素どうしのすき間を測る（page.evaluate に渡して使う）。
// 見えている押せる要素の外枠を取り、入れ子でない2つの組ごとに外枠どうしの最短距離（重なれば 0）を出し、
// 「押し分けにくい組」を返す（しんご 2026-11-10「ボタンとボタンの距離が異様に近いとこなども修正してね」）。
//  - high: すき間 4px 未満で、どちらかの幅か高さが 44px 未満
//  - mid : すき間 8px 未満で、取り消しにくい操作（やめる・削除・売る…）がほかの操作の隣
//  - low : すき間 8px 未満で、どちらかが 44px 未満（失敗にはしない。一覧に出すだけ）
export function spacingScan(rootSel) {
  const SEL = 'button,a[href],input:not([type=hidden]),select,textarea,summary,[role=button],label';
  const RISKY = /更地|読込|やめる|給料なし|削除|消す|売る|売却|捨てる|手放す|ログアウト|リセット|破棄|初期化|はじめから|最初から|退職|解約/;
  const roots = [...document.querySelectorAll(rootSel)].filter(r => r.getClientRects().length);
  const name = e => (e.getAttribute('aria-label') || e.textContent || e.getAttribute('placeholder') || e.getAttribute('type') || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 24);
  const tag = e => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : '');
  const visible = e => {
    for (let p = e; p; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; }
    const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1;
  };
  const scroller = e => { for (let p = e.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(s.overflowX + s.overflowY)) return p; } return null; };
  const clipRect = e => { const r = e.getBoundingClientRect(); let L = r.left, T = r.top, R = r.right, B = r.bottom;
    for (let p = e.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (s.overflowX !== 'visible' || s.overflowY !== 'visible') { const q = p.getBoundingClientRect(); L = Math.max(L, q.left); T = Math.max(T, q.top); R = Math.min(R, q.right); B = Math.min(B, q.bottom); } }
    L = Math.max(L, 0); T = Math.max(T, 0); R = Math.min(R, innerWidth); B = Math.min(B, innerHeight);
    return { left: L, top: T, right: R, bottom: B, shown: R - L >= 2 && B - T >= 2 }; };
  const els = [];
  for (const root of roots) for (const e of root.querySelectorAll(SEL)) {
    if (e.tagName === 'LABEL' && !e.querySelector('input,select,textarea')) continue; // 入力を包む label だけ
    if (e.tagName === 'INPUT' && e.closest('label')) continue; // label ごと1つとして数える
    if (e.closest('[aria-hidden="true"]') || e.closest('.toast') || !visible(e)) continue;
    // 町の地図（.map-canvas）の家・お店は指でつまんで拡大して選ぶもので、町全体を映したときは小さく並ぶのが前提。押すと名前の吹き出しが出て選び直せるので対象外
    if (e.closest('.map-canvas')) continue;
    if (e.closest('details:not([open])') && !e.closest('summary')) continue;
    const c = clipRect(e); const sc = scroller(e);
    if (c.shown) {
      // 他の表示（開いたメニュー・シート・背景の幕）に隠れて指が届かなければ対象外（中央と四隅の近くを見る）
      const pts = [[0.5, 0.5], [0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]];
      const reach = pts.some(([fx, fy]) => { const t = document.elementFromPoint(c.left + (c.right - c.left) * fx, c.top + (c.bottom - c.top) * fy); return t && (e.contains(t) || t.contains(e)); });
      if (!reach) continue;
    } else if (!sc) continue; // 画面外で、スクロールしても出てこない
    const r = e.getBoundingClientRect();
    els.push({ e, r, c, sc, risky: RISKY.test(name(e)) });
  }
  const gap = (a, b) => { const dx = Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right)); const dy = Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom)); return Math.hypot(dx, dy); };
  const pop = e => e.closest('.overlay,.save-menu,.walk-menu-list');
  const out = [];
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    const a = els[i], b = els[j];
    if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
    if (pop(a.e) !== pop(b.e)) continue; // 開いたメニューと後ろの画面は同時に押せない
    // 同じスクロール領域の中なら本当の配置で、違えば見えている部分どうしで測る（片方が見えていなければ測らない）
    let ra = a.r, rb = b.r;
    if (a.sc !== b.sc) { if (!a.c.shown || !b.c.shown) continue; ra = a.c; rb = b.c; }
    const g = gap(ra, rb);
    if (g >= 8) continue;
    const small = x => Math.min(x.r.width, x.r.height) < 44;
    // 同じ親に並ぶ同じ種類のボタン（道具の切り替え・タブ）は、取り消しにくい操作の判定から外す
    const kind = x => x.e.tagName + '.' + (typeof x.e.className === 'string' ? x.e.className.trim().split(/\s+/)[0] : '');
    const sameKind = a.e.parentElement === b.e.parentElement && kind(a) === kind(b) && (a.e.hasAttribute('aria-pressed') || /\btool\b/.test(a.e.className));
    // low は失敗にしない（4〜8px で小さいボタンが並ぶところ。画面写真で押し分けやすさを見て判断する）
    const sev = g < 4 && (small(a) || small(b)) ? 'high' : (a.risky !== b.risky && !sameKind) ? 'mid' : (small(a) || small(b)) ? 'low' : null;
    if (!sev) continue;
    const sz = x => `${Math.round(x.r.width)}x${Math.round(x.r.height)}`;
    out.push({ sev, gap: Math.round(g * 10) / 10, a: `${name(a.e)} <${tag(a.e)}> ${sz(a)}`, b: `${name(b.e)} <${tag(b.e)}> ${sz(b)}` });
  }
  return out;
}
