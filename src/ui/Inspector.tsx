// 右のパネル：選んだパーツの種類・素材・色・寸法を変える
import { FURNITURE, PANEL_COLORS, SASH_COLORS, getFurniture, getOpening, openingsOf } from '../catalog';
import { GRID, levelName } from '../building/dimensions';
import { canChangeWallHeight, canPlaceOpening, canPlaceStair, snapFurniture, snapOpeningOffset, wallLength } from '../building/rules';
import type { FurniturePart, OpeningPart, RoofPart, StairPart } from '../building/types';
import { useGame } from '../state/store';
import { FinishPicker, NamedSwatches, SashPicker, Swatches } from './FinishPicker';
import { FloorKindButtons, NameplateInput, RoofTypeButtons, Slider, StairRailButtons, WallHeightButtons } from './ToolOptions';
import { patchPart } from './edit';

const mm = (m: number) => `${Math.round(m * 1000).toLocaleString()}mm`;

export function Inspector() {
  const selection = useGame((s) => s.selection);
  const house = useGame((s) => s.house);
  const deleteSelected = useGame((s) => s.deleteSelected);
  if (!selection) return null;

  let title = '';
  let body = null;
  switch (selection.kind) {
    case 'floor': {
      const f = house.floors.find((p) => p.id === selection.id);
      if (!f) return null;
      title = `${f.kind === 'terrace' ? 'テラス' : '床'}（${levelName(f.level)}）`;
      body = (
        <>
          <p className="info">
            {mm((f.x1 - f.x0) * GRID)} × {mm((f.z1 - f.z0) * GRID)}（{(((f.x1 - f.x0) * (f.z1 - f.z0)) / 2).toFixed(1)}畳）
          </p>
          <FloorKindButtons value={f.kind} onChange={(kind) => patchPart('floor', f.id, { kind })} />
          <FinishPicker label="床材" category="floor" value={f.finish} onChange={(finish) => patchPart('floor', f.id, { finish })} />
        </>
      );
      break;
    }
    case 'wall': {
      const w = house.walls.find((p) => p.id === selection.id);
      if (!w) return null;
      title = `壁（${levelName(w.level)}）`;
      body = (
        <>
          <p className="info">長さ {mm(wallLength(w))}</p>
          <WallHeightButtons
            value={w.height}
            onChange={(height) => {
              const err = canChangeWallHeight(house, w.id, height);
              if (err) return useGame.getState().notify(err);
              patchPart('wall', w.id, { height });
            }}
          />
          <FinishPicker label="外壁材" category="exterior" value={w.exterior} onChange={(exterior) => patchPart('wall', w.id, { exterior })} />
          <FinishPicker label="内装" category="interior" value={w.interior} onChange={(interior) => patchPart('wall', w.id, { interior })} />
          <button className="btn" onClick={() => applyToLevelWalls(w.level, { exterior: w.exterior })}>
            この外壁をこの階の全部の壁に
          </button>
        </>
      );
      break;
    }
    case 'opening': {
      const o = house.openings.find((p) => p.id === selection.id);
      if (!o) return null;
      title = o.kind === 'door' ? 'ドア' : '窓';
      body = <OpeningInspector opening={o} />;
      break;
    }
    case 'stair': {
      const s = house.stairs.find((p) => p.id === selection.id);
      if (!s) return null;
      title = '階段';
      body = <StairInspector stair={s} />;
      break;
    }
    case 'roof': {
      const r = house.roofs.find((p) => p.id === selection.id);
      if (!r) return null;
      title = `屋根（${levelName(r.level)}の上）`;
      body = <RoofInspector roof={r} />;
      break;
    }
    case 'furniture': {
      const f = house.furniture.find((p) => p.id === selection.id);
      if (!f) return null;
      title = getFurniture(f.type).name;
      body = <FurnitureInspector item={f} />;
      break;
    }
  }

  return (
    <div className="panel inspector">
      <div className="panel-title">
        <span>{title}</span>
        <button className="btn danger small" onClick={deleteSelected} title="Delete キーでも消せます">
          削除
        </button>
      </div>
      {body}
    </div>
  );
}

function applyToLevelWalls(level: number, patch: Record<string, unknown>) {
  const s = useGame.getState();
  s.commit({ ...s.house, walls: s.house.walls.map((w) => (w.level === level ? { ...w, ...patch } : w)) });
}

