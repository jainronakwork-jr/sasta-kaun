(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KEY = 'sasta-kaun-v1', HKEY = 'sasta-kaun-history-v1';

  const UNITS = {
    g: { fam: 'w', f: 1 }, kg: { fam: 'w', f: 1000 },
    ml: { fam: 'v', f: 1 }, L: { fam: 'v', f: 1000 },
    pcs: { fam: 'c', f: 1 }, dozen: { fam: 'c', f: 12 },
    m: { fam: 'l', f: 1 }
  };
  const FAM = {
    w: { show: 'kg', mult: 1000, small: '100 g', smallMult: 100, use: ['kg', 'g'] },
    v: { show: 'L', mult: 1000, small: '100 ml', smallMult: 100, use: ['L', 'ml'] },
    c: { show: 'piece', mult: 1, small: null, use: ['pcs'] },
    l: { show: 'metre', mult: 1, small: null, use: ['m'] }
  };
  const LETTERS = 'ABCDEF';
  const blank = () => ({ name: '', price: '', qty: '', unit: 'kg', packs: 1, offer: 'none', x: 1, y: 1, pct: 10, flat: 10 });

  let opts = loadState() || [blank(), blank()];
  function loadState() { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && Array.isArray(s.opts) && s.opts.length) { $('#what').value = s.what || ''; return s.opts; } } catch (e) {} return null; }
  function saveState() { try { localStorage.setItem(KEY, JSON.stringify({ what: $('#what').value, opts })); } catch (e) {} }

  const rupee = (n) => '₹' + (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2));
  const rupee2 = (n) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num = (v) => { const n = parseFloat(String(v).replace(/,/g, '')); return isFinite(n) ? n : NaN; };

  function calc(o) {
    const price = num(o.price), qty = num(o.qty), packs = Math.max(1, num(o.packs) || 1);
    if (!(price > 0) || !(qty > 0) || !UNITS[o.unit]) return null;
    const base = qty * UNITS[o.unit].f * packs;
    let paid = price, got = base, offerTxt = '';
    if (o.offer === 'bxgy') { const x = Math.max(1, num(o.x) || 1), y = Math.max(0, num(o.y) || 0); paid = price * x; got = base * (x + y); offerTxt = 'Buy ' + x + ' get ' + y + ' free'; }
    if (o.offer === 'pct') { const p = Math.min(100, Math.max(0, num(o.pct) || 0)); paid = price * (1 - p / 100); offerTxt = p + '% off'; }
    if (o.offer === 'flat') { const r = Math.max(0, num(o.flat) || 0); paid = Math.max(0, price - r); offerTxt = '₹' + r + ' off'; }
    const fam = UNITS[o.unit].fam;
    return { per: paid / got, fam, paid, got, offerTxt };
  }

  // ---------- option cards ----------
  function renderOpts() {
    $('#opts').innerHTML = opts.map((o, i) => {
      const unitOpts = Object.keys(UNITS).map((u) => '<option' + (u === o.unit ? ' selected' : '') + '>' + u + '</option>').join('');
      return '<article class="opt" data-i="' + i + '">' +
        '<header><span class="letter" aria-hidden="true">' + LETTERS[i] + '</span>' +
        '<input class="nm" data-k="name" value="' + esc(o.name) + '" placeholder="Pack ' + LETTERS[i] + ' (brand / size)" aria-label="Name of pack ' + LETTERS[i] + '">' +
        (opts.length > 2 ? '<button type="button" class="rm" data-rm aria-label="Remove pack ' + LETTERS[i] + '">×</button>' : '') + '</header>' +
        '<div class="grid">' +
        '<label>Price ₹<input data-k="price" type="number" inputmode="decimal" min="0" step="any" value="' + esc(o.price) + '" placeholder="245"></label>' +
        '<label>Size<span class="qty"><input data-k="qty" type="number" inputmode="decimal" min="0" step="any" value="' + esc(o.qty) + '" placeholder="5"><select data-k="unit" aria-label="Unit">' + unitOpts + '</select></span></label>' +
        '<label>Packs in deal<input data-k="packs" type="number" inputmode="numeric" min="1" step="1" value="' + esc(o.packs) + '"></label>' +
        '<label>Offer<select data-k="offer">' +
        [['none', 'No offer'], ['bxgy', 'Buy X get Y free'], ['pct', '% off'], ['flat', '₹ off']].map(([v, t]) => '<option value="' + v + '"' + (o.offer === v ? ' selected' : '') + '>' + t + '</option>').join('') +
        '</select></label>' +
        '</div>' +
        '<div class="offer-extra" ' + (o.offer === 'none' ? 'hidden' : '') + '>' +
        (o.offer === 'bxgy' ? '<label>Buy<input data-k="x" type="number" min="1" step="1" value="' + esc(o.x) + '"></label><label>Get free<input data-k="y" type="number" min="0" step="1" value="' + esc(o.y) + '"></label>' : '') +
        (o.offer === 'pct' ? '<label>Discount %<input data-k="pct" type="number" min="0" max="100" step="any" value="' + esc(o.pct) + '"></label>' : '') +
        (o.offer === 'flat' ? '<label>Discount ₹<input data-k="flat" type="number" min="0" step="any" value="' + esc(o.flat) + '"></label>' : '') +
        '</div>' +
        '<p class="per" id="per-' + i + '"></p>' +
        '</article>';
    }).join('');
    $('#add').hidden = opts.length >= LETTERS.length;
  }

  $('#opts').addEventListener('input', (e) => {
    const k = e.target.dataset.k; if (!k) return;
    const i = +e.target.closest('.opt').dataset.i;
    opts[i][k] = e.target.value;
    if (k === 'offer') renderOpts();
    update();
  });
  $('#opts').addEventListener('change', (e) => { if (e.target.dataset.k === 'offer' || e.target.dataset.k === 'unit') { const i = +e.target.closest('.opt').dataset.i; opts[i][e.target.dataset.k] = e.target.value; if (e.target.dataset.k === 'offer') renderOpts(); update(); } });
  $('#opts').addEventListener('click', (e) => {
    if (!e.target.closest('[data-rm]')) return;
    opts.splice(+e.target.closest('.opt').dataset.i, 1); renderOpts(); update();
  });
  $('#add').addEventListener('click', () => {
    const last = opts[opts.length - 1]; const n = blank(); n.unit = last ? last.unit : 'kg';
    opts.push(n); renderOpts(); update();
    const inputs = document.querySelectorAll('.opt:last-child [data-k=price]'); if (inputs[0]) inputs[0].focus();
  });

  // ---------- result ----------
  let lastResult = null;
  function update() {
    saveState();
    const res = opts.map((o, i) => ({ i, o, c: calc(o) }));
    const valid = res.filter((r) => r.c);
    res.forEach((r) => {
      const el = $('#per-' + r.i); if (!el) return;
      if (!r.c) { el.textContent = 'Enter price and size'; el.className = 'per muted'; return; }
      const F = FAM[r.c.fam];
      el.className = 'per';
      el.textContent = rupee2(r.c.per * F.mult) + ' per ' + F.show + (F.small ? '  ·  ' + rupee2(r.c.per * F.smallMult) + ' per ' + F.small : '') + (r.c.offerTxt ? '  (with ' + r.c.offerTxt + ')' : '');
    });

    const out = $('#result');
    lastResult = null;
    if (valid.length < 2) { out.innerHTML = '<p class="wait">Fill in the price and size of at least two packs to see which is cheaper.</p>'; useUpdate(); return; }
    const fams = new Set(valid.map((r) => r.c.fam));
    if (fams.size > 1) { out.innerHTML = '<p class="warn">These packs are measured differently (for example kg and pieces). Compare packs that use the same kind of unit.</p>'; useUpdate(); return; }
    const F = FAM[valid[0].c.fam];
    const sorted = [...valid].sort((a, b) => a.c.per - b.c.per);
    const best = sorted[0], worst = sorted[sorted.length - 1];
    const same = (worst.c.per - best.c.per) / best.c.per < 0.005;
    const label = (r) => r.o.name ? LETTERS[r.i] + ' · ' + r.o.name : 'Pack ' + LETTERS[r.i];
    lastResult = { best, sorted, F, label, same };

    const max = worst.c.per;
    const bars = sorted.map((r) => {
      const pct = ((r.c.per / best.c.per) - 1) * 100;
      return '<li class="' + (r === best ? 'win' : '') + '"><span class="bl">' + esc(label(r)) + '</span>' +
        '<span class="bar"><i style="width:' + Math.max(8, (r.c.per / max) * 100).toFixed(1) + '%"></i></span>' +
        '<span class="bv">' + rupee2(r.c.per * F.mult) + '/' + F.show + (r === best ? '' : ' <em>+' + pct.toFixed(pct < 10 ? 1 : 0) + '%</em>') + '</span></li>';
    }).join('');

    if (same) {
      out.innerHTML = '<div class="tie"><p class="big">Same price</p><p>All packs cost about ' + rupee2(best.c.per * F.mult) + ' per ' + F.show + '. Pick the one you will finish before it expires.</p></div><ul class="bars">' + bars + '</ul>';
    } else {
      const second = sorted[1];
      const diffPct = ((second.c.per / best.c.per) - 1) * 100;
      out.innerHTML =
        '<div class="tagwrap"><div class="pricetag"><span class="who">' + esc(label(best)) + ' is cheapest</span>' +
        '<span class="amt">' + rupee(best.c.per * F.mult) + '</span><span class="unit">per ' + F.show + '</span></div>' +
        '<p class="why">' + (sorted.length === 2 ? esc(label(second)) + ' costs' : 'The next best, ' + esc(label(second)) + ', costs') + ' <strong>' + diffPct.toFixed(diffPct < 10 ? 1 : 0) + '% more</strong> — ' + rupee2((second.c.per - best.c.per) * F.mult) + ' extra on every ' + F.show + '.</p></div>' +
        '<ul class="bars">' + bars + '</ul>';
    }
    useUpdate();
  }

  // ---------- monthly usage ----------
  function useUpdate() {
    const sel = $('#use-u'); const fam = lastResult ? lastResult.best.c.fam : (UNITS[opts[0].unit] || UNITS.kg).fam;
    const want = FAM[fam].use;
    if ([...sel.options].map((o) => o.value).join() !== want.join()) sel.innerHTML = want.map((u) => '<option>' + u + '</option>').join('');
    const n = num($('#use-n').value);
    const outEl = $('#use-out');
    if (!lastResult || !(n > 0)) { outEl.textContent = ''; return; }
    const perMonthBase = n * UNITS[sel.value].f;
    const { best, sorted, label } = lastResult;
    const worst = sorted[sorted.length - 1];
    const save = (worst.c.per - best.c.per) * perMonthBase;
    const months = best.c.got / perMonthBase;
    let t = '';
    if (!lastResult.same && save >= 0.5) t += 'Choosing ' + label(best) + ' over ' + label(worst) + ' saves about ' + rupee2(save) + ' a month — ' + rupee2(save * 12) + ' a year. ';
    const mTxt = (() => {
      if (months < 1) { const d = Math.max(1, Math.round(months * 30)); return d + (d === 1 ? ' day' : ' days'); }
      const v = months < 3 ? Math.round(months * 2) / 2 : Math.round(months);
      return String(v).replace(/\.0$/, '') + (v === 1 ? ' month' : ' months');
    })();
    t += label(best) + ' will last you about ' + mTxt + '.';
    if (months > 6) t += ' That is a long time — check the expiry date on the pack before buying the big one.';
    outEl.textContent = t;
  }
  $('#use-n').addEventListener('input', useUpdate);
  $('#use-u').addEventListener('change', useUpdate);
  $('#what').addEventListener('input', saveState);

  // ---------- share / save / history ----------
  function summary() {
    if (!lastResult) return '';
    const { best, sorted, F, label, same } = lastResult;
    const what = $('#what').value.trim();
    const lines = sorted.map((r) => '• ' + label(r) + ': ' + rupee2(r.c.per * F.mult) + '/' + F.show + ' (' + '₹' + num(r.o.price) + ' for ' + num(r.o.qty) + ' ' + r.o.unit + (num(r.o.packs) > 1 ? ' × ' + num(r.o.packs) : '') + (r.c.offerTxt ? ', ' + r.c.offerTxt : '') + ')');
    return '🛒 Sasta Kaun?' + (what ? ' — ' + what : '') + '\n' + (same ? 'All the same price per ' + F.show + '.' : '✅ ' + label(best) + ' is cheapest.') + '\n' + lines.join('\n') + '\n\nCompare yours: ' + location.href.split(/[?#]/)[0];
  }
  $('#share').addEventListener('click', () => { if (!lastResult) { toast('Add at least two packs first'); return; } window.open('https://wa.me/?text=' + encodeURIComponent(summary()), '_blank', 'noopener'); });
  function hist() { try { return JSON.parse(localStorage.getItem(HKEY) || '[]'); } catch (e) { return []; } }
  function renderHist() {
    const h = hist(); $('#hist-wrap').hidden = !h.length;
    $('#hist').innerHTML = h.map((x, i) => '<li><button type="button" data-h="' + i + '"><b>' + esc(x.what || 'Comparison') + '</b><span>' + esc(x.text) + ' · ' + esc(x.date) + '</span></button></li>').join('');
  }
  $('#save').addEventListener('click', () => {
    if (!lastResult) { toast('Add at least two packs first'); return; }
    const { best, F, label, same } = lastResult;
    const h = hist();
    h.unshift({ what: $('#what').value.trim(), date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), text: same ? 'Same price' : label(best) + ' at ' + rupee2(best.c.per * F.mult) + '/' + F.show, opts: JSON.parse(JSON.stringify(opts)) });
    try { localStorage.setItem(HKEY, JSON.stringify(h.slice(0, 30))); } catch (e) {}
    renderHist(); toast('Saved');
  });
  $('#hist').addEventListener('click', (e) => {
    const b = e.target.closest('[data-h]'); if (!b) return;
    const x = hist()[+b.dataset.h]; if (!x) return;
    $('#what').value = x.what || ''; opts = x.opts; renderOpts(); update(); window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  $('#reset').addEventListener('click', () => { opts = [blank(), blank()]; $('#what').value = ''; $('#use-n').value = ''; renderOpts(); update(); });

  const EX = {
    atta: { what: 'Atta (example prices)', opts: [{ name: '5 kg bag', price: 245, qty: 5, unit: 'kg' }, { name: '10 kg bag', price: 470, qty: 10, unit: 'kg' }], use: [8, 'kg'] },
    oil: { what: 'Mustard oil (example prices)', opts: [{ name: '1 L pouch', price: 155, qty: 1, unit: 'L' }, { name: '5 L tin', price: 740, qty: 5, unit: 'L' }], use: [2, 'L'] },
    soap: { what: 'Bathing soap (example prices)', opts: [{ name: 'Single bar', price: 42, qty: 100, unit: 'g' }, { name: '3+1 offer', price: 42, qty: 100, unit: 'g', offer: 'bxgy', x: 3, y: 1 }, { name: 'Big 150 g bar', price: 58, qty: 150, unit: 'g' }], use: [400, 'g'] },
    shampoo: { what: 'Shampoo (example prices)', opts: [{ name: 'Sachet strip', price: 48, qty: 7.5, unit: 'ml', packs: 16 }, { name: '340 ml bottle', price: 199, qty: 340, unit: 'ml' }, { name: '650 ml bottle', price: 349, qty: 650, unit: 'ml', offer: 'pct', pct: 10 }], use: [150, 'ml'] }
  };
  document.querySelectorAll('[data-ex]').forEach((b) => b.addEventListener('click', () => {
    const ex = EX[b.dataset.ex];
    $('#what').value = ex.what;
    opts = ex.opts.map((o) => ({ ...blank(), ...o }));
    renderOpts(); update();
    $('#use-n').value = ex.use[0]; useUpdate(); $('#use-u').value = ex.use[1]; useUpdate();
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }));

  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), 2200); }

  renderOpts(); update(); renderHist();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
