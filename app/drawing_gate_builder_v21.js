/*
Version 21 Drawing Gate Builder

Adds:
- Add Gate controls directly beside/under drawing on Fence System page
- Add single gate or double driveway gate
- Gate can be placed on any segment at any position
- Gate can be moved after placement
- Gate width affects section split
- Section division recalculates around gate:
  Example 12 ft segment, 4 ft gate at 8 ft mark, 8 ft section width:
  8 ft section + 4 ft gate
  Example 12 ft segment, 5 ft gate at 8 ft mark:
  7 ft fence remaining depending on placement, split accordingly
*/

function v21Esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[m]));
}

function v21Money(n) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function v21SegmentLengths() {
  try {
    if (typeof segmentLengths !== "undefined" && Array.isArray(segmentLengths)) return segmentLengths;
  } catch (e) {}
  return [];
}

function v21Points() {
  try {
    if (typeof points !== "undefined" && Array.isArray(points)) return points;
  } catch (e) {}
  return [];
}

function v21Gates() {
  try {
    if (typeof v13LayoutGates !== "undefined" && Array.isArray(v13LayoutGates)) return v13LayoutGates;
  } catch (e) {}

  window.v13LayoutGates = [];
  return window.v13LayoutGates;
}

function v21SectionWidthFt() {
  return Number(
    document.getElementById("v14SectionWidthQuick")?.value ||
    document.getElementById("sectionWidthFt")?.value ||
    8
  );
}

function v21ClosedLayout() {
  return document.getElementById("layoutClosed")?.value === "closed";
}

function v21GetQuote() {
  try {
    if (typeof latestQuote !== "undefined" && latestQuote) return latestQuote;
  } catch (e) {}

  return null;
}

function v21InstallGateBuilderNearDrawing() {
  const systemTab = document.getElementById("tab-system");
  if (!systemTab || document.getElementById("v21GateBuilderPanel")) return;

  const panel = document.createElement("div");
  panel.id = "v21GateBuilderPanel";
  panel.className = "select-line";
  panel.innerHTML = `
    <h3>Add Gate on Drawing</h3>
    <p class="small">
      Add a walk gate or double driveway gate directly to any fence segment. Moving or resizing the gate recalculates the section split around it.
    </p>

    <div class="row">
      <div>
        <label>Gate Type</label>
        <select id="v21GateType" onchange="v21GateTypeChanged(); v21RefreshGateItemList();">
          <option value="single" selected>Single Walk Gate</option>
          <option value="double">Double Driveway Gate</option>
        </select>
      </div>
      <div>
        <label>Gate Segment #</label>
        <input id="v21GateSegment" type="number" min="1" step="1" value="1">
      </div>
    </div>

    <div class="row">
      <div>
        <label>Gate Start From Segment Beginning Ft</label>
        <input id="v21GateStartFt" type="number" min="0" step="0.5" value="8" onchange="v21SyncGatePositionPctFromStart()">
      </div>
      <div>
        <label>Gate Position %</label>
        <input id="v21GatePositionPct" type="number" min="0" max="100" step="1" value="50" onchange="v21SyncGateStartFromPct()">
      </div>
    </div>

    <div class="row">
      <div>
        <label>Gate Width Ft</label>
        <input id="v21GateWidthFt" type="number" min="1" step="0.5" value="4" onchange="v21GateWidthChanged(); v21RefreshGateItemList();">
      </div>
      <div>
        <label>Gate Color</label>
        <select id="v21GateColor" onchange="v21RefreshGateItemList()">
          <option value="">Use Fence Color</option>
          <option value="White">White</option>
          <option value="Almond">Almond</option>
          <option value="Adobe">Adobe</option>
          <option value="Gray">Gray</option>
          <option value="Black">Black</option>
          <option value="Green">Green</option>
        </select>
      </div>
    </div>

    <label>Matching Gate Inventory Item</label>
    <select id="v21GateItem"></select>

    <div class="actions">
      <button class="blue" onclick="v21RefreshGateItemList()">Refresh Gate Items</button>
      <button class="green" onclick="v21AddGateFromDrawingPanel()">Add Gate to Drawing</button>
    </div>

    <div id="v21GateBuilderStatus" class="notice" style="margin-top:10px;">
      Gate position is based on start point from the beginning of the selected segment.
    </div>

    <h3>Move / Edit Gates</h3>
    <label>Selected Gate</label>
    <select id="v21EditGateSelect" onchange="v21LoadGateToEditor()"></select>

    <div class="row">
      <div>
        <label>Move to Segment #</label>
        <input id="v21EditSegment" type="number" min="1" step="1" value="1">
      </div>
      <div>
        <label>Start Ft</label>
        <input id="v21EditStartFt" type="number" min="0" step="0.5" value="0" onchange="v21EditStartChanged()">
      </div>
    </div>

    <div class="row">
      <div>
        <label>Position %</label>
        <input id="v21EditPositionPct" type="number" min="0" max="100" step="1" value="50" onchange="v21EditPctChanged()">
      </div>
      <div>
        <label>Width Ft</label>
        <input id="v21EditWidthFt" type="number" min="1" step="0.5" value="4">
      </div>
    </div>

    <div class="actions">
      <button class="blue" onclick="v21UpdateGateFromEditor()">Update / Move Gate</button>
      <button class="red" onclick="v21DeleteGateFromEditor()">Delete Gate</button>
    </div>

    <div id="v21GateSplitPreview" style="margin-top:10px;"></div>
  `;

  const drawingPreview = document.getElementById("v18FenceSystemDrawingPreview");
  if (drawingPreview) {
    drawingPreview.parentElement.insertBefore(panel, drawingPreview);
  } else {
    systemTab.prepend(panel);
  }

  v21RefreshGateItemList();
  v21RefreshEditGateList();
  v21RenderSplitPreview();
}

