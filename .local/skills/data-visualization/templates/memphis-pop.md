---
name: memphis-pop
description: >-
  This "Memphis Pop" dashboard plays 1980s Memphis design straight enough to stay legible: a soft cream base (#FFF6EC) scattered with sparse confetti decor — tiny squiggles, triangles, dots, and arcs held to the page edges, never behind text. Cards are white with 2px ink borders, a 14px radius, and hard offset shadows in alternating palette colors (5px 5px 0), and one KPI card is rotated -2deg like a sticker. The accent palette is hot pink #FF4D8D, teal #00B3A4, sunshine #FFC53D, and grape #7C5CFF; text is near-black ink #14121F with gray-mauve #7A7488 labels, teal reserved for good deltas and pink for bad ones. Headings use "Baloo 2" (600/700) while body, labels, and numerals use Nunito (500/600); the layout is a fixed 1440×900 grid with a playful header plus pill filter controls, a 4-card KPI row, a 2/3 + 1/3 chart split, and a full-width table. Charts are inline SVG with chunky 3px lines and big dot markers, bars with rounded tops in alternating palette colors, and a multicolor donut with white gaps, with legend chips rendered as mini pills; table rows are separated by dashed rules with pink/teal delta values. The overall aesthetic is candy-bright postmodern pop: bouncy shapes and hard shadows kept on a disciplined grid, like a Memphis Group poster running a consumer app's analytics.
---

# Memphis Pop

This "Memphis Pop" dashboard plays 1980s Memphis design straight enough to stay legible: a soft cream base (#FFF6EC) scattered with sparse confetti decor — tiny squiggles, triangles, dots, and arcs held to the page edges, never behind text. Cards are white with 2px ink borders, a 14px radius, and hard offset shadows in alternating palette colors (5px 5px 0), and one KPI card is rotated -2deg like a sticker. The accent palette is hot pink #FF4D8D, teal #00B3A4, sunshine #FFC53D, and grape #7C5CFF; text is near-black ink #14121F with gray-mauve #7A7488 labels, teal reserved for good deltas and pink for bad ones. Headings use "Baloo 2" (600/700) while body, labels, and numerals use Nunito (500/600); the layout is a fixed 1440×900 grid with a playful header plus pill filter controls, a 4-card KPI row, a 2/3 + 1/3 chart split, and a full-width table. Charts are inline SVG with chunky 3px lines and big dot markers, bars with rounded tops in alternating palette colors, and a multicolor donut with white gaps, with legend chips rendered as mini pills; table rows are separated by dashed rules with pink/teal delta values. The overall aesthetic is candy-bright postmodern pop: bouncy shapes and hard shadows kept on a disciplined grid, like a Memphis Group poster running a consumer app's analytics.

## Source Code

A self-contained reference implementation of the "Memphis Pop" dashboard
preview. Use it as the visual target — translate the palette, typography, and
layout into the data-visualization React + Tailwind + Recharts app.
The fixed 1440×900 frame and hand-drawn inline-SVG charts below are
preview-rendering artifacts — keep the generated app's layout responsive
and build every chart with Recharts.

Responsive adaptation: This playful Memphis-pop dashboard should stack aggressively on phones: header brand row above a full-width wrapping pill control grid, KPIs collapsing 4→2→1 with hard-shadow offsets shrinking from 5px to 3px, and the 2fr/1fr chart split becoming a single column below 1024px with the donut centered above its legend. Charts must use proportional SVG scaling (preserveAspectRatio=meet + aspect-ratio boxes) so bars and rings keep their rounded, chunky character at every width, and the data table should live inside a horizontally scrolling wrapper with a visible fade/scrollbar hint below ~600px. On ultrawide screens (>1800px) cap the app around 1800px, keep confetti as a tiled repeating pattern rather than a stretched hero SVG, and let KPI/skeleton widths use px-based clamps so the loading state doesn't look sparse.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1440, initial-scale=1">
<title>Blip! — Consumer App Pulse</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700&family=Nunito:wght@500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#FFF6EC; --ink:#14121F; --pink:#FF4D8D; --teal:#00B3A4; --sun:#FFC53D; --grape:#7C5CFF;
    --muted:#7A7488; --pinkdark:#D6246E; --tealdark:#00806F;
    --head:'Baloo 2',Verdana,sans-serif;
    --body:'Nunito',Verdana,sans-serif;
  }
  *{box-sizing:border-box}
  html,body{margin:0}
  body{width:1440px;height:900px;overflow:hidden;background:var(--bg);color:var(--ink);font-family:var(--body);position:relative}

  /* Confetti decor */
  .confetti{position:absolute;inset:0;z-index:0}

  .app{position:relative;z-index:1;height:900px;padding:26px 40px;display:flex;flex-direction:column;gap:16px}

  /* Cards */
  .card{background:#fff;border:2px solid var(--ink);border-radius:14px}
  .sh-pink{box-shadow:5px 5px 0 var(--pink)}
  .sh-teal{box-shadow:5px 5px 0 var(--teal)}
  .sh-sun{box-shadow:5px 5px 0 var(--sun)}
  .sh-grape{box-shadow:5px 5px 0 var(--grape)}

  /* Header */
  header{display:flex;justify-content:space-between;align-items:center}
  .brand{display:flex;align-items:center;gap:14px}
  .logo{width:46px;height:46px;border-radius:50%;background:var(--pink);border:2px solid var(--ink);box-shadow:3px 3px 0 var(--sun);display:flex;align-items:center;justify-content:center;font-family:var(--head);font-weight:700;font-size:19px;color:#fff}
  .brand h1{margin:0;font-family:var(--head);font-weight:700;font-size:25px;line-height:1.1}
  .brand p{margin:0;font-size:12px;font-weight:600;color:var(--muted)}
  .controls{display:flex;gap:14px}
  .ctl{background:#fff;border:2px solid var(--ink);border-radius:999px;padding:8px 18px;font-family:var(--head);font-weight:700;font-size:13px;display:flex;align-items:center;gap:8px}
  .dot{width:9px;height:9px;border-radius:50%;background:var(--teal)}
  .chev{font-size:10px;color:var(--muted)}

  /* KPI row */
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:22px}
  .kpi{padding:16px 18px}
  .kpi .lbl{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
  .kpi .val{font-family:var(--head);font-weight:700;font-size:33px;line-height:1.1;margin:4px 0 6px}
  .tilt{transform:rotate(-2deg)}
  .delta{display:inline-block;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:700}
  .delta.up{color:var(--tealdark);background:rgba(0,179,164,.14)}
  .delta.down{color:var(--pinkdark);background:rgba(255,77,141,.14)}

  /* Chart panels */
  .charts{display:grid;grid-template-columns:2fr 1fr;gap:22px;flex:1;min-height:0}
  .panel{padding:16px 18px;display:flex;flex-direction:column;min-height:0}
  .panel-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}
  .panel-title{font-family:var(--head);font-weight:700;font-size:18px}
  .panel-sub{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
  .legend{display:flex;gap:10px;margin-top:8px}
  .lg-pill{display:inline-flex;align-items:center;gap:7px;border:2px solid var(--ink);border-radius:999px;padding:3px 12px;font-size:11px;font-weight:700;background:#fff}
  .lg-pill i{width:9px;height:9px;border-radius:50%;display:inline-block}

  /* Donut */
  .donut-wrap{display:flex;flex-direction:column;align-items:center;flex:1;min-height:0}
  .donut-legend{width:100%;margin-top:8px}
  .dl-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:2px dashed rgba(20,18,31,.14)}
  .dl-row:last-child{border-bottom:none}
  .dl-name{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700}
  .dl-name i{width:10px;height:10px;border-radius:50%;display:inline-block}
  .dl-val{font-weight:700;font-size:13px}

  /* Table */
  .tablewrap{padding:14px 18px 10px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  thead th{text-align:left;font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);padding:6px 0;border-bottom:2px solid var(--ink)}
  tbody td{padding:8px 0;border-bottom:2px dashed rgba(20,18,31,.16)}
  tbody tr:last-child td{border-bottom:none}
  td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
  td.num{font-weight:600}
  .feat{font-weight:700}
  .cat{display:inline-block;border-radius:999px;padding:3px 12px;font-size:11px;font-weight:700}
  .cat-pink{background:rgba(255,77,141,.16);color:var(--pinkdark)}
  .cat-teal{background:rgba(0,179,164,.16);color:var(--tealdark)}
  .cat-sun{background:rgba(255,197,61,.28);color:#8A6400}
  .cat-grape{background:rgba(124,92,255,.16);color:#5A3DD4}
  .pos{color:var(--tealdark);font-weight:700}
  .neg{color:var(--pinkdark);font-weight:700}
</style>
</head>
<body>
  <!-- Confetti decor (edges only) -->
  <svg class="confetti" width="1440" height="900" viewBox="0 0 1440 900" fill="none">
    <path d="M140,18 q10,-14 20,0 t20,0" stroke="#FF4D8D" stroke-width="3" stroke-linecap="round"/>
    <circle cx="560" cy="14" r="5" fill="#7C5CFF"/>
    <path d="M930,8 l16,10 -18,8 z" fill="#FFC53D"/>
    <path d="M1270,22 a14,14 0 0 1 14,-14" stroke="#00B3A4" stroke-width="3" stroke-linecap="round"/>
    <circle cx="1418" cy="240" r="4" fill="#FF4D8D"/>
    <path d="M1402,470 q11,-12 22,0" stroke="#7C5CFF" stroke-width="3" stroke-linecap="round"/>
    <path d="M1408,660 l14,9 -16,7 z" fill="#00B3A4"/>
    <path d="M170,886 a13,13 0 0 0 13,-13" stroke="#FFC53D" stroke-width="3" stroke-linecap="round"/>
    <circle cx="720" cy="884" r="5" fill="#00B3A4"/>
    <path d="M1060,882 q10,-13 20,0 t20,0" stroke="#FF4D8D" stroke-width="3" stroke-linecap="round"/>
    <circle cx="20" cy="320" r="4" fill="#FFC53D"/>
    <path d="M10,540 l15,9 -17,8 z" fill="#FF4D8D"/>
    <path d="M16,710 a14,14 0 0 1 14,-14" stroke="#00B3A4" stroke-width="3" stroke-linecap="round"/>
  </svg>

  <div class="app">
    <!-- Header -->
    <header>
      <div class="brand">
        <div class="logo">B!</div>
        <div>
          <h1>Blip! Analytics</h1>
          <p>Consumer app pulse · All platforms</p>
        </div>
      </div>
      <div class="controls">
        <div class="ctl sh-sun" style="box-shadow:3px 3px 0 var(--sun)">Last 8 weeks <span class="chev">▼</span></div>
        <div class="ctl" style="box-shadow:3px 3px 0 var(--grape)">All platforms <span class="chev">▼</span></div>
        <div class="ctl" style="box-shadow:3px 3px 0 var(--pink)"><span class="dot"></span>Live</div>
      </div>
    </header>

    <!-- KPIs -->
    <div class="kpis">
      <div class="card kpi sh-pink">
        <div class="lbl">Downloads</div>
        <div class="val">1.24M</div>
        <span class="delta up">▲ 18.2%</span>
      </div>
      <div class="card kpi sh-teal">
        <div class="lbl">Daily Active Users</div>
        <div class="val">386K</div>
        <span class="delta up">▲ 7.4%</span>
      </div>
      <div class="card kpi sh-sun tilt">
        <div class="lbl">IAP Revenue</div>
        <div class="val">$214K</div>
        <span class="delta up">▲ 11.9%</span>
      </div>
      <div class="card kpi sh-grape">
        <div class="lbl">Avg Session</div>
        <div class="val">6m 12s</div>
        <span class="delta down">▼ 2.1%</span>
      </div>
    </div>

    <!-- Charts -->
    <div class="charts">
      <div class="card panel sh-teal">
        <div class="panel-head">
          <div class="panel-title">Downloads &amp; Daily Actives</div>
          <div class="panel-sub">Last 8 Weeks</div>
        </div>
        <svg viewBox="0 0 760 250" width="100%" height="100%" preserveAspectRatio="none" style="display:block;flex:1;min-height:0">
          <defs>
            <clipPath id="barclip"><rect x="0" y="0" width="760" height="210"/></clipPath>
          </defs>
          <!-- gridlines -->
          <g stroke="rgba(20,18,31,.08)" stroke-width="1">
            <line x1="0" y1="30" x2="760" y2="30"/>
            <line x1="0" y1="75" x2="760" y2="75"/>
            <line x1="0" y1="120" x2="760" y2="120"/>
            <line x1="0" y1="165" x2="760" y2="165"/>
            <line x1="0" y1="210" x2="760" y2="210"/>
          </g>
          <!-- rounded-top bars: weekly downloads (bottoms squared by clip) -->
          <g clip-path="url(#barclip)">
            <rect x="30" y="120" width="46" height="106" rx="10" fill="#FF4D8D"/>
            <rect x="122" y="100" width="46" height="126" rx="10" fill="#00B3A4"/>
            <rect x="214" y="128" width="46" height="98" rx="10" fill="#FFC53D"/>
            <rect x="306" y="84" width="46" height="142" rx="10" fill="#7C5CFF"/>
            <rect x="398" y="96" width="46" height="130" rx="10" fill="#FF4D8D"/>
            <rect x="490" y="64" width="46" height="162" rx="10" fill="#00B3A4"/>
            <rect x="582" y="76" width="46" height="150" rx="10" fill="#FFC53D"/>
            <rect x="674" y="44" width="46" height="182" rx="10" fill="#7C5CFF"/>
          </g>
          <!-- chunky ink line with big grape dots: daily actives -->
          <polyline fill="none" stroke="#14121F" stroke-width="3" points="53,150 145,138 237,146 329,118 421,126 513,96 605,104 697,78"/>
          <g fill="#7C5CFF" stroke="#fff" stroke-width="2">
            <circle cx="53" cy="150" r="5.5"/><circle cx="145" cy="138" r="5.5"/><circle cx="237" cy="146" r="5.5"/><circle cx="329" cy="118" r="5.5"/>
            <circle cx="421" cy="126" r="5.5"/><circle cx="513" cy="96" r="5.5"/><circle cx="605" cy="104" r="5.5"/><circle cx="697" cy="78" r="5.5"/>
          </g>
          <!-- x labels -->
          <g fill="#7A7488" font-family="Nunito,sans-serif" font-size="11" font-weight="600" text-anchor="middle">
            <text x="53" y="236">W1</text><text x="145" y="236">W2</text><text x="237" y="236">W3</text><text x="329" y="236">W4</text>
            <text x="421" y="236">W5</text><text x="513" y="236">W6</text><text x="605" y="236">W7</text><text x="697" y="236">W8</text>
          </g>
        </svg>
        <div class="legend">
          <span class="lg-pill"><i style="background:#FF4D8D"></i>Downloads (bars)</span>
          <span class="lg-pill"><i style="background:#7C5CFF"></i>Daily actives (line)</span>
        </div>
      </div>

      <div class="card panel sh-pink">
        <div class="panel-head">
          <div class="panel-title">Revenue by Feature</div>
          <div class="panel-sub">This Month</div>
        </div>
        <div class="donut-wrap">
          <svg viewBox="0 0 200 200" width="176" height="176">
            <!-- donut segments via stroke-dasharray, circumference ≈502 (r=80), white gaps -->
            <g transform="translate(100,100)" fill="none" stroke-width="30">
              <circle r="80" stroke="#FF4D8D" stroke-dasharray="165 337" transform="rotate(-90)"/>
              <circle r="80" stroke="#00B3A4" stroke-dasharray="125 377" stroke-dashoffset="-171" transform="rotate(-90)"/>
              <circle r="80" stroke="#FFC53D" stroke-dasharray="104 398" stroke-dashoffset="-302" transform="rotate(-90)"/>
              <circle r="80" stroke="#7C5CFF" stroke-dasharray="84 418" stroke-dashoffset="-412" transform="rotate(-90)"/>
            </g>
            <text x="100" y="98" text-anchor="middle" font-family="Baloo 2,sans-serif" font-size="26" font-weight="700" fill="#14121F">$214K</text>
            <text x="100" y="116" text-anchor="middle" font-family="Nunito,sans-serif" font-size="10" font-weight="700" fill="#7A7488">IAP THIS MONTH</text>
          </svg>
          <div class="donut-legend">
            <div class="dl-row"><span class="dl-name"><i style="background:#FF4D8D"></i>Stickers</span><span class="dl-val">34%</span></div>
            <div class="dl-row"><span class="dl-name"><i style="background:#00B3A4"></i>Filters</span><span class="dl-val">26%</span></div>
            <div class="dl-row"><span class="dl-name"><i style="background:#FFC53D"></i>Premium</span><span class="dl-val">22%</span></div>
            <div class="dl-row"><span class="dl-name"><i style="background:#7C5CFF"></i>Boosts</span><span class="dl-val">18%</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="card tablewrap sh-grape">
      <div class="panel-head" style="margin-bottom:2px">
        <div class="panel-title">Top Features</div>
        <div class="panel-sub">Week over Week</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>Category</th>
            <th class="num">Users</th>
            <th class="num">Revenue</th>
            <th class="num">WoW Δ</th>
          </tr>
        </thead>
        <tbody>
          <tr><td class="feat">Sticker Studio</td><td><span class="cat cat-pink">Create</span></td><td class="num">214,800</td><td class="num">$72,400</td><td class="num pos">+21.4%</td></tr>
          <tr><td class="feat">Neon Filters</td><td><span class="cat cat-pink">Create</span></td><td class="num">189,300</td><td class="num">$56,100</td><td class="num pos">+9.8%</td></tr>
          <tr><td class="feat">Squad Chat</td><td><span class="cat cat-grape">Social</span></td><td class="num">156,700</td><td class="num">$38,900</td><td class="num pos">+4.2%</td></tr>
          <tr><td class="feat">Boost Packs</td><td><span class="cat cat-teal">Growth</span></td><td class="num">98,200</td><td class="num">$31,600</td><td class="num neg">−3.5%</td></tr>
          <tr><td class="feat">Premium Pass</td><td><span class="cat cat-sun">Subscribe</span></td><td class="num">64,500</td><td class="num">$15,000</td><td class="num pos">+12.1%</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
```
