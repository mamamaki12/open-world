// 指で操作する端末（スマホ・タブレット）かどうか。URL に ?touch=1 を付けるとパソコンでも試せる
import { useEffect, useState } from 'react';

// 指が主な入力の端末。iPad にキーボードやマウスをつないでいても指で触れるなら指用にする
const QUERY = '(pointer: coarse), (any-pointer: coarse) and (hover: none)';

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const param = new URLSearchParams(window.location.search).get('touch');
  if (param === '1') return true;
  if (param === '0') return false;
  return window.matchMedia?.(QUERY).matches ?? false;
}

export function useTouchDevice(): boolean {
  const [touch, setTouch] = useState(isTouchDevice);
  useEffect(() => {
    const mq = window.matchMedia?.(QUERY);
    if (!mq) return;
    const onChange = () => setTouch(isTouchDevice());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return touch;
}
