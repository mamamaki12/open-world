// 家具のデザイン画面：部品（板・脚・引き出し・扉・クッションなど）を組み合わせて、色と素材を選ぶ
import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { FurnitureDef, FurniturePiece } from '../catalog';
import { MAX_PARTS, PAINTS, PART_KINDS, TEMPLATES, designPrice, guessSeatHeight, useDesigner, useDesigns } from '../catalog/designs';
import { FurnitureModel } from '../world/parts/Furniture';
import { yen } from '../economy/money';
import { useGame } from '../state/store';

const MOVE_NAMES = { drawer: '引き出し', 'door-l': '扉（左が軸）', 'door-r': '扉（右が軸）' } as const;
const SHAPE_NAMES = { box: '箱', cylinder: '円柱', sphere: '球' } as const;
const COLORS = ['#e9e4da', '#c9b8a4', '#7a5535', '#3b2f2a', '#9aa7b3', '#5d6670', '#7b8f6a', '#b8613f', '#d8b4a0', '#2e4a6b', '#f2f0eb', '#18191b'];

function partName(p: FurniturePiece) {
  if (p.move) return MOVE_NAMES[p.move];
  return PART_KINDS.find((k) => k.piece.shape === p.shape && k.piece.size.join() === p.size.join())?.name ?? SHAPE_NAMES[p.shape];
}

