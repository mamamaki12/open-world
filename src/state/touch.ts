// スマホ・タブレットの画面ボタンからの入力。毎フレーム読むので、React の状態にはしない。

/** 歩きモードの左スティック：x = 右が +、y = 前が +（-1〜1）。長さ 1 近くまで倒すと走る */
export const touchMove = { x: 0, y: 0 };

/** スティックをこれ以上倒すと走る */
export const RUN_THRESHOLD = 0.92;

/** 建築モードのカメラボタン（押している間だけ動く）：turn = 左回りが +、zoom = 寄るが + */
export const touchCamera = { turn: 0, zoom: 0 };

/** 歩きモードの動作ボタン。Player が表示されている間だけ中身が入る */
export const walkActions: {
  jump: () => void;
  toggleView: () => void;
  resetCamera: () => void;
} = {
  jump: () => undefined,
  toggleView: () => undefined,
  resetCamera: () => undefined,
};

