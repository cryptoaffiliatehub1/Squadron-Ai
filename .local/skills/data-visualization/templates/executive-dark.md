---
name: executive-dark
description: >-
  This "Executive Dark" dashboard uses a premium near-black slate palette: page background #0A0B0F with layered panels in #111319 and #15171F, hairline borders in rgba(255,255,255,0.06), and a single indigo accent (#6366F1 with #818CF8 highlights and soft glows via box-shadow rgba(99,102,241,0.25)). Typography is Inter (with system-ui/-apple-system/Segoe UI fallbacks): tiny uppercase tracked labels in muted #6B7280, body text in #9CA3AF, and very large tabular-numeral KPI values in #F8FAFC at ~40px weight 700. The layout is a fixed 1440×900 grid with a slim top header (app name + segmented date control), a row of four KPI cards, then a two-column zone holding a wide indigo area/line chart (gradient fill from rgba(99,102,241,0.35) to transparent, smooth stroke, dotted gridlines) beside a donut chart, with a bar chart and compact data table beneath. Deltas use emerald #34D399 for positive and rose #FB7185 for negative; everything is spaced generously with 16–20px gaps, 14px rounded corners, and subtle inner glows, conveying a calm, high-end leadership-readout aesthetic. To reproduce in React + Tailwind + Recharts, map these to bg-[#0A0B0F], card bg-[#111319], accent indigo-500, font-sans Inter, and Recharts with CartesianGrid strokeDasharray, an indigo linearGradient Area, and tabular-nums KPI numbers.
---

# Executive Dark

This "Executive Dark" dashboard uses a premium near-black slate palette: page background #0A0B0F with layered panels in #111319 and #15171F, hairline borders in rgba(255,255,255,0.06), and a single indigo accent (#6366F1 with #818CF8 highlights and soft glows via box-shadow rgba(99,102,241,0.25)). Typography is Inter (with system-ui/-apple-system/Segoe UI fallbacks): tiny uppercase tracked labels in muted #6B7280, body text in #9CA3AF, and very large tabular-numeral KPI values in #F8FAFC at ~40px weight 700. The layout is a fixed 1440×900 grid with a slim top header (app name + segmented date control), a row of four KPI cards, then a two-column zone holding a wide indigo area/line chart (gradient fill from rgba(99,102,241,0.35) to transparent, smooth stroke, dotted gridlines) beside a donut chart, with a bar chart and compact data table beneath. Deltas use emerald #34D399 for positive and rose #FB7185 for negative; everything is spaced generously with 16–20px gaps, 14px rounded corners, and subtle inner glows, conveying a calm, high-end leadership-readout aesthetic. To reproduce in React + Tailwind + Recharts, map these to bg-[#0A0B0F], card bg-[#111319], accent indigo-500, font-sans Inter, and Recharts with CartesianGrid strokeDasharray, an indigo linearGradient Area, and tabular-nums KPI numbers.

## Source Code

A self-contained reference implementation of the "Executive Dark" dashboard
preview. Use it as the visual target — translate the palette, typography, and
layout into the data-visualization React + Tailwind + Recharts app.
The fixed 1440×900 frame and hand-drawn inline-SVG charts below are
preview-rendering artifacts — keep the generated app's layout responsive
and build every chart with Recharts.

