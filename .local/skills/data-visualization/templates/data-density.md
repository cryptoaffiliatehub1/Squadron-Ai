---
name: data-density
description: >-
  A Bloomberg-terminal-inspired dense analytics dashboard on a near-black canvas (#0a0d12 page, #0e1218 panels) with hairline borders (#1c2531) and tight 1px gridlines (#161c26). Typography is exclusively monospaced ("JetBrains Mono", "IBM Plex Mono", ui-monospace, Menlo, Consolas) at small sizes (9–12px) with uppercase, letter-spaced muted labels (#5f6b7a) and bright white-ish values (#e8edf2); numerals use font-variant-numeric: tabular-nums for fixed alignment. The accent palette is terminal amber (#f5a623) for highlights/active state, with semantic green (#27d796 up) and red (#ff5470 down) for deltas and color-coded table cells. Layout is a fixed 1440×900 grid: a slim header bar with app name + filter chips, a row of four compact KPI cards, then a 12-column body holding an inline-SVG amber area/line chart, a green/red bar chart, a donut, and a dense bordered data table with right-aligned numeric columns and subtle per-cell background tints. The overall vibe is information-maximal, high-contrast, low-chrome, and engineering-grade precise.
---

# Data Density

A Bloomberg-terminal-inspired dense analytics dashboard on a near-black canvas (#0a0d12 page, #0e1218 panels) with hairline borders (#1c2531) and tight 1px gridlines (#161c26). Typography is exclusively monospaced ("JetBrains Mono", "IBM Plex Mono", ui-monospace, Menlo, Consolas) at small sizes (9–12px) with uppercase, letter-spaced muted labels (#5f6b7a) and bright white-ish values (#e8edf2); numerals use font-variant-numeric: tabular-nums for fixed alignment. The accent palette is terminal amber (#f5a623) for highlights/active state, with semantic green (#27d796 up) and red (#ff5470 down) for deltas and color-coded table cells. Layout is a fixed 1440×900 grid: a slim header bar with app name + filter chips, a row of four compact KPI cards, then a 12-column body holding an inline-SVG amber area/line chart, a green/red bar chart, a donut, and a dense bordered data table with right-aligned numeric columns and subtle per-cell background tints. The overall vibe is information-maximal, high-contrast, low-chrome, and engineering-grade precise.

## Source Code

A self-contained reference implementation of the "Data Density" dashboard
preview. Use it as the visual target — translate the palette, typography, and
layout into the data-visualization React + Tailwind + Recharts app.
The fixed 1440×900 frame and hand-drawn inline-SVG charts below are
preview-rendering artifacts — keep the generated app's layout responsive
and build every chart with Recharts.

Responsive adaptation: This is a dense terminal/bloomberg-style monospace dashboard, so it should stay information-rich and edge-to-edge rather than centering narrowly: keep 8px gutters, let the max-width cap around 1800–2000px, and use auto-fit minmax for KPIs so they reflow from 4→3→2→1 columns fluidly instead of hard breakpoints. Charts must preserve aspect ratio (never stretch), grow their min-height with viewport via clamp(), and the data table should always live inside a horizontally scrollable container with a fade affordance on mobile while progressively hiding lower-priority columns below 600px. Header chrome (chips, clock, sub-brand) should collapse aggressively on phones — secondary chip clusters hide, wide chips shrink, and only the status dot + primary word remain — while decorative glows, spark widths, and legend swatches scale via clamp() so they neither dominate at 360px nor disappear at 2200px.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1440, initial-scale=1">
<title>TERMINAL // Analytics</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#0a0d12; --panel:#0e1218; --panel2:#11161e;
    --line:#1c2531; --grid:#161c26;
    --txt:#e8edf2; --mut:#5f6b7a; --dim:#39424f;
    --amber:#f5a623; --green:#27d796; --red:#ff5470; --blue:#4ea8ff;
    --mono:"JetBrains Mono","IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace;
  }
  *{box-sizing:border-box}
  html,body{margin:0}
  body{
    width:1440px;height:900px;overflow:hidden;background:var(--bg);
    color:var(--txt);font-family:var(--mono);font-size:11px;
    font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;
  }
  .tnum{font-variant-numeric:tabular-nums}
  .up{color:var(--green)} .down{color:var(--red)} .am{color:var(--amber)}
  .lbl{color:var(--mut);text-transform:uppercase;letter-spacing:.12em;font-size:9px}

  /* header */
  header{
    height:42px;display:flex;align-items:center;gap:18px;
    padding:0 14px;border-bottom:1px solid var(--line);background:var(--panel);
  }
  .brand{display:flex;align-items:center;gap:8px;font-weight:700;letter-spacing:.16em;font-size:13px}
  .brand .dot{width:8px;height:8px;background:var(--amber);box-shadow:0 0 8px var(--amber)}
  .brand small{color:var(--mut);font-weight:400;letter-spacing:.18em;font-size:9px}
  .spacer{flex:1}
  .chips{display:flex;gap:6px}
  .chip{
    border:1px solid var(--line);background:var(--panel2);color:var(--mut);
    padding:5px 9px;font-size:9px;letter-spacing:.1em;text-transform:uppercase;cursor:default;
  }
  .chip.on{border-color:var(--amber);color:var(--amber)}
  .clock{color:var(--green);letter-spacing:.1em;font-size:10px}

  /* layout */
  .wrap{padding:8px;display:flex;flex-direction:column;gap:8px;height:calc(900px - 42px)}
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;height:90px}
  .card{
    border:1px solid var(--line);background:var(--panel);padding:9px 11px;
    display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;
  }
  .card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--amber);opacity:.6}
  .card .val{font-size:24px;font-weight:700;letter-spacing:-.01em}
  .card .row2{display:flex;justify-content:space-between;align-items:flex-end}
  .delta{font-size:10px;font-weight:500}
  .spark{height:22px;width:90px}

  .grid3{display:grid;grid-template-columns:1.55fr 1.1fr .85fr;gap:8px;flex:1;min-height:0}
  .panel{border:1px solid var(--line);background:var(--panel);display:flex;flex-direction:column;min-height:0}
  .ptitle{
    display:flex;align-items:center;justify-content:space-between;
    padding:7px 11px;border-bottom:1px solid var(--line);
  }
  .ptitle .t{font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:var(--txt)}
  .ptitle .s{color:var(--mut);font-size:9px;letter-spacing:.1em}
  .pbody{flex:1;min-height:0;position:relative}

  .legend{display:flex;gap:12px;padding:6px 11px;border-top:1px solid var(--line)}
  .legend i{display:inline-block;width:8px;height:8px;margin-right:5px;vertical-align:middle}
  .legend span{color:var(--mut);font-size:9px;letter-spacing:.08em}

  /* bottom table */
  .bottom{height:208px;display:grid;grid-template-columns:1fr;gap:8px}
  table{width:100%;border-collapse:collapse;font-size:10px}
  thead th{
    color:var(--mut);text-transform:uppercase;letter-spacing:.1em;font-size:9px;
    text-align:right;padding:6px 11px;border-bottom:1px solid var(--line);font-weight:500;
    position:sticky;top:0;background:var(--panel);
  }
  thead th.l{text-align:left}
  tbody td{padding:5px 11px;text-align:right;border-bottom:1px solid var(--grid)}
  tbody td.l{text-align:left;color:var(--txt)}
  tbody tr:hover{background:#131a23}
  .tag{padding:1px 5px;font-size:9px;letter-spacing:.06em;border:1px solid var(--line)}
  .cell-pos{color:var(--green);background:rgba(39,215,150,.06)}
  .cell-neg{color:var(--red);background:rgba(255,84,112,.06)}
  .bar-mini{display:inline-block;height:7px;background:var(--amber);vertical-align:middle;margin-right:6px}
  .tscroll{overflow:auto;height:100%}
  .tscroll::-webkit-scrollbar{width:8px;height:8px}
  .tscroll::-webkit-scrollbar-thumb{background:#1f2733}
</style>
</head>
<body>
  <header>
    <div class="brand"><span class="dot"></span>TERMINAL<small>// GROWTH ANALYTICS</small></div>
    <div class="chips">
      <span class="chip on">1D</span><span class="chip">7D</span>
      <span class="chip on">30D</span><span class="chip">QTD</span><span class="chip">YTD</span>
    </div>
    <div class="spacer"></div>
    <div class="chips">
      <span class="chip">REGION: GLOBAL ▾</span>
      <span class="chip">SEGMENT: ALL ▾</span>
      <span class="chip">CCY: USD ▾</span>
    </div>
    <div class="clock">● LIVE&nbsp; 2024-06-14 14:32:07 UTC</div>
  </header>

  <div class="wrap">
    <!-- KPIs -->
    <div class="kpis">
      <div class="card">
        <div><div class="lbl">Revenue (MTD)</div><div class="val tnum">$4.82M</div></div>
        <div class="row2">
          <span class="delta up">▲ +8.4% vs PoP</span>
          <svg class="spark" viewBox="0 0 90 22" preserveAspectRatio="none">
            <polyline fill="none" stroke="#27d796" stroke-width="1.3" points="0,18 12,15 24,17 36,11 48,13 60,7 72,9 84,4 90,3"/>
          </svg>
        </div>
      </div>
      <div class="card">
        <div><div class="lbl">Active Users</div><div class="val tnum">182,940</div></div>
        <div class="row2">
          <span class="delta up">▲ +3.1% vs PoP</span>
          <svg class="spark" viewBox="0 0 90 22" preserveAspectRatio="none">
            <polyline fill="none" stroke="#f5a623" stroke-width="1.3" points="0,12 12,14 24,9 36,13 48,8 60,11 72,6 84,9 90,7"/>
          </svg>
        </div>
      </div>
      <div class="card">
        <div><div class="lbl">Conversion</div><div class="val tnum">3.74%</div></div>
        <div class="row2">
          <span class="delta down">▼ -0.42pp vs PoP</span>
          <svg class="spark" viewBox="0 0 90 22" preserveAspectRatio="none">
            <polyline fill="none" stroke="#ff5470" stroke-width="1.3" points="0,5 12,7 24,6 36,10 48,9 60,13 72,11 84,15 90,17"/>
          </svg>
        </div>
      </div>
      <div class="card">
        <div><div class="lbl">MRR</div><div class="val tnum">$1.31M</div></div>
        <div class="row2">
          <span class="delta up">▲ +5.9% vs PoP</span>
          <svg class="spark" viewBox="0 0 90 22" preserveAspectRatio="none">
            <polyline fill="none" stroke="#27d796" stroke-width="1.3" points="0,17 12,16 24,13 36,14 48,10 60,11 72,7 84,6 90,4"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- Charts row -->
    <div class="grid3">
      <!-- Area/line -->
      <div class="panel">
        <div class="ptitle"><span class="t">Revenue / Sessions — 30D</span><span class="s">USD · indexed</span></div>
        <div class="pbody">
          <svg width="100%" height="100%" viewBox="0 0 720 300" preserveAspectRatio="none">
            <!-- grid -->
            <g stroke="#161c26" stroke-width="1">
              <line x1="0" y1="60" x2="720" y2="60"/><line x1="0" y1="120" x2="720" y2="120"/>
              <line x1="0" y1="180" x2="720" y2="180"/><line x1="0" y1="240" x2="720" y2="240"/>
              <line x1="120" y1="0" x2="120" y2="300"/><line x1="240" y1="0" x2="240" y2="300"/>
              <line x1="360" y1="0" x2="360" y2="300"/><line x1="480" y1="0" x2="480" y2="300"/>
              <line x1="600" y1="0" x2="600" y2="300"/>
            </g>
            <!-- area amber -->
            <defs>
              <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#f5a623" stop-opacity=".30"/>
                <stop offset="1" stop-color="#f5a623" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <path d="M0,210 60,200 120,215 180,170 240,185 300,150 360,160 420,120 480,135 540,95 600,110 660,70 720,60 720,300 0,300 Z" fill="url(#ag)"/>
            <polyline fill="none" stroke="#f5a623" stroke-width="2"
              points="0,210 60,200 120,215 180,170 240,185 300,150 360,160 420,120 480,135 540,95 600,110 660,70 720,60"/>
            <!-- secondary blue -->
            <polyline fill="none" stroke="#4ea8ff" stroke-width="1.4" stroke-dasharray="4 3"
              points="0,240 60,225 120,235 180,210 240,220 300,200 360,205 420,185 480,195 540,170 600,180 660,150 720,145"/>
            <!-- markers -->
            <circle cx="660" cy="70" r="3" fill="#f5a623"/><circle cx="720" cy="60" r="3" fill="#f5a623"/>
          </svg>
        </div>
        <div class="legend">
          <span><i style="background:#f5a623"></i>Revenue</span>
          <span><i style="background:#4ea8ff"></i>Sessions</span>
          <span style="margin-left:auto;color:#5f6b7a">PEAK 06-13 · $214K/d</span>
        </div>
      </div>

      <!-- Bars -->
      <div class="panel">
        <div class="ptitle"><span class="t">Net Revenue by Channel</span><span class="s">Δ vs target</span></div>
        <div class="pbody">
          <svg width="100%" height="100%" viewBox="0 0 460 300" preserveAspectRatio="none">
            <g stroke="#161c26" stroke-width="1">
              <line x1="0" y1="150" x2="460" y2="150"/>
            </g>
            <line x1="0" y1="150" x2="460" y2="150" stroke="#2a3340" stroke-width="1.2"/>
            <!-- bars centered at y150 -->
            <g>
              <rect x="20"  y="60"  width="40" height="90" fill="#27d796"/>
              <rect x="80"  y="150" width="40" height="62" fill="#ff5470"/>
              <rect x="140" y="100" width="40" height="50" fill="#27d796"/>
              <rect x="200" y="150" width="40" height="40" fill="#ff5470"/>
              <rect x="260" y="78"  width="40" height="72" fill="#27d796"/>
              <rect x="320" y="118" width="40" height="32" fill="#27d796"/>
              <rect x="380" y="150" width="40" height="55" fill="#ff5470"/>
            </g>
            <g fill="#5f6b7a" font-size="9" font-family="monospace" text-anchor="middle">
              <text x="40" y="228">PAID</text>
              <text x="100" y="228">SOCL</text>
              <text x="160" y="228">SEO</text>
              <text x="220" y="228">EMAIL</text>
              <text x="280" y="228">REF</text>
              <text x="340" y="228">DIR</text>
              <text x="400" y="228">AFF</text>
            </g>
            <g fill="#e8edf2" font-size="9" font-family="monospace" text-anchor="middle">
              <text x="40" y="52">+22%</text><text x="100" y="225">-14%</text>
              <text x="160" y="92">+11%</text><text x="220" y="203">-9%</text>
              <text x="280" y="70">+18%</text><text x="340" y="110">+7%</text>
              <text x="400" y="218">-12%</text>
            </g>
          </svg>
        </div>
        <div class="legend">
          <span><i style="background:#27d796"></i>Above target</span>
          <span><i style="background:#ff5470"></i>Below target</span>
        </div>
      </div>

      <!-- Donut -->
      <div class="panel">
        <div class="ptitle"><span class="t">Plan Mix</span><span class="s">% MRR</span></div>
        <div class="pbody" style="display:flex;align-items:center;justify-content:center">
          <svg width="170" height="170" viewBox="0 0 42 42">
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="#11161e" stroke-width="7"/>
            <!-- segments: 44 / 28 / 18 / 10 -->
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="#f5a623" stroke-width="7"
              stroke-dasharray="44 56" stroke-dashoffset="25"/>
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="#4ea8ff" stroke-width="7"
              stroke-dasharray="28 72" stroke-dashoffset="-19"/>
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="#27d796" stroke-width="7"
              stroke-dasharray="18 82" stroke-dashoffset="-47"/>
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="#5f6b7a" stroke-width="7"
              stroke-dasharray="10 90" stroke-dashoffset="-65"/>
            <text x="21" y="20" text-anchor="middle" fill="#e8edf2" font-size="5.5" font-family="monospace" font-weight="700">$1.31M</text>
            <text x="21" y="25.5" text-anchor="middle" fill="#5f6b7a" font-size="2.6" font-family="monospace">TOTAL MRR</text>
          </svg>
        </div>
        <div class="legend" style="flex-direction:column;gap:5px;border-top:1px solid var(--line);padding:8px 11px">
          <span style="display:flex;width:100%"><i style="background:#f5a623"></i>Enterprise<span style="margin-left:auto;color:#e8edf2">44%</span></span>
          <span style="display:flex;width:100%"><i style="background:#4ea8ff"></i>Business<span style="margin-left:auto;color:#e8edf2">28%</span></span>
          <span style="display:flex;width:100%"><i style="background:#27d796"></i>Pro<span style="margin-left:auto;color:#e8edf2">18%</span></span>
          <span style="display:flex;width:100%"><i style="background:#5f6b7a"></i>Starter<span style="margin-left:auto;color:#e8edf2">10%</span></span>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="bottom">
      <div class="panel">
        <div class="ptitle"><span class="t">Account Performance — Top Accounts</span><span class="s">sorted: MRR ▾ · 9 of 1,284</span></div>
        <div class="pbody"><div class="tscroll">
          <table>
            <thead>
              <tr>
                <th class="l">Account</th><th class="l">Plan</th><th>MRR</th><th>Seats</th>
                <th>Usage</th><th>NPS</th><th>Churn Risk</th><th>Δ 30D</th><th>Health</th>
              </tr>
            </thead>
            <tbody>
              <tr><td class="l">Northwind Traders</td><td class="l"><span class="tag am">ENT</span></td><td>$48,200</td><td>312</td><td><span class="bar-mini" style="width:38px"></span>94%</td><td>72</td><td>Low</td><td class="cell-pos">+6.2%</td><td class="up">●●●●●</td></tr>
              <tr><td class="l">Hyperion Labs</td><td class="l"><span class="tag am">ENT</span></td><td>$41,650</td><td>288</td><td><span class="bar-mini" style="width:33px"></span>81%</td><td>64</td><td>Low</td><td class="cell-pos">+3.1%</td><td class="up">●●●●○</td></tr>
              <tr><td class="l">Cobalt Systems</td><td class="l"><span class="tag">BUS</span></td><td>$33,910</td><td>204</td><td><span class="bar-mini" style="width:28px"></span>69%</td><td>58</td><td>Med</td><td class="cell-neg">-1.8%</td><td class="am">●●●○○</td></tr>
              <tr><td class="l">Meridian Group</td><td class="l"><span class="tag am">ENT</span></td><td>$29,400</td><td>176</td><td><span class="bar-mini" style="width:35px"></span>88%</td><td>70</td><td>Low</td><td class="cell-pos">+4.5%</td><td class="up">●●●●●</td></tr>
              <tr><td class="l">Vector Dynamics</td><td class="l"><span class="tag">BUS</span></td><td>$24,180</td><td>142</td><td><span class="bar-mini" style="width:21px"></span>52%</td><td>41</td><td>High</td><td class="cell-neg">-9.4%</td><td class="down">●○○○○</td></tr>
              <tr><td class="l">Aperture Inc</td><td class="l"><span class="tag">BUS</span></td><td>$21,760</td><td>130</td><td><span class="bar-mini" style="width:30px"></span>74%</td><td>61</td><td>Med</td><td class="cell-pos">+2.0%</td><td class="am">●●●○○</td></tr>
              <tr><td class="l">Solstice Media</td><td class="l"><span class="tag">PRO</span></td><td>$18,440</td><td>98</td><td><span class="bar-mini" style="width:25px"></span>63%</td><td>55</td><td>Med</td><td class="cell-pos">+1.2%</td><td class="am">●●●○○</td></tr>
              <tr><td class="l">Quantum Retail</td><td class="l"><span class="tag">PRO</span></td><td>$15,990</td><td>84</td><td><span class="bar-mini" style="width:16px"></span>39%</td><td>33</td><td>High</td><td class="cell-neg">-12.6%</td><td class="down">●○○○○</td></tr>
              <tr><td class="l">Beacon Health</td><td class="l"><span class="tag am">ENT</span></td><td>$14,300</td><td>76</td><td><span class="bar-mini" style="width:32px"></span>79%</td><td>67</td><td>Low</td><td class="cell-pos">+5.7%</td><td class="up">●●●●○</td></tr>
            </tbody>
          </table>
        </div></div>
      </div>
    </div>
  </div>
</body>
</html>
```
