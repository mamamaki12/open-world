// 歩きモードの画面表示：視点の種類、キー操作の一覧、一人称の照準
import { useEffect, useState } from 'react';
import { useDoors } from '../state/doors';
import { useGame } from '../state/store';
import { toggleTargetDoor } from '../world/Player';

const KEYS: [string, string][] = [
  ['W / S', '前へ / 後ろへ'],
  ['A / D', '左へ / 右へ（横歩き）'],
  ['Shift', '押している間は走る'],
  ['Space', 'ジャンプ'],
  ['C', 'しゃがむ / 立つ'],
  ['Q', '一人称 ⇄ 三人称'],
  ['R', 'カメラを背中側に戻す'],
  ['F / E', 'ドアを開ける / 閉める'],
  ['マウス', 'クリックで視点操作（Esc で解除）'],
  ['ホイール', 'カメラの距離（三人称）'],
  ['Tab', '建築モードに戻る'],
];

export function WalkHud() {
  const view = useGame((s) => s.view);
  const toggleView = useGame((s) => s.toggleView);
  const target = useDoors((s) => s.target);
  const targetOpen = useDoors((s) => (s.target ? s.target in s.open : false));
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    const onChange = () => setLocked(document.pointerLockElement !== null);
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  }, []);
  return (
    <>
      {view === 'first' && <div className="crosshair" />}
      {target && (
        <button
          className="door-prompt"
          onClick={(e) => {
            e.currentTarget.blur();
            toggleTargetDoor();
          }}
        >
          <kbd>F</kbd>
          {targetOpen ? 'ドアを閉める' : 'ドアを開ける'}
        </button>
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
        {!locked && <p className="info">画面をクリックするとマウスで見回せます。ドラッグでも回せます。</p>}
      </div>
    </>
  );
}
