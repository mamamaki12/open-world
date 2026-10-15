// スマホ・タブレット用の画面ボタン：歩きモードのスティックと動作ボタン、建築モードのカメラボタン
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { useDoors } from '../state/doors';
import { useGame } from '../state/store';
import { RUN_THRESHOLD, touchCamera, touchMove, walkActions } from '../state/touch';

/** スティックを倒せる半径（px） */
const STICK_RADIUS = 46;

function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const center = useRef({ x: 0, y: 0 });
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const running = Math.hypot(knob.x, knob.y) / STICK_RADIUS >= RUN_THRESHOLD;

  const release = () => {
    pointer.current = null;
    touchMove.x = 0;
    touchMove.y = 0;
    setKnob({ x: 0, y: 0 });
  };
  useEffect(() => release, []);

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
        move(e);
      }}
      onPointerMove={(e) => e.pointerId === pointer.current && move(e)}
      onPointerUp={(e) => e.pointerId === pointer.current && release()}
      onPointerCancel={(e) => e.pointerId === pointer.current && release()}
    >
      <div className="joystick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      <span className="joystick-hint">{running ? '走る' : ''}</span>
    </div>
  );
}

/** 押した瞬間に反応するボタン（タップの遅れをなくす） */
function TapButton({ className, onTap, children }: { className?: string; onTap: () => void; children: ReactNode }) {
  return (
    <button
      className={`touch-btn ${className ?? ''}`}
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
  return (
    <button
      className={`touch-btn ${className ?? ''}`}
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        onHold(true);
      }}
      onPointerUp={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

export function TouchWalkControls() {
  const view = useGame((s) => s.view);
  const climb = useDoors((s) => s.climb);
  const climbing = useDoors((s) => s.climbing);
  return (
    <div className="touch-walk">
      <Joystick />
      <div className="touch-actions">
        <TapButton className="small" onTap={() => walkActions.resetCamera()}>
          正面
        </TapButton>
        <TapButton className="small" onTap={() => walkActions.toggleView()}>
          {view === 'first' ? '一人称' : '三人称'}
        </TapButton>
        <TapButton className={`jump${climb === 'ok' && !climbing ? ' climb' : ''}`} onTap={() => walkActions.jump()}>
          {climb === 'ok' && !climbing ? '窓から出る' : 'ジャンプ'}
        </TapButton>
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

