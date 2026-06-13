/*
Version 20 Customer Quote Clarity + Better Map + Gate Move on Fence System

Fixes / Adds:
- Customer quote defaults to hiding unit price
- Customer quote can optionally show/hide unit price
- Quantities are clear: sections, posts, caps, gates, concrete
- Clearer map with section labels, line posts, and gate position
- Gate move controls directly on Fence System page
- Gate can be moved by segment and percentage position
*/

function v20Esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[m]));
}

function v20Money(n) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function v20GetQuote() {
  if (typeof calculateQuote === "function") {
    calculateQuote();
  }

  try {
    if (typeof latestQuote !== "undefined" && latestQuote) return latestQuote;
  } catch (e) {}

  return null;
}

function v20Points() {
  try {
    if (typeof points !== "undefined" && Array.isArray(points)) return points;
  } catch (e) {}
  return [];
}

function v20SegmentLengths() {
  try {
    if (typeof segmentLengths !== "undefined" && Array.isArray(segmentLengths)) return segmentLengths;
  } catch (e) {}
  return [];
}

function v20Gates() {
  try {
    if (typeof v13LayoutGates !== "undefined" && Array.isArray(v13LayoutGates)) return v13LayoutGates;
  } catch (e) {}
  window.v13LayoutGates = [];
  return window.v13LayoutGates;
}

function v20SectionWidthFt() {
  return Number(
    document.getElementById("v14SectionWidthQuick")?.value ||
    document.getElementById("sectionWidthFt")?.value ||
    8
  );
}

function v20ClosedLayout() {
  return document.getElementById("layoutClosed")?.value === "closed";
}

function v20ShowCustomerUnitPrice() {
  const el = document.getElementById("v20ShowCustomerUnitPrice");
  if (!el) return false;
  return el.value === "yes";
}

function v20InstallCustomerControlsOnFenceSystem() {
  const systemTab = document.getElementById("tab-system");
  if (!systemTab || document.getElementById("v20CustomerQuotePanel")) return;

  const panel = document.createElement("div");
  panel.id = "v20CustomerQuotePanel";
  panel.className = "select-line";
  panel.innerHTML = `
    <h3>Customer Quote / Receipt Preview</h3>
    <p class="small">
      Customer quote defaults to hiding unit price. It shows the map, quantities, sections, posts, gates, and total.
    </p>

    <div class="row">
      <div>
        <label>Show Unit Price on Customer Quote?</label>
        <select id="v20ShowCustomerUnitPrice">
          <option value="no" selected>No - hide unit price</option>
          <option value="yes">Yes - show unit price</option>
        </select>
      </div>
      <div>
        <label>Show Item ID on Customer Quote?</label>
        <select id="v20ShowCustomerItemId">
          <option value="no" selected>No</option>
          <option value="yes">Yes</option>
        </select>
      </div>
    </div>

    <div class="actions">
      <button class="blue" onclick="v20PreviewCustomerQuote()">Preview Customer Quote</button>
      <button class="green" onclick="v20PrintCustomerQuoteDirect()">Print Direct</button>
    </div>
  `;

  systemTab.prepend(panel);
}

function v20InstallGateMoveOnFenceSystem() {
  const systemTab = document.getElementById("tab-system");
  if (!systemTab || document.getElementById("v20GateMovePanel")) return;

  const panel = document.createElement("div");
  panel.id = "v20GateMovePanel";
  panel.className = "select-line";
  panel.innerHTML = `
    <h3>Move Gate / Door on Drawing</h3>
    <p class="small">Select the gate, move it to a segment, and set the position percentage along that segment.</p>

    <label>Gate to Move</label>
    <select id="v20GateSelect" onchange="v20LoadGateForEdit()"></select>

    <div class="row">
      <div>
        <label>Segment #</label>
        <input id="v20GateSegment" type="number" min="1" step="1" value="1">
      </div>
      <div>
        <label>Position on Segment %</label>
        <input id="v20GatePositionPct" type="number" min="0" max="100" step="1" value="50">
      </div>
    </div>

    <div class="row">
      <div>
        <label>Gate Width Ft</label>
        <input id="v20GateWidthFt" type="number" min="1" step="0.5" value="4">
      </div>
      <div>
        <label>Gate Label / Color</label>
        <input id="v20GateColor" placeholder="White / Black / Almond">
      </div>
    </div>

    <div class="actions">
      <button class="blue" onclick="v20UpdateGatePosition()">Update Gate Position</button>
      <button class="red" onclick="v20DeleteGate()">Delete Gate</button>
      <button class="gray" onclick="v20RefreshGateSelect()">Refresh Gate List</button>
    </div>
  `;

  systemTab.prepend(panel);
  v20RefreshGateSelect();
}

