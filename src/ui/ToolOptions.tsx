// 左のパネル：いま持っているツールで置くパーツの種類・素材・色を選ぶ
import { FURNITURE, PANEL_COLORS, SASH_COLORS, getFurniture, openingsOf } from '../catalog';
import { useDesigns } from '../catalog/designs';
import { openDesigner } from './designer';
import { ROOF_TYPE_NAMES } from '../building/roof';
import type { FloorKind, RoofType, StairRail, WallHeight } from '../building/types';
import { useGame } from '../state/store';
import type { Tool } from '../state/store';
import { useInteraction } from '../state/interaction';
import { FinishPicker, NamedSwatches, SashPicker } from './FinishPicker';
import { useTouchDevice } from './useTouchDevice';

export const TOOL_HELP: Record<Tool, string> = {
  select: 'パーツをクリックして選ぶと、右のパネルで種類・素材・色を変えられます。選んだ家具はドラッグで動かせます。',
  floor: 'ドラッグで四角く床を張ります（1マス = 910mm）。「テラス」にすると屋外のウッドデッキになります。地面の上なら1階、1階の壁の上からドラッグすると2階の床になります。壁に支えられた床の隣から、同じ高さに延長できます。',
  wall: 'マス目の線に沿ってドラッグして壁を立てます。床のない側が外壁になります。高さは腰壁・地面から建つ塀・目隠し塀も選べます。',
  door: '壁の上にマウスを当てて、クリックでドアを付けます。',
  window: '壁の上にマウスを当てて、クリックで窓を付けます。',
  stair: '1階でクリックすると2階へ上がる階段を置きます（幅1マス × 長さ4マス）。R キーで向きを変えます。手すりは なし・左・右・両側 から選べます。',
  roof: '屋根を載せる範囲をドラッグします。範囲の下にあるいちばん上の階の壁に載ります。',
  furniture: 'クリックで家具を置きます。10cm刻みで動き、近くの家具の中心・端に自動で揃います。Shift を押すと5cmで微調整。R キーで90度回します。',
  erase: 'クリックしたパーツを消します。ドラッグで範囲を囲むと、その中のものをまとめて選んで一度に消せます（視点の回転は右ドラッグ）。',
};

/** 指で操作するときの説明 */
const TOUCH_TOOL_HELP: Record<Tool, string> = {
  select: 'パーツをタップして選ぶと、この引き出しで種類・素材・色を変えられます。選んだ家具は指でなぞって動かせます。',
  floor: '指でなぞって四角く床を張ります（1マス = 910mm）。地面の上なら1階、1階の壁の上からなぞると2階の床になります。壁に支えられた床の隣から、同じ高さに延長できます。',
  wall: 'マス目の線に沿って指でなぞって壁を立てます。床のない側が外壁になります。「塀」は地面から立ち上がります。',
  door: '壁をタップするとドアを付けます。',
  window: '壁をタップすると窓を付けます。',
  stair: '1階をタップすると2階へ上がる階段を置きます（幅1マス × 長さ4マス）。下のボタンで向きを変えます。',
  roof: '屋根を載せる範囲を指でなぞります。範囲の下にあるいちばん上の階の壁に載ります。',
  furniture: 'タップで家具を置きます。10cm刻みで動き、近くの家具の中心・端に自動で揃います。配置後は5cm移動ボタンで微調整できます。',
  erase: 'タップしたパーツを消します。なぞって範囲を囲むと、その中のものをまとめて選んで一度に消せます（視点は2本指）。',
};

