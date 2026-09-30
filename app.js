'use strict';
/* Wiki drogowa – aplikacja jednostronicowa (hash-routing). Oryginalne PDF-y wyświetla PDF.js. */

const PDFJS_BASE = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/';
const PDF_CACHE = 'wiki-drogowa-pdf';

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
const PH = { P: 'projektowanie', W: 'wykonawstwo', O: 'odbiory' };
const PH_NAME = { projektowanie: 'Projektowanie', wykonawstwo: 'Wykonawstwo', odbiory: 'Odbiory' };
const QUICK = ['roboty zanikające', 'grupy nośności', 'warstwa mrozoochronna', 'wskaźnik zagęszczenia', 'skrajnia',
  'dziennik budowy', 'odbiór końcowy', 'kategoria ruchu', 'skropienie', 'ronda', 'odwodnienie', 'kierownik budowy'];

const $ = (s, r = document) => r.querySelector(s);
const view = $('#view');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PL = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' };
const nz = s => s.toLowerCase().replace(/[ąćęłńóśźż]/g, c => PL[c]);     // 1 znak -> 1 znak
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
};
const ICON_S = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

let reg = [], wiki = null, fazy = null, bySlug = {}, byId = {}, topics = [], idRe = null;
let SIDX = null, SLOAD = null;