function v20RefreshGateSelect() {
  const sel = document.getElementById("v20GateSelect");
  if (!sel) return;

  const gates = v20Gates();
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
    opt.textContent = "G" + (i + 1) + " - Segment " + (g.segment || 1) + " @ " + (g.positionPct || 50) + "% - " + (g.widthFt || "") + " ft - " + (g.description || g.itemId || "Gate");
    sel.appendChild(opt);
  });

  v20LoadGateForEdit();
}

function v20LoadGateForEdit() {
  const sel = document.getElementById("v20GateSelect");
  if (!sel || sel.value === "") return;

  const g = v20Gates()[Number(sel.value)];
  if (!g) return;

  document.getElementById("v20GateSegment").value = g.segment || 1;
  document.getElementById("v20GatePositionPct").value = g.positionPct || 50;
  document.getElementById("v20GateWidthFt").value = g.widthFt || 4;
  document.getElementById("v20GateColor").value = g.color || "";
}

function v20UpdateGatePosition() {
  const sel = document.getElementById("v20GateSelect");
  if (!sel || sel.value === "") {
    alert("Select a gate first.");
    return;
  }

  const gates = v20Gates();
  const i = Number(sel.value);
  const g = gates[i];
  if (!g) return;

  const maxSeg = Math.max(1, v20SegmentLengths().length);
  const seg = Number(document.getElementById("v20GateSegment")?.value || 1);
  const pos = Number(document.getElementById("v20GatePositionPct")?.value || 50);

  if (seg < 1 || seg > maxSeg) {
    alert("Segment must be between 1 and " + maxSeg + ".");
    return;
  }

  g.segment = seg;
  g.positionPct = Math.max(0, Math.min(100, pos));
  g.widthFt = Number(document.getElementById("v20GateWidthFt")?.value || g.widthFt || 4);
  g.color = document.getElementById("v20GateColor")?.value || g.color || "";

  if (typeof v13RenderGateList === "function") v13RenderGateList();
  if (typeof draw === "function") draw();
  if (typeof calculateQuote === "function") calculateQuote();

  v20RefreshGateSelect();
  v20RenderInlineMapPreview();
}

function v20DeleteGate() {
  const sel = document.getElementById("v20GateSelect");
  if (!sel || sel.value === "") return;

  v20Gates().splice(Number(sel.value), 1);

  if (typeof v13RenderGateList === "function") v13RenderGateList();
  if (typeof draw === "function") draw();
  if (typeof calculateQuote === "function") calculateQuote();

  v20RefreshGateSelect();
  v20RenderInlineMapPreview();
}

function v20BuildSegmentData() {
  const lengths = v20SegmentLengths();
  const gates = v20Gates();
  const sectionWidth = Math.max(0.01, v20SectionWidthFt());

  return lengths.map((len, i) => {
    const segmentNumber = i + 1;
    const lengthFt = Number(len || 0);
    const segmentGates = gates.filter(g => Number(g.segment || 0) === segmentNumber);
    const gateFt = segmentGates.reduce((sum, g) => sum + Number(g.widthFt || 0), 0);
    const usableFt = Math.max(0, lengthFt - gateFt);
    const fullSections = Math.floor(usableFt / sectionWidth);
    const remainder = Math.round((usableFt - fullSections * sectionWidth + Number.EPSILON) * 100) / 100;
    const partialSections = remainder > 0.01 ? 1 : 0;
    const totalSections = fullSections + partialSections;

    return {
      segmentNumber,
      lengthFt,
      gateFt,
      usableFt,
      fullSections,
      remainder,
      partialSections,
      totalSections,
      linePosts: Math.max(0, totalSections - 1),
      splitLabel: remainder > 0.01
        ? fullSections + " full @ " + sectionWidth + "' + " + remainder + "' cut"
        : fullSections + " full @ " + sectionWidth + "'"
    };
  });
}

