/*
Version 18 Fence System Preview + Clear Section Labels

Adds:
- Customer quote preview controls directly on Fence System page
- Clear drawing labels for each divided section
- Section numbers S1, S2, S3...
- LP markers at divisions
- Gate/door markers remain movable
- Preview opens first, then print from preview
*/

function v18Esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[m]));
}

function v18Money(n) {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function v18SectionWidthFt() {
  return Number(
    document.getElementById("v14SectionWidthQuick")?.value ||
    document.getElementById("sectionWidthFt")?.value ||
    8
  );
}

function v18GateArray() {
  if (Array.isArray(window.v13LayoutGates)) return window.v13LayoutGates;
  return [];
}

function v18InstallFenceSystemPreviewPanel() {
  const systemTab = document.getElementById("tab-system");
  if (!systemTab || document.getElementById("v18FenceSystemPreviewPanel")) return;

  const panel = document.createElement("div");
  panel.id = "v18FenceSystemPreviewPanel";
  panel.className = "select-line";
  panel.innerHTML = `
    <h3>Customer Quote Preview</h3>
    <p class="small">
      Preview the customer quote directly from Fence System before printing. The preview includes the clear drawing, gate/door placement, section divisions, and quote lines.
    </p>

    <div class="actions">
      <button class="blue" onclick="v18PreviewCustomerQuote()">Preview Customer Quote</button>
      <button class="green" onclick="v18PrintCustomerQuoteDirect()">Print Direct</button>
    </div>

    <div id="v18FenceSystemDrawingPreview" style="margin-top:12px; border:1px solid #d1d5db; border-radius:10px; background:#fff; padding:8px;">
      <div class="small">Drawing preview will show here after calculation.</div>
    </div>
  `;

  systemTab.appendChild(panel);
}

function v18BuildSegmentData() {
  const lengths = Array.isArray(window.segmentLengths) ? window.segmentLengths : [];
  const sectionWidth = Math.max(0.01, v18SectionWidthFt());

  return lengths.map((len, i) => {
    const segmentNumber = i + 1;
    const segmentLength = Number(len || 0);
    const gates = v18GateArray().filter(g => Number(g.segment || 0) === segmentNumber);
    const gateWidth = gates.reduce((sum, g) => sum + Number(g.widthFt || 0), 0);
    const usable = Math.max(0, segmentLength - gateWidth);
    const full = Math.floor(usable / sectionWidth);
    const remainder = Math.round((usable - full * sectionWidth + Number.EPSILON) * 100) / 100;
    const partial = remainder > 0.01 ? 1 : 0;
    const sections = full + partial;

    return {
      segmentNumber,
      segmentLength,
      gateWidth,
      usable,
      full,
      remainder,
      partial,
      sections,
      linePosts: Math.max(0, sections - 1),
      label: remainder > 0.01 ? `${full} full @ ${sectionWidth}' + ${remainder}' cut` : `${full} full @ ${sectionWidth}'`
    };
  });
}

function v18MapPointsForSvg(width, height, pad) {
  if (!Array.isArray(window.points) || points.length < 2) return null;

  const raw = points.map(p => ({ x:Number(p.x || 0), y:Number(p.y || 0) }));
  const minX = Math.min(...raw.map(p => p.x));
  const maxX = Math.max(...raw.map(p => p.x));
  const minY = Math.min(...raw.map(p => p.y));
  const maxY = Math.max(...raw.map(p => p.y));

  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);

  return raw.map(p => ({
    x: pad + (p.x - minX) * scale,
    y: pad + (p.y - minY) * scale
  }));
}

