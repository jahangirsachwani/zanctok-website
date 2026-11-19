/* Product catalogue + product detail rendering */
(function () {
  'use strict';
  const IMG = 'https://www.zanctok.com/images/';
  const R = window.ZPL_RANGES, AREAS = window.ZPL_AREAS;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const UNIT = /^[\d.,/%]+(mg|mcg|g|ml|iu|gm)?(\/\d*ml)?$|^\d|^(mg|mcg|ml|iu|hcl|w\/w|w\/v)$/i;
  const KEEP = /^(HCl|DS|SR|BP|CO\.?|D|A|B1|B2|B6|B12|C|II)$/i;
  const title = (w) => w.charAt(0) + w.slice(1).toLowerCase();
  function pretty(name, brandFirst) {
    return name.split(' ').map((w, i) => {
      if (brandFirst && i === 0) return w;
      if (UNIT.test(w)) return w.replace(/MG/g, 'mg').replace(/ML/g, 'ml');
      if (KEEP.test(w)) return w.toUpperCase() === 'HCL' ? 'HCl' : w.toUpperCase();
      return w.split('-').map(title).join('-');
    }).join(' ');
  }
  function areaOf(p) {
    if ((p.range === 'O' || p.range === 'E') && !/pharyngitis/i.test(p.cls)) return AREAS.find((a) => a.id === 'skin');
    return AREAS.find((a) => a.re.test(p.cls)) || { id: 'other', name: 'Other' };
  }

  const PRODUCTS = window.ZPL_PRODUCTS.map((r) => {
    // keep the first word in capitals only when it is a brand name (i.e. not one of the active ingredients)
    const first = r[2].split(/[\s-]/)[0].toUpperCase();
    const isBrand = !r[4].toUpperCase().split(/[^A-Z]+/).includes(first);
    const p = { range: r[0], reg: r[1], raw: r[2], name: pretty(r[2], isBrand), packs: r[3].split('|').map((s) => s.trim()), comp: r[4].split('+').map((s) => pretty(s.trim())), cls: r[5], form: r[6] };
    p.area = areaOf(p);
    p.search = (r[1] + ' ' + r[2] + ' ' + r[4] + ' ' + r[5] + ' ' + r[6] + ' ' + R[p.range].name + ' ' + p.area.name).toLowerCase();
    return p;
  });
  window.ZPL = { PRODUCTS, pretty };

  const card = (p, i) => `
    <a class="prod" href="product.html?id=${p.reg}" style="animation-delay:${Math.min(i, 12) * 30}ms">
      <div class="top"><span class="tag ${p.area.id === 'anti-infectives' ? 'teal' : ''}">${esc(p.form)}</span><span class="reg">Reg # ${p.reg}</span></div>
      <h3>${esc(p.name)}</h3>
      <div class="gen">${esc(p.comp.join(' + '))}</div>
      <div class="meta"><span>${esc(p.cls)}</span><svg class="ic"><use href="#i-arrow"/></svg></div>
    </a>`;

  /* ---------- Catalogue page ---------- */
  const grid = document.getElementById('pgrid');
  if (grid) {
    const q = document.getElementById('q');
    const areaSel = document.getElementById('area');
    const chipsEl = document.getElementById('chips');
    const countEl = document.getElementById('count');
    const params = new URLSearchParams(location.search);
    const state = { q: params.get('q') || '', range: params.get('range') || 'all', area: params.get('area') || 'all' };

    areaSel.innerHTML = '<option value="all">All therapeutic areas</option>' +
      AREAS.map((a) => `<option value="${a.id}">${a.name} (${PRODUCTS.filter((p) => p.area.id === a.id).length})</option>`).join('');
    chipsEl.innerHTML = `<button class="chip" data-range="all">All<span class="cnt">${PRODUCTS.length}</span></button>` +
      Object.keys(R).map((k) => `<button class="chip" data-range="${k}">${R[k].name}<span class="cnt">${PRODUCTS.filter((p) => p.range === k).length}</span></button>`).join('');

    q.value = state.q;
    areaSel.value = AREAS.some((a) => a.id === state.area) ? state.area : 'all';

    const render = () => {
      const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      const list = PRODUCTS.filter((p) =>
        (state.range === 'all' || p.range === state.range) &&
        (state.area === 'all' || p.area.id === state.area) &&
        terms.every((t) => p.search.includes(t)));
      grid.innerHTML = list.length ? list.map(card).join('') :
        `<div class="empty" style="grid-column:1/-1"><svg class="ic"><use href="#i-search"/></svg><p><b>No products found.</b><br>Try another name, generic or therapeutic class.</p></div>`;
      countEl.innerHTML = `Showing <b>${list.length}</b> of ${PRODUCTS.length} products`;
      chipsEl.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c.dataset.range === state.range));
      const u = new URLSearchParams();
      if (state.q) u.set('q', state.q);
      if (state.range !== 'all') u.set('range', state.range);
      if (state.area !== 'all') u.set('area', state.area);
      history.replaceState(null, '', location.pathname + (u.toString() ? '?' + u : ''));
    };
    let t;
    q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { state.q = q.value.trim(); render(); }, 120); });
    areaSel.addEventListener('change', () => { state.area = areaSel.value; render(); });
    chipsEl.addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c) { state.range = c.dataset.range; render(); } });
    const reset = document.getElementById('reset');
    reset && reset.addEventListener('click', () => { state.q = ''; state.range = 'all'; state.area = 'all'; q.value = ''; areaSel.value = 'all'; render(); });
    render();
  }

  /* ---------- Product detail page ---------- */
  const pd = document.getElementById('pd');
  if (pd) {
    const id = new URLSearchParams(location.search).get('id');
    const p = PRODUCTS.find((x) => x.reg === id);
    if (!p) {
      pd.innerHTML = `<div class="empty"><svg class="ic"><use href="#i-search"/></svg><p><b>Product not found.</b><br><a class="link" href="products.html">Browse the full catalogue <svg class="ic"><use href="#i-arrow"/></svg></a></p></div>`;
      return;
    }
    const range = R[p.range];
    document.title = `${p.name} — ${p.comp.join(' + ')} | Zanctok Pharmaceutical Laboratories`;
    const md = document.querySelector('meta[name="description"]');
    md && md.setAttribute('content', `${p.name} (${p.comp.join(' + ')}) by Zanctok Pharmaceutical Laboratories. ${p.cls}. DRAP Reg # ${p.reg}.`);
    document.getElementById('pdName').textContent = p.name;
    const related = PRODUCTS.filter((x) => x !== p && (x.area.id === p.area.id)).slice(0, 3);
    pd.innerHTML = `
      <div class="pd">
        <div class="pd-img" data-reveal="zoom"><img src="${IMG + range.img}" alt="${esc(range.name)} range"><span class="note">Representative range image</span></div>
        <div data-reveal>
          <span class="tag">${esc(range.name)}</span> <span class="tag teal">${esc(p.area.name)}</span>
          <h1>${esc(p.name)}</h1>
          <p class="gen">${esc(p.comp.join(' + '))}</p>
          <dl class="spec">
            <div><dt>Composition</dt><dd>${p.comp.map(esc).join('<br>')}</dd></div>
            <div><dt>Therapeutic class</dt><dd>${esc(p.cls)}</dd></div>
            <div><dt>Dosage form</dt><dd>${esc(p.form)}</dd></div>
            <div><dt>Pack sizes</dt><dd><div class="packs">${p.packs.map((s) => `<span>${esc(s)}</span>`).join('')}</div></dd></div>
            <div><dt>DRAP Registration #</dt><dd>${p.reg}</dd></div>
            <div><dt>Manufacturer</dt><dd>Zanctok Pharmaceutical Laboratories, Hyderabad</dd></div>
          </dl>
          <div class="cta-row" style="display:flex;gap:12px;flex-wrap:wrap">
            <a class="btn btn-primary" href="partner.html?product=${encodeURIComponent(p.name)}">Enquire about this product <svg class="ic"><use href="#i-arrow"/></svg></a>
            <a class="btn btn-ghost" href="products.html?area=${p.area.id}">More in ${esc(p.area.name)}</a>
          </div>
          <div class="notice"><svg class="ic"><use href="#i-alert"/></svg><span>For healthcare professionals. Use only as prescribed by a registered medical practitioner. To report a suspected side effect, <a href="report-side-effect.html?product=${encodeURIComponent(p.name)}" style="text-decoration:underline">click here</a>.</span></div>
        </div>
      </div>
      ${related.length ? `<div style="margin-top:90px"><div class="head"><div><span class="eyebrow">Related products</span><h2>More in ${esc(p.area.name)}</h2></div></div><div class="pgrid">${related.map(card).join('')}</div></div>` : ''}`;
    pd.querySelectorAll('[data-reveal]').forEach((el) => requestAnimationFrame(() => el.classList.add('in')));
  }

  /* ---------- Range counts on other pages ---------- */
  document.querySelectorAll('[data-range-count]').forEach((el) => {
    const k = el.dataset.rangeCount.split(',');
    el.textContent = PRODUCTS.filter((p) => k.includes(p.range)).length;
  });
  document.querySelectorAll('[data-total-products]').forEach((el) => { el.dataset.count = PRODUCTS.length; el.textContent = PRODUCTS.length; });
})();
