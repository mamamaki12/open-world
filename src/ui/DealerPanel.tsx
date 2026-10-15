import { useVenue } from '../state/venue';
import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
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
export function DealerPanel(){
  const [model,setModel]=useState(()=>CARS.find(c=>c.id===useVenue.getState().model)??CARS[0]),[color,setColor]=useState(CAR_COLORS[0]),[confirm,setConfirm]=useState(()=>useVenue.getState().dealerIntent==='buy'),[error,setError]=useState('');
  const money=useEconomy(s=>s.money),cars=useVehicles(s=>s.cars),close=useGame(s=>s.setOverlay);
  return <Modal title="AVENUE MOTORS · カーディーラー" onClose={()=>close(null)} tabs={[]} tab="" onTab={()=>undefined} className="dealer-modal">
    <p className="dealer-intro">街を走る、あなたの一台。</p><p>所持金 <b>{yen(money)}</b> ／ 所有車 {cars.length} / 10台</p>
    <div className="dealer-layout">
      <div className="dealer-models">{CARS.map(c=><button key={c.id} className={'dealer-model'+(model.id===c.id?' on':'')} onClick={()=>{setModel(c);setConfirm(false);setError('');}}>
        <small>{c.category}</small><b>{c.name}</b><span>{yen(c.price)}</span>
      </button>)}</div>
      <section className="dealer-detail">
        <div className="dealer-preview" role="img" aria-label={model.name+'の3Dプレビュー。ドラッグで回転'}>
          <Canvas camera={{position:[5,2.8,5],fov:40}} shadows>
            <color attach="background" args={['#152832']}/><ambientLight intensity={1.5}/><directionalLight position={[3,6,2]} intensity={3} castShadow/>
            <CarModel key={model.id} def={model} color={color}/><mesh rotation-x={-Math.PI/2} position={[0,-.02,0]} receiveShadow><planeGeometry args={[30,30]}/><meshStandardMaterial color="#263c46"/></mesh>
            <OrbitControls target={[0,.6,0]} enablePan={false} minDistance={3} maxDistance={10} maxPolarAngle={Math.PI/2-.04}/>
          </Canvas>
        </div>
        <small>{model.category}</small><h2>{model.name}</h2><p>{model.note}</p>
        <dl className="car-specs"><dt>全長 × 全幅 × 全高</dt><dd>{model.length.toFixed(2)} × {model.width.toFixed(2)} × {model.height.toFixed(2)} m</dd><dt>最高速度（街中）</dt><dd>{Math.round(model.maxSpeed*3.6)} km/h</dd><dt>{model.id==='volt'?'電費':'燃費'}</dt><dd>{model.economy.toFixed(1)} {model.id==='volt'?'km/kWh':'km/L'}</dd><dt>乗車定員</dt><dd>{model.seats}名</dd><dt>販売価格</dt><dd>{yen(model.price)}</dd></dl>
        <div className="car-colors" aria-label="ボディカラー">{CAR_COLORS.map(c=><button key={c} aria-label={'カラー '+c} aria-pressed={c===color} style={{background:c}} onClick={()=>setColor(c)}/>)}</div>
        {error&&<p role="alert" className="warn">{error}</p>}
        {confirm?<div className="dealer-confirm"><p>{model.name} を <b>{yen(model.price)}</b> で購入しますか？</p><p>購入後は店舗裏の納車区画に置かれ、Fで乗れます。</p><button className="btn primary big-btn" onClick={()=>{const err=buyCar(model.id,color,useGame.getState().mode==='walk'&&atCarDealer(playerMemory));if(err)setError(err);else{setConfirm(false);close(null);}}}>購入を確定する</button><button className="btn" onClick={()=>setConfirm(false)}>戻る</button></div>:
        <button className="btn primary big-btn" disabled={money<model.price||cars.length>=10} onClick={()=>setConfirm(true)}>この車を購入する · {yen(model.price)}</button>}
      </section>
    </div>
    <p className="info">納車場所は店舗裏。運転はW/Sで前進・後退、A/Dでハンドル、Spaceでブレーキ。Fで乗降、Lでライト、Qで視点切替。スマホはスティックと画面ボタンで操作できます。</p>
  </Modal>;
}
