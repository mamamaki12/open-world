import { iconText } from './AppIcon';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { QUICK_TOOLS, aimActions, useAim, useControls } from '../state/controls';
import { useGame } from '../state/store';
import { useVehicles } from '../state/vehicles';
import { getFurniture } from '../catalog';
import { toolIcon } from './BuildMenu';
import { Modal } from './Modal';
import { ToolOptions } from './ToolOptions';
import { useTouchDevice } from './useTouchDevice';
import { walkActions } from '../state/touch';
import './quickbar.css';

const NAMES={select:'手ぶら',floor:'床',wall:'壁',door:'ドア',window:'窓',stair:'階段',roof:'屋根',furniture:'家具',erase:'削除'};
export function QuickBar(){
  const tool=useGame(s=>s.tool),view=useGame(s=>s.view),overlay=useGame(s=>s.overlay),setTool=useGame(s=>s.setTool);
  const furniture=useGame(s=>s.defaults.furnitureType),driving=useVehicles(s=>s.driving),aim=useControls(s=>s.aimBuild),touch=useTouchDevice();
  const selectedFurniture=useGame(s=>s.selection?.kind==='furniture');
  const target=useAim(),slots=useRef<HTMLDivElement>(null),hold=useRef<ReturnType<typeof setTimeout>>(),[pressing,setPressing]=useState(false);
  const bar=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    const node=bar.current,app=node?.closest<HTMLElement>('.app');if(!node||!app||touch)return;
    const update=()=>app.style.setProperty('--quick-tools-h',`${Math.ceil(node.getBoundingClientRect().height)}px`);
    update();const observer=new ResizeObserver(update);observer.observe(node);
    return()=>{observer.disconnect();app.style.removeProperty('--quick-tools-h');};
  },[driving,overlay,touch]);
  const centered=view==='first'&&aim&&tool!=='select';
  const release=()=>{clearTimeout(hold.current);setPressing(false);};
  useEffect(()=>()=>clearTimeout(hold.current),[]);
  useEffect(()=>{slots.current?.querySelector('[aria-pressed=true]')?.scrollIntoView({block:'nearest',inline:'nearest'});release();},[tool,overlay]);
  if(driving||overlay)return null;
  const name=tool==='furniture'?getFurniture(furniture).name:NAMES[tool];
  return <>
    <div ref={bar} className="quick-tools" aria-label="道具のホットバー">
      {/* スマホでは道具の選択バーを出さず、右下の「建てる」ボタンから選ぶ */}
      {!touch&&<div className="quick-slots" ref={slots}>{QUICK_TOOLS.map((t,i)=><button key={t} aria-label={`${i+1}: ${NAMES[t]}`} aria-pressed={t===tool} onClick={()=>setTool(t)}><kbd>{i+1}</kbd><span>{toolIcon(t)}</span><small>{iconText(NAMES[t])}</small></button>)}</div>}
      {tool!=='select'&&<BuildHistory/>}
      {!touch&&<div className="quick-meta"><span>{name}<small className="quick-swipe-hint"> · 左右スワイプで道具</small></span><button onClick={()=>useGame.getState().setOverlay('inventory')}>種類・素材</button><button aria-label="操作設定" onClick={()=>useGame.getState().setOverlay('controls')}>{iconText("⚙")}</button></div>}
      {touch&&tool==='select'&&selectedFurniture&&<div className="furniture-edit-hint">青い家具をドラッグで移動・タップで45°回転</div>}
    </div>
    {centered&&<>
      <div className={`aim-reticle${target.valid?' valid':''}`} aria-hidden="true">＋</div>
      <div className="aim-message">{iconText(target.label)}</div>
      <div className="aim-buttons">
        <button className={`aim-place${pressing?' pressing':''}`} disabled={!target.valid} onPointerDown={e=>{
          if(tool!=='erase')return;
          e.currentTarget.setPointerCapture(e.pointerId);setPressing(true);
          hold.current=setTimeout(()=>{aimActions.place();setPressing(false);},400);
        }} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} onClick={()=>{if(tool!=='erase')aimActions.place();}}>
          {tool==='erase'?'長押しで削除':target.range?'終点に配置':tool==='floor'||tool==='wall'||tool==='roof'?'始点を決める':'配置'}
        </button>
        {(tool==='furniture'||tool==='stair')&&<button onClick={()=>aimActions.rotate()}>{iconText("↻ 回転")}</button>}
        {target.range&&<button onClick={()=>aimActions.cancel()}>範囲を取消</button>}
      </div>
      {!touch&&<div className="aim-mouse-help">画面クリックで視点操作 · 左/右クリックで配置 · ホイールで持替 · Escで解除</div>}
    </>}
  </>;
}

