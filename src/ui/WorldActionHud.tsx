import { useEffect, useState } from 'react';
import { useVenue } from '../state/venue';
import { VENUE_ACTIONS, venueAction } from '../building/venues';
import { getCar } from '../catalog/cars';
import { useVehicles } from '../state/vehicles';
import { buyLandAndJoin, civicOffset, currentPlotOf, saveEconomy, useEconomy } from '../state/economy';
import { JoinOption } from './JoinOption';
import { useGame } from '../state/store';
import { interact, playerMemory } from '../world/Player';
import { atSaleSign } from '../building/landSale';
import { plotX, plotZ } from '../economy/town';
import { getLocation, landPrice } from '../economy/market';
import { yen } from '../economy/money';
import { Modal } from './Modal';
import { walkActions } from '../state/touch';
export function WorldActionHud(){
  const inside=useVenue(s=>s.inside);
  const driving=useVehicles(s=>s.driving),target=useVehicles(s=>s.target),overlay=useGame(s=>s.overlay),view=useGame(s=>s.view);
  const [,tick]=useState(0);
  useEffect(()=>{if(!driving)return;const t=setInterval(()=>tick(v=>v+1),120);return()=>clearInterval(t);},[driving]);
  if(overlay||!target)return null;
  const car=useVehicles.getState().cars.find(c=>c.id===(driving??target));
  if(driving&&car)return <div className={`drive-hud ${view==='first'?'first':''}`} aria-label="運転情報">
    <div className="drive-dashboard">
      <b className="drive-model">{getCar(car.model)!.name}</b>
      <div className="drive-speed">{car.speed<-.1?'R ':''}{Math.round(Math.abs(car.speed)*3.6)}<small>km/h</small></div>
    </div>
    <div className="drive-keyboard-help"><p>W/S 前後 · A/D ハンドル · Space ブレーキ</p><p>Q 視点 · L ライト {car.lights?'ON':'OFF'}</p></div>
    <div className="drive-actions">
      <button onClick={()=>interact()}><span className="drive-key">F · </span>停車して降りる</button>
      <button aria-pressed={car.lights} onClick={()=>{car.lights=!car.lights;tick(v=>v+1);}}>ライト {car.lights?'ON':'OFF'}</button>
      <button onClick={()=>walkActions.toggleView()}><span className="drive-key">Q · </span>{view==='first'?'車の外から見る':'運転席から見る'}</button>
      <button className="drive-touch-only" onClick={()=>walkActions.resetCamera()}>視点を正面へ</button>
    </div>
  </div>;
  const venueLabel=inside&&target.startsWith('venue:')?VENUE_ACTIONS[inside].find(a=>target==='venue:'+a.id)?.label:undefined;
  const label=venueLabel??(target.startsWith('land:')?'この土地を買う':target.startsWith('shutter:')?'ガレージシャッターを開閉する':car?getCar(car.model)!.name+' に乗る':'');
  const site=civicOffset(),action=inside==='dealer'?venueAction('dealer',playerMemory.x-site.x,playerMemory.z-site.z):null;
  return label?<div className="door-prompts"><button className="door-prompt" onClick={()=>interact()}><kbd>F</kbd>{label}</button>{action?.model&&<button className="door-prompt" onClick={()=>{useVenue.setState({model:action.model!,dealerIntent:'specs'});useGame.getState().setOverlay('dealer');}}>スペックを見る</button>}</div>:null;
}
export function LandPurchasePanel(){
  const target=useVehicles(s=>s.target),offers=useEconomy(s=>s.offers),market=useEconomy(s=>s.market),money=useEconomy(s=>s.money);
  const [error,setError]=useState(''),[join,setJoin]=useState(true),close=useGame(s=>s.setOverlay);
  const offer=offers.find(o=>target==='land:'+o.id);
  const price=offer?landPrice(offer.location,offer.variance,market):0;
  return <Modal title="この土地を買う" onClose={()=>close(null)} tabs={[]} tab="" onTab={()=>undefined}>
    {offer?<><h2>{offer.name}</h2><p>{getLocation(offer.location).name} · 区画面積 約397㎡</p><div className="card"><p>土地価格 <b className="big">{yen(price)}</b></p><p>所持金 {yen(money)}</p><p>購入後の残高 {yen(money-price)}</p></div><p>この区画を購入します。家の建築費は別途必要です。</p><JoinOption plot={offer.plot} checked={join} onChange={setJoin} />
      {error&&<p className="warn" role="alert">{error}</p>}<button className="btn primary big-btn" disabled={money<price} onClick={()=>{
        const origin=currentPlotOf(useEconomy.getState());
        if(typeof offer.plot!=='number'||!atSaleSign(offer.plot,playerMemory.x+plotX(origin),playerMemory.z+plotZ(origin),playerMemory.y)){setError('売地の看板前から購入してください');return;}
        const err=buyLandAndJoin(offer.id,join);if(err)setError(err);else{saveEconomy();close(null);}
      }}>購入を確定する</button><button className="btn" onClick={()=>close(null)}>やめる</button></>:<p>この土地は現在販売されていません。</p>}
  </Modal>;
}
