/*
Version 24 Unified Customer Print + Gate Price + Clean Map

Fixes:
- Removes/hides duplicate customer print buttons/panels
- Creates one single customer print/preview control area
- Customer quote can hide/show unit price
- Default customer quote hides unit price
- Gate price is forced into quote lines and totals
- Cleaner customer map with less overlap
- Gate swing direction shown clearly in callout table and map
- Customer page designed to fit better on letter page
*/

function v24Esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[m]));
}

function v24Money(n) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function v24Gates() {
  try {
    if (typeof v13LayoutGates !== "undefined" && Array.isArray(v13LayoutGates)) return v13LayoutGates;
  } catch (e) {}
  window.v13LayoutGates = [];
  return window.v13LayoutGates;
}

function v24Points() {
  try {
    if (typeof points !== "undefined" && Array.isArray(points)) return points;
  } catch (e) {}
  return [];
}

function v24SegmentLengths() {
  try {
    if (typeof segmentLengths !== "undefined" && Array.isArray(segmentLengths)) return segmentLengths;
  } catch (e) {}
  return [];
}

function v24SectionWidthFt() {
  return Number(
    document.getElementById("v14SectionWidthQuick")?.value ||
    document.getElementById("sectionWidthFt")?.value ||
    8
  );
}

function v24ClosedLayout() {
  return document.getElementById("layoutClosed")?.value === "closed";
}

function v24ShowUnitPrice() {
  return document.getElementById("v24ShowUnitPrice")?.value === "yes";
}

function v24ShowItemId() {
  return document.getElementById("v24ShowItemId")?.value === "yes";
}

function v24SwingLabel(value) {
  const map = {
    outswing_left: "Outswing Left",
    outswing_right: "Outswing Right",
    inswing_left: "Inswing Left",
    inswing_right: "Inswing Right"
  };
  return map[value] || "Outswing Left";
}

function v24GateUnitPrice(gate) {
  if (!gate) return 0;

  if (Number(gate.unitPrice || 0) > 0) {
    return Number(gate.unitPrice || 0);
  }

  const item = gate.item || (Array.isArray(window.inventoryItems) ? inventoryItems.find(x => x.ItemID === gate.itemId) : null);

  if (item) {
    if (typeof v11PriceForItem === "function") {
      return Number(v11PriceForItem(item, 1, ""));
    }
    return Number(item.Retail || 0);
  }

  return 0;
}

function v24InstallUnifiedPanel() {
  const systemTab = document.getElementById("tab-system") || document.getElementById("tab-quick");
  if (!systemTab) return;

  v24HideDuplicatePrintPanels();

  if (document.getElementById("v24UnifiedCustomerPrintPanel")) return;

  const panel = document.createElement("div");
  panel.id = "v24UnifiedCustomerPrintPanel";
  panel.className = "select-line";
  panel.innerHTML = `
    <h3>Customer Quote Preview / Print</h3>
    <p class="small">
      Use this one customer print area. It includes quantities, total, gate price, gate swing, and a clean map.
    </p>

    <div class="row">
      <div>
        <label>Show Unit Price?</label>
        <select id="v24ShowUnitPrice">
          <option value="no" selected>No - hide unit price from customer</option>
          <option value="yes">Yes - show unit price</option>
        </select>
      </div>
      <div>
        <label>Show Item ID?</label>
        <select id="v24ShowItemId">
          <option value="no" selected>No</option>
          <option value="yes">Yes</option>
        </select>
      </div>
    </div>

    <div class="actions">
      <button class="blue" onclick="v24PreviewCustomerQuote()">Preview Customer Quote</button>
      <button class="green" onclick="v24PrintCustomerQuoteDirect()">Print Customer Quote</button>
    </div>

    <div class="notice" style="margin-top:10px;">
      Customer default: no unit price, quantity + total only.
    </div>
  `;

  systemTab.prepend(panel);
}

