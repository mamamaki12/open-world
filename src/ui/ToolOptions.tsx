// 左のパネル：いま持っているツールで置くパーツの種類・素材・色を選ぶ
import { FURNITURE, PANEL_COLORS, SASH_COLORS, getFurniture, openingsOf } from '../catalog';
import { ROOF_TYPE_NAMES } from '../building/roof';
import type { FloorKind, RoofType, StairRail, WallHeight } from '../building/types';
import { useGame } from '../state/store';
import type { Tool } from '../state/store';
import { useInteraction } from '../state/interaction';
import { FinishPicker, NamedSwatches, SashPicker } from './FinishPicker';
import { useTouchDevice } from './useTouchDevice';

export const TOOL_HELP: Record<Tool, string> = {
  select: 'パーツをクリックして選ぶと、右のパネルで種類・素材・色を変えられます。選んだ家具はドラッグで動かせます。',
  floor: 'ドラッグで四角く床を張ります（1マス = 910mm）。「テラス」にすると屋外のウッドデッキになります。地面の上なら1階、1階の壁の上からドラッグすると2階の床になります。',
  wall: 'マス目の線に沿ってドラッグして壁を立てます。床のない側が外壁になります。高さは半分の腰壁も選べます。',
  door: '壁の上にマウスを当てて、クリックでドアを付けます。',
  window: '壁の上にマウスを当てて、クリックで窓を付けます。',
  stair: '1階でクリックすると2階へ上がる階段を置きます（幅1マス × 長さ4マス）。R キーで向きを変えます。手すりは なし・左・右・両側 から選べます。',
  roof: '屋根を載せる範囲をドラッグします。範囲の下にあるいちばん上の階の壁に載ります。',
  furniture: 'クリックで家具を置きます。庭にはプールや花も置けます。R キーで90度回します。',
  erase: 'クリックしたパーツを消します。「まとめて選ぶ」にすると、いくつも選んでから一度に消せます。',
};

