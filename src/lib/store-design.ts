export const STORE_DESIGN = `
:root {
  --paper: #e8e8e4;
  --paper-2: #ffffff;
  --paper-3: #fafaf7;
  --ink: #161715;
  --muted: #6f716b;
  --line: #e7e7e1;
  --accent: #0f766e;
  --accent-dark: #0b5f59;
  --accent-surface: #e5f5f1;
  --serif: Georgia, 'Times New Roman', serif;
  --sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
html { background: #e8e8e4; }
body { background: #e8e8e4; color: var(--ink); font-family: var(--sans); font-size: 14px; line-height: 1.55; }
.store-frame { max-width: 1240px; margin: 20px auto; background: #fbfbf8; border: 1px solid #deded8; border-radius: 30px; box-shadow: 0 30px 80px rgba(22,23,21,.12); overflow: hidden; }
.demo-banner { background: var(--ink); color: #fff; border-bottom: 3px solid var(--accent); padding: .55rem 1rem; text-align: center; font-size: 10px; font-weight: 700; letter-spacing: .04em; }
.site-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; max-width: 1180px; margin: 0 auto; padding: 18px 24px; border-bottom: 1px solid var(--line); }
.wordmark { display: inline-flex; align-items: center; gap: 9px; font-family: var(--sans); font-size: 13px; font-weight: 800; letter-spacing: .12em; text-decoration: none; line-height: 1; }
.wordmark .logo-mark { display: inline-grid; place-items: center; width: 27px; height: 27px; border-radius: 9px; background: var(--ink); color: #fff; font-family: var(--serif); font-size: 15px; letter-spacing: 0; }
.wordmark-sub { display: inline; font-size: 8px; letter-spacing: .2em; color: var(--muted); font-weight: 500; margin-left: 2px; }
.site-header nav { display: flex; align-items: center; gap: 20px; font-size: 11px; color: var(--muted); }
.site-header nav a { text-decoration: none; }
.site-header nav a:hover { color: var(--ink); }
main { max-width: 1120px; margin: 0 auto; padding: 34px 26px 44px; }
h1, h2, h3 { font-family: var(--sans); line-height: 1.1; letter-spacing: -.04em; font-weight: 650; }
h1 { font-size: clamp(2.2rem, 4vw, 3.4rem); margin: 0 0 1rem; }
h2 { font-size: 1.6rem; margin: 1.7rem 0 .7rem; }
h3 { font-size: 1rem; margin: 0 0 .35rem; }
p { margin: 0 0 .9rem; }
.promise { border: 1px solid var(--line); border-left: 4px solid var(--accent); background: var(--accent-surface); border-radius: 16px; padding: .9rem 1.1rem; font-size: 13px; margin-bottom: 1.4rem; }
.promise strong { white-space: nowrap; }
.intro { max-width: 44rem; color: var(--muted); font-size: 13px; }
.demo-carts { margin: 1.4rem 0 1.8rem; padding: 1.1rem 1.2rem; border: 1px solid var(--line); background: #fff; border-radius: 18px; }
.demo-carts h2 { font-size: 1.15rem; margin: 0 0 .25rem; }
.demo-carts p { color: var(--muted); font-size: 11px; margin-bottom: .9rem; }
.preset-row { display: flex; flex-wrap: wrap; gap: .5rem; }
.preset-row form { margin: 0; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.card { border: 1px solid var(--line); background: #fff; border-radius: 18px; padding: 16px; display: flex; flex-direction: column; }
.swatch { height: 116px; margin: -.25rem -.25rem .8rem; border-radius: 12px; background: var(--swatch); border: 1px solid rgba(22,23,21,.08); }
.card p { color: var(--muted); font-size: 11px; flex: 1; }
.price { font-variant-numeric: tabular-nums; font-weight: 700; letter-spacing: .01em; font-size: 14px; }
.card .price { margin-bottom: .65rem; }
button, .button { display: inline-block; border: 1px solid var(--ink); background: var(--ink); color: #fff; border-radius: 999px; font: inherit; font-family: var(--sans); font-size: 11px; font-weight: 700; letter-spacing: .02em; padding: 8px 13px; cursor: pointer; text-decoration: none; }
button:hover, .button:hover { background: #33352f; border-color: #33352f; }
button.secondary, .button--secondary { background: transparent; color: var(--ink); }
button.secondary:hover, .button--secondary:hover { background: #fff; color: var(--ink); }
table { width: 100%; border-collapse: collapse; margin: 1.2rem 0; }
th, td { text-align: left; padding: .65rem .5rem; border-bottom: 1px solid var(--line); }
th { font-size: 9px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
.subtotal-line { display: flex; justify-content: space-between; gap: 1rem; padding: .8rem .5rem; border-bottom: 1px solid var(--line); font-weight: 600; font-size: 13px; }
.actions { display: flex; gap: .6rem; flex-wrap: wrap; margin-top: 1.2rem; }
.summary { max-width: 38rem; border: 1px solid var(--line); background: #fff; border-radius: 18px; padding: 1.1rem; margin: 1.3rem 0 1rem; }
.summary-row { display: flex; justify-content: space-between; gap: 1rem; padding: .5rem 0; border-bottom: 1px solid var(--line); font-size: 12px; }
.summary-row:last-child { border-bottom: 0; }
.summary-row.total { font-weight: 700; font-size: 14px; padding-top: .8rem; }
.summary-row .amount { font-variant-numeric: tabular-nums; }
.line-items { margin: 0 0 .65rem; padding: 0 0 .65rem; border-bottom: 1px solid var(--line); }
.line-item { display: flex; justify-content: space-between; gap: 1rem; font-size: 11px; color: var(--muted); padding: .2rem 0; }
.stop-note { max-width: 38rem; border-left: 3px solid var(--accent); padding: .2rem 0 .2rem .8rem; color: var(--muted); font-size: 11px; }
.empty { color: var(--muted); padding: 1.2rem 0; }
.kern-saw { max-width: 38rem; border: 1px solid var(--line); border-left: 4px solid var(--accent); background: #fff; border-radius: 16px; padding: 1rem 1.1rem; margin: 1.2rem 0 1rem; }
.kern-saw h2 { font-size: 1.15rem; margin: 0 0 .5rem; }
.kern-saw-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .7rem; margin: .7rem 0; }
.kern-saw-grid dt { font-size: 9px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); font-weight: 800; }
.kern-saw-grid dd { margin: .1rem 0 0; font-family: var(--serif); font-size: 1.2rem; }
.kern-saw .verdict-text { font-family: var(--sans); font-size: 11px; font-weight: 800; letter-spacing: .05em; }
.kern-saw .source { margin: 0; font-size: 10px; color: var(--muted); }
.revision-toggle { display: inline-flex; align-items: center; flex-wrap: wrap; gap: .35rem; border: 1px solid var(--line); background: #fff; border-radius: 999px; padding: .3rem .4rem; margin: 0 0 1rem; font-size: 10px; }
.revision-toggle > span { color: var(--muted); padding: 0 .2rem; }
.revision-toggle a { text-decoration: none; border-radius: 999px; padding: .3rem .6rem; }
.revision-toggle a[aria-current="page"] { background: var(--ink); color: #fff; font-weight: 700; }
.revision-note { max-width: 38rem; border: 1px solid #e4c98f; background: #f8f0df; border-radius: 12px; padding: .7rem .9rem; margin: 0 0 1rem; font-size: 11px; }
footer { max-width: 1180px; margin: 0 auto; padding: 18px 24px; border-top: 1px solid var(--line); color: var(--muted); font-size: 10px; display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
@media (max-width: 900px) {
  .store-frame { margin: 0; border-radius: 0; border-left: 0; border-right: 0; }
  .site-header { flex-wrap: wrap; }
  .kern-saw-grid { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .site-header { flex-direction: column; align-items: flex-start; }
  main { padding: 24px 16px 32px; }
}
`;
