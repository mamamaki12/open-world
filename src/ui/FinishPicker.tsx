import { materialsIn } from '../catalog';
import type { MaterialCategory, NamedColor } from '../catalog';
import type { Finish } from '../building/types';

export function FinishPicker({ label, category, value, onChange }: {
  label: string;
  category: MaterialCategory;
  value: Finish;
  onChange: (f: Finish) => void;
}) {
  const mats = materialsIn(category);
  const current = mats.find((m) => m.id === value.material) ?? mats[0];
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      <select
        value={current.id}
        onChange={(e) => {
          const m = mats.find((x) => x.id === e.target.value)!;
          onChange({ material: m.id, color: m.colors.includes(value.color) ? value.color : m.colors[0] });
        }}
      >
        {mats.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <Swatches colors={current.colors} value={value.color} onChange={(color) => onChange({ ...value, color })} />
    </div>
  );
}

export function Swatches({ colors, value, onChange }: { colors: (string | NamedColor)[]; value: string; onChange: (hex: string) => void }) {
  return (
    <div className="swatches">
      {colors.map((c) => {
        const hex = typeof c === 'string' ? c : c.hex;
        const name = typeof c === 'string' ? hex : c.name;
        return (
          <button
            key={hex}
            className={`swatch${hex.toLowerCase() === value.toLowerCase() ? ' on' : ''}`}
            style={{ background: hex }}
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
        {label}：{name}
      </div>
      <Swatches colors={colors} value={value} onChange={onChange} />
    </div>
  );
}