function v24HideDuplicatePrintPanels() {
  const duplicateIds = [
    "v12QuoteDisplayMode",
    "v16PrintPanel",
    "v17PreviewPrintPanel",
    "v18FenceSystemPreviewPanel",
    "v19PrintFixPanel",
    "v20CustomerQuotePanel"
  ];

  duplicateIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    const box = el.closest(".select-line") || el;
    if (box.id !== "v24UnifiedCustomerPrintPanel") {
      box.style.display = "none";
      box.dataset.v24HiddenDuplicate = "1";
    }
  });

  document.querySelectorAll("button").forEach(btn => {
    const txt = String(btn.textContent || "").trim().toLowerCase();
    const onclick = String(btn.getAttribute("onclick") || "").toLowerCase();

    const isOldPrint =
      (txt.includes("preview customer quote") || txt.includes("print customer quote") || txt.includes("print quote with drawing") || txt.includes("print direct")) &&
      !onclick.includes("v24");

    if (isOldPrint) {
      const box = btn.closest(".select-line");
      if (box && box.id !== "v24UnifiedCustomerPrintPanel") {
        box.style.display = "none";
        box.dataset.v24HiddenDuplicate = "1";
      }
    }
  });
}

function v24GetQuote() {
  if (typeof calculateQuote === "function" && !window.v24Calculating) {
    calculateQuote();
  }

  try {
    if (typeof latestQuote !== "undefined" && latestQuote) return latestQuote;
  } catch (e) {}

  return null;
}

function v24EnsureGateLines(quote) {
  if (!quote || !Array.isArray(quote.lineItems)) return quote;

  const gates = v24Gates();

  gates.forEach((gate, i) => {
    const code = gate.itemId || ("GATE-" + (i + 1));
    const already = quote.lineItems.some(line =>
      String(line.code || "") === String(code) ||
      String(line.source || "").includes("Layout Gate") && String(line.item || "").includes(gate.description || "")
    );

    if (already) return;

    const price = v24GateUnitPrice(gate);
    const desc = gate.description || gate.itemId || (gate.gateType === "double" ? "Double Driveway Gate" : "Walk Gate");

    quote.lineItems.push({
      code,
      item: desc + " - " + v24SwingLabel(gate.swing || "outswing_left"),
      qty: 1,
      unit: "EA",
      unitPrice: price,
      total: price,
      source: "Layout Gate / " + (gate.color || "selected color")
    });
  });

  const total = quote.lineItems.reduce((sum, line) => sum + Number(line.total || 0), 0);
  if (!quote.pricing) quote.pricing = {};
  quote.pricing.grandTotal = Math.round((total + Number.EPSILON) * 100) / 100;

  return quote;
}

function v24PatchCalculateForGatePrice() {
  if (window.v24OriginalCalculateQuote || typeof calculateQuote !== "function") return;

  window.v24OriginalCalculateQuote = calculateQuote;

  window.calculateQuote = function() {
    if (window.v24Calculating) return;
    window.v24Calculating = true;

    try {
      window.v24OriginalCalculateQuote();

      try {
        if (typeof latestQuote !== "undefined" && latestQuote) {
          v24EnsureGateLines(latestQuote);
        }
      } catch (e) {}
    } finally {
      window.v24Calculating = false;
    }
  };
}

function v24RunsForSegment(segmentNumber) {
  if (typeof v22SplitFenceRunsAroundGates === "function") return v22SplitFenceRunsAroundGates(segmentNumber);
  if (typeof v21SplitFenceRunsAroundGates === "function") return v21SplitFenceRunsAroundGates(segmentNumber);

  const len = Number(v24SegmentLengths()[Number(segmentNumber) - 1] || 0);
  return [{ type:"fence", start:0, end:len, length:len }];
}

function v24SectionsForRun(lengthFt) {
  const width = Math.max(0.01, v24SectionWidthFt());
  const full = Math.floor(Number(lengthFt || 0) / width);
  const rem = Math.round((Number(lengthFt || 0) - full * width + Number.EPSILON) * 100) / 100;
  const partial = rem > 0.01 ? 1 : 0;
  return {
    total: full + partial,
    label: rem > 0.01 ? `${full}x${width}' + ${rem}' cut` : `${full}x${width}'`
  };
}

