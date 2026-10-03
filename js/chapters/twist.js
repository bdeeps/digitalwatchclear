// Chapter 5: one segment up close. A reflective twisted-nematic (TN) cell, drawn as the stack it
// is, from the front (top) to the back (bottom):
//   front polariser (passes light vibrating along X) · front glass with a clear electrode in the
//   shape of the segment · liquid crystal, its rod-shaped molecules lying along X at the top and
//   turning smoothly to Z at the bottom (a 90° twist set by rubbing the two glass surfaces at right
//   angles) · back glass with the shared electrode · back polariser, crossed (passes Z) · reflector.
// No voltage: the light's vibration follows the twist, turns from X to Z, passes the back polariser,
//   bounces off the reflector and comes back the same way. The segment looks clear.
// Voltage: the molecules stand up along the field, the twist is gone, the light stays along X and
//   the back polariser absorbs it. The segment looks dark.
// (Schadt and Helfrich, Appl. Phys. Lett. 18, 127 (1971); Wikipedia, "Twisted nematic field effect".)
// Numbers (see dwatch.js for the sources): threshold about 1.2 V, fully dark by about 2 V (it varies
// with the mixture); response about 230 ms at 25 °C, doubling for every 11.4 °C colder; a 1.5 mm²
// segment across an 8 µm gap is a 13 pF capacitor, and flipping 3 V across it 64 times a second
// takes about 5 nA. The drive must be AC: a steady voltage slowly breaks the liquid down
// (Microchip AN658). The molecules respond to the size of the field, not its direction, so
// flipping it does not disturb them.
import { THREE, M, box, beam, swarm, arrow, canvasTexture, clamp, approach } from '../kit.js';
import { LC, standUp, through, reflectance, responseMs, segCapPF, segCurrentNA, drawChar, board, panelBg, text, mono, fitNarrow, fitTall, slim, isTall, COL } from '../dwatch.js';

const SEG_MM2 = 1.5;                                   // one bar of a main digit: about 2.5 × 0.6 mm
const LIGHTS = { day: 'Room light', dark: 'Dark', lamp: 'Dark + lamp' };

const TALL = { pos: [1.8, 10.6, 12.6], target: [0, 8.9, 0] };

