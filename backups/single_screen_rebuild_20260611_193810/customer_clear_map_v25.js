/*
Version 25 Customer Clear Map

Purpose:
- Customer-facing map must be 100% clear.
- No overlapping labels.
- Gate swing must be obvious.
- Show where gate starts, ends, and where the door swings open.
- Keep editing/dragging separate from customer print map.
- Customer print map uses clean callout boxes below the map instead of crowding labels on fence line.
*/

function v25Esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[m]));
}

function v25Money(n) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function v25Points() {
  try {
    if (typeof points !== "undefined" && Array.isArray(points)) return points;
  } catch (e) {}
  return [];
}

function v25SegmentLengths() {
  try {
    if (typeof segmentLengths !== "undefined" && Array.isArray(segmentLengths)) return segmentLengths;
  } catch (e) {}
  return [];
}

function v25Gates() {
  try {
    if (typeof v13LayoutGates !== "undefined" && Array.isArray(v13LayoutGates)) return v13LayoutGates;
  } catch (e) {}
  window.v13LayoutGates = [];
  return window.v13LayoutGates;
}

function v25SectionWidthFt() {
  return Number(
    document.getElementById("v14SectionWidthQuick")?.value ||
    document.getElementById("sectionWidthFt")?.value ||
    8
  );
}

function v25ClosedLayout() {
  return document.getElementById("layoutClosed")?.value === "closed";
}

function v25SwingLabel(value) {
  const map = {
    outswing_left: "Outswing Left",
    outswing_right: "Outswing Right",
    inswing_left: "Inswing Left",
    inswing_right: "Inswing Right"
  };
  return map[value] || "Outswing Left";
}

function v25RunsForSegment(segmentNumber) {
  if (typeof v22SplitFenceRunsAroundGates === "function") return v22SplitFenceRunsAroundGates(segmentNumber);
  if (typeof v21SplitFenceRunsAroundGates === "function") return v21SplitFenceRunsAroundGates(segmentNumber);

  const len = Number(v25SegmentLengths()[Number(segmentNumber) - 1] || 0);
  return [{ type:"fence", start:0, end:len, length:len }];
}

function v25SectionsForRun(lengthFt) {
  const width = Math.max(0.01, v25SectionWidthFt());
  const full = Math.floor(Number(lengthFt || 0) / width);
  const rem = Math.round((Number(lengthFt || 0) - full * width + Number.EPSILON) * 100) / 100;
  const partial = rem > 0.01 ? 1 : 0;

  return {
    total: full + partial,
    label: rem > 0.01 ? `${full} x ${width}' + ${rem}' cut` : `${full} x ${width}'`
  };
}

function v25MapGeometry(width, height, pad) {
  const pts = v25Points();
  if (pts.length < 2) return null;

  const minX = Math.min(...pts.map(p => Number(p.x || 0)));
  const maxX = Math.max(...pts.map(p => Number(p.x || 0)));
  const minY = Math.min(...pts.map(p => Number(p.y || 0)));
  const maxY = Math.max(...pts.map(p => Number(p.y || 0)));

  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);

  return pts.map(p => ({
    x: pad + (Number(p.x || 0) - minX) * scale,
    y: pad + (Number(p.y || 0) - minY) * scale
  }));
}

function v25GateCenter(gate, mapped) {
  const segIndex = Number(gate.segment || 1) - 1;
  const a = mapped[segIndex];
  const b = mapped[segIndex + 1] || (v25ClosedLayout() ? mapped[0] : null);
  if (!a || !b) return null;

  const segLen = Number(v25SegmentLengths()[segIndex] || 1);
  const start = Number(gate.startFt ?? ((Number(gate.positionPct || 0) / 100) * segLen));
  const width = Number(gate.widthFt || 0);
  const center = start + width / 2;
  const t = Math.max(0, Math.min(1, center / Math.max(0.01, segLen)));

  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    a,
    b,
    segLen,
    start,
    end: start + width,
    width
  };
}

