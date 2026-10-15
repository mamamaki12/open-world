// 歩きモードの画面表示：視点の種類、キー操作の一覧、一人称の照準
import { useEffect, useState } from 'react';
import { useDoors } from '../state/doors';
import { getOpening } from '../catalog';
import { useGame } from '../state/store';
import { toggleTargetDoor } from '../world/Player';

const KEYS: [string, string][] = [
  ['W / S', '前へ / 後ろへ'],
  ['A / D', '左へ / 右へ（横歩き）'],
  ['Shift', '押している間は走る'],
  ['Space', 'ジャンプ（開いた窓の前では窓から出る）'],
  ['C', 'しゃがむ / 立つ'],
  ['Q', '一人称 ⇄ 三人称'],
  ['R', 'カメラを背中側に戻す'],
  ['F / E', 'ドア・窓を開ける / 閉める'],
  ['マウス', 'クリックで視点操作（Esc で解除）'],
  ['ホイール', 'カメラの距離（三人称）'],
  ['2〜9', '建てるツールを持つ（その場で建てられる）'],
  ['Tab', '建築モードに戻る'],
];

export function WalkHud() {
  const view = useGame((s) => s.view);
  const toggleView = useGame((s) => s.toggleView);
  const target = useDoors((s) => s.target);
  const targetOpen = useDoors((s) => (s.target ? s.target in s.open : false));
  const climb = useDoors((s) => s.climb);
  const climbing = useDoors((s) => s.climbing);
  const house = useGame((s) => s.house);
  const opening = target ? house.openings.find((o) => o.id === target) : undefined;
  const noun = opening?.kind === 'window' ? '窓' : 'ドア';
  const patio = opening ? getOpening(opening.type).sill === 0 : false;
  const holding = useGame((s) => s.tool !== 'select');
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    const onChange = () => setLocked(document.pointerLockElement !== null);
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  }, []);
  return (
    <>
      {view === 'first' && !holding && <div className="crosshair" />}
      {target && !climbing && (
        <div className="door-prompts">
          <button
            className="door-prompt"
            onClick={(e) => {
              e.currentTarget.blur();
              toggleTargetDoor();
            }}
          >
            <kbd>F</kbd>
            {targetOpen ? `${noun}を閉める` : `${noun}を開ける`}
          </button>
          {climb === 'ok' && (
            <div className="door-prompt passive">
              <kbd>Space</kbd>
              窓から出る
            </div>
          )}
          {(climb === 'narrow' || climb === 'high') && !patio && (
            <div className="door-prompt passive muted">{climb === 'narrow' ? 'この窓は狭くて通れません' : '窓が高くて届きません'}</div>
          )}
        </div>
      )}
      <div className="panel walk-hud">
        <div className="panel-title">
          <span>歩きモード</span>
          <button
            className="btn small"
            onClick={(e) => {
              e.currentTarget.blur();
              toggleView();
            }}
          >
            {view === 'first' ? '一人称' : '三人称'}（Q で切替）
          </button>
        </div>
        {holding ? (
          <p className="info">建てるツールを持っています。いまいる階に置けます。1 か Esc で手ぶらに戻ります。</p>
        ) : (
        <table className="keys">
          <tbody>
            {KEYS.map(([k, d]) => (
              <tr key={k}>
                <th>{k}</th>
                <td>{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
        {!locked && !holding && <p className="info">画面をクリックするとマウスで見回せます。ドラッグでも回せます。</p>}
      </div>
    </>
  );
}
