---
name: art-deco
description: >-
  This "Art Deco" dashboard stages Gatsby-era luxury on near-black #0E0C08 washed by a faint champagne radial glow at top center, with panels in #171310 framed by 1px gold borders (rgba(201,162,39,.4)) and stepped double-frame corners from a thin offset outline. The palette is gilded and jewel-toned — gold #D4AF37, champagne #F1E3B2, emerald #1F6F54, and oxblood #7A2E2B for negatives — over ivory text (#F5EFE0) with muted #9C9077 labels. Display type and KPI numerals use Cormorant Garamond 600 while labels and body use Jost 400/500 with wide uppercase letter-spacing, punctuated by small diamond separators and thin double gold rules between sections; a symmetric inline-SVG sunburst fans out behind the header title. The layout is a fixed 1440×900 grid: a header with brand and three filter-style controls, a 4-KPI row, a 2/3 + 1/3 chart split, and a full-width table ruled by hairline gold lines with diamond bullets. Charts are hand-drawn inline SVG — a gold 2px line with champagne-to-transparent area fill and an emerald secondary line over rgba(201,162,39,.12) gridlines, plus a gold/emerald/champagne/oxblood donut with a gold-ringed serif total. The overall aesthetic is opulent Deco glamour: black lacquer, brushed gold, and champagne light, like a private bank's ledger set for a 1928 ballroom.
---

# Art Deco

This "Art Deco" dashboard stages Gatsby-era luxury on near-black #0E0C08 washed by a faint champagne radial glow at top center, with panels in #171310 framed by 1px gold borders (rgba(201,162,39,.4)) and stepped double-frame corners from a thin offset outline. The palette is gilded and jewel-toned — gold #D4AF37, champagne #F1E3B2, emerald #1F6F54, and oxblood #7A2E2B for negatives — over ivory text (#F5EFE0) with muted #9C9077 labels. Display type and KPI numerals use Cormorant Garamond 600 while labels and body use Jost 400/500 with wide uppercase letter-spacing, punctuated by small diamond separators and thin double gold rules between sections; a symmetric inline-SVG sunburst fans out behind the header title. The layout is a fixed 1440×900 grid: a header with brand and three filter-style controls, a 4-KPI row, a 2/3 + 1/3 chart split, and a full-width table ruled by hairline gold lines with diamond bullets. Charts are hand-drawn inline SVG — a gold 2px line with champagne-to-transparent area fill and an emerald secondary line over rgba(201,162,39,.12) gridlines, plus a gold/emerald/champagne/oxblood donut with a gold-ringed serif total. The overall aesthetic is opulent Deco glamour: black lacquer, brushed gold, and champagne light, like a private bank's ledger set for a 1928 ballroom.

## Source Code

A self-contained reference implementation of the "Art Deco" dashboard
preview. Use it as the visual target — translate the palette, typography, and
layout into the data-visualization React + Tailwind + Recharts app.
The fixed 1440×900 frame and hand-drawn inline-SVG charts below are
preview-rendering artifacts — keep the generated app's layout responsive
and build every chart with Recharts.