function v25SwingGeometry(x, y, angle, swing, gateWidthPx) {
  const swingText = String(swing || "outswing_left");
  const isIn = swingText.startsWith("in");
  const isLeft = swingText.endsWith("left");

  const tx = Math.cos(angle);
  const ty = Math.sin(angle);
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);

  const side = isIn ? -1 : 1;
  const hingeSide = isLeft ? -1 : 1;

  const hx = x + tx * hingeSide * gateWidthPx / 2;
  const hy = y + ty * hingeSide * gateWidthPx / 2;

  const openLength = gateWidthPx * 0.95;
  const openX = hx + nx * side * openLength;
  const openY = hy + ny * side * openLength;

  const arcCx = hx + nx * side * openLength * 0.7 + tx * hingeSide * openLength * 0.35;
  const arcCy = hy + ny * side * openLength * 0.7 + ty * hingeSide * openLength * 0.35;

  return {
    hx,
    hy,
    openX,
    openY,
    path: `M ${hx} ${hy} Q ${arcCx} ${arcCy} ${openX} ${openY}`
  };
}

function v25BuildCustomerClearMapSvg() {
  const width = 1000;
  const height = 575;
  const pad = 95;
  const mapped = v25MapGeometry(width, height, pad);

  if (!mapped) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <text x="${width/2}" y="${height/2}" text-anchor="middle" font-family="Arial" font-size="22">No map available</text>
      </svg>
    `;
  }

  const lengths = v25SegmentLengths();
  const gates = v25Gates();
  const closed = v25ClosedLayout();

  let svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <marker id="v25arrow" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill="#dc2626"/>
      </marker>
    </defs>

    <rect width="100%" height="100%" fill="#ffffff"/>
    <rect x="8" y="8" width="${width-16}" height="${height-16}" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>

    <text x="${width/2}" y="31" text-anchor="middle" font-family="Arial" font-size="18" font-weight="900" fill="#111827">Customer Fence Layout</text>
    <text x="${width/2}" y="51" text-anchor="middle" font-family="Arial" font-size="10.5" fill="#4b5563">Gate swing shown with red arc. Detailed dimensions listed below map.</text>
  `;

  function drawFenceRun(a, b, segLen, run, segNo) {
    const t1 = run.start / Math.max(0.01, segLen);
    const t2 = run.end / Math.max(0.01, segLen);

    const x1 = a.x + (b.x - a.x) * t1;
    const y1 = a.y + (b.y - a.y) * t1;
    const x2 = a.x + (b.x - a.x) * t2;
    const y2 = a.y + (b.y - a.y) * t2;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenPx = Math.sqrt(dx * dx + dy * dy);
    if (lenPx < 1) return "";

    const angle = Math.atan2(dy, dx);
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);

    const sec = v25SectionsForRun(run.length);

    let out = `
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111827" stroke-width="7" stroke-linecap="round"/>
    `;

    for (let i = 1; i < sec.total; i++) {
      const t = i / sec.total;
      const px = x1 + dx * t;
      const py = y1 + dy * t;

      out += `
        <circle cx="${px}" cy="${py}" r="5.5" fill="#2563eb"/>
        <text x="${px + nx * 16}" y="${py + ny * 16 + 3}" text-anchor="middle" font-family="Arial" font-size="8" font-weight="900" fill="#1e3a8a">LP</text>
      `;
    }

    return out;
  }

  function drawSegment(segIndex, a, b) {
    const segNo = segIndex + 1;
    const segLen = Number(lengths[segIndex] || 0);
    const runs = v25RunsForSegment(segNo);

    let out = "";
    runs.forEach(run => {
      if (run.type === "fence" && run.length > 0.01) {
        out += drawFenceRun(a, b, segLen, run, segNo);
      }
    });

    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;

    out += `
      <rect x="${midX - 44}" y="${midY - 13}" width="88" height="26" rx="7" fill="#ffffff" stroke="#94a3b8"/>
      <text x="${midX}" y="${midY + 4}" text-anchor="middle" font-family="Arial" font-size="9" font-weight="900" fill="#111827">SEG ${segNo}: ${segLen}'</text>
    `;

    return out;
  }

  for (let i = 0; i < mapped.length - 1; i++) {
    svg += drawSegment(i, mapped[i], mapped[i + 1]);
  }

  if (closed && mapped.length > 2) {
    svg += drawSegment(mapped.length - 1, mapped[mapped.length - 1], mapped[0]);
  }

  mapped.forEach((p, i) => {
    svg += `
      <circle cx="${p.x}" cy="${p.y}" r="9" fill="#111827"/>
      <text x="${p.x}" y="${p.y + 3}" text-anchor="middle" font-family="Arial" font-size="8" font-weight="900" fill="#ffffff">P${i + 1}</text>
    `;
  });

  gates.forEach((gate, i) => {
    const c = v25GateCenter(gate, mapped);
    if (!c) return;

    const angle = Math.atan2(c.b.y - c.a.y, c.b.x - c.a.x);
    const widthPx = Math.max(50, Math.min(90, Number(gate.widthFt || 4) * 13));
    const swing = gate.swing || "outswing_left";
    const swingGeo = v25SwingGeometry(c.x, c.y, angle, swing, widthPx);

    svg += `
      <path d="${swingGeo.path}" fill="none" stroke="#dc2626" stroke-width="4" marker-end="url(#v25arrow)"/>
      <line x1="${swingGeo.hx}" y1="${swingGeo.hy}" x2="${swingGeo.openX}" y2="${swingGeo.openY}" stroke="#dc2626" stroke-width="2" stroke-dasharray="5 5"/>

      <g transform="translate(${c.x} ${c.y}) rotate(${angle * 180 / Math.PI})">
        <rect x="${-widthPx/2}" y="-18" width="${widthPx}" height="36" rx="6" fill="#f97316" stroke="#7c2d12" stroke-width="3"/>
        <line x1="0" y1="-15" x2="0" y2="15" stroke="#ffffff" stroke-width="2"/>
        <line x1="${-widthPx/2 + 6}" y1="0" x2="${widthPx/2 - 6}" y2="0" stroke="#ffffff" stroke-width="2"/>
      </g>

      <rect x="${c.x - 45}" y="${c.y - 44}" width="90" height="20" rx="6" fill="#fff7ed" stroke="#fdba74"/>
      <text x="${c.x}" y="${c.y - 30}" text-anchor="middle" font-family="Arial" font-size="9" font-weight="900" fill="#7c2d12">G${i + 1}: ${v25Esc(gate.widthFt || "")}'</text>
    `;
  });

  svg += `
    <g transform="translate(18, ${height - 35})">
      <text x="0" y="0" font-family="Arial" font-size="9" fill="#4b5563">Orange = gate. Red arc/arrow = swing direction and landing/opening path. LP = line post.</text>
    </g>
  </svg>`;

  return svg;
}

