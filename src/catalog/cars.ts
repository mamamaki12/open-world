/** 架空の10車種。寸法はm、速度はm/s、価格は円。 */
export interface CarDef {
  id: string; name: string; category: string; price: number;
  width: number; length: number; height: number; wheelbase: number; wheel: number;
  power: number; maxSpeed: number; reverseSpeed: number;
  body: 'hatch' | 'sedan' | 'wagon' | 'suv' | 'van' | 'coupe' | 'roadster' | 'pickup';
  seats: number; economy: number; note: string;
}
export const CAR_COLORS = ['#eceeea', '#222a32', '#9ca8b3', '#b52734', '#204f7b', '#d5ab45', '#46624e', '#e27830'];
export const CARS: CarDef[] = [
  { id:'moco', name:'MOCO 660', category:'軽自動車', price:980000, width:1.48, length:3.4, height:1.64, wheelbase:2.35, wheel:.28, power:3.2, maxSpeed:12, reverseSpeed:3, body:'hatch', seats:4, economy:25.2, note:'四角い室内と小回り。街の細い道に。' },
  { id:'pico', name:'PICO Hybrid', category:'コンパクト', price:1680000, width:1.7, length:3.95, height:1.5, wheelbase:2.5, wheel:.3, power:3.8, maxSpeed:14, reverseSpeed:3.2, body:'hatch', seats:5, economy:30, note:'短いオーバーハングと軽快なハンドリング。' },
  { id:'aria', name:'ARIA 250', category:'セダン', price:2980000, width:1.8, length:4.7, height:1.46, wheelbase:2.8, wheel:.32, power:4.4, maxSpeed:16, reverseSpeed:3.2, body:'sedan', seats:5, economy:17.4, note:'独立したトランクを持つ上品な4ドア。' },
  { id:'tour', name:'TOUR Estate', category:'ワゴン', price:3280000, width:1.82, length:4.8, height:1.52, wheelbase:2.85, wheel:.33, power:4.5, maxSpeed:16, reverseSpeed:3.2, body:'wagon', seats:5, economy:16.8, note:'長いルーフと大きな荷室。ルーフレール装備。' },
  { id:'ridge', name:'RIDGE AWD', category:'SUV', price:3880000, width:1.9, length:4.65, height:1.78, wheelbase:2.75, wheel:.37, power:4.6, maxSpeed:15, reverseSpeed:3, body:'suv', seats:5, economy:14.5, note:'大径タイヤ、樹脂フェンダー、高い車高。' },
  { id:'lounge', name:'LOUNGE 7', category:'ミニバン', price:4180000, width:1.85, length:4.95, height:1.9, wheelbase:3, wheel:.34, power:3.9, maxSpeed:14, reverseSpeed:2.8, body:'van', seats:7, economy:12.8, note:'3列シート、横長の窓、大型クロームグリル。' },
  { id:'raven', name:'RAVEN GT', category:'スポーツクーペ', price:5980000, width:1.88, length:4.5, height:1.28, wheelbase:2.62, wheel:.34, power:6.5, maxSpeed:20, reverseSpeed:3.5, body:'coupe', seats:2, economy:10.2, note:'低いキャビン、リアスポイラー、ツインマフラー。' },
  { id:'breeze', name:'BREEZE RS', category:'オープンカー', price:3680000, width:1.76, length:4, height:1.22, wheelbase:2.32, wheel:.31, power:5.5, maxSpeed:18, reverseSpeed:3.2, body:'roadster', seats:2, economy:16.2, note:'オープンコックピットとロールバーの2シーター。' },
  { id:'terra', name:'TERRA Utility', category:'ピックアップ', price:4580000, width:1.94, length:5.3, height:1.8, wheelbase:3.1, wheel:.38, power:4.3, maxSpeed:14, reverseSpeed:2.8, body:'pickup', seats:5, economy:11.4, note:'独立した荷台と頑丈なバンパー。' },
  { id:'volt', name:'VOLT S', category:'電動ファストバック', price:5280000, width:1.86, length:4.65, height:1.43, wheelbase:2.85, wheel:.34, power:6, maxSpeed:18, reverseSpeed:3.5, body:'coupe', seats:5, economy:6.5, note:'グリルレスのフロント、連続LEDテール、ガラスルーフ。' },
];
export const getCar = (id: string) => CARS.find(c => c.id === id);
