// Chapter 4: seven segments. A decoder turns the four BCD bits of a digit into seven on/off
// signals, a to g. Then: how a chip with a few dozen pins drives 80 segments.
//  - The table is the standard one (Wikipedia, "Seven-segment display"; 6 and 9 drawn with tails).
//  - Static drive: one pin per segment plus one shared backplane. Multiplexed drive: the segments
//    are split between 2, 3 or 4 backplanes that take turns, so each segment pin serves that many
//    segments: pins = ceil(segments / backplanes) + backplanes (Microchip AN658, "LCD Fundamentals").
//  - Our watch face has 80 segments (dwatch.js, FACE_SEGMENTS): 81 pins static, 30 with 3 backplanes.
//  - More backplanes cost contrast: each segment is driven only part of the time, and "off"
//    segments still see some voltage. Watches rarely go beyond 3 or 4.
import { THREE, M, box, beam, sphere } from '../kit.js';
import { SEG, SEGS, segPolys, digitsUsing, FACE_SEGMENTS, pinsFor, bin, board, panelBg, text, mono, lamp, fitNarrow, fitTall, slim, isTall, COL, HEX } from '../dwatch.js';

const BP_COL = ['#8ef0ff', '#ff8fb1', '#7be08c', '#c49bff'];

const TALL = { pos: [-0.7, 9.6, 10.9], target: [-0.7, 9.3, 0] };