/* ---------- dane ---------- */
async function getJSON(u) { const r = await fetch(u); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }
async function init() {
  [reg, wiki, fazy] = await Promise.all([getJSON('data/registry.json'), getJSON('data/wiki.json'), getJSON('data/fazy.json')]);
  reg.forEach(d => { bySlug[d.slug] = d; byId[d.id] = d; });
  const ids = reg.map(d => d.id).filter(i => i !== 'X-LINK').sort((a, b) => b.length - a.length)
    .map(i => i.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'));
  idRe = new RegExp('(^|[^\\w.\\-])(' + ids.join('|') + ')(?![\\w\\-]|\\.\\d)', 'g');
  parseTopics();
  window.addEventListener('hashchange', () => { navigated = true; route(); });
  route();
}
function loadSearch() {
  if (SIDX) return Promise.resolve(SIDX);
  if (!SLOAD) SLOAD = getJSON('data/search.json').then(j => (SIDX = { docs: j.d, rows: j.r, norm: j.r.map(r => nz(r[2])) }));
  return SLOAD;
}
const pdfHref = (d, page, q) => `#/pdf/${encodeURIComponent(d.slug)}/${page || 1}${q ? '?q=' + encodeURIComponent(q) : ''}`;
const docHref = d => d.url ? d.url : pdfHref(d, 1);

/* ---------- markdown (mini) ---------- */
function linkify(h) {
  return h.split(/(<[^>]*>)/).map((p, i) => i % 2 ? p :
    p.replace(idRe, (m, pre, id) => `${pre}<a class="ref" href="${pdfHref(byId[id], 1)}">${id}</a>`)).join('');
}
function inline(s) {
  return linkify(esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>'));
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
}

/* ---------- wspólne elementy ---------- */
function setTitle(t) { document.title = (t ? t + ' · ' : '') + 'Wiki drogowa'; }
function nav(cur) {
  document.querySelectorAll('#nav a').forEach(a => { if (a.dataset.r === cur) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
}
function short(s, n) { s = s || ''; return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; }
function phBadges(d) {
  return [...(d.ph || '')].map(c => `<span class="ph ph-${PH[c.toUpperCase()]}${c === c.toUpperCase() ? '' : ' aux'}" title="${PH_NAME[PH[c.toUpperCase()]]}${c === c.toUpperCase() ? '' : ' (pomocniczo)'}">${c.toUpperCase()}</span>`).join('');
}
function ditem(d) {
  const ext = d.url ? ' target="_blank" rel="noopener"' : '';
  return `<div class="ditem cat-${d.cat}">
    <a class="dmain" href="${esc(docHref(d))}"${ext}><span class="badge">${esc(d.id)}</span>
      <span class="t">${esc(d.title)}</span>
      <span class="s">${esc(short(d.ident || d.scope, 110))}${d.nPages ? ` · ${d.nPages} s.` : ''}</span></a>
    <span class="phs">${phBadges(d)}</span>
    <a class="info" href="#/o/${encodeURIComponent(d.slug)}" aria-label="Opis dokumentu ${esc(d.id)}">i</a></div>`;
}
function refChip(did, page, label) {
  const d = byId[did]; if (!d) return '';
  return `<a class="rc cat-${d.cat}" href="${esc(d.url || pdfHref(d, page))}"><b>${esc(label || d.id)}</b>${page > 1 ? `<span>s. ${page}</span>` : ''}</a>`;
}
function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 1900); }

/* ---------- start ---------- */
function viewHome() {
  setTitle(''); nav('home');
  const counts = {}; reg.forEach(d => counts[d.cat] = (counts[d.cat] || 0) + 1);
  const pagesTotal = reg.reduce((a, d) => a + (d.nPages || 0), 0);
  const bms = store.get('wd_bm2', []), rec = store.get('wd_recent2', []).map(s => bySlug[s]).filter(Boolean);
  view.innerHTML = `
  <section class="hero">
    <p class="eyebrow">Baza wiedzy · budownictwo drogowe · stan na 30.09.2026</p>
    <h1>Wiki <em>drogowa</em></h1>
    <p class="lede">${reg.filter(d => d.pdf).length} oryginalnych dokumentów PDF (${pagesTotal.toLocaleString('pl')} stron) podzielonych na fazy inwestycji. Wybierz fazę albo wyszukaj w treści – wynik otworzy PDF na właściwej stronie.</p>
    <form class="bigsearch" id="bigform" role="search">
      <label class="sbox"><span hidden>Szukaj</span>${ICON_S}<input id="bigq" type="search" placeholder="np. roboty zanikające, art. 22, wskaźnik zagęszczenia" autocomplete="off"></label>
      <button class="btn primary" type="submit">Szukaj</button>
    </form>
  </section>

  <section class="phases">
    ${fazy.phases.map((p, i) => `<a class="phase ph-${p.key}" href="#/faza/${p.key}">
      <span class="pn">${i + 1}</span><b>${esc(p.name)}</b><span>${esc(p.sub)}</span>
      <span class="cnt">${reg.filter(d => (d.ph || '').includes('PWO'[i])).length} dokumentów podstawowych →</span></a>`).join('')}
  </section>

  <section class="sec"><div class="chips">${QUICK.map(q => `<a class="chip" href="#/szukaj/${encodeURIComponent(q)}">${esc(q)}</a>`).join('')}</div></section>

  ${bms.length ? `<section class="sec"><div class="sec-head"><h2>Zakładki</h2><span class="meta">tylko na tym urządzeniu</span></div><div class="dlist">${bms.map(b => {
    const d = bySlug[b.slug]; return d ? `<div class="ditem cat-${d.cat}"><a class="dmain" href="${pdfHref(d, b.page)}"><span class="badge">${esc(d.id)}</span><span class="t">${esc(d.title)}</span><span class="s">strona ${b.page}</span></a></div>` : '';
  }).join('')}</div></section>` : ''}
  ${rec.length ? `<section class="sec"><div class="sec-head"><h2>Ostatnio otwierane</h2></div><div class="dlist">${rec.map(ditem).join('')}</div></section>` : ''}

  <section class="sec">
    <div class="sec-head"><h2>Wszystkie dokumenty wg rodzaju</h2><a class="meta" href="#/dok">${reg.length} pozycji →</a></div>
    <div class="tiles">${CAT_ORDER.filter(c => counts[c]).map(c => `
      <a class="tile cat-${c}" href="#/dok/kat/${c}"><span class="n">${counts[c]} dok.</span><b>${CATS[c].n}</b><span>${CATS[c].d}</span></a>`).join('')}</div>
  </section>

  <section class="sec">
    <div class="sec-head"><h2>Zasady, które warto pamiętać</h2></div>
    <div class="callout"><ul>
      <li><b>Kolejność przy sprzeczności:</b> ustawa → rozporządzenie → umowa (PFU/OPZ, WWiORB) → dokumenty powołane w umowie (WT, WR-D, PN-EN).</li>
      <li><b>WWiORB, WT i WR-D wiążą kontraktowo tylko wtedy,</b> gdy powołuje je umowa lub OPZ/PFU.</li>
      <li><b>Ściągi S1–S4 to notatki wtórne.</b> Wartości z nich sprawdzaj w dokumentach źródłowych.</li>
      <li><b>Norm PN-EN, Eurokodów i umowy (FIDIC, OPZ/PFU) nie ma w bazie.</b> Zobacz <a href="#/info">luki i aktualność</a>.</li>
    </ul></div>
  </section>`;
  $('#bigform').addEventListener('submit', e => { e.preventDefault(); const q = $('#bigq').value.trim(); if (q) location.hash = '#/szukaj/' + encodeURIComponent(q); });
}

/* ---------- faza ---------- */
function viewFaza(key) {
  const P = fazy.phases.find(p => p.key === key);
  if (!P) return viewHome();
  setTitle(P.name); nav(key);
  const L = 'PWO'['projektowanie wykonawstwo odbiory'.split(' ').indexOf(key)];
  const main = reg.filter(d => (d.ph || '').includes(L) && d.cat !== 'wwiorb');
  const aux = reg.filter(d => (d.ph || '').includes(L.toLowerCase()) && d.cat !== 'wwiorb');
  const ww = reg.filter(d => d.cat === 'wwiorb');
  const docChips = arr => CAT_ORDER.map(c => arr.filter(d => d.cat === c)).filter(a => a.length)
    .map(a => `<div class="drow"><span class="dl">${CATS[a[0].cat].n}</span><div class="rcs">${a.map(d => `<a class="rc cat-${d.cat}" href="${esc(docHref(d))}"${d.url ? ' target="_blank" rel="noopener"' : ''} title="${esc(d.title)}"><b>${esc(d.id)}</b><span>${esc(short(d.title, 38))}</span></a>`).join('')}</div></div>`).join('');
  let auto = '';
  if (P.auto) {
    const groups = [...new Set(ww.map(d => d.group))];
    auto = `<section class="sec" id="auto"><div class="sec-head"><h2>${esc(P.auto.t)}</h2><span class="meta">${ww.length} WWiORB</span></div>
      <p class="meta">${esc(P.auto.d)}</p>
      <div class="filter"><label class="sbox">${ICON_S}<input id="wf" type="search" placeholder="Filtruj roboty (np. nasyp, SMA, kolumny)" autocomplete="off"></label></div>
      ${groups.map(g => {
        const extra = (fazy.groups[g] || []).filter(i => byId[i]);
        return `<div class="wgrp"><h3>${esc(g)}</h3>${extra.length ? `<div class="rel">Powiązane: ${extra.map(i => refChip(i, 1, i)).join('')}</div>` : ''}
        ${ww.filter(d => d.group === g).map(d => `<div class="wrow cat-wwiorb" data-s="${esc(nz(d.id + ' ' + d.title + ' ' + g))}">
          <a class="wt" href="${pdfHref(d, 1)}"><span class="badge">${esc(d.id)}</span><b>${esc(d.title)}</b></a>
          <div class="rcs">${P.auto.chapters.map(([k, n]) => d.ch && d.ch[k] ? `<a class="rc cat-wwiorb" href="${pdfHref(d, d.ch[k])}"><b>${k}. ${esc(n)}</b><span>s. ${d.ch[k]}</span></a>` : '').join('')}</div></div>`).join('')}</div>`;
      }).join('')}</section>`;
  }
  view.innerHTML = `
  <header class="phead ph-${key}">
    <p class="eyebrow">Faza ${'PWO'.indexOf(L) + 1} z 3</p>
    <h1>${esc(P.name)}</h1>
    <p class="lede">${esc(P.lead)}</p>
    <nav class="chips" aria-label="Sekcje">${P.sections.map((s, i) => `<a class="chip" href="#/faza/${key}" data-j="s${i}">${esc(s.t)}</a>`).join('')}${P.auto ? `<a class="chip" href="#/faza/${key}" data-j="auto">${esc(P.auto.t)}</a>` : ''}<a class="chip" href="#/faza/${key}" data-j="docs">Dokumenty fazy</a></nav>
  </header>
  ${P.sections.map((s, i) => `<section class="sec" id="s${i}"><h2>${esc(s.t)}</h2><div class="items">${s.items.map(it => `
    <div class="item"><div class="q">${esc(it.q)}</div>${it.r.length ? `<div class="rcs">${it.r.map(r => refChip(r[0], r[1], r[2])).join('')}</div>` : ''}</div>`).join('')}</div></section>`).join('')}
  ${auto}
  <section class="sec" id="docs"><h2>Dokumenty tej fazy</h2>
    <p class="meta">Wg Twojej ściągi S3: używane stale i pomocniczo. WWiORB – w sekcji wyżej${key === 'projektowanie' ? ' (w projektowaniu pomocniczo, jako wzór STWiORB)' : ''}.</p>
    <h3 class="grp">Używane stale</h3>${docChips(main)}
    ${aux.length ? `<h3 class="grp">Pomocniczo</h3>${docChips(aux)}` : ''}
  </section>`;
  view.querySelector('.phead nav').addEventListener('click', e => {
    const a = e.target.closest('a[data-j]'); if (!a) return; e.preventDefault();
    document.getElementById(a.dataset.j).scrollIntoView({ behavior: 'smooth' });
  });
  const wf = $('#wf');
  if (wf) wf.addEventListener('input', () => {
    const q = nz(wf.value.trim()).split(/\s+/).filter(Boolean);
    document.querySelectorAll('.wrow').forEach(r => r.hidden = !q.every(w => r.dataset.s.includes(w)));
    document.querySelectorAll('.wgrp').forEach(g => g.hidden = !g.querySelector('.wrow:not([hidden])'));
  });
}

/* ---------- mapa tematyczna ---------- */
function viewMapa() {
  setTitle('Mapa tematyczna'); nav('mapa');
  const groups = [...new Set(topics.map(t => t.group))];
  view.innerHTML = `
  <section class="sec"><h2>Mapa tematyczna: pytanie → dokumenty</h2>
    <div class="md"><p>${inline(S('2').body.split('\n')[0])} Kliknięcie kodu otwiera PDF – numer punktu odszukaj wyszukiwarką w przeglądarce PDF.</p></div>
    <div class="filter"><label class="sbox">${ICON_S}<input id="tf" type="search" placeholder="Filtruj tematy (np. skrajnia, odbiór, DŚU)" autocomplete="off"></label></div>
  </section>
  ${groups.map((g, gi) => `<section class="sec" data-g="${gi}"><h2>${esc(g)}</h2><div class="items">${topics.filter(t => t.group === g).map(t =>
    `<div class="item topic" data-s="${esc(nz(t.q + ' ' + t.d))}"><div class="q">${esc(t.q)}</div><div class="d">${inline(t.d)}</div></div>`).join('')}</div></section>`).join('')}`;
  $('#tf').addEventListener('input', e => {
    const q = nz(e.target.value.trim()).split(/\s+/).filter(Boolean);
    document.querySelectorAll('.topic').forEach(el => el.hidden = !q.every(w => el.dataset.s.includes(w)));
    document.querySelectorAll('section[data-g]').forEach(s => s.hidden = !s.querySelector('.topic:not([hidden])'));
  });
}

/* ---------- lista dokumentów ---------- */
function viewList(kat) {
  setTitle(kat && CATS[kat] ? CATS[kat].n : 'Dokumenty'); nav('dok');
  const cats = CAT_ORDER.filter(c => reg.some(d => d.cat === c));
  view.innerHTML = `
  <section class="sec"><h2>Dokumenty</h2>
    <div class="chips" id="cf"><button class="chip" data-c="" aria-pressed="${!kat}">Wszystkie</button>${cats.map(c => `<button class="chip" data-c="${c}" aria-pressed="${kat === c}">${CATS[c].n}</button>`).join('')}</div>
    <div class="filter"><label class="sbox">${ICON_S}<input id="lf" type="search" placeholder="Filtruj po nazwie, kodzie, zakresie" autocomplete="off"></label></div>
    <p class="meta">Litery obok dokumentu to fazy: <span class="ph ph-projektowanie">P</span> projektowanie, <span class="ph ph-wykonawstwo">W</span> wykonawstwo, <span class="ph ph-odbiory">O</span> odbiory (blada = pomocniczo). „i” – opis dokumentu.</p>
    <div id="lst"></div></section>`;
  let cur = kat || '';
  const draw = () => {
    const q = nz($('#lf').value.trim()).split(/\s+/).filter(Boolean);
    const rows = reg.filter(d => (!cur || d.cat === cur) && q.every(w => nz(d.id + ' ' + d.title + ' ' + d.full + ' ' + d.scope + ' ' + (d.group || '')).includes(w)));
    let h = '';
    CAT_ORDER.forEach(c => {
      const rc = rows.filter(d => d.cat === c); if (!rc.length) return;
      h += `<h3 class="grp">${CATS[c].n} · ${rc.length}</h3>`;
      if (c === 'wwiorb') [...new Set(rc.map(d => d.group))].forEach(g => { h += `<p class="sgrp">${esc(g)}</p><div class="dlist">${rc.filter(d => d.group === g).map(ditem).join('')}</div>`; });
      else h += `<div class="dlist">${rc.map(ditem).join('')}</div>`;
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

/* ---------- opis dokumentu ---------- */
function viewInfoDoc(slug) {
  const d = bySlug[slug];
  if (!d) return notFound();
  setTitle(d.id + ' ' + d.title); nav('dok');
  const kv = (k, v) => v ? `<dt>${k}</dt><dd>${inline(v)}</dd>` : '';
  const phs = [...(d.ph || '')].map(c => `<a class="chip" href="#/faza/${PH[c.toUpperCase()]}">${PH_NAME[PH[c.toUpperCase()]]}${c === c.toUpperCase() ? '' : ' (pomocniczo)'}</a>`).join('');
  const CHN = { 1: 'Wstęp', 2: 'Materiały', 3: 'Sprzęt', 4: 'Transport', 5: 'Wykonanie robót', 6: 'Kontrola jakości', 7: 'Obmiar', 8: 'Odbiór', 9: 'Podstawa płatności', 10: 'Przepisy związane' };
  view.innerHTML = `
  <a class="crumb" href="#/dok/kat/${d.cat}">← ${CATS[d.cat].n}</a>
  <header class="dhead cat-${d.cat}">
    <div><span class="badge">${esc(d.id)}</span></div>
    <h1>${esc(d.title)}</h1>
    ${d.full && d.full !== d.title ? `<p class="full">${esc(d.full)}</p>` : ''}
    <div class="actions">${d.url ? `<a class="btn primary" href="${esc(d.url)}" target="_blank" rel="noopener">Otwórz stronę →</a>` :
      `<a class="btn primary" href="${pdfHref(d, 1)}">Otwórz PDF</a><a class="btn" href="${esc(d.pdf)}" download>Pobierz (${d.mb} MB)</a>`}</div>
    ${d.note ? `<div class="callout"><p><b>Uwaga:</b> ${inline(d.note)}</p></div>` : ''}
    ${d.converted ? `<p class="meta">Oryginał to plik Word (.docx); na stronie pokazany jako PDF.</p>` : ''}
  </header>
  ${d.ch && Object.keys(d.ch).length ? `<section class="sec"><h2>Rozdziały</h2><div class="rcs">${Object.entries(d.ch).map(([k, p]) => `<a class="rc cat-wwiorb" href="${pdfHref(d, p)}"><b>${k}. ${CHN[k]}</b><span>s. ${p}</span></a>`).join('')}</div></section>` : ''}
  ${phs ? `<section class="sec"><h2>Fazy</h2><div class="chips">${phs}</div></section>` : ''}
  <section class="sec"><h2>Opis</h2><dl class="kv card">
    ${kv('Identyfikator / stan', d.ident)}${kv('Zakres', d.scope)}${kv('Struktura', d.struct)}${kv('Powoływane normy', d.norms)}${d.nPages ? kv('Liczba stron', String(d.nPages)) : ''}
  </dl></section>`;
}
function notFound() { view.innerHTML = '<section class="sec"><h2>Nie znaleziono</h2><a class="btn" href="#/dok">Wszystkie dokumenty</a></section>'; }

/* ---------- przeglądarka PDF ---------- */
let PDFJS = null, PV = null;
async function loadPdfJs() {
  if (PDFJS) return PDFJS;
  if (!document.getElementById('pdfcss')) {
    const l = document.createElement('link'); l.id = 'pdfcss'; l.rel = 'stylesheet'; l.href = PDFJS_BASE + 'web/pdf_viewer.css'; document.head.appendChild(l);
  }
  const lib = await import(PDFJS_BASE + 'build/pdf.min.mjs');
  lib.GlobalWorkerOptions.workerSrc = PDFJS_BASE + 'build/pdf.worker.min.mjs';
  globalThis.pdfjsLib = lib;
  const viewer = await import(PDFJS_BASE + 'web/pdf_viewer.mjs');
  return (PDFJS = { lib, viewer });
}
function closeViewer() {
  if (!PV) return;
  try { PV.task && PV.task.destroy(); } catch (e) { }
  window.removeEventListener('resize', PV.onResize);
  document.removeEventListener('keydown', PV.onKey);
  PV.el.remove(); PV = null;
  document.body.classList.remove('noscroll');
}
function termsOf(q) {
  const stem = w => /^[a-ząćęłńóśźż]+$/i.test(w) ? (w.length >= 9 ? w.slice(0, -3) : w.length >= 6 ? w.slice(0, -2) : w) : w;
  const t = []; (q || '').replace(/"([^"]+)"|(\S+)/g, (m, a, b) => { const x = nz(a || stem(nz(b))).trim(); if (x) t.push(x); });
  return t.length > 1 ? t.filter(x => x.length > 1) : t;
}
// Do podświetlenia w PDF: fraza w cudzysłowie albo najdłuższe (najbardziej charakterystyczne) słowo.
function keyTerm(q) {
  const m = (q || '').match(/"([^"]+)"/); if (m) return m[1];
  return termsOf(q).sort((a, b) => b.length - a.length)[0] || '';
}
async function pdfSaved(url) { try { return !!(await (await caches.open(PDF_CACHE)).match(url)); } catch (e) { return false; } }

async function viewPdf(slug, page, q) {
  const d = bySlug[slug];
  if (!d || !d.pdf) return notFound();
  setTitle(d.id + ' ' + d.title);
  const rec = store.get('wd_recent2', []).filter(s => s !== slug); rec.unshift(slug); store.set('wd_recent2', rec.slice(0, 6));
  if (PV && PV.slug === slug) { if (page && PV.viewer) PV.viewer.currentPageNumber = page; return; }
  closeViewer();
  const el = document.createElement('div');
  el.className = 'pv'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', d.title);
  el.innerHTML = `
    <div class="pv-bar">
      <button class="icon-btn" id="pv-x" aria-label="Zamknij"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg></button>
      <div class="pv-t"><span class="badge cat-${d.cat}">${esc(d.id)}</span><b>${esc(d.title)}</b></div>
      <div class="pv-pg"><input id="pv-n" inputmode="numeric" aria-label="Numer strony" value="${page || 1}"><span>/ ${d.nPages}</span></div>
      <div class="pv-tools">
        <button class="icon-btn" id="pv-f" aria-label="Szukaj w dokumencie">${ICON_S}</button>
        <button class="icon-btn" id="pv-zo" aria-label="Pomniejsz">−</button>
        <button class="icon-btn" id="pv-zi" aria-label="Powiększ">+</button>
        <button class="icon-btn" id="pv-bm" aria-label="Zakładka na tej stronie">☆</button>
        <button class="icon-btn" id="pv-m" aria-label="Więcej">⋯</button>
      </div>
    </div>
    <form class="pv-find" id="pv-find" hidden><input id="pv-q" type="search" placeholder="Szukaj w tym PDF" autocomplete="off"><button class="btn sm" type="button" id="pv-prev" aria-label="Poprzednie">‹</button><button class="btn sm" type="submit" aria-label="Następne">›</button><span class="meta" id="pv-cnt"></span></form>
    <div class="pv-menu" id="pv-menu" hidden>
      <a href="#/o/${encodeURIComponent(d.slug)}">Opis dokumentu</a>
      <a href="${esc(d.pdf)}" target="_blank" rel="noopener" id="pv-native">Otwórz w przeglądarce systemowej</a>
      <a href="${esc(d.pdf)}" download>Pobierz plik (${d.mb} MB)</a>
      <button type="button" id="pv-off">Zapisz offline na tym urządzeniu</button>
      <button type="button" id="pv-fit">Dopasuj do szerokości</button>
    </div>
    ${d.scan ? `<div class="pv-note">Skan bez warstwy tekstowej. Wyszukiwarka strony korzysta z OCR (WT-OCR); liczby i tabele sprawdzaj na obrazie.</div>` : ''}
    <div class="pv-wrap"><div id="pv-c" class="pv-c"><div id="pv-v" class="pdfViewer"></div></div><p class="pv-load" id="pv-load">Ładuję PDF (${d.mb} MB)…</p></div>`;
  document.body.appendChild(el); document.body.classList.add('noscroll');
  const back = () => { if (navigated) history.back(); else location.hash = '#/'; };
  PV = { el, slug, onResize: null, onKey: null };
  const pv = PV;
  $('#pv-x').onclick = back;
  pv.onKey = e => { if (e.key === 'Escape' && !/INPUT/.test(e.target.tagName)) back(); };
  document.addEventListener('keydown', pv.onKey);
  $('#pv-m').onclick = () => { $('#pv-menu').hidden = !$('#pv-menu').hidden; };
  $('#pv-f').onclick = () => { const f = $('#pv-find'); f.hidden = !f.hidden; if (!f.hidden) $('#pv-q').focus(); };
  pdfSaved(d.pdf).then(s => { if (s && $('#pv-off')) $('#pv-off').textContent = '✓ Zapisany offline – usuń z urządzenia'; });
  $('#pv-off').onclick = async () => {
    const b = $('#pv-off');
    try {
      const c = await caches.open(PDF_CACHE);
      if (await c.match(d.pdf)) { await c.delete(d.pdf); b.textContent = 'Zapisz offline na tym urządzeniu'; toast('Usunięto z urządzenia'); return; }
      b.textContent = 'Pobieram…'; const r = await fetch(d.pdf, { cache: 'reload' }); if (!r.ok) throw 0;
      await c.put(d.pdf, r); b.textContent = '✓ Zapisany offline – usuń z urządzenia'; toast('PDF zapisany offline');
    } catch (e) { b.textContent = 'Zapisz offline na tym urządzeniu'; toast('Nie udało się zapisać'); }
  };

  let J;
  try { J = await loadPdfJs(); } catch (e) {
    $('#pv-load').innerHTML = `Nie udało się wczytać przeglądarki PDF. <a href="${esc(d.pdf)}#page=${page || 1}" target="_blank" rel="noopener">Otwórz plik bezpośrednio</a>.`; return;
  }
  if (PV !== pv) return;
  const { lib, viewer: V } = J;
  const eventBus = new V.EventBus();
  const linkService = new V.PDFLinkService({ eventBus });
  const findController = new V.PDFFindController({ eventBus, linkService });
  const pdfViewer = new V.PDFViewer({ container: $('#pv-c'), viewer: $('#pv-v'), eventBus, linkService, findController, removePageBorders: true });
  linkService.setViewer(pdfViewer);
  pv.viewer = pdfViewer;
  const setHash = n => history.replaceState(null, '', pdfHref(d, n, q));
  eventBus.on('pagesinit', () => {
    pdfViewer.currentScaleValue = 'page-width';
    if (page > 1) pdfViewer.currentPageNumber = page;
    $('#pv-load').hidden = true;
    const t = keyTerm(q);
    if (t) { $('#pv-q').value = q; pv.lastQ = q; find(t, false, true); }
  });
  eventBus.on('pagechanging', e => { $('#pv-n').value = e.pageNumber; setHash(e.pageNumber); bmState(); });
  eventBus.on('updatefindmatchescount', e => { const m = e.matchesCount; $('#pv-cnt').textContent = m.total ? `${m.current} z ${m.total}` : ''; });
  eventBus.on('updatefindcontrolstate', e => { if (e.state === 1) $('#pv-cnt').textContent = 'brak'; });
  function find(query, prev, first) {
    eventBus.dispatch('find', { source: null, type: first ? '' : 'again', query, caseSensitive: false, entireWord: false,
      highlightAll: true, findPrevious: !!prev, matchDiacritics: false });
  }
  $('#pv-find').onsubmit = e => { e.preventDefault(); const v = $('#pv-q').value.trim(); if (!v) return; find(keyTerm(v) || v, false, v !== pv.lastQ); pv.lastQ = v; };
  $('#pv-prev').onclick = () => { const v = $('#pv-q').value.trim(); if (v) { find(keyTerm(v) || v, true, v !== pv.lastQ); pv.lastQ = v; } };
  $('#pv-n').addEventListener('change', e => { const n = parseInt(e.target.value, 10); if (n >= 1 && n <= d.nPages) pdfViewer.currentPageNumber = n; });
  $('#pv-zi').onclick = () => { pdfViewer.currentScale = Math.min(pdfViewer.currentScale * 1.25, 6); };
  $('#pv-zo').onclick = () => { pdfViewer.currentScale = Math.max(pdfViewer.currentScale / 1.25, 0.25); };
  $('#pv-fit').onclick = () => { pdfViewer.currentScaleValue = 'page-width'; $('#pv-menu').hidden = true; };
  pv.onResize = () => { if (pdfViewer.currentScaleValue === 'page-width') pdfViewer.currentScaleValue = 'page-width'; };
  window.addEventListener('resize', pv.onResize);
  const bmState = () => {
    const n = pdfViewer.currentPageNumber, on = store.get('wd_bm2', []).some(b => b.slug === slug && b.page === n);
    $('#pv-bm').textContent = on ? '★' : '☆'; $('#pv-bm').setAttribute('aria-pressed', on);
  };
  $('#pv-bm').onclick = () => {
    const n = pdfViewer.currentPageNumber; let b = store.get('wd_bm2', []); const k = b.findIndex(x => x.slug === slug && x.page === n);
    if (k >= 0) b.splice(k, 1); else b.unshift({ slug, page: n }); store.set('wd_bm2', b); bmState(); toast(k >= 0 ? 'Usunięto zakładkę' : `Zakładka: ${d.id}, s. ${n}`);
  };
  const src = { cMapUrl: PDFJS_BASE + 'cmaps/', cMapPacked: true, standardFontDataUrl: PDFJS_BASE + 'standard_fonts/', wasmUrl: PDFJS_BASE + 'wasm/' };
  try {
    const cached = await (async () => { try { return await (await caches.open(PDF_CACHE)).match(d.pdf); } catch (e) { return null; } })();
    if (cached) src.data = new Uint8Array(await cached.arrayBuffer()); else src.url = d.pdf;
    pv.task = lib.getDocument(src);
    const doc = await pv.task.promise;
    if (PV !== pv) { doc.destroy(); return; }
    pdfViewer.setDocument(doc); linkService.setDocument(doc, null);
  } catch (e) {
    if (PV === pv) $('#pv-load').innerHTML = `Nie udało się otworzyć PDF (brak sieci?). <a href="${esc(d.pdf)}" target="_blank" rel="noopener">Spróbuj otworzyć bezpośrednio</a>.`;
  }
}

/* ---------- wyszukiwarka pełnotekstowa ---------- */
function hilite(text, terms) {
  if (!terms.length) return esc(text);
  const n = nz(text), rg = [];
  terms.forEach(t => {
    let i = 0;
    while ((i = n.indexOf(t, i)) >= 0) { let e = i + t.length; if (/[a-z]$/.test(t)) while (e < n.length && /[a-z]/.test(n[e])) e++; rg.push([i, e]); i += t.length; }
  });
  if (!rg.length) return esc(text);
  rg.sort((a, b) => a[0] - b[0]);
  let h = '', p = 0;
  for (const [a, b] of rg) { if (a < p) { if (b > p) { h += '<mark>' + esc(text.slice(p, b)) + '</mark>'; p = b; } continue; } h += esc(text.slice(p, a)) + '<mark>' + esc(text.slice(a, b)) + '</mark>'; p = b; }
  return h + esc(text.slice(p));
}
let searchToken = 0;
async function viewSearch(q) {
  setTitle('Szukaj: ' + q); nav('');
  const my = ++searchToken, terms = termsOf(q);
  $('#q').value = q;
  view.innerHTML = `<section class="sec"><h2>Wyniki dla „${esc(q)}”</h2><div class="chips" id="rph"></div><div id="rdocs"></div><div id="rtext"><p class="spin">Ładuję indeks treści (jednorazowo ok. 8 MB)…</p></div></section>`;
  if (!terms.length) return;
  const dh = reg.filter(d => terms.every(t => nz(d.id + ' ' + d.title + ' ' + d.full + ' ' + d.scope).includes(t))).slice(0, 10);
  if (dh.length) $('#rdocs').innerHTML = `<h3 class="grp">Dokumenty (nazwa / zakres) · ${dh.length}</h3><div class="dlist">${dh.map(ditem).join('')}</div>`;
  let ix; try { ix = await loadSearch(); } catch (e) { $('#rtext').innerHTML = '<div class="callout"><p>Nie udało się pobrać indeksu wyszukiwania (brak sieci).</p></div>'; return; }
  if (my !== searchToken) return;
  const phrase = terms.join(' '), hits = [];
  ix.norm.forEach((n, i) => {
    let score = 0;
    for (const t of terms) { let c = 0, p = 0; while (c < 12 && (p = n.indexOf(t, p)) >= 0) { c++; p += t.length; } if (!c) return; score += c; }
    if (terms.length > 1 && n.includes(phrase)) score += 15;
    hits.push([score, i]);
  });
  hits.sort((a, b) => b[0] - a[0]);
  let filt = '';
  const draw = () => {
    const L = filt ? 'PWO'['projektowanie wykonawstwo odbiory'.split(' ').indexOf(filt)] : '';
    const hs = hits.filter(([, i]) => !L || (byId[ix.docs[ix.rows[i][0]]].ph || '').toUpperCase().includes(L));
    const top = hs.slice(0, 60);
    $('#rtext').innerHTML = `<h3 class="grp">W treści · ${hs.length} ${hs.length === 1 ? 'strona' : 'stron'}${hs.length > 60 ? ' (60 najtrafniejszych)' : ''}</h3>` +
      (top.length ? `<div class="dlist">${top.map(([, i]) => {
        const r = ix.rows[i], d = byId[ix.docs[r[0]]], n = ix.norm[i];
        let b = -1; terms.forEach(t => { const k = n.indexOf(t); if (k >= 0 && (b < 0 || k < b)) b = k; });
        const a = Math.max(0, b - 70), e = Math.min(r[2].length, b + 150);
        return `<a class="res cat-${d.cat}" href="${pdfHref(d, r[1], q)}"><div class="h"><span class="badge">${esc(d.id)}</span><b>${esc(d.title)}</b><span class="pg">s. ${r[1]}</span>${phBadges(d)}</div><div class="sn">${a ? '…' : ''}${hilite(r[2].slice(a, e), terms)}${e < r[2].length ? '…' : ''}</div></a>`;
      }).join('')}</div>` : '<p class="meta">Brak wyników. Spróbuj krótszego fragmentu wyrazu (np. „zagęszcz”) albo mniejszej liczby słów. Cudzysłów łączy słowa w frazę.</p>');
  };
  $('#rph').innerHTML = `<span class="meta">Faza:</span><button class="chip" data-f="" aria-pressed="true">Wszystkie</button>` +
    Object.keys(PH_NAME).map(k => `<button class="chip" data-f="${k}" aria-pressed="false">${PH_NAME[k]}</button>`).join('');
  $('#rph').onclick = e => { const b = e.target.closest('button'); if (!b) return; filt = b.dataset.f; $('#rph').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); };
  draw();
}

/* ---------- normy, info ---------- */
function viewNormy() {
  setTitle('Normy'); nav('normy');
  view.innerHTML = `<section class="sec"><h2>Normy powoływane w dokumentach</h2>
    <div class="callout"><p><b>Folder z normami jest pusty.</b> PN-EN i Eurokodów nie ma w bazie; to lista norm powoływanych w tekstach dokumentów (kolejność wg liczby powołań). Opisy rodzin norm pochodzą z wiedzy ogólnej, nie z plików.</p></div>
    <div class="filter"><label class="sbox">${ICON_S}<input id="nf" type="search" placeholder="Filtruj normy" autocomplete="off"></label></div>
    <div id="nt">${md(S('4').body.split('\n').filter(l => l.startsWith('|')).join('\n'), { wide: true })}</div>
    ${md(S('4').body.split('\n').filter(l => l.trim() && !l.startsWith('|') && !/^Liczba|^Kolejność/.test(l)).join('\n'))}</section>`;
  $('#nf').addEventListener('input', e => {
    const q = nz(e.target.value.trim()).split(/\s+/).filter(Boolean);
    document.querySelectorAll('#nt tbody tr').forEach(tr => tr.hidden = !q.every(w => nz(tr.textContent).includes(w)));
  });
}
async function viewInfo() {
  setTitle('O bazie'); nav('info');
  const link = reg.find(d => d.id === 'X-LINK');
  view.innerHTML = `<section class="sec"><h2>O bazie</h2>
    <div class="md"><p>${inline(S('intro').replace(/^# .*\n+/, '').split('\n')[0])} Dodatkowo S4 – „Jak powstaje projekt drogi w Polsce” (plik spoza indeksu).</p></div></section>
  <section class="sec"><h2>Offline</h2><div class="md"><p>Wyszukiwarka i strony faz działają bez sieci po pierwszym otwarciu. PDF-y zapisujesz pojedynczo: w przeglądarce PDF menu ⋯ → „Zapisz offline”.</p></div><p class="meta" id="offm">Sprawdzam zapisane PDF-y…</p><div><button class="btn" id="offclr" hidden>Usuń zapisane PDF-y</button></div></section>
  <section class="sec"><h2>Mapa tematyczna</h2><a class="btn" href="#/mapa">Pytanie → dokumenty (${topics.length} tematów) →</a></section>
  <section class="sec"><h2>Luki w bazie</h2>${md(S('5').body)}</section>
  <section class="sec"><h2>Aktualność i jakość plików</h2>${md(S('6').body)}</section>
  <section class="sec"><h2>Konwencje i skróty</h2>${md(S('7').body)}</section>
  ${link ? `<section class="sec"><h2>Aktualne wersje WR-D</h2><a class="btn" href="${esc(link.url)}" target="_blank" rel="noopener">gov.pl – Wzorce i standardy Ministra Infrastruktury →</a></section>` : ''}`;
  try {
    const c = await caches.open(PDF_CACHE), keys = await c.keys();
    const ids = keys.map(k => reg.find(d => k.url.endsWith(d.pdf))).filter(Boolean);
    $('#offm').textContent = ids.length ? `Zapisane (${ids.length}): ${ids.map(d => d.id).join(', ')} – razem ${ids.reduce((a, d) => a + d.mb, 0).toFixed(1)} MB.` : 'Brak zapisanych PDF-ów.';
    if (ids.length) { $('#offclr').hidden = false; $('#offclr').onclick = async () => { await caches.delete(PDF_CACHE); toast('Usunięto'); viewInfo(); }; }
  } catch (e) { $('#offm').textContent = 'Zapis offline wymaga adresu https (np. GitHub Pages).'; }
}

/* ---------- router ---------- */
let lastRoute = null;
function route() {
  const h = location.hash.slice(1) || '/';
  const [path, qs] = h.split('?'); const qp = new URLSearchParams(qs || '');
  const seg = path.split('/').filter(Boolean).map(decodeURIComponent);
  if (seg[0] === 'pdf') return viewPdf(seg[1], parseInt(seg[2], 10) || 1, qp.get('q') || '');
  const wasPdf = !!PV;
  closeViewer();
  if (wasPdf && h === lastRoute) return;   // po zamknięciu PDF widok pod spodem zostaje, z tym samym przewinięciem
  lastRoute = h;
  scrollTo(0, 0);
  if (seg[0] !== 'szukaj') $('#q').value = '';
  if (!seg.length) return viewHome();
  if (seg[0] === 'faza') return viewFaza(seg[1]);
  if (seg[0] === 'mapa') return viewMapa();
  if (seg[0] === 'normy') return viewNormy();
  if (seg[0] === 'info') return viewInfo();
  if (seg[0] === 'szukaj') return viewSearch(seg.slice(1).join('/'));
  if (seg[0] === 'o') return viewInfoDoc(seg[1]);
  if (seg[0] === 'dok') return seg[1] === 'kat' ? viewList(seg[2]) : viewList('');
  viewHome();
}

/* ---------- motyw, wyszukiwarka górna ---------- */
function toggleTheme() {
  const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const nx = cur === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = nx; store.set('wd_theme', nx);
}
{ const t = store.get('wd_theme', null); if (t) document.documentElement.dataset.theme = t; }
let navigated = false;   // czy w tej sesji była nawigacja wewnątrz strony (wtedy „wstecz” = historia)
$('#th-top').onclick = toggleTheme;
let sdeb;
$('#q').addEventListener('input', e => {
  clearTimeout(sdeb); const v = e.target.value.trim();
  if (v.length < 2) return;
  sdeb = setTimeout(() => { const h = '#/szukaj/' + encodeURIComponent(v); if (location.hash.startsWith('#/szukaj/')) location.replace(h); else location.hash = h; }, 400);
});
$('#sf').addEventListener('submit', e => { e.preventDefault(); clearTimeout(sdeb); const v = $('#q').value.trim(); if (v) location.hash = '#/szukaj/' + encodeURIComponent(v); });

init().catch(e => { view.innerHTML = `<section class="sec"><h2>Nie udało się wczytać danych</h2><p>Strona wymaga serwera (nie działa po otwarciu pliku z dysku). Zobacz README. <code>${esc(e.message)}</code></p></section>`; });
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
