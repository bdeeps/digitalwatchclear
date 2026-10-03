// DigitalWatchClear's shared parts: the counters that keep time and date, the seven-segment
// decoder, the liquid-crystal and power sums, drawing helpers, and a generic LCD wristwatch in 3D
// (no maker's design or logo).
//
// Sources for the numbers
//  - Crystal: 32,768 Hz = 2^15, divided by fifteen flip-flops to 1 Hz. The crystal and divider are
//    QuartzClear's subject (https://glassbox.how/quartzclear/); here they are only recapped.
//  - Accuracy: ±30 seconds a month is the usual factory figure for a plain digital watch
//    (Casio module 593 operation guide, the F-91W). 30 s in 30 days is 11.6 parts per million.
//  - Cell: CR2016 lithium coin cell, 3 V, 90 mAh; CR2025 about 160 mAh; CR2032 235 mAh; self-discharge
//    about 1% a year (Energizer data sheets).
//  - Battery life: "approx. 7 years on type CR2016, assuming alarm operation 20 s a day and one light
//    operation of 1 s a day" (Casio module 593 operation guide). 90 mAh over 7 years is an average of
//    1.47 µA. Our split of that average (below) is an estimate that adds up to the maker's figure.
//  - Beeper: piezo sounders in watches are driven at 2,048 or 4,096 Hz straight from the divider,
//    through a step-up coil (US patent 4,526,477, "Piezoelectric buzzer for wrist watches").
//  - LCD: twisted nematic between crossed polarisers (Schadt and Helfrich, Appl. Phys. Lett. 18, 127,
//    1971). Early mixtures: threshold 0.9 V rms, 90% of full darkness at 1.4 V rms (Wikipedia,
//    "Twisted nematic field effect"). Microchip's AN658 "LCD Fundamentals" quotes a threshold near
//    1.7 V rms for a multiplexed display, a frame frequency of 25 to 300 Hz (40 to 70 Hz is usual) and
//    the rule that the drive must average to zero volts. We use 1.2 V and 2.0 V as a typical pair.
//  - LCD speed: a TN segment display data sheet gives rise times of about 230 ms at 25 °C and about
//    1,050 ms at 0 °C (typical values; they differ from one mixture to the next). That is a doubling
//    for every 11.4 °C of cooling, which we extend to −20 °C.
//  - Smartwatch: Apple Watch Series 9 (45 mm): 308 mAh, "up to 18 hours" (Apple; everymac.com specs).
//  - 1970s LED watch: several tens of milliamps while the digits are lit (collectors' measurements).
import { THREE, M, box, canvasTexture, spring, clamp, smooth } from './kit.js';

export { clamp };
export const TAU = Math.PI * 2;

// ------------------------------------------------------------------ colours
export const COL = { one: '#ffd166', zero: '#262c38', carry: '#ff7a59', cool: '#8ef0ff', good: '#7be08c', bad: '#ff5a8a', soft: 'rgba(255,255,255,.62)', grid: 'rgba(255,255,255,.1)', lcd: '#b4bea0', seg: '#161a14', ghost: 'rgba(22,26,20,.07)' };
export const HEX = { one: 0xffd166, carry: 0xff7a59, cool: 0x8ef0ff, good: 0x7be08c, lcd: 0xb4bea0, seg: 0x161a14, pcb: 0x1f6b45, copper: 0xd9b36c };

// ------------------------------------------------------------------ the time base (recap of QuartzClear)
export const F_XTAL = 32768;
export const STAGES = 15;                                   // 2^15 = 32,768
export const hzAt = (k) => F_XTAL / 2 ** k;                 // frequency after k halvings
export const SEC_PER_DAY_PER_PPM = 0.0864;                  // 1 part in a million of a day
// Where a watch chip taps the chain. 4,096 Hz for the beeper is from the buzzer patent above; the
// 32 Hz display flip is a typical choice inside the 25 to 300 Hz range, not one chip's data.
export const TAPS = { 3: 'the beeper', 10: 'the display', 15: 'the seconds counter' };

