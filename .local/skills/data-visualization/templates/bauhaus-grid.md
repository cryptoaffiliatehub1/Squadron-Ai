---
name: bauhaus-grid
description: >-
  This "Bauhaus Grid" dashboard restages a 1920s Bauhaus poster as an analytics product on gallery off-white (#F3EFE7) structured by thick 3px black rules and asymmetric flat geometry — a large yellow quarter-circle, a red triangle, and a blue circle placed off-grid. Panels are flat, square-cornered blocks: KPI tiles are solid color fields (red #D02C2F and blue #1E4B9E with white text, yellow #F2B600 with black text, plus one off-white tile with a 3px black border) carrying big geometric numerals, while chart and table panels sit on the off-white base inside 3px black frames. The accent palette is strictly red #D02C2F, blue #1E4B9E, yellow #F2B600, and black #111111; primary text is near-black #111111 with warm gray #6E675C for secondary labels. Everything is set in Jost (weights 500/600/700, a Futura heir) with tight uppercase letterspaced headers; the layout is a fixed 1440×900 grid with a ruled header, a 4-tile KPI row, a 2/3 + 1/3 chart split, and a full-width table. Charts are inline SVG drawn with black 2px lines over flat primary-color area fills — no gradients, no rounded corners, square everything — and the donut is flat red/blue/yellow/black segments separated by white gaps around a solid black center dot, while the table uses a 2px black header rule and flat color chips per row category. The overall aesthetic is constructivist and poster-like: flat, primary, rigorously gridded — form follows data.
---

# Bauhaus Grid

This "Bauhaus Grid" dashboard restages a 1920s Bauhaus poster as an analytics product on gallery off-white (#F3EFE7) structured by thick 3px black rules and asymmetric flat geometry — a large yellow quarter-circle, a red triangle, and a blue circle placed off-grid. Panels are flat, square-cornered blocks: KPI tiles are solid color fields (red #D02C2F and blue #1E4B9E with white text, yellow #F2B600 with black text, plus one off-white tile with a 3px black border) carrying big geometric numerals, while chart and table panels sit on the off-white base inside 3px black frames. The accent palette is strictly red #D02C2F, blue #1E4B9E, yellow #F2B600, and black #111111; primary text is near-black #111111 with warm gray #6E675C for secondary labels. Everything is set in Jost (weights 500/600/700, a Futura heir) with tight uppercase letterspaced headers; the layout is a fixed 1440×900 grid with a ruled header, a 4-tile KPI row, a 2/3 + 1/3 chart split, and a full-width table. Charts are inline SVG drawn with black 2px lines over flat primary-color area fills — no gradients, no rounded corners, square everything — and the donut is flat red/blue/yellow/black segments separated by white gaps around a solid black center dot, while the table uses a 2px black header rule and flat color chips per row category. The overall aesthetic is constructivist and poster-like: flat, primary, rigorously gridded — form follows data.

## Source Code

A self-contained reference implementation of the "Bauhaus Grid" dashboard
preview. Use it as the visual target — translate the palette, typography, and
layout into the data-visualization React + Tailwind + Recharts app.
The fixed 1440×900 frame and hand-drawn inline-SVG charts below are
preview-rendering artifacts — keep the generated app's layout responsive
and build every chart with Recharts.

Responsive adaptation: In this Bauhaus-grid style, preserve the strict geometric rhythm by collapsing the 4-up KPI row via auto-fit (min ~200px) rather than hard breakpoints, and stack the 2fr/1fr chart split below 1024px with the donut panel keeping its centered ring and full-width legend rows. Tables must live inside a horizontally scrollable wrapper with reduced side padding on phones and a visible scroll-affordance, while decorative primitives (yellow quarter-circle, blue disc) should scale with clamp() and anchor to the content column — hiding or shrinking aggressively below 600px so they never crowd the grid. SVG charts should retain their natural aspect ratio (no preserveAspectRatio='none') and cap the app at a max-width with centered gutters so ultra-wide screens don't strand decoration in empty margins.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1440, initial-scale=1">
<title>Bauhaus Grid — Studio Operations</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#F3EFE7; --ink:#111111; --red:#D02C2F; --blue:#1E4B9E; --yellow:#F2B600;
    --muted:#6E675C;
    --font:'Jost','Futura','Century Gothic',Verdana,sans-serif;
  }
  *{box-sizing:border-box}
  html,body{margin:0}
  body{width:1440px;height:900px;overflow:hidden;background:var(--bg);color:var(--ink);font-family:var(--font);position:relative}

  /* Decorative geometry */
  .geo-quarter{position:absolute;top:0;right:0;width:210px;height:210px;background:var(--yellow);border-radius:0 0 0 210px}
  .geo-circle{position:absolute;bottom:-70px;left:-70px;width:190px;height:190px;background:var(--blue);border-radius:50%}
  .geo-triangle{position:absolute;top:596px;right:0;width:0;height:0;border-bottom:110px solid var(--red);border-left:110px solid transparent}

  .app{position:relative;z-index:1;height:900px;padding:26px 36px;display:flex;flex-direction:column;gap:18px}

  /* Header */
  header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid var(--ink);padding-bottom:14px}
  .brand{display:flex;align-items:center;gap:16px}
  .mark{display:grid;grid-template-columns:21px 21px;grid-template-rows:21px 21px}
  .mark span:nth-child(1){background:var(--red)}
  .mark span:nth-child(2){background:var(--blue)}
  .mark span:nth-child(3){background:var(--yellow)}
  .mark span:nth-child(4){background:var(--ink)}
  .eyebrow{font-size:10px;font-weight:600;letter-spacing:.3em;text-transform:uppercase;color:var(--muted)}
  h1{margin:2px 0 0;font-size:28px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;line-height:1}
  .controls{display:flex;gap:12px}
  .ctl{border:2px solid var(--ink);background:var(--bg);padding:8px 14px;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;display:flex;align-items:center;gap:8px}
  .sq{width:8px;height:8px;background:var(--red);display:inline-block}

  /* KPI tiles */
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
  .kpi{padding:16px 20px 18px}
  .kpi .lbl{font-size:10px;font-weight:600;letter-spacing:.22em;text-transform:uppercase}
  .kpi .val{font-size:40px;font-weight:700;line-height:1.05;margin:6px 0 8px}
  .kpi-red{background:var(--red);color:#fff}
  .kpi-blue{background:var(--blue);color:#fff}
  .kpi-yellow{background:var(--yellow);color:var(--ink)}
  .kpi-paper{background:var(--bg);border:3px solid var(--ink)}
  .delta{display:inline-block;background:#fff;padding:3px 8px;font-size:11px;font-weight:700;letter-spacing:.08em}
  .delta.up{color:var(--blue)}
  .delta.down{color:var(--red)}
  .delta .since{color:var(--muted);font-weight:500}

  /* Chart panels */
  .charts{display:grid;grid-template-columns:2fr 1fr;gap:18px;flex:1;min-height:0}
  .panel{border:3px solid var(--ink);background:var(--bg);padding:14px 18px;display:flex;flex-direction:column;min-height:0}
  .panel-head{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid var(--ink);padding-bottom:8px;margin-bottom:12px}
  .panel-title{font-size:14px;font-weight:700;letter-spacing:.18em;text-transform:uppercase}
  .panel-sub{font-size:10px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
  .legend{display:flex;gap:18px;font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;margin-top:10px}
  .legend span{display:inline-flex;align-items:center;gap:7px}
  .lg-sq{width:10px;height:10px;display:inline-block}
  .lg-dash{width:18px;height:0;border-top:2px dashed var(--ink);display:inline-block}

  /* Donut */
  .donut-wrap{display:flex;flex-direction:column;align-items:center;flex:1;min-height:0}
  .donut-legend{width:100%;margin-top:10px}
  .dl-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(17,17,17,.25)}
  .dl-row:last-child{border-bottom:none}
  .dl-name{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
  .dl-val{font-weight:700;font-size:13px}

  /* Table */
  .tablewrap{border:3px solid var(--ink);background:var(--bg);padding:12px 18px 10px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  thead th{text-align:left;font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;padding:6px 0;border-bottom:2px solid var(--ink)}
  tbody td{padding:8px 0;border-bottom:1px solid rgba(17,17,17,.22)}
  tbody tr:last-child td{border-bottom:none}
  td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
  td.num{font-weight:600}
  .prog{font-weight:700;letter-spacing:.04em}
  .chip{display:inline-flex;align-items:center;gap:7px;font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
  .chip i{width:10px;height:10px;display:inline-block}
  .pos{color:var(--blue);font-weight:700}
  .neg{color:var(--red);font-weight:700}
</style>
</head>
<body>
  <!-- Decorative geometry -->
  <div class="geo-quarter"></div>
  <div class="geo-circle"></div>
  <div class="geo-triangle"></div>

  <div class="app">
    <!-- Header -->
    <header>
      <div class="brand">
        <div class="mark"><span></span><span></span><span></span><span></span></div>
        <div>
          <div class="eyebrow">Studio Operations · Volume 24</div>
          <h1>Form+Funktion</h1>
        </div>
      </div>
      <div class="controls">
        <div class="ctl">Period · Q3 2024</div>
        <div class="ctl">Studio · All Units</div>
        <div class="ctl"><span class="sq"></span>Live</div>
      </div>
    </header>

    <!-- KPI tiles -->
    <div class="kpis">
      <div class="kpi kpi-red">
        <div class="lbl">Projects Shipped</div>
        <div class="val">128</div>
        <span class="delta up">▲ 9.4% <span class="since">vs Q2</span></span>
      </div>
      <div class="kpi kpi-blue">
        <div class="lbl">Studio Utilization</div>
        <div class="val">86.2%</div>
        <span class="delta up">▲ 3.1% <span class="since">vs Q2</span></span>
      </div>
      <div class="kpi kpi-yellow">
        <div class="lbl">Billable Hours</div>
        <div class="val">12,480</div>
        <span class="delta up">▲ 6.8% <span class="since">vs Q2</span></span>
      </div>
      <div class="kpi kpi-paper">
        <div class="lbl">Avg Project Margin</div>
        <div class="val">31.5%</div>
        <span class="delta down">▼ 1.2% <span class="since">vs Q2</span></span>
      </div>
    </div>

    <!-- Charts -->
    <div class="charts">
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">Project Throughput</div>
          <div class="panel-sub">Weekly · 12 Weeks</div>
        </div>
        <svg viewBox="0 0 760 240" width="100%" height="100%" preserveAspectRatio="none" style="display:block;flex:1;min-height:0">
          <!-- gridlines -->
          <g stroke="rgba(17,17,17,.18)" stroke-width="1">
            <line x1="0" y1="30" x2="760" y2="30"/>
            <line x1="0" y1="75" x2="760" y2="75"/>
            <line x1="0" y1="120" x2="760" y2="120"/>
            <line x1="0" y1="165" x2="760" y2="165"/>
            <line x1="0" y1="210" x2="760" y2="210"/>
          </g>
          <!-- flat red area + black line: projects delivered -->
          <path d="M0,150 L69,138 L138,142 L207,118 L276,124 L345,98 L414,104 L483,84 L552,90 L621,66 L690,72 L760,52 L760,210 L0,210 Z" fill="#D02C2F"/>
          <path d="M0,150 L69,138 L138,142 L207,118 L276,124 L345,98 L414,104 L483,84 L552,90 L621,66 L690,72 L760,52" fill="none" stroke="#111111" stroke-width="2"/>
          <!-- dashed black line: studio capacity -->
          <path d="M0,118 L69,114 L138,110 L207,106 L276,102 L345,98 L414,94 L483,90 L552,86 L621,82 L690,78 L760,74" fill="none" stroke="#111111" stroke-width="2" stroke-dasharray="7 5"/>
          <rect x="752" y="46" width="12" height="12" fill="#111111"/>
          <!-- x labels -->
          <g fill="#6E675C" font-family="Jost,sans-serif" font-size="11" font-weight="600" text-anchor="middle">
            <text x="35" y="232">W27</text>
            <text x="173" y="232">W29</text>
            <text x="311" y="232">W31</text>
            <text x="449" y="232">W33</text>
            <text x="587" y="232">W35</text>
            <text x="725" y="232">W37</text>
          </g>
        </svg>
        <div class="legend">
          <span><i class="lg-sq" style="background:#D02C2F"></i>Projects Delivered</span>
          <span><i class="lg-dash"></i>Studio Capacity</span>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">Client Mix</div>
          <div class="panel-sub">Share of Billings</div>
        </div>
        <div class="donut-wrap">
          <svg viewBox="0 0 200 200" width="172" height="172">
            <!-- flat segments over white underlay, circumference ≈502 (r=80) -->
            <g transform="translate(100,100)">
              <circle r="80" fill="none" stroke="#FFFFFF" stroke-width="30"/>
              <circle r="80" fill="none" stroke="#D02C2F" stroke-width="30" stroke-dasharray="185 317" transform="rotate(-90)"/>
              <circle r="80" fill="none" stroke="#1E4B9E" stroke-width="30" stroke-dasharray="129 373" stroke-dashoffset="-191" transform="rotate(-90)"/>
              <circle r="80" fill="none" stroke="#F2B600" stroke-width="30" stroke-dasharray="94 408" stroke-dashoffset="-326" transform="rotate(-90)"/>
              <circle r="80" fill="none" stroke="#111111" stroke-width="30" stroke-dasharray="70 432" stroke-dashoffset="-426" transform="rotate(-90)"/>
              <circle r="14" fill="#111111"/>
            </g>
          </svg>
          <div class="donut-legend">
            <div class="dl-row"><span class="dl-name"><i class="lg-sq" style="background:#D02C2F"></i>Brand Identity</span><span class="dl-val">38%</span></div>
            <div class="dl-row"><span class="dl-name"><i class="lg-sq" style="background:#1E4B9E"></i>Product Design</span><span class="dl-val">27%</span></div>
            <div class="dl-row"><span class="dl-name"><i class="lg-sq" style="background:#F2B600"></i>Exhibition</span><span class="dl-val">20%</span></div>
            <div class="dl-row"><span class="dl-name"><i class="lg-sq" style="background:#111111"></i>Editorial</span><span class="dl-val">15%</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="tablewrap">
      <div class="panel-head" style="margin-bottom:2px">
        <div class="panel-title">Program Performance</div>
        <div class="panel-sub">Quarter to Date</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Program</th>
            <th>Discipline</th>
            <th>Lead</th>
            <th class="num">Projects</th>
            <th class="num">Hours</th>
            <th class="num">Billings</th>
            <th class="num">QoQ Δ</th>
          </tr>
        </thead>
        <tbody>
          <tr><td class="prog">Corporate Identity</td><td><span class="chip"><i style="background:#D02C2F"></i>Brand</span></td><td>A. Albers</td><td class="num">34</td><td class="num">4,120</td><td class="num">$612,400</td><td class="num pos">+12.6%</td></tr>
          <tr><td class="prog">Packaging System</td><td><span class="chip"><i style="background:#1E4B9E"></i>Product</span></td><td>L. Moholy</td><td class="num">26</td><td class="num">3,480</td><td class="num">$498,200</td><td class="num pos">+8.3%</td></tr>
          <tr><td class="prog">Exhibition Pavilion</td><td><span class="chip"><i style="background:#F2B600"></i>Spatial</span></td><td>M. Breuer</td><td class="num">18</td><td class="num">2,940</td><td class="num">$421,700</td><td class="num neg">−4.1%</td></tr>
          <tr><td class="prog">Type Specimen Series</td><td><span class="chip"><i style="background:#111111"></i>Editorial</span></td><td>H. Bayer</td><td class="num">22</td><td class="num">1,660</td><td class="num">$286,900</td><td class="num pos">+6.2%</td></tr>
          <tr><td class="prog">Poster Campaign</td><td><span class="chip"><i style="background:#D02C2F"></i>Brand</span></td><td>G. Stölzl</td><td class="num">28</td><td class="num">1,540</td><td class="num">$242,300</td><td class="num pos">+15.4%</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
```
