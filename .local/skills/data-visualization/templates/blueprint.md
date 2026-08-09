---
name: blueprint
description: >-
  This "Blueprint" dashboard is drawn as an engineering drawing sheet — a cyanotype print on blueprint blue (#16407A) that vignettes toward #0F3160 at the edges, overlaid with a drafting grid of 1px hairlines (rgba(255,255,255,.06)) every 20px and heavier rules (rgba(255,255,255,.12)) every 100px built from layered repeating-linear-gradients. Panels are fully transparent drawing frames rather than filled cards — 1px solid rgba(255,255,255,.45) borders with small L-shaped corner tick marks, one frame rendered dashed — while all linework and primary text is white/ice (#E8F1FC), secondary labels are #A9C3E8, accent cyan (#7FD1F7) marks highlights and positive deltas, and caution amber (#F2B544) appears sparingly for alerts and negatives. Headings use Oswald (weight 500, uppercase, letterspaced, stencil-flavored) while every numeral, axis label, and table cell uses IBM Plex Mono (400/500). The layout is a fixed 1440×900 sheet: a header with brand, filter-style controls, and a drawing-sheet title block (a small bordered grid of PROJECT / SHEET / REV / SCALE rows in tiny mono type), then a 4-KPI row, a 2/3 + 1/3 chart split, and a full-width work-order schedule table with hairline white rules and 01/02 row numbers. Charts are hand-ruled inline SVG: a white 2px output polyline with a cyan dashed plan line over hairline gridlines, an area fill of 45° diagonal hatching (an SVG pattern of rgba(255,255,255,.18) lines), a mono-caps annotation callout with a leader line and arrow pointing at the peak week, and a donut drawn as a technical dial — ring segments in the ice-and-cyan linework palette with tick marks around the outside and a center mono readout. The overall aesthetic is drafted, exacting, and archival: white ink ruled onto cyanotype blue, like a factory production dashboard printed from a draftsman's board.
---

# Blueprint

This "Blueprint" dashboard is drawn as an engineering drawing sheet — a cyanotype print on blueprint blue (#16407A) that vignettes toward #0F3160 at the edges, overlaid with a drafting grid of 1px hairlines (rgba(255,255,255,.06)) every 20px and heavier rules (rgba(255,255,255,.12)) every 100px built from layered repeating-linear-gradients. Panels are fully transparent drawing frames rather than filled cards — 1px solid rgba(255,255,255,.45) borders with small L-shaped corner tick marks, one frame rendered dashed — while all linework and primary text is white/ice (#E8F1FC), secondary labels are #A9C3E8, accent cyan (#7FD1F7) marks highlights and positive deltas, and caution amber (#F2B544) appears sparingly for alerts and negatives. Headings use Oswald (weight 500, uppercase, letterspaced, stencil-flavored) while every numeral, axis label, and table cell uses IBM Plex Mono (400/500). The layout is a fixed 1440×900 sheet: a header with brand, filter-style controls, and a drawing-sheet title block (a small bordered grid of PROJECT / SHEET / REV / SCALE rows in tiny mono type), then a 4-KPI row, a 2/3 + 1/3 chart split, and a full-width work-order schedule table with hairline white rules and 01/02 row numbers. Charts are hand-ruled inline SVG: a white 2px output polyline with a cyan dashed plan line over hairline gridlines, an area fill of 45° diagonal hatching (an SVG pattern of rgba(255,255,255,.18) lines), a mono-caps annotation callout with a leader line and arrow pointing at the peak week, and a donut drawn as a technical dial — ring segments in the ice-and-cyan linework palette with tick marks around the outside and a center mono readout. The overall aesthetic is drafted, exacting, and archival: white ink ruled onto cyanotype blue, like a factory production dashboard printed from a draftsman's board.

## Source Code

A self-contained reference implementation of the "Blueprint" dashboard
preview. Use it as the visual target — translate the palette, typography, and
layout into the data-visualization React + Tailwind + Recharts app.
The fixed 1440×900 frame and hand-drawn inline-SVG charts below are
preview-rendering artifacts — keep the generated app's layout responsive
and build every chart with Recharts.

Responsive adaptation: This blueprint-style dashboard should stack top-down on phones: the header title block, control chips, and metadata table each take full width; KPIs collapse via auto-fit minmax(180px,1fr) rather than hard breakpoints; the 2:1 chart+dial split becomes a single column below ~960px with the SVG chart preserving aspect ratio (never stretched). The 7-column table must live inside a horizontal-scroll wrapper on <900px with sticky first column and progressively hidden low-priority columns (description first, then secondary numerics) below 600px. Decorative frame corner ticks, shimmer bars, and monospace labels should scale via clamp() so nothing uses fixed pixel widths above ~120px, and on >1800px the 1600px sheet cap should stay centered with generous gutters rather than letting charts stretch edge-to-edge.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1440, initial-scale=1">
<title>Blueprint — Production Control Sheet</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root{
    --blue:#16407A; --blue2:#0F3160;
    --ink:#E8F1FC; --sub:#A9C3E8; --cyan:#7FD1F7; --amber:#F2B544;
    --frame:rgba(255,255,255,.45); --hair:rgba(255,255,255,.18);
    --grid1:rgba(255,255,255,.06); --grid2:rgba(255,255,255,.12);
    --head:'Oswald','Arial Narrow',Arial,sans-serif;
    --mono:'IBM Plex Mono','Courier New',monospace;
  }
  *{box-sizing:border-box}
  html,body{margin:0}
  body{
    width:1440px;height:900px;overflow:hidden;
    color:var(--ink);font-family:var(--mono);
    background:
      repeating-linear-gradient(0deg,var(--grid2) 0 1px,transparent 1px 100px),
      repeating-linear-gradient(90deg,var(--grid2) 0 1px,transparent 1px 100px),
      repeating-linear-gradient(0deg,var(--grid1) 0 1px,transparent 1px 20px),
      repeating-linear-gradient(90deg,var(--grid1) 0 1px,transparent 1px 20px),
      radial-gradient(1600px 1050px at 50% 40%,var(--blue) 52%,var(--blue2) 100%);
  }
  .sheet{height:900px;padding:20px 26px;display:flex;flex-direction:column;gap:16px}

  /* Drawing frames */
  .frame{position:relative;border:1px solid var(--frame);padding:12px 16px}
  .frame.dashed{border-style:dashed}
  .frame::before{
    content:"";position:absolute;inset:-5px;pointer-events:none;background-repeat:no-repeat;
    background-image:
      linear-gradient(var(--ink),var(--ink)),linear-gradient(var(--ink),var(--ink)),
      linear-gradient(var(--ink),var(--ink)),linear-gradient(var(--ink),var(--ink)),
      linear-gradient(var(--ink),var(--ink)),linear-gradient(var(--ink),var(--ink)),
      linear-gradient(var(--ink),var(--ink)),linear-gradient(var(--ink),var(--ink));
    background-position:0 0,0 0,100% 0,100% 0,0 100%,0 100%,100% 100%,100% 100%;
    background-size:12px 2px,2px 12px,12px 2px,2px 12px,12px 2px,2px 12px,12px 2px,2px 12px;
  }

  /* Header */
  header{display:flex;align-items:flex-start;gap:20px}
  .eyebrow{font-size:10px;letter-spacing:.3em;color:var(--sub);text-transform:uppercase}
  h1{font-family:var(--head);font-weight:500;font-size:30px;margin:6px 0 0;letter-spacing:.14em;text-transform:uppercase;line-height:1}
  .controls{display:flex;gap:10px;margin:18px 0 0 auto}
  .ctrl{border:1px solid var(--frame);padding:8px 12px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;display:flex;align-items:center;gap:8px;color:var(--sub)}
  .ctrl b{color:var(--ink);font-weight:500}
  .chev{color:var(--cyan);font-size:8px}

  /* Title block */
  .tblock{border:1px solid var(--frame);min-width:250px;font-size:9px;letter-spacing:.1em}
  .trow{display:grid;grid-template-columns:78px 1fr;border-bottom:1px solid var(--frame)}
  .trow:last-child{border-bottom:none}
  .trow .th{padding:4px 9px;border-right:1px solid var(--frame);color:var(--sub)}
  .trow .td{padding:4px 9px}

  /* KPI row */
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
  .kpi .lbl{font-size:10px;letter-spacing:.24em;color:var(--sub);text-transform:uppercase}
  .kpi .val{font-size:26px;font-weight:500;margin:8px 0 5px}
  .kpi .val .unit{font-size:12px;color:var(--sub)}
  .delta{font-size:11px}
  .good{color:var(--cyan)} .bad{color:var(--amber)}
  .delta .vs{color:var(--sub);font-size:9px;margin-left:5px;letter-spacing:.08em}

  /* Chart panels */
  .charts{display:grid;grid-template-columns:2fr 1fr;gap:16px}
  .p-head{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--frame);padding-bottom:8px;margin-bottom:12px}
  .p-title{font-family:var(--head);font-weight:500;font-size:16px;letter-spacing:.16em;text-transform:uppercase}
  .p-sub{font-size:9px;letter-spacing:.16em;color:var(--sub);text-transform:uppercase}
  .legend{display:flex;gap:20px;font-size:9px;letter-spacing:.14em;color:var(--sub);text-transform:uppercase;margin-top:10px}
  .sw{display:inline-block;width:20px;border-top:2px solid var(--ink);vertical-align:middle;margin-right:7px}
  .sw.plan{border-top-style:dashed;border-top-color:var(--cyan)}

  /* Dial legend */
  .dial{display:flex;flex-direction:column;align-items:center}
  .d-legend{width:100%;margin-top:8px}
  .dl{display:flex;justify-content:space-between;align-items:center;font-size:10px;letter-spacing:.08em;padding:5px 2px;border-bottom:1px solid var(--hair)}
  .dl:last-child{border-bottom:none}
  .dl .nm{color:var(--sub)}
  .dl .nm i{display:inline-block;width:9px;height:9px;margin-right:9px;vertical-align:-1px}
  .dl .pc{font-weight:500;font-size:11px;color:var(--ink)}

  /* Schedule table */
  .twrap{flex:1;min-height:0}
  table{width:100%;border-collapse:collapse;font-size:12px}
  thead th{text-align:left;font-weight:500;font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:var(--sub);padding:7px 10px;border-bottom:1px solid var(--frame)}
  tbody td{padding:8px 10px;border-bottom:1px solid var(--hair)}
  tbody tr:last-child td{border-bottom:none}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  .rowno{color:var(--sub)}
  .wo{font-weight:500}
  .pos{color:var(--cyan);font-weight:500} .neg{color:var(--amber);font-weight:500}
</style>
</head>
<body>
<div class="sheet">

  <!-- Header -->
  <header>
    <div>
      <div class="eyebrow">Northfield Fabrication Co. · Dwg No. NF-2214</div>
      <h1>Production Control Sheet</h1>
    </div>
    <div class="controls">
      <div class="ctrl">Period <b>WK 27–38</b> <span class="chev">▼</span></div>
      <div class="ctrl">Facility <b>Plant 02</b> <span class="chev">▼</span></div>
      <div class="ctrl">Lines <b>All</b> <span class="chev">▼</span></div>
    </div>
    <div class="tblock">
      <div class="trow"><span class="th">PROJECT</span><span class="td">ATLAS-7 RETROFIT</span></div>
      <div class="trow"><span class="th">SHEET</span><span class="td">DB-01 · 01 OF 01</span></div>
      <div class="trow"><span class="th">REV</span><span class="td">C — 2024-09-12</span></div>
      <div class="trow"><span class="th">SCALE</span><span class="td">1:1 · UNITS: U</span></div>
    </div>
  </header>

  <!-- KPIs -->
  <section class="kpis">
    <div class="frame kpi">
      <div class="lbl">Output · Units</div>
      <div class="val">48,320</div>
      <div class="delta good">▲ 6.2% <span class="vs">VS PLAN</span></div>
    </div>
    <div class="frame kpi">
      <div class="lbl">Line Efficiency</div>
      <div class="val">87.4<span class="unit"> %</span></div>
      <div class="delta good">▲ 1.8 PTS <span class="vs">VS WK 26</span></div>
    </div>
    <div class="frame kpi">
      <div class="lbl">Defect Rate</div>
      <div class="val">0.84<span class="unit"> %</span></div>
      <div class="delta bad">▲ 0.09 PTS <span class="vs">TOL 0.75</span></div>
    </div>
    <div class="frame kpi">
      <div class="lbl">Open Work Orders</div>
      <div class="val">142</div>
      <div class="delta good">▼ 11 <span class="vs">CLEARED THIS WK</span></div>
    </div>
  </section>

  <!-- Charts -->
  <section class="charts">
    <!-- Output vs plan -->
    <div class="frame">
      <div class="p-head">
        <div class="p-title">Weekly Output — All Lines</div>
        <div class="p-sub">Units / WK · WK 27–38</div>
      </div>
      <svg viewBox="0 0 880 290" width="100%" height="290" preserveAspectRatio="none" style="display:block">
        <defs>
          <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="7" stroke="rgba(255,255,255,.18)" stroke-width="2"/>
          </pattern>
          <marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#E8F1FC"/>
          </marker>
        </defs>
        <!-- ruled grid -->
        <g stroke="rgba(255,255,255,.18)" stroke-width="1">
          <line x1="0" y1="50" x2="880" y2="50"/>
          <line x1="0" y1="100" x2="880" y2="100"/>
          <line x1="0" y1="150" x2="880" y2="150"/>
          <line x1="0" y1="200" x2="880" y2="200"/>
          <line x1="0" y1="250" x2="880" y2="250"/>
        </g>
        <!-- hatched area under actual -->
        <path d="M0,200 L80,188 L160,194 L240,168 L320,176 L400,146 L480,156 L560,110 L640,124 L720,64 L800,96 L880,84 L880,250 L0,250 Z" fill="url(#hatch)"/>
        <!-- plan line -->
        <polyline fill="none" stroke="#7FD1F7" stroke-width="1.5" stroke-dasharray="7 5"
          points="0,210 80,204 160,198 240,192 320,186 400,178 480,172 560,164 640,158 720,150 800,144 880,138"/>
        <!-- actual line -->
        <polyline fill="none" stroke="#E8F1FC" stroke-width="2"
          points="0,200 80,188 160,194 240,168 320,176 400,146 480,156 560,110 640,124 720,64 800,96 880,84"/>
        <!-- peak callout -->
        <circle cx="720" cy="64" r="5" fill="none" stroke="#E8F1FC" stroke-width="1.5"/>
        <line x1="646" y1="42" x2="706" y2="58" stroke="#E8F1FC" stroke-width="1" marker-end="url(#arr)"/>
        <text x="640" y="44" text-anchor="end" font-family="IBM Plex Mono,monospace" font-size="10" letter-spacing="1.5" fill="#E8F1FC">PEAK 5,210 U — WK 36</text>
        <!-- x labels -->
        <g fill="#A9C3E8" font-family="IBM Plex Mono,monospace" font-size="10" letter-spacing="1">
          <text x="0" y="282">W27</text>
          <text x="160" y="282" text-anchor="middle">W29</text>
          <text x="320" y="282" text-anchor="middle">W31</text>
          <text x="480" y="282" text-anchor="middle">W33</text>
          <text x="640" y="282" text-anchor="middle">W35</text>
          <text x="880" y="282" text-anchor="end">W38</text>
        </g>
      </svg>
      <div class="legend">
        <span><i class="sw"></i>Actual Output</span>
        <span><i class="sw plan"></i>Planned Rate</span>
      </div>
    </div>

    <!-- Output share dial -->
    <div class="frame dashed dial">
      <div class="p-head" style="width:100%">
        <div class="p-title">Output by Line</div>
        <div class="p-sub">Share of units</div>
      </div>
      <svg viewBox="0 0 230 230" width="212" height="212">
        <g transform="translate(115,115)">
          <!-- dial ticks -->
          <g stroke="rgba(232,241,252,.5)" stroke-width="1">
            <line x1="96" y1="0" x2="104" y2="0"/><line x1="-96" y1="0" x2="-104" y2="0"/>
            <line x1="0" y1="96" x2="0" y2="104"/><line x1="0" y1="-96" x2="0" y2="-104"/>
            <line x1="83.1" y1="48" x2="90.1" y2="52"/><line x1="48" y1="83.1" x2="52" y2="90.1"/>
            <line x1="-48" y1="83.1" x2="-52" y2="90.1"/><line x1="-83.1" y1="48" x2="-90.1" y2="52"/>
            <line x1="-83.1" y1="-48" x2="-90.1" y2="-52"/><line x1="-48" y1="-83.1" x2="-52" y2="-90.1"/>
            <line x1="48" y1="-83.1" x2="52" y2="-90.1"/><line x1="83.1" y1="-48" x2="90.1" y2="-52"/>
          </g>
          <!-- ring track + segments via stroke-dasharray, r=80 circumference ≈ 502.6 -->
          <circle r="80" fill="none" stroke="rgba(232,241,252,.15)" stroke-width="18"/>
          <!-- Line A 38% -->
          <circle r="80" fill="none" stroke="#E8F1FC" stroke-width="18" stroke-dasharray="191 311" transform="rotate(-90)"/>
          <!-- Line B 27% -->
          <circle r="80" fill="none" stroke="#7FD1F7" stroke-width="18" stroke-dasharray="136 366" stroke-dashoffset="-191" transform="rotate(-90)"/>
          <!-- Line C 21% -->
          <circle r="80" fill="none" stroke="#A9C3E8" stroke-width="18" stroke-dasharray="105 397" stroke-dashoffset="-327" transform="rotate(-90)"/>
          <!-- Line D 14% -->
          <circle r="80" fill="none" stroke="rgba(232,241,252,.35)" stroke-width="18" stroke-dasharray="70 432" stroke-dashoffset="-432" transform="rotate(-90)"/>
        </g>
        <text x="115" y="112" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="21" font-weight="500" fill="#E8F1FC">48,320</text>
        <text x="115" y="130" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="8" letter-spacing="3" fill="#A9C3E8">UNITS TOTAL</text>
      </svg>
      <div class="d-legend">
        <div class="dl"><span class="nm"><i style="background:#E8F1FC"></i>LINE A — STAMPING</span><span class="pc">38%</span></div>
        <div class="dl"><span class="nm"><i style="background:#7FD1F7"></i>LINE B — MACHINING</span><span class="pc">27%</span></div>
        <div class="dl"><span class="nm"><i style="background:#A9C3E8"></i>LINE C — ASSEMBLY</span><span class="pc">21%</span></div>
        <div class="dl"><span class="nm"><i style="background:rgba(232,241,252,.35)"></i>LINE D — FINISHING</span><span class="pc">14%</span></div>
      </div>
    </div>
  </section>

  <!-- Work order schedule -->
  <div class="frame twrap">
    <div class="p-head">
      <div class="p-title">Work Order Schedule</div>
      <div class="p-sub">Active · Sorted by qty</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>No.</th><th>Work Order</th><th>Line</th><th>Product</th>
          <th style="text-align:right">Qty</th><th style="text-align:right">Eff.</th><th style="text-align:right">Δ Plan</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="rowno">01</td><td class="wo">WO-4821</td><td>LINE A</td><td>Compressor Housing</td><td class="num">12,400</td><td class="num">91.2%</td><td class="num pos">+4.8%</td></tr>
        <tr><td class="rowno">02</td><td class="wo">WO-4805</td><td>LINE B</td><td>Impeller Assembly</td><td class="num">9,860</td><td class="num">88.7%</td><td class="num pos">+2.1%</td></tr>
        <tr><td class="rowno">03</td><td class="wo">WO-4837</td><td>LINE C</td><td>Valve Manifold</td><td class="num">8,240</td><td class="num">84.1%</td><td class="num neg">−1.6%</td></tr>
        <tr><td class="rowno">04</td><td class="wo">WO-4790</td><td>LINE A</td><td>Bearing Cartridge</td><td class="num">7,410</td><td class="num">89.5%</td><td class="num pos">+3.3%</td></tr>
        <tr><td class="rowno">05</td><td class="wo">WO-4844</td><td>LINE D</td><td>Gearbox Frame</td><td class="num">6,180</td><td class="num">79.8%</td><td class="num neg">−4.2%</td></tr>
      </tbody>
    </table>
  </div>
</div>
</body>
</html>
```
