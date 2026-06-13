/*
Version 22 Draggable Gate Map

Adds:
- Physical gate dragging on the Fence System map
- Click/touch gate and drag along its assigned segment
- Gate start feet updates automatically
- Gate position percentage updates automatically
- Section split recalculates immediately
- Drawing labels fence runs around gate:
  2 ft cut + 4 ft gate + remaining 8 ft sections/cuts
*/

let v22DragGateIndex = -1;
let v22DragActive = false;
let v22SvgBox = null;

function v22Esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[m]));
}

function v22SegmentLengths() {
  try {
    if (typeof segmentLengths !== "undefined" && Array.isArray(segmentLengths)) return segmentLengths;
  } catch (e) {}
  return [];
}

function v22Points() {
  try {
    if (typeof points !== "undefined" && Array.isArray(points)) return points;
  } catch (e) {}
  return [];
}

function v22Gates() {
  try {
    if (typeof v13LayoutGates !== "undefined" && Array.isArray(v13LayoutGates)) return v13LayoutGates;
  } catch (e) {}
  window.v13LayoutGates = [];
  return window.v13LayoutGates;
}

function v22SectionWidthFt() {
  return Number(
    document.getElementById("v14SectionWidthQuick")?.value ||
    document.getElementById("sectionWidthFt")?.value ||
    8
  );
}

function v22ClosedLayout() {
  return document.getElementById("layoutClosed")?.value === "closed";
}

function v22InstallDragPanel() {
  const systemTab = document.getElementById("tab-system");
  if (!systemTab || document.getElementById("v22DragGatePanel")) return;

  const panel = document.createElement("div");
  panel.id = "v22DragGatePanel";
  panel.className = "select-line";
  panel.innerHTML = `
    <h3>Drag Gate on Map</h3>
    <p class="small">
      Use this map to physically move a gate. Drag the orange gate box along the fence segment.
      The section cuts update as soon as the gate moves.
    </p>

    <div class="actions">
      <button class="blue" onclick="v22RenderDragMap()">Refresh Drag Map</button>
      <button class="green" onclick="v22PreviewCustomerQuote()">Preview Customer Quote</button>
    </div>

    <div id="v22DragMapStatus" class="notice" style="margin-top:10px;">
      Add a gate first, then drag it on the map.
    </div>

    <div id="v22DragMap" style="margin-top:12px; border:1px solid #d1d5db; border-radius:10px; background:#fff; padding:8px; overflow:auto;"></div>
  `;

  const oldPreview = document.getElementById("v18FenceSystemDrawingPreview");
  if (oldPreview && oldPreview.parentElement) {
    oldPreview.parentElement.insertBefore(panel, oldPreview);
  } else {
    systemTab.prepend(panel);
  }
}

function v22MapGeometry(width, height, pad) {
  const pts = v22Points();

  if (pts.length < 2) return null;

  const minX = Math.min(...pts.map(p => Number(p.x || 0)));
  const maxX = Math.max(...pts.map(p => Number(p.x || 0)));
  const minY = Math.min(...pts.map(p => Number(p.y || 0)));
  const maxY = Math.max(...pts.map(p => Number(p.y || 0)));

  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);

  const mapped = pts.map(p => ({
    x: pad + (Number(p.x || 0) - minX) * scale,
    y: pad + (Number(p.y || 0) - minY) * scale
  }));

  return { mapped, width, height, pad };
}

function v22ProjectPointToSegment(px, py, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 <= 0) return { t: 0, x: a.x, y: a.y };

  let t = ((px - a.x) * dx + (py - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));

  return {
    t,
    x: a.x + dx * t,
    y: a.y + dy * t
  };
}

function v22GateCenterOnMap(gate, mapped) {
  const segIndex = Number(gate.segment || 1) - 1;
  const a = mapped[segIndex];
  const b = mapped[segIndex + 1] || (v22ClosedLayout() ? mapped[0] : null);
  if (!a || !b) return null;

  const segLen = Number(v22SegmentLengths()[segIndex] || 1);
  const startFt = Number(gate.startFt ?? ((Number(gate.positionPct || 0) / 100) * segLen));
  const centerFt = startFt + Number(gate.widthFt || 0) / 2;
  const t = Math.max(0, Math.min(1, centerFt / Math.max(0.01, segLen)));

  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    a,
    b,
    segLen
  };
}

