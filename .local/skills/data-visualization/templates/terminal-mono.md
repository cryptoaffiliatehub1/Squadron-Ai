---
name: terminal-mono
description: >-
  This is a hacker-terminal analytics dashboard rendered on a pure-black canvas (#000000) with a phosphor-green primary (#33ff66 / #00ff41), amber accents (#ffb000 / #ffcc33), and dimmed green-grey text (#5a7a5f) for secondary labels, all in JetBrains Mono with ui-monospace/Menlo/Consolas fallbacks. The layout is a fixed 1440x900 grid: a top header bar with an ASCII-bracketed app name and pill-style filter/date controls, a row of four bordered KPI cards (1px #1c3a22 borders, faint inner glow via text-shadow), a main area split into a sparse green SVG area/line chart and a thin amber bar chart, plus a small green donut, and a dense monospaced data table below with dotted ASCII-style row dividers. Charts are minimalist—thin 1.5px strokes, no heavy fills (just low-opacity green gradients), subtle grid lines in #0e2415, and glowing data points—evoking an oscilloscope/CRT readout. The overall aesthetic is dense, monospaced, slightly glowing, with ASCII dividers (────, ▸, █) and uppercase tracked-out labels giving a retro phosphor CRT command-line feel.
---

# Terminal Mono

This is a hacker-terminal analytics dashboard rendered on a pure-black canvas (#000000) with a phosphor-green primary (#33ff66 / #00ff41), amber accents (#ffb000 / #ffcc33), and dimmed green-grey text (#5a7a5f) for secondary labels, all in JetBrains Mono with ui-monospace/Menlo/Consolas fallbacks. The layout is a fixed 1440x900 grid: a top header bar with an ASCII-bracketed app name and pill-style filter/date controls, a row of four bordered KPI cards (1px #1c3a22 borders, faint inner glow via text-shadow), a main area split into a sparse green SVG area/line chart and a thin amber bar chart, plus a small green donut, and a dense monospaced data table below with dotted ASCII-style row dividers. Charts are minimalist—thin 1.5px strokes, no heavy fills (just low-opacity green gradients), subtle grid lines in #0e2415, and glowing data points—evoking an oscilloscope/CRT readout. The overall aesthetic is dense, monospaced, slightly glowing, with ASCII dividers (────, ▸, █) and uppercase tracked-out labels giving a retro phosphor CRT command-line feel.

## Source Code

A self-contained reference implementation of the "Terminal Mono" dashboard
preview. Use it as the visual target — translate the palette, typography, and
layout into the data-visualization React + Tailwind + Recharts app.
The fixed 1440×900 frame and hand-drawn inline-SVG charts below are
preview-rendering artifacts — keep the generated app's layout responsive
and build every chart with Recharts.

Responsive adaptation: This terminal-mono dashboard should stay edge-to-edge fluid: use clamp()-based skeleton widths (not fixed px) so KPI cards, pill controls, and brand marks shrink proportionally, and collapse the 4→2→1 KPI grid and 1.7fr/1fr main split at ~1024px and ~640px respectively. Charts must scale via SVG preserveAspectRatio with the donut and sparklines using clamp() sizes; tables always live inside overflow-x:auto with a min-width and a subtle fade mask, and dense bar charts should drop bars (or switch to a heatmap strip) below 480px. On ultra-wide screens (>1600px) raise the container cap and scale font-size with vw so the mono grid fills the canvas instead of stranding content in a narrow column.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TERM//OPS — metrics</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#000000;
    --panel:#040904;
    --green:#33ff66;
    --green-br:#00ff41;
    --amber:#ffb000;
    --amber-br:#ffcc33;
    --dim:#5a7a5f;
    --line:#1c3a22;
    --grid:#0e2415;
  }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:var(--bg);}
  body{
    font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
    color:var(--green);
    width:1440px;height:900px;overflow:hidden;
    font-size:12px;
    letter-spacing:.3px;
  }
  .glow{text-shadow:0 0 6px rgba(51,255,102,.45);}
  .app{width:1440px;height:900px;padding:14px 18px;display:flex;flex-direction:column;gap:12px;}

  /* header */
  header{display:flex;align-items:center;justify-content:space-between;border:1px solid var(--line);padding:10px 14px;background:var(--panel);}
  .brand{display:flex;align-items:baseline;gap:10px;}
  .brand .name{font-weight:700;font-size:16px;color:var(--green-br);text-shadow:0 0 8px rgba(0,255,65,.5);}
  .brand .sub{color:var(--dim);font-size:11px;}
  .blink{animation:bl 1.1s steps(2) infinite;color:var(--green-br);}
  @keyframes bl{0%,50%{opacity:1}51%,100%{opacity:0}}
  .controls{display:flex;gap:8px;align-items:center;}
  .pill{border:1px solid var(--line);padding:6px 10px;color:var(--dim);font-size:11px;background:#020602;}
  .pill b{color:var(--green);font-weight:500;}
  .pill.amber{color:var(--amber-br);border-color:#3a2c08;}
  .pill .car{color:var(--green-br);}

  .ascii{color:var(--line);font-size:11px;white-space:nowrap;overflow:hidden;letter-spacing:0;}

  /* kpi */
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
  .kpi{border:1px solid var(--line);background:var(--panel);padding:12px 14px;position:relative;}
  .kpi .lbl{color:var(--dim);font-size:10px;text-transform:uppercase;letter-spacing:1.5px;}
  .kpi .val{font-size:26px;font-weight:700;margin-top:6px;color:var(--green-br);text-shadow:0 0 10px rgba(0,255,65,.4);}
  .kpi .delta{margin-top:6px;font-size:11px;display:flex;gap:6px;align-items:center;}
  .up{color:var(--green-br);}
  .down{color:#ff5b5b;}
  .kpi .spark{position:absolute;right:12px;top:12px;opacity:.85;}

  .grid-main{display:grid;grid-template-columns:1.7fr 1fr;gap:12px;}
  .card{border:1px solid var(--line);background:var(--panel);padding:12px 14px;display:flex;flex-direction:column;}
  .card .head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
  .card .title{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:var(--green);}
  .card .meta{font-size:10px;color:var(--dim);}

  .row2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}

  /* table */
  table{width:100%;border-collapse:collapse;font-size:11px;}
  th{text-align:left;color:var(--dim);text-transform:uppercase;letter-spacing:1px;font-weight:500;font-size:10px;padding:6px 8px;border-bottom:1px solid var(--line);}
  td{padding:5px 8px;border-bottom:1px dotted #11220f;color:var(--green);}
  td.r,th.r{text-align:right;}
  tr:hover td{background:#071107;}
  .tag{padding:1px 6px;border:1px solid var(--line);font-size:10px;color:var(--dim);}
  .tag.ok{color:var(--green-br);border-color:#1c3a22;}
  .tag.warn{color:var(--amber-br);border-color:#3a2c08;}
  .tag.err{color:#ff5b5b;border-color:#3a1010;}

  .legend{display:flex;gap:14px;font-size:10px;color:var(--dim);}
  .legend span b{color:var(--green-br);}
  .dot{display:inline-block;width:8px;height:8px;margin-right:5px;vertical-align:middle;}
  .footer{display:flex;justify-content:space-between;font-size:10px;color:var(--dim);}
</style>
</head>
<body>
<div class="app">

  <!-- HEADER -->
  <header>
    <div class="brand">
      <span class="name glow">▞ TERM//OPS</span>
      <span class="sub">~/dashboards/growth.metrics &gt; live<span class="blink">█</span></span>
    </div>
    <div class="controls">
      <span class="pill"><span class="car">▸</span> RANGE <b>30D</b></span>
      <span class="pill">SEGMENT <b>all_users</b></span>
      <span class="pill amber">● STREAM:ON</span>
      <span class="pill">2024-06-01 → 2024-06-30</span>
    </div>
  </header>

  <div class="ascii">────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────</div>

  <!-- KPIs -->
  <div class="kpis">
    <div class="kpi">
      <div class="lbl">Revenue</div>
      <div class="val">$1.284M</div>
      <div class="delta"><span class="up">▲ +12.4%</span><span style="color:var(--dim)">vs prev 30d</span></div>
      <svg class="spark" width="80" height="28" viewBox="0 0 80 28"><polyline fill="none" stroke="#33ff66" stroke-width="1.5" points="0,22 12,18 24,20 36,12 48,14 60,7 72,9 80,4"/></svg>
    </div>
    <div class="kpi">
      <div class="lbl">Active Users</div>
      <div class="val">48,209</div>
      <div class="delta"><span class="up">▲ +5.8%</span><span style="color:var(--dim)">vs prev 30d</span></div>
      <svg class="spark" width="80" height="28" viewBox="0 0 80 28"><polyline fill="none" stroke="#33ff66" stroke-width="1.5" points="0,18 12,16 24,12 36,15 48,10 60,11 72,8 80,9"/></svg>
    </div>
    <div class="kpi">
      <div class="lbl">Conversion</div>
      <div class="val">3.91%</div>
      <div class="delta"><span class="down">▼ -0.6%</span><span style="color:var(--dim)">vs prev 30d</span></div>
      <svg class="spark" width="80" height="28" viewBox="0 0 80 28"><polyline fill="none" stroke="#ff5b5b" stroke-width="1.5" points="0,8 12,10 24,9 36,13 48,11 60,15 72,16 80,18"/></svg>
    </div>
    <div class="kpi">
      <div class="lbl">MRR</div>
      <div class="val">$214.7K</div>
      <div class="delta"><span class="up">▲ +9.1%</span><span style="color:var(--dim)">vs prev 30d</span></div>
      <svg class="spark" width="80" height="28" viewBox="0 0 80 28"><polyline fill="none" stroke="#33ff66" stroke-width="1.5" points="0,20 12,17 24,15 36,16 48,11 60,9 72,7 80,5"/></svg>
    </div>
  </div>

  <!-- MAIN CHARTS -->
  <div class="grid-main">
    <!-- AREA CHART -->
    <div class="card" style="height:300px;">
      <div class="head">
        <span class="title">▸ Revenue / Sessions — 30d</span>
        <span class="meta">unit:$k · sampled:hourly</span>
      </div>
      <svg width="100%" height="240" viewBox="0 0 800 240" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#33ff66" stop-opacity="0.28"/>
            <stop offset="100%" stop-color="#33ff66" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <!-- grid -->
        <g stroke="#0e2415" stroke-width="1">
          <line x1="0" y1="40" x2="800" y2="40"/>
          <line x1="0" y1="90" x2="800" y2="90"/>
          <line x1="0" y1="140" x2="800" y2="140"/>
          <line x1="0" y1="190" x2="800" y2="190"/>
        </g>
        <!-- area -->
        <path d="M0,180 L60,165 L120,172 L180,140 L240,150 L300,118 L360,128 L420,95 L480,108 L540,72 L600,84 L660,55 L720,64 L800,40 L800,240 L0,240 Z" fill="url(#ag)"/>
        <!-- main line -->
        <polyline fill="none" stroke="#33ff66" stroke-width="1.5" style="filter:drop-shadow(0 0 4px rgba(51,255,102,.6))" points="0,180 60,165 120,172 180,140 240,150 300,118 360,128 420,95 480,108 540,72 600,84 660,55 720,64 800,40"/>
        <!-- amber secondary -->
        <polyline fill="none" stroke="#ffb000" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.8" points="0,200 60,196 120,190 180,194 240,182 300,186 360,176 420,180 480,170 540,168 600,160 660,164 720,152 800,150"/>
        <!-- points -->
        <g fill="#00ff41">
          <circle cx="300" cy="118" r="2.5"/><circle cx="540" cy="72" r="2.5"/><circle cx="800" cy="40" r="2.5"/>
        </g>
      </svg>
      <div class="legend" style="margin-top:6px;">
        <span><span class="dot" style="background:#33ff66"></span>revenue <b>$1.28M</b></span>
        <span><span class="dot" style="background:#ffb000"></span>sessions <b>1.94M</b></span>
        <span style="margin-left:auto;">peak 18:00 UTC · $64.2k/hr</span>
      </div>
    </div>

    <!-- DONUT -->
    <div class="card" style="height:300px;">
      <div class="head">
        <span class="title">▸ Traffic Source</span>
        <span class="meta">n=48,209</span>
      </div>
      <div style="display:flex;align-items:center;gap:16px;flex:1;">
        <svg width="150" height="150" viewBox="0 0 42 42">
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#0e2415" stroke-width="5"/>
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#00ff41" stroke-width="5" stroke-dasharray="44 56" stroke-dashoffset="25" style="filter:drop-shadow(0 0 3px rgba(0,255,65,.6))"/>
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#ffb000" stroke-width="5" stroke-dasharray="27 73" stroke-dashoffset="-19"/>
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#5a7a5f" stroke-width="5" stroke-dasharray="18 82" stroke-dashoffset="-46"/>
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#1c3a22" stroke-width="5" stroke-dasharray="11 89" stroke-dashoffset="-64"/>
          <text x="21" y="20" text-anchor="middle" fill="#00ff41" font-size="5" font-weight="700">48.2k</text>
          <text x="21" y="25" text-anchor="middle" fill="#5a7a5f" font-size="2.6">USERS</text>
        </svg>
        <div style="font-size:11px;line-height:2;">
          <div><span class="dot" style="background:#00ff41"></span>Organic <b style="color:var(--green-br)">44%</b></div>
          <div><span class="dot" style="background:#ffb000"></span>Direct <b style="color:var(--amber-br)">27%</b></div>
          <div><span class="dot" style="background:#5a7a5f"></span>Referral <b>18%</b></div>
          <div><span class="dot" style="background:#1c3a22"></span>Paid <b>11%</b></div>
        </div>
      </div>
      <div class="ascii" style="margin-top:4px;">··········································</div>
      <div style="font-size:10px;color:var(--dim);margin-top:6px;">bounce 38.2% · avg_sess 4m12s · pages/sess 3.4</div>
    </div>
  </div>

  <!-- BOTTOM ROW -->
  <div class="row2">
    <!-- BAR CHART -->
    <div class="card" style="height:226px;">
      <div class="head">
        <span class="title">▸ Signups / Day</span>
        <span class="meta">last 14d · max:412</span>
      </div>
      <svg width="100%" height="160" viewBox="0 0 560 160" preserveAspectRatio="none">
        <g stroke="#0e2415"><line x1="0" y1="40" x2="560" y2="40"/><line x1="0" y1="80" x2="560" y2="80"/><line x1="0" y1="120" x2="560" y2="120"/></g>
        <g fill="#33ff66">
          <rect x="6"  y="92"  width="24" height="60"  opacity=".75"/>
          <rect x="46" y="78"  width="24" height="74"  opacity=".75"/>
          <rect x="86" y="100" width="24" height="52"  opacity=".75"/>
          <rect x="126" y="64" width="24" height="88"/>
          <rect x="166" y="84" width="24" height="68"  opacity=".75"/>
          <rect x="206" y="48" width="24" height="104"/>
          <rect x="246" y="70" width="24" height="82"  opacity=".75"/>
          <rect x="286" y="36" width="24" height="116" fill="#ffb000"/>
          <rect x="326" y="58" width="24" height="94"/>
          <rect x="366" y="88" width="24" height="64"  opacity=".75"/>
          <rect x="406" y="52" width="24" height="100"/>
          <rect x="446" y="74" width="24" height="78"  opacity=".75"/>
          <rect x="486" y="44" width="24" height="108"/>
          <rect x="526" y="30" width="24" height="122" fill="#ffb000"/>
        </g>
      </svg>
      <div style="font-size:10px;color:var(--dim);display:flex;justify-content:space-between;margin-top:4px;">
        <span>Jun 17</span><span>Jun 24</span><span style="color:var(--amber-br)">Jun 30 ▲peak</span>
      </div>
    </div>

    <!-- TABLE -->
    <div class="card" style="height:226px;overflow:hidden;">
      <div class="head">
        <span class="title">▸ Top Plans</span>
        <span class="meta">sort:mrr↓</span>
      </div>
      <table>
        <thead>
          <tr><th>PLAN</th><th class="r">USERS</th><th class="r">MRR</th><th class="r">CHURN</th><th>STATUS</th></tr>
        </thead>
        <tbody>
          <tr><td>enterprise_x</td><td class="r">1,204</td><td class="r">$98.4k</td><td class="r">1.2%</td><td><span class="tag ok">stable</span></td></tr>
          <tr><td>pro_annual</td><td class="r">3,891</td><td class="r">$62.1k</td><td class="r">2.4%</td><td><span class="tag ok">growing</span></td></tr>
          <tr><td>pro_monthly</td><td class="r">5,260</td><td class="r">$31.8k</td><td class="r">4.9%</td><td><span class="tag warn">watch</span></td></tr>
          <tr><td>team_seat</td><td class="r">2,118</td><td class="r">$14.2k</td><td class="r">3.1%</td><td><span class="tag ok">stable</span></td></tr>
          <tr><td>starter</td><td class="r">9,740</td><td class="r">$6.9k</td><td class="r">7.8%</td><td><span class="tag err">churn↑</span></td></tr>
          <tr><td>legacy_v1</td><td class="r">412</td><td class="r">$1.3k</td><td class="r">9.4%</td><td><span class="tag err">deprecated</span></td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="footer">
    <span>STATUS: <span class="up">● ONLINE</span> · latency 42ms · node us-east-1 · uptime 99.98%</span>
    <span>last_sync 14:32:07 UTC · rows 48,209 · build #2241.f3a</span>
  </div>

</div>
</body>
</html>
```