function Preview({ def, color, open, selected, onSelect }: { def: FurnitureDef; color: string; open: boolean; selected: number | null; onSelect: (i: number) => void }) {
  const sel = selected === null ? null : def.parts[selected];
  return (
    <Canvas shadows camera={{ position: [1.8, 1.5, 2.2], fov: 40 }} dpr={[1, 2]}>
      <color attach="background" args={['#eef0f2']} />
      <hemisphereLight args={['#ffffff', '#b9b2a6', 0.9]} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} castShadow />
      <gridHelper args={[4, 40, '#c4c8cc', '#dde0e3']} />
      <FurnitureModel def={def} color={color} open={open} />
      {def.parts.map((p, i) => (
        <mesh key={i} position={p.pos} onClick={(e) => { e.stopPropagation(); onSelect(i); }}>
          <boxGeometry args={p.size} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      {sel && (
        <mesh position={sel.pos}>
          <boxGeometry args={[sel.size[0] + 0.01, sel.size[1] + 0.01, sel.size[2] + 0.01]} />
          <meshBasicMaterial color="#2b7de9" wireframe />
        </mesh>
      )}
      <OrbitControls target={[0, 0.5, 0]} maxPolarAngle={Math.PI / 2 - 0.02} minDistance={0.8} maxDistance={6} />
    </Canvas>
  );
}

function Slider({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const cm = Math.round(value * 100);
  return (
    <label className="designer-slider">
      <span>{label}</span>
      <input type="range" min={min} max={max} value={cm} onChange={(e) => onChange(+e.target.value / 100)} />
      <input type="number" min={min} max={max} value={cm} onChange={(e) => onChange(Math.min(max, Math.max(min, +e.target.value || 0)) / 100)} />
      <span>cm</span>
    </label>
  );
}

export function FurnitureDesigner() {
  const draft = useDesigner((s) => s.draft);
  const [selected, setSelected] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => setSelected(null), [draft?.id]);
  useEffect(() => {
    if (!draft) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [!!draft]);
  if (!draft) return null;

  const color = draft.colors[0];
  const update = (patch: Partial<FurnitureDef>) => useDesigner.setState({ draft: { ...draft, ...patch } });
  const setParts = (parts: FurniturePiece[], select: number | null = selected) => {
    update({ parts, ...(draft.seat ? { seat: { ...draft.seat, height: guessSeatHeight({ parts }) } } : {}) });
    setSelected(select);
  };
  const part = selected === null ? null : draft.parts[selected];
  const setPart = (patch: Partial<FurniturePiece>) => setParts(draft.parts.map((p, i) => (i === selected ? { ...p, ...patch } : p)));
  const setAxis = (key: 'size' | 'pos', axis: number, v: number) => {
    const next = [...part![key]] as [number, number, number];
    next[axis] = +v.toFixed(3);
    setPart({ [key]: next });
  };
  const add = (piece: FurniturePiece) => {
    if (draft.parts.length >= MAX_PARTS) return useGame.getState().notify(`部品は${MAX_PARTS}個までです`);
    setParts([...draft.parts, JSON.parse(JSON.stringify(piece))], draft.parts.length);
  };
  const mine = useDesigns.getState().designs.some((d) => d.id === draft.id);

  function close() {
    useDesigner.setState({ draft: null });
  }
  function save(place: boolean) {
    if (!draft || !draft.parts.length) return useGame.getState().notify('部品を1つ以上つけてください');
    const def = useDesigns.getState().save(draft);
    if (!def) return;
    // 置いてある同じデザインの家具も新しい形にする
    const g = useGame.getState();
    if (g.house.furniture.some((f) => f.type === def.id)) {
      g.commit({ ...g.house, furniture: g.house.furniture.map((f) => (f.type === def.id ? { ...f, design: def } : f)) });
    }
    if (place) {
      g.setDefaults({ furnitureType: def.id });
      g.setTool('furniture');
      g.notify(`「${def.name}」を置く場所を選んでください`);
    } else g.notify('デザインを保存しました');
    close();
  }

  return (
    <div className="overlay" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div className="modal designer" role="dialog" aria-label="家具のデザイン">
        <div className="modal-head">
          <div className="modal-title">家具をデザイン</div>
          <input className="designer-name" value={draft.name} maxLength={30} onChange={(e) => update({ name: e.target.value })} aria-label="家具の名前" />
          <span className="designer-price">{yen(designPrice(draft))}</span>
          <button className="tool close" onClick={close} aria-label="閉じる">✕ 閉じる</button>
        </div>
        <div className="designer-body">
          <div className="designer-view">
            <Preview def={draft} color={color} open={open} selected={selected} onSelect={setSelected} />
            <div className="designer-view-actions">
              <button className={`btn small${open ? ' on' : ''}`} onClick={() => setOpen(!open)}>{open ? '閉める' : '引き出し・扉を開けてみる'}</button>
            </div>
          </div>
          <div className="designer-controls">
            <div className="field">
              <div className="field-label">ひな形から始める</div>
              <div className="row wrap">
                {TEMPLATES.map((t) => (
                  <button key={t.name} className="btn small" onClick={() => { update({ ...JSON.parse(JSON.stringify(t.def)), id: draft.id }); setSelected(null); }}>{t.name}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <div className="field-label">部品を足す（{draft.parts.length}/{MAX_PARTS}）</div>
              <div className="row wrap">
                {PART_KINDS.map((k) => <button key={k.id} className="btn small" onClick={() => add(k.piece)}>＋ {k.name}</button>)}
              </div>
            </div>
            <div className="field">
              <div className="field-label">部品（プレビューをタップしても選べます）</div>
              <div className="designer-parts">
                {draft.parts.map((p, i) => (
                  <button key={i} className={`btn small${i === selected ? ' on' : ''}`} onClick={() => setSelected(i === selected ? null : i)}>{i + 1}. {partName(p)}</button>
                ))}
              </div>
            </div>
            {part && (
              <div className="field designer-part">
                <div className="field-label">選んだ部品：{partName(part)}</div>
                <Slider label="幅" value={part.size[0]} min={1} max={300} onChange={(v) => setAxis('size', 0, v)} />
                <Slider label="高さ" value={part.size[1]} min={1} max={300} onChange={(v) => setAxis('size', 1, v)} />
                <Slider label="奥行" value={part.size[2]} min={1} max={300} onChange={(v) => setAxis('size', 2, v)} />
                <Slider label="左右" value={part.pos[0]} min={-150} max={150} onChange={(v) => setAxis('pos', 0, v)} />
                <Slider label="床から" value={part.pos[1]} min={0} max={280} onChange={(v) => setAxis('pos', 1, v)} />
                <Slider label="前後" value={part.pos[2]} min={-150} max={150} onChange={(v) => setAxis('pos', 2, v)} />
                <div className="row wrap">
                  <select value={part.paint} onChange={(e) => setPart({ paint: e.target.value as FurniturePiece['paint'] })} aria-label="素材">
                    {PAINTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select value={part.shape} onChange={(e) => setPart({ shape: e.target.value as FurniturePiece['shape'] })} aria-label="形">
                    {Object.entries(SHAPE_NAMES).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
                  </select>
                  <select value={part.move ?? ''} onChange={(e) => setPart({ move: (e.target.value || undefined) as FurniturePiece['move'] })} aria-label="動き">
                    <option value="">動かない</option>
                    {Object.entries(MOVE_NAMES).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
                  </select>
                </div>
                <div className="row wrap">
                  <button className="btn small" onClick={() => add({ ...part, pos: [part.pos[0], part.pos[1] + part.size[1], part.pos[2]] })}>上に複製</button>
                  <button className="btn small" onClick={() => add({ ...part, pos: [-part.pos[0], part.pos[1], part.pos[2]], ...(part.move === 'door-l' ? { move: 'door-r' } : part.move === 'door-r' ? { move: 'door-l' } : {}) })}>左右反対に複製</button>
                  <button className="btn small" onClick={() => add({ ...part, pos: [part.pos[0], part.pos[1], -part.pos[2]] })}>前後反対に複製</button>
                  <button className="btn small danger" onClick={() => setParts(draft.parts.filter((_, i) => i !== selected), null)}>削除</button>
                </div>
              </div>
            )}
            <div className="field">
              <div className="field-label">メイン色（素材「メイン色」の部品）</div>
              <div className="row wrap">
                {COLORS.map((c) => <button key={c} className={`swatch${c === color ? ' on' : ''}`} style={{ background: c }} onClick={() => update({ colors: [c] })} aria-label={c} />)}
                <input type="color" value={color} onChange={(e) => update({ colors: [e.target.value] })} aria-label="色を自由に選ぶ" />
              </div>
            </div>
            <label className="field designer-check">
              <input type="checkbox" checked={!!draft.seat} onChange={(e) => update({ seat: e.target.checked ? { height: guessSeatHeight(draft), z: 0 } : undefined })} />
              座れる家具にする（座面の高さ {Math.round((draft.seat?.height ?? guessSeatHeight(draft)) * 100)}cm）
            </label>
            <p className="info">引き出しは手前へ引き出され、扉は軸の側を中心に手前へ開きます。家に置いたら近くでF（スマホは操作ボタン）で開け閉めできます。</p>
          </div>
        </div>
        <div className="designer-foot">
          {mine && <button className="btn danger" onClick={() => { useDesigns.getState().remove(draft.id); close(); }}>このデザインを削除</button>}
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={() => save(false)}>保存</button>
          <button className="btn primary" onClick={() => save(true)}>保存して置く</button>
        </div>
      </div>
    </div>
  );
}
