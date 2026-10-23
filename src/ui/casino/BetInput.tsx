import { iconText } from '../AppIcon';
// 賭け金の入力。チップを押して積む。上限はなし（所持金まで）
import { yen } from '../../economy/money';
import { useEconomy } from '../../state/economy';
import { CHIP_VALUES, Chip, ChipStack } from './Chips';
import { sfxChip } from './sfx';

export function BetInput({ value, onChange, disabled, label = '賭け金' }: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  label?: string;
}) {
  const money = useEconomy((s) => s.money);
  const set = (v: number) => onChange(Math.max(0, Math.floor(v)));
  return (
    <div className="bet-input">
      <div className="bet-row">
        <span className="bet-label">{iconText(label)}</span>
        <ChipStack amount={value} />
        <span className={`bet-amount${value > money ? ' minus' : ''}`}>{yen(value)}</span>
        <input
          type="number"
          min={0}
          step={1000}
          value={value}
          disabled={disabled}
          aria-label={`${label}（円）`}
          onChange={(e) => set(Number(e.target.value) || 0)}
        />
      </div>
      <div className="chip-tray">
        {CHIP_VALUES.map((c) => (
          <Chip
            key={c}
            value={c}
            disabled={disabled}
            title={`${yen(c)} 積む`}
            onClick={() => {
              sfxChip();
              set(value + c);
            }}
          />
        ))}
        <span className="tray-ops">
          <button className="btn small" disabled={disabled} onClick={() => set(value * 2)}>{iconText("×2")}</button>
          <button className="btn small" disabled={disabled} onClick={() => set(value / 2)}>½</button>
          <button className="btn small" disabled={disabled} onClick={() => set(0)}>クリア</button>
          <button className="btn small danger" disabled={disabled || money <= 0} onClick={() => set(money)}>オールイン</button>
        </span>
      </div>
      {value > money && <p className="warn">所持金（{yen(money)}）より多くは賭けられません。</p>}
    </div>
  );
}
