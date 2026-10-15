// レース映像：上から見たコースを中継カメラのように追いかけて描く。実況、残り距離、通過順、全体図つき
import { useEffect, useRef, useState } from 'react';
import { NUMBER_COLORS, RACES } from '../../economy/race';
import type { Race } from '../../economy/race';
import { PACK, Packer, courseP, distanceAt, pointAt, raceTime } from '../../economy/raceMotion';
import type { Motion } from '../../economy/raceMotion';

export function runnerColor(race: Race, i: number) {
  const r = race.runners[i];
  // 競馬は帽子の色＝枠の色、競輪・ボートは車番・艇番の色
  return NUMBER_COLORS[(race.kind === 'horse' ? r.frame : r.no) - 1] ?? NUMBER_COLORS[0];
}

/** 中継で映す幅（m） */
const VIEW_WIDTH: Record<Race['kind'], number> = { horse: 85, keirin: 55, boat: 170 };
const SPEEDS = [1, 2, 4, 8];
/** スタート前の待ち（秒） */
const PRE = 3;

interface Props {
  race: Race;
  motion: Motion;
  order: number[];
  onDone: () => void;
}

interface Call {
  text: string;
  key: number;
}

export function RaceView({ race, motion, order, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [speed, setSpeed] = useState(4);
  const [overview, setOverview] = useState(false);
  const [calls, setCalls] = useState<Call[]>([]);
  const [hud, setHud] = useState<{ clock: string; remain: string; standings: number[]; bell: boolean }>({
    clock: '0:00.0',
    remain: '',
    standings: [],
    bell: false,
  });
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const overviewRef = useRef(overview);
  overviewRef.current = overview;
  const skipRef = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const c = motion.course;
    const n = race.runners.length;
    const L = race.distance;
    const pack = PACK[race.kind];
    const lastFinish = Math.max(...motion.finish);
    // スタート直後の横の位置（ゲート・発走位置・コース）
    const startLat = race.runners.map((_, i) =>
      race.kind === 'horse' ? 0.8 + i * 1.25 : race.kind === 'keirin' ? 0.5 + i * 0.75 : 4 + i * 6.5,
    );
    const seedish = (i: number) => ((Math.sin(race.seed * 0.001 + i * 12.9898) * 43758.5453) % 1 + 1) % 1;
    const railLat = race.runners.map((r, i) =>
      race.kind === 'horse' ? 0.9 + seedish(i) * 1.2 + (r.style === '追込' ? 1.5 : 0) : race.kind === 'keirin' ? 0.55 : 3 + seedish(i) * 3,
    );
    const packer = new Packer(startLat);
    const trails: { x: number; y: number }[][] = race.runners.map(() => []);
    let trailClock = 0;
    let t = -PRE;
    let last = performance.now();
    let cam = { x: 0, y: 0, w: VIEW_WIDTH[race.kind] };
    let raf = 0;
    let finished = false;
    let pacer = { d: 0, lat: 0.55, leaving: false, alpha: 1 };
    let bellAt = -1;
    let hudClock = 0;
    const said = new Set<string>();
    const say = (key: string, text: string) => {
      if (said.has(key)) return;
      said.add(key);
      setCalls((cs) => [{ text, key: performance.now() + Math.random() }, ...cs].slice(0, 3));
    };
    const name = (i: number) => `${race.runners[i].no}番${race.kind === 'horse' ? race.runners[i].name : race.runners[i].name.split(' ')[0]}`;
    const boatName = (i: number) => `${race.runners[i].no}号艇`;
    const who = race.kind === 'boat' ? boatName : name;

    const resize = () => {
      const w = wrapRef.current!.clientWidth;
      const h = Math.round(Math.min(420, Math.max(260, w * 0.5)));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.height = `${h}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapRef.current!);

    const distAt = (i: number, tt: number) => {
      if (tt >= 0) return distanceAt(motion, i, tt);
      if (race.kind === 'boat') return distanceAt(motion, i, 0) + 16 * tt; // 助走してからスタートラインを通る
      return 0;
    };

    // コースの輪郭（周回上の点）をあらかじめ作っておく
    const loop = (lat: number, step = 2) => {
      const pts: { x: number; y: number }[] = [];
      for (let p = 0; p <= c.circumference + step; p += step) pts.push(pointAt(c, p, lat));
      return pts;
    };
    const inner = loop(race.kind === 'boat' ? -6 : -0.8);
    const outer = loop(c.width + (race.kind === 'boat' ? 0 : 0.8));
    const lanes = race.kind === 'keirin' ? [loop(0.0), loop(0.9), loop(2.4)] : [];
    const minimapPath = loop(c.width / 2, 8);

    const tracePath = (pts: { x: number; y: number }[]) => {
      ctx.moveTo(pts[0].x, pts[0].y);
      for (const p of pts) ctx.lineTo(p.x, p.y);
    };

    const drawCourse = (scale: number) => {
      const groundOuter = race.kind === 'boat' ? '#2b6fa6' : race.kind === 'keirin' ? '#5c8f4a' : '#5e9c4a';
      ctx.fillStyle = groundOuter;
      ctx.fillRect(-5000, -5000, 10000, 10000);
      if (race.kind === 'boat') {
        // 水面のさざ波
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1 / scale;
        for (let y = -200; y < 200; y += 6) {
          ctx.beginPath();
          for (let x = -420; x < 420; x += 12) ctx.lineTo(x, y + Math.sin(x * 0.2 + y) * 1.2);
          ctx.stroke();
        }
      } else {
        // 走路
        ctx.beginPath();
        tracePath(outer);
        tracePath([...inner].reverse());
        ctx.fillStyle = race.kind === 'keirin' ? '#8f969c' : race.surface === 'ダート' ? '#b28a5c' : '#4f9440';
        ctx.fill('evenodd');
        if (race.kind === 'horse' && race.surface !== 'ダート') {
          // 芝の刈り目
          ctx.strokeStyle = 'rgba(255,255,255,0.05)';
          ctx.lineWidth = 2.5;
          for (let lat = 1.5; lat < c.width; lat += 5) {
            ctx.beginPath();
            tracePath(loop(lat, 6));
            ctx.stroke();
          }
        }
        // 内側（芝コースの内のダート、バンクの内側）
        ctx.beginPath();
        tracePath(inner);
        ctx.fillStyle = race.kind === 'keirin' ? '#3a7bd5' : '#6aa557';
        ctx.fill();
        if (race.kind === 'horse') {
          ctx.beginPath();
          tracePath(loop(-14, 6));
          tracePath([...loop(-4, 6)].reverse());
          ctx.fillStyle = race.surface === 'ダート' ? '#4f9440' : '#b28a5c';
          ctx.fill('evenodd');
        }
        // ラチ（柵）・バンクの線
        ctx.lineWidth = race.kind === 'keirin' ? 0.12 : 0.35;
        ctx.strokeStyle = '#ffffff';
        for (const pts of [inner, outer]) {
          ctx.beginPath();
          tracePath(pts);
          ctx.stroke();
        }
        if (race.kind === 'keirin') {
          const colors = ['#ffffff', '#e53935', '#1e63d6'];
          lanes.forEach((pts, k) => {
            ctx.beginPath();
            tracePath(pts);
            ctx.strokeStyle = colors[k];
            ctx.lineWidth = 0.1;
            ctx.stroke();
          });
        }
        // ハロン棒（ゴールから200mごと）
        if (race.kind === 'horse') {
          for (let k = 1; k * 200 < c.circumference; k++) {
            const p = pointAt(c, c.finishP - k * 200, -1.6);
            ctx.fillStyle = k % 2 ? '#e53935' : '#ffffff';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 0.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      // スタンド（ホームストレッチの外側）
      const s0 = pointAt(c, 0, c.width + 6);
      const s1 = pointAt(c, c.straight, c.width + 6);
      ctx.fillStyle = '#c9c6bf';
      ctx.fillRect(Math.min(s0.x, s1.x), s0.y, Math.abs(s1.x - s0.x), race.kind === 'keirin' ? 14 : 40);
      ctx.fillStyle = '#8e8a82';
      for (let x = Math.min(s0.x, s1.x); x < Math.max(s0.x, s1.x); x += 4) ctx.fillRect(x, s0.y + 3, 2, race.kind === 'keirin' ? 8 : 30);
      // ゴール板・ゴールライン
      const g0 = pointAt(c, c.finishP, race.kind === 'boat' ? 0 : -0.8);
      const g1 = pointAt(c, c.finishP, c.width + 0.8);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = race.kind === 'keirin' ? 0.25 : 0.6;
      ctx.setLineDash(race.kind === 'boat' ? [3, 3] : []);
      ctx.beginPath();
      ctx.moveTo(g0.x, g0.y);
      ctx.lineTo(g1.x, g1.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      ctx.arc(g1.x, g1.y + (race.kind === 'keirin' ? 1 : 3), race.kind === 'keirin' ? 0.8 : 2.2, 0, Math.PI * 2);
      ctx.fill();
      if (race.kind === 'boat') {
        // ターンマーク（1マーク・2マーク）
        for (const sx of [c.straight / 2, -c.straight / 2]) {
          ctx.fillStyle = '#ffb300';
          ctx.beginPath();
          ctx.arc(sx, 0, 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
        // 大時計・ピット
        ctx.fillStyle = '#d7d3c8';
        ctx.fillRect(-c.straight / 2, c.width + 8, c.straight, 30);
      }
    };

    const drawHorse = (i: number, x: number, y: number, a: number, d: number) => {
      const r = race.runners[i];
      const col = runnerColor(race, i);
      const phase = d / 2.6;
      const bob = Math.sin(phase * Math.PI * 2) * 0.06;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(0.2, 0.35, 1.35, 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      // 脚（4本を交互に）
      ctx.strokeStyle = '#2a1a10';
      ctx.lineWidth = 0.14;
      const s = Math.sin(phase * Math.PI * 2) * 0.35;
      for (const [lx, ly, k] of [[0.75, 0.28, 1], [0.75, -0.28, -1], [-0.7, 0.28, -1], [-0.7, -0.28, 1]] as const) {
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + s * k, ly * 1.5);
        ctx.stroke();
      }
      ctx.fillStyle = r.coat ?? '#7a4a2a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.15 + bob, 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
      // 首と頭
      ctx.beginPath();
      ctx.ellipse(1.25, 0, 0.5, 0.17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(1.75, 0, 0.3, 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      // しっぽ
      ctx.strokeStyle = '#1d120b';
      ctx.lineWidth = 0.16;
      ctx.beginPath();
      ctx.moveTo(-1.1, 0);
      ctx.lineTo(-1.6, Math.sin(phase * 6) * 0.12);
      ctx.stroke();
      // ゼッケン
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-0.45, -0.4, 0.55, 0.8);
      // 騎手（勝負服と帽子＝枠の色）
      ctx.fillStyle = col.bg === '#ffffff' ? '#f2f2f2' : col.bg;
      ctx.beginPath();
      ctx.ellipse(0.05, 0, 0.32, 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 0.05;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0.38, 0, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    const drawBike = (i: number, x: number, y: number, a: number, d: number) => {
      const col = runnerColor(race, i);
      const phase = d / 2.2;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(0.1, 0.25, 0.95, 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      // 車輪とフレーム
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 0.07;
      ctx.beginPath();
      ctx.moveTo(-0.85, 0);
      ctx.lineTo(0.85, 0);
      ctx.stroke();
      ctx.lineWidth = 0.12;
      for (const wx of [-0.55, 0.55]) {
        ctx.beginPath();
        ctx.moveTo(wx - 0.34, 0);
        ctx.lineTo(wx + 0.34, 0);
        ctx.stroke();
      }
      // 脚（ペダルをこぐ）
      const pz = Math.sin(phase * Math.PI * 2) * 0.22;
      ctx.strokeStyle = '#1b1b1b';
      ctx.lineWidth = 0.1;
      ctx.beginPath();
      ctx.moveTo(-0.15, 0.12);
      ctx.lineTo(0.05 + pz, 0.16);
      ctx.moveTo(-0.15, -0.12);
      ctx.lineTo(0.05 - pz, -0.16);
      ctx.stroke();
      // 選手（ユニフォーム＝車番の色）
      ctx.fillStyle = col.bg === '#ffffff' ? '#f4f4f4' : col.bg;
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.42, 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 0.04;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0.42, 0, 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    const drawBoat = (i: number, x: number, y: number, a: number) => {
      const col = runnerColor(race, i);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.fillStyle = '#f3f3f3';
      ctx.beginPath();
      ctx.moveTo(1.7, 0);
      ctx.lineTo(0.6, 0.72);
      ctx.lineTo(-1.5, 0.66);
      ctx.lineTo(-1.5, -0.66);
      ctx.lineTo(0.6, -0.72);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 0.08;
      ctx.stroke();
      ctx.fillStyle = col.bg === '#ffffff' ? '#e8e8e8' : col.bg;
      ctx.fillRect(-0.9, -0.5, 1.4, 1.0);
      ctx.fillStyle = '#333';
      ctx.fillRect(-1.75, -0.25, 0.3, 0.5); // モーター
      ctx.fillStyle = col.bg;
      ctx.beginPath();
      ctx.arc(-0.2, 0, 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    const frame = () => {
      const now = performance.now();
      let dtReal = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (skipRef.current) {
        dtReal = 0;
        t = lastFinish + 2.5;
        skipRef.current = false;
      }
      const dt = dtReal * speedRef.current;
      t += dt;

      const dist = race.runners.map((_, i) => distAt(i, t));
      const pref = race.runners.map((_, i) => {
        const d = Math.max(0, dist[i]);
        const k = Math.min(1, d / (race.kind === 'boat' ? 260 : race.kind === 'keirin' ? 90 : 260));
        return startLat[i] + (railLat[i] - startLat[i]) * k;
      });
      // 大きく時間が飛んだときは少しずつ詰める
      const steps = Math.max(1, Math.ceil(dt / 0.05));
      let lat = packer.lateral;
      for (let s = 0; s < steps; s++) lat = packer.update(dt / steps, dist, pref, pack, c.width - 1.2);
      const pos = race.runners.map((_, i) => pointAt(c, courseP(c, dist[i]), lat[i]));
      const standings = race.runners
        .map((r) => r.index)
        .sort((a, b) => (dist[a] >= L && dist[b] >= L ? motion.finish[a] - motion.finish[b] : dist[b] - dist[a]));
      const lead = standings[0];
      const leadD = dist[lead];

      // 誘導員（競輪）：先頭の前を走り、残り2周弱で外へよけて離れる
      if (race.kind === 'keirin') {
        if (!pacer.leaving) {
          pacer.d = Math.max(...dist) + 3.5;
          if (leadD > L - 680) pacer.leaving = true;
        } else {
          pacer.d += dt * 9;
          pacer.lat = Math.min(c.width - 0.5, pacer.lat + dt * 1.5);
          pacer.alpha = Math.max(0, pacer.alpha - dt * 0.25);
        }
        if (leadD > L - 600 && bellAt < 0) bellAt = t;
      }

      // ボートの引き波
      trailClock += dt;
      if (race.kind === 'boat' && trailClock > 0.12) {
        trailClock = 0;
        pos.forEach((p, i) => {
          trails[i].push({ x: p.x, y: p.y });
          if (trails[i].length > 34) trails[i].shift();
        });
      }

      // カメラ：先頭集団を追う（全体表示ならコース全体）
      const W = canvas.width;
      const H = canvas.height;
      const dpr = W / canvas.clientWidth;
      let target: { x: number; y: number; w: number };
      if (overviewRef.current) {
        const span = Math.max(c.straight + 2 * (c.radius + c.width), 1);
        target = { x: 0, y: 0, w: Math.max(span * 1.08, ((2 * (c.radius + c.width) + 20) * W) / H) };
      } else {
        const front = standings.slice(0, Math.min(4, n));
        const fx = front.reduce((acc, i) => acc + pos[i].x, 0) / front.length;
        const fy = front.reduce((acc, i) => acc + pos[i].y, 0) / front.length;
        target = { x: fx, y: fy, w: VIEW_WIDTH[race.kind] };
      }
      const k = Math.min(1, Math.max(dtReal * 3, dt * 2.5));
      cam = { x: cam.x + (target.x - cam.x) * k, y: cam.y + (target.y - cam.y) * k, w: cam.w + (target.w - cam.w) * k };
      if (t <= -PRE + 0.05) cam = { ...target };
      const scale = W / cam.w;

      ctx.setTransform(scale, 0, 0, scale, W / 2 - cam.x * scale, H / 2 - cam.y * scale);
      drawCourse(scale);

      if (race.kind === 'boat') {
        trails.forEach((tr) => {
          for (let s = 1; s < tr.length; s++) {
            const age = (tr.length - s) / tr.length;
            ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - age)})`;
            ctx.lineWidth = 0.6 + age * 3;
            ctx.beginPath();
            ctx.moveTo(tr[s - 1].x, tr[s - 1].y);
            ctx.lineTo(tr[s].x, tr[s].y);
            ctx.stroke();
          }
        });
      }
      if (race.kind === 'keirin' && pacer.alpha > 0) {
        const p = pointAt(c, courseP(c, pacer.d), pacer.lat);
        ctx.globalAlpha = pacer.alpha;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = '#5b2c83';
        ctx.beginPath();
        ctx.ellipse(0, 0, 0.42, 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      // 後ろから順に描く（前の馬が上に重なる）。全体表示では小さすぎるので色の丸で描く
      if (overviewRef.current) {
        for (const i of [...standings].reverse()) {
          const col = runnerColor(race, i);
          ctx.fillStyle = col.bg;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1 / scale;
          ctx.beginPath();
          ctx.arc(pos[i].x, pos[i].y, 5 / scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      } else for (const i of [...standings].reverse()) {
        const p = pos[i];
        if (race.kind === 'horse') drawHorse(i, p.x, p.y, p.angle, Math.max(0, dist[i]));
        else if (race.kind === 'keirin') drawBike(i, p.x, p.y, p.angle, Math.max(0, dist[i]));
        else drawBoat(i, p.x, p.y, p.angle);
      }

      // 番号の札（画面上の大きさは一定）
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const toScreen = (x: number, y: number) => ({
        x: (W / 2 + (x - cam.x) * scale) / dpr,
        y: (H / 2 + (y - cam.y) * scale) / dpr,
      });
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const i of overviewRef.current ? [] : standings) {
        const p = toScreen(pos[i].x, pos[i].y);
        if (p.x < -20 || p.y < -20 || p.x > W / dpr + 20 || p.y > H / dpr + 20) continue;
        const col = NUMBER_COLORS[race.runners[i].no - 1] ?? NUMBER_COLORS[0];
        const bx = p.x;
        const by = p.y - 16;
        ctx.fillStyle = race.kind === 'horse' ? '#ffffff' : col.bg;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(bx - 9, by - 8, 18, 16, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = race.kind === 'horse' ? '#222' : col.fg;
        ctx.fillText(String(race.runners[i].no), bx, by + 0.5);
      }

      // 全体図
      if (!overviewRef.current) {
        const mw = 150;
        const span = c.straight + 2 * (c.radius + c.width);
        const ms = mw / span;
        const mh = (2 * (c.radius + c.width)) * ms + 10;
        const ox = W / dpr - mw - 10;
        const oy = 10;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.roundRect(ox - 6, oy - 4, mw + 12, mh + 8, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        minimapPath.forEach((p, k2) => {
          const mx = ox + mw / 2 + p.x * ms;
          const my = oy + mh / 2 + p.y * ms;
          if (k2) ctx.lineTo(mx, my);
          else ctx.moveTo(mx, my);
        });
        ctx.stroke();
        const g = pointAt(c, c.finishP, c.width / 2);
        ctx.fillStyle = '#e53935';
        ctx.fillRect(ox + mw / 2 + g.x * ms - 1, oy + mh / 2 + g.y * ms - 4, 2, 8);
        for (const i of [...standings].reverse()) {
          const col = runnerColor(race, i);
          ctx.fillStyle = col.bg;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.arc(ox + mw / 2 + pos[i].x * ms, oy + mh / 2 + pos[i].y * ms, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      // 実況
      const remain = L - leadD;
      const top3 = standings.slice(0, 3).map(who).join('、');
      if (t >= 0) {
        if (race.kind === 'horse') {
          say('start', 'ゲートが開いて、各馬いっせいにスタートしました！');
          if (leadD > 250) say('early', `先行争い。先頭は ${who(lead)}、続いて ${standings.slice(1, 3).map(who).join('、')}`);
          if (leadD > L * 0.5 && L >= 1400) say('half', `半分を通過。先頭は ${who(lead)}、${top3} の順`);
          const inStretch = remain < c.finishP + 2 && remain > 0;
          if (inStretch) say('stretch', `最後の直線に入りました！ 先頭は ${who(lead)}！`);
          if (remain < 200 && remain > 0) say('200', `残り200！ ${who(lead)} 先頭、${who(standings[1])} が迫る！`);
        } else if (race.kind === 'keirin') {
          say('start', '号砲一発、スタートしました。誘導員の後ろに並びます');
          if (leadD > 150) {
            const lineup = standings.map((i) => race.runners[i].no).join(' ');
            say('lineup', `周回の並びは 前から ${lineup}`);
          }
          if (bellAt >= 0) say('bell', '打鐘！ ジャンが鳴りました！ 残り1周半');
          if (remain < 400 && remain > 0) say('home', `最終ホーム！ 先頭は ${who(lead)}`);
          if (remain < 220 && remain > 0) say('back', `最終バック！ ${who(lead)} 先頭、${who(standings[1])} が番手から！`);
          if (remain < 80 && remain > 0) say('4c', `4コーナーを回って直線！ ${top3}`);
        } else {
          if (t > 0.4) {
            const best = race.runners.map((r) => r.index).sort((a, b) => motion.st[a] - motion.st[b])[0];
            say('start', `スタート！ ${who(best)} トップスタート（ST .${String(Math.round(motion.st[best] * 100)).padStart(2, '0')}）`);
          }
          const firstTurn = c.straight - c.finishP + Math.PI * c.radius + 15;
          if (leadD > firstTurn) say('1M', `1周1マーク、${who(lead)} が先頭に立ちました。2番手 ${who(standings[1])}`);
          for (let lap = 2; lap <= (race.laps ?? 3); lap++) {
            if (leadD > (lap - 1) * c.circumference) say(`lap${lap}`, lap === race.laps ? `最終周回！ 先頭 ${who(lead)}` : `${lap}周目、${top3}`);
          }
        }
      }
      if (t >= motion.finish[order[0]]) {
        const msg =
          race.kind === 'boat'
            ? `${who(order[0])} 1着でゴール！ 2着 ${who(order[1])}、3着 ${who(order[2])}`
            : `${who(order[0])} ゴールイン！ 2着 ${who(order[1])}、3着 ${who(order[2])}`;
        say('goal', msg);
      }

      hudClock += dtReal;
      if (hudClock > 0.15) {
        hudClock = 0;
        let remainText = '';
        if (t < 0) remainText = race.kind === 'boat' ? '待機行動' : 'スタート前';
        else if (remain > 0) {
          if (race.kind === 'horse') remainText = `残り ${Math.ceil(remain / 100) * 100}m`;
          else {
            const laps = Math.max(1, Math.round(remain / c.circumference));
            remainText = laps <= 1 ? '最終周回' : `残り${laps}周`;
          }
        } else remainText = 'ゴール';
        setHud({
          clock: raceTime(Math.max(0, Math.min(t, motion.finish[order[0]]))),
          remain: remainText,
          standings,
          bell: race.kind === 'keirin' && bellAt >= 0 && t - bellAt < 4 * speedRef.current && remain > 0,
        });
      }

      if (t > lastFinish + 2 && !finished) {
        finished = true;
        doneRef.current();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [race, motion, order]);

  const cfg = RACES[race.kind];
  return (
    <div className="race-view">
      <div className="race-screen" ref={wrapRef}>
        <canvas ref={canvasRef} />
        <div className="race-hud">
          <b>{race.venue} {race.no}R</b> {race.name}　{race.surface ?? ''}{race.distance}m
          <span className="race-clock">{hud.clock}</span>
          <span className="race-remain">{hud.remain}</span>
        </div>
        {hud.bell && <div className="race-bell">🔔 打鐘</div>}
        <div className="race-calls">
          {calls.slice(0, 2).map((c, k) => (
            <div key={c.key} className={k === 0 ? 'now' : 'prev'}>{c.text}</div>
          ))}
        </div>
      </div>
      <div className="race-strip">
        <span className="muted">{hud.remain === 'ゴール' ? '入線順' : '通過順'}</span>
        {hud.standings.map((i, k) => {
          const col = NUMBER_COLORS[race.runners[i].no - 1] ?? NUMBER_COLORS[0];
          return (
            <span key={i} className="strip-item">
              <small>{k + 1}</small>
              <span className="badge" style={race.kind === 'horse' ? undefined : { background: col.bg, color: col.fg }}>
                {race.runners[i].no}
              </span>
            </span>
          );
        })}
      </div>
      <div className="row race-controls">
        <span className="muted">速さ</span>
        {SPEEDS.map((s) => (
          <button key={s} className={`btn small${s === speed ? ' on' : ''}`} onClick={() => setSpeed(s)}>
            ×{s}
          </button>
        ))}
        <button className={`btn small${overview ? ' on' : ''}`} onClick={() => setOverview(!overview)}>
          {overview ? '中継に戻す' : 'コース全体を見る'}
        </button>
        <button className="btn small" onClick={() => (skipRef.current = true)}>結果まで飛ばす</button>
        <span className="muted">{cfg.icon} 実際の時計で再生すると ×1</span>
      </div>
    </div>
  );
}