function v20BuildQuantitySummary(q) {
  const layoutRows = v20BuildSegmentData();
  const totalLf = layoutRows.reduce((sum, r) => sum + Number(r.lengthFt || 0), 0);
  const totalSections = layoutRows.reduce((sum, r) => sum + Number(r.totalSections || 0), 0);
  const totalLinePosts = layoutRows.reduce((sum, r) => sum + Number(r.linePosts || 0), 0);
  const gates = v20Gates();

  let counts = {};
  try {
    counts = q?.layout?.counts || {};
  } catch (e) {}

  const cornerPosts = counts.cornerPosts ?? Math.max(0, layoutRows.length - 1);
  const endPosts = counts.endPosts ?? 2;
  const totalPosts = counts.totalPosts ?? (totalLinePosts + cornerPosts + endPosts);

  return [
    ["Total Linear Feet", totalLf],
    ["Fence Sections / Panels", totalSections],
    ["Line Posts", totalLinePosts],
    ["Corner Posts", cornerPosts],
    ["End Posts", endPosts],
    ["Total Posts", totalPosts],
    ["Post Caps", totalPosts],
    ["Gates / Doors", gates.length],
    ["Concrete Bags", q?.scope === "Materials Only" ? 0 : totalPosts]
  ];
}

function v20BuildMapSvg() {
  const pts = v20Points();
  const lengths = v20SegmentLengths();
  const gates = v20Gates();
  const sectionWidth = Math.max(0.01, v20SectionWidthFt());

  const width = 1200;
  const height = 760;
  const pad = 95;

  if (pts.length < 2) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <rect x="12" y="12" width="${width-24}" height="${height-24}" rx="18" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
        <text x="${width/2}" y="${height/2}" text-anchor="middle" font-family="Arial" font-size="28" fill="#111827">No drawing available</text>
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
  const closed = v20ClosedLayout();

  let sectionNumber = 1;

  let svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.20"/>
      </filter>
    </defs>
    <rect width="100%" height="100%" fill="#ffffff"/>
    <rect x="14" y="14" width="${width-28}" height="${height-28}" rx="20" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <text x="${width/2}" y="42" text-anchor="middle" font-family="Arial" font-size="26" font-weight="800" fill="#111827">Fence Layout Map</text>
    <text x="${width/2}" y="68" text-anchor="middle" font-family="Arial" font-size="14" fill="#4b5563">S# = section, LP = line post, orange = gate / door</text>
  `;

  function drawSegment(a, b, segIndex) {
    const segmentNumber = segIndex + 1;
    const lengthFt = Number(lengths[segIndex] || 0);
    const segmentGates = gates.filter(g => Number(g.segment || 0) === segmentNumber);
    const gateFt = segmentGates.reduce((sum, g) => sum + Number(g.widthFt || 0), 0);
    const usableFt = Math.max(0, lengthFt - gateFt);
    const sections = Math.max(1, Math.ceil(usableFt / sectionWidth));

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenPx = Math.sqrt(dx * dx + dy * dy);
    if (lenPx <= 0) return "";

    const angle = Math.atan2(dy, dx);
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);

    let out = `
      <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#111827" stroke-width="12" stroke-linecap="round"/>
      <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-dasharray="12 12" opacity="0.85"/>
    `;

    for (let s = 0; s < sections; s++) {
      const t1 = s / sections;
      const t2 = (s + 1) / sections;
      const midT = (t1 + t2) / 2;

      const mx = a.x + dx * midT + nx * 34;
      const my = a.y + dy * midT + ny * 34;

      out += `
        <rect x="${mx - 23}" y="${my - 14}" width="46" height="28" rx="7" fill="#eff6ff" stroke="#2563eb" stroke-width="2" filter="url(#shadow)"/>
        <text x="${mx}" y="${my + 5}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="800" fill="#1e3a8a">S${sectionNumber}</text>
      `;

      sectionNumber++;

      if (s > 0) {
        const px = a.x + dx * t1;
        const py = a.y + dy * t1;

        out += `
          <circle cx="${px}" cy="${py}" r="10" fill="#2563eb" stroke="#1e3a8a" stroke-width="2" filter="url(#shadow)"/>
          <text x="${px + nx * 29}" y="${py + ny * 29 + 5}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="800" fill="#1e3a8a">LP</text>
        `;
      }
    }

    const labelX = (a.x + b.x) / 2 - nx * 65;
    const labelY = (a.y + b.y) / 2 - ny * 65;

    out += `
      <rect x="${labelX - 105}" y="${labelY - 29}" width="210" height="58" rx="10" fill="#ffffff" stroke="#6b7280" stroke-width="1.5" filter="url(#shadow)"/>
      <text x="${labelX}" y="${labelY - 10}" text-anchor="middle" font-family="Arial" font-size="13" font-weight="800" fill="#111827">SEG ${segmentNumber}: ${lengthFt}'</text>
      <text x="${labelX}" y="${labelY + 7}" text-anchor="middle" font-family="Arial" font-size="11.5" fill="#374151">${sections} sections @ ${sectionWidth}'</text>
      <text x="${labelX}" y="${labelY + 23}" text-anchor="middle" font-family="Arial" font-size="10.5" fill="#6b7280">Gate opening: ${gateFt}'</text>
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
      <circle cx="${p.x}" cy="${p.y}" r="15" fill="#111827" filter="url(#shadow)"/>
      <text x="${p.x}" y="${p.y + 5}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="800" fill="#ffffff">P${i + 1}</text>
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
      <g filter="url(#shadow)">
        <rect x="${x - 42}" y="${y - 30}" width="84" height="60" rx="9" fill="#f97316" stroke="#7c2d12" stroke-width="4"/>
        <line x1="${x - 26}" y1="${y - 18}" x2="${x + 26}" y2="${y + 18}" stroke="#ffffff" stroke-width="3"/>
        <line x1="${x + 26}" y1="${y - 18}" x2="${x - 26}" y2="${y + 18}" stroke="#ffffff" stroke-width="3"/>
      </g>
      <text x="${x}" y="${y - 5}" text-anchor="middle" font-family="Arial" font-size="17" font-weight="900" fill="#ffffff">G${i + 1}</text>
      <text x="${x}" y="${y + 17}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="800" fill="#ffffff">${v20Esc(g.widthFt || "")}'</text>
      <rect x="${x - 82}" y="${y + 38}" width="164" height="22" rx="6" fill="#fff7ed" stroke="#fdba74"/>
      <text x="${x}" y="${y + 53}" text-anchor="middle" font-family="Arial" font-size="11" font-weight="800" fill="#7c2d12">Seg ${v20Esc(g.segment)} @ ${v20Esc(g.positionPct)}%</text>
    `;
  });

  svg += `
    <g transform="translate(26, ${height - 70})">
      <rect x="0" y="0" width="650" height="48" rx="9" fill="#f9fafb" stroke="#d1d5db"/>
      <rect x="16" y="12" width="38" height="24" rx="7" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
      <text x="67" y="29" font-family="Arial" font-size="12" fill="#111827">S# = section number</text>
      <circle cx="250" cy="24" r="10" fill="#2563eb"/>
      <text x="270" y="29" font-family="Arial" font-size="12" fill="#111827">LP = line post / division</text>
      <rect x="455" y="9" width="48" height="30" rx="6" fill="#f97316" stroke="#7c2d12" stroke-width="3"/>
      <text x="515" y="29" font-family="Arial" font-size="12" fill="#111827">Gate / door position</text>
    </g>
  </svg>`;

  return svg;
}

function v20BuildCustomerQuoteHtml(showButtons) {
  const q = v20GetQuote();

  if (!q) {
    return `
      <html><body style="font-family:Arial;padding:30px;">
      <h2>No quote calculated yet</h2>
      <p>Click Calculate first, then preview again.</p>
      </body></html>
    `;
  }

  const showUnitPrice = v20ShowCustomerUnitPrice();
  const showItemId = document.getElementById("v20ShowCustomerItemId")?.value === "yes";
  const qtyRows = v20BuildQuantitySummary(q).map(r => `
    <tr>
      <td>${v20Esc(r[0])}</td>
      <td class="right">${v20Esc(String(r[1]))}</td>
    </tr>
  `).join("");

  const segmentRows = v20BuildSegmentData().map(r => `
    <tr>
      <td>${r.segmentNumber}</td>
      <td class="right">${r.lengthFt}</td>
      <td class="right">${r.gateFt}</td>
      <td class="right">${r.usableFt}</td>
      <td>${v20Esc(r.splitLabel)}</td>
      <td class="right">${r.totalSections}</td>
      <td class="right">${r.linePosts}</td>
    </tr>
  `).join("");

  const gateRows = v20Gates().length ? v20Gates().map((g, i) => `
    <tr>
      <td>G${i + 1}</td>
      <td>${v20Esc(g.segment)}</td>
      <td>${v20Esc(g.positionPct)}%</td>
      <td>${v20Esc(g.widthFt)} ft</td>
      <td>${v20Esc(g.description || g.itemId || "")}</td>
      <td>${v20Esc(g.color || "")}</td>
    </tr>
  `).join("") : `<tr><td colspan="6">No gates / doors selected.</td></tr>`;

  let lineHeaders = "";
  if (showItemId) lineHeaders += "<th>Item ID</th>";
  lineHeaders += "<th>Description</th>";
  if (showUnitPrice) lineHeaders += "<th class='right'>Unit Price</th>";
  lineHeaders += "<th class='right'>Quantity</th><th class='right'>Total</th>";

  const lineRows = (q.lineItems || []).map(line => {
    let cells = "";
    if (showItemId) cells += `<td>${v20Esc(line.code || "")}</td>`;
    cells += `<td>${v20Esc(line.item || "")}</td>`;
    if (showUnitPrice) cells += `<td class="right">$${v20Money(line.unitPrice || 0)}</td>`;
    cells += `<td class="right">${v20Esc(String(line.qty || ""))} ${v20Esc(line.unit || "")}</td>`;
    cells += `<td class="right">$${v20Money(line.total || 0)}</td>`;
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
      <title>${v20Esc(q.quoteNumber || "Customer Quote")}</title>
      <style>
        @page { size: letter portrait; margin: 0.28in; }
        body { margin:0; background:${showButtons ? "#e5e7eb" : "#ffffff"}; color:#111827; font-family:Arial, sans-serif; font-size:12px; }
        .preview-actions { position:sticky; top:0; background:#111827; padding:10px; display:flex; gap:10px; z-index:20; }
        .preview-actions button { background:#047857; color:white; border:0; border-radius:8px; padding:10px 14px; font-weight:800; cursor:pointer; }
        .page { background:white; width:8.1in; min-height:10.35in; margin:${showButtons ? "18px auto" : "0"}; padding:0.1in; box-shadow:${showButtons ? "0 2px 16px rgba(0,0,0,.18)" : "none"}; }
        .title { font-size:22px; font-weight:900; margin-bottom:7px; }
        .top { display:grid; grid-template-columns: 0.88fr 1.42fr; gap:10px; align-items:start; }
        .box { border:1px solid #cbd5e1; border-radius:8px; padding:7px; break-inside:avoid; }
        .meta div { margin-bottom:3px; }
        .drawing svg { width:100%; height:auto; max-height:3.55in; display:block; }
        table { width:100%; border-collapse:collapse; margin-top:6px; }
        th, td { border:1px solid #d1d5db; padding:4px; font-size:10.3px; vertical-align:top; }
        th { background:#f3f4f6; text-align:left; font-weight:800; }
        .right { text-align:right; }
        .section { margin-top:7px; }
        .total { font-size:19px; font-weight:900; text-align:right; margin-top:6px; }
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
            <div><strong>Quote #:</strong> ${v20Esc(q.quoteNumber || "")}</div>
            <div><strong>Date:</strong> ${v20Esc(q.quoteDate || "")}</div>
            <div><strong>Customer:</strong> ${v20Esc(q.customerName || "")}</div>
            <div><strong>Address:</strong> ${v20Esc(q.jobAddress || "")}</div>
            <div><strong>Quote Type:</strong> ${v20Esc(q.scope || "")}</div>
            <div><strong>Payment:</strong> ${v20Esc(q.paymentMethod || "Cash / Check")}</div>
            <div><strong>Section Width:</strong> ${v20SectionWidthFt()} ft</div>
            <div class="total">Total: $${v20Money(q.pricing?.grandTotal || 0)}</div>

            <table>
              <thead><tr><th>Quantity Summary</th><th class="right">Qty</th></tr></thead>
              <tbody>${qtyRows}</tbody>
            </table>
          </div>

          <div class="box drawing">
            <strong>Layout Map</strong>
            ${v20BuildMapSvg()}
            <div class="small">Gate is marked orange and labeled by segment/position. S# labels each section. LP marks line posts.</div>
          </div>
        </div>

        <div class="section box">
          <strong>Segment / Section Division Breakdown</strong>
          <table>
            <thead>
              <tr>
                <th>Seg</th>
                <th class="right">Length</th>
                <th class="right">Gate Ft</th>
                <th class="right">Usable Ft</th>
                <th>Division</th>
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
            <thead><tr>${lineHeaders}</tr></thead>
            <tbody>${lineRows || `<tr><td colspan="4">No quote lines calculated.</td></tr>`}</tbody>
          </table>
        </div>
      </div>
    </body>
  </html>`;
}

