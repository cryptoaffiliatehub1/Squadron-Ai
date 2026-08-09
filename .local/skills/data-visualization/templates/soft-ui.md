---
name: soft-ui
description: >-
  This Soft UI dashboard uses a single neumorphic base color of #e0e5ec with all cards extruded via dual shadows (light #ffffff top-left, dark #a3b1c6 bottom-right) and a rounded-2xl (20px) radius for a tactile one-material feel; recessed/inset elements use inverted shadows. Typography is "Poppins" with system-ui/Segoe UI fallbacks, where headings are 600 weight in slate #3d4a5c and muted labels are #8a98ab. The layout is a fixed 1440×900 grid: a top header bar with app name plus pill-shaped filter and date controls, a row of four KPI cards showing value and colored up/down deltas, a 2-column chart region (a soft gradient area chart and a rounded bar chart) beside a donut chart, and a clean data table below. Pastel accents are low-contrast: lavender #a3a0e6, mint #8fd3c4, peach #f0b8a0, and sky #9ec5e8, with chart fills as soft gradients and gridlines barely visible; the overall aesthetic is calm, plush, and pillowy with generous 24px spacing and no hard borders.
---

# Soft UI

This Soft UI dashboard uses a single neumorphic base color of #e0e5ec with all cards extruded via dual shadows (light #ffffff top-left, dark #a3b1c6 bottom-right) and a rounded-2xl (20px) radius for a tactile one-material feel; recessed/inset elements use inverted shadows. Typography is "Poppins" with system-ui/Segoe UI fallbacks, where headings are 600 weight in slate #3d4a5c and muted labels are #8a98ab. The layout is a fixed 1440×900 grid: a top header bar with app name plus pill-shaped filter and date controls, a row of four KPI cards showing value and colored up/down deltas, a 2-column chart region (a soft gradient area chart and a rounded bar chart) beside a donut chart, and a clean data table below. Pastel accents are low-contrast: lavender #a3a0e6, mint #8fd3c4, peach #f0b8a0, and sky #9ec5e8, with chart fills as soft gradients and gridlines barely visible; the overall aesthetic is calm, plush, and pillowy with generous 24px spacing and no hard borders.

## Source Code

A self-contained reference implementation of the "Soft UI" dashboard
preview. Use it as the visual target — translate the palette, typography, and
layout into the data-visualization React + Tailwind + Recharts app.
The fixed 1440×900 frame and hand-drawn inline-SVG charts below are
preview-rendering artifacts — keep the generated app's layout responsive
and build every chart with Recharts.

