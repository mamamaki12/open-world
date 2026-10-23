import { useVenue } from '../state/venue';
import { useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { CARS, CAR_COLORS } from '../catalog/cars';
import type { CarDef } from '../catalog/cars';
import { buyCar, useVehicles } from '../state/vehicles';
import { useEconomy } from '../state/economy';
import { useGame } from '../state/store';
import { yen } from '../economy/money';
import { CarModel } from '../world/CarModel';
import { atCarDealer } from '../world/vehicleLogic';
import { playerMemory } from '../world/Player';
import { Modal } from './Modal';
import './vehicles.css';
import './car-catalog.css';
const COLOR_NAMES:Record<string,string>={'#eceeea':'パールホワイト','#222a32':'ブラック','#9ca8b3':'シルバー','#b52734':'レッド','#204f7b':'ブルー','#d5ab45':'ゴールド','#46624e':'グリーン','#e27830':'オレンジ'};
const GROUPS = ['すべて','軽・コンパクト','セダン・ワゴン','SUV・ピックアップ','ミニバン','スポーツ','電気自動車'];
function groupOf(car:CarDef){
  if(car.id==='volt')return '電気自動車';
  if(car.body==='hatch')return '軽・コンパクト';
  if(car.body==='sedan'||car.body==='wagon')return 'セダン・ワゴン';
  if(car.body==='suv'||car.body==='pickup')return 'SUV・ピックアップ';
  if(car.body==='van')return 'ミニバン';
  return 'スポーツ';
}
/** 車の大きさに合わせてプレビューのカメラを引く */
function FitCamera({length}:{length:number}){
  const camera=useThree(s=>s.camera),aspect=useThree(s=>s.size.width/Math.max(1,s.size.height));
  useEffect(()=>{const r=(length*1.05+1.6)*Math.max(1,1.5/aspect);camera.position.set(r*.82,r*.42,r*.72);camera.lookAt(0,.6,0);},[camera,length,aspect]);
  return null;
}
export function DealerPanel(){
  const [model,setModel]=useState(()=>CARS.find(c=>c.id===useVenue.getState().model)??CARS[0]);
  const [detail,setDetail]=useState(()=>!!useVenue.getState().model||useVenue.getState().dealerIntent==='buy');
  const [color,setColor]=useState(CAR_COLORS[0]),[confirm,setConfirm]=useState(()=>useVenue.getState().dealerIntent==='buy'),[error,setError]=useState('');
  const [group,setGroup]=useState('すべて'),[query,setQuery]=useState(''),[budget,setBudget]=useState(false),[sort,setSort]=useState('recommended');
  const [filtersOpen,setFiltersOpen]=useState(()=>window.matchMedia('(min-width: 901px)').matches);
  const title=useRef<HTMLHeadingElement>(null),listTitle=useRef<HTMLHeadingElement>(null),restore=useRef(false);
  const money=useEconomy(s=>s.money),cars=useVehicles(s=>s.cars),close=useGame(s=>s.setOverlay);
  const ev=model.id==='volt',full=cars.length>=10,short=money<model.price;
  const filtered=CARS.filter(c=>(group==='すべて'||groupOf(c)===group)&&(!budget||c.price<=money)&&`${c.name} ${c.category} ${c.note}`.toLowerCase().includes(query.trim().toLowerCase()));
  if(sort==='low')filtered.sort((a,b)=>a.price-b.price);else if(sort==='high')filtered.sort((a,b)=>b.price-a.price);
  useEffect(()=>{
    if(detail){title.current?.focus();title.current?.closest('.modal-body')?.scrollTo({top:0});}
    else if(restore.current){
      const card=document.getElementById('catalog-'+model.id);(card??listTitle.current)?.focus();card?.scrollIntoView({block:'nearest'});restore.current=false;
    }
  },[detail,model.id]);
  const select=(car:CarDef)=>{setModel(car);setDetail(true);setConfirm(false);setError('');};
  const back=()=>{restore.current=true;setConfirm(false);setError('');setDetail(false);};
  const reset=()=>{setGroup('すべて');setQuery('');setBudget(false);setSort('recommended');};
  const buy=()=>{const err=buyCar(model.id,color,useGame.getState().mode==='walk'&&atCarDealer(playerMemory));if(err)setError(err);else{setConfirm(false);close(null);}};
  return <Modal title="車のカタログ" onClose={()=>close(null)} tabs={[]} tab="" onTab={()=>undefined} className="dealer-modal catalog-modal">
    <div className="cat-top"><span>所持金 <b>{yen(money)}</b></span><span>所有車 <b>{cars.length}</b> / 10台</span></div>
    {!detail?<>
      <header className="catalog-intro"><small>AVENUE MOTORS</small><h2 ref={listTitle} tabIndex={-1}>お気に入りの一台を。</h2><p>かたち、価格、乗れる人数から、街での相棒を選ぼう。</p></header>
      <details className="catalog-filter-panel" open={filtersOpen} onToggle={e=>setFiltersOpen(e.currentTarget.open)}><summary>絞り込み・並び替え<span>{group!=='すべて'||query.trim()||budget||sort!=='recommended'?'条件を指定中':'全車種から探す'}</span></summary><div className="catalog-filters" role="search" aria-label="車の絞り込み">
        <label>車名・キーワード<input aria-label="車名・キーワード" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="車名や特徴で探す"/></label>
        <label>ボディタイプ<select aria-label="ボディタイプ" value={group} onChange={e=>setGroup(e.target.value)}>{GROUPS.map(g=><option key={g}>{g}</option>)}</select></label>
        <label>並び順<select aria-label="並び順" value={sort} onChange={e=>setSort(e.target.value)}><option value="recommended">標準の並び順</option><option value="low">価格が安い順</option><option value="high">価格が高い順</option></select></label>
        <label className="catalog-budget"><input type="checkbox" checked={budget} onChange={e=>setBudget(e.target.checked)}/>予算内の車だけ</label>
      </div>
      </details><div className="catalog-results"><p role="status"><b>{filtered.length}</b> / {CARS.length}車種</p><button className="tool" onClick={reset}>条件をリセット</button></div>
      <nav className="catalog-grid" aria-label="車種">{filtered.map(c=><button id={'catalog-'+c.id} key={c.id} className="cat-card" onClick={()=>select(c)} aria-label={`${c.name} ${yen(c.price)} 詳細を見る`}>
        <img src={`${import.meta.env.BASE_URL}cars/${c.id}.png`} width="640" height="360" alt="" loading="lazy"/>
        <span className="catalog-card-copy"><small>{c.category}</small><b>{c.name}</b><span className="cat-price">{yen(c.price)}</span><span className="cat-mini">{c.seats}人乗り · {c.id==='volt'?'電気自動車':`${c.economy.toFixed(1)} km/L`}</span><span className="catalog-card-link">詳しく見る <span aria-hidden="true">→</span></span></span>
      </button>)}</nav>
      {!filtered.length&&<div className="catalog-empty"><h3>条件に合う車がありません</h3><p>キーワードやボディタイプ、予算の条件を変更してください。</p><button className="btn" onClick={reset}>すべての車を見る</button></div>}
      <p className="catalog-footnote">掲載車はゲーム内のオリジナルモデルです。価格・性能はゲーム内の設定です。</p>
    </>:<>
      <button className="tool catalog-back" onClick={back}>← 車種一覧に戻る</button>
      <header className="catalog-model-head"><div><small>{model.category}</small><h2 ref={title} tabIndex={-1}>{model.name}</h2><p>{model.note}</p></div><span className="catalog-seat-tag">{model.seats}人乗り{ev?' · EV':''}</span></header>
      <div className="catalog-detail-grid">
        <section className="catalog-visual" aria-label="車の外観">
          <div className="cat-stage" role="img" aria-label={model.name+'の3Dプレビュー。ドラッグで回転'}>
            <Canvas frameloop="demand" camera={{position:[5,2.8,5],fov:38}} shadows>
              <color attach="background" args={['#dfe5e8']}/><fog attach="fog" args={['#dfe5e8',14,30]}/>
              <hemisphereLight args={['#ffffff','#9aa6ad',1.4]}/><directionalLight position={[4,7,3]} intensity={2.6} castShadow shadow-mapSize={[1024,1024]}/>
              <FitCamera length={model.length}/><CarModel key={model.id} def={model} color={color}/>
              <mesh rotation-x={-Math.PI/2} position={[0,-.01,0]} receiveShadow><circleGeometry args={[6,48]}/><meshStandardMaterial color="#c9d1d5"/></mesh>
              <OrbitControls target={[0,.6,0]} enablePan={false} minDistance={2.5} maxDistance={11} maxPolarAngle={Math.PI/2-.04}/>
            </Canvas>
          </div>
          <p className="catalog-preview-hint">360° VIEW · ドラッグで回転／ピンチ・ホイールで拡大</p>
          <div className="cat-colors"><span>ボディカラー <b>{COLOR_NAMES[color]}</b></span><div className="cat-swatches" aria-label="ボディカラー">{CAR_COLORS.map(c=><button key={c} aria-label={'カラー '+COLOR_NAMES[c]} aria-pressed={c===color} style={{background:c}} onClick={()=>{setColor(c);setConfirm(false);setError('');}}/>)}</div></div>
        </section>
        <section className="catalog-purchase" aria-label="価格と購入">
          <div className="cat-buy-price"><small>車両価格</small><b>{yen(model.price)}</b></div>
          <p>選択カラー：{COLOR_NAMES[color]}</p><p className="catalog-balance">購入後の残高 <b>{short?'所持金が足りません':yen(money-model.price)}</b></p>
          {error&&<p role="alert" className="warn">{error}</p>}
          {confirm?<div className="catalog-confirm" role="group" aria-label="購入確認"><h3>購入内容の確認</h3><p><b>{model.name}</b>（{COLOR_NAMES[color]}）を <b>{yen(model.price)}</b> で購入しますか？</p><div className="catalog-confirm-actions"><button className="btn primary" disabled={short||full} onClick={buy}>購入を確定する</button><button className="btn" onClick={()=>setConfirm(false)}>戻る</button></div></div>
          :<button className="btn primary catalog-buy-button" disabled={short||full} onClick={()=>setConfirm(true)}>{full?'所有できる車は10台までです':short?'所持金が足りません':'この車を購入する'}</button>}
          <p className="catalog-delivery">納車場所：ディーラー横の駐車場<br/>購入はディーラーの入口・店内で行えます。</p>
        </section>
      </div>
      <section className="catalog-spec-section" aria-label="主要諸元"><h3>この車の基本スペック</h3><dl className="cat-specs">
        <div><dt>乗車定員</dt><dd>{model.seats}<small> 名</small></dd></div><div><dt>{ev?'電費':'燃費'}</dt><dd>{model.economy.toFixed(1)}<small> {ev?'km/kWh':'km/L'}</small></dd></div>
        <div><dt>最高速度（街中）</dt><dd>{Math.round(model.maxSpeed*3.6)}<small> km/h</small></dd></div><div><dt>全長 × 全幅 × 全高</dt><dd>{model.length.toFixed(2)} × {model.width.toFixed(2)} × {model.height.toFixed(2)}<small> m</small></dd></div>
      </dl></section>
      <details className="catalog-help"><summary>納車後の操作方法</summary><p>Fで乗り降り、W/Sで前後、A/Dでハンドル、Spaceでブレーキ、Lでライト、Qで視点切替。スマホはスティックと画面のボタンで運転できます。</p></details>
    </>}
  </Modal>;
}
