// 設計図：いまの設計を名前を付けて保存し、ほかの土地にそのまま建てる・コードで人に渡す。階をまるごと上にコピーするのもここ
import { useMemo, useState } from 'react';
import { Modal } from './Modal';
import { useGame } from '../state/store';
import { useLotCells } from '../state/economy';
import { BLUEPRINT_LIMITS, copyLevelOnTop, decodeBlueprint, encodeBlueprint, fitError, loadBlueprints, partCount, storeBlueprints } from '../building/blueprints';
import type { Blueprint } from '../building/blueprints';
import { visitingWorld } from '../session/gate';
import './guide.css';

/** 設計図を手元の一覧に足す（お店で買ったときにも使う） */
export function addBlueprint(name: string, house: Blueprint['house']): string | null {
  const list = loadBlueprints();
  if (list.length >= BLUEPRINT_LIMITS.count) return `設計図は${BLUEPRINT_LIMITS.count}個まで保存できます`;
  const bp: Blueprint = { id: `bp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, name: name.trim().slice(0, BLUEPRINT_LIMITS.name) || '設計図', savedAt: Date.now(), house };
  return storeBlueprints([bp, ...list]) ? null : '保存できませんでした（容量がいっぱいです）';
}

export function BlueprintPanel() {
  const close = useGame((s) => s.setOverlay);
  const house = useGame((s) => s.house);
  const notify = useGame((s) => s.notify);
  const cells = useLotCells();
  const [list, setList] = useState(loadBlueprints);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [confirm, setConfirm] = useState('');
  const levels = useMemo(() => [...new Set(house.floors.map((f) => f.level))].sort((a, b) => a - b), [house]);
  const refresh = () => setList(loadBlueprints());
  const readOnly = visitingWorld();

  const save = () => {
    if (!partCount(house)) return setMsg('いまの設計は空です');
    const err = addBlueprint(name || `設計図${list.length + 1}`, house);
    setMsg(err ?? '保存しました'); setName(''); refresh();
  };
  const build = (b: Blueprint) => {
    const err = fitError(b.house, cells);
    if (err) return setMsg(err);
    if (confirm !== b.id) { setConfirm(b.id); setMsg('もう一度押すと、いまの設計を置きかえます（取り消しで戻せます）'); return; }
    useGame.getState().replaceHouse(structuredClone(b.house));
    notify(`「${b.name}」を設計に読み込みました。不動産屋で着工すると建ちます`);
    close(null);
  };
  const share = async (b: Blueprint) => {
    const c = await encodeBlueprint(b.name, b.house);
    if (c.length > BLUEPRINT_LIMITS.code) return setMsg('大きすぎてコードにできません');
    try { await navigator.clipboard.writeText(c); setMsg('コードをコピーしました。友だちに送ると、同じ家を建てられます'); }
    catch { setCode(c); setMsg('下の欄のコードをコピーして送ってください'); }
  };
  const importCode = async () => {
    const got = await decodeBlueprint(code);
    if (!got) return setMsg('コードが読めませんでした');
    setMsg(addBlueprint(got.name, got.house) ?? `「${got.name}」を追加しました`); setCode(''); refresh();
  };
  const remove = (b: Blueprint) => {
    if (confirm !== `rm-${b.id}`) { setConfirm(`rm-${b.id}`); setMsg('もう一度押すと消します'); return; }
    storeBlueprints(list.filter((x) => x.id !== b.id)); refresh(); setMsg('消しました');
  };
  const copyLevel = (lv: number) => {
    const next = copyLevelOnTop(house, lv);
    if (typeof next === 'string') return setMsg(next);
    useGame.getState().commit(next);
    setMsg(`${lv + 1}階を${Math.max(...next.floors.map((f) => f.level)) + 1}階にコピーしました（階段は自分で付けてください）`);
  };

  return (
    <Modal title="📐 設計図" onClose={() => close(null)} tabs={[]} tab="" onTab={() => undefined}>
      {msg && <p className="info"><b>{msg}</b></p>}
      <div className="card">
        <div className="field-label">いまの設計を保存</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input type="text" maxLength={BLUEPRINT_LIMITS.name} placeholder="名前（例：2階建てのモデルハウス）" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
          <button className="btn primary" onClick={save}>保存</button>
        </div>
      </div>
      <div className="quest-list" style={{ marginTop: 10 }}>
        {list.length === 0 && <p className="info">まだ設計図がありません。気に入った家を保存すると、ほかの土地にもワンタップで建てられます。</p>}
        {list.map((b) => (
          <div key={b.id} className="quest">
            <h4>{b.name}</h4>
            <div className="who">{partCount(b.house)}パーツ · {new Date(b.savedAt).toLocaleDateString('ja-JP')}</div>
            <div className="row" style={{ marginTop: 6 }}>
              <button className="btn primary" disabled={readOnly} onClick={() => build(b)}>{confirm === b.id ? 'もう一度押して置きかえ' : 'この土地に建てる'}</button>
              <button className="btn" onClick={() => share(b)}>コードをコピー</button>
              <button className="btn small danger" onClick={() => remove(b)}>{confirm === `rm-${b.id}` ? '本当に消す' : '消す'}</button>
            </div>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 10 }}>
        <div className="field-label">コードから追加</div>
        <textarea placeholder="OW1. で始まるコードを貼り付け" value={code} onChange={(e) => setCode(e.target.value)} rows={3} style={{ width: '100%', boxSizing: 'border-box' }} />
        <button className="btn" disabled={!code.trim()} onClick={importCode}>追加</button>
        <p className="info">みんなのワールドでは、自分のお店で設計図を売ることもできます（お店の商品に設計図を付ける）。</p>
      </div>
      <div className="card" style={{ marginTop: 10 }}>
        <div className="field-label">階をまるごとコピー</div>
        <p className="info">選んだ階の床・壁・窓とドア・家具を、いちばん上に重ねます。屋根は新しい階の上へ移ります。</p>
        <div className="row" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {levels.length === 0 ? <span className="info">床がありません</span> : levels.map((lv) => <button key={lv} className="btn" onClick={() => copyLevel(lv)}>{lv + 1}階を上にコピー</button>)}
        </div>
      </div>
    </Modal>
  );
}