function v24BuildQuantitySummary(q) {
  const lengths = v24SegmentLengths();
  const gates = v24Gates();

  let totalLf = 0;
  let sections = 0;
  let linePosts = 0;
  let gateCount = gates.length;

  lengths.forEach((len, i) => {
    totalLf += Number(len || 0);
    const runs = v24RunsForSegment(i + 1);
    runs.forEach(run => {
      if (run.type === "fence") {
        const sec = v24SectionsForRun(run.length);
        sections += sec.total;
        linePosts += Math.max(0, sec.total - 1);
      }
    });
  });

  let counts = {};
  try { counts = q?.layout?.counts || {}; } catch (e) {}

  const cornerPosts = counts.cornerPosts ?? Math.max(0, lengths.length - 1);
  const endPosts = counts.endPosts ?? 2;
  const totalPosts = counts.totalPosts ?? (linePosts + cornerPosts + endPosts);

  const scope = String(q?.scope || "").toLowerCase();
  const includeConcrete = !scope.includes("materials only");

  return [
    ["Total Linear Feet", totalLf],
    ["Fence Sections / Panels", sections],
    ["Line Posts", linePosts],
    ["Corner Posts", cornerPosts],
    ["End Posts", endPosts],
    ["Total Posts", totalPosts],
    ["Post Caps", totalPosts],
    ["Gates / Doors", gateCount],
    ["Concrete Bags", includeConcrete ? totalPosts : 0]
  ];
}

function v24MapGeometry(width, height, pad) {
  const pts = v24Points();
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

function v24GateCenter(gate, mapped) {
  const segIndex = Number(gate.segment || 1) - 1;
  const a = mapped[segIndex];
  const b = mapped[segIndex + 1] || (v24ClosedLayout() ? mapped[0] : null);
  if (!a || !b) return null;

  const segLen = Number(v24SegmentLengths()[segIndex] || 1);
  const start = Number(gate.startFt ?? ((Number(gate.positionPct || 0) / 100) * segLen));
  const center = start + Number(gate.widthFt || 0) / 2;
  const t = Math.max(0, Math.min(1, center / Math.max(0.01, segLen)));

  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    a,
    b,
    segLen,
    start
  };
}

function v24SwingArc(x, y, angle, swing, size) {
  const outward = String(swing || "").startsWith("in") ? -1 : 1;
  const left = String(swing || "").endsWith("left");

  const nx = -Math.sin(angle) * outward;
  const ny = Math.cos(angle) * outward;
  const tx = Math.cos(angle);
  const ty = Math.sin(angle);

  const hingeOffset = left ? -size / 2 : size / 2;
  const hx = x + tx * hingeOffset;
  const hy = y + ty * hingeOffset;

  const dir = left ? -1 : 1;
  const r = size * 0.95;
  const cx = hx + nx * r;
  const cy = hy + ny * r;
  const ex = cx + tx * dir * r * 0.55;
  const ey = cy + ty * dir * r * 0.55;

  return `M ${hx} ${hy} Q ${cx} ${cy} ${ex} ${ey}`;
}

