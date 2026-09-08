/* agent-graph.js — 3D agent-netwerk, vanilla canvas, geen dependencies.
   Waarom zelf gerenderd en niet three.js: 4 KB i.p.v. ~600 KB, en de scene
   is simpel genoeg (punten + lijnen) om met de hand te projecteren.
   Respecteert prefers-reduced-motion en stopt buiten beeld. */
(function () {
  var canvas = document.getElementById('agentgraph');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Accentkleur uit het designsysteem halen i.p.v. hardcoden,
  // zodat een themawijziging in style.css ook hier doorwerkt.
  var css = getComputedStyle(document.documentElement);
  var ACCENT = (css.getPropertyValue('--accent') || '#ff6b35').trim();
  var LINE = 'rgba(255,255,255,';

  /* ---- scene ---------------------------------------------------------- */
  // Een agent-lus: input -> plan -> tools -> check -> output, met de
  // terugkoppeling die een agent onderscheidt van een simpele pipeline.
  var LABELS = ['taak', 'plan', 'tool', 'tool', 'check', 'klaar'];
  var nodes = [];
  var edges = [];

  function build() {
    nodes = [];
    edges = [];
    var R = 1.0;
    // Kernlus: 6 knopen op een gekantelde ring.
    for (var i = 0; i < 6; i++) {
      var a = (i / 6) * Math.PI * 2;
      nodes.push({
        x: Math.cos(a) * R,
        y: Math.sin(a) * R * 0.38,
        z: Math.sin(a) * R,
        r: 3.4,
        core: true,
        label: LABELS[i],
        pulse: i / 6
      });
    }
    for (var j = 0; j < 6; j++) edges.push([j, (j + 1) % 6, true]);
    edges.push([0, 3, true]); // terugkoppeling dwars door de lus

    // Satellieten: de systemen waar de agent in werkt.
    var sat = 14;
    for (var k = 0; k < sat; k++) {
      var t = k / sat;
      var ang = t * Math.PI * 2 + 0.4;
      var rad = 1.75 + (k % 3) * 0.22;
      var node = {
        x: Math.cos(ang) * rad,
        y: (((k * 37) % 100) / 100 - 0.5) * 1.15,
        z: Math.sin(ang) * rad,
        r: 1.5,
        core: false,
        label: null,
        pulse: t
      };
      nodes.push(node);
      edges.push([k % 6, nodes.length - 1, false]);
    }
  }
  build();

  /* ---- projectie ------------------------------------------------------ */
  var W = 0, H = 0, DPR = 1, cx = 0, cy = 0, scale = 1;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    /* 0.40 i.p.v. 0.5: het bijschrift zit onderaan de kaart, dus de graph
       schuift wat omhoog zodat de twee elkaar niet overlappen. */
    cx = W / 2; cy = H * 0.40;
    scale = Math.min(W, H) * 0.195;
  }

  function project(n, rot, tiltCos, tiltSin) {
    // Y-rotatie, dan X-kanteling, dan perspectiefdeling.
    var c = Math.cos(rot), s = Math.sin(rot);
    var x = n.x * c - n.z * s;
    var z = n.x * s + n.z * c;
    var y = n.y * tiltCos - z * tiltSin;
    z = n.y * tiltSin + z * tiltCos;
    var persp = 3.2 / (3.2 + z);
    return { sx: cx + x * scale * persp, sy: cy + y * scale * persp, d: persp, z: z };
  }

  /* ---- teken ---------------------------------------------------------- */
  var t0 = performance.now();
  var running = false;
  var rafId = null;

  function frame(now) {
    if (!W) { resize(); if (!W) { rafId = requestAnimationFrame(frame); return; } }
    var time = (now - t0) / 1000;
    var rot = reduced ? 0.6 : time * 0.16;
    var tilt = 0.42 + (reduced ? 0 : Math.sin(time * 0.22) * 0.05);
    var tc = Math.cos(tilt), ts = Math.sin(tilt);

    ctx.clearRect(0, 0, W, H);

    var p = new Array(nodes.length);
    for (var i = 0; i < nodes.length; i++) p[i] = project(nodes[i], rot, tc, ts);

    // Lijnen eerst, met diepte-afhankelijke opacity.
    for (var e = 0; e < edges.length; e++) {
      var a = p[edges[e][0]], b = p[edges[e][1]], core = edges[e][2];
      var depth = (a.d + b.d) / 2;
      var alpha = (core ? 0.30 : 0.11) * Math.max(0, (depth - 0.62) * 2.6);
      if (alpha <= 0.004) continue;
      ctx.strokeStyle = LINE + alpha.toFixed(3) + ')';
      ctx.lineWidth = core ? 1.1 : 0.7;
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.stroke();
    }

    // Signaal dat de lus rondloopt: één accentpunt per kernrand.
    if (!reduced) {
      for (var q = 0; q < 6; q++) {
        var f = (time * 0.28 + q / 6) % 1;
        var from = p[q], to = p[(q + 1) % 6];
        var sx = from.sx + (to.sx - from.sx) * f;
        var sy = from.sy + (to.sy - from.sy) * f;
        var dd = from.d + (to.d - from.d) * f;
        var sa = Math.max(0, (dd - 0.62) * 2.2);
        if (sa <= 0.01) continue;
        ctx.fillStyle = ACCENT;
        ctx.globalAlpha = Math.min(1, sa) * 0.85;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.9 * dd, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Knopen van achter naar voor, zodat overlap klopt.
    var order = [];
    for (var n = 0; n < nodes.length; n++) order.push(n);
    order.sort(function (u, v) { return p[v].z - p[u].z; });

    for (var o = 0; o < order.length; o++) {
      var idx = order[o], nd = nodes[idx], pr = p[idx];
      var vis = Math.max(0, (pr.d - 0.60) * 2.4);
      if (vis <= 0.01) continue;
      var rr = nd.r * pr.d;
      if (nd.core) {
        ctx.fillStyle = ACCENT;
        ctx.globalAlpha = Math.min(1, vis);
        ctx.beginPath();
        ctx.arc(pr.sx, pr.sy, rr, 0, Math.PI * 2);
        ctx.fill();
        // halo
        ctx.globalAlpha = Math.min(1, vis) * 0.13;
        ctx.beginPath();
        ctx.arc(pr.sx, pr.sy, rr * 3.1, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = Math.min(1, vis) * 0.42;
        ctx.beginPath();
        ctx.arc(pr.sx, pr.sy, rr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    rafId = requestAnimationFrame(frame);
  }

  function start() { if (!running) { running = true; t0 = performance.now(); rafId = requestAnimationFrame(frame); } }
  function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = null; }

  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  // Alleen renderen zolang de canvas in beeld is.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) start(); else stop();
    }, { threshold: 0.01 }).observe(canvas);
  } else { start(); }

  resize();
  start();
})();
