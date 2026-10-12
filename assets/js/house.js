/* Fix-the-house game for the homepage hero.
   A tiny 3D renderer: the house is a list of flat faces, turned around its
   vertical axis, projected to SVG and redrawn. Faces pointing away from the
   viewer are skipped, which is enough to draw a simple house correctly.
   The house starts with six problems. Tapping one repairs it: each part has
   a progress value from 0 (broken) to 1 (fixed) that the drawing follows. */
(function () {
    document.documentElement.classList.add('js');
    var svg = document.getElementById('house3d');
    if (!svg) return;

    var S = 30;                                   // px per unit
    var PHI = 0.52;                               // camera tilt (radians)
    var sinP = Math.sin(PHI), cosP = Math.cos(PHI);
    var w = 4.5, d = 3.2, H = 4, R = 2.6, O = 0.5; // half width, half depth, wall height, roof rise, overhang
    var wO = w + O, dO = d + O, RZ = H + R, ZE = H - O * R / d;

    var PARTS = ['roof', 'siding', 'gutters', 'storm', 'water', 'fire'];
    var NUM = { roof: 1, siding: 2, gutters: 3, storm: 4, water: 5, fire: 6 };
    // Best viewing angle for each part, used when a button is pressed
    var ANGLE = { roof: -0.65, siding: -1.0, gutters: -0.3, storm: -0.5, water: -0.42, fire: 0.8 };

    var ROOF_OLD = [133, 126, 118], ROOF_NEW = [200, 58, 44], DECK = [203, 164, 112];
    var WALL_OLD = [209, 200, 183], WALL_NEW = [247, 244, 238], WRAP = [139, 132, 117];
    var TRIM = [252, 251, 248], BRICK = [176, 86, 64], FOUND = [176, 169, 157];

    var theta = -0.65, selected = null;
    var fixing = {}, prog = {};
    PARTS.forEach(function (p) { fixing[p] = false; prog[p] = 0; });

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var auto = !reduce, target = null, raf = null, last = 0, inView = true, clock = 0;
    var down = null, dragging = false;

    // Point on a roof slope. side 1 = front, -1 = back. t 0 = eave, 1 = ridge.
    function sp(side, x, t, lift) { return [x, side * dO * (1 - t), ZE + t * (RZ - ZE) + (lift || 0)]; }
    var nl = Math.hypot(RZ - ZE, dO), NRy = (RZ - ZE) / nl, NRz = dO / nl;
    function ease(p) { return p * p * (3 - 2 * p); }
    function mix(a, b, p) { return [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p]; }

    function render() {
        var c = Math.cos(theta), s = Math.sin(theta), out = [];
        var pRoof = ease(prog.roof), pSide = ease(prog.siding), pGut = ease(prog.gutters),
            pStorm = ease(prog.storm), pWater = ease(prog.water), pFire = ease(prog.fire);

        function P(p) {
            var x1 = p[0] * c - p[1] * s, y1 = p[0] * s + p[1] * c;
            return (x1 * S).toFixed(1) + ',' + ((y1 * sinP - p[2] * cosP) * S).toFixed(1);
        }
        function facing(n) { return (n[0] * s + n[1] * c) * cosP + n[2] * sinP; }
        function shade(n) {
            var x = n[0] * c - n[1] * s, y = n[0] * s + n[1] * c;
            return 0.64 + 0.36 * Math.max(0, x * -0.42 + y * 0.52 + n[2] * 0.74);
        }
        function rgb(a, k) { return 'rgb(' + Math.round(a[0] * k) + ',' + Math.round(a[1] * k) + ',' + Math.round(a[2] * k) + ')'; }
        function poly(pts, fill, part, extra) {
            out.push('<polygon points="' + pts.map(P).join(' ') + '" fill="' + fill + '"' +
                (part ? ' data-part="' + part + '"' : '') + (extra || '') + '/>');
        }
        function line(a, b, stroke, sw, part, extra) {
            var A = P(a).split(','), B = P(b).split(',');
            out.push('<line x1="' + A[0] + '" y1="' + A[1] + '" x2="' + B[0] + '" y2="' + B[1] + '" stroke="' + stroke +
                '" stroke-width="' + sw + '" stroke-linecap="round"' + (part ? ' data-part="' + part + '"' : '') + (extra || '') + '/>');
        }
        function alpha(a) { return ' fill-opacity="' + a.toFixed(2) + '"'; }
        // Shrink a shape toward its centre. k = 1 is full size, 0 is gone.
        function shrink(pts, k) {
            var cx = 0, cy = 0, cz = 0;
            pts.forEach(function (p) { cx += p[0]; cy += p[1]; cz += p[2]; });
            cx /= pts.length; cy /= pts.length; cz /= pts.length;
            return pts.map(function (p) { return [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k, cz + (p[2] - cz) * k]; });
        }
        var WIN = ' stroke="#fff" stroke-width="2.5" stroke-linejoin="round"';

        // ---- ground ----
        out.push('<ellipse cx="0" cy="0" rx="' + (7.1 * S) + '" ry="' + (7.1 * S * sinP).toFixed(1) + '" fill="#dfe6d3"/>');
        poly([[-w + 0.9, -d + 1, 0], [w + 1.1, -d + 1, 0], [w + 1.1, d + 1.3, 0], [-w + 0.9, d + 1.3, 0]], 'rgba(0,0,0,.07)');
        poly([[-0.7, d, 0], [0.7, d, 0], [0.7, 6.3, 0], [-0.7, 6.3, 0]], '#cdc7ba');
        if (pWater < 1) {
            poly(shrink([[-4.3, d + 0.2, 0], [-1.6, d + 0.2, 0], [-1.2, d + 1.1, 0], [-2.2, d + 1.9, 0], [-3.9, d + 1.7, 0], [-4.7, d + 0.9, 0]], 1 - pWater),
                'rgb(70,130,180)', 'water', alpha(0.55));
        }

        // ---- long walls (front = side 1, back = side -1) ----
        [1, -1].forEach(function (side) {
            var n = [0, side, 0];
            if (facing(n) <= 0) return;
            var k = shade(n), y = side * d, z;
            poly([[-w, y, 0], [w, y, 0], [w, y, H], [-w, y, H]], rgb(WALL_OLD, k), 'siding');
            // missing panels showing the house wrap, with a loose board hanging off
            (side === 1 ? [[-4.1, -2.9, 3.0, 3.7], [3.5, 4.4, 0.6, 1.5]] : [[-1.2, 0.8, 1.6, 2.6], [2.6, 4.1, 3.0, 3.6]]).forEach(function (q) {
                poly([[q[0], y, q[2]], [q[1], y, q[2]], [q[1], y, q[3]], [q[0], y, q[3]]], rgb(WRAP, k), 'siding');
                line([q[0], y, q[2]], [q[1] + 0.3, y, q[2] - 0.45], rgb(WALL_OLD, k * 0.85), 3, 'siding');
            });
            // new siding goes on from the bottom up
            if (pSide > 0) poly([[-w, y, 0], [w, y, 0], [w, y, H * pSide], [-w, y, H * pSide]], rgb(WALL_NEW, k), 'siding');
            for (z = 0.4; z < H; z += 0.4) line([-w, y, z], [w, y, z], 'rgba(0,0,0,.08)', 1, 'siding');
            poly([[-w, y, 0], [w, y, 0], [w, y, 0.3], [-w, y, 0.3]], rgb(FOUND, k));
            [[-3.4, -1.8], [1.8, 3.4]].forEach(function (u) {
                poly([[u[0], y, 1.4], [u[1], y, 1.4], [u[1], y, 3], [u[0], y, 3]], '#a9cbdc', null, WIN);
                line([(u[0] + u[1]) / 2, y, 1.4], [(u[0] + u[1]) / 2, y, 3], '#fff', 2);
            });
            if (side === 1) {
                poly([[-0.6, y, 0.3], [0.6, y, 0.3], [0.6, y, 2.8], [-0.6, y, 2.8]], '#2b2b2b');
                if (pWater < 1) {
                    poly([[-4.3, y, 0], [-1.5, y, 0], [-1.5, y, 0.7], [-2.3, y, 0.95], [-3.4, y, 0.8], [-4.3, y, 0.95]],
                        'rgb(60,110,150)', 'water', alpha(0.4 * (1 - pWater)));
                }
            }
        });

        // ---- gable walls (right = fire side) ----
        [1, -1].forEach(function (sx) {
            var n = [sx, 0, 0];
            if (facing(n) <= 0) return;
            var k = shade(n), x = sx * w, z, half, zc, hw;
            poly([[x, d, 0], [x, -d, 0], [x, -d, H], [x, 0, RZ], [x, d, H]], rgb(WALL_OLD, k), 'siding');
            (sx === 1 ? [[-2.6, -1.4, 0.7, 1.5]] : [[0.9, 2.4, 3.1, 3.8], [-2.7, -1.7, 0.6, 1.3]]).forEach(function (q) {
                poly([[x, q[0], q[2]], [x, q[1], q[2]], [x, q[1], q[3]], [x, q[0], q[3]]], rgb(WRAP, k), 'siding');
                line([x, q[0], q[2]], [x, q[1] + 0.3, q[2] - 0.45], rgb(WALL_OLD, k * 0.85), 3, 'siding');
            });
            if (pSide > 0) {
                zc = RZ * pSide;
                if (zc <= H) poly([[x, d, 0], [x, -d, 0], [x, -d, zc], [x, d, zc]], rgb(WALL_NEW, k), 'siding');
                else { hw = d * (1 - (zc - H) / R); poly([[x, d, 0], [x, -d, 0], [x, -d, H], [x, -hw, zc], [x, hw, zc], [x, d, H]], rgb(WALL_NEW, k), 'siding'); }
            }
            for (z = 0.4; z < RZ - 0.2; z += 0.4) {
                half = z <= H ? d : d * (1 - (z - H) / R);
                line([x, half, z], [x, -half, z], 'rgba(0,0,0,.08)', 1, 'siding');
            }
            poly([[x, d, 0], [x, -d, 0], [x, -d, 0.3], [x, d, 0.3]], rgb(FOUND, k));
            if (sx === 1) {
                if (pFire < 1) {
                    poly([[x, 1.15, 3], [x, -1.15, 3], [x, -0.8, 4.7], [x, 0, 5.4], [x, 0.7, 4.6]], 'rgb(25,22,20)', 'fire', alpha(0.62 * (1 - pFire)));
                }
                poly([[x, 0.9, 1.4], [x, -0.9, 1.4], [x, -0.9, 3], [x, 0.9, 3]], rgb(mix([52, 38, 32], [169, 203, 220], pFire), 1), 'fire', WIN);
            } else {
                poly([[x, 0.9, 1.4], [x, -0.9, 1.4], [x, -0.9, 3], [x, 0.9, 3]], '#a9cbdc', null, WIN);
            }
            line([x, 0, 1.4], [x, 0, 3], '#fff', 2);
        });

        // ---- roof slopes: worn shingles with bare decking, new ones laid from the eave up ----
        [1, -1].forEach(function (side) {
            var n = [0, side * NRy, NRz];
            if (facing(n) <= 0) return;
            var k = shade(n), i;
            poly([sp(side, -wO, 0), sp(side, wO, 0), sp(side, wO, 1), sp(side, -wO, 1)], rgb(ROOF_OLD, k), 'roof');
            (side === 1 ? [[0.9, 2.5, 0.6, 0.84], [-0.8, 0.5, 0.12, 0.3], [3.2, 4.4, 0.3, 0.5]] : [[-3.9, -2.2, 0.2, 0.44], [0.4, 1.9, 0.5, 0.72], [-1.4, -0.3, 0.74, 0.9]]).forEach(function (q) {
                poly([sp(side, q[0], q[2]), sp(side, q[1], q[2]), sp(side, q[1] - 0.2, q[3]), sp(side, q[0] + 0.15, q[3])], rgb(DECK, k), 'roof');
            });
            if (pRoof > 0) poly([sp(side, -wO, 0), sp(side, wO, 0), sp(side, wO, pRoof), sp(side, -wO, pRoof)], rgb(ROOF_NEW, k), 'roof');
            for (i = 1; i < 10; i++) line(sp(side, -wO, i / 10), sp(side, wO, i / 10), 'rgba(255,255,255,.14)', 1, 'roof');
            if (side === 1 && pStorm < 1) {
                // storm: a hole in the roof with a fallen branch across it
                poly(shrink([sp(1, -3.7, 0.3), sp(1, -1.9, 0.27), sp(1, -1.6, 0.5), sp(1, -2.5, 0.63), sp(1, -3.6, 0.56)], 1 - pStorm), 'rgb(48,40,36)', 'storm');
                var slide = pStorm * 2.4, op = ' stroke-opacity="' + (1 - pStorm).toFixed(2) + '"';
                line(sp(1, -4.6 - slide, 0.16, 0.2), sp(1, -1.1 - slide, 0.72, 0.2), '#5b3d24', 6, 'storm', op);
                line(sp(1, -3.3 - slide, 0.37, 0.2), sp(1, -3.9 - slide, 0.66, 0.2), '#5b3d24', 3.5, 'storm', op);
                line(sp(1, -2.3 - slide, 0.53, 0.2), sp(1, -1.3 - slide, 0.42, 0.2), '#5b3d24', 3.5, 'storm', op);
                line(sp(1, -3.9 - slide, 0.66, 0.2), sp(1, -4.2 - slide, 0.8, 0.2), '#4f7a3a', 5, 'storm', op);
                line(sp(1, -1.3 - slide, 0.42, 0.2), sp(1, -0.8 - slide, 0.46, 0.2), '#4f7a3a', 5, 'storm', op);
            }
        });

        // ---- roof edges: eave boards and gable rakes ----
        [1, -1].forEach(function (side) {
            var n = [0, side, 0];
            if (facing(n) <= 0) return;
            var y = side * dO;
            poly([[-wO, y, ZE], [wO, y, ZE], [wO, y, ZE - 0.2], [-wO, y, ZE - 0.2]], rgb(TRIM, shade(n)));
        });
        [1, -1].forEach(function (sx) {
            var n = [sx, 0, 0];
            if (facing(n) <= 0) return;
            var x = sx * wO;
            poly([[x, dO, ZE], [x, 0, RZ], [x, -dO, ZE], [x, -dO, ZE - 0.2], [x, 0, RZ - 0.2], [x, dO, ZE - 0.2]], rgb(TRIM, shade(n)));
        });

        // ---- gutters: one end hanging loose, downspout kicked out, until fixed ----
        [1, -1].forEach(function (side) {
            if (facing([0, side, 0]) <= 0) return;
            var y = side * (dO + 0.06), z = ZE - 0.22, dx = side * (w - 0.25), yw = side * (d + 0.07);
            var loose = 1 - pGut, drop = 1.5 * loose, kick = 1.1 * loose;
            var far = [-side * wO, y, z - drop], near = [side * wO, y, z];
            var col = rgb(mix([150, 146, 140], [255, 255, 255], pGut), 1);
            [['#55504a', 7], [col, 4]].forEach(function (st) {
                line(far, near, st[0], st[1], 'gutters');
                line([dx, y, z], [dx, yw, z - 0.55], st[0], st[1], 'gutters');
                line([dx, yw, z - 0.55], [dx + side * kick, yw + side * kick * 0.5, 0.12], st[0], st[1], 'gutters');
            });
        });

        // ---- chimney, straddling the ridge ----
        (function () {
            var x0 = 1.8, x1 = 2.7, hy = 0.45, zt = RZ + 1.3, zb = RZ - hy * (RZ - ZE) / dO;
            [1, -1].forEach(function (side) {
                var n = [0, side, 0];
                if (facing(n) > 0) poly([[x0, side * hy, zb], [x1, side * hy, zb], [x1, side * hy, zt], [x0, side * hy, zt]], rgb(BRICK, shade(n)));
            });
            [[1, x1], [-1, x0]].forEach(function (e) {
                var n = [e[0], 0, 0];
                if (facing(n) > 0) poly([[e[1], hy, zb], [e[1], 0, RZ], [e[1], -hy, zb], [e[1], -hy, zt], [e[1], hy, zt]], rgb(BRICK, shade(n)));
            });
            poly([[x0, -hy, zt], [x1, -hy, zt], [x1, hy, zt], [x0, hy, zt]], rgb([120, 58, 44], 1));
        })();

        // ---- pins: a number on each open problem, a tick once it is fixed ----
        var pulse = (clock % 1600) / 1600;
        [
            ['roof', sp(1, 0.6, 0.55), [0, NRy, NRz]],
            ['roof', sp(-1, -0.6, 0.55), [0, -NRy, NRz]],
            ['siding', [-w, 1.9, 2.2], [-1, 0, 0]],
            ['siding', [0, -d, 2.2], [0, -1, 0]],
            ['gutters', [2.6, dO, ZE - 0.22], [0, 1, 0]],
            ['gutters', [-2.6, -dO, ZE - 0.22], [0, -1, 0]],
            ['storm', sp(1, -2.7, 0.44), [0, NRy, NRz]],
            ['water', [-2.9, d + 1, 0], [0, 1, 0]],
            ['fire', [w, 0, 4.1], [1, 0, 0]]
        ].forEach(function (pin) {
            if (facing(pin[2]) <= 0.12) return;
            var part = pin[0], xy = P(pin[1]).split(','), done = fixing[part];
            var cls = 'pin ' + (done ? 'ok' : 'bad') + (selected === part ? ' on' : '');
            var g = '<g class="' + cls + '" data-part="' + part + '">';
            if (!done && !reduce) g += '<circle class="ring" cx="' + xy[0] + '" cy="' + xy[1] + '" r="' + (17 + 11 * pulse).toFixed(1) + '" stroke-opacity="' + (0.7 * (1 - pulse)).toFixed(2) + '"/>';
            g += '<circle class="dot" cx="' + xy[0] + '" cy="' + xy[1] + '" r="17"/>';
            g += '<text x="' + xy[0] + '" y="' + (parseFloat(xy[1]) + 6.2).toFixed(1) + '" text-anchor="middle">' + (done ? '✓' : NUM[part]) + '</text></g>';
            out.push(g);
        });

        svg.innerHTML = out.join('');
    }

    // ---- animation ----
    function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
    function tick(t) {
        raf = null;
        var dt = Math.min(50, (t - last) || 16), moving = false, diff, open = false;
        last = t; clock += dt;
        if (target !== null) {
            diff = wrap(target - theta);
            if (Math.abs(diff) < 0.004) { theta = target; target = null; }
            else { theta += diff * Math.min(1, dt * 0.008); moving = true; }
        } else if (auto && inView && !down) {
            theta += dt * 0.00016;
            moving = true;
        }
        PARTS.forEach(function (p) {
            if (fixing[p] && prog[p] < 1) { prog[p] = Math.min(1, prog[p] + dt / 1100); moving = true; }
            if (!fixing[p] && prog[p] > 0) { prog[p] = Math.max(0, prog[p] - dt / 500); moving = true; }
            if (!fixing[p]) open = true;
        });
        if (open && inView && !reduce) moving = true;   // keep the open pins pulsing
        render();
        if (moving) request();
    }
    function request() { if (!raf) raf = requestAnimationFrame(tick); }

    // ---- game state ----
    var buttons = document.querySelectorAll('#parts button');
    var statusEl = document.getElementById('fixStatus');
    var doneEl = document.getElementById('fixDone');
    var resetEl = document.getElementById('fixReset');

    function update() {
        var count = PARTS.filter(function (p) { return fixing[p]; }).length;
        buttons.forEach(function (b) {
            b.setAttribute('aria-pressed', b.dataset.part === selected ? 'true' : 'false');
            b.classList.toggle('done', fixing[b.dataset.part]);
            b.querySelector('b').textContent = fixing[b.dataset.part] ? '✓' : NUM[b.dataset.part];
        });
        document.querySelectorAll('.panel').forEach(function (p) { p.hidden = p.dataset.panel !== selected; });
        if (statusEl) statusEl.textContent = count === 0 ? 'This house has six problems. Tap one to fix it.' :
            count < 6 ? count + ' of 6 fixed. Keep going.' : 'All six fixed.';
        if (doneEl) doneEl.hidden = count < 6;
        if (count === 6 && !reduce) auto = true;       // victory lap
    }
    function fix(part, turn) {
        selected = part;
        if (!fixing[part]) { fixing[part] = true; if (reduce) prog[part] = 1; }
        if (turn) { auto = false; if (reduce) theta = ANGLE[part]; else target = ANGLE[part]; }
        update();
        request();
    }
    buttons.forEach(function (b) { b.addEventListener('click', function () { fix(b.dataset.part, true); }); });
    if (resetEl) resetEl.addEventListener('click', function () {
        PARTS.forEach(function (p) { fixing[p] = false; if (reduce) prog[p] = 0; });
        selected = null;
        update();
        request();
    });

    // ---- drag to turn, tap to fix ----
    svg.addEventListener('pointerdown', function (e) { down = { x: e.clientX, theta: theta, id: e.pointerId }; dragging = false; });
    svg.addEventListener('pointermove', function (e) {
        if (!down) return;
        var dx = e.clientX - down.x;
        if (!dragging && Math.abs(dx) > 5) {
            dragging = true; auto = false; target = null;
            svg.classList.add('dragging');
            try { svg.setPointerCapture(down.id); } catch (err) {}
        }
        if (dragging) { theta = down.theta + dx * 0.012; request(); }
    });
    function release(e) {
        if (down && !dragging && e.type === 'pointerup') {
            var el = document.elementFromPoint(e.clientX, e.clientY);
            var hit = el && el.closest && el.closest('[data-part]');
            if (hit && svg.contains(hit)) { auto = false; fix(hit.getAttribute('data-part'), false); }
        }
        down = null; dragging = false;
        svg.classList.remove('dragging');
        request();
    }
    svg.addEventListener('pointerup', release);
    svg.addEventListener('pointercancel', release);

    // Only animate while the house is on screen
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) { inView = entries[0].isIntersecting; if (inView) request(); }).observe(svg);
    }

    update();
    request();
})();
