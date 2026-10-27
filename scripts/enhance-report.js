/**
 * Adds an executive summary and a filterable results table to the top of the mochawesome HTML report.
 *
 * Runs automatically after `cypress run` (see cypress.config.js), or by hand:
 *   node scripts/enhance-report.js [path/to/index.html]
 *
 * The original mochawesome report is kept untouched under the "Detailed report" tab.
 */
const fs = require('fs');
const path = require('path');

const MARKER = '<!-- report-dashboard -->';

const decodeEntities = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/** Flatten mochawesome's nested suites into one row per test. */
function collectTests(results) {
  const rows = [];
  const walk = (suite, spec, trail) => {
    const suitePath = suite.title ? [...trail, suite.title] : trail;
    (suite.tests || []).forEach((t) => {
      const state = t.fail ? 'failed' : t.pass ? 'passed' : t.skipped ? 'skipped' : 'pending';
      rows.push({
        spec,
        suite: suitePath.join(' › '),
        title: t.title,
        state,
        duration: t.duration || 0,
        error: t.err && t.err.message ? t.err.message : '',
        screenshot: findScreenshot(t.context),
      });
    });
    (suite.suites || []).forEach((s) => walk(s, spec, suitePath));
  };
  results.forEach((r) => walk(r, (r.file || '').replace(/\\/g, '/').replace(/^cypress\/e2e\//, ''), []));

  // A spec that Cypress re-ran is recorded twice: keep the last result per test and flag pass-after-fail as flaky
  const byKey = new Map();
  rows.forEach((row) => {
    const key = `${row.spec}|${row.suite}|${row.title}`;
    const prev = byKey.get(key);
    const failedBefore = prev ? prev.failedBefore || prev.state === 'failed' : false;
    byKey.set(key, { ...row, failedBefore, flaky: failedBefore && row.state === 'passed' });
  });
  return [...byKey.values()];
}

/** cypress-mochawesome-reporter stores embedded screenshots as data URIs in the test context. */
function findScreenshot(context) {
  if (!context) return '';
  try {
    const items = [].concat(typeof context === 'string' ? JSON.parse(context) : context);
    const shot = items.find((c) => c && typeof c.value === 'string' && c.value.startsWith('data:image'));
    return shot ? shot.value : '';
  } catch {
    return '';
  }
}

function enhanceReport(file) {
  if (!fs.existsSync(file)) return false;
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes(MARKER)) return true;

  const raw = html.match(/data-raw="([^"]*)"/);
  if (!raw) return false;
  const data = JSON.parse(decodeEntities(raw[1]));
  const payload = {
    stats: data.stats,
    tests: collectTests(data.results || []),
    generated: new Date().toISOString(),
  };
  // Keep the embedded JSON from closing the script tag early
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');

  const injected = `${MARKER}
<style>${CSS}</style>
<div id="rd-root">
  <header class="rd-top">
    <div class="rd-brand">OrangeHRM Test Report</div>
    <nav class="rd-tabs">
      <button class="rd-tab rd-active" data-view="summary">Summary &amp; filters</button>
      <button class="rd-tab" data-view="detail">Detailed report</button>
    </nav>
  </header>
  <main id="rd-summary"></main>
</div>
<script id="rd-data" type="application/json">${json}</script>
<script>${CLIENT_JS}</script>`;

  html = html.replace(/<body([^>]*)>/, (m) => `${m}${injected}`);
  fs.writeFileSync(file, html);
  return true;
}

const CSS = `
#rd-root{--bg:#f6f7f9;--card:#fff;--ink:#1d2433;--muted:#5f6b7a;--line:#e3e7ec;--pass:#1f9d55;--fail:#d64545;--skip:#b7791f;--accent:#f28b20;
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--bg)}
#rd-root *{box-sizing:border-box}
.rd-top{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:14px 24px;background:#1d2433;color:#fff}
.rd-brand{font-weight:600;font-size:18px}
.rd-tabs{display:flex;gap:6px}
.rd-tab{border:1px solid #4a5468;background:transparent;color:#d6dbe4;padding:7px 14px;border-radius:6px;cursor:pointer;font-size:14px}
.rd-tab.rd-active{background:var(--accent);border-color:var(--accent);color:#fff}
#rd-summary{max-width:1280px;margin:0 auto;padding:24px 16px 48px}
.rd-banner{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:18px 20px;border-radius:10px;background:var(--card);border-left:6px solid var(--pass);box-shadow:0 1px 2px rgba(0,0,0,.06)}
.rd-banner.rd-bad{border-left-color:var(--fail)}
.rd-verdict{font-size:22px;font-weight:700}
.rd-banner .rd-sub{color:var(--muted);font-size:14px}
.rd-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:16px 0}
.rd-kpi{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px}
.rd-kpi .rd-k{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
.rd-kpi .rd-v{font-size:26px;font-weight:700;margin-top:4px}
.rd-pass{color:var(--pass)}.rd-fail{color:var(--fail)}.rd-skip{color:var(--skip)}
.rd-bar{height:10px;border-radius:5px;background:var(--line);overflow:hidden;display:flex;min-width:80px}
.rd-bar span{display:block;height:100%}
.rd-section{background:var(--card);border:1px solid var(--line);border-radius:10px;margin-top:16px;overflow:hidden}
.rd-section h2{font-size:16px;margin:0;padding:14px 16px;border-bottom:1px solid var(--line)}
.rd-table{width:100%;border-collapse:collapse;font-size:14px}
.rd-table th{text-align:left;font-weight:600;color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.03em;padding:10px 12px;border-bottom:1px solid var(--line);background:#fafbfc;cursor:pointer;white-space:nowrap}
.rd-table td{padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:top}
.rd-table tr:last-child td{border-bottom:none}
.rd-num{text-align:right;font-variant-numeric:tabular-nums}
.rd-scroll{overflow-x:auto}
.rd-pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:600;color:#fff}
.rd-pill.passed{background:var(--pass)}.rd-pill.failed{background:var(--fail)}.rd-pill.skipped,.rd-pill.pending{background:var(--skip)}
.rd-filters{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:12px 16px;border-bottom:1px solid var(--line)}
.rd-filters input,.rd-filters select{padding:7px 10px;border:1px solid var(--line);border-radius:6px;font-size:14px;background:#fff;color:var(--ink)}
.rd-filters input{flex:1;min-width:200px}
.rd-chip{border:1px solid var(--line);background:#fff;padding:6px 12px;border-radius:999px;cursor:pointer;font-size:13px;color:var(--ink)}
.rd-chip.rd-on{background:var(--ink);color:#fff;border-color:var(--ink)}
.rd-count{color:var(--muted);font-size:13px;margin-left:auto}
.rd-err{margin-top:6px;font-family:ui-monospace,Consolas,monospace;font-size:12px;color:var(--fail);white-space:pre-wrap;word-break:break-word}
.rd-shot{margin-top:8px;max-width:520px;width:100%;border:1px solid var(--line);border-radius:6px;cursor:zoom-in}
.rd-suite{color:var(--muted);font-size:12px}
.rd-link{color:#2563eb;cursor:pointer;text-decoration:underline}
.rd-empty{padding:24px;text-align:center;color:var(--muted)}
#report.rd-hidden{display:none}
#report{transform:translateZ(0)}
`;

// Runs in the browser once the page has loaded (the dashboard is injected before mochawesome's #report div).
const CLIENT_JS = `
document.addEventListener('DOMContentLoaded', function(){
  var data = JSON.parse(document.getElementById('rd-data').textContent);
  var tests = data.tests, s = data.stats;
  var root = document.getElementById('rd-summary');
  var report = document.getElementById('report');
  var esc = function(t){ return String(t).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  var fmt = function(ms){ if (ms < 1000) return ms + ' ms'; var sec = ms / 1000; if (sec < 60) return sec.toFixed(1) + ' s'; var whole = Math.round(sec); return Math.floor(whole / 60) + 'm ' + (whole % 60) + 's'; };
  var count = function(list, st){ return list.filter(function(t){ return t.state === st; }).length; };

  var total = tests.length, passed = count(tests,'passed'), failed = count(tests,'failed');
  var skipped = total - passed - failed;
  var flaky = tests.filter(function(t){ return t.flaky; }).length;
  var rate = total ? (passed / total * 100) : 0;

  // Per-spec rollup
  var specs = {};
  tests.forEach(function(t){
    var g = specs[t.spec] || (specs[t.spec] = {spec:t.spec, total:0, passed:0, failed:0, skipped:0, duration:0});
    g.total++; g.duration += t.duration;
    if (t.state === 'passed') g.passed++; else if (t.state === 'failed') g.failed++; else g.skipped++;
  });
  var specList = Object.keys(specs).sort().map(function(k){ return specs[k]; });

  var bar = function(p, f, k, n){
    if (!n) return '<div class="rd-bar"></div>';
    return '<div class="rd-bar" title="' + p + ' passed, ' + f + ' failed, ' + k + ' skipped">' +
      '<span style="width:' + (p/n*100) + '%;background:var(--pass)"></span>' +
      '<span style="width:' + (f/n*100) + '%;background:var(--fail)"></span>' +
      '<span style="width:' + (k/n*100) + '%;background:var(--skip)"></span></div>';
  };

  var started = s && s.start ? new Date(s.start).toLocaleString() : '';
  var html = '';
  html += '<div class="rd-banner ' + (failed ? 'rd-bad' : '') + '">' +
    '<div class="rd-verdict ' + (failed ? 'rd-fail' : 'rd-pass') + '">' + (failed ? failed + ' test' + (failed > 1 ? 's' : '') + ' failed' : 'All tests passed') + '</div>' +
    '<div class="rd-sub">' + rate.toFixed(1) + '% pass rate · ' + total + ' tests in ' + specList.length + ' spec files' + (flaky ? ' · ' + flaky + ' flaky' : '') + (started ? ' · run started ' + esc(started) : '') + '</div></div>';

  html += '<div class="rd-kpis">' +
    kpi('Total tests', total, '') + kpi('Passed', passed, 'rd-pass') + kpi('Failed', failed, 'rd-fail') +
    kpi('Skipped', skipped, 'rd-skip') + kpi('Pass rate', rate.toFixed(1) + '%', failed ? 'rd-fail' : 'rd-pass') +
    kpi('Duration', fmt(s && s.duration ? s.duration : tests.reduce(function(a,t){ return a + t.duration; }, 0)), '') + '</div>';
  function kpi(k, v, cls){ return '<div class="rd-kpi"><div class="rd-k">' + k + '</div><div class="rd-v ' + cls + '">' + v + '</div></div>'; }

  html += '<section class="rd-section"><h2>Results by spec</h2><div class="rd-scroll"><table class="rd-table"><thead><tr>' +
    '<th>Spec</th><th class="rd-num">Tests</th><th class="rd-num">Passed</th><th class="rd-num">Failed</th><th class="rd-num">Skipped</th><th class="rd-num">Duration</th><th style="width:22%">Result</th></tr></thead><tbody>' +
    specList.map(function(g){
      return '<tr><td><span class="rd-link" data-spec="' + esc(g.spec) + '">' + esc(g.spec) + '</span></td>' +
        '<td class="rd-num">' + g.total + '</td><td class="rd-num rd-pass">' + g.passed + '</td>' +
        '<td class="rd-num ' + (g.failed ? 'rd-fail' : '') + '">' + g.failed + '</td><td class="rd-num">' + g.skipped + '</td>' +
        '<td class="rd-num">' + fmt(g.duration) + '</td><td>' + bar(g.passed, g.failed, g.skipped, g.total) + '</td></tr>';
    }).join('') + '</tbody></table></div></section>';

  html += '<section class="rd-section" id="rd-tests"><h2>All tests</h2>' +
    '<div class="rd-filters">' +
      '<button class="rd-chip rd-on" data-state="all">All (' + total + ')</button>' +
      '<button class="rd-chip" data-state="passed">Passed (' + passed + ')</button>' +
      '<button class="rd-chip" data-state="failed">Failed (' + failed + ')</button>' +
      '<button class="rd-chip" data-state="skipped">Skipped (' + skipped + ')</button>' +
      (flaky ? '<button class="rd-chip" data-state="flaky">Flaky (' + flaky + ')</button>' : '') +
      '<select id="rd-spec"><option value="">All specs</option>' + specList.map(function(g){ return '<option>' + esc(g.spec) + '</option>'; }).join('') + '</select>' +
      '<select id="rd-sort"><option value="spec">Sort: spec order</option><option value="slow">Sort: slowest first</option><option value="name">Sort: name A–Z</option></select>' +
      '<input id="rd-search" type="search" placeholder="Search test, suite or error text">' +
      '<span class="rd-count" id="rd-count"></span>' +
    '</div><div class="rd-scroll"><table class="rd-table"><thead><tr><th style="width:90px">Status</th><th>Test</th><th>Spec</th><th class="rd-num" style="width:90px">Duration</th></tr></thead>' +
    '<tbody id="rd-rows"></tbody></table></div></section>';
  root.innerHTML = html;

  var state = failed ? 'failed' : 'all', spec = '', query = '', sort = 'spec';
  function render(){
    var q = query.toLowerCase();
    var list = tests.filter(function(t){
      if (state === 'flaky') { if (!t.flaky) return false; }
      else if (state === 'skipped' ?(t.state === 'passed' || t.state === 'failed') : (state !== 'all' && t.state !== state)) return false;
      if (spec && t.spec !== spec) return false;
      if (q && (t.title + ' ' + t.suite + ' ' + t.error + ' ' + t.spec).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    if (sort === 'slow') list = list.slice().sort(function(a,b){ return b.duration - a.duration; });
    if (sort === 'name') list = list.slice().sort(function(a,b){ return a.title.localeCompare(b.title); });
    document.getElementById('rd-count').textContent = 'Showing ' + list.length + ' of ' + total;
    document.getElementById('rd-rows').innerHTML = list.length ? list.map(function(t){
      return '<tr><td><span class="rd-pill ' + t.state + '">' + t.state + '</span>' + (t.flaky ? ' <span class="rd-pill pending" title="Failed before passing on a re-run">flaky</span>' : '') + '</td>' +
        '<td><div>' + esc(t.title) + '</div><div class="rd-suite">' + esc(t.suite) + '</div>' +
        (t.error ? '<div class="rd-err">' + esc(t.error) + '</div>' : '') +
        (t.screenshot ? '<img class="rd-shot" loading="lazy" alt="Screenshot at failure" src="' + t.screenshot + '">' : '') + '</td>' +
        '<td>' + esc(t.spec) + '</td><td class="rd-num">' + fmt(t.duration) + '</td></tr>';
    }).join('') : '<tr><td colspan="4" class="rd-empty">No tests match these filters</td></tr>';
    [].forEach.call(document.querySelectorAll('.rd-chip'), function(b){ b.classList.toggle('rd-on', b.getAttribute('data-state') === state); });
  }

  root.addEventListener('click', function(e){
    var chip = e.target.closest('.rd-chip');
    if (chip) { state = chip.getAttribute('data-state'); render(); return; }
    var link = e.target.closest('.rd-link');
    if (link) { spec = link.getAttribute('data-spec'); document.getElementById('rd-spec').value = spec; state = 'all'; render(); document.getElementById('rd-tests').scrollIntoView({behavior:'smooth'}); return; }
    if (e.target.classList.contains('rd-shot')) window.open().document.write('<img src="' + e.target.src + '" style="max-width:100%">');
  });
  document.getElementById('rd-spec').addEventListener('change', function(e){ spec = e.target.value; render(); });
  document.getElementById('rd-sort').addEventListener('change', function(e){ sort = e.target.value; render(); });
  document.getElementById('rd-search').addEventListener('input', function(e){ query = e.target.value; render(); });

  // Summary / detailed report tabs
  report.classList.add('rd-hidden');
  [].forEach.call(document.querySelectorAll('.rd-tab'), function(tab){
    tab.addEventListener('click', function(){
      var detail = tab.getAttribute('data-view') === 'detail';
      root.style.display = detail ? 'none' : '';
      report.classList.toggle('rd-hidden', !detail);
      [].forEach.call(document.querySelectorAll('.rd-tab'), function(t){ t.classList.toggle('rd-active', t === tab); });
    });
  });

  render();
});
`;

module.exports = { enhanceReport };

if (require.main === module) {
  const file = path.resolve(process.argv[2] || 'cypress/reports/index.html');
  console.log(enhanceReport(file) ? `Report enhanced: ${file}` : `Could not enhance ${file}`);
}
