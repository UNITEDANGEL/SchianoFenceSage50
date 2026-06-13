/*
Version 19 Customer Quote Print Fix

Fixes:
- Customer print/preview showing blank
- Uses actual latestQuote variable, not window.latestQuote
- Always prints:
  - customer info
  - clear map/drawing
  - material quantities
  - gate/door placement
  - quote lines with quantity and total
*/

function v19GetQuote() {
  try {
    if (typeof latestQuote !== "undefined" && latestQuote) return latestQuote;
  } catch (e) {}

  if (typeof calculateQuote === "function") {
    calculateQuote();
  }

  try {
    if (typeof latestQuote !== "undefined" && latestQuote) return latestQuote;
  } catch (e) {}

  return null;
}

function v19Points() {
  try {
    if (typeof points !== "undefined" && Array.isArray(points)) return points;
  } catch (e) {}
  return [];
}

function v19SegmentLengths() {
  try {
    if (typeof segmentLengths !== "undefined" && Array.isArray(segmentLengths)) return segmentLengths;
  } catch (e) {}
  return [];
}

function v19Gates() {
  try {
    if (typeof v13LayoutGates !== "undefined" && Array.isArray(v13LayoutGates)) return v13LayoutGates;
  } catch (e) {}
  return [];
}

function v19Esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[m]));
}

function v19Money(n) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function v19SectionWidthFt() {
  return Number(
    document.getElementById("v14SectionWidthQuick")?.value ||
    document.getElementById("sectionWidthFt")?.value ||
    8
  );
}

function v19ClosedLayout() {
  return document.getElementById("layoutClosed")?.value === "closed";
}

function v19BuildLayoutRows() {
  const lengths = v19SegmentLengths();
  const gates = v19Gates();
  const sectionWidth = Math.max(0.01, v19SectionWidthFt());

  return lengths.map((len, i) => {
    const segmentNumber = i + 1;
    const lengthFt = Number(len || 0);
    const segmentGates = gates.filter(g => Number(g.segment || 0) === segmentNumber);
    const gateFt = segmentGates.reduce((sum, g) => sum + Number(g.widthFt || 0), 0);
    const usableFt = Math.max(0, lengthFt - gateFt);
    const fullSections = Math.floor(usableFt / sectionWidth);
    const remainder = Math.round((usableFt - fullSections * sectionWidth + Number.EPSILON) * 100) / 100;
    const partialSections = remainder > 0.01 ? 1 : 0;
    const sections = fullSections + partialSections;
    const linePosts = Math.max(0, sections - 1);

    return {
      segmentNumber,
      lengthFt,
      gateFt,
      usableFt,
      fullSections,
      remainder,
      partialSections,
      sections,
      linePosts,
      splitLabel: remainder > 0.01
        ? fullSections + " full @ " + sectionWidth + "' + " + remainder + "' cut"
        : fullSections + " full @ " + sectionWidth + "'"
    };
  });
}

function v19MaterialSummaryRows(quote) {
  const summary = quote?.materialSummary || {};
  const rows = [
    ["Total LF", quote?.layout?.counts?.totalLf ?? ""],
    ["Sections / Panels", summary.sections ?? quote?.layout?.counts?.totalSections ?? ""],
    ["Line Posts", summary.linePosts ?? quote?.layout?.counts?.linePosts ?? ""],
    ["Corner Posts", summary.cornerPosts ?? quote?.layout?.counts?.cornerPosts ?? ""],
    ["End Posts", summary.endPosts ?? quote?.layout?.counts?.endPosts ?? ""],
    ["Total Posts", summary.totalPosts ?? quote?.layout?.counts?.totalPosts ?? ""],
    ["Caps", summary.totalPosts ?? quote?.layout?.counts?.totalPosts ?? ""],
    ["Concrete Bags", summary.concreteBags ?? 0]
  ];

  return rows;
}