// ------------------------------------------------------------------ the counters
// A watch chip does not know "the time". It has a row of small counters. Each counts the carries
// of the one before it, rolls over at its own limit and passes one carry on.
export const DOW = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// The full Gregorian rule. Between 2000 and 2099 it is the same as "divisible by 4", which is all
// most watch chips store: they are built to be right until 28 February 2100.
export const isLeap = (y) => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
const DIM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
// knowsYear false: a simple watch with no year counter. It gives February 28 days every year
// (as the Casio F-91W does) and must be set by hand on each 29 February.
export const daysIn = (month, year, knowsYear = true) => (month === 2 && knowsYear && isLeap(year) ? 29 : DIM[month - 1]);
export const dowOf = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).getUTCDay();
// Carry flags, in the order the carry ripples.
export const CARRY = { s10: 1, min: 2, m10: 4, hour: 8, day: 16, month: 32, year: 64 };
export function makeClock(init = {}) {
  const c = { s: 50, m: 58, h: 10, date: 12, month: 10, year: 2026, knowsYear: true, ...init };
  c.dow = init.dow ?? dowOf(c.year, c.month, c.date);
  // One pulse from the divider. Returns which carries it set off.
  c.tick = () => {
    let f = 0;
    c.s++;
    if (c.s % 10 === 0) f |= CARRY.s10;
    if (c.s < 60) return f;
    c.s = 0; f |= CARRY.min; c.m++;
    if (c.m % 10 === 0) f |= CARRY.m10;
    if (c.m < 60) return f;
    c.m = 0; f |= CARRY.hour; c.h++;
    if (c.h < 24) return f;
    c.h = 0; f |= CARRY.day; c.dow = (c.dow + 1) % 7; c.date++;
    if (c.date <= daysIn(c.month, c.year, c.knowsYear)) return f;
    c.date = 1; f |= CARRY.month; c.month++;
    if (c.month <= 12) return f;
    c.month = 1; f |= CARRY.year; c.year++;
    return f;
  };
  c.set = (o) => { Object.assign(c, o); c.dow = o.dow ?? dowOf(c.year, c.month, c.date); };
  return c;
}
export const h12 = (h) => h % 12 || 12;
export const pad2 = (n) => String(n).padStart(2, '0');
export const timeStr = (c, h24) => `${h24 ? pad2(c.h) : h12(c.h)}:${pad2(c.m)}:${pad2(c.s)}${h24 ? '' : c.h >= 12 ? ' PM' : ' AM'}`;
export const dateStr = (c) => `${DOW[c.dow]} ${c.date} ${MONTHS[c.month - 1]} ${c.year}`;
export const bin = (n, bits) => (n >>> 0).toString(2).padStart(bits, '0');

// ------------------------------------------------------------------ seven segments
// Segments a (top), b (top right), c (bottom right), d (bottom), e (bottom left), f (top left),
// g (middle). The table is the common one (6 and 9 with tails, 7 without a hook), as on
// Wikipedia's "Seven-segment display" and in decoder chips such as the CD4511's relatives.
export const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', ' ': '' };
export const SEGS = 'abcdefg';
// Day letters need two more bars, h (upper middle) and i (lower middle), to draw M, T and W.
export const SEG9 = { S: 'acdfg', U: 'bcdef', M: 'abcefh', O: 'abcdef', T: 'ahi', W: 'bcdefi', E: 'adefg', H: 'bcefg', F: 'aefg', R: 'abcefg', A: 'abcefg', L: 'def' };
export const digitsUsing = (seg) => [...'0123456789'].filter((d) => SEG[d].includes(seg));
// Segments on our watch face: six time digits, two date digits, two nine-bar day letters, a colon
// and five flags (PM, 24H, alarm, chime, lap).
export const FACE_SEGMENTS = 6 * 7 + 2 * 7 + 2 * 9 + 1 + 5;       // 80
// Pins needed to drive n segments with b backplanes: each segment line serves b segments.
export const pinsFor = (n, b) => Math.ceil(n / b) + b;