function v20PreviewCustomerQuote() {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup blocked. Allow popups for this app.");
    return;
  }

  w.document.open();
  w.document.write(v20BuildCustomerQuoteHtml(true));
  w.document.close();
  w.focus();
}

function v20PrintCustomerQuoteDirect() {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup blocked. Allow popups for this app.");
    return;
  }

  w.document.open();
  w.document.write(v20BuildCustomerQuoteHtml(false));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 600);
}

function v20RenderInlineMapPreview() {
  const box = document.getElementById("v18FenceSystemDrawingPreview") || document.getElementById("v20InlineMapPreview");
  if (!box) return;
  box.innerHTML = v20BuildMapSvg();
}

function v20OverridePrintFunctions() {
  window.v19PreviewCustomerQuote = v20PreviewCustomerQuote;
  window.v19PrintCustomerQuoteDirect = v20PrintCustomerQuoteDirect;
  window.v18PreviewCustomerQuote = v20PreviewCustomerQuote;
  window.v18PrintCustomerQuoteDirect = v20PrintCustomerQuoteDirect;
  window.v17PreviewQuoteWithDrawing = v20PreviewCustomerQuote;
  window.v17PrintQuoteWithDrawingDirect = v20PrintCustomerQuoteDirect;
  window.v16PrintQuoteWithDrawing = v20PrintCustomerQuoteDirect;
}

