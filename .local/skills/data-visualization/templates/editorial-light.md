---
name: editorial-light
description: >-
  This "Editorial Light" dashboard evokes a printed magazine analysis report on warm paper white (#FAF6EF) with ink-black text (#1A1714) and a single vermillion accent (#C1452E) for deltas and chart highlights; secondary muted tones use #8A8175 and hairline rules in #E0D8CC. Headlines use Playfair Display (serif, weights 600–700) while all body text, numerals, and labels use Inter (sans-serif) with generous letter-spacing on small uppercase eyebrows. The layout is a centered narrow column (max ~1180px) with a masthead featuring a title, dateline, and pill-style filter controls separated by 1px rules, followed by a 4-up KPI row, a two-thirds/one-third chart split (line/area chart + donut), and a clean ruled data table below. Charts are rendered as minimal inline SVG with thin 1.5px strokes, subtle area fills, hairline gridlines, and no heavy chrome — favoring whitespace and typographic restraint. The overall aesthetic feels calm, literary, and high-end editorial: warm, quiet, and precise, like a Monocle or NYT data feature rendered for an analytics product.
---

# Editorial Light

This "Editorial Light" dashboard evokes a printed magazine analysis report on warm paper white (#FAF6EF) with ink-black text (#1A1714) and a single vermillion accent (#C1452E) for deltas and chart highlights; secondary muted tones use #8A8175 and hairline rules in #E0D8CC. Headlines use Playfair Display (serif, weights 600–700) while all body text, numerals, and labels use Inter (sans-serif) with generous letter-spacing on small uppercase eyebrows. The layout is a centered narrow column (max ~1180px) with a masthead featuring a title, dateline, and pill-style filter controls separated by 1px rules, followed by a 4-up KPI row, a two-thirds/one-third chart split (line/area chart + donut), and a clean ruled data table below. Charts are rendered as minimal inline SVG with thin 1.5px strokes, subtle area fills, hairline gridlines, and no heavy chrome — favoring whitespace and typographic restraint. The overall aesthetic feels calm, literary, and high-end editorial: warm, quiet, and precise, like a Monocle or NYT data feature rendered for an analytics product.

## Source Code

A self-contained reference implementation of the "Editorial Light" dashboard
preview. Use it as the visual target — translate the palette, typography, and
layout into the data-visualization React + Tailwind + Recharts app.
The fixed 1440×900 frame and hand-drawn inline-SVG charts below are
preview-rendering artifacts — keep the generated app's layout responsive
and build every chart with Recharts.

Responsive adaptation: This editorial dashboard should feel like a broadsheet: keep the two-column charts row (2fr/1fr) on ≥1024px, collapse to single-column stacked panels below, and let KPI rules act like newspaper column rules — 4-up on desktop, 2-up on tablet, 1-up under 480px with horizontal rules replacing vertical ones. The data table must live inside its own horizontal-scroll container with a sticky first column on phones, while SVG charts should scale proportionally via aspect-ratio (never preserveAspectRatio="none") so the line and donut retain their editorial proportions. Use clamp() for all typography, gutters, and skeleton widths so the layout breathes from 360px up to 2200px without fixed-pixel dead zones.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1440, initial-scale=1">
<title>Editorial Analytics</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root{
    --paper:#FAF6EF;
    --paper2:#F4EEE3;
    --ink:#1A1714;
    --muted:#8A8175;
    --rule:#E0D8CC;
    --accent:#C1452E;
    --green:#4F7A52;
    --serif:'Playfair Display', Georgia, 'Times New Roman', serif;
    --sans:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
  *{box-sizing:border-box}
  html,body{margin:0}
  body{
    width:1440px;height:900px;overflow:hidden;
    background:var(--paper);color:var(--ink);
    font-family:var(--sans);
    display:flex;justify-content:center;
  }
  .page{width:1180px;height:900px;padding:30px 0 0;display:flex;flex-direction:column}

  /* Masthead */
  .masthead{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:14px;border-bottom:2px solid var(--ink)}
  .eyebrow{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--muted);font-weight:600;margin-bottom:6px}
  .title{font-family:var(--serif);font-weight:700;font-size:38px;line-height:1;letter-spacing:-.01em}
  .controls{display:flex;align-items:stretch;gap:0;border:1px solid var(--rule);border-radius:2px;background:#fff8ee}
  .ctrl{padding:9px 16px;font-size:12px;color:var(--ink);border-right:1px solid var(--rule);display:flex;flex-direction:column;gap:2px}
  .ctrl:last-child{border-right:none}
  .ctrl .lbl{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
  .ctrl .val{font-weight:600;font-size:13px;display:flex;align-items:center;gap:6px}
  .dot{width:7px;height:7px;border-radius:50%;background:var(--accent)}

  .dateline{font-size:11px;color:var(--muted);padding:8px 0 18px;letter-spacing:.04em;font-style:italic;font-family:var(--serif)}

  /* KPI row */
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
  .kpi{padding:16px 22px 16px 0;border-right:1px solid var(--rule)}
  .kpi:last-child{border-right:none;padding-right:0}
  .kpi:not(:first-child){padding-left:22px}
  .kpi .k-lbl{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);font-weight:600}
  .kpi .k-val{font-family:var(--serif);font-weight:600;font-size:30px;margin:7px 0 4px;letter-spacing:-.01em}
  .delta{font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:4px}
  .up{color:var(--green)}.down{color:var(--accent)}
  .delta .since{color:var(--muted);font-weight:400;margin-left:4px}

  /* Charts */
  .charts{display:grid;grid-template-columns:2fr 1fr;gap:30px;padding:22px 0;flex:1}
  .panel{display:flex;flex-direction:column}
  .panel-head{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--rule);padding-bottom:8px;margin-bottom:12px}
  .panel-title{font-family:var(--serif);font-size:20px;font-weight:600}
  .panel-sub{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600}
  .legend{display:flex;gap:16px;font-size:11px;color:var(--muted);margin-top:8px}
  .legend span{display:inline-flex;align-items:center;gap:6px}
  .swatch{width:14px;height:2px;display:inline-block}

  /* Donut center */
  .donut-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1}
  .donut-legend{width:100%;margin-top:8px}
  .dl-row{display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:6px 0;border-bottom:1px solid var(--rule)}
  .dl-row:last-child{border-bottom:none}
  .dl-name{display:flex;align-items:center;gap:8px;color:var(--ink)}
  .dl-name i{width:8px;height:8px;border-radius:50%;display:inline-block}
  .dl-val{font-weight:600;font-family:var(--serif)}

  /* Table */
  .table-wrap{padding-bottom:20px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  thead th{text-align:left;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);font-weight:600;padding:8px 0;border-bottom:1px solid var(--ink)}
  tbody td{padding:9px 0;border-bottom:1px solid var(--rule)}
  tbody tr:last-child td{border-bottom:none}
  td.num{text-align:right;font-variant-numeric:tabular-nums;font-weight:500}
  .seg{font-family:var(--serif);font-weight:600;font-size:13px}
  .pos{color:var(--green);font-weight:600}.neg{color:var(--accent);font-weight:600}
</style>
</head>
<body>
  <div class="page">
    <!-- Masthead -->
    <div class="masthead">
      <div>
        <div class="eyebrow">Quarterly Review · Volume IX</div>
        <div class="title">The Growth Ledger</div>
      </div>
      <div class="controls">
        <div class="ctrl"><span class="lbl">Period</span><span class="val">Q3 2024</span></div>
        <div class="ctrl"><span class="lbl">Segment</span><span class="val">All Plans</span></div>
        <div class="ctrl"><span class="lbl">Status</span><span class="val"><span class="dot"></span>Live</span></div>
      </div>
    </div>
    <div class="dateline">An analysis of revenue performance and customer momentum, prepared July 1 — September 30.</div>

    <!-- KPIs -->
    <div class="kpis">
      <div class="kpi">
        <div class="k-lbl">Revenue</div>
        <div class="k-val">$2.84M</div>
        <div class="delta up">▲ 12.4% <span class="since">vs. last quarter</span></div>
      </div>
      <div class="kpi">
        <div class="k-lbl">Monthly Recurring</div>
        <div class="k-val">$948K</div>
        <div class="delta up">▲ 8.1% <span class="since">vs. last quarter</span></div>
      </div>
      <div class="kpi">
        <div class="k-lbl">Active Users</div>
        <div class="k-val">38,210</div>
        <div class="delta up">▲ 5.6% <span class="since">vs. last quarter</span></div>
      </div>
      <div class="kpi">
        <div class="k-lbl">Conversion</div>
        <div class="k-val">3.42%</div>
        <div class="delta down">▼ 0.3% <span class="since">vs. last quarter</span></div>
      </div>
    </div>

    <!-- Charts -->
    <div class="charts">
      <!-- Line / area -->
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">Revenue &amp; Recurring Trend</div>
          <div class="panel-sub">USD · 12 weeks</div>
        </div>
        <svg viewBox="0 0 700 300" width="100%" height="100%" preserveAspectRatio="none" style="display:block">
          <!-- gridlines -->
          <g stroke="#E0D8CC" stroke-width="1">
            <line x1="0" y1="40" x2="700" y2="40"/>
            <line x1="0" y1="100" x2="700" y2="100"/>
            <line x1="0" y1="160" x2="700" y2="160"/>
            <line x1="0" y1="220" x2="700" y2="220"/>
            <line x1="0" y1="280" x2="700" y2="280"/>
          </g>
          <!-- area fill revenue -->
          <path d="M0,210 L60,195 L120,200 L180,165 L240,150 L300,160 L360,120 L420,108 L480,90 L540,95 L600,62 L660,55 L700,48 L700,280 L0,280 Z" fill="#C1452E" fill-opacity="0.08"/>
          <!-- revenue line -->
          <path d="M0,210 L60,195 L120,200 L180,165 L240,150 L300,160 L360,120 L420,108 L480,90 L540,95 L600,62 L660,55 L700,48" fill="none" stroke="#C1452E" stroke-width="1.8"/>
          <!-- mrr line -->
          <path d="M0,240 L60,232 L120,235 L180,218 L240,210 L300,212 L360,190 L420,185 L480,175 L540,178 L600,160 L660,155 L700,150" fill="none" stroke="#1A1714" stroke-width="1.5" stroke-dasharray="1 0"/>
          <!-- points -->
          <g fill="#C1452E"><circle cx="700" cy="48" r="3.5"/></g>
          <g fill="#1A1714"><circle cx="700" cy="150" r="3"/></g>
          <!-- x labels -->
          <g fill="#8A8175" font-family="Inter,sans-serif" font-size="10" text-anchor="middle">
            <text x="30" y="296">Jul 01</text>
            <text x="180" y="296">Jul 22</text>
            <text x="360" y="296">Aug 19</text>
            <text x="540" y="296">Sep 09</text>
            <text x="680" y="296">Sep 30</text>
          </g>
        </svg>
        <div class="legend">
          <span><i class="swatch" style="background:#C1452E"></i> Total Revenue</span>
          <span><i class="swatch" style="background:#1A1714"></i> Recurring (MRR)</span>
        </div>
      </div>

      <!-- Donut -->
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">Revenue Mix</div>
          <div class="panel-sub">By plan</div>
        </div>
        <div class="donut-wrap">
          <svg viewBox="0 0 200 200" width="190" height="190">
            <!-- segments via stroke-dasharray, circumference ~ 502.4 (r=80) -->
            <g transform="translate(100,100)">
              <circle r="80" fill="none" stroke="#E0D8CC" stroke-width="26"/>
              <!-- Enterprise 46% -->
              <circle r="80" fill="none" stroke="#C1452E" stroke-width="26" stroke-dasharray="231 271" transform="rotate(-90)"/>
              <!-- Growth 31% -->
              <circle r="80" fill="none" stroke="#1A1714" stroke-width="26" stroke-dasharray="156 346" stroke-dashoffset="-231" transform="rotate(-90)"/>
              <!-- Starter 23% -->
              <circle r="80" fill="none" stroke="#8A8175" stroke-width="26" stroke-dasharray="115 387" stroke-dashoffset="-387" transform="rotate(-90)"/>
            </g>
            <text x="100" y="96" text-anchor="middle" font-family="Playfair Display,serif" font-size="30" font-weight="600" fill="#1A1714">$2.84M</text>
            <text x="100" y="116" text-anchor="middle" font-family="Inter,sans-serif" font-size="9" letter-spacing="2" fill="#8A8175">TOTAL</text>
          </svg>
          <div class="donut-legend">
            <div class="dl-row"><span class="dl-name"><i style="background:#C1452E"></i>Enterprise</span><span class="dl-val">46%</span></div>
            <div class="dl-row"><span class="dl-name"><i style="background:#1A1714"></i>Growth</span><span class="dl-val">31%</span></div>
            <div class="dl-row"><span class="dl-name"><i style="background:#8A8175"></i>Starter</span><span class="dl-val">23%</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="table-wrap">
      <div class="panel-head" style="margin-bottom:0">
        <div class="panel-title" style="font-size:18px">Top Performing Segments</div>
        <div class="panel-sub">Ranked by MRR</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Segment</th>
            <th>Region</th>
            <th style="text-align:right">Accounts</th>
            <th style="text-align:right">MRR</th>
            <th style="text-align:right">Churn</th>
            <th style="text-align:right">QoQ Δ</th>
          </tr>
        </thead>
        <tbody>
          <tr><td class="seg">Enterprise</td><td>North America</td><td class="num">412</td><td class="num">$436,200</td><td class="num">1.2%</td><td class="num pos">+14.8%</td></tr>
          <tr><td class="seg">Growth</td><td>Europe</td><td class="num">1,284</td><td class="num">$294,600</td><td class="num">2.8%</td><td class="num pos">+9.1%</td></tr>
          <tr><td class="seg">Starter</td><td>Asia-Pacific</td><td class="num">6,920</td><td class="num">$148,400</td><td class="num">4.6%</td><td class="num neg">−2.3%</td></tr>
          <tr><td class="seg">Enterprise</td><td>Europe</td><td class="num">188</td><td class="num">$121,900</td><td class="num">0.9%</td><td class="num pos">+6.7%</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
```
