---
name: midnight-neon
description: >-
  This "Midnight Neon" dashboard uses a deep navy base (#070b1f / #0c1230) with elevated card panels (#101739) bordered by translucent cyan/magenta strokes (rgba(34,211,238,.25)) and soft outer glows (box-shadow with neon halos). The accent palette pairs neon cyan (#22d3ee) with magenta (#f0abfc / #e879f9) plus supporting teal (#2dd4bf) and a warning amber (#fbbf24); primary text is near-white (#e8edff) with muted slate (#7e88b8) for labels. Headings use "Space Grotesk" with a system sans-serif fallback stack, while body/data text uses the same family at lighter weights; layout is a fixed 1440×900 grid with a top header bar, a 4-column KPI row, a 2/3 + 1/3 chart row, and a full-width data table beneath. Charts are inline SVG with glowing 2px stroke lines, gradient area fills fading from cyan to transparent, rounded neon bar columns, and a magenta/cyan donut — all rendered with subtle drop-shadow filters to simulate neon glow. The overall aesthetic is sleek cyberpunk: dark, high-contrast, electric, with generous rounded corners (12–16px), tight 24px gutters, and a luminous tech-control-room feel.
---

# Midnight Neon

This "Midnight Neon" dashboard uses a deep navy base (#070b1f / #0c1230) with elevated card panels (#101739) bordered by translucent cyan/magenta strokes (rgba(34,211,238,.25)) and soft outer glows (box-shadow with neon halos). The accent palette pairs neon cyan (#22d3ee) with magenta (#f0abfc / #e879f9) plus supporting teal (#2dd4bf) and a warning amber (#fbbf24); primary text is near-white (#e8edff) with muted slate (#7e88b8) for labels. Headings use "Space Grotesk" with a system sans-serif fallback stack, while body/data text uses the same family at lighter weights; layout is a fixed 1440×900 grid with a top header bar, a 4-column KPI row, a 2/3 + 1/3 chart row, and a full-width data table beneath. Charts are inline SVG with glowing 2px stroke lines, gradient area fills fading from cyan to transparent, rounded neon bar columns, and a magenta/cyan donut — all rendered with subtle drop-shadow filters to simulate neon glow. The overall aesthetic is sleek cyberpunk: dark, high-contrast, electric, with generous rounded corners (12–16px), tight 24px gutters, and a luminous tech-control-room feel.

## Source Code

A self-contained reference implementation of the "Midnight Neon" dashboard
preview. Use it as the visual target — translate the palette, typography, and
layout into the data-visualization React + Tailwind + Recharts app.
The fixed 1440×900 frame and hand-drawn inline-SVG charts below are
preview-rendering artifacts — keep the generated app's layout responsive
and build every chart with Recharts.

Responsive adaptation: On this midnight-neon dashboard, KPI cards should reflow via auto-fit minmax (≈200–240px) so they go 4→3→2→1 fluidly rather than stepping at hard breakpoints, and the 2fr/1fr chart+donut split should stack below ~1024px with the donut scaling up to fill its new full-width card. All chart SVGs must keep their natural aspect ratio (aspect-ratio in CSS, no preserveAspectRatio=none) and the data table must stay inside an overflow-x:auto wrapper with nowrap cells and a sensible min-width so status pills remain readable on 360px phones. Above ~1600px, cap card inner content and use auto-fit grids to prevent skeleton labels from floating in oceans of empty neon panel.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1440, initial-scale=1">
<title>Midnight Neon — Analytics</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#070b1f; --bg2:#0c1230; --panel:#101739; --panel2:#0d1330;
    --cyan:#22d3ee; --mag:#e879f9; --magl:#f0abfc; --teal:#2dd4bf; --amber:#fbbf24;
    --text:#e8edff; --muted:#7e88b8; --line:rgba(34,211,238,.22);
    --font:"Space Grotesk","Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  }
  *{box-sizing:border-box}
  html,body{margin:0}
  body{
    width:1440px;height:900px;overflow:hidden;
    font-family:var(--font);color:var(--text);
    background:
      radial-gradient(900px 500px at 12% -10%, rgba(34,211,238,.10), transparent 60%),
      radial-gradient(800px 480px at 100% 0%, rgba(232,121,249,.10), transparent 55%),
      var(--bg);
  }
  .app{padding:22px 28px;height:900px;display:flex;flex-direction:column;gap:18px}

  /* Header */
  header{display:flex;align-items:center;justify-content:space-between}
  .brand{display:flex;align-items:center;gap:14px}
  .logo{width:42px;height:42px;border-radius:12px;
    background:linear-gradient(135deg,var(--cyan),var(--mag));
    display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;color:#06091a;
    box-shadow:0 0 18px rgba(34,211,238,.5),0 0 28px rgba(232,121,249,.3)}
  .brand h1{font-size:20px;margin:0;letter-spacing:.5px}
  .brand p{margin:2px 0 0;font-size:12px;color:var(--muted)}
  .controls{display:flex;gap:10px;align-items:center}
  .ctl{background:var(--panel);border:1px solid var(--line);border-radius:10px;
    padding:9px 14px;font-size:13px;color:var(--text);display:flex;align-items:center;gap:8px}
  .ctl .dot{width:7px;height:7px;border-radius:50%;background:var(--cyan);box-shadow:0 0 8px var(--cyan)}
  .ctl.alt{background:linear-gradient(135deg,rgba(34,211,238,.18),rgba(232,121,249,.18));
    border-color:rgba(232,121,249,.4);color:#fff;font-weight:600}
  .chev{color:var(--muted);font-size:10px}

  /* KPI row */
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
  .card{background:linear-gradient(180deg,var(--panel),var(--panel2));
    border:1px solid var(--line);border-radius:14px;padding:18px;
    box-shadow:0 0 0 1px rgba(255,255,255,.02),0 14px 30px rgba(0,0,0,.4)}
  .kpi .lbl{font-size:12px;color:var(--muted);letter-spacing:.6px;text-transform:uppercase}
  .kpi .val{font-size:30px;font-weight:700;margin:8px 0 6px;letter-spacing:.5px}
  .delta{font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:5px;
    padding:3px 9px;border-radius:20px}
  .up{color:var(--teal);background:rgba(45,212,191,.12)}
  .down{color:var(--magl);background:rgba(232,121,249,.12)}
  .spark{margin-top:12px}

  /* Charts */
  .row{display:grid;grid-template-columns:2fr 1fr;gap:18px}
  .panel-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
  .panel-title h2{font-size:15px;margin:0;font-weight:600}
  .panel-title .sub{font-size:11px;color:var(--muted)}
  .legend{display:flex;gap:14px;font-size:11px;color:var(--muted)}
  .legend i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:5px;vertical-align:middle}

  /* Bottom */
  .bottom{display:grid;grid-template-columns:1.4fr 1fr;gap:18px;flex:1;min-height:0}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{text-align:left;color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.6px;
    padding:8px 10px;border-bottom:1px solid var(--line)}
  td{padding:10px;border-bottom:1px solid rgba(255,255,255,.05)}
  tr:last-child td{border-bottom:none}
  .pill{font-size:11px;padding:3px 9px;border-radius:20px;font-weight:600}
  .ok{color:var(--teal);background:rgba(45,212,191,.12)}
  .warn{color:var(--amber);background:rgba(251,191,36,.12)}
  .crit{color:var(--magl);background:rgba(232,121,249,.14)}
  .mono{color:var(--cyan)}
  .barlist{display:flex;flex-direction:column;gap:14px;margin-top:6px}
  .barrow{display:flex;align-items:center;gap:12px;font-size:12px}
  .barrow .name{width:90px;color:var(--muted)}
  .track{flex:1;height:9px;background:rgba(255,255,255,.05);border-radius:6px;overflow:hidden}
  .fill{height:100%;border-radius:6px;background:linear-gradient(90deg,var(--cyan),var(--mag));
    box-shadow:0 0 10px rgba(34,211,238,.5)}
  .barrow .pct{width:42px;text-align:right;color:var(--text);font-weight:600}
</style>
</head>
<body>
<div class="app">

  <!-- Header -->
  <header>
    <div class="brand">
      <div class="logo">N</div>
      <div>
        <h1>NEONGRID · Analytics</h1>
        <p>Realtime product intelligence</p>
      </div>
    </div>
    <div class="controls">
      <div class="ctl"><span class="dot"></span>Live</div>
      <div class="ctl">All Regions <span class="chev">▼</span></div>
      <div class="ctl">Jan 1 – Jun 30, 2024 <span class="chev">▼</span></div>
      <div class="ctl alt">Export Report</div>
    </div>
  </header>

  <!-- KPIs -->
  <section class="kpis">
    <div class="card kpi">
      <div class="lbl">Total Revenue</div>
      <div class="val">$2.84M</div>
      <span class="delta up">▲ 12.4%</span>
      <svg class="spark" width="100%" height="34" viewBox="0 0 220 34" preserveAspectRatio="none">
        <polyline fill="none" stroke="#22d3ee" stroke-width="2" points="0,28 30,22 60,24 90,14 120,18 150,9 180,12 220,4"/>
      </svg>
    </div>
    <div class="card kpi">
      <div class="lbl">Active Users</div>
      <div class="val">84,219</div>
      <span class="delta up">▲ 8.1%</span>
      <svg class="spark" width="100%" height="34" viewBox="0 0 220 34" preserveAspectRatio="none">
        <polyline fill="none" stroke="#2dd4bf" stroke-width="2" points="0,20 30,24 60,16 90,18 120,12 150,16 180,8 220,10"/>
      </svg>
    </div>
    <div class="card kpi">
      <div class="lbl">Conversion</div>
      <div class="val">4.62%</div>
      <span class="delta down">▼ 1.3%</span>
      <svg class="spark" width="100%" height="34" viewBox="0 0 220 34" preserveAspectRatio="none">
        <polyline fill="none" stroke="#e879f9" stroke-width="2" points="0,8 30,12 60,10 90,16 120,14 150,20 180,18 220,24"/>
      </svg>
    </div>
    <div class="card kpi">
      <div class="lbl">MRR</div>
      <div class="val">$472K</div>
      <span class="delta up">▲ 5.9%</span>
      <svg class="spark" width="100%" height="34" viewBox="0 0 220 34" preserveAspectRatio="none">
        <polyline fill="none" stroke="#22d3ee" stroke-width="2" points="0,26 30,20 60,22 90,16 120,12 150,14 180,7 220,6"/>
      </svg>
    </div>
  </section>

  <!-- Charts row -->
  <section class="row">
    <div class="card">
      <div class="panel-title">
        <div><h2>Revenue vs. Target</h2><div class="sub">Monthly · USD</div></div>
        <div class="legend"><span><i style="background:#22d3ee"></i>Revenue</span><span><i style="background:#e879f9"></i>Target</span></div>
      </div>
      <svg width="100%" height="270" viewBox="0 0 820 270" preserveAspectRatio="none">
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.45"/>
            <stop offset="100%" stop-color="#22d3ee" stop-opacity="0"/>
          </linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <!-- grid -->
        <g stroke="rgba(255,255,255,.06)" stroke-width="1">
          <line x1="0" y1="40" x2="820" y2="40"/><line x1="0" y1="100" x2="820" y2="100"/>
          <line x1="0" y1="160" x2="820" y2="160"/><line x1="0" y1="220" x2="820" y2="220"/>
        </g>
        <!-- area -->
        <path d="M0,200 L80,180 L160,190 L240,150 L320,160 L400,120 L480,130 L560,90 L640,100 L720,60 L820,70 L820,270 L0,270 Z" fill="url(#area)"/>
        <!-- revenue line -->
        <polyline fill="none" stroke="#22d3ee" stroke-width="2.5" filter="url(#glow)"
          points="0,200 80,180 160,190 240,150 320,160 400,120 480,130 560,90 640,100 720,60 820,70"/>
        <!-- target line -->
        <polyline fill="none" stroke="#e879f9" stroke-width="2" stroke-dasharray="6 5"
          points="0,210 80,195 160,180 240,165 320,150 400,135 480,120 560,108 640,95 720,82 820,72"/>
        <g fill="#22d3ee">
          <circle cx="400" cy="120" r="3.5"/><circle cx="560" cy="90" r="3.5"/><circle cx="720" cy="60" r="3.5"/>
        </g>
        <g fill="#7e88b8" font-size="11" font-family="Space Grotesk">
          <text x="0" y="262">Jan</text><text x="130" y="262">Feb</text><text x="260" y="262">Mar</text>
          <text x="390" y="262">Apr</text><text x="520" y="262">May</text><text x="650" y="262">Jun</text><text x="780" y="262">Jul</text>
        </g>
      </svg>
    </div>

    <div class="card">
      <div class="panel-title">
        <div><h2>Traffic Mix</h2><div class="sub">By channel</div></div>
      </div>
      <svg width="100%" height="210" viewBox="0 0 220 210">
        <defs><filter id="g2"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        <g transform="translate(110,105)" filter="url(#g2)" fill="none" stroke-width="22">
          <!-- donut segments via stroke-dasharray on circle r=70 circ≈439.8 -->
          <circle r="70" stroke="#22d3ee" stroke-dasharray="158 282" transform="rotate(-90)"/>
          <circle r="70" stroke="#e879f9" stroke-dasharray="110 330" stroke-dashoffset="-158" transform="rotate(-90)"/>
          <circle r="70" stroke="#2dd4bf" stroke-dasharray="92 348" stroke-dashoffset="-268" transform="rotate(-90)"/>
          <circle r="70" stroke="#fbbf24" stroke-dasharray="80 360" stroke-dashoffset="-360" transform="rotate(-90)"/>
        </g>
        <text x="110" y="100" text-anchor="middle" fill="#e8edff" font-size="26" font-weight="700">84K</text>
        <text x="110" y="120" text-anchor="middle" fill="#7e88b8" font-size="11">sessions</text>
      </svg>
      <div class="barlist" style="margin-top:4px">
        <div class="barrow"><span class="name">Organic</span><span class="pct" style="color:#22d3ee">36%</span></div>
        <div class="barrow"><span class="name">Paid</span><span class="pct" style="color:#e879f9">25%</span></div>
        <div class="barrow"><span class="name">Social</span><span class="pct" style="color:#2dd4bf">21%</span></div>
        <div class="barrow"><span class="name">Referral</span><span class="pct" style="color:#fbbf24">18%</span></div>
      </div>
    </div>
  </section>

  <!-- Bottom -->
  <section class="bottom">
    <div class="card">
      <div class="panel-title"><div><h2>Top Products</h2><div class="sub">Last 30 days</div></div></div>
      <table>
        <thead><tr><th>Product</th><th>Plan</th><th>Revenue</th><th>Users</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>Quantum Core</td><td>Enterprise</td><td class="mono">$412,900</td><td>1,204</td><td><span class="pill ok">Healthy</span></td></tr>
          <tr><td>Neon Pipeline</td><td>Pro</td><td class="mono">$318,440</td><td>3,981</td><td><span class="pill ok">Healthy</span></td></tr>
          <tr><td>Pulse Analytics</td><td>Pro</td><td class="mono">$201,770</td><td>2,560</td><td><span class="pill warn">Watch</span></td></tr>
          <tr><td>Vector Sync</td><td>Team</td><td class="mono">$154,300</td><td>5,118</td><td><span class="pill ok">Healthy</span></td></tr>
          <tr><td>Cipher Vault</td><td>Starter</td><td class="mono">$88,610</td><td>9,402</td><td><span class="pill crit">At Risk</span></td></tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <div class="panel-title"><div><h2>Weekly Signups</h2><div class="sub">New accounts</div></div></div>
      <svg width="100%" height="190" viewBox="0 0 360 190" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#22d3ee"/><stop offset="100%" stop-color="#e879f9"/>
          </linearGradient>
          <filter id="g3"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <g fill="url(#bar)" filter="url(#g3)">
          <rect x="10" y="90" width="32" height="80" rx="6"/>
          <rect x="60" y="60" width="32" height="110" rx="6"/>
          <rect x="110" y="100" width="32" height="70" rx="6"/>
          <rect x="160" y="40" width="32" height="130" rx="6"/>
          <rect x="210" y="70" width="32" height="100" rx="6"/>
          <rect x="260" y="30" width="32" height="140" rx="6"/>
          <rect x="310" y="55" width="32" height="115" rx="6"/>
        </g>
        <g fill="#7e88b8" font-size="10" font-family="Space Grotesk">
          <text x="16" y="184">W1</text><text x="66" y="184">W2</text><text x="116" y="184">W3</text>
          <text x="166" y="184">W4</text><text x="216" y="184">W5</text><text x="266" y="184">W6</text><text x="316" y="184">W7</text>
        </g>
      </svg>
    </div>
  </section>
</div>

<!-- inline bar fills -->
<svg width="0" height="0"></svg>
<script>
/* purely decorative: set widths via style attribute fallback (no external) */
</script>
<style>
  .barrow:nth-child(1) .name::after,.barrow:nth-child(2) .name::after{}
</style>
</body>
</html>
```