function v21GateTypeChanged() {
  const type = document.getElementById("v21GateType")?.value || "single";
  const width = document.getElementById("v21GateWidthFt");
  if (!width) return;

  if (type === "double" && Number(width.value || 0) < 8) {
    width.value = 10;
  }

  if (type === "single" && Number(width.value || 0) > 6) {
    width.value = 4;
  }

  v21GateWidthChanged();
}

function v21GateWidthChanged() {
  v21SyncGatePositionPctFromStart();
  v21RenderSplitPreview();
}

function v21SegmentLength(seg) {
  const lengths = v21SegmentLengths();
  return Number(lengths[Number(seg || 1) - 1] || 0);
}

function v21SyncGatePositionPctFromStart() {
  const seg = Number(document.getElementById("v21GateSegment")?.value || 1);
  const start = Number(document.getElementById("v21GateStartFt")?.value || 0);
  const len = Math.max(0.01, v21SegmentLength(seg));
  const pct = Math.max(0, Math.min(100, (start / len) * 100));
  const pctBox = document.getElementById("v21GatePositionPct");
  if (pctBox) pctBox.value = Math.round(pct);
  v21RenderSplitPreview();
}

function v21SyncGateStartFromPct() {
  const seg = Number(document.getElementById("v21GateSegment")?.value || 1);
  const pct = Number(document.getElementById("v21GatePositionPct")?.value || 0);
  const len = v21SegmentLength(seg);
  const start = Math.round((len * pct / 100 + Number.EPSILON) * 100) / 100;
  const startBox = document.getElementById("v21GateStartFt");
  if (startBox) startBox.value = start;
  v21RenderSplitPreview();
}

function v21GateColor() {
  return document.getElementById("v21GateColor")?.value ||
         document.getElementById("systemColor")?.value ||
         document.getElementById("v14ColorQuick")?.value ||
         "";
}

function v21CurrentStyle() {
  return document.getElementById("systemStyle")?.value ||
         document.getElementById("v14StyleQuick")?.value ||
         "";
}

function v21CurrentMaterial() {
  return document.getElementById("systemMaterial")?.value ||
         document.getElementById("v14MaterialQuick")?.value ||
         "";
}

