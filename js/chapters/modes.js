// Chapter 6: modes and power. The same chip is a clock, an alarm, a stopwatch and a setting tool:
// the Mode button steps a small state machine, and the other buttons mean different things in each
// state. Then the power sums.
//  - Alarm: a comparator checks hours and minutes against the stored alarm time once a minute.
//    The beep is about 4,096 Hz, straight from the divider, into a piezo disc on the case back
//    (US patent 4,526,477 gives 2,048 or 4,096 Hz for watch sounders). A real alarm runs for about
//    20 seconds (Casio module 593); ours stops after 6 so you can carry on.
//  - Stopwatch: hundredths of a second. 32,768 Hz is not a whole multiple of 100 Hz (it is 327.68
//    swings per hundredth), so a chip has to count 327 swings for some steps and 328 for others:
//    8 × 327 + 17 × 328 = 8,192 swings, exactly a quarter of a second. How a given chip does it is
//    not published; the sum is ours. Here the stopwatch simply follows the model's clock.
//  - Power: see DRAW and budget() in dwatch.js. The maker's "about 7 years on a CR2016 with 20 s of
//    alarm and 1 s of light a day" works out at 1.47 µA on average; our split is an estimate.
//  - LED watch: tens of milliamps while lit (about 90 mW at 3 V). Smartwatch: 308 mAh at 3.85 V in
//    18 hours is 66 mW on average (Apple Watch Series 9, 45 mm).
//  - Water resistance: ISO 22810:2010. The depth on the dial is a test pressure, not a diving depth:
//    "30 m" means splashes and rain only.
import { THREE, M, torus, clamp } from '../kit.js';
import { audio } from '../ui.js';
import { makeWatch, makeClock, faceOf, DOW, h12, pad2, budget, CELLS, DRAW, WATCH_UW, LED_WATCH_MW, SMART_MW, board, panelBg, text, mono, fitNarrow, fitTall, slim, isTall, inReel, COL, BUTTONS } from '../dwatch.js';

const MODES = ['TIME', 'ALARM', 'STOPWATCH', 'SET'];
const JOBS = {
  TIME: { start: 'switch 12 / 24 hour', reset: 'nothing in this mode' },
  ALARM: { start: 'alarm and chime on / off', reset: 'alarm time + 1 minute' },
  STOPWATCH: { start: 'start / stop', reset: 'zero (or freeze a split while running)' },
  SET: { start: 'minutes + 1, seconds to 00', reset: 'hours + 1' },
};

// A short run of 4,096 Hz beeps, if sound is on.
let ac = null;
function beep(n = 2) {
  if (audio.muted || inReel()) return;
  try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch { return; }
  for (let i = 0; i < n; i++) {
    const t = ac.currentTime + i * 0.25, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'square'; o.frequency.value = 4096;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.03, t + 0.005); g.gain.setValueAtTime(0.03, t + 0.09); g.gain.linearRampToValueAtTime(0, t + 0.1);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.12);
  }
}

const TALL = { pos: [0, 10.2, 11.6], target: [0, 9.8, 0] };