function v19BuildMapSvg() {
  const pts = v19Points();
  const lengths = v19SegmentLengths();
  const gates = v19Gates();
  const sectionWidth = Math.max(0.01, v19SectionWidthFt());

  const width = 1100;
  const height = 680;
  const pad = 85;

  if (pts.length < 2) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <rect x="12" y="12" width="${width-24}" height="${height-24}" rx="18" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
        <text x="${width/2}" y="${height/2}" text-anchor="middle" font-family="Arial" font-size="26" fill="#111827">No drawing available</text>
      </svg>
    `;
  }

  const minX = Math.min(...pts.map(p => Number(p.x || 0)));
  const maxX = Math.max(...pts.map(p => Number(p.x || 0)));
  const minY = Math.min(...pts.map(p => Number(p.y || 0)));
  const maxY = Math.max(...pts.map(p => Number(p.y || 0)));
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);

  function mapPoint(p) {
    return {
      x: pad + (Number(p.x || 0) - minX) * scale,
      y: pad + (Number(p.y || 0) - minY) * scale
    };
  }

  const mapped = pts.map(mapPoint);
  const closed = v19ClosedLayout();

  let svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <rect x="12" y="12" width="${width-24}" height="${height-24}" rx="18" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
      <text x="${width/2}" y="38" text-anchor="middle" font-family="Arial" font-size="24" font-weight="700" fill="#111827">Fence Layout Map</text>
      <text x="${width/2}" y="62" text-anchor="middle" font-family="Arial" font-size="13" fill="#4b5563">Sections, line posts, gates/doors, and segment labels</text>
  `;

  let sectionCounter = 1;

  function drawSegment(a, b, segIndex) {
    const segmentNumber = segIndex + 1;
    const lengthFt = Number(lengths[segIndex] || 0);
    const gatesOnSeg = gates.filter(g => Number(g.segment || 0) === segmentNumber);
    const gateFt = gatesOnSeg.reduce((sum, g) => sum + Number(g.widthFt || 0), 0);
    const usableFt = Math.max(0, lengthFt - gateFt);
    const sections = Math.max(0, Math.ceil(usableFt / sectionWidth));

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenPx = Math.sqrt(dx * dx + dy * dy);
    if (lenPx <= 0) return "";

    const angle = Math.atan2(dy, dx);
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);

    let out = `
      <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#111827" stroke-width="10" stroke-linecap="round"/>
    `;

    for (let s = 0; s < sections; s++) {
      const midT = (s + 0.5) / Math.max(1, sections);
      const mx = a.x + dx * midT + nx * 30;
      const my = a.y + dy * midT + ny * 30;

      out += `
        <rect x="${mx - 20}" y="${my - 13}" width="40" height="26" rx="6" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5"/>
        <text x="${mx}" y="${my + 4}" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#1e3a8a">S${sectionCounter}</text>
      `;
      sectionCounter++;

      if (s > 0) {
        const t = s / Math.max(1, sections);
        const px = a.x + dx * t;
        const py = a.y + dy * t;

        out += `
          <circle cx="${px}" cy="${py}" r="8" fill="#2563eb" stroke="#1e3a8a" stroke-width="2"/>
          <text x="${px + nx * 24}" y="${py + ny * 24 + 4}" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#1e3a8a">LP</text>
        `;
      }
    }

    const labelX = (a.x + b.x) / 2 - nx * 55;
    const labelY = (a.y + b.y) / 2 - ny * 55;

    out += `
      <rect x="${labelX - 92}" y="${labelY - 24}" width="184" height="48" rx="8" fill="#ffffff" stroke="#6b7280" stroke-width="1.5"/>
      <text x="${labelX}" y="${labelY - 6}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="#111827">SEG ${segmentNumber}: ${lengthFt}'</text>
      <text x="${labelX}" y="${labelY + 10}" text-anchor="middle" font-family="Arial" font-size="11" fill="#374151">${sections} sections @ ${sectionWidth}'</text>
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
      <text x="${x}" y="${y + 13}" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#ffffff">${v19Esc(g.widthFt || "")}'</text>
    `;
  });

  svg += `
      <g transform="translate(25, ${height - 66})">
        <rect x="0" y="0" width="525" height="46" rx="8" fill="#f9fafb" stroke="#d1d5db"/>
        <rect x="16" y="12" width="34" height="22" rx="6" fill="#eff6ff" stroke="#2563eb"/>
        <text x="62" y="28" font-family="Arial" font-size="12" fill="#111827">S# = section number</text>
        <circle cx="235" cy="23" r="8" fill="#2563eb"/>
        <text x="252" y="28" font-family="Arial" font-size="12" fill="#111827">LP = line post/division</text>
        <rect x="400" y="12" width="34" height="22" rx="4" fill="#f97316" stroke="#7c2d12"/>
        <text x="445" y="28" font-family="Arial" font-size="12" fill="#111827">Gate/door</text>
      </g>
    </svg>
  `;

  return svg;
}

