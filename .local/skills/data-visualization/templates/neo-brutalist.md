---
name: neo-brutalist
description: >-
  This Neo Brutalist analytics dashboard uses a stark white (#FFFFFF) canvas with pure black (#000000) 3px borders and hard 6px offset drop shadows (box-shadow: 6px 6px 0 #000), absolutely no rounded corners or gradients. The saturated palette pairs primary yellow (#FFD23F), electric blue (#2D5BFF), and alarm red (#FF4D3D) as flat block fills, with light gray (#F2F2F2) for subtle panel backgrounds. Typography is "Space Grotesk" (with system-ui/Arial fallback), using heavy 700 weights, tight letter-spacing, and uppercase labels for KPIs and headers. The layout is a fixed 1440×900 grid: a bold header bar with app name and chunky filter/date controls, a row of four KPI cards with oversized values and colored delta pills, a main content row containing an SVG area chart and bar chart, plus a sidebar donut, and a bordered data table at the bottom. Charts are rendered as inline SVG with flat fills, thick 3px black strokes, no smoothing-softness, visible data dots as black squares, and the overall aesthetic feels confident, loud, and tactile—like a printed risograph poster turned into software.
---

# Neo Brutalist

This Neo Brutalist analytics dashboard uses a stark white (#FFFFFF) canvas with pure black (#000000) 3px borders and hard 6px offset drop shadows (box-shadow: 6px 6px 0 #000), absolutely no rounded corners or gradients. The saturated palette pairs primary yellow (#FFD23F), electric blue (#2D5BFF), and alarm red (#FF4D3D) as flat block fills, with light gray (#F2F2F2) for subtle panel backgrounds. Typography is "Space Grotesk" (with system-ui/Arial fallback), using heavy 700 weights, tight letter-spacing, and uppercase labels for KPIs and headers. The layout is a fixed 1440×900 grid: a bold header bar with app name and chunky filter/date controls, a row of four KPI cards with oversized values and colored delta pills, a main content row containing an SVG area chart and bar chart, plus a sidebar donut, and a bordered data table at the bottom. Charts are rendered as inline SVG with flat fills, thick 3px black strokes, no smoothing-softness, visible data dots as black squares, and the overall aesthetic feels confident, loud, and tactile—like a printed risograph poster turned into software.

## Source Code

A self-contained reference implementation of the "Neo Brutalist" dashboard
preview. Use it as the visual target — translate the palette, typography, and
layout into the data-visualization React + Tailwind + Recharts app.
The fixed 1440×900 frame and hand-drawn inline-SVG charts below are
preview-rendering artifacts — keep the generated app's layout responsive
and build every chart with Recharts.

Responsive adaptation: This neo-brutalist dashboard should preserve its heavy 3px borders and 6px offset shadows at all sizes but scale interior density fluidly: KPIs collapse 4→2 at ~1024px and 2→1 at ~480px, the main 1.55fr/1fr split stacks to a single column at ~1024px, and chart SVGs must keep their aspect ratio (never stretch) while filling panel width. Tables must engage horizontal scroll below ~600px via min-width on rows, header controls should wrap to a second line on phones with the secondary tag hidden below 480px, and on ultrawide (>1800px) raise the max-width cap and scale KPI value heights and panel padding via clamp() so the brutalist blocks stay proportionate rather than marooned in whitespace.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>METRIX // Neo Brutalist Dashboard</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  :root{
    --black:#000000;
    --white:#FFFFFF;
    --gray:#F2F2F2;
    --yellow:#FFD23F;
    --blue:#2D5BFF;
    --red:#FF4D3D;
    --green:#19C37D;
  }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{
    font-family:"Space Grotesk", system-ui, -apple-system, Arial, sans-serif;
    background:var(--gray);
    color:var(--black);
    width:1440px;height:900px;overflow:hidden;
  }
  .app{
    width:1440px;height:900px;
    padding:20px;
    display:flex;flex-direction:column;gap:16px;
  }
  .border{border:3px solid var(--black);}
  .shadow{box-shadow:6px 6px 0 var(--black);}

  /* HEADER */
  header{
    background:var(--yellow);
    border:3px solid var(--black);
    box-shadow:6px 6px 0 var(--black);
    height:74px;flex:0 0 auto;
    display:flex;align-items:center;justify-content:space-between;
    padding:0 20px;
  }
  .brand{display:flex;align-items:center;gap:14px;}
  .logo{
    width:42px;height:42px;background:var(--black);
    display:flex;align-items:center;justify-content:center;
  }
  .logo span{color:var(--yellow);font-weight:700;font-size:26px;}
  .brand h1{font-size:26px;font-weight:700;letter-spacing:-1px;margin:0;}
  .brand .tag{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;background:var(--black);color:var(--yellow);padding:3px 7px;}
  .controls{display:flex;gap:12px;align-items:center;}
  .ctrl{
    background:var(--white);border:3px solid var(--black);
    padding:8px 14px;font-weight:700;font-size:13px;
    display:flex;align-items:center;gap:8px;text-transform:uppercase;letter-spacing:.5px;
  }
  .ctrl.blue{background:var(--blue);color:var(--white);}
  .dot{width:10px;height:10px;background:var(--black);}
  .ctrl.blue .dot{background:var(--white);}

  /* KPI ROW */
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;flex:0 0 auto;}
  .kpi{
    background:var(--white);border:3px solid var(--black);box-shadow:6px 6px 0 var(--black);
    padding:16px;height:128px;display:flex;flex-direction:column;justify-content:space-between;
    position:relative;overflow:hidden;
  }
  .kpi .label{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;}
  .kpi .val{font-size:38px;font-weight:700;letter-spacing:-1.5px;line-height:1;}
  .kpi .row{display:flex;align-items:center;justify-content:space-between;}
  .pill{font-size:12px;font-weight:700;padding:4px 8px;border:2px solid var(--black);text-transform:uppercase;}
  .pill.up{background:var(--green);color:var(--black);}
  .pill.down{background:var(--red);color:var(--white);}
  .kpi .cornerbar{position:absolute;top:0;right:0;width:14px;height:100%;}

  /* MAIN GRID */
  .main{display:grid;grid-template-columns:1.55fr 1fr;gap:16px;flex:1 1 auto;min-height:0;}
  .panel{
    background:var(--white);border:3px solid var(--black);box-shadow:6px 6px 0 var(--black);
    display:flex;flex-direction:column;overflow:hidden;
  }
  .ph{
    display:flex;align-items:center;justify-content:space-between;
    padding:12px 16px;border-bottom:3px solid var(--black);
  }
  .ph h2{margin:0;font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:1px;}
  .ph .legend{display:flex;gap:12px;font-size:11px;font-weight:700;text-transform:uppercase;}
  .lg{display:flex;align-items:center;gap:6px;}
  .sw{width:14px;height:14px;border:2px solid var(--black);}
  .pbody{flex:1;padding:14px 16px;min-height:0;}

  .left-col{display:flex;flex-direction:column;gap:16px;min-height:0;}
  .right-col{display:flex;flex-direction:column;gap:16px;min-height:0;}

  svg{display:block;width:100%;height:100%;}

  /* donut info */
  .donut-wrap{display:flex;align-items:center;gap:16px;height:100%;}
  .donut-legend{flex:1;display:flex;flex-direction:column;gap:10px;}
  .dl{display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:700;}
  .dl .left{display:flex;align-items:center;gap:8px;}

  /* TABLE */
  table{width:100%;border-collapse:collapse;font-size:13px;}
  th{
    text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;
    padding:8px 14px;background:var(--black);color:var(--white);font-weight:700;
  }
  td{padding:9px 14px;border-bottom:2px solid var(--black);font-weight:500;}
  tr:last-child td{border-bottom:none;}
  .tg{font-weight:700;font-size:11px;padding:2px 7px;border:2px solid var(--black);}
  .tg.a{background:var(--green);}
  .tg.b{background:var(--yellow);}
  .tg.c{background:var(--red);color:#fff;}
  .num{font-weight:700;}
</style>
</head>
<body>
<div class="app">

  <!-- HEADER -->
  <header>
    <div class="brand">
      <div class="logo"><span>M</span></div>
      <h1>METRIX</h1>
      <div class="tag">Growth OS</div>
    </div>
    <div class="controls">
      <div class="ctrl"><div class="dot"></div>Last 30 Days ▾</div>
      <div class="ctrl"><div class="dot"></div>All Regions ▾</div>
      <div class="ctrl blue"><div class="dot"></div>Export</div>
    </div>
  </header>

  <!-- KPIS -->
  <div class="kpis">
    <div class="kpi">
      <div class="cornerbar" style="background:var(--yellow)"></div>
      <div class="label">Revenue</div>
      <div class="val">$284.6K</div>
      <div class="row"><span class="pill up">▲ 12.4%</span><span style="font-size:11px;font-weight:700;color:#666">vs prev</span></div>
    </div>
    <div class="kpi">
      <div class="cornerbar" style="background:var(--blue)"></div>
      <div class="label">Active Users</div>
      <div class="val">48,219</div>
      <div class="row"><span class="pill up">▲ 8.1%</span><span style="font-size:11px;font-weight:700;color:#666">vs prev</span></div>
    </div>
    <div class="kpi">
      <div class="cornerbar" style="background:var(--red)"></div>
      <div class="label">Conversion</div>
      <div class="val">3.92%</div>
      <div class="row"><span class="pill down">▼ 0.6%</span><span style="font-size:11px;font-weight:700;color:#666">vs prev</span></div>
    </div>
    <div class="kpi">
      <div class="cornerbar" style="background:var(--green)"></div>
      <div class="label">MRR</div>
      <div class="val">$96.3K</div>
      <div class="row"><span class="pill up">▲ 5.7%</span><span style="font-size:11px;font-weight:700;color:#666">vs prev</span></div>
    </div>
  </div>

  <!-- MAIN -->
  <div class="main">

    <!-- LEFT COLUMN -->
    <div class="left-col">
      <!-- AREA CHART -->
      <div class="panel" style="flex:1.3;">
        <div class="ph">
          <h2>Revenue Trend</h2>
          <div class="legend">
            <div class="lg"><div class="sw" style="background:var(--blue)"></div>2024</div>
            <div class="lg"><div class="sw" style="background:var(--yellow)"></div>2023</div>
          </div>
        </div>
        <div class="pbody">
          <svg viewBox="0 0 700 230" preserveAspectRatio="none">
            <!-- grid -->
            <g stroke="#ddd" stroke-width="1">
              <line x1="0" y1="50" x2="700" y2="50"/>
              <line x1="0" y1="100" x2="700" y2="100"/>
              <line x1="0" y1="150" x2="700" y2="150"/>
            </g>
            <!-- 2023 area (yellow) -->
            <path d="M0,170 L100,160 L200,150 L300,160 L400,130 L500,140 L600,120 L700,110 L700,200 L0,200 Z" fill="var(--yellow)" stroke="none" opacity="0.85"/>
            <!-- 2024 area (blue) -->
            <path d="M0,150 L100,120 L200,135 L300,90 L400,100 L500,60 L600,75 L700,40 L700,200 L0,200 Z" fill="var(--blue)" opacity="0.18"/>
            <polyline points="0,150 100,120 200,135 300,90 400,100 500,60 600,75 700,40" fill="none" stroke="var(--blue)" stroke-width="3"/>
            <!-- data dots -->
            <g fill="var(--black)">
              <rect x="-4" y="146" width="8" height="8"/>
              <rect x="96" y="116" width="8" height="8"/>
              <rect x="196" y="131" width="8" height="8"/>
              <rect x="296" y="86" width="8" height="8"/>
              <rect x="396" y="96" width="8" height="8"/>
              <rect x="496" y="56" width="8" height="8"/>
              <rect x="596" y="71" width="8" height="8"/>
              <rect x="694" y="36" width="8" height="8"/>
            </g>
          </svg>
        </div>
      </div>

      <!-- BAR CHART -->
      <div class="panel" style="flex:1;">
        <div class="ph">
          <h2>Acquisition by Channel</h2>
          <div class="legend"><div class="lg"><div class="sw" style="background:var(--red)"></div>Signups</div></div>
        </div>
        <div class="pbody">
          <svg viewBox="0 0 700 170" preserveAspectRatio="none">
            <line x1="0" y1="150" x2="700" y2="150" stroke="var(--black)" stroke-width="3"/>
            <g stroke="var(--black)" stroke-width="3">
              <rect x="35"  y="60"  width="70" height="90"  fill="var(--red)"/>
              <rect x="140" y="35"  width="70" height="115" fill="var(--blue)"/>
              <rect x="245" y="80"  width="70" height="70"  fill="var(--yellow)"/>
              <rect x="350" y="100" width="70" height="50"  fill="var(--red)"/>
              <rect x="455" y="50"  width="70" height="100" fill="var(--blue)"/>
              <rect x="560" y="90"  width="70" height="60"  fill="var(--yellow)"/>
            </g>
            <g font-size="11" font-weight="700" fill="var(--black)" font-family="Space Grotesk">
              <text x="48" y="165">Organic</text>
              <text x="155" y="165">Paid</text>
              <text x="252" y="165">Email</text>
              <text x="355" y="165">Social</text>
              <text x="462" y="165">Direct</text>
              <text x="568" y="165">Referral</text>
            </g>
          </svg>
        </div>
      </div>
    </div>

    <!-- RIGHT COLUMN -->
    <div class="right-col">
      <!-- DONUT -->
      <div class="panel" style="flex:1;">
        <div class="ph"><h2>Plan Mix</h2></div>
        <div class="pbody">
          <div class="donut-wrap">
            <svg viewBox="0 0 120 120" style="width:120px;height:120px;flex:0 0 120px;">
              <!-- donut segments via stroke-dasharray, r=45 circ=282.7 -->
              <circle cx="60" cy="60" r="45" fill="none" stroke="var(--blue)" stroke-width="26" stroke-dasharray="127 156" transform="rotate(-90 60 60)"/>
              <circle cx="60" cy="60" r="45" fill="none" stroke="var(--yellow)" stroke-width="26" stroke-dasharray="85 198" stroke-dashoffset="-127" transform="rotate(-90 60 60)"/>
              <circle cx="60" cy="60" r="45" fill="none" stroke="var(--red)" stroke-width="26" stroke-dasharray="71 212" stroke-dashoffset="-212" transform="rotate(-90 60 60)"/>
              <circle cx="60" cy="60" r="58" fill="none" stroke="var(--black)" stroke-width="3"/>
              <circle cx="60" cy="60" r="32" fill="none" stroke="var(--black)" stroke-width="3"/>
            </svg>
            <div class="donut-legend">
              <div class="dl"><div class="left"><div class="sw" style="background:var(--blue)"></div>Pro</div><span>45%</span></div>
              <div class="dl"><div class="left"><div class="sw" style="background:var(--yellow)"></div>Team</div><span>30%</span></div>
              <div class="dl"><div class="left"><div class="sw" style="background:var(--red)"></div>Free</div><span>25%</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- TABLE -->
      <div class="panel" style="flex:1.4;">
        <div class="ph"><h2>Top Accounts</h2></div>
        <div class="pbody" style="padding:0;overflow:hidden;">
          <table>
            <thead>
              <tr><th>Account</th><th>MRR</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr><td>Northwind Co</td><td class="num">$12,400</td><td><span class="tg a">Active</span></td></tr>
              <tr><td>Acme Labs</td><td class="num">$9,820</td><td><span class="tg a">Active</span></td></tr>
              <tr><td>Globex Inc</td><td class="num">$7,150</td><td><span class="tg b">Trial</span></td></tr>
              <tr><td>Initech</td><td class="num">$5,930</td><td><span class="tg a">Active</span></td></tr>
              <tr><td>Soylent Corp</td><td class="num">$4,210</td><td><span class="tg c">Churn</span></td></tr>
              <tr><td>Hooli</td><td class="num">$3,880</td><td><span class="tg b">Trial</span></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

  </div>
</div>
</body>
</html>
```