function v21FindGateItems() {
  if (!Array.isArray(window.inventoryItems)) return [];

  const color = v21GateColor();
  const style = v21CurrentStyle();
  const material = v21CurrentMaterial();
  const type = document.getElementById("v21GateType")?.value || "single";
  const width = Number(document.getElementById("v21GateWidthFt")?.value || 0);

  return inventoryItems
    .filter(item => {
      const text = String((item.ItemID || "") + " " + (item.Description || "")).toUpperCase();
      if (item.Category !== "Gate" && !text.includes("GATE")) return false;

      if (color && item.Color && item.Color !== color) return false;
      if (style && item.Style && item.Style !== style) return false;
      if (material && item.Material && item.Material !== material) return false;

      if (type === "double") {
        if (!(text.includes("DOUBLE") || text.includes("DRIVE") || text.includes("DRIVEWAY") || text.includes("DD"))) {
          return true;
        }
      }

      return true;
    })
    .sort((a, b) => {
      const ta = String((a.ItemID || "") + " " + (a.Description || "")).toUpperCase();
      const tb = String((b.ItemID || "") + " " + (b.Description || "")).toUpperCase();

      function score(item, text) {
        let s = 0;
        if (item.Category === "Gate") s += 50;
        if (color && item.Color === color) s += 20;
        if (style && item.Style === style) s += 15;
        if (material && item.Material === material) s += 10;
        if (width && String(item.WidthFt) === String(width)) s += 20;
        if (type === "double" && (text.includes("DOUBLE") || text.includes("DRIVE") || text.includes("DRIVEWAY"))) s += 20;
        if (type === "single" && (text.includes("WALK") || text.includes("SINGLE"))) s += 10;
        return s;
      }

      return score(b, tb) - score(a, ta);
    });
}

function v21RefreshGateItemList() {
  const sel = document.getElementById("v21GateItem");
  const status = document.getElementById("v21GateBuilderStatus");
  if (!sel) return;

  const items = v21FindGateItems();
  sel.innerHTML = "";

  if (!items.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No matching gate found - use inventory tab/manual override";
    sel.appendChild(opt);

    if (status) {
      status.className = "warn";
      status.textContent = "No matching gate item found for this style/color/type.";
    }
    return;
  }

  items.slice(0, 100).forEach(item => {
    const opt = document.createElement("option");
    opt.value = item.ItemID;
    opt.dataset.item = JSON.stringify(item);
    opt.textContent = `${item.ItemID} - ${item.Description} | ${item.Color || ""} | Retail $${Number(item.Retail || 0).toFixed(2)}`;
    sel.appendChild(opt);
  });

  if (status) {
    status.className = "good";
    status.textContent = "Found " + items.length + " matching gate item(s).";
  }
}

function v21SelectedGateItem() {
  const sel = document.getElementById("v21GateItem");
  if (!sel || !sel.value) return null;

  const opt = sel.options[sel.selectedIndex];
  if (opt && opt.dataset.item) {
    try { return JSON.parse(opt.dataset.item); } catch (e) {}
  }

  if (Array.isArray(window.inventoryItems)) {
    return inventoryItems.find(x => x.ItemID === sel.value) || null;
  }

  return null;
}

function v21GateUnitPrice(item) {
  if (!item) return 0;
  if (typeof v11PriceForItem === "function") return v11PriceForItem(item, 1, "");
  return Number(item.Retail || 0);
}

function v21AddGateFromDrawingPanel() {
  const item = v21SelectedGateItem();
  const gates = v21Gates();

  const seg = Number(document.getElementById("v21GateSegment")?.value || 1);
  const startFt = Number(document.getElementById("v21GateStartFt")?.value || 0);
  const widthFt = Number(document.getElementById("v21GateWidthFt")?.value || 4);
  const segLen = v21SegmentLength(seg);

  if (seg < 1 || seg > Math.max(1, v21SegmentLengths().length)) {
    alert("Segment number is not valid.");
    return;
  }

  if (startFt < 0 || startFt + widthFt > segLen) {
    alert("Gate does not fit in this segment. Adjust start ft or width.");
    return;
  }

  const pct = segLen > 0 ? (startFt / segLen) * 100 : 50;
  const type = document.getElementById("v21GateType")?.value || "single";
  const color = v21GateColor();

  gates.push({
    segment: seg,
    positionPct: Math.round(pct * 100) / 100,
    startFt: startFt,
    widthFt: widthFt,
    gateType: type,
    color: color,
    itemId: item ? item.ItemID : (type === "double" ? "DOUBLE-GATE" : "GATE"),
    description: item ? item.Description : (type === "double" ? "Double Driveway Gate" : "Walk Gate"),
    unitPrice: item ? v21GateUnitPrice(item) : 0,
    item: item || null
  });

  v21RefreshEditGateList();
  v21RenderSplitPreview();

  if (typeof v13RenderGateList === "function") v13RenderGateList();
  if (typeof draw === "function") draw();
  if (typeof calculateQuote === "function") calculateQuote();
  if (typeof v20RenderInlineMapPreview === "function") v20RenderInlineMapPreview();
}

