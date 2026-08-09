---
name: riso-print
description: >-
  This "Riso Print" dashboard mimics a two-ink risograph zine printed on warm paper (#FAF7F0) with visible grain from a low-opacity feTurbulence overlay; the only inks are fluoro pink (#FF48B0) and riso blue (#2B50E0), which fake an overprint purple (#7B3BD1) where series overlap, and every muted tone is simply a tint of the two inks (e.g. rgba(43,80,224,.62) for secondary text). Panels are paper rectangles with deliberate misregistration — a 2px blue border with a pink border offset a couple of pixels behind it — and the headline wears a 2px-offset pink shadow behind blue type. Headings are set in Archivo Black while every numeral, label, and table row uses Space Mono, giving the page a photocopied zine cadence. The layout is a fixed 1440×900 grid: a stamped header with filter-style controls, a 4-up KPI row, a two-thirds/one-third chart split, and a full-width table with blue rules and pink deltas. Charts are inline SVG pressed in the two inks — a 2.5px blue line over a pink area at ~55% opacity that multiplies into purple where they overlap, halftone-dot pattern fills, and a pink/blue/overprint donut. The overall aesthetic is loud, tactile, and hand-pulled: a DIY print-shop poster that still reads like a crisp analytics product.
---

# Riso Print

This "Riso Print" dashboard mimics a two-ink risograph zine printed on warm paper (#FAF7F0) with visible grain from a low-opacity feTurbulence overlay; the only inks are fluoro pink (#FF48B0) and riso blue (#2B50E0), which fake an overprint purple (#7B3BD1) where series overlap, and every muted tone is simply a tint of the two inks (e.g. rgba(43,80,224,.62) for secondary text). Panels are paper rectangles with deliberate misregistration — a 2px blue border with a pink border offset a couple of pixels behind it — and the headline wears a 2px-offset pink shadow behind blue type. Headings are set in Archivo Black while every numeral, label, and table row uses Space Mono, giving the page a photocopied zine cadence. The layout is a fixed 1440×900 grid: a stamped header with filter-style controls, a 4-up KPI row, a two-thirds/one-third chart split, and a full-width table with blue rules and pink deltas. Charts are inline SVG pressed in the two inks — a 2.5px blue line over a pink area at ~55% opacity that multiplies into purple where they overlap, halftone-dot pattern fills, and a pink/blue/overprint donut. The overall aesthetic is loud, tactile, and hand-pulled: a DIY print-shop poster that still reads like a crisp analytics product.

## Source Code

A self-contained reference implementation of the "Riso Print" dashboard
preview. Use it as the visual target — translate the palette, typography, and
layout into the data-visualization React + Tailwind + Recharts app.
The fixed 1440×900 frame and hand-drawn inline-SVG charts below are
preview-rendering artifacts — keep the generated app's layout responsive
and build every chart with Recharts.

Responsive adaptation: This riso-zine dashboard should stay on a single fluid column with generous paper gutters; collapse the 2fr/1fr chart row to stacked full-width panels by ~1024px, drop KPIs from 4→2→1 columns at 1024/560px, and route the 5-column table through a horizontal-scroll wrapper below ~720px with the scroll region bleeding to the panel edge. Keep decorative registration marks and grain purely as fixed background layers that hide under 480px, and let all SVGs (area chart, donut) scale via aspect-ratio + width:100% rather than fixed pixel dimensions or preserveAspectRatio=none so the print character survives from 360px to 2200px. Cap the zine at ~1600–1760px and scale shadows, gaps, and skeleton heights with clamp() so the hand-printed offset doesn't visually disappear on ultrawide displays.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1440, initial-scale=1">
<title>Pulp Press — Riso Print</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>
  :root{
    --paper:#FAF7F0;
    --pink:#FF48B0;
    --blue:#2B50E0;
    --purple:#7B3BD1;
    --blue60:rgba(43,80,224,.62);
    --rule:rgba(43,80,224,.28);
    --head:'Archivo Black', 'Arial Black', sans-serif;
    --mono:'Space Mono', 'Courier New', monospace;
  }
  *{box-sizing:border-box}
  html,body{margin:0}
  body{
    width:1440px;height:900px;overflow:hidden;
    background:var(--paper);color:var(--blue);
    font-family:var(--mono);
  }
  .grain{position:fixed;inset:0;opacity:.07;pointer-events:none}
  .regmark{position:fixed;bottom:8px;opacity:.55;pointer-events:none}
  .zine{position:relative;z-index:1;height:900px;padding:22px 32px;display:flex;flex-direction:column;gap:15px}

  /* Misregistered panel */
  .panel{background:var(--paper);border:2px solid var(--blue);box-shadow:3px 3px 0 var(--pink);padding:13px 16px}

  /* Header */
  header{display:flex;justify-content:space-between;align-items:center}
  .brand{display:flex;align-items:center;gap:14px}
  .mark{width:46px;height:46px;background:var(--blue);color:var(--paper);font-family:var(--head);font-size:21px;display:flex;align-items:center;justify-content:center;box-shadow:3px 3px 0 var(--pink)}
  .brand h1{font-family:var(--head);font-size:26px;margin:0;letter-spacing:.02em;text-transform:uppercase;color:var(--blue);text-shadow:2px 2px 0 var(--pink)}
  .brand p{margin:3px 0 0;font-size:11px;color:var(--blue60);font-style:italic}
  .controls{display:flex;gap:14px}
  .ctl{border:2px solid var(--blue);box-shadow:2px 2px 0 var(--pink);padding:7px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;display:flex;align-items:center;gap:7px}
  .ctl .chev{font-size:9px;color:var(--blue60)}
  .ctl.solid{background:var(--pink);border-color:var(--pink);color:var(--paper);box-shadow:2px 2px 0 var(--blue)}
  .ctl .dot{width:8px;height:8px;border-radius:50%;background:var(--paper)}

  /* KPI row */
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
  .kpi .lbl{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--blue60)}
  .kpi .val{font-family:var(--head);font-size:26px;margin:7px 0 5px;color:var(--blue)}
  .delta{font-size:11px;font-weight:700}
  .up{color:var(--blue)}
  .down{color:var(--pink)}

  /* Charts */
  .row{display:grid;grid-template-columns:2fr 1fr;gap:16px}
  .panel-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}
  .panel-head h2{font-family:var(--head);font-size:15px;margin:0;text-transform:uppercase;letter-spacing:.02em}
  .sub{font-size:10px;color:var(--blue60);text-transform:uppercase;letter-spacing:.1em}
  .legend{display:flex;gap:14px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;margin-top:6px}
  .legend span{display:inline-flex;align-items:center;gap:6px}
  .legend i{width:12px;height:12px;display:inline-block}

  /* Donut */
  .donut-wrap{display:flex;flex-direction:column;align-items:center}
  .dl{width:100%;margin-top:7px}
  .dl-row{display:flex;justify-content:space-between;align-items:center;font-size:11px;padding:5px 0;border-bottom:1px dashed var(--rule)}
  .dl-row:last-child{border-bottom:none}
  .dl-name{display:flex;align-items:center;gap:8px}
  .dl-name i{width:10px;height:10px;display:inline-block}
  .dl-val{font-weight:700}

  /* Table */
  table{width:100%;border-collapse:collapse;font-size:12px}
  thead th{text-align:left;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--blue);padding:6px 8px;border-bottom:2px solid var(--blue)}
  tbody td{padding:7px 8px;border-bottom:1px solid var(--rule)}
  tbody tr:last-child td{border-bottom:none}
  td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
  .prod{font-weight:700}
  .tag{font-size:10px;border:1.5px solid var(--blue);padding:1px 7px;text-transform:uppercase;letter-spacing:.08em}
  .tag.alt{border-color:var(--pink);color:var(--pink)}
  .pos{color:var(--blue);font-weight:700}
  .neg{color:var(--pink);font-weight:700}