// Each bar as a polygon in a w × h cell (x right, y down).
export function segPolys(w = 1, h = 2, t = 0.16) {
  const g = t / 2, m = h / 2;
  const H = (y, x0, x1) => [[x0 + g, y], [x0 + t, y - g], [x1 - t, y - g], [x1 - g, y], [x1 - t, y + g], [x0 + t, y + g]];
  const V = (x, y0, y1) => [[x, y0 + g], [x + g, y0 + t], [x + g, y1 - t], [x, y1 - g], [x - g, y1 - t], [x - g, y0 + t]];
  return { a: H(g, 0, w), g: H(m, 0, w), d: H(h - g, 0, w), f: V(g, 0, m), b: V(w - g, 0, m), e: V(g, m, h), c: V(w - g, m, h), h: V(w / 2, 0, m), i: V(w / 2, m, h) };
}
// Draw one character at (x, y), height hgt. `nine` adds the two middle bars used by day letters.
export function drawChar(g, ch, x, y, hgt, { on = COL.seg, off = COL.ghost, nine = false, slant = 0.06 } = {}) {
  const w = hgt * 0.5, P = segPolys(w, hgt, hgt * 0.115), lit = (nine ? SEG9[ch] : null) ?? SEG[ch] ?? '';
  for (const s of nine ? 'abcdefghi' : SEGS) {
    g.fillStyle = lit.includes(s) ? on : off; g.beginPath();
    P[s].forEach(([px, py], i) => { const X = x + px + (hgt - py) * slant, Y = y + py; i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
    g.closePath(); g.fill();
  }
}
// The watch face. d: { top, date, big, small, colon, pm, h24, alarm, chime, lap, light, on (0..1) }.
export function drawFace(g, W, H, d = {}) {
  const lit = d.light ? 1 : 0;
  g.fillStyle = lit ? '#d9d59a' : COL.lcd; g.fillRect(0, 0, W, H);
  const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, 'rgba(255,255,255,.16)'); grad.addColorStop(1, 'rgba(0,0,0,.1)'); g.fillStyle = grad; g.fillRect(0, 0, W, H);
  if (lit) { const gl = g.createRadialGradient(0, H * 0.5, 10, 0, H * 0.5, W * 0.8); gl.addColorStop(0, 'rgba(255,214,120,.75)'); gl.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = gl; g.fillRect(0, 0, W, H); }
  const k = d.on ?? 1, on = `rgba(22,26,20,${0.07 + 0.9 * k})`, off = COL.ghost, u = W / 900;
  const flag = (t, x, y, v, px = 34) => { g.font = `bold ${px * u}px sans-serif`; g.fillStyle = v ? on : off; g.fillText(t, x * u, y * u); };
  const top = (d.top ?? '  ').padEnd(2);
  drawChar(g, top[0], 60 * u, 40 * u, 120 * u, { on, off, nine: true }); drawChar(g, top[1], 140 * u, 40 * u, 120 * u, { on, off, nine: true });
  const dt = d.date == null ? '  ' : String(d.date).padStart(2, ' ');
  drawChar(g, dt[0], 690 * u, 40 * u, 120 * u, { on, off }); drawChar(g, dt[1], 770 * u, 40 * u, 120 * u, { on, off });
  flag('ALM', 300, 110, d.alarm); flag('SIG', 410, 110, d.chime); flag('LAP', 510, 110, d.lap);
  flag('PM', 22, 300, d.pm, 38); flag('24H', 16, 360, d.h24, 34);
  const big = (d.big ?? '    ').padStart(4, ' ');
  [96, 228, 420, 552].forEach((x, i) => drawChar(g, big[i], x * u, 250 * u, 230 * u, { on, off }));
  g.fillStyle = d.colon === false ? off : on;
  for (const [cx, cy] of [[392, 325], [386, 415]]) { g.beginPath(); g.arc(cx * u, cy * u, 14 * u, 0, TAU); g.fill(); }
  const sm = (d.small ?? '  ').padStart(2, ' ');
  drawChar(g, sm[0], 704 * u, 340 * u, 140 * u, { on, off }); drawChar(g, sm[1], 786 * u, 340 * u, 140 * u, { on, off });
  g.strokeStyle = 'rgba(22,26,20,.35)'; g.lineWidth = 3 * u; g.beginPath(); g.moveTo(40 * u, 200 * u); g.lineTo(860 * u, 200 * u); g.stroke();
}
// What the face shows in plain timekeeping.
export const faceOf = (c, h24, extra = {}) => ({ top: DOW[c.dow], date: c.date, big: (h24 ? pad2(c.h) : String(h12(c.h)).padStart(2, ' ')) + pad2(c.m), small: pad2(c.s), pm: !h24 && c.h >= 12, h24, ...extra });

// ------------------------------------------------------------------ liquid crystal
export const LC = { vth: 1.2, vsat: 2.0, gapUm: 8, eps: 8, flipHz: 64, rOff: 0.35, rOn: 0.035, t25: 230, dbl: 11.4 };
// How far the molecules in the middle of the layer have stood up (0 flat and twisted, 1 upright).
export const standUp = (V) => smooth((Math.abs(V) - LC.vth) / (LC.vsat - LC.vth));
// Light that gets through the crossed back polariser: the twist still guides it (Malus's law on
// what is left of the 90° turn).
export const through = (up) => Math.sin((Math.PI / 2) * (1 - up)) ** 2;
// Share of the room light that comes back out of the display. The light crosses the layer twice
// (down to the reflector and back), so the twist has to work on both passes. A clear segment
// returns about a third of the light and a dark one a few percent: typical for a reflective TN
// display, where the two polarisers alone absorb more than half.
export const reflectance = (up) => LC.rOn + (LC.rOff - LC.rOn) * through(up) ** 2;
// Time for a segment to change, in ms, against temperature.
export const responseMs = (T) => LC.t25 * 2 ** ((25 - T) / LC.dbl);
// A segment is a tiny capacitor: C = ε0 εr A / d. Flipping the voltage moves charge 2CV each time.
export const segCapPF = (mm2) => (8.854e-12 * LC.eps * mm2 * 1e-6) / (LC.gapUm * 1e-6) * 1e12;
export const segCurrentNA = (mm2, V = 3) => segCapPF(mm2) * 1e-12 * 2 * V * LC.flipHz * 1e9;

// ------------------------------------------------------------------ power
export const CELLS = { cr2016: { name: 'CR2016', mAh: 90, mm: 1.6 }, cr2025: { name: 'CR2025', mAh: 160, mm: 2.5 }, cr2032: { name: 'CR2032', mAh: 235, mm: 3.2 } };
// Estimates chosen to add up to the maker's "7 years on a CR2016 with 20 s of alarm and 1 s of
// light a day": chip, crystal and display 1.0 µA all the time; beeper 1 mA and lamp 5 mA while on.
export const DRAW = { baseUA: 1.0, beepMA: 1, lightMA: 5, selfPct: 1 };
export function budget(cell, beepS, lightS) {
  const c = CELLS[cell], beep = (DRAW.beepMA * 1000 * beepS) / 86400, light = (DRAW.lightMA * 1000 * lightS) / 86400;
  const self = (c.mAh * 1000 * DRAW.selfPct) / 100 / 8766;                 // µA lost inside the cell
  const use = DRAW.baseUA + beep + light;
  return { base: DRAW.baseUA, beep, light, self, use, years: (c.mAh * 1000) / ((use + self) * 8766) };
}
export const WATCH_UW = 1.47 * 3;                                           // µW, from the maker's 7 years
export const LED_WATCH_MW = 30 * 3;                                         // about 30 mA at 3 V while lit
export const SMART_MW = (308 * 3.85) / 18;                                  // 308 mAh at 3.85 V in 18 h: 66 mW

// ------------------------------------------------------------------ canvas boards
export function panelBg(g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,18,.92)'; g.fillRect(0, 0, w, h); }
export function text(g, s, x, y, { font = '20px sans-serif', col = 'rgba(255,255,255,.82)', align = 'left' } = {}) { g.font = font; g.fillStyle = col; g.textAlign = align; g.fillText(s, x, y); g.textAlign = 'left'; }
export const mono = (px, bold = false) => `${bold ? 'bold ' : ''}${px}px ui-monospace, "Geist Mono", Menlo, monospace`;
export function board(root, w, h, pxW, pxH, draw, pos) {
  const b = canvasTexture(pxW, pxH, draw);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: b.tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  m.position.set(...pos); root.add(m);
  return { ...b, mesh: m };
}
export function bitBoxes(g, bits, x, y, sz, gap = 6) {
  [...bits].forEach((b, i) => {
    g.fillStyle = b === '1' ? COL.one : COL.zero; g.fillRect(x + i * (sz + gap), y, sz, sz);
    text(g, b, x + i * (sz + gap) + sz / 2, y + sz * 0.74, { font: mono(sz * 0.66, true), col: b === '1' ? '#10131c' : 'rgba(255,255,255,.55)', align: 'center' });
  });
}

// ------------------------------------------------------------------ layout helpers for phones and the reel
export const inReel = () => document.body.classList.contains('gb-reel');
// Tall stage (the 1080 × 1920 reel): stack things instead of placing them side by side. A phone's
// stage is only a little taller than wide, and the readout covers its top, so it keeps the wide layout.
export const isTall = (stage) => stage.host.clientHeight > stage.host.clientWidth * 1.4;
export function fitNarrow(stage, minor = [], y0 = -0.14, view = null) {
  const narrow = stage.host.clientWidth < 560 && !inReel();
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const y = narrow ? y0 : 0;
  if (!stage.shift || stage.shift[1] !== y) stage.setShift(0, y);
  if (narrow && view && !stage.moved && stage.home && stage.home.pos !== view.pos) stage.setView(view.pos, view.target, 0.5);
  return narrow;
}
// In the tall reel the stacked layout needs its own, closer camera. The shell sets the chapter's (or
// the scene's) view first, so this puts ours back whenever it finds another one in place.
export function fitTall(stage, view) {
  if (inReel() && isTall(stage) && stage.home && stage.home.pos !== view.pos) stage.setView(view.pos, view.target, 0.01);
}
// Phones get a shorter readout: the first three rows, and no small print.
export function slim(stage, html) {
  if (stage.host.clientWidth >= 560) return html;
  let n = 0;
  return html.replace(/<small>[\s\S]*?<\/small>/g, '').replace(/<div class="row">[\s\S]*?<\/div>/g, (m) => (++n > 3 ? '' : m));
}

// ------------------------------------------------------------------ small 3D helpers
export function lamp(parent, pos, r = 0.2) {
  const off = M.plastic(0x2a2f3b, { roughness: 0.4 }), on = M.glow(HEX.one);
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), off); m.position.set(...pos); parent.add(m);
  let v = -1;
  m.set = (x, col) => { if (col) on.color.set(col); const k = x ? 1 : 0; if (k === v) return; v = k; m.material = k ? on : off; };
  m.set(0);
  return m;
}
function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
// A flat plate lying in XZ, with an optional rectangular hole [cx, cz, w, d]. Its bottom is at y = 0.
function plate(w, d, t, mat, { r = 0.8, hole = null, bevel = 0.05 } = {}) {
  const s = roundedRect(w, d, r);
  if (hole) { const [cx, cz, hw, hd] = hole; const p = roundedRect(hw, hd, Math.min(0.25, hw / 4)); const pts = p.getPoints(6).map((v) => new THREE.Vector2(v.x + cx, v.y - cz)).reverse(); s.holes.push(new THREE.Path(pts)); }
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 10 });
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true;
  return m;
}
const ycyl = (r, h, mat, seg = 40) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat); m.castShadow = m.receiveShadow = true; return m; };