Responsive adaptation: This executive-dark dashboard should keep its 4-up KPI row through desktop, collapse to 2-up between 1024–640px, then stack to 1-up under 480px; the 1.65fr/1fr mid split and 1.1fr/1.4fr bottom split should both stack vertically below 1024px with the donut ring shrinking via clamp() and its legend flowing beneath it on phones. Tables must remain in a horizontally-scrollable wrapper with a fade/shadow affordance rather than reflowing, while chart heights, bar gaps, ring size, and card padding should all be fluid via clamp() so nothing pins to fixed px at 360px. On ultrawide (>1800px) widen the max-width toward ~1900px and anchor decorative gradients in vw units so the composition doesn't drift into a narrow centered column.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1440, initial-scale=1">
<title>Executive Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#0A0B0F; --panel:#111319; --panel2:#15171F;
    --line:rgba(255,255,255,0.06); --line2:rgba(255,255,255,0.10);
    --ink:#F8FAFC; --sub:#9CA3AF; --mut:#6B7280;
    --indigo:#6366F1; --indigo2:#818CF8;
    --up:#34D399; --down:#FB7185;
  }
  *{box-sizing:border-box}
  html,body{margin:0}
  body{
    width:1440px;height:900px;overflow:hidden;background:var(--bg);
    font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
    color:var(--ink);
    background-image:radial-gradient(900px 500px at 78% -10%,rgba(99,102,241,0.10),transparent 60%);
  }
  .app{height:900px;display:flex;flex-direction:column;padding:20px 24px;gap:18px}

  header{display:flex;align-items:center;justify-content:space-between}
  .brand{display:flex;align-items:center;gap:12px}
  .logo{width:34px;height:34px;border-radius:9px;background:linear-gradient(140deg,var(--indigo),#4338CA);
    box-shadow:0 0 0 1px rgba(255,255,255,0.08),0 8px 24px rgba(99,102,241,0.35);
    display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px}
  .brand h1{font-size:16px;font-weight:700;margin:0;letter-spacing:-0.2px}
  .brand p{margin:0;font-size:11px;color:var(--mut)}
  .controls{display:flex;align-items:center;gap:12px}
  .seg{display:flex;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:3px}
  .seg button{border:0;background:transparent;color:var(--sub);font-family:inherit;font-size:12px;
    font-weight:600;padding:7px 13px;border-radius:7px;cursor:pointer}
  .seg button.on{background:var(--indigo);color:#fff;box-shadow:0 4px 14px rgba(99,102,241,0.4)}
  .pill{display:flex;align-items:center;gap:8px;background:var(--panel);border:1px solid var(--line);
    border-radius:10px;padding:8px 13px;font-size:12px;font-weight:500;color:var(--sub)}
  .dot{width:7px;height:7px;border-radius:50%;background:var(--up);box-shadow:0 0 8px var(--up)}

  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px}
  .kpi .lbl{font-size:10.5px;letter-spacing:1.4px;text-transform:uppercase;color:var(--mut);font-weight:600}
  .kpi .val{font-size:38px;font-weight:700;letter-spacing:-1px;margin:10px 0 6px;
    font-variant-numeric:tabular-nums}
  .delta{font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:5px}
  .delta.u{color:var(--up)} .delta.d{color:var(--down)}
  .delta .since{color:var(--mut);font-weight:500}
  .spark{margin-top:10px}

  .mid{display:grid;grid-template-columns:1.65fr 1fr;gap:16px}
  .ph{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
  .ph h3{margin:0;font-size:13px;font-weight:600;letter-spacing:-0.1px}
  .ph .sub{font-size:11px;color:var(--mut)}
  .legend{display:flex;gap:14px;font-size:11px;color:var(--sub)}
  .lg{display:inline-flex;align-items:center;gap:6px}
  .lg i{width:9px;height:9px;border-radius:3px;display:inline-block}

  .donutwrap{display:flex;align-items:center;gap:18px;margin-top:6px}
  .dlist{flex:1;display:flex;flex-direction:column;gap:11px}
  .drow{display:flex;align-items:center;gap:10px;font-size:12px}
  .drow .nm{color:var(--sub);flex:1}
  .drow .pc{color:var(--ink);font-weight:600;font-variant-numeric:tabular-nums}

  .bottom{display:grid;grid-template-columns:1.1fr 1.4fr;gap:16px;flex:1;min-height:0}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--mut);text-align:left;
    font-weight:600;padding:8px 6px;border-bottom:1px solid var(--line)}
  td{font-size:12.5px;padding:9px 6px;border-bottom:1px solid var(--line);color:var(--sub)}
  td.r,th.r{text-align:right;font-variant-numeric:tabular-nums}
  td .nm{color:var(--ink);font-weight:600}
  .tag{font-size:10px;font-weight:600;padding:3px 8px;border-radius:6px}
  .tag.g{color:var(--up);background:rgba(52,211,153,0.12)}
  .tag.r{color:var(--down);background:rgba(251,113,133,0.12)}
  .tag.i{color:var(--indigo2);background:rgba(99,102,241,0.14)}
