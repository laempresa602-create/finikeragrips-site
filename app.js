/* ─── Finikera Grips — scroll engine (perf-optimized) ─── */

(function () {
  'use strict';

  // ── Lenis smooth scroll ──────────────────────────────
  const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);

  // ── Nav scroll state ────────────────────────────────
  const nav = document.getElementById('nav');
  let lastScrolled = false;
  lenis.on('scroll', ({ scroll }) => {
    const s = scroll > 60;
    if (s !== lastScrolled) { nav.classList.toggle('scrolled', s); lastScrolled = s; }
  });

  // ── Hero canvas ──────────────────────────────────────
  const heroCanvas = document.getElementById('hero-canvas');
  const heroCtx = heroCanvas && heroCanvas.getContext('2d', { alpha: false });
  const heroStage = document.getElementById('hero');
  let heroLoaded = false, lastHeroProgress = -1;

  function resizeHeroCanvas() {
    if (!heroCanvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    heroCanvas.width  = Math.round(window.innerWidth  * dpr);
    heroCanvas.height = Math.round(window.innerHeight * dpr);
    heroCanvas.style.width  = window.innerWidth  + 'px';
    heroCanvas.style.height = window.innerHeight + 'px';
    heroCtx.scale(dpr, dpr);
    if (heroLoaded) drawHero(lastHeroProgress < 0 ? 0 : lastHeroProgress);
  }

  function drawHero(progress) {
    if (!heroLoaded || !heroCtx) return;
    const W = window.innerWidth, H = window.innerHeight;
    const scale = 1 + progress * 0.05;
    const iw = heroImg.naturalWidth, ih = heroImg.naturalHeight;
    const fit = Math.max(W * scale / iw, H * scale / ih);
    const dw = iw * fit, dh = ih * fit;
    const ox = W * 0.5 + progress * W * 0.03;
    const oy = H * 0.5 + progress * H * 0.03;
    heroCtx.globalAlpha = Math.max(0, 1 - progress * 1.5);
    heroCtx.drawImage(heroImg, ox - dw / 2, oy - dh / 2, dw, dh);
    heroCtx.globalAlpha = 1;
  }

  // ── Reveal lines ─────────────────────────────────────
  // Cache elements once so we don't querySelectorAll on every frame
  const heroLines   = heroStage   ? [...heroStage.querySelectorAll('.reveal-line')]   : [];
  const revealStage = document.getElementById('galeria');
  const revealLines = revealStage ? [...revealStage.querySelectorAll('.reveal-line')] : [];

  function applyRevealLines(lines, progress) {
    for (let i = 0; i < lines.length; i++) {
      const el   = lines[i];
      const inP  = el._in  ?? (el._in  = parseFloat(el.dataset.in  || 0));
      const outP = el._out ?? (el._out = parseFloat(el.dataset.out || 1));
      let v;
      if (progress <= inP) v = 0;
      else if (progress >= outP) v = 0;
      else {
        const fi = Math.min((progress - inP) / 0.12, 1);
        const fo = Math.max(1 - (progress - (outP - 0.1)) / 0.1, 0);
        v = Math.min(fi, fo);
      }
      const vRound = Math.round(v * 100) / 100;
      if (el._lastV !== vRound) {
        el.style.opacity   = vRound;
        el.style.transform = `translateY(${Math.round((1 - vRound) * 30)}px)`;
        el._lastV = vRound;
      }
    }
  }

  // ── Floating grip ─────────────────────────────────────
  const gripFloat  = document.getElementById('grip-float');
  const gripShape  = gripFloat && gripFloat.querySelector('.grip-float__shape');
  const gripGlow   = gripFloat && gripFloat.querySelector('.grip-float__glow');
  let lastRot = null, lastGlow = null;

  function updateRevealSection(progress) {
    if (!gripShape) return;
    const rot   = Math.round((progress - 0.5) * 40 * 10) / 10;
    const scale = Math.round((0.8 + progress * 0.4) * 100) / 100;
    const glow  = Math.round(progress * 0.8 * 100) / 100;
    if (rot !== lastRot) {
      gripShape.style.transform = `rotateY(${rot}deg) scale(${scale})`;
      lastRot = rot;
    }
    if (glow !== lastGlow) { gripGlow.style.opacity = glow; lastGlow = glow; }
  }

  // ── Main scroll loop (single rAF, skip if no change) ─
  let rafPending = false;
  let lastHeroP = -1, lastRevealP = -1;

  lenis.on('scroll', () => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      const vh = window.innerHeight;

      if (heroStage) {
        const r = heroStage.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, -r.top / (r.height - vh)));
        if (Math.abs(p - lastHeroP) > 0.001) {
          lastHeroP = p; lastHeroProgress = p;
          drawHero(p);
          applyRevealLines(heroLines, p);
        }
      }

      if (revealStage) {
        const r = revealStage.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, -r.top / (r.height - vh)));
        if (Math.abs(p - lastRevealP) > 0.001) {
          lastRevealP = p;
          updateRevealSection(p);
          applyRevealLines(revealLines, p);
        }
      }
    });
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeHeroCanvas, 100);
  });
  resizeHeroCanvas();

  // ── Intersection observer (fade-up cards) ────────────
  const io = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    }),
    { threshold: 0.08 }
  );
  document.querySelectorAll('.stat, .process__step, .ig-card').forEach((el, i) => {
    el.classList.add('fade-up');
    el.style.transitionDelay = (i % 4 * 80) + 'ms';
    io.observe(el);
  });

  // ── Inject shine divs into product cards ─────────────
  document.querySelectorAll('.product-card').forEach(card => {
    if (!card.querySelector('.product-card__shine')) {
      const shine = document.createElement('div');
      shine.className = 'product-card__shine';
      card.insertBefore(shine, card.querySelector('.product-card__content'));
    }
  });

  // ── Filter system ────────────────────────────────────
  const cards      = [...document.querySelectorAll('#products-grid .product-card')];
  const countEl    = document.getElementById('filter-count-num');
  const modeButtons= [...document.querySelectorAll('.filter-mode__btn')];
  const chipsModelo= document.getElementById('filter-chips-modelo');
  const chipsColor = document.getElementById('filter-chips-color');

  let activeMode   = 'modelo';
  let activeFilter = '*';

  function applyFilter() {
    let visible = 0;
    cards.forEach(card => {
      const match = activeFilter === '*' || card.dataset[activeMode] === activeFilter;
      card.classList.toggle('filtered-out', !match);
      if (match) {
        visible++;
        if (!card.classList.contains('visible')) {
          card.classList.add('fade-up');
          io.observe(card);
        }
      }
    });
    if (countEl) countEl.textContent = visible;
  }

  function setActiveChip(container, value) {
    [...container.querySelectorAll('.chip')].forEach(c => {
      c.classList.toggle('active', c.dataset.filter === value);
    });
  }

  // Mode toggle (Modelo / Color)
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      activeMode = btn.dataset.mode;
      activeFilter = '*';
      modeButtons.forEach(b => b.classList.toggle('active', b === btn));
      if (activeMode === 'modelo') {
        chipsModelo.classList.remove('hidden');
        chipsColor.classList.add('hidden');
        setActiveChip(chipsModelo, '*');
      } else {
        chipsColor.classList.remove('hidden');
        chipsModelo.classList.add('hidden');
        setActiveChip(chipsColor, '*');
      }
      applyFilter();
    });
  });

  // Chip clicks
  [chipsModelo, chipsColor].forEach(container => {
    container.addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      activeFilter = chip.dataset.filter;
      setActiveChip(container, activeFilter);
      applyFilter();
    });
  });

  // Init
  applyFilter();

})();
