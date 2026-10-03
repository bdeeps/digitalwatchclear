// Chapter 2: one tick a second. A recap of the time base, which QuartzClear covers in depth
// (https://glassbox.how/quartzclear/): a 32,768 Hz quartz tuning fork and fifteen flip-flops that
// each halve the frequency, ending in one pulse a second. New here: where a digital watch taps the
// chain for its beeper and display, and what a crystal that is a few parts in a million off does.
//  - 32,768 = 2^15, so fifteen halvings give exactly 1 Hz.
//  - ±30 s a month (the usual factory figure, e.g. Casio module 593) is 30 / 2,592,000 = 11.6 ppm,
//    or 0.38 Hz in 32,768.
//  - Beeper at 4,096 Hz: US patent 4,526,477 says watch sounders are driven at 2,048 or 4,096 Hz.
//    The 32 Hz display tap is a typical value (Microchip AN658: 25 to 300 Hz), not one chip's data.
import { THREE, M, box, beam, clamp } from '../kit.js';
import { F_XTAL, STAGES, hzAt, TAPS, SEC_PER_DAY_PER_PPM, board, panelBg, text, mono, lamp, drawChar, fitNarrow, fitTall, slim, isTall, pad2, COL, HEX, TAU } from '../dwatch.js';

const fmtHz = (f) => (f >= 100 ? Math.round(f).toLocaleString('en-US') : f >= 10 ? f.toFixed(0) : f.toFixed(f % 1 ? 1 : 0)) + ' Hz';

const TALL = { pos: [0, 7.2, 11.6], target: [0, 6.8, 0] };

