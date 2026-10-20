import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { getCar } from '../catalog/cars';
import { ENGINES, FINISHES, LIMITS, LIVERIES, PAINT_COLORS, STOCK_MODS, WHEELS, WHEEL_COLORS, WINGS, horsepower, quote, quoteTotal, tunedCar, zeroTo40 } from '../catalog/carMods';
import type { CarMods } from '../catalog/carMods';
import type { TunerTab } from '../building/venues';
import { customizeCar, useVehicles } from '../state/vehicles';
import { useVenue } from '../state/venue';
import { useEconomy } from '../state/economy';
import { useGame } from '../state/store';
import { yen } from '../economy/money';
import { CarModel } from '../world/CarModel';
import { atTuner } from '../world/vehicleLogic';
import { playerMemory } from '../world/Player';
import { playEngineRev } from '../world/engineSound';
import { Modal } from './Modal';
import './vehicles.css';

const TABS: { id: TunerTab; label: string }[] = [
  { id: 'paint', label: '塗装' }, { id: 'engine', label: 'エンジン' }, { id: 'wheels', label: 'ホイール' }, { id: 'chassis', label: '足回り' }, { id: 'aero', label: 'エアロ' },
];
const TINTS = ['なし', 'ライト', 'ミドル', 'リムジン'];
function Swatches({ colors, value, onPick, label }: { colors: string[]; value: string; onPick: (c: string) => void; label: string }) {
  return <div className="car-colors tuner-swatches" aria-label={label}>
    {colors.map(c => <button key={c} aria-label={label + ' ' + c} aria-pressed={c.toLowerCase() === value.toLowerCase()} style={{ background: c }} onClick={() => onPick(c)} />)}
    <label className="tuner-picker" title="好きな色">🎨<input type="color" value={value} onChange={e => onPick(e.target.value)} aria-label={label + 'を自由に選ぶ'} /></label>
  </div>;
}
function Choices<T extends string>({ list, value, onPick, extra }: { list: { id: T; name: string; price: number; note?: string }[]; value: T; onPick: (id: T) => void; extra?: (id: T) => string }) {
  return <div className="tuner-options">{list.map(o => <button key={o.id} className={'tuner-option' + (o.id === value ? ' on' : '')} aria-pressed={o.id === value} onClick={() => onPick(o.id)}>
    <b>{o.name}</b><span>{o.price ? yen(o.price) : '—'}</span>{(o.note || extra) && <small>{[o.note, extra?.(o.id)].filter(Boolean).join(' · ')}</small>}
  </button>)}</div>;
}
function Slider({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: (v: number) => string; onChange: (v: number) => void }) {
  return <label className="tuner-slider"><span>{label}<b>{unit(value)}</b></span>
    <input type="range" min={min} max={max} step={1} value={value} onChange={e => onChange(Number(e.target.value))} /></label>;
}

