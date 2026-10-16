// スマホ・タブレット用の画面ボタン：歩きモードのスティックと動作ボタン、建築モードのカメラボタン
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { useVehicles } from '../state/vehicles';
import { driveButtons, resetDriveButtons } from '../world/vehicleLogic';
import { useDoors } from '../state/doors';
import { RUN_THRESHOLD, touchCamera, touchMove, walkActions } from '../state/touch';

/** スティックを倒せる半径（px） */
const STICK_RADIUS = 46;
/** スティックの2回タップでジャンプ：1回目は短く触れて離し、この時間（ms）以内にもう一度触れる */
const TAP_MS = 250;
const DOUBLE_TAP_MS = 350;

function Joystick({ driving }: { driving: boolean }) {
  const base = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const center = useRef({ x: 0, y: 0 });
  const downAt = useRef(0);
  const tapAt = useRef(-Infinity);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [jumped, setJumped] = useState(false);
  const running = !driving && Math.hypot(knob.x, knob.y) / STICK_RADIUS >= RUN_THRESHOLD;

  const release = () => {
    pointer.current = null;
    touchMove.x = 0;
    touchMove.y = 0;
    setKnob({ x: 0, y: 0 });
  };
  useEffect(() => {
    const reset = () => release();
    const hidden = () => { if (document.hidden) release(); };
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('blur', reset); document.removeEventListener('visibilitychange', hidden); release(); };
  }, []);

  const move = (e: ReactPointerEvent) => {
    let dx = e.clientX - center.current.x;
    let dy = e.clientY - center.current.y;
    const len = Math.hypot(dx, dy);
    if (len > STICK_RADIUS) {
      dx = (dx / len) * STICK_RADIUS;
      dy = (dy / len) * STICK_RADIUS;
    }
    touchMove.x = dx / STICK_RADIUS;
    touchMove.y = -dy / STICK_RADIUS;
    setKnob({ x: dx, y: dy });
  };

  return (
    <div
      ref={base}
      className={`joystick${running ? ' running' : ''}`}
      onPointerDown={(e) => {
        if (pointer.current !== null) return;
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        const r = base.current!.getBoundingClientRect();
        center.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        const now = performance.now();
        if (!driving && now - tapAt.current < DOUBLE_TAP_MS) {
          tapAt.current = -Infinity;
          walkActions.jump();
          setJumped(true);
        }
        downAt.current = now;
        move(e);
      }}
      onPointerMove={(e) => e.pointerId === pointer.current && move(e)}
      onPointerUp={(e) => {
        if (e.pointerId !== pointer.current) return;
        const now = performance.now();
        if (now - downAt.current < TAP_MS) tapAt.current = now;
        release();
      }}
      onPointerCancel={(e) => e.pointerId === pointer.current && release()}
      onLostPointerCapture={(e) => e.pointerId === pointer.current && release()}
    >
      <div className="joystick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      <span className="joystick-hint">{driving ? '前後・ハンドル' : running ? '走る' : jumped ? '' : '2回タップでジャンプ'}</span>
    </div>
  );
}

/** 押した瞬間に反応するボタン（タップの遅れをなくす） */
function TapButton({ className, onTap, children, label }: { className?: string; onTap: () => void; children: ReactNode; label?: string }) {
  return (
    <button
      className={`touch-btn ${className ?? ''}`}
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        onTap();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

/** 押している間だけ効くボタン */
function HoldButton({ className, onHold, children, label }: { className?: string; onHold: (on: boolean) => void; children: ReactNode; label: string }) {
  const pointer=useRef<number|null>(null);
  const [held,setHeld]=useState(false);
  const release=(e:ReactPointerEvent)=>{if(pointer.current!==e.pointerId)return;pointer.current=null;setHeld(false);onHold(false);};
  return (
    <button
      className={`touch-btn ${className ?? ''}`}
      aria-label={label}
      aria-pressed={held}
      onPointerDown={(e) => {
        e.preventDefault();
        if(pointer.current!==null)return;pointer.current=e.pointerId;setHeld(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        onHold(true);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

/** 歩きモードの操作：左下のスティック（2回タップでジャンプ）と、右下の建てるボタン（運転中はブレーキ） */
export function TouchWalkControls({ build }: { build: ReactNode }) {
  const driving = useVehicles(s=>s.driving);
  useEffect(()=>{
    resetDriveButtons();
    const hidden=()=>{if(document.hidden)resetDriveButtons();};
    window.addEventListener('blur',resetDriveButtons);document.addEventListener('visibilitychange',hidden);
    return()=>{resetDriveButtons();window.removeEventListener('blur',resetDriveButtons);document.removeEventListener('visibilitychange',hidden);};
  },[driving]);
  const climb = useDoors((s) => s.climb);
  const climbing = useDoors((s) => s.climbing);
  return (
    <div className="touch-walk">
      {driving ? <>
        <div className="drive-steering" role="group" aria-label="ハンドル">
          <HoldButton label="左にハンドルを切る" onHold={on=>{driveButtons.left=on;}}>←</HoldButton>
          <HoldButton label="右にハンドルを切る" onHold={on=>{driveButtons.right=on;}}>→</HoldButton>
        </div>
        <div className="drive-pedals" role="group" aria-label="ペダル">
          <HoldButton label="ブレーキ" className="drive-pedal drive-brake" onHold={on=>{driveButtons.brake=on;}}><span className="pedal-pad"/><span className="pedal-name">ブレーキ<small>長押しでバック</small></span></HoldButton>
          <HoldButton label="アクセル" className="drive-pedal drive-accelerator" onHold={on=>{driveButtons.accelerator=on;}}><span className="pedal-pad"/><span className="pedal-name">アクセル</span></HoldButton>
        </div>
        <HoldButton label="サイドブレーキ" className="drive-handbrake" onHold={on=>{driveButtons.handbrake=on;}}>サイドブレーキ</HoldButton>
      </> : <Joystick driving={false} />}
      <div className="touch-actions">
        {!driving && <>
          {climb === 'ok' && !climbing && <TapButton className="jump climb" onTap={() => walkActions.jump()}>窓から出る</TapButton>}
          <div className="touch-build">{build}</div>
        </>}
      </div>
    </div>
  );
}

export function TouchCameraPad() {
  useEffect(
    () => () => {
      touchCamera.turn = 0;
      touchCamera.zoom = 0;
    },
    [],
  );
  return (
    <div className="touch-camera">
      <HoldButton label="左に回る" onHold={(on) => (touchCamera.turn = on ? 1 : 0)}>
        ⟲
      </HoldButton>
      <HoldButton label="右に回る" onHold={(on) => (touchCamera.turn = on ? -1 : 0)}>
        ⟳
      </HoldButton>
      <HoldButton label="寄る" onHold={(on) => (touchCamera.zoom = on ? 1 : 0)}>
        ＋
      </HoldButton>
      <HoldButton label="離れる" onHold={(on) => (touchCamera.zoom = on ? -1 : 0)}>
        －
      </HoldButton>
    </div>
  );
}

/** 開け閉めできる下からの引き出し（スマホでは左右のパネルの代わりにこれに入れる） */
export function Sheet({ title, children, defaultOpen = false, className }: { title: string; children: ReactNode; defaultOpen?: boolean; className?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`sheet${open ? ' open' : ''} ${className ?? ''}`}>
      <button className="sheet-head" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span className="sheet-arrow">{open ? '閉じる' : '開く'}</span>
      </button>
      {open && <div className="sheet-body">{children}</div>}
    </div>
  );
}

