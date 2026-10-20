import { useVenue } from '../state/venue';
import { useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { CARS, CAR_COLORS } from '../catalog/cars';
import { buyCar, useVehicles } from '../state/vehicles';
import { useEconomy } from '../state/economy';
import { useGame } from '../state/store';
import { yen } from '../economy/money';
import { CarModel } from '../world/CarModel';
import { atCarDealer } from '../world/vehicleLogic';
import { playerMemory } from '../world/Player';
import { Modal } from './Modal';
import './vehicles.css';
const COLOR_NAMES:Record<string,string>={'#eceeea':'パールホワイト','#222a32':'ブラック','#9ca8b3':'シルバー','#b52734':'レッド','#204f7b':'ブルー','#d5ab45':'ゴールド','#46624e':'グリーン','#e27830':'オレンジ'};
/** 車の大きさに合わせてプレビューのカメラを引く */
function FitCamera({length}:{length:number}){
  const camera=useThree(s=>s.camera),aspect=useThree(s=>s.size.width/Math.max(1,s.size.height));
  useEffect(()=>{const r=(length*1.05+1.6)*Math.max(1,1.5/aspect);camera.position.set(r*.82,r*.42,r*.72);camera.lookAt(0,.6,0);},[camera,length,aspect]);
  return null;
}
export function DealerPanel(){
  const [model,setModel]=useState(()=>CARS.find(c=>c.id===useVenue.getState().model)??CARS[0]),[color,setColor]=useState(CAR_COLORS[0]),[confirm,setConfirm]=useState(()=>useVenue.getState().dealerIntent==='buy'),[error,setError]=useState('');
  const money=useEconomy(s=>s.money),cars=useVehicles(s=>s.cars),close=useGame(s=>s.setOverlay);
  const ev=model.id==='volt',full=cars.length>=10,short=money<model.price;
  const buy=()=>{const err=buyCar(model.id,color,useGame.getState().mode==='walk'&&atCarDealer(playerMemory));if(err)setError(err);else{setConfirm(false);close(null);}};
  return <Modal title="🚗 AVENUE MOTORS · 車のカタログ" onClose={()=>close(null)} tabs={[]} tab="" onTab={()=>undefined} className="dealer-modal">
    <div className="cat-top"><span>所持金 <b>{yen(money)}</b></span><span>所有車 <b>{cars.length}</b> / 10台</span></div>
    <div className="cat-layout">
      <nav className="cat-list" aria-label="車種">{CARS.map(c=><button key={c.id} className={'cat-card'+(model.id===c.id?' on':'')} aria-pressed={model.id===c.id} onClick={()=>{setModel(c);setConfirm(false);setError('');}}>
        <small>{c.category}</small><b>{c.name}</b><span className="cat-price">{yen(c.price)}</span><span className="cat-mini">{c.seats}人乗り · {Math.round(c.maxSpeed*3.6)}km/h</span>
      </button>)}</nav>
      <section className="cat-detail">
        <div className="cat-stage" role="img" aria-label={model.name+'の3Dプレビュー。ドラッグで回転'}>
          <Canvas camera={{position:[5,2.8,5],fov:38}} shadows>
            <color attach="background" args={['#dfe5e8']}/><fog attach="fog" args={['#dfe5e8',14,30]}/>
            <hemisphereLight args={['#ffffff','#9aa6ad',1.4]}/><directionalLight position={[4,7,3]} intensity={2.6} castShadow shadow-mapSize={[1024,1024]}/>
            <FitCamera length={model.length}/>
            <CarModel key={model.id} def={model} color={color}/>
            <mesh rotation-x={-Math.PI/2} position={[0,-.01,0]} receiveShadow><circleGeometry args={[6,48]}/><meshStandardMaterial color="#c9d1d5"/></mesh>
            <OrbitControls target={[0,.6,0]} enablePan={false} minDistance={2.5} maxDistance={11} maxPolarAngle={Math.PI/2-.04}/>
          </Canvas>
          <div className="cat-name"><small>{model.category}</small><h2>{model.name}</h2></div>
          <p className="cat-hint">ドラッグで回転・ホイールで拡大</p>
        </div>
        <div className="cat-colors">
          <span>ボディカラー <b>{COLOR_NAMES[color]}</b></span>
          <div className="cat-swatches" aria-label="ボディカラー">{CAR_COLORS.map(c=><button key={c} aria-label={'カラー '+(COLOR_NAMES[c]??c)} aria-pressed={c===color} style={{background:c}} onClick={()=>setColor(c)}/>)}</div>
        </div>
        <p className="cat-note">{model.note}</p>
        <dl className="cat-specs">
          <div><dt>最高速度（街中）</dt><dd>{Math.round(model.maxSpeed*3.6)} km/h</dd></div>
          <div><dt>{ev?'電費':'燃費'}</dt><dd>{model.economy.toFixed(1)} {ev?'km/kWh':'km/L'}</dd></div>
          <div><dt>乗車定員</dt><dd>{model.seats}名</dd></div>
          <div><dt>全長 × 全幅 × 全高</dt><dd>{model.length.toFixed(2)} × {model.width.toFixed(2)} × {model.height.toFixed(2)} m</dd></div>
        </dl>
        <p className="cat-info">納車は店の横の駐車場です。Fで乗り降り、W/Sで前後、A/Dでハンドル、Spaceでブレーキ、Lでライト、Qで視点切替。スマホはスティックと画面のボタンで運転できます。</p>
      </section>
    </div>
    <div className="cat-buy">
      {error&&<p role="alert" className="warn">{error}</p>}
      {confirm?<><p><b>{model.name}</b>（{COLOR_NAMES[color]}）を <b>{yen(model.price)}</b> で購入しますか？ 購入後の残高 {yen(money-model.price)}</p>
        <div className="cat-buy-row"><button className="btn" onClick={()=>setConfirm(false)}>戻る</button><button className="btn primary" onClick={buy}>購入を確定する</button></div></>
      :<div className="cat-buy-row"><div className="cat-buy-price"><small>販売価格</small><b>{yen(model.price)}</b></div>
        <button className="btn primary" disabled={short||full} onClick={()=>setConfirm(true)}>{full?'これ以上持てません（10台まで）':short?'所持金が足りません':'この車を購入する'}</button></div>}
    </div>
  </Modal>;
}
