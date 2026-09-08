/* XP-L4B — animated interactive hero background.
 *
 * A low-poly field built from the same shape language as the mark in
 * assets/logo-oriz.png: triangles cut out of a jittered grid, tinted across
 * the brand's violet → teal → mint range and lit by the pointer.
 *
 * Cheap on purpose: the triangulation is built once (two triangles per grid
 * cell) and only the vertex offsets animate, so a full frame is ~200 fills.
 * It stops when the hero scrolls away or the tab is hidden, and renders a
 * single static frame when the visitor prefers reduced motion.
 */
(() => {
  'use strict';

  const canvas = document.getElementById('hero-canvas');
  if (!canvas || !canvas.getContext) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Brand voices, sampled from the mark. Kept as RGB triplets so the frame
  // loop can mix them without parsing a color string per triangle.
  const VIOLET = [91, 75, 138];
  const TEAL = [58, 154, 184];
  const MINT = [108, 195, 178];

  const CELL = 108;          // target grid pitch in CSS px
  const JITTER = 0.34;       // vertex wander, as a fraction of the pitch
  const LIGHT_RADIUS = 260;  // pointer influence, CSS px

  let dpr = 1;
  let width = 0;
  let height = 0;
  let cols = 0;
  let rows = 0;
  let points = [];
  let triangles = [];
  let running = false;
  let frame = 0;
  let start = performance.now();

  // Pointer, in CSS px relative to the canvas. Parked far off-canvas until the
  // visitor actually moves a pointer over the hero.
  const pointer = { x: -9999, y: -9999, target: { x: -9999, y: -9999 }, active: false };

  function build() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cols = Math.max(3, Math.ceil(width / CELL));
    rows = Math.max(3, Math.ceil(height / CELL));

    const stepX = width / cols;
    const stepY = height / rows;

    points = [];
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        // Edge vertices stay pinned so the field bleeds off-canvas cleanly.
        const edge = c === 0 || r === 0 || c === cols || r === rows;
        points.push({
          x0: c * stepX,
          y0: r * stepY,
          x: c * stepX,
          y: r * stepY,
          ax: edge ? 0 : stepX * JITTER,
          ay: edge ? 0 : stepY * JITTER,
          // Per-vertex phase and speed keep the drift from reading as a pulse.
          px: Math.random() * Math.PI * 2,
          py: Math.random() * Math.PI * 2,
          sx: 0.16 + Math.random() * 0.22,
          sy: 0.16 + Math.random() * 0.22
        });
      }
    }

    const at = (c, r) => r * (cols + 1) + c;
    triangles = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Alternate the split direction so the field doesn't read as a weave.
        const flip = (r + c) % 2 === 0;
        const tl = at(c, r), tr = at(c + 1, r), bl = at(c, r + 1), br = at(c + 1, r + 1);
        const pair = flip
          ? [[tl, tr, bl], [tr, br, bl]]
          : [[tl, tr, br], [tl, br, bl]];

        for (const tri of pair) {
          // Tint by position: violet on the left, teal through the middle,
          // mint at the right edge — the mark's own left-to-right run.
          const t = (c + 0.5) / cols;
          const tone = t < 0.5
            ? mix(VIOLET, TEAL, t * 2)
            : mix(TEAL, MINT, (t - 0.5) * 2);
          triangles.push({
            i: tri,
            tone,
            // Static per-triangle weight, so the field has grain at rest.
            base: 0.018 + Math.random() * 0.05,
            phase: Math.random() * Math.PI * 2
          });
        }
      }
    }
  }

  function mix(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ];
  }

  function draw(now) {
    const t = (now - start) / 1000;
    const still = reduceMotion.matches;

    // Ease the pointer towards its target so a fast flick doesn't snap.
    pointer.x += (pointer.target.x - pointer.x) * 0.12;
    pointer.y += (pointer.target.y - pointer.y) * 0.12;

    for (const p of points) {
      if (still) {
        // Frozen mid-drift rather than snapped back to the grid: a perfect
        // lattice reads as graph paper, not as the mark's cut facets.
        p.x = p.x0 + Math.sin(p.px) * p.ax;
        p.y = p.y0 + Math.cos(p.py) * p.ay;
        continue;
      }
      p.x = p.x0 + Math.sin(t * p.sx + p.px) * p.ax;
      p.y = p.y0 + Math.cos(t * p.sy + p.py) * p.ay;
    }

    ctx.clearRect(0, 0, width, height);

    const lightOn = pointer.active && !still;

    for (const tri of triangles) {
      const a = points[tri.i[0]];
      const b = points[tri.i[1]];
      const c = points[tri.i[2]];

      let weight = tri.base;
      if (!still) weight += Math.sin(t * 0.5 + tri.phase) * 0.014;

      if (lightOn) {
        const cx = (a.x + b.x + c.x) / 3;
        const cy = (a.y + b.y + c.y) / 3;
        const d = Math.hypot(cx - pointer.x, cy - pointer.y);
        if (d < LIGHT_RADIUS) {
          const lift = 1 - d / LIGHT_RADIUS;
          weight += lift * lift * 0.30;
        }
      }

      if (weight <= 0.004) continue;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.closePath();
      ctx.fillStyle = `rgba(${tri.tone[0]}, ${tri.tone[1]}, ${tri.tone[2]}, ${weight.toFixed(3)})`;
      ctx.fill();
    }

    // Edges last, as one hairline pass over the whole field.
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(233, 233, 237, 0.05)';
    ctx.beginPath();
    for (const tri of triangles) {
      const a = points[tri.i[0]];
      const b = points[tri.i[1]];
      const c = points[tri.i[2]];
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.closePath();
    }
    ctx.stroke();

    if (still) return;
    frame = requestAnimationFrame(draw);
  }

  function play() {
    if (running) return;
    running = true;
    start = performance.now() - 1000; // resume mid-phase, not from a flat field
    frame = requestAnimationFrame(draw);
  }

  function pause() {
    running = false;
    cancelAnimationFrame(frame);
  }

  function renderOnce() {
    pause();
    requestAnimationFrame(draw);
  }

  // ── wiring ───────────────────────────────────────────────────────────────

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      build();
      if (reduceMotion.matches) renderOnce();
    }, 160);
  });

  canvas.parentElement.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return; // let a touch scroll the page
    const rect = canvas.getBoundingClientRect();
    pointer.target.x = e.clientX - rect.left;
    pointer.target.y = e.clientY - rect.top;
    if (!pointer.active) {
      pointer.x = pointer.target.x;
      pointer.y = pointer.target.y;
      pointer.active = true;
    }
  }, { passive: true });

  canvas.parentElement.addEventListener('pointerleave', () => {
    pointer.active = false;
    pointer.target.x = -9999;
    pointer.target.y = -9999;
  }, { passive: true });

  let visible = true;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
    else if (!reduceMotion.matches && visible) play();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (visible && !reduceMotion.matches && !document.hidden) play();
      else pause();
    }, { threshold: 0 }).observe(canvas);
  }

  const onMotionChange = () => {
    if (reduceMotion.matches) renderOnce();
    else if (visible) play();
  };
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', onMotionChange);

  build();
  if (reduceMotion.matches) renderOnce();
  else play();
})();
