/*
Version 23 Clean Gate Swing Map

Adds:
- Cleaner customer-facing draggable map
- Less overlapping labels
- Larger open space between fence labels and gate labels
- Gate swing direction:
  - Outswing Left
  - Outswing Right
  - Inswing Left
  - Inswing Right
- Gate swing arc shown on map
- Customer preview uses this cleaner map
*/

function v23Esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[m]));
}

function v23Points() {
  try {
    if (typeof points !== "undefined" && Array.isArray(points)) return points;
  } catch (e) {}
  return [];
}

function v23SegmentLengths() {
  try {
    if (typeof segmentLengths !== "undefined" && Array.isArray(segmentLengths)) return segmentLengths;
  } catch (e) {}
  return [];
}

function v23Gates() {
  try {
    if (typeof v13LayoutGates !== "undefined" && Array.isArray(v13LayoutGates)) return v13LayoutGates;
  } catch (e) {}
  window.v13LayoutGates = [];
  return window.v13LayoutGates;
}

function v23SectionWidthFt() {
  return Number(
    document.getElementById("v14SectionWidthQuick")?.value ||
    document.getElementById("sectionWidthFt")?.value ||
    8
  );
}

function v23ClosedLayout() {
  return document.getElementById("layoutClosed")?.value === "closed";
}

function v23InstallSwingControls() {
  const panel = document.getElementById("v21GateBuilderPanel") || document.getElementById("v22DragGatePanel");
  if (!panel || document.getElementById("v23GateSwing")) return;

  const swingBox = document.createElement("div");
  swingBox.className = "select-line";
  swingBox.innerHTML = `
    <h3>Gate Swing Direction</h3>
    <p class="small">This shows how the gate opens on the customer map.</p>

    <label>Gate Swing</label>
    <select id="v23GateSwing">
      <option value="outswing_left">Outswing Left</option>
      <option value="outswing_right">Outswing Right</option>
      <option value="inswing_left">Inswing Left</option>
      <option value="inswing_right">Inswing Right</option>
    </select>

    <div class="actions" style="margin-top:8px;">
      <button class="blue" onclick="v23ApplySwingToSelectedGate()">Apply Swing to Selected Gate</button>
    </div>
  `;

  panel.appendChild(swingBox);
}

function v23ApplySwingToSelectedGate() {
  const gates = v23Gates();
  if (!gates.length) {
    alert("Add a gate first.");
    return;
  }

  let index = 0;

  const edit21 = document.getElementById("v21EditGateSelect");
  const edit20 = document.getElementById("v20GateSelect");

  if (edit21 && edit21.value !== "") index = Number(edit21.value);
  else if (edit20 && edit20.value !== "") index = Number(edit20.value);

  if (!gates[index]) {
    alert("Select a gate first.");
    return;
  }

  gates[index].swing = document.getElementById("v23GateSwing")?.value || "outswing_left";

  if (typeof calculateQuote === "function") calculateQuote();
  if (typeof v22RenderDragMap === "function") v22RenderDragMap();
  if (typeof v20RenderInlineMapPreview === "function") v20RenderInlineMapPreview();
}

function v23SwingLabel(value) {
  const map = {
    outswing_left: "Outswing Left",
    outswing_right: "Outswing Right",
    inswing_left: "Inswing Left",
    inswing_right: "Inswing Right"
  };
  return map[value] || "Outswing Left";
}

function v23MapGeometry(width, height, pad) {
  const pts = v23Points();
  if (pts.length < 2) return null;

  const minX = Math.min(...pts.map(p => Number(p.x || 0)));
  const maxX = Math.max(...pts.map(p => Number(p.x || 0)));
  const minY = Math.min(...pts.map(p => Number(p.y || 0)));
  const maxY = Math.max(...pts.map(p => Number(p.y || 0)));

  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);

  return {
    mapped: pts.map(p => ({
      x: pad + (Number(p.x || 0) - minX) * scale,
      y: pad + (Number(p.y || 0) - minY) * scale
    })),
    width,
    height,
    pad
  };
}