function v21RefreshEditGateList() {
  const sel = document.getElementById("v21EditGateSelect");
  if (!sel) return;

  const gates = v21Gates();
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
    opt.textContent = `G${i + 1} - ${g.gateType || "gate"} - Seg ${g.segment} - start ${g.startFt ?? "?"}' - width ${g.widthFt}'`;
    sel.appendChild(opt);
  });

  v21LoadGateToEditor();
}

function v21LoadGateToEditor() {
  const sel = document.getElementById("v21EditGateSelect");
  if (!sel || sel.value === "") return;

  const gate = v21Gates()[Number(sel.value)];
  if (!gate) return;

  document.getElementById("v21EditSegment").value = gate.segment || 1;
  document.getElementById("v21EditStartFt").value = gate.startFt ?? v21StartFtFromPct(gate.segment, gate.positionPct);
  document.getElementById("v21EditPositionPct").value = gate.positionPct || 0;
  document.getElementById("v21EditWidthFt").value = gate.widthFt || 4;

  v21RenderSplitPreview();
}

function v21StartFtFromPct(seg, pct) {
  const len = v21SegmentLength(seg);
  return Math.round((len * Number(pct || 0) / 100 + Number.EPSILON) * 100) / 100;
}

function v21EditStartChanged() {
  const seg = Number(document.getElementById("v21EditSegment")?.value || 1);
  const start = Number(document.getElementById("v21EditStartFt")?.value || 0);
  const len = Math.max(0.01, v21SegmentLength(seg));
  document.getElementById("v21EditPositionPct").value = Math.round((start / len) * 100);
  v21RenderSplitPreview();
}

function v21EditPctChanged() {
  const seg = Number(document.getElementById("v21EditSegment")?.value || 1);
  const pct = Number(document.getElementById("v21EditPositionPct")?.value || 0);
  document.getElementById("v21EditStartFt").value = v21StartFtFromPct(seg, pct);
  v21RenderSplitPreview();
}

function v21UpdateGateFromEditor() {
  const sel = document.getElementById("v21EditGateSelect");
  if (!sel || sel.value === "") {
    alert("Select a gate first.");
    return;
  }

  const gates = v21Gates();
  const gate = gates[Number(sel.value)];
  if (!gate) return;

  const seg = Number(document.getElementById("v21EditSegment")?.value || 1);
  const startFt = Number(document.getElementById("v21EditStartFt")?.value || 0);
  const widthFt = Number(document.getElementById("v21EditWidthFt")?.value || 4);
  const segLen = v21SegmentLength(seg);

  if (seg < 1 || seg > Math.max(1, v21SegmentLengths().length)) {
    alert("Segment number is not valid.");
    return;
  }

  if (startFt < 0 || startFt + widthFt > segLen) {
    alert("Gate does not fit in this segment. Adjust start ft or width.");
    return;
  }

  gate.segment = seg;
  gate.startFt = startFt;
  gate.widthFt = widthFt;
  gate.positionPct = Math.round(((startFt / Math.max(0.01, segLen)) * 100 + Number.EPSILON) * 100) / 100;

  v21RefreshEditGateList();
  v21RenderSplitPreview();

  if (typeof v13RenderGateList === "function") v13RenderGateList();
  if (typeof draw === "function") draw();
  if (typeof calculateQuote === "function") calculateQuote();
  if (typeof v20RenderInlineMapPreview === "function") v20RenderInlineMapPreview();
}

function v21DeleteGateFromEditor() {
  const sel = document.getElementById("v21EditGateSelect");
  if (!sel || sel.value === "") return;

  v21Gates().splice(Number(sel.value), 1);

  v21RefreshEditGateList();
  v21RenderSplitPreview();

  if (typeof v13RenderGateList === "function") v13RenderGateList();
  if (typeof draw === "function") draw();
  if (typeof calculateQuote === "function") calculateQuote();
  if (typeof v20RenderInlineMapPreview === "function") v20RenderInlineMapPreview();
}

