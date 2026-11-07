// みんなのワールドの家のランキング：いいねの多い順に並べ、見に行く（ワープ）・いいねする
import { useState } from 'react';
import { Modal } from './Modal';
import { useGame } from '../state/store';
import { useEconomy } from '../state/economy';
import { useSession } from '../session/session';
import { sessionGate } from '../session/gate';
import { savedBundle } from '../session/saves';
import { warpToLot } from '../world/Player';
import { cleanLikes, likeRanking, LIKE_MAX_BONUS, LIKE_STEP } from '../economy/likes';
import { iconText } from './AppIcon';
import './guide.css';

export function RankingPanel() {
  const close = useGame((s) => s.setOverlay);
  const lots = useEconomy((s) => s.lots);
  const shared = useSession((s) => s.shared) && sessionGate.shared;
  const [msg, setMsg] = useState('');
  const me = shared ? savedBundle().profile.id : '';
  const ranked = likeRanking(lots).slice(0, 30);
  const like = (id: string) => setMsg((sessionGate.act ? sessionGate.act(id, { type: 'like' }, 0) : '接続していません') ?? '');
  return (
    <Modal title="🏆 家のランキング" onClose={() => close(null)} tabs={[]} tab="" onTab={() => undefined}>
      {!shared ? <p>みんなのワールドで、ほかの人の家を見に行って「いいね」できます。いいねが多い家ほど査定が上がり、ランキングに出ます。</p> : <>
        <p className="info">気に入った家に「いいね」しよう。いいね1つで建物の査定が{Math.round(LIKE_STEP * 100)}%上がります（最大{Math.round(LIKE_MAX_BONUS * 100)}%）。</p>
        {msg && <p className="info"><b>{msg}</b></p>}
        {ranked.length === 0 && <p className="info">まだ家が建っていません。</p>}
        <div className="quest-list">
          {ranked.map((l, i) => {
            const likes = cleanLikes(l.likes), mine = l.owner === me, liked = likes.includes(me);
            return (
              <div key={l.id} className="quest">
                <h4>{i + 1}位　{l.name}</h4>
                <div className="who">{mine ? 'あなたの家' : `${l.ownerName || 'だれか'}さんの家`} · {iconText('★')} {likes.length}</div>
                <div className="row" style={{ marginTop: 6 }}>
                  <button className="btn" onClick={() => { warpToLot(l.id); close(null); }}>見に行く</button>
                  {!mine && <button className={`btn${liked ? '' : ' primary'}`} onClick={() => like(l.id)}>{liked ? 'いいねを外す' : `${iconText('★')} いいね`}</button>}
                </div>
              </div>
            );
          })}
        </div>
      </>}
    </Modal>
  );
}