// ------------------------------------------------------------------ the watch
// 1 unit = 4 mm. The watch lies on its back: the face looks up (+Y), 12 o'clock is towards −Z.
// A 36 × 38 mm resin case 9 mm thick, a 20 mm coin cell, a 26 × 15 mm display. Typical sizes of a
// plain LCD watch; the shape is our own.
export const BUTTONS = { light: { x: -1, z: -1.7, name: 'Light' }, mode: { x: -1, z: 1.7, name: 'Mode' }, start: { x: 1, z: -1.7, name: 'Start/Stop' }, reset: { x: 1, z: 1.7, name: 'Reset' } };
export function makeWatch({ strap = 3.0 } = {}) {
  const group = new THREE.Group();
  const steel = M.metal(0xc9ced6, { roughness: 0.3 });
  // ---- steel back with the piezo disc glued inside it
  const back = new THREE.Group(); group.add(back);
  back.add(plate(8.3, 8.9, 0.12, steel, { r: 1.2, bevel: 0.03 }));
  [[-3.5, -3.8], [3.5, -3.8], [-3.5, 3.8], [3.5, 3.8]].forEach(([x, z]) => { const s = ycyl(0.2, 0.06, M.metal(0x8d939e)); s.position.set(x, 0.0, z); back.add(s); });
  const piezo = new THREE.Group(); piezo.position.set(0.5, 0.17, 0); back.add(piezo);
  const brass = ycyl(2.7, 0.04, M.metal(0xd8b25a, { roughness: 0.35 })); piezo.add(brass);
  const ceramic = ycyl(2.0, 0.04, M.matte(0xe9e6dc)); ceramic.position.y = 0.04; piezo.add(ceramic);
  // ---- coin cell
  const cell = new THREE.Group(); cell.position.set(-0.6, 0.68, 0.2); group.add(cell);
  cell.add(ycyl(2.5, 0.4, M.metal(0xaab1bd, { roughness: 0.3 }), 56));
  const neg = ycyl(2.1, 0.03, M.metal(0xaeb4bf)); neg.position.y = -0.21; cell.add(neg);
  const stamp = canvasTexture(256, 256, (g, W, H) => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(60,66,78,.9)'; g.font = 'bold 44px sans-serif'; g.textAlign = 'center'; g.fillText('+', W / 2, 78); g.fillText('3 V', W / 2, 150); g.font = '28px sans-serif'; g.fillText('lithium', W / 2, 196); });
  const st = new THREE.Mesh(new THREE.CircleGeometry(2.2, 40), new THREE.MeshBasicMaterial({ map: stamp.tex, transparent: true })); st.rotation.x = -Math.PI / 2; st.position.y = 0.205; cell.add(st);
  // ---- module: plastic frame, circuit board, chip under epoxy, crystal, trimmer, lamp, spring
  const module = new THREE.Group(); module.position.y = 1.0; group.add(module);
  const frameMat = M.plastic(0xd9d6cc, { roughness: 0.6 });
  for (const [w, d, x, z] of [[7.7, 0.22, 0, -3.95], [7.7, 0.22, 0, 3.95], [0.22, 7.7, -3.75, 0], [0.22, 7.7, 3.75, 0]]) { const b = box(w, 0.9, d, frameMat); b.position.set(x, -0.2, z); module.add(b); }
  const pcbTex = canvasTexture(730, 760, (g, W, H) => {
    g.fillStyle = '#1f6b45'; g.fillRect(0, 0, W, H);
    const X = (x) => ((x + 3.65) / 7.3) * W, Z = (z) => ((z + 3.8) / 7.6) * H;
    g.strokeStyle = '#d9b36c'; g.lineWidth = 3;
    for (let i = 0; i < 22; i++) {                                    // tracks from the chip to both rows of pads
      const px = X(-2.75 + i * 0.262);
      for (const zz of [-2.05, 2.05]) { g.beginPath(); g.moveTo(px, Z(zz)); g.lineTo(px, Z(zz * 0.62)); g.lineTo(X(-0.6 + (i - 10.5) * 0.06), Z(0.3 + Math.sign(zz) * 0.6)); g.stroke(); }
    }
    g.fillStyle = '#e6c27a';
    for (let i = 0; i < 22; i++) for (const zz of [-2.05, 2.05]) g.fillRect(X(-2.75 + i * 0.262) - 6, Z(zz) - 16, 12, 32);
    g.lineWidth = 5; g.beginPath(); g.moveTo(X(2.6), Z(0.0)); g.lineTo(X(1.2), Z(0.3)); g.lineTo(X(0.2), Z(0.3)); g.moveTo(X(2.6), Z(1.3)); g.lineTo(X(1.2), Z(0.7)); g.lineTo(X(0.2), Z(0.6)); g.stroke();
    g.beginPath(); g.moveTo(X(-3.2), Z(-0.5)); g.lineTo(X(-1.6), Z(0.1)); g.stroke();
  });
  const green = M.plastic(0x1f6b45);
  const pcb = box(7.3, 0.14, 7.6, [green, green, new THREE.MeshStandardMaterial({ map: pcbTex.tex, roughness: 0.6 }), green, green, green]); module.add(pcb);
  const blob = new THREE.Mesh(new THREE.SphereGeometry(0.95, 32, 16, 0, TAU, 0, Math.PI / 2), M.plastic(0x0b0c0f, { roughness: 0.22 })); blob.scale.y = 0.3; blob.position.set(-0.6, 0.07, 0.3); module.add(blob);
  const xtal = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 1.5, 20), steel); xtal.rotation.x = Math.PI / 2; xtal.position.set(2.75, 0.27, 0.65); xtal.castShadow = true; module.add(xtal);
  const trimmer = ycyl(0.3, 0.2, M.metal(0xd8b25a, { roughness: 0.4 }), 20); trimmer.position.set(2.75, 0.17, -0.85); module.add(trimmer);
  const slot = box(0.42, 0.03, 0.07, M.matte(0x3a3222)); slot.position.set(2.75, 0.28, -0.85); module.add(slot);
  const ledMat = new THREE.MeshStandardMaterial({ color: 0xf2d9a0, roughness: 0.3, emissive: 0xffb030, emissiveIntensity: 0 });
  const led = box(0.3, 0.26, 0.5, ledMat); led.position.set(-3.3, 0.2, -0.5); module.add(led);
  const sp = spring(-0.82, -0.1, 0.16, 0.035, 5, M.metal(0xd8b25a)); sp.rotation.z = Math.PI / 2; sp.position.set(2.95, 0, -2.6); module.add(sp);
  const leaves = {};
  for (const [k, b] of Object.entries(BUTTONS)) { const lf = box(0.05, 0.5, 0.7, M.metal(0xd8b25a, { roughness: 0.35 })); lf.position.set(b.x * 3.52, 0.1, b.z); module.add(lf); leaves[k] = lf; }
  // ---- zebra strips: rubber with thin conducting layers, squeezed between the board and the glass
  const zebraTex = canvasTexture(512, 32, (g, W, H) => { g.fillStyle = '#e9b9c2'; g.fillRect(0, 0, W, H); g.fillStyle = '#2b2326'; for (let x = 0; x < W; x += 8) g.fillRect(x, 0, 3, H); });
  zebraTex.tex.wrapS = THREE.RepeatWrapping;
  const zMat = new THREE.MeshStandardMaterial({ map: zebraTex.tex, roughness: 0.8 });
  const zebra = new THREE.Group(); zebra.position.y = 1.28; group.add(zebra);
  [-2.05, 2.05].forEach((z) => { const zb = box(5.9, 0.42, 0.3, zMat); zb.position.z = z; zebra.add(zb); });
  // ---- LCD glass
  const lcd = new THREE.Group(); lcd.position.y = 1.62; group.add(lcd);
  const glass = box(6.6, 0.26, 4.7, M.plastic(0x9aa58a, { roughness: 0.25, transparent: true, opacity: 0.92 })); lcd.add(glass);
  const screen = canvasTexture(900, 540, (g, W, H, d) => drawFace(g, W, H, d));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(6.3, 3.78), new THREE.MeshBasicMaterial({ map: screen.tex, toneMapped: false }));
  face.rotation.x = -Math.PI / 2; face.position.y = 0.17; lcd.add(face);
  // ---- resin case with a window, lugs and strap
  const caseMat = M.plastic(0x23262d, { roughness: 0.55, transparent: true, opacity: 1 });
  const body = new THREE.Group(); body.position.y = 0.12; group.add(body);
  body.add(plate(9.0, 9.6, 1.85, caseMat, { r: 1.5, hole: [0, 0, 7.9, 8.1] }));
  const bezel = plate(9.0, 9.6, 0.3, caseMat, { r: 1.5, hole: [0, 0, 6.34, 3.84] }); bezel.position.y = 1.9; body.add(bezel);
  if (strap) for (const sgn of [-1, 1]) {
    const lug = box(5.6, 1.1, 0.9, caseMat); lug.position.set(0, 0.75, sgn * 5.0); body.add(lug);
    const band = box(5.2, 0.34, strap, caseMat); band.position.set(0, 0.35, sgn * (5.1 + strap / 2)); band.rotation.x = sgn * 0.28; body.add(band);
    for (let i = 0; i < Math.floor(strap / 1.0); i++) { const hole = ycyl(0.22, 0.36, M.matte(0x0c0d10), 14); hole.position.set(0, 0, sgn * (-strap / 2 + 0.9 + i * 0.9)); band.add(hole); }
  }
  const crystal = box(6.5, 0.1, 4.0, M.clear(0xdfeaf5, 0.07, { roughness: 0.7, envMapIntensity: 0 })); crystal.position.y = 2.3; group.add(crystal);
  // ---- four push buttons: steel plungers that press the spring contacts on the module
  const buttons = {}, btnMat = M.metal(0xd6dae2, { roughness: 0.25 });
  for (const [k, b] of Object.entries(BUTTONS)) {
    const g = new THREE.Group(); g.position.set(b.x * 4.3, 1.1, b.z); group.add(g);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.3, 20), btnMat); m.rotation.z = Math.PI / 2; m.castShadow = true; m.userData.btn = k; g.add(m);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.25, 20), btnMat); cap.rotation.z = Math.PI / 2; cap.position.x = b.x * 0.62; cap.userData.btn = k; g.add(cap);
    buttons[k] = { g, m, cap, home: b.x * 4.3, dir: b.x, down: 0 };
  }
  const press = (k, v) => { const b = buttons[k]; if (!b) return; b.down = v; };
  const settle = () => { for (const k in buttons) { const b = buttons[k]; b.g.position.x = b.home - b.dir * 0.22 * b.down; } };
  const setLight = (v) => { ledMat.emissiveIntensity = v ? 2.2 : 0; };
  const pickables = () => Object.values(buttons).flatMap((b) => [b.m, b.cap]);
  return { group, back, piezo, cell, module, pcb, blob, xtal, trimmer, led, sp, leaves, zebra, lcd, glass, screen, body, caseMat, crystal, buttons, press, settle, setLight, pickables };
}