function v21SplitFenceRunsAroundGates(segmentNumber) {
  const len = v21SegmentLength(segmentNumber);
  const gates = v21Gates()
    .filter(g => Number(g.segment || 0) === Number(segmentNumber))
    .map(g => ({
      start: Number(g.startFt ?? v21StartFtFromPct(g.segment, g.positionPct)),
      width: Number(g.widthFt || 0),
      gate: g
    }))
    .sort((a, b) => a.start - b.start);

  let cursor = 0;
  const runs = [];

  gates.forEach(g => {
    if (g.start > cursor) {
      runs.push({
        type: "fence",
        start: cursor,
        end: g.start,
        length: Math.round((g.start - cursor + Number.EPSILON) * 100) / 100
      });
    }

    runs.push({
      type: "gate",
      start: g.start,
      end: g.start + g.width,
      length: g.width,
      gate: g.gate
    });

    cursor = Math.max(cursor, g.start + g.width);
  });

  if (cursor < len) {
    runs.push({
      type: "fence",
      start: cursor,
      end: len,
      length: Math.round((len - cursor + Number.EPSILON) * 100) / 100
    });
  }

  return runs;
}

function v21SectionsForFenceRun(lengthFt) {
  const sectionWidth = Math.max(0.01, v21SectionWidthFt());
  const full = Math.floor(Number(lengthFt || 0) / sectionWidth);
  const rem = Math.round((Number(lengthFt || 0) - full * sectionWidth + Number.EPSILON) * 100) / 100;
  const partial = rem > 0.01 ? 1 : 0;
  return {
    full,
    rem,
    partial,
    total: full + partial,
    label: rem > 0.01 ? `${full} x ${sectionWidth}' + ${rem}' cut` : `${full} x ${sectionWidth}'`
  };
}