/** 車のカスタムショップ。所有車を選び、見た目と性能を変えて、変えた部分の代金を払う。 */
export function TunerPanel() {
  const cars = useVehicles(s => s.cars), driving = useVehicles(s => s.driving), money = useEconomy(s => s.money), close = useGame(s => s.setOverlay);
  const [carId, setCarId] = useState(() => cars[0]?.id ?? '');
  const car = cars.find(c => c.id === carId);
  const [color, setColor] = useState(car?.color ?? '#ffffff');
  const [mods, setMods] = useState<CarMods>(() => car ? { ...(car.mods ?? STOCK_MODS) } : { ...STOCK_MODS });
  const [tab, setTab] = useState<TunerTab>(() => useVenue.getState().tab ?? 'paint');
  const [error, setError] = useState('');
  const pickCar = (id: string) => { const c = cars.find(x => x.id === id)!; setCarId(id); setColor(c.color); setMods({ ...(c.mods ?? STOCK_MODS) }); setError(''); };
  const set = <K extends keyof CarMods>(k: K, v: CarMods[K]) => { setMods(m => ({ ...m, [k]: v })); setError(''); };
  const title = '🔧 STANCE GARAGE · カーカスタム';
  if (!car) return <Modal title={title} onClose={() => close(null)} tabs={[]} tab="" onTab={() => undefined} className="dealer-modal">
    <p className="dealer-intro">あなたの一台を、あなただけの一台に。</p>
    <p>まだ車を持っていません。隣の AVENUE MOTORS で車を買ってから来てください。</p>
  </Modal>;
  const def = getCar(car.model)!, before = tunedCar(def, (car.mods ?? STOCK_MODS)), after = tunedCar(def, mods);
  const lines = quote(car, { color, mods }), total = quoteTotal(lines);
  const evStock = car.model === 'volt' && mods.engine === 'stock';
  const stat = (label: string, a: string, b: string) => <><dt>{label}</dt><dd>{a === b ? b : <>{a} → <b className="tuner-up">{b}</b></>}</dd></>;
  const grip = (g: number) => '★'.repeat(Math.max(1, Math.min(5, Math.round((g - .75) / .1) + 1))) + '☆'.repeat(5 - Math.max(1, Math.min(5, Math.round((g - .75) / .1) + 1)));
  return <Modal title={title} onClose={() => close(null)} tabs={TABS} tab={tab} onTab={setTab} className="dealer-modal tuner-modal">
    <p>所持金 <b>{yen(money)}</b></p>
    <div className="dealer-layout">
      <div className="dealer-models">{cars.map(c => { const d = getCar(c.model)!; return <button key={c.id} className={'dealer-model' + (c.id === carId ? ' on' : '')} onClick={() => pickCar(c.id)}>
        <small>{d.category}{c.id === driving ? '・運転中' : ''}</small><b>{d.name}</b><span><i className="tuner-dot" style={{ background: c.color }} />{ENGINES.find(e => e.id === (c.mods ?? STOCK_MODS).engine)!.name}</span>
      </button>; })}</div>
      <section className="dealer-detail">
        <div className="dealer-preview" role="img" aria-label={def.name + 'のカスタムの3Dプレビュー。ドラッグで回転'}>
          <Canvas camera={{ position: [5, 2.4, 5], fov: 40 }} shadows>
            <color attach="background" args={['#1c1e22']} /><ambientLight intensity={1.4} /><directionalLight position={[3, 6, 2]} intensity={3} castShadow />
            <CarModel key={def.id} def={def} color={color} mods={mods} />
            <mesh rotation-x={-Math.PI / 2} position={[0, -.02, 0]} receiveShadow><planeGeometry args={[30, 30]} /><meshStandardMaterial color="#34373c" /></mesh>
            <OrbitControls target={[0, .6, 0]} enablePan={false} minDistance={3} maxDistance={10} maxPolarAngle={Math.PI / 2 - .04} />
          </Canvas>
        </div>
        <dl className="car-specs">
          {stat('最高出力', horsepower(before) + ' PS', horsepower(after) + ' PS')}
          {stat('0→40km/h', zeroTo40(before).toFixed(1) + ' 秒', zeroTo40(after).toFixed(1) + ' 秒')}
          {stat('最高速度（街中）', Math.round(before.maxSpeed * 3.6) + ' km/h', Math.round(after.maxSpeed * 3.6) + ' km/h')}
          {stat('コーナリング', grip(before.grip), grip(after.grip))}
        </dl>
        <div className="tuner-part">
          {tab === 'paint' && <>
            <h3>ボディカラー</h3><Swatches colors={PAINT_COLORS} value={color} onPick={c => { setColor(c); setError(''); }} label="ボディカラー" />
            <h3>塗装の質感</h3><Choices list={FINISHES} value={mods.finish} onPick={v => set('finish', v)} />
            <h3>デザイン</h3><Choices list={LIVERIES} value={mods.livery} onPick={v => set('livery', v)} />
            {mods.livery !== 'none' && <><h3>デザインの色</h3><Swatches colors={PAINT_COLORS} value={mods.accent} onPick={c => set('accent', c)} label="デザインの色" /></>}
            <Slider label="窓のスモーク" value={mods.tint} min={LIMITS.tint[0]} max={LIMITS.tint[1]} unit={v => TINTS[v]} onChange={v => set('tint', v)} />
          </>}
          {tab === 'engine' && <>
            <h3>エンジン載せ替え</h3>
            <Choices list={ENGINES} value={mods.engine} onPick={v => set('engine', v)} extra={id => { const t = tunedCar(def, { ...mods, engine: id }); return horsepower(t) + 'PS · ' + (id === 'stock' && car.model === 'volt' ? '電気モーター' : ENGINES.find(e => e.id === id)!.layout); }} />
            <button className="btn" onClick={() => playEngineRev(evStock ? 'electric' : mods.engine)}>🔊 エンジン音を聞く</button>
          </>}
          {tab === 'wheels' && <>
            <h3>ホイールのデザイン</h3><Choices list={WHEELS} value={mods.wheel} onPick={v => set('wheel', v)} />
            <Slider label="サイズ" value={mods.wheelSize} min={LIMITS.wheelSize[0]} max={LIMITS.wheelSize[1]} unit={v => v ? `+${v} インチ` : '純正'} onChange={v => set('wheelSize', v)} />
            <h3>ホイールの色</h3><Swatches colors={WHEEL_COLORS} value={mods.wheelColor} onPick={c => set('wheelColor', c)} label="ホイールの色" />
          </>}
          {tab === 'chassis' && <>
            <Slider label="車高（車高調）" value={mods.rideHeight} min={LIMITS.rideHeight[0]} max={LIMITS.rideHeight[1]} unit={v => v ? `${v > 0 ? '+' : ''}${v} cm` : '純正'} onChange={v => set('rideHeight', v)} />
            <Slider label="キャンバー角" value={mods.camber} min={LIMITS.camber[0]} max={LIMITS.camber[1]} unit={v => v ? `−${v}°` : '0°（純正）'} onChange={v => set('camber', v)} />
            <p className="info">少し下げて少しネガキャンを付けると曲がりやすくなります。付けすぎ（−4°より大きい）や車高上げは接地が減り、高速で曲がりにくくなります。</p>
          </>}
          {tab === 'aero' && <>
            <h3>リアウィング</h3><Choices list={WINGS} value={mods.wing} onPick={v => set('wing', v)} />
            <p className="info">GTウィングとスワンネックは高速で曲がりやすくなる代わりに、空気抵抗で最高速が少し下がります。</p>
          </>}
        </div>
        <div className="dealer-confirm tuner-quote">
          {lines.length ? <ul>{lines.map(l => <li key={l.label}><span>{l.label}</span><b>{yen(l.price)}</b></li>)}</ul> : <p>パーツを選ぶと見積もりが出ます。</p>}
          {error && <p role="alert" className="warn">{error}</p>}
          <div className="tuner-actions">
            <button className="btn primary big-btn" disabled={!lines.length || money < total} onClick={() => {
              const err = customizeCar(car.id, color, mods, useGame.getState().mode === 'walk' && atTuner(playerMemory));
              if (err) setError(err); else setError('');
            }}>{lines.length ? `施工する · ${yen(total)}` : '変更なし'}</button>
            <button className="btn" disabled={!lines.length} onClick={() => { setColor(car.color); setMods({ ...(car.mods ?? STOCK_MODS) }); setError(''); }}>選び直す</button>
          </div>
        </div>
      </section>
    </div>
  </Modal>;
}
