/* Zanctok — lightweight site interactions (no dependencies) */
(function () {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Header shadow + back-to-top */
  const header = $('.site-header');
  const toTop = $('#toTop');
  const onScroll = () => {
    const y = window.scrollY;
    header && header.classList.toggle('scrolled', y > 20);
    toTop && toTop.classList.toggle('show', y > 600);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  toTop && toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

  /* Mobile menu */
  const nav = $('#nav');
  const menuBtn = $('#menuBtn');
  if (nav && menuBtn) {
    const backdrop = document.createElement('div');
    backdrop.className = 'nav-backdrop';
    document.body.appendChild(backdrop);
    const setOpen = (open) => {
      nav.classList.toggle('open', open);
      backdrop.classList.toggle('show', open);
      menuBtn.setAttribute('aria-expanded', open);
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menuBtn.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
      document.body.style.overflow = open ? 'hidden' : '';
    };
    menuBtn.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
    backdrop.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));
  }

  /* Dropdown (click/tap support) */
  $$('.dd').forEach((dd) => {
    const btn = $('.dd-btn', dd);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !dd.classList.contains('open');
      dd.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open);
    });
  });
  document.addEventListener('click', () => $$('.dd.open').forEach((d) => { d.classList.remove('open'); $('.dd-btn', d).setAttribute('aria-expanded', false); }));

  /* Auto-stagger children of [data-stagger] */
  $$('[data-stagger]').forEach((group) => {
    Array.from(group.children).forEach((el, i) => {
      if (!el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', '');
      el.style.setProperty('--d', (i % 8) * 0.07 + 's');
    });
  });

  /* Reveal on scroll */
  const reveals = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }

  /* Count-up numbers */
  const counters = $$('[data-count]');
  const runCount = (el) => {
    const end = parseFloat(el.dataset.count);
    if (reduce) { el.textContent = end; return; }
    const dur = 1600, start = performance.now();
    const step = (t) => {
      const p = Math.min((t - start) / dur, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (counters.length && 'IntersectionObserver' in window) {
    const co = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { runCount(en.target); co.unobserve(en.target); } });
    }, { threshold: 0.5 });
    counters.forEach((el) => co.observe(el));
  }

  /* Lightbox for certificates */
  const lbTriggers = $$('[data-lightbox]');
  if (lbTriggers.length) {
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.innerHTML = '<button class="lb-close" aria-label="Close"><svg class="ic"><use href="#i-close"/></svg></button><img alt=""><div class="lb-cap"></div>';
    document.body.appendChild(lb);
    const img = $('img', lb), cap = $('.lb-cap', lb), close = $('.lb-close', lb);
    let last;
    const hide = () => { lb.classList.remove('open'); document.body.style.overflow = ''; last && last.focus(); };
    lbTriggers.forEach((t) => t.addEventListener('click', () => {
      last = t;
      img.src = t.dataset.lightbox;
      img.alt = cap.textContent = t.dataset.caption || '';
      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
      close.focus();
    }));
    lb.addEventListener('click', (e) => { if (e.target !== img) hide(); });
    document.addEventListener('keydown', (e) => e.key === 'Escape' && lb.classList.contains('open') && hide());
  }

  /* Scroll-spy for in-page side navigation */
  const spyLinks = $$('[data-spy] a[href^="#"]');
  if (spyLinks.length && 'IntersectionObserver' in window) {
    const map = new Map(spyLinks.map((a) => [a.getAttribute('href').slice(1), a]));
    const so = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          spyLinks.forEach((a) => a.classList.remove('active'));
          const a = map.get(en.target.id);
          a && a.classList.add('active');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); s && so.observe(s); });
  }

  /* Forms → forms/submit.php (AJAX with graceful fallback) */
  $$('form[data-ajax]').forEach((form) => {
    const started = form.querySelector('input[name="_ts"]');
    if (started) started.value = Math.floor(Date.now() / 1000);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = $('.form-status', form);
      const btn = $('button[type="submit"]', form);
      if (!form.checkValidity()) { form.reportValidity(); return; }
      btn.disabled = true;
      const label = btn.innerHTML;
      btn.textContent = 'Sending…';
      status.className = 'form-status';
      try {
        const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          status.className = 'form-status ok';
          status.textContent = data.message || 'Thank you — your message has been sent. Our team will contact you shortly.';
          form.reset();
          if (started) started.value = Math.floor(Date.now() / 1000);
        } else {
          throw new Error(data.message || 'Something went wrong.');
        }
      } catch (err) {
        status.className = 'form-status err';
        status.textContent = (err && err.message && err.message !== 'Failed to fetch' ? err.message + ' ' : '') +
          'If the problem persists, please email zanctokpharma@hotmail.com or call +92 331 2266602.';
      } finally {
        btn.disabled = false;
        btn.innerHTML = label;
      }
    });
  });
})();
