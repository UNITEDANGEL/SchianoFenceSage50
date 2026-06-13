/*
Version 26 Gate Line Drag Map

Fixes:
- Gate no longer draws as a big box.
- Gate draws as a clear colored line/opening on the fence.
- Gate can be physically dragged on the map.
- Gate position updates start feet and percentage.
- Section split updates around the gate:
  Example: 2 ft fence + 4 ft gate + remaining sections.
- Swing direction is shown with a clear red swing line/arc.
- Labels are kept outside the fence line to reduce overlap.
*/

let v26DraggingGateIndex = -1;

function v26Esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[m]));
}

function v26Points() {
  try {
    if (typeof points !== "undefined" && Array.isArray(points)) return points;
  } catch (e) {}
  return [];
}

function v26SegmentLengths() {
  try {
    if (typeof segmentLengths !== "undefined" && Array.isArray(segmentLengths)) return segmentLengths;
  } catch (e) {}
  return [];
}

function v26Gates() {
  try {
    if (typeof v13LayoutGates !== "undefined" && Array.isArray(v13LayoutGates)) return v13LayoutGates;
  } catch (e) {}
  window.v13LayoutGates = [];
  return window.v13LayoutGates;
}

function v26SectionWidthFt() {
  return Number(
    document.getElementById("v14SectionWidthQuick")?.value ||
    document.getElementById("sectionWidthFt")?.value ||
    8
  );
}

function v26ClosedLayout() {
  return document.getElementById("layoutClosed")?.value === "closed";
}

function v26SwingLabel(value) {
  const map = {
    outswing_left: "Outswing Left",
    outswing_right: "Outswing Right",
    inswing_left: "Inswing Left",
    inswing_right: "Inswing Right"
  };
  return map[value] || "Outswing Left";
}

function v26EnsureGateStart(gate) {
  const lengths = v26SegmentLengths();
  const segIndex = Number(gate.segment || 1) - 1;
  const segLen = Number(lengths[segIndex] || 0);

  if (gate.startFt === undefined || gate.startFt === null || gate.startFt === "") {
    gate.startFt = Math.round(((Number(gate.positionPct || 0) / 100) * segLen + Number.EPSILON) * 100) / 100;
  }

  const width = Number(gate.widthFt || 0);
  gate.startFt = Math.max(0, Math.min(Math.max(0, segLen - width), Number(gate.startFt || 0)));
  gate.positionPct = Math.round(((gate.startFt / Math.max(0.01, segLen)) * 100 + Number.EPSILON) * 100) / 100;

  return gate;
}

