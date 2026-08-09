---
name: pixel-arcade
description: >-
  This "Pixel Arcade" dashboard recreates an 8-bit arcade cabinet on deep space navy (#0B0B1E) overlaid with subtle 3px-period CRT scanlines and a faint vignette; panels are #14142E with hard square corners, 2px edges in arcade palette colors, and stepped pixel corners built from layered box-shadows. The palette is lime #7CFF4F, magenta #FF4FD8, cyan #4FE3FF, and yellow #FFE44F, with near-white text #E8E8FF and muted periwinkle #8B8BB8 labels — lime for good deltas, magenta for bad. Headings and labels use "Press Start 2P" at deliberately small 9–14px sizes while numerals and body use VT323 at 18–34px; the layout is a fixed 1440×900 grid with a marquee header (plus a static INSERT COIN badge), a HIGH SCORE-style 4-KPI row, a 2/3 + 1/3 chart split, and a full-width leaderboard table. Charts are inline SVG rendered with crisp edges: a stepped pixel line drawn from only horizontal and vertical 3px segments with miter joins, bar charts as stacks of small square blocks with 2px gaps, and a donut reimagined as a segmented ring of 28 square ticks colored proportionally to the mix. The overall aesthetic is glowing retro CRT: dark, chunky, and pixel-precise, like a high-score screen promoted into an analytics console.
---

# Pixel Arcade

This "Pixel Arcade" dashboard recreates an 8-bit arcade cabinet on deep space navy (#0B0B1E) overlaid with subtle 3px-period CRT scanlines and a faint vignette; panels are #14142E with hard square corners, 2px edges in arcade palette colors, and stepped pixel corners built from layered box-shadows. The palette is lime #7CFF4F, magenta #FF4FD8, cyan #4FE3FF, and yellow #FFE44F, with near-white text #E8E8FF and muted periwinkle #8B8BB8 labels — lime for good deltas, magenta for bad. Headings and labels use "Press Start 2P" at deliberately small 9–14px sizes while numerals and body use VT323 at 18–34px; the layout is a fixed 1440×900 grid with a marquee header (plus a static INSERT COIN badge), a HIGH SCORE-style 4-KPI row, a 2/3 + 1/3 chart split, and a full-width leaderboard table. Charts are inline SVG rendered with crisp edges: a stepped pixel line drawn from only horizontal and vertical 3px segments with miter joins, bar charts as stacks of small square blocks with 2px gaps, and a donut reimagined as a segmented ring of 28 square ticks colored proportionally to the mix. The overall aesthetic is glowing retro CRT: dark, chunky, and pixel-precise, like a high-score screen promoted into an analytics console.

## Source Code

A self-contained reference implementation of the "Pixel Arcade" dashboard
preview. Use it as the visual target — translate the palette, typography, and
layout into the data-visualization React + Tailwind + Recharts app.
The fixed 1440×900 frame and hand-drawn inline-SVG charts below are
preview-rendering artifacts — keep the generated app's layout responsive
and build every chart with Recharts.

Responsive adaptation: At ≤1024px collapse the 2fr/1fr chart split to a single column and drop KPIs to 2-up, then to 1-up by ~520px; keep the pixel-art border thickness constant (2px shadow) but let interior skeleton bars, sparkline blocks, and the donut SVG scale fluidly via clamp() and flex:1 rather than fixed px. The data table must live in its own overflow-x:auto region with a min-width around 600px and a visible pixel-style scrollbar so the arcade aesthetic signals horizontal scroll on phones; above ~1600px cap the app at ~1600px and center it so KPI cards and sparklines don't dilute into empty space.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1440, initial-scale=1">
<title>Pixel Arcade — Network Ops</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#0B0B1E; --panel:#14142E; --lime:#7CFF4F; --mag:#FF4FD8; --cyan:#4FE3FF; --yell:#FFE44F;
    --text:#E8E8FF; --muted:#8B8BB8;
    --px:'Press Start 2P',monospace;
    --vt:'VT323',monospace;
  }
  *{box-sizing:border-box}
  html,body{margin:0}
  body{width:1440px;height:900px;overflow:hidden;background:var(--bg);color:var(--text);font-family:var(--vt);position:relative}

  /* CRT scanlines + vignette */
  body::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.16) 0 1px,transparent 1px 3px);z-index:9}
  body::after{content:"";position:absolute;inset:0;background:radial-gradient(1100px 720px at 50% 42%,transparent 55%,rgba(4,4,14,.34) 100%);z-index:10}

  .app{position:relative;z-index:1;height:900px;padding:24px 32px;display:flex;flex-direction:column;gap:16px}

  /* Pixel panels: 2px edges + stepped corners via layered box-shadows */
  .pix{background:var(--panel)}
  .pb-lime{box-shadow:2px 0 0 0 var(--lime),-2px 0 0 0 var(--lime),0 2px 0 0 var(--lime),0 -2px 0 0 var(--lime)}
  .pb-cyan{box-shadow:2px 0 0 0 var(--cyan),-2px 0 0 0 var(--cyan),0 2px 0 0 var(--cyan),0 -2px 0 0 var(--cyan)}
  .pb-mag{box-shadow:2px 0 0 0 var(--mag),-2px 0 0 0 var(--mag),0 2px 0 0 var(--mag),0 -2px 0 0 var(--mag)}
  .pb-yell{box-shadow:2px 0 0 0 var(--yell),-2px 0 0 0 var(--yell),0 2px 0 0 var(--yell),0 -2px 0 0 var(--yell)}
  .pb-mut{box-shadow:2px 0 0 0 #34346A,-2px 0 0 0 #34346A,0 2px 0 0 #34346A,0 -2px 0 0 #34346A}

  /* Header */
  header{display:flex;justify-content:space-between;align-items:center}
  .brand{display:flex;align-items:center;gap:18px}
  .logo{width:40px;height:40px;background:var(--yell);color:#0B0B1E;font-family:var(--px);font-size:11px;display:flex;align-items:center;justify-content:center;box-shadow:2px 0 0 0 #B49E1F,-2px 0 0 0 #B49E1F,0 2px 0 0 #B49E1F,0 -2px 0 0 #B49E1F}
  .brand h1{margin:0;font-family:var(--px);font-size:13px;color:var(--lime);letter-spacing:.06em;text-shadow:0 0 12px rgba(124,255,79,.35)}
  .brand p{margin:6px 0 0;font-size:17px;color:var(--muted);letter-spacing:.08em}
  .controls{display:flex;gap:16px;align-items:center}
  .ctl{background:var(--panel);padding:8px 14px;font-size:18px;letter-spacing:.06em}
  .coin{font-family:var(--px);font-size:9px;color:var(--yell);padding:11px 14px;background:var(--panel)}

  /* KPI row */
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
  .kpi{padding:14px 16px}
  .kpi .lbl{font-family:var(--px);font-size:9px;color:var(--muted);letter-spacing:.04em}
  .kpi .val{font-size:34px;line-height:1;margin:10px 0 2px}
  .delta{font-size:18px;letter-spacing:.05em}
  .delta.up{color:var(--lime)}
  .delta.down{color:var(--mag)}
  .blocks{display:flex;gap:2px;align-items:flex-end;height:34px;margin-top:8px}
  .blocks i{width:7px;background:repeating-linear-gradient(to top,var(--bc) 0 7px,transparent 7px 9px)}
  .bc-lime{--bc:var(--lime)}
  .bc-cyan{--bc:var(--cyan)}
  .bc-yell{--bc:var(--yell)}
  .bc-mag{--bc:var(--mag)}

  /* Chart panels */
  .charts{display:grid;grid-template-columns:2fr 1fr;gap:20px;flex:1;min-height:0}
  .panel{padding:14px 16px;display:flex;flex-direction:column;min-height:0}
  .p-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
  .p-title{font-family:var(--px);font-size:10px;letter-spacing:.05em}
  .p-sub{font-size:16px;color:var(--muted);letter-spacing:.08em;margin-top:6px}
  .legend{display:flex;gap:16px;font-family:var(--px);font-size:9px;color:var(--muted);align-items:center}
  .legend i{width:10px;height:10px;display:inline-block;margin-right:6px;vertical-align:middle}

  /* Donut legend */
  .dl-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid rgba(139,139,184,.2)}
  .dl-row:last-child{border-bottom:none}
  .dl-name{display:flex;align-items:center;gap:8px;font-family:var(--px);font-size:9px}
  .dl-name i{width:10px;height:10px;display:inline-block}
  .dl-val{font-size:20px}

  /* Leaderboard table */
  .tablewrap{padding:12px 16px 8px}
  table{width:100%;border-collapse:collapse}
  thead th{text-align:left;font-family:var(--px);font-size:9px;color:var(--muted);padding:8px 8px;border-bottom:2px solid rgba(139,139,184,.35)}
  tbody td{font-size:20px;padding:7px 8px;border-bottom:1px solid rgba(139,139,184,.18)}
  tbody tr:last-child td{border-bottom:none}
  td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
  .rank{font-family:var(--px);font-size:10px;color:var(--yell)}
  .g-lime{color:var(--lime)}
  .g-mag{color:var(--mag)}
  .g-cyan{color:var(--cyan)}
  .g-yell{color:var(--yell)}
  .pos{color:var(--lime)}
  .neg{color:var(--mag)}
</style>
</head>
<body>
  <div class="app">
    <!-- Header -->
    <header>
      <div class="brand">
        <div class="logo">PX</div>
        <div>
          <h1>PIXEL ARCADE OPS</h1>
          <p>SECTOR 7 NETWORK · CABINET TELEMETRY</p>
        </div>
      </div>
      <div class="controls">
        <div class="ctl pb-mut">P1 · ALL CABINETS ▼</div>
        <div class="ctl pb-mut">LAST 24 HOURS ▼</div>
        <div class="coin pb-yell">INSERT COIN</div>
      </div>
    </header>

    <!-- HIGH SCORE KPI row -->
    <div class="kpis">
      <div class="pix pb-lime kpi">
        <div class="lbl">PLAYERS ONLINE</div>
        <div class="val">48,213</div>
        <div class="delta up">▲ 12.4% VS YESTERDAY</div>
        <div class="blocks bc-lime"><i style="height:16px"></i><i style="height:25px"></i><i style="height:16px"></i><i style="height:25px"></i><i style="height:34px"></i><i style="height:25px"></i><i style="height:34px"></i><i style="height:34px"></i></div>
      </div>
      <div class="pix pb-cyan kpi">
        <div class="lbl">SESSIONS TODAY</div>
        <div class="val">291,808</div>
        <div class="delta up">▲ 8.7% VS YESTERDAY</div>
        <div class="blocks bc-cyan"><i style="height:7px"></i><i style="height:16px"></i><i style="height:16px"></i><i style="height:25px"></i><i style="height:25px"></i><i style="height:34px"></i><i style="height:25px"></i><i style="height:34px"></i></div>
      </div>
      <div class="pix pb-yell kpi">
        <div class="lbl">COIN REVENUE</div>
        <div class="val">$84,520</div>
        <div class="delta up">▲ 5.2% VS YESTERDAY</div>
        <div class="blocks bc-yell"><i style="height:16px"></i><i style="height:7px"></i><i style="height:16px"></i><i style="height:25px"></i><i style="height:16px"></i><i style="height:25px"></i><i style="height:34px"></i><i style="height:25px"></i></div>
      </div>
      <div class="pix pb-mag kpi">
        <div class="lbl">AVG SESSION</div>
        <div class="val">24:36</div>
        <div class="delta down">▼ 3.1% VS YESTERDAY</div>
        <div class="blocks bc-mag"><i style="height:34px"></i><i style="height:25px"></i><i style="height:34px"></i><i style="height:25px"></i><i style="height:16px"></i><i style="height:25px"></i><i style="height:16px"></i><i style="height:7px"></i></div>
      </div>
    </div>

    <!-- Charts -->
    <div class="charts">
      <div class="pix pb-cyan panel">
        <div class="p-head">
          <div>
            <div class="p-title" style="color:var(--cyan)">PLAYERS ONLINE — 24 HR</div>
            <div class="p-sub">ALL CABINETS · 60 MIN STEPS</div>
          </div>
          <div class="legend">
            <span><i style="background:var(--lime)"></i>TODAY</span>
            <span><i style="background:var(--cyan)"></i>YESTERDAY</span>
          </div>
        </div>
        <svg viewBox="0 0 760 250" width="100%" height="100%" preserveAspectRatio="none" style="display:block;flex:1;min-height:0">
          <!-- gridlines -->
          <g stroke="rgba(139,139,184,.18)" stroke-width="1">
            <line x1="0" y1="30" x2="760" y2="30"/>
            <line x1="0" y1="75" x2="760" y2="75"/>
            <line x1="0" y1="120" x2="760" y2="120"/>
            <line x1="0" y1="165" x2="760" y2="165"/>
            <line x1="0" y1="210" x2="760" y2="210"/>
          </g>
          <!-- stepped pixel lines: horizontal/vertical segments only -->
          <path d="M0,200 H60 V186 H120 V192 H180 V168 H240 V174 H300 V150 H360 V156 H420 V134 H480 V140 H540 V118 H600 V124 H660 V104 H720 V110 H760" fill="none" stroke="#4FE3FF" stroke-width="3" stroke-linejoin="miter" shape-rendering="crispEdges"/>
          <path d="M0,190 H48 V172 H96 V178 H144 V150 H192 V158 H240 V128 H288 V136 H336 V108 H384 V96 H432 V102 H480 V78 H528 V84 H576 V64 H624 V70 H672 V52 H720 V58 H760" fill="none" stroke="#7CFF4F" stroke-width="3" stroke-linejoin="miter" shape-rendering="crispEdges"/>
          <!-- x labels -->
          <g fill="#8B8BB8" font-family="VT323,monospace" font-size="16">
            <text x="2" y="234">00:00</text>
            <text x="126" y="234" text-anchor="middle">04:00</text>
            <text x="252" y="234" text-anchor="middle">08:00</text>
            <text x="378" y="234" text-anchor="middle">12:00</text>
            <text x="504" y="234" text-anchor="middle">16:00</text>
            <text x="630" y="234" text-anchor="middle">20:00</text>
            <text x="758" y="234" text-anchor="end">24:00</text>
          </g>
        </svg>
      </div>

      <div class="pix pb-mag panel">
        <div class="p-head">
          <div>
            <div class="p-title" style="color:var(--mag)">GENRE MIX</div>
            <div class="p-sub">SESSIONS BY GENRE</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;flex:1;min-height:0">
          <svg viewBox="0 0 200 200" width="164" height="164" shape-rendering="crispEdges">
            <!-- donut ring: 28 square ticks at r=80 — 10 lime / 7 magenta / 6 cyan / 5 yellow = 36/25/21/18% -->
            <g transform="translate(100,100)">
              <g fill="#7CFF4F">
                <rect x="-5" y="-88" width="10" height="16"/><rect x="-5" y="-88" width="10" height="16" transform="rotate(12.86)"/><rect x="-5" y="-88" width="10" height="16" transform="rotate(25.71)"/><rect x="-5" y="-88" width="10" height="16" transform="rotate(38.57)"/><rect x="-5" y="-88" width="10" height="16" transform="rotate(51.43)"/>
                <rect x="-5" y="-88" width="10" height="16" transform="rotate(64.29)"/><rect x="-5" y="-88" width="10" height="16" transform="rotate(77.14)"/><rect x="-5" y="-88" width="10" height="16" transform="rotate(90)"/><rect x="-5" y="-88" width="10" height="16" transform="rotate(102.86)"/><rect x="-5" y="-88" width="10" height="16" transform="rotate(115.71)"/>
              </g>
              <g fill="#FF4FD8">
                <rect x="-5" y="-88" width="10" height="16" transform="rotate(128.57)"/><rect x="-5" y="-88" width="10" height="16" transform="rotate(141.43)"/><rect x="-5" y="-88" width="10" height="16" transform="rotate(154.29)"/><rect x="-5" y="-88" width="10" height="16" transform="rotate(167.14)"/>
                <rect x="-5" y="-88" width="10" height="16" transform="rotate(180)"/><rect x="-5" y="-88" width="10" height="16" transform="rotate(192.86)"/><rect x="-5" y="-88" width="10" height="16" transform="rotate(205.71)"/>
              </g>
              <g fill="#4FE3FF">
                <rect x="-5" y="-88" width="10" height="16" transform="rotate(218.57)"/><rect x="-5" y="-88" width="10" height="16" transform="rotate(231.43)"/><rect x="-5" y="-88" width="10" height="16" transform="rotate(244.29)"/>
                <rect x="-5" y="-88" width="10" height="16" transform="rotate(257.14)"/><rect x="-5" y="-88" width="10" height="16" transform="rotate(270)"/><rect x="-5" y="-88" width="10" height="16" transform="rotate(282.86)"/>
              </g>
              <g fill="#FFE44F">
                <rect x="-5" y="-88" width="10" height="16" transform="rotate(295.71)"/><rect x="-5" y="-88" width="10" height="16" transform="rotate(308.57)"/><rect x="-5" y="-88" width="10" height="16" transform="rotate(321.43)"/>
                <rect x="-5" y="-88" width="10" height="16" transform="rotate(334.29)"/><rect x="-5" y="-88" width="10" height="16" transform="rotate(347.14)"/>
              </g>
            </g>
            <text x="100" y="102" text-anchor="middle" font-family="VT323,monospace" font-size="30" fill="#E8E8FF">291K</text>
            <text x="100" y="120" text-anchor="middle" font-family="Press Start 2P,monospace" font-size="9" fill="#8B8BB8">SESSIONS</text>
          </svg>
          <div style="width:100%;margin-top:8px">
            <div class="dl-row"><span class="dl-name"><i style="background:var(--lime)"></i>ACTION</span><span class="dl-val">36%</span></div>
            <div class="dl-row"><span class="dl-name"><i style="background:var(--mag)"></i>RPG</span><span class="dl-val">25%</span></div>
            <div class="dl-row"><span class="dl-name"><i style="background:var(--cyan)"></i>RACING</span><span class="dl-val">21%</span></div>
            <div class="dl-row"><span class="dl-name"><i style="background:var(--yell)"></i>PUZZLE</span><span class="dl-val">18%</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Leaderboard table -->
    <div class="pix pb-yell tablewrap">
      <div class="p-head" style="margin-bottom:2px">
        <div class="p-title" style="color:var(--yell)">TOP GAMES — LEADERBOARD</div>
        <div class="p-sub" style="margin-top:0">REVENUE · 24 HR</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>RANK</th>
            <th>GAME</th>
            <th>GENRE</th>
            <th class="num">PLAYERS</th>
            <th class="num">REVENUE</th>
            <th class="num">24H Δ</th>
          </tr>
        </thead>
        <tbody>
          <tr><td class="rank">01</td><td>NEON RAIDERS</td><td class="g-lime">ACTION</td><td class="num">12,480</td><td class="num">$18,220</td><td class="num pos">+14.2%</td></tr>
          <tr><td class="rank">02</td><td>MECH BRIGADE</td><td class="g-lime">ACTION</td><td class="num">10,155</td><td class="num">$15,840</td><td class="num pos">+6.8%</td></tr>
          <tr><td class="rank">03</td><td>STAR COURIER</td><td class="g-cyan">RACING</td><td class="num">8,921</td><td class="num">$12,300</td><td class="num neg">−2.4%</td></tr>
          <tr><td class="rank">04</td><td>DUNGEON BYTES</td><td class="g-mag">RPG</td><td class="num">7,660</td><td class="num">$11,150</td><td class="num pos">+9.1%</td></tr>
          <tr><td class="rank">05</td><td>BLOCK PUZZLER</td><td class="g-yell">PUZZLE</td><td class="num">6,204</td><td class="num">$8,480</td><td class="num pos">+1.7%</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
```
