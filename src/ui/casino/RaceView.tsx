// レース映像：3Dのレース場を中継カメラのように追いかけて映す。実況（声つき）、残り距離、通過順、全体図つき
import { useEffect, useRef, useState } from 'react';
import { NUMBER_COLORS, RACES } from '../../economy/race';
import type { Race } from '../../economy/race';
import { PACK, Packer, courseP, distanceAt, pointAt, raceTime } from '../../economy/raceMotion';
import type { Motion } from '../../economy/raceMotion';
import { speak, stopSpeaking } from './voice';
import { Race3D } from './three/Race3D';
import type { RaceSim } from './three/Race3D';

export function runnerColor(race: Race, i: number) {
  const r = race.runners[i];
  // 競馬は帽子の色＝枠の色、競輪・ボートは車番・艇番の色
  return NUMBER_COLORS[(race.kind === 'horse' ? r.frame : r.no) - 1] ?? NUMBER_COLORS[0];
}

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
  const miniRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(300);
  const viewRef = useRef<HTMLDivElement>(null);
  // 全画面：スマホではレースが始まると自動で全画面になり、ゴールのあと結果を見せるときに戻る
  const [full, setFull] = useState(() => typeof window !== 'undefined' && (window.innerWidth < 700 || window.innerHeight < 500));
  const fullRef = useRef(full);
  fullRef.current = full;
  const sim = useRef<RaceSim>({ t: -PRE, dist: race.runners.map(() => 0), lat: race.runners.map(() => 0), standings: [], overview: false, pacer: null });
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
    const c = motion.course;
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
    let t = -PRE;
    let last = performance.now();
    let raf = 0;
    let finished = false;
    const pacer = { d: 0, lat: 0.55, leaving: false, alpha: 1 };
    let bellAt = -1;
    let hudClock = 0;
    const said = new Set<string>();
    const say = (key: string, text: string) => {
      if (said.has(key)) return;
      said.add(key);
      setCalls((cs) => [{ text, key: performance.now() + Math.random() }, ...cs].slice(0, 3));
      // 実況アナウンサーの声（速めに、ゴールは少し高く）
      speak(text, { rate: 1.3, pitch: key === 'goal' ? 1.2 : 1.05, interrupt: key === 'goal' });
    };
    const name = (i: number) => `${race.runners[i].no}番${race.kind === 'horse' ? race.runners[i].name : race.runners[i].name.split(' ')[0]}`;
    const boatName = (i: number) => `${race.runners[i].no}号艇`;
    const who = race.kind === 'boat' ? boatName : name;

    const resize = () => {
      const w = wrapRef.current!.clientWidth;
      setHeight(Math.round(Math.min(440, Math.max(230, w * (w < 560 ? 0.68 : 0.52)))));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapRef.current!);

    const distAt = (i: number, tt: number) => {
      if (tt >= 0) return distanceAt(motion, i, tt);
      if (race.kind === 'boat') return distanceAt(motion, i, 0) + 16 * tt; // 助走してからスタートラインを通る
      return 0;
    };

    // 全体図（右上の小さなコース図）
    const mini = miniRef.current!;
    const mctx = mini.getContext('2d')!;
    const span = c.straight + 2 * (c.radius + c.width);
    const MW = 132;
    const ms = MW / span;
    const MH = Math.round(2 * (c.radius + c.width) * ms + 8);
    const mdpr = Math.min(window.devicePixelRatio || 1, 2);
    mini.width = (MW + 12) * mdpr;
    mini.height = (MH + 8) * mdpr;
    mini.style.width = `${MW + 12}px`;
    mini.style.height = `${MH + 8}px`;
    const minimapPath: { x: number; y: number }[] = [];
    for (let p = 0; p <= c.circumference + 8; p += 8) minimapPath.push(pointAt(c, p, c.width / 2));
    const drawMini = (pos: { x: number; y: number }[], standings: number[]) => {
      mctx.setTransform(mdpr, 0, 0, mdpr, 0, 0);
      mctx.clearRect(0, 0, MW + 12, MH + 8);
      mctx.fillStyle = 'rgba(0,0,0,0.5)';
      mctx.beginPath();
      mctx.roundRect(0, 0, MW + 12, MH + 8, 6);
      mctx.fill();
      const ox = 6 + MW / 2;
      const oy = 4 + MH / 2;
      mctx.strokeStyle = 'rgba(255,255,255,0.75)';
      mctx.lineWidth = 2;
      mctx.beginPath();
      minimapPath.forEach((p, k) => (k ? mctx.lineTo(ox + p.x * ms, oy + p.y * ms) : mctx.moveTo(ox + p.x * ms, oy + p.y * ms)));
      mctx.stroke();
      const g = pointAt(c, c.finishP, c.width / 2);
      mctx.fillStyle = '#e53935';
      mctx.fillRect(ox + g.x * ms - 1, oy + g.y * ms - 4, 2, 8);
      for (const i of [...standings].reverse()) {
        mctx.fillStyle = runnerColor(race, i).bg;
        mctx.strokeStyle = '#000';
        mctx.lineWidth = 0.6;
        mctx.beginPath();
        mctx.arc(ox + pos[i].x * ms, oy + pos[i].y * ms, 3, 0, Math.PI * 2);
        mctx.fill();
        mctx.stroke();
      }
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

      sim.current = {
        t,
        dist,
        lat: [...lat],
        standings,
        overview: overviewRef.current,
        pacer: race.kind === 'keirin' ? { d: pacer.d, lat: pacer.lat, alpha: pacer.alpha } : null,
      };
      drawMini(pos, standings);

      // 実況
      const remain = L - leadD;
      const top3 = standings.slice(0, 3).map(who).join('、');
      if (t >= 0) {
        if (race.kind === 'horse') {
          say('start', 'ゲートが開いて、各馬いっせいにスタートしました！');
          if (leadD > 250) say('early', `先行争い。先頭は ${who(lead)}、続いて ${standings.slice(1, 3).map(who).join('、')}`);
          if (leadD > L * 0.5 && L >= 1400) say('half', `半分を通過。先頭は ${who(lead)}、続いて ${standings.slice(1, 3).map(who).join('、')}`);
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
        if (fullRef.current) setFull(false);
        doneRef.current();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      stopSpeaking();
    };
  }, [race, motion, order]);

  // 使える端末では本物の全画面（ブラウザの枠も消える）。iPhone は画面いっぱいに広げて代わりにする
  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
    const fe = el as unknown as { requestFullscreen?: () => Promise<void>; webkitRequestFullscreen?: () => Promise<void> };
    const req = fe.requestFullscreen ?? fe.webkitRequestFullscreen;
    const current = doc.fullscreenElement ?? doc.webkitFullscreenElement;
    if (full && !current && req) {
      Promise.resolve()
        .then(() => req.call(el))
        .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.('landscape'))
        .catch(() => undefined);
    } else if (!full && current === el) {
      (doc.exitFullscreen ?? doc.webkitExitFullscreen)?.call(doc);
    }
    const onChange = () => {
      if (!(doc.fullscreenElement ?? doc.webkitFullscreenElement) && fullRef.current && req) setFull(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, [full]);
  useEffect(
    () => () => {
      const doc = document as Document & { webkitFullscreenElement?: Element };
      if ((doc.fullscreenElement ?? doc.webkitFullscreenElement) === viewRef.current) void document.exitFullscreen?.().catch(() => undefined);
    },
    [],
  );

  const cfg = RACES[race.kind];
  return (
    <div className={`race-view${full ? ' full' : ''}`} ref={viewRef}>
      <div className="race-hud">
        <b>{race.venue} {race.no}R</b>
        <span className="race-title">{race.name}　{race.surface ?? ''}{race.distance}m</span>
        <span className="race-clock">{hud.clock}</span>
        <span className="race-remain">{hud.remain}</span>
      </div>
      <div className="race-screen" ref={wrapRef}>
        <Race3D race={race} course={motion.course} sim={sim} height={full ? '100%' : height} />
        <button className="race-full-btn" onClick={() => setFull(!full)} aria-label={full ? '全画面をやめる' : '全画面で見る'}>
          {full ? '✕ 戻る' : '⛶ 全画面'}
        </button>
        <canvas className="race-mini" ref={miniRef} aria-hidden />
        {hud.bell && <div className="race-bell">🔔 打鐘</div>}
      </div>
      <div className="race-calls" aria-live="polite">
        {calls.slice(0, 2).map((c, k) => (
          <div key={c.key} className={k === 0 ? 'now' : 'prev'}>{c.text}</div>
        ))}
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
