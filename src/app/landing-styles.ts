export const LANDING_STYLES = `
:root {
  --ink: #161715;
  --muted: #6f716b;
  --line: #e7e7e1;
  --soft-2: #fafaf7;
  --accent: #0f766e;
  --accent-2: #2dd4bf;
  --accent-soft: #e5f5f1;
  --red: #a93f24;
  --red-soft: #f8e9e3;
  --green: #2f6b4f;
  --green-soft: #e8f3ec;
  --radius: 22px;
  --sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --serif: Georgia, 'Times New Roman', serif;
  --mono: ui-monospace, 'Cascadia Mono', 'SFMono-Regular', Consolas, monospace;
}
* { box-sizing: border-box; }
html { background: #e8e8e4; }
body { margin: 0; color: var(--ink); font-family: var(--sans); font-size: 16px; line-height: 1.5; background: #e8e8e4; }
a { color: inherit; }
a:focus-visible { outline: 3px solid var(--accent-2); outline-offset: 3px; }
.page { max-width: 1240px; margin: 20px auto; background: #fbfbf8; border: 1px solid #deded8; border-radius: 30px; box-shadow: 0 30px 80px rgba(22,23,21,.12); overflow: hidden; }
.nav { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 18px 24px; max-width: 1180px; margin: 0 auto; border-bottom: 1px solid var(--line); }
.logo { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; font-weight: 800; letter-spacing: .16em; font-size: 14px; }
.logo-mark { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 9px; background: var(--ink); color: #fff; font-family: var(--serif); font-size: 16px; letter-spacing: 0; }
.nav-links { display: flex; align-items: center; gap: 22px; font-size: 12px; color: var(--muted); }
.nav-links a { text-decoration: none; }
.nav-links a:hover { color: var(--ink); }
.nav-actions { display: flex; align-items: center; gap: 10px; }
.nav-ghost { font-size: 12px; text-decoration: none; font-weight: 650; }
.nav-cta { display: inline-block; padding: 10px 15px; border-radius: 999px; background: var(--ink); color: #fff; text-decoration: none; font-size: 12px; font-weight: 700; }
.hero { max-width: 920px; margin: 0 auto; padding: 48px 24px 26px; text-align: center; }
.badge { display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--line); background: #fff; border-radius: 999px; padding: 6px 12px; color: var(--muted); font-size: 11px; letter-spacing: .03em; box-shadow: 0 4px 16px rgba(22,23,21,.04); }
.badge strong { color: var(--ink); font-weight: 700; }
.hero h1 { font-size: clamp(44px, 7vw, 82px); line-height: .98; letter-spacing: -.06em; font-weight: 650; margin: 22px 0 18px; }
.accent { background: linear-gradient(100deg, #0f766e 10%, #18a99c 52%, #2dd4bf 90%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.hero-sub { max-width: 660px; margin: 0 auto 22px; color: var(--muted); font-size: 15px; line-height: 1.65; }
.hero-actions { display: flex; justify-content: center; flex-wrap: wrap; gap: 10px; }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 999px; padding: 12px 18px; font-size: 13px; font-weight: 700; text-decoration: none; border: 1px solid var(--ink); }
.btn-primary { background: var(--ink); color: #fff; }
.btn-primary:hover { background: #33352f; }
.btn-secondary { background: transparent; color: var(--ink); }
.btn-secondary:hover { background: #fff; }
.hero-meta { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px 18px; color: var(--muted); font-size: 11px; margin-top: 18px; }
.hero-meta span::before { content: '•'; color: var(--accent); margin-right: 7px; }
.operator-note { max-width: 760px; margin: 0 auto 8px; color: var(--muted); font-size: 11px; text-align: center; }
.steps-wrap { max-width: 1120px; margin: 0 auto; padding: 18px 26px 44px; }
.steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; align-items: start; }
.step-card { background: #fff; border: 1px solid var(--line); border-radius: var(--radius); padding: 16px; min-width: 0; box-shadow: 0 14px 30px rgba(22,23,21,.07); transition: transform .2s ease, box-shadow .2s ease; }
.step-card:hover { transform: rotate(0deg) translateY(-3px); box-shadow: 0 20px 38px rgba(22,23,21,.1); }
.step-card:nth-child(1) { transform: rotate(-2.2deg); }
.step-card:nth-child(2) { transform: translateY(-12px) rotate(.7deg); }
.step-card:nth-child(3) { transform: rotate(2.2deg); }
.step-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
.step-num { font-size: 10px; letter-spacing: .13em; text-transform: uppercase; color: var(--muted); font-weight: 800; }
.mini { border: 1px solid var(--line); background: var(--soft-2); border-radius: 14px; padding: 10px; min-height: 126px; }
.mini-row { display: flex; justify-content: space-between; gap: 10px; border-bottom: 1px solid var(--line); padding: 7px 0; font-size: 11px; }
.mini-row:last-child { border-bottom: 0; }
.mini-row strong { font-variant-numeric: tabular-nums; }
.mini-kicker { margin: 0 0 6px; color: var(--muted); font-size: 9px; letter-spacing: .1em; text-transform: uppercase; font-weight: 800; }
.chip { display: inline-block; border-radius: 999px; padding: 2px 7px; font-size: 9px; font-weight: 800; letter-spacing: .04em; }
.chip-red { color: var(--red); background: var(--red-soft); }
.chip-green { color: var(--green); background: var(--green-soft); }
.mini-code { font-family: var(--mono); font-size: 10px; line-height: 1.7; white-space: pre-wrap; }
.mini-code .del { color: var(--red); }
.mini-code .add { color: var(--green); }
.mini-gate { display: flex; align-items: center; gap: 10px; min-height: 80px; }
.mini-big { font-family: var(--serif); font-size: 34px; line-height: 1; letter-spacing: -.04em; }
.step-copy { color: var(--muted); font-size: 11px; margin: 9px 0 0; min-height: 30px; }
.step-link { display: inline-block; margin-top: 8px; font-size: 10px; font-weight: 800; text-underline-offset: 3px; }
.principle { max-width: 680px; margin: 0 auto; padding: 6px 24px 34px; text-align: center; }
.avatar { display: inline-grid; place-items: center; width: 48px; height: 48px; border-radius: 50%; background: var(--ink); color: #fff; font-family: var(--serif); font-size: 22px; margin-bottom: 12px; }
.principle blockquote { font-family: var(--serif); font-size: 19px; line-height: 1.4; letter-spacing: -.02em; margin: 0 0 8px; }
.principle p { color: var(--muted); font-size: 11px; margin: 0; }
.built-with { max-width: 1120px; margin: 0 auto; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: 18px 26px; display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 12px 30px; color: #85877f; font-size: 11px; font-weight: 750; letter-spacing: .02em; }
.built-with span:first-child { color: var(--muted); font-size: 10px; font-weight: 500; }
.section { max-width: 1120px; margin: 0 auto; padding: 48px 26px 20px; }
.section-head { max-width: 650px; margin: 0 auto 22px; text-align: center; }
.eyebrow { margin: 0 0 9px; color: var(--accent); font-size: 10px; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; }
.section h2 { font-size: clamp(28px, 4vw, 44px); line-height: 1.05; letter-spacing: -.045em; margin: 0 0 10px; font-weight: 650; }
.section-head p { color: var(--muted); font-size: 13px; margin: 0; }
.feature-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.feature { border: 1px solid var(--line); border-radius: 18px; background: #fff; padding: 16px; }
.feature-icon { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; background: var(--accent-soft); color: var(--accent); font-weight: 900; margin-bottom: 10px; }
.feature h3 { font-size: 13px; margin: 0 0 4px; }
.feature p { color: var(--muted); font-size: 11px; margin: 0; }
.test-section { background: #f4f4f0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.test-section .section { padding-top: 42px; padding-bottom: 44px; }
.test-table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
.test-table th, .test-table td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--line); font-size: 11px; }
.test-table th { color: var(--muted); font-size: 9px; letter-spacing: .1em; text-transform: uppercase; }
.test-table tr:last-child td { border-bottom: 0; }
.test-table td:first-child { font-weight: 700; }
.test-table .num { text-align: right; font-variant-numeric: tabular-nums; }
.test-note { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-top: 10px; color: var(--muted); font-size: 10px; }
.test-note a { font-weight: 700; }
.pages-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }
.page-link { display: flex; justify-content: space-between; gap: 12px; align-items: center; border: 1px solid var(--line); border-radius: 13px; background: #fff; padding: 12px 13px; text-decoration: none; font-size: 12px; font-weight: 650; }
.page-link span { color: var(--muted); font-weight: 400; font-size: 10px; }
.page-link:hover { border-color: var(--ink); }
.footer { max-width: 1120px; margin: 0 auto; padding: 26px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; color: var(--muted); font-size: 10px; }
.footer a { text-decoration: none; font-weight: 650; color: var(--ink); }
@media (max-width: 900px) {
  .page { margin: 0; border-radius: 0; border-left: 0; border-right: 0; }
  .nav { flex-wrap: wrap; }
  .nav-links { order: 3; width: 100%; gap: 15px; overflow-x: auto; }
  .steps, .feature-grid, .pages-grid { grid-template-columns: 1fr; }
  .step-card:nth-child(1), .step-card:nth-child(2), .step-card:nth-child(3) { transform: none; }
  .hero { padding-top: 34px; }
}
@media (max-width: 560px) {
  .hero h1 { font-size: 44px; }
  .nav-actions .nav-ghost { display: none; }
  .built-with { justify-content: flex-start; }
}
`;