export function ToolOptions() {
  const touch = useTouchDevice();
  const tool = useGame((s) => s.tool);
  const d = useGame((s) => s.defaults);
  const set = useGame((s) => s.setDefaults);
  const eraseMulti = useGame(s => s.eraseMulti);
  const groupedSelection = useGame(s => s.groupSelection || s.boxSelect || s.marked.length > 0);
  const designs = useDesigns((s) => s.designs);
  const stairRot = useInteraction((s) => s.stairRot);

  let body = null;
  switch (tool) {
    case 'select':
      body = <SelectSelectionActions />;
      break;
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
          <StairShapeButtons value={d.stairShape} onChange={(stairShape) => set({ stairShape })} />
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
          {getFurniture(d.furnitureType).label && (
            <NameplateInput value={d.nameplateText} onChange={(nameplateText) => set({ nameplateText })} />
          )}
          <div>
            <div className="field-label">自分でデザインした家具</div>
            <div className="choice-list">
              {designs.map((f) => (
                <button key={f.id} className={`choice${f.id === d.furnitureType ? ' on' : ''}`} onClick={() => set({ furnitureType: f.id })}>
                  <span>{f.name}</span>
                  <small onClick={(e) => { e.stopPropagation(); openDesigner(f); }}>編集</small>
                </button>
              ))}
              <button className="choice" onClick={() => openDesigner()}><span>＋ 家具をデザインする</span></button>
            </div>
          </div>
          {(
            [
              ['外構・ガレージ・庭', FURNITURE.filter((f) => f.category === 'outdoor')],
               ['照明', FURNITURE.filter((f) => f.category === 'lighting')],
               ['家の中', FURNITURE.filter((f) => !f.category)],
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
          <button className="btn" onClick={() => set({ furnitureRotation: (d.furnitureRotation + 90) % 360 })}>
            向きを変える<span className="kbd-hint">（R）</span>：{d.furnitureRotation}°
          </button>
        </div>
      );
      break;
  }

  return (
    <div className="panel tool-options">
      <p className="help">{touch && tool === 'erase' && !eraseMulti ? 'タップして消します。1本指でなぞると視点を回せます。範囲で消すときは「まとめて選ぶ」に切り替えてください。' : (touch ? TOUCH_TOOL_HELP : TOOL_HELP)[tool]}</p>
      {touch && (tool === 'wall' || tool === 'floor') && <p className="info">真上から指の位置に合わせて配置します。2本指で移動・ズームできます。</p>}
      {tool === 'select' && <p className="info">{groupedSelection ? '一括選択中は長押しでは消えません。範囲で選んだものは「選択を削除」でまとめて消せます。' : `${touch ? 'タップ' : 'クリック'}で1ブロックだけ選び、長押しでその1ブロックを削除します。同じ素材・色でまとめて動かすときは、選択後にチェックを入れてください。`}</p>}
      {tool === 'furniture' && d.furnitureType === 'nameplate' && <p className="info">表示する文字を入力し、取り付けたい壁面をタップしてください。壁の手前側に固定します。</p>}
      {tool === 'furniture' && getFurniture(d.furnitureType).light && <p className="info">{getFurniture(d.furnitureType).mount ? '取り付けたい壁面をタップしてください。窓・ドアを避けて壁に固定し、配置後に高さを調整できます。' : '地面や床をタップして置けます。夜や室内を暖かい光で照らします。'}</p>}
      {tool === 'furniture' && getFurniture(d.furnitureType).grounded && <p className="info">地面基準のガレージ建材です。Rまたは向き変更で回転。車庫の入口は+Z側です。柱・壁・屋根・舗装を組み合わせて広げられます。</p>}
      {body}
    </div>
  );
}

export function NameplateInput({ value = '', onChange }: { value?: string; onChange: (v: string) => void }) {
  return (
    <label className="field">
      <div className="field-label">表札の文字（自由入力）</div>
      <input aria-label="表札に表示する文字" type="text" value={value} maxLength={24} placeholder="例：山田 / YAMADA" autoComplete="off" onChange={(e) => onChange(e.target.value)} />
      <output className="info" aria-live="polite">表示：{value || '（文字なし）'}</output>
      <small className="info">日本語・英字・数字など24文字まで。配置後も表札を選ぶと変更できます。</small>
    </label>
  );
}

function EraseOptions() {
  const multi = useGame((s) => s.eraseMulti);
  const g = useGame.getState();
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
      {multi && <EraseSelectionActions />}
    </>
  );
}

/** 選んだ後も画面に残し、建築メニューを開き直さず確定できる。 */
export function EraseSelectionActions() {
  const count = useGame((s) => s.marked.length);
  const walking = useGame((s) => s.mode === 'walk');
  const touch = useTouchDevice();
  return <section aria-label="まとめて削除の選択" className="erase-selection-actions">
    <p className="info">{walking ? '狙ったパーツを選ぶ・外す。' : touch ? 'タップで選ぶ・外す。なぞって範囲で選ぶ（全階）。' : 'クリックで選ぶ・外す。ドラッグで範囲選択（全階）。'}</p>
    <p className="info" role="status">選んだもの：<b>{count}</b> 個</p>
    <div className="row">
      <button className="btn danger" disabled={!count} onClick={() => useGame.getState().deleteMarked()}>まとめて削除{!touch && !walking && <span className="kbd-hint">（Delete）</span>}</button>
      <button className="btn" disabled={!count} onClick={() => useGame.getState().clearMarks()}>選び直す</button>
    </div>
  </section>;
}

export function SelectSelectionActions() {
  const box = useGame(s => s.boxSelect);
  const count = useGame(s => s.marked.length || (s.selection ? 1 : 0));
  const touch = useTouchDevice();
  const game = useGame.getState();
  const compact = touch && count === 1 && !box;
  return <section aria-label="選択と一括操作" className={`selection-actions${compact ? ' compact' : ''}`}>
    <div className="seg">
      <button className={!box ? 'on' : ''} aria-pressed={!box} onClick={() => game.setBoxSelect(false)}>移動・編集</button>
      <button className={box ? 'on' : ''} aria-pressed={box} onClick={() => game.setBoxSelect(true)}>範囲選択</button>
    </div>
    {!compact && <><p className="info">{box ? 'なぞって範囲を選ぶ（全階）。移動するときは「移動・編集」へ。' : touch ? 'パーツをつかんで移動。範囲を選ぶときは「範囲選択」へ。' : '背景ドラッグ／Shift＋ドラッグで範囲選択。右ドラッグで視点回転。'}</p>
    <p className="info" role="status">選んだもの：<b>{count}</b> 個</p>
    <div className="row">
      <button className="btn danger" disabled={!count} onClick={() => game.marked.length ? game.deleteMarked() : game.deleteSelected()}>選択を削除</button>
      <button className="btn" disabled={!count} onClick={() => game.clearMarks()}>選び直す</button>
    </div>
    {count > 1 && <div className="row" aria-label="選択全体を移動">
      <button className="btn" onClick={() => game.moveSelection(-1, 0)}>← 1マス</button>
      <button className="btn" onClick={() => game.moveSelection(1, 0)}>→ 1マス</button>
      <button className="btn" onClick={() => game.moveSelection(0, -1)}>↑ 1マス</button>
      <button className="btn" onClick={() => game.moveSelection(0, 1)}>↓ 1マス</button>
    </div>}</>}
  </section>;
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

const WALL_HEIGHT_NAMES: Record<WallHeight, string> = { full: '壁 2,900mm', half: '腰壁 1,450mm', fence: '塀 1,200mm（地面から）', privacyFence: '目隠し塀 1,800mm（地面から）' };

export function WallHeightButtons({ value = 'full', onChange }: { value?: WallHeight; onChange: (h: WallHeight) => void }) {
  return (
    <div className="field">
      <div className="field-label">壁・塀の種類</div>
      <div className="choice-list">
        {(Object.keys(WALL_HEIGHT_NAMES) as WallHeight[]).map((h) => (
          <button key={h} className={`choice${h === value ? ' on' : ''}`} onClick={() => onChange(h)}>
            {WALL_HEIGHT_NAMES[h]}
          </button>
        ))}
      </div>
    </div>
  );
}

const STAIR_RAIL_NAMES: Record<StairRail, string> = { none: 'なし', left: '左', right: '右', both: '両側' };

export function StairShapeButtons({ value = 'straight', onChange }: { value?: import('../building/types').StairShape; onChange: (shape: import('../building/types').StairShape) => void }) {
  const shapes = [
    ['straight', '直階段', '1×4マス'], ['compact', 'コンパクト', '1×3マス'],
    ['l', 'L字＋踊り場', '3×3マス'], ['u', '折り返し＋踊り場', '2×3マス'],
  ] as const;
  return <div className="field"><div className="field-label">階段の形・サイズ</div><div className="choice-list">
    {shapes.map(([shape, label, size]) => <button key={shape} className={`choice${shape === value ? ' on' : ''}`} onClick={() => onChange(shape)}><span>{label}</span><small>{size}</small></button>)}
  </div><p className="info">L字・折り返しは途中に水平な踊り場があり、そこで方向を変えて上れます。</p></div>;
}

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

