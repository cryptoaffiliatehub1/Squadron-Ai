---
name: marble-atelier
description: >-
  This "Marble Atelier" dashboard reads like a luxury fashion-house annual report on pale marble #F7F5F2 crossed by faint stone veining — an inline-SVG feTurbulence (fractalNoise, low frequency) overlay rendering soft gray veins at roughly 10–12% opacity — with pure-white panels floating on very soft shadows (0 10px 30px rgba(38,36,31,.06)), each crowned by a 1px gold top rule (#B08D3E) and divided by hairlines in #E5E1DA. Text is charcoal #26241F with muted taupe #A29B8C for captions; gold #B08D3E appears only in hairlines, small-caps eyebrows, and chart highlights, while negatives sit in muted oxblood #9A4A3C. Headlines and the big serif KPI numerals use Cormorant Garamond 500/600, and letterspaced uppercase labels and body copy use Montserrat 400/500. The layout is a fixed 1440×900 grid: an understated header with brand and filter-style controls, a 4-KPI row, a 2/3 + 1/3 chart split, and a full-width table with generous row height, hairline rules, and small-caps headers. Charts are hand-drawn inline SVG in the quietest register — an ultra-thin 1.5px charcoal line with a gold second series over whisper-faint gridlines and minimal markers, plus a donut holding one gold segment among charcoal and taupe with a serif total at center. The overall aesthetic is polished atelier minimalism: marble, ivory, and a restrained thread of gold — couture figures presented with runway poise.
---

# Marble Atelier

This "Marble Atelier" dashboard reads like a luxury fashion-house annual report on pale marble #F7F5F2 crossed by faint stone veining — an inline-SVG feTurbulence (fractalNoise, low frequency) overlay rendering soft gray veins at roughly 10–12% opacity — with pure-white panels floating on very soft shadows (0 10px 30px rgba(38,36,31,.06)), each crowned by a 1px gold top rule (#B08D3E) and divided by hairlines in #E5E1DA. Text is charcoal #26241F with muted taupe #A29B8C for captions; gold #B08D3E appears only in hairlines, small-caps eyebrows, and chart highlights, while negatives sit in muted oxblood #9A4A3C. Headlines and the big serif KPI numerals use Cormorant Garamond 500/600, and letterspaced uppercase labels and body copy use Montserrat 400/500. The layout is a fixed 1440×900 grid: an understated header with brand and filter-style controls, a 4-KPI row, a 2/3 + 1/3 chart split, and a full-width table with generous row height, hairline rules, and small-caps headers. Charts are hand-drawn inline SVG in the quietest register — an ultra-thin 1.5px charcoal line with a gold second series over whisper-faint gridlines and minimal markers, plus a donut holding one gold segment among charcoal and taupe with a serif total at center. The overall aesthetic is polished atelier minimalism: marble, ivory, and a restrained thread of gold — couture figures presented with runway poise.

## Source Code

A self-contained reference implementation of the "Marble Atelier" dashboard
preview. Use it as the visual target — translate the palette, typography, and
layout into the data-visualization React + Tailwind + Recharts app.
The fixed 1440×900 frame and hand-drawn inline-SVG charts below are
preview-rendering artifacts — keep the generated app's layout responsive
and build every chart with Recharts.

