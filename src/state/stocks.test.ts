import { afterEach, expect, it } from 'vitest';
import { buyStock, sellStock, useStocks } from './stocks';
import { useEconomy } from './economy';
const stocks = useStocks.getState(), economy = useEconomy.getState();
afterEach(() => { useStocks.setState(stocks); useEconomy.setState(economy); });
function setup() {
  useEconomy.setState({ money: 1000 });
  useStocks.setState({ quotes: { updated: 1, quotes: { test: { price: 100000, prevClose: 100000, currency: 'JPY', time: 1, intraday: [], daily: [] } } }, holdings: { test: { units: 1, cost: 100000 } } });
}
it('rejects repeated sales smaller than the minimum holding unit without crediting money', () => {
  setup();
  for (let i = 0; i < 10; i++) expect(sellStock('test', 'test', 0.00001)).not.toBeNull();
  expect(useEconomy.getState().money).toBe(1000);
  expect(useStocks.getState().holdings.test).toEqual({ units: 1, cost: 100000 });
});
it('pays only for whole minimum units and supports an exact final sale', () => {
  setup();
  expect(sellStock('test', 'test', 0.00019)).toBeNull();
  expect(useEconomy.getState().money).toBe(1010);
  expect(useStocks.getState().holdings.test.units).toBe(0.9999);
  expect(sellStock('test', 'test', 0.9999)).toBeNull();
  expect(useStocks.getState().holdings.test).toBeUndefined();
  expect(useEconomy.getState().money).toBe(101000);
});
it('does not lose a minimum unit to floating-point conversion or accept non-finite input', () => {
  setup();
  expect(sellStock('test', 'test', 0.0003)).toBeNull();
  expect(useStocks.getState().holdings.test.units).toBe(0.9997);
  const balance = useEconomy.getState().money;
  for (const n of [NaN, Infinity, -Infinity]) {
    expect(sellStock('test', 'test', n)).not.toBeNull();
    expect(buyStock('test', 'test', n)).not.toBeNull();
  }
  expect(useEconomy.getState().money).toBe(balance);
});
