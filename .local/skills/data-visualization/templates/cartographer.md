---
name: cartographer
description: >-
  This "Cartographer" dashboard is styled as a vintage expedition atlas on aged parchment (#EFE5CE, with a subtle radial aging toward #E3D4B4 at the edges), drawn in ink brown (#4A3A28) with faded-ink secondary text (#8A7657) and accented by map red (#A3402F) and deep teal (#2E5E5A). A faint contour-line pattern — concentric irregular wavy inline-SVG paths at roughly 6% opacity — sits behind everything, graticule tick marks and lat/long-style coordinates run along the frame edges, and panels are parchment sheets with 1px double borders (border plus offset outline); a compass rose crowns the header and dashed route lines with arrowheads serve as decorative connectors. Display type is IM Fell English 400 (with italics), body copy is Crimson Pro, and every coordinate and numeral is set in IBM Plex Mono. The layout is a fixed 1440×900 grid: an expedition-ledger header with filter-style controls, a 4-up KPI row, a two-thirds/one-third chart split, and a full-width expedition-log table with red "LOGGED" stamp-style badges. Charts are inline SVG in a surveyor's hand — an elevation-profile area chart with hatched fill, waypoint markers, and a flag on the final point, plus a donut styled as a compass dial with a tick ring outside it. The overall aesthetic is scholarly, weathered, and adventurous: a nineteenth-century survey office reimagined as a working logistics console.
---

# Cartographer

This "Cartographer" dashboard is styled as a vintage expedition atlas on aged parchment (#EFE5CE, with a subtle radial aging toward #E3D4B4 at the edges), drawn in ink brown (#4A3A28) with faded-ink secondary text (#8A7657) and accented by map red (#A3402F) and deep teal (#2E5E5A). A faint contour-line pattern — concentric irregular wavy inline-SVG paths at roughly 6% opacity — sits behind everything, graticule tick marks and lat/long-style coordinates run along the frame edges, and panels are parchment sheets with 1px double borders (border plus offset outline); a compass rose crowns the header and dashed route lines with arrowheads serve as decorative connectors. Display type is IM Fell English 400 (with italics), body copy is Crimson Pro, and every coordinate and numeral is set in IBM Plex Mono. The layout is a fixed 1440×900 grid: an expedition-ledger header with filter-style controls, a 4-up KPI row, a two-thirds/one-third chart split, and a full-width expedition-log table with red "LOGGED" stamp-style badges. Charts are inline SVG in a surveyor's hand — an elevation-profile area chart with hatched fill, waypoint markers, and a flag on the final point, plus a donut styled as a compass dial with a tick ring outside it. The overall aesthetic is scholarly, weathered, and adventurous: a nineteenth-century survey office reimagined as a working logistics console.

## Source Code

A self-contained reference implementation of the "Cartographer" dashboard
preview. Use it as the visual target — translate the palette, typography, and
layout into the data-visualization React + Tailwind + Recharts app.
The fixed 1440×900 frame and hand-drawn inline-SVG charts below are
preview-rendering artifacts — keep the generated app's layout responsive
and build every chart with Recharts.

Responsive adaptation: This parchment-atlas dashboard should preserve its ornamental frame and tick marks as fixed viewport chrome but scale their insets down on phones (≤480px) so content never crowds the border. The 2fr/1fr chart+donut row should stack below ~1024px with the donut growing to a comfortable 240–280px, KPIs step 4→2→1 columns, the expedition table must remain horizontally scrollable inside its panel with a visible scroll affordance, and all SVG charts should scale with preserved aspect ratio using non-scaling strokes so cartographic linework stays crisp from 360px to 2200px.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1440, initial-scale=1">
<title>The Cartographer's Ledger</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Crimson+Pro:wght@400;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root{
    --parch:#EFE5CE;
    --parch2:#F3EBD8;
    --ink:#4A3A28;
    --faded:#8A7657;
    --red:#A3402F;
    --teal:#2E5E5A;
    --fell:'IM Fell English', Georgia, serif;
    --body:'Crimson Pro', Georgia, serif;
    --mono:'IBM Plex Mono', 'Courier New', monospace;
  }
  *{box-sizing:border-box}
  html,body{margin:0}
  body{
    width:1440px;height:900px;overflow:hidden;
    background:radial-gradient(ellipse at 50% 45%, #EFE5CE 55%, #E3D4B4 100%);
    color:var(--ink);font-family:var(--body);
  }
  .contours{position:fixed;inset:0;pointer-events:none}
  .frame{position:fixed;inset:12px;border:1px solid rgba(74,58,40,.6);outline:1px solid rgba(74,58,40,.3);outline-offset:3px;pointer-events:none}
  .ticks{position:fixed;left:26px;right:26px;height:5px;background:repeating-linear-gradient(90deg,rgba(74,58,40,.45) 0 1px,transparent 1px 24px);pointer-events:none}
  .ticks.top{top:13px}
  .ticks.bottom{bottom:13px}
  .coord{position:fixed;font-family:var(--mono);font-size:8px;letter-spacing:.14em;color:var(--faded);pointer-events:none}
  .atlas{position:relative;z-index:1;height:900px;padding:30px 42px 24px;display:flex;flex-direction:column;gap:14px}

  /* Double-bordered parchment panel */
  .panel{background:var(--parch2);border:1px solid var(--ink);outline:1px solid rgba(74,58,40,.4);outline-offset:3px;padding:12px 16px}

  /* Header */
  header{display:flex;align-items:center;gap:18px;padding:2px 6px 0}
  .titleblock h1{font-family:var(--fell);font-weight:400;font-size:30px;margin:0;letter-spacing:.02em}
  .titleblock p{font-family:var(--fell);font-style:italic;font-size:13px;margin:3px 0 0;color:var(--faded)}
  .route-line{flex:1;display:flex;align-items:center;padding:0 8px}
  .controls{display:flex;gap:14px}
  .ctl{background:var(--parch2);border:1px solid var(--ink);outline:1px solid rgba(74,58,40,.4);outline-offset:2px;padding:6px 12px;font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;display:flex;align-items:center;gap:7px}
  .ctl .lbl{color:var(--faded)}
  .ctl .chev{font-size:8px;color:var(--faded)}
  .dot{width:7px;height:7px;border-radius:50%;background:var(--teal)}

  /* KPI row */
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
  .kpi .lbl{font-family:var(--mono);font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--faded)}
  .kpi .val{font-family:var(--fell);font-size:29px;margin:6px 0 2px}
  .kpi .val small{font-size:15px;color:var(--faded)}
  .delta{font-family:var(--mono);font-size:10px;font-weight:500}
  .up{color:var(--teal)}.down{color:var(--red)}

  /* Chart panels */
  .row{display:grid;grid-template-columns:2fr 1fr;gap:16px}
  .panel-head{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid rgba(74,58,40,.35);padding-bottom:6px;margin-bottom:9px}
  .panel-head h2{font-family:var(--fell);font-weight:400;font-size:19px;margin:0}
  .sub{font-family:var(--mono);font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--faded)}
  .legend{display:flex;gap:16px;font-family:var(--mono);font-size:9px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink);margin-top:6px}
  .legend span{display:inline-flex;align-items:center;gap:6px}
  .lsw{display:inline-block;width:16px;height:0;border-top:2px solid var(--ink)}
  .lsw.survey{border-top:2px dashed var(--teal)}
  .lsw.flag{width:9px;height:9px;border:none;background:var(--red)}

  /* Donut */
  .donut-wrap{display:flex;flex-direction:column;align-items:center}
  .dl{width:100%;margin-top:4px}
  .dl-row{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;padding:4px 0;border-bottom:1px solid rgba(74,58,40,.25)}
  .dl-row:last-child{border-bottom:none}
  .dl-name{display:flex;align-items:center;gap:8px}
  .dl-name i{width:9px;height:9px;display:inline-block;border-radius:50%}
  .dl-val{font-family:var(--mono);font-size:10.5px;font-weight:500}

  /* Expedition log */
  table{width:100%;border-collapse:collapse;font-size:13px}
  thead th{text-align:left;font-family:var(--mono);font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--faded);padding:6px 8px;border-bottom:1px solid var(--ink)}
  tbody td{padding:7px 8px;border-bottom:1px solid rgba(74,58,40,.22)}
  tbody tr:last-child td{border-bottom:none}
  td.num,th.num{text-align:right;font-family:var(--mono);font-size:11.5px;font-variant-numeric:tabular-nums}
  .route{font-family:var(--fell);font-size:15px}
  .pos{color:var(--teal);font-weight:500}
  .neg{color:var(--red);font-weight:500}
  .stamp{display:inline-block;border:1px solid var(--red);color:var(--red);font-family:var(--mono);font-size:8.5px;letter-spacing:.18em;padding:2px 8px;transform:rotate(-4deg);text-transform:uppercase}
  .stamp.route-active{border-color:var(--teal);color:var(--teal)}