Responsive adaptation: This marble-atelier dashboard should feel like a couture editorial at every width: cap content at ~1440–1760px with generous marble margins on ultra-wide screens (ensure the vein SVG tiles or slices rather than stretches), collapse the 4-up KPI row to 2-up at ~1024px and 1-up at ~480px, and stack the 2fr/1fr chart split to a single column below 900px with the donut ring shrinking fluidly via clamp(). Panels should keep their gold top-rule and drop-shadow but adopt fluid padding (clamp) so phone views don't crowd; the transactions table must horizontally scroll inside its panel with a visible fade/shadow affordance, and header controls should form a 2-column grid on phones rather than stretching into oversized bars.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1440, initial-scale=1">
<title>Maison Aureline — Annual Report</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root{
    --marble:#F7F5F2; --panel:#FFFFFF;
    --charcoal:#26241F; --taupe:#A29B8C; --gold:#B08D3E; --oxblood:#9A4A3C;
    --hair:#E5E1DA; --edge:#ECE8E1; --stone:#D8D2C7; --grid:#EFECE6;
    --serif:'Cormorant Garamond',Georgia,'Times New Roman',serif;
    --sans:'Montserrat','Segoe UI',Helvetica,Arial,sans-serif;
  }
  *{box-sizing:border-box}
  html,body{margin:0}
  body{
    width:1440px;height:900px;overflow:hidden;
    position:relative;font-family:var(--sans);color:var(--charcoal);
    background:var(--marble);
  }
  .veins{position:absolute;inset:0;z-index:0}
  .page{position:relative;z-index:1;height:900px;padding:24px 36px;display:flex;flex-direction:column}

  /* Header */
  header{display:flex;justify-content:space-between;align-items:flex-end;
    padding-bottom:14px;border-bottom:1px solid var(--hair);margin-bottom:18px}
  .eyebrow{font-size:9px;letter-spacing:.28em;text-transform:uppercase;color:var(--gold);font-weight:500;margin-bottom:7px}
  .title{font-family:var(--serif);font-weight:600;font-size:36px;line-height:1;margin:0;letter-spacing:.01em}
  .controls{display:flex;gap:12px}
  .ctrl{background:var(--panel);border:1px solid var(--edge);border-top:1px solid var(--gold);
    padding:8px 16px;min-width:150px;box-shadow:0 10px 30px rgba(38,36,31,.06)}
  .ctrl .lbl{font-size:8px;letter-spacing:.24em;text-transform:uppercase;color:var(--gold);font-weight:500}
  .ctrl .val{font-size:12px;font-weight:500;margin-top:3px;display:flex;justify-content:space-between;align-items:center;gap:10px}
  .chev{color:var(--taupe);font-size:9px}

  /* Panels */
  .panel{background:var(--panel);border:1px solid var(--edge);border-top:1px solid var(--gold);
    box-shadow:0 10px 30px rgba(38,36,31,.06);padding:16px 22px}
  .p-head{display:flex;justify-content:space-between;align-items:baseline;
    border-bottom:1px solid var(--hair);padding-bottom:8px;margin-bottom:12px}
  .p-title{font-family:var(--serif);font-size:20px;font-weight:600}
  .p-sub{font-size:8.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--taupe);font-weight:500}

  /* KPI row */
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-bottom:18px}
  .kpi .lbl{font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--taupe);font-weight:500}
  .kpi .val{font-family:var(--serif);font-size:32px;font-weight:600;margin:7px 0 4px;line-height:1}
  .delta{font-size:10.5px;font-weight:500}
  .delta .since{color:var(--taupe);font-weight:400;margin-left:5px}
  .up{color:var(--charcoal)}.down{color:var(--oxblood)}

  /* Charts */
  .charts{display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:18px}
  .legend{display:flex;gap:20px;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--taupe);font-weight:500;margin-top:10px}
  .legend i{display:inline-block;width:16px;height:2px;margin-right:7px;vertical-align:middle}
  .donut-wrap{display:flex;flex-direction:column;align-items:center}
  .dl{width:100%;margin-top:10px}
  .dl-row{display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:6px 0;border-bottom:1px solid var(--hair)}
  .dl-row:last-child{border-bottom:none}
  .dl-name{display:flex;align-items:center;gap:9px}
  .dl-name i{width:8px;height:8px;border-radius:50%;display:inline-block}
  .dl-val{font-family:var(--serif);font-size:14px;font-weight:600}
  .dl-val .amt{font-family:var(--sans);font-size:10px;color:var(--taupe);font-weight:400;margin-left:6px}

  /* Table */
  table{width:100%;border-collapse:collapse;font-size:12.5px}
  thead th{text-align:left;font-size:8.5px;letter-spacing:.24em;text-transform:uppercase;
    color:var(--taupe);font-weight:500;padding:4px 0 9px;border-bottom:1px solid var(--hair)}
  tbody td{padding:11px 0;border-bottom:1px solid var(--hair)}
  tbody tr:last-child td{border-bottom:none}
  td.name{font-family:var(--serif);font-size:15px;font-weight:600}
  td.dim{color:var(--taupe)}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  td.pos{color:var(--charcoal);font-weight:600}
  td.neg{color:var(--oxblood);font-weight:600}
