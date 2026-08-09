---
name: vinyl-lounge
description: >-
  This "Vinyl Lounge" dashboard channels a Blue Note jazz-club record label on deep midnight #0E1A2B dusted with subtle film grain (an inline-SVG feTurbulence overlay at very low opacity), with panels in #14243A framed by 1px rgba(200,155,60,.28) borders. The palette is warm and analog — brass #C89B3C, cream #F2E8D5, coral-orange #E2703A for negatives, and muted sky #7FA8C9 as the supporting series — with cream text and muted #7E93A8 labels. Big condensed display, the title and KPI values, is set in Bebas Neue while body and labels use Work Sans 400/500, and a record-label sticker chip tilted −3° sits in the header beside the brand. The layout is a fixed 1440×900 grid: a header with filter-style controls, a 4-KPI row with EQ-style rounded-cap bar sparklines, a 2/3 + 1/3 chart split, and a full-width tracklist table with numbered rows and brass deltas. Charts are hand-drawn inline SVG — smooth bezier soundwave lines (brass 2.5px main, sky 2px secondary) over a soft brass area fill, and the donut is drawn as a vinyl record: dark disc, thin concentric groove rings, colored label-ring segments, and a small center hole. The overall aesthetic is smoky late-night lounge: brass on midnight blue, condensed uppercase type, and analog warmth, like a jazz label's royalty statement pinned up in the listening room.
---

# Vinyl Lounge

This "Vinyl Lounge" dashboard channels a Blue Note jazz-club record label on deep midnight #0E1A2B dusted with subtle film grain (an inline-SVG feTurbulence overlay at very low opacity), with panels in #14243A framed by 1px rgba(200,155,60,.28) borders. The palette is warm and analog — brass #C89B3C, cream #F2E8D5, coral-orange #E2703A for negatives, and muted sky #7FA8C9 as the supporting series — with cream text and muted #7E93A8 labels. Big condensed display, the title and KPI values, is set in Bebas Neue while body and labels use Work Sans 400/500, and a record-label sticker chip tilted −3° sits in the header beside the brand. The layout is a fixed 1440×900 grid: a header with filter-style controls, a 4-KPI row with EQ-style rounded-cap bar sparklines, a 2/3 + 1/3 chart split, and a full-width tracklist table with numbered rows and brass deltas. Charts are hand-drawn inline SVG — smooth bezier soundwave lines (brass 2.5px main, sky 2px secondary) over a soft brass area fill, and the donut is drawn as a vinyl record: dark disc, thin concentric groove rings, colored label-ring segments, and a small center hole. The overall aesthetic is smoky late-night lounge: brass on midnight blue, condensed uppercase type, and analog warmth, like a jazz label's royalty statement pinned up in the listening room.

## Source Code

A self-contained reference implementation of the "Vinyl Lounge" dashboard
preview. Use it as the visual target — translate the palette, typography, and
layout into the data-visualization React + Tailwind + Recharts app.
The fixed 1440×900 frame and hand-drawn inline-SVG charts below are
preview-rendering artifacts — keep the generated app's layout responsive
and build every chart with Recharts.

