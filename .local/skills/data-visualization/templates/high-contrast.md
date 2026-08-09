---
name: high-contrast
description: >-
  This is a High Contrast, accessibility-first analytics dashboard rendered as pure black (#000000) on white (#FFFFFF) with the colorblind-safe Okabe-Ito categorical palette: orange #E69F00, sky blue #56B4E9, bluish green #009E73, vermillion #D55E00, reddish purple #CC79A7, and yellow #F0E442. Typography uses a heavy-weight system: "Archivo" / "Arial Black" fallbacks at 800–900 weights for headings and KPI numbers, with "Inter"/system-ui for body text, employing very large type and tight uppercase letter-spacing for labels. The layout is a fixed 1440×900 grid with a thick 3px black-bordered header containing the app name and filter/date pill controls, a row of four KPI cards (each with 3px borders, bold value, and a delta chip), and a content region split into a large inline-SVG area/line chart, a bar chart, a donut, and a bordered data table — every panel carries heavy 3px solid #000 borders, hard (non-rounded or minimally rounded) corners, no drop shadows, and 4px black focus rings on interactive elements. Charts use solid Okabe-Ito fills layered with SVG `<pattern>` hatching/dots so categories are distinguishable by both color AND pattern, with thick 3px strokes and black axis lines. The overall aesthetic is bold, blocky, utilitarian, and maximally legible — flat fills, heavy rules, generous whitespace, and zero decorative gradients.
---

# High Contrast

This is a High Contrast, accessibility-first analytics dashboard rendered as pure black (#000000) on white (#FFFFFF) with the colorblind-safe Okabe-Ito categorical palette: orange #E69F00, sky blue #56B4E9, bluish green #009E73, vermillion #D55E00, reddish purple #CC79A7, and yellow #F0E442. Typography uses a heavy-weight system: "Archivo" / "Arial Black" fallbacks at 800–900 weights for headings and KPI numbers, with "Inter"/system-ui for body text, employing very large type and tight uppercase letter-spacing for labels. The layout is a fixed 1440×900 grid with a thick 3px black-bordered header containing the app name and filter/date pill controls, a row of four KPI cards (each with 3px borders, bold value, and a delta chip), and a content region split into a large inline-SVG area/line chart, a bar chart, a donut, and a bordered data table — every panel carries heavy 3px solid #000 borders, hard (non-rounded or minimally rounded) corners, no drop shadows, and 4px black focus rings on interactive elements. Charts use solid Okabe-Ito fills layered with SVG `<pattern>` hatching/dots so categories are distinguishable by both color AND pattern, with thick 3px strokes and black axis lines. The overall aesthetic is bold, blocky, utilitarian, and maximally legible — flat fills, heavy rules, generous whitespace, and zero decorative gradients.

## Source Code

A self-contained reference implementation of the "High Contrast" dashboard
preview. Use it as the visual target — translate the palette, typography, and
layout into the data-visualization React + Tailwind + Recharts app.
The fixed 1440×900 frame and hand-drawn inline-SVG charts below are
preview-rendering artifacts — keep the generated app's layout responsive
and build every chart with Recharts.

Responsive adaptation: In this bold high-contrast style, preserve the 3px black borders and colored accent bars at every breakpoint — collapse the 1.55fr/1fr split to a single column at ≤1024px, drop KPIs from 4→2→1 columns at 1024/560px, and let the right column's stacked panels size to content rather than equal rows. Charts should keep aspect ratio (never stretch SVGs) and shrink proportionally; the donut ring should scale via clamp() and its legend stack beneath on phones. Tables must go into a horizontal-scroll wrapper with a min-width so column proportions survive, header controls (segmented + pills) should become full-width fluid rows under 480px, and above 1600px the app should either widen gracefully or gain visible side rules so the layout never looks stranded in whitespace.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Metrics — High Contrast Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;800;900&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --ink:#000000; --paper:#ffffff;
    --c-orange:#E69F00; --c-sky:#56B4E9; --c-green:#009E73;
    --c-verm:#D55E00; --c-purple:#CC79A7; --c-yellow:#F0E442;
    --head:"Archivo","Arial Black",system-ui,sans-serif;
    --body:"Inter",system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
  }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{
    width:1440px;height:900px;overflow:hidden;
    background:var(--paper);color:var(--ink);
    font-family:var(--body);
  }
  .app{width:1440px;height:900px;display:flex;flex-direction:column}

  /* Header */
  header{
    border-bottom:3px solid var(--ink);
    height:78px;display:flex;align-items:center;justify-content:space-between;
    padding:0 28px;flex:0 0 auto;
  }
  .brand{display:flex;align-items:center;gap:14px}
  .logo{width:42px;height:42px;border:3px solid #000;display:flex;align-items:center;justify-content:center;font-family:var(--head);font-weight:900;font-size:24px}
  .brand h1{font-family:var(--head);font-weight:900;font-size:26px;letter-spacing:-0.5px;margin:0;text-transform:uppercase}
  .brand .sub{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;border-left:3px solid #000;padding-left:14px;margin-left:4px}
  .controls{display:flex;gap:12px;align-items:center}
  .pill{
    border:3px solid var(--ink);background:var(--paper);
    font-family:var(--body);font-weight:700;font-size:13px;
    text-transform:uppercase;letter-spacing:.5px;
    padding:9px 16px;cursor:pointer;display:flex;align-items:center;gap:8px;
  }
  .pill.active{background:var(--ink);color:var(--paper)}
  .pill:focus{outline:4px solid var(--c-sky);outline-offset:2px}
  .seg{display:flex;border:3px solid #000}
  .seg button{border:0;border-right:3px solid #000;background:#fff;font-family:var(--body);font-weight:800;font-size:13px;padding:9px 14px;cursor:pointer;text-transform:uppercase}
  .seg button:last-child{border-right:0}
  .seg button.on{background:#000;color:#fff}
  .seg button:focus{outline:4px solid var(--c-orange);outline-offset:-1px}

  /* main grid */
  .main{flex:1 1 auto;padding:22px 28px;display:grid;grid-template-rows:auto 1fr;gap:18px}
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
  .kpi{border:3px solid #000;padding:16px 18px;display:flex;flex-direction:column;gap:8px;position:relative}
  .kpi .bar{position:absolute;top:0;left:0;width:8px;height:100%}
  .kpi .label{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;padding-left:6px}
  .kpi .value{font-family:var(--head);font-weight:900;font-size:38px;line-height:1;padding-left:6px}
  .kpi .delta{display:inline-flex;align-items:center;gap:6px;font-weight:800;font-size:13px;padding:4px 8px;border:3px solid #000;width:fit-content;margin-left:6px}
  .up{background:var(--c-green);color:#000}
  .down{background:var(--c-verm);color:#fff}

  .grid2{display:grid;grid-template-columns:1.55fr 1fr;gap:18px;min-height:0}
  .panel{border:3px solid #000;display:flex;flex-direction:column;min-height:0}
  .panel .phead{border-bottom:3px solid #000;padding:12px 16px;display:flex;align-items:center;justify-content:space-between}
  .phead h2{font-family:var(--head);font-weight:800;font-size:16px;text-transform:uppercase;letter-spacing:.5px;margin:0}
  .phead .meta{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
  .pbody{flex:1 1 auto;padding:14px 16px;min-height:0;display:flex;flex-direction:column}

  .legend{display:flex;gap:16px;flex-wrap:wrap;margin-top:8px}
  .lg{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:700}
  .sw{width:18px;height:14px;border:2px solid #000}

  .right-col{display:grid;grid-template-rows:0.82fr 1.18fr;gap:18px;min-height:0}

  /* donut row */
  .donutwrap{display:flex;align-items:center;gap:18px}
  .donut-legend{display:flex;flex-direction:column;gap:9px}
  .dlrow{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:700}
  .dlrow b{font-family:var(--head);font-weight:800;margin-left:auto}

  /* table */
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;text-align:left;padding:6px 10px;border-bottom:3px solid #000}
  td{padding:6px 10px;border-bottom:2px solid #000;font-weight:600}
  tr:last-child td{border-bottom:0}
  td .tag{font-weight:800;border:2px solid #000;padding:2px 7px;font-size:11px;text-transform:uppercase}
  .num{font-family:var(--head);font-weight:800;text-align:right}
  .footer{flex:0 0 auto;border-top:3px solid #000;padding:6px 28px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;display:flex;justify-content:space-between}
</style>
</head>
<body>
<div class="app">
  <header>
    <div class="brand">
      <div class="logo">M</div>
      <h1>Metrics OS</h1>
      <span class="sub">Growth Overview</span>
    </div>
    <div class="controls">
      <div class="seg" role="group" aria-label="range">
        <button>7D</button>
        <button class="on">30D</button>
        <button>QTR</button>
        <button>YTD</button>
      </div>
      <button class="pill" tabindex="0">▦ All Segments</button>
      <button class="pill active" tabindex="0">▣ Oct 2024</button>
    </div>
  </header>

  <div class="main">
    <!-- KPIs -->
    <section class="kpis">
      <div class="kpi">
        <span class="bar" style="background:var(--c-orange)"></span>
        <span class="label">Revenue</span>
        <span class="value">$1.84M</span>
        <span class="delta up">▲ 12.4% vs prev</span>
      </div>
      <div class="kpi">
        <span class="bar" style="background:var(--c-sky)"></span>
        <span class="label">Active Users</span>
        <span class="value">48,210</span>
        <span class="delta up">▲ 6.8% vs prev</span>
      </div>
      <div class="kpi">
        <span class="bar" style="background:var(--c-green)"></span>
        <span class="label">MRR</span>
        <span class="value">$312K</span>
        <span class="delta up">▲ 4.1% vs prev</span>
      </div>
      <div class="kpi">
        <span class="bar" style="background:var(--c-verm)"></span>
        <span class="label">Conversion</span>
        <span class="value">3.92%</span>
        <span class="delta down">▼ 0.6% vs prev</span>
      </div>
    </section>

    <div class="grid2">
      <!-- Area / line chart -->
      <div class="panel">
        <div class="phead">
          <h2>Revenue & Active Users</h2>
          <span class="meta">Daily · Oct 1 – Oct 30</span>
        </div>
        <div class="pbody">
          <svg viewBox="0 0 792 470" width="100%" height="100%" style="flex:1 1 auto;min-height:0">
            <defs>
              <pattern id="hatchOrange" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <rect width="8" height="8" fill="var(--c-orange)"/>
                <line x1="0" y1="0" x2="0" y2="8" stroke="#000" stroke-width="3"/>
              </pattern>
              <pattern id="dotsSky" width="9" height="9" patternUnits="userSpaceOnUse">
                <rect width="9" height="9" fill="var(--c-sky)"/>
                <circle cx="4.5" cy="4.5" r="2" fill="#000"/>
              </pattern>
            </defs>
            <!-- gridlines -->
            <g stroke="#000" stroke-width="1" opacity="0.25">
              <line x1="44" y1="30" x2="772" y2="30"/>
              <line x1="44" y1="141" x2="772" y2="141"/>
              <line x1="44" y1="253" x2="772" y2="253"/>
              <line x1="44" y1="364" x2="772" y2="364"/>
            </g>
            <!-- axes -->
            <line x1="44" y1="30" x2="44" y2="420" stroke="#000" stroke-width="3"/>
            <line x1="44" y1="420" x2="772" y2="420" stroke="#000" stroke-width="3"/>
            <!-- area: users (sky dots) -->
            <polygon points="44,420 44,327 165,281 287,299 408,216 529,234 651,160 772,132 772,420"
                     fill="url(#dotsSky)" stroke="var(--c-sky)" stroke-width="0"/>
            <polyline points="44,327 165,281 287,299 408,216 529,234 651,160 772,132"
                      fill="none" stroke="#000" stroke-width="3"/>
            <!-- line: revenue (orange) -->
            <polyline points="44,346 165,318 287,253 408,271 529,179 651,197 772,86"
                      fill="none" stroke="var(--c-orange)" stroke-width="5"/>
            <g fill="var(--c-orange)" stroke="#000" stroke-width="2.5">
              <circle cx="44" cy="346" r="6"/><circle cx="165" cy="318" r="6"/>
              <circle cx="287" cy="253" r="6"/><circle cx="408" cy="271" r="6"/>
              <circle cx="529" cy="179" r="6"/><circle cx="651" cy="197" r="6"/>
              <circle cx="772" cy="86" r="6"/>
            </g>
            <g font-family="Inter,sans-serif" font-size="12" font-weight="700" fill="#000">
              <text x="40" y="34" text-anchor="end">$80K</text>
              <text x="40" y="424" text-anchor="end">$0</text>
              <text x="44" y="446">1</text><text x="209" y="446">8</text>
              <text x="375" y="446">15</text><text x="540" y="446">22</text>
              <text x="772" y="446" text-anchor="end">30</text>
            </g>
          </svg>
          <div class="legend">
            <span class="lg"><span class="sw" style="background:var(--c-orange)"></span>Revenue</span>
            <span class="lg"><span class="sw" style="background:url(#dotsSky);background-color:var(--c-sky)"></span>Active Users (dotted)</span>
          </div>
        </div>
      </div>

      <!-- right column: bar + donut -->
      <div class="right-col">
        <div class="panel">
          <div class="phead">
            <h2>Revenue by Channel</h2>
            <span class="meta">$K</span>
          </div>
          <div class="pbody">
            <svg viewBox="0 0 498 148" width="100%" height="100%" style="flex:1 1 auto;min-height:0">
              <defs>
                <pattern id="hatchGreen" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                  <rect width="8" height="8" fill="var(--c-green)"/>
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#000" stroke-width="3"/>
                </pattern>
                <pattern id="hatchPurple" width="8" height="8" patternTransform="rotate(-45)" patternUnits="userSpaceOnUse">
                  <rect width="8" height="8" fill="var(--c-purple)"/>
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#000" stroke-width="3"/>
                </pattern>
              </defs>
              <line x1="86" y1="4" x2="86" y2="144" stroke="#000" stroke-width="3"/>
              <!-- bars -->
              <g stroke="#000" stroke-width="2.5">
                <rect x="88" y="8" width="330" height="20" fill="var(--c-orange)"/>
                <rect x="88" y="36" width="260" height="20" fill="url(#dotsSky)"/>
                <rect x="88" y="64" width="212" height="20" fill="url(#hatchGreen)"/>
                <rect x="88" y="92" width="142" height="20" fill="url(#hatchPurple)"/>
                <rect x="88" y="120" width="82" height="20" fill="var(--c-yellow)"/>
              </g>
              <g font-family="Inter,sans-serif" font-size="12" font-weight="800" fill="#000" text-anchor="end">
                <text x="80" y="23">Direct</text>
                <text x="80" y="51">Organic</text>
                <text x="80" y="79">Paid</text>
                <text x="80" y="107">Email</text>
                <text x="80" y="135">Social</text>
              </g>
              <g font-family="Archivo,sans-serif" font-size="12" font-weight="800" fill="#000">
                <text x="426" y="23">740</text><text x="356" y="51">582</text>
                <text x="308" y="79">476</text><text x="238" y="107">318</text>
                <text x="178" y="135">185</text>
              </g>
            </svg>
          </div>
        </div>

        <div class="panel">
          <div class="phead">
            <h2>Plan Mix</h2>
            <span class="meta">Active Subs</span>
          </div>
          <div class="pbody">
            <div class="donutwrap">
              <svg viewBox="0 0 130 130" width="116" height="116">
                <defs>
                  <pattern id="dHatch" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                    <rect width="7" height="7" fill="var(--c-green)"/><line x1="0" y1="0" x2="0" y2="7" stroke="#000" stroke-width="2.5"/>
                  </pattern>
                  <pattern id="dDots" width="8" height="8" patternUnits="userSpaceOnUse">
                    <rect width="8" height="8" fill="var(--c-sky)"/><circle cx="4" cy="4" r="1.8" fill="#000"/>
                  </pattern>
                </defs>
                <!-- donut segments via stroke-dasharray; circumference ~ 326.7 (r=52) -->
                <g fill="none" stroke-width="26">
                  <circle cx="65" cy="65" r="40" stroke="var(--c-orange)" stroke-dasharray="113 138" transform="rotate(-90 65 65)"/>
                  <circle cx="65" cy="65" r="40" stroke="url(#dDots)" stroke-dasharray="75 176" stroke-dashoffset="-113" transform="rotate(-90 65 65)"/>
                  <circle cx="65" cy="65" r="40" stroke="url(#dHatch)" stroke-dasharray="38 213" stroke-dashoffset="-188" transform="rotate(-90 65 65)"/>
                  <circle cx="65" cy="65" r="40" stroke="var(--c-purple)" stroke-dasharray="25 226" stroke-dashoffset="-226" transform="rotate(-90 65 65)"/>
                </g>
                <circle cx="65" cy="65" r="53" fill="none" stroke="#000" stroke-width="3"/>
                <circle cx="65" cy="65" r="27" fill="none" stroke="#000" stroke-width="3"/>
                <text x="65" y="62" text-anchor="middle" font-family="Archivo,sans-serif" font-weight="900" font-size="16">9.4K</text>
                <text x="65" y="76" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="8">SUBS</text>
              </svg>
              <div class="donut-legend">
                <div class="dlrow"><span class="sw" style="background:var(--c-orange)"></span>Pro <b>45%</b></div>
                <div class="dlrow"><span class="sw" style="background:var(--c-sky)"></span>Team <b>30%</b></div>
                <div class="dlrow"><span class="sw" style="background:var(--c-green)"></span>Starter <b>15%</b></div>
                <div class="dlrow"><span class="sw" style="background:var(--c-purple)"></span>Enterprise <b>10%</b></div>
              </div>
            </div>
            <table style="margin-top:6px">
              <thead><tr><th>Plan</th><th>Accounts</th><th class="num">ARPA</th><th>Trend</th></tr></thead>
              <tbody>
                <tr><td><span class="tag">Pro</span></td><td>4,230</td><td class="num">$148</td><td><b style="color:#009E73">▲ 5%</b></td></tr>
                <tr><td><span class="tag">Team</span></td><td>2,820</td><td class="num">$402</td><td><b style="color:#009E73">▲ 9%</b></td></tr>
                <tr><td><span class="tag">Enterprise</span></td><td>940</td><td class="num">$1,910</td><td><b style="color:#D55E00">▼ 2%</b></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <span>Source: Metrics OS Warehouse · Synced 4 min ago</span>
    <span>Colorblind-safe · WCAG AAA Contrast</span>
  </div>
</div>
</body>
</html>
```
