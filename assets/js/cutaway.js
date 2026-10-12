/* Layer cutaway for the roofing and siding pages.
   Draws a sample of roof (or wall) with each layer peeled back so you can see
   what sits under what. Uses the same flat-face 3D projection as house.js.
   The layer names and descriptions live in the page as a normal list
   (.layers); this script only draws and links the two together. */
(function () {
    document.documentElement.classList.add('js');
    var svg = document.getElementById('cutaway');
    if (!svg) return;

    var S = 30, THETA = -0.55, PHI = 0.5;
    var c = Math.cos(THETA), s = Math.sin(THETA), sinP = Math.sin(PHI), cosP = Math.cos(PHI);

    // Each layer is a rectangle on the sample: u across, v up the slope, t thick.
    var PRESETS = {
        roof: {
            angle: 0.62, U: 10, V: 7,
            layers: [
                { u: [0, 10], v: [0, 7], t: 0.24, rgb: [205, 168, 118], tex: 'deck', pin: [8.9, 4.6] },
                { u: [0, 10], v: [0, 0.6], t: 0.09, rgb: [238, 238, 234], tex: 'none', pin: [8.9, 0.3] },
                { u: [0, 7.6], v: [0, 7], t: 0.07, rgb: [150, 157, 166], tex: 'felt', pin: [6.4, 4.6] },
                { u: [0, 5.2], v: [0, 7], t: 0.18, rgb: [200, 58, 44], tex: 'shingle', pin: [2.6, 4.6] }
            ]
        },
        wall: {
            angle: Math.PI / 2, U: 9, V: 7,
            layers: [
                { u: [0, 9], v: [0, 7], t: 0.24, rgb: [205, 168, 118], tex: 'deck', pin: [8, 4.2] },
                { u: [0, 7], v: [0, 7], t: 0.06, rgb: [226, 229, 232], tex: 'felt', pin: [5.9, 4.2] },
                { u: [0, 4.8], v: [0, 7], t: 0.2, rgb: [247, 244, 238], tex: 'lap', pin: [2.9, 4.2] },
                { u: [0, 0.7], v: [0, 7], t: 0.14, rgb: [255, 255, 255], tex: 'none', pin: [0.35, 1.4] }
            ]
        }
    };
    var cfg = PRESETS[svg.getAttribute('data-kind')] || PRESETS.roof;
    var A = cfg.angle, sinA = Math.sin(A), cosA = Math.cos(A);
    var buttons = document.querySelectorAll('.layers button');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var selected = -1, spread = reduce ? 0.3 : 1.6, goal = 0.3, raf = null, last = 0, lift = cfg.layers.map(function () { return 0; });

    // Sample coordinates to world: h is height above the base along the surface normal.
    function W(u, v, h) {
        return [u - cfg.U / 2, -(v - cfg.V / 2) * cosA + h * sinA, v * sinA + h * cosA];
    }
    function P(p) {
        var x1 = p[0] * c - p[1] * s, y1 = p[0] * s + p[1] * c;
        return [(x1 * S), ((y1 * sinP - p[2] * cosP) * S)];
    }
    function pts(list) { return list.map(function (q) { var a = P(q); return a[0].toFixed(1) + ',' + a[1].toFixed(1); }).join(' '); }
    function facing(n) { return (n[0] * s + n[1] * c) * cosP + n[2] * sinP; }
    function shade(n) {
        var x = n[0] * c - n[1] * s, y = n[0] * s + n[1] * c;
        return 0.74 + 0.26 * Math.max(0, x * -0.42 + y * 0.52 + n[2] * 0.74);
    }
    function rgb(a, k) { return 'rgb(' + Math.round(a[0] * k) + ',' + Math.round(a[1] * k) + ',' + Math.round(a[2] * k) + ')'; }

    var N_TOP = [0, sinA, cosA], N_LOW = [0, cosA, -sinA], N_HIGH = [0, -cosA, sinA], N_LEFT = [-1, 0, 0];

    function heights() {
        var h = 0;
        return cfg.layers.map(function (L, i) { var base = h + i * spread * 0.55 + lift[i]; h += L.t; return base; });
    }

    function render() {
        var out = [], hs = heights();
        cfg.layers.forEach(function (L, i) {
            var h0 = hs[i], h1 = h0 + L.t, u0 = L.u[0], u1 = L.u[1], v0 = L.v[0], v1 = L.v[1];
            var dim = selected >= 0 && selected !== i ? ' opacity="0.5"' : '';
            var g = ['<g data-layer="' + i + '"' + dim + '>'];
            function face(list, n) { g.push('<polygon points="' + pts(list) + '" fill="' + rgb(L.rgb, shade(n)) + '"/>'); }
            function ln(a, b, stroke, sw) {
                var p1 = P(a), p2 = P(b);
                g.push('<line x1="' + p1[0].toFixed(1) + '" y1="' + p1[1].toFixed(1) + '" x2="' + p2[0].toFixed(1) + '" y2="' + p2[1].toFixed(1) + '" stroke="' + stroke + '" stroke-width="' + (sw || 1) + '"/>');
            }
            if (facing(N_LEFT) > 0) face([W(u0, v0, h0), W(u0, v1, h0), W(u0, v1, h1), W(u0, v0, h1)], N_LEFT);
            if (facing(N_LOW) > 0) face([W(u0, v0, h0), W(u1, v0, h0), W(u1, v0, h1), W(u0, v0, h1)], N_LOW);
            if (facing(N_HIGH) > 0) face([W(u0, v1, h0), W(u1, v1, h0), W(u1, v1, h1), W(u0, v1, h1)], N_HIGH);
            face([W(u0, v0, h1), W(u1, v0, h1), W(u1, v1, h1), W(u0, v1, h1)], N_TOP);

            var v, u, row = 0;
            if (L.tex === 'deck') {
                for (u = 4; u < u1; u += 4) ln(W(u, v0, h1), W(u, v1, h1), 'rgba(90,60,30,.35)', 1.5);
                ln(W(u0, (v0 + v1) / 2, h1), W(u1, (v0 + v1) / 2, h1), 'rgba(90,60,30,.35)', 1.5);
            } else if (L.tex === 'felt') {
                for (v = 1.1; v < v1; v += 1.1) ln(W(u0, v, h1), W(u1, v, h1), 'rgba(255,255,255,.4)', 1.2);
            } else if (L.tex === 'shingle') {
                for (v = 0.6; v < v1; v += 0.6) {
                    ln(W(u0, v, h1), W(u1, v, h1), 'rgba(0,0,0,.28)', 1.4);
                    for (u = (row % 2 ? 0.65 : 1.3); u < u1; u += 1.3) ln(W(u, v - 0.6, h1), W(u, v, h1), 'rgba(0,0,0,.2)', 1);
                    row++;
                }
            } else if (L.tex === 'lap') {
                for (v = 0.5; v < v1; v += 0.5) ln(W(u0, v, h1), W(u1, v, h1), 'rgba(0,0,0,.16)', 1.6);
            }
            var pp = P(W(L.pin[0], L.pin[1], h1)), on = selected === i;
            g.push('<circle cx="' + pp[0].toFixed(1) + '" cy="' + pp[1].toFixed(1) + '" r="15" fill="' + (on ? '#d7262b' : '#fff') + '" stroke="' + (on ? '#fff' : '#141414') + '" stroke-width="2.5"/>');
            g.push('<text x="' + pp[0].toFixed(1) + '" y="' + (pp[1] + 5.6).toFixed(1) + '" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="800" font-size="16" fill="' + (on ? '#fff' : '#141414') + '" pointer-events="none">' + (i + 1) + '</text>');
            g.push('</g>');
            out.push(g.join(''));
        });
        svg.innerHTML = out.join('');
    }

    // Size the drawing box once, from the most spread-out pose, so nothing is ever clipped.
    (function fit() {
        var keep = spread, xs = [], ys = [];
        spread = 1.6;
        var hs = heights();
        cfg.layers.forEach(function (L, i) {
            [L.u[0], L.u[1]].forEach(function (u) { [L.v[0], L.v[1]].forEach(function (v) { [hs[i], hs[i] + L.t + 0.7].forEach(function (h) {
                var p = P(W(u, v, h)); xs.push(p[0]); ys.push(p[1]);
            }); }); });
        });
        spread = keep;
        var pad = 22, x = Math.min.apply(null, xs) - pad, y = Math.min.apply(null, ys) - pad;
        svg.setAttribute('viewBox', [x, y, Math.max.apply(null, xs) + pad - x, Math.max.apply(null, ys) + pad - y].map(Math.round).join(' '));
    })();

    function tick(t) {
        raf = null;
        var dt = Math.min(50, (t - last) || 16), moving = false;
        last = t;
        if (Math.abs(spread - goal) > 0.005) { spread += (goal - spread) * Math.min(1, dt * 0.004); moving = true; } else spread = goal;
        lift.forEach(function (v, i) {
            var want = selected === i ? 0.7 : 0;
            if (Math.abs(v - want) > 0.005) { lift[i] = v + (want - v) * Math.min(1, dt * 0.01); moving = true; } else lift[i] = want;
        });
        render();
        if (moving) request();
    }
    function request() { if (!raf) raf = requestAnimationFrame(tick); }

    function select(i) {
        selected = selected === i ? -1 : i;
        goal = selected >= 0 ? 0.75 : 0.3;
        if (reduce) { spread = goal; lift = lift.map(function (v, k) { return selected === k ? 0.7 : 0; }); }
        buttons.forEach(function (b, k) { b.setAttribute('aria-pressed', k === selected ? 'true' : 'false'); });
        request();
    }
    buttons.forEach(function (b, k) { b.addEventListener('click', function () { select(k); }); });
    svg.addEventListener('click', function (e) {
        var g = e.target.closest && e.target.closest('[data-layer]');
        if (g) select(parseInt(g.getAttribute('data-layer'), 10));
    });

    // Layers settle into place the first time the drawing scrolls into view
    if ('IntersectionObserver' in window && !reduce) {
        render();
        var io = new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting) { io.disconnect(); request(); }
        }, { threshold: 0.3 });
        io.observe(svg);
    } else { spread = goal; render(); }
})();