/** 指で操作するときの説明 */
const TOUCH_TOOL_HELP: Record<Tool, string> = {
  select: 'パーツをタップして選ぶと、この引き出しで種類・素材・色を変えられます。選んだ家具は指でなぞって動かせます。',
  floor: '指でなぞって四角く床を張ります（1マス = 910mm）。地面の上なら1階、1階の壁の上からなぞると2階の床になります。',
  wall: 'マス目の線に沿って指でなぞって壁を立てます。床のない側が外壁になります。',
  door: '壁をタップするとドアを付けます。',
  window: '壁をタップすると窓を付けます。',
  stair: '1階をタップすると2階へ上がる階段を置きます（幅1マス × 長さ4マス）。下のボタンで向きを変えます。',
  roof: '屋根を載せる範囲を指でなぞります。範囲の下にあるいちばん上の階の壁に載ります。',
  furniture: 'タップで家具を置きます。庭にはプールや花も置けます。下のボタンで90度回します。',
  erase: 'タップしたパーツを消します。「まとめて選ぶ」にすると、いくつも選んでから一度に消せます。',
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
      body = (
        <>
          <FloorKindButtons value={d.floorKind} onChange={(floorKind) => set({ floorKind })} />
          {d.floorKind === 'terrace' ? (
            <FinishPicker label="テラスの床材" category="floor" value={d.terrace} onChange={(terrace) => set({ terrace })} />
          ) : (
            <FinishPicker label="床材" category="floor" value={d.floor} onChange={(floor) => set({ floor })} />
          )}
        </>
      );
      break;
    case 'wall':
      body = (
        <>
          <WallHeightButtons value={d.wallHeight} onChange={(wallHeight) => set({ wallHeight })} />
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
          {kind === 'window' && <SashPicker value={d.sashType} color={d.sashColor} onChange={(sashType) => set({ sashType })} />}
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
          <StairRailButtons value={d.stairRail} onChange={(stairRail) => set({ stairRail })} />
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
    case 'erase':
      body = <EraseOptions />;
      break;
    case 'furniture':
      body = (
        <div className="field">
          {(
            [
              ['庭・外（プール・花・表札など）', FURNITURE.filter((f) => f.category === 'outdoor')],
              ['家の中', FURNITURE.filter((f) => f.category !== 'outdoor')],
            ] as const
          ).map(([label, items]) => (
            <div key={label}>
              <div className="field-label">{label}</div>
              <div className="choice-list">
                {items.map((f) => (
                  <button key={f.id} className={`choice${f.id === d.furnitureType ? ' on' : ''}`} onClick={() => set({ furnitureType: f.id })}>
                    <span>{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {getFurniture(d.furnitureType).label && (
            <NameplateInput value={d.nameplateText} onChange={(nameplateText) => set({ nameplateText })} />
          )}
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

export function NameplateInput({ value = '', onChange }: { value?: string; onChange: (v: string) => void }) {
  return (
    <label className="field">
      <div className="field-label">表札の文字</div>
      <input type="text" value={value} maxLength={12} placeholder="山田" onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function EraseOptions() {
  const multi = useGame((s) => s.eraseMulti);
  const count = useGame((s) => s.marked.length);
  const g = useGame.getState();
  const touch = useTouchDevice();
  return (
    <>
      <div className="field">
        <div className="field-label">消し方</div>
        <div className="seg">
          <button className={!multi ? 'on' : ''} onClick={() => g.setEraseMulti(false)}>
            1つずつ
          </button>
          <button className={multi ? 'on' : ''} onClick={() => g.setEraseMulti(true)}>
            まとめて選ぶ
          </button>
        </div>
      </div>
      {multi && (
        <>
          <p className="info">
            {touch ? 'タップで選ぶ・外す、なぞると範囲で選べます。' : 'クリックで選ぶ・外す、何もない所からドラッグすると範囲で選べます。'}
            選んだもの：<b>{count}</b> 個
          </p>
          <button className="btn danger" disabled={!count} onClick={() => useGame.getState().deleteMarked()}>
            まとめて削除{!touch && <span className="kbd-hint">（Delete）</span>}
          </button>
          <button className="btn" disabled={!count} onClick={() => useGame.getState().clearMarks()}>
            選び直す
          </button>
        </>
      )}
    </>
  );
}

const FLOOR_KIND_NAMES: Record<FloorKind, string> = { room: '部屋の床', terrace: 'テラス' };

export function FloorKindButtons({ value = 'room', onChange }: { value?: FloorKind; onChange: (k: FloorKind) => void }) {
  return (
    <div className="field">
      <div className="field-label">床の種類</div>
      <div className="seg">
        {(Object.keys(FLOOR_KIND_NAMES) as FloorKind[]).map((k) => (
          <button key={k} className={k === value ? 'on' : ''} onClick={() => onChange(k)}>
            {FLOOR_KIND_NAMES[k]}
          </button>
        ))}
      </div>
    </div>
  );
}

const WALL_HEIGHT_NAMES: Record<WallHeight, string> = { full: 'ふつう 2,900mm', half: '半分 1,450mm' };

export function WallHeightButtons({ value = 'full', onChange }: { value?: WallHeight; onChange: (h: WallHeight) => void }) {
  return (
    <div className="field">
      <div className="field-label">壁の高さ</div>
      <div className="seg">
        {(Object.keys(WALL_HEIGHT_NAMES) as WallHeight[]).map((h) => (
          <button key={h} className={h === value ? 'on' : ''} onClick={() => onChange(h)}>
            {WALL_HEIGHT_NAMES[h]}
          </button>
        ))}
      </div>
    </div>
  );
}

const STAIR_RAIL_NAMES: Record<StairRail, string> = { none: 'なし', left: '左', right: '右', both: '両側' };

export function StairRailButtons({ value = 'left', onChange }: { value?: StairRail; onChange: (r: StairRail) => void }) {
  return (
    <div className="field">
      <div className="field-label">手すり（上る向きに見て）</div>
      <div className="seg">
        {(Object.keys(STAIR_RAIL_NAMES) as StairRail[]).map((r) => (
          <button key={r} className={r === value ? 'on' : ''} onClick={() => onChange(r)}>
            {STAIR_RAIL_NAMES[r]}
          </button>
        ))}
      </div>
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
