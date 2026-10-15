// 金額の表示

/** 1234567 → "¥1,234,567" */
export function yen(n: number): string {
  const v = Math.round(n);
  return `${v < 0 ? '-' : ''}¥${Math.abs(v).toLocaleString('ja-JP')}`;
}

/** 大きな金額を読みやすく（1234万円、1.2億円） */
export function yenShort(n: number): string {
  const v = Math.round(n);
  const a = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (a >= 1e8) return `${sign}${(a / 1e8).toFixed(a >= 1e9 ? 0 : 2).replace(/\.?0+$/, '')}億円`;
  if (a >= 1e4) return `${sign}${Math.round(a / 1e4).toLocaleString('ja-JP')}万円`;
  return `${sign}${a.toLocaleString('ja-JP')}円`;
}
