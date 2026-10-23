import { ICON_PATHS, type IconName } from './iconPaths';

/** The same original paths used by the UI, drawn without font-dependent symbols. */
export function drawCanvasIcon(g: CanvasRenderingContext2D, name: IconName, x: number, y: number, size: number, fill = true) {
  g.save();
  g.translate(x - size / 2, y - size / 2);
  g.scale(size / 24, size / 24);
  g.strokeStyle = g.fillStyle;
  g.lineWidth = 1.7;
  g.lineCap = 'square';
  g.lineJoin = 'miter';
  const path = new Path2D(ICON_PATHS[name]);
  if (fill) g.fill(path);
  g.stroke(path);
  g.restore();
}

