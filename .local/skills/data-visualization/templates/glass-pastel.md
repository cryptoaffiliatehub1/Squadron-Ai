---
name: glass-pastel
description: >-
  This "Glass Pastel" dashboard sits on a soft diagonal gradient flowing from lavender (#e9e3ff) through periwinkle (#dfe7ff) to mint (#dcf7ec), accented by blurred floating orbs in #c5b3ff and #a8f0d0. All cards use frosted glassmorphism: translucent white fills (rgba(255,255,255,0.55)) with backdrop-filter blur(18px), 1px solid rgba(255,255,255,0.7) borders, border-radius 24px (rounded-2xl), and soft drops shadows (0 8px 32px rgba(120,110,180,0.15)). Typography uses 'Plus Jakarta Sans' with system-ui/-apple-system fallbacks; headings are 600–700 weight in slate #3a3550, secondary text in muted lavender-grey #8a82a8. Layout is a fixed 1440×900 grid: a top header bar with app name and pill-shaped filter controls, a row of four KPI cards, then a two-column body with a large multi-hue area/line chart (gradients in violet #9b8cff, mint #5fd9b0, pink #f0a6d8) plus a bar chart, and a right column with a donut chart and a compact striped data table. Charts are inline SVG with smooth curves, soft gradient fills, thin strokes, and pastel multi-hue palettes for an airy, calm, premium analytics feel.
---

# Glass Pastel

This "Glass Pastel" dashboard sits on a soft diagonal gradient flowing from lavender (#e9e3ff) through periwinkle (#dfe7ff) to mint (#dcf7ec), accented by blurred floating orbs in #c5b3ff and #a8f0d0. All cards use frosted glassmorphism: translucent white fills (rgba(255,255,255,0.55)) with backdrop-filter blur(18px), 1px solid rgba(255,255,255,0.7) borders, border-radius 24px (rounded-2xl), and soft drops shadows (0 8px 32px rgba(120,110,180,0.15)). Typography uses 'Plus Jakarta Sans' with system-ui/-apple-system fallbacks; headings are 600–700 weight in slate #3a3550, secondary text in muted lavender-grey #8a82a8. Layout is a fixed 1440×900 grid: a top header bar with app name and pill-shaped filter controls, a row of four KPI cards, then a two-column body with a large multi-hue area/line chart (gradients in violet #9b8cff, mint #5fd9b0, pink #f0a6d8) plus a bar chart, and a right column with a donut chart and a compact striped data table. Charts are inline SVG with smooth curves, soft gradient fills, thin strokes, and pastel multi-hue palettes for an airy, calm, premium analytics feel.

## Source Code

A self-contained reference implementation of the "Glass Pastel" dashboard
preview. Use it as the visual target — translate the palette, typography, and
layout into the data-visualization React + Tailwind + Recharts app.
The fixed 1440×900 frame and hand-drawn inline-SVG charts below are
preview-rendering artifacts — keep the generated app's layout responsive
and build every chart with Recharts.

Responsive adaptation: This glass-pastel dashboard should adapt fluidly rather than via hard breakpoints: KPI cards collapse 4→3→2→1 using auto-fit minmax(220px,1fr), the two-column body stacks below ~1024px, and the bar+donut split stacks below ~720px with the donut ring and gauge shrinking via clamp() + aspect-ratio. The skeleton table should scroll horizontally inside its glass panel on phones (never squash columns to unreadable widths), decorative blurred orbs must scale with viewport and be clipped by overflow-x:hidden, and outer padding plus max-width should expand with clamp() up to ~1600px so ultra-wide screens don't leave the content looking like a thin ribbon.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1440, initial-scale=1">
<title>Lumina Analytics</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root{
    --violet:#9b8cff;
    --mint:#5fd9b0;
    --pink:#f0a6d8;
    --slate:#3a3550;
    --muted:#8a82a8;
    --glass:rgba(255,255,255,0.55);
    --glass-strong:rgba(255,255,255,0.72);
    --border:rgba(255,255,255,0.7);
  }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{
    width:1440px;height:900px;overflow:hidden;
    font-family:'Plus Jakarta Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
    color:var(--slate);
    background:linear-gradient(135deg,#e9e3ff 0%,#dfe7ff 45%,#dcf7ec 100%);
    position:relative;
  }
  .orb{position:absolute;border-radius:50%;filter:blur(60px);opacity:.55;z-index:0}
  .orb1{width:380px;height:380px;background:#c5b3ff;top:-120px;left:-80px}
  .orb2{width:340px;height:340px;background:#a8f0d0;bottom:-120px;right:120px}
  .orb3{width:260px;height:260px;background:#f0a6d8;top:200px;right:-60px;opacity:.4}
  .app{position:relative;z-index:1;padding:24px 32px;height:100%;display:flex;flex-direction:column;gap:20px}

  /* header */
  header{display:flex;align-items:center;justify-content:space-between}
  .brand{display:flex;align-items:center;gap:14px}
  .logo{width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,var(--violet),var(--mint));display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(120,110,180,.3)}
  .brand h1{font-size:21px;font-weight:800;margin:0;letter-spacing:-.5px}
  .brand p{margin:0;font-size:12.5px;color:var(--muted);font-weight:500}
  .controls{display:flex;gap:12px;align-items:center}
  .pill{background:var(--glass);border:1px solid var(--border);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
    padding:10px 16px;border-radius:14px;font-size:13px;font-weight:600;color:var(--slate);display:flex;align-items:center;gap:8px;cursor:pointer;box-shadow:0 4px 14px rgba(120,110,180,.1)}
  .pill .dot{width:8px;height:8px;border-radius:50%;background:var(--mint)}
  .pill.primary{background:linear-gradient(135deg,var(--violet),#b7a8ff);color:#fff;border:none}
  .avatar{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,var(--pink),var(--violet));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;box-shadow:0 4px 14px rgba(120,110,180,.25)}

  .card{background:var(--glass);border:1px solid var(--border);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
    border-radius:24px;box-shadow:0 8px 32px rgba(120,110,180,.15)}

  /* KPI */
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
  .kpi{padding:20px 22px;display:flex;flex-direction:column;gap:10px}
  .kpi .top{display:flex;align-items:center;justify-content:space-between}
  .kpi .label{font-size:13px;color:var(--muted);font-weight:600}
  .kpi .ico{width:34px;height:34px;border-radius:11px;display:flex;align-items:center;justify-content:center}
  .kpi .val{font-size:28px;font-weight:800;letter-spacing:-1px}
  .delta{font-size:12.5px;font-weight:700;display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;width:fit-content}
  .up{background:rgba(95,217,176,.2);color:#1f9e74}
  .down{background:rgba(240,166,216,.25);color:#c44d97}
  .spark{margin-top:2px}

  /* body grid */
  .body{display:grid;grid-template-columns:1.55fr 1fr;gap:18px;flex:1;min-height:0}
  .colL{display:flex;flex-direction:column;gap:18px;min-height:0}
  .colR{display:flex;flex-direction:column;gap:18px;min-height:0}
  .panel{padding:20px 22px;display:flex;flex-direction:column;min-height:0}
  .phead{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
  .phead h3{margin:0;font-size:15px;font-weight:700}
  .phead .sub{font-size:12px;color:var(--muted);font-weight:500}
  .legend{display:flex;gap:14px;font-size:11.5px;color:var(--muted);font-weight:600}
  .legend span{display:flex;align-items:center;gap:5px}
  .lg{width:9px;height:9px;border-radius:3px}

  .charts2{display:grid;grid-template-columns:1.2fr 1fr;gap:18px;flex:1;min-height:0}

  table{width:100%;border-collapse:collapse;font-size:12.5px}
  th{text-align:left;color:var(--muted);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.5px;padding:8px 6px}
  td{padding:9px 6px;font-weight:600;color:var(--slate)}
  tbody tr:nth-child(even){background:rgba(255,255,255,.4)}
  tbody tr{border-radius:8px}
  .tag{font-size:11px;padding:3px 9px;border-radius:20px;font-weight:700}
  .t-up{background:rgba(95,217,176,.2);color:#1f9e74}
  .t-down{background:rgba(240,166,216,.25);color:#c44d97}
  .uname{display:flex;align-items:center;gap:9px}
  .udot{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700}
</style>
</head>
<body>
  <div class="orb orb1"></div><div class="orb orb2"></div><div class="orb orb3"></div>
  <div class="app">

    <header>
      <div class="brand">
        <div class="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 16l4-6 4 3 5-8" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="20" cy="6" r="2.2" fill="#fff"/></svg>
        </div>
        <div>
          <h1>Lumina Analytics</h1>
          <p>Growth overview · Workspace: Aurora</p>
        </div>
      </div>
      <div class="controls">
        <div class="pill"><span class="dot"></span>Live data</div>
        <div class="pill">📅 Jan 1 – Jun 30, 2024 ▾</div>
        <div class="pill primary">＋ New report</div>
        <div class="avatar">AL</div>
      </div>
    </header>

    <!-- KPIs -->
    <div class="kpis">
      <div class="card kpi">
        <div class="top">
          <span class="label">Total Revenue</span>
          <span class="ico" style="background:rgba(155,140,255,.2)">💰</span>
        </div>
        <div class="val">$284,910</div>
        <span class="delta up">▲ 12.4% vs last period</span>
        <svg class="spark" width="100%" height="26" viewBox="0 0 200 26" preserveAspectRatio="none"><polyline points="0,20 30,16 60,18 90,10 120,13 150,6 200,4" fill="none" stroke="#9b8cff" stroke-width="2.5" stroke-linecap="round"/></svg>
      </div>
      <div class="card kpi">
        <div class="top">
          <span class="label">Active Users</span>
          <span class="ico" style="background:rgba(95,217,176,.22)">👥</span>
        </div>
        <div class="val">48,219</div>
        <span class="delta up">▲ 8.1% vs last period</span>
        <svg class="spark" width="100%" height="26" viewBox="0 0 200 26" preserveAspectRatio="none"><polyline points="0,18 30,14 60,16 90,12 120,8 150,11 200,5" fill="none" stroke="#5fd9b0" stroke-width="2.5" stroke-linecap="round"/></svg>
      </div>
      <div class="card kpi">
        <div class="top">
          <span class="label">Conversion Rate</span>
          <span class="ico" style="background:rgba(240,166,216,.25)">🎯</span>
        </div>
        <div class="val">3.92%</div>
        <span class="delta down">▼ 0.4% vs last period</span>
        <svg class="spark" width="100%" height="26" viewBox="0 0 200 26" preserveAspectRatio="none"><polyline points="0,6 30,9 60,7 90,12 120,10 150,14 200,16" fill="none" stroke="#f0a6d8" stroke-width="2.5" stroke-linecap="round"/></svg>
      </div>
      <div class="card kpi">
        <div class="top">
          <span class="label">MRR</span>
          <span class="ico" style="background:rgba(155,140,255,.2)">📈</span>
        </div>
        <div class="val">$52,480</div>
        <span class="delta up">▲ 5.7% vs last period</span>
        <svg class="spark" width="100%" height="26" viewBox="0 0 200 26" preserveAspectRatio="none"><polyline points="0,18 30,15 60,13 90,14 120,9 150,7 200,6" fill="none" stroke="#9b8cff" stroke-width="2.5" stroke-linecap="round"/></svg>
      </div>
    </div>

    <!-- BODY -->
    <div class="body">
      <div class="colL">
        <!-- area chart -->
        <div class="card panel" style="flex:1.3">
          <div class="phead">
            <div><h3>Revenue & Users Trend</h3><div class="sub">Monthly performance · 2024</div></div>
            <div class="legend">
              <span><i class="lg" style="background:#9b8cff"></i>Revenue</span>
              <span><i class="lg" style="background:#5fd9b0"></i>Users</span>
            </div>
          </div>
          <svg width="100%" height="100%" viewBox="0 0 820 230" preserveAspectRatio="none" style="flex:1">
            <defs>
              <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9b8cff" stop-opacity=".45"/><stop offset="1" stop-color="#9b8cff" stop-opacity="0"/></linearGradient>
              <linearGradient id="gm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fd9b0" stop-opacity=".4"/><stop offset="1" stop-color="#5fd9b0" stop-opacity="0"/></linearGradient>
            </defs>
            <g stroke="rgba(138,130,168,.18)" stroke-width="1">
              <line x1="0" y1="40" x2="820" y2="40"/><line x1="0" y1="100" x2="820" y2="100"/><line x1="0" y1="160" x2="820" y2="160"/>
            </g>
            <path d="M0,150 C80,130 120,90 200,100 C280,110 320,60 400,70 C480,80 520,40 600,55 C680,68 740,30 820,38 L820,230 L0,230 Z" fill="url(#gv)"/>
            <path d="M0,150 C80,130 120,90 200,100 C280,110 320,60 400,70 C480,80 520,40 600,55 C680,68 740,30 820,38" fill="none" stroke="#9b8cff" stroke-width="3" stroke-linecap="round"/>
            <path d="M0,185 C80,170 120,160 200,150 C280,140 320,135 400,120 C480,105 520,115 600,100 C680,88 740,95 820,80 L820,230 L0,230 Z" fill="url(#gm)"/>
            <path d="M0,185 C80,170 120,160 200,150 C280,140 320,135 400,120 C480,105 520,115 600,100 C680,88 740,95 820,80" fill="none" stroke="#5fd9b0" stroke-width="3" stroke-linecap="round"/>
            <circle cx="600" cy="55" r="4.5" fill="#fff" stroke="#9b8cff" stroke-width="3"/>
          </svg>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);font-weight:600;margin-top:4px">
            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
          </div>
        </div>

        <!-- bar + donut row -->
        <div class="charts2">
          <div class="card panel">
            <div class="phead"><div><h3>Revenue by Channel</h3><div class="sub">Last 30 days</div></div></div>
            <svg width="100%" height="100%" viewBox="0 0 360 180" preserveAspectRatio="none" style="flex:1">
              <defs><linearGradient id="bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b7a8ff"/><stop offset="1" stop-color="#9b8cff"/></linearGradient></defs>
              <g>
                <rect x="20" y="60" width="38" height="100" rx="9" fill="url(#bar)"/>
                <rect x="78" y="40" width="38" height="120" rx="9" fill="#5fd9b0"/>
                <rect x="136" y="90" width="38" height="70" rx="9" fill="#f0a6d8"/>
                <rect x="194" y="70" width="38" height="90" rx="9" fill="url(#bar)"/>
                <rect x="252" y="105" width="38" height="55" rx="9" fill="#5fd9b0"/>
                <rect x="310" y="50" width="38" height="110" rx="9" fill="#f0a6d8"/>
              </g>
            </svg>
            <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--muted);font-weight:600">
              <span>Direct</span><span>Organic</span><span>Email</span><span>Social</span><span>Refer</span><span>Ads</span>
            </div>
          </div>

          <div class="card panel">
            <div class="phead"><div><h3>Plan Mix</h3><div class="sub">Active subscriptions</div></div></div>
            <div style="display:flex;align-items:center;gap:14px;flex:1">
              <svg width="120" height="120" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="15.9" fill="none" stroke="#ece8fb" stroke-width="7"/>
                <circle cx="21" cy="21" r="15.9" fill="none" stroke="#9b8cff" stroke-width="7" stroke-dasharray="48 52" stroke-dashoffset="25" stroke-linecap="round"/>
                <circle cx="21" cy="21" r="15.9" fill="none" stroke="#5fd9b0" stroke-width="7" stroke-dasharray="32 68" stroke-dashoffset="77" stroke-linecap="round"/>
                <circle cx="21" cy="21" r="15.9" fill="none" stroke="#f0a6d8" stroke-width="7" stroke-dasharray="20 80" stroke-dashoffset="109" stroke-linecap="round"/>
                <text x="21" y="20" text-anchor="middle" font-size="6" font-weight="800" fill="#3a3550">12.4k</text>
                <text x="21" y="26" text-anchor="middle" font-size="3" fill="#8a82a8">total</text>
              </svg>
              <div style="display:flex;flex-direction:column;gap:9px;font-size:12px;font-weight:600">
                <span style="display:flex;align-items:center;gap:7px"><i class="lg" style="background:#9b8cff"></i>Pro · 48%</span>
                <span style="display:flex;align-items:center;gap:7px"><i class="lg" style="background:#5fd9b0"></i>Team · 32%</span>
                <span style="display:flex;align-items:center;gap:7px"><i class="lg" style="background:#f0a6d8"></i>Free · 20%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- right column -->
      <div class="colR">
        <div class="card panel" style="flex:1">
          <div class="phead"><div><h3>Top Accounts</h3><div class="sub">By revenue contribution</div></div></div>
          <table>
            <thead><tr><th>Account</th><th>Plan</th><th>MRR</th><th>Trend</th></tr></thead>
            <tbody>
              <tr><td><div class="uname"><span class="udot" style="background:#9b8cff">NV</span>Novatek</div></td><td>Team</td><td>$8,420</td><td><span class="tag t-up">+14%</span></td></tr>
              <tr><td><div class="uname"><span class="udot" style="background:#5fd9b0">QB</span>Quantbase</div></td><td>Pro</td><td>$6,180</td><td><span class="tag t-up">+9%</span></td></tr>
              <tr><td><div class="uname"><span class="udot" style="background:#f0a6d8">HL</span>Helix Labs</div></td><td>Team</td><td>$5,940</td><td><span class="tag t-down">-3%</span></td></tr>
              <tr><td><div class="uname"><span class="udot" style="background:#b7a8ff">OR</span>Orbit Co</div></td><td>Pro</td><td>$4,710</td><td><span class="tag t-up">+22%</span></td></tr>
              <tr><td><div class="uname"><span class="udot" style="background:#5fd9b0">PX</span>Pixelary</div></td><td>Pro</td><td>$3,860</td><td><span class="tag t-up">+6%</span></td></tr>
              <tr><td><div class="uname"><span class="udot" style="background:#f0a6d8">MD</span>Meridian</div></td><td>Free</td><td>$2,540</td><td><span class="tag t-down">-1%</span></td></tr>
              <tr><td><div class="uname"><span class="udot" style="background:#9b8cff">VL</span>Velvet UI</div></td><td>Team</td><td>$2,190</td><td><span class="tag t-up">+11%</span></td></tr>
            </tbody>
          </table>
        </div>

        <div class="card panel" style="flex-direction:row;align-items:center;justify-content:space-between;gap:14px">
          <div>
            <div class="sub" style="margin-bottom:4px">Goal completion</div>
            <h3 style="margin:0;font-size:24px">87.5%</h3>
            <span class="delta up" style="margin-top:6px">▲ on track for Q2 target</span>
          </div>
          <svg width="120" height="60" viewBox="0 0 120 60">
            <path d="M10,55 A50,50 0 0 1 110,55" fill="none" stroke="#ece8fb" stroke-width="9" stroke-linecap="round"/>
            <path d="M10,55 A50,50 0 0 1 102,28" fill="none" stroke="#5fd9b0" stroke-width="9" stroke-linecap="round"/>
          </svg>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
```
