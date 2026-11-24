export const APP_STYLES = `
:root {
  --paper: #f5efe4;
  --paper-2: #fbf7ef;
  --paper-3: #fffdf8;
  --ink: #201c16;
  --muted: #6d6252;
  --line: #d8cbb6;
  --line-strong: #bfae92;
  --accent: #a93f24;
  --accent-dark: #7e2b16;
  --accent-surface: #f6e4dc;
  --honored: #2f6b4f;
  --honored-surface: #e6efe8;
  --warning: #8a5a1f;
  --warning-surface: #f4ead8;
  --slate: #4d5560;
  --slate-surface: #e9ebee;
  --serif: Georgia, 'Times New Roman', serif;
  --sans: system-ui, -apple-system, 'Segoe UI', sans-serif;
  --mono: ui-monospace, 'Cascadia Mono', 'SFMono-Regular', Consolas, monospace;
}
* { box-sizing: border-box; }
html { background: var(--paper); }
body {
  margin: 0;
  color: var(--ink);
  font-family: var(--sans);
  font-size: 16px;
  line-height: 1.55;
  background:
    radial-gradient(circle at 10% 4%, rgba(255, 255, 255, .7), transparent 36rem),
    var(--paper);
}
a { color: inherit; }
a:focus-visible, button:focus-visible, summary:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
.skip-link {
  position: absolute;
  left: 1rem;
  top: -4rem;
  z-index: 10;
  background: var(--ink);
  color: var(--paper-2);
  padding: .6rem 1rem;
  text-decoration: none;
}
.skip-link:focus { top: 1rem; }
.site-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.4rem 1.5rem 1rem;
  border-bottom: 1px solid var(--line);
}
.wordmark {
  font-family: var(--serif);
  font-size: 1.35rem;
  letter-spacing: .16em;
  font-weight: 700;
  text-decoration: none;
  line-height: 1.1;
}
.wordmark span {
  display: block;
  font-family: var(--sans);
  font-size: .56rem;
  letter-spacing: .3em;
  color: var(--muted);
  font-weight: 500;
  margin-top: .25rem;
}
nav { display: flex; flex-wrap: wrap; gap: 1.1rem; font-size: .9rem; }
nav a {
  text-decoration: none;
  border-bottom: 1px solid transparent;
  padding-bottom: .1rem;
}
nav a:hover, nav a[aria-current='page'] { border-bottom-color: var(--ink); }
main { max-width: 1200px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }
h1, h2, h3, h4 { font-family: var(--serif); line-height: 1.15; font-weight: 600; }
h1 { font-size: clamp(2rem, 3.6vw, 3rem); margin: 0 0 1rem; }
h2 { font-size: 1.5rem; margin: 0 0 .8rem; }
h3 { font-size: 1.15rem; margin: 0 0 .45rem; }
h4 { font-size: 1rem; margin: 0 0 .4rem; }
p { margin: 0 0 1rem; }
.eyebrow {
  font-size: .68rem;
  text-transform: uppercase;
  letter-spacing: .16em;
  color: var(--muted);
  font-weight: 700;
  margin: 0 0 .5rem;
}
.lede { max-width: 48rem; color: var(--muted); font-size: 1.05rem; }
.hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  margin-bottom: 2.25rem;
}
.hero h1 { max-width: 44rem; }
.hero aside { min-width: 15rem; }
.grid-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin: 1.5rem 0 2rem;
}
.panel {
  border: 1px solid var(--line);
  background: var(--paper-2);
  padding: 1.2rem 1.3rem;
}
.panel--ad { border-left: 5px solid var(--accent); }
.panel--interpretation { border-left: 5px solid var(--ink); }
.panel-label {
  margin: 0 0 .55rem;
  font-size: .68rem;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 700;
}
.quote {
  font-family: var(--serif);
  font-size: 1.25rem;
  line-height: 1.4;
  margin: 0;
}
.contract-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  border: 1px solid var(--line);
  background: var(--line);
  margin: 1.25rem 0 1.75rem;
}
.contract-grid dl, .contract-grid div {
  background: var(--paper-2);
  padding: 1rem 1.1rem;
  margin: 0;
}
.contract-grid dt {
  font-size: .66rem;
  text-transform: uppercase;
  letter-spacing: .13em;
  color: var(--muted);
  font-weight: 700;
}
.contract-grid dd {
  margin: .3rem 0 0;
  font-size: 1.05rem;
  overflow-wrap: anywhere;
}
.hash {
  font-family: var(--mono);
  font-size: .76rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
  word-break: break-all;
}
.policy {
  border: 1px dashed var(--line-strong);
  background: rgba(255, 255, 255, .32);
  padding: 1.15rem 1.3rem;
  margin-bottom: 2rem;
}
.policy-rule {
  font-family: var(--serif);
  font-size: 1.08rem;
  margin: .35rem 0 0;
}
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin: 1.25rem 0 2rem;
}
.card {
  border: 1px solid var(--line);
  background: var(--paper-2);
  padding: 1.1rem 1.2rem;
  display: flex;
  flex-direction: column;
  gap: .35rem;
}
.card h3 { margin-bottom: .1rem; }
.card-meta { color: var(--muted); font-size: .9rem; margin: 0; }
.card-amount {
  font-family: var(--serif);
  font-size: 1.75rem;
  margin: .35rem 0 .1rem;
}
.card-foot { margin-top: auto; padding-top: .65rem; }
.status {
  display: inline-flex;
  align-items: center;
  gap: .42rem;
  border: 1px solid currentColor;
  padding: .16rem .48rem;
  font-size: .72rem;
  font-weight: 800;
  letter-spacing: .1em;
  text-transform: uppercase;
  white-space: nowrap;
  line-height: 1.3;
}
.status-mark {
  width: .46rem;
  height: .46rem;
  border-radius: 50%;
  background: currentColor;
  flex: 0 0 auto;
}
.status--honored { color: var(--honored); background: var(--honored-surface); }
.status--broken { color: var(--accent); background: var(--accent-surface); }
.status--inconclusive { color: var(--warning); background: var(--warning-surface); }
.status--infra-error { color: var(--slate); background: var(--slate-surface); }
.table-wrap { overflow-x: auto; margin: 1rem 0 1.5rem; }
.hash-compare { table-layout: fixed; }
.hash-compare th { white-space: normal; vertical-align: bottom; }
.hash-compare th, .hash-compare td { padding: .5rem .4rem; }
.hash-compare td:first-child { overflow-wrap: anywhere; }
.hash-compare .hash { font-size: .7rem; }
table { width: 100%; border-collapse: collapse; }
th, td {
  text-align: left;
  padding: .7rem .6rem;
  border-bottom: 1px solid var(--line);
  vertical-align: top;
}
th {
  font-size: .66rem;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: var(--muted);
  font-weight: 800;
  white-space: nowrap;
}
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
.audit-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid var(--line);
  background: var(--paper-2);
  padding: 1rem 1.2rem;
  margin: 1.25rem 0 2rem;
}
.audit-banner p { margin: 0; }
.meta { color: var(--muted); font-size: .86rem; }
.meta strong { color: var(--ink); font-weight: 600; }
.empty {
  border: 1px dashed var(--line-strong);
  background: rgba(255, 255, 255, .3);
  padding: 1.5rem;
  color: var(--muted);
  margin: 1rem 0 2rem;
}
.empty h3 { color: var(--ink); }
.recorded-banner {
  border: 1px solid var(--warning);
  border-left: 5px solid var(--warning);
  background: var(--warning-surface);
  padding: .75rem 1rem;
  margin: 0 0 1.25rem;
  font-size: .9rem;
}
.recorded-banner .meta { display: block; margin-top: .3rem; }
.warning {
  border: 1px solid var(--warning);
  background: var(--warning-surface);
  color: var(--ink);
  padding: .8rem 1rem;
  margin: 1rem 0;
  font-size: .9rem;
}
.scenario {
  border: 1px solid var(--line);
  background: var(--paper-2);
  margin: 1.5rem 0 2rem;
}
.scenario-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  padding: 1rem 1.2rem;
  border-bottom: 1px solid var(--line);
}
.scenario-head h2 { margin: 0; font-size: 1.3rem; }
.lanes {
  display: grid;
  grid-template-columns: 1fr 1px 1fr;
  align-items: stretch;
}
.lane { padding: 1.25rem 1.35rem 1.35rem; background: var(--paper-3); }
.lane-rule { background: var(--line); }
.lane h3 {
  margin: 0 0 .15rem;
  font-size: .7rem;
  font-family: var(--sans);
  text-transform: uppercase;
  letter-spacing: .15em;
  color: var(--muted);
}
.lane-amount {
  font-family: var(--serif);
  font-size: clamp(2rem, 3.2vw, 2.7rem);
  line-height: 1.05;
  margin: .35rem 0 .55rem;
  font-variant-numeric: tabular-nums;
}
.lane--promised { border-top: 4px solid var(--ink); }
.lane--observed { border-top: 4px solid var(--line-strong); }
.lane--observed.lane--broken { border-top-color: var(--accent); }
.lane--observed.lane--honored { border-top-color: var(--honored); }
.lane--observed.lane--inconclusive { border-top-color: var(--warning); }
.lane--observed.lane--infra-error { border-top-color: var(--slate); }
.lane dl { display: grid; grid-template-columns: auto 1fr; gap: .25rem .8rem; margin: .8rem 0 0; }
.lane dt { color: var(--muted); font-size: .76rem; }
.lane dd { margin: 0; font-size: .86rem; }
.verdict {
  border-top: 1px solid var(--line);
  border-left: 5px solid var(--accent);
  background: var(--accent-surface);
  padding: 1.15rem 1.3rem;
}
.verdict h3 { font-size: 1rem; }
.verdict-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: .35rem 1.25rem; margin: .75rem 0; }
.verdict-grid dt { font-size: .68rem; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); font-weight: 700; }
.verdict-grid dd { margin: 0 0 .35rem; }
.signals { margin: .4rem 0 0; padding-left: 1.1rem; font-size: .88rem; }
.signals li { margin-bottom: .3rem; }
.runs {
  display: grid;
  min-width: 0;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  border-top: 1px solid var(--line);
}
.run-card { min-width: 0; padding: 1.1rem 1.3rem 1.25rem; background: var(--paper-2); }
.run-card + .run-card { border-left: 1px solid var(--line); }
.run-head { display: flex; align-items: center; justify-content: space-between; gap: .75rem; margin-bottom: .6rem; }
.run-head h3 { margin: 0; font-size: 1rem; }
.run-meta { display: grid; grid-template-columns: auto 1fr; gap: .22rem .7rem; margin: 0 0 .75rem; }
.run-meta dt { color: var(--muted); font-size: .76rem; }
.run-meta dd { margin: 0; font-size: .84rem; overflow-wrap: anywhere; }
.evidence { margin-top: .7rem; }
.evidence p { margin: 0 0 .35rem; font-size: .78rem; color: var(--muted); }
.evidence code {
  display: block;
  background: var(--ink);
  color: var(--paper-2);
  font-family: var(--mono);
  font-size: .76rem;
  line-height: 1.45;
  padding: .65rem .75rem;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.diff {
  max-width: 100%;
  background: #241f19;
  color: #eee6d7;
  font-family: var(--mono);
  font-size: .78rem;
  line-height: 1.5;
  margin: 0;
  padding: 1rem;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.diff-line { display: block; }
.diff-add { color: #a7d8b3; }
.diff-del { color: #f0a79a; }
.diff-meta { color: #b9ac97; }
.repair-grid {
  display: grid;
  min-width: 0;
  grid-template-columns: 1fr 1.35fr 1fr;
  gap: 1rem;
  align-items: start;
  margin-top: 1.5rem;
}
.repair-col { min-width: 0; border: 1px solid var(--line); background: var(--paper-2); padding: 1.1rem 1.2rem; }
.repair-col h2 { font-size: 1.2rem; }
.repair-col .scenario { margin: .8rem 0 0; }
.repair-col .scenario-head { padding: .7rem .8rem; }
.repair-col .scenario-head h3 { font-size: 1rem; }
.repair-col .verdict { padding: .8rem .9rem; }
.receipt {
  max-width: 940px;
  margin: 0 auto;
  border: 3px double var(--ink);
  background: var(--paper-3);
  padding: 2rem 2.2rem;
}
.receipt-head { border-bottom: 2px solid var(--ink); padding-bottom: 1rem; margin-bottom: 1.5rem; }
.receipt-head h1 { font-size: 2rem; margin: .2rem 0 .6rem; }
.receipt-statement {
  font-family: var(--serif);
  font-size: 1.25rem;
  margin: 0;
  max-width: 44rem;
}
.receipt-status { margin-top: .8rem; }
.receipt-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: .35rem 1.5rem;
  margin: 0 0 1.5rem;
}
.receipt-grid dt { font-size: .67rem; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); font-weight: 700; }
.receipt-grid dd { margin: 0 0 .5rem; overflow-wrap: anywhere; }
.receipt section { margin: 1.5rem 0; }
.receipt h2 { font-size: 1.15rem; border-bottom: 1px solid var(--line); padding-bottom: .35rem; }
.receipt footer { border-top: 1px solid var(--line); padding-top: .8rem; color: var(--muted); font-size: .8rem; }
.not-proven { padding-left: 1.1rem; }
.not-proven li { margin-bottom: .35rem; }
.button {
  display: inline-block;
  border: 1px solid var(--ink);
  background: var(--ink);
  color: var(--paper-2);
  text-decoration: none;
  font-size: .85rem;
  font-weight: 600;
  letter-spacing: .03em;
  padding: .5rem .85rem;
}
.button:hover { background: var(--accent-dark); border-color: var(--accent-dark); }
.button--secondary { background: transparent; color: var(--ink); }
.button--secondary:hover { background: var(--ink); color: var(--paper-2); }
.footer {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.1rem 1.5rem;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: .78rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.check-panel {
  border: 1px solid var(--line);
  border-top: 5px solid var(--accent);
  background: var(--paper-2);
  padding: 1.2rem 1.3rem 1.1rem;
  margin: 1.75rem 0 2rem;
}
.check-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.2rem;
  margin-bottom: 1.1rem;
}
.check-head h2 { margin: .1rem 0 .35rem; }
.check-head .lede { font-size: .95rem; margin-bottom: 0; }
.engine-status {
  margin: 0;
  padding: .45rem .6rem;
  border: 1px solid currentColor;
  font-size: .78rem;
  font-weight: 700;
  line-height: 1.35;
  max-width: 24rem;
}
.engine-status--online { color: var(--honored); background: var(--honored-surface); }
.engine-status--offline { color: var(--warning); background: var(--warning-surface); }
.check-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: .8rem;
}
.check-card {
  border: 1px solid var(--line);
  background: var(--paper-3);
  padding: .9rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: .25rem;
}
.check-card h3 { margin: .1rem 0 .2rem; }
.check-card .button { align-self: flex-start; margin-top: .55rem; }
.check-card button:disabled { opacity: .45; cursor: not-allowed; }
.job-status {
  min-height: 1.35em;
  margin: .4rem 0 0;
  color: var(--muted);
  font-size: .82rem;
  overflow-wrap: anywhere;
}
.job-status a { color: var(--ink); }
.live-note {
  border: 1px solid var(--slate);
  border-left: 5px solid var(--slate);
  background: var(--slate-surface);
  color: var(--ink);
  padding: .75rem 1rem;
  margin: 0 0 1.25rem;
  font-size: .9rem;
}
.footer-note {
  flex-basis: 100%;
  margin-top: .1rem;
  padding-top: .55rem;
  border-top: 1px solid var(--line);
  font-size: .76rem;
}
.status--queued { color: var(--warning); background: var(--warning-surface); }
.status--running { color: var(--slate); background: var(--slate-surface); }
.status--done { color: var(--honored); background: var(--honored-surface); }
.status--failed { color: var(--accent); background: var(--accent-surface); }
.status--expired { color: var(--slate); background: var(--slate-surface); }

@media (max-width: 900px) {
  .hero, .check-head { flex-direction: column; }
  .grid-two, .cards, .receipt-grid, .verdict-grid, .check-cards { grid-template-columns: 1fr; }
  .contract-grid { grid-template-columns: 1fr 1fr; }
  .repair-grid { grid-template-columns: 1fr; }
  .lanes { grid-template-columns: 1fr; }
  .lane-rule { height: 1px; }
  .runs { grid-template-columns: 1fr; }
  .run-card + .run-card { border-left: 0; border-top: 1px solid var(--line); }
}
@media (max-width: 560px) {
  .site-header { align-items: flex-start; flex-direction: column; }
  main { padding-top: 1.4rem; }
  .contract-grid { grid-template-columns: 1fr; }
  .receipt { padding: 1.2rem; }
}
@media print {
  body { background: #fff; }
  .site-header, .footer, .skip-link, .button { display: none; }
  main { padding: 0; }
  .receipt { border-color: #000; max-width: none; padding: 0; }
}
`;
