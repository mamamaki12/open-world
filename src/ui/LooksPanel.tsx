import { iconText } from './AppIcon';
// 見た目を作る画面（最初の1回・あとから変更）と、美容室の髪型・カラー選び。3Dで確かめながら選ぶ
import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useGame } from '../state/store';
import { useEconomy } from '../state/economy';
import { useLooks } from '../state/looks';
import { persist } from '../session/saves';
import { BUILDS, FACES, HAIR_COLORS, HAIR_STYLES, SEX_NAMES, SKIN_TONES, colorPrice, salonCost } from '../catalog/looks';
import type { Looks, Sex } from '../catalog/looks';
import { yen } from '../economy/money';
import { AvatarModel, useRig } from '../world/Avatar';
import { Modal } from './Modal';
import './looks.css';

function Preview({ looks, close }: { looks: Looks; close: boolean }) {
  const rig = useRig();
  return <div className="looks-preview" role="img" aria-label="3Dプレビュー。ドラッグで回転">
    <Canvas camera={{ position: close ? [0.3, 1.68, -1.25] : [0.55, 1.2, -3], fov: 34 }} dpr={[1, 1.5]}>
      <color attach="background" args={['#eeece7']} />
      <ambientLight intensity={1.6} /><directionalLight position={[-2, 4, -3]} intensity={3} /><directionalLight position={[2, 2, 1]} intensity={1.2} />
      <AvatarModel rig={rig} looks={looks} />
      <OrbitControls target={[0, close ? 1.6 : 0.9, 0]} enablePan={false} minDistance={1} maxDistance={4} />
    </Canvas>
  </div>;
}

type Mode = 'create' | 'edit' | 'salon';
const Row = ({ label, children }: { label: string; children: React.ReactNode }) => <div className="looks-row"><span>{iconText(label)}</span><div>{children}</div></div>;

export function LooksPanel({ mode }: { mode: Mode }) {
  const now = useLooks(s => s.looks), money = useEconomy(s => s.money);
  const [draft, setDraft] = useState<Looks>(now), [error, setError] = useState(''), [saving, setSaving] = useState(false);
  const put = (p: Partial<Looks>) => { setDraft({ ...draft, ...p }); setError(''); };
  const finish = async () => {
    setSaving(true); setError('');
    try { await persist(); useGame.getState().setOverlay(null); }
    catch { setError('保存できませんでした。もう一度お試しください。'); }
    finally { setSaving(false); }
  };
  const close = () => {
    if (saving) return;
    if (mode === 'create') { useLooks.getState().set(useLooks.getState().looks); void finish(); }
    else useGame.getState().setOverlay(null);
  };
  const salon = mode === 'salon', hairFree = mode === 'create', cost = salonCost(now, draft);
  const confirm = () => {
    if (saving) return;
    if (salon) { const err = useLooks.getState().salon(draft.hair, draft.hairColor); if (err) { setError(err); return; } }
    else useLooks.getState().set(hairFree ? draft : { ...draft, hair: now.hair, hairColor: now.hairColor });
    void finish();
  };
  const pick = <T,>(v: T, cur: T, on: () => void, label: React.ReactNode, extra = '') =>
    <button className={`looks-chip${extra}`} aria-pressed={v === cur} onClick={on}>{iconText(label)}</button>;
  return <Modal title={salon ? '💇 HAIR SALON LUCE' : mode === 'create' ? '🙂 あなたの見た目をつくる' : '🙂 見た目を変える'} onClose={close} tabs={[]} tab="" onTab={() => {}} className="looks-modal">
    <div className="looks-layout">
      <Preview looks={draft} close={salon} />
      <div className="looks-options">
        {!salon && <>
          <Row label="性別">{(['m', 'f'] as Sex[]).map(s => <span key={s}>{pick(s, draft.sex, () => put({ sex: s, ...(mode === 'create' ? { hair: s === 'f' ? 'bob' : 'short' } : {}) }), SEX_NAMES[s])}</span>)}</Row>
          <Row label="体型">{BUILDS.map(b => <span key={b.id}>{pick(b.id, draft.build, () => put({ build: b.id }), b.name)}</span>)}</Row>
          <Row label="肌の色">{SKIN_TONES.map((c, i) => <span key={c}>{pick(i, draft.skin, () => put({ skin: i }), <i style={{ background: c }} />, ' looks-swatch')}</span>)}</Row>
          <Row label="顔">{FACES.map((f, i) => <span key={f.name}>{pick(i, draft.face, () => put({ face: i }), f.name)}</span>)}</Row>
        </>}
        {(hairFree || salon) ? <>
          <Row label="髪型">{HAIR_STYLES.map(h => <span key={h.id}>{pick(h.id, draft.hair, () => put({ hair: h.id }), <>{h.name}{salon && h.id !== now.hair && <small>{yen(h.price)}</small>}</>)}</span>)}</Row>
          <Row label="髪の色">{HAIR_COLORS.map((c, i) => <span key={c.name}>{pick(i, draft.hairColor, () => put({ hairColor: i }), <><i style={{ background: c.color }} />{c.name}{salon && i !== now.hairColor && <small>{yen(colorPrice(i))}</small>}</>, ' looks-swatch named')}</span>)}</Row>
        </> : <p className="looks-note">髪型と髪の色は、町の美容室（服屋通りの東）で変えられます。</p>}
        {error && <p role="alert" className="warn">{error}</p>}
        <div className="looks-actions">
          {salon && <span className="looks-bill">お会計 <b>{yen(cost)}</b> <small>所持金 {yen(money)}</small></span>}
          <button className="looks-primary" disabled={saving || salon && (!cost || money < cost)} onClick={confirm}>
            {saving ? '保存中…' : salon ? (!cost ? '髪型・色を選んでください' : money < cost ? 'お金が足りません' : 'この髪型にする') : mode === 'create' ? 'この見た目ではじめる' : '決定'}
          </button>
        </div>
      </div>
    </div>
  </Modal>;
}
