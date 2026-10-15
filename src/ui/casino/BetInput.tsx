// 賭け金の入力。上限はなし（所持金まで）
import { yen } from '../../economy/money';
import { useEconomy } from '../../state/economy';

const CHIPS = [1_000, 10_000, 100_000, 1_000_000, 10_000_000];

export function BetInput({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const money = useEconomy((s) => s.money);
  const set = (v: number) => onChange(Math.max(0, Math.floor(v)));
  return (
    <div className="bet-input">
      <div className="bet-row">
        <span className="bet-label">賭け金</span>
        <input
          type="number"
          min={0}
          step={1000}
          value={value}
          disabled={disabled}
          onChange={(e) => set(Number(e.target.value) || 0)}
        />
        <span className={`bet-yen${value > money ? ' minus' : ''}`}>{yen(value)}</span>
      </div>
      <div className="row">
        {CHIPS.map((c) => (
          <button key={c} className="btn small" disabled={disabled} onClick={() => set(value + c)}>
            +{c >= 10_000 ? `${c / 10_000}万` : c.toLocaleString()}
          </button>
        ))}
        <button className="btn small" disabled={disabled} onClick={() => set(value * 2)}>×2</button>
        <button className="btn small" disabled={disabled} onClick={() => set(value / 2)}>½</button>
        <button className="btn small" disabled={disabled} onClick={() => set(0)}>0</button>
        <button className="btn small danger" disabled={disabled || money <= 0} onClick={() => set(money)}>全額</button>
      </div>
      {value > money && <p className="warn">所持金（{yen(money)}）より多くは賭けられません。</p>}
    </div>
  );
}
