import { AppIcon } from '../AppIcon';
import { yen } from '../../economy/money';
export function RaceMoney({spent,payout}:{spent:number;payout?:number}) {
  const net=payout===undefined?undefined:payout-spent;
  return <section className={'race-money'+(payout!==undefined&&payout>0?' won':'')} aria-label="購入額と払戻額">
    <div className="race-money-heading"><AppIcon name="diamond"/> {payout===undefined?'YOUR RACE TICKETS':'RACE SETTLEMENT'} <AppIcon name="diamond"/></div>
    <div className="race-money-values"><div><span>購入金額</span><strong>{yen(spent)}</strong><small>BET AMOUNT</small></div>
    <div><span>払戻金額</span><strong>{payout===undefined?'結果待ち':yen(payout)}</strong><small>{payout===undefined?'レース確定後に表示':'PAYOUT CONFIRMED'}</small></div></div>
    {net!==undefined&&<p className="race-money-net">収支 <b>{net>0?'+':''}{yen(net)}</b>{(payout ?? 0)>0&&<span>的中おめでとうございます</span>}</p>}
  </section>;
}
