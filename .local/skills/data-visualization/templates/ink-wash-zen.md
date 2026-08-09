---
name: ink-wash-zen
description: >-
  This "Ink Wash Zen" dashboard practices Japanese sumi-e minimalism on washi paper (#F7F4EC) with the faintest fiber texture (a very-low-opacity feTurbulence wash), sumi ink (#1C1C1C), and two gray washes (#8E8A82 and #C9C4B8); the single vermillion accent (#C63D2F) appears only as a small square hanko seal with a white mark inside and on key deltas and highlights. There are no cards — panels are open regions of paper divided by whisper-thin 1px rules, one tapered brush-stroke divider (an SVG path in ink at 85% opacity), and extremely generous asymmetric whitespace. Headings use Noto Serif JP 500/600 with a small decorative kanji eyebrow, while body text, labels, and numerals use Inter 400/500 with wide tracking on tiny uppercase labels. The layout is a fixed 1440×900 grid: a quiet header with filter-style controls, a 4-up KPI row, a two-thirds/one-third chart split, and a full-width table with airy rows. Charts are restrained inline SVG — a 2px ink line with softly tapered ends over a pale gray wash of an area fill, a lighter-gray companion series, hairline gridlines, and an enso-style donut ring left deliberately incomplete where a brush gap lets the paper show through, its legend set beneath. The overall aesthetic is meditative, weightless, and precise: a tea-house calm applied to product analytics, where every mark earns its place.
---

# Ink Wash Zen

This "Ink Wash Zen" dashboard practices Japanese sumi-e minimalism on washi paper (#F7F4EC) with the faintest fiber texture (a very-low-opacity feTurbulence wash), sumi ink (#1C1C1C), and two gray washes (#8E8A82 and #C9C4B8); the single vermillion accent (#C63D2F) appears only as a small square hanko seal with a white mark inside and on key deltas and highlights. There are no cards — panels are open regions of paper divided by whisper-thin 1px rules, one tapered brush-stroke divider (an SVG path in ink at 85% opacity), and extremely generous asymmetric whitespace. Headings use Noto Serif JP 500/600 with a small decorative kanji eyebrow, while body text, labels, and numerals use Inter 400/500 with wide tracking on tiny uppercase labels. The layout is a fixed 1440×900 grid: a quiet header with filter-style controls, a 4-up KPI row, a two-thirds/one-third chart split, and a full-width table with airy rows. Charts are restrained inline SVG — a 2px ink line with softly tapered ends over a pale gray wash of an area fill, a lighter-gray companion series, hairline gridlines, and an enso-style donut ring left deliberately incomplete where a brush gap lets the paper show through, its legend set beneath. The overall aesthetic is meditative, weightless, and precise: a tea-house calm applied to product analytics, where every mark earns its place.

## Source Code

A self-contained reference implementation of the "Ink Wash Zen" dashboard
preview. Use it as the visual target — translate the palette, typography, and
layout into the data-visualization React + Tailwind + Recharts app.
The fixed 1440×900 frame and hand-drawn inline-SVG charts below are
preview-rendering artifacts — keep the generated app's layout responsive
and build every chart with Recharts.

Responsive adaptation: In this ink-wash zen dashboard, preserve generous washi margins and hairline dividers at every breakpoint: KPIs should fluidly reflow via auto-fit minmax rather than hard 4→2→1 jumps, the 2fr/1fr chart split should stack below ~960px with the donut centering and its legend becoming a full-width list. SVG chart and brush-stroke artwork must scale with aspect-ratio (never preserveAspectRatio='none') so ink strokes keep their weight, and the table must remain horizontally scrollable under a wrapping panel-head on phones. Decorative elements like the hanko seal and title block should scale up with clamp() on ultra-wide screens so the composition stays balanced rather than marooned inside the 1440px cap.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1440, initial-scale=1">
<title>Sumi — Ink Wash Zen</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@500;600&family=Inter:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root{
    --washi:#F7F4EC;
    --ink:#1C1C1C;
    --gray:#8E8A82;
    --wash:#C9C4B8;
    --hair:#E3DFD5;
    --verm:#C63D2F;
    --serif:'Noto Serif JP', 'Hiragino Mincho ProN', serif;
    --sans:'Inter', 'Helvetica Neue', Arial, sans-serif;
  }
  *{box-sizing:border-box}
  html,body{margin:0}
  body{
    width:1440px;height:900px;overflow:hidden;
    background:var(--washi);color:var(--ink);
    font-family:var(--sans);
  }
  .fiber{position:fixed;inset:0;opacity:.035;pointer-events:none}
  .page{position:relative;z-index:1;height:900px;padding:42px 64px 0;display:flex;flex-direction:column}

  /* Header */
  header{display:flex;justify-content:space-between;align-items:flex-end}
  .eyebrow{font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:var(--gray);margin-bottom:10px}
  .eyebrow .kanji{font-family:var(--serif);font-size:12px;letter-spacing:.1em;margin-right:10px}
  .titlerow{display:flex;align-items:center;gap:16px}
  .title{font-family:var(--serif);font-weight:600;font-size:29px;letter-spacing:.01em}
  .hanko{width:34px;height:34px;background:var(--verm);color:#FFFFFF;font-family:var(--serif);font-size:17px;display:flex;align-items:center;justify-content:center;border-radius:2px}
  .controls{display:flex;gap:30px;padding-bottom:4px}
  .ctl{font-size:12px;color:var(--ink);padding:5px 2px;border-bottom:1px solid var(--wash);letter-spacing:.03em;display:flex;align-items:center;gap:7px}
  .ctl .chev{font-size:8px;color:var(--gray)}
  .inkdot{width:6px;height:6px;border-radius:50%;background:var(--ink)}

  /* Brush divider */
  .brush{display:block;margin:16px 0 22px}

  /* KPI row */
  .kpis{display:grid;grid-template-columns:1.25fr 1fr 1fr 1fr;gap:44px}
  .kpi{border-top:1px solid var(--wash);padding-top:13px}
  .kpi:first-child{border-top-color:var(--ink)}
  .k-lbl{font-size:9.5px;letter-spacing:.24em;text-transform:uppercase;color:var(--gray)}
  .k-val{font-family:var(--serif);font-weight:500;font-size:30px;margin:8px 0 4px}
  .delta{font-size:11px;font-weight:500}
  .up{color:var(--ink)}.down{color:var(--verm)}
  .since{color:var(--gray);font-weight:400;margin-left:5px}

  /* Charts */
  .charts{display:grid;grid-template-columns:2fr 1fr;gap:56px;margin-top:30px}
  .panel-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px}
  .panel-title{font-family:var(--serif);font-weight:500;font-size:18px}
  .panel-sub{font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:var(--gray)}
  .legend{display:flex;gap:20px;font-size:10.5px;color:var(--gray);margin-top:8px}
  .legend span{display:inline-flex;align-items:center;gap:7px}
  .lsw{display:inline-block;width:16px;height:0;border-top:2px solid var(--ink)}
  .lsw.soft{border-top:1.5px solid var(--wash)}

  /* Enso donut */
  .donut-wrap{display:flex;flex-direction:column;align-items:center}
  .dl{width:100%;margin-top:10px}
  .dl-row{display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:5px 0;border-bottom:1px solid var(--hair)}
  .dl-row:last-child{border-bottom:none}
  .dl-name{display:flex;align-items:center;gap:9px}
  .dl-name i{width:8px;height:8px;border-radius:50%;display:inline-block}
  .dl-name i.open{background:var(--washi);border:1px solid var(--wash)}
  .dl-val{font-weight:500;font-variant-numeric:tabular-nums}

  /* Table */
  .table-wrap{margin-top:26px}
  table{width:100%;border-collapse:collapse;font-size:12.5px}
  thead th{text-align:left;font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:var(--gray);font-weight:500;padding:9px 0;border-bottom:1px solid var(--ink)}
  tbody td{padding:10px 0;border-bottom:1px solid var(--hair)}
  tbody tr:last-child td{border-bottom:none}
  td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
  .prog{font-family:var(--serif);font-weight:500;font-size:14px}
  .pos{color:var(--ink);font-weight:500}
  .neg{color:var(--verm);font-weight:500}
</style>
</head>
<body>
  <!-- Washi fiber texture -->
  <svg class="fiber" width="1440" height="900">
    <filter id="fiber"><feTurbulence type="fractalNoise" baseFrequency="0.008 0.28" numOctaves="3" seed="4"/><feColorMatrix type="saturate" values="0"/></filter>
    <rect width="1440" height="900" filter="url(#fiber)"/>
  </svg>

  <div class="page">
    <!-- Header -->
    <header>
      <div>
        <div class="eyebrow"><span class="kanji">分析</span>Spring Term Review</div>
        <div class="titlerow">
          <div class="title">Sumi Studio Analytics</div>
          <div class="hanko">禅</div>
        </div>
      </div>
      <div class="controls">
        <div class="ctl">April 2026 <span class="chev">▼</span></div>
        <div class="ctl">All Studios <span class="chev">▼</span></div>
        <div class="ctl"><span class="inkdot"></span>Live</div>
      </div>
    </header>

    <!-- Brush divider -->
    <svg class="brush" width="100%" height="12" viewBox="0 0 1312 12" preserveAspectRatio="none">
      <path d="M0,7.2 C160,4.4 360,3.2 560,4.6 C820,6.4 1060,8.2 1200,6.8 C1260,6.2 1300,6.4 1312,6.7 L1312,7.4 C1240,8.6 1120,9.4 940,9.2 C700,8.9 420,7.8 220,8.3 C120,8.5 40,8.2 0,7.9 Z" fill="#1C1C1C" opacity=".85"/>
    </svg>

    <!-- KPIs -->
    <div class="kpis">
      <div class="kpi">
        <div class="k-lbl">Sessions</div>
        <div class="k-val">68,412</div>
        <div class="delta up">▲ 7.8%<span class="since">vs last term</span></div>
      </div>
      <div class="kpi">
        <div class="k-lbl">90-Day Retention</div>
        <div class="k-val">64.2%</div>
        <div class="delta up">▲ 2.1%<span class="since">vs last term</span></div>
      </div>
      <div class="kpi">
        <div class="k-lbl">Studio Bookings</div>
        <div class="k-val">1,842</div>
        <div class="delta up">▲ 5.4%<span class="since">vs last term</span></div>
      </div>
      <div class="kpi">
        <div class="k-lbl">Avg Session</div>
        <div class="k-val">23m 40s</div>
        <div class="delta down">▼ 0.9%<span class="since">vs last term</span></div>
      </div>
    </div>

    <!-- Charts -->
    <div class="charts">
      <!-- Sessions line -->
      <div>
        <div class="panel-head">
          <div class="panel-title">Daily Sessions</div>
          <div class="panel-sub">April · All Studios</div>
        </div>
        <svg viewBox="0 0 760 300" width="100%" height="296" preserveAspectRatio="none" style="display:block">
          <defs>
            <linearGradient id="inkwash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#8E8A82" stop-opacity=".2"/>
              <stop offset="100%" stop-color="#8E8A82" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <!-- hairline grid -->
          <g stroke="#E6E2D8" stroke-width="1">
            <line x1="0" y1="40" x2="760" y2="40"/>
            <line x1="0" y1="95" x2="760" y2="95"/>
            <line x1="0" y1="150" x2="760" y2="150"/>
            <line x1="0" y1="205" x2="760" y2="205"/>
            <line x1="0" y1="260" x2="760" y2="260"/>
          </g>
          <!-- gray wash under ink line -->
          <path d="M0,200 L62,192 L123,196 L185,180 L247,184 L308,168 L370,172 L432,156 L493,162 L555,148 L617,152 L678,138 L740,132 L740,260 L0,260 Z" fill="url(#inkwash)"/>
          <!-- guided programs, lighter wash -->
          <polyline fill="none" stroke="#C9C4B8" stroke-width="1.5" stroke-linecap="round" points="0,236 62,230 123,232 185,222 247,226 308,214 370,218 432,208 493,212 555,202 617,206 678,196 740,192"/>
          <!-- all sessions, ink brush line -->
          <polyline fill="none" stroke="#1C1C1C" stroke-width="2" stroke-linecap="round" points="0,200 62,192 123,196 185,180 247,184 308,168 370,172 432,156 493,162 555,148 617,152 678,138 740,132"/>
          <!-- tapered brush tip -->
          <path d="M740,132 C748,130.6 754,129.6 758,128" fill="none" stroke="#1C1C1C" stroke-width=".9" stroke-linecap="round"/>
          <g fill="#1C1C1C"><circle cx="740" cy="132" r="2.5"/></g>
          <!-- y labels last + washi halo, so the ink line can't obscure them -->
          <g fill="#8E8A82" font-family="Inter,sans-serif" font-size="9" stroke="#F7F4EC" stroke-width="3" paint-order="stroke">
            <text x="2" y="36">3.6K</text><text x="2" y="91">3.0K</text><text x="2" y="146">2.4K</text><text x="2" y="201">1.8K</text><text x="2" y="256">1.2K</text>
          </g>
          <!-- day labels -->
          <g fill="#8E8A82" font-family="Inter,sans-serif" font-size="9" letter-spacing="1">
            <text x="0" y="290">APR 01</text>
            <text x="185" y="290" text-anchor="middle">APR 08</text>
            <text x="370" y="290" text-anchor="middle">APR 15</text>
            <text x="555" y="290" text-anchor="middle">APR 22</text>
            <text x="740" y="290" text-anchor="end">APR 29</text>
          </g>
        </svg>
        <div class="legend">
          <span><i class="lsw"></i>All sessions</span>
          <span><i class="lsw soft"></i>Guided programs</span>
        </div>
      </div>

      <!-- Enso donut -->
      <div>
        <div class="panel-head">
          <div class="panel-title">Program Mix</div>
          <div class="panel-sub">Bookings</div>
        </div>
        <div class="donut-wrap">
          <svg viewBox="0 0 200 200" width="194" height="194">
            <!-- enso segments via stroke-dasharray, circumference ≈ 502 (r=80); the 12% gap is the paper -->
            <g transform="translate(100,100)" fill="none">
              <circle r="80" stroke="#1C1C1C" stroke-width="24" stroke-dasharray="221 281" transform="rotate(-54)"/>
              <circle r="80" stroke="#8E8A82" stroke-width="20" stroke-dasharray="131 371" stroke-dashoffset="-221" transform="rotate(-54)"/>
              <circle r="80" stroke="#C9C4B8" stroke-width="17" stroke-dasharray="90 412" stroke-dashoffset="-352" transform="rotate(-54)"/>
              <circle r="80" stroke="#F7F4EC" stroke-width="24" stroke-dasharray="60 442" stroke-dashoffset="-442" transform="rotate(-54)"/>
            </g>
            <text x="100" y="98" text-anchor="middle" font-family="Noto Serif JP,serif" font-size="22" font-weight="500" fill="#1C1C1C">1,842</text>
            <text x="100" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="9" letter-spacing="2" fill="#8E8A82">bookings</text>
          </svg>
          <div class="dl">
            <div class="dl-row"><span class="dl-name"><i style="background:#1C1C1C"></i>Meditation</span><span class="dl-val">44% · 810</span></div>
            <div class="dl-row"><span class="dl-name"><i style="background:#8E8A82"></i>Movement</span><span class="dl-val">26% · 479</span></div>
            <div class="dl-row"><span class="dl-name"><i style="background:#C9C4B8"></i>Breathwork</span><span class="dl-val">18% · 332</span></div>
            <div class="dl-row"><span class="dl-name"><i class="open"></i>Open studio</span><span class="dl-val">12% · 221</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="table-wrap">
      <div class="panel-head" style="margin-bottom:0">
        <div class="panel-title" style="font-size:16px">Studio Ledger</div>
        <div class="panel-sub">Top programs · Spring term</div>
      </div>
      <table>
        <thead>
          <tr><th>Program</th><th>Studio</th><th class="num">Sessions</th><th class="num">Retention</th><th class="num">MoM Δ</th></tr>
        </thead>
        <tbody>
          <tr><td class="prog">Morning Zazen</td><td>Kyoto Room</td><td class="num">18,240</td><td class="num">71.4%</td><td class="num pos">+6.2%</td></tr>
          <tr><td class="prog">Moon Flow</td><td>Garden Studio</td><td class="num">14,860</td><td class="num">66.8%</td><td class="num pos">+3.9%</td></tr>
          <tr><td class="prog">Breath &amp; Stillness</td><td>Kyoto Room</td><td class="num">9,420</td><td class="num">61.2%</td><td class="num pos">+1.4%</td></tr>
          <tr><td class="prog">Evening Unwind</td><td>River Annex</td><td class="num">7,180</td><td class="num">54.6%</td><td class="num neg">−2.8%</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
```
