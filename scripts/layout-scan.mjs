// 画面の文字・ボタンの重なり・画面外・文字切れを調べる（page.evaluate に渡して使う）
// 表示中の文字・操作要素を集め、重なり・画面外・文字切れを返す
export function scan(rootSel) {
  const roots = [...document.querySelectorAll(rootSel)].filter(r => r.getClientRects().length);
  const bad = [];
  const label = e => (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 30) + ' <' + e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '') + '>';
  const visible = e => { const s = getComputedStyle(e); if (s.visibility === 'hidden' || +s.opacity === 0) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  // 祖先のスクロール領域・overflow:hiddenで実際に見えている範囲
  const clipRect = e => { let r = e.getBoundingClientRect(); let L = r.left, T = r.top, R = r.right, B = r.bottom;
    for (let p = e.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (s.overflowX !== 'visible' || s.overflowY !== 'visible') { const q = p.getBoundingClientRect(); L = Math.max(L, q.left); T = Math.max(T, q.top); R = Math.min(R, q.right); B = Math.min(B, q.bottom); } }
    return { left: L, top: T, right: R, bottom: B }; };
  const els = [];
  for (const root of roots) for (const e of root.querySelectorAll('button,input,select,textarea,a,summary,label,h1,h2,h3,h4,p,span,strong,b,small,em,div,li,td,th')) {
    if (!visible(e) || e.closest('[aria-hidden="true"]')) continue;
    if (e.closest('details:not([open])') && !e.closest('summary')) continue; // 閉じた折りたたみの中身
    const ctrl = /^(BUTTON|INPUT|SELECT|TEXTAREA|A|SUMMARY)$/.test(e.tagName);
    const ownText = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!ctrl && !ownText) continue;
    if (!ctrl && e.closest('button,a,summary,label,select')) continue;
    const c = clipRect(e); if (c.right - c.left < 2 || c.bottom - c.top < 2) continue;
    // 他の表示（開いたメニュー等）に完全に隠れている要素は見えないので対象外
    const top = document.elementFromPoint((Math.max(c.left, 0) + Math.min(c.right, innerWidth)) / 2, (Math.max(c.top, 0) + Math.min(c.bottom, innerHeight)) / 2);
    if (top && !(e.contains(top) || top.contains(e) || top.tagName === 'CANVAS')) { const z = top.closest('.overlay,.save-menu,.walk-menu-list,.sheet'); if (z && !z.contains(e)) continue; }
    els.push({ e, c });
    if (c.left < -1 || c.right > innerWidth + 1 || c.top < -1 || c.bottom > innerHeight + 1) bad.push('offscreen: ' + label(e));
    const s = getComputedStyle(e);
    if (ownText && s.textOverflow !== 'ellipsis' && (s.overflowX === 'hidden' || s.overflowX === 'clip') && e.scrollWidth > e.clientWidth + 2) bad.push('clipped: ' + label(e));
  }
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    const a = els[i], b = els[j];
    if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
    // スクロールする中身の上に固定した購入バー等（position: sticky）は意図した重なり
    const sticky = e => { for (let p = e; p; p = p.parentElement) if (getComputedStyle(p).position === 'sticky') return p; return null; };
    if (sticky(a.e) !== sticky(b.e)) continue;
    // 開いたメニュー（ドロップダウン）が他の表示に被さるのは意図した重なり
    const pop = e => e.closest('.overlay,.save-menu,.walk-menu-list');
    if (pop(a.e) !== pop(b.e)) continue;
    const w = Math.min(a.c.right, b.c.right) - Math.max(a.c.left, b.c.left), h = Math.min(a.c.bottom, b.c.bottom) - Math.max(a.c.top, b.c.top);
    if (w <= 3 || h <= 3) continue;
    // 上に重なっている方が完全に覆っている（モーダル等）なら、下は見えないので重なりとしない
    const x = (Math.max(a.c.left, b.c.left) + Math.min(a.c.right, b.c.right)) / 2, y = (Math.max(a.c.top, b.c.top) + Math.min(a.c.bottom, b.c.bottom)) / 2;
    const top = document.elementFromPoint(x, y); if (!top) continue;
    const hitA = a.e.contains(top) || top.contains(a.e), hitB = b.e.contains(top) || top.contains(b.e);
    if (!hitA && !hitB) continue;
    bad.push('overlap: ' + label(a.e) + ' × ' + label(b.e));
  }
  return [...new Set(bad)];
}

