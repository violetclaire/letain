import puppeteer from "puppeteer-core";
import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import { dirname } from "path";
import { execSync } from "child_process";

const OUT = process.env.BRIEF_OUT ?? "attached_assets/briarwood-cdi-brief.pdf";

function resolveChromium(): string {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROMIUM_PATH,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }

  try {
    const found = execSync(
      "command -v chromium 2>/dev/null || command -v chromium-browser 2>/dev/null || command -v google-chrome 2>/dev/null",
      { encoding: "utf8" },
    ).trim();
    if (found && existsSync(found)) return found;
  } catch {}

  try {
    const nixCandidates = execSync("ls -d /nix/store/*chromium*/bin/chromium 2>/dev/null | head -1", {
      encoding: "utf8",
    }).trim();
    if (nixCandidates && existsSync(nixCandidates)) return nixCandidates;
  } catch {}

  throw new Error("Chromium not found. Set PUPPETEER_EXECUTABLE_PATH or install chromium.");
}

const HTML = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Briarwood AI · CDI Trust Lookup Demo Brief</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root{
    --ivory:#f6f1e7;
    --paper:#fbf7ee;
    --rule:#cdbfa6;
    --hairline:#dfd2b8;
    --ink:#1c1816;
    --muted:#4a423b;
    --faint:#7a6f63;
    --oxblood:#6b1f1f;
    --gold:#9c7a32;
  }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; background:var(--ivory); color:var(--ink); }
  body{
    font-family:"Inter", system-ui, sans-serif;
    font-size:10.5pt;
    line-height:1.55;
    -webkit-font-smoothing:antialiased;
  }
  @page { size: 8.5in 11in; margin: 0; }
  .page{
    width:8.5in;
    height:11in;
    padding:0.7in 0.9in 0.7in 0.9in;
    background:var(--paper);
    position:relative;
    overflow:hidden;
    page-break-after:always;
    break-after:page;
  }
  .page:last-child{ page-break-after:auto; break-after:auto; }

  /* Header band */
  .masthead{
    display:flex; justify-content:space-between; align-items:flex-end;
    padding-bottom:10px;
    border-bottom:1px solid var(--ink);
    margin-bottom:22px;
  }
  .masthead .lockup{
    font-family:"Fraunces", serif;
    font-weight:500;
    font-size:13.5pt;
    letter-spacing:-0.01em;
  }
  .masthead .lockup .mark{ color:var(--oxblood); }
  .masthead .meta{
    font-family:"JetBrains Mono", ui-monospace, monospace;
    font-size:7.5pt;
    text-transform:uppercase;
    letter-spacing:0.18em;
    color:var(--muted);
    text-align:right;
  }

  h1.title{
    font-family:"Fraunces", serif;
    font-weight:500;
    font-size:26pt;
    line-height:1.08;
    letter-spacing:-0.015em;
    margin:0 0 6px 0;
  }
  .subtitle{
    font-family:"Fraunces", serif;
    font-style:italic;
    font-size:13pt;
    color:var(--muted);
    margin:0 0 18px 0;
  }
  .lede{
    font-size:11pt;
    line-height:1.6;
    color:var(--ink);
    border-left:2px solid var(--oxblood);
    padding:4px 0 4px 14px;
    margin:14px 0 22px 0;
  }

  h2.section{
    font-family:"JetBrains Mono", ui-monospace, monospace;
    font-size:8.5pt;
    text-transform:uppercase;
    letter-spacing:0.22em;
    color:var(--oxblood);
    margin:22px 0 6px 0;
    border-bottom:1px solid var(--hairline);
    padding-bottom:4px;
  }
  h3.step{
    font-family:"Fraunces", serif;
    font-weight:500;
    font-size:14pt;
    letter-spacing:-0.01em;
    margin:18px 0 4px 0;
  }
  h3.step .num{
    font-family:"JetBrains Mono", ui-monospace, monospace;
    font-size:9pt;
    color:var(--gold);
    margin-right:10px;
    vertical-align:2px;
  }
  h4.kicker{
    font-family:"JetBrains Mono", ui-monospace, monospace;
    font-size:7.5pt;
    text-transform:uppercase;
    letter-spacing:0.2em;
    color:var(--gold);
    margin:14px 0 4px 0;
  }
  p{ margin:6px 0 10px 0; }
  p.tight{ margin:4px 0 6px 0; }
  .label{
    font-family:"JetBrains Mono", ui-monospace, monospace;
    font-size:7.5pt;
    text-transform:uppercase;
    letter-spacing:0.18em;
    color:var(--faint);
  }
  .pull{
    font-family:"Fraunces", serif;
    font-style:italic;
    font-size:12.5pt;
    line-height:1.45;
    color:var(--ink);
    margin:10px 0;
    padding-left:14px;
    border-left:2px solid var(--gold);
  }
  ul.clean{
    list-style:none;
    padding:0;
    margin:6px 0 10px 0;
  }
  ul.clean li{
    padding:3px 0;
    border-bottom:1px dotted var(--hairline);
    font-size:10pt;
  }
  ul.clean li:last-child{ border-bottom:none; }

  .two-col{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:18px;
    margin:6px 0 12px 0;
  }
  .col{
    border:1px solid var(--hairline);
    background:#fffbf2;
    padding:14px 16px;
    border-radius:2px;
  }
  .col .head{
    font-family:"JetBrains Mono", ui-monospace, monospace;
    font-size:7.5pt;
    text-transform:uppercase;
    letter-spacing:0.2em;
    color:var(--oxblood);
    margin-bottom:8px;
  }
  .col .foot{
    font-family:"Fraunces", serif;
    font-style:italic;
    font-size:9.5pt;
    color:var(--muted);
    margin-top:8px;
    padding-top:6px;
    border-top:1px solid var(--hairline);
  }

  .scorecard{
    border:1px solid var(--ink);
    background:#fffbf2;
    padding:18px 20px;
    margin:8px 0 14px 0;
  }
  .scorecard .row{
    display:flex; justify-content:space-between; align-items:baseline;
    padding:4px 0;
    border-bottom:1px dotted var(--hairline);
    font-size:10pt;
  }
  .scorecard .row:last-child{ border-bottom:none; }
  .scorecard .row .k{
    font-family:"JetBrains Mono", ui-monospace, monospace;
    font-size:8pt;
    text-transform:uppercase;
    letter-spacing:0.16em;
    color:var(--faint);
  }
  .scorecard .row .v{
    font-family:"Inter", sans-serif;
    font-weight:500;
    color:var(--ink);
  }
  .score-banner{
    display:flex; justify-content:space-between; align-items:center;
    padding:10px 14px;
    background:var(--ink);
    color:var(--paper);
    margin-bottom:10px;
  }
  .score-banner .name{
    font-family:"Fraunces", serif;
    font-size:13pt;
  }
  .score-banner .score{
    font-family:"JetBrains Mono", ui-monospace, monospace;
    font-size:18pt;
    color:#e7c879;
    letter-spacing:0.04em;
  }
  .dim-grid{
    display:grid;
    grid-template-columns:repeat(5, 1fr);
    gap:8px;
    margin-top:12px;
  }
  .dim{
    border:1px solid var(--hairline);
    padding:8px 10px;
    background:#fffbf2;
    text-align:center;
  }
  .dim .k{
    font-family:"JetBrains Mono", ui-monospace, monospace;
    font-size:6.5pt;
    text-transform:uppercase;
    letter-spacing:0.14em;
    color:var(--faint);
  }
  .dim .v{
    font-family:"Fraunces", serif;
    font-size:18pt;
    color:var(--oxblood);
    line-height:1.1;
    margin-top:2px;
  }

  pre.code{
    background:#1c1816;
    color:#e7c879;
    font-family:"JetBrains Mono", ui-monospace, monospace;
    font-size:8pt;
    line-height:1.55;
    padding:14px 16px;
    border-radius:2px;
    margin:10px 0;
    white-space:pre-wrap;
    word-break:break-word;
  }
  pre.code .key{ color:#9bb6e0; }
  pre.code .str{ color:#e8c19a; }
  pre.code .num{ color:#cfa2ff; }

  .endpoints{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:10px;
    margin:8px 0 12px 0;
  }
  .endpoint{
    border:1px solid var(--hairline);
    background:#fffbf2;
    padding:10px 12px;
  }
  .endpoint .verb{
    font-family:"JetBrains Mono", ui-monospace, monospace;
    font-size:7.5pt;
    color:var(--oxblood);
    letter-spacing:0.14em;
  }
  .endpoint .path{
    font-family:"JetBrains Mono", ui-monospace, monospace;
    font-size:9.5pt;
    color:var(--ink);
    margin:2px 0 4px 0;
  }
  .endpoint .desc{
    font-size:9pt;
    color:var(--muted);
    line-height:1.5;
  }

  .framing-list{
    list-style:none; padding:0; margin:6px 0 12px 0;
  }
  .framing-list li{
    font-family:"Fraunces", serif;
    font-style:italic;
    font-size:12pt;
    line-height:1.45;
    padding:6px 0 6px 14px;
    border-left:2px solid var(--oxblood);
    margin-bottom:8px;
    color:var(--ink);
  }

  .style-grid{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:14px;
    margin:6px 0 12px 0;
  }
  .swatch-row{
    display:flex; gap:8px; margin-top:8px;
  }
  .swatch{
    flex:1;
    height:36px;
    border:1px solid var(--hairline);
    position:relative;
  }
  .swatch span{
    position:absolute; bottom:-14px; left:0; right:0;
    text-align:center;
    font-family:"JetBrains Mono", ui-monospace, monospace;
    font-size:6.5pt;
    color:var(--faint);
    letter-spacing:0.12em;
    text-transform:uppercase;
  }
  .footer{
    position:absolute;
    left:0.95in; right:0.95in; bottom:0.55in;
    display:flex; justify-content:space-between; align-items:center;
    padding-top:8px;
    border-top:1px solid var(--hairline);
    font-family:"JetBrains Mono", ui-monospace, monospace;
    font-size:7pt;
    text-transform:uppercase;
    letter-spacing:0.18em;
    color:var(--faint);
  }
  .footer .rule-mark{ color:var(--oxblood); }
</style>
</head>
<body>

<!-- ============================================================ -->
<!-- PAGE 1                                                        -->
<!-- ============================================================ -->
<section class="page">
  <div class="masthead">
    <div class="lockup">Briarwood <span class="mark">/</span> CDI</div>
    <div class="meta">Demo Brief · Internal · 2026</div>
  </div>

  <h1 class="title">CDI Trust Lookup</h1>
  <div class="subtitle">The FICO score for real-world execution.</div>

  <div class="lede">
    The product is one thing. An agent asks: <em>can this counterparty be trusted for this transaction?</em>
    Briarwood returns a CDI score, risk flags, reason codes, and a recommended action. That is it.
  </div>

  <h2 class="section">Mandate</h2>
  <p>
    Build a Briarwood AI demo that shows CDI as the FICO score for real-world execution.
    Do not make this look like a wedding app, marketplace, booking tool, or service CRM.
    Briarwood is the trust layer agents query before routing work, coordinating execution,
    or releasing payment in the real-world economy.
  </p>

  <h2 class="section">Core Demo Concept</h2>
  <p>
    An AI agent has found a real-world service provider. Before the agent can route work
    or release payment, it needs to know:
  </p>
  <p class="pull">Can this provider be trusted to execute this specific transaction?</p>
  <p>Briarwood answers with a CDI trust lookup.</p>

  <h2 class="section">Demo Flow · Step 01</h2>
  <h3 class="step"><span class="num">01</span>Agent Trust Lookup</h3>
  <p class="tight"><span class="label">Headline</span> &nbsp; CDI Trust Lookup</p>
  <p class="tight"><span class="label">Subheadline</span> &nbsp; The FICO score for real-world execution.</p>
  <p class="tight"><span class="label">Prompt on screen</span></p>
  <p class="pull">An agent is evaluating a provider for a high-stakes real-world task.</p>

  <h4 class="kicker">Input fields</h4>
  <ul class="clean">
    <li>Provider ID</li>
    <li>Service category</li>
    <li>Location</li>
    <li>Urgency</li>
    <li>Coordination complexity</li>
    <li>Transaction value</li>
    <li>Payment stage</li>
  </ul>

  <h4 class="kicker">Action</h4>
  <p>Button: <strong>Run CDI Lookup</strong></p>

  <div class="footer">
    <div>Briarwood AI <span class="rule-mark">·</span> CDI Trust Lookup Brief</div>
    <div>Page 01 / 04</div>
  </div>
</section>

<!-- ============================================================ -->
<!-- PAGE 2                                                        -->
<!-- ============================================================ -->
<section class="page">
  <div class="masthead">
    <div class="lockup">Briarwood <span class="mark">/</span> CDI</div>
    <div class="meta">Demo Brief · Internal · 2026</div>
  </div>

  <h2 class="section">Demo Flow · Step 02</h2>
  <h3 class="step"><span class="num">02</span>Public Signals vs Behavioral Trust</h3>

  <div class="two-col">
    <div class="col">
      <div class="head">Public Web Signals</div>
      <ul class="clean">
        <li>profile</li>
        <li>reviews</li>
        <li>SEO</li>
        <li>social posts</li>
        <li>website</li>
        <li>credentials</li>
      </ul>
      <div class="foot">Useful for discovery. Weak for execution.</div>
    </div>
    <div class="col">
      <div class="head">Briarwood Behavioral Signals</div>
      <ul class="clean">
        <li>response latency</li>
        <li>follow-through</li>
        <li>handoff quality</li>
        <li>recovery under pressure</li>
        <li>payment closure</li>
        <li>execution history</li>
        <li>trust graph proximity</li>
      </ul>
      <div class="foot">Used for trust. Captured inside real transactions.</div>
    </div>
  </div>

  <p class="pull">The model sees the profile. Briarwood sees the behavior.</p>

  <h2 class="section">Demo Flow · Step 03</h2>
  <h3 class="step"><span class="num">03</span>CDI Result</h3>

  <div class="scorecard">
    <div class="score-banner">
      <div class="name">Northstar Field Services</div>
      <div class="score">CDI 84</div>
    </div>
    <div class="row"><span class="k">Trust Level</span><span class="v">High</span></div>
    <div class="row"><span class="k">Recommendation</span><span class="v">Approved to route</span></div>
    <div class="row"><span class="k">Confidence</span><span class="v">91%</span></div>
    <div class="row"><span class="k">Risk</span><span class="v">Medium urgency / limited recovery history</span></div>
    <div class="row"><span class="k">Payment</span><span class="v">Deposit approved · Final pending execution confirmation</span></div>

    <div class="dim-grid">
      <div class="dim"><div class="k">Responsiveness</div><div class="v">92</div></div>
      <div class="dim"><div class="k">Follow-through</div><div class="v">87</div></div>
      <div class="dim"><div class="k">Handoff Quality</div><div class="v">85</div></div>
      <div class="dim"><div class="k">Recovery</div><div class="v">76</div></div>
      <div class="dim"><div class="k">Execution Integrity</div><div class="v">89</div></div>
    </div>
  </div>

  <div class="footer">
    <div>Briarwood AI <span class="rule-mark">·</span> CDI Trust Lookup Brief</div>
    <div>Page 02 / 04</div>
  </div>
</section>

<!-- ============================================================ -->
<!-- PAGE 3                                                        -->
<!-- ============================================================ -->
<section class="page">
  <div class="masthead">
    <div class="lockup">Briarwood <span class="mark">/</span> CDI</div>
    <div class="meta">Demo Brief · Internal · 2026</div>
  </div>

  <h2 class="section">Demo Flow · Step 04</h2>
  <h3 class="step"><span class="num">04</span>API Response</h3>

<pre class="code">{
  <span class="key">"cdi_lookup_id"</span>: <span class="str">"lookup_8f42"</span>,
  <span class="key">"provider_id"</span>: <span class="str">"provider_1049"</span>,
  <span class="key">"provider_name"</span>: <span class="str">"Northstar Field Services"</span>,
  <span class="key">"transaction_context"</span>: {
    <span class="key">"service_category"</span>: <span class="str">"real_world_service"</span>,
    <span class="key">"location"</span>: <span class="str">"San Francisco, CA"</span>,
    <span class="key">"urgency"</span>: <span class="str">"high"</span>,
    <span class="key">"coordination_complexity"</span>: <span class="str">"medium"</span>,
    <span class="key">"transaction_value"</span>: <span class="num">4200</span>,
    <span class="key">"payment_stage"</span>: <span class="str">"deposit"</span>
  },
  <span class="key">"cdi_score"</span>: <span class="num">84</span>,
  <span class="key">"trust_level"</span>: <span class="str">"high"</span>,
  <span class="key">"recommendation"</span>: <span class="str">"approved_to_route"</span>,
  <span class="key">"confidence"</span>: <span class="num">0.91</span>,
  <span class="key">"reason_codes"</span>: [
    <span class="str">"fast_response_history"</span>,
    <span class="str">"verified_follow_through"</span>,
    <span class="str">"successful_handoffs"</span>,
    <span class="str">"strong_execution_integrity"</span>
  ],
  <span class="key">"risk_flags"</span>: [
    <span class="str">"limited_recovery_history"</span>,
    <span class="str">"high_urgency_context"</span>
  ],
  <span class="key">"payment_guidance"</span>: {
    <span class="key">"deposit_release"</span>: <span class="str">"approved"</span>,
    <span class="key">"final_payment_release"</span>: <span class="str">"pending_execution_confirmation"</span>
  }
}</pre>

  <p class="pull">
    Instead of spending tokens guessing from reviews, websites, and social posts, the agent
    receives a structured trust signal from Briarwood.
  </p>

  <h2 class="section">Demo Flow · Step 05</h2>
  <h3 class="step"><span class="num">05</span>Score Update</h3>

  <p>A completed transaction emits behavioral events:</p>
  <ul class="clean">
    <li>accepted within 8 minutes</li>
    <li>confirmed schedule</li>
    <li>completed handoff</li>
    <li>payment received</li>
    <li>execution confirmed</li>
    <li>client outcome marked successful</li>
  </ul>

  <div class="scorecard">
    <div class="row"><span class="k">Previous CDI</span><span class="v">84</span></div>
    <div class="row"><span class="k">Updated CDI</span><span class="v" style="color:var(--oxblood);font-family:'Fraunces',serif;font-size:14pt">86</span></div>
  </div>

  <p class="pull">CDI improves when verified behavior confirms execution.</p>

  <div class="footer">
    <div>Briarwood AI <span class="rule-mark">·</span> CDI Trust Lookup Brief</div>
    <div>Page 03 / 04</div>
  </div>
</section>

<!-- ============================================================ -->
<!-- PAGE 4                                                        -->
<!-- ============================================================ -->
<section class="page">
  <div class="masthead">
    <div class="lockup">Briarwood <span class="mark">/</span> CDI</div>
    <div class="meta">Demo Brief · Internal · 2026</div>
  </div>

  <h2 class="section">Required API Endpoints</h2>
  <p>Mock endpoints. No real authentication required for the demo. Mock data is fine.</p>

  <div class="endpoints">
    <div class="endpoint">
      <div class="verb">POST</div>
      <div class="path">/api/cdi/lookup</div>
      <div class="desc">Returns a CDI score, recommendation, confidence, reason codes, risk flags, and payment guidance.</div>
    </div>
    <div class="endpoint">
      <div class="verb">POST</div>
      <div class="path">/api/cdi/event</div>
      <div class="desc">Adds behavioral events to a transaction.</div>
    </div>
    <div class="endpoint">
      <div class="verb">POST</div>
      <div class="path">/api/cdi/update</div>
      <div class="desc">Updates CDI after verified execution.</div>
    </div>
    <div class="endpoint">
      <div class="verb">GET</div>
      <div class="path">/api/provider/:id</div>
      <div class="desc">Returns provider profile and current CDI state.</div>
    </div>
  </div>

  <h2 class="section">Key Product Framing</h2>
  <ul class="framing-list">
    <li>CDI is the FICO score for real-world execution.</li>
    <li>The model sees the profile. Briarwood sees the behavior.</li>
    <li>The model should not spend tokens guessing who to trust. It should query Briarwood.</li>
    <li>Briarwood turns trust into a lookup.</li>
    <li>Without a trust substrate, agents are trapped in the browser.</li>
  </ul>

  <h2 class="section">Visual Style</h2>
  <p>
    Make it feel like a high-trust financial infrastructure terminal, not a SaaS dashboard.
  </p>

  <div class="style-grid">
    <div>
      <h4 class="kicker">Visual Language</h4>
      <ul class="clean">
        <li>FICO / credit bureau seriousness</li>
        <li>institutional trust</li>
        <li>luxury infrastructure</li>
        <li>clear scorecard</li>
        <li>clean API response</li>
        <li>elegant but technical</li>
      </ul>
    </div>
    <div>
      <h4 class="kicker">Palette</h4>
      <div class="swatch-row">
        <div class="swatch" style="background:#fbf7ee"><span>Ivory</span></div>
        <div class="swatch" style="background:#6b1f1f"><span>Oxblood</span></div>
        <div class="swatch" style="background:#1c1816"><span>Charcoal</span></div>
        <div class="swatch" style="background:#9c7a32"><span>Muted Gold</span></div>
      </div>
    </div>
  </div>

  <h2 class="section">Final Output</h2>
  <p>Build a polished clickable demo that shows:</p>
  <ul class="clean">
    <li>1 · an agent runs a CDI trust lookup</li>
    <li>2 · Briarwood compares public signals vs behavioral signals</li>
    <li>3 · CDI returns a score and recommendation</li>
    <li>4 · API response is shown</li>
    <li>5 · execution updates the CDI state</li>
  </ul>
  <p>The whole demo should be understandable in under 2 minutes.</p>

  <p class="pull" style="margin-top:18px;border-color:var(--gold);color:var(--ink)">
    This keeps Briarwood out of "wedding app" territory and puts the product where it belongs:
    trust infrastructure. FICO for real-world execution.
  </p>

  <div class="footer">
    <div>Briarwood AI <span class="rule-mark">·</span> CDI Trust Lookup Brief</div>
    <div>Page 04 / 04</div>
  </div>
</section>

</body>
</html>
`;

async function main() {
  const chromiumPath = resolveChromium();
  console.log(`[brief-pdf] using chromium: ${chromiumPath}`);

  await mkdir(dirname(OUT), { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: chromiumPath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 816, height: 1056, deviceScaleFactor: 1 });
    console.log(`[brief-pdf] rendering inline html`);
    await page.setContent(HTML, { waitUntil: "networkidle0", timeout: 60_000 });

    await page.evaluate(async () => {
      await (document as any).fonts?.ready;
    });

    console.log(`[brief-pdf] writing pdf to ${OUT}`);
    await page.pdf({
      path: OUT,
      width: "8.5in",
      height: "11in",
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    console.log(`[brief-pdf] done.`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
