---
name: comic-strip
description: >-
  This "Comic Strip" dashboard is a pop-art comic book page: aged newsprint (#F6EED8) screened with a faint Ben-Day halftone dot field, panels drawn as white (#FFFDF5) comic frames with heavy 3px ink (#17141A) outlines, 8px corners, and hard 7px offset ink shadows, plus a cyan halftone patch bleeding out of each panel's top-right corner. The palette is straight off a CMYK press — hero red #E23D2E, process blue #2757D6, banana yellow #FFC928, and ink — with the logo set in Bangers filled yellow, stroked in ink, and dropped on a red offset shadow beside a rotated yellow "POW!" starburst badge. Narration-box eyebrows (black caption strips in letterspaced white uppercase) and caption-style filter controls keep the comic grammar; body copy, labels, and table text use Comic Neue 400/700 while every big numeral shouts in Bangers. The layout is a fixed 1440×900 grid: masthead with logo and caption controls, a 4-up KPI row of comic panels (the lead panel flooded yellow like a cover flash), a 2/3 + 1/3 chart split, and a full-width "top titles" table. Charts are hand-drawn inline SVG with comic weight — a 4px round-capped ink line over a halftone-dot area fill with a red companion series and a 12-point starburst marker on the last point, and a donut of fat red/blue/yellow segments sandwiched between bold ink outline rings with a Bangers total at center. Genre chips sit in the table as tiny outlined stickers, negatives hit in red, and the overall aesthetic is Saturday-morning loud: KAPOW-grade fun applied to real analytics without losing legibility.
---

# Comic Strip

This "Comic Strip" dashboard is a pop-art comic book page: aged newsprint (#F6EED8) screened with a faint Ben-Day halftone dot field, panels drawn as white (#FFFDF5) comic frames with heavy 3px ink (#17141A) outlines, 8px corners, and hard 7px offset ink shadows, plus a cyan halftone patch bleeding out of each panel's top-right corner. The palette is straight off a CMYK press — hero red #E23D2E, process blue #2757D6, banana yellow #FFC928, and ink — with the logo set in Bangers filled yellow, stroked in ink, and dropped on a red offset shadow beside a rotated yellow "POW!" starburst badge. Narration-box eyebrows (black caption strips in letterspaced white uppercase) and caption-style filter controls keep the comic grammar; body copy, labels, and table text use Comic Neue 400/700 while every big numeral shouts in Bangers. The layout is a fixed 1440×900 grid: masthead with logo and caption controls, a 4-up KPI row of comic panels (the lead panel flooded yellow like a cover flash), a 2/3 + 1/3 chart split, and a full-width "top titles" table. Charts are hand-drawn inline SVG with comic weight — a 4px round-capped ink line over a halftone-dot area fill with a red companion series and a 12-point starburst marker on the last point, and a donut of fat red/blue/yellow segments sandwiched between bold ink outline rings with a Bangers total at center. Genre chips sit in the table as tiny outlined stickers, negatives hit in red, and the overall aesthetic is Saturday-morning loud: KAPOW-grade fun applied to real analytics without losing legibility.

## Source Code

A self-contained reference implementation of the "Comic Strip" dashboard
preview. Use it as the visual target — translate the palette, typography, and
layout into the data-visualization React + Tailwind + Recharts app.
The fixed 1440×900 frame and hand-drawn inline-SVG charts below are
preview-rendering artifacts — keep the generated app's layout responsive
and build every chart with Recharts.

Responsive adaptation: In this comic-strip style, panels should stay chunky and ink-outlined at every width — collapse the 4-up KPI grid to 2-up under ~1024px and 1-up under ~480px, and stack the 2fr/1fr chart split vertically below ~1024px so the donut sits full-width beneath the line chart. Decorative halftone dots, POW seals, and offset ink shadows must shrink with clamp() rather than stay fixed px so they never crowd a 360px viewport, and the reading table should always live inside a horizontally scrollable wrapper with a visible edge fade on narrow screens. On ultrawide (>1600px) cap the page around 1760px, let KPIs flow via auto-fit minmax, and constrain the donut ring's max size so panels stay comic-book-square instead of stretching into billboards.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1440, initial-scale=1">
<title>KAPOW! Comics — Weekly Pull</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@400;700&display=swap" rel="stylesheet">
<style>
  :root{
    --paper:#F6EED8; --panel:#FFFDF5; --ink:#17141A;
    --red:#E23D2E; --blue:#2757D6; --yellow:#FFC928; --cyan:#31B7CE;
    --display:'Bangers', 'Impact', sans-serif;
    --body:'Comic Neue', 'Comic Sans MS', cursive, sans-serif;
  }
  *{box-sizing:border-box}
  html,body{margin:0}
  body{
    width:1440px;height:900px;overflow:hidden;
    background:var(--paper);
    background-image:radial-gradient(rgba(23,20,26,.07) 1.2px, transparent 1.3px);
    background-size:14px 14px;
    color:var(--ink);font-family:var(--body);
  }
  .page{height:900px;padding:22px 34px;display:flex;flex-direction:column}

  /* Comic panel */
  .panel{position:relative;background:var(--panel);border:3px solid var(--ink);border-radius:8px;
    box-shadow:7px 7px 0 var(--ink);padding:14px 18px;overflow:hidden}
  .panel::after{content:"";position:absolute;top:-14px;right:-14px;width:64px;height:64px;border-radius:50%;
    background:radial-gradient(rgba(49,183,206,.32) 1.5px, transparent 1.6px);background-size:9px 9px;pointer-events:none}

  /* Header */
  header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:16px}
  .caption{display:inline-block;background:var(--ink);color:#FFFDF5;font-size:10px;font-weight:700;
    letter-spacing:.26em;text-transform:uppercase;padding:4px 10px;margin-bottom:8px}
  .logo-row{display:flex;align-items:center;gap:18px}
  .logo{font-family:var(--display);font-size:44px;line-height:1;letter-spacing:.02em;color:var(--yellow);
    -webkit-text-stroke:1.6px var(--ink);text-shadow:3px 3px 0 var(--red)}
  .pow{position:relative;width:74px;height:74px;transform:rotate(-9deg)}
  .pow svg{position:absolute;inset:0}
  .pow span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
    font-family:var(--display);font-size:19px;color:var(--red)}
  .controls{display:flex;gap:12px}
  .ctl{background:var(--panel);border:2.5px solid var(--ink);border-radius:6px;box-shadow:4px 4px 0 var(--ink);
    padding:7px 13px;font-size:12.5px;font-weight:700;display:flex;align-items:center;gap:8px}
  .ctl.live{background:var(--yellow)}
  .chev{font-size:9px}
  .dot{width:8px;height:8px;border-radius:50%;background:var(--red);border:2px solid var(--ink)}

  /* KPI row */
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:22px;margin-bottom:16px}
  .kpi .lbl{font-size:10.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase}
  .kpi .val{font-family:var(--display);font-size:34px;line-height:1.05;margin:6px 0 3px;letter-spacing:.02em}
  .kpi.cover{background:var(--yellow)}
  .delta{font-size:12px;font-weight:700}
  .up{color:var(--blue)}.down{color:var(--red)}
  .since{color:rgba(23,20,26,.55);font-weight:400;margin-left:5px}

  /* Charts */
  .charts{display:grid;grid-template-columns:2fr 1fr;gap:22px;margin-bottom:16px}
  .p-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}
  .p-title{font-family:var(--display);font-size:21px;letter-spacing:.03em}
  .p-sub{font-size:9.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:rgba(23,20,26,.55)}
  .legend{display:flex;gap:18px;font-size:11px;font-weight:700;margin-top:6px}
  .legend i{display:inline-block;width:18px;height:4px;border-radius:2px;margin-right:6px;vertical-align:middle}

  /* Donut */
  .donut-wrap{display:flex;flex-direction:column;align-items:center}
  .dl{width:100%;margin-top:8px}
  .dl-row{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;font-weight:700;
    padding:4.5px 0;border-bottom:2px dashed rgba(23,20,26,.18)}
  .dl-row:last-child{border-bottom:none}
  .dl-name{display:flex;align-items:center;gap:9px}
  .dl-name i{width:12px;height:12px;border-radius:3px;border:2px solid var(--ink);display:inline-block}
  .dl-val{font-family:var(--display);font-size:14px;letter-spacing:.04em}

  /* Table */
  table{width:100%;border-collapse:collapse;font-size:13px}
  thead th{text-align:left;font-size:9.5px;letter-spacing:.2em;text-transform:uppercase;font-weight:700;
    padding:6px 0;border-bottom:3px solid var(--ink)}
  tbody td{padding:7.5px 0;border-bottom:2px dashed rgba(23,20,26,.18);font-weight:700}
  tbody tr:last-child td{border-bottom:none}
  td.title{font-family:var(--display);font-size:16.5px;letter-spacing:.03em}
  td.dim{color:rgba(23,20,26,.55);font-weight:400}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  .chip{display:inline-block;border:2px solid var(--ink);border-radius:5px;padding:1.5px 8px;font-size:9px;
    font-weight:700;letter-spacing:.12em;text-transform:uppercase;box-shadow:2px 2px 0 var(--ink)}
  .chip.hero{background:var(--red);color:#FFFDF5}
  .chip.scifi{background:var(--blue);color:#FFFDF5}
  .chip.horror{background:var(--ink);color:#FFFDF5}
  .chip.indie{background:var(--yellow)}
  td.pos{color:var(--blue)}td.neg{color:var(--red)}
</style>
</head>
<body>
  <div class="page">

    <!-- Header -->
    <header>
      <div>
        <div class="caption">Weekly Pull List · Issue No. 42</div>
        <div class="logo-row">
          <div class="logo">KAPOW! COMICS</div>
          <div class="pow">
            <svg viewBox="0 0 100 100">
              <polygon points="50,2 60,20 79,10 76,31 98,31 84,46 100,58 79,62 86,83 66,75 62,97 50,80 38,97 34,75 14,83 21,62 0,58 16,46 2,31 24,31 21,10 40,20"
                fill="#FFC928" stroke="#17141A" stroke-width="3" stroke-linejoin="round"/>
            </svg>
            <span>POW!</span>
          </div>
        </div>
      </div>
      <div class="controls">
        <div class="ctl">This Week <span class="chev">▼</span></div>
        <div class="ctl">All Genres <span class="chev">▼</span></div>
        <div class="ctl live"><span class="dot"></span>On Sale</div>
      </div>
    </header>

    <!-- KPIs -->
    <div class="kpis">
      <div class="panel kpi cover">
        <div class="lbl">Issues Sold</div>
        <div class="val">12,480</div>
        <div class="delta up">▲ 18.4%<span class="since">vs last week</span></div>
      </div>
      <div class="panel kpi">
        <div class="lbl">Pull-List Subs</div>
        <div class="val">3,214</div>
        <div class="delta up">▲ 6.1%<span class="since">vs last week</span></div>
      </div>
      <div class="panel kpi">
        <div class="lbl">Weekly Revenue</div>
        <div class="val">$58,940</div>
        <div class="delta up">▲ 11.2%<span class="since">vs last week</span></div>
      </div>
      <div class="panel kpi">
        <div class="lbl">Avg Basket</div>
        <div class="val">$18.60</div>
        <div class="delta down">▼ 2.3%<span class="since">vs last week</span></div>
      </div>
    </div>

    <!-- Charts -->
    <div class="charts">
      <div class="panel">
        <div class="p-head">
          <div class="p-title">Sales Action!</div>
          <div class="p-sub">12 weeks · Issues</div>
        </div>
        <svg viewBox="0 0 760 252" width="100%" height="232" preserveAspectRatio="none" style="display:block">
          <defs>
            <pattern id="benday" width="9" height="9" patternUnits="userSpaceOnUse">
              <circle cx="4.5" cy="4.5" r="1.7" fill="#E23D2E" opacity=".28"/>
            </pattern>
          </defs>
          <g stroke="rgba(23,20,26,.14)" stroke-width="1.5" stroke-dasharray="1 6" stroke-linecap="round">
            <line x1="0" y1="30" x2="760" y2="30"/>
            <line x1="0" y1="80" x2="760" y2="80"/>
            <line x1="0" y1="130" x2="760" y2="130"/>
            <line x1="0" y1="180" x2="760" y2="180"/>
          </g>
          <g fill="rgba(23,20,26,.55)" font-family="Comic Neue,sans-serif" font-size="10" font-weight="700">
            <text x="2" y="25">1.6K</text><text x="2" y="75">1.2K</text><text x="2" y="125">0.8K</text><text x="2" y="175">0.4K</text>
          </g>
          <!-- halftone fill under ink line -->
          <path d="M0,168 L69,158 L138,164 L207,142 L276,150 L345,126 L414,134 L483,108 L552,118 L621,88 L690,96 L748,62 L748,214 L0,214 Z" fill="url(#benday)"/>
          <!-- online series, blue -->
          <polyline fill="none" stroke="#2757D6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
            points="0,196 69,190 138,193 207,182 276,186 345,172 414,177 483,162 552,167 621,150 690,155 748,138"/>
          <!-- in-store series, ink -->
          <polyline fill="none" stroke="#17141A" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"
            points="0,168 69,158 138,164 207,142 276,150 345,126 414,134 483,108 552,118 621,88 690,96 748,62"/>
          <!-- starburst marker on last point -->
          <g transform="translate(748,62)">
            <polygon points="0,-13 3.5,-4.5 12,-7 6.5,0 13,4 4.5,5 6,13 0,7 -6,13 -4.5,5 -13,4 -6.5,0 -12,-7 -3.5,-4.5"
              fill="#FFC928" stroke="#17141A" stroke-width="2.5" stroke-linejoin="round"/>
          </g>
          <g fill="rgba(23,20,26,.55)" font-family="Comic Neue,sans-serif" font-size="10" font-weight="700">
            <text x="0" y="240">WK 01</text>
            <text x="207" y="240" text-anchor="middle">WK 04</text>
            <text x="414" y="240" text-anchor="middle">WK 08</text>
            <text x="748" y="240" text-anchor="end">WK 12</text>
          </g>
        </svg>
        <div class="legend">
          <span><i style="background:#17141A"></i>In-store</span>
          <span><i style="background:#2757D6"></i>Online</span>
        </div>
      </div>

      <div class="panel">
        <div class="p-head">
          <div class="p-title">Genre Mix</div>
          <div class="p-sub">Share of sales</div>
        </div>
        <div class="donut-wrap">
          <svg viewBox="0 0 200 200" width="176" height="176">
            <g transform="translate(100,100)">
              <circle r="88" fill="none" stroke="#17141A" stroke-width="3"/>
              <circle r="52" fill="none" stroke="#17141A" stroke-width="3"/>
              <g fill="none" stroke-width="30">
                <circle r="70" stroke="#E23D2E" stroke-dasharray="202 238" transform="rotate(-90)"/>
                <circle r="70" stroke="#2757D6" stroke-dasharray="106 334" stroke-dashoffset="-202" transform="rotate(-90)"/>
                <circle r="70" stroke="#17141A" stroke-dasharray="79 361" stroke-dashoffset="-308" transform="rotate(-90)"/>
                <circle r="70" stroke="#FFC928" stroke-dasharray="53 387" stroke-dashoffset="-387" transform="rotate(-90)"/>
              </g>
              <text y="4" text-anchor="middle" font-family="Bangers,sans-serif" font-size="30" fill="#17141A">12.4K</text>
              <text y="22" text-anchor="middle" font-family="Comic Neue,sans-serif" font-size="9.5" font-weight="700" letter-spacing="2" fill="rgba(23,20,26,.55)">ISSUES</text>
            </g>
          </svg>
          <div class="dl">
            <div class="dl-row"><span class="dl-name"><i style="background:#E23D2E"></i>Superhero</span><span class="dl-val">46%</span></div>
            <div class="dl-row"><span class="dl-name"><i style="background:#2757D6"></i>Sci-Fi</span><span class="dl-val">24%</span></div>
            <div class="dl-row"><span class="dl-name"><i style="background:#17141A"></i>Horror</span><span class="dl-val">18%</span></div>
            <div class="dl-row"><span class="dl-name"><i style="background:#FFC928"></i>Indie</span><span class="dl-val">12%</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="panel" style="flex:1">
      <div class="p-head">
        <div class="p-title">Top Titles This Week</div>
        <div class="p-sub">Ranked by units</div>
      </div>
      <table>
        <thead>
          <tr><th>Title</th><th>Publisher</th><th>Genre</th><th class="num">Units</th><th class="num">Revenue</th><th class="num">WoW Δ</th></tr>
        </thead>
        <tbody>
          <tr><td class="title">Captain Comet #12</td><td class="dim">Meteor House</td><td><span class="chip hero">Hero</span></td><td class="num">1,842</td><td class="num">$9,210</td><td class="num pos">+22.4%</td></tr>
          <tr><td class="title">Nebula Drifters #4</td><td class="dim">Orbit Press</td><td><span class="chip scifi">Sci-Fi</span></td><td class="num">1,406</td><td class="num">$7,030</td><td class="num pos">+9.8%</td></tr>
          <tr><td class="title">The Hollow Hours #9</td><td class="dim">Midnight Ink</td><td><span class="chip horror">Horror</span></td><td class="num">1,118</td><td class="num">$5,590</td><td class="num pos">+4.1%</td></tr>
          <tr><td class="title">Paper Town Blues #2</td><td class="dim">Small Batch</td><td><span class="chip indie">Indie</span></td><td class="num">864</td><td class="num">$4,320</td><td class="num pos">+31.7%</td></tr>
          <tr><td class="title">Captain Comet #11</td><td class="dim">Meteor House</td><td><span class="chip hero">Hero</span></td><td class="num">692</td><td class="num">$3,460</td><td class="num neg">−12.6%</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
```