function v18BuildClearDrawingSvg() {
  const width = 1100;
  const height = 720;
  const pad = 90;
  const mapped = v18MapPointsForSvg(width, height, pad);

  if (!mapped) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <text x="${width/2}" y="${height/2}" text-anchor="middle" font-family="Arial" font-size="26">No drawing available</text>
    </svg>`;
  }

  const closed = document.getElementById("layoutClosed")?.value === "closed";
  const data = v18BuildSegmentData();
  const sectionWidth = Math.max(0.01, v18SectionWidthFt());

  let sectionCounter = 1;

  let svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <rect x="12" y="12" width="${width-24}" height="${height-24}" rx="18" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <text x="${width/2}" y="42" text-anchor="middle" font-family="Arial" font-size="24" font-weight="700" fill="#111827">Fence Layout Map</text>
    <text x="${width/2}" y="68" text-anchor="middle" font-family="Arial" font-size="14" fill="#4b5563">Divided sections, line posts, gate/door locations, and segment measurements</text>
  `;

  function drawSegment(a, b, segIndex) {
    const segmentNumber = segIndex + 1;
    const d = data[segIndex] || {};
    const segLen = Number(d.segmentLength || 0);
    const sections = Math.max(0, Number(d.sections || 0));

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len <= 0) return "";

    const angle = Math.atan2(dy, dx);
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);

    let out = `
      <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#111827" stroke-width="10" stroke-linecap="round"/>
    `;

    for (let s = 0; s < sections; s++) {
      const t1 = s / sections;
      const t2 = (s + 1) / sections;
      const midT = (t1 + t2) / 2;

      const mx = a.x + dx * midT + nx * 25;
      const my = a.y + dy * midT + ny * 25;

      out += `
        <rect x="${mx - 18}" y="${my - 12}" width="36" height="24" rx="6" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5"/>
        <text x="${mx}" y="${my + 4}" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#1e3a8a">S${sectionCounter}</text>
      `;
      sectionCounter++;

      if (s > 0) {
        const px = a.x + dx * t1;
        const py = a.y + dy * t1;

        out += `
          <circle cx="${px}" cy="${py}" r="8" fill="#2563eb" stroke="#1e3a8a" stroke-width="2"/>
          <text x="${px + nx * 22}" y="${py + ny * 22 + 4}" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#1e3a8a">LP</text>
        `;
      }
    }

    const labelX = (a.x + b.x) / 2 - nx * 48;
    const labelY = (a.y + b.y) / 2 - ny * 48;

    out += `
      <rect x="${labelX - 88}" y="${labelY - 25}" width="176" height="50" rx="8" fill="#ffffff" stroke="#6b7280" stroke-width="1.5"/>
      <text x="${labelX}" y="${labelY - 7}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="#111827">SEG ${segmentNumber}: ${segLen}'</text>
      <text x="${labelX}" y="${labelY + 9}" text-anchor="middle" font-family="Arial" font-size="11" fill="#374151">${sections} sections | ${d.linePosts || 0} LP</text>
      <text x="${labelX}" y="${labelY + 23}" text-anchor="middle" font-family="Arial" font-size="10" fill="#6b7280">${v18Esc(d.label || "")}</text>
    `;

    return out;
  }

  for (let i = 0; i < mapped.length - 1; i++) {
    svg += drawSegment(mapped[i], mapped[i + 1], i);
  }

  if (closed && mapped.length > 2) {
    svg += drawSegment(mapped[mapped.length - 1], mapped[0], mapped.length - 1);
  }

  mapped.forEach((p, i) => {
    svg += `
      <circle cx="${p.x}" cy="${p.y}" r="13" fill="#111827"/>
      <text x="${p.x}" y="${p.y + 4}" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#ffffff">P${i + 1}</text>
    `;
  });

  const gates = v18GateArray();
  gates.forEach((g, i) => {
    const segIndex = Number(g.segment || 1) - 1;
    const a = mapped[segIndex];
    const b = mapped[segIndex + 1] || (closed ? mapped[0] : null);
    if (!a || !b) return;

    const t = Math.max(0, Math.min(100, Number(g.positionPct || 50))) / 100;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;

    svg += `
      <rect x="${x - 34}" y="${y - 24}" width="68" height="48" rx="7" fill="#f97316" stroke="#7c2d12" stroke-width="3"/>
      <text x="${x}" y="${y - 4}" text-anchor="middle" font-family="Arial" font-size="15" font-weight="700" fill="#ffffff">G${i + 1}</text>
      <text x="${x}" y="${y + 13}" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#ffffff">${v18Esc(g.widthFt || "")}'</text>
      <text x="${x}" y="${y + 40}" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#7c2d12">${v18Esc(g.color || "")}</text>
    `;
  });

  svg += `
    <g transform="translate(25, ${height - 70})">
      <rect x="0" y="0" width="520" height="48" rx="8" fill="#f9fafb" stroke="#d1d5db"/>
      <rect x="16" y="12" width="34" height="22" rx="6" fill="#eff6ff" stroke="#2563eb"/>
      <text x="62" y="28" font-family="Arial" font-size="12" fill="#111827">S# = numbered fence section</text>
      <circle cx="250" cy="24" r="8" fill="#2563eb"/>
      <text x="266" y="28" font-family="Arial" font-size="12" fill="#111827">LP = line post / section division</text>
      <rect x="405" y="12" width="34" height="22" rx="4" fill="#f97316" stroke="#7c2d12"/>
      <text x="450" y="28" font-family="Arial" font-size="12" fill="#111827">Gate / door</text>
    </g>
  </svg>`;

  return svg;
}