export default {
  id: 'segments',
  short: 'Seven segments',
  title: 'Seven bars make every digit',
  subtitle: 'Four bits go in, seven signals come out. Light the right bars and you get any digit from 0 to 9.',
  view: { pos: [0, 7.4, 18.5], target: [0, 7.1, 0] },
  learn: `<p>Look closely at a watch and every digit is the same figure of eight, made of seven bars. They are called <b>segments</b> and named <b>a to g</b>, starting at the top and going round clockwise, with g in the middle.</p>
    <p>The counters hold each digit as four bits. A small block of logic called a <b>decoder</b> looks at those four bits and switches each of the seven segments on or off. The rules are fixed, and you can read them off the <b>truth table</b>: for a 7, switch on a, b and c. For an 8, all seven. For a 1, just b and c.</p>
    <p>Some bars work much harder than others. Segment c is on for every digit except 2. Segment e is on for only four of the ten.</p>
    <p>Now a puzzle. This watch face has <b>80 segments</b>. Giving each its own wire, plus one shared back electrode, would need 81 pins on the chip and 81 contacts in the zebra strips. So watches <b>multiplex</b>. The back electrode is cut into two, three or four <b>backplanes</b> that take turns many times a second, and each front wire now serves several segments, one per backplane. With three backplanes, 80 segments need only 30 pins.</p>
    <p>The same seven bars show the numbers on calculators, microwave ovens, petrol pumps and lifts. A calculator watch is simply both gadgets sharing one chip and one piece of glass. A TV does it differently, with a grid of dots: see <a href="https://glassbox.how/tvclear/" target="_blank" rel="noopener">TVClear</a>.</p>
    <p class="tip"><b>Try it:</b> step through the digits and follow the highlighted row. Click any bar to see which digits need it. Then change the number of backplanes and watch the wires merge.</p>`,
  terms: [
    { t: 'Segment', d: 'One of the seven bars, a to g, that together draw a digit.' },
    { t: 'Decoder', d: 'Logic with 4 inputs (a BCD digit) and 7 outputs (the segments), following a fixed table.' },
    { t: 'Truth table', d: 'A list of every possible input and the outputs each one must give.' },
    { t: 'Backplane', d: 'The shared electrode on the back glass, behind the segments.' },
    { t: 'Multiplexing', d: 'Sharing wires by taking turns: several backplanes are driven one after another, many times a second.' },
    { t: 'Static drive', d: 'The simple way: every segment has its own wire and is driven all the time.' },
  ],
  defaults: { digit: 7, auto: false, bp: 1 },
  controls: [
    { key: 'digit', type: 'range', label: 'Digit', min: 0, max: 9, step: 1, fmt: (v) => `${Math.round(v)} = ${bin(Math.round(v), 4)} in BCD` },
    { key: 'auto', type: 'toggle', label: 'Count through the digits' },
    { key: 'bp', type: 'seg', label: 'Backplanes', options: [{ v: 1, label: '1 (static)' }, { v: 2, label: '2' }, { v: 3, label: '3' }, { v: 4, label: '4' }], fmt: (v) => `${pinsFor(FACE_SEGMENTS, v)} pins for ${FACE_SEGMENTS} segments` },
  ],
  onChange(s) { s.digit = Math.round(s.digit); },
  quiz: [
    { q: 'Which segments are on for the digit 7?', options: ['a, b and c', 'b and c only', 'All seven', 'a, d and g'], answer: 0, why: 'The top bar and the two right-hand bars: a, b and c.' },
    { q: 'What does the decoder do?', options: ['Counts the seconds', 'Turns the 4 bits of a digit into 7 segment signals', 'Makes the beep', 'Stores the alarm time'], answer: 1, why: 'It is a fixed block of logic: 4 wires in, 7 wires out, following the truth table.' },
    { q: 'Why do watches multiplex their displays?', options: ['To make the digits brighter', 'So a few dozen chip pins can drive many more segments', 'To save the crystal', 'Because segments wear out'], answer: 1, why: 'With 3 backplanes taking turns, each front wire serves 3 segments: 30 pins instead of 81.' },
  ],
  reel: [
    { ms: 5400, caption: 'Every digit is seven bars. A decoder turns four bits into seven signals: for a 7, light a, b and c.', set: { auto: false, bp: 1 }, anim: { digit: [0, 9] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const tall = isTall(stage);
    const CX = tall ? 1.6 : -1.9, CY = tall ? 7.6 : 5.6, DX = tall ? -3.6 : -7.0;
    // ---------------------------------------------------------------- the big digit
    const bg = box(4.4, 7.0, 0.24, M.plastic(HEX.lcd, { roughness: 0.6 })); bg.position.set(CX, CY, -0.2); root.add(bg);
    const W = 2.5, H = 5.0, P = segPolys(W, H, 0.52);
    const segOff = () => M.plastic(0xa3ad90, { roughness: 0.6 }), segs = {}, cen = {};
    for (const sg of SEGS) {
      const sh = new THREE.Shape(); let sx = 0, sy = 0;
      P[sg].forEach(([x, y], i) => { const X = x + (H - y) * 0.06 - W / 2 - 0.15, Y = H / 2 - y; sx += X; sy += Y; i ? sh.lineTo(X, Y) : sh.moveTo(X, Y); });
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false }), segOff()); m.position.set(CX, CY, -0.08); m.userData.seg = sg; root.add(m);
      segs[sg] = m; cen[sg] = [CX + sx / 6, CY + sy / 6]; stage.pickables.push(m);
    }
    const segLbl = { a: [0, 0.62], b: [0.62, 0], c: [0.62, 0], d: [0, -0.62], e: [-0.62, 0], f: [-0.62, 0], g: [0, 0.55] };
    const SL = [...SEGS].map((k) => stage.label(k, [cen[k][0] + segLbl[k][0], cen[k][1] + segLbl[k][1], 0.3], root));
    const dots = {}; for (const sg of SEGS) { const d = sphere(0.13, M.glow(0xffffff), 12); d.position.set(cen[sg][0], cen[sg][1], 0.12); root.add(d); dots[sg] = d; }
    // ---------------------------------------------------------------- the decoder
    const dec = box(1.7, 4.2, 0.5, M.plastic(0x1b1e25, { roughness: 0.3 })); dec.position.set(DX, CY, 0); root.add(dec);
    const bcdLamps = [0, 1, 2, 3].map((i) => lamp(root, [DX - 1.7, CY + 1.35 - i * 0.9, 0], 0.24));
    bcdLamps.forEach((l) => root.add(beam([l.position.x + 0.2, l.position.y, 0], [DX - 0.85, l.position.y, 0], 0.045, M.plastic(0x485062))));
    const WL = ['8', '4', '2', '1'].map((t, i) => stage.label(t, [DX - 2.35, CY + 1.35 - i * 0.9, 0], root));
    const outY = (j, n) => CY + (n - 1) * 0.26 - j * 0.52;
    // Wires from the decoder to the segments. With b backplanes, each wire serves b segments.
    const wireOff = M.plastic(0x485062, { roughness: 0.6 }), wireOn = M.glow(HEX.cool);
    let wires = new THREE.Group(), lines = [], curB = 0; root.add(wires);
    const buildWires = (b) => {
      curB = b; wires.children.forEach((m) => m.geometry.dispose()); wires.clear(); lines = [];
      const n = Math.ceil(7 / b);
      for (let j = 0; j < n; j++) {
        const group = [...SEGS].slice(j * b, j * b + b), y = outY(j, n), ms = [];
        let from = [DX + 0.85, y, 0.3];
        const knee = [DX + 1.5 + j * 0.12, y, 0.3]; ms.push(beam(from, knee, 0.045, wireOff, 8)); from = knee;
        for (const sg of group) { const to = [cen[sg][0], cen[sg][1], 0.3]; ms.push(beam(from, to, 0.045, wireOff, 8)); from = to; }
        ms.forEach((m) => { m.castShadow = false; wires.add(m); });
        lines.push({ group, ms });
      }
      [...SEGS].forEach((sg, i) => { dots[sg].material.color.set(b > 1 ? BP_COL[i % b] : '#ffffff'); dots[sg].visible = b > 1; });
    };
    // ---------------------------------------------------------------- truth table and pin count
    const st = { d: -1, sel: '', b: 0 };
    const tt = board(root, tall ? 5.8 : 6.7, tall ? 6.6 : 7.63, 620, 706, (g, Wp, Hp) => {
      panelBg(g, Wp, Hp);
      text(g, 'Decoder truth table', 22, 46, { font: 'bold 34px sans-serif', col: '#e8eef8' });
      const segX = (k) => 250 + k * 50;
      text(g, 'BCD', 96, 98, { font: mono(26, true), col: COL.soft });
      [...SEGS].forEach((sg, k) => { if (sg === st.sel) { g.fillStyle = 'rgba(255,122,89,.2)'; g.fillRect(segX(k) - 24, 66, 48, 578); } text(g, sg, segX(k), 98, { font: mono(30, true), col: sg === st.sel ? COL.carry : COL.cool, align: 'center' }); });
      for (let d = 0; d <= 9; d++) {
        const y = 154 + d * 52, cur = d === st.d, on = SEG[d];
        if (cur) { g.fillStyle = 'rgba(255,209,102,.22)'; g.fillRect(10, y - 39, Wp - 20, 51); }
        text(g, String(d), 30, y, { font: mono(32, true), col: cur ? COL.one : '#e8eef8' });
        text(g, bin(d, 4), 92, y, { font: mono(30, cur), col: cur ? COL.one : 'rgba(255,255,255,.8)' });
        [...SEGS].forEach((sg, k) => text(g, on.includes(sg) ? '1' : '0', segX(k), y, { font: mono(30, cur), col: on.includes(sg) ? COL.cool : 'rgba(255,255,255,.28)', align: 'center' }));
      }
      text(g, '1010 to 1111 never happen in a BCD digit', 22, 686, { font: '24px sans-serif', col: COL.soft });
    }, tall ? [-0.7, 15.2, 0] : [5.3, 5.7, -0.2]);
    const pins = board(root, tall ? 9 : 6.7, tall ? 3.48 : 2.6, 620, 240, (g, Wp, Hp) => {
      panelBg(g, Wp, Hp);
      text(g, `Chip pins for all ${FACE_SEGMENTS} segments`, 16, 36, { font: 'bold 30px sans-serif', col: '#e8eef8' });
      [1, 2, 3, 4].forEach((b, i) => {
        const y = 56 + i * 44, n = pinsFor(FACE_SEGMENTS, b), cur = b === st.b;
        text(g, b === 1 ? 'static' : `${b} backplanes`, 16, y + 27, { font: `${cur ? 'bold ' : ''}28px sans-serif`, col: cur ? COL.one : COL.soft });
        g.fillStyle = cur ? COL.one : '#3c4658'; g.fillRect(210, y, n * 4.2, 32);
        text(g, String(n), 220 + n * 4.2, y + 27, { font: mono(30, true), col: cur ? COL.one : '#e8eef8' });
      });
    }, tall ? [-0.7, 1.95, 0] : [5.3, 11.2, -0.2]);
    const Ls = {
      dec: stage.label('Decoder', [DX, CY + 2.6, 0], root, 'hot'),
      in: stage.label('4 bits in', [DX - 1.9, CY - 2.5, 0], root),
      note: stage.label('', [CX, CY - 4.0, 0], root),
    };
    let autoT = 0, autoD = 0, sel = '';
    const inst = {
      pick(o) { const sg = o.userData.seg; if (sg) sel = sel === sg ? '' : sg; },
      update(dt, s) {
        dt = Math.max(0, dt);
        fitTall(stage, TALL);
        fitNarrow(stage, [Ls.in, Ls.note, ...WL], -0.17);
        if (s.auto) { autoT += dt; if (autoT > 0.8) { autoT = 0; autoD = (autoD + 1) % 10; s.digit = autoD; } } else autoD = s.digit;
        const d = Math.round(s.digit), on = SEG[d], bits = bin(d, 4), b = Math.round(s.bp);
        if (b !== curB) buildWires(b);
        bcdLamps.forEach((l, k) => l.set(bits[k] === '1'));
        for (const sg of SEGS) {
          const lit = on.includes(sg), m = segs[sg].material;
          m.color.set(lit ? 0x161a14 : 0xa3ad90); m.emissive.set(sg === sel ? 0xff7a59 : 0x000000); m.emissiveIntensity = sg === sel ? (lit ? 0.35 : 0.5) : 0;
        }
        lines.forEach((ln) => { const live = ln.group.some((sg) => on.includes(sg)); ln.ms.forEach((m) => { m.material = live ? wireOn : wireOff; }); });
        Ls.note.element.textContent = b === 1 ? '7 wires, one per bar' : `${Math.ceil(7 / b)} wires + ${b} backplanes (dot colours)`;
        if (st.d !== d || st.sel !== sel) { st.d = d; st.sel = sel; tt.redraw(); }
        if (st.b !== b) { st.b = b; pins.redraw(); }
      },
      readout(s) {
        const d = Math.round(s.digit), b = Math.round(s.bp), who = sel ? digitsUsing(sel) : null;
        return slim(stage, `<div class="big">${d} = ${bin(d, 4)}</div>
          <div class="row"><span>Segments on</span><b>${SEG[d].split('').join(' ')} (${SEG[d].length} of 7)</b></div>
          <div class="row"><span>${sel ? `Segment ${sel} is on for` : 'Click a bar'}</span><b>${who ? `${who.join(' ')}` : 'to see who uses it'}</b></div>
          <div class="row"><span>Pins for ${FACE_SEGMENTS} segments</span><b>${pinsFor(FACE_SEGMENTS, b)} ${b === 1 ? '(static)' : `(${b} backplanes)`}</b></div>`);
      },
    };
    return inst;
  },
};