export default {
  id: 'tick',
  short: 'One tick a second',
  title: 'One tick a second',
  subtitle: 'A sliver of quartz hums 32,768 times a second. Halve that fifteen times and you have a second.',
  view: { pos: [-1.4, 6.9, 16.5], target: [-1.4, 6.6, 0] },
  learn: `<p>Every clock needs something that repeats steadily. A wall clock has a pendulum (see <a href="https://glassbox.how/clockclear/" target="_blank" rel="noopener">ClockClear</a>). A digital watch has a <b>quartz crystal</b> cut like a tiny tuning fork, sealed in the metal can on the board.</p>
    <p>Quartz bends a little when you put a voltage on it, and makes a voltage when it bends. The chip uses that to keep the fork ringing at exactly <b>32,768 swings a second</b>. Why that odd number? Because it is 2 multiplied by itself 15 times.</p>
    <p>Inside the chip is a chain of fifteen <b>flip-flops</b>. Each one flips once for every two flips of the one before, so it <b>halves</b> the frequency: 32,768, then 16,384, then 8,192, and on down to exactly <b>1 pulse a second</b>. The whole story of the crystal and the divider is in <a href="https://glassbox.how/quartzclear/" target="_blank" rel="noopener">QuartzClear</a>.</p>
    <p>A digital watch also borrows the faster beats along the way. The <b>beeper</b> is fed about 4,096 Hz, a high clear note. The <b>display</b> is flipped a few dozen times a second (chapter 5 says why). Only the last beat, 1 Hz, goes on to be counted.</p>
    <p>No crystal is perfect. If yours runs 12 parts in a million fast, the watch gains about a second a day, half a minute a month. That is the usual promise on the box: ±30 seconds a month. A tiny <b>trimmer</b> on the board lets the factory nudge it closer.</p>
    <p class="tip"><b>Try it:</b> drag "Slow motion" all the way left to see single swings of the crystal, then back to real time. Move the probe along the chain and watch the frequency halve.</p>`,
  terms: [
    { t: 'Quartz crystal', d: 'A tiny tuning fork of quartz that vibrates at a very steady 32,768 Hz when the chip drives it.' },
    { t: 'Hertz (Hz)', d: 'Swings or pulses per second.' },
    { t: 'Flip-flop', d: 'A small circuit that holds one bit. Wired to toggle, it flips once for every two input pulses.' },
    { t: 'Divider', d: 'A chain of flip-flops. Each stage gives out half the frequency it takes in.' },
    { t: 'Tap', d: 'A point along the divider where the chip borrows a faster beat, for the beeper or the display.' },
    { t: 'ppm', d: 'Parts per million. One ppm fast is 0.086 seconds gained in a day.' },
  ],
  defaults: { slow: 1, probe: 15, ppm: 0 },
  controls: [
    { key: 'slow', type: 'log', label: 'Slow motion', min: 1 / 32768, max: 1, ends: ['one swing a second', 'real time'], fmt: (v) => (v > 0.99 ? 'real time' : `${Math.round(1 / v).toLocaleString('en-US')}× slower`) },
    { key: 'probe', type: 'range', label: 'Probe after stage', min: 1, max: 15, step: 1, fmt: (v) => `${v}: ${fmtHz(hzAt(v))}` },
    { key: 'ppm', type: 'range', label: 'Crystal error', min: -30, max: 30, step: 0.5, ends: ['30 ppm slow', '30 ppm fast'], fmt: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)} ppm`, hint: '±30 seconds a month, the usual factory promise, is 11.6 ppm.' },
  ],
  onChange(s) { s.probe = Math.round(s.probe); },
  quiz: [
    { q: 'Why does a watch crystal vibrate at 32,768 Hz and not, say, 30,000 Hz?', options: ['It is the loudest note', '32,768 is 2 to the power 15, so fifteen halvings give exactly 1 Hz', 'Quartz cannot do any other frequency', 'It matches the mains'], answer: 1, why: 'A flip-flop can only halve. Starting from a power of two, halving lands exactly on one pulse a second.' },
    { q: 'What does one flip-flop in the divider do?', options: ['Doubles the frequency', 'Halves the frequency', 'Stores the date', 'Lights a segment'], answer: 1, why: 'It flips once for every two pulses coming in, so half as many pulses go out.' },
    { q: 'A watch gains 30 seconds in a month. Roughly how far off is its crystal?', options: ['About 12 parts in a million', 'About 1 part in a hundred', 'Exactly right, the chip is wrong', 'About 1 part in ten'], answer: 0, why: 'A month has 2,592,000 seconds. 30 divided by that is 11.6 millionths: 11.6 ppm.' },
  ],
  reel: [
    { ms: 5600, caption: 'A quartz crystal hums 32,768 times a second. Fifteen flip-flops halve that beat down to exactly one tick a second.', set: { probe: 15, ppm: 0 }, anim: { slow: [1 / 4096, 1, true] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const tall = isTall(stage);
    // ---------------------------------------------------------------- the crystal: a tuning fork in a can
    const XC = tall ? [0, 12.6, 0] : [-8.8, 6.5, 0];
    const can = new THREE.Group(); can.position.set(...XC); if (tall) can.rotation.z = -Math.PI / 2; root.add(can);
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 4.2, 32, 1, true), M.clear(0xcfd6e2, 0.2)); can.add(shell);
    const base = box(1.1, 0.7, 0.3, M.plastic(0xe9f3ff, { roughness: 0.15, transparent: true, opacity: 0.9 })); base.position.y = -1.5; can.add(base);
    const tineMat = M.plastic(0xe9f3ff, { roughness: 0.12, transparent: true, opacity: 0.9 }), gold = M.metal(0xe6c36a, { roughness: 0.3 });
    const tines = [-1, 1].map((sgn) => {
      const piv = new THREE.Group(); piv.position.set(sgn * 0.33, -1.15, 0); can.add(piv);
      const t = box(0.3, 2.8, 0.3, tineMat); t.position.y = 1.4; piv.add(t);
      const e = box(0.31, 2.2, 0.12, gold); e.position.set(0, 1.3, 0.1); piv.add(e);
      return piv;
    });
    const ghost = [-1, 1].map((sgn) => { const g = box(0.62, 2.8, 0.2, M.ghost(0xe9f3ff, 0.16)); g.position.set(sgn * 0.33, 0.25, 0); can.add(g); return g; });
    for (const sgn of [-1, 1]) { const leg = beam([sgn * 0.3, -1.85, 0], [sgn * 0.3, -2.9, 0], 0.04, M.metal(0xb9bec8)); can.add(leg); }
    // ---------------------------------------------------------------- fifteen flip-flops, in three rows of five
    const G = tall ? { x0: -4.4, dx: 2.2, y0: 7.4, dy: 2.0, w: 1.7, h: 1.25 } : { x0: -4.8, dx: 2.5, y0: 8.9, dy: 2.35, w: 2.1, h: 1.545 };
    const pos = (k) => { const r = Math.floor((k - 1) / 5), c = (k - 1) % 5; return [G.x0 + c * G.dx, G.y0 - r * G.dy, 0]; };
    const hw = G.w / 2 + 0.05, hp = G.dx / 2;
    const chipMat = M.plastic(0x1b1e25, { roughness: 0.35 });
    const lamps = [], faces = [];
    for (let k = 1; k <= STAGES; k++) {
      const p = pos(k);
      const face = board(root, G.w, G.h, 272, 200, (g, W, H) => {
        g.fillStyle = '#1b1e25'; g.fillRect(0, 0, W, H); g.strokeStyle = TAPS[k] ? COL.carry : 'rgba(255,255,255,.22)'; g.lineWidth = TAPS[k] ? 8 : 4; g.strokeRect(4, 4, W - 8, H - 8);
        text(g, '÷2', 18, 54, { font: 'bold 40px sans-serif', col: 'rgba(255,255,255,.6)' });
        text(g, String(k), W - 18, 50, { font: mono(34, true), col: 'rgba(255,255,255,.4)', align: 'right' });
        text(g, fmtHz(hzAt(k)), W / 2, 162, { font: mono(k < 6 ? 40 : 46, true), col: TAPS[k] ? COL.carry : '#e8eef8', align: 'center' });
      }, [p[0], p[1], 0.26]);
      faces.push(face);
      const slab = box(G.w + 0.1, G.h + 0.1, 0.4, chipMat); slab.position.set(...p); root.add(slab);
      lamps.push(lamp(root, [p[0] + 0.05, p[1] + G.h * 0.18, 0.36], G.w * 0.12));
      if (k > 1) {
        const q = pos(k - 1), wm = () => M.plastic(0x485062);
        if (q[1] === p[1]) root.add(beam([q[0] + hw, q[1], 0], [p[0] - hw, p[1], 0], 0.05, wm()));
        else { const y = (q[1] + p[1]) / 2, pts = [[q[0] + hw, q[1], 0], [q[0] + hp, q[1], 0], [q[0] + hp, y, 0], [p[0] - hp, y, 0], [p[0] - hp, p[1], 0], [p[0] - hw, p[1], 0]]; for (let i = 1; i < pts.length; i++) root.add(beam(pts[i - 1], pts[i], 0.05, wm())); }
      }
    }
    const p1 = pos(1), p15 = pos(15);
    if (tall) root.add(beam([XC[0] - 2.9, XC[1], 0], [p1[0] - hw, p1[1], 0], 0.05, M.plastic(0x485062)));
    else { root.add(beam([XC[0], XC[1] + 2.1, 0], [XC[0], p1[1], 0], 0.05, M.plastic(0x485062))); root.add(beam([XC[0], p1[1], 0], [p1[0] - hw, p1[1], 0], 0.05, M.plastic(0x485062))); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(G.w * 0.2, 0.05, 8, 28), M.glow(HEX.cool)); root.add(ring);
    // ---------------------------------------------------------------- the 1 Hz output and a seconds display
    const OUT = tall ? [0, 1.2, 0] : [p15[0], 1.6, 0];
    root.add(tall ? beam([p15[0] + hw, p15[1], 0], [OUT[0] + 0.2, OUT[1] + 1.1, 0], 0.05, M.plastic(0x485062)) : beam([p15[0], p15[1] - G.h / 2, 0], [OUT[0], OUT[1] + 1.0, 0], 0.05, M.plastic(0x485062)));
    const st = { sec: -1, probe: -1, phase: 0, live: false };
    const secs = board(root, 2.6, 2.0, 390, 300, (g, W, H) => {
      g.fillStyle = COL.lcd; g.fillRect(0, 0, W, H);
      const t = pad2(Math.max(0, st.sec) % 60);
      drawChar(g, t[0], 70, 50, 200); drawChar(g, t[1], 210, 50, 200);
    }, OUT);
    const pulse = lamp(root, tall ? [OUT[0] + 0.2, OUT[1] + 1.3, 0.2] : [OUT[0], OUT[1] + 1.45, 0.2], 0.26);
    // ---------------------------------------------------------------- the scope
    const scope = board(root, tall ? 11 : 10.4, tall ? 2.6 : 2.33, 1160, 260, (g, W, H) => {
      panelBg(g, W, H);
      const k = Math.max(1, st.probe), fin = hzAt(k - 1), fout = hzAt(k);
      text(g, `Stage ${k}:  ${fmtHz(fin)} in,  ${fmtHz(fout)} out`, 24, 46, { font: 'bold 34px sans-serif', col: '#e8eef8' });
      if (TAPS[k]) text(g, `tapped for ${TAPS[k]}`, W - 24, 46, { font: 'bold 30px sans-serif', col: COL.carry, align: 'right' });
      const x0 = 110, w = W - 140, wave = (y, cyc, col, ph) => {
        g.strokeStyle = col; g.lineWidth = 5; g.beginPath();
        const half = w / (cyc * 2); let x = x0 - (ph % 1) * half * 2, hi = true; g.moveTo(x0, y);
        g.save(); g.beginPath(); g.rect(x0, y - 44, w, 60); g.clip(); g.beginPath();
        for (let i = 0; i < cyc * 2 + 3; i++) { const yy = hi ? y - 36 : y; g.lineTo(x, yy); x += half; g.lineTo(x, yy); hi = !hi; }
        g.stroke(); g.restore();
      };
      text(g, 'in', 24, 122, { font: '28px sans-serif', col: COL.soft }); text(g, 'out', 24, 212, { font: '28px sans-serif', col: COL.soft });
      wave(130, 8, 'rgba(255,255,255,.7)', st.live ? st.phase * 2 : 0);
      wave(220, 4, COL.one, st.live ? st.phase : 0);
    }, tall ? [0, 10.0, 0] : [-2.7, 1.3, 0]);
    const Ls = {
      x: stage.label('Quartz crystal: 32,768 Hz', tall ? [XC[0], XC[1] + 1.2, 0] : [XC[0] + 0.9, XC[1] - 3.3, 0], root, 'hot'),
      chain: stage.label('Fifteen flip-flops, each halving the beat', tall ? [0, 1.75, 0] : [4.0, 10.45, 0], root),
      out: stage.label('1 pulse a second', tall ? [OUT[0], OUT[1] - 1.4, 0] : [OUT[0], OUT[1] - 1.35, 0], root, 'hot'),
      beep: stage.label('to the beeper', [pos(3)[0], pos(3)[1] + G.h / 2 + 0.3, 0], root),
      lcd: stage.label('to the display', [pos(10)[0], pos(10)[1] + G.h / 2 + 0.3, 0], root),
    };
    if (tall) Ls.chain.visible = false;
    let cycles = 32768 * 49.2, flash = 0;
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        fitTall(stage, TALL);
        fitNarrow(stage, [Ls.beep, Ls.lcd, Ls.chain, Ls.x, Ls.out], -0.13);
        const scale = clamp(s.slow, 1 / 32768, 1);
        cycles += dt * scale * F_XTAL * (1 + s.ppm * 1e-6);
        // The fork: tines swing towards and away from each other. Shown as a blur when too fast to see.
        const fx = F_XTAL * scale, seeFork = fx < 6, a = seeFork ? Math.sin(cycles * TAU) * 0.07 : 0;
        tines[0].rotation.z = -a; tines[1].rotation.z = a;
        ghost.forEach((g) => { g.visible = !seeFork; });
        for (let k = 1; k <= STAGES; k++) {
          const level = Math.floor(cycles / 2 ** (k - 1)) % 2, rate = hzAt(k) * scale;
          if (rate > 9) lamps[k - 1].set(1, '#8a7440'); else lamps[k - 1].set(level, '#ffd166');
        }
        const sec = Math.floor(cycles / F_XTAL);
        if (sec !== st.sec) { if (st.sec >= 0) flash = 0.18; st.sec = sec; secs.redraw(); }
        flash = Math.max(0, flash - dt); pulse.set(flash > 0, '#ff7a59');
        const pp = pos(s.probe); ring.position.set(pp[0] + 0.05, pp[1] + G.h * 0.18, 0.38);
        const live = hzAt(s.probe) * scale < 3, phase = cycles / 2 ** s.probe;
        if (st.probe !== s.probe || live || st.live !== live) { st.probe = s.probe; st.live = live; st.phase = phase; scope.redraw(); }
      },
      readout(s) {
        const f1 = 1 + s.ppm * 1e-6, day = s.ppm * SEC_PER_DAY_PER_PPM, k = s.probe;
        return slim(stage, `<div class="big">${fmtHz(hzAt(k))} after stage ${k}</div>
          <div class="row"><span>Crystal</span><b>${(F_XTAL * f1).toFixed(2)} Hz</b></div>
          <div class="row"><span>Divided by</span><b>2 × itself ${k} times = ${(2 ** k).toLocaleString('en-US')}</b></div>
          <div class="row"><span>Drift</span><b class="${Math.abs(s.ppm) > 11.6 ? 'no' : 'ok'}">${s.ppm === 0 ? 'none' : `${Math.abs(day).toFixed(2)} s a day, ${Math.abs(day * 30).toFixed(0)} s a month ${day > 0 ? 'fast' : 'slow'}`}</b></div>
          <small>${TAPS[k] ? `This stage is tapped for ${TAPS[k]}.` : 'Orange stages are tapped for the beeper, the display and the count.'}</small>`);
      },
    };
  },
};