</style>
</head>
<body>
  <!-- Contour background -->
  <svg class="contours" width="1440" height="900">
    <g fill="none" stroke="#4A3A28" stroke-width="1" opacity=".07">
      <path d="M120,600 C190,540 330,545 390,610 C450,675 390,750 270,755 C150,760 50,660 120,600 Z"/>
      <path d="M160,615 C215,570 320,572 365,622 C410,672 365,725 270,728 C175,731 105,660 160,615 Z"/>
      <path d="M200,630 C240,600 305,602 335,635 C365,668 335,700 272,702 C209,704 160,660 200,630 Z"/>
      <path d="M235,645 C255,630 292,632 307,648 C322,664 307,678 273,679 C239,680 215,660 235,645 Z"/>
      <path d="M1060,120 C1140,70 1300,80 1360,150 C1420,220 1360,300 1230,305 C1100,310 980,170 1060,120 Z"/>
      <path d="M1100,140 C1160,105 1280,112 1325,165 C1370,218 1325,272 1228,276 C1131,280 1040,175 1100,140 Z"/>
      <path d="M1140,160 C1180,138 1258,143 1288,178 C1318,213 1288,248 1226,250 C1164,252 1100,182 1140,160 Z"/>
    </g>
  </svg>
  <!-- Graticule frame -->
  <div class="frame"></div>
  <div class="ticks top"></div>
  <div class="ticks bottom"></div>
  <span class="coord" style="top:22px;left:46px">48°12′N · 16°22′E</span>
  <span class="coord" style="top:22px;right:46px">SHEET IV — SCALE 1:62,500</span>
  <span class="coord" style="bottom:22px;left:46px">SURVEYED Q3 · DEPOT AUTHORITY</span>
  <span class="coord" style="bottom:22px;right:46px">72°44′W · 41°18′N</span>

  <div class="atlas">
    <!-- Header -->
    <header>
      <!-- Compass rose -->
      <svg viewBox="0 0 56 56" width="52" height="52">
        <circle cx="28" cy="28" r="25" fill="none" stroke="#4A3A28" stroke-width="1"/>
        <circle cx="28" cy="28" r="19" fill="none" stroke="#4A3A28" stroke-width=".6" opacity=".6"/>
        <path d="M28,6 L32,28 L28,50 L24,28 Z" fill="#A3402F"/>
        <path d="M6,28 L28,24 L50,28 L28,32 Z" fill="#4A3A28"/>
        <circle cx="28" cy="28" r="2.5" fill="#EFE5CE" stroke="#4A3A28"/>
      </svg>
      <div class="titleblock">
        <h1>The Cartographer&rsquo;s Ledger</h1>
        <p>Field operations &amp; freight — surveyed quarterly by the Depot Authority</p>
      </div>
      <!-- Dashed route connector -->
      <div class="route-line">
        <svg width="100%" height="14" viewBox="0 0 220 14" preserveAspectRatio="none">
          <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#A3402F"/></marker></defs>
          <path d="M4,10 C60,2 150,12 210,6" fill="none" stroke="#A3402F" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#arr)"/>
        </svg>
      </div>
      <div class="controls">
        <div class="ctl"><span class="lbl">Territory</span>All Provinces <span class="chev">▼</span></div>
        <div class="ctl"><span class="lbl">Season</span>Q3 — Autumn <span class="chev">▼</span></div>
        <div class="ctl"><span class="dot"></span>En Route</div>
      </div>
    </header>

    <!-- KPIs -->
    <section class="kpis">
      <div class="panel kpi">
        <div class="lbl">Shipments — Q3</div>
        <div class="val">486</div>
        <div class="delta up">▲ 6.2% vs prior quarter</div>
      </div>
      <div class="panel kpi">
        <div class="lbl">Distance Logged</div>
        <div class="val">3,842 <small>km</small></div>
        <div class="delta up">▲ 11.8% vs prior quarter</div>
      </div>
      <div class="panel kpi">
        <div class="lbl">Depot Throughput</div>
        <div class="val">1,286 <small>crates/day</small></div>
        <div class="delta up">▲ 3.4% vs prior quarter</div>
      </div>
      <div class="panel kpi">
        <div class="lbl">On-Time Arrivals</div>
        <div class="val">92.4%</div>
        <div class="delta down">▼ 1.6% vs prior quarter</div>
      </div>
    </section>

    <!-- Charts -->
    <section class="row">
      <!-- Elevation profile -->
      <div class="panel">
        <div class="panel-head">
          <h2>Elevation Profile — Overland Route N-7</h2>
          <span class="sub">Metres above sea level · survey mile 0–120</span>
        </div>
        <svg viewBox="0 0 760 300" width="100%" height="282" preserveAspectRatio="none" style="display:block">
          <defs>
            <pattern id="relief" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="rgba(74,58,40,.05)"/>
              <line x1="0" y1="0" x2="0" y2="6" stroke="#4A3A28" stroke-width="1" opacity=".22"/>
            </pattern>
          </defs>
          <!-- grid -->
          <g stroke="rgba(74,58,40,.22)" stroke-width="1">
            <line x1="0" y1="40" x2="760" y2="40"/>
            <line x1="0" y1="95" x2="760" y2="95"/>
            <line x1="0" y1="150" x2="760" y2="150"/>
            <line x1="0" y1="205" x2="760" y2="205"/>
            <line x1="0" y1="260" x2="760" y2="260"/>
          </g>
          <g fill="#8A7657" font-family="IBM Plex Mono,monospace" font-size="8.5">
            <text x="2" y="36">2,400 m</text><text x="2" y="91">1,800</text><text x="2" y="146">1,200</text><text x="2" y="201">600</text><text x="2" y="256">0</text>
          </g>
          <!-- hatched relief under profile -->
          <path d="M0,222 L76,198 L152,174 L228,124 L304,60 L380,101 L456,201 L532,190 L608,178 L684,149 L760,126 L760,260 L0,260 Z" fill="url(#relief)"/>
          <!-- route elevation -->
          <path d="M0,222 L76,198 L152,174 L228,124 L304,60 L380,101 L456,201 L532,190 L608,178 L684,149 L760,126" fill="none" stroke="#4A3A28" stroke-width="2"/>
          <!-- 1893 survey line -->
          <path d="M0,232 L76,214 L152,192 L228,150 L304,84 L380,120 L456,214 L532,204 L608,190 L684,162 L760,140" fill="none" stroke="#2E5E5A" stroke-width="1.6" stroke-dasharray="5 4"/>
          <!-- waypoint markers -->
          <g fill="#EFE5CE" stroke="#4A3A28" stroke-width="1.5">
            <circle cx="0" cy="222" r="3.5"/><circle cx="152" cy="174" r="3.5"/><circle cx="304" cy="60" r="3.5"/>
            <circle cx="456" cy="201" r="3.5"/><circle cx="608" cy="178" r="3.5"/><circle cx="760" cy="126" r="3.5"/>
          </g>
          <!-- flag on final point -->
          <line x1="760" y1="126" x2="760" y2="100" stroke="#4A3A28" stroke-width="1.5"/>
          <polygon points="760,100 744,105 760,110" fill="#A3402F"/>
          <!-- waypoint labels -->
          <g fill="#8A7657" font-family="IBM Plex Mono,monospace" font-size="8" letter-spacing="1">
            <text x="0" y="292">BASE CAMP</text>
            <text x="152" y="292" text-anchor="middle">FORT AYLES</text>
            <text x="304" y="292" text-anchor="middle">KHOLM PASS</text>
            <text x="456" y="292" text-anchor="middle">RIVER DOCK</text>
            <text x="608" y="292" text-anchor="middle">DEPOT 9</text>
            <text x="760" y="292" text-anchor="end">SUMMIT GATE</text>
          </g>
        </svg>
        <div class="legend">
          <span><i class="lsw"></i>Route N-7 elevation</span>
          <span><i class="lsw survey"></i>1893 survey line</span>
          <span><i class="lsw flag"></i>Current position</span>
        </div>
      </div>

      <!-- Compass-dial donut -->
      <div class="panel">
        <div class="panel-head">
          <h2>Shipments by Route</h2>
          <span class="sub">Compass dial · Q3</span>
        </div>
        <div class="donut-wrap">
          <svg viewBox="0 0 240 240" width="204" height="204">
            <g transform="translate(120,120)">
              <!-- tick ring outside the donut -->
              <circle r="99" fill="none" stroke="#4A3A28" stroke-width="6" stroke-dasharray="1.5 7.1" opacity=".5"/>
              <g stroke="#4A3A28" stroke-width="1.5">
                <line x1="0" y1="-92" x2="0" y2="-106"/>
                <line x1="92" y1="0" x2="106" y2="0"/>
                <line x1="0" y1="92" x2="0" y2="106"/>
                <line x1="-92" y1="0" x2="-106" y2="0"/>
              </g>
              <!-- segments via stroke-dasharray, circumference ≈ 502 (r=80) -->
              <g fill="none" stroke-width="22">
                <circle r="80" stroke="#2E5E5A" stroke-dasharray="191 311" transform="rotate(-90)"/>
                <circle r="80" stroke="#A3402F" stroke-dasharray="136 366" stroke-dashoffset="-191" transform="rotate(-90)"/>
                <circle r="80" stroke="#4A3A28" stroke-dasharray="100 402" stroke-dashoffset="-327" transform="rotate(-90)"/>
                <circle r="80" stroke="#8A7657" stroke-dasharray="75 427" stroke-dashoffset="-427" transform="rotate(-90)"/>
              </g>
            </g>
            <g fill="#4A3A28" font-family="IBM Plex Mono,monospace" font-size="8.5" text-anchor="middle">
              <text x="120" y="16">N</text><text x="228" y="123">E</text><text x="120" y="234">S</text><text x="12" y="123">W</text>
            </g>
            <text x="120" y="118" text-anchor="middle" font-family="IM Fell English,serif" font-size="27" fill="#4A3A28">486</text>
            <text x="120" y="134" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="7.5" letter-spacing="2" fill="#8A7657">SHIPMENTS · Q3</text>
          </svg>
          <div class="dl">
            <div class="dl-row"><span class="dl-name"><i style="background:#2E5E5A"></i>Northern Passage</span><span class="dl-val">38% · 185</span></div>
            <div class="dl-row"><span class="dl-name"><i style="background:#A3402F"></i>Coastal Run</span><span class="dl-val">27% · 131</span></div>
            <div class="dl-row"><span class="dl-name"><i style="background:#4A3A28"></i>Highland Trail</span><span class="dl-val">20% · 97</span></div>
            <div class="dl-row"><span class="dl-name"><i style="background:#8A7657"></i>Desert Line</span><span class="dl-val">15% · 73</span></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Expedition log -->
    <section class="panel">
      <div class="panel-head">
        <h2>Expedition Log</h2>
        <span class="sub">Quarter III — all active routes</span>
      </div>
      <table>
        <thead>
          <tr><th>Route</th><th>Region</th><th class="num">Shipments</th><th class="num">Distance</th><th class="num">QoQ Δ</th><th style="text-align:right">Entry</th></tr>
        </thead>
        <tbody>
          <tr><td class="route">Northern Passage</td><td>Highland Provinces</td><td class="num">185</td><td class="num">1,240 km</td><td class="num pos">+9.4%</td><td style="text-align:right"><span class="stamp">Logged</span></td></tr>
          <tr><td class="route">Coastal Run</td><td>Eastern Shore</td><td class="num">131</td><td class="num">890 km</td><td class="num pos">+5.2%</td><td style="text-align:right"><span class="stamp">Logged</span></td></tr>
          <tr><td class="route">Highland Trail</td><td>Kholm Range</td><td class="num">97</td><td class="num">1,020 km</td><td class="num pos">+2.1%</td><td style="text-align:right"><span class="stamp route-active">En Route</span></td></tr>
          <tr><td class="route">Desert Line</td><td>Southern Flats</td><td class="num">73</td><td class="num">692 km</td><td class="num neg">−3.8%</td><td style="text-align:right"><span class="stamp">Logged</span></td></tr>
        </tbody>
      </table>
    </section>
  </div>
</body>
</html>
```