function v19BuildCustomerQuoteHtml(showButtons) {
  if (typeof calculateQuote === "function") calculateQuote();

  const q = v19GetQuote();
  if (!q) {
    return `
      <html>
        <body style="font-family:Arial;padding:30px;">
          <h2>Quote not calculated yet</h2>
          <p>Please click Calculate first, then preview/print again.</p>
        </body>
      </html>
    `;
  }

  const mapSvg = v19BuildMapSvg();
  const layoutRows = v19BuildLayoutRows();
  const summaryRows = v19MaterialSummaryRows(q);
  const gates = v19Gates();

  const showItemId = false;
  const showUnitPrice = false;

  const lineRows = (q.lineItems || []).map(line => `
    <tr>
      <td>${v19Esc(line.item || "")}</td>
      <td class="right">${v19Esc(String(line.qty || ""))} ${v19Esc(line.unit || "")}</td>
      <td class="right">$${v19Money(line.total || 0)}</td>
    </tr>
  `).join("");

  const materialRows = summaryRows.map(r => `
    <tr>
      <td>${v19Esc(r[0])}</td>
      <td class="right">${v19Esc(String(r[1]))}</td>
    </tr>
  `).join("");

  const segmentRows = layoutRows.map(r => `
    <tr>
      <td>${r.segmentNumber}</td>
      <td class="right">${r.lengthFt}</td>
      <td class="right">${r.gateFt}</td>
      <td class="right">${r.usableFt}</td>
      <td>${v19Esc(r.splitLabel)}</td>
      <td class="right">${r.sections}</td>
      <td class="right">${r.linePosts}</td>
    </tr>
  `).join("");

  const gateRows = gates.length ? gates.map((g, i) => `
    <tr>
      <td>G${i + 1}</td>
      <td>${v19Esc(g.segment)}</td>
      <td>${v19Esc(g.positionPct)}%</td>
      <td>${v19Esc(g.widthFt)} ft</td>
      <td>${v19Esc(g.description || g.itemId || "")}</td>
      <td>${v19Esc(g.color || "")}</td>
    </tr>
  `).join("") : `<tr><td colspan="6">No gates / doors selected.</td></tr>`;

  const buttons = showButtons ? `
    <div class="preview-actions">
      <button onclick="window.print()">Print Quote</button>
      <button onclick="window.close()">Close Preview</button>
    </div>
  ` : "";

  return `
  <html>
    <head>
      <title>${v19Esc(q.quoteNumber || "Customer Quote")}</title>
      <style>
        @page { size: letter portrait; margin: 0.30in; }
        body { margin:0; background:${showButtons ? "#e5e7eb" : "#ffffff"}; color:#111827; font-family:Arial, sans-serif; font-size:12px; }
        .preview-actions { position:sticky; top:0; background:#111827; padding:10px; display:flex; gap:10px; z-index:20; }
        .preview-actions button { background:#047857; color:white; border:0; border-radius:8px; padding:10px 14px; font-weight:700; cursor:pointer; }
        .page { background:white; width:8.1in; min-height:10.35in; margin:${showButtons ? "18px auto" : "0"}; padding:0.1in; box-shadow:${showButtons ? "0 2px 16px rgba(0,0,0,.18)" : "none"}; }
        .title { font-size:21px; font-weight:700; margin-bottom:7px; }
        .top { display:grid; grid-template-columns: 0.9fr 1.35fr; gap:10px; align-items:start; }
        .box { border:1px solid #cbd5e1; border-radius:8px; padding:7px; break-inside:avoid; }
        .meta div { margin-bottom:3px; }
        .drawing svg { width:100%; height:auto; max-height:3.45in; display:block; }
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
            <div><strong>Quote #:</strong> ${v19Esc(q.quoteNumber || "")}</div>
            <div><strong>Date:</strong> ${v19Esc(q.quoteDate || "")}</div>
            <div><strong>Customer:</strong> ${v19Esc(q.customerName || "")}</div>
            <div><strong>Customer ID:</strong> ${v19Esc(q.customerId || "")}</div>
            <div><strong>Address:</strong> ${v19Esc(q.jobAddress || "")}</div>
            <div><strong>Quote Type:</strong> ${v19Esc(q.scope || "")}</div>
            <div><strong>Payment:</strong> ${v19Esc(q.paymentMethod || "Cash / Check")}</div>
            <div><strong>Section Width:</strong> ${v19SectionWidthFt()} ft</div>
            <div class="total">Total: $${v19Money(q.pricing?.grandTotal || 0)}</div>

            <table>
              <thead><tr><th>Material Qty</th><th class="right">Count</th></tr></thead>
              <tbody>${materialRows}</tbody>
            </table>
          </div>

          <div class="box drawing">
            <strong>Layout Map</strong>
            ${mapSvg}
            <div class="small">S# = section number. LP = line post/division. Orange = gate/door.</div>
          </div>
        </div>

        <div class="section box">
          <strong>Segment / Division Breakdown</strong>
          <table>
            <thead>
              <tr>
                <th>Seg</th>
                <th class="right">Length</th>
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
            <thead>
              <tr>
                <th>Description</th>
                <th class="right">Quantity</th>
                <th class="right">Total</th>
              </tr>
            </thead>
            <tbody>${lineRows || `<tr><td colspan="3">No quote lines calculated.</td></tr>`}</tbody>
          </table>
        </div>
      </div>
    </body>
  </html>
  `;
}

