const Je = (r, t = "") =>
    `<svg class="wg-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${t}>${r}</svg>`,
  M1 =
    "M7 18.5h9.5a4 4 0 0 0 .6-7.95 5.5 5.5 0 0 0-10.6 1.2A3.4 3.4 0 0 0 7 18.5z";
function S1(r, t, e, i) {
  let s = "";
  for (let n = 0; n < 6; n++) {
    const o = (n / 6) * Math.PI * 2 - Math.PI / 2,
      a = r + Math.cos(o) * e,
      l = t + Math.sin(o) * e;
    s += `M${r} ${t}L${a.toFixed(2)} ${l.toFixed(2)}`;
    const c = r + Math.cos(o) * e * 0.58,
      h = t + Math.sin(o) * e * 0.58;
    for (const f of [-1, 1]) {
      const u = o + f * 0.75;
      s += `M${c.toFixed(2)} ${h.toFixed(2)}L${(c + Math.cos(u) * i).toFixed(2)} ${(h + Math.sin(u) * i).toFixed(2)}`;
    }
  }
  return s;
}
function A1(r, t, e, i, s = 8) {
  let n = "";
  for (let o = 0; o < s; o++) {
    const a = (o / s) * Math.PI * 2;
    n += `M${(r + Math.cos(a) * e).toFixed(2)} ${(t + Math.sin(a) * e).toFixed(2)}L${(r + Math.cos(a) * i).toFixed(2)} ${(t + Math.sin(a) * i).toFixed(2)}`;
  }
  return n;
}
function mP() {
  let r = "";
  for (let t = 0; t < 5; t++) {
    const e = (t / 5) * Math.PI * 2 - Math.PI / 2;
    r += `<ellipse cx="${(12 + Math.cos(e) * 4.9).toFixed(2)}" cy="${(12 + Math.sin(e) * 4.9).toFixed(2)}" rx="3.5" ry="4.1" transform="rotate(${((t / 5) * 360).toFixed(1)} ${(12 + Math.cos(e) * 4.9).toFixed(2)} ${(12 + Math.sin(e) * 4.9).toFixed(2)})"/>`;
  }
  return `<g fill="currentColor" stroke="none">${r}</g><circle cx="12" cy="12" r="2.1" style="fill:var(--wg-glyph-core,#3b2b26)" stroke="none"/>`;
}
const gP =
    "M12 2l1.5 3.5 2.3-1-.6 4.7 3.3-2.2-.2 2.6 3.3.3-2.2 2.7.9 1.7-4.1.3.4 2.2-3.9-1v5.7h-1.4v-5.7l-3.9 1 .4-2.2-4.1-.3.9-1.7-2.2-2.7 3.3-.3-.2-2.6 3.3 2.2-.6-4.7 2.3 1z",
  Mi = {
    hand: Je(
      '<path d="M8 14.8V6.4a1.4 1.4 0 0 1 2.8 0V11M10.8 10.6V4.8a1.4 1.4 0 0 1 2.8 0v5.8M13.6 10.8V6a1.4 1.4 0 0 1 2.8 0v5M16.4 11.4V8.4a1.4 1.4 0 0 1 2.8 0V14c0 3.9-2.7 6.6-6.4 6.6h-1c-2.2 0-3.6-.8-4.9-2.4l-2.8-3.3a1.4 1.4 0 0 1 2.1-1.9L8 14.8"/>',
    ),
    wind: Je(
      '<path d="M2.5 9.2h10a3 3 0 1 0-3-3"/><path d="M2.5 13.2h15.2a2.9 2.9 0 1 1-2.9 2.9"/><path d="M4.6 17.2h5.2" opacity=".7"/>',
    ),
    cloud: Je(`<path d="${M1}"/><path d="M19.6 2.6v3.6M17.8 4.4h3.6"/>`),
    fog: Je(
      '<path d="M3 8.5q2.25-1.6 4.5 0t4.5 0 4.5 0 4.5 0"/><path d="M5.2 12.5q2.2-1.6 4.4 0t4.4 0 4.4 0" opacity=".75"/><path d="M3 16.5q2.25-1.6 4.5 0t4.5 0 4.5 0 4.5 0"/>',
    ),
    wipe: Je(
      '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M7.2 16.6c2.4-4.8 6.2-7.6 10-8.4" stroke-width="3.4" opacity=".42"/><g fill="currentColor" stroke="none"><circle cx="7.4" cy="7.6" r="1"/><circle cx="10.9" cy="6.5" r=".75"/><circle cx="17" cy="15.4" r=".9"/><circle cx="13.6" cy="17.4" r=".7"/><circle cx="16.8" cy="11.9" r=".55"/></g>',
    ),
    clear: Je(`<path d="${M1}"/><path d="M4 3.5l16.5 17"/>`),
    reset: Je(
      '<path d="M3.8 12a8.2 8.2 0 1 0 2.4-5.8"/><path d="M6.2 2.6v3.6h3.6"/>',
    ),
    soundOn: Je(
      '<path d="M4 9.4h3.2L11.6 5.5v13l-4.4-3.9H4z"/><path d="M15.2 9.1a4.1 4.1 0 0 1 0 5.8"/><path d="M17.8 6.4a8 8 0 0 1 0 11.2"/>',
    ),
    soundOff: Je(
      '<path d="M4 9.4h3.2L11.6 5.5v13l-4.4-3.9H4z"/><path d="M15.6 9.6l4.8 4.8M20.4 9.6l-4.8 4.8"/>',
    ),
    fullscreen: Je('<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>'),
    fullscreenExit: Je('<path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/>'),
    eye: Je(
      '<path d="M2.5 12s3.5-6.4 9.5-6.4 9.5 6.4 9.5 6.4-3.5 6.4-9.5 6.4S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    ),
    eyeOff: Je(
      '<path d="M2.5 12s3.5-6.4 9.5-6.4 9.5 6.4 9.5 6.4-3.5 6.4-9.5 6.4S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/><path d="M4 3.8l16.2 16.4"/>',
    ),
    play: Je(
      '<path d="M8.5 5.6v12.8l10-6.4z" fill="currentColor" stroke-width="1.2"/>',
    ),
    pause: Je(
      '<g fill="currentColor" stroke="none"><rect x="7" y="5.5" width="3.6" height="13" rx="1.1"/><rect x="13.4" y="5.5" width="3.6" height="13" rx="1.1"/></g>',
    ),
    climate: Je(
      '<path d="M4.4 16.6a8 8 0 1 1 15.2 0"/><path d="M12 14.6l3.4-4.4"/><circle cx="12" cy="15" r="1.5" fill="currentColor"/><path d="M4.6 9.2l1.2.7M12 4.9v1.4M19.4 9.2l-1.2.7" opacity=".7"/>',
    ),
    close: Je('<path d="M7 7l10 10M17 7L7 17"/>'),
    next: Je('<path d="M9.5 6.5L15 12l-5.5 5.5"/>'),
    check: Je('<path d="M5.5 12.5l4.2 4.2 8.8-9.4"/>'),
    spark: Je(
      '<path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4M6 6l2.6 2.6M15.4 15.4L18 18M18 6l-2.6 2.6M8.6 15.4L6 18"/>',
    ),
    drop: Je(
      '<path d="M12 3.4c3.1 4.1 5.6 7.1 5.6 10.4a5.6 5.6 0 0 1-11.2 0c0-3.3 2.5-6.3 5.6-10.4z"/>',
      'stroke-width="2"',
    ),
    breeze: Je(
      '<path d="M3 9.5h10a3 3 0 1 0-3-3"/><path d="M3 14.5h14a3 3 0 1 1-3 3"/>',
      'stroke-width="2"',
    ),
    rain: Je(
      '<path d="M7 14.5h9.5a3.6 3.6 0 0 0 .5-7.1 5 5 0 0 0-9.6 1.1A3 3 0 0 0 7 14.5z"/><path d="M8.5 17.5l-1 2.5M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5"/>',
      'stroke-width="2"',
    ),
    flake: Je(`<path d="${S1(12, 12, 9, 3)}"/>`, 'stroke-width="2"'),
    spring: `<svg class="wg-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${mP()}</svg>`,
    summer: Je(
      `<circle cx="12" cy="12" r="4.3" fill="currentColor" stroke="none"/><path d="${A1(12, 12, 6.8, 9.6)}" stroke-width="1.9"/>`,
    ),
    autumn: `<svg class="wg-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${gP}" fill="currentColor"/></svg>`,
    winter: Je(`<path d="${S1(12, 12, 9.4, 3.2)}" stroke-width="1.7"/>`),
    sunFace: `<svg class="wg-face wg-face-sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${A1(12, 12, 8.2, 11, 12)}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    moonFace:
      '<svg class="wg-face wg-face-moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M11.5 4.5A7.5 7.5 0 1 0 19.3 13.6 6 6 0 0 1 11.5 4.5Z" fill="currentColor"/></svg>',
  },
  vP = ["spring", "summer", "autumn", "winter"],
  T1 = [
    {
      id: "hand",
      label: "Hand",
      key: "1",
      desc: "Grab & fling clouds · hold still to squeeze rain · shake for lightning · drag the sun",
    },
    {
      id: "wind",
      label: "Wind",
      key: "2",
      desc: "Sweep across the land to blow",
    },
    {
      id: "cloud",
      label: "Cloud",
      key: "3",
      desc: "Press in the sky to condense a cloud",
    },
    { id: "fog", label: "Fog", key: "4", desc: "Brush mist into the valley" },
    {
      id: "wipe",
      label: "Wipe",
      key: "5",
      desc: "Wipe condensation off the glass",
    },
  ];

export { Mi as icons, T1 as tools, vP as seasonKeys };
