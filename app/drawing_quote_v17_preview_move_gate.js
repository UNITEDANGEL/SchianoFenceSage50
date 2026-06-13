/*
Version 17 Clear Drawing + Movable Gate + Quote Preview

Adds:
- Move/edit gate after it is added
- Clearer drawing for quote/receipt
- Large clean printable drawing renderer
- Quote preview screen before printing
- Print from preview
*/

let v17SelectedGateIndex = -1;

function v17Esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[m]));
}

function v17Money(n) {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function v17Round(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function v17GetGateArray() {
  if (!Array.isArray(window.v13LayoutGates)) window.v13LayoutGates = [];
  return window.v13LayoutGates;
}

function v17InstallGateEditPanel() {
  const quick = document.getElementById("tab-quick");
  if (!quick || document.getElementById("v17GateEditPanel")) return;

  const panel = document.createElement("div");
  panel.id = "v17GateEditPanel";
  panel.className = "select-line";
  panel.innerHTML = `
    <h3>Move / Edit Gate on Drawing</h3>
    <p class="small">Select a gate, change segment or position, then update. Position is percentage along the segment.</p>

    <label>Gate to Edit</label>
    <select id="v17GateSelect" onchange="v17LoadSelectedGate()"></select>

    <div class="row">
      <div>
        <label>Move to Segment #</label>
        <input id="v17EditGateSegment" type="number" min="1" step="1" value="1">
      </div>
      <div>
        <label>Move Position %</label>
        <input id="v17EditGatePosition" type="number" min="0" max="100" step="1" value="50">
      </div>
    </div>

    <div class="row">
      <div>
        <label>Gate Width Ft</label>
        <input id="v17EditGateWidth" type="number" min="1" step="0.5" value="4">
      </div>
      <div>
        <label>Gate Color</label>
        <input id="v17EditGateColor" placeholder="White / Black / Almond">
      </div>
    </div>

    <div class="actions">
      <button class="blue" onclick="v17UpdateSelectedGate()">Update Gate Position</button>
      <button class="red" onclick="v17DeleteSelectedGate()">Delete Selected Gate</button>
    </div>

    <div class="notice" style="margin-top:10px;">
      Gate will move on the drawing and update the quote preview.
    </div>
  `;

  quick.appendChild(panel);
  v17RefreshGateSelect();
}

function v17RefreshGateSelect() {
  const sel = document.getElementById("v17GateSelect");
  if (!sel) return;

  const gates = v17GetGateArray();
  sel.innerHTML = "";

  if (!gates.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No gates added yet";
    sel.appendChild(opt);
    return;
  }

  gates.forEach((g, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = "Gate " + (i + 1) + " - Seg " + g.segment + " @ " + g.positionPct + "% - " + (g.itemId || "");
    sel.appendChild(opt);
  });

  if (v17SelectedGateIndex >= 0 && v17SelectedGateIndex < gates.length) {
    sel.value = String(v17SelectedGateIndex);
  }

  v17LoadSelectedGate();
}

function v17LoadSelectedGate() {
  const sel = document.getElementById("v17GateSelect");
  if (!sel || sel.value === "") return;

  v17SelectedGateIndex = Number(sel.value);
  const gate = v17GetGateArray()[v17SelectedGateIndex];
  if (!gate) return;

  const seg = document.getElementById("v17EditGateSegment");
  const pos = document.getElementById("v17EditGatePosition");
  const width = document.getElementById("v17EditGateWidth");
  const color = document.getElementById("v17EditGateColor");

  if (seg) seg.value = gate.segment || 1;
  if (pos) pos.value = gate.positionPct || 50;
  if (width) width.value = gate.widthFt || 4;
  if (color) color.value = gate.color || "";
}

function v17UpdateSelectedGate() {
  const gates = v17GetGateArray();
  if (v17SelectedGateIndex < 0 || v17SelectedGateIndex >= gates.length) {
    alert("Select a gate first.");
    return;
  }

  const maxSeg = Math.max(1, Array.isArray(window.segmentLengths) ? window.segmentLengths.length : 1);
  const seg = Number(document.getElementById("v17EditGateSegment")?.value || 1);
  const pos = Number(document.getElementById("v17EditGatePosition")?.value || 50);
  const width = Number(document.getElementById("v17EditGateWidth")?.value || 4);
  const color = document.getElementById("v17EditGateColor")?.value || "";

  if (seg < 1 || seg > maxSeg) {
    alert("Segment must be between 1 and " + maxSeg + ".");
    return;
  }

  gates[v17SelectedGateIndex].segment = seg;
  gates[v17SelectedGateIndex].positionPct = Math.max(0, Math.min(100, pos));
  gates[v17SelectedGateIndex].widthFt = width;
  gates[v17SelectedGateIndex].color = color || gates[v17SelectedGateIndex].color || "";

  v17RefreshGateSelect();

  if (typeof v13RenderGateList === "function") v13RenderGateList();
  if (typeof draw === "function") draw();
  if (typeof calculateQuote === "function") calculateQuote();
}

function v17DeleteSelectedGate() {
  const gates = v17GetGateArray();
  if (v17SelectedGateIndex < 0 || v17SelectedGateIndex >= gates.length) {
    alert("Select a gate first.");
    return;
  }

  gates.splice(v17SelectedGateIndex, 1);
  v17SelectedGateIndex = -1;

  v17RefreshGateSelect();

  if (typeof v13RenderGateList === "function") v13RenderGateList();
  if (typeof draw === "function") draw();
  if (typeof calculateQuote === "function") calculateQuote();
}

function v17PatchGateAddRefresh() {
  if (window.v17OriginalAddGateToDrawing || typeof window.v13AddGateToDrawing !== "function") return;

  window.v17OriginalAddGateToDrawing = window.v13AddGateToDrawing;

  window.v13AddGateToDrawing = function() {
    window.v17OriginalAddGateToDrawing();
    v17SelectedGateIndex = v17GetGateArray().length - 1;
    v17RefreshGateSelect();
  };
}

function v17SectionWidthFt() {
  return Number(
    document.getElementById("v14SectionWidthQuick")?.value ||
    document.getElementById("sectionWidthFt")?.value ||
    8
  );
}

function v17SegmentPointAt(index, pct) {
  if (!Array.isArray(window.points) || points.length < 2) return null;

  const a = points[index];
  const b = points[index + 1] || ((document.getElementById("layoutClosed")?.value === "closed") ? points[0] : null);
  if (!a || !b) return null;

  const t = Math.max(0, Math.min(100, Number(pct || 0))) / 100;

  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    a,
    b
  };
}

function v17BuildCleanDrawingSvg() {
  if (!Array.isArray(window.points) || points.length < 2) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="650"><rect width="100%" height="100%" fill="white"/><text x="500" y="325" text-anchor="middle" font-family="Arial" font-size="24">No drawing available</text></svg>';
  }

  const rawPoints = points.map(p => ({ x: Number(p.x || 0), y: Number(p.y || 0) }));
  const minX = Math.min(...rawPoints.map(p => p.x));
  const maxX = Math.max(...rawPoints.map(p => p.x));
  const minY = Math.min(...rawPoints.map(p => p.y));
  const maxY = Math.max(...rawPoints.map(p => p.y));

  const pad = 70;
  const width = 1000;
  const height = 650;
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);

  function map(p) {
    return {
      x: pad + (p.x - minX) * scale,
      y: pad + (p.y - minY) * scale
    };
  }

  const mapped = rawPoints.map(map);
  const closed = document.getElementById("layoutClosed")?.value === "closed";

  let svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <rect x="10" y="10" width="${width - 20}" height="${height - 20}" rx="18" fill="#ffffff" stroke="#d1d5db" stroke-width="2"/>
    <text x="500" y="38" text-anchor="middle" font-family="Arial" font-size="22" font-weight="700" fill="#111827">Fence Layout Drawing</text>
  `;

  for (let i = 0; i < mapped.length - 1; i++) {
    svg += v17SvgSegment(mapped[i], mapped[i + 1], i + 1);
  }

  if (closed && mapped.length > 2) {
    svg += v17SvgSegment(mapped[mapped.length - 1], mapped[0], mapped.length);
  }

  mapped.forEach((p, i) => {
    svg += `
      <circle cx="${p.x}" cy="${p.y}" r="11" fill="#111827"/>
      <text x="${p.x}" y="${p.y + 4}" text-anchor="middle" font-family="Arial" font-size="10" font-weight="700" fill="#ffffff">${i + 1}</text>
    `;
  });

  const gates = v17GetGateArray();
  gates.forEach((g, gi) => {
    const segIdx = Number(g.segment || 1) - 1;
    const a = rawPoints[segIdx];
    const b = rawPoints[segIdx + 1] || (closed ? rawPoints[0] : null);
    if (!a || !b) return;

    const pct = Math.max(0, Math.min(100, Number(g.positionPct || 50))) / 100;
    const rawGate = {
      x: a.x + (b.x - a.x) * pct,
      y: a.y + (b.y - a.y) * pct
    };
    const p = map(rawGate);

    svg += `
      <rect x="${p.x - 24}" y="${p.y - 20}" width="48" height="40" rx="6" fill="#f97316" stroke="#7c2d12" stroke-width="3"/>
      <text x="${p.x}" y="${p.y - 2}" text-anchor="middle" font-family="Arial" font-size="15" font-weight="700" fill="#ffffff">G${gi + 1}</text>
      <text x="${p.x}" y="${p.y + 32}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="#111827">${v17Esc(g.widthFt || "")}' gate</text>
    `;
  });

  svg += `
    <g transform="translate(25, ${height - 72})">
      <rect x="0" y="0" width="360" height="48" rx="8" fill="#f9fafb" stroke="#d1d5db"/>
      <circle cx="20" cy="17" r="6" fill="#2563eb"/>
      <text x="35" y="22" font-family="Arial" font-size="12" fill="#111827">LP = Line Post / section break</text>
      <rect x="180" y="6" width="26" height="22" rx="4" fill="#f97316" stroke="#7c2d12"/>
      <text x="218" y="22" font-family="Arial" font-size="12" fill="#111827">Gate / Door</text>
    </g>
  </svg>`;

  return svg;
}

function v17SvgSegment(a, b, segNumber) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenPx = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);

  const segLen = Array.isArray(window.segmentLengths) ? Number(segmentLengths[segNumber - 1] || 0) : 0;
  const secWidth = v17SectionWidthFt();
  const sections = secWidth > 0 ? Math.ceil(segLen / secWidth) : 0;

  let part = `
    <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#111827" stroke-width="8" stroke-linecap="round"/>
  `;

  for (let i = 1; i < sections; i++) {
    const t = i / sections;
    const x = a.x + dx * t;
    const y = a.y + dy * t;

    part += `
      <circle cx="${x}" cy="${y}" r="7" fill="#2563eb" stroke="#1e3a8a" stroke-width="2"/>
      <text x="${x + nx * 18}" y="${y + ny * 18}" text-anchor="middle" font-family="Arial" font-size="10" font-weight="700" fill="#1e3a8a">LP</text>
    `;
  }

  const labelX = (a.x + b.x) / 2 + nx * 36;
  const labelY = (a.y + b.y) / 2 + ny * 36;

  part += `
    <rect x="${labelX - 74}" y="${labelY - 19}" width="148" height="38" rx="8" fill="#ffffff" stroke="#9ca3af" stroke-width="1.5"/>
    <text x="${labelX}" y="${labelY - 3}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="#111827">Seg ${segNumber}: ${v17Esc(segLen)} ft</text>
    <text x="${labelX}" y="${labelY + 12}" text-anchor="middle" font-family="Arial" font-size="11" fill="#374151">${sections} sections @ ${v17Esc(secWidth)} ft</text>
  `;

  return part;
}

function v17BuildQuotePreviewHtml(forPrint) {
  if (typeof calculateQuote === "function") calculateQuote();

  const quote = window.latestQuote || {};
  const svg = v17BuildCleanDrawingSvg();
  const layout = Array.isArray(quote.layoutBreakdown) ? quote.layoutBreakdown : (typeof v16BuildLayoutBreakdown === "function" ? v16BuildLayoutBreakdown() : []);
  const gates = v17GetGateArray();

  const showItemId = typeof v12ShowItemId === "function" ? v12ShowItemId() : false;
  const showUnitPrice = typeof v12ShowUnitPrice === "function" ? v12ShowUnitPrice() : false;

  let quoteHeaders = "";
  if (showItemId) quoteHeaders += "<th>Item ID</th>";
  quoteHeaders += "<th>Description</th>";
  if (showUnitPrice) quoteHeaders += "<th class='right'>Unit Price</th>";
  quoteHeaders += "<th class='right'>Qty</th><th class='right'>Total</th>";

  const quoteRows = (quote.lineItems || []).map(line => {
    let cells = "";
    if (showItemId) cells += "<td>" + v17Esc(line.code || "") + "</td>";
    cells += "<td>" + v17Esc(line.item || "") + "</td>";
    if (showUnitPrice) cells += "<td class='right'>$" + v17Money(line.unitPrice || 0) + "</td>";
    cells += "<td class='right'>" + v17Esc(String(line.qty || "")) + " " + v17Esc(line.unit || "") + "</td>";
    cells += "<td class='right'>$" + v17Money(line.total || 0) + "</td>";
    return "<tr>" + cells + "</tr>";
  }).join("");

  const layoutRows = layout.map(r => `
    <tr>
      <td>${v17Esc(r.segmentNumber)}</td>
      <td class="right">${v17Esc(r.lengthFt)}</td>
      <td class="right">${v17Esc(r.gateWidthFt)}</td>
      <td class="right">${v17Esc(r.usableFt)}</td>
      <td>${v17Esc(r.label)}</td>
      <td class="right">${v17Esc(r.linePosts)}</td>
    </tr>
  `).join("");

  const gateRows = gates.length ? gates.map((g, i) => `
    <tr>
      <td>G${i + 1}</td>
      <td>${v17Esc(g.segment)}</td>
      <td>${v17Esc(g.positionPct)}%</td>
      <td>${v17Esc(g.widthFt)} ft</td>
      <td>${v17Esc(g.itemId)}</td>
      <td>${v17Esc(g.description)}</td>
      <td>${v17Esc(g.color)}</td>
    </tr>
  `).join("") : `<tr><td colspan="7">No gates / doors on drawing.</td></tr>`;

  const printButton = forPrint ? "" : `
    <div class="screen-actions">
      <button onclick="window.print()">Print This Quote</button>
      <button onclick="window.close()">Close Preview</button>
    </div>
  `;

  return `
    <html>
      <head>
        <title>${v17Esc(quote.quoteNumber || "Fence Quote Preview")}</title>
        <style>
          @page { size: letter portrait; margin: 0.32in; }
          body { font-family: Arial, sans-serif; color:#111827; margin:0; background:${forPrint ? "#ffffff" : "#e5e7eb"}; font-size:12px; }
          .screen-actions { position: sticky; top:0; background:#111827; padding:10px; display:flex; gap:10px; z-index:10; }
          .screen-actions button { background:#047857; color:white; border:0; border-radius:7px; padding:10px 14px; font-weight:700; cursor:pointer; }
          .page { background:white; margin:${forPrint ? "0" : "18px auto"}; width:8.1in; min-height:10.4in; padding:0.12in; box-shadow:${forPrint ? "none" : "0 2px 14px rgba(0,0,0,.18)"}; }
          .title { font-size:20px; font-weight:bold; margin-bottom:7px; }
          .grid { display:grid; grid-template-columns: 1fr 1.05fr; gap:10px; align-items:start; }
          .box { border:1px solid #cbd5e1; border-radius:8px; padding:7px; break-inside:avoid; }
          .meta div { margin-bottom:3px; }
          .drawing svg { width:100%; height:auto; max-height:3.6in; display:block; }
          table { width:100%; border-collapse:collapse; margin-top:6px; }
          th, td { border:1px solid #d1d5db; padding:4px; font-size:10.5px; vertical-align:top; }
          th { background:#f3f4f6; text-align:left; }
          .right { text-align:right; }
          .section { margin-top:8px; }
          .total { font-size:18px; font-weight:bold; text-align:right; margin-top:6px; }
          .small { font-size:9.5px; color:#4b5563; }
          @media print {
            body { background:white; }
            .screen-actions { display:none; }
            .page { margin:0; box-shadow:none; width:auto; min-height:auto; padding:0; }
          }
        </style>
      </head>
      <body>
        ${printButton}
        <div class="page">
          <div class="title">Fence Quote</div>

          <div class="grid">
            <div class="box meta">
              <div><strong>Quote #:</strong> ${v17Esc(quote.quoteNumber || "")}</div>
              <div><strong>Date:</strong> ${v17Esc(quote.quoteDate || "")}</div>
              <div><strong>Customer:</strong> ${v17Esc(quote.customerName || "")}</div>
              <div><strong>Customer ID:</strong> ${v17Esc(quote.customerId || "")}</div>
              <div><strong>Job Address:</strong> ${v17Esc(quote.jobAddress || "")}</div>
              <div><strong>Quote Type:</strong> ${v17Esc(quote.scope || "")}</div>
              <div><strong>Payment:</strong> ${v17Esc(quote.paymentMethod || "Cash / Check")}</div>
              <div><strong>Section Width:</strong> ${v17Esc(String(quote.sectionWidthFt || v17SectionWidthFt()))} ft</div>
              <div><strong>Notes:</strong> ${v17Esc(quote.notes || "")}</div>
              <div class="total">Total: $${v17Money(quote.pricing?.grandTotal || 0)}</div>
            </div>

            <div class="box drawing">
              <div><strong>Clear Layout Map</strong></div>
              ${svg}
              <div class="small">LP = line post / section break. Orange boxes are gates/doors.</div>
            </div>
          </div>

          <div class="section box">
            <strong>Segment / Section Breakdown</strong>
            <table>
              <thead>
                <tr>
                  <th>Seg</th>
                  <th class="right">Len Ft</th>
                  <th class="right">Gate Ft</th>
                  <th class="right">Usable Ft</th>
                  <th>Section Split</th>
                  <th class="right">Line Posts</th>
                </tr>
              </thead>
              <tbody>${layoutRows || `<tr><td colspan="6">No segment data.</td></tr>`}</tbody>
            </table>
          </div>

          <div class="section box">
            <strong>Gate / Door Layout</strong>
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
    </html>
  `;
}

function v17PreviewQuoteWithDrawing() {
  const w = window.open("", "_blank");
  if (!w) return;

  w.document.write(v17BuildQuotePreviewHtml(false));
  w.document.close();
  w.focus();
}

function v17PrintQuoteWithDrawingDirect() {
  const w = window.open("", "_blank");
  if (!w) return;

  w.document.write(v17BuildQuotePreviewHtml(true));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 600);
}

function v17InstallPreviewButtons() {
  const quick = document.getElementById("tab-quick");
  if (!quick || document.getElementById("v17PreviewPrintPanel")) return;

  const panel = document.createElement("div");
  panel.id = "v17PreviewPrintPanel";
  panel.className = "select-line";
  panel.innerHTML = `
    <h3>Preview / Print Quote With Clear Drawing</h3>
    <p class="small">Preview first, then print. The preview includes the clear map, gates, section split, and quote lines.</p>

    <div class="actions">
      <button class="blue" onclick="v17PreviewQuoteWithDrawing()">Preview Quote</button>
      <button class="green" onclick="v17PrintQuoteWithDrawingDirect()">Print Direct</button>
    </div>
  `;

  quick.appendChild(panel);
}

document.addEventListener("DOMContentLoaded", function() {
  setTimeout(function() {
    v17InstallGateEditPanel();
    v17PatchGateAddRefresh();
    v17InstallPreviewButtons();

    if (typeof draw === "function") draw();
    if (typeof calculateQuote === "function") calculateQuote();
  }, 5900);
});