export function InventoryPanel(){
  const g=useGame(),tool=g.tool;
  return <Modal title="🧰 道具・素材" onClose={()=>g.setOverlay(null)} tabs={[]} tab="" onTab={()=>{}}>
    <div className="inventory-tools">{QUICK_TOOLS.map(t=><button className={`tool${tool===t?' on':''}`} key={t} onClick={()=>g.setTool(t)}>{toolIcon(t)} {iconText(NAMES[t])}</button>)}</div>
    <ToolOptions/><button className="btn primary big-btn" onClick={()=>g.setOverlay(null)}>この道具で戻る</button>
  </Modal>;
}
export function ControlsPanel(){
  const {sensitivity,invertY,aimBuild,update}=useControls(),view=useGame(s=>s.view);
  return <Modal title="⚙ 操作設定" onClose={()=>useGame.getState().setOverlay(null)} tabs={[]} tab="" onTab={()=>{}}>
    <h3>見回す操作</h3>
    <label className="field">視点感度：{sensitivity.toFixed(1)}倍<input aria-label="視点感度" type="range" min="0.3" max="2" step="0.1" value={sensitivity} onChange={e=>update({sensitivity:+e.target.value})}/></label>
    <label className="check"><input type="checkbox" checked={invertY} onChange={e=>update({invertY:e.target.checked})}/>上下の視点操作を反転</label>
    <label className="check"><input type="checkbox" checked={aimBuild} onChange={e=>update({aimBuild:e.target.checked})}/>一人称で中央照準を使って建てる</label>
    <p>{iconText("中央を狙い「配置」。床・壁・屋根は始点→終点の2回で範囲を指定します。届く距離は7m。消すときは削除ツールを選びます。スマホの削除は長押しです。")}</p>
    <button className="btn" onClick={()=>walkActions.toggleView()}>{view==='first'?'三人称にする':'一人称にする'}</button>
    <p>PC：WASDで移動、Ctrl / ShiftまたはWを2回押して走る、Spaceでジャンプ（押し続けると連続）、1〜9・ホイールで道具を持替、Fで開閉・座る、Qで視点切替。</p>
    <p>スマホ：左スティックで移動、端まで倒すと走る。スティックを2回タップするとジャンプ。画面を指一本でなぞって見回します。建築モードでは指で直接範囲を描けます。</p>
    <button className="btn" onClick={()=>update({sensitivity:1,invertY:false,aimBuild:true})}>操作設定を初期値に戻す</button>
  </Modal>;
}

/** 道具を持っている間は履歴操作を常に文字付きで表示する。 */
function BuildHistory(){
  const undo=useGame(s=>s.undo),redo=useGame(s=>s.redo);
  const canUndo=useGame(s=>s.past.length>0),canRedo=useGame(s=>s.future.length>0);
  return <div className="build-history" role="group" aria-label="建築の取り消し・やり直し">
    <button disabled={!canUndo} onClick={()=>{aimActions.cancel();undo();}}>{iconText("↶ 取り消す")}</button>
    <button disabled={!canRedo} onClick={()=>{aimActions.cancel();redo();}}>{iconText("↷ やり直す")}</button>
  </div>;
}