function v26RunsForSegment(segmentNumber) {
  const lengths = v26SegmentLengths();
  const segLen = Number(lengths[Number(segmentNumber) - 1] || 0);

  const gates = v26Gates()
    .filter(g => Number(g.segment || 0) === Number(segmentNumber))
    .map(g => {
      v26EnsureGateStart(g);
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

  gates.forEach(g => {
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

function v26SectionsForRun(lengthFt) {
  const width = Math.max(0.01, v26SectionWidthFt());
  const full = Math.floor(Number(lengthFt || 0) / width);
  const rem = Math.round((Number(lengthFt || 0) - full * width + Number.EPSILON) * 100) / 100;
  const partial = rem > 0.01 ? 1 : 0;

  return {
    total: full + partial,
    label: rem > 0.01 ? `${full} x ${width}' + ${rem}' cut` : `${full} x ${width}'`
  };
}

function v26Geometry(width, height, pad) {
  const pts = v26Points();
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

function v26PointOnSegment(a, b, segLen, ft) {
  const t = Math.max(0, Math.min(1, Number(ft || 0) / Math.max(0.01, segLen)));
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    t
  };
}

function v26ProjectToSegment(px, py, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;

  if (len2 <= 0) return 0;

  let t = ((px - a.x) * dx + (py - a.y) * dy) / len2;
  return Math.max(0, Math.min(1, t));
}

function v26EventPoint(evt, svg) {
  const pt = svg.createSVGPoint();
  const e = evt.touches ? evt.touches[0] : evt;
  pt.x = e.clientX;
  pt.y = e.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function v26SwingPath(startPoint, endPoint, gate, angle) {
  const swing = gate.swing || "outswing_left";
  const isIn = swing.startsWith("in");
  const isLeft = swing.endsWith("left");

  const tx = Math.cos(angle);
  const ty = Math.sin(angle);
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);

  const hinge = isLeft ? startPoint : endPoint;
  const leafEndClosed = isLeft ? endPoint : startPoint;

  const gatePx = Math.sqrt(
    Math.pow(endPoint.x - startPoint.x, 2) +
    Math.pow(endPoint.y - startPoint.y, 2)
  );

  const side = isIn ? -1 : 1;
  const openEnd = {
    x: hinge.x + nx * side * gatePx,
    y: hinge.y + ny * side * gatePx
  };

  const cx = hinge.x + nx * side * gatePx * 0.72 + (leafEndClosed.x - hinge.x) * 0.35;
  const cy = hinge.y + ny * side * gatePx * 0.72 + (leafEndClosed.y - hinge.y) * 0.35;

  return {
    line: `<line x1="${hinge.x}" y1="${hinge.y}" x2="${openEnd.x}" y2="${openEnd.y}" stroke="#dc2626" stroke-width="4" stroke-linecap="round"/>`,
    arc: `<path d="M ${hinge.x} ${hinge.y} Q ${cx} ${cy} ${openEnd.x} ${openEnd.y}" fill="none" stroke="#dc2626" stroke-width="3" marker-end="url(#v26arrow)"/>`,
    hinge
  };
}

function v26BuildGateLineSvg() {
  const width = 1100;
  const height = 620;
  const pad = 105;
  const mapped = v26Geometry(width, height, pad);

  if (!mapped) {
    return `
      <svg id="v26Svg" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <text x="${width/2}" y="${height/2}" text-anchor="middle" font-family="Arial" font-size="24">No map available</text>
      </svg>
    `;
  }

  const lengths = v26SegmentLengths();
  const gates = v26Gates();
  const closed = v26ClosedLayout();

  let svg = `
  <svg id="v26Svg" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="touch-action:none; user-select:none;">
    <defs>
      <marker id="v26arrow" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill="#dc2626"/>
      </marker>
    </defs>
    <rect width="100%" height="100%" fill="#ffffff"/>
    <rect x="8" y="8" width="${width-16}" height="${height-16}" rx="16" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="${width/2}" y="34" text-anchor="middle" font-family="Arial" font-size="20" font-weight="900" fill="#111827">Fence Gate Layout</text>
    <text x="${width/2}" y="56" text-anchor="middle" font-family="Arial" font-size="11" fill="#4b5563">Gate is the orange line. Red line/arc shows where the gate swings open.</text>
  `;

  function drawFenceRun(a, b, segLen, run, segNo, labelIndex) {
    const p1 = v26PointOnSegment(a, b, segLen, run.start);
    const p2 = v26PointOnSegment(a, b, segLen, run.end);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lenPx = Math.sqrt(dx * dx + dy * dy);

    if (lenPx < 1) return "";

    const angle = Math.atan2(dy, dx);
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    const sec = v26SectionsForRun(run.length);

    const labelOffset = labelIndex % 2 === 0 ? 30 : -30;
    const lx = (p1.x + p2.x) / 2 + nx * labelOffset;
    const ly = (p1.y + p2.y) / 2 + ny * labelOffset;

    let out = `
      <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#111827" stroke-width="7" stroke-linecap="round"/>
    `;

    for (let i = 1; i < sec.total; i++) {
      const t = i / sec.total;
      const px = p1.x + dx * t;
      const py = p1.y + dy * t;

      out += `
        <circle cx="${px}" cy="${py}" r="5.5" fill="#2563eb"/>
        <text x="${px + nx * 15}" y="${py + ny * 15 + 3}" text-anchor="middle" font-family="Arial" font-size="8" font-weight="900" fill="#1e3a8a">LP</text>
      `;
    }

    out += `
      <rect x="${lx - 58}" y="${ly - 15}" width="116" height="30" rx="7" fill="#eff6ff" stroke="#93c5fd"/>
      <text x="${lx}" y="${ly - 2}" text-anchor="middle" font-family="Arial" font-size="8.5" font-weight="900" fill="#1e3a8a">${run.length}' fence</text>
      <text x="${lx}" y="${ly + 10}" text-anchor="middle" font-family="Arial" font-size="7.5" fill="#1e3a8a">${v26Esc(sec.label)}</text>
    `;

    return out;
  }

  function drawGateLine(a, b, segLen, gate, gateIndex) {
    v26EnsureGateStart(gate);

    const start = Number(gate.startFt || 0);
    const end = start + Number(gate.widthFt || 0);
    const p1 = v26PointOnSegment(a, b, segLen, start);
    const p2 = v26PointOnSegment(a, b, segLen, end);

    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const swing = v26SwingPath(p1, p2, gate, angle);

    const mid = {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2
    };

    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);

    const labelX = mid.x + nx * 55;
    const labelY = mid.y + ny * 55;

    return `
      <g class="v26-gate-drag" data-gate-index="${gateIndex}" style="cursor:grab;">
        ${swing.line}
        ${swing.arc}

        <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#f97316" stroke-width="11" stroke-linecap="round"/>
        <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#7c2d12" stroke-width="2" stroke-linecap="round"/>

        <circle cx="${p1.x}" cy="${p1.y}" r="6" fill="#7c2d12"/>
        <circle cx="${p2.x}" cy="${p2.y}" r="6" fill="#7c2d12"/>

        <rect x="${labelX - 75}" y="${labelY - 26}" width="150" height="52" rx="8" fill="#fff7ed" stroke="#fdba74"/>
        <text x="${labelX}" y="${labelY - 8}" text-anchor="middle" font-family="Arial" font-size="10" font-weight="900" fill="#7c2d12">G${gateIndex + 1}: ${v26Esc(gate.widthFt)}' opening</text>
        <text x="${labelX}" y="${labelY + 6}" text-anchor="middle" font-family="Arial" font-size="8.5" fill="#7c2d12">Start ${v26Esc(start)}' / End ${v26Esc(end)}'</text>
        <text x="${labelX}" y="${labelY + 19}" text-anchor="middle" font-family="Arial" font-size="8.5" font-weight="900" fill="#dc2626">${v26Esc(v26SwingLabel(gate.swing))}</text>
      </g>
    `;
  }

  function drawSegment(segIndex, a, b) {
    const segNo = segIndex + 1;
    const segLen = Number(lengths[segIndex] || 0);
    const runs = v26RunsForSegment(segNo);

    let out = "";

    runs.forEach((run, idx) => {
      if (run.type === "fence" && run.length > 0.01) {
        out += drawFenceRun(a, b, segLen, run, segNo, idx);
      }
    });

    const segGates = gates.filter(g => Number(g.segment || 0) === segNo);
    segGates.forEach(g => {
      out += drawGateLine(a, b, segLen, g, gates.indexOf(g));
    });

    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;

    out += `
      <rect x="${mx - 36}" y="${my - 12}" width="72" height="24" rx="6" fill="#ffffff" stroke="#94a3b8"/>
      <text x="${mx}" y="${my + 4}" text-anchor="middle" font-family="Arial" font-size="8" font-weight="900" fill="#111827">SEG ${segNo}</text>
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
      <circle cx="${p.x}" cy="${p.y}" r="8.5" fill="#111827"/>
      <text x="${p.x}" y="${p.y + 3}" text-anchor="middle" font-family="Arial" font-size="7.5" font-weight="900" fill="#fff">P${i + 1}</text>
    `;
  });

  svg += `
    <g transform="translate(18, ${height - 34})">
      <text x="0" y="0" font-family="Arial" font-size="9" fill="#4b5563">Orange line = gate opening. Red line/arc = direction and landing when opened. Drag the orange line to move the gate.</text>
    </g>
  </svg>`;

  return svg;
}

function v26RenderMap() {
  const box = document.getElementById("v22DragMap") || document.getElementById("v18FenceSystemDrawingPreview");
  if (!box) return;

  box.innerHTML = v26BuildGateLineSvg();
  v26AttachDrag();
}

function v26AttachDrag() {
  const svg = document.getElementById("v26Svg");
  if (!svg) return;

  svg.querySelectorAll(".v26-gate-drag").forEach(el => {
    el.addEventListener("mousedown", v26StartDrag);
    el.addEventListener("touchstart", v26StartDrag, { passive:false });
  });

  svg.addEventListener("mousemove", v26DragMove);
  svg.addEventListener("mouseup", v26EndDrag);
  svg.addEventListener("mouseleave", v26EndDrag);

  svg.addEventListener("touchmove", v26DragMove, { passive:false });
  svg.addEventListener("touchend", v26EndDrag);
  svg.addEventListener("touchcancel", v26EndDrag);
}

function v26StartDrag(evt) {
  evt.preventDefault();
  v26DraggingGateIndex = Number(evt.currentTarget.dataset.gateIndex);
}

function v26DragMove(evt) {
  if (v26DraggingGateIndex < 0) return;
  evt.preventDefault();

  const svg = document.getElementById("v26Svg");
  const gate = v26Gates()[v26DraggingGateIndex];
  if (!svg || !gate) return;

  const mapped = v26Geometry(1100, 620, 105);
  if (!mapped) return;

  const segIndex = Number(gate.segment || 1) - 1;
  const a = mapped[segIndex];
  const b = mapped[segIndex + 1] || (v26ClosedLayout() ? mapped[0] : null);
  if (!a || !b) return;

  const p = v26EventPoint(evt, svg);
  const t = v26ProjectToSegment(p.x, p.y, a, b);

  const segLen = Number(v26SegmentLengths()[segIndex] || 0);
  const width = Number(gate.widthFt || 0);

  let centerFt = t * segLen;
  let startFt = centerFt - width / 2;

  startFt = Math.max(0, Math.min(Math.max(0, segLen - width), startFt));

  gate.startFt = Math.round((startFt + Number.EPSILON) * 100) / 100;
  gate.positionPct = Math.round(((gate.startFt / Math.max(0.01, segLen)) * 100 + Number.EPSILON) * 100) / 100;

  if (typeof v21RefreshEditGateList === "function") v21RefreshEditGateList();
  if (typeof v21RenderSplitPreview === "function") v21RenderSplitPreview();
  if (typeof v20RefreshGateSelect === "function") v20RefreshGateSelect();

  v26RenderMap();
}

function v26EndDrag() {
  if (v26DraggingGateIndex < 0) return;

  v26DraggingGateIndex = -1;

  if (typeof calculateQuote === "function") calculateQuote();
  if (typeof draw === "function") draw();

  v26RenderMap();
}

function v26PatchAllMaps() {
  window.v26BuildGateLineSvg = v26BuildGateLineSvg;

  window.v25BuildCustomerClearMapSvg = v26BuildGateLineSvg;
  window.v24BuildCleanCustomerMapSvg = v26BuildGateLineSvg;
  window.v23BuildCleanMapSvg = v26BuildGateLineSvg;
  window.v22BuildDraggableSvg = v26BuildGateLineSvg;
  window.v21BuildBetterMapSvg = v26BuildGateLineSvg;
  window.v20BuildMapSvg = v26BuildGateLineSvg;
  window.v19BuildMapSvg = v26BuildGateLineSvg;

  window.v22RenderDragMap = v26RenderMap;
  window.v23RenderCleanMap = v26RenderMap;
  window.v25RenderInlineMap = v26RenderMap;
}

function v26PatchGateAddRefresh() {
  if (!window.v26OriginalAddGate && typeof v21AddGateFromDrawingPanel === "function") {
    window.v26OriginalAddGate = v21AddGateFromDrawingPanel;

    window.v21AddGateFromDrawingPanel = function() {
      window.v26OriginalAddGate();
      v26Gates().forEach(v26EnsureGateStart);
      v26RenderMap();
    };
  }
}

document.addEventListener("DOMContentLoaded", function() {
  setTimeout(function() {
    v26PatchAllMaps();
    v26PatchGateAddRefresh();

    v26Gates().forEach(v26EnsureGateStart);

    if (typeof calculateQuote === "function") calculateQuote();

    v26RenderMap();
  }, 2200);
});
