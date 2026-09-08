# sito-XPL4B-2026

Sito nuovo XP-L4B, Settembre 2026. Homepage statica, nessun build step:
si apre `index.html` in un browser o si serve la cartella così com'è
(è pensata per GitHub Pages).

## Struttura

| File | Cosa contiene |
| --- | --- |
| `index.html` | La homepage: hero, manifesto, servizi, Achivia, CEO, configuratore, contatti |
| `styles/site.css` | Livello di pagina sopra al design system (ritmo, voce brand, i tre pezzi interattivi) |
| `scripts/background.js` | Lo sfondo animato dell'hero: campo low-poly interattivo al puntatore |
| `scripts/site.js` | Chrome della pagina, HUD dei punti esperienza, mazzo CEO, configuratore |
| `_ds/nocturne-…/` | Il design system Nocturne: `styles.css` è la fonte di verità per colori, tipo, raggi e ombre |
| `assets/` | Logo, mockup Achivia, carte CEO, loghi partner, mappe, merchandising |
| `uploads/`, `scraps/` | Materiali sorgente da cui sono stati ritagliati gli asset |

## Convenzioni

- Ogni colore, font, raggio, spaziatura e ombra viene dalle variabili di
  `_ds/nocturne-…/styles.css` (`var(--color-*)`, `var(--font-*)`,
  `var(--space-*)`, `var(--radius-*)`, `var(--shadow-*)`). In `styles/site.css`
  si aggiungono solo metriche di pagina e i token del marchio (viola/teal/menta
  campionati da `assets/logo-oriz.png`), documentati in testa al file.
- Azioni primarie in outline, mai riempite; una sola fascia satura in tutta la
  pagina (`--color-section`); i righelli liberi sfumano ai due capi.
- Tutto quello che si muove rispetta `prefers-reduced-motion`, e la pagina
  funziona anche con JavaScript bloccato.

## Da completare prima della messa online

I dati che non conosciamo sono segnati fra parentesi quadre dentro `index.html`
e vanno sostituiti: `[INDIRIZZO EMAIL DI CONTATTO]` (anche in
`data-email` del form), `[NUMERO DI TELEFONO]`, `[INDIRIZZO DELLA SEDE]`,
`[URL LINKEDIN]`, `[RAGIONE SOCIALE]`, `[PARTITA IVA]`,
`[LINK PRIVACY POLICY]`. Il form contatti compone un'email con i dati inseriti:
per collegarlo a un backend basta sostituire l'handler in `scripts/site.js`.
