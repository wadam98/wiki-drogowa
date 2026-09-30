'use strict';
/* Wiki drogowa – aplikacja jednostronicowa (hash-routing, bez zależności). */

const CATS = {
  sciagi: { n: 'Ściągi', d: 'Twoje notatki – źródła wtórne, nie podstawa prawna.' },
  ustawy: { n: 'Ustawy', d: 'Prawo budowlane, drogi publiczne, OOŚ, KC, PoRD, Pzp, ZRID.' },
  rozp:   { n: 'Rozporządzenia', d: 'PTB drogowe, projekt budowlany, dziennik budowy, BIOZ, geotechnika, STWiORB.' },
  wwiorb: { n: 'WWiORB', d: 'Wzorcowe warunki wykonania i odbioru robót (GDDKiA).' },
  wrd:    { n: 'WR-D', d: 'Wzorce i standardy Ministra Infrastruktury: projektowanie i katalogi.' },
  wt:     { n: 'WT GDDKiA', d: 'Wymagania techniczne: kruszywa, mieszanki, spoiwa.' },
  inne:   { n: 'Inne', d: 'Linki i materiały pomocnicze.' },
};
const CAT_ORDER = ['sciagi', 'ustawy', 'rozp', 'wwiorb', 'wrd', 'wt', 'inne'];
const QUICK = ['roboty zanikające', 'grupy nośności', 'warstwa mrozoochronna', 'wskaźnik zagęszczenia', 'skrajnia',
  'zjazdy', 'dziennik budowy', 'odbiór końcowy', 'kategoria ruchu', 'skropienie', 'ronda', 'odwodnienie'];

const $ = (s, r = document) => r.querySelector(s);
const view = $('#view');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PL = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' };
const nz = s => s.toLowerCase().replace(/[ąćęłńóśźż]/g, c => PL[c]);     // 1 znak -> 1 znak
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
};

let reg = [], wiki = null, bySlug = {}, byId = {}, topics = [], idRe = null;
const docCache = new Map();
let SIDX = null, SLOAD = null;