function v23ProjectPointToSegment(px, py, a, b) {
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

function v23GateCenterOnMap(gate, mapped) {
  const segIndex = Number(gate.segment || 1) - 1;
  const a = mapped[segIndex];
  const b = mapped[segIndex + 1] || (v23ClosedLayout() ? mapped[0] : null);
  if (!a || !b) return null;

  const segLen = Number(v23SegmentLengths()[segIndex] || 1);
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

function v23SplitFenceRunsAroundGates(segmentNumber) {
  if (typeof v22SplitFenceRunsAroundGates === "function") {
    return v22SplitFenceRunsAroundGates(segmentNumber);
  }

  if (typeof v21SplitFenceRunsAroundGates === "function") {
    return v21SplitFenceRunsAroundGates(segmentNumber);
  }

  const len = Number(v23SegmentLengths()[Number(segmentNumber) - 1] || 0);
  return [{ type:"fence", start:0, end:len, length:len }];
}

function v23SectionsForRun(lengthFt) {
  const sectionWidth = Math.max(0.01, v23SectionWidthFt());
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

function v23SwingArcPath(x, y, gateWidthPx, angle, swing) {
  const outward = swing.startsWith("out") ? 1 : -1;
  const left = swing.endsWith("left");

  const nx = -Math.sin(angle) * outward;
  const ny = Math.cos(angle) * outward;
  const tx = Math.cos(angle);
  const ty = Math.sin(angle);

  const hingeOffset = left ? -gateWidthPx / 2 : gateWidthPx / 2;
  const hx = x + tx * hingeOffset;
  const hy = y + ty * hingeOffset;

  const r = Math.max(40, gateWidthPx * 0.85);
  const endDir = left ? -1 : 1;

  const ex = hx + nx * r + tx * endDir * r * 0.55;
  const ey = hy + ny * r + ty * endDir * r * 0.55;

  return {
    hx,
    hy,
    ex,
    ey,
    path: `M ${hx} ${hy} Q ${hx + nx * r} ${hy + ny * r} ${ex} ${ey}`,
    arrowX: ex,
    arrowY: ey
  };
}

function v23BuildCleanMapSvg() {
  const width = 1400;
  const height = 900;
  const pad = 140;
  const geom = v23MapGeometry(width, height, pad);

  if (!geom) {
    return `
      <svg id="v22Svg" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <text x="${width/2}" y="${height/2}" text-anchor="middle" font-family="Arial" font-size="28">No drawing available</text>
      </svg>
    `;
  }

  const mapped = geom.mapped;
  const lengths = v23SegmentLengths();
  const gates = v23Gates();
  const closed = v23ClosedLayout();

  let sectionNumber = 1;

  let svg = `
  <svg id="v22Svg" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="touch-action:none; user-select:none;">
    <defs>
      <filter id="shadow23" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000000" flood-opacity="0.18"/>
      </filter>
      <marker id="arrow23" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,6 L8,3 z" fill="#dc2626"/>
      </marker>
    </defs>

    <rect width="100%" height="100%" fill="#ffffff"/>
    <rect x="18" y="18" width="${width-36}" height="${height-36}" rx="22" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>

    <text x="${width/2}" y="48" text-anchor="middle" font-family="Arial" font-size="28" font-weight="900" fill="#111827">Fence Layout Map</text>
    <text x="${width/2}" y="78" text-anchor="middle" font-family="Arial" font-size="15" fill="#4b5563">Clean customer diagram: sections, posts, gates, and gate swing direction</text>
  `;

  function drawFenceRun(a, b, segLen, run, segNumber, runIndex) {
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

    const sec = v23SectionsForRun(run.length);
    const labelSide = runIndex % 2 === 0 ? 1 : -1;

    let out = `
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111827" stroke-width="11" stroke-linecap="round"/>
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-dasharray="16 14" opacity="0.9"/>
    `;

    for (let s = 0; s < sec.total; s++) {
      const localT1 = s / Math.max(1, sec.total);
      const localT2 = (s + 1) / Math.max(1, sec.total);
      const midT = (localT1 + localT2) / 2;

      const labelDistance = 46 + ((s % 2) * 22);
      const mx = x1 + dx * midT + nx * labelDistance;
      const my = y1 + dy * midT + ny * labelDistance;

      out += `
        <rect x="${mx - 25}" y="${my - 15}" width="50" height="30" rx="8" fill="#eff6ff" stroke="#2563eb" stroke-width="2" filter="url(#shadow23)"/>
        <text x="${mx}" y="${my + 5}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="900" fill="#1e3a8a">S${sectionNumber}</text>
      `;
      sectionNumber++;

      if (s > 0) {
        const px = x1 + dx * localT1;
        const py = y1 + dy * localT1;

        out += `
          <circle cx="${px}" cy="${py}" r="10" fill="#2563eb" stroke="#1e3a8a" stroke-width="2" filter="url(#shadow23)"/>
          <text x="${px + nx * 34}" y="${py + ny * 34 + 5}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="900" fill="#1e3a8a">LP</text>
        `;
      }
    }

    const labelX = (x1 + x2) / 2 - nx * 92 * labelSide;
    const labelY = (y1 + y2) / 2 - ny * 92 * labelSide;

    out += `
      <rect x="${labelX - 120}" y="${labelY - 26}" width="240" height="52" rx="10" fill="#ffffff" stroke="#9ca3af" stroke-width="1.5" filter="url(#shadow23)"/>
      <text x="${labelX}" y="${labelY - 7}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="900" fill="#111827">Seg ${segNumber}: ${run.length}' fence</text>
      <text x="${labelX}" y="${labelY + 11}" text-anchor="middle" font-family="Arial" font-size="11" fill="#374151">${v23Esc(sec.label)}</text>
    `;

    return out;
  }

  function drawGate(a, b, gate, segLen, gateIndex) {
    const startFt = Number(gate.startFt ?? ((Number(gate.positionPct || 0) / 100) * segLen));
    const widthFt = Number(gate.widthFt || 0);
    const endFt = startFt + widthFt;
    const midFt = (startFt + endFt) / 2;
    const t = midFt / Math.max(0.01, segLen);

    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;

    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    const tx = Math.cos(angle);
    const ty = Math.sin(angle);

    const gateWidthPx = Math.max(70, Math.min(150, widthFt * 16));
    const gateHeightPx = 54;

    const swing = gate.swing || "outswing_left";
    const arc = v23SwingArcPath(x, y, gateWidthPx, angle, swing);

    const labelX = x + nx * 100;
    const labelY = y + ny * 100;

    return `
      <g class="v22-draggable-gate" data-gate-index="${gateIndex}" style="cursor:grab;">
        <path d="${arc.path}" fill="none" stroke="#dc2626" stroke-width="4" marker-end="url(#arrow23)"/>
        <line x1="${arc.hx}" y1="${arc.hy}" x2="${arc.ex}" y2="${arc.ey}" stroke="#dc2626" stroke-width="2" stroke-dasharray="6 6"/>

        <g transform="translate(${x} ${y}) rotate(${angle * 180 / Math.PI})" filter="url(#shadow23)">
          <rect x="${-gateWidthPx/2}" y="${-gateHeightPx/2}" width="${gateWidthPx}" height="${gateHeightPx}" rx="9" fill="#f97316" stroke="#7c2d12" stroke-width="4"/>
          <line x1="${-gateWidthPx/2 + 10}" y1="0" x2="${gateWidthPx/2 - 10}" y2="0" stroke="#ffffff" stroke-width="3"/>
          <line x1="0" y1="${-gateHeightPx/2 + 8}" x2="0" y2="${gateHeightPx/2 - 8}" stroke="#ffffff" stroke-width="3"/>
        </g>

        <text x="${x}" y="${y - 7}" text-anchor="middle" font-family="Arial" font-size="17" font-weight="900" fill="#ffffff">G${gateIndex + 1}</text>
        <text x="${x}" y="${y + 15}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="900" fill="#ffffff">${v23Esc(widthFt)}'</text>

        <rect x="${labelX - 118}" y="${labelY - 36}" width="236" height="72" rx="10" fill="#fff7ed" stroke="#fdba74" stroke-width="2" filter="url(#shadow23)"/>
        <text x="${labelX}" y="${labelY - 15}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="900" fill="#7c2d12">G${gateIndex + 1}: ${v23Esc(widthFt)}' Gate</text>
        <text x="${labelX}" y="${labelY + 3}" text-anchor="middle" font-family="Arial" font-size="11" fill="#7c2d12">Start ${v23Esc(startFt)}' - End ${v23Esc(endFt)}'</text>
        <text x="${labelX}" y="${labelY + 21}" text-anchor="middle" font-family="Arial" font-size="11" font-weight="900" fill="#dc2626">${v23Esc(v23SwingLabel(swing))}</text>
      </g>
    `;
  }

  function drawSegment(segIndex, a, b) {
    const segNumber = segIndex + 1;
    const segLen = Number(lengths[segIndex] || 0);
    const runs = v23SplitFenceRunsAroundGates(segNumber);
    let out = "";

    runs.forEach((run, idx) => {
      if (run.type === "fence" && run.length > 0.01) {
        out += drawFenceRun(a, b, segLen, run, segNumber, idx);
      }
    });

    const segGates = gates.filter(g => Number(g.segment || 0) === segNumber);
    segGates.forEach(g => {
      out += drawGate(a, b, g, segLen, gates.indexOf(g));
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
      <circle cx="${p.x}" cy="${p.y}" r="15" fill="#111827" filter="url(#shadow23)"/>
      <text x="${p.x}" y="${p.y + 5}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="900" fill="#ffffff">P${i + 1}</text>
    `;
  });

  svg += `
      <g transform="translate(30, ${height - 76})">
        <rect x="0" y="0" width="910" height="54" rx="10" fill="#f9fafb" stroke="#d1d5db"/>
        <rect x="18" y="14" width="42" height="26" rx="7" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
        <text x="74" y="32" font-family="Arial" font-size="13" fill="#111827">S# = section</text>
        <circle cx="215" cy="27" r="10" fill="#2563eb"/>
        <text x="235" y="32" font-family="Arial" font-size="13" fill="#111827">LP = line post</text>
        <rect x="395" y="13" width="58" height="28" rx="7" fill="#f97316" stroke="#7c2d12" stroke-width="3"/>
        <text x="468" y="32" font-family="Arial" font-size="13" fill="#111827">Gate</text>
        <path d="M575 32 Q610 2 650 27" fill="none" stroke="#dc2626" stroke-width="4" marker-end="url(#arrow23)"/>
        <text x="665" y="32" font-family="Arial" font-size="13" fill="#111827">Red arc = swing/open direction</text>
      </g>
    </svg>
  `;

  return svg;
}

function v23RenderCleanMap() {
  const box = document.getElementById("v22DragMap") || document.getElementById("v18FenceSystemDrawingPreview");
  if (!box) return;

  box.innerHTML = v23BuildCleanMapSvg();

  if (typeof v22AttachDragHandlers === "function") {
    v22AttachDragHandlers();
  }
}

function v23PatchBuilders() {
  window.v23BuildCleanMapSvg = v23BuildCleanMapSvg;

  window.v22BuildDraggableSvg = v23BuildCleanMapSvg;
  window.v21BuildBetterMapSvg = v23BuildCleanMapSvg;
  window.v20BuildMapSvg = v23BuildCleanMapSvg;
  window.v19BuildMapSvg = v23BuildCleanMapSvg;

  window.v22RenderDragMap = v23RenderCleanMap;
}

function v23PatchGateAdd() {
  if (!window.v23OriginalAddGate && typeof v21AddGateFromDrawingPanel === "function") {
    window.v23OriginalAddGate = v21AddGateFromDrawingPanel;

    window.v21AddGateFromDrawingPanel = function() {
      window.v23OriginalAddGate();

      const gates = v23Gates();
      if (gates.length) {
        const last = gates[gates.length - 1];
        last.swing = document.getElementById("v23GateSwing")?.value || "outswing_left";
      }

      v23RenderCleanMap();
    };
  }
}

function v23PatchDragEndRefresh() {
  if (!window.v23OriginalV22EndDrag && typeof v22EndDrag === "function") {
    window.v23OriginalV22EndDrag = v22EndDrag;
    window.v22EndDrag = function() {
      window.v23OriginalV22EndDrag();
      v23RenderCleanMap();
    };
  }
}

document.addEventListener("DOMContentLoaded", function() {
  setTimeout(function() {
    v23InstallSwingControls();
    v23PatchBuilders();
    v23PatchGateAdd();
    v23PatchDragEndRefresh();
    v23RenderCleanMap();

    if (typeof calculateQuote === "function") calculateQuote();
  }, 2400);
});