</style>
</head>
<body>
  <!-- Paper grain -->
  <svg class="grain" width="1440" height="900">
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="12"/><feColorMatrix type="saturate" values="0"/></filter>
    <rect width="1440" height="900" filter="url(#grain)"/>
  </svg>
  <!-- Registration marks -->
  <svg class="regmark" style="left:10px" width="16" height="16" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="5" fill="none" stroke="#2B50E0" stroke-width="1"/>
    <path d="M8,0 V16 M0,8 H16" stroke="#FF48B0" stroke-width="1"/>
  </svg>
  <svg class="regmark" style="right:10px" width="16" height="16" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="5" fill="none" stroke="#FF48B0" stroke-width="1"/>
    <path d="M8,0 V16 M0,8 H16" stroke="#2B50E0" stroke-width="1"/>
  </svg>

  <div class="zine">
    <!-- Header -->
    <header>
      <div class="brand">
        <div class="mark">P!</div>
        <div>
          <h1>Pulp Press</h1>
          <p>two-ink risograph — shop analytics, spring drop 2026</p>
        </div>
      </div>
      <div class="controls">
        <div class="ctl">Spring Drop <span class="chev">▼</span></div>
        <div class="ctl">All Formats <span class="chev">▼</span></div>
        <div class="ctl solid"><span class="dot"></span>Press On</div>
      </div>
    </header>

    <!-- KPIs -->
    <section class="kpis">
      <div class="panel kpi">
        <div class="lbl">Orders</div>
        <div class="val">1,284</div>
        <div class="delta up">▲ 9.6% vs last drop</div>
      </div>
      <div class="panel kpi">
        <div class="lbl">Zine Units</div>
        <div class="val">3,912</div>
        <div class="delta up">▲ 14.2% vs last drop</div>
      </div>
      <div class="panel kpi">
        <div class="lbl">Subscribers</div>
        <div class="val">862</div>
        <div class="delta up">▲ 4.1% vs last drop</div>
      </div>
      <div class="panel kpi">
        <div class="lbl">Avg Order</div>
        <div class="val">$23.40</div>
        <div class="delta down">▼ 1.8% vs last drop</div>
      </div>
    </section>

    <!-- Charts -->
    <section class="row">
      <!-- Overprint line/area -->
      <div class="panel">
        <div class="panel-head">
          <h2>Orders × Zine Units</h2>
          <span class="sub">12 weeks · units</span>
        </div>
        <svg viewBox="0 0 760 300" width="100%" height="286" preserveAspectRatio="none" style="display:block">
          <defs>
            <pattern id="dots" width="7" height="7" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.3" fill="#FF48B0"/>
            </pattern>
          </defs>
          <!-- grid -->
          <g stroke="rgba(43,80,224,.22)" stroke-width="1">
            <line x1="0" y1="40" x2="760" y2="40"/>
            <line x1="0" y1="100" x2="760" y2="100"/>
            <line x1="0" y1="160" x2="760" y2="160"/>
            <line x1="0" y1="220" x2="760" y2="220"/>
            <line x1="0" y1="280" x2="760" y2="280"/>
          </g>
          <g fill="rgba(43,80,224,.62)" font-family="Space Mono,monospace" font-size="9">
            <text x="2" y="36">640</text><text x="2" y="96">480</text><text x="2" y="156">320</text><text x="2" y="216">160</text><text x="2" y="276">0</text>
          </g>
          <!-- pink zine area at 55% ink + halftone dots -->
          <path d="M0,205 L63,195 L127,200 L190,178 L253,186 L317,162 L380,170 L443,148 L507,158 L570,138 L633,146 L697,126 L760,118 L760,280 L0,280 Z" fill="#FF48B0" fill-opacity=".55" style="mix-blend-mode:multiply"/>
          <path d="M0,205 L63,195 L127,200 L190,178 L253,186 L317,162 L380,170 L443,148 L507,158 L570,138 L633,146 L697,126 L760,118 L760,280 L0,280 Z" fill="url(#dots)" fill-opacity=".45" style="mix-blend-mode:multiply"/>
          <!-- blue orders area, overlap prints purple -->
          <path d="M0,235 L63,225 L127,228 L190,210 L253,215 L317,196 L380,200 L443,182 L507,188 L570,170 L633,176 L697,158 L760,150 L760,280 L0,280 Z" fill="#2B50E0" fill-opacity=".38" style="mix-blend-mode:multiply"/>
          <!-- blue orders line -->
          <polyline fill="none" stroke="#2B50E0" stroke-width="2.5" points="0,235 63,225 127,228 190,210 253,215 317,196 380,200 443,182 507,188 570,170 633,176 697,158 760,150"/>
          <g fill="#2B50E0"><circle cx="760" cy="150" r="3.5"/></g>
          <!-- week labels -->
          <g fill="rgba(43,80,224,.75)" font-family="Space Mono,monospace" font-size="10">
            <text x="0" y="297">WK01</text>
            <text x="190" y="297" text-anchor="middle">WK04</text>
            <text x="380" y="297" text-anchor="middle">WK07</text>
            <text x="570" y="297" text-anchor="middle">WK10</text>
            <text x="760" y="297" text-anchor="end">WK12</text>
          </g>
        </svg>
        <div class="legend">
          <span><i style="background:#2B50E0"></i>Orders</span>
          <span><i style="background:#FF48B0;opacity:.55"></i>Zine units</span>
          <span><i style="background:#7B3BD1"></i>Overprint = both</span>
        </div>
      </div>

      <!-- Two-ink donut -->
      <div class="panel">
        <div class="panel-head">
          <h2>Sales Mix</h2>
          <span class="sub">By format</span>
        </div>
        <div class="donut-wrap">
          <svg viewBox="0 0 200 200" width="180" height="180">
            <!-- segments via stroke-dasharray, circumference ≈ 502 (r=80) -->
            <g transform="translate(100,100)" fill="none" stroke-width="26">
              <circle r="80" stroke="#FF48B0" stroke-dasharray="236 266" transform="rotate(-90)"/>
              <circle r="80" stroke="#2B50E0" stroke-dasharray="161 341" stroke-dashoffset="-236" transform="rotate(-90)"/>
              <circle r="80" stroke="#7B3BD1" stroke-dasharray="105 397" stroke-dashoffset="-397" transform="rotate(-90)"/>
            </g>
            <text x="100" y="97" text-anchor="middle" font-family="Archivo Black,sans-serif" font-size="23" fill="#2B50E0">1,284</text>
            <text x="100" y="115" text-anchor="middle" font-family="Space Mono,monospace" font-size="9" letter-spacing="2" fill="rgba(43,80,224,.62)">ORDERS</text>
          </svg>
          <div class="dl">
            <div class="dl-row"><span class="dl-name"><i style="background:#FF48B0"></i>Zines</span><span class="dl-val">47% · 603</span></div>
            <div class="dl-row"><span class="dl-name"><i style="background:#2B50E0"></i>Art prints</span><span class="dl-val">32% · 411</span></div>
            <div class="dl-row"><span class="dl-name"><i style="background:#7B3BD1"></i>Subscriptions</span><span class="dl-val">21% · 270</span></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Table -->
    <section class="panel">
      <div class="panel-head">
        <h2>Top of the Rack</h2>
        <span class="sub">This drop · by revenue</span>
      </div>
      <table>
        <thead>
          <tr><th>Product</th><th>Format</th><th class="num">Units</th><th class="num">Revenue</th><th class="num">MoM Δ</th></tr>
        </thead>
        <tbody>
          <tr><td class="prod">Ghost Garden #4</td><td><span class="tag">Zine</span></td><td class="num">486</td><td class="num">$4,374</td><td class="num pos">+18.2%</td></tr>
          <tr><td class="prod">Riso Calendar 2027</td><td><span class="tag">Print</span></td><td class="num">322</td><td class="num">$8,050</td><td class="num pos">+11.4%</td></tr>
          <tr><td class="prod">Midnight Snack Club</td><td><span class="tag alt">Sub</span></td><td class="num">268</td><td class="num">$3,752</td><td class="num pos">+6.1%</td></tr>
          <tr><td class="prod">Dot Matrix Dreams</td><td><span class="tag">Zine</span></td><td class="num">204</td><td class="num">$1,836</td><td class="num neg">−4.7%</td></tr>
          <tr><td class="prod">Overprint Poster A2</td><td><span class="tag">Print</span></td><td class="num">158</td><td class="num">$3,160</td><td class="num neg">−2.3%</td></tr>
        </tbody>
      </table>
    </section>
  </div>
</body>
</html>
```