function v19PreviewCustomerQuote() {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup blocked. Allow popups for this app.");
    return;
  }

  w.document.open();
  w.document.write(v19BuildCustomerQuoteHtml(true));
  w.document.close();
  w.focus();
}

function v19PrintCustomerQuoteDirect() {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup blocked. Allow popups for this app.");
    return;
  }

  w.document.open();
  w.document.write(v19BuildCustomerQuoteHtml(false));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 600);
}

function v19InstallPrintFixPanel() {
  const systemTab = document.getElementById("tab-system");
  const quickTab = document.getElementById("tab-quick");
  const target = systemTab || quickTab;
  if (!target || document.getElementById("v19PrintFixPanel")) return;

  const panel = document.createElement("div");
  panel.id = "v19PrintFixPanel";
  panel.className = "select-line";
  panel.innerHTML = `
    <h3>Fixed Customer Quote Preview</h3>
    <p class="small">Use this preview. It includes quantities, map, gate placement, and customer quote lines.</p>
    <div class="actions">
      <button class="blue" onclick="v19PreviewCustomerQuote()">Preview Customer Quote</button>
      <button class="green" onclick="v19PrintCustomerQuoteDirect()">Print Direct</button>
    </div>
  `;

  target.prepend(panel);
}

function v19OverrideOldPrintButtons() {
  window.v18PreviewCustomerQuote = v19PreviewCustomerQuote;
  window.v18PrintCustomerQuoteDirect = v19PrintCustomerQuoteDirect;
  window.v17PreviewQuoteWithDrawing = v19PreviewCustomerQuote;
  window.v17PrintQuoteWithDrawingDirect = v19PrintCustomerQuoteDirect;
  window.v16PrintQuoteWithDrawing = v19PrintCustomerQuoteDirect;
}

document.addEventListener("DOMContentLoaded", function() {
  setTimeout(function() {
    v19InstallPrintFixPanel();
    v19OverrideOldPrintButtons();

    if (typeof calculateQuote === "function") calculateQuote();
  }, 1200);
});