function v20PatchGateAddRefresh() {
  if (window.v20OriginalAddGate || typeof v13AddGateToDrawing !== "function") return;

  window.v20OriginalAddGate = v13AddGateToDrawing;

  window.v13AddGateToDrawing = function() {
    window.v20OriginalAddGate();
    v20RefreshGateSelect();
    v20RenderInlineMapPreview();
  };
}

function v20PatchDrawCalculate() {
  if (!window.v20OriginalDraw && typeof draw === "function") {
    window.v20OriginalDraw = draw;
    window.draw = function() {
      window.v20OriginalDraw();
      v20RenderInlineMapPreview();
    };
  }

  if (!window.v20OriginalCalculateQuote && typeof calculateQuote === "function") {
    window.v20OriginalCalculateQuote = calculateQuote;
    window.calculateQuote = function() {
      window.v20OriginalCalculateQuote();
      v20RenderInlineMapPreview();
      v20RefreshGateSelect();
    };
  }
}

document.addEventListener("DOMContentLoaded", function() {
  setTimeout(function() {
    v20InstallCustomerControlsOnFenceSystem();
    v20InstallGateMoveOnFenceSystem();
    v20OverridePrintFunctions();
    v20PatchGateAddRefresh();
    v20PatchDrawCalculate();
    v20RefreshGateSelect();
    v20RenderInlineMapPreview();

    if (typeof calculateQuote === "function") calculateQuote();
    if (typeof draw === "function") draw();
  }, 1300);
});
