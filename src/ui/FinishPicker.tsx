import { iconText } from './AppIcon';
import { useState } from 'react';
import { SASH_TYPES, getSashType, materialsIn } from '../catalog';
import type { MaterialCategory, MaterialDef, NamedColor } from '../catalog';
import type { Finish } from '../building/types';
import { materialPrice } from '../economy/pricing';
import { materialThumb, sashThumb } from './thumbnails';

const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`;

/** 素材＋色を選ぶ。今の素材を見本つきで出し、押すと見本の一覧が開く */
export function FinishPicker({ label, category, value, onChange }: {
  label: string;
  category: MaterialCategory;
  value: Finish;
  onChange: (f: Finish) => void;
}) {
  const [open, setOpen] = useState(false);
  const mats = materialsIn(category);
  const current = mats.find((m) => m.id === value.material) ?? mats[0];
  // 一覧の見本は、今の色がその素材にあればその色で、なければ素材の最初の色で見せる
  const thumbColor = (m: MaterialDef) => (m.colors.some((c) => c.toLowerCase() === value.color.toLowerCase()) ? value.color : m.colors[0]);
  const pick = (m: MaterialDef) => onChange({ material: m.id, color: m.colors.includes(value.color) ? value.color : m.colors[0] });
  return (
    <div className="field">
      <div className="field-label">{iconText(label)}</div>
      <button className={`mat-current${open ? ' open' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open}>
        <img className="mat-thumb" src={materialThumb(current.id, value.color)} alt="" />
        <span className="mat-text">
          <span className="mat-name">{current.name}</span>
          {current.note && <small className="mat-note">{current.note}</small>}
          <span className="mat-foot">
            <small className="mat-price">{yen(materialPrice(current.id))}/m²</small>
            <span className="mat-toggle">{iconText(open ? '閉じる ▴' : `${mats.length}種から選ぶ ▾`)}</span>
          </span>
        </span>
      </button>
      {open && (
        <div className="mat-grid">
          {mats.map((m) => (
            <button key={m.id} className={`mat-tile${m.id === current.id ? ' on' : ''}`} title={m.note ? `${m.name}：${m.note}` : m.name} onClick={() => pick(m)}>
              <img src={materialThumb(m.id, thumbColor(m), 72)} alt="" />
              <span className="mat-tile-name">{m.name}</span>
              <small>{yen(materialPrice(m.id))}</small>
            </button>
          ))}
        </div>
      )}
      <Swatches colors={current.colors} value={value.color} onChange={(color) => onChange({ ...value, color })} thumb={(hex) => materialThumb(current.id, hex, 40)} />
    </div>
  );
}

/** サッシ（窓枠）の種類。見本の窓つき */
export function SashPicker({ value, color, onChange }: { value: string | undefined; color: string; onChange: (id: string) => void }) {
  const current = getSashType(value);
  return (
    <div className="field">
      <div className="field-label">サッシの種類</div>
      <div className="mat-grid">
        {SASH_TYPES.map((t) => (
          <button key={t.id} className={`mat-tile${t.id === current.id ? ' on' : ''}`} title={`${t.name}：${t.note}`} onClick={() => onChange(t.id)}>
            <img src={sashThumb(t.id, color, 72)} alt="" />
            <span className="mat-tile-name">{t.name}</span>
            <small>{iconText(t.priceRate === 1 ? '標準' : `値段×${t.priceRate}`)}</small>
          </button>
        ))}
      </div>
      <small className="mat-note">{current.note}</small>
    </div>
  );
}

export function Swatches({ colors, value, onChange, thumb }: {
  colors: (string | NamedColor)[];
  value: string;
  onChange: (hex: string) => void;
  /** 色ごとの見本画像（あれば無地の丸の代わりに使う） */
  thumb?: (hex: string) => string;
}) {
  return (
    <div className="swatches">
      {colors.map((c) => {
        const hex = typeof c === 'string' ? c : c.hex;
        const name = typeof c === 'string' ? hex : c.name;
        return (
          <button
            key={hex}
            className={`swatch${hex.toLowerCase() === value.toLowerCase() ? ' on' : ''}`}
            style={thumb ? { background: `${hex} url(${thumb(hex)}) center / cover` } : { background: hex }}
            title={name}
            onClick={() => onChange(hex)}
          />
        );
      })}
      <label className="swatch custom" title="好きな色">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}

export function NamedSwatches({ label, colors, value, onChange }: {
  label: string;
  colors: NamedColor[];
  value: string;
  onChange: (hex: string) => void;
}) {
  const name = colors.find((c) => c.hex.toLowerCase() === value.toLowerCase())?.name ?? 'カスタム';
  return (
    <div className="field">
      <div className="field-label">
        {iconText(label)}：{name}
      </div>
      <Swatches colors={colors} value={value} onChange={onChange} />
    </div>
  );
}