function v25BuildGateDetailRows(showPrice) {
  const gates = v25Gates();

  if (!gates.length) {
    return `<tr><td colspan="${showPrice ? 8 : 7}">No gates selected.</td></tr>`;
  }

  return gates.map((gate, i) => {
    const swing = gate.swing || "outswing_left";
    const price = typeof v24GateUnitPrice === "function" ? v24GateUnitPrice(gate) : Number(gate.unitPrice || 0);

    return `
      <tr>
        <td>G${i + 1}</td>
        <td>${v25Esc(gate.gateType === "double" ? "Double Driveway Gate" : "Walk Gate")}</td>
        <td>${v25Esc(gate.segment || "")}</td>
        <td>${v25Esc(gate.startFt ?? "")}'</td>
        <td>${v25Esc((Number(gate.startFt || 0) + Number(gate.widthFt || 0)).toFixed(2))}'</td>
        <td>${v25Esc(gate.widthFt || "")}'</td>
        <td><strong>${v25Esc(v25SwingLabel(swing))}</strong></td>
        ${showPrice ? `<td class="right">$${v25Money(price)}</td>` : ""}
      </tr>
    `;
  }).join("");
}

function v25PatchCustomerHtml() {
  window.v25BuildCustomerClearMapSvg = v25BuildCustomerClearMapSvg;

  window.v24BuildCleanCustomerMapSvg = v25BuildCustomerClearMapSvg;
  window.v23BuildCleanMapSvg = v25BuildCustomerClearMapSvg;
  window.v22BuildDraggableSvg = v25BuildCustomerClearMapSvg;
  window.v21BuildBetterMapSvg = v25BuildCustomerClearMapSvg;
  window.v20BuildMapSvg = v25BuildCustomerClearMapSvg;
  window.v19BuildMapSvg = v25BuildCustomerClearMapSvg;

  if (typeof v24BuildCustomerHtml === "function") {
    window.v25OriginalBuildCustomerHtml = v24BuildCustomerHtml;

    window.v24BuildCustomerHtml = function(showButtons) {
      const q = typeof v24GetQuote === "function" ? v24GetQuote() : null;
      const quote = typeof v24EnsureGateLines === "function" ? v24EnsureGateLines(q) : q;

      if (!quote) {
        return `<html><body style="font-family:Arial;padding:30px;"><h2>No quote calculated yet</h2></body></html>`;
      }

      const showUnitPrice = typeof v24ShowUnitPrice === "function" ? v24ShowUnitPrice() : false;
      const showItemId = typeof v24ShowItemId === "function" ? v24ShowItemId() : false;

      const qtyRows = (typeof v24BuildQuantitySummary === "function" ? v24BuildQuantitySummary(quote) : []).map(row => `
        <tr>
          <td>${v25Esc(row[0])}</td>
          <td class="right">${v25Esc(row[1])}</td>
        </tr>
      `).join("");

      let lineHeaders = "";
      if (showItemId) lineHeaders += "<th>Item ID</th>";
      lineHeaders += "<th>Description</th>";
      if (showUnitPrice) lineHeaders += "<th class='right'>Unit Price</th>";
      lineHeaders += "<th class='right'>Quantity</th><th class='right'>Total</th>";

      const lineRows = (quote.lineItems || []).map(line => {
        let cells = "";
        if (showItemId) cells += `<td>${v25Esc(line.code || "")}</td>`;
        cells += `<td>${v25Esc(line.item || "")}</td>`;
        if (showUnitPrice) cells += `<td class="right">$${v25Money(line.unitPrice || 0)}</td>`;
        cells += `<td class="right">${v25Esc(line.qty || "")} ${v25Esc(line.unit || "")}</td>`;
        cells += `<td class="right">$${v25Money(line.total || 0)}</td>`;
        return `<tr>${cells}</tr>`;
      }).join("");

      const buttons = showButtons ? `
        <div class="preview-actions">
          <button onclick="window.print()">Print Quote</button>
          <button onclick="window.close()">Close Preview</button>
        </div>
      ` : "";

      return `
      <html>
        <head>
          <title>${v25Esc(quote.quoteNumber || "Customer Quote")}</title>
          <style>
            @page { size: letter portrait; margin: 0.22in; }
            body { margin:0; background:${showButtons ? "#e5e7eb" : "#ffffff"}; color:#111827; font-family:Arial, sans-serif; font-size:10.5px; }
            .preview-actions { position:sticky; top:0; background:#111827; padding:9px; display:flex; gap:9px; z-index:20; }
            .preview-actions button { background:#047857; color:white; border:0; border-radius:8px; padding:9px 13px; font-weight:800; cursor:pointer; }
            .page { background:white; width:8.0in; min-height:10.25in; margin:${showButtons ? "14px auto" : "0"}; padding:0.07in; box-shadow:${showButtons ? "0 2px 16px rgba(0,0,0,.18)" : "none"}; }
            .title { font-size:19px; font-weight:900; margin-bottom:4px; }
            .top { display:grid; grid-template-columns: 0.72fr 1.5fr; gap:7px; align-items:start; }
            .box { border:1px solid #cbd5e1; border-radius:7px; padding:5px; break-inside:avoid; }
            .meta div { margin-bottom:2px; }
            .drawing svg { width:100%; height:auto; max-height:3.95in; display:block; }
            table { width:100%; border-collapse:collapse; margin-top:4px; }
            th, td { border:1px solid #d1d5db; padding:3px 4px; font-size:9.2px; vertical-align:top; }
            th { background:#f3f4f6; text-align:left; font-weight:800; }
            .right { text-align:right; }
            .section { margin-top:5px; }
            .total { font-size:17px; font-weight:900; text-align:right; margin-top:4px; }
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
                <div><strong>Quote #:</strong> ${v25Esc(quote.quoteNumber || "")}</div>
                <div><strong>Date:</strong> ${v25Esc(quote.quoteDate || "")}</div>
                <div><strong>Customer:</strong> ${v25Esc(quote.customerName || "")}</div>
                <div><strong>Address:</strong> ${v25Esc(quote.jobAddress || "")}</div>
                <div><strong>Quote Type:</strong> ${v25Esc(quote.scope || "")}</div>
                <div><strong>Payment:</strong> ${v25Esc(quote.paymentMethod || "Cash / Check")}</div>
                <div><strong>Section Width:</strong> ${v25SectionWidthFt()}'</div>
                <div class="total">Total: $${v25Money(quote.pricing?.grandTotal || 0)}</div>

                <table>
                  <thead><tr><th>Quantity Summary</th><th class="right">Qty</th></tr></thead>
                  <tbody>${qtyRows}</tbody>
                </table>
              </div>

              <div class="box drawing">
                <strong>Gate Swing / Customer Map</strong>
                ${v25BuildCustomerClearMapSvg()}
              </div>
            </div>

            <div class="section box">
              <strong>Gate / Door Details</strong>
              <table>
                <thead>
                  <tr>
                    <th>Gate</th>
                    <th>Type</th>
                    <th>Seg</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Width</th>
                    <th>Swing / Opening Direction</th>
                    ${showUnitPrice ? "<th class='right'>Price</th>" : ""}
                  </tr>
                </thead>
                <tbody>${v25BuildGateDetailRows(showUnitPrice)}</tbody>
              </table>
            </div>

            <div class="section box">
              <strong>Quote Lines</strong>
              <table>
                <thead><tr>${lineHeaders}</tr></thead>
                <tbody>${lineRows || `<tr><td colspan="4">No quote lines calculated.</td></tr>`}</tbody>
              </table>
            </div>
          </div>
        </body>
      </html>`;
    };
  }
}

function v25RenderInlineMap() {
  const box = document.getElementById("v22DragMap") || document.getElementById("v18FenceSystemDrawingPreview");
  if (!box) return;

  box.innerHTML = v25BuildCustomerClearMapSvg();

  if (typeof v22AttachDragHandlers === "function") {
    v22AttachDragHandlers();
  }
}

document.addEventListener("DOMContentLoaded", function() {
  setTimeout(function() {
    v25PatchCustomerHtml();

    if (typeof calculateQuote === "function") calculateQuote();

    v25RenderInlineMap();

    if (typeof v24PatchAllPrintFunctions === "function") {
      v24PatchAllPrintFunctions();
    }

    window.v23RenderCleanMap = v25RenderInlineMap;
    window.v22RenderDragMap = v25RenderInlineMap;
  }, 2200);
});
