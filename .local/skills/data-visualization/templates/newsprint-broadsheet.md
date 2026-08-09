---
name: newsprint-broadsheet
description: >-
  This "Newsprint Broadsheet" dashboard recreates the front page of a vintage financial newspaper on newsprint (#F6F3EC) with the faintest paper mottling, ink-black text (#191714), hairline rules (#D9D2C4), and the classic double masthead rule — a strong 3px bar over a 1px hairline; the single spot color is press red (#B3261E), reserved for negative deltas, one chart series, and a small circular seal, with warm grays (#6E675C, #B5AC9C) as supporting neutrals. There are no cards or shadows — every section sits directly on the paper, separated by hairline and bold black rules like newspaper columns. The masthead is set in Playfair Display 700/800 ("THE METRICS TRIBUNE", centered and all-caps, above a dateline row reading "VOL. XII — TUESDAY EDITION — MARKETS" between rules), body copy uses Source Serif 4, and tiny uppercase labels use IBM Plex Sans 600 with wide letter-spacing. The layout is a fixed 1440×900 broadsheet grid: masthead header with filter-style controls, a market-data-strip KPI row with vertical rules between its four entries, a two-thirds/one-third chart split, and a full-width stock-listings table beneath. Charts are austere inline-SVG newspaper graphics — 1.5px black lines, a diagonal-hatch pattern fill under the area, hairline gridlines, and a black/gray/red donut with white gaps between segments. The overall aesthetic is dense, inky, and typographic: a trustworthy old-money broadsheet where product metrics read like the morning market report.
---

# Newsprint Broadsheet

This "Newsprint Broadsheet" dashboard recreates the front page of a vintage financial newspaper on newsprint (#F6F3EC) with the faintest paper mottling, ink-black text (#191714), hairline rules (#D9D2C4), and the classic double masthead rule — a strong 3px bar over a 1px hairline; the single spot color is press red (#B3261E), reserved for negative deltas, one chart series, and a small circular seal, with warm grays (#6E675C, #B5AC9C) as supporting neutrals. There are no cards or shadows — every section sits directly on the paper, separated by hairline and bold black rules like newspaper columns. The masthead is set in Playfair Display 700/800 ("THE METRICS TRIBUNE", centered and all-caps, above a dateline row reading "VOL. XII — TUESDAY EDITION — MARKETS" between rules), body copy uses Source Serif 4, and tiny uppercase labels use IBM Plex Sans 600 with wide letter-spacing. The layout is a fixed 1440×900 broadsheet grid: masthead header with filter-style controls, a market-data-strip KPI row with vertical rules between its four entries, a two-thirds/one-third chart split, and a full-width stock-listings table beneath. Charts are austere inline-SVG newspaper graphics — 1.5px black lines, a diagonal-hatch pattern fill under the area, hairline gridlines, and a black/gray/red donut with white gaps between segments. The overall aesthetic is dense, inky, and typographic: a trustworthy old-money broadsheet where product metrics read like the morning market report.

## Source Code

A self-contained reference implementation of the "Newsprint Broadsheet" dashboard
preview. Use it as the visual target — translate the palette, typography, and
layout into the data-visualization React + Tailwind + Recharts app.
The fixed 1440×900 frame and hand-drawn inline-SVG charts below are
preview-rendering artifacts — keep the generated app's layout responsive
and build every chart with Recharts.

Responsive adaptation: Preserve the broadsheet feel by keeping the centered .sheet column and its ruled horizontal dividers intact across breakpoints, while collapsing multi-column editorial regions in strict order: the 2fr/1fr chart split should stack below ~900px (chart first, donut/legend beneath), KPIs step 4→2→1 at ~1200/720px, and the deskrow controls should become a full-width equal-fraction grid on phones. Decorative elements (masthead seal, donut ring thickness, dateline chunks) must shrink fluidly via clamp() rather than staying pixel-fixed, and the listings table should always live inside an overflow-x:auto wrapper with a visible edge fade so numeric columns remain readable without breaking the newsprint grid.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1440, initial-scale=1">
<title>The Metrics Tribune — Newsprint Broadsheet</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Sans:wght@500;600&display=swap" rel="stylesheet">
<style>
  :root{
    --paper:#F6F3EC;
    --ink:#191714;
    --rule:#D9D2C4;
    --red:#B3261E;
    --gray:#6E675C;
    --gray2:#B5AC9C;
    --mast:'Playfair Display', Georgia, serif;
    --serif:'Source Serif 4', Georgia, 'Times New Roman', serif;
    --plex:'IBM Plex Sans', Helvetica, Arial, sans-serif;
  }
  *{box-sizing:border-box}
  html,body{margin:0}
  body{
    width:1440px;height:900px;overflow:hidden;
    background:var(--paper);color:var(--ink);
    font-family:var(--serif);
    display:flex;justify-content:center;
  }
  .mottle{position:fixed;inset:0;opacity:.05;pointer-events:none}
  .sheet{position:relative;z-index:1;width:1356px;height:900px;padding-top:18px;display:flex;flex-direction:column}

  /* Masthead */
  .masthead{position:relative;border-top:1px solid var(--ink)}
  .mast-title{font-family:var(--mast);font-weight:800;font-size:44px;letter-spacing:.06em;text-transform:uppercase;text-align:center;padding:9px 0 7px}
  .dateline{display:flex;justify-content:space-between;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink);padding:5px 2px;font-family:var(--plex);font-weight:600;font-size:10px;letter-spacing:.18em;text-transform:uppercase}
  .double{height:6px;border-top:3px solid var(--ink);border-bottom:1px solid var(--ink);margin-top:3px}
  .seal{position:absolute;right:8px;top:12px;width:60px;height:60px;border:1.5px solid var(--red);border-radius:50%;color:var(--red);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font-family:var(--plex);font-weight:600;font-size:7px;letter-spacing:.14em;text-transform:uppercase;transform:rotate(-8deg)}
  .seal b{font-size:12px;letter-spacing:.06em}

  /* Desk row */
  .deskrow{display:flex;justify-content:space-between;align-items:center;padding:8px 0}
  .desk-note{font-style:italic;font-size:13px;color:var(--gray)}
  .controls{display:flex;border:1px solid var(--ink);background:#FBF9F3}
  .ctrl{display:flex;gap:8px;align-items:baseline;padding:6px 14px;border-right:1px solid var(--ink);font-family:var(--plex)}
  .ctrl:last-child{border-right:none}
  .ctrl .lbl{font-size:8px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--gray)}
  .ctrl .val{font-size:11px;font-weight:600;letter-spacing:.04em;display:inline-flex;align-items:center;gap:6px}
  .dot{width:6px;height:6px;border-radius:50%;background:var(--red)}

  /* KPI market strip */
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--ink);border-bottom:1px solid var(--rule)}
  .kpi{padding:11px 18px 11px 0;border-right:1px solid var(--rule)}
  .kpi:not(:first-child){padding-left:18px}
  .kpi:last-child{border-right:none}
  .k-lbl{font-family:var(--plex);font-weight:600;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--gray)}
  .k-val{font-family:var(--mast);font-weight:700;font-size:29px;margin:6px 0 3px}
  .delta{font-family:var(--plex);font-size:11px;font-weight:600}
  .up{color:var(--ink)}.down{color:var(--red)}
  .since{color:var(--gray);font-weight:400;font-family:var(--serif);font-style:italic;margin-left:4px}

  /* Chart panels */
  .charts{display:grid;grid-template-columns:2fr 1fr;gap:34px;padding:13px 0 6px}
  .panel-head{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--ink);padding-bottom:6px;margin-bottom:10px}
  .panel-title{font-family:var(--mast);font-weight:700;font-size:19px}
  .panel-sub{font-family:var(--plex);font-weight:600;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--gray)}
  .legend{display:flex;gap:18px;font-family:var(--plex);font-weight:500;font-size:10px;letter-spacing:.08em;text-transform:uppercase;margin-top:7px}
  .legend span{display:inline-flex;align-items:center;gap:6px}
  .sw{display:inline-block;width:16px;height:0;border-top:2px solid var(--ink)}
  .sw.red{border-color:var(--red)}
  .sw.hatch{width:14px;height:10px;border:1px solid var(--ink);background:repeating-linear-gradient(45deg,transparent 0 2px,rgba(25,23,20,.45) 2px 3px)}

  /* Donut */
  .donut-wrap{display:flex;flex-direction:column;align-items:center}
  .dl{width:100%;margin-top:5px}
  .dl-row{display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:5px 0;border-bottom:1px solid var(--rule)}
  .dl-row:last-child{border-bottom:none}
  .dl-name{display:flex;align-items:center;gap:8px}
  .dl-name i{width:9px;height:9px;display:inline-block}
  .dl-val{font-family:var(--plex);font-weight:600;font-size:11px}

  /* Listings table */
  table{width:100%;border-collapse:collapse;font-size:12px}
  thead th{text-align:left;font-family:var(--plex);font-weight:600;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--gray);padding:7px 0;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink)}
  tbody td{padding:6px 0;border-bottom:1px solid var(--rule)}
  tbody tr:nth-child(even) td{border-bottom-style:dotted}
  tbody tr:last-child td{border-bottom:1px solid var(--ink)}
  td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
  .sec{font-weight:600}
  .pos{color:var(--ink);font-family:var(--plex);font-weight:600}
  .neg{color:var(--red);font-family:var(--plex);font-weight:600}
