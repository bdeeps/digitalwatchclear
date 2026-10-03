// Chapter 1: a plain LCD wristwatch, running, and taken apart layer by layer.
// The parts and their order are those of the common resin-cased digital watch: steel back with a
// piezo disc, a 3 V lithium coin cell, a plastic module frame holding the circuit board (bare chip
// under black epoxy, 32,768 Hz crystal can, trimmer capacitor, a small lamp), two rubber "zebra"
// connectors, the LCD glass, and the case with four push buttons. The shape is generic.
import { THREE, exploder, smooth, clamp } from '../kit.js';
import { makeWatch, makeClock, faceOf, timeStr, dateStr, fitNarrow, fitTall, slim, isTall, CELLS, BUTTONS } from '../dwatch.js';


const TALL = { pos: [3, 11.6, 18.4], target: [1.4, 8.6, 0] };

export default {
  id: 'anatomy',
  short: 'Inside the watch',
  title: 'Inside a digital watch',
  subtitle: 'One chip, one crystal, one coin cell and a piece of glass. No moving parts except four buttons.',
  view: { pos: [9, 14.5, 23], target: [0, 9, 0] },
  learn: `<p>A digital watch has almost nothing inside it. Take off the steel back and you find a <b>coin cell</b>, a little plastic block called the <b>module</b>, and that is nearly all.</p>
    <p>The module holds a small <b>circuit board</b>. On it sits one <b>chip</b>, glued straight to the board and sealed under a blob of black <b>epoxy</b>. Beside the chip is a tiny metal can with a <b>quartz crystal</b> inside. The crystal gives the beat, the chip counts the beats.</p>
    <p>On top lies the <b>LCD glass</b>, the display. It has no wires. Two pink rubber strips called <b>zebra connectors</b> are squeezed between the board and the glass. Each strip is made of hundreds of thin layers, conducting and insulating in turn, so it carries dozens of separate signals up to the glass without a single solder joint.</p>
    <p>A thin <b>piezo disc</b> is glued inside the steel back. It is the beeper, and a small spring from the board touches it. The four <b>buttons</b> are just steel pins. Push one and it presses a springy metal contact on the side of the module. A tiny lamp at the edge lights the display at night.</p>
    <p>That simplicity made it the cheapest accurate clock ever built. In the India of the 1980s and 90s, a digital watch from a footpath stall or a fair, with a light and an alarm, was many children's first gadget.</p>
    <p>A pocket calculator is built the same way: see <a href="https://glassbox.how/calculatorclear/" target="_blank" rel="noopener">CalculatorClear</a>. A watch with hands keeps the crystal and chip but adds a motor and gears: see <a href="https://glassbox.how/quartzclear/" target="_blank" rel="noopener">QuartzClear</a>.</p>
    <p class="tip"><b>Try it:</b> slide "Take it apart" and find the two zebra strips. Then press Light, or click a button on the watch.</p>`,
  terms: [
    { t: 'Module', d: 'The plastic block inside the case that holds the circuit board, the display and the cell.' },
    { t: 'Chip-on-board', d: 'A bare chip glued to the circuit board and covered with a blob of black epoxy.' },
    { t: 'LCD', d: 'Liquid crystal display: glass with segments that go dark when a small voltage is applied.' },
    { t: 'Zebra connector', d: 'A rubber strip with thin conducting layers that joins the board to the display glass by pressure alone.' },
    { t: 'Coin cell', d: 'A flat lithium battery. A CR2016 is 20 mm across, 1.6 mm thick and gives 3 volts.' },
    { t: 'Piezo disc', d: 'A brass disc with a ceramic layer that bends when a voltage is applied, making the beep.' },
  ],
  defaults: { explode: 0, xray: false },
  controls: [
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'exploded'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'xray', type: 'toggle', label: 'See-through case' },
    { key: 'btn', type: 'buttons', label: 'Press a button', items: [
      { label: 'Light', act: (s, inst) => inst.push('light') },
      { label: '12 / 24 hour', act: (s, inst) => inst.push('start') },
    ] },
  ],
  quiz: [
    { q: 'How does the signal get from the circuit board to the display glass?', options: ['Soldered wires', 'Rubber zebra strips squeezed between them', 'Radio', 'A ribbon of light'], answer: 1, why: 'The strips have thin conducting layers. Pressure alone joins each pad on the board to the pad above it on the glass.' },
    { q: 'What is under the black blob on the board?', options: ['The battery', 'The bare chip that runs the whole watch', 'The beeper', 'A magnet'], answer: 1, why: 'The chip is glued to the board and sealed in epoxy. It counts, drives the display and makes the beep tone.' },
    { q: 'What makes the beep?', options: ['A tiny loudspeaker with a magnet', 'A piezo disc glued inside the steel back', 'The quartz crystal', 'The display glass'], answer: 1, why: 'The piezo disc bends when the chip puts a voltage on it. The steel back acts as its sounding board.' },
  ],
  reel: [
    { ms: 5200, caption: 'A digital watch has no gears and no hands: just a chip, a crystal, a coin cell and a piece of glass.', set: { explode: 0, xray: false }, spin: 0.5 },
    { ms: 5800, caption: 'Take it apart: display glass, two rubber zebra strips, one chip under black epoxy, a 3 volt cell and a piezo beeper.', set: { xray: false }, anim: { explode: [0, 1] }, spin: 0.4 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    // The watch hangs from a pivot at the centre of the view. Closed, it is tipped to face you and
    // drawn larger; as it comes apart it stands upright and shrinks so the whole stack fits.
    const pivot = new THREE.Group(); pivot.position.set(2.0, 8.6, 0); root.add(pivot);
    const w = makeWatch(); pivot.add(w.group);
    const clock = makeClock();
    let h24 = false, light = 0, acc = 0, shown = '';
    const redraw = () => { const k = `${clock.s}|${h24}|${light > 0}`; if (k !== shown) { shown = k; w.screen.redraw(faceOf(clock, h24, { light: light > 0, chime: true })); } };
    redraw();
    stage.pickables.push(...w.pickables());

    const L = (t, parent, pos, cls) => stage.label(t, pos, parent, cls);
    const Ls = {
      glass: L('LCD glass', w.lcd, [0, 0.5, -2.2], 'hot'),
      zebra: L('Zebra connectors', w.zebra, [5.2, 0, -2.05]),
      chip: L('Chip under epoxy', w.module, [-5.6, 0.3, 1.6], 'hot'),
      xtal: L('Quartz crystal', w.module, [5.9, 0.3, 1.2]),
      trim: L('Trimmer', w.module, [4.9, 0.5, -2.6]),
      lamp: L('Lamp', w.module, [-4.6, 0.5, -2.2]),
      cell: L('3 V coin cell', w.cell, [2.2, 0, 2.6]),
      piezo: L('Piezo beeper', w.piezo, [-0.5, 0.3, 3.4], 'hot'),
      back: L('Steel back', w.back, [-5.4, 0, 1.6]),
      case: L('Resin case', w.body, [5.6, 0.6, 2.6]),
      btn: L('Buttons', w.buttons.start.g, [1.7, 0.2, 0]),
    };
    const setExplode = exploder([
      { obj: w.crystal, off: [0, 12.0, 0] },
      { obj: w.body, off: [0, 10.4, 0] },
      { obj: w.buttons.light.g, off: [-2.2, 10.4, 0] }, { obj: w.buttons.mode.g, off: [-2.2, 10.4, 0] },
      { obj: w.buttons.start.g, off: [2.2, 10.4, 0] }, { obj: w.buttons.reset.g, off: [2.2, 10.4, 0] },
      { obj: w.lcd, off: [0, 6.4, 0] },
      { obj: w.zebra, off: [0, 4.6, 0] },
      { obj: w.module, off: [0, 2.9, 0] },
      { obj: w.cell, off: [4.4, 1.2, 0.6] },
      { obj: w.back, off: [0, -0.9, 0] },
    ]);
    // After the explode moves the buttons, their pressed position is measured from the new home.
    const homes = {}; for (const k in w.buttons) homes[k] = w.buttons[k].g.userData.home.x;
    let pressed = {}, last = 'none yet';

    return {
      push(k) {
        pressed[k] = 0.22; last = BUTTONS[k].name;
        if (k === 'light') light = 1.5;
        if (k === 'start') h24 = !h24;
        redraw();
      },
      pick(o) { if (o.userData.btn) this.push(o.userData.btn); },
      update(dt, s) {
        dt = Math.max(0, dt);
        fitTall(stage, TALL);
        const tall = isTall(stage);
        const narrow = fitNarrow(stage, [Ls.trim, Ls.lamp, Ls.back, Ls.btn, Ls.case], -0.17);
        acc += dt; while (acc >= 1) { acc -= 1; clock.tick(); }
        if (light > 0) light -= dt;
        w.setLight(light > 0);
        redraw();
        setExplode(s.explode);
        const e = smooth(s.explode);
        // The shell backs the camera off on squarer stages; grow the model by the same factor so it keeps its size.
        const kk = tall ? 1 : clamp(1.45 / stage.camera.aspect, 1, 1.6);
        pivot.rotation.x = 0.8 * (1 - e); pivot.scale.setScalar(tall ? 1.3 - 0.38 * e : (1.07 - 0.17 * e) * kk ** 0.6); w.group.position.y = -(1.15 + 4.9 * e);
        for (const k in w.buttons) {
          const b = w.buttons[k], d = pressed[k] > 0 ? 1 : 0;
          if (pressed[k] > 0) pressed[k] -= dt;
          b.g.position.x -= b.dir * 0.22 * d;
        }
        const see = s.xray && s.explode < 0.05;
        w.caseMat.opacity = see ? 0.2 : 1; w.caseMat.depthWrite = !see;
        const open = s.explode > 0.25, inside = open || see;
        [Ls.zebra, Ls.chip, Ls.xtal, Ls.cell, Ls.piezo].forEach((l) => { l.visible = inside; });
        [Ls.trim, Ls.lamp, Ls.back].forEach((l) => { l.visible = open && !narrow; });
        Ls.case.visible = !narrow && !tall; Ls.glass.visible = true;
        Ls.btn.visible = !narrow && s.explode < 0.6;
        void homes;
      },
      readout: (s) => slim(stage, `<div class="big">${timeStr(clock, h24)}</div>
        <div class="row"><span>Date</span><b>${dateStr(clock)}</b></div>
        <div class="row"><span>Cell</span><b>${CELLS.cr2016.name} · 3 V · ${CELLS.cr2016.mAh} mAh</b></div>
        <div class="row"><span>Last button</span><b>${last}</b></div>
        <small>${s.explode > 0.25 ? 'Top to bottom: case, glass, zebra strips, module, cell, back.' : 'The only moving parts are the four buttons.'}</small>`),
    };
  },
};
