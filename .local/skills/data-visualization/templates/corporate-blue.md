---
name: corporate-blue
description: >-
  This "Corporate Blue" enterprise BI dashboard uses a crisp white canvas (#FFFFFF) with a light cool background (#F4F7FB), navy headers and text (#0F2747 / #1B3A6B), and an azure accent (#2563EB / #3B82F6) for primary data, supported by emerald (#059669) for positive deltas and red (#DC2626) for negatives, with hairline borders in #E2E8F0 and muted labels in #64748B. Typography is Inter (with -apple-system/Segoe UI/Roboto/sans-serif fallbacks), using a bold ~20px app title, 12px uppercase tracked section labels, and tabular 28px KPI figures. The layout is a structured 12-column grid inside a fixed 1440×900 frame: a slim top app bar with filter pills and a date control, a 4-up KPI card row, a 2/3 + 1/3 chart row (azure gradient area chart plus a navy donut with legend), and a bottom row pairing a vertical bar chart with a compact striped data table. Charts are inline SVG with subtle gridlines, rounded bars, soft drop shadows (0 1px 2px rgba(15,39,71,.06)) and 10px rounded card corners, creating a trustworthy, accessible, structured analytics aesthetic.
---

# Corporate Blue

This "Corporate Blue" enterprise BI dashboard uses a crisp white canvas (#FFFFFF) with a light cool background (#F4F7FB), navy headers and text (#0F2747 / #1B3A6B), and an azure accent (#2563EB / #3B82F6) for primary data, supported by emerald (#059669) for positive deltas and red (#DC2626) for negatives, with hairline borders in #E2E8F0 and muted labels in #64748B. Typography is Inter (with -apple-system/Segoe UI/Roboto/sans-serif fallbacks), using a bold ~20px app title, 12px uppercase tracked section labels, and tabular 28px KPI figures. The layout is a structured 12-column grid inside a fixed 1440×900 frame: a slim top app bar with filter pills and a date control, a 4-up KPI card row, a 2/3 + 1/3 chart row (azure gradient area chart plus a navy donut with legend), and a bottom row pairing a vertical bar chart with a compact striped data table. Charts are inline SVG with subtle gridlines, rounded bars, soft drop shadows (0 1px 2px rgba(15,39,71,.06)) and 10px rounded card corners, creating a trustworthy, accessible, structured analytics aesthetic.

## Source Code

A self-contained reference implementation of the "Corporate Blue" dashboard
preview. Use it as the visual target — translate the palette, typography, and
layout into the data-visualization React + Tailwind + Recharts app.
The fixed 1440×900 frame and hand-drawn inline-SVG charts below are
preview-rendering artifacts — keep the generated app's layout responsive
and build every chart with Recharts.

Responsive adaptation: This corporate-blue analytics skeleton should follow a strict stack-down cascade: 4-up KPI cards collapse to 2-up at ~1024px and 1-up only below ~420px; the 2fr/1fr charts row and 1fr/1fr bottom row both fold to a single column at 1024px, with the donut centering its SVG above a full-width legend. All chart SVGs must scale via aspect-ratio (not preserveAspectRatio="none") so gridlines and bars keep their geometry from 360px to 2200px, and the data table must retain a min-width and rely on its overflow-x wrapper for horizontal scroll on phones rather than crushing columns. The top bar should keep the brand left and collapse filter pills into a fluid, optionally scrollable control strip below 720px, never letting fixed-px controls force horizontal page overflow.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Corporate Blue — Revenue Intelligence</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root{
    --navy:#0F2747; --navy2:#1B3A6B; --azure:#2563EB; --azure-l:#3B82F6;
    --bg:#F4F7FB; --card:#FFFFFF; --line:#E2E8F0; --muted:#64748B;
    --up:#059669; --down:#DC2626; --chip:#EFF4FB;
  }
  *{box-sizing:border-box}
  html,body{margin:0}
  body{
    font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    background:var(--bg); color:var(--navy);
    width:1440px; height:900px; overflow:hidden;
  }
  .app{display:flex; flex-direction:column; height:900px; width:1440px;}

  /* Top bar */
  .topbar{
    height:64px; background:var(--card); border-bottom:1px solid var(--line);
    display:flex; align-items:center; gap:20px; padding:0 28px;
  }
  .brand{display:flex; align-items:center; gap:12px;}
  .logo{width:34px; height:34px; border-radius:8px; background:linear-gradient(135deg,var(--navy),var(--azure));
    display:grid; place-items:center; color:#fff; font-weight:800; font-size:16px;}
  .brand h1{font-size:18px; font-weight:700; margin:0; letter-spacing:-.2px;}
  .brand span{display:block; font-size:11px; color:var(--muted); font-weight:500;}
  .controls{margin-left:auto; display:flex; align-items:center; gap:10px;}
  .pill{
    display:flex; align-items:center; gap:8px; height:36px; padding:0 14px;
    border:1px solid var(--line); border-radius:8px; background:var(--card);
    font-size:13px; font-weight:600; color:var(--navy2);
  }
  .pill.accent{background:var(--azure); border-color:var(--azure); color:#fff;}
  .dot{width:8px;height:8px;border-radius:50%;background:var(--azure-l)}
  .pill.accent .dot{background:#fff}
  .av{width:34px;height:34px;border-radius:50%;background:var(--navy2);color:#fff;
    display:grid;place-items:center;font-size:12px;font-weight:700;}

  /* main grid */
  .main{flex:1; padding:22px 28px; display:flex; flex-direction:column; gap:18px;}
  .row{display:grid; gap:18px;}
  .kpis{grid-template-columns:repeat(4,1fr);}
  .charts{grid-template-columns:2fr 1fr;}
  .bottom{grid-template-columns:1fr 1fr;}

  .card{
    background:var(--card); border:1px solid var(--line); border-radius:10px;
    box-shadow:0 1px 2px rgba(15,39,71,.06); padding:18px;
  }
  .label{font-size:11px; font-weight:600; letter-spacing:.09em; text-transform:uppercase; color:var(--muted);}
  .kpi .label{display:flex; align-items:center; justify-content:space-between;}
  .icon{width:30px;height:30px;border-radius:7px;background:var(--chip);display:grid;place-items:center;color:var(--azure);}
  .value{font-size:28px; font-weight:800; letter-spacing:-.5px; margin:10px 0 6px;}
  .delta{font-size:12.5px; font-weight:600; display:flex; align-items:center; gap:6px;}
  .delta .tri{font-size:11px}
  .up{color:var(--up)} .down{color:var(--down)}
  .delta small{color:var(--muted); font-weight:500;}

  .card-head{display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;}
  .card-head h2{font-size:15px; font-weight:700; margin:0;}
  .legend{display:flex; gap:14px; font-size:12px; color:var(--muted); font-weight:500;}
  .lg{display:flex;align-items:center;gap:6px}
  .sw{width:10px;height:10px;border-radius:3px;display:inline-block}

  svg{display:block}
  .gridline{stroke:var(--line); stroke-width:1;}
  .axis{font-size:10px; fill:var(--muted); font-weight:500;}

  /* donut legend */
  .donut-wrap{display:flex; align-items:center; gap:18px;}
  .dlegend{display:flex; flex-direction:column; gap:12px; flex:1;}
  .dlegend .it{display:flex; align-items:center; justify-content:space-between; font-size:13px;}
  .dlegend .nm{display:flex; align-items:center; gap:8px; color:var(--navy2); font-weight:600;}
  .dlegend .vl{font-weight:700;}

  /* table */
  table{width:100%; border-collapse:collapse; font-size:13px;}
  th{text-align:left; font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted);
    font-weight:600; padding:8px 10px; border-bottom:1px solid var(--line);}
  td{padding:9px 10px; border-bottom:1px solid #EEF2F7; color:var(--navy2); font-weight:500;}
  tbody tr:nth-child(even){background:#FAFBFD;}
  td.num{font-variant-numeric:tabular-nums; font-weight:700; color:var(--navy);}
  .badge{display:inline-block; padding:2px 9px; border-radius:20px; font-size:11px; font-weight:700;}
  .b-up{background:#E7F6EF; color:var(--up);}
  .b-down{background:#FCEAEA; color:var(--down);}
  .b-flat{background:#EEF2F7; color:var(--muted);}
</style>
</head>
<body>
<div class="app">

  <!-- Top bar -->
  <div class="topbar">
    <div class="brand">
      <div class="logo">N</div>
      <div>
        <h1>Nimbus Analytics</h1>
        <span>Revenue Intelligence · Q3 FY2024</span>
      </div>
    </div>
    <div class="controls">
      <div class="pill"><span class="dot"></span>North America</div>
      <div class="pill">All Segments ▾</div>
      <div class="pill accent"><span class="dot"></span>Jul 1 – Sep 30, 2024</div>
      <div class="av">JD</div>
    </div>
  </div>

  <!-- main -->
  <div class="main">

    <!-- KPIs -->
    <div class="row kpis">
      <div class="card kpi">
        <div class="label">Total Revenue
          <span class="icon">$</span>
        </div>
        <div class="value">$4.82M</div>
        <div class="delta up"><span class="tri">▲</span>12.4% <small>vs prior qtr</small></div>
      </div>
      <div class="card kpi">
        <div class="label">Active Users
          <span class="icon">◴</span>
        </div>
        <div class="value">128,940</div>
        <div class="delta up"><span class="tri">▲</span>8.1% <small>vs prior qtr</small></div>
      </div>
      <div class="card kpi">
        <div class="label">Conversion Rate
          <span class="icon">%</span>
        </div>
        <div class="value">3.94%</div>
        <div class="delta down"><span class="tri">▼</span>0.6% <small>vs prior qtr</small></div>
      </div>
      <div class="card kpi">
        <div class="label">Net MRR
          <span class="icon">↻</span>
        </div>
        <div class="value">$612.5K</div>
        <div class="delta up"><span class="tri">▲</span>5.7% <small>vs prior qtr</small></div>
      </div>
    </div>

    <!-- charts -->
    <div class="row charts">
      <!-- area chart -->
      <div class="card">
        <div class="card-head">
          <h2>Revenue Trend</h2>
          <div class="legend">
            <span class="lg"><span class="sw" style="background:var(--azure)"></span>2024</span>
            <span class="lg"><span class="sw" style="background:#C8D6EE"></span>2023</span>
          </div>
        </div>
        <svg width="100%" height="248" viewBox="0 0 820 248" preserveAspectRatio="none">
          <defs>
            <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.32"/>
              <stop offset="100%" stop-color="#3B82F6" stop-opacity="0.02"/>
            </linearGradient>
          </defs>
          <!-- gridlines -->
          <line class="gridline" x1="44" y1="30"  x2="800" y2="30"/>
          <line class="gridline" x1="44" y1="80"  x2="800" y2="80"/>
          <line class="gridline" x1="44" y1="130" x2="800" y2="130"/>
          <line class="gridline" x1="44" y1="180" x2="800" y2="180"/>
          <line class="gridline" x1="44" y1="210" x2="800" y2="210"/>
          <!-- y labels -->
          <text class="axis" x="8" y="34">$5M</text>
          <text class="axis" x="8" y="84">$4M</text>
          <text class="axis" x="8" y="134">$3M</text>
          <text class="axis" x="8" y="184">$2M</text>
          <text class="axis" x="8" y="214">$1M</text>
          <!-- prior year (light) -->
          <polyline fill="none" stroke="#C8D6EE" stroke-width="2.5" stroke-linecap="round"
            points="44,165 130,150 216,158 302,135 388,142 474,120 560,128 646,112 732,118 800,108"/>
          <!-- current year area -->
          <path d="M44,140 L130,128 L216,135 L302,100 L388,108 L474,75 L560,84 L646,55 L732,62 L800,40
                   L800,210 L44,210 Z" fill="url(#ag)"/>
          <polyline fill="none" stroke="var(--azure)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
            points="44,140 130,128 216,135 302,100 388,108 474,75 560,84 646,55 732,62 800,40"/>
          <!-- markers -->
          <g fill="#fff" stroke="var(--azure)" stroke-width="2.5">
            <circle cx="302" cy="100" r="4"/><circle cx="474" cy="75" r="4"/>
            <circle cx="646" cy="55" r="4"/><circle cx="800" cy="40" r="4"/>
          </g>
          <!-- x labels -->
          <g class="axis" text-anchor="middle">
            <text x="87"  y="232">Jul W1</text><text x="173" y="232">Jul W3</text>
            <text x="259" y="232">Aug W1</text><text x="345" y="232">Aug W3</text>
            <text x="431" y="232">Aug W5</text><text x="517" y="232">Sep W2</text>
            <text x="603" y="232">Sep W3</text><text x="689" y="232">Sep W4</text>
            <text x="775" y="232">Sep W5</text>
          </g>
        </svg>
      </div>

      <!-- donut -->
      <div class="card">
        <div class="card-head"><h2>Revenue by Channel</h2></div>
        <div class="donut-wrap">
          <svg width="160" height="160" viewBox="0 0 160 160">
            <!-- circumference ~ 408.4 for r=65 -->
            <g transform="rotate(-90 80 80)" fill="none" stroke-width="22">
              <circle cx="80" cy="80" r="65" stroke="#0F2747" stroke-dasharray="163.4 245" />
              <circle cx="80" cy="80" r="65" stroke="#2563EB" stroke-dasharray="118.4 290" stroke-dashoffset="-163.4"/>
              <circle cx="80" cy="80" r="65" stroke="#3B82F6" stroke-dasharray="73.5 335" stroke-dashoffset="-281.8"/>
              <circle cx="80" cy="80" r="65" stroke="#93B4E8" stroke-dasharray="53.1 355" stroke-dashoffset="-355.3"/>
            </g>
            <text x="80" y="76" text-anchor="middle" font-size="22" font-weight="800" fill="#0F2747">$4.82M</text>
            <text x="80" y="94" text-anchor="middle" font-size="10.5" fill="#64748B" font-weight="600">TOTAL</text>
          </svg>
          <div class="dlegend">
            <div class="it"><span class="nm"><span class="sw" style="background:#0F2747"></span>Direct Sales</span><span class="vl">40%</span></div>
            <div class="it"><span class="nm"><span class="sw" style="background:#2563EB"></span>Partner</span><span class="vl">29%</span></div>
            <div class="it"><span class="nm"><span class="sw" style="background:#3B82F6"></span>Self-Serve</span><span class="vl">18%</span></div>
            <div class="it"><span class="nm"><span class="sw" style="background:#93B4E8"></span>Marketplace</span><span class="vl">13%</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- bottom -->
    <div class="row bottom">
      <!-- bar chart -->
      <div class="card">
        <div class="card-head">
          <h2>New Customers by Month</h2>
          <div class="legend"><span class="lg"><span class="sw" style="background:var(--azure)"></span>Acquired</span></div>
        </div>
        <svg width="100%" height="186" viewBox="0 0 560 186" preserveAspectRatio="none">
          <line class="gridline" x1="34" y1="20" x2="556" y2="20"/>
          <line class="gridline" x1="34" y1="60" x2="556" y2="60"/>
          <line class="gridline" x1="34" y1="100" x2="556" y2="100"/>
          <line class="gridline" x1="34" y1="140" x2="556" y2="140"/>
          <text class="axis" x="6" y="24">900</text>
          <text class="axis" x="6" y="64">600</text>
          <text class="axis" x="6" y="104">300</text>
          <g fill="var(--azure)">
            <rect x="56"  y="92"  width="42" height="48"  rx="5"/>
            <rect x="128" y="74"  width="42" height="66"  rx="5"/>
            <rect x="200" y="100" width="42" height="40"  rx="5"/>
            <rect x="272" y="58"  width="42" height="82"  rx="5"/>
            <rect x="344" y="44"  width="42" height="96"  rx="5"/>
            <rect x="416" y="66"  width="42" height="74"  rx="5"/>
            <rect x="488" y="32"  width="42" height="108" rx="5"/>
          </g>
          <g class="axis" text-anchor="middle">
            <text x="77"  y="158">Mar</text><text x="149" y="158">Apr</text>
            <text x="221" y="158">May</text><text x="293" y="158">Jun</text>
            <text x="365" y="158">Jul</text><text x="437" y="158">Aug</text>
            <text x="509" y="158">Sep</text>
          </g>
        </svg>
      </div>

      <!-- table -->
      <div class="card">
        <div class="card-head">
          <h2>Top Accounts</h2>
          <div class="legend">Showing 5 of 248</div>
        </div>
        <table>
          <thead>
            <tr><th>Account</th><th>Plan</th><th>MRR</th><th>Trend</th></tr>
          </thead>
          <tbody>
            <tr><td>Helix Robotics</td><td>Enterprise</td><td class="num">$48,200</td><td><span class="badge b-up">▲ 14%</span></td></tr>
            <tr><td>Northwind Group</td><td>Enterprise</td><td class="num">$39,750</td><td><span class="badge b-up">▲ 9%</span></td></tr>
            <tr><td>Verda Logistics</td><td>Growth</td><td class="num">$27,400</td><td><span class="badge b-down">▼ 3%</span></td></tr>
            <tr><td>Atlas Media Co.</td><td>Growth</td><td class="num">$21,980</td><td><span class="badge b-flat">— 0%</span></td></tr>
            <tr><td>Quanta Health</td><td>Business</td><td class="num">$18,640</td><td><span class="badge b-up">▲ 6%</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</div>
</body>
</html>
```
