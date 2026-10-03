// Chapter 3: counting. The 1 Hz pulse feeds a row of counters. Each counts the carries of the one
// before, rolls over at its own limit and hands one carry on: seconds (ones 0 to 9, tens 0 to 5),
// minutes (the same), hours 0 to 23, then day of the week, date (1 to 28, 29, 30 or 31), month and year.
//  - The logic is makeClock() in dwatch.js. It was checked second by second against the JavaScript
//    calendar from 1999 to 2101, which includes the leap day in 2000 and the missing one in 2100.
//  - Each decimal digit is held as 4 bits: binary-coded decimal (BCD). Decade counters such as the
//    CD4518 work this way, and it is why a watch chip needs no division to show a number.
//  - Leap years: the full rule is "divisible by 4, except centuries, unless divisible by 400".
//    From 2000 to 2099 that is simply "divisible by 4", which is what auto-calendar watches store.
//  - A watch with no year counter (the Casio F-91W is one) gives February 28 days every year.
//  - The hours counter here runs 0 to 23 and the display logic turns it into 12-hour time. Real chips
//    differ: some count 1 to 12 with an AM/PM flip-flop instead.
import { THREE, M, box, beam, sphere, clamp } from '../kit.js';
import { makeClock, CARRY, DOW, MONTHS, daysIn, isLeap, h12, pad2, bin, timeStr, dateStr, faceOf, drawFace, drawChar, board, text, mono, bitBoxes, fitNarrow, fitTall, slim, isTall, COL, HEX } from '../dwatch.js';

const JUMPS = [
  { label: 'New Year’s Eve 1999', set: { s: 50, m: 59, h: 23, date: 31, month: 12, year: 1999 } },
  { label: '28 Feb 2028 (leap)', set: { s: 50, m: 59, h: 23, date: 28, month: 2, year: 2028 } },
  { label: '28 Feb 2027', set: { s: 50, m: 59, h: 23, date: 28, month: 2, year: 2027 } },
  { label: '30 April', set: { s: 50, m: 59, h: 23, date: 30, month: 4, year: 2027 } },
  { label: '12:59:50', set: { s: 50, m: 59, h: 12 } },
];

const TALL = { pos: [0.35, 9.6, 10.4], target: [0.35, 9.3, 0] };