Responsive adaptation: This vinyl-lounge dashboard should feel like a curated record sleeve at every size: on ultra-wide (≥1600px) allow the page to expand to ~1720px with larger gaps and slightly taller chart-areas, keeping the sticker and brass hairlines proportional via clamp(). At tablet (~1024px) collapse charts to a single column and KPIs to 2×2, letting the donut ring scale up to fill its now-wider panel. On phones (≤480px) stack KPIs vertically, shrink the record-sticker seal fluidly, convert the tracklist into a 3-column condensed row (rank/title/metric) without horizontal scroll, and ensure all decorative SVGs (grain, waveform) use uniform preserveAspectRatio so the aesthetic never distorts.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1440, initial-scale=1">
<title>Blue Lantern Records — Label Analytics</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Work+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#0E1A2B; --panel:#14243A;
    --brass:#C89B3C; --cream:#F2E8D5; --coral:#E2703A; --sky:#7FA8C9;
    --muted:#7E93A8; --line:rgba(200,155,60,.28); --hair:rgba(242,232,213,.07);
    --disp:'Bebas Neue','Arial Narrow',sans-serif;
    --sans:'Work Sans','Segoe UI',Helvetica,Arial,sans-serif;
  }
  *{box-sizing:border-box}
  html,body{margin:0}
  body{
    width:1440px;height:900px;overflow:hidden;
    position:relative;font-family:var(--sans);color:var(--cream);
    background:radial-gradient(1100px 620px at 50% -10%, rgba(127,168,201,.08), transparent 60%), var(--bg);
  }
  .grain{position:absolute;inset:0;z-index:60;pointer-events:none}
  .page{height:900px;padding:24px 30px;display:flex;flex-direction:column}

  /* Header */
  header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
  .brand{display:flex;align-items:center;gap:18px}
  .sticker{width:72px;height:72px;border-radius:50%;background:var(--brass);color:#14243A;
    transform:rotate(-3deg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
    font-size:8px;font-weight:600;letter-spacing:.18em;
    box-shadow:inset 0 0 0 2px rgba(20,36,58,.35),inset 0 0 0 9px rgba(20,36,58,.12),0 6px 16px rgba(0,0,0,.35)}
  .sticker .hole{width:7px;height:7px;border-radius:50%;background:var(--bg);border:1px solid rgba(20,36,58,.5)}
  .brand h1{font-family:var(--disp);font-size:34px;font-weight:400;letter-spacing:.04em;margin:0;line-height:1}
  .brand p{margin:4px 0 0;font-size:11px;color:var(--muted)}
  .controls{display:flex;gap:10px}
  .ctl{background:var(--panel);border:1px solid var(--line);padding:9px 16px;font-size:11px;
    letter-spacing:.14em;text-transform:uppercase;display:flex;align-items:center;gap:8px}
  .chev{color:var(--muted);font-size:9px}
  .dot{width:8px;height:8px;border-radius:50%;background:var(--coral);box-shadow:0 0 8px rgba(226,112,58,.7)}

  /* Panels */
  .panel{background:var(--panel);border:1px solid var(--line);padding:16px 20px}
  .p-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px}
  .p-title{font-family:var(--disp);font-size:20px;letter-spacing:.06em}
  .p-sub{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}

  /* KPI row */
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:16px}
  .kpi .lbl{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
  .kpi .val{font-family:var(--disp);font-size:36px;line-height:1;margin:8px 0 5px}
  .delta{font-size:11px;font-weight:600}
  .delta .since{color:var(--muted);font-weight:400;margin-left:5px}
  .up{color:var(--brass)}.down{color:var(--coral)}
  .eq{display:block;margin-top:10px}

  /* Charts */
  .charts{display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:16px}
  .legend{display:flex;gap:18px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-top:8px}
  .legend i{display:inline-block;width:16px;height:2px;margin-right:7px;vertical-align:middle}
  .donut-wrap{display:flex;flex-direction:column;align-items:center}
  .dl{width:100%;margin-top:8px}
  .dl-row{display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:5px 0;border-bottom:1px solid var(--hair)}
  .dl-row:last-child{border-bottom:none}
  .dl-name{display:flex;align-items:center;gap:8px}
  .dl-name i{width:8px;height:8px;border-radius:50%;display:inline-block}
  .dl-val{font-family:var(--disp);font-size:15px;letter-spacing:.04em;color:var(--cream)}
  .dl-val .amt{font-family:var(--sans);font-size:10px;color:var(--muted);margin-left:6px}

  /* Tracklist table */
  table{width:100%;border-collapse:collapse;font-size:12.5px}
  thead th{text-align:left;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);
    font-weight:500;padding:4px 0 8px;border-bottom:1px solid rgba(200,155,60,.35)}
  tbody td{padding:7px 0;border-bottom:1px solid var(--hair)}
  tbody tr:last-child td{border-bottom:none}
  td.no{font-family:var(--disp);font-size:17px;color:var(--brass);width:44px;letter-spacing:.05em}
  td.track{font-weight:500}
  td.dim{color:var(--muted)}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  td.pos{color:var(--brass);font-weight:600}
  td.neg{color:var(--coral);font-weight:600}