function v21RenderSplitPreview() {
  const holder = document.getElementById("v21GateSplitPreview");
  if (!holder) return;

  const rows = [];
  const lengths = v21SegmentLengths();

  lengths.forEach((len, i) => {
    const seg = i + 1;
    const runs = v21SplitFenceRunsAroundGates(seg);

    runs.forEach(run => {
      if (run.type === "fence") {
        const sec = v21SectionsForFenceRun(run.length);
        rows.push(`
          <tr>
            <td>${seg}</td>
            <td>Fence</td>
            <td>${run.start}' - ${run.end}'</td>
            <td>${run.length}'</td>
            <td>${v21Esc(sec.label)}</td>
          </tr>
        `);
      } else {
        rows.push(`
          <tr>
            <td>${seg}</td>
            <td><strong>Gate</strong></td>
            <td>${run.start}' - ${run.end}'</td>
            <td>${run.length}'</td>
            <td>${v21Esc(run.gate.description || run.gate.itemId || "Gate")}</td>
          </tr>
        `);
      }
    });
  });

  holder.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr>
          <th style="border:1px solid #d1d5db;padding:5px;text-align:left;">Seg</th>
          <th style="border:1px solid #d1d5db;padding:5px;text-align:left;">Type</th>
          <th style="border:1px solid #d1d5db;padding:5px;text-align:left;">Run</th>
          <th style="border:1px solid #d1d5db;padding:5px;text-align:left;">Length</th>
          <th style="border:1px solid #d1d5db;padding:5px;text-align:left;">Split / Item</th>
        </tr>
      </thead>
      <tbody>${rows.join("") || `<tr><td colspan="5">No segments found.</td></tr>`}</tbody>
    </table>
  `;
}

function v21PatchCustomerMapForGateSplits() {
  window.v21SplitFenceRunsAroundGates = v21SplitFenceRunsAroundGates;
  window.v21SectionsForFenceRun = v21SectionsForFenceRun;
}

function v21BuildBetterMapSvg() {
  const pts = v21Points();
  const lengths = v21SegmentLengths();
  const gates = v21Gates();
  const sectionWidth = Math.max(0.01, v21SectionWidthFt());

  const width = 1200;
  const height = 760;
  const pad = 95;

  if (pts.length < 2) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="100%" height="100%" fill="#ffffff"/>
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

  function mapRaw(p) {
    return {
      x: pad + (Number(p.x || 0) - minX) * scale,
      y: pad + (Number(p.y || 0) - minY) * scale
    };
  }

  const mapped = pts.map(mapRaw);
  const closed = v21ClosedLayout();
  let sectionNumber = 1;

  let svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <filter id="shadow21" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.20"/>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="#ffffff"/>
      <rect x="14" y="14" width="${width-28}" height="${height-28}" rx="20" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
      <text x="${width/2}" y="42" text-anchor="middle" font-family="Arial" font-size="26" font-weight="800" fill="#111827">Fence Layout Map</text>
      <text x="${width/2}" y="68" text-anchor="middle" font-family="Arial" font-size="14" fill="#4b5563">Fence runs split around gate openings</text>
  `;

  function drawFencePiece(a, b, startFt, endFt, segLen, labelPrefix) {
    const t1 = startFt / Math.max(0.01, segLen);
    const t2 = endFt / Math.max(0.01, segLen);

    const x1 = a.x + (b.x - a.x) * t1;
    const y1 = a.y + (b.y - a.y) * t1;
    const x2 = a.x + (b.x - a.x) * t2;
    const y2 = a.y + (b.y - a.y) * t2;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenPx = Math.sqrt(dx * dx + dy * dy);
    if (lenPx <= 0) return "";

    const angle = Math.atan2(dy, dx);
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);

    const runLen = endFt - startFt;
    const sec = v21SectionsForFenceRun(runLen);

    let out = `
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111827" stroke-width="12" stroke-linecap="round"/>
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-dasharray="12 12" opacity="0.85"/>
    `;

    for (let s = 0; s < sec.total; s++) {
      const localT1 = s / Math.max(1, sec.total);
      const localT2 = (s + 1) / Math.max(1, sec.total);
      const midT = (localT1 + localT2) / 2;

      const mx = x1 + dx * midT + nx * 34;
      const my = y1 + dy * midT + ny * 34;

      out += `
        <rect x="${mx - 23}" y="${my - 14}" width="46" height="28" rx="7" fill="#eff6ff" stroke="#2563eb" stroke-width="2" filter="url(#shadow21)"/>
        <text x="${mx}" y="${my + 5}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="800" fill="#1e3a8a">S${sectionNumber}</text>
      `;
      sectionNumber++;

      if (s > 0) {
        const px = x1 + dx * localT1;
        const py = y1 + dy * localT1;

        out += `
          <circle cx="${px}" cy="${py}" r="10" fill="#2563eb" stroke="#1e3a8a" stroke-width="2" filter="url(#shadow21)"/>
          <text x="${px + nx * 29}" y="${py + ny * 29 + 5}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="800" fill="#1e3a8a">LP</text>
        `;
      }
    }

    const labelX = (x1 + x2) / 2 - nx * 62;
    const labelY = (y1 + y2) / 2 - ny * 62;

    out += `
      <rect x="${labelX - 105}" y="${labelY - 25}" width="210" height="50" rx="10" fill="#ffffff" stroke="#6b7280" stroke-width="1.5" filter="url(#shadow21)"/>
      <text x="${labelX}" y="${labelY - 6}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="800" fill="#111827">${v21Esc(labelPrefix)} ${Math.round(runLen*100)/100}'</text>
      <text x="${labelX}" y="${labelY + 10}" text-anchor="middle" font-family="Arial" font-size="11" fill="#374151">${v21Esc(sec.label)}</text>
    `;

    return out;
  }

  function drawGatePiece(a, b, gate, segLen, gateIndex) {
    const startFt = Number(gate.startFt ?? v21StartFtFromPct(gate.segment, gate.positionPct));
    const endFt = startFt + Number(gate.widthFt || 0);
    const midFt = (startFt + endFt) / 2;
    const t = midFt / Math.max(0.01, segLen);

    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;

    return `
      <g filter="url(#shadow21)">
        <rect x="${x - 46}" y="${y - 34}" width="92" height="68" rx="10" fill="#f97316" stroke="#7c2d12" stroke-width="4"/>
        <line x1="${x - 30}" y1="${y - 21}" x2="${x + 30}" y2="${y + 21}" stroke="#ffffff" stroke-width="3"/>
        <line x1="${x + 30}" y1="${y - 21}" x2="${x - 30}" y2="${y + 21}" stroke="#ffffff" stroke-width="3"/>
      </g>
      <text x="${x}" y="${y - 8}" text-anchor="middle" font-family="Arial" font-size="18" font-weight="900" fill="#ffffff">G${gateIndex + 1}</text>
      <text x="${x}" y="${y + 16}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="800" fill="#ffffff">${v21Esc(gate.widthFt || "")}'</text>
      <rect x="${x - 90}" y="${y + 44}" width="180" height="24" rx="6" fill="#fff7ed" stroke="#fdba74"/>
      <text x="${x}" y="${y + 60}" text-anchor="middle" font-family="Arial" font-size="11" font-weight="800" fill="#7c2d12">Start ${v21Esc(startFt)}' | Seg ${v21Esc(gate.segment)}</text>
    `;
  }

  function drawSegment(segIndex, a, b) {
    const segmentNumber = segIndex + 1;
    const segLen = Number(lengths[segIndex] || 0);
    const runs = v21SplitFenceRunsAroundGates(segmentNumber);
    let out = "";

    runs.forEach(run => {
      if (run.type === "fence" && run.length > 0.01) {
        out += drawFencePiece(a, b, run.start, run.end, segLen, `Seg ${segmentNumber}`);
      }
    });

    const segGates = gates.filter(g => Number(g.segment || 0) === segmentNumber);
    segGates.forEach(g => {
      const globalIndex = gates.indexOf(g);
      out += drawGatePiece(a, b, g, segLen, globalIndex);
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
      <circle cx="${p.x}" cy="${p.y}" r="15" fill="#111827" filter="url(#shadow21)"/>
      <text x="${p.x}" y="${p.y + 5}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="800" fill="#ffffff">P${i + 1}</text>
    `;
  });

  svg += `
      <g transform="translate(26, ${height - 70})">
        <rect x="0" y="0" width="720" height="48" rx="9" fill="#f9fafb" stroke="#d1d5db"/>
        <rect x="16" y="12" width="38" height="24" rx="7" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
        <text x="67" y="29" font-family="Arial" font-size="12" fill="#111827">S# = section number</text>
        <circle cx="250" cy="24" r="10" fill="#2563eb"/>
        <text x="270" y="29" font-family="Arial" font-size="12" fill="#111827">LP = line post/division</text>
        <rect x="455" y="9" width="48" height="30" rx="6" fill="#f97316" stroke="#7c2d12" stroke-width="3"/>
        <text x="515" y="29" font-family="Arial" font-size="12" fill="#111827">Gate opening splits sections</text>
      </g>
    </svg>
  `;

  return svg;
}

function v21PatchMapBuilders() {
  window.v21BuildBetterMapSvg = v21BuildBetterMapSvg;

  if (typeof window.v20BuildMapSvg === "function") {
    window.v20BuildMapSvg = v21BuildBetterMapSvg;
  }

  if (typeof window.v19BuildMapSvg === "function") {
    window.v19BuildMapSvg = v21BuildBetterMapSvg;
  }
}

function v21PatchQuoteForGateSplits() {
  if (window.v21OriginalBuildSegmentData || typeof window.v20BuildSegmentData !== "function") return;

  window.v21OriginalBuildSegmentData = window.v20BuildSegmentData;

  window.v20BuildSegmentData = function() {
    const rows = [];
    v21SegmentLengths().forEach((len, i) => {
      const seg = i + 1;
      const runs = v21SplitFenceRunsAroundGates(seg);
      let fenceSections = 0;
      let linePosts = 0;
      let fenceFt = 0;
      let gateFt = 0;

      runs.forEach(run => {
        if (run.type === "fence") {
          const sec = v21SectionsForFenceRun(run.length);
          fenceSections += sec.total;
          linePosts += Math.max(0, sec.total - 1);
          fenceFt += run.length;
        } else {
          gateFt += run.length;
        }
      });

      rows.push({
        segmentNumber: seg,
        lengthFt: Number(len || 0),
        gateFt,
        usableFt: fenceFt,
        fullSections: "",
        remainder: "",
        partialSections: "",
        totalSections: fenceSections,
        linePosts,
        splitLabel: runs.map(run => {
          if (run.type === "gate") return `${run.length}' gate`;
          return v21SectionsForFenceRun(run.length).label;
        }).join(" | ")
      });
    });
    return rows;
  };
}

document.addEventListener("DOMContentLoaded", function() {
  setTimeout(function() {
    v21InstallGateBuilderNearDrawing();
    v21PatchCustomerMapForGateSplits();
    v21PatchMapBuilders();
    v21PatchQuoteForGateSplits();

    if (typeof v20RenderInlineMapPreview === "function") v20RenderInlineMapPreview();
    if (typeof draw === "function") draw();
    if (typeof calculateQuote === "function") calculateQuote();
  }, 1600);
});