</style>
</head>
<body>
  <!-- Paper mottling -->
  <svg class="mottle" width="1440" height="900">
    <filter id="paper"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="3" seed="7"/><feColorMatrix type="saturate" values="0"/></filter>
    <rect width="1440" height="900" filter="url(#paper)"/>
  </svg>

  <div class="sheet">
    <!-- Masthead -->
    <div class="masthead">
      <div class="mast-title">The Metrics Tribune</div>
      <div class="dateline">
        <span>Vol. XII — No. 214</span>
        <span>Tuesday Edition — Markets</span>
        <span>Price: Ten Cents</span>
      </div>
      <div class="double"></div>
      <div class="seal"><span>Founded</span><b>1893</b><span>Daily</span></div>
    </div>

    <!-- Desk row -->
    <div class="deskrow">
      <div class="desk-note">Circulation &amp; Advertising Desk — prepared for the morning meeting of October 6, 2026.</div>
      <div class="controls">
        <div class="ctrl"><span class="lbl">Edition</span><span class="val">Q3 2026</span></div>
        <div class="ctrl"><span class="lbl">Desk</span><span class="val">All Sections</span></div>
        <div class="ctrl"><span class="lbl">Press</span><span class="val"><span class="dot"></span>Live</span></div>
      </div>
    </div>

    <!-- KPI market strip -->
    <div class="kpis">
      <div class="kpi">
        <div class="k-lbl">Daily Circulation</div>
        <div class="k-val">184,300</div>
        <div class="delta down">▼ 2.1%<span class="since">vs. last quarter</span></div>
      </div>
      <div class="kpi">
        <div class="k-lbl">Digital Subscribers</div>
        <div class="k-val">96,410</div>
        <div class="delta up">▲ 12.7%<span class="since">vs. last quarter</span></div>
      </div>
      <div class="kpi">
        <div class="k-lbl">Weekly Ad Revenue</div>
        <div class="k-val">$412,600</div>
        <div class="delta up">▲ 4.9%<span class="since">vs. last quarter</span></div>
      </div>
      <div class="kpi">
        <div class="k-lbl">Newsletter Open Rate</div>
        <div class="k-val">41.2%</div>
        <div class="delta up">▲ 1.8%<span class="since">vs. last quarter</span></div>
      </div>
    </div>

    <!-- Charts -->
    <div class="charts">
      <!-- Circulation graphic -->
      <div>
        <div class="panel-head">
          <div class="panel-title">Print Circulation vs. Digital Editions</div>
          <div class="panel-sub">Copies · 13 weeks</div>
        </div>
        <svg viewBox="0 0 760 300" width="100%" height="290" preserveAspectRatio="none" style="display:block">
          <defs>
            <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="5" stroke="#191714" stroke-width="1" opacity=".22"/>
            </pattern>
          </defs>
          <!-- hairline grid -->
          <g stroke="#D9D2C4" stroke-width="1">
            <line x1="0" y1="40" x2="760" y2="40"/>
            <line x1="0" y1="95" x2="760" y2="95"/>
            <line x1="0" y1="150" x2="760" y2="150"/>
            <line x1="0" y1="205" x2="760" y2="205"/>
            <line x1="0" y1="260" x2="760" y2="260"/>
          </g>
          <g fill="#6E675C" font-family="IBM Plex Sans,sans-serif" font-size="9">
            <text x="2" y="36">240K</text><text x="2" y="91">190K</text><text x="2" y="146">140K</text><text x="2" y="201">90K</text><text x="2" y="256">40K</text>
          </g>
          <!-- hatched area under print -->
          <path d="M0,75 L63,77 L127,76 L190,80 L253,83 L317,82 L380,85 L443,88 L507,87 L570,92 L633,95 L697,98 L760,102 L760,260 L0,260 Z" fill="url(#hatch)"/>
          <!-- print line -->
          <path d="M0,75 L63,77 L127,76 L190,80 L253,83 L317,82 L380,85 L443,88 L507,87 L570,92 L633,95 L697,98 L760,102" fill="none" stroke="#191714" stroke-width="1.5"/>
          <!-- digital line, spot red -->
          <path d="M0,236 L63,233 L127,229 L190,225 L253,222 L317,217 L380,214 L443,211 L507,207 L570,205 L633,203 L697,201 L760,198" fill="none" stroke="#B3261E" stroke-width="1.5"/>
          <g fill="#191714"><circle cx="760" cy="102" r="3"/></g>
          <g fill="#B3261E"><circle cx="760" cy="198" r="3"/></g>
          <!-- week labels -->
          <g fill="#6E675C" font-family="IBM Plex Sans,sans-serif" font-size="9" letter-spacing="1">
            <text x="0" y="290">JUN 29</text>
            <text x="253" y="290" text-anchor="middle">JUL 27</text>
            <text x="507" y="290" text-anchor="middle">AUG 24</text>
            <text x="760" y="290" text-anchor="end">SEP 21</text>
          </g>
        </svg>
        <div class="legend">
          <span><i class="sw"></i>Print circulation</span>
          <span><i class="sw red"></i>Digital editions</span>
          <span><i class="sw hatch"></i>Print share of copies</span>
        </div>
      </div>

      <!-- Revenue donut -->
      <div>
        <div class="panel-head">
          <div class="panel-title">Revenue by Stream</div>
          <div class="panel-sub">Weekly avg.</div>
        </div>
        <div class="donut-wrap">
          <svg viewBox="0 0 200 200" width="182" height="182">
            <!-- segments via stroke-dasharray, circumference ≈ 502 (r=80) -->
            <g transform="translate(100,100)" fill="none" stroke-width="26">
              <circle r="80" stroke="#191714" stroke-dasharray="221 281" transform="rotate(-90)"/>
              <circle r="80" stroke="#B3261E" stroke-dasharray="156 346" stroke-dashoffset="-221" transform="rotate(-90)"/>
              <circle r="80" stroke="#6E675C" stroke-dasharray="75 427" stroke-dashoffset="-377" transform="rotate(-90)"/>
              <circle r="80" stroke="#B5AC9C" stroke-dasharray="50 452" stroke-dashoffset="-452" transform="rotate(-90)"/>
              <!-- white gaps between segments -->
              <g stroke="#F6F3EC" stroke-width="3">
                <line x1="0" y1="-64" x2="0" y2="-97"/>
                <line x1="0" y1="-64" x2="0" y2="-97" transform="rotate(158.4)"/>
                <line x1="0" y1="-64" x2="0" y2="-97" transform="rotate(270)"/>
                <line x1="0" y1="-64" x2="0" y2="-97" transform="rotate(324)"/>
              </g>
            </g>
            <text x="100" y="97" text-anchor="middle" font-family="Playfair Display,serif" font-size="26" font-weight="700" fill="#191714">$612K</text>
            <text x="100" y="115" text-anchor="middle" font-family="IBM Plex Sans,sans-serif" font-size="8" letter-spacing="2.5" fill="#6E675C">WEEKLY</text>
          </svg>
          <div class="dl">
            <div class="dl-row"><span class="dl-name"><i style="background:#191714"></i>Subscriptions</span><span class="dl-val">44% · $269K</span></div>
            <div class="dl-row"><span class="dl-name"><i style="background:#B3261E"></i>Advertising</span><span class="dl-val">31% · $190K</span></div>
            <div class="dl-row"><span class="dl-name"><i style="background:#6E675C"></i>Newsstand</span><span class="dl-val">15% · $92K</span></div>
            <div class="dl-row"><span class="dl-name"><i style="background:#B5AC9C"></i>Syndication</span><span class="dl-val">10% · $61K</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Section listings -->
    <div>
      <div class="panel-head" style="border-bottom:none;margin-bottom:0;padding-bottom:2px">
        <div class="panel-title" style="font-size:17px">Section Listings</div>
        <div class="panel-sub">Ranked by circulation · Week of Sep 15</div>
      </div>
      <table>
        <thead>
          <tr><th>Section</th><th>Desk</th><th class="num">Pages</th><th class="num">Circulation</th><th class="num">Ad Revenue</th><th class="num">WoW Δ</th></tr>
        </thead>
        <tbody>
          <tr><td class="sec">Markets</td><td>Financial Desk</td><td class="num">24</td><td class="num">84,200</td><td class="num">$148,900</td><td class="num pos">+4.2%</td></tr>
          <tr><td class="sec">Business</td><td>National Desk</td><td class="num">18</td><td class="num">76,400</td><td class="num">$121,300</td><td class="num pos">+2.8%</td></tr>
          <tr><td class="sec">Sports</td><td>City Desk</td><td class="num">16</td><td class="num">68,900</td><td class="num">$94,700</td><td class="num pos">+1.1%</td></tr>
          <tr><td class="sec">Culture</td><td>Features Desk</td><td class="num">14</td><td class="num">52,300</td><td class="num">$61,200</td><td class="num neg">−0.8%</td></tr>
          <tr><td class="sec">Opinion</td><td>Editorial Desk</td><td class="num">8</td><td class="num">47,800</td><td class="num">$22,400</td><td class="num neg">−2.4%</td></tr>
          <tr><td class="sec">Classifieds</td><td>Advertising Desk</td><td class="num">12</td><td class="num">39,600</td><td class="num">$88,100</td><td class="num pos">+6.9%</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
```
