/*
Version 27 Gate Map Cleanup
Fixes:
- Restores physical gate dragging.
- Stops re-render from killing drag events.
- Uses document-level pointer dragging.
- Removes box-style gate callouts from map.
- Gate is a simple orange line.
- Swing is a clear red line + arc.
- Simple labels only:
  - 2'
  - 4' GATE
  - 8'
  - 6' CUT
- Adds one clean gate control panel.
- Hides old duplicate gate/map/print panels.
*/
(function () {
  let dragIndex = -1;
  let dragSvg = null;
  let rafPending = false;
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, m => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[m]));
  }
  function pts() {
    try {
      if (typeof points !== "undefined" && Array.isArray(points)) return points;
    } catch (e) {}
    return [];
  }
  function segLens() {
    try {
      if (typeof segmentLengths !== "undefined" && Array.isArray(segmentLengths)) return segmentLengths;
    } catch (e) {}
    return [];
  }
  function gates() {
    try {
      if (typeof v13LayoutGates !== "undefined" && Array.isArray(v13LayoutGates)) return v13LayoutGates;
    } catch (e) {}
    window.v13LayoutGates = [];
    return window.v13LayoutGates;
  }
  function sectionWidth() {
    return Number(
      document.getElementById("v14SectionWidthQuick")?.value ||
      document.getElementById("sectionWidthFt")?.value ||
      8
    );
  }
  function closed() {
    return document.getElementById("layoutClosed")?.value === "closed";
  }
  function swingLabel(value) {
    return ({
      outswing_left: "Out L",
      outswing_right: "Out R",
      inswing_left: "In L",
      inswing_right: "In R"
    })[value] || "Out L";
  }
  function fullSwingLabel(value) {
    return ({
      outswing_left: "Outswing Left",
      outswing_right: "Outswing Right",
      inswing_left: "Inswing Left",
      inswing_right: "Inswing Right"
    })[value] || "Outswing Left";
  }
  function ensureStart(g) {
    const lens = segLens();
    const segIndex = Number(g.segment || 1) - 1;
    const len = Number(lens[segIndex] || 0);
    const w = Number(g.widthFt || 4);
    if (g.startFt === undefined || g.startFt === null || g.startFt === "") {
      g.startFt = Math.round(((Number(g.positionPct || 0) / 100) * len + Number.EPSILON) * 100) / 100;
    }
    g.startFt = Math.max(0, Math.min(Math.max(0, len - w), Number(g.startFt || 0)));
    g.positionPct = Math.round(((g.startFt / Math.max(0.01, len)) * 100 + Number.EPSILON) * 100) / 100;
    if (!g.swing) g.swing = "outswing_left";
    return g;
  }
  function geometry(width, height, pad) {
    const raw = pts();
    if (raw.length < 2) return null;
    const minX = Math.min(...raw.map(p => Number(p.x || 0)));
    const maxX = Math.max(...raw.map(p => Number(p.x || 0)));
    const minY = Math.min(...raw.map(p => Number(p.y || 0)));
    const maxY = Math.max(...raw.map(p => Number(p.y || 0)));
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
    return raw.map(p => ({
      x: pad + (Number(p.x || 0) - minX) * scale,
      y: pad + (Number(p.y || 0) - minY) * scale
    }));
  }
  function project(px, py, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 <= 0) return 0;
    return Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len2));
  }
  function svgPoint(evt, svg) {
    const pt = svg.createSVGPoint();
    const e = evt.touches ? evt.touches[0] : evt;
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }
  function pointAt(a, b, len, ft) {
    const t = Math.max(0, Math.min(1, Number(ft || 0) / Math.max(0.01, len)));
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t
    };
  }
  function runsForSegment(segmentNumber) {
    const lens = segLens();
    const len = Number(lens[Number(segmentNumber) - 1] || 0);
    const segGates = gates()
      .filter(g => Number(g.segment || 0) === Number(segmentNumber))
      .map(g => {
        ensureStart(g);
        return {
          type: "gate",
          start: Number(g.startFt || 0),
          end: Number(g.startFt || 0) + Number(g.widthFt || 0),
          length: Number(g.widthFt || 0),
          gate: g
        };
      })
      .sort((a, b) => a.start - b.start);
    let cursor = 0;
    const runs = [];
    segGates.forEach(g => {
      if (g.start > cursor) {
        runs.push({
          type: "fence",
          start: cursor,
          end: g.start,
          length: Math.round((g.start - cursor + Number.EPSILON) * 100) / 100
        });
      }
      runs.push(g);
      cursor = Math.max(cursor, g.end);
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
  function sectionLabel(lengthFt) {
    const sw = Math.max(0.01, sectionWidth());
    const full = Math.floor(Number(lengthFt || 0) / sw);
    const rem = Math.round((Number(lengthFt || 0) - full * sw + Number.EPSILON) * 100) / 100;
    if (full === 0 && rem > 0.01) return rem + "' CUT";
    if (rem > 0.01) return full + "x" + sw + "' + " + rem + "' CUT";
    return full + "x" + sw + "'";
  }
  function swingPath(p1, p2, g) {
    const swing = g.swing || "outswing_left";
    const isIn = swing.startsWith("in");
    const isLeft = swing.endsWith("left");
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    const hinge = isLeft ? p1 : p2;
    const other = isLeft ? p2 : p1;
    const gatePx = Math.max(30, Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)));
    const side = isIn ? -1 : 1;
    const openEnd = {
      x: hinge.x + nx * side * gatePx,
      y: hinge.y + ny * side * gatePx
    };
    const cx = hinge.x + nx * side * gatePx * 0.75 + (other.x - hinge.x) * 0.28;
    const cy = hinge.y + ny * side * gatePx * 0.75 + (other.y - hinge.y) * 0.28;
    return {
      leaf: `<line x1="${hinge.x}" y1="${hinge.y}" x2="${openEnd.x}" y2="${openEnd.y}" stroke="#dc2626" stroke-width="4" stroke-linecap="round"/>`,
      arc: `<path d="M ${hinge.x} ${hinge.y} Q ${cx} ${cy} ${openEnd.x} ${openEnd.y}" fill="none" stroke="#dc2626" stroke-width="3" marker-end="url(#v27arrow)"/>`
    };
  }
  function buildMapSvg() {
    const width = 1120;
    const height = 640;
    const pad = 115;
    const map = geometry(width, height, pad);
    if (!map) {
      return `
        <svg id="v27Svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#fff"/>
          <text x="${width/2}" y="${height/2}" text-anchor="middle" font-family="Arial" font-size="22">No map available</text>
        </svg>`;
    }
    const lens = segLens();
    let svg = `
      <svg id="v27Svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="touch-action:none; user-select:none;">
        <defs>
          <marker id="v27arrow" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#dc2626"/>
          </marker>
        </defs>
        <rect width="100%" height="100%" fill="#ffffff"/>
        <rect x="8" y="8" width="${width - 16}" height="${height - 16}" rx="16" fill="#ffffff" stroke="#d1d5db"/>
        <text x="${width/2}" y="34" text-anchor="middle" font-family="Arial" font-size="21" font-weight="900" fill="#111827">Gate Layout</text>
        <text x="${width/2}" y="57" text-anchor="middle" font-family="Arial" font-size="11" fill="#4b5563">Drag orange gate line. Red line shows swing/open direction.</text>
    `;
    function drawFenceRun(a, b, segLen, run, runIndex) {
      const p1 = pointAt(a, b, segLen, run.start);
      const p2 = pointAt(a, b, segLen, run.end);
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const lenPx = Math.sqrt(dx * dx + dy * dy);
      if (lenPx < 1) return "";
      const angle = Math.atan2(dy, dx);
      const nx = -Math.sin(angle);
      const ny = Math.cos(angle);
      const labelOff = runIndex % 2 === 0 ? 24 : -24;
      const lx = (p1.x + p2.x) / 2 + nx * labelOff;
      const ly = (p1.y + p2.y) / 2 + ny * labelOff;
      let out = `
        <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#111827" stroke-width="7" stroke-linecap="round"/>
      `;
      const sw = sectionWidth();
      const pieces = Math.ceil(run.length / sw);
      for (let i = 1; i < pieces; i++) {
        const t = i / pieces;
        const px = p1.x + dx * t;
        const py = p1.y + dy * t;
        out += `
          <circle cx="${px}" cy="${py}" r="5" fill="#2563eb"/>
        `;
      }
      out += `
        <text x="${lx}" y="${ly}" text-anchor="middle" font-family="Arial" font-size="11" font-weight="900" fill="#1e3a8a">${esc(sectionLabel(run.length))}</text>
      `;
      return out;
    }
    function drawGate(a, b, segLen, g, gateIndex) {
      ensureStart(g);
      const start = Number(g.startFt || 0);
      const widthFt = Number(g.widthFt || 0);
      const end = start + widthFt;
      const p1 = pointAt(a, b, segLen, start);
      const p2 = pointAt(a, b, segLen, end);
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const nx = -Math.sin(angle);
      const ny = Math.cos(angle);
      const swing = swingPath(p1, p2, g);
      const lx = mid.x + nx * 52;
      const ly = mid.y + ny * 52;
      return `
        <g class="v27Gate" data-gate-index="${gateIndex}" style="cursor:grab;">
          ${swing.leaf}
          ${swing.arc}
          <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#f97316" stroke-width="12" stroke-linecap="round"/>
          <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#7c2d12" stroke-width="2" stroke-linecap="round"/>
          <circle cx="${p1.x}" cy="${p1.y}" r="5.5" fill="#7c2d12"/>
          <circle cx="${p2.x}" cy="${p2.y}" r="5.5" fill="#7c2d12"/>
          <text x="${lx}" y="${ly - 11}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="900" fill="#7c2d12">G${gateIndex + 1}: ${esc(widthFt)}'</text>
          <text x="${lx}" y="${ly + 3}" text-anchor="middle" font-family="Arial" font-size="10" font-weight="800" fill="#111827">${esc(start)}' - ${esc(end)}'</text>
          <text x="${lx}" y="${ly + 17}" text-anchor="middle" font-family="Arial" font-size="10" font-weight="900" fill="#dc2626">${esc(swingLabel(g.swing))}</text>
        </g>`;
    }
    function drawSegment(segIndex, a, b) {
      const segNo = segIndex + 1;
      const segLen = Number(lens[segIndex] || 0);
      const runs = runsForSegment(segNo);
      let out = "";
      runs.forEach((run, idx) => {
        if (run.type === "fence" && run.length > 0.01) {
          out += drawFenceRun(a, b, segLen, run, idx);
        }
      });
      gates()
        .filter(g => Number(g.segment || 0) === segNo)
        .forEach(g => out += drawGate(a, b, segLen, g, gates().indexOf(g)));
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      out += `<text x="${mx}" y="${my - 12}" text-anchor="middle" font-family="Arial" font-size="9" font-weight="900" fill="#374151">SEG ${segNo}</text>`;
      return out;
    }
    for (let i = 0; i < map.length - 1; i++) {
      svg += drawSegment(i, map[i], map[i + 1]);
    }
    if (closed() && map.length > 2) {
      svg += drawSegment(map.length - 1, map[map.length - 1], map[0]);
    }
    map.forEach((p, i) => {
      svg += `
        <circle cx="${p.x}" cy="${p.y}" r="8" fill="#111827"/>
        <text x="${p.x}" y="${p.y + 3}" text-anchor="middle" font-family="Arial" font-size="7.5" font-weight="900" fill="#ffffff">P${i + 1}</text>
      `;
    });
    svg += `
        <text x="18" y="${height - 22}" font-family="Arial" font-size="10" fill="#4b5563">Orange line = gate opening. Red line/arc = swing. Blue dots = line posts.</text>
      </svg>
    `;
    return svg;
  }
  function renderMap() {
    const box = document.getElementById("v27CleanGateMap") || document.getElementById("v22DragMap") || document.getElementById("v18FenceSystemDrawingPreview");
    if (!box) return;
    box.innerHTML = buildMapSvg();
    attachGateDrag();
  }
  function scheduleRender() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      renderMap();
    });
  }
  function attachGateDrag() {
    const svg = document.getElementById("v27Svg");
    if (!svg) return;
    svg.querySelectorAll(".v27Gate").forEach(el => {
      el.addEventListener("pointerdown", startDrag);
    });
  }
  function startDrag(evt) {
    evt.preventDefault();
    dragIndex = Number(evt.currentTarget.dataset.gateIndex);
    dragSvg = document.getElementById("v27Svg");
    document.addEventListener("pointermove", moveDrag);
    document.addEventListener("pointerup", endDrag);
  }
  function moveDrag(evt) {
    if (dragIndex < 0 || !dragSvg) return;
    const g = gates()[dragIndex];
    if (!g) return;
    const map = geometry(1120, 640, 115);
    if (!map) return;
    const segIndex = Number(g.segment || 1) - 1;
    const a = map[segIndex];
    const b = map[segIndex + 1] || (closed() ? map[0] : null);
    if (!a || !b) return;
    const pt = svgPoint(evt, dragSvg);
    const t = project(pt.x, pt.y, a, b);
    const len = Number(segLens()[segIndex] || 0);
    const width = Number(g.widthFt || 0);
    let centerFt = t * len;
    let startFt = centerFt - width / 2;
    startFt = Math.max(0, Math.min(Math.max(0, len - width), startFt));
    g.startFt = Math.round((startFt + Number.EPSILON) * 100) / 100;
    g.positionPct = Math.round(((g.startFt / Math.max(0.01, len)) * 100 + Number.EPSILON) * 100) / 100;
    syncEditors();
    scheduleRender();
  }
  function endDrag() {
    if (dragIndex < 0) return;
    dragIndex = -1;
    dragSvg = null;
    document.removeEventListener("pointermove", moveDrag);
    document.removeEventListener("pointerup", endDrag);
    if (typeof calculateQuote === "function") calculateQuote();
    renderMap();
  }
  function syncEditors() {
    if (typeof v21RefreshEditGateList === "function") v21RefreshEditGateList();
    if (typeof v21RenderSplitPreview === "function") v21RenderSplitPreview();
    if (typeof v20RefreshGateSelect === "function") v20RefreshGateSelect();
  }
  function applySwingToSelectedGate() {
    const gs = gates();
    if (!gs.length) {
      alert("Add a gate first.");
      return;
    }
    let index = 0;
    const select = document.getElementById("v27GateSelect");
    if (select && select.value !== "") index = Number(select.value);
    const g = gs[index];
    if (!g) return;
    g.swing = document.getElementById("v27SwingSelect")?.value || "outswing_left";
    if (typeof calculateQuote === "function") calculateQuote();
    refreshGateSelect();
    renderMap();
  }
  function refreshGateSelect() {
    const sel = document.getElementById("v27GateSelect");
    if (!sel) return;
    sel.innerHTML = "";
    if (!gates().length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No gates added yet";
      sel.appendChild(opt);
      return;
    }
    gates().forEach((g, i) => {
      ensureStart(g);
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = "G" + (i + 1) + " - Seg " + g.segment + " - " + g.startFt + "' - " + (g.widthFt || "") + "' - " + fullSwingLabel(g.swing);
      sel.appendChild(opt);
    });
  }
  function loadSwingFromSelected() {
    const sel = document.getElementById("v27GateSelect");
    if (!sel || sel.value === "") return;
    const g = gates()[Number(sel.value)];
    if (!g) return;
    const sw = document.getElementById("v27SwingSelect");
    if (sw) sw.value = g.swing || "outswing_left";
  }
  function hideDuplicates() {
    const keep = new Set(["v27GateControlPanel", "v24UnifiedCustomerPrintPanel"]);
    document.querySelectorAll(".select-line").forEach(box => {
      if (keep.has(box.id)) return;
      const text = String(box.textContent || "").toLowerCase();
      const duplicate =
        text.includes("fixed customer quote preview") ||
        text.includes("preview / print quote") ||
        text.includes("customer quote preview") ||
        text.includes("move gate / door") ||
        text.includes("drag gate on map") ||
        text.includes("gate swing direction") ||
        text.includes("move / edit gate on drawing");
      if (duplicate) {
        box.style.display = "none";
        box.dataset.v27HiddenDuplicate = "1";
      }
    });
  }
  function installPanel() {
    const systemTab = document.getElementById("tab-system") || document.getElementById("tab-quick");
    if (!systemTab || document.getElementById("v27GateControlPanel")) return;
    const panel = document.createElement("div");
    panel.id = "v27GateControlPanel";
    panel.className = "select-line";
    panel.innerHTML = `
      <h3>Gate Map / Swing</h3>
      <p class="small">One clean gate map. Add the gate, then drag the orange gate line anywhere on its segment.</p>
      <div class="row">
        <div>
          <label>Select Gate</label>
          <select id="v27GateSelect" onchange="v27LoadSwingFromSelected()"></select>
        </div>
        <div>
          <label>Swing Direction</label>
          <select id="v27SwingSelect">
            <option value="outswing_left">Outswing Left</option>
            <option value="outswing_right">Outswing Right</option>
            <option value="inswing_left">Inswing Left</option>
            <option value="inswing_right">Inswing Right</option>
          </select>
        </div>
      </div>
      <div class="actions">
        <button class="blue" onclick="v27ApplySwingToSelectedGate()">Apply Swing</button>
        <button class="green" onclick="v27RenderMap()">Refresh Map</button>
      </div>
      <div id="v27CleanGateMap" style="margin-top:10px;border:1px solid #d1d5db;border-radius:10px;background:#fff;padding:8px;overflow:auto;"></div>
    `;
    const anchor = document.getElementById("v24UnifiedCustomerPrintPanel");
    if (anchor && anchor.parentElement) {
      anchor.parentElement.insertBefore(panel, anchor.nextSibling);
    } else {
      systemTab.prepend(panel);
    }
  }
  function patchOldMapsAndPrint() {
    window.v27RenderMap = renderMap;
    window.v27ApplySwingToSelectedGate = applySwingToSelectedGate;
    window.v27LoadSwingFromSelected = loadSwingFromSelected;
    window.v27BuildGateLineMapSvg = buildMapSvg;
    window.v26BuildGateLineSvg = buildMapSvg;
    window.v25BuildCustomerClearMapSvg = buildMapSvg;
    window.v24BuildCleanCustomerMapSvg = buildMapSvg;
    window.v23BuildCleanMapSvg = buildMapSvg;
    window.v22BuildDraggableSvg = buildMapSvg;
    window.v21BuildBetterMapSvg = buildMapSvg;
    window.v20BuildMapSvg = buildMapSvg;
    window.v19BuildMapSvg = buildMapSvg;
    window.v26RenderMap = renderMap;
    window.v25RenderInlineMap = renderMap;
    window.v23RenderCleanMap = renderMap;
    window.v22RenderDragMap = renderMap;
  }
  function patchAddGate() {
    if (!window.v27OriginalAddGate && typeof v21AddGateFromDrawingPanel === "function") {
      window.v27OriginalAddGate = v21AddGateFromDrawingPanel;
      window.v21AddGateFromDrawingPanel = function() {
        window.v27OriginalAddGate();
        gates().forEach(ensureStart);
        refreshGateSelect();
        renderMap();
      };
    }
  }
  function init() {
    installPanel();
    hideDuplicates();
    patchOldMapsAndPrint();
    patchAddGate();
    gates().forEach(ensureStart);
    refreshGateSelect();
    renderMap();
    if (typeof calculateQuote === "function") calculateQuote();
    setTimeout(() => {
      hideDuplicates();
      refreshGateSelect();
      renderMap();
    }, 1200);
  }
  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(init, 2300);
  });
})();