</style>
</head>
<body>
<div class="app">

  <header>
    <div class="brand">
      <div class="logo">N</div>
      <div>
        <h1>Northwind · Executive Pulse</h1>
        <p>Company performance overview</p>
      </div>
    </div>
    <div class="controls">
      <div class="pill"><span class="dot"></span> Live · synced 2m ago</div>
      <div class="pill">Q3 2024 · Global</div>
      <div class="seg">
        <button>7D</button>
        <button>30D</button>
        <button class="on">QTD</button>
        <button>YTD</button>
      </div>
    </div>
  </header>

  <!-- KPIs -->
  <div class="kpis">
    <div class="card kpi">
      <div class="lbl">Total Revenue</div>
      <div class="val">$8.42M</div>
      <div class="delta u">▲ 12.6% <span class="since">vs last quarter</span></div>
      <svg class="spark" width="100%" height="34" viewBox="0 0 220 34" preserveAspectRatio="none">
        <polyline fill="none" stroke="#34D399" stroke-width="2" points="0,28 30,24 60,26 90,18 120,20 150,12 180,14 220,5"/>
      </svg>
    </div>
    <div class="card kpi">
      <div class="lbl">Active Users</div>
      <div class="val">128.9K</div>
      <div class="delta u">▲ 8.1% <span class="since">vs last quarter</span></div>
      <svg class="spark" width="100%" height="34" viewBox="0 0 220 34" preserveAspectRatio="none">
        <polyline fill="none" stroke="#818CF8" stroke-width="2" points="0,22 30,20 60,24 90,16 120,18 150,11 180,13 220,7"/>
      </svg>
    </div>
    <div class="card kpi">
      <div class="lbl">Conversion Rate</div>
      <div class="val">4.78%</div>
      <div class="delta d">▼ 0.4% <span class="since">vs last quarter</span></div>
      <svg class="spark" width="100%" height="34" viewBox="0 0 220 34" preserveAspectRatio="none">
        <polyline fill="none" stroke="#FB7185" stroke-width="2" points="0,10 30,12 60,9 90,15 120,13 150,18 180,17 220,22"/>
      </svg>
    </div>
    <div class="card kpi">
      <div class="lbl">Net MRR</div>
      <div class="val">$642K</div>
      <div class="delta u">▲ 5.3% <span class="since">vs last quarter</span></div>
      <svg class="spark" width="100%" height="34" viewBox="0 0 220 34" preserveAspectRatio="none">
        <polyline fill="none" stroke="#34D399" stroke-width="2" points="0,26 30,22 60,23 90,19 120,17 150,15 180,12 220,9"/>
      </svg>
    </div>
  </div>

  <!-- Mid: area + donut -->
  <div class="mid">
    <div class="card">
      <div class="ph">
        <div>
          <h3>Revenue Trend</h3>
          <div class="sub">Monthly recurring + one-time · USD</div>
        </div>
        <div class="legend">
          <span class="lg"><i style="background:#6366F1"></i> Revenue</span>
          <span class="lg"><i style="background:#475569"></i> Forecast</span>
        </div>
      </div>
      <svg width="100%" height="210" viewBox="0 0 760 210" preserveAspectRatio="none">
        <defs>
          <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(99,102,241,0.38)"/>
            <stop offset="100%" stop-color="rgba(99,102,241,0)"/>
          </linearGradient>
        </defs>
        <g stroke="rgba(255,255,255,0.06)" stroke-dasharray="3 5">
          <line x1="0" y1="40" x2="760" y2="40"/>
          <line x1="0" y1="90" x2="760" y2="90"/>
          <line x1="0" y1="140" x2="760" y2="140"/>
          <line x1="0" y1="185" x2="760" y2="185"/>
        </g>
        <path d="M0,150 C70,140 110,120 160,118 C220,116 250,90 320,92 C380,94 410,70 470,62 C540,53 580,48 640,40 C690,33 730,26 760,22 L760,210 L0,210 Z" fill="url(#fill)"/>
        <path d="M0,150 C70,140 110,120 160,118 C220,116 250,90 320,92 C380,94 410,70 470,62 C540,53 580,48 640,40 C690,33 730,26 760,22" fill="none" stroke="#818CF8" stroke-width="2.5"/>
        <path d="M640,40 C690,33 730,26 760,22" fill="none" stroke="#475569" stroke-width="2.5" stroke-dasharray="5 4"/>
        <circle cx="470" cy="62" r="4" fill="#0A0B0F" stroke="#818CF8" stroke-width="2.5"/>
      </svg>
      <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--mut);margin-top:2px">
        <span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span>
      </div>
    </div>

    <div class="card">
      <div class="ph">
        <div><h3>Revenue by Segment</h3><div class="sub">Share of total</div></div>
      </div>
      <div class="donutwrap">
        <svg width="150" height="150" viewBox="0 0 42 42">
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#1E2230" stroke-width="6"/>
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#6366F1" stroke-width="6"
            stroke-dasharray="44 56" stroke-dashoffset="25" stroke-linecap="round"/>
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#818CF8" stroke-width="6"
            stroke-dasharray="28 72" stroke-dashoffset="-19" stroke-linecap="round"/>
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#4338CA" stroke-width="6"
            stroke-dasharray="18 82" stroke-dashoffset="-47" stroke-linecap="round"/>
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#475569" stroke-width="6"
            stroke-dasharray="10 90" stroke-dashoffset="-65" stroke-linecap="round"/>
          <text x="21" y="20.5" text-anchor="middle" fill="#F8FAFC" font-size="6.5" font-weight="700">$8.4M</text>
          <text x="21" y="26" text-anchor="middle" fill="#6B7280" font-size="2.6">total</text>
        </svg>
        <div class="dlist">
          <div class="drow"><i style="width:9px;height:9px;border-radius:3px;background:#6366F1"></i><span class="nm">Enterprise</span><span class="pc">44%</span></div>
          <div class="drow"><i style="width:9px;height:9px;border-radius:3px;background:#818CF8"></i><span class="nm">Mid-Market</span><span class="pc">28%</span></div>
          <div class="drow"><i style="width:9px;height:9px;border-radius:3px;background:#4338CA"></i><span class="nm">SMB</span><span class="pc">18%</span></div>
          <div class="drow"><i style="width:9px;height:9px;border-radius:3px;background:#475569"></i><span class="nm">Self-Serve</span><span class="pc">10%</span></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Bottom: bars + table -->
  <div class="bottom">
    <div class="card">
      <div class="ph">
        <div><h3>Acquisition by Channel</h3><div class="sub">New customers · QTD</div></div>
      </div>
      <svg width="100%" height="150" viewBox="0 0 420 150" preserveAspectRatio="none">
        <g fill="#6366F1">
          <rect x="14" y="46" width="40" height="86" rx="4"/>
          <rect x="74" y="22" width="40" height="110" rx="4" fill="#818CF8"/>
          <rect x="134" y="70" width="40" height="62" rx="4"/>
          <rect x="194" y="58" width="40" height="74" rx="4"/>
          <rect x="254" y="90" width="40" height="42" rx="4" fill="#475569"/>
          <rect x="314" y="36" width="40" height="96" rx="4"/>
          <rect x="374" y="78" width="40" height="54" rx="4" fill="#475569"/>
        </g>
      </svg>
      <div style="display:flex;justify-content:space-between;font-size:9.5px;color:var(--mut);padding:0 6px">
        <span>Organic</span><span>Paid</span><span>Email</span><span>Social</span><span>Refer.</span><span>Partner</span><span>Other</span>
      </div>
    </div>

    <div class="card">
      <div class="ph">
        <div><h3>Top Accounts</h3><div class="sub">Ranked by quarterly contract value</div></div>
        <div class="sub">7 of 248</div>
      </div>
      <table>
        <thead>
          <tr><th>Account</th><th>Plan</th><th class="r">QCV</th><th class="r">Growth</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr><td><span class="nm">Meridian Labs</span></td><td>Enterprise</td><td class="r">$412K</td><td class="r" style="color:var(--up)">+18%</td><td><span class="tag g">Healthy</span></td></tr>
          <tr><td><span class="nm">Vantage Group</span></td><td>Enterprise</td><td class="r">$338K</td><td class="r" style="color:var(--up)">+9%</td><td><span class="tag g">Healthy</span></td></tr>
          <tr><td><span class="nm">Orbit Systems</span></td><td>Mid-Market</td><td class="r">$214K</td><td class="r" style="color:var(--down)">−4%</td><td><span class="tag r">At Risk</span></td></tr>
          <tr><td><span class="nm">Cobalt Finance</span></td><td>Enterprise</td><td class="r">$196K</td><td class="r" style="color:var(--up)">+22%</td><td><span class="tag i">Expanding</span></td></tr>
          <tr><td><span class="nm">Helix Retail</span></td><td>Mid-Market</td><td class="r">$158K</td><td class="r" style="color:var(--up)">+6%</td><td><span class="tag g">Healthy</span></td></tr>
          <tr><td><span class="nm">Northpeak Co.</span></td><td>SMB</td><td class="r">$92K</td><td class="r" style="color:var(--up)">+11%</td><td><span class="tag i">Expanding</span></td></tr>
        </tbody>
      </table>
    </div>
  </div>

</div>
</body>
</html>
```