/* ---------- dane ---------- */
async function getJSON(u) { const r = await fetch(u); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }
async function init() {
  [reg, wiki] = await Promise.all([getJSON('data/registry.json'), getJSON('data/wiki.json')]);
  reg.forEach(d => { bySlug[d.slug] = d; byId[d.id] = d; });
  const ids = reg.map(d => d.id).filter(i => i !== 'X-LINK').sort((a, b) => b.length - a.length)
    .map(i => i.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'));
  idRe = new RegExp('(^|[^\\w.\\-])(' + ids.join('|') + ')(?![\\w\\-]|\\.\\d)', 'g');
  parseTopics();
  window.addEventListener('hashchange', route);
  route();
}
function loadDoc(slug) {
  if (!docCache.has(slug)) docCache.set(slug, getJSON('data/docs/' + slug + '.json'));
  return docCache.get(slug);
}
function loadSearch() {
  if (SIDX) return Promise.resolve(SIDX);
  if (!SLOAD) SLOAD = getJSON('data/search.json').then(j => {
    SIDX = { docs: j.d, rows: j.r, norm: j.r.map(r => nz(r[2])) };
    return SIDX;
  });
  return SLOAD;
}

/* ---------- markdown (mini) ---------- */
function linkify(h) {
  return h.split(/(<[^>]*>)/).map((p, i) => i % 2 ? p :
    p.replace(idRe, (m, pre, id) => `${pre}<a class="ref" href="#/dok/${encodeURIComponent(byId[id].slug)}">${id}</a>`)).join('');
}
function inline(s) {
  let h = esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
  return linkify(h);
}
function md(src, opt = {}) {
  const L = src.split('\n'); let out = '', i = 0;
  while (i < L.length) {
    const l = L[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = l.match(/^(#{2,4}) (.+)/))) { out += `<h3>${inline(m[2])}</h3>`; i++; continue; }
    if (l.startsWith('|')) {
      const rows = [];
      while (i < L.length && L[i].startsWith('|')) { rows.push(L[i]); i++; }
      const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const head = cells(rows[0]), body = rows.slice(2).map(cells);
      out += `<div class="tblwrap"><table><thead><tr>${head.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>` +
        body.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('') + '</tbody></table></div>';
      continue;
    }
    if (/^(- |\d+\. )/.test(l)) {
      const ord = /^\d/.test(l), items = [];
      while (i < L.length && /^(- |\d+\. )/.test(L[i])) { items.push(L[i].replace(/^(- |\d+\. )/, '')); i++; }
      out += `<${ord ? 'ol' : 'ul'}>${items.map(x => `<li>${inline(x)}</li>`).join('')}</${ord ? 'ol' : 'ul'}>`;
      continue;
    }
    const p = [];
    while (i < L.length && L[i].trim() && !/^(#{2,4} |\||- |\d+\. )/.test(L[i])) { p.push(L[i]); i++; }
    out += `<p>${inline(p.join(' '))}</p>`;
  }
  return `<div class="md ${opt.wide ? 'wide' : ''}">${out}</div>`;
}
const S = k => wiki.sections[k];

/* ---------- mapa tematyczna: wiersze jako tematy ---------- */
function parseTopics() {
  topics = []; let group = '';
  S('2').body.split('\n').forEach(l => {
    let m;
    if ((m = l.match(/^### (.+)/))) group = m[1];
    else if (l.startsWith('|') && !/^\|(---|\s*Temat)/.test(l)) {
      const c = l.trim().replace(/^\||\|$/g, '').split('|').map(x => x.trim());
      if (c.length >= 2) topics.push({ n: topics.length, group, q: c[0], d: c.slice(1).join(' | ') });
    }
  });
  topics.forEach(t => {
    t.ids = new Set(); let m; const re = new RegExp(idRe.source, 'g');
    while ((m = re.exec(t.d))) t.ids.add(m[2]);
  });
}

/* ---------- widoki ---------- */
function setTitle(t) { document.title = (t ? t + ' · ' : '') + 'Wiki drogowa'; }
function nav(cur) {
  document.querySelectorAll('#nav a').forEach(a => { if (a.dataset.r === cur) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
}
function ditem(d, extra = '') {
  return `<a class="ditem cat-${d.cat}" href="#/dok/${encodeURIComponent(d.slug)}${extra}">
    <span class="badge">${esc(d.id)}</span><span class="t">${esc(d.title)}</span>
    <span class="s">${esc(short(d.ident || d.scope, 120))}${d.note && d.cat === 'sciagi' ? ' · źródło wtórne' : ''}</span></a>`;
}
function short(s, n) { s = s || ''; return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; }

function viewHome() {
  setTitle(''); nav('home');
  const counts = {}; reg.forEach(d => counts[d.cat] = (counts[d.cat] || 0) + 1);
  const pagesTotal = reg.reduce((a, d) => a + (d.hasText ? d.nPages || 0 : 0), 0);
  const bms = store.get('wd_bm', []), rec = store.get('wd_recent', []).map(s => bySlug[s]).filter(Boolean);
  view.innerHTML = `
  <section class="hero">
    <p class="eyebrow">Baza wiedzy · budownictwo drogowe · stan na 30.09.2026</p>
    <h1>Wiki <em>drogowa</em></h1>
    <p class="lede">Pełny tekst ${reg.filter(d => d.hasText).length} dokumentów (${pagesTotal.toLocaleString('pl')} stron): ustawy, rozporządzenia, wzorcowe WWiORB, wytyczne WR-D i wymagania WT. Szukaj w treści albo zacznij od pytania w mapie tematycznej.</p>
    <form class="bigsearch" id="bigform" role="search">
      <label class="sbox"><span hidden>Szukaj</span>${ICON_S}<input id="bigq" type="search" placeholder="np. roboty zanikające, art. 22, wskaźnik zagęszczenia" autocomplete="off"></label>
      <button class="btn primary" type="submit">Szukaj</button>
    </form>
    <div class="chips">${QUICK.map(q => `<a class="chip" href="#/szukaj/${encodeURIComponent(q)}">${esc(q)}</a>`).join('')}</div>
  </section>

  <section class="sec">
    <div class="sec-head"><h2>Zacznij od pytania</h2></div>
    <a class="tile" style="--cc:var(--accent)" href="#/mapa"><b>Mapa tematyczna →</b><span>Pytanie → właściwe dokumenty i miejsca (art., §, pkt). ${topics.length} tematów w czterech blokach: odbiory, formalności, projektowanie, materiały i technologie.</span></a>
  </section>

  <section class="sec">
    <div class="sec-head"><h2>Dokumenty</h2><span class="meta">${reg.length} pozycji</span></div>
    <div class="tiles">${CAT_ORDER.filter(c => counts[c]).map(c => `
      <a class="tile cat-${c}" href="#/dok/kat/${c}"><span class="n">${counts[c]} dok.</span><b>${CATS[c].n}</b><span>${CATS[c].d}</span></a>`).join('')}</div>
  </section>

  ${bms.length ? `<section class="sec"><div class="sec-head"><h2>Zakładki</h2><span class="meta">tylko na tym urządzeniu</span></div><div class="dlist">${bms.map(b => {
    const d = bySlug[b.slug]; return d ? `<a class="ditem cat-${d.cat}" href="#/dok/${encodeURIComponent(d.slug)}/${b.page}"><span class="badge">${esc(d.id)}</span><span class="t">${esc(d.title)}, s. ${b.page}</span></a>` : '';
  }).join('')}</div></section>` : ''}
  ${rec.length ? `<section class="sec"><div class="sec-head"><h2>Ostatnio otwarte</h2></div><div class="dlist">${rec.map(d => ditem(d)).join('')}</div></section>` : ''}

  <section class="sec">
    <div class="sec-head"><h2>Zasady, które warto pamiętać</h2></div>
    <div class="callout"><ul>
      <li><b>Ściągi to notatki wtórne.</b> Nie są podstawą prawną ani wymaganiem. Wartości z nich sprawdzaj w PTB, WR-D, WWiORB, WT.</li>
      <li><b>WWiORB, WT i WR-D wiążą kontraktowo tylko wtedy,</b> gdy powołuje je umowa lub OPZ/PFU. Bez tego to wzorce i zalecenia.</li>
      <li><b>Norm PN-EN i Eurokodów nie ma w bazie.</b> Wymagania liczbowe z norm oznaczaj jako „do weryfikacji w normie”.</li>
      <li><b>Umowy (FIDIC, OPZ/PFU) nie ma w bazie.</b> Gdy odpowiedź zależy od umowy, sprawdź ją w dokumentach kontraktu.</li>
      <li><b>Teksty aktów prawnych to stan z daty publikacji.</b> Zobacz <a href="#/info">aktualność i luki w bazie</a>.</li>
    </ul></div>
  </section>

  <section class="sec"><div class="sec-head"><h2>Hierarchia źródeł</h2></div>${md(S('1').body)}</section>`;
  $('#bigform').addEventListener('submit', e => { e.preventDefault(); const q = $('#bigq').value.trim(); if (q) location.hash = '#/szukaj/' + encodeURIComponent(q); });
}

function viewMapa(sel) {
  setTitle('Mapa tematyczna'); nav('mapa');
  const groups = [...new Set(topics.map(t => t.group))];
  view.innerHTML = `
  <section class="sec"><h2>Mapa tematyczna: pytanie → dokumenty</h2>
    <div class="md"><p>${inline(S('2').body.split('\n')[0])}</p></div>
    <div class="filter"><label class="sbox">${ICON_S}<input id="tf" type="search" placeholder="Filtruj tematy (np. skrajnia, odbiór, DŚU)" autocomplete="off"></label></div>
    <div class="chips" id="gj">${groups.map((g, i) => `<a class="chip" href="#/mapa" data-g="${i}">${esc(g.split('.')[0])}. ${esc(g.replace(/^[A-Z]\.\s*/, ''))}</a>`).join('')}</div>
  </section>
  ${groups.map((g, gi) => `<section class="sec" data-g="${gi}" id="g${gi}"><h2>${esc(g)}</h2>${topics.filter(t => t.group === g).map(t =>
    `<div class="topic" id="t${t.n}" data-s="${esc(nz(t.q + ' ' + t.d))}"><div class="q">${esc(t.q)}</div><div class="d">${inline(t.d)}</div></div>`).join('')}</section>`).join('')}`;
  $('#tf').addEventListener('input', e => {
    const q = nz(e.target.value.trim()).split(/\s+/).filter(Boolean);
    document.querySelectorAll('.topic').forEach(el => el.hidden = !q.every(w => el.dataset.s.includes(w)));
    document.querySelectorAll('section[data-g]').forEach(s => s.hidden = !s.querySelector('.topic:not([hidden])'));
  });
  $('#gj').addEventListener('click', e => {
    const a = e.target.closest('a[data-g]'); if (!a) return; e.preventDefault();
    document.getElementById('g' + a.dataset.g).scrollIntoView({ behavior: 'smooth' });
  });
  if (sel) { const t = document.getElementById('t' + sel); if (t) { t.classList.add('flash'); requestAnimationFrame(() => t.scrollIntoView({ block: 'center' })); } }
}

function viewList(kat) {
  setTitle(kat && CATS[kat] ? CATS[kat].n : 'Dokumenty'); nav('dok');
  const cats = CAT_ORDER.filter(c => reg.some(d => d.cat === c));
  view.innerHTML = `
  <section class="sec"><h2>Dokumenty</h2>
    <div class="chips" id="cf"><button class="chip" data-c="" aria-pressed="${!kat}">Wszystkie</button>${cats.map(c => `<button class="chip" data-c="${c}" aria-pressed="${kat === c}">${CATS[c].n}</button>`).join('')}</div>
    <div class="filter"><label class="sbox">${ICON_S}<input id="lf" type="search" placeholder="Filtruj po nazwie, kodzie, zakresie" autocomplete="off"></label></div>
    <div id="lst"></div></section>`;
  let cur = kat || '';
  const draw = () => {
    const q = nz($('#lf').value.trim()).split(/\s+/).filter(Boolean);
    const rows = reg.filter(d => (!cur || d.cat === cur) && q.every(w => nz(d.id + ' ' + d.title + ' ' + (d.full || '') + ' ' + d.scope + ' ' + (d.group || '')).includes(w)));
    let h = '';
    CAT_ORDER.forEach(c => {
      const rc = rows.filter(d => d.cat === c); if (!rc.length) return;
      h += `<p class="grp">${CATS[c].n} · ${rc.length}</p>`;
      if (c === 'wwiorb') {
        [...new Set(rc.map(d => d.group))].forEach(g => { h += `<p class="grp" style="margin-top:14px;color:var(--ink)">${esc(g)}</p><div class="dlist">${rc.filter(d => d.group === g).map(d => ditem(d)).join('')}</div>`; });
      } else h += `<div class="dlist">${rc.map(d => ditem(d)).join('')}</div>`;
    });
    $('#lst').innerHTML = h || '<p class="meta">Brak wyników.</p>';
  };
  $('#cf').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; cur = b.dataset.c;
    document.querySelectorAll('#cf .chip').forEach(x => x.setAttribute('aria-pressed', x === b));
    history.replaceState(null, '', cur ? '#/dok/kat/' + cur : '#/dok'); draw();
  });
  $('#lf').addEventListener('input', draw); draw();
}

/* ---------- czytnik dokumentu ---------- */
function readable(t) {
  const lines = t.split('\n').map(l => {
    const s = l.trimStart(); if (!s) return '';
    return s.split(/ {4,}/).length > 2 ? s.replace(/ {3,}/g, '  │  ') : s.replace(/ {2,}/g, ' ');
  });
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    let l = lines[i];
    while (i + 1 < lines.length && l.length >= 55 && !l.includes('│') && !/[.:;!?…]$/.test(l) &&
      lines[i + 1] && !lines[i + 1].includes('│') && !/^(\d+[.)]|[a-z]\)|[-•●○–]|§|Art\.|Rozdział|\d+\.\d|[A-ZĄĆĘŁŃÓŚŹŻ]{4,})/.test(lines[i + 1])) {
      l = l.replace(/-$/, '') + (l.endsWith('-') ? '' : ' ') + lines[i + 1]; i++;
    }
    out.push(l);
  }
  return out.join('\n');
}
function hilite(text, terms) {
  if (!terms.length) return esc(text);
  const n = nz(text), rg = [];
  terms.forEach(t => {
    let i = 0;
    while ((i = n.indexOf(t, i)) >= 0) {
      let e = i + t.length;
      if (/[a-z]$/.test(t)) while (e < n.length && /[a-z]/.test(n[e])) e++;   // podświetl całe słowo
      rg.push([i, e]); i += t.length;
    }
  });
  if (!rg.length) return esc(text);
  rg.sort((a, b) => a[0] - b[0]);
  let h = '', p = 0;
  for (const [a, b] of rg) { if (a < p) { if (b > p) { h += '<mark>' + esc(text.slice(p, b)) + '</mark>'; p = b; } continue; } h += esc(text.slice(p, a)) + '<mark>' + esc(text.slice(a, b)) + '</mark>'; p = b; }
  return h + esc(text.slice(p));
}
function termsOf(q) {
  // Uproszczony „stemming” dla fleksji: zanikające → zanikaj (dopasuje też „zanikających”).
  const stem = w => /^[a-ząćęłńóśźż]+$/i.test(w) ? (w.length >= 9 ? w.slice(0, -3) : w.length >= 6 ? w.slice(0, -2) : w) : w;
  const t = []; (q || '').replace(/"([^"]+)"|(\S+)/g, (m, a, b) => { const x = nz(a || stem(nz(b))).trim(); if (x) t.push(x); });
  return t.length > 1 ? t.filter(x => x.length > 1) : t;
}
function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 1800); }

async function viewDoc(slug, pageArg, q) {
  const d = bySlug[slug];
  if (!d) { view.innerHTML = '<section class="sec"><h2>Nie znaleziono dokumentu</h2><a class="btn" href="#/dok">Wszystkie dokumenty</a></section>'; return; }
  setTitle(d.id + ' ' + d.title); nav('dok');
  const rec = store.get('wd_recent', []).filter(s => s !== slug); rec.unshift(slug); store.set('wd_recent', rec.slice(0, 6));
  const inTopics = topics.filter(t => t.ids.has(d.id));
  const kv = (k, v) => v ? `<dt>${k}</dt><dd>${inline(v)}</dd>` : '';
  view.innerHTML = `
  <a class="crumb" href="#/dok/kat/${d.cat}">← ${CATS[d.cat].n}</a>
  <header class="dhead cat-${d.cat}">
    <div><span class="badge">${esc(d.id)}</span></div>
    <h1>${esc(d.title)}</h1>
    ${d.full ? `<p class="full">${esc(d.full)}</p>` : ''}
    ${d.note ? `<div class="callout"><p><b>Uwaga:</b> ${inline(d.note)}</p></div>` : ''}
    <details class="info"><summary>Opis, zakres i powiązania</summary><dl class="kv">
      ${kv('Identyfikator / stan', d.ident)}${kv('Zakres', d.scope)}${kv('Struktura', d.struct)}${kv('Powoływane normy', d.norms)}
      ${d.pages ? kv('Liczba stron', String(d.pages)) : ''}
      ${inTopics.length ? `<dt>W mapie tematycznej</dt><dd>${inTopics.map(t => `<a href="#/mapa/${t.n}">${esc(short(t.q, 90))}</a>`).join('<br>')}</dd>` : ''}
    </dl></details>
  </header>
  <div id="reader"></div>`;
  const box = $('#reader');
  if (d.url) { box.innerHTML = `<a class="btn primary" href="${esc(d.url)}" target="_blank" rel="noopener">Otwórz stronę ministerstwa →</a>`; return; }
  if (!d.hasText) {
    box.innerHTML = `<div class="callout"><p><b>Ten dokument to skan bez warstwy tekstowej.</b> Przeszukiwalny odpowiednik (OCR, średnia jakość – liczby i tabele weryfikuj w oryginale) jest w dokumencie ${d.redirect ? `<a class="ref" href="#/dok/${encodeURIComponent(byId[d.redirect.id].slug)}/${d.redirect.page}">${d.redirect.id}</a>, od s. ${d.redirect.page}` : 'zbiorczym'}.</p></div>`;
    return;
  }
  box.innerHTML = '<p class="spin">Ładuję dokument…</p>';
  let doc; try { doc = await loadDoc(slug); } catch (e) { box.innerHTML = '<div class="callout"><p>Nie udało się pobrać dokumentu (brak sieci i brak kopii offline).</p></div>'; return; }
  if (location.hash.indexOf('/dok/' + encodeURIComponent(slug)) < 0 && location.hash.indexOf('/dok/' + slug) < 0) return;
  const pages = doc.pages, N = pages.length, terms = termsOf(q);
  let mode = store.get('wd_mode', 'read'), cur = 1;
  const idxOf = n => { const i = pages.findIndex(p => p[0] === n); return i < 0 ? 0 : i; };
  box.innerHTML = `
  <div class="rbar" id="rbar">
    <button class="btn" id="prev" aria-label="Poprzednia strona">‹</button>
    <div class="pn">s. <input class="pgin" id="pgin" inputmode="numeric" aria-label="Numer strony"> / <span id="pmax"></span></div>
    <button class="btn" id="next" aria-label="Następna strona">›</button>
    <span class="sp"></span>
    <button class="btn" id="bm" aria-pressed="false"></button>
    <button class="btn" id="mode"></button>
    <button class="btn" id="cp">Kopiuj link</button>
  </div>
  <form class="docfind" id="df"><input id="dq" type="search" placeholder="Szukaj w tym dokumencie (np. art. 22, 6.4.4)" autocomplete="off"><button class="btn" type="submit">Szukaj</button></form>
  <div class="hits" id="hits" hidden></div>
  <pre class="page" id="pg" tabindex="0"></pre>
  <div class="pfoot"><button class="btn" id="prev2">‹ Poprzednia</button><button class="btn" id="next2">Następna ›</button></div>`;
  $('#pmax').textContent = pages[N - 1][0];
  const show = (n, o = {}) => {
    const i = idxOf(n); cur = pages[i][0];
    const t = mode === 'read' ? readable(pages[i][1]) : pages[i][1];
    const pg = $('#pg'); pg.className = 'page ' + (mode === 'read' ? 'read' : 'lay');
    pg.innerHTML = hilite(t || '(pusta strona – prawdopodobnie grafika lub skan)', o.terms ?? []);
    $('#pgin').value = cur;
    $('#prev').disabled = $('#prev2').disabled = i === 0; $('#next').disabled = $('#next2').disabled = i === N - 1;
    const bms = store.get('wd_bm', []), on = bms.some(b => b.slug === slug && b.page === cur);
    $('#bm').textContent = on ? '★ Zakładka' : '☆ Zakładka'; $('#bm').setAttribute('aria-pressed', on);
    $('#mode').textContent = mode === 'read' ? 'Układ oryginalny' : 'Tryb czytania';
    history.replaceState(null, '', '#/dok/' + encodeURIComponent(slug) + '/' + cur + (o.q ? '?q=' + encodeURIComponent(o.q) : ''));
    if (!o.keepScroll) { const y = $('#rbar').getBoundingClientRect().top + scrollY - 104; if (scrollY > y) scrollTo(0, Math.max(0, y)); }
  };
  const go = d => { const i = idxOf(cur) + d; if (i >= 0 && i < N) show(pages[i][0]); };
  $('#prev').onclick = $('#prev2').onclick = () => go(-1);
  $('#next').onclick = $('#next2').onclick = () => go(1);
  $('#pgin').addEventListener('change', e => { const n = parseInt(e.target.value, 10); if (n) show(n); });
  $('#mode').onclick = () => { mode = mode === 'read' ? 'lay' : 'read'; store.set('wd_mode', mode); show(cur, { keepScroll: true, terms }); };
  $('#bm').onclick = () => {
    let b = store.get('wd_bm', []); const k = b.findIndex(x => x.slug === slug && x.page === cur);
    if (k >= 0) b.splice(k, 1); else b.unshift({ slug, page: cur }); store.set('wd_bm', b); show(cur, { keepScroll: true, terms }); toast(k >= 0 ? 'Usunięto zakładkę' : 'Dodano zakładkę');
  };
  $('#cp').onclick = async () => { try { await navigator.clipboard.writeText(location.href); toast('Skopiowano link do strony'); } catch (e) { toast('Skopiuj adres z paska przeglądarki'); } };
  $('#df').addEventListener('submit', e => {
    e.preventDefault(); const qq = $('#dq').value.trim(), tt = termsOf(qq), h = $('#hits');
    if (!tt.length) { h.hidden = true; return; }
    const res = [];
    pages.forEach(([n, t]) => {
      const c = collapse(t), nn = nz(c); if (!tt.every(x => nn.includes(x))) return;
      const i = nn.indexOf(tt[0]); const a = Math.max(0, i - 50);
      res.push({ n, s: (a ? '…' : '') + c.slice(a, i + 110) });
    });
    h.hidden = false;
    h.innerHTML = res.length ? res.slice(0, 80).map(r => `<button class="hit" data-n="${r.n}"><b>s. ${r.n}</b><span>${hilite(r.s, tt)}</span></button>`).join('') +
      (res.length > 80 ? `<p class="meta">Pokazano 80 z ${res.length} stron – zawęź zapytanie.</p>` : '') : '<p class="meta">Brak wyników w tym dokumencie.</p>';
    h.onclick = ev => { const b = ev.target.closest('.hit'); if (b) { show(+b.dataset.n, { terms: tt, q: qq }); } };
  });
  const startPage = pageArg && pages.some(p => p[0] === pageArg) ? pageArg : pages[0][0];
  show(startPage, { terms, q, keepScroll: true });
  if (pageArg) $('#rbar').scrollIntoView();
  window.__docKey = e => {
    if (/INPUT|TEXTAREA/.test((e.target.tagName || ''))) return;
    if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1);
  };
}
function collapse(t) { return t.replace(/\.{3,}/g, ' … ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, ' ').trim(); }
document.addEventListener('keydown', e => { if (window.__docKey && location.hash.startsWith('#/dok/') && location.hash.split('/').length > 3) window.__docKey(e); });

/* ---------- wyszukiwarka pełnotekstowa ---------- */
let searchToken = 0;
async function viewSearch(q) {
  setTitle('Szukaj: ' + q); nav('');
  const my = ++searchToken, terms = termsOf(q);
  document.querySelector('#q').value = q;
  view.innerHTML = `<section class="sec"><h2>Wyniki dla „${esc(q)}”</h2><div id="rdocs"></div><div id="rtext"><p class="spin">Ładuję indeks treści (jednorazowo, ok. 8 MB; potem działa offline)…</p></div></section>`;
  if (!terms.length) return;
  const dh = reg.filter(d => terms.every(t => nz(d.id + ' ' + d.title + ' ' + (d.full || '') + ' ' + d.scope).includes(t))).slice(0, 12);
  if (dh.length) $('#rdocs').innerHTML = `<p class="grp">Dokumenty (nazwa / zakres) · ${dh.length}</p><div class="dlist">${dh.map(d => ditem(d)).join('')}</div>`;
  let ix; try { ix = await loadSearch(); } catch (e) { $('#rtext').innerHTML = '<div class="callout"><p>Nie udało się pobrać indeksu wyszukiwania (brak sieci). Otwórz stronę raz z internetem albo użyj „Zapisz offline” w zakładce O bazie.</p></div>'; return; }
  if (my !== searchToken) return;
  const phrase = nz(terms.join(' ')), hits = [];
  ix.norm.forEach((n, i) => {
    let score = 0;
    for (const t of terms) {
      let c = 0, p = 0; while (c < 12 && (p = n.indexOf(t, p)) >= 0) { c++; p += t.length; }
      if (!c) return; score += c;
    }
    if (terms.length > 1 && n.includes(phrase)) score += 15;
    hits.push([score, i]);
  });
  hits.sort((a, b) => b[0] - a[0]);
  const top = hits.slice(0, 60);
  $('#rtext').innerHTML = `<p class="grp">W treści · ${hits.length} ${hits.length === 1 ? 'strona' : 'stron'}${hits.length > 60 ? ' (pokazano 60 najtrafniejszych)' : ''}</p>` +
    (top.length ? `<div class="dlist">${top.map(([s, i]) => {
      const r = ix.rows[i], d = byId[ix.docs[r[0]]], n = ix.norm[i];
      let b = -1; terms.forEach(t => { const k = n.indexOf(t); if (k >= 0 && (b < 0 || k < b)) b = k; });
      const a = Math.max(0, b - 70), e = Math.min(r[2].length, b + 150);
      const sn = hilite(r[2].slice(a, e), terms);
      return `<a class="res cat-${d.cat}" href="#/dok/${encodeURIComponent(d.slug)}/${r[1]}?q=${encodeURIComponent(q)}"><div class="h"><span class="badge">${esc(d.id)}</span><b>${esc(d.title)}</b><span class="pg">s. ${r[1]}</span></div><div class="sn">${a ? '…' : ''}${sn}${e < r[2].length ? '…' : ''}</div></a>`;
    }).join('')}</div>` : '<p class="meta">Brak wyników. Spróbuj krótszego fragmentu wyrazu (np. „zagęszcz”) albo mniejszej liczby słów. Cudzysłów łączy słowa w frazę.</p>');
}

/* ---------- normy, info ---------- */
function viewNormy() {
  setTitle('Normy'); nav('normy');
  view.innerHTML = `<section class="sec"><h2>Normy powoływane w dokumentach</h2>
    <div class="callout"><p><b>Folder z normami jest pusty.</b> PN-EN i Eurokodów nie ma w bazie; to lista norm powoływanych w tekstach dokumentów (kolejność wg liczby powołań, nie wg potrzeb). Opisy rodzin norm pochodzą z wiedzy ogólnej, nie z plików.</p></div>
    <div class="filter"><label class="sbox">${ICON_S}<input id="nf" type="search" placeholder="Filtruj normy" autocomplete="off"></label></div>
    <div id="nt">${md(S('4').body.split('\n').filter(l => l.startsWith('|')).join('\n'), { wide: true })}</div>
    ${md(S('4').body.split('\n').filter(l => l.trim() && !l.startsWith('|') && !/^Liczba|^Kolejność/.test(l)).join('\n'))}</section>`;
  $('#nf').addEventListener('input', e => {
    const q = nz(e.target.value.trim()).split(/\s+/).filter(Boolean);
    document.querySelectorAll('#nt tbody tr').forEach(tr => tr.hidden = !q.every(w => nz(tr.textContent).includes(w)));
  });
}
function viewInfo() {
  setTitle('O bazie'); nav('info');
  const link = reg.find(d => d.id === 'X-LINK');
  view.innerHTML = `<section class="sec"><h2>O bazie</h2>
    <div class="md"><p>${inline(S('intro').replace(/^# .*\n+/, '').split('\n')[0])}</p></div>
    <div class="callout"><p><b>Jak czytać tę stronę.</b> Tekst dokumentów jest wyciągnięty automatycznie z plików PDF/DOCX, więc tabele, wzory i rysunki mogą być zniekształcone. Przełącz „Układ oryginalny”, gdy tabela się rozjeżdża. W sprawach ważnych sprawdź oryginał w folderze albo w ISAP.</p></div></section>
  <section class="sec"><h2>Tryb offline</h2><div class="md"><p>Zapisuje na urządzeniu całą bazę (ok. 20 MB), aby czytać i szukać bez zasięgu, np. na budowie. Działa po wejściu przez https.</p></div>
    <div><button class="btn primary" id="off">Zapisz offline</button></div><div class="prog" id="offp" hidden><i></i></div><p class="meta" id="offm"></p></section>
  <section class="sec"><h2>Luki w bazie</h2>${md(S('5').body)}</section>
  <section class="sec"><h2>Aktualność i jakość plików</h2>${md(S('6').body)}</section>
  <section class="sec"><h2>Konwencje i skróty</h2>${md(S('7').body)}</section>
  ${link ? `<section class="sec"><h2>Aktualne wersje WR-D</h2><a class="btn" href="${esc(link.url)}" target="_blank" rel="noopener">gov.pl – Wzorce i standardy Ministra Infrastruktury →</a></section>` : ''}
  <section class="sec"><h2>Wygląd</h2><button class="btn" id="th">Przełącz jasny / ciemny motyw</button></section>`;
  $('#th').onclick = toggleTheme;
  $('#off').onclick = async () => {
    const b = $('#off'); b.disabled = true; $('#offp').hidden = false;
    const urls = ['data/search.json', ...reg.filter(d => d.hasText).map(d => 'data/docs/' + d.slug + '.json')];
    let ok = 0;
    for (let i = 0; i < urls.length; i++) {
      try { const r = await fetch(urls[i]); if (r.ok) { await r.arrayBuffer(); ok++; } } catch (e) { }
      $('#offp i').style.width = Math.round((i + 1) / urls.length * 100) + '%'; $('#offm').textContent = `Pobrano ${i + 1} z ${urls.length}`;
    }
    $('#offm').textContent = ok === urls.length ? 'Gotowe – baza jest dostępna offline.' : `Pobrano ${ok} z ${urls.length}; spróbuj ponownie z lepszym zasięgiem.`;
    b.disabled = false;
  };
}

/* ---------- router ---------- */
function route() {
  const h = location.hash.slice(1) || '/';
  const [path, qs] = h.split('?'); const qp = new URLSearchParams(qs || '');
  const seg = path.split('/').filter(Boolean).map(decodeURIComponent);
  window.__docKey = null; scrollTo(0, 0);
  if (seg[0] !== 'szukaj') $('#q').value = '';
  if (!seg.length) return viewHome();
  if (seg[0] === 'mapa') return viewMapa(seg[1]);
  if (seg[0] === 'normy') return viewNormy();
  if (seg[0] === 'info') return viewInfo();
  if (seg[0] === 'szukaj') return viewSearch(seg.slice(1).join('/'));
  if (seg[0] === 'dok') {
    if (!seg[1]) return viewList('');
    if (seg[1] === 'kat') return viewList(seg[2]);
    return viewDoc(seg[1], seg[2] ? parseInt(seg[2], 10) : 0, qp.get('q') || '');
  }
  viewHome();
}

/* ---------- motyw, wyszukiwarka górna ---------- */
function toggleTheme() {
  const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const nx = cur === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = nx; store.set('wd_theme', nx);
}
const ICON_S = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
{ const t = store.get('wd_theme', null); if (t) document.documentElement.dataset.theme = t; }
$('#th-top').onclick = toggleTheme;
let sdeb;
$('#q').addEventListener('input', e => {
  clearTimeout(sdeb); const v = e.target.value.trim();
  if (v.length < 2) return;
  sdeb = setTimeout(() => { const h = '#/szukaj/' + encodeURIComponent(v); if (location.hash.startsWith('#/szukaj/')) location.replace(h); else location.hash = h; }, 350);
});
$('#sf').addEventListener('submit', e => { e.preventDefault(); clearTimeout(sdeb); const v = $('#q').value.trim(); if (v) location.hash = '#/szukaj/' + encodeURIComponent(v); });

init().catch(e => { view.innerHTML = `<section class="sec"><h2>Nie udało się wczytać danych</h2><p>Strona wymaga serwera (nie działa po otwarciu pliku z dysku). Zobacz instrukcję w README. <code>${esc(e.message)}</code></p></section>`; });
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