function v18RenderFenceSystemPreviewBox() {
  const box = document.getElementById("v18FenceSystemDrawingPreview");
  if (!box) return;

  box.innerHTML = v18BuildClearDrawingSvg();
}

function v18BuildCustomerQuoteHtml(showPrintButtons) {
  if (typeof calculateQuote === "function") calculateQuote();

  const q = window.latestQuote || {};
  const drawing = v18BuildClearDrawingSvg();
  const data = v18BuildSegmentData();
  const gates = v18GateArray();

  const showItemId = typeof v12ShowItemId === "function" ? v12ShowItemId() : false;
  const showUnitPrice = typeof v12ShowUnitPrice === "function" ? v12ShowUnitPrice() : false;

  let quoteHeaders = "";
  if (showItemId) quoteHeaders += "<th>Item ID</th>";
  quoteHeaders += "<th>Description</th>";
  if (showUnitPrice) quoteHeaders += "<th class='right'>Unit Price</th>";
  quoteHeaders += "<th class='right'>Qty</th><th class='right'>Total</th>";

  const quoteRows = (q.lineItems || []).map(line => {
    let cells = "";
    if (showItemId) cells += `<td>${v18Esc(line.code || "")}</td>`;
    cells += `<td>${v18Esc(line.item || "")}</td>`;
    if (showUnitPrice) cells += `<td class="right">$${v18Money(line.unitPrice || 0)}</td>`;
    cells += `<td class="right">${v18Esc(String(line.qty || ""))} ${v18Esc(line.unit || "")}</td>`;
    cells += `<td class="right">$${v18Money(line.total || 0)}</td>`;
    return `<tr>${cells}</tr>`;
  }).join("");

  const segmentRows = data.map(r => `
    <tr>
      <td>${r.segmentNumber}</td>
      <td class="right">${r.segmentLength}</td>
      <td class="right">${r.gateWidth}</td>
      <td class="right">${r.usable}</td>
      <td>${v18Esc(r.label)}</td>
      <td class="right">${r.sections}</td>
      <td class="right">${r.linePosts}</td>
    </tr>
  `).join("");

  const gateRows = gates.length ? gates.map((g, i) => `
    <tr>
      <td>G${i + 1}</td>
      <td>${v18Esc(g.segment)}</td>
      <td>${v18Esc(g.positionPct)}%</td>
      <td>${v18Esc(g.widthFt)} ft</td>
      <td>${v18Esc(g.itemId)}</td>
      <td>${v18Esc(g.description)}</td>
      <td>${v18Esc(g.color)}</td>
    </tr>
  `).join("") : `<tr><td colspan="7">No gates / doors selected.</td></tr>`;

  const buttons = showPrintButtons ? `
    <div class="preview-actions">
      <button onclick="window.print()">Print Quote</button>
      <button onclick="window.close()">Close Preview</button>
    </div>
  ` : "";

  return `
  <html>
    <head>
      <title>${v18Esc(q.quoteNumber || "Customer Quote Preview")}</title>
      <style>
        @page { size: letter portrait; margin: 0.30in; }
        body { margin:0; background:${showPrintButtons ? "#e5e7eb" : "#fff"}; color:#111827; font-family:Arial, sans-serif; font-size:12px; }
        .preview-actions { position:sticky; top:0; background:#111827; padding:10px; display:flex; gap:10px; z-index:20; }
        .preview-actions button { background:#047857; color:white; border:0; border-radius:8px; padding:10px 14px; font-weight:700; cursor:pointer; }
        .page { background:white; width:8.1in; min-height:10.35in; margin:${showPrintButtons ? "18px auto" : "0"}; padding:0.1in; box-shadow:${showPrintButtons ? "0 2px 16px rgba(0,0,0,.18)" : "none"}; }
        .title { font-size:21px; font-weight:700; margin-bottom:7px; }
        .top { display:grid; grid-template-columns: 0.95fr 1.35fr; gap:10px; align-items:start; }
        .box { border:1px solid #cbd5e1; border-radius:8px; padding:7px; break-inside:avoid; }
        .meta div { margin-bottom:3px; }
        .drawing svg { width:100%; height:auto; max-height:3.55in; display:block; }
        table { width:100%; border-collapse:collapse; margin-top:6px; }
        th, td { border:1px solid #d1d5db; padding:4px; font-size:10.3px; vertical-align:top; }
        th { background:#f3f4f6; text-align:left; }
        .right { text-align:right; }
        .section { margin-top:7px; }
        .total { font-size:18px; font-weight:700; text-align:right; margin-top:6px; }
        .small { font-size:9.5px; color:#4b5563; }
        @media print {
          body { background:white; }
          .preview-actions { display:none; }
          .page { margin:0; box-shadow:none; width:auto; min-height:auto; padding:0; }
        }
      </style>
    </head>
    <body>
      ${buttons}
      <div class="page">
        <div class="title">Fence Quote</div>

        <div class="top">
          <div class="box meta">
            <div><strong>Quote #:</strong> ${v18Esc(q.quoteNumber || "")}</div>
            <div><strong>Date:</strong> ${v18Esc(q.quoteDate || "")}</div>
            <div><strong>Customer:</strong> ${v18Esc(q.customerName || "")}</div>
            <div><strong>Customer ID:</strong> ${v18Esc(q.customerId || "")}</div>
            <div><strong>Address:</strong> ${v18Esc(q.jobAddress || "")}</div>
            <div><strong>Quote Type:</strong> ${v18Esc(q.scope || "")}</div>
            <div><strong>Payment:</strong> ${v18Esc(q.paymentMethod || "Cash / Check")}</div>
            <div><strong>Section Width:</strong> ${v18Esc(String(v18SectionWidthFt()))} ft</div>
            <div class="total">Total: $${v18Money(q.pricing?.grandTotal || 0)}</div>
          </div>

          <div class="box drawing">
            <strong>Layout Drawing</strong>
            ${drawing}
            <div class="small">S# = section number. LP = line post/section division. Orange = gate/door.</div>
          </div>
        </div>

        <div class="section box">
          <strong>Segment / Division Breakdown</strong>
          <table>
            <thead>
              <tr>
                <th>Seg</th>
                <th class="right">Length Ft</th>
                <th class="right">Gate Ft</th>
                <th class="right">Usable Ft</th>
                <th>Section Division</th>
                <th class="right">Sections</th>
                <th class="right">Line Posts</th>
              </tr>
            </thead>
            <tbody>${segmentRows || `<tr><td colspan="7">No segment data.</td></tr>`}</tbody>
          </table>
        </div>

        <div class="section box">
          <strong>Gate / Door Placement</strong>
          <table>
            <thead>
              <tr>
                <th>Gate</th>
                <th>Seg</th>
                <th>Position</th>
                <th>Width</th>
                <th>Item ID</th>
                <th>Description</th>
                <th>Color</th>
              </tr>
            </thead>
            <tbody>${gateRows}</tbody>
          </table>
        </div>

        <div class="section box">
          <strong>Quote Lines</strong>
          <table>
            <thead><tr>${quoteHeaders}</tr></thead>
            <tbody>${quoteRows}</tbody>
          </table>
        </div>
      </div>
    </body>
  </html>`;
}

function v18PreviewCustomerQuote() {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(v18BuildCustomerQuoteHtml(true));
  w.document.close();
  w.focus();
}

function v18PrintCustomerQuoteDirect() {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(v18BuildCustomerQuoteHtml(false));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 600);
}

function v18PatchDrawingAndCalculate() {
  if (!window.v18OriginalDraw && typeof window.draw === "function") {
    window.v18OriginalDraw = window.draw;
    window.draw = function() {
      window.v18OriginalDraw();
      v18RenderFenceSystemPreviewBox();
    };
  }

  if (!window.v18OriginalCalculateQuote && typeof window.calculateQuote === "function") {
    window.v18OriginalCalculateQuote = window.calculateQuote;
    window.calculateQuote = function() {
      window.v18OriginalCalculateQuote();
      v18RenderFenceSystemPreviewBox();
    };
  }
}

document.addEventListener("DOMContentLoaded", function() {
  setTimeout(function() {
    v18InstallFenceSystemPreviewPanel();
    v18PatchDrawingAndCalculate();
    v18RenderFenceSystemPreviewBox();

    if (typeof draw === "function") draw();
    if (typeof calculateQuote === "function") calculateQuote();
  }, 6500);
});