export default {
  id: 'modes',
  short: 'Modes and power',
  title: 'One chip, four jobs, ten years',
  subtitle: 'The Mode button steps the chip from clock to alarm to stopwatch. All of it runs on about a millionth of an amp.',
  view: { pos: [-0.1, 7.0, 19.5], target: [-0.1, 6.8, 0] },
  learn: `<p>A digital watch has four buttons and dozens of functions. The trick is that the chip is a <b>state machine</b>. It is always in one <b>mode</b>, and the Mode button steps it to the next: time, alarm, stopwatch, setting, and round again. The other buttons do a different job in each mode.</p>
    <p>The <b>alarm</b> is a stored time and a <b>comparator</b>: once a minute the chip checks whether the clock's hours and minutes equal the alarm's. When they match, it sends a 4,096 Hz tone from the divider to the <b>piezo disc</b> on the back. The disc bends 4,096 times a second and the steel back sings. The <b>hourly chime</b> is the same trick, set off whenever the minutes roll over to 00. (A loudspeaker does the same job with a magnet and a coil: see <a href="https://glassbox.how/speakerclear/" target="_blank" rel="noopener">SpeakerClear</a>.)</p>
    <p>The <b>stopwatch</b> is one more set of counters, fed a faster beat so it can count hundredths of a second. Setting the time is just you adding pulses to a counter by hand.</p>
    <p>All this takes about <b>1.5 millionths of an amp</b>. The chip is <b>CMOS</b>, which uses power only at the instant a transistor switches, and the display makes no light. A 3 volt coin cell lasts seven to ten years. The beeper and the lamp are the big spenders: one second of lamp costs more than an hour of timekeeping.</p>
    <p>That is why the first digital watches, in the 1970s, showed nothing until you pressed a button. Their red <b>LED</b> digits made their own light and would have flattened the cells in days. A <b>smartwatch</b> is a small phone on your wrist, with a bright screen, radios and a processor: it uses more than ten thousand times the power, and needs charging every day or two.</p>
    <p>One more thing on the case back: "Water resist 30 m" is a pressure test, not a promise. It means splashes and rain, not a dive to 30 metres.</p>
    <p class="tip"><b>Try it:</b> press Mode and watch the state move. Start the stopwatch. Then press "Alarm in 5 seconds", and see what an extra minute of lamp a day does to the cell.</p>`,
  terms: [
    { t: 'State machine', d: 'A circuit that is always in one of a few states, and moves between them when something happens, such as a button press.' },
    { t: 'Mode', d: 'One state of the watch: time, alarm, stopwatch or setting. It decides what the buttons and the display mean.' },
    { t: 'Comparator', d: 'Logic that checks whether two numbers are equal, here the clock time and the alarm time.' },
    { t: 'Piezo beeper', d: 'A ceramic disc on a brass plate that bends when given a voltage. Fed a tone, it makes sound.' },
    { t: 'CMOS', d: 'The low-power kind of chip used in watches. It draws current only when its transistors switch.' },
    { t: 'Microamp (µA)', d: 'A millionth of an amp. A digital watch runs on about one and a half.' },
  ],
  defaults: { cell: 'cr2016', beep: 20, lamp: 1 },
  controls: [
    { key: 'btn', type: 'buttons', label: 'Press a button (or click one on the watch)', items: [
      { label: 'Mode', act: (s, inst) => inst.push('mode') }, { label: 'Start/Stop', act: (s, inst) => inst.push('start') }, { label: 'Reset', act: (s, inst) => inst.push('reset') }, { label: 'Light', act: (s, inst) => inst.push('light') },
    ] },
    { key: 'demo', type: 'buttons', label: 'Make it beep', items: [
      { label: 'Alarm in 5 seconds', act: (s, inst) => inst.demo('alarm') }, { label: 'Hourly chime in 5 seconds', act: (s, inst) => inst.demo('chime') },
    ] },
    { key: 'cell', type: 'seg', label: 'Coin cell', options: Object.entries(CELLS).map(([v, c]) => ({ v, label: c.name })), fmt: (v) => `${CELLS[v].mAh} mAh` },
    { key: 'beep', type: 'range', label: 'Beeper use', min: 0, max: 120, step: 1, fmt: (v) => `${v} s a day` },
    { key: 'lamp', type: 'range', label: 'Lamp use', min: 0, max: 60, step: 1, fmt: (v) => `${v} s a day` },
  ],
  quiz: [
    { q: 'How can four buttons control dozens of functions?', options: ['Each button has a hidden second button', 'The chip is in one mode at a time, and the buttons mean different things in each', 'You press them harder', 'They are touch screens'], answer: 1, why: 'It is a state machine. Mode steps to the next state, and the state decides what Start and Reset do.' },
    { q: 'How does the watch know it is time to sound the alarm?', options: ['It counts down from the alarm time', 'A comparator checks whether the clock time equals the stored alarm time', 'The crystal changes pitch', 'The battery voltage rises'], answer: 1, why: 'Hours and minutes of the clock are compared with the stored alarm. When all the bits match, the beeper is switched on.' },
    { q: 'Why did 1970s LED watches stay dark until you pressed a button?', options: ['To look mysterious', 'LEDs make light and use thousands of times more current than an LCD', 'The crystal needed a rest', 'LEDs only work in the dark'], answer: 1, why: 'Lit digits drew tens of milliamps. Left on, they would flatten the cells in days. An LCD only steers room light.' },
  ],
  reel: [
    { ms: 5800, caption: 'One chip, four jobs. The Mode button steps it from clock to alarm to stopwatch, and a comparator sounds the piezo beeper.', set: { cell: 'cr2016', beep: 20, lamp: 1 }, act: (s, inst) => inst.tour(), spin: 0 },
    { ms: 5200, caption: 'It all runs on about 1.5 millionths of an amp: one coin cell for seven years. A smartwatch uses over ten thousand times more.', set: { cell: 'cr2016', beep: 20, lamp: 1 }, act: (s, inst) => inst.demo('alarm', 2), spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const tall = isTall(stage);
    const WP = tall ? [0, 15.0, 0] : [-5.3, 4.9, 0];
    const w = makeWatch({ strap: 1.3 }); w.group.rotation.x = Math.PI / 2; w.group.scale.setScalar(tall ? 0.6 : 0.72); w.group.position.set(...WP); root.add(w.group);
    stage.pickables.push(...w.pickables());
    const rings = [0, 1, 2].map(() => { const r = torus(1, 0.05, M.glow(0xffb547, { transparent: true, opacity: 0 }), 48); r.position.set(WP[0], WP[1], -0.9); root.add(r); return r; });
    const clock = makeClock();
    const z = { mode: 0, h24: false, alarm: { h: 6, m: 30, on: true }, chime: true, sw: { run: false, t: 0, split: null }, light: 0, beepT: 0, beepKind: '', lit: 0, beeped: 0 };
    let acc = 0, t = 0, faceKey = '', last = 'Press Mode', queue = [], qT = 0, pressed = {};
    const face = () => {
      const m = MODES[z.mode], light = z.light > 0;
      if (m === 'ALARM') return { top: 'AL', date: null, big: (z.h24 ? pad2(z.alarm.h) : String(h12(z.alarm.h)).padStart(2, ' ')) + pad2(z.alarm.m), small: '  ', pm: !z.h24 && z.alarm.h >= 12, h24: z.h24, alarm: z.alarm.on, chime: z.chime, light };
      if (m === 'STOPWATCH') { const v = z.sw.split ?? z.sw.t, cs = Math.floor(v * 100) % 100, sec = Math.floor(v) % 60, min = Math.floor(v / 60) % 60; return { top: 'ST', date: null, big: pad2(min) + pad2(sec), small: pad2(cs), alarm: z.alarm.on, chime: z.chime, lap: z.sw.split != null, light }; }
      const f = faceOf(clock, z.h24, { alarm: z.alarm.on, chime: z.chime, light });
      if (m === 'SET' && Math.floor(t * 2) % 2) f.small = '  ';
      return f;
    };
    const redraw = () => { const f = face(), k = JSON.stringify(f); if (k !== faceKey) { faceKey = k; w.screen.redraw(f); } };
    // ---------------------------------------------------------------- the state machine board
    const sm = board(root, tall ? 10 : 9.8, tall ? 5.3 : 5.21, 940, 500, (g, W, H) => {
      panelBg(g, W, H);
      text(g, 'The chip is always in one mode', 22, 42, { font: 'bold 32px sans-serif', col: '#e8eef8' });
      const bw = 196, gap = 30, x0 = 24, y0 = 70;
      MODES.forEach((m, i) => {
        const x = x0 + i * (bw + gap), cur = i === z.mode;
        g.fillStyle = cur ? COL.one : '#232a38'; g.beginPath(); g.roundRect(x, y0, bw, 76, 18); g.fill();
        text(g, m, x + bw / 2, y0 + 49, { font: `bold ${m.length > 6 ? 27 : 32}px sans-serif`, col: cur ? '#10131c' : '#e8eef8', align: 'center' });
        if (i < 3) { g.strokeStyle = COL.carry; g.lineWidth = 5; g.beginPath(); g.moveTo(x + bw + 3, y0 + 38); g.lineTo(x + bw + gap - 4, y0 + 38); g.stroke(); g.fillStyle = COL.carry; g.beginPath(); g.moveTo(x + bw + gap, y0 + 38); g.lineTo(x + bw + gap - 12, y0 + 29); g.lineTo(x + bw + gap - 12, y0 + 47); g.fill(); }
      });
      g.strokeStyle = COL.carry; g.lineWidth = 5; g.beginPath(); g.moveTo(x0 + 3 * (bw + gap) + bw / 2, y0 + 78); g.lineTo(x0 + 3 * (bw + gap) + bw / 2, y0 + 106); g.lineTo(x0 + bw / 2, y0 + 106); g.lineTo(x0 + bw / 2, y0 + 84); g.stroke();
      g.fillStyle = COL.carry; g.beginPath(); g.moveTo(x0 + bw / 2, y0 + 78); g.lineTo(x0 + bw / 2 - 9, y0 + 90); g.lineTo(x0 + bw / 2 + 9, y0 + 90); g.fill();
      text(g, 'each arrow is one press of Mode', W / 2, y0 + 136, { font: '24px sans-serif', col: COL.carry, align: 'center' });
      const m = MODES[z.mode], rows = [['Start/Stop', JOBS[m].start], ['Reset', JOBS[m].reset], ['Light', 'lamp on for 1.5 seconds, in every mode']];
      text(g, `In ${m} mode:`, 22, 262, { font: 'bold 30px sans-serif', col: COL.one });
      rows.forEach(([b, job], i) => { text(g, b, 22, 308 + i * 42, { font: 'bold 28px sans-serif', col: '#e8eef8' }); text(g, job, 220, 308 + i * 42, { font: '28px sans-serif' }); });
      const eq = clock.h === z.alarm.h && clock.m === z.alarm.m;
      g.fillStyle = eq ? 'rgba(123,224,140,.2)' : 'rgba(255,255,255,.06)'; g.fillRect(14, 428, W - 28, 56);
      text(g, `Comparator: clock ${pad2(clock.h)}:${pad2(clock.m)}  =  alarm ${pad2(z.alarm.h)}:${pad2(z.alarm.m)} ?`, 26, 466, { font: mono(28, true), col: '#e8eef8' });
      text(g, !z.alarm.on ? 'alarm off' : eq ? 'YES: beep' : 'no', W - 26, 466, { font: 'bold 30px sans-serif', col: eq && z.alarm.on ? COL.good : COL.soft, align: 'right' });
    }, tall ? [0, 7.6, 0] : [5.4, 9.6, 0]);
    // ---------------------------------------------------------------- the power board
    const pw = { key: '' };
    let PB = budget('cr2016', 20, 1), cellKey = 'cr2016';
    const power = board(root, tall ? 10 : 9.8, tall ? 4.6 : 4.48, 940, 430, (g, W, H) => {
      panelBg(g, W, H);
      text(g, `Where the ${CELLS[cellKey].name} cell’s ${CELLS[cellKey].mAh} mAh goes`, 22, 42, { font: 'bold 32px sans-serif', col: '#e8eef8' });
      const rows = [['Chip, crystal, display', PB.base, COL.cool], ['Beeper', PB.beep, COL.carry], ['Lamp', PB.light, COL.one], ['Lost inside the cell', PB.self, '#7f8aa0']];
      const max = Math.max(1.6, ...rows.map((r) => r[1]));
      rows.forEach(([n, v, col], i) => { const y = 66 + i * 44; text(g, n, 22, y + 26, { font: '26px sans-serif' }); g.fillStyle = col; g.fillRect(330, y, Math.max(3, (v / max) * 430), 30); text(g, `${v.toFixed(2)} µA`, 340 + Math.max(3, (v / max) * 430), y + 25, { font: mono(26, true), col: '#e8eef8' }); });
      text(g, `Cell life: about ${PB.years < 1 ? (PB.years * 12).toFixed(0) + ' months' : PB.years.toFixed(1) + ' years'}`, 22, 284, { font: 'bold 36px sans-serif', col: PB.years >= 5 ? COL.good : PB.years >= 2 ? COL.one : COL.bad });
      // Average power on a log scale: 1 µW to 100 mW.
      const uw = (PB.use + PB.self) * 3, items = [['This watch', uw, COL.good], ['Smartwatch', SMART_MW * 1000, COL.bad], ['LED watch, lit', LED_WATCH_MW * 1000, COL.carry]];
      const X = (u) => 250 + (Math.log10(clamp(u, 1, 1e5)) / 5) * 520;
      items.forEach(([n, u, col], i) => { const y = 310 + i * 38; text(g, n, 22, y + 22, { font: '24px sans-serif' }); g.fillStyle = col; g.fillRect(250, y, X(u) - 250 + 4, 24); text(g, u < 1000 ? `${u.toFixed(1)} µW` : `${(u / 1000).toFixed(0)} mW`, X(u) + 14, y + 21, { font: mono(24, true), col: '#e8eef8' }); });
    }, tall ? [0, 2.5, 0] : [5.4, 4.5, 0]);
    const ws = w.group.scale.x;
    const Ls = {
      piezo: stage.label('Piezo beeper on the back: 4,096 Hz', [WP[0], WP[1] - 7.6 * ws, 0], root, 'hot'),
      light: stage.label('Light', [WP[0] - 4.7 * ws, WP[1] + 3.3 * ws, 0.5], root), mode: stage.label('Mode', [WP[0] - 4.7 * ws, WP[1] - 3.3 * ws, 0.5], root),
      start: stage.label('Start/Stop', [WP[0] + 4.4 * ws, WP[1] + 3.3 * ws, 0.5], root), reset: stage.label('Reset', [WP[0] + 4.7 * ws, WP[1] - 3.3 * ws, 0.5], root),
    };
    const startBeep = (kind, secs, n) => { z.beepT = secs; z.beepKind = kind; beep(n); };
    const inst = {
      push(k) {
        pressed[k] = 0.2; last = BUTTONS[k].name;
        const m = MODES[z.mode];
        if (z.beepT > 0 && z.beepKind === 'alarm') { z.beepT = 0; last += ': alarm silenced'; redraw(); sm.redraw(); return; }
        if (k === 'light') { z.light = 1.5; }
        else if (k === 'mode') { z.mode = (z.mode + 1) % 4; last = `Mode → ${MODES[z.mode]}`; }
        else if (m === 'TIME') { if (k === 'start') { z.h24 = !z.h24; last = z.h24 ? '24-hour display' : '12-hour display'; } }
        else if (m === 'ALARM') { if (k === 'start') { z.alarm.on = !z.alarm.on; z.chime = z.alarm.on; last = z.alarm.on ? 'Alarm and chime on' : 'Alarm and chime off'; } else { z.alarm.m = (z.alarm.m + 1) % 60; if (!z.alarm.m) z.alarm.h = (z.alarm.h + 1) % 24; last = 'Alarm + 1 minute'; } }
        else if (m === 'STOPWATCH') { if (k === 'start') { z.sw.run = !z.sw.run; z.sw.split = null; last = z.sw.run ? 'Stopwatch running' : 'Stopwatch stopped'; } else if (z.sw.run) { z.sw.split = z.sw.split == null ? z.sw.t : null; last = z.sw.split == null ? 'Split released' : 'Split frozen'; } else { z.sw.t = 0; z.sw.split = null; last = 'Stopwatch zeroed'; } }
        else if (m === 'SET') { if (k === 'start') { clock.m = (clock.m + 1) % 60; clock.s = 0; acc = 0; last = 'Minutes + 1'; } else { clock.h = (clock.h + 1) % 24; last = 'Hours + 1'; } }
        redraw(); sm.redraw();
      },
      pick(o) { if (o.userData.btn) inst.push(o.userData.btn); },
      // Put the clock a few seconds before the alarm, or before the hour.
      demo(kind, lead = 5) {
        z.mode = 0; z.alarm.on = true; z.chime = true; acc = 0;
        const before = (z.alarm.h * 60 + z.alarm.m + 1439) % 1440;
        if (kind === 'alarm') { clock.h = Math.floor(before / 60); clock.m = before % 60; } else { clock.h = 10; clock.m = 59; }
        clock.s = 60 - lead;
        last = kind === 'alarm' ? 'Waiting for the alarm…' : 'Waiting for the hour…'; redraw(); sm.redraw();
      },
      // For the video: step through the modes, run the stopwatch, come back.
      tour() { queue = ['mode', 'mode', 'start', 'mode', 'mode']; qT = 0.9; },
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        fitTall(stage, TALL);
        fitNarrow(stage, [Ls.light, Ls.mode, Ls.start, Ls.reset, Ls.piezo], -0.17);
        if (queue.length) { qT -= dt; if (qT <= 0) { inst.push(queue.shift()); qT = 0.95; } }
        acc += dt;
        while (acc >= 1) {
          acc -= 1; clock.tick();
          if (clock.s === 0) {
            if (z.alarm.on && clock.h === z.alarm.h && clock.m === z.alarm.m) { startBeep('alarm', 6, 12); last = 'Alarm! Any button stops it'; }
            else if (z.chime && clock.m === 0) { startBeep('chime', 0.6, 2); last = 'Hourly chime'; }
            sm.redraw();
          }
        }
        if (z.sw.run) z.sw.t = (z.sw.t + dt) % 3600;
        if (z.light > 0) z.light -= dt;
        w.setLight(z.light > 0);
        if (z.beepT > 0) z.beepT -= dt;
        const beeping = z.beepT > 0 && (z.beepKind === 'chime' || Math.floor(t * 4) % 2 === 0);
        rings.forEach((r, i) => { const k = (t * 1.6 + i / 3) % 1; r.scale.setScalar((4.6 + k * 3.0) * ws); r.material.opacity = z.beepT > 0 ? (1 - k) * (beeping ? 0.9 : 0.35) : 0; r.visible = z.beepT > 0; });
        for (const k in w.buttons) { const b = w.buttons[k]; b.down = pressed[k] > 0 ? 1 : 0; if (pressed[k] > 0) pressed[k] -= dt; }
        w.settle();
        redraw();
        const key = `${s.cell}|${s.beep}|${s.lamp}`;
        if (key !== pw.key) { pw.key = key; cellKey = s.cell; PB = budget(s.cell, s.beep, s.lamp); power.redraw(); }
      },
      readout(s) {
        const b = budget(s.cell, s.beep, s.lamp), m = MODES[z.mode];
        return slim(stage, `<div class="big">${m[0] + m.slice(1).toLowerCase()} mode</div>
          <div class="row"><span>Last press</span><b>${last}</b></div>
          <div class="row"><span>Average current</span><b>${(b.use + b.self).toFixed(2)} µA</b></div>
          <div class="row"><span>${CELLS[s.cell].name} lasts</span><b class="${b.years >= 5 ? 'ok' : 'no'}">${b.years < 1 ? (b.years * 12).toFixed(0) + ' months' : b.years.toFixed(1) + ' years'}</b></div>
          <small>${z.beepT > 0 ? 'The piezo is sounding at 4,096 Hz.' : `1 s of lamp (${DRAW.lightMA} mA) costs as much as ${Math.round((DRAW.lightMA * 1000) / DRAW.baseUA / 60)} minutes of timekeeping.`}</small>`);
      },
    };
    void DOW;
    return inst;
  },
};
