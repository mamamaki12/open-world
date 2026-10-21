// スマホで流している音楽（Spotify など）を止めずに、ゲームの音を混ぜて鳴らす。
// iPhone の Safari（17以降）は audioSession で「環境音」扱いにできる。代わりにマナーモード中はゲームの音が鳴らない
export function mixWithOtherAudio() {
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  try {
    if (nav.audioSession) nav.audioSession.type = 'ambient';
  } catch {
    /* 対応していない端末 */
  }
}
