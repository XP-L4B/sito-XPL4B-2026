/* XP-L4B — homepage behaviour.
 *
 * Four independent pieces, all optional: the page reads and works with this
 * file blocked. Nothing here writes to the network.
 *   1. chrome      — sticky-header state, scroll reveals, current section
 *   2. gamification— the XP head-up display in the header
 *   3. deck        — the CEO cards
 *   4. configurator— three choices in, a starting proposal out
 */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ── 1. chrome ─────────────────────────────────────────────────────────── */

  const header = $('#site-header');
  if (header) {
    const mark = () => header.setAttribute('data-stuck', String(window.scrollY > 8));
    mark();
    window.addEventListener('scroll', mark, { passive: true });
  }

  const navToggle = $('#nav-toggle');
  const navMenu = $('#nav-menu');
  if (navToggle && navMenu) {
    const setMenu = (open) => {
      navMenu.hidden = !open;
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
    };
    navToggle.addEventListener('click', () => setMenu(navMenu.hidden));
    navMenu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !navMenu.hidden) { setMenu(false); navToggle.focus(); }
    });
    // The menu only exists below 900px; leaving it open across a resize would
    // strand it behind the media query.
    window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => {
      if (e.matches) setMenu(false);
    });
  }

  if ('IntersectionObserver' in window) {
    const revealer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute('data-shown', 'true');
        revealer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    $$('.reveal').forEach((el) => revealer.observe(el));

    // Current-section marker in the nav.
    const links = new Map();
    $$('.nav-links a').forEach((a) => {
      const id = a.getAttribute('href').slice(1);
      if (id) links.set(id, a);
    });
    const spy = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const link = links.get(entry.target.id);
        if (link) link.setAttribute('aria-current', String(entry.isIntersecting));
      }
    }, { rootMargin: '-45% 0px -45% 0px' });
    links.forEach((_, id) => {
      const section = document.getElementById(id);
      if (section) spy.observe(section);
    });
  } else {
    $$('.reveal').forEach((el) => el.setAttribute('data-shown', 'true'));
  }

  /* ── 2. gamification ───────────────────────────────────────────────────── */

  const QUESTS = [
    { id: 'servizi', xp: 15, title: 'Ricognizione', hint: 'Guarda cosa facciamo' },
    { id: 'achivia', xp: 15, title: 'Prima missione', hint: 'Scopri Achivia' },
    { id: 'ceo', xp: 15, title: 'Mano di carte', hint: 'Arriva al mazzo di CEO' },
    { id: 'carta', xp: 20, title: 'Carta scoperta', hint: 'Gira una carta di CEO' },
    { id: 'config', xp: 50, title: 'Progetto configurato', hint: 'Completa il configuratore' }
  ];

  const LEVELS = [
    { at: 0, name: 'Visitatore' },
    { at: 20, name: 'Esploratore' },
    { at: 50, name: 'Giocatore' },
    { at: 90, name: 'Progettista' },
    { at: 115, name: 'Game designer' }
  ];

  const STORE_KEY = 'xpl4b.progress.v1';

  const hud = {
    root: $('#hud'),
    toggle: $('#hud-toggle'),
    panel: $('#hud-panel'),
    level: $('#hud-level'),
    fill: $('#hud-fill'),
    xp: $('#hud-xp'),
    rank: $('#hud-rank'),
    list: $('#hud-quests'),
    reset: $('#hud-reset')
  };

  let done = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed.filter((id) => QUESTS.some((q) => q.id === id)) : []);
    } catch {
      return new Set(); // private mode, blocked storage — the HUD just won't persist
    }
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(Array.from(done)));
    } catch {
      /* nothing to do — progress stays in this page view only */
    }
  }

  const totalXp = () => QUESTS.reduce((sum, q) => sum + (done.has(q.id) ? q.xp : 0), 0);

  function levelFor(xp) {
    let index = 0;
    for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].at) index = i;
    const next = LEVELS[index + 1];
    const floor = LEVELS[index].at;
    const progress = next ? (xp - floor) / (next.at - floor) : 1;
    return { index, name: LEVELS[index].name, progress: Math.max(0, Math.min(1, progress)) };
  }

  function paintHud() {
    if (!hud.root) return;
    const xp = totalXp();
    const lv = levelFor(xp);
    hud.level.textContent = `Lv ${lv.index + 1}`;
    hud.xp.textContent = String(xp);
    hud.fill.style.width = `${Math.round(lv.progress * 100)}%`;
    hud.rank.textContent = lv.name;
    hud.toggle.setAttribute('aria-label', `${lv.name}, livello ${lv.index + 1}, ${xp} punti esperienza`);

    hud.list.replaceChildren(...QUESTS.map((q) => {
      const li = document.createElement('li');
      li.className = 'hud-quest';
      li.setAttribute('data-done', String(done.has(q.id)));
      li.innerHTML = done.has(q.id)
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5 9 17.5 20 6.5"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="8"/></svg>';
      const text = document.createElement('div');
      const b = document.createElement('b');
      b.textContent = `${q.title} · ${q.xp} XP`;
      const span = document.createElement('span');
      span.textContent = q.hint;
      text.append(b, span);
      li.append(text);
      return li;
    }));
  }

  function award(id) {
    const quest = QUESTS.find((q) => q.id === id);
    if (!quest || done.has(id)) return;
    const before = levelFor(totalXp()).index;
    done.add(id);
    save();
    paintHud();
    const after = levelFor(totalXp()).index;
    toast(`<strong>+${quest.xp} XP</strong> ${quest.title}`);
    if (after > before) toast(`<strong>Livello ${after + 1}</strong> ${LEVELS[after].name}`);
  }

  const toasts = $('#toasts');
  function toast(html) {
    if (!toasts) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = html;
    toasts.append(el);
    while (toasts.children.length > 3) toasts.firstElementChild.remove();
    const life = reduceMotion.matches ? 2600 : 3400;
    setTimeout(() => {
      el.setAttribute('data-leaving', 'true');
      setTimeout(() => el.remove(), 300);
    }, life);
  }

  if (hud.root) {
    paintHud();

    hud.toggle.addEventListener('click', () => {
      const open = hud.panel.hidden;
      hud.panel.hidden = !open;
      hud.toggle.setAttribute('aria-expanded', String(open));
    });

    document.addEventListener('click', (e) => {
      if (hud.panel.hidden || hud.root.contains(e.target)) return;
      hud.panel.hidden = true;
      hud.toggle.setAttribute('aria-expanded', 'false');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || hud.panel.hidden) return;
      hud.panel.hidden = true;
      hud.toggle.setAttribute('aria-expanded', 'false');
      hud.toggle.focus();
    });

    hud.reset.addEventListener('click', () => {
      done = new Set();
      save();
      paintHud();
    });

    // Sections award their quest once they have genuinely been read, not
    // merely scrolled past: half the section has to be on screen.
    if ('IntersectionObserver' in window) {
      const questSpy = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          award(entry.target.getAttribute('data-quest'));
          questSpy.unobserve(entry.target);
        }
      }, { threshold: 0.35 });
      $$('[data-quest]').forEach((el) => questSpy.observe(el));
    }
  }

  /* ── 3. the CEO deck ───────────────────────────────────────────────────── */

  $$('#deck .deck-card').forEach((card) => {
    card.addEventListener('click', () => {
      const on = card.getAttribute('data-revealed') === 'true';
      card.setAttribute('data-revealed', String(!on));
      if (!on) award('carta');
    });
  });

  /* ── 4. the configurator ───────────────────────────────────────────────── */

  const FORMATI = {
    digitale: {
      label: 'Piattaforma digitale',
      title: 'Una piattaforma gamificata su misura',
      body: 'Partiremmo dall’impianto di Achivia — quest, punti esperienza, clan e cruscotto — riscritto sul vostro linguaggio e sui vostri indicatori.'
    },
    fisico: {
      label: 'Gioco fisico',
      title: 'Un gioco fisico progettato sul vostro mestiere',
      body: 'Partiremmo dal metodo di CEO: carte, ruoli e imprevisti che rimettono in scena decisioni che nella realtà costano care.'
    },
    live: {
      label: 'Evento o competizione',
      title: 'Un format live da mandare in onda',
      body: 'Partiremmo dal format: regole, calendario e produzione di una competizione che la vostra community possa seguire davvero.'
    },
    immersivo: {
      label: 'Mondo virtuale',
      title: 'Un mondo giocabile dove il pubblico è già',
      body: 'Partiremmo da una mappa custom su Fortnite, Minecraft o Roblox — o da un’esperienza in realtà virtuale se il contesto è una fiera o un’aula.'
    },
    aperto: {
      label: 'Formato da decidere',
      title: 'Due strade da mettere a confronto',
      body: 'Partiremmo da un workshop breve: mettiamo sul tavolo un formato digitale e uno fisico e scegliamo con voi quello che regge meglio l’obiettivo.'
    }
  };

  const OBIETTIVI = {
    formazione: {
      label: 'Formazione e onboarding',
      point: 'Il contenuto formativo diventa la meccanica: si impara giocando, non tra un livello e l’altro.'
    },
    engagement: {
      label: 'Engagement e cultura interna',
      point: 'Il gioco restituisce partecipazione, non produttività: è la differenza fra adesione e sorveglianza.'
    },
    employer: {
      label: 'Employer branding e recruiting',
      point: 'Pensato per essere mostrato fuori: quello che le persone giocano diventa il modo in cui l’azienda si racconta.'
    },
    awareness: {
      label: 'Awareness e community',
      point: 'Progettato per essere condiviso: la meccanica dà alle persone un motivo per parlarne.'
    }
  };

  const PUBBLICI = {
    persone: {
      label: 'Persone dell’azienda',
      point: 'Tarato sulle persone dell’azienda: tempi corti, nessuna curva di apprendimento, si entra dal primo turno.'
    },
    studenti: {
      label: 'Studenti e docenti',
      point: 'Tarato su studenti e docenti: sta dentro l’ora di lezione ed è riutilizzabile classe dopo classe.'
    },
    clienti: {
      label: 'Clienti e community',
      point: 'Tarato su clienti e community: si capisce senza istruzioni e funziona anche per chi passa una volta sola.'
    }
  };

  const CHECK = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5 9 17.5 20 6.5"/></svg>';

  const form = $('#config-form');
  const result = {
    title: $('#result-title'),
    empty: $('#result-empty'),
    body: $('#result-body'),
    points: $('#result-points'),
    meta: $('#result-meta'),
    cta: $('#result-cta')
  };

  let summary = null;

  function readChoices() {
    const data = new FormData(form);
    return {
      obiettivo: OBIETTIVI[data.get('obiettivo')] || null,
      pubblico: PUBBLICI[data.get('pubblico')] || null,
      formato: FORMATI[data.get('formato')] || null
    };
  }

  function paintResult() {
    const choice = readChoices();
    const picked = [choice.obiettivo, choice.pubblico, choice.formato].filter(Boolean);

    if (picked.length < 3) {
      summary = null;
      result.title.textContent = 'Fate le vostre tre scelte';
      result.empty.hidden = false;
      result.empty.textContent = picked.length === 0
        ? 'Man mano che scegliete, qui compare il punto di partenza che proporremmo — con cosa metteremmo in campo e cosa ci servirebbe sapere da voi.'
        : `${picked.length} scelte su 3. Ancora ${3 - picked.length} e vi diciamo da dove partiremmo.`;
      result.body.hidden = true;
      result.points.hidden = true;
      result.meta.hidden = true;
      result.cta.hidden = true;
      return;
    }

    result.title.textContent = choice.formato.title;
    result.empty.hidden = true;
    result.body.hidden = false;
    result.body.textContent = choice.formato.body;

    result.points.hidden = false;
    result.points.replaceChildren(...[
      choice.obiettivo.point,
      choice.pubblico.point,
      'Un impianto di misura definito prima di partire: cosa guardiamo per dire che ha funzionato.'
    ].map((text) => {
      const li = document.createElement('li');
      li.innerHTML = CHECK;
      const span = document.createElement('span');
      span.textContent = text;
      li.append(span);
      return li;
    }));

    result.meta.hidden = false;
    result.meta.replaceChildren(...picked.map((item) => {
      const tag = document.createElement('span');
      tag.className = 'tag tag-neutral';
      tag.textContent = item.label;
      return tag;
    }));

    result.cta.hidden = false;
    summary = [
      'La nostra configurazione dal sito:',
      `· Obiettivo: ${choice.obiettivo.label}`,
      `· Pubblico: ${choice.pubblico.label}`,
      `· Formato: ${choice.formato.label}`,
      '',
      `Proposta di partenza suggerita: ${choice.formato.title}.`,
      '',
      'Il nostro contesto:'
    ].join('\n');

    award('config');
  }

  if (form) {
    form.addEventListener('change', paintResult);
    form.addEventListener('submit', (e) => e.preventDefault());
    paintResult();

    // "Parliamone" carries the configuration into the contact message.
    result.cta.addEventListener('click', () => {
      const message = $('#c-msg');
      if (!message || !summary) return;
      if (!message.value.trim() || message.dataset.autofilled === 'true') {
        message.value = `${summary}\n`;
        message.dataset.autofilled = 'true';
      }
    });
  }

  /* ── contact ───────────────────────────────────────────────────────────── */

  const contact = $('#contact-form');
  if (contact) {
    const status = $('#contact-status');
    contact.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contact.reportValidity()) return;

      const address = (contact.dataset.email || '').trim();
      if (!address || address.includes('[')) {
        status.textContent = 'Il form non è ancora collegato a una casella. Impostate data-email in index.html oppure un endpoint del vostro backend.';
        return;
      }

      const data = new FormData(contact);
      const body = [
        `Nome: ${data.get('nome')}`,
        `Organizzazione: ${data.get('organizzazione') || '—'}`,
        `Email: ${data.get('email')}`,
        '',
        String(data.get('messaggio') || '')
      ].join('\n');

      status.textContent = 'Apriamo il vostro client di posta con il messaggio già pronto.';
      window.location.href =
        `mailto:${address}?subject=${encodeURIComponent('Richiesta dal sito XP-L4B')}&body=${encodeURIComponent(body)}`;
    });
  }
})();