function OpeningInspector({ opening: o }: { opening: OpeningPart }) {
  const notify = useGame((s) => s.notify);
  const house = useGame((s) => s.house);
  const wall = house.walls.find((w) => w.id === o.wallId);
  const def = getOpening(o.type);

  const changeType = (type: string) => {
    if (!wall) return;
    const offset = snapOpeningOffset(wallLength(wall), o.offset, getOpening(type).width);
    const err = canPlaceOpening(house, wall.id, type, offset, o.id);
    if (err) return notify(err);
    patchPart('opening', o.id, { type, offset });
  };
  const move = (delta: number) => {
    if (!wall) return;
    const offset = +(o.offset + delta).toFixed(4);
    const err = canPlaceOpening(house, wall.id, o.type, offset, o.id);
    if (err) return notify(err);
    patchPart('opening', o.id, { offset });
  };

  return (
    <>
      <p className="info">
        幅{mm(def.width)} × 高さ{mm(def.height)}　床から{mm(def.sill)}
      </p>
      <div className="field">
        <div className="field-label">種類</div>
        <select value={o.type} onChange={(e) => changeType(e.target.value)}>
          {openingsOf(o.kind).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <div className="field-label">位置（半マスずつ）</div>
        <div className="row">
          <button className="btn" onClick={() => move(-GRID / 2)}>
            ◀ 左へ
          </button>
          <button className="btn" onClick={() => move(GRID / 2)}>
            右へ ▶
          </button>
        </div>
      </div>
      {o.kind === 'window' && <SashPicker value={o.sash} color={o.sashColor} onChange={(sash) => patchPart('opening', o.id, { sash })} />}
      <NamedSwatches label="サッシ・枠の色" colors={SASH_COLORS} value={o.sashColor} onChange={(sashColor) => patchPart('opening', o.id, { sashColor })} />
      {o.kind === 'door' && (
        <NamedSwatches label="扉の色" colors={PANEL_COLORS} value={o.panelColor} onChange={(panelColor) => patchPart('opening', o.id, { panelColor })} />
      )}
    </>
  );
}

function StairInspector({ stair: s }: { stair: StairPart }) {
  const house = useGame((st) => st.house);
  const notify = useGame((st) => st.notify);
  const rotate = () => {
    const rot = ((s.rot + 1) % 4) as StairPart['rot'];
    const err = canPlaceStair(house, { level: s.level, x: s.x, z: s.z, rot }, s.id);
    if (err) return notify(err);
    patchPart('stair', s.id, { rot });
  };
  return (
    <>
      <StairRailButtons value={s.rail} onChange={(rail) => patchPart('stair', s.id, { rail })} />
      <FinishPicker label="踏み板" category="wood" value={s.finish} onChange={(finish) => patchPart('stair', s.id, { finish })} />
      <button className="btn" onClick={rotate}>
        向きを変える
      </button>
    </>
  );
}

function RoofInspector({ roof: r }: { roof: RoofPart }) {
  const set = (patch: Partial<RoofPart>) => patchPart('roof', r.id, patch);
  return (
    <>
      <p className="info">
        {mm((r.x1 - r.x0) * GRID)} × {mm((r.z1 - r.z0) * GRID)}
      </p>
      <RoofTypeButtons
        value={r.type}
        onChange={(type) =>
          set(
            type === 'flat'
              ? { type, overhang: 0, finish: { material: 'sheet', color: '#8f9294' } }
              : r.type === 'flat'
                ? { type, pitch: 4, overhang: 0.6, finish: { material: 'slate', color: '#2f3133' } }
                : { type },
          )
        }
      />
      {r.type !== 'flat' && (
        <>
          {r.type !== 'hip' && (
            <div className="row">
              <button className="btn" onClick={() => set({ axis: r.axis === 'x' ? 'z' : 'x' })}>
                棟の向きを変える
              </button>
              {r.type === 'shed' && (
                <button className="btn" onClick={() => set({ flip: !r.flip })}>
                  流れを反対に
                </button>
              )}
            </div>
          )}
          <Slider label="勾配" unit="寸" min={1} max={8} step={0.5} value={r.pitch} onChange={(pitch) => set({ pitch })} />
          <Slider label="軒の出" unit="mm" min={0} max={0.9} step={0.05} scale={1000} value={r.overhang} onChange={(overhang) => set({ overhang })} />
        </>
      )}
      <FinishPicker label="屋根材" category="roof" value={r.finish} onChange={(finish) => set({ finish })} />
      {r.type !== 'hip' && (
        <FinishPicker
          label={r.type === 'flat' ? 'パラペット（立ち上がり壁）' : '妻壁（屋根の下の三角の壁）'}
          category="exterior"
          value={r.gableFinish}
          onChange={(gableFinish) => set({ gableFinish })}
        />
      )}
    </>
  );
}

function FurnitureInspector({ item: f }: { item: FurniturePart }) {
  const def = getFurniture(f.type);
  const set = (patch: Partial<FurniturePart>) => patchPart('furniture', f.id, patch);
  const rotate = (deg: number) => set({ rotation: (((f.rotation + deg) % 360) + 360) % 360 });
  const move = (dx: number, dz: number) => set(snapFurniture(f.x + dx, f.z + dz));
  return (
    <>
      <div className="field">
        <div className="field-label">移動・回転</div>
        <div className="row">
          <button className="btn" onClick={() => move(-0.05, 0)}>← 5cm</button>
          <button className="btn" onClick={() => move(0.05, 0)}>→ 5cm</button>
          <button className="btn" onClick={() => move(0, -0.05)}>↑ 5cm</button>
          <button className="btn" onClick={() => move(0, 0.05)}>↓ 5cm</button>
        </div>
        <div className="row">
          <button className="btn" onClick={() => rotate(90)}>⟲ 90°</button>
          <button className="btn" onClick={() => rotate(-90)}>⟳ 90°</button>
        </div>
      </div>
      <div className="field">
        <div className="field-label">種類</div>
        <select value={f.type} onChange={(e) => set({ type: e.target.value, color: getFurniture(e.target.value).colors[0] })}>
          {FURNITURE.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <div className="field-label">色</div>
        <Swatches colors={def.colors} value={f.color} onChange={(color) => set({ color })} />
      </div>
      {def.label && <NameplateInput value={f.label} onChange={(label) => set({ label })} />}
      <div className="field">
        <div className="field-label">向き：{Math.round(f.rotation)}°</div>
        <div className="row">
          <button className="btn" onClick={() => rotate(90)}>⟲ 90°</button>
          <button className="btn" onClick={() => rotate(15)}>⟲ 15°</button>
          <button className="btn" onClick={() => rotate(-15)}>⟳ 15°</button>
          <button className="btn" onClick={() => rotate(-90)}>⟳ 90°</button>
        </div>
      </div>
      <p className="info">ドラッグで移動、矢印キーで5cmずつ動かせます。</p>
    </>
  );
}

