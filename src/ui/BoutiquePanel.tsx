// 服屋さんの売り場と、持っている服に着替えるクローゼット。左の3Dで試着した姿を見られる
import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useVenue } from '../state/venue';
import { useGame } from '../state/store';
import { useEconomy } from '../state/economy';
import { useWardrobe } from '../state/wardrobe';
import { BOUTIQUE_INFO, isBoutique } from '../building/boutiques';
import type { BoutiqueId } from '../building/boutiques';
import { GARMENTS, SLOTS, SLOT_NAMES, garmentsOf, getGarment } from '../catalog/clothes';
import type { Garment, Outfit } from '../catalog/clothes';
import { yen } from '../economy/money';
import { AvatarModel, useRig } from '../world/Avatar';
import { Modal } from './Modal';
import './boutique.css';

function Preview({ outfit, label }: { outfit: Outfit; label: string }) {
  const rig = useRig();
  return <div className="boutique-preview" role="img" aria-label={label + '。ドラッグで回転'}>
    <Canvas camera={{ position: [0.2, 1.25, -2.6], fov: 34 }} shadows>
      <color attach="background" args={['#ebe6dc']} />
      <ambientLight intensity={1.4} /><directionalLight position={[1.5, 3, -2.5]} intensity={2.6} castShadow />
      <directionalLight position={[-2, 2, 2]} intensity={0.8} />
      <AvatarModel rig={rig} outfit={outfit} />
      <mesh rotation-x={-Math.PI / 2} receiveShadow><circleGeometry args={[0.9, 40]} /><meshStandardMaterial color="#d8d0c2" /></mesh>
      <OrbitControls target={[0, 0.95, 0]} enablePan={false} minDistance={1.4} maxDistance={4} maxPolarAngle={Math.PI / 2 - 0.05} />
    </Canvas>
  </div>;
}

function Swatch({ g }: { g: Garment }) {
  return <span className="garment-swatch" style={{ background: g.color, boxShadow: g.accent ? `inset -8px -8px 0 ${g.accent}` : undefined }} aria-hidden />;
}

export function BoutiquePanel({ closetOnly = false }: { closetOnly?: boolean }) {
  const inside = useVenue((s) => s.inside);
  const shop: BoutiqueId | null = !closetOnly && isBoutique(inside) ? inside : null;
  const [tab, setTab] = useState<'shop' | 'closet'>(() => (shop ? useVenue.getState().shopTab : 'closet'));
  const owned = useWardrobe((s) => s.owned), outfit = useWardrobe((s) => s.outfit);
  const money = useEconomy((s) => s.money);
  const close = useGame((s) => s.setOverlay);
  const [pick, setPick] = useState<string | null>(null);
  const [error, setError] = useState('');
  const picked = getGarment(pick);
  const tryOn: Outfit = picked ? { ...outfit, [picked.slot]: picked.id } : outfit;
  const info = shop ? BOUTIQUE_INFO[shop] : null;
  const tabs = shop ? [{ id: 'shop' as const, label: '売り場' }, { id: 'closet' as const, label: '試着室・クローゼット' }] : [];
  const list = tab === 'shop' && shop ? garmentsOf(shop) : GARMENTS.filter((g) => owned.includes(g.id));

  return <Modal title={info ? `${info.name} · ${info.tier}` : 'クローゼット'} onClose={() => close(null)} tabs={tabs} tab={tab} onTab={(t) => { setTab(t); setPick(null); setError(''); }} className={`boutique-modal${shop ? ' shop-' + shop : ''}`}>
    {info && tab === 'shop' && <p className="boutique-intro">{info.tagline}</p>}
    <p>所持金 <b>{yen(money)}</b>{tab === 'closet' && <> ／ 持っている服 {owned.length}着</>}</p>
    <div className="boutique-layout">
      <section>
        <Preview outfit={tryOn} label={picked ? `${picked.name}を試着した姿` : 'いまの服装'} />
        <div className="boutique-wearing">{SLOTS.map((slot) => {
          const g = getGarment(tryOn[slot]);
          return <div key={slot}><small>{SLOT_NAMES[slot]}</small><span>{g ? g.name : 'なし'}</span></div>;
        })}</div>
      </section>
      <section className="boutique-items">
        {SLOTS.map((slot) => {
          const items = list.filter((g) => g.slot === slot);
          if (!items.length && !(tab === 'closet' && slot === 'hat')) return null;
          return <div key={slot}>
            <h3>{SLOT_NAMES[slot]}</h3>
            <div className="garment-grid">
              {tab === 'closet' && slot === 'hat' && <button className={'garment' + (outfit.hat === null ? ' worn' : '')} onClick={() => { useWardrobe.getState().wear('hat', null); setPick(null); }}>
                <span className="garment-swatch none" aria-hidden /><b>かぶらない</b>{outfit.hat === null && <em>着用中</em>}
              </button>}
              {items.map((g) => {
                const has = owned.includes(g.id), worn = outfit[g.slot] === g.id;
                return <button key={g.id} className={'garment' + (pick === g.id ? ' on' : '') + (worn ? ' worn' : '')} onClick={() => {
                  setError('');
                  if (tab === 'closet') { useWardrobe.getState().wear(g.slot, g.id); setPick(null); } else setPick(g.id);
                }}>
                  <Swatch g={g} /><b>{g.name}</b>
                  {tab === 'shop' ? <span className="garment-price">{yen(g.price)}</span> : g.shop && <small>{BOUTIQUE_INFO[g.shop].name}</small>}
                  {worn ? <em>着用中</em> : has && tab === 'shop' ? <em>購入済み</em> : null}
                </button>;
              })}
            </div>
          </div>;
        })}
        {tab === 'shop' && picked && <div className="boutique-buy">
          <p><b>{picked.name}</b> {yen(picked.price)}<br /><small>{picked.note}</small></p>
          {error && <p className="warn" role="alert">{error}</p>}
          {owned.includes(picked.id)
            ? <button className="btn primary big-btn" onClick={() => { useWardrobe.getState().wear(picked.slot, picked.id); setPick(null); }}>これに着替える</button>
            : <button className="btn primary big-btn" disabled={money < picked.price} onClick={() => { const err = useWardrobe.getState().buy(picked.id); if (err) setError(err); else setPick(null); }}>
              {money < picked.price ? 'お金が足りません' : `購入して着る · ${yen(picked.price)}`}
            </button>}
        </div>}
        {tab === 'shop' && !picked && <p className="info">服を選ぶと左で試着できます。買った服はクローゼットに入り、いつでも着替えられます。</p>}
        {tab === 'closet' && <p className="info">服を選ぶとすぐ着替えます。クローゼットは歩いているときのメニューからも開けます。</p>}
      </section>
    </div>
  </Modal>;
}
