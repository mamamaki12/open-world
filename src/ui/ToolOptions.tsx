// 左のパネル：いま持っているツールで置くパーツの種類・素材・色を選ぶ
import { FURNITURE, PANEL_COLORS, SASH_COLORS, openingsOf } from '../catalog';
import { ROOF_TYPE_NAMES } from '../building/roof';
import type { RoofType } from '../building/types';
import { useGame } from '../state/store';
import type { Tool } from '../state/store';
import { useInteraction } from '../state/interaction';
import { FinishPicker, NamedSwatches } from './FinishPicker';
import { useTouchDevice } from './useTouchDevice';

export const TOOL_HELP: Record<Tool, string> = {
  select: 'パーツをクリックして選ぶと、右のパネルで種類・素材・色を変えられます。選んだ家具はドラッグで動かせます。',
  floor: 'ドラッグで四角く床を張ります（1マス = 910mm）。2階の床は、画面下の「作業する階」で 2階 を選んでから（キー X）、1階の壁の上をドラッグします。',
  wall: 'マス目の線に沿ってドラッグして壁を立てます。床のない側が外壁になります。',
  door: '壁の上にマウスを当てて、クリックでドアを付けます。',
  window: '壁の上にマウスを当てて、クリックで窓を付けます。',
  stair: '1階でクリックすると2階へ上がる階段を置きます（幅1マス × 長さ4マス）。R キーで向きを変えます。',
  roof: 'その階の壁の上に載せる屋根の範囲をドラッグします。2階に置くと2階の上に載ります。',
  furniture: 'クリックで家具を置きます。R キーで90度回します。',
  erase: 'クリックしたパーツを消します。',
};

/** 指で操作するときの説明 */
const TOUCH_TOOL_HELP: Record<Tool, string> = {
  select: 'パーツをタップして選ぶと、この引き出しで種類・素材・色を変えられます。選んだ家具は指でなぞって動かせます。',
  floor: '指でなぞって四角く床を張ります（1マス = 910mm）。2階の床は「作業する階」で 2階 を選んでから、1階の壁の上をなぞります。',
  wall: 'マス目の線に沿って指でなぞって壁を立てます。床のない側が外壁になります。',
  door: '壁をタップするとドアを付けます。',
  window: '壁をタップすると窓を付けます。',
  stair: '1階をタップすると2階へ上がる階段を置きます（幅1マス × 長さ4マス）。下のボタンで向きを変えます。',
  roof: 'その階の壁の上に載せる屋根の範囲を指でなぞります。2階に置くと2階の上に載ります。',
  furniture: 'タップで家具を置きます。下のボタンで90度回します。',
  erase: 'タップしたパーツを消します。',
};

export function ToolOptions() {
  const touch = useTouchDevice();
  const tool = useGame((s) => s.tool);
  const d = useGame((s) => s.defaults);
  const set = useGame((s) => s.setDefaults);
  const stairRot = useInteraction((s) => s.stairRot);

  let body = null;
  switch (tool) {
    case 'floor':
      body = <FinishPicker label="床材" category="floor" value={d.floor} onChange={(floor) => set({ floor })} />;
      break;
    case 'wall':
      body = (
        <>
          <FinishPicker label="外壁材" category="exterior" value={d.wallExterior} onChange={(wallExterior) => set({ wallExterior })} />
          <FinishPicker label="内装" category="interior" value={d.wallInterior} onChange={(wallInterior) => set({ wallInterior })} />
        </>
      );
      break;
    case 'door':
    case 'window': {
      const kind = tool;
      const current = kind === 'door' ? d.doorType : d.windowType;
      body = (
        <>
          <div className="field">
            <div className="field-label">{kind === 'door' ? 'ドアの種類' : '窓の種類'}</div>
            <div className="choice-list">
              {openingsOf(kind).map((o) => (
                <button
                  key={o.id}
                  className={`choice${o.id === current ? ' on' : ''}`}
                  onClick={() => set(kind === 'door' ? { doorType: o.id } : { windowType: o.id })}
                >
                  <span>{o.name}</span>
                  <small>
                    幅{Math.round(o.width * 1000)} × 高さ{Math.round(o.height * 1000)}
                  </small>
                </button>
              ))}
            </div>
          </div>
          <NamedSwatches label="サッシ・枠の色" colors={SASH_COLORS} value={d.sashColor} onChange={(sashColor) => set({ sashColor })} />
          {kind === 'door' && (
            <NamedSwatches label="扉の色" colors={PANEL_COLORS} value={d.panelColor} onChange={(panelColor) => set({ panelColor })} />
          )}
        </>
      );
      break;
    }
    case 'stair':
      body = (
        <>
          <FinishPicker label="踏み板" category="wood" value={d.stairFinish} onChange={(stairFinish) => set({ stairFinish })} />
          <button className="btn" onClick={() => useInteraction.getState().setStairRot(((stairRot + 1) % 4) as 0 | 1 | 2 | 3)}>
            向きを変える<span className="kbd-hint">（R）</span>
          </button>
        </>
      );
      break;
    case 'roof':
      body = (
        <>
          <RoofTypeButtons value={d.roofType} onChange={(roofType) => set({ roofType })} />
          {d.roofType !== 'flat' && (
            <>
              <Slider label="勾配" unit="寸" min={1} max={8} step={0.5} value={d.roofPitch} onChange={(roofPitch) => set({ roofPitch })} />
              <Slider label="軒の出" unit="mm" min={0} max={0.9} step={0.05} scale={1000} value={d.roofOverhang} onChange={(roofOverhang) => set({ roofOverhang })} />
              <FinishPicker label="屋根材" category="roof" value={d.roofFinish} onChange={(roofFinish) => set({ roofFinish })} />
            </>
          )}
        </>
      );
      break;
    case 'furniture':
      body = (
        <div className="field">
          <div className="field-label">家具</div>
          <div className="choice-list">
            {FURNITURE.map((f) => (
              <button key={f.id} className={`choice${f.id === d.furnitureType ? ' on' : ''}`} onClick={() => set({ furnitureType: f.id })}>
                <span>{f.name}</span>
              </button>
            ))}
          </div>
          <button className="btn" onClick={() => set({ furnitureRotation: (d.furnitureRotation + 90) % 360 })}>
            向きを変える<span className="kbd-hint">（R）</span>：{d.furnitureRotation}°
          </button>
        </div>
      );
      break;
  }

  return (
    <div className="panel tool-options">
      <p className="help">{(touch ? TOUCH_TOOL_HELP : TOOL_HELP)[tool]}</p>
      {body}
    </div>
  );
}

export function RoofTypeButtons({ value, onChange }: { value: RoofType; onChange: (t: RoofType) => void }) {
  return (
    <div className="field">
      <div className="field-label">屋根の形</div>
      <div className="seg">
        {(Object.keys(ROOF_TYPE_NAMES) as RoofType[]).map((t) => (
          <button key={t} className={t === value ? 'on' : ''} onClick={() => onChange(t)}>
            {ROOF_TYPE_NAMES[t]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Slider({ label, unit, min, max, step, value, onChange, scale = 1 }: {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  scale?: number;
}) {
  return (
    <div className="field">
      <div className="field-label">
        {label}：{+(value * scale).toFixed(1)}
        {unit}
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </div>
  );
}
