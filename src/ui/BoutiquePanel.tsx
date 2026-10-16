import { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useVenue } from '../state/venue';
import { useGame } from '../state/store';
import { useEconomy } from '../state/economy';
import { useWardrobe } from '../state/wardrobe';
import { BOUTIQUE_INFO, isBoutique } from '../building/boutiques';
import { GARMENTS, SLOTS, SLOT_NAMES, garmentsOf, getGarment } from '../catalog/clothes';
import type { Garment, Outfit, Slot } from '../catalog/clothes';
import { yen } from '../economy/money';
import { AvatarModel, useRig } from '../world/Avatar';
import { GarmentIllustration } from './GarmentIllustration';
import { Modal } from './Modal';
import './boutique.css';

function Preview({ outfit }: { outfit: Outfit }) {
  const rig = useRig();
  return <div className="boutique-preview" role="img" aria-label="3D試着。ドラッグで回転">
    <Canvas camera={{ position: [0.55, 1.15, -3.1], fov: 34 }} dpr={[1, 1.5]} shadows>
      <color attach="background" args={['#eeece7']} />
      <ambientLight intensity={1.6} /><directionalLight position={[-2, 4, -3]} intensity={3} castShadow shadow-mapSize={[1024,1024]} />
      <directionalLight position={[2, 2, 1]} intensity={1.2} />
      <AvatarModel rig={rig} outfit={outfit} />
      <mesh rotation-x={-Math.PI/2} position={[0,-0.007,0]} receiveShadow><planeGeometry args={[200,200]}/><shadowMaterial transparent opacity={0.16}/></mesh>
      <OrbitControls target={[0,0.87,0]} enablePan={false} minDistance={2.3} maxDistance={4} maxPolarAngle={Math.PI/2-0.03}/>
    </Canvas>
    <span className="fitting-caption">360° FITTING ROOM <span>ドラッグで回転</span></span>
  </div>;
}