export default {
  id: 'twist',
  short: 'One segment up close',
  title: 'A sandwich that twists light',
  subtitle: 'A segment makes no light. It either lets room light bounce back out, or swallows it.',
  view: { pos: [5.2, 9.5, 19], target: [0.9, 6.7, 0] },
  learn: `<p>How does a bar on the glass turn from clear to black? It is a sandwich, and the filling is a <b>liquid crystal</b>: a liquid whose rod-shaped molecules line up with each other.</p>
    <p>Light from the room first meets a <b>polariser</b>, a filter that only passes light vibrating one way. Below it, the molecules lie flat, but each layer is turned a little from the one above, making a smooth <b>quarter-turn twist</b> from top to bottom. The light's vibration follows the molecules round, like a hand following a spiral banister.</p>
    <p>At the bottom is a second polariser, turned 90° to the first. Without the twist it would block everything. With the twist, the light arrives turned by exactly 90° and slips through. It hits a <b>reflector</b>, comes back the same way, and you see a pale, clear segment.</p>
    <p>Now put about 3 volts between the two clear <b>electrodes</b>. The molecules stand up along the electric field and the twist is gone. The light keeps its direction, the second polariser swallows it, and the segment looks <b>dark</b>. Remove the voltage and the molecules relax back into their twist.</p>
    <p>This is why an LCD sips power: it makes no light, it only steers the room's light. It is also why you cannot read it in the dark without a lamp: a tiny bulb or LED at the edge, or in later watches a thin sheet behind the display that glows all over. In the cold the liquid thickens and the digits change sluggishly. Seen from a steep angle, light crosses the layer on a slant, the twist no longer turns it by exactly 90°, and the contrast fades.</p>
    <p>The voltage is flipped back and forth dozens of times a second. A steady voltage would slowly destroy the liquid, and the molecules do not care which way the field points. A TV screen is millions of these cells with a backlight and colour filters: see <a href="https://glassbox.how/tvclear/" target="_blank" rel="noopener">TVClear</a>.</p>
    <p class="tip"><b>Try it:</b> slide the voltage up past 1.2 V and watch the molecules stand. Then set the temperature to −20 °C and switch the segment on and off.</p>`,
  terms: [
    { t: 'Liquid crystal', d: 'A liquid whose rod-shaped molecules keep a common direction, and can be turned by an electric field.' },
    { t: 'Polariser', d: 'A filter that passes only light vibrating in one direction.' },
    { t: 'Twisted nematic', d: 'The LCD type in which the molecules make a quarter-turn twist between the two glass plates.' },
    { t: 'Crossed polarisers', d: 'Two polarisers turned 90° to each other. Together they block light, unless something turns it in between.' },
    { t: 'Reflective display', d: 'A display with a mirror-like layer behind it, lit by the light in the room.' },
    { t: 'ITO', d: 'Indium tin oxide: a clear coating that conducts electricity, used for the electrodes on the glass.' },
  ],
  defaults: { volts: 0, temp: 25, light: 'day', ac: true },
  controls: [
    { key: 'volts', type: 'range', label: 'Voltage across the segment', min: 0, max: 3.5, step: 0.05, ends: ['0 V', '3.5 V'], fmt: (v) => `${v.toFixed(2)} V` },
    { key: 'go', type: 'buttons', label: 'Switch it', items: [{ label: 'Segment off (0 V)', act: (s) => { s.volts = 0; } }, { label: 'Segment on (3 V)', act: (s) => { s.volts = 3; } }] },
    { key: 'temp', type: 'range', label: 'Temperature', min: -20, max: 60, step: 1, ends: ['−20 °C', '60 °C'], fmt: (v) => `${v} °C: about ${fmtMs(responseMs(v))} to change` },
    { key: 'light', type: 'seg', label: 'Where you are', options: [{ v: 'day', label: 'Room light' }, { v: 'dark', label: 'Dark' }, { v: 'lamp', label: 'Dark + lamp' }] },
    { key: 'ac', type: 'toggle', label: 'Flip the voltage 64 times a second (AC)', hint: 'Off: a steady voltage still darkens the segment, but it slowly breaks the liquid down.' },
  ],
  quiz: [
    { q: 'With no voltage, why does light get through two polarisers set at 90° to each other?', options: ['It does not', 'The twisted liquid crystal turns the light by 90° on the way', 'The polarisers are too weak', 'The glass bends it'], answer: 1, why: 'The light’s vibration follows the quarter-turn twist of the molecules, so it arrives lined up with the second polariser.' },
    { q: 'What does the voltage do?', options: ['Heats the liquid until it goes black', 'Stands the molecules up, so the twist is lost and the light is blocked', 'Makes the segment glow black', 'Switches off the reflector'], answer: 1, why: 'Upright molecules do not turn the light. It reaches the crossed polariser un-turned and is absorbed.' },
    { q: 'Why can you not read a plain LCD watch in the dark?', options: ['The battery rests at night', 'It makes no light of its own: it only reflects the light around it', 'The crystal freezes', 'The digits are too small'], answer: 1, why: 'A reflective LCD needs light to fall on it. That is what the little lamp is for.' },
  ],
  reel: [
    { ms: 5600, caption: 'No voltage: the liquid crystal twists the light a quarter turn, it passes both polarisers and bounces back. The segment is clear.', set: { volts: 0, temp: 25, light: 'day', ac: true }, spin: 0.35 },
    { ms: 5600, caption: 'Three volts stand the molecules up. The twist is gone, the second polariser blocks the light, and the segment goes dark.', set: { temp: 25, light: 'day', ac: true }, anim: { volts: [0, 3] }, spin: 0.35 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const tall = isTall(stage);
    const cell = new THREE.Group(); cell.position.set(tall ? 0 : 3.2, tall ? 5.2 : 0, 0); root.add(cell);
    const WX = 5.2, WZ = 3.4;
    const Y = { pol1: 9.0, glass1: 8.0, top: 7.4, bot: 4.4, glass2: 3.8, pol2: 2.9, mirror: 2.2, lamp: 1.55 };
    // ---------------------------------------------------------------- the layers
    const stripes = (alongX) => { const t = canvasTexture(256, 256, (g, W, H) => { g.fillStyle = 'rgba(70,84,110,.5)'; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(210,225,255,.6)'; for (let k = 6; k < 256; k += 18) alongX ? g.fillRect(0, k, W, 5) : g.fillRect(k, 0, 5, H); }); return t.tex; };
    const film = (y, tex) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(WX, WZ), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = y; cell.add(m); return m; };
    film(Y.pol1, stripes(true)); film(Y.pol2, stripes(false));
    const glassMat = () => M.clear(0xcfe8ff, 0.2);
    const g1 = box(WX, 0.3, WZ, glassMat()); g1.position.y = Y.glass1; cell.add(g1);
    const g2 = box(WX, 0.3, WZ, glassMat()); g2.position.y = Y.glass2; cell.add(g2);
    const ito1 = box(3.6, 0.03, 1.5, M.clear(0xffd166, 0.32)); ito1.position.y = Y.glass1 - 0.18; cell.add(ito1);
    const ito2 = box(WX * 0.94, 0.03, WZ * 0.9, M.clear(0x8ef0ff, 0.2)); ito2.position.y = Y.glass2 + 0.18; cell.add(ito2);
    const mirror = box(WX, 0.1, WZ, M.metal(0xdfe6ee, { roughness: 0.3 })); mirror.position.y = Y.mirror; cell.add(mirror);
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x4a4636, roughness: 0.5, emissive: 0xffc04a, emissiveIntensity: 0 });
    const lampPanel = box(WX, 0.14, WZ, lampMat); lampPanel.position.y = Y.lamp; cell.add(lampPanel);
    // ---------------------------------------------------------------- the molecules
    const NL = 9, NX = 5, NZ = 3;
    const rods = swarm(NL * NX * NZ, new THREE.CapsuleGeometry(0.075, 0.42, 4, 8), M.plastic(0xc49bff, { roughness: 0.4 })); cell.add(rods);
    // ---------------------------------------------------------------- light: down on the left, back up on the right
    const XD = -1.15, XU = 1.15, TOP = 11.4;
    const rayMat = () => M.glow(0xfff2c0, { transparent: true, opacity: 0.9 });
    const down1 = beam([XD, TOP, 0], [XD, Y.pol2, 0], 0.05, rayMat()); cell.add(down1);
    const down2 = beam([XD, Y.pol2, 0], [XD, Y.mirror + 0.05, 0], 0.05, rayMat()); cell.add(down2);
    const turn = beam([XD, Y.mirror + 0.07, 0], [XU, Y.mirror + 0.07, 0], 0.04, rayMat()); cell.add(turn);
    const up = beam([XU, Y.mirror + 0.05, 0], [XU, TOP, 0], 0.05, rayMat()); cell.add(up);
    const lampRay = beam([XU, Y.lamp, 0], [XU, Y.mirror, 0], 0.05, rayMat()); cell.add(lampRay);
    const paddle = (x, y, len = 1.0) => { const p = box(len, 0.05, 0.09, M.glow(0xffd166, { transparent: true })); p.position.set(x, y, 0); cell.add(p); return p; };
    const any = [0, 1, 2].map((i) => { const p = paddle(XD, 10.3, 0.9); p.rotation.y = (i * Math.PI) / 3; return p; });
    const lcY = [0, 0.25, 0.5, 0.75, 1].map((f) => Y.top + 0.25 - f * (Y.top - Y.bot + 0.5));
    const pd = [paddle(XD, 8.55), ...lcY.map((y) => paddle(XD, y)), paddle(XD, Y.pol2 - 0.35)];
    const pu = [paddle(XU, Y.pol2 + 0.42), ...[...lcY].reverse().map((y) => paddle(XU, y)), paddle(XU, 8.55), paddle(XU, 10.0)];
    const eye = new THREE.Group(); eye.position.set(XU, TOP + 0.5, 0); cell.add(eye);
    eye.add(new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14), M.plastic(0xf2eee4)));
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), M.plastic(0x1b1e25)); pupil.position.y = -0.27; eye.add(pupil);
    // The electric field between the two electrodes.
    const field = [-2.2, 2.2].map((x) => { const a = arrow(0xff7a59, 2.4, 0.4, 0.05); a.position.set(x, Y.bot + 0.3, 1.2); cell.add(a); return a; });
    // ---------------------------------------------------------------- the board: curve, and what you see
    const st = { up: 0, v: 0, light: 'day', key: '' };
    const B = tall ? { w: 9.6, h: 4.4, pos: [0, 2.6, 0] } : { w: 7.6, h: 5.46, pos: [-5.4, 4.4, 0.4] };
    const chart = board(root, B.w, B.h, 640, tall ? 293 : 460, (g, W, H) => {
      panelBg(g, W, H);
      const split = tall; const cw = split ? 340 : W, ch = split ? H : 262;
      text(g, 'Light that comes back', 16, 36, { font: 'bold 30px sans-serif', col: '#e8eef8' });
      const x0 = 74, y0 = ch - 44, w = cw - 100, h = ch - 104, X = (v) => x0 + (v / 3.5) * w, Yp = (r) => y0 - (r / 0.4) * h;
      g.strokeStyle = COL.grid; g.lineWidth = 2; [0, 1, 2, 3].forEach((v) => { g.beginPath(); g.moveTo(X(v), y0); g.lineTo(X(v), y0 - h); g.stroke(); text(g, v + ' V', X(v), y0 + 32, { font: '26px sans-serif', col: COL.soft, align: 'center' }); });
      [0, 0.2, 0.4].forEach((r) => text(g, Math.round(r * 100) + '%', x0 - 10, Yp(r) + 9, { font: '26px sans-serif', col: COL.soft, align: 'right' }));
      g.strokeStyle = COL.cool; g.lineWidth = 5; g.beginPath(); for (let v = 0; v <= 3.5; v += 0.05) { const r = reflectance(standUp(v)); v ? g.lineTo(X(v), Yp(r)) : g.moveTo(X(v), Yp(r)); } g.stroke();
      g.fillStyle = COL.one; g.beginPath(); g.arc(X(clamp(st.v, 0, 3.5)), Yp(reflectance(st.up)), 11, 0, Math.PI * 2); g.fill();
      // What the eye sees: a digit, and next to it the one bar that is the segment in the model.
      const px = split ? 356 : 14, py = split ? 14 : 276, pw = split ? W - 370 : W - 28, ph = split ? H - 28 : 170;
      const amb = st.light === 'day' ? 1 : st.light === 'lamp' ? 0.42 : 0.03, tint = st.light === 'lamp' ? [255, 210, 120] : [180, 190, 160];
      const shade = (r) => `rgb(${tint.map((c) => Math.round(c * amb * clamp(r / LC.rOff, 0, 1) + 6)).join(',')})`;
      const rSeg = st.light === 'lamp' ? LC.rOn + (LC.rOff - LC.rOn) * through(st.up) : reflectance(st.up);
      g.fillStyle = shade(LC.rOff); g.fillRect(px, py, pw, ph);
      const hgt = ph - 56, dx = px + pw / 2 - hgt * 0.62;
      drawChar(g, '4', dx, py + 12, hgt, { on: shade(LC.rOn), off: shade(LC.rOff * 0.93) });
      drawChar(g, ' ', dx + hgt * 0.72, py + 12, hgt, { on: shade(LC.rOn), off: shade(LC.rOff * 0.93) });
      drawChar(g, '-', dx + hgt * 0.72, py + 12, hgt, { on: shade(rSeg), off: 'rgba(0,0,0,0)' });
      text(g, st.light === 'dark' ? 'Nothing to reflect' : split ? 'What you see' : 'What you see: the middle bar is ours', px + 10, py + ph - 12, { font: '24px sans-serif', col: st.light === 'dark' ? 'rgba(255,255,255,.7)' : 'rgba(0,0,0,.66)' });
    }, B.pos);
    const R = WX / 2 + 0.5, lab = (t, y, cls) => { const l = stage.label(t, [R, y, 1.2], cell, cls); l.element.style.transform += ' translateX(50%)'; return l; };
    const Ls = {
      room: stage.label('Room light', [XD - 1.5, TOP - 0.9, 0], cell),
      p1: stage.label('Polariser', [R + 1.2, Y.pol1, 1.2], cell),
      g1: stage.label('Glass + clear electrode', [R + 2.3, Y.glass1, 1.2], cell),
      lc: stage.label('Liquid crystal: 90° twist', [R + 2.4, (Y.top + Y.bot) / 2, 1.2], cell, 'hot'),
      p2: stage.label('Polariser, turned 90°', [R + 2.2, Y.pol2 + 0.2, 1.2], cell),
      mir: stage.label('Reflector', [R + 1.2, Y.mirror - 0.1, 1.2], cell),
      lamp: stage.label('Lamp', [R + 0.8, Y.lamp - 0.4, 1.2], cell),
      eye: stage.label('Your eye', [XU + 1.5, TOP + 0.6, 0], cell),
    };
    void lab;
    let upNow = 0, t = 0;
    const setOp = (m, o) => { m.material.opacity = o; m.visible = o > 0.03; };
    return {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        fitTall(stage, TALL);
        const narrow = fitNarrow(stage, [Ls.room, Ls.g1, Ls.p2, Ls.mir, Ls.lamp, Ls.eye, Ls.p1], -0.17);
        Ls.lc.element.textContent = narrow ? 'Twist' : 'Liquid crystal: 90° twist';
        // The molecules take time to turn: 10 to 90% in about 2.2 time constants.
        const tau = responseMs(s.temp) / 1000 / 2.2;
        upNow = approach(upNow, standUp(s.volts), 1 / tau, dt);
        let i = 0;
        for (let k = 0; k < NL; k++) {
          const f = k / (NL - 1), phi = f * Math.PI / 2;
          const tilt = (Math.PI / 2) * upNow * Math.sin(Math.PI * (0.06 + 0.88 * f));     // anchored at the glass, free in the middle
          const y = Y.top - f * (Y.top - Y.bot);
          for (let a = 0; a < NX; a++) for (let b = 0; b < NZ; b++) rods.place(i++, [-2.0 + a * 1.0, y, -1.1 + b * 1.1], [0, phi, -(Math.PI / 2 - tilt)]);
        }
        rods.done();
        const rot = (Math.PI / 2) * (1 - upNow), T = through(upNow);
        const day = s.light === 'day', lampOn = s.light === 'lamp';
        lampMat.emissiveIntensity = lampOn ? 1.6 : 0;
        // Down path (room light only).
        any.forEach((p) => { p.visible = day; });
        setOp(down1, day ? 0.9 : 0); setOp(down2, day ? 0.9 * T : 0); setOp(turn, day ? 0.9 * T : 0);
        pd.forEach((p, k) => { const f = clamp((k - 1) / 4, 0, 1); p.rotation.y = k === 0 ? 0 : k === pd.length - 1 ? Math.PI / 2 : rot * f; p.visible = day && (k < pd.length - 1 || T > 0.05); if (k === pd.length - 1) p.scale.x = Math.max(0.1, T); });
        // Up path: reflected room light (two passes) or lamp light (one pass).
        const src = day ? T : lampOn ? 1 : 0, out = src * T;
        setOp(lampRay, lampOn ? 0.9 : 0); setOp(up, 0.9 * (day || lampOn ? Math.max(out, 0) : 0));
        up.scale.x = up.scale.z = 1;
        pu.forEach((p, k) => {
          const f = clamp((k - 1) / 4, 0, 1);                       // 0 at the bottom of the layer, 1 at the top
          const ang = Math.PI / 2 - rot * f; p.rotation.y = k === 0 ? Math.PI / 2 : k >= 6 ? 0 : ang;
          const amp = k >= 6 ? out : src; p.visible = amp > 0.05; p.scale.x = Math.max(0.1, amp);
        });
        // The field flips direction (shown slowed down); the molecules do not care which way it points.
        const on = s.volts > 0.1, sign = s.ac ? (Math.floor(t * 3) % 2 ? -1 : 1) : 1;
        field.forEach((a) => { a.set(0.6 + 0.5 * s.volts); a.visible = on; a.rotation.z = sign > 0 ? 0 : Math.PI; a.position.y = sign > 0 ? Y.bot + 0.3 : Y.top - 0.3; });
        const key = `${upNow.toFixed(3)}|${s.volts}|${s.light}`;
        if (key !== st.key) { st.key = key; st.up = upNow; st.v = s.volts; st.light = s.light; chart.redraw(); }
      },
      readout(s) {
        const T = through(upNow), r = reflectance(upNow), ms = responseMs(s.temp);
        const state = Math.abs(upNow - standUp(s.volts)) > 0.04 ? 'changing…' : upNow > 0.9 ? 'dark (on)' : upNow < 0.1 ? 'clear (off)' : 'grey';
        return slim(stage, `<div class="big">${s.volts.toFixed(1)} V: ${state}</div>
          <div class="row"><span>${s.light === 'day' ? 'Room light sent back' : s.light === 'lamp' ? 'Lamp light let through' : 'Light to see by'}</span><b>${s.light === 'dark' ? 'none' : Math.round(100 * (s.light === 'day' ? r : T)) + '%'}</b></div>
          <div class="row"><span>Time to change at ${s.temp} °C</span><b class="${ms > 1000 ? 'no' : 'ok'}">${fmtMs(ms)}</b></div>
          <div class="row"><span>Current to drive it</span><b>${s.volts < 0.1 ? '0' : s.ac ? segCurrentNA(SEG_MM2, s.volts).toFixed(1) + ' nA' : 'steady DC'}</b></div>
          <small>${!s.ac && s.volts > 0.1 ? 'A steady voltage slowly breaks the liquid down. Real watches always flip it.' : `The segment is a ${segCapPF(SEG_MM2).toFixed(0)} pF capacitor. A nanoamp is a billionth of an amp.`}</small>`);
      },
    };
  },
};
function fmtMs(ms) { return ms >= 1000 ? (ms / 1000).toFixed(1) + ' s' : Math.round(ms / 10) * 10 + ' ms'; }
