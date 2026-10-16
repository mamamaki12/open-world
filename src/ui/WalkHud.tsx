// 歩きモードの画面表示：視点の種類、キー操作の一覧、一人称の照準
import { useEffect, useState } from 'react';
import { useDoors } from '../state/doors';
import { getOpening } from '../catalog';
import { useGame } from '../state/store';
import { useVehicles } from '../state/vehicles';
import { useSeating } from '../state/seating';
import { interact } from '../world/Player';
import { useTouchDevice } from './useTouchDevice';

const KEYS: [string, string][] = [
  ['W / S', '前へ / 後ろへ'],
  ['A / D', '左へ / 右へ（横歩き）'],
  ['Ctrl / Shift / Wを2回', '走る'],
  ['Space', 'ジャンプ（開いた窓の前では窓から出る）'],
  ['Q', '一人称 ⇄ 三人称'],
  ['R', 'カメラを背中側に戻す'],
  ['F / E', 'ドア・窓の開閉、座る / 立つ、店舗に入る'],
  ['マウス', 'クリックで視点操作（Esc で解除）'],
  ['ホイール / 1〜9', '道具の持替（Shift＋ホイールで距離）'],
  ['M', '町の地図（持っている土地へワープ）'],
  ['B', '道具・素材を開く'],
  ['Tab', '建築モードに戻る'],
];

// キー一覧は場所をとるので、ふだんは畳んで主なキーだけ出す（開いたかどうかは覚えておく）
const KEYS_OPEN = 'open-world:walk-keys-open';
function loadShowKeys() {
  try {
    return localStorage.getItem(KEYS_OPEN) === '1';
  } catch {
    return false;
  }
}

export function WalkHud() {
  const seat = useSeating((s) => s.target);
  const seated = useSeating((s) => s.seated);
  const view = useGame((s) => s.view);
  const toggleView = useGame((s) => s.toggleView);
  const target = useDoors((s) => s.target);
  const targetOpen = useDoors((s) => (s.target ? s.target in s.open : false));
  const climb = useDoors((s) => s.climb);
  const climbing = useDoors((s) => s.climbing);
  const atCasino = useDoors((s) => s.atCasino);
  const atEstate = useDoors((s) => s.atEstate);
  const overlay = useGame((s) => s.overlay);
  const house = useGame((s) => s.house);
  const opening = target ? house.openings.find((o) => o.id === target) : undefined;
  const noun = opening?.kind === 'window' ? '窓' : 'ドア';
  const patio = opening ? getOpening(opening.type).sill === 0 : false;
  const holding = useGame((s) => s.tool !== 'select');
  const touch = useTouchDevice();
  const [locked, setLocked] = useState(false);
  const [showKeys, setShowKeys] = useState(loadShowKeys);
  const toggleKeys = () => {
    setShowKeys(!showKeys);
    try {
      localStorage.setItem(KEYS_OPEN, showKeys ? '0' : '1');
    } catch {
      // 保存できなくても表示の切り替えはできる
    }
  };
  useEffect(() => {
    const onChange = () => setLocked(document.pointerLockElement !== null);
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  }, []);
  const vehicleAction = useVehicles(s => s.driving !== null || s.target !== null);
  if (vehicleAction) return null;
  return (
    <>
      {view === 'first' && !holding && <div className="crosshair" />}
      {(atCasino || atEstate) && !climbing && !seated && !overlay && (
        <div className="door-prompts">
          <button
            className="door-prompt casino"
            onClick={(e) => {
              e.currentTarget.blur();
              interact();
            }}
          >
            <kbd>F</kbd>
            {atEstate ? '不動産屋に入る' : 'カジノ・競技場に入る'}
          </button>
        </div>
      )}
      {(target || seat || seated) && !climbing && ((!atCasino && !atEstate) || seated) && (
        <div className="door-prompts">
          <button
            className="door-prompt"
            onClick={(e) => {
              e.currentTarget.blur();
              interact();
            }}
          >
            <kbd>F</kbd>
            {seated ? '立つ' : seat ? '座る' : targetOpen ? `${noun}を閉める` : `${noun}を開ける`}
          </button>
          {climb === 'ok' && !touch && (
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
      {!touch && (
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
          <p className="info">建てるツールを持っています。マウスで指した場所（地面・床・壁の上）に置けます。1 か Esc で手ぶらに戻ります。</p>
        ) : !showKeys ? (
          <p className="keys-short">
            <span><b>WASD</b> 歩く</span>
            <span><b>Shift</b> 走る</span>
            <span><b>Space</b> ジャンプ</span>
            <span><b>F</b> 開ける・座る</span>
          </p>
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
        {!holding && (
          <button
            className="link-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              toggleKeys();
            }}
          >
            {showKeys ? 'キー一覧を閉じる ▴' : 'キー操作をすべて見る ▾'}
          </button>
        )}
      </div>
      )}
    </>
  );
}

