// 画質（高・中・低）を選ぶボタン。スマホの ☰ メニューと操作設定に置く
import { GRAPHICS_LABEL, useGraphics } from '../state/graphics';
import type { GraphicsQuality } from '../state/graphics';

const ORDER: GraphicsQuality[] = ['high', 'medium', 'low'];

export function GraphicsPicker({ compact = false }: { compact?: boolean }) {
  const quality = useGraphics((s) => s.quality);
  const setQuality = useGraphics((s) => s.setQuality);
  return (
    <div className={`graphics-picker${compact ? ' compact' : ''}`} role="radiogroup" aria-label="画質">
      <span className="graphics-picker-label">画質</span>
      {ORDER.map((q) => (
        <button key={q} type="button" role="radio" aria-checked={quality === q} className={quality === q ? 'on' : ''} onClick={() => setQuality(q)}>
          {GRAPHICS_LABEL[q]}
        </button>
      ))}
    </div>
  );
}
