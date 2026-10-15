// 本番で真っ白な画面にしないための受け皿：WebGL 非対応の案内と、予期しないエラーからの復帰
import { Component } from 'react';
import type { ReactNode } from 'react';
import { clearAutosave } from '../save/storage';

export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function NoWebGL() {
  return (
    <div className="fallback">
      <h1>このブラウザでは3D表示が使えません</h1>
      <p>Chrome・Edge・Safari・Firefox の最新版で開いてください。ブラウザの設定で「ハードウェアアクセラレーション」が切れている場合は、オンにすると遊べます。</p>
    </div>
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="fallback">
        <h1>エラーが起きて止まりました</h1>
        <p>再読み込みで直ることがあります。何度も止まるときは、自動セーブを消してサンプルの家から始め直せます（スロットに保存した家は残ります）。</p>
        <div className="fallback-actions">
          <button onClick={() => location.reload()}>再読み込み</button>
          <button
            onClick={() => {
              clearAutosave();
              location.reload();
            }}
          >
            自動セーブを消して始め直す
          </button>
        </div>
        <pre>{this.state.error.message}</pre>
      </div>
    );
  }
}