export default {
  id: 'counting',
  short: 'Counting',
  title: 'A row of counters',
  subtitle: 'The chip does not know the time. It only counts ticks, and passes on a carry when a counter is full.',
  view: { pos: [1.6, 7.6, 18.5], target: [1.6, 7.3, 0] },
  learn: `<p>One pulse a second arrives from the divider. What turns it into 10:58 on a Monday? Nothing clever: a row of <b>counters</b>.</p>
    <p>The first counter counts seconds from 0 to 9. On the next pulse it <b>rolls over</b> to 0 and sends one pulse, a <b>carry</b>, to the tens-of-seconds counter. That one counts 0 to 5. When it rolls over, a minute has passed, and the carry goes to the minutes. Minutes carry to hours, hours to the date.</p>
    <p>It is the same idea as a car's old odometer, with one twist: each wheel has its own limit. Seconds and minutes turn over at 60. Hours at 24. The <b>date counter</b> must look at the month to know its limit: 31, 30, or 28 for February. A watch that also counts the <b>year</b> can check for a <b>leap year</b> and allow 29.</p>
    <p>Each digit is kept as four bits, a code called <b>BCD</b> (binary-coded decimal). 7 is 0111, 9 is 1001. Keeping every digit apart costs a few extra bits, but it means each digit can go straight to the display with no arithmetic. <a href="https://glassbox.how/calculatorclear/" target="_blank" rel="noopener">CalculatorClear</a> stores its numbers the same way, and <a href="https://glassbox.how/computerclear/" target="_blank" rel="noopener">ComputerClear</a> shows what counters grow into.</p>
    <p>For 12-hour time the chip keeps counting 0 to 23 and the display shows 13 as 1 PM. Setting the watch is just you adding pulses to one counter by hand.</p>
    <p class="tip"><b>Try it:</b> press "28 Feb 2028", then watch midnight arrive. Now switch off "Chip stores the year" and try again. Then run a day every second and watch the months change.</p>`,
  terms: [
    { t: 'Counter', d: 'A circuit that adds one for every pulse it receives and holds the total.' },
    { t: 'Roll over', d: 'What a counter does at its limit: it goes back to its start value.' },
    { t: 'Carry', d: 'The single pulse a counter sends to the next one each time it rolls over.' },
    { t: 'BCD', d: 'Binary-coded decimal: each decimal digit stored separately as four bits, 0000 to 1001.' },
    { t: 'Leap year', d: 'A year with a 29 February: divisible by 4, except century years not divisible by 400.' },
    { t: 'Auto-calendar', d: 'A watch that knows the length of every month, and of February in leap years.' },
  ],
  defaults: { speed: 1, h24: false, year: true },
  controls: [
    { key: 'speed', type: 'seg', label: 'How fast time runs', options: [{ v: 1, label: 'Real' }, { v: 60, label: '1 min/s' }, { v: 3600, label: '1 h/s' }, { v: 86400, label: '1 day/s' }, { v: 2592000, label: '30 days/s' }], fmt: (v) => (v === 1 ? '1 tick a second' : `${Math.round(v).toLocaleString('en-US')} ticks a second`) },
    { key: 'jump', type: 'buttons', label: 'Jump to ten seconds before', items: JUMPS.map((j) => ({ label: j.label, act: (s, inst) => inst.jump(j.set, s) })) },
    { key: 'h24', type: 'toggle', label: '24-hour display' },
    { key: 'year', type: 'toggle', label: 'Chip stores the year', hint: 'Off: February always has 28 days, and you fix the date by hand every leap year.' },
  ],
  quiz: [
    { q: 'The seconds read 59. What happens on the next tick?', options: ['They show 60', 'Both seconds counters roll over to 0 and a carry goes to the minutes', 'The watch stops for a moment', 'The hours go up by one'], answer: 1, why: 'The ones roll over from 9 to 0 and carry to the tens, which roll over from 5 to 0 and carry to the minutes.' },
    { q: 'How does the chip store the digit 9?', options: ['As nine separate wires', 'As the four bits 1001', 'As a voltage of 9 volts', 'As the letter g'], answer: 1, why: 'Each decimal digit is held as four bits (BCD). 1001 is 8 + 1 = 9.' },
    { q: 'Why does a simple watch show 1 March the day after 28 February, even in a leap year?', options: ['Its crystal runs fast', 'It has no year counter, so it cannot know the year is a leap year', 'Leap years were abolished', 'The battery is flat'], answer: 1, why: 'With no year stored, February gets 28 days every time. Auto-calendar watches keep the year and check it.' },
  ],
  reel: [
    { ms: 5600, caption: 'One pulse a second feeds a row of counters. At 59 the seconds roll over and pass a carry to the minutes.', set: { speed: 1, h24: false, year: true }, act: (s, inst) => inst.jump({ s: 55, m: 59, h: 10, date: 12, month: 10, year: 2026 }, s), spin: 0 },
    { ms: 5600, caption: 'The date counter checks the month, and the year. In 2028, 28 February is followed by the 29th.', set: { h24: false, year: true }, act: (s, inst) => inst.jump({ s: 0, m: 0, h: 6, date: 27, month: 2, year: 2028 }, s), anim: { speed: [43200, 43200] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const tall = isTall(stage);
    const clock = makeClock();
    const st = { h24: false };
    // ---------------------------------------------------------------- the counters
    const P = tall
      ? { src: [5.0, 8.6], s1: [2.9, 8.6], s10: [0.3, 8.6], m1: [2.9, 11.6], m10: [0.3, 11.6], h: [-2.9, 11.6], dow: [-2.9, 5.6], date: [1.6, 5.6], month: [-2.9, 2.6], year: [1.6, 2.6], lcd: [0, 15.6] }
      : { src: [10.3, 7.4], s1: [8.2, 7.4], s10: [5.6, 7.4], m1: [2.4, 7.4], m10: [-0.2, 7.4], h: [-3.8, 7.4], dow: [-3.8, 3.6], date: [0.4, 3.6], month: [4.4, 3.6], year: [8.4, 3.6], lcd: [5.6, 11.7] };
    const MODS = {
      s1: { name: 'Seconds', sub: 'ones', w: 2.4, val: () => String(clock.s % 10), bits: () => [bin(clock.s % 10, 4)], foot: () => '0 to 9' },
      s10: { name: 'Seconds', sub: 'tens', w: 2.4, val: () => String(Math.floor(clock.s / 10)), bits: () => [bin(Math.floor(clock.s / 10), 4)], foot: () => '0 to 5' },
      m1: { name: 'Minutes', sub: 'ones', w: 2.4, val: () => String(clock.m % 10), bits: () => [bin(clock.m % 10, 4)], foot: () => '0 to 9' },
      m10: { name: 'Minutes', sub: 'tens', w: 2.4, val: () => String(Math.floor(clock.m / 10)), bits: () => [bin(Math.floor(clock.m / 10), 4)], foot: () => '0 to 5' },
      h: { name: 'Hours', sub: '', w: 3.4, val: () => pad2(clock.h), bits: () => [bin(Math.floor(clock.h / 10), 4), bin(clock.h % 10, 4)], foot: () => (st.h24 ? '0 to 23' : `0 to 23 · shows ${h12(clock.h)} ${clock.h >= 12 ? 'PM' : 'AM'}`) },
      dow: { name: 'Day', sub: '', w: 3.4, val: () => DOW[clock.dow], nine: true, bits: () => [bin(clock.dow, 4)], foot: () => '7 days, then again' },
      date: { name: 'Date', sub: '', w: 3.4, val: () => String(clock.date).padStart(2, ' '), bits: () => [bin(Math.floor(clock.date / 10), 4), bin(clock.date % 10, 4)], foot: () => `1 to ${daysIn(clock.month, clock.year, clock.knowsYear)} in ${MONTHS[clock.month - 1]}`, hot: true },
      month: { name: 'Month', sub: '', w: 3.4, val: () => String(clock.month).padStart(2, ' '), bits: () => [bin(Math.floor(clock.month / 10), 4), bin(clock.month % 10, 4)], foot: () => `${MONTHS[clock.month - 1]} · 1 to 12` },
      year: { name: 'Year', sub: '', w: 3.6, val: () => String(clock.year), small: true, bits: () => [], foot: () => (clock.knowsYear ? (isLeap(clock.year) ? 'leap: Feb has 29' : 'not a leap year') : 'not in this watch') },
    };
    const slabMat = M.plastic(0x1b1e25, { roughness: 0.35 });
    for (const [id, m] of Object.entries(MODS)) {
      const [x, y] = P[id], Wpx = Math.round(m.w * 110), Hpx = 312;
      const slab = box(m.w + 0.12, 2.96, 0.4, slabMat); slab.position.set(x, y, 0); root.add(slab);
      m.board = board(root, m.w, 2.84, Wpx, Hpx, (g, W, H) => {
        const off = id === 'year' && !clock.knowsYear;
        g.fillStyle = '#12151c'; g.fillRect(0, 0, W, H); g.strokeStyle = m.hot ? COL.carry : 'rgba(255,255,255,.22)'; g.lineWidth = 4; g.strokeRect(2, 2, W - 4, H - 4);
        text(g, m.name, 12, 38, { font: 'bold 32px sans-serif', col: '#e8eef8' }); if (m.sub) text(g, m.sub, W - 12, 38, { font: '27px sans-serif', col: COL.soft, align: 'right' });
        g.fillStyle = off ? '#5b6152' : COL.lcd; g.fillRect(12, 50, W - 24, 138);
        const v = m.val(), hgt = m.small ? 92 : 112, cw = hgt * 0.5 + 16, x0 = (W - v.length * cw + 16) / 2;
        [...v].forEach((ch, i) => drawChar(g, ch, x0 + i * cw, 50 + (138 - hgt) / 2, hgt, { nine: !!m.nine }));
        const bits = m.bits();
        if (bits.length) { const sz = bits.length > 1 ? 30 : 38, gp = 5, tw = bits.length * (4 * (sz + gp)) + (bits.length - 1) * 14, bx = (W - tw) / 2; bits.forEach((b, i) => bitBoxes(g, b, bx + i * (4 * (sz + gp) + 14), 200, sz, gp)); }
        else text(g, off ? 'no year counter' : (clock.year % 4 === 0 ? 'divides by 4' : 'not ÷ 4'), W / 2, 232, { font: '30px sans-serif', col: COL.soft, align: 'center' });
        text(g, m.foot(), W / 2, 290, { font: '29px sans-serif', col: m.hot ? COL.carry : COL.soft, align: 'center' });
      }, [x, y, 0.26]);
      m.key = '';
    }
    const srcLamp = sphere(0.3, M.plastic(0x2a2f3b)); srcLamp.position.set(P.src[0], P.src[1], 0.1); root.add(srcLamp);
    const srcOn = M.glow(HEX.carry), srcOff = srcLamp.material;
    // Carry wires: each glows and sends a dot along it when its carry fires.
    const LINKS = [['src', 's1', 0], ['s1', 's10', CARRY.s10], ['s10', 'm1', CARRY.min], ['m1', 'm10', CARRY.m10], ['m10', 'h', CARRY.hour], ['h', 'dow', CARRY.day], ['h', 'date', CARRY.day], ['date', 'month', CARRY.month], ['month', 'year', CARRY.year]].map(([a, b, flag]) => {
      const A = [P[a][0], P[a][1], -0.12], B = [P[b][0], P[b][1], -0.12];
      const off = M.plastic(0x485062, { roughness: 0.6 }), on = M.glow(HEX.carry);
      const wire = beam(A, B, 0.07, off, 10); root.add(wire);
      const dot = sphere(0.17, M.glow(HEX.one), 12); dot.visible = false; root.add(dot);
      return { A, B, flag, wire, off, on, dot, t: 0 };
    });
    // ---------------------------------------------------------------- what the watch face shows
    let faceKey = '';
    const face = board(root, 5.6, 3.36, 900, 540, (g, W, H) => drawFace(g, W, H, faceOf(clock, st.h24, { chime: true })), [P.lcd[0], P.lcd[1], 0]);
    const bezel = box(6.1, 3.86, 0.3, M.plastic(0x23262d, { roughness: 0.5 })); bezel.position.set(P.lcd[0], P.lcd[1], -0.18); root.add(bezel);
    const Ls = {
      src: stage.label('1 Hz in', [P.src[0], P.src[1] + 0.75, 0], root, 'hot'),
      carry: stage.label('carry', [(P.s10[0] + P.m1[0]) / 2, P.s10[1] + 0.5, 0.3], root),
      face: stage.label('What the watch shows', [P.lcd[0], P.lcd[1] - 2.3, 0], root),
      cal: stage.label('Once a day', [(P.h[0] + P.date[0]) / 2 + (tall ? 0 : 1.2), (P.h[1] + P.date[1]) / 2, 0], root),
    };
    let acc = 0, ticks = 0, lastCarry = 'none yet', sp = 1;
    const names = [[CARRY.year, 'December → new year'], [CARRY.month, 'date → month'], [CARRY.day, 'hours → date'], [CARRY.hour, 'minutes → hours'], [CARRY.min, 'seconds → minutes'], [CARRY.s10, 'ones → tens of seconds']];
    const redrawAll = () => {
      for (const [id, m] of Object.entries(MODS)) { const k = m.val() + m.foot() + (id === 'year' ? clock.knowsYear : ''); if (k !== m.key) { m.key = k; m.board.redraw(); } }
      const fk = `${clock.s}|${clock.m}|${clock.h}|${clock.date}|${clock.dow}|${st.h24}`; if (fk !== faceKey) { faceKey = fk; face.redraw(); }
    };
    return {
      jump(o, s) { clock.set(o); acc = 0; if (s && s.speed > 60) s.speed = 1; LINKS.forEach((l) => { l.t = 0; }); redrawAll(); },
      update(dt, s) {
        dt = Math.max(0, dt);
        fitTall(stage, TALL);
        fitNarrow(stage, [Ls.face, Ls.cal, Ls.carry], -0.17);
        if (tall) Ls.face.visible = false;
        st.h24 = s.h24; clock.knowsYear = s.year; sp = s.speed;
        acc += dt * s.speed;
        let n = Math.min(200000, Math.floor(acc)), all = 0; acc -= Math.floor(acc);
        for (let i = 0; i < n; i++) { const f = clock.tick(); all |= f; ticks++; }
        if (n > 0) {
          LINKS[0].t = 0.3;
          for (const l of LINKS) if (l.flag & all) l.t = 0.45;
          const nm = names.find(([f]) => f & all); if (nm && (s.speed <= 60 || nm[0] >= CARRY.day)) lastCarry = nm[1];
        }
        for (const l of LINKS) {
          const live = l.t > 0; l.t = Math.max(0, l.t - dt);
          l.wire.material = live ? l.on : l.off;
          const k = clamp(1 - l.t / 0.45, 0, 1); l.dot.visible = live && s.speed <= 3600;
          if (l.dot.visible) l.dot.position.set(l.A[0] + (l.B[0] - l.A[0]) * k, l.A[1] + (l.B[1] - l.A[1]) * k, 0.05);
        }
        srcLamp.material = LINKS[0].t > 0.12 ? srcOn : srcOff;
        redrawAll();
      },
      readout(s) {
        const dim = daysIn(clock.month, clock.year, clock.knowsYear);
        return slim(stage, `<div class="big">${timeStr(clock, s.h24)}</div>
          <div class="row"><span>Date</span><b>${dateStr(clock)}</b></div>
          <div class="row"><span>${MONTHS[clock.month - 1]} has</span><b>${dim} days${clock.month === 2 ? (clock.knowsYear ? (isLeap(clock.year) ? ' (leap year)' : '') : ' (no year stored)') : ''}</b></div>
          <div class="row"><span>Last carry</span><b>${lastCarry}</b></div>
          <small>${!clock.knowsYear && clock.month === 3 && clock.date === 1 && isLeap(clock.year) ? 'It skipped 29 February: this watch is now a day ahead.' : sp > 1 ? `${Math.round(sp).toLocaleString('en-US')} ticks every second.` : `Seconds in BCD: ${bin(Math.floor(clock.s / 10), 4)} ${bin(clock.s % 10, 4)}`}</small>`);
      },
    };
  },
};
