// Spot a Paw site — small, dependency-free.
(function () {
  // Reveal on scroll
  const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // Phone "tours": any .phone with several <img> in .screen cycles them.
  // A .tour container with .tour-steps li[data-img] drives one phone with captions.
  function makeTour(root) {
    const phone = root.matches('.phone') ? root : root.querySelector('.phone');
    if (!phone) return;
    const imgs = Array.from(phone.querySelectorAll('.screen img'));
    if (imgs.length < 2 && !root.querySelector('.tour-steps')) return;
    const steps = Array.from(root.querySelectorAll('.tour-steps li'));
    const bar = root.querySelector('.bar i');
    const btn = root.querySelector('.tour-ctl button');
    const interval = +(root.dataset.interval || phone.dataset.interval || 4200);
    let i = 0, timer = null, start = 0, raf = null, playing = true;

    function show(n) {
      i = (n + imgs.length) % imgs.length;
      imgs.forEach((im, k) => im.classList.toggle('on', k === i));
      steps.forEach((s, k) => s.classList.toggle('on', k === i));
      start = performance.now();
    }
    function tick(t) {
      if (bar) bar.style.width = Math.min(100, ((t - start) / interval) * 100) + '%';
      raf = requestAnimationFrame(tick);
    }
    function play() { playing = true; if (btn) btn.textContent = '❚❚'; clearInterval(timer); timer = setInterval(() => show(i + 1), interval); start = performance.now(); }
    function pause() { playing = false; if (btn) btn.textContent = '▶'; clearInterval(timer); }
    steps.forEach((s, k) => s.addEventListener('click', () => { show(k); if (playing) play(); }));
    if (btn) btn.addEventListener('click', () => playing ? pause() : play());
    show(0); play(); if (bar) raf = requestAnimationFrame(tick);
    // Pause when off-screen to save CPU.
    new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? (playing || play()) : pause()), { threshold: 0.2 }).observe(root);
  }
  document.querySelectorAll('.tour, .phone[data-tour]').forEach(makeTour);

  // Help centre: search + active section
  const q = document.getElementById('help-q');
  if (q) {
    const topics = Array.from(document.querySelectorAll('.topic'));
    const side = Array.from(document.querySelectorAll('.help-side a[href^="#"]'));
    q.addEventListener('input', () => {
      const t = q.value.trim().toLowerCase();
      topics.forEach(tp => tp.classList.toggle('hidden', t && !tp.textContent.toLowerCase().includes(t)));
      side.forEach(a => { const tp = document.querySelector(a.getAttribute('href')); a.classList.toggle('hidden', tp && tp.classList.contains('hidden')); });
    });
    const spy = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) side.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-40% 0px -55% 0px' });
    topics.forEach(tp => spy.observe(tp));
  }
})();

// The skins rotator. Pauses on hover so a reader can actually look at one,
// and stops entirely for prefers-reduced-motion rather than merely dropping
// the fade -- the movement is the thing that would bother someone, not the
// transition on it.
(function () {
  var root = document.querySelector('.skin-rotator');
  if (!root) return;
  var slides = [].slice.call(root.querySelectorAll('.skin-slide'));
  var dots = [].slice.call(root.querySelectorAll('.skin-dot'));
  var cap = root.querySelector('.skin-cap');
  if (slides.length < 2) return;
  var i = 0, timer = null;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function show(n) {
    i = (n + slides.length) % slides.length;
    slides.forEach(function (el, k) { el.classList.toggle('on', k === i); });
    dots.forEach(function (el, k) { el.classList.toggle('on', k === i); });
    if (cap) {
      cap.querySelector('b').textContent = slides[i].dataset.name || '';
      cap.querySelector('span').textContent = slides[i].dataset.blurb || '';
    }
  }
  function play() { if (!still && !timer) timer = setInterval(function () { show(i + 1); }, 2600); }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  dots.forEach(function (d) {
    d.addEventListener('click', function () { stop(); show(+d.dataset.i); play(); });
  });
  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', play);
  document.addEventListener('visibilitychange', function () {
    document.hidden ? stop() : play();
  });
  show(0); play();
})();
