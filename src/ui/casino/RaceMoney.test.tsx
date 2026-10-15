import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {RaceMoney} from './RaceMoney';
import {RaceTickets} from './RaceGame';
import {makeRace,computeProbs} from '../../economy/race';
it('keeps the payout pending until the result is confirmed',()=>{
  const pending=renderToStaticMarkup(<RaceMoney spent={1000}/>);
  expect(pending).toContain('結果待ち');expect(pending).not.toContain('収支');
  const done=renderToStaticMarkup(<RaceMoney spent={1000} payout={6000}/>);
  expect(done).toContain('6,000');expect(done).toContain('収支');expect(done).toContain('的中おめでとうございます');
});
it('includes every purchased combination in the race ticket panel for all three sports',()=>{
  for(const kind of ['horse','keirin','boat'] as const){
    const race=makeRace(kind,1,42),probs=computeProbs(race);
    const html=renderToStaticMarkup(<RaceTickets race={race} probs={probs} tickets={Array.from({length:8},(_,i)=>({type:'exacta' as const,combo:[i%race.runners.length,(i+1)%race.runners.length],stake:100}))}/>);
    expect(html).toContain('全ての買い目・金額（8通り）');expect(html).toContain('結果待ち');
  }
});
