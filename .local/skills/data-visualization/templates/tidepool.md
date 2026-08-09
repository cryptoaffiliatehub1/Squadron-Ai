---
name: tidepool
description: >-
  This "Tidepool" dashboard is a serene underwater observatory rendered over a vertical ocean gradient from #06283D down to #0E4A63, crossed by two soft diagonal light rays (large translucent linear-gradient shafts rotated ~18° at ~.06 opacity) and a few blurred bubble circles (CSS radial gradients at ≤.12 opacity) drifting near the edges. Panels are glassy — rgba(18,64,86,.55) fills with fallback-safe backdrop-filter blur(6px), 1px borders in rgba(127,222,231,.25), and 16px corner radii. The accent palette pairs aqua (#35C4CF) with coral (#FF7E6B), sea-glass mint (#9FE8C8), and sand (#F2E3C4); primary text is ice (#EAF6F6) with muted #8FB6BE labels, and mint/coral consistently carry the good/bad deltas. Headings and KPI numerals use Sora (500/600) while body text and labels use Inter (400/500). The layout is a fixed 1440×900 grid: a header with brand and filter controls above a gentle sine-wave divider SVG, a 4-KPI row, a 2/3 + 1/3 chart split, and a full-width station table on a glassy panel with hairline aqua rules. Charts are flowing inline SVG: a smooth bezier aqua area chart whose gradient fill fades to transparent, a coral secondary line, wave-crest dot markers on the peaks, hairline gridlines in rgba(234,246,246,.08), and a coral-ring donut whose aqua/coral/mint/sand segments are stroked with rounded linecaps around a Sora center total. The overall aesthetic is calm, aqueous, and softly luminous — like watching a coastal sensor network from the viewport of an underwater observatory.
---

# Tidepool

This "Tidepool" dashboard is a serene underwater observatory rendered over a vertical ocean gradient from #06283D down to #0E4A63, crossed by two soft diagonal light rays (large translucent linear-gradient shafts rotated ~18° at ~.06 opacity) and a few blurred bubble circles (CSS radial gradients at ≤.12 opacity) drifting near the edges. Panels are glassy — rgba(18,64,86,.55) fills with fallback-safe backdrop-filter blur(6px), 1px borders in rgba(127,222,231,.25), and 16px corner radii. The accent palette pairs aqua (#35C4CF) with coral (#FF7E6B), sea-glass mint (#9FE8C8), and sand (#F2E3C4); primary text is ice (#EAF6F6) with muted #8FB6BE labels, and mint/coral consistently carry the good/bad deltas. Headings and KPI numerals use Sora (500/600) while body text and labels use Inter (400/500). The layout is a fixed 1440×900 grid: a header with brand and filter controls above a gentle sine-wave divider SVG, a 4-KPI row, a 2/3 + 1/3 chart split, and a full-width station table on a glassy panel with hairline aqua rules. Charts are flowing inline SVG: a smooth bezier aqua area chart whose gradient fill fades to transparent, a coral secondary line, wave-crest dot markers on the peaks, hairline gridlines in rgba(234,246,246,.08), and a coral-ring donut whose aqua/coral/mint/sand segments are stroked with rounded linecaps around a Sora center total. The overall aesthetic is calm, aqueous, and softly luminous — like watching a coastal sensor network from the viewport of an underwater observatory.

## Source Code

A self-contained reference implementation of the "Tidepool" dashboard
preview. Use it as the visual target — translate the palette, typography, and
layout into the data-visualization React + Tailwind + Recharts app.
The fixed 1440×900 frame and hand-drawn inline-SVG charts below are
preview-rendering artifacts — keep the generated app's layout responsive
and build every chart with Recharts.