</style>
</head>
<body>
<!-- Marble veining overlay -->
<svg class="veins" width="1440" height="900" aria-hidden="true">
  <filter id="vein"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.009" numOctaves="4" seed="7" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
  <filter id="mist"><feTurbulence type="fractalNoise" baseFrequency="0.018 0.03" numOctaves="3" seed="12" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
  <rect width="1440" height="900" filter="url(#vein)" opacity="0.12"/>
  <rect width="1440" height="900" filter="url(#mist)" opacity="0.06"/>
</svg>
<div class="page">

  <!-- Header -->
  <header>
    <div>
      <div class="eyebrow">Annual Report · Fiscal 2025</div>
      <h1 class="title">Maison Aureline</h1>
    </div>
    <div class="controls">
      <div class="ctrl"><div class="lbl">Season</div><div class="val">Autumn–Winter 2025 <span class="chev">▾</span></div></div>
      <div class="ctrl"><div class="lbl">Region</div><div class="val">Worldwide <span class="chev">▾</span></div></div>
      <div class="ctrl"><div class="lbl">Currency</div><div class="val">EUR (€) <span class="chev">▾</span></div></div>
    </div>
  </header>

  <!-- KPIs -->
  <section class="kpis">
    <div class="panel kpi">
      <div class="lbl">Collection Revenue</div>
      <div class="val">€182.4M</div>
      <div class="delta up">▲ 11.2% <span class="since">vs FY 2024</span></div>
    </div>
    <div class="panel kpi">
      <div class="lbl">Flagship Retail</div>
      <div class="val">€64.2M</div>
      <div class="delta up">▲ 6.8% <span class="since">vs FY 2024</span></div>
    </div>
    <div class="panel kpi">
      <div class="lbl">Sell-Through Rate</div>
      <div class="val">78.6%</div>
      <div class="delta up">▲ 3.4 pts <span class="since">vs FY 2024</span></div>
    </div>
    <div class="panel kpi">
      <div class="lbl">Wholesale Orders</div>
      <div class="val">€21.8M</div>
      <div class="delta down">▼ 4.1% <span class="since">vs FY 2024</span></div>
    </div>
  </section>

  <!-- Charts -->
  <section class="charts">
    <!-- Revenue line -->
    <div class="panel">
      <div class="p-head">
        <div class="p-title">Revenue by Month</div>
        <div class="p-sub">Fiscal 2025 vs Fiscal 2024 · EUR M</div>
      </div>
      <svg viewBox="0 0 766 260" width="100%" height="220" preserveAspectRatio="none" style="display:block">
        <!-- whisper gridlines -->
        <g stroke="#EFECE6" stroke-width="1">
          <line x1="0" y1="20" x2="766" y2="20"/>
          <line x1="0" y1="75" x2="766" y2="75"/>
          <line x1="0" y1="130" x2="766" y2="130"/>
          <line x1="0" y1="185" x2="766" y2="185"/>
          <line x1="0" y1="240" x2="766" y2="240"/>
        </g>
        <!-- faint charcoal area -->
        <path d="M0,206 L69,198 L138,202 L207,182 L276,172 L345,176 L414,150 L483,142 L552,146 L621,116 L690,108 L760,88 L760,240 L0,240 Z" fill="rgba(38,36,31,.04)"/>
        <!-- fiscal 2025 charcoal line -->
        <path d="M0,206 L69,198 L138,202 L207,182 L276,172 L345,176 L414,150 L483,142 L552,146 L621,116 L690,108 L760,88" fill="none" stroke="#26241F" stroke-width="1.5"/>
        <!-- fiscal 2024 gold line -->
        <path d="M0,222 L69,216 L138,218 L207,204 L276,198 L345,200 L414,184 L483,178 L552,180 L621,162 L690,158 L760,146" fill="none" stroke="#B08D3E" stroke-width="1.5"/>
        <g fill="#26241F"><circle cx="760" cy="88" r="2.5"/></g>
        <g fill="#B08D3E"><circle cx="760" cy="146" r="2.5"/></g>
        <!-- x labels -->
        <g fill="#A29B8C" font-family="Montserrat,sans-serif" font-size="9" letter-spacing="1.5" text-anchor="middle">
          <text x="22" y="257">OCT</text>
          <text x="207" y="257">JAN</text>
          <text x="414" y="257">APR</text>
          <text x="621" y="257">JUL</text>
          <text x="742" y="257">SEP</text>
        </g>
      </svg>
      <div class="legend">
        <span><i style="background:#26241F"></i>Fiscal 2025</span>
        <span><i style="background:#B08D3E"></i>Fiscal 2024</span>
      </div>
    </div>

    <!-- Category donut -->
    <div class="panel">
      <div class="p-head">
        <div class="p-title">Category Mix</div>
        <div class="p-sub">Share of Revenue</div>
      </div>
      <div class="donut-wrap">
        <svg viewBox="0 0 200 200" width="156" height="156">
          <!-- segments via stroke-dasharray, circumference ~ 502.4 (r=80) -->
          <g transform="translate(100,100)">
            <circle r="80" fill="none" stroke="#F0EDE8" stroke-width="24"/>
            <!-- Ready-to-Wear 38% -->
            <circle r="80" fill="none" stroke="#B08D3E" stroke-width="24" stroke-dasharray="191 311" transform="rotate(-90)"/>
            <!-- Leather Goods 27% -->
            <circle r="80" fill="none" stroke="#26241F" stroke-width="24" stroke-dasharray="135 367" stroke-dashoffset="-191" transform="rotate(-90)"/>
            <!-- Accessories 21% -->
            <circle r="80" fill="none" stroke="#A29B8C" stroke-width="24" stroke-dasharray="105 397" stroke-dashoffset="-326" transform="rotate(-90)"/>
            <!-- Fragrance & Beauty 14% -->
            <circle r="80" fill="none" stroke="#D8D2C7" stroke-width="24" stroke-dasharray="71 431" stroke-dashoffset="-431" transform="rotate(-90)"/>
          </g>
          <text x="100" y="97" text-anchor="middle" font-family="Cormorant Garamond,serif" font-size="24" font-weight="600" fill="#26241F">€182.4M</text>
          <text x="100" y="114" text-anchor="middle" font-family="Montserrat,sans-serif" font-size="7.5" letter-spacing="2" fill="#A29B8C">FY 2025 REVENUE</text>
        </svg>
        <div class="dl">
          <div class="dl-row"><span class="dl-name"><i style="background:#B08D3E"></i>Ready-to-Wear</span><span class="dl-val">38%<span class="amt">€69.3M</span></span></div>
          <div class="dl-row"><span class="dl-name"><i style="background:#26241F"></i>Leather Goods</span><span class="dl-val">27%<span class="amt">€49.2M</span></span></div>
          <div class="dl-row"><span class="dl-name"><i style="background:#A29B8C"></i>Accessories</span><span class="dl-val">21%<span class="amt">€38.3M</span></span></div>
          <div class="dl-row"><span class="dl-name"><i style="background:#D8D2C7"></i>Fragrance &amp; Beauty</span><span class="dl-val">14%<span class="amt">€25.6M</span></span></div>
        </div>
      </div>
    </div>
  </section>

  <!-- Table -->
  <section class="panel">
    <div class="p-head">
      <div class="p-title">Leading Boutiques</div>
      <div class="p-sub">By Revenue · Fiscal 2025</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Boutique</th>
          <th>City</th>
          <th>Collection Focus</th>
          <th class="num">Revenue</th>
          <th class="num">Sell-Through</th>
          <th class="num">YoY Δ</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="name">Avenue Montaigne</td><td class="dim">Paris</td><td class="dim">Ready-to-Wear</td><td class="num">€18.6M</td><td class="num">84.2%</td><td class="num pos">+14.6%</td></tr>
        <tr><td class="name">Via Montenapoleone</td><td class="dim">Milan</td><td class="dim">Leather Goods</td><td class="num">€15.1M</td><td class="num">81.7%</td><td class="num pos">+9.3%</td></tr>
        <tr><td class="name">Madison Avenue</td><td class="dim">New York</td><td class="dim">Ready-to-Wear</td><td class="num">€13.8M</td><td class="num">79.4%</td><td class="num pos">+6.1%</td></tr>
        <tr><td class="name">Ginza Namiki</td><td class="dim">Tokyo</td><td class="dim">Accessories</td><td class="num">€12.2M</td><td class="num">76.8%</td><td class="num neg">−2.4%</td></tr>
        <tr><td class="name">Canton Road</td><td class="dim">Hong Kong</td><td class="dim">Leather Goods</td><td class="num">€9.7M</td><td class="num">72.3%</td><td class="num pos">+3.8%</td></tr>
      </tbody>
    </table>
  </section>
</div>
</body>
</html>
```