function v22SplitFenceRunsAroundGates(segmentNumber) {
  const lengths = v22SegmentLengths();
  const segLen = Number(lengths[Number(segmentNumber) - 1] || 0);
  const gates = v22Gates()
    .filter(g => Number(g.segment || 0) === Number(segmentNumber))
    .map(g => {
      const start = Number(g.startFt ?? ((Number(g.positionPct || 0) / 100) * segLen));
      const width = Number(g.widthFt || 0);
      return { start, width, gate: g };
    })
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

  if (cursor < segLen) {
    runs.push({
      type: "fence",
      start: cursor,
      end: segLen,
      length: Math.round((segLen - cursor + Number.EPSILON) * 100) / 100
    });
  }

  return runs;
}

function v22SectionsForRun(lengthFt) {
  const sectionWidth = Math.max(0.01, v22SectionWidthFt());
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

function v22BuildDraggableSvg() {
  const width = 1200;
  const height = 760;
  const pad = 95;
  const geom = v22MapGeometry(width, height, pad);

  if (!geom) {
    return `
      <svg id="v22Svg" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <text x="${width/2}" y="${height/2}" text-anchor="middle" font-family="Arial" font-size="28">No drawing available</text>
      </svg>
    `;
  }

  const mapped = geom.mapped;
  const lengths = v22SegmentLengths();
  const gates = v22Gates();
  const closed = v22ClosedLayout();

  let sectionNumber = 1;

  let svg = `
  <svg id="v22Svg" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="touch-action:none; user-select:none;">
    <defs>
      <filter id="shadow22" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.22"/>
      </filter>
    </defs>
    <rect width="100%" height="100%" fill="#ffffff"/>
    <rect x="14" y="14" width="${width-28}" height="${height-28}" rx="20" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <text x="${width/2}" y="42" text-anchor="middle" font-family="Arial" font-size="26" font-weight="900" fill="#111827">Draggable Fence Layout Map</text>
    <text x="${width/2}" y="68" text-anchor="middle" font-family="Arial" font-size="14" fill="#4b5563">Drag orange gate. Sections recalculate around the gate opening.</text>
  `;

  function drawFenceRun(a, b, segLen, run, segNumber) {
    const t1 = run.start / Math.max(0.01, segLen);
    const t2 = run.end / Math.max(0.01, segLen);

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

    const sec = v22SectionsForRun(run.length);

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
        <rect x="${mx - 24}" y="${my - 14}" width="48" height="28" rx="7" fill="#eff6ff" stroke="#2563eb" stroke-width="2" filter="url(#shadow22)"/>
        <text x="${mx}" y="${my + 5}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="900" fill="#1e3a8a">S${sectionNumber}</text>
      `;
      sectionNumber++;

      if (s > 0) {
        const px = x1 + dx * localT1;
        const py = y1 + dy * localT1;

        out += `
          <circle cx="${px}" cy="${py}" r="10" fill="#2563eb" stroke="#1e3a8a" stroke-width="2" filter="url(#shadow22)"/>
          <text x="${px + nx * 30}" y="${py + ny * 30 + 5}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="900" fill="#1e3a8a">LP</text>
        `;
      }
    }

    const labelX = (x1 + x2) / 2 - nx * 62;
    const labelY = (y1 + y2) / 2 - ny * 62;

    out += `
      <rect x="${labelX - 112}" y="${labelY - 25}" width="224" height="50" rx="10" fill="#ffffff" stroke="#6b7280" stroke-width="1.5" filter="url(#shadow22)"/>
      <text x="${labelX}" y="${labelY - 6}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="900" fill="#111827">Seg ${segNumber}: ${run.length}' fence</text>
      <text x="${labelX}" y="${labelY + 10}" text-anchor="middle" font-family="Arial" font-size="11" fill="#374151">${v22Esc(sec.label)}</text>
    `;

    return out;
  }

  function drawSegment(segIndex, a, b) {
    const segNumber = segIndex + 1;
    const segLen = Number(lengths[segIndex] || 0);
    const runs = v22SplitFenceRunsAroundGates(segNumber);
    let out = "";

    runs.forEach(run => {
      if (run.type === "fence" && run.length > 0.01) {
        out += drawFenceRun(a, b, segLen, run, segNumber);
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
      <circle cx="${p.x}" cy="${p.y}" r="16" fill="#111827" filter="url(#shadow22)"/>
      <text x="${p.x}" y="${p.y + 5}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="900" fill="#ffffff">P${i + 1}</text>
    `;
  });

  gates.forEach((g, i) => {
    const c = v22GateCenterOnMap(g, mapped);
    if (!c) return;

    const startFt = Number(g.startFt ?? ((Number(g.positionPct || 0) / 100) * c.segLen));
    const endFt = startFt + Number(g.widthFt || 0);

    svg += `
      <g class="v22-draggable-gate" data-gate-index="${i}" style="cursor:grab;">
        <g filter="url(#shadow22)">
          <rect x="${c.x - 50}" y="${c.y - 36}" width="100" height="72" rx="10" fill="#f97316" stroke="#7c2d12" stroke-width="4"/>
          <line x1="${c.x - 32}" y1="${c.y - 23}" x2="${c.x + 32}" y2="${c.y + 23}" stroke="#ffffff" stroke-width="3"/>
          <line x1="${c.x + 32}" y1="${c.y - 23}" x2="${c.x - 32}" y2="${c.y + 23}" stroke="#ffffff" stroke-width="3"/>
        </g>
        <text x="${c.x}" y="${c.y - 10}" text-anchor="middle" font-family="Arial" font-size="19" font-weight="900" fill="#ffffff">G${i + 1}</text>
        <text x="${c.x}" y="${c.y + 15}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="900" fill="#ffffff">${v22Esc(g.widthFt || "")}'</text>
        <rect x="${c.x - 98}" y="${c.y + 48}" width="196" height="26" rx="7" fill="#fff7ed" stroke="#fdba74"/>
        <text x="${c.x}" y="${c.y + 66}" text-anchor="middle" font-family="Arial" font-size="11" font-weight="900" fill="#7c2d12">Start ${v22Esc(startFt)}' - End ${v22Esc(endFt)}'</text>
      </g>
    `;
  });

  svg += `
      <g transform="translate(26, ${height - 70})">
        <rect x="0" y="0" width="780" height="48" rx="9" fill="#f9fafb" stroke="#d1d5db"/>
        <rect x="16" y="12" width="38" height="24" rx="7" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
        <text x="67" y="29" font-family="Arial" font-size="12" fill="#111827">S# = section number</text>
        <circle cx="250" cy="24" r="10" fill="#2563eb"/>
        <text x="270" y="29" font-family="Arial" font-size="12" fill="#111827">LP = line post/division</text>
        <rect x="455" y="9" width="52" height="30" rx="6" fill="#f97316" stroke="#7c2d12" stroke-width="3"/>
        <text x="520" y="29" font-family="Arial" font-size="12" fill="#111827">Drag orange gate to update cuts</text>
      </g>
    </svg>
  `;

  return svg;
}