Responsive adaptation: A soft-UI neumorphic dashboard should treat every raised card as a self-contained fluid unit: KPI grids collapse 4→2→1 at ~900px and ~520px, the two chart columns and the right rail collapse to a single stack below ~1200px with the rail becoming a two-up flex row on tablets before stacking on phones, and the accounts table must live inside its own overflow-x:auto scroller with a fixed min-width so the card itself never overflows. SVG charts should scale via aspect-ratio (not stretched preserveAspectRatio=none), the donut ring and neumorphic shadow depths should shrink with clamp() on smaller viewports, and on ultra-wide screens the wrap should cap around 1600px while inner grids use minmax(0,1fr) to avoid sparse stretched cards.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Soft UI Analytics</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --base:#e0e5ec;
    --light:#ffffff;
    --dark:#a3b1c6;
    --text:#3d4a5c;
    --muted:#8a98ab;
    --lav:#a3a0e6;
    --mint:#8fd3c4;
    --peach:#f0b8a0;
    --sky:#9ec5e8;
    --up:#5fb98e;
    --down:#e08f8f;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{margin:0;height:100%}
  body{
    width:1440px;height:900px;overflow:hidden;
    background:var(--base);
    font-family:"Poppins",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
    color:var(--text);
    padding:24px;
  }
  .raised{
    background:var(--base);
    border-radius:20px;
    box-shadow:-7px -7px 14px var(--light),7px 7px 16px var(--dark);
  }
  .inset{
    background:var(--base);
    border-radius:14px;
    box-shadow:inset -4px -4px 8px var(--light),inset 4px 4px 8px var(--dark);
  }
  /* header */
  header{
    display:flex;align-items:center;justify-content:space-between;
    height:64px;padding:0 26px;margin-bottom:24px;
  }
  .brand{display:flex;align-items:center;gap:14px}
  .logo{
    width:40px;height:40px;border-radius:13px;display:flex;align-items:center;justify-content:center;
    box-shadow:-3px -3px 6px var(--light),3px 3px 7px var(--dark);
  }
  .logo span{
    width:16px;height:16px;border-radius:6px;
    background:linear-gradient(135deg,var(--lav),var(--sky));
  }
  .brand h1{font-size:18px;font-weight:600;letter-spacing:.2px}
  .brand p{font-size:11px;color:var(--muted);font-weight:400}
  .controls{display:flex;gap:14px;align-items:center}
  .pill{
    height:40px;display:flex;align-items:center;gap:10px;padding:0 18px;border-radius:13px;
    font-size:13px;color:var(--text);font-weight:500;cursor:pointer;
  }
  .pill .ic{width:8px;height:8px;border-radius:50%}
  .pill.solid{
    background:linear-gradient(135deg,var(--lav),#8f8de0);
    color:#fff;box-shadow:-3px -3px 7px var(--light),3px 3px 8px var(--dark);
  }
  .pill.solid small{opacity:.85}

  /* KPI row */
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-bottom:24px}
  .kpi{padding:22px 24px;height:128px;display:flex;flex-direction:column;justify-content:space-between}
  .kpi .top{display:flex;justify-content:space-between;align-items:flex-start}
  .kpi .label{font-size:12.5px;color:var(--muted);font-weight:500}
  .kpi .icon{
    width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;
    box-shadow:inset -3px -3px 6px var(--light),inset 3px 3px 6px var(--dark);
  }
  .kpi .icon svg{width:18px;height:18px}
  .kpi .val{font-size:28px;font-weight:700;letter-spacing:.3px}
  .kpi .delta{font-size:12px;font-weight:600;display:flex;align-items:center;gap:5px}
  .up{color:var(--up)}.down{color:var(--down)}
  .delta .arrow{font-size:13px}

  /* main grid */
  .grid{display:grid;grid-template-columns:1fr 1fr 380px;gap:24px;height:540px}
  .card{padding:22px 24px;display:flex;flex-direction:column}
  .card h3{font-size:14.5px;font-weight:600}
  .card .sub{font-size:11.5px;color:var(--muted);margin-top:2px}
  .ch-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px}
  .legend{display:flex;gap:14px;font-size:11px;color:var(--muted);align-items:center}
  .legend span{display:flex;align-items:center;gap:6px}
  .dot{width:9px;height:9px;border-radius:50%}

  /* donut + table column */
  .rightcol{display:flex;flex-direction:column;gap:24px}
  .donutcard{flex:0 0 auto;padding:22px 24px}
  .donut-wrap{display:flex;align-items:center;gap:18px;margin-top:6px}
  .dleg{display:flex;flex-direction:column;gap:11px;font-size:12px}
  .dleg div{display:flex;align-items:center;gap:9px}
  .dleg b{margin-left:auto;font-weight:600}
  .tablecard{flex:1;padding:18px 22px;display:flex;flex-direction:column;overflow:hidden}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
  th{text-align:left;color:var(--muted);font-weight:500;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;padding:7px 4px}
  td{padding:8px 4px;font-weight:500}
  tr+tr td{border-top:1px solid #d3d9e3}
  .tag{font-size:10px;font-weight:600;padding:3px 9px;border-radius:8px}
  .t-ok{color:var(--up);background:rgba(95,185,142,.14)}
  .t-pend{color:var(--peach);background:rgba(240,184,160,.2)}
  .av{width:24px;height:24px;border-radius:8px;display:inline-block;vertical-align:middle;margin-right:8px;
     box-shadow:inset -2px -2px 4px var(--light),inset 2px 2px 4px var(--dark)}
</style>
</head>
<body>
  <header class="raised">
    <div class="brand">
      <div class="logo"><span></span></div>
      <div>
        <h1>Lumen Analytics</h1>
        <p>Workspace · Production</p>
      </div>
    </div>
    <div class="controls">
      <div class="pill inset"><span class="ic" style="background:var(--mint)"></span>All Channels</div>
      <div class="pill inset"><span class="ic" style="background:var(--sky)"></span>Last 30 days</div>
      <div class="pill solid">Export&nbsp;<small>↓</small></div>
    </div>
  </header>

  <!-- KPIs -->
  <div class="kpis">
    <div class="kpi raised">
      <div class="top">
        <div class="label">Revenue</div>
        <div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="#8f8de0" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
      </div>
      <div class="val">$284,920</div>
      <div class="delta up"><span class="arrow">▲</span>12.4% vs last month</div>
    </div>
    <div class="kpi raised">
      <div class="top">
        <div class="label">Active Users</div>
        <div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="#5fb0c9" stroke-width="2"><circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0M16 11a3 3 0 1 0 0-6M21 20a5 5 0 0 0-6-5"/></svg></div>
      </div>
      <div class="val">48,217</div>
      <div class="delta up"><span class="arrow">▲</span>8.1% vs last month</div>
    </div>
    <div class="kpi raised">
      <div class="top">
        <div class="label">Conversion</div>
        <div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="#cf9d80" stroke-width="2"><path d="M3 17l5-5 4 3 8-9"/><path d="M21 4v5h-5"/></svg></div>
      </div>
      <div class="val">3.84%</div>
      <div class="delta down"><span class="arrow">▼</span>0.6% vs last month</div>
    </div>
    <div class="kpi raised">
      <div class="top">
        <div class="label">MRR</div>
        <div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="#5f9e8a" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18"/></svg></div>
      </div>
      <div class="val">$62,340</div>
      <div class="delta up"><span class="arrow">▲</span>4.9% vs last month</div>
    </div>
  </div>

  <!-- Main grid -->
  <div class="grid">
    <!-- Area chart -->
    <div class="card raised">
      <div class="ch-head">
        <div>
          <h3>Revenue Trend</h3>
          <div class="sub">Daily gross revenue · USD</div>
        </div>
        <div class="legend">
          <span><i class="dot" style="background:var(--lav)"></i>This year</span>
          <span><i class="dot" style="background:var(--sky)"></i>Last year</span>
        </div>
      </div>
      <svg viewBox="0 0 560 380" preserveAspectRatio="none" style="width:100%;flex:1">
        <defs>
          <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#a3a0e6" stop-opacity="0.45"/>
            <stop offset="100%" stop-color="#a3a0e6" stop-opacity="0.02"/>
          </linearGradient>
        </defs>
        <!-- gridlines -->
        <g stroke="#d3d9e3" stroke-width="1">
          <line x1="0" y1="80" x2="560" y2="80"/>
          <line x1="0" y1="160" x2="560" y2="160"/>
          <line x1="0" y1="240" x2="560" y2="240"/>
          <line x1="0" y1="320" x2="560" y2="320"/>
        </g>
        <!-- last year line -->
        <path d="M0,250 C60,230 90,260 140,240 C200,215 230,255 290,235 C350,215 390,250 440,230 C500,215 530,240 560,225"
              fill="none" stroke="#9ec5e8" stroke-width="3" stroke-linecap="round" opacity=".8"/>
        <!-- this year area -->
        <path d="M0,210 C60,180 100,200 150,160 C210,115 250,170 300,140 C360,105 400,150 450,110 C510,75 540,120 560,90 L560,380 L0,380 Z"
              fill="url(#ag)"/>
        <path d="M0,210 C60,180 100,200 150,160 C210,115 250,170 300,140 C360,105 400,150 450,110 C510,75 540,120 560,90"
              fill="none" stroke="#8f8de0" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="560" cy="90" r="6" fill="#8f8de0" stroke="#e0e5ec" stroke-width="3"/>
      </svg>
      <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--muted);margin-top:6px">
        <span>Wk1</span><span>Wk2</span><span>Wk3</span><span>Wk4</span><span>Wk5</span>
      </div>
    </div>

    <!-- Bar chart -->
    <div class="card raised">
      <div class="ch-head">
        <div>
          <h3>Sessions by Channel</h3>
          <div class="sub">Weekly aggregate</div>
        </div>
        <div class="legend"><span><i class="dot" style="background:var(--mint)"></i>Sessions</span></div>
      </div>
      <svg viewBox="0 0 560 380" preserveAspectRatio="none" style="width:100%;flex:1">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#8fd3c4"/>
            <stop offset="100%" stop-color="#9ec5e8"/>
          </linearGradient>
        </defs>
        <g stroke="#d3d9e3" stroke-width="1">
          <line x1="0" y1="90" x2="560" y2="90"/>
          <line x1="0" y1="180" x2="560" y2="180"/>
          <line x1="0" y1="270" x2="560" y2="270"/>
          <line x1="0" y1="360" x2="560" y2="360"/>
        </g>
        <g fill="url(#bg)">
          <rect x="22"  y="180" width="52" height="180" rx="14"/>
          <rect x="100" y="120" width="52" height="240" rx="14"/>
          <rect x="178" y="210" width="52" height="150" rx="14"/>
          <rect x="256" y="90"  width="52" height="270" rx="14"/>
          <rect x="334" y="160" width="52" height="200" rx="14"/>
          <rect x="412" y="230" width="52" height="130" rx="14"/>
          <rect x="490" y="140" width="52" height="220" rx="14"/>
        </g>
      </svg>
      <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--muted);margin-top:6px;padding:0 8px">
        <span>Direct</span><span>Organic</span><span>Email</span><span>Social</span><span>Paid</span><span>Ref</span><span>Other</span>
      </div>
    </div>

    <!-- right column: donut + table -->
    <div class="rightcol">
      <div class="donutcard raised">
        <h3>Traffic Source</h3>
        <div class="donut-wrap">
          <svg width="130" height="130" viewBox="0 0 42 42">
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="#d3d9e3" stroke-width="5"/>
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="#a3a0e6" stroke-width="5"
                    stroke-dasharray="42 58" stroke-dashoffset="25"/>
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="#8fd3c4" stroke-width="5"
                    stroke-dasharray="28 72" stroke-dashoffset="-17"/>
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="#f0b8a0" stroke-width="5"
                    stroke-dasharray="18 82" stroke-dashoffset="-45"/>
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="#9ec5e8" stroke-width="5"
                    stroke-dasharray="12 88" stroke-dashoffset="-63"/>
            <text x="21" y="20.5" text-anchor="middle" font-size="6" font-weight="700" fill="#3d4a5c">48K</text>
            <text x="21" y="25.5" text-anchor="middle" font-size="2.8" fill="#8a98ab">visits</text>
          </svg>
          <div class="dleg">
            <div><span class="dot" style="background:var(--lav)"></span>Organic <b>42%</b></div>
            <div><span class="dot" style="background:var(--mint)"></span>Direct <b>28%</b></div>
            <div><span class="dot" style="background:var(--peach)"></span>Social <b>18%</b></div>
            <div><span class="dot" style="background:var(--sky)"></span>Referral <b>12%</b></div>
          </div>
        </div>
      </div>

      <div class="tablecard raised">
        <h3>Top Accounts</h3>
        <table>
          <thead>
            <tr><th>Account</th><th>Plan</th><th>MRR</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr><td><span class="av" style="background:var(--lav)"></span>Northwind</td><td>Scale</td><td>$8,420</td><td><span class="tag t-ok">Active</span></td></tr>
            <tr><td><span class="av" style="background:var(--mint)"></span>Aperture</td><td>Pro</td><td>$5,120</td><td><span class="tag t-ok">Active</span></td></tr>
            <tr><td><span class="av" style="background:var(--peach)"></span>Initech</td><td>Pro</td><td>$3,890</td><td><span class="tag t-pend">Trial</span></td></tr>
            <tr><td><span class="av" style="background:var(--sky)"></span>Globex</td><td>Scale</td><td>$7,640</td><td><span class="tag t-ok">Active</span></td></tr>
            <tr><td><span class="av" style="background:var(--lav)"></span>Soylent</td><td>Starter</td><td>$1,250</td><td><span class="tag t-pend">Trial</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</body>
</html>
```
