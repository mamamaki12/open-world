import { shopSite, SHOPPING_SOUTH, SHOPPING_WEST } from './shopSites';
/** 西の商店街。服屋・不動産屋と並ぶ証券取引所。 */
export const EXCHANGE = { ...shopSite(SHOPPING_WEST + 38, SHOPPING_SOUTH, 11, 12), height: 7 };
