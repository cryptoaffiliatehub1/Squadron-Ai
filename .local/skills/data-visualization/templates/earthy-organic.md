---
name: earthy-organic
description: >-
  This "Earthy Organic" dashboard uses an off-white canvas (#F7F4ED) with oat cards (#FCFAF4), soft moss-green accents (primary #6B7B4F, deep #4F5E38, light #A8B889), warm clay (#B9755A / #C98A6E) for deltas and secondary highlights, and muted ink text (#3A3A32 headings, #7A7A6E muted). Typography pairs a humanist serif "Fraunces" for headings and numerals with "Nunito Sans"/system-ui for body and labels. The layout is a fixed 1440×900 grid: a slim top header with app title and pill filter controls, a row of four rounded (22px radius) KPI cards with soft layered shadows (0 8px 24px rgba(80,94,56,.08)), then a two-column body with a large area/line chart card on the left, a bar chart and donut on the right, and a slim data table along the bottom. Charts are inline SVG with gentle green sequential gradient fills (#A8B889→transparent), rounded bar caps, thin 1.5px strokes, dotted gridlines (#E6E2D6), and a donut using moss-to-clay sequential arcs. The overall aesthetic feels calm, natural, and tactile — generous spacing, organic rounded corners, low-contrast earthy tones, and a handcrafted humanist warmth.
---

# Earthy Organic

This "Earthy Organic" dashboard uses an off-white canvas (#F7F4ED) with oat cards (#FCFAF4), soft moss-green accents (primary #6B7B4F, deep #4F5E38, light #A8B889), warm clay (#B9755A / #C98A6E) for deltas and secondary highlights, and muted ink text (#3A3A32 headings, #7A7A6E muted). Typography pairs a humanist serif "Fraunces" for headings and numerals with "Nunito Sans"/system-ui for body and labels. The layout is a fixed 1440×900 grid: a slim top header with app title and pill filter controls, a row of four rounded (22px radius) KPI cards with soft layered shadows (0 8px 24px rgba(80,94,56,.08)), then a two-column body with a large area/line chart card on the left, a bar chart and donut on the right, and a slim data table along the bottom. Charts are inline SVG with gentle green sequential gradient fills (#A8B889→transparent), rounded bar caps, thin 1.5px strokes, dotted gridlines (#E6E2D6), and a donut using moss-to-clay sequential arcs. The overall aesthetic feels calm, natural, and tactile — generous spacing, organic rounded corners, low-contrast earthy tones, and a handcrafted humanist warmth.

## Source Code

A self-contained reference implementation of the "Earthy Organic" dashboard
preview. Use it as the visual target — translate the palette, typography, and
layout into the data-visualization React + Tailwind + Recharts app.
The fixed 1440×900 frame and hand-drawn inline-SVG charts below are
preview-rendering artifacts — keep the generated app's layout responsive
and build every chart with Recharts.

Responsive adaptation: This earthy-organic dashboard should feel spacious and rounded at every width: keep the 1600–1800px capped centered column on desktop, collapse the 1.55fr/1fr body to a single stacked column around 1200px while KPIs stay 4-up until ~900px then 2-up, and finally 1-up under 520px. Charts must retain their aspect ratio (never preserveAspectRatio=none) and shrink with their card; tables should horizontally scroll inside their rounded card with a soft fade mask; the donut and its legend should sit side-by-side down to ~480px then stack, and decorative pills/logos should wrap rather than shrink so the organic, generous padding is preserved on phones.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Terra Analytics</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Nunito+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#F7F4ED;
    --card:#FCFAF4;
    --moss:#6B7B4F;
    --moss-deep:#4F5E38;
    --moss-light:#A8B889;
    --clay:#B9755A;
    --clay-light:#C98A6E;
    --ink:#3A3A32;
    --muted:#7A7A6E;
    --line:#E6E2D6;
    --serif:'Fraunces',Georgia,'Times New Roman',serif;
    --sans:'Nunito Sans',system-ui,-apple-system,'Segoe UI',sans-serif;
  }
  *{box-sizing:border-box}
  html,body{margin:0}
  body{
    width:1440px;height:900px;overflow:hidden;
    background:var(--bg);color:var(--ink);
    font-family:var(--sans);
    -webkit-font-smoothing:antialiased;
  }
  .app{width:1440px;height:900px;padding:26px 34px;display:flex;flex-direction:column;gap:20px}

  /* Header */
  header{display:flex;align-items:center;justify-content:space-between}
  .brand{display:flex;align-items:center;gap:14px}
  .logo{width:42px;height:42px;border-radius:14px;background:linear-gradient(145deg,var(--moss),var(--moss-deep));display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px rgba(79,94,56,.25)}
  .logo svg{width:24px;height:24px}
  .brand h1{font-family:var(--serif);font-weight:600;font-size:24px;margin:0;letter-spacing:-.3px}
  .brand p{margin:2px 0 0;font-size:12.5px;color:var(--muted)}
  .controls{display:flex;gap:10px;align-items:center}
  .pill{background:var(--card);border:1px solid var(--line);border-radius:999px;padding:9px 16px;font-size:13px;color:var(--ink);display:flex;align-items:center;gap:8px;box-shadow:0 3px 10px rgba(80,94,56,.05);cursor:pointer}
  .pill.active{background:var(--moss);color:#fff;border-color:var(--moss)}
  .pill .dot{width:7px;height:7px;border-radius:50%;background:var(--moss-light)}
  .pill svg{width:14px;height:14px}

  /* KPI row */
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
  .kpi{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:20px 22px;box-shadow:0 8px 24px rgba(80,94,56,.08)}
  .kpi .top{display:flex;align-items:center;justify-content:space-between}
  .kpi .label{font-size:13px;color:var(--muted);font-weight:600}
  .kpi .ic{width:34px;height:34px;border-radius:11px;background:#EEF0E4;display:flex;align-items:center;justify-content:center}
  .kpi .ic svg{width:18px;height:18px}
  .kpi .val{font-family:var(--serif);font-size:32px;font-weight:600;margin:12px 0 6px;letter-spacing:-.5px}
  .delta{font-size:12.5px;font-weight:700;display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:999px}
  .up{color:#4F5E38;background:#E7EDD9}
  .down{color:#9E5640;background:#F3E2DA}
  .kpi .sub{font-size:12px;color:var(--muted);margin-left:8px}

  /* Body grid */
  .body{display:grid;grid-template-columns:1.55fr 1fr;gap:20px;flex:1;min-height:0}
  .col{display:flex;flex-direction:column;gap:20px;min-height:0}
  .card{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:20px 22px;box-shadow:0 8px 24px rgba(80,94,56,.08);display:flex;flex-direction:column}
  .card .head{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
  .card h3{font-family:var(--serif);font-weight:600;font-size:17px;margin:0}
  .card .meta{font-size:12px;color:var(--muted)}
  .legend{display:flex;gap:14px;font-size:11.5px;color:var(--muted)}
  .legend span{display:flex;align-items:center;gap:6px}
  .legend i{width:9px;height:9px;border-radius:3px;display:inline-block}

  .chart-area{flex:1;min-height:0}
  .row2{display:grid;grid-template-columns:1.3fr 1fr;gap:20px;flex:1;min-height:0}

  /* Donut center */
  .donut-wrap{display:flex;align-items:center;gap:14px;flex:1}
  .donut-legend{font-size:12px}
  .donut-legend li{list-style:none;display:flex;align-items:center;gap:8px;margin:7px 0;color:var(--muted)}
  .donut-legend i{width:9px;height:9px;border-radius:3px}
  .donut-legend b{color:var(--ink);font-family:var(--serif);margin-left:auto;font-weight:600}

  /* Table */
  table{width:100%;border-collapse:collapse;font-size:12.5px}
  th{text-align:left;color:var(--muted);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.6px;padding:8px 10px;border-bottom:1px solid var(--line)}
  td{padding:9px 10px;border-bottom:1px solid #F0EDE2}
  tr:last-child td{border-bottom:none}
  td.num{font-family:var(--serif);font-weight:600}
  .tag{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px}
  .t-on{background:#E7EDD9;color:#4F5E38}
  .t-mid{background:#FBF0D9;color:#9A7B33}
  .t-low{background:#F3E2DA;color:#9E5640}
  .ch{font-weight:700}
  .ch.u{color:#4F5E38}.ch.d{color:#9E5640}
</style>
</head>
<body>
<div class="app">

  <header>
    <div class="brand">
      <div class="logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="#EEF0E4" stroke-width="1.8" stroke-linecap="round"><path d="M12 21c0-6 0-9 5-12M12 21c0-5 0-8-5-10"/><path d="M17 4c-3 .5-4.5 2.5-5 6 3.2-.4 4.8-2 5-6Z" fill="#A8B889" stroke="none"/></svg>
      </div>
      <div>
        <h1>Terra Analytics</h1>
        <p>Growth overview · all products</p>
      </div>
    </div>
    <div class="controls">
      <div class="pill"><span class="dot"></span>North America</div>
      <div class="pill"><svg viewBox="0 0 24 24" fill="none" stroke="#7A7A6E" stroke-width="1.8"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>Last 30 days</div>
      <div class="pill active"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-3-6.7M21 4v4h-4"/></svg>Sync</div>
    </div>
  </header>

  <!-- KPIs -->
  <div class="kpis">
    <div class="kpi">
      <div class="top"><span class="label">Total Revenue</span>
        <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="#6B7B4F" stroke-width="1.8" stroke-linecap="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span>
      </div>
      <div class="val">$284,920</div>
      <span class="delta up">▲ 12.4%</span><span class="sub">vs last month</span>
    </div>
    <div class="kpi">
      <div class="top"><span class="label">Active Users</span>
        <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="#6B7B4F" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5"/><path d="M16 6.5a3 3 0 0 1 0 6M21 20c0-2.8-1.8-4.4-4-4.8"/></svg></span>
      </div>
      <div class="val">48,317</div>
      <span class="delta up">▲ 8.1%</span><span class="sub">vs last month</span>
    </div>
    <div class="kpi">
      <div class="top"><span class="label">Conversion Rate</span>
        <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="#6B7B4F" stroke-width="1.8" stroke-linecap="round"><path d="M4 18 18 4M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM20 16a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"/></svg></span>
      </div>
      <div class="val">3.92%</div>
      <span class="delta down">▼ 0.6%</span><span class="sub">vs last month</span>
    </div>
    <div class="kpi">
      <div class="top"><span class="label">MRR</span>
        <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="#6B7B4F" stroke-width="1.8" stroke-linecap="round"><path d="M3 17l5-5 4 3 6-7"/><path d="M21 8v4h-4"/></svg></span>
      </div>
      <div class="val">$72,480</div>
      <span class="delta up">▲ 5.3%</span><span class="sub">vs last month</span>
    </div>
  </div>

  <!-- Body -->
  <div class="body">
    <!-- Left big chart -->
    <div class="col">
      <div class="card" style="flex:1">
        <div class="head">
          <div><h3>Revenue Trend</h3><div class="meta">Daily gross · last 30 days</div></div>
          <div class="legend">
            <span><i style="background:var(--moss)"></i>This period</span>
            <span><i style="background:var(--clay-light)"></i>Last period</span>
          </div>
        </div>
        <div class="chart-area">
          <svg viewBox="0 0 760 300" width="100%" height="100%" preserveAspectRatio="none">
            <defs>
              <linearGradient id="ar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#A8B889" stop-opacity=".55"/>
                <stop offset="1" stop-color="#A8B889" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <!-- gridlines -->
            <g stroke="#E6E2D6" stroke-width="1" stroke-dasharray="3 5">
              <line x1="0" y1="55" x2="760" y2="55"/>
              <line x1="0" y1="120" x2="760" y2="120"/>
              <line x1="0" y1="185" x2="760" y2="185"/>
              <line x1="0" y1="250" x2="760" y2="250"/>
            </g>
            <!-- last period dashed -->
            <polyline fill="none" stroke="#C98A6E" stroke-width="1.8" stroke-dasharray="4 5" stroke-opacity=".8"
              points="0,200 65,185 130,205 195,170 260,180 325,150 390,165 455,140 520,155 585,130 650,145 715,120 760,128"/>
            <!-- area -->
            <path fill="url(#ar)" d="M0,175 65,160 130,168 195,135 260,150 325,110 390,128 455,90 520,108 585,72 650,95 715,55 760,62 L760,300 L0,300 Z"/>
            <!-- line -->
            <polyline fill="none" stroke="#6B7B4F" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"
              points="0,175 65,160 130,168 195,135 260,150 325,110 390,128 455,90 520,108 585,72 650,95 715,55 760,62"/>
            <circle cx="715" cy="55" r="5" fill="#fff" stroke="#6B7B4F" stroke-width="2.4"/>
          </svg>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);padding-top:6px">
          <span>Apr 1</span><span>Apr 6</span><span>Apr 12</span><span>Apr 18</span><span>Apr 24</span><span>Apr 30</span>
        </div>
      </div>

      <!-- bottom table -->
      <div class="card">
        <div class="head"><h3>Top Channels</h3><div class="meta">Sorted by revenue</div></div>
        <table>
          <thead><tr><th>Channel</th><th>Sessions</th><th>Conv.</th><th>Revenue</th><th>Change</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>Organic Search</td><td>18,420</td><td>4.2%</td><td class="num">$84,210</td><td class="ch u">+9.4%</td><td><span class="tag t-on">Healthy</span></td></tr>
            <tr><td>Email Campaigns</td><td>9,805</td><td>5.6%</td><td class="num">$61,340</td><td class="ch u">+14.2%</td><td><span class="tag t-on">Healthy</span></td></tr>
            <tr><td>Paid Social</td><td>12,110</td><td>3.1%</td><td class="num">$48,920</td><td class="ch d">−3.8%</td><td><span class="tag t-mid">Watch</span></td></tr>
            <tr><td>Referral</td><td>5,640</td><td>2.4%</td><td class="num">$22,470</td><td class="ch d">−6.1%</td><td><span class="tag t-low">Low</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Right column -->
    <div class="col">
      <div class="card" style="flex:1">
        <div class="head"><h3>Weekly Signups</h3><div class="meta">New accounts</div></div>
        <div class="chart-area">
          <svg viewBox="0 0 360 250" width="100%" height="100%" preserveAspectRatio="none">
            <defs>
              <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#7E9059"/>
                <stop offset="1" stop-color="#A8B889"/>
              </linearGradient>
            </defs>
            <g stroke="#E6E2D6" stroke-dasharray="3 5">
              <line x1="0" y1="50" x2="360" y2="50"/>
              <line x1="0" y1="110" x2="360" y2="110"/>
              <line x1="0" y1="170" x2="360" y2="170"/>
            </g>
            <g fill="url(#bar)">
              <rect x="14"  y="120" width="34" height="100" rx="9"/>
              <rect x="64"  y="95"  width="34" height="125" rx="9"/>
              <rect x="114" y="135" width="34" height="85"  rx="9"/>
              <rect x="164" y="70"  width="34" height="150" rx="9"/>
              <rect x="214" y="50"  width="34" height="170" rx="9"/>
              <rect x="264" y="88"  width="34" height="132" rx="9"/>
              <rect x="314" y="40"  width="34" height="180" rx="9"/>
            </g>
          </svg>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);padding:0 8px">
          <span>W1</span><span>W2</span><span>W3</span><span>W4</span><span>W5</span><span>W6</span><span>W7</span>
        </div>
      </div>

      <div class="card" style="flex:1">
        <div class="head"><h3>Plan Mix</h3><div class="meta">Active subscriptions</div></div>
        <div class="donut-wrap">
          <svg viewBox="0 0 130 130" width="150" height="150">
            <g transform="rotate(-90 65 65)" fill="none" stroke-width="20">
              <circle cx="65" cy="65" r="48" stroke="#4F5E38" stroke-dasharray="135 302" stroke-dashoffset="0"/>
              <circle cx="65" cy="65" r="48" stroke="#7E9059" stroke-dasharray="90 302" stroke-dashoffset="-135"/>
              <circle cx="65" cy="65" r="48" stroke="#A8B889" stroke-dasharray="60 302" stroke-dashoffset="-225"/>
              <circle cx="65" cy="65" r="48" stroke="#C98A6E" stroke-dasharray="17 302" stroke-dashoffset="-285"/>
            </g>
            <text x="65" y="60" text-anchor="middle" font-family="Fraunces,serif" font-size="22" font-weight="600" fill="#3A3A32">12.4k</text>
            <text x="65" y="78" text-anchor="middle" font-size="9" fill="#7A7A6E">subscribers</text>
          </svg>
          <ul class="donut-legend" style="flex:1;margin:0;padding:0">
            <li><i style="background:#4F5E38"></i>Enterprise <b>45%</b></li>
            <li><i style="background:#7E9059"></i>Business <b>30%</b></li>
            <li><i style="background:#A8B889"></i>Starter <b>20%</b></li>
            <li><i style="background:#C98A6E"></i>Trial <b>5%</b></li>
          </ul>
        </div>
      </div>
    </div>
  </div>

</div>
</body>
</html>
```