export function BoutiquePanel({closetOnly=false}:{closetOnly?:boolean}) {
  const inside=useVenue(s=>s.inside),shop=!closetOnly&&isBoutique(inside)?inside:null;
  const [tab,setTab]=useState<'shop'|'closet'>(()=>shop?useVenue.getState().shopTab:'closet');
  const owned=useWardrobe(s=>s.owned),outfit=useWardrobe(s=>s.outfit),money=useEconomy(s=>s.money);
  const [pick,setPick]=useState<string|null>(null),[category,setCategory]=useState<Slot|'all'>('all'),[sort,setSort]=useState('featured'),[error,setError]=useState('');
  const fitting=useRef<HTMLElement>(null),picked=getGarment(pick);
  const tryOn:Outfit=picked?{...outfit,[picked.slot]:picked.id}:outfit;
  const info=shop?BOUTIQUE_INFO[shop]:null,selling=tab==='shop'&&shop;
  const all=selling?garmentsOf(shop):GARMENTS.filter(g=>owned.includes(g.id));
  const list=all.filter(g=>category==='all'||g.slot===category).sort((a,b)=>sort==='low'?a.price-b.price:sort==='high'?b.price-a.price:0);
  const tabs=shop?[{id:'shop' as const,label:'売り場'},{id:'closet' as const,label:'クローゼット'}]:[];
  const select=(g:Garment)=>{setPick(g.id);setError('');if(window.matchMedia('(max-width:700px)').matches)fitting.current?.scrollIntoView({behavior:'smooth',block:'start'});};
  const confirm=()=>{if(!picked)return;if(owned.includes(picked.id))useWardrobe.getState().wear(picked.slot,picked.id);else{const err=useWardrobe.getState().buy(picked.id);if(err){setError(err);return;}}setPick(null);setError('');};
  return <Modal title={info?.name??'WARDROBE'} onClose={()=>useGame.getState().setOverlay(null)} tabs={tabs} tab={tab} onTab={t=>{setTab(t);setPick(null);setCategory('all');setError('');}} className={`boutique-modal${shop?' shop-'+shop:''}`}>
    <div className="boutique-masthead"><div><span className="store-eyebrow">{selling?'THE EVERYDAY COLLECTION':'YOUR PERSONAL COLLECTION'}</span><h1>{selling?'着ることを、楽しもう。':'今日の自分を、選ぶ。'}</h1><p>{selling?info?.tagline:'お気に入りを組み合わせて、あなただけのスタイルに。'}</p></div><div className="boutique-balance"><small>YOUR BALANCE</small><strong>{yen(money)}</strong></div></div>
    <div className="boutique-layout">
      <section className="boutique-fitting" ref={fitting} aria-label="試着と商品詳細"><Preview outfit={tryOn}/>
        <div className="fitting-detail" aria-live="polite">{picked?<><span className="store-eyebrow">{picked.shop?BOUTIQUE_INFO[picked.shop].name:'ESSENTIALS'} / {SLOT_NAMES[picked.slot]}</span><h2>{picked.name}</h2><strong className="detail-price">{yen(picked.price)}</strong><p>{picked.note}</p><div className="detail-color"><span style={{background:picked.color}}/>カラー <code>{picked.color.toUpperCase()}</code></div>
          {error&&<p role="alert" className="warn">{error}</p>}
          <button className="boutique-primary" disabled={outfit[picked.slot]===picked.id||(!owned.includes(picked.id)&&money<picked.price)} onClick={confirm}>{owned.includes(picked.id)?(outfit[picked.slot]===picked.id?'着用中':'この服に着替える'):money<picked.price?'所持金が足りません':`購入して着る — ${yen(picked.price)}`}</button>
          <button className="fitting-cancel" onClick={()=>{setPick(null);setError('');}}>試着をやめる</button></>:<><span className="store-eyebrow">YOUR LOOK</span><h2>あなたのスタイリング</h2><p>商品を選ぶと、ここで試着できます。</p><div className="boutique-wearing">{SLOTS.map(slot=><div key={slot}><small>{SLOT_NAMES[slot]}</small><span>{getGarment(outfit[slot])?.name??'なし'}</span></div>)}</div>{!selling&&outfit.hat&&<button className="fitting-cancel" onClick={()=>useWardrobe.getState().wear('hat',null)}>帽子を脱ぐ</button>}</>}
        </div>
      </section>
      <section className="boutique-items" aria-label="商品一覧"><nav className="boutique-categories" aria-label="服のカテゴリ">{(['all',...SLOTS] as const).map(slot=><button key={slot} aria-pressed={category===slot} onClick={()=>setCategory(slot)}>{slot==='all'?'すべて':SLOT_NAMES[slot]}</button>)}</nav>
        <div className="boutique-listbar"><span>{list.length} ITEMS</span><label>並び替え<select value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">おすすめ順</option><option value="low">価格の安い順</option><option value="high">価格の高い順</option></select></label></div>
        <div className="garment-grid">{list.map(g=>{const worn=outfit[g.slot]===g.id,has=owned.includes(g.id);return <button key={g.id} className={`garment${pick===g.id?' on':''}`} aria-pressed={pick===g.id} onClick={()=>select(g)}><div className="garment-image"><GarmentIllustration garment={g}/><span className="garment-tag">{worn?'着用中':has?'OWNED':'COLLECTION'}</span><span className="garment-try">試着する ↗</span></div><div className="garment-meta"><small>{SLOT_NAMES[g.slot]}</small><b>{g.name}</b><span className="garment-price">{yen(g.price)}</span><span className="garment-color" style={{background:g.color}} aria-label={`カラー ${g.color}`}/></div></button>;})}</div>
        {!list.length&&<div className="boutique-empty">このカテゴリの服はまだありません。<button onClick={()=>setCategory('all')}>すべての服を見る</button></div>}
        <p className="boutique-footnote">{selling?'購入した服はクローゼットに保存されます。':'試着してから「この服に着替える」で着用できます。'}</p>
      </section>
    </div>
  </Modal>;
}