function v24BuildCleanCustomerMapSvg() {
  const width = 1000;
  const height = 520;
  const pad = 95;
  const mapped = v24MapGeometry(width, height, pad);

  if (!mapped) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <text x="${width/2}" y="${height/2}" text-anchor="middle" font-family="Arial" font-size="22">No map available</text>
      </svg>
    `;
  }

  const lengths = v24SegmentLengths();
  const gates = v24Gates();
  const closed = v24ClosedLayout();

  let svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <marker id="v24arrow" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill="#dc2626"/>
      </marker>
    </defs>
    <rect width="100%" height="100%" fill="#ffffff"/>
    <rect x="8" y="8" width="${width-16}" height="${height-16}" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="${width/2}" y="32" text-anchor="middle" font-family="Arial" font-size="18" font-weight="800" fill="#111827">Fence Layout Map</text>
  `;

  let sectionNumber = 1;

  function drawRun(a, b, segLen, run, segNo, side) {
    const t1 = run.start / Math.max(0.01, segLen);
    const t2 = run.end / Math.max(0.01, segLen);
    const x1 = a.x + (b.x - a.x) * t1;
    const y1 = a.y + (b.y - a.y) * t1;
    const x2 = a.x + (b.x - a.x) * t2;
    const y2 = a.y + (b.y - a.y) * t2;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenPx = Math.sqrt(dx*dx + dy*dy);
    if (lenPx < 1) return "";

    const angle = Math.atan2(dy, dx);
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);

    const sec = v24SectionsForRun(run.length);
    const labelX = (x1 + x2) / 2 + nx * 34 * side;
    const labelY = (y1 + y2) / 2 + ny * 34 * side;

    let out = `
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111827" stroke-width="8" stroke-linecap="round"/>
    `;

    for (let i = 1; i < sec.total; i++) {
      const t = i / sec.total;
      const px = x1 + dx * t;
      const py = y1 + dy * t;

      out += `
        <circle cx="${px}" cy="${py}" r="6" fill="#2563eb"/>
        <text x="${px + nx*18}" y="${py + ny*18 + 4}" text-anchor="middle" font-family="Arial" font-size="9" font-weight="800" fill="#1e3a8a">LP</text>
      `;
    }

    out += `
      <rect x="${labelX-56}" y="${labelY-16}" width="112" height="32" rx="7" fill="#eff6ff" stroke="#93c5fd"/>
      <text x="${labelX}" y="${labelY-2}" text-anchor="middle" font-family="Arial" font-size="9" font-weight="800" fill="#1e3a8a">Seg ${segNo}: ${run.length}'</text>
      <text x="${labelX}" y="${labelY+11}" text-anchor="middle" font-family="Arial" font-size="8" fill="#1e3a8a">${v24Esc(sec.label)}</text>
    `;

    sectionNumber += sec.total;
    return out;
  }

  function drawSegment(segIndex, a, b) {
    const segNo = segIndex + 1;
    const segLen = Number(lengths[segIndex] || 0);
    const runs = v24RunsForSegment(segNo);
    let out = "";

    runs.forEach((run, idx) => {
      if (run.type === "fence" && run.length > 0.01) {
        out += drawRun(a, b, segLen, run, segNo, idx % 2 === 0 ? 1 : -1);
      }
    });

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
      <text x="${p.x}" y="${p.y+3}" text-anchor="middle" font-family="Arial" font-size="8" font-weight="800" fill="#fff">P${i+1}</text>
    `;
  });

  gates.forEach((gate, i) => {
    const c = v24GateCenter(gate, mapped);
    if (!c) return;

    const angle = Math.atan2(c.b.y - c.a.y, c.b.x - c.a.x);
    const size = Math.max(44, Math.min(86, Number(gate.widthFt || 4) * 11));
    const swing = gate.swing || "outswing_left";
    const arc = v24SwingArc(c.x, c.y, angle, swing, size);

    svg += `
      <path d="${arc}" fill="none" stroke="#dc2626" stroke-width="3.5" marker-end="url(#v24arrow)"/>
      <g transform="translate(${c.x} ${c.y}) rotate(${angle * 180 / Math.PI})">
        <rect x="${-size/2}" y="-18" width="${size}" height="36" rx="6" fill="#f97316" stroke="#7c2d12" stroke-width="3"/>
        <line x1="0" y1="-14" x2="0" y2="14" stroke="#fff" stroke-width="2"/>
      </g>
      <rect x="${c.x-68}" y="${c.y+30}" width="136" height="42" rx="7" fill="#fff7ed" stroke="#fdba74"/>
      <text x="${c.x}" y="${c.y+45}" text-anchor="middle" font-family="Arial" font-size="10" font-weight="900" fill="#7c2d12">G${i+1}: ${v24Esc(gate.widthFt || "")}'</text>
      <text x="${c.x}" y="${c.y+59}" text-anchor="middle" font-family="Arial" font-size="8.5" font-weight="800" fill="#dc2626">${v24Esc(v24SwingLabel(swing))}</text>
    `;
  });

  svg += `
    <g transform="translate(18, ${height-42})">
      <text x="0" y="0" font-family="Arial" font-size="9" fill="#4b5563">LP = line post. Orange = gate. Red arc = swing direction. Gate details also listed below.</text>
    </g>
  </svg>`;

  return svg;
}

function v24BuildGateRows(includePrice) {
  const gates = v24Gates();

  if (!gates.length) {
    return `<tr><td colspan="${includePrice ? 7 : 6}">No gates selected.</td></tr>`;
  }

  return gates.map((gate, i) => {
    const price = v24GateUnitPrice(gate);
    return `
      <tr>
        <td>G${i+1}</td>
        <td>${v24Esc(gate.gateType === "double" ? "Double Driveway" : "Walk Gate")}</td>
        <td>${v24Esc(gate.segment || "")}</td>
        <td>${v24Esc(gate.startFt ?? "")}'</td>
        <td>${v24Esc(gate.widthFt || "")}'</td>
        <td>${v24Esc(v24SwingLabel(gate.swing || "outswing_left"))}</td>
        ${includePrice ? `<td class="right">$${v24Money(price)}</td>` : ""}
      </tr>
    `;
  }).join("");
}

function v24BuildCustomerHtml(showButtons) {
  const q = v24EnsureGateLines(v24GetQuote());
  if (!q) {
    return `<html><body style="font-family:Arial;padding:30px;"><h2>No quote calculated yet</h2></body></html>`;
  }

  const showUnitPrice = v24ShowUnitPrice();
  const showItemId = v24ShowItemId();

  const qtyRows = v24BuildQuantitySummary(q).map(row => `
    <tr>
      <td>${v24Esc(row[0])}</td>
      <td class="right">${v24Esc(row[1])}</td>
    </tr>
  `).join("");

  let lineHeaders = "";
  if (showItemId) lineHeaders += "<th>Item ID</th>";
  lineHeaders += "<th>Description</th>";
  if (showUnitPrice) lineHeaders += "<th class='right'>Unit Price</th>";
  lineHeaders += "<th class='right'>Quantity</th><th class='right'>Total</th>";

  const lineRows = (q.lineItems || []).map(line => {
    let cells = "";
    if (showItemId) cells += `<td>${v24Esc(line.code || "")}</td>`;
    cells += `<td>${v24Esc(line.item || "")}</td>`;
    if (showUnitPrice) cells += `<td class="right">$${v24Money(line.unitPrice || 0)}</td>`;
    cells += `<td class="right">${v24Esc(line.qty || "")} ${v24Esc(line.unit || "")}</td>`;
    cells += `<td class="right">$${v24Money(line.total || 0)}</td>`;
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
      <title>${v24Esc(q.quoteNumber || "Customer Quote")}</title>
      <style>
        @page { size: letter portrait; margin: 0.25in; }
        body { margin:0; background:${showButtons ? "#e5e7eb" : "#ffffff"}; color:#111827; font-family:Arial, sans-serif; font-size:11px; }
        .preview-actions { position:sticky; top:0; background:#111827; padding:9px; display:flex; gap:9px; z-index:20; }
        .preview-actions button { background:#047857; color:white; border:0; border-radius:8px; padding:9px 13px; font-weight:800; cursor:pointer; }
        .page { background:white; width:8.0in; min-height:10.25in; margin:${showButtons ? "14px auto" : "0"}; padding:0.08in; box-shadow:${showButtons ? "0 2px 16px rgba(0,0,0,.18)" : "none"}; }
        .title { font-size:20px; font-weight:900; margin-bottom:5px; }
        .top { display:grid; grid-template-columns: 0.78fr 1.42fr; gap:8px; align-items:start; }
        .box { border:1px solid #cbd5e1; border-radius:7px; padding:6px; break-inside:avoid; }
        .meta div { margin-bottom:2px; }
        .drawing svg { width:100%; height:auto; max-height:3.45in; display:block; }
        table { width:100%; border-collapse:collapse; margin-top:5px; }
        th, td { border:1px solid #d1d5db; padding:3px 4px; font-size:9.6px; vertical-align:top; }
        th { background:#f3f4f6; text-align:left; font-weight:800; }
        .right { text-align:right; }
        .section { margin-top:6px; }
        .total { font-size:18px; font-weight:900; text-align:right; margin-top:5px; }
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
            <div><strong>Quote #:</strong> ${v24Esc(q.quoteNumber || "")}</div>
            <div><strong>Date:</strong> ${v24Esc(q.quoteDate || "")}</div>
            <div><strong>Customer:</strong> ${v24Esc(q.customerName || "")}</div>
            <div><strong>Address:</strong> ${v24Esc(q.jobAddress || "")}</div>
            <div><strong>Quote Type:</strong> ${v24Esc(q.scope || "")}</div>
            <div><strong>Payment:</strong> ${v24Esc(q.paymentMethod || "Cash / Check")}</div>
            <div><strong>Section Width:</strong> ${v24SectionWidthFt()}'</div>
            <div class="total">Total: $${v24Money(q.pricing?.grandTotal || 0)}</div>

            <table>
              <thead><tr><th>Quantity Summary</th><th class="right">Qty</th></tr></thead>
              <tbody>${qtyRows}</tbody>
            </table>
          </div>

          <div class="box drawing">
            <strong>Customer Map</strong>
            ${v24BuildCleanCustomerMapSvg()}
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
                <th>Width</th>
                <th>Swing</th>
                ${showUnitPrice ? "<th class='right'>Price</th>" : ""}
              </tr>
            </thead>
            <tbody>${v24BuildGateRows(showUnitPrice)}</tbody>
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
}

function v24PreviewCustomerQuote() {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup blocked. Allow popups for this app.");
    return;
  }
  w.document.open();
  w.document.write(v24BuildCustomerHtml(true));
  w.document.close();
  w.focus();
}

function v24PrintCustomerQuoteDirect() {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup blocked. Allow popups for this app.");
    return;
  }
  w.document.open();
  w.document.write(v24BuildCustomerHtml(false));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
}

function v24PatchAllPrintFunctions() {
  window.v24PreviewCustomerQuote = v24PreviewCustomerQuote;
  window.v24PrintCustomerQuoteDirect = v24PrintCustomerQuoteDirect;

  window.v23RenderCleanMap = function() {
    const box = document.getElementById("v22DragMap") || document.getElementById("v18FenceSystemDrawingPreview");
    if (box) box.innerHTML = v24BuildCleanCustomerMapSvg();
    if (typeof v22AttachDragHandlers === "function") v22AttachDragHandlers();
  };

  window.v20PreviewCustomerQuote = v24PreviewCustomerQuote;
  window.v20PrintCustomerQuoteDirect = v24PrintCustomerQuoteDirect;
  window.v19PreviewCustomerQuote = v24PreviewCustomerQuote;
  window.v19PrintCustomerQuoteDirect = v24PrintCustomerQuoteDirect;
  window.v18PreviewCustomerQuote = v24PreviewCustomerQuote;
  window.v18PrintCustomerQuoteDirect = v24PrintCustomerQuoteDirect;
  window.v17PreviewQuoteWithDrawing = v24PreviewCustomerQuote;
  window.v17PrintQuoteWithDrawingDirect = v24PrintCustomerQuoteDirect;
  window.v16PrintQuoteWithDrawing = v24PrintCustomerQuoteDirect;

  window.v20BuildMapSvg = v24BuildCleanCustomerMapSvg;
  window.v21BuildBetterMapSvg = v24BuildCleanCustomerMapSvg;
  window.v22BuildDraggableSvg = v24BuildCleanCustomerMapSvg;
  window.v23BuildCleanMapSvg = v24BuildCleanCustomerMapSvg;
}

document.addEventListener("DOMContentLoaded", function() {
  setTimeout(function() {
    v24PatchCalculateForGatePrice();
    v24PatchAllPrintFunctions();
    v24InstallUnifiedPanel();
    v24HideDuplicatePrintPanels();

    if (typeof calculateQuote === "function") calculateQuote();

    const mapBox = document.getElementById("v22DragMap") || document.getElementById("v18FenceSystemDrawingPreview");
    if (mapBox) mapBox.innerHTML = v24BuildCleanCustomerMapSvg();
  }, 1800);
});