function v22RenderDragMap() {
  const box = document.getElementById("v22DragMap");
  if (!box) return;

  box.innerHTML = v22BuildDraggableSvg();
  v22AttachDragHandlers();
  v22UpdateStatus();
}

function v22UpdateStatus() {
  const status = document.getElementById("v22DragMapStatus");
  if (!status) return;

  const gates = v22Gates();
  if (!gates.length) {
    status.className = "warn";
    status.textContent = "No gates added yet. Add a gate first using Add Gate on Drawing.";
    return;
  }

  status.className = "good";
  status.textContent = "Drag the orange gate box along its segment. The section split updates immediately.";
}

function v22EventPoint(evt, svg) {
  const pt = svg.createSVGPoint();
  const e = evt.touches ? evt.touches[0] : evt;
  pt.x = e.clientX;
  pt.y = e.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function v22AttachDragHandlers() {
  const svg = document.getElementById("v22Svg");
  if (!svg) return;

  svg.querySelectorAll(".v22-draggable-gate").forEach(gEl => {
    gEl.addEventListener("mousedown", v22StartDrag);
    gEl.addEventListener("touchstart", v22StartDrag, { passive:false });
  });

  svg.addEventListener("mousemove", v22OnDrag);
  svg.addEventListener("mouseup", v22EndDrag);
  svg.addEventListener("mouseleave", v22EndDrag);

  svg.addEventListener("touchmove", v22OnDrag, { passive:false });
  svg.addEventListener("touchend", v22EndDrag);
  svg.addEventListener("touchcancel", v22EndDrag);
}

function v22StartDrag(evt) {
  evt.preventDefault();
  const el = evt.currentTarget;
  v22DragGateIndex = Number(el.dataset.gateIndex);
  v22DragActive = true;
}

function v22OnDrag(evt) {
  if (!v22DragActive || v22DragGateIndex < 0) return;
  evt.preventDefault();

  const svg = document.getElementById("v22Svg");
  if (!svg) return;

  const gate = v22Gates()[v22DragGateIndex];
  if (!gate) return;

  const geom = v22MapGeometry(1200, 760, 95);
  if (!geom) return;

  const mapped = geom.mapped;
  const segIndex = Number(gate.segment || 1) - 1;
  const a = mapped[segIndex];
  const b = mapped[segIndex + 1] || (v22ClosedLayout() ? mapped[0] : null);
  if (!a || !b) return;

  const p = v22EventPoint(evt, svg);
  const projected = v22ProjectPointToSegment(p.x, p.y, a, b);

  const segLen = Number(v22SegmentLengths()[segIndex] || 0);
  const widthFt = Number(gate.widthFt || 0);

  let centerFt = projected.t * segLen;
  let startFt = centerFt - widthFt / 2;

  startFt = Math.max(0, Math.min(Math.max(0, segLen - widthFt), startFt));

  gate.startFt = Math.round((startFt + Number.EPSILON) * 100) / 100;
  gate.positionPct = Math.round(((gate.startFt / Math.max(0.01, segLen)) * 100 + Number.EPSILON) * 100) / 100;

  v22RenderDragMap();

  if (typeof v21RefreshEditGateList === "function") v21RefreshEditGateList();
  if (typeof v21RenderSplitPreview === "function") v21RenderSplitPreview();
  if (typeof v20RefreshGateSelect === "function") v20RefreshGateSelect();
  if (typeof v13RenderGateList === "function") v13RenderGateList();
  if (typeof calculateQuote === "function") calculateQuote();
}

function v22EndDrag() {
  if (!v22DragActive) return;

  v22DragActive = false;
  v22DragGateIndex = -1;

  if (typeof draw === "function") draw();
  if (typeof calculateQuote === "function") calculateQuote();

  v22RenderDragMap();
}

function v22PatchMapBuilders() {
  window.v22BuildDraggableSvg = v22BuildDraggableSvg;
  window.v22SplitFenceRunsAroundGates = v22SplitFenceRunsAroundGates;
  window.v22SectionsForRun = v22SectionsForRun;

  if (typeof window.v21BuildBetterMapSvg === "function") {
    window.v21BuildBetterMapSvg = v22BuildDraggableSvg;
  }

  if (typeof window.v20BuildMapSvg === "function") {
    window.v20BuildMapSvg = v22BuildDraggableSvg;
  }

  if (typeof window.v19BuildMapSvg === "function") {
    window.v19BuildMapSvg = v22BuildDraggableSvg;
  }
}

function v22PatchGateAddAndCalculate() {
  if (!window.v22OriginalAddGate && typeof v21AddGateFromDrawingPanel === "function") {
    window.v22OriginalAddGate = v21AddGateFromDrawingPanel;
    window.v21AddGateFromDrawingPanel = function() {
      window.v22OriginalAddGate();
      v22RenderDragMap();
    };
  }

  if (!window.v22OriginalCalculate && typeof calculateQuote === "function") {
    window.v22OriginalCalculate = calculateQuote;
    window.calculateQuote = function() {
      window.v22OriginalCalculate();
      setTimeout(v22RenderDragMap, 50);
    };
  }
}

function v22PreviewCustomerQuote() {
  if (typeof v20PreviewCustomerQuote === "function") {
    v20PreviewCustomerQuote();
    return;
  }
  if (typeof v19PreviewCustomerQuote === "function") {
    v19PreviewCustomerQuote();
    return;
  }
  alert("Customer preview function not found.");
}

document.addEventListener("DOMContentLoaded", function() {
  setTimeout(function() {
    v22InstallDragPanel();
    v22PatchMapBuilders();
    v22PatchGateAddAndCalculate();
    v22RenderDragMap();

    if (typeof calculateQuote === "function") calculateQuote();
  }, 2100);
});