Responsive adaptation: This aquatic glass-card dashboard should stay fluid: the app shell scales via clamp() padding/gaps up to ~1800px, KPI cards flow 4→2→1 (≥1024, ≥560, <560), and the charts row collapses to a single column below ~1024px with the donut recentering above the table. All chart SVGs must preserve aspect ratio inside an aspect-ratio-locked container, the transactions table stays in its own horizontal-scroll wrapper (with the section header pinned outside it), and decorative bubbles/wave stay behind overflow:hidden so 360px phones never gain a horizontal scrollbar.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1440, initial-scale=1">
<title>Tidepool — Coastal Sensor Network</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600&family=Inter:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root{
    --deep:#06283D; --mid:#0A3A52; --shallow:#0E4A63;
    --aqua:#35C4CF; --coral:#FF7E6B; --mint:#9FE8C8; --sand:#F2E3C4;
    --ice:#EAF6F6; --muted:#8FB6BE;
    --glass:rgba(18,64,86,.55); --edge:rgba(127,222,231,.25); --hair:rgba(234,246,246,.08);
    --head:'Sora','Segoe UI',Roboto,sans-serif;
    --body:'Inter','Segoe UI',Roboto,sans-serif;
  }
  *{box-sizing:border-box}
  html,body{margin:0}
  body{
    width:1440px;height:900px;overflow:hidden;
    font-family:var(--body);color:var(--ice);position:relative;
    background:linear-gradient(180deg,var(--deep) 0%,var(--mid) 55%,var(--shallow) 100%);
  }

  /* Light rays and bubbles */
  .ray{position:absolute;top:-240px;width:320px;height:1420px;pointer-events:none;
    background:linear-gradient(180deg,#EAF6F6,rgba(234,246,246,0) 72%);
    opacity:.06;transform:rotate(18deg)}
  .ray.r1{left:150px}
  .ray.r2{left:560px;width:190px;opacity:.05}
  .bubble{position:absolute;border-radius:50%;pointer-events:none;filter:blur(4px);
    background:radial-gradient(circle at 32% 30%,rgba(234,246,246,.9),rgba(234,246,246,0) 62%)}
  .b1{width:170px;height:170px;right:-50px;top:210px;opacity:.10}
  .b2{width:90px;height:90px;right:70px;top:420px;opacity:.12}
  .b3{width:200px;height:200px;left:-70px;bottom:60px;opacity:.08}
  .b4{width:60px;height:60px;left:120px;top:150px;opacity:.11}

  .app{position:relative;height:900px;padding:20px 26px;display:flex;flex-direction:column;gap:14px}

  /* Header */
  header{display:flex;align-items:center;justify-content:space-between}
  .brand{display:flex;align-items:center;gap:13px}
  .logo{width:40px;height:40px;border-radius:13px;background:linear-gradient(135deg,var(--aqua),var(--mint));
    display:flex;align-items:center;justify-content:center;font-family:var(--head);font-weight:600;font-size:19px;color:#06283D}
  .brand h1{font-family:var(--head);font-weight:600;font-size:19px;margin:0;letter-spacing:.02em}
  .brand p{margin:2px 0 0;font-size:12px;color:var(--muted)}
  .controls{display:flex;gap:10px}
  .ctl{background:var(--glass);border:1px solid var(--edge);border-radius:999px;padding:8px 15px;
    font-size:12px;color:var(--ice);display:flex;align-items:center;gap:8px;
    backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
  .ctl .dot{width:7px;height:7px;border-radius:50%;background:var(--mint)}
  .chev{color:var(--muted);font-size:9px}

  /* Wave divider */
  .wave{display:block;width:100%;height:16px;opacity:.5}

  /* Glass cards */
  .card{background:var(--glass);border:1px solid var(--edge);border-radius:16px;padding:16px 18px;
    backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}

  /* KPI row */
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
  .kpi .lbl{font-size:11px;color:var(--muted);letter-spacing:.05em}
  .kpi .val{font-family:var(--head);font-weight:600;font-size:27px;margin:7px 0}
  .kpi .val .unit{font-size:14px;color:var(--muted);font-weight:500}
  .delta{font-size:11px;font-weight:500;display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px}
  .good{color:var(--mint);background:rgba(159,232,200,.12)}
  .bad{color:var(--coral);background:rgba(255,126,107,.14)}
  .delta .vs{color:var(--muted);font-weight:400}

  /* Chart panels */
  .charts{display:grid;grid-template-columns:2fr 1fr;gap:14px}
  .p-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px}
  .p-title{font-family:var(--head);font-weight:600;font-size:15px}
  .p-sub{font-size:11px;color:var(--muted)}
  .legend{display:flex;gap:16px;font-size:11px;color:var(--muted);margin-top:8px}
  .legend i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:-1px}

  /* Donut legend */
  .d-legend{width:100%;margin-top:6px}
  .dl{display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:5px 2px;border-bottom:1px solid var(--hair)}
  .dl:last-child{border-bottom:none}
  .dl .nm{display:flex;align-items:center;gap:9px}
  .dl .nm i{width:9px;height:9px;border-radius:50%}
  .dl .pc{font-family:var(--head);font-weight:600}

  /* Station table */
  .twrap{flex:1;min-height:0}
  table{width:100%;border-collapse:collapse;font-size:12px}
  thead th{text-align:left;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:500;padding:7px 10px;border-bottom:1px solid var(--edge)}
  tbody td{padding:8px 10px;border-bottom:1px solid var(--hair)}
  tbody tr:last-child td{border-bottom:none}
  .st{font-weight:500}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  .warm{color:var(--coral);font-weight:500}.cool{color:var(--mint);font-weight:500}
</style>
</head>
<body>

<!-- Ambient light rays and bubbles -->
<div class="ray r1"></div>
<div class="ray r2"></div>
<div class="bubble b1"></div>
<div class="bubble b2"></div>
<div class="bubble b3"></div>
<div class="bubble b4"></div>

<div class="app">

  <!-- Header -->
  <header>
    <div class="brand">
      <div class="logo">T</div>
      <div>
        <h1>Tidepool Observatory</h1>
        <p>Coastal sensor network · Gulf of Maine</p>
      </div>
    </div>
    <div class="controls">
      <div class="ctl"><span class="dot"></span>Live telemetry</div>
      <div class="ctl">All stations <span class="chev">▼</span></div>
      <div class="ctl">Jun 01 – Jun 14 <span class="chev">▼</span></div>
    </div>
  </header>

  <!-- Wave divider -->
  <svg class="wave" viewBox="0 0 1400 18" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 9 Q 35 1 70 9 T 140 9 T 210 9 T 280 9 T 350 9 T 420 9 T 490 9 T 560 9 T 630 9 T 700 9 T 770 9 T 840 9 T 910 9 T 980 9 T 1050 9 T 1120 9 T 1190 9 T 1260 9 T 1330 9 T 1400 9" fill="none" stroke="#35C4CF" stroke-width="1.5"/>
  </svg>

  <!-- KPIs -->
  <section class="kpis">
    <div class="card kpi">
      <div class="lbl">Stations Online</div>
      <div class="val">236<span class="unit"> / 248</span></div>
      <span class="delta good">▲ 4 <span class="vs">since yesterday</span></span>
    </div>
    <div class="card kpi">
      <div class="lbl">Buoy Uptime</div>
      <div class="val">98.6<span class="unit">%</span></div>
      <span class="delta good">▲ 0.4 pts <span class="vs">vs last week</span></span>
    </div>
    <div class="card kpi">
      <div class="lbl">Avg Water Temp</div>
      <div class="val">17.3<span class="unit">°C</span></div>
      <span class="delta bad">▲ 0.8° <span class="vs">above norm</span></span>
    </div>
    <div class="card kpi">
      <div class="lbl">Packets / Hour</div>
      <div class="val">61,400</div>
      <span class="delta good">▲ 3.1% <span class="vs">vs last week</span></span>
    </div>
  </section>

  <!-- Charts -->
  <section class="charts">
    <!-- Temperature and salinity -->
    <div class="card">
      <div class="p-head">
        <div class="p-title">Temperature &amp; Salinity — Buoy NW-04</div>
        <div class="p-sub">14 days · hourly mean</div>
      </div>
      <svg viewBox="0 0 860 270" width="100%" height="270" preserveAspectRatio="none" style="display:block">
        <defs>
          <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#35C4CF" stop-opacity=".38"/>
            <stop offset="100%" stop-color="#35C4CF" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <!-- gridlines -->
        <g stroke="rgba(234,246,246,.08)" stroke-width="1">
          <line x1="0" y1="40" x2="860" y2="40"/><line x1="0" y1="90" x2="860" y2="90"/>
          <line x1="0" y1="140" x2="860" y2="140"/><line x1="0" y1="190" x2="860" y2="190"/>
          <line x1="0" y1="240" x2="860" y2="240"/>
        </g>
        <!-- temperature area + line -->
        <path d="M0,190 C60,190 60,160 120,160 C180,160 180,170 240,170 C300,170 300,120 360,120 C420,120 420,132 480,132 C540,132 540,88 600,88 C660,88 660,100 720,100 C790,100 790,64 860,64 L860,240 L0,240 Z" fill="url(#sea)"/>
        <path d="M0,190 C60,190 60,160 120,160 C180,160 180,170 240,170 C300,170 300,120 360,120 C420,120 420,132 480,132 C540,132 540,88 600,88 C660,88 660,100 720,100 C790,100 790,64 860,64" fill="none" stroke="#35C4CF" stroke-width="2.5"/>
        <!-- salinity line -->
        <path d="M0,215 C60,215 60,208 120,208 C180,208 180,214 240,214 C300,214 300,196 360,196 C420,196 420,202 480,202 C540,202 540,184 600,184 C660,184 660,190 720,190 C790,190 790,176 860,176" fill="none" stroke="#FF7E6B" stroke-width="2"/>
        <!-- wave-crest markers -->
        <g fill="#35C4CF" stroke="#EAF6F6" stroke-width="1.2">
          <circle cx="360" cy="120" r="3.5"/><circle cx="600" cy="88" r="3.5"/><circle cx="852" cy="65" r="3.5"/>
        </g>
        <!-- x labels -->
        <g fill="#8FB6BE" font-family="Inter,sans-serif" font-size="11">
          <text x="2" y="262">Jun 01</text>
          <text x="198" y="262" text-anchor="middle">Jun 04</text>
          <text x="463" y="262" text-anchor="middle">Jun 08</text>
          <text x="662" y="262" text-anchor="middle">Jun 11</text>
          <text x="858" y="262" text-anchor="end">Jun 14</text>
        </g>
      </svg>
      <div class="legend">
        <span><i style="background:#35C4CF"></i>Temperature °C</span>
        <span><i style="background:#FF7E6B"></i>Salinity PSU</span>
      </div>
    </div>

    <!-- Station mix donut -->
    <div class="card">
      <div class="p-head">
        <div class="p-title">Station Mix</div>
        <div class="p-sub">By platform</div>
      </div>
      <svg viewBox="0 0 220 220" width="206" height="206" style="display:block;margin:0 auto">
        <g transform="translate(110,110)">
          <!-- ring track + segments via stroke-dasharray, r=80 circumference ≈ 502.6 -->
          <circle r="80" fill="none" stroke="rgba(234,246,246,.07)" stroke-width="16"/>
          <!-- Shore units 14% -->
          <circle r="80" fill="none" stroke="#F2E3C4" stroke-width="16" stroke-linecap="round" stroke-dasharray="70 432" stroke-dashoffset="-432" transform="rotate(-90)"/>
          <!-- Tide gauges 20% -->
          <circle r="80" fill="none" stroke="#9FE8C8" stroke-width="16" stroke-linecap="round" stroke-dasharray="100 402" stroke-dashoffset="-332" transform="rotate(-90)"/>
          <!-- Gliders 26% -->
          <circle r="80" fill="none" stroke="#FF7E6B" stroke-width="16" stroke-linecap="round" stroke-dasharray="131 371" stroke-dashoffset="-201" transform="rotate(-90)"/>
          <!-- Buoys 40% -->
          <circle r="80" fill="none" stroke="#35C4CF" stroke-width="16" stroke-linecap="round" stroke-dasharray="201 301" transform="rotate(-90)"/>
        </g>
        <text x="110" y="107" text-anchor="middle" font-family="Sora,sans-serif" font-size="30" font-weight="600" fill="#EAF6F6">248</text>
        <text x="110" y="128" text-anchor="middle" font-family="Inter,sans-serif" font-size="10" letter-spacing="2" fill="#8FB6BE">STATIONS</text>
      </svg>
      <div class="d-legend">
        <div class="dl"><span class="nm"><i style="background:#35C4CF"></i>Buoys</span><span class="pc">40%</span></div>
        <div class="dl"><span class="nm"><i style="background:#FF7E6B"></i>Gliders</span><span class="pc">26%</span></div>
        <div class="dl"><span class="nm"><i style="background:#9FE8C8"></i>Tide gauges</span><span class="pc">20%</span></div>
        <div class="dl"><span class="nm"><i style="background:#F2E3C4"></i>Shore units</span><span class="pc">14%</span></div>
      </div>
    </div>
  </section>

  <!-- Station table -->
  <div class="card twrap">
    <div class="p-head">
      <div class="p-title">Station Health</div>
      <div class="p-sub">Flagged &amp; representative stations · last 24h</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Station</th><th>Zone</th><th>Platform</th>
          <th style="text-align:right">Uptime</th><th style="text-align:right">Temp °C</th><th style="text-align:right">Δ Temp 24h</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="st">Buoy NW-04</td><td>North Reef</td><td>Buoy</td><td class="num">99.8%</td><td class="num">17.1</td><td class="num warm">+0.4°</td></tr>
        <tr><td class="st">Glider GL-11</td><td>Outer Shelf</td><td>Glider</td><td class="num">97.2%</td><td class="num">15.8</td><td class="num cool">−0.2°</td></tr>
        <tr><td class="st">Tide Gauge TG-02</td><td>Harbor Mouth</td><td>Gauge</td><td class="num">99.9%</td><td class="num">18.4</td><td class="num warm">+1.1°</td></tr>
        <tr><td class="st">Buoy SE-09</td><td>Kelp Bay</td><td>Buoy</td><td class="num">94.6%</td><td class="num">19.2</td><td class="num warm">+1.6°</td></tr>
        <tr><td class="st">Shore Unit SH-05</td><td>Estuary Flats</td><td>Shore</td><td class="num">98.1%</td><td class="num">16.4</td><td class="num cool">−0.5°</td></tr>
      </tbody>
    </table>
  </div>
</div>
</body>
</html>
```