</style>
</head>
<body>
<!-- Film grain overlay -->
<svg class="grain" width="1440" height="900" aria-hidden="true">
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
  <rect width="1440" height="900" filter="url(#grain)" opacity="0.05"/>
</svg>
<div class="page">

  <!-- Header -->
  <header>
    <div class="brand">
      <div class="sticker"><span>SIDE A</span><span class="hole"></span><span>33 RPM</span></div>
      <div>
        <h1>BLUE LANTERN RECORDS</h1>
        <p>Label intelligence · Royalties &amp; streaming desk</p>
      </div>
    </div>
    <div class="controls">
      <div class="ctl">This Week <span class="chev">▾</span></div>
      <div class="ctl">Full Catalog <span class="chev">▾</span></div>
      <div class="ctl"><span class="dot"></span>On Air</div>
    </div>
  </header>

  <!-- KPIs -->
  <section class="kpis">
    <div class="panel kpi">
      <div class="lbl">Total Streams</div>
      <div class="val">48.2M</div>
      <div class="delta up">▲ 9.6% <span class="since">wk over wk</span></div>
      <svg class="eq" width="104" height="26" viewBox="0 0 104 26">
        <g fill="#C89B3C">
          <rect x="0" y="16" width="7" height="10" rx="3.5"/><rect x="13" y="10" width="7" height="16" rx="3.5"/>
          <rect x="26" y="18" width="7" height="8" rx="3.5"/><rect x="39" y="6" width="7" height="20" rx="3.5"/>
          <rect x="52" y="13" width="7" height="13" rx="3.5"/><rect x="65" y="2" width="7" height="24" rx="3.5"/>
          <rect x="78" y="9" width="7" height="17" rx="3.5"/><rect x="91" y="4" width="7" height="22" rx="3.5"/>
        </g>
      </svg>
    </div>
    <div class="panel kpi">
      <div class="lbl">Monthly Listeners</div>
      <div class="val">6.41M</div>
      <div class="delta up">▲ 4.2% <span class="since">wk over wk</span></div>
      <svg class="eq" width="104" height="26" viewBox="0 0 104 26">
        <g fill="#7FA8C9">
          <rect x="0" y="18" width="7" height="8" rx="3.5"/><rect x="13" y="14" width="7" height="12" rx="3.5"/>
          <rect x="26" y="10" width="7" height="16" rx="3.5"/><rect x="39" y="15" width="7" height="11" rx="3.5"/>
          <rect x="52" y="8" width="7" height="18" rx="3.5"/><rect x="65" y="12" width="7" height="14" rx="3.5"/>
          <rect x="78" y="4" width="7" height="22" rx="3.5"/><rect x="91" y="7" width="7" height="19" rx="3.5"/>
        </g>
      </svg>
    </div>
    <div class="panel kpi">
      <div class="lbl">Royalties Accrued</div>
      <div class="val">$912K</div>
      <div class="delta up">▲ 7.8% <span class="since">wk over wk</span></div>
      <svg class="eq" width="104" height="26" viewBox="0 0 104 26">
        <g fill="#C89B3C">
          <rect x="0" y="14" width="7" height="12" rx="3.5"/><rect x="13" y="17" width="7" height="9" rx="3.5"/>
          <rect x="26" y="11" width="7" height="15" rx="3.5"/><rect x="39" y="7" width="7" height="19" rx="3.5"/>
          <rect x="52" y="13" width="7" height="13" rx="3.5"/><rect x="65" y="4" width="7" height="22" rx="3.5"/>
          <rect x="78" y="10" width="7" height="16" rx="3.5"/><rect x="91" y="2" width="7" height="24" rx="3.5"/>
        </g>
      </svg>
    </div>
    <div class="panel kpi">
      <div class="lbl">Catalog Sell-Through</div>
      <div class="val">64.8%</div>
      <div class="delta down">▼ 2.3% <span class="since">wk over wk</span></div>
      <svg class="eq" width="104" height="26" viewBox="0 0 104 26">
        <g fill="#E2703A">
          <rect x="0" y="8" width="7" height="18" rx="3.5"/><rect x="13" y="4" width="7" height="22" rx="3.5"/>
          <rect x="26" y="11" width="7" height="15" rx="3.5"/><rect x="39" y="7" width="7" height="19" rx="3.5"/>
          <rect x="52" y="14" width="7" height="12" rx="3.5"/><rect x="65" y="10" width="7" height="16" rx="3.5"/>
          <rect x="78" y="17" width="7" height="9" rx="3.5"/><rect x="91" y="13" width="7" height="13" rx="3.5"/>
        </g>
      </svg>
    </div>
  </section>

  <!-- Charts -->
  <section class="charts">
    <!-- Soundwave line / area -->
    <div class="panel">
      <div class="p-head">
        <div class="p-title">WEEKLY SOUNDWAVE</div>
        <div class="p-sub">Streams vs unique listeners · 12 weeks</div>
      </div>
      <svg viewBox="0 0 766 260" width="100%" height="228" preserveAspectRatio="none" style="display:block">
        <defs>
          <linearGradient id="brassFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#C89B3C" stop-opacity="0.28"/>
            <stop offset="100%" stop-color="#C89B3C" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <!-- gridlines -->
        <g stroke="rgba(242,232,213,.06)" stroke-width="1">
          <line x1="0" y1="20" x2="766" y2="20"/>
          <line x1="0" y1="75" x2="766" y2="75"/>
          <line x1="0" y1="130" x2="766" y2="130"/>
          <line x1="0" y1="185" x2="766" y2="185"/>
          <line x1="0" y1="240" x2="766" y2="240"/>
        </g>
        <!-- brass area -->
        <path d="M0,204 C48,196 76,152 118,156 C160,160 186,218 228,212 C270,206 296,128 338,124 C380,120 406,186 448,178 C490,170 516,88 558,92 C600,96 626,152 668,140 C710,128 736,80 760,76 L760,240 L0,240 Z" fill="url(#brassFade)"/>
        <!-- streams soundwave -->
        <path d="M0,204 C48,196 76,152 118,156 C160,160 186,218 228,212 C270,206 296,128 338,124 C380,120 406,186 448,178 C490,170 516,88 558,92 C600,96 626,152 668,140 C710,128 736,80 760,76" fill="none" stroke="#C89B3C" stroke-width="2.5"/>
        <!-- listeners soundwave -->
        <path d="M0,232 C48,228 84,204 126,208 C168,212 194,240 236,234 C278,228 304,178 346,180 C388,182 414,222 456,214 C498,206 524,150 566,154 C608,158 634,190 676,182 C718,174 740,150 760,146" fill="none" stroke="#7FA8C9" stroke-width="2"/>
        <g fill="#C89B3C"><circle cx="760" cy="76" r="4"/></g>
        <g fill="#7FA8C9"><circle cx="760" cy="146" r="3.5"/></g>
        <!-- x labels -->
        <g fill="#7E93A8" font-family="Work Sans,sans-serif" font-size="10" text-anchor="middle">
          <text x="22" y="257">W14</text>
          <text x="143" y="257">W16</text>
          <text x="266" y="257">W18</text>
          <text x="389" y="257">W20</text>
          <text x="512" y="257">W22</text>
          <text x="635" y="257">W24</text>
          <text x="744" y="257">W26</text>
        </g>
      </svg>
      <div class="legend">
        <span><i style="background:#C89B3C"></i>Streams</span>
        <span><i style="background:#7FA8C9"></i>Unique Listeners</span>
      </div>
    </div>

    <!-- Vinyl record donut -->
    <div class="panel">
      <div class="p-head">
        <div class="p-title">REVENUE MIX</div>
        <div class="p-sub">By channel · QTD</div>
      </div>
      <div class="donut-wrap">
        <svg viewBox="0 0 224 224" width="168" height="168">
          <!-- record disc + grooves -->
          <circle cx="112" cy="112" r="106" fill="#0B1626" stroke="rgba(242,232,213,.1)"/>
          <g fill="none" stroke="rgba(242,232,213,.05)" stroke-width="1">
            <circle cx="112" cy="112" r="101"/><circle cx="112" cy="112" r="96"/><circle cx="112" cy="112" r="91"/>
          </g>
          <circle cx="112" cy="112" r="70" fill="#16273F" stroke="rgba(200,155,60,.3)"/>
          <!-- label-ring segments via stroke-dasharray, circumference ~ 502.4 (r=80) -->
          <g transform="translate(112,112)" fill="none" stroke-width="18">
            <!-- Streaming 44% -->
            <circle r="80" stroke="#C89B3C" stroke-dasharray="221 281" transform="rotate(-90)"/>
            <!-- Vinyl & Physical 24% -->
            <circle r="80" stroke="#E2703A" stroke-dasharray="121 381" stroke-dashoffset="-221" transform="rotate(-90)"/>
            <!-- Radio & Public Play 18% -->
            <circle r="80" stroke="#7FA8C9" stroke-dasharray="90 412" stroke-dashoffset="-342" transform="rotate(-90)"/>
            <!-- Sync Licensing 14% -->
            <circle r="80" stroke="#F2E8D5" stroke-dasharray="70 432" stroke-dashoffset="-432" transform="rotate(-90)"/>
          </g>
          <text x="112" y="106" text-anchor="middle" font-family="Bebas Neue,sans-serif" font-size="24" fill="#F2E8D5">$4.50M</text>
          <circle cx="112" cy="119" r="4.5" fill="#0E1A2B" stroke="rgba(200,155,60,.55)"/>
          <text x="112" y="141" text-anchor="middle" font-family="Work Sans,sans-serif" font-size="7.5" letter-spacing="1.5" fill="#7E93A8">REVENUE · QTR</text>
        </svg>
        <div class="dl">
          <div class="dl-row"><span class="dl-name"><i style="background:#C89B3C"></i>Streaming</span><span class="dl-val">44%<span class="amt">$1.98M</span></span></div>
          <div class="dl-row"><span class="dl-name"><i style="background:#E2703A"></i>Vinyl &amp; Physical</span><span class="dl-val">24%<span class="amt">$1.08M</span></span></div>
          <div class="dl-row"><span class="dl-name"><i style="background:#7FA8C9"></i>Radio &amp; Public Play</span><span class="dl-val">18%<span class="amt">$0.81M</span></span></div>
          <div class="dl-row"><span class="dl-name"><i style="background:#F2E8D5"></i>Sync Licensing</span><span class="dl-val">14%<span class="amt">$0.63M</span></span></div>
        </div>
      </div>
    </div>
  </section>

  <!-- Tracklist -->
  <section class="panel">
    <div class="p-head">
      <div class="p-title">TOP RECORDS</div>
      <div class="p-sub">Setlist · Week 26</div>
    </div>
    <table>
      <thead>
        <tr>
          <th></th>
          <th>Record</th>
          <th>Artist</th>
          <th>Genre</th>
          <th class="num">Streams</th>
          <th class="num">Royalties</th>
          <th class="num">Wk Δ</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="no">01</td><td class="track">Midnight Corridor</td><td class="dim">The Ellington Circuit</td><td class="dim">Hard Bop</td><td class="num">4,218,400</td><td class="num">$18,940</td><td class="num pos">+12.4%</td></tr>
        <tr><td class="no">02</td><td class="track">Blue Smoke</td><td class="dim">Marlowe Quintet</td><td class="dim">Modal</td><td class="num">3,904,210</td><td class="num">$17,530</td><td class="num pos">+8.9%</td></tr>
        <tr><td class="no">03</td><td class="track">Velvet Turnaround</td><td class="dim">Ada Fontaine</td><td class="dim">Vocal Jazz</td><td class="num">3,318,077</td><td class="num">$14,900</td><td class="num neg">−1.6%</td></tr>
        <tr><td class="no">04</td><td class="track">Uptown Umbrella</td><td class="dim">The Half-Step Trio</td><td class="dim">Soul Jazz</td><td class="num">2,846,912</td><td class="num">$12,780</td><td class="num pos">+5.2%</td></tr>
        <tr><td class="no">05</td><td class="track">Night Ferry</td><td class="dim">Simone Okafor</td><td class="dim">Ballad</td><td class="num">2,203,558</td><td class="num">$9,890</td><td class="num neg">−3.4%</td></tr>
      </tbody>
    </table>
  </section>
</div>
</body>
</html>
```
