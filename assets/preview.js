// Preview copy additions: word-by-word headline, scroll reveals, counting
// stats, and the truck that drives across as you scroll.
(function () {
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Opening a page from a link always starts at the top (unless the link points at a section).
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}
  function toTop() { if (!location.hash) window.scrollTo(0, 0); }
  toTop(); window.addEventListener('load', toTop); window.addEventListener('pageshow', toTop);


  // Mark the current page in the nav.
  // Sub-pages light up their parent section.
  var here = location.pathname.split('/').pop() || 'index.html';
  var ar = /-ar\.html$/.test(here), base = here.replace(/-ar\.html$/, '.html');
  var parent = { 'costings.html': 'food-truck.html', 'shared-paws.html': 'vision.html', '404.html': 'index.html' };
  if (/^a-paw-.+\.html$/.test(base)) base = 'a-paw.html';
  base = parent[base] || base;
  var target = ar ? base.replace(/\.html$/, '-ar.html') : base;
  document.querySelectorAll('.nav-links a:not(.btn)').forEach(function (a) {
    if ((a.getAttribute('href') || '').split('#')[0] === target) a.classList.add('on');
  });

  // Hero headline: wrap each word so it can rise in.
  document.querySelectorAll('.phero h1').forEach(function (h) {
    var i = 0;
    function wrap(node) {
      [].slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var s = document.createElement('span');
            s.className = 'w'; s.style.setProperty('--i', i++); s.textContent = part;
            frag.appendChild(s);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) wrap(n);
      });
    }
    wrap(h);
    h.classList.add('rise');
  });
  document.querySelectorAll('h1 .accent, h2 .accent').forEach(function (a) { a.classList.add('draw'); });
  setTimeout(function () { document.querySelectorAll('.phero .accent').forEach(function (a) { a.classList.add('in'); }); }, 600);

  // Scroll reveals, staggered within each group.
  var sel = 'section:not(.phero) .eyebrow, section:not(.phero) h2, section:not(.phero) .lead, ' +
    '.shotcard, .card, .why-card, .split > *, .goal, .quote p, .plates-home .pic, .plates-home .ticks li, .drive .cta';
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  document.querySelectorAll(sel).forEach(function (el) {
    if (el.closest('.phero')) return;
    var sib = el.parentElement ? [].slice.call(el.parentElement.children).indexOf(el) : 0;
    el.style.setProperty('--d', Math.min(sib, 5) * 90 + 'ms');
    el.classList.add('pv-r');
    io.observe(el);
  });

  // Hero stats count up once.
  document.querySelectorAll('.phero .stat b').forEach(function (b) {
    var raw = b.textContent, m = raw.match(/^(\D*)([\d,]+)(.*)$/);
    if (!m || still) return;
    var end = +m[2].replace(/,/g, ''), t0 = null;
    b.textContent = m[1] + '0' + m[3];
    setTimeout(function () {
      requestAnimationFrame(function step(t) {
        if (!t0) t0 = t;
        var p = Math.min(1, (t - t0) / 1400), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
        b.textContent = m[1] + v.toLocaleString('en-AU') + m[3];
        if (p < 1) requestAnimationFrame(step);
      });
    }, 1300);
  });

  // The truck: its position follows how far the road has scrolled through the screen.
  var road = document.querySelector('.road'), rig = road && road.querySelector('.truck-rig');
  if (rig) {
    var wheels = rig.querySelectorAll('.wheel'), ticking = false;
    // Linear with the scroll: far left as the road enters the bottom of the screen,
    // centred when the road is in the middle of the screen, off to the right as it leaves the top.
    function place() {
      ticking = false;
      var r = road.getBoundingClientRect(), vh = window.innerHeight;
      var p = still ? 0.5 : Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height)));
      var x = p * Math.max(0, road.clientWidth - rig.offsetWidth);
      rig.style.setProperty('--x', x + 'px');
      var deg = x / (rig.offsetWidth * 0.1457 * Math.PI) * 360;
      wheels.forEach(function (w) { w.style.setProperty('--rot', deg + 'deg'); });
      road.style.setProperty('--road', (p * 400).toFixed(1));
      rig.style.setProperty('--dust', p > 0.02 && p < 0.98 ? 0.9 : 0);
    }
    function ask() { if (!ticking) { ticking = true; requestAnimationFrame(place); } }
    window.addEventListener('scroll', ask, { passive: true });
    window.addEventListener('resize', ask);
    place();
  }

  // Paw journey: the dog walks through the gates as the timeline scrolls up the screen.
  var jr = document.querySelector('.jr-track');
  if (jr) {
    var gates = jr.querySelectorAll('.jr-gate'), jt = false, stop;
    function walk() {
      jt = false;
      var r = jr.getBoundingClientRect(), vh = window.innerHeight;
      var p = still ? 1 : Math.max(0, Math.min(1, (vh * 0.85 - r.top) / (vh * 0.55)));
      jr.style.setProperty('--p', p.toFixed(3));
      gates.forEach(function (g, i) { g.classList.toggle('on', p >= i / (gates.length - 1) - 0.01); });
      jr.classList.add('walking'); clearTimeout(stop);
      stop = setTimeout(function () { jr.classList.remove('walking'); }, 180);
    }
    function jask() { if (!jt) { jt = true; requestAnimationFrame(walk); } }
    window.addEventListener('scroll', jask, { passive: true });
    window.addEventListener('resize', jask);
    walk();
  }
})();

// Crate to plate: steps play one after another while on screen; tap a step to jump to it.
(function () {
  var box = document.querySelector('[data-ctp]');
  if (!box) return;
  var items = box.querySelectorAll('.ctp-steps li'), list = box.querySelector('.ctp-steps');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var a = 0, timer = null, seen = false;
  function show(i, scroll) {
    a = (i + items.length) % items.length;
    box.style.setProperty('--a', a);
    items.forEach(function (li, k) { li.classList.toggle('on', k === a); li.classList.toggle('done', k < a); });
    if (scroll && list.scrollWidth > list.clientWidth) {
      var li = items[a];
      list.scrollTo({ left: li.offsetLeft - (list.clientWidth - li.offsetWidth) / 2, behavior: 'smooth' });
    }
  }
  function play() { if (still || timer) return; timer = setInterval(function () { show(a + 1, true); }, 2800); }
  function pause() { clearInterval(timer); timer = null; }
  items.forEach(function (li, k) {
    li.querySelector('button').addEventListener('click', function () { pause(); show(k, true); setTimeout(play, 6000); });
  });
  new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { if (!seen) { seen = true; show(0); } play(); } else pause(); });
  }, { threshold: 0.35 }).observe(box);
  show(0);
})();