Responsive adaptation: This art-deco dashboard should feel like an engraved plate at every size: keep the gold frame/outline treatment intact but let interior grids fluidly reflow using auto-fit minmax rather than hard breakpoints — KPIs collapse 4→2→1, the 2fr/1fr chart split stacks below ~960px with the donut panel centered, and the ledger table always lives inside a horizontally scrollable wrapper with a gilt fade on the right edge to signal overflow. Decorative elements (double rules, diamond bullets, donut ring) should scale via clamp() so they don't look miniature on 2000px+ displays or crowd 360px phones, and the max-width cap should lift (or the inner spacing grow) above 1800px so the composition doesn't strand in empty gutters.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1440, initial-scale=1">
<title>Meridian &amp; Gilt — Private Wealth</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Jost:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#0E0C08; --panel:#171310;
    --gold:#D4AF37; --champ:#F1E3B2; --emerald:#1F6F54; --oxblood:#7A2E2B;
    --ivory:#F5EFE0; --muted:#9C9077;
    --frame:rgba(201,162,39,.4); --frame2:rgba(201,162,39,.16);
    --hair:rgba(201,162,39,.18); --grid:rgba(201,162,39,.12);
    --up:#63B38C; --down:#CE7B6C;
    --serif:'Cormorant Garamond',Georgia,'Times New Roman',serif;
    --sans:'Jost','Segoe UI',Helvetica,Arial,sans-serif;
  }
  *{box-sizing:border-box}
  html,body{margin:0}
  body{
    width:1440px;height:900px;overflow:hidden;
    font-family:var(--sans);color:var(--ivory);
    background:radial-gradient(780px 340px at 50% -70px, rgba(241,227,178,.13), transparent 62%), var(--bg);
  }
  .page{height:900px;padding:26px 36px 24px;display:flex;flex-direction:column}

  /* Header */
  header{display:flex;justify-content:space-between;align-items:flex-end;position:relative;padding-bottom:12px}
  .sunburst{position:absolute;left:-30px;top:-24px;pointer-events:none;opacity:.32;z-index:0}
  .brand-text{position:relative;z-index:1}
  .eyebrow{font-size:10px;letter-spacing:.34em;text-transform:uppercase;color:var(--gold);font-weight:500;margin-bottom:8px}
  .title{font-family:var(--serif);font-weight:600;font-size:36px;line-height:1;margin:0;color:var(--champ);letter-spacing:.04em}
  .controls{display:flex;gap:14px}
  .ctrl{border:1px solid var(--frame);outline:1px solid var(--frame2);outline-offset:3px;background:#131009;padding:8px 18px;min-width:130px}
  .ctrl .lbl{font-size:8px;letter-spacing:.26em;text-transform:uppercase;color:var(--muted)}
  .ctrl .val{font-size:13px;letter-spacing:.08em;margin-top:3px;display:flex;align-items:center;gap:8px}
  .dot{width:6px;height:6px;transform:rotate(45deg);background:var(--gold)}
  .drule{border-top:1px solid rgba(212,175,55,.55);border-bottom:1px solid rgba(212,175,55,.22);height:4px;margin-bottom:20px}

  /* Panels */
  .panel{background:var(--panel);border:1px solid var(--frame);outline:1px solid var(--frame2);outline-offset:3px;padding:16px 20px}
  .p-head{display:flex;justify-content:space-between;align-items:baseline;border-bottom:3px double rgba(212,175,55,.4);padding-bottom:8px;margin-bottom:10px}
  .p-title{font-family:var(--serif);font-size:21px;font-weight:600;color:var(--champ)}
  .p-sub{font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:var(--muted)}

  /* KPI row */
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:22px;margin-bottom:18px}
  .kpi .lbl{font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:var(--muted)}
  .kpi .lbl::before{content:"◆";color:var(--gold);font-size:7px;margin-right:8px;vertical-align:1px}
  .kpi .val{font-family:var(--serif);font-size:30px;font-weight:600;margin:8px 0 5px;line-height:1}
  .delta{font-size:11px;letter-spacing:.06em;font-weight:500}
  .delta .since{color:var(--muted);font-weight:400;margin-left:5px}
  .up{color:var(--up)}.down{color:var(--down)}

  /* Charts */
  .charts{display:grid;grid-template-columns:2fr 1fr;gap:22px;margin-bottom:18px}
  .legend{display:flex;gap:20px;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-top:10px}
  .legend i{display:inline-block;width:16px;height:2px;margin-right:7px;vertical-align:middle}
  .donut-wrap{display:flex;flex-direction:column;align-items:center}
  .dl{width:100%;margin-top:10px}
  .dl-row{display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:5px 0;border-bottom:1px solid var(--hair)}
  .dl-row:last-child{border-bottom:none}
  .dl-name{display:flex;align-items:center;gap:9px;letter-spacing:.04em}
  .dl-name i{width:7px;height:7px;transform:rotate(45deg);display:inline-block}
  .dl-val{font-family:var(--serif);font-size:14px;font-weight:600;color:var(--champ)}
  .dl-val .amt{font-family:var(--sans);font-size:10px;color:var(--muted);font-weight:400;margin-left:6px}

  /* Table */
  table{width:100%;border-collapse:collapse;font-size:12.5px}
  thead th{text-align:left;font-size:8.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--muted);font-weight:500;padding:4px 0 8px;border-bottom:1px solid rgba(212,175,55,.5)}
  tbody td{padding:8px 0;border-bottom:1px solid var(--hair)}
  tbody tr:last-child td{border-bottom:none}
  td.seg{font-family:var(--serif);font-size:15px;font-weight:600;color:var(--champ)}
  td.seg::before{content:"◆";color:var(--gold);font-size:8px;margin-right:10px;vertical-align:2px}
  td.dim{color:var(--muted)}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  td.pos{color:var(--up);font-weight:500}
  td.neg{color:var(--down);font-weight:500}
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <header>
    <div class="brand">
      <svg class="sunburst" width="340" height="140" viewBox="0 0 340 140">
        <g stroke="#D4AF37" stroke-width="1" fill="none">
          <line x1="170" y1="130" x2="290" y2="130"/>
          <line x1="170" y1="130" x2="286" y2="99"/>
          <line x1="170" y1="130" x2="274" y2="70"/>
          <line x1="170" y1="130" x2="255" y2="45"/>
          <line x1="170" y1="130" x2="230" y2="26"/>
          <line x1="170" y1="130" x2="201" y2="14"/>
          <line x1="170" y1="130" x2="170" y2="10"/>
          <line x1="170" y1="130" x2="139" y2="14"/>
          <line x1="170" y1="130" x2="110" y2="26"/>
          <line x1="170" y1="130" x2="85" y2="45"/>
          <line x1="170" y1="130" x2="66" y2="70"/>
          <line x1="170" y1="130" x2="54" y2="99"/>
          <line x1="170" y1="130" x2="50" y2="130"/>
          <circle cx="170" cy="130" r="26" opacity=".8"/>
          <circle cx="170" cy="130" r="52" opacity=".45"/>
        </g>
      </svg>
      <div class="brand-text">
        <div class="eyebrow">Private Wealth ◆ Quarterly Register</div>
        <h1 class="title">Meridian &amp; Gilt</h1>
      </div>
    </div>
    <div class="controls">
      <div class="ctrl"><div class="lbl">Period</div><div class="val">FY 2024 ◆ Q3</div></div>
      <div class="ctrl"><div class="lbl">Desk</div><div class="val">All Desks</div></div>
      <div class="ctrl"><div class="lbl">Status</div><div class="val"><span class="dot"></span>Live Ledger</div></div>
    </div>
  </header>
  <div class="drule"></div>

  <!-- KPIs -->
  <section class="kpis">
    <div class="panel kpi">
      <div class="lbl">Assets Under Management</div>
      <div class="val">$4.28B</div>
      <div class="delta up">▲ 6.2% <span class="since">vs prior quarter</span></div>
    </div>
    <div class="panel kpi">
      <div class="lbl">Net New Inflows</div>
      <div class="val">$186M</div>
      <div class="delta up">▲ 11.4% <span class="since">vs prior quarter</span></div>
    </div>
    <div class="panel kpi">
      <div class="lbl">Active Mandates</div>
      <div class="val">1,247</div>
      <div class="delta up">▲ 3.8% <span class="since">vs prior quarter</span></div>
    </div>
    <div class="panel kpi">
      <div class="lbl">Average Fee Margin</div>
      <div class="val">0.74%</div>
      <div class="delta down">▼ 0.03 pts <span class="since">vs prior quarter</span></div>
    </div>
  </section>

  <!-- Charts -->
  <section class="charts">
    <!-- Assets line / area -->
    <div class="panel">
      <div class="p-head">
        <div class="p-title">Assets &amp; Fee Income</div>
        <div class="p-sub">Trailing Twelve Months ◆ USD</div>
      </div>
      <svg viewBox="0 0 766 260" width="100%" height="236" preserveAspectRatio="none" style="display:block">
        <defs>
          <linearGradient id="champFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#F1E3B2" stop-opacity="0.30"/>
            <stop offset="100%" stop-color="#F1E3B2" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <!-- gridlines -->
        <g stroke="rgba(201,162,39,.12)" stroke-width="1">
          <line x1="0" y1="20" x2="766" y2="20"/>
          <line x1="0" y1="75" x2="766" y2="75"/>
          <line x1="0" y1="130" x2="766" y2="130"/>
          <line x1="0" y1="185" x2="766" y2="185"/>
          <line x1="0" y1="240" x2="766" y2="240"/>
        </g>
        <!-- champagne area under AUM -->
        <path d="M0,196 L64,188 L128,192 L191,172 L255,160 L319,166 L383,138 L447,128 L511,132 L574,104 L638,96 L702,78 L760,64 L760,240 L0,240 Z" fill="url(#champFade)"/>
        <!-- gold AUM line -->
        <path d="M0,196 L64,188 L128,192 L191,172 L255,160 L319,166 L383,138 L447,128 L511,132 L574,104 L638,96 L702,78 L760,64" fill="none" stroke="#D4AF37" stroke-width="2"/>
        <!-- emerald fee income line -->
        <path d="M0,224 L64,220 L128,222 L191,212 L255,206 L319,208 L383,196 L447,190 L511,192 L574,178 L638,172 L702,162 L760,154" fill="none" stroke="#1F6F54" stroke-width="2"/>
        <g fill="#D4AF37"><circle cx="574" cy="104" r="3.5"/><circle cx="702" cy="78" r="3.5"/><circle cx="760" cy="64" r="3.5"/></g>
        <g fill="#1F6F54"><circle cx="760" cy="154" r="3"/></g>
        <!-- x labels -->
        <g fill="#9C9077" font-family="Jost,sans-serif" font-size="10" letter-spacing="1.5" text-anchor="middle">
          <text x="24" y="257">OCT</text>
          <text x="191" y="257">JAN</text>
          <text x="383" y="257">APR</text>
          <text x="574" y="257">JUL</text>
          <text x="742" y="257">SEP</text>
        </g>
      </svg>
      <div class="legend">
        <span><i style="background:#D4AF37"></i>Total AUM</span>
        <span><i style="background:#1F6F54"></i>Fee Income</span>
      </div>
    </div>

    <!-- Allocation donut -->
    <div class="panel">
      <div class="p-head">
        <div class="p-title">Allocation</div>
        <div class="p-sub">By Asset Class</div>
      </div>
      <div class="donut-wrap">
        <svg viewBox="0 0 200 200" width="160" height="160">
          <!-- segments via stroke-dasharray, circumference ~ 502.4 (r=80) -->
          <g transform="translate(100,100)">
            <circle r="80" fill="none" stroke="rgba(201,162,39,.1)" stroke-width="26"/>
            <!-- Equities 42% -->
            <circle r="80" fill="none" stroke="#D4AF37" stroke-width="26" stroke-dasharray="211 291" transform="rotate(-90)"/>
            <!-- Fixed Income 26% -->
            <circle r="80" fill="none" stroke="#1F6F54" stroke-width="26" stroke-dasharray="130 372" stroke-dashoffset="-211" transform="rotate(-90)"/>
            <!-- Alternatives 19% -->
            <circle r="80" fill="none" stroke="#F1E3B2" stroke-width="26" stroke-dasharray="95 407" stroke-dashoffset="-341" transform="rotate(-90)"/>
            <!-- Cash & Bullion 13% -->
            <circle r="80" fill="none" stroke="#7A2E2B" stroke-width="26" stroke-dasharray="66 436" stroke-dashoffset="-436" transform="rotate(-90)"/>
            <circle r="58" fill="none" stroke="rgba(212,175,55,.5)" stroke-width="1"/>
            <circle r="53" fill="none" stroke="rgba(212,175,55,.2)" stroke-width="1"/>
          </g>
          <text x="100" y="97" text-anchor="middle" font-family="Cormorant Garamond,serif" font-size="25" font-weight="600" fill="#F1E3B2">$4.28B</text>
          <text x="100" y="115" text-anchor="middle" font-family="Jost,sans-serif" font-size="8" letter-spacing="2.5" fill="#9C9077">TOTAL AUM</text>
        </svg>
        <div class="dl">
          <div class="dl-row"><span class="dl-name"><i style="background:#D4AF37"></i>Equities</span><span class="dl-val">42%<span class="amt">$1.80B</span></span></div>
          <div class="dl-row"><span class="dl-name"><i style="background:#1F6F54"></i>Fixed Income</span><span class="dl-val">26%<span class="amt">$1.11B</span></span></div>
          <div class="dl-row"><span class="dl-name"><i style="background:#F1E3B2"></i>Alternatives</span><span class="dl-val">19%<span class="amt">$0.81B</span></span></div>
          <div class="dl-row"><span class="dl-name"><i style="background:#7A2E2B"></i>Cash &amp; Bullion</span><span class="dl-val">13%<span class="amt">$0.56B</span></span></div>
        </div>
      </div>
    </div>
  </section>

  <!-- Table -->
  <section class="panel">
    <div class="p-head">
      <div class="p-title">Leading Client Segments</div>
      <div class="p-sub">Ranked by Assets ◆ FY 2024</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Segment</th>
          <th>Booking Centre</th>
          <th class="num">Clients</th>
          <th class="num">Assets</th>
          <th class="num">Fee Margin</th>
          <th class="num">YoY Δ</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="seg">Family Offices</td><td class="dim">Geneva</td><td class="num">214</td><td class="num">$1.42B</td><td class="num">0.62%</td><td class="num pos">+9.4%</td></tr>
        <tr><td class="seg">Entrepreneurs &amp; Founders</td><td class="dim">New York</td><td class="num">386</td><td class="num">$986M</td><td class="num">0.81%</td><td class="num pos">+12.1%</td></tr>
        <tr><td class="seg">Multi-Generational Trusts</td><td class="dim">London</td><td class="num">158</td><td class="num">$742M</td><td class="num">0.58%</td><td class="num pos">+4.6%</td></tr>
        <tr><td class="seg">Executives &amp; Partners</td><td class="dim">Singapore</td><td class="num">341</td><td class="num">$618M</td><td class="num">0.77%</td><td class="num neg">−1.8%</td></tr>
        <tr><td class="seg">Cultural &amp; Estate Holdings</td><td class="dim">Paris</td><td class="num">96</td><td class="num">$402M</td><td class="num">0.66%</td><td class="num pos">+3.2%</td></tr>
      </tbody>
    </table>
  </section>
</div>
</body>
</html>
```
