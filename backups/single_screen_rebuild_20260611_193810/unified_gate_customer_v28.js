/*
Version 28 Unified Gate + Customer Quote Control
Goals:
- One clean workflow.
- Add gate from the same area as the map.
- Move gate physically by dragging orange line.
- Change swing direction.
- Recalculate section splits around gate.
- Customer print options:
  1. show line totals
  2. hide all item totals
  3. mask item totals, example ***45
- Customer grand total always shows.
*/
(function () {
  var dragIndex = -1;
  var dragSvg = null;
  var renderLock = false;
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
      return {
        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        '"':"&quot;",
        "'":"&#039;"
      }[m];
    });
  }
  function money(n) {
    return Number(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
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
  function inventory() {
    try {
      if (Array.isArray(window.inventoryItems)) return window.inventoryItems;
    } catch (e) {}
    return [];
  }
  function sectionWidth() {
    var v = Number(
      (document.getElementById("v28SectionWidth") || {}).value ||
      (document.getElementById("v14SectionWidthQuick") || {}).value ||
      (document.getElementById("sectionWidthFt") || {}).value ||
      8
    );
    return v > 0 ? v : 8;
  }
  function closed() {
    var el = document.getElementById("layoutClosed");
    return el && el.value === "closed";
  }
  function swingFull(value) {
    return {
      outswing_left: "Outswing Left",
      outswing_right: "Outswing Right",
      inswing_left: "Inswing Left",
      inswing_right: "Inswing Right"
    }[value] || "Outswing Left";
  }
  function swingShort(value) {
    return {
      outswing_left: "Out L",
      outswing_right: "Out R",
      inswing_left: "In L",
      inswing_right: "In R"
    }[value] || "Out L";
  }
  function customerTotalMode() {
    var el = document.getElementById("v28CustomerTotalsMode");
    return el ? el.value : "grand_only";
  }
  function maskAmount(n) {
    var s = money(n).replace(/[^0-9.]/g, "");
    var last = s.length >= 2 ? s.slice(-2) : s;
    return "***" + last;
  }
  function displayLineTotal(n) {
    var mode = customerTotalMode();
    if (mode === "show") return "$" + money(n);
    if (mode === "mask") return maskAmount(n);
    return "";
  }
  function showLineTotalColumn() {
    return customerTotalMode() !== "grand_only";
  }
  function gatePrice(g) {
    if (!g) return 0;
    if (Number(g.unitPrice || 0) > 0) return Number(g.unitPrice || 0);
    var items = inventory();
    var found = null;
    for (var i = 0; i < items.length; i++) {
      if (String(items[i].ItemID || "") === String(g.itemId || "")) {
        found = items[i];
        break;
      }
    }
    if (found) {
      try {
        if (typeof v11PriceForItem === "function") {
          return Number(v11PriceForItem(found, 1, ""));
        }
      } catch (e) {}
      return Number(found.Retail || 0);
    }
    return 0;
  }
  function ensureStart(g) {
    var lens = segLens();
    var segIndex = Number(g.segment || 1) - 1;
    var len = Number(lens[segIndex] || 0);
    var w = Number(g.widthFt || 4);
    if (g.startFt === undefined || g.startFt === null || g.startFt === "") {
      g.startFt = Math.round(((Number(g.positionPct || 0) / 100) * len + Number.EPSILON) * 100) / 100;
    }
    g.startFt = Math.max(0, Math.min(Math.max(0, len - w), Number(g.startFt || 0)));
    g.positionPct = Math.round(((g.startFt / Math.max(0.01, len)) * 100 + Number.EPSILON) * 100) / 100;
    if (!g.swing) g.swing = "outswing_left";
    if (!g.widthFt) g.widthFt = 4;
    if (!g.gateType) g.gateType = "single";
    return g;
  }
  function geometry(width, height, pad) {
    var raw = pts();
    if (raw.length < 2) return null;
    var minX = Math.min.apply(null, raw.map(function (p) { return Number(p.x || 0); }));
    var maxX = Math.max.apply(null, raw.map(function (p) { return Number(p.x || 0); }));
    var minY = Math.min.apply(null, raw.map(function (p) { return Number(p.y || 0); }));
    var maxY = Math.max.apply(null, raw.map(function (p) { return Number(p.y || 0); }));
    var spanX = Math.max(1, maxX - minX);
    var spanY = Math.max(1, maxY - minY);
    var scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
    return raw.map(function (p) {
      return {
        x: pad + (Number(p.x || 0) - minX) * scale,
        y: pad + (Number(p.y || 0) - minY) * scale
      };
    });
  }
  function pointAt(a, b, len, ft) {
    var t = Math.max(0, Math.min(1, Number(ft || 0) / Math.max(0.01, len)));
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t
    };
  }
  function project(px, py, a, b) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var len2 = dx * dx + dy * dy;
    if (len2 <= 0) return 0;
    return Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len2));
  }
  function svgPoint(evt, svg) {
    var pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }
  function sectionsForRun(lengthFt) {
    var sw = sectionWidth();
    var full = Math.floor(Number(lengthFt || 0) / sw);
    var rem = Math.round((Number(lengthFt || 0) - full * sw + Number.EPSILON) * 100) / 100;
    if (full === 0 && rem > 0.01) return rem + "' CUT";
    if (rem > 0.01) return full + "x" + sw + "' + " + rem + "' CUT";
    return full + "x" + sw + "'";
  }
  function runsForSegment(segmentNumber) {
    var lens = segLens();
    var len = Number(lens[Number(segmentNumber) - 1] || 0);
    var segGates = gates()
      .filter(function (g) { return Number(g.segment || 0) === Number(segmentNumber); })
      .map(function (g) {
        ensureStart(g);
        return {
          type: "gate",
          start: Number(g.startFt || 0),
          end: Number(g.startFt || 0) + Number(g.widthFt || 0),
          length: Number(g.widthFt || 0),
          gate: g
        };
      })
      .sort(function (a, b) { return a.start - b.start; });
    var cursor = 0;
    var runs = [];
    segGates.forEach(function (g) {
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
  function swingPath(p1, p2, g) {
    var swing = g.swing || "outswing_left";
    var isIn = swing.indexOf("in") === 0;
    var isLeft = swing.indexOf("left") >= 0;
    var angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    var nx = -Math.sin(angle);
    var ny = Math.cos(angle);
    var hinge = isLeft ? p1 : p2;
    var other = isLeft ? p2 : p1;
    var gatePx = Math.max(34, Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)));
    var side = isIn ? -1 : 1;
    var openEnd = {
      x: hinge.x + nx * side * gatePx,
      y: hinge.y + ny * side * gatePx
    };
    var cx = hinge.x + nx * side * gatePx * 0.75 + (other.x - hinge.x) * 0.25;
    var cy = hinge.y + ny * side * gatePx * 0.75 + (other.y - hinge.y) * 0.25;
    return {
      leaf: '<line x1="' + hinge.x + '" y1="' + hinge.y + '" x2="' + openEnd.x + '" y2="' + openEnd.y + '" stroke="#dc2626" stroke-width="4" stroke-linecap="round"/>',
      arc: '<path d="M ' + hinge.x + ' ' + hinge.y + ' Q ' + cx + ' ' + cy + ' ' + openEnd.x + ' ' + openEnd.y + '" fill="none" stroke="#dc2626" stroke-width="3" marker-end="url(#v28arrow)"/>'
    };
  }
  function buildMapSvg() {
    var width = 1120;
    var height = 640;
    var pad = 115;
    var map = geometry(width, height, pad);
    if (!map) {
      return '<svg id="v28Svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#fff"/><text x="' + (width/2) + '" y="' + (height/2) + '" text-anchor="middle" font-family="Arial" font-size="22">No map available</text></svg>';
    }
    var lens = segLens();
    var svg = ''
      + '<svg id="v28Svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg" style="touch-action:none; user-select:none;">'
      + '<defs><marker id="v28arrow" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#dc2626"/></marker></defs>'
      + '<rect width="100%" height="100%" fill="#ffffff"/>'
      + '<rect x="8" y="8" width="' + (width - 16) + '" height="' + (height - 16) + '" rx="16" fill="#ffffff" stroke="#d1d5db"/>'
      + '<text x="' + (width/2) + '" y="34" text-anchor="middle" font-family="Arial" font-size="21" font-weight="900" fill="#111827">Gate Layout</text>'
      + '<text x="' + (width/2) + '" y="57" text-anchor="middle" font-family="Arial" font-size="11" fill="#4b5563">Drag orange gate line. Red line shows swing/open direction.</text>';
    function drawFenceRun(a, b, segLen, run, runIndex) {
      var p1 = pointAt(a, b, segLen, run.start);
      var p2 = pointAt(a, b, segLen, run.end);
      var dx = p2.x - p1.x;
      var dy = p2.y - p1.y;
      var lenPx = Math.sqrt(dx * dx + dy * dy);
      if (lenPx < 1) return "";
      var angle = Math.atan2(dy, dx);
      var nx = -Math.sin(angle);
      var ny = Math.cos(angle);
      var labelOff = runIndex % 2 === 0 ? 24 : -24;
      var lx = (p1.x + p2.x) / 2 + nx * labelOff;
      var ly = (p1.y + p2.y) / 2 + ny * labelOff;
      var out = '<line x1="' + p1.x + '" y1="' + p1.y + '" x2="' + p2.x + '" y2="' + p2.y + '" stroke="#111827" stroke-width="7" stroke-linecap="round"/>';
      var pieces = Math.ceil(run.length / sectionWidth());
      for (var i = 1; i < pieces; i++) {
        var t = i / pieces;
        var px = p1.x + dx * t;
        var py = p1.y + dy * t;
        out += '<circle cx="' + px + '" cy="' + py + '" r="5" fill="#2563eb"/>';
      }
      out += '<text x="' + lx + '" y="' + ly + '" text-anchor="middle" font-family="Arial" font-size="11" font-weight="900" fill="#1e3a8a">' + esc(sectionsForRun(run.length)) + '</text>';
      return out;
    }
    function drawGate(a, b, segLen, g, gateIndex) {
      ensureStart(g);
      var start = Number(g.startFt || 0);
      var widthFt = Number(g.widthFt || 0);
      var end = start + widthFt;
      var p1 = pointAt(a, b, segLen, start);
      var p2 = pointAt(a, b, segLen, end);
      var mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      var angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      var nx = -Math.sin(angle);
      var ny = Math.cos(angle);
      var swing = swingPath(p1, p2, g);
      var lx = mid.x + nx * 52;
      var ly = mid.y + ny * 52;
      return ''
        + '<g class="v28Gate" data-gate-index="' + gateIndex + '" style="cursor:grab;">'
        + swing.leaf
        + swing.arc
        + '<line x1="' + p1.x + '" y1="' + p1.y + '" x2="' + p2.x + '" y2="' + p2.y + '" stroke="#f97316" stroke-width="12" stroke-linecap="round"/>'
        + '<line x1="' + p1.x + '" y1="' + p1.y + '" x2="' + p2.x + '" y2="' + p2.y + '" stroke="#7c2d12" stroke-width="2" stroke-linecap="round"/>'
        + '<circle cx="' + p1.x + '" cy="' + p1.y + '" r="5.5" fill="#7c2d12"/>'
        + '<circle cx="' + p2.x + '" cy="' + p2.y + '" r="5.5" fill="#7c2d12"/>'
        + '<text x="' + lx + '" y="' + (ly - 11) + '" text-anchor="middle" font-family="Arial" font-size="12" font-weight="900" fill="#7c2d12">G' + (gateIndex + 1) + ': ' + esc(widthFt) + "'</text>"
        + '<text x="' + lx + '" y="' + (ly + 3) + '" text-anchor="middle" font-family="Arial" font-size="10" font-weight="800" fill="#111827">' + esc(start) + "' - " + esc(end) + "'</text>"
        + '<text x="' + lx + '" y="' + (ly + 17) + '" text-anchor="middle" font-family="Arial" font-size="10" font-weight="900" fill="#dc2626">' + esc(swingShort(g.swing)) + '</text>'
        + '</g>';
    }
    function drawSegment(segIndex, a, b) {
      var segNo = segIndex + 1;
      var segLen = Number(lens[segIndex] || 0);
      var runs = runsForSegment(segNo);
      var out = "";
      runs.forEach(function (run, idx) {
        if (run.type === "fence" && run.length > 0.01) {
          out += drawFenceRun(a, b, segLen, run, idx);
        }
      });
      gates()
        .filter(function (g) { return Number(g.segment || 0) === segNo; })
        .forEach(function (g) {
          out += drawGate(a, b, segLen, g, gates().indexOf(g));
        });
      var mx = (a.x + b.x) / 2;
      var my = (a.y + b.y) / 2;
      out += '<text x="' + mx + '" y="' + (my - 12) + '" text-anchor="middle" font-family="Arial" font-size="9" font-weight="900" fill="#374151">SEG ' + segNo + '</text>';
      return out;
    }
    for (var i = 0; i < map.length - 1; i++) {
      svg += drawSegment(i, map[i], map[i + 1]);
    }
    if (closed() && map.length > 2) {
      svg += drawSegment(map.length - 1, map[map.length - 1], map[0]);
    }
    map.forEach(function (p, i) {
      svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="8" fill="#111827"/><text x="' + p.x + '" y="' + (p.y + 3) + '" text-anchor="middle" font-family="Arial" font-size="7.5" font-weight="900" fill="#ffffff">P' + (i + 1) + '</text>';
    });
    svg += '<text x="18" y="' + (height - 22) + '" font-family="Arial" font-size="10" fill="#4b5563">Orange line = gate opening. Red line/arc = swing. Blue dots = line posts.</text>';
    svg += '</svg>';
    return svg;
  }
  function renderMap() {
    var box = document.getElementById("v28CleanGateMap") || document.getElementById("v27CleanGateMap") || document.getElementById("v22DragMap") || document.getElementById("v18FenceSystemDrawingPreview");
    if (!box) return;
    box.innerHTML = buildMapSvg();
    attachDrag();
  }
  function attachDrag() {
    var svg = document.getElementById("v28Svg");
    if (!svg) return;
    var list = svg.querySelectorAll(".v28Gate");
    for (var i = 0; i < list.length; i++) {
      list[i].addEventListener("pointerdown", startDrag);
    }
  }
  function startDrag(evt) {
    evt.preventDefault();
    dragIndex = Number(evt.currentTarget.getAttribute("data-gate-index"));
    dragSvg = document.getElementById("v28Svg");
    document.addEventListener("pointermove", moveDrag);
    document.addEventListener("pointerup", endDrag);
  }
  function moveDrag(evt) {
    if (dragIndex < 0 || !dragSvg) return;
    var g = gates()[dragIndex];
    if (!g) return;
    var map = geometry(1120, 640, 115);
    if (!map) return;
    var segIndex = Number(g.segment || 1) - 1;
    var a = map[segIndex];
    var b = map[segIndex + 1] || (closed() ? map[0] : null);
    if (!a || !b) return;
    var pt = svgPoint(evt, dragSvg);
    var t = project(pt.x, pt.y, a, b);
    var len = Number(segLens()[segIndex] || 0);
    var width = Number(g.widthFt || 0);
    var centerFt = t * len;
    var startFt = centerFt - width / 2;
    startFt = Math.max(0, Math.min(Math.max(0, len - width), startFt));
    g.startFt = Math.round((startFt + Number.EPSILON) * 100) / 100;
    g.positionPct = Math.round(((g.startFt / Math.max(0.01, len)) * 100 + Number.EPSILON) * 100) / 100;
    if (!renderLock) {
      renderLock = true;
      window.requestAnimationFrame(function () {
        renderLock = false;
        renderMap();
      });
    }
  }
  function endDrag() {
    if (dragIndex < 0) return;
    dragIndex = -1;
    dragSvg = null;
    document.removeEventListener("pointermove", moveDrag);
    document.removeEventListener("pointerup", endDrag);
    if (typeof calculateQuote === "function") calculateQuote();
    refreshGateSelect();
    renderMap();
  }
  function refreshGateSelect() {
    var sel = document.getElementById("v28GateSelect");
    if (!sel) return;
    sel.innerHTML = "";
    if (!gates().length) {
      var opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No gates added yet";
      sel.appendChild(opt);
      return;
    }
    gates().forEach(function (g, i) {
      ensureStart(g);
      var opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = "G" + (i + 1) + " - Seg " + g.segment + " - " + g.startFt + "' - " + (g.widthFt || "") + "' - " + swingFull(g.swing);
      sel.appendChild(opt);
    });
  }
  function selectedGateIndex() {
    var sel = document.getElementById("v28GateSelect");
    if (sel && sel.value !== "") return Number(sel.value);
    return gates().length ? 0 : -1;
  }
  function loadSelectedGate() {
    var idx = selectedGateIndex();
    if (idx < 0) return;
    var g = gates()[idx];
    if (!g) return;
    var swing = document.getElementById("v28Swing");
    var seg = document.getElementById("v28GateSegment");
    var start = document.getElementById("v28GateStartFt");
    var width = document.getElementById("v28GateWidthFt");
    var type = document.getElementById("v28GateType");
    ensureStart(g);
    if (swing) swing.value = g.swing || "outswing_left";
    if (seg) seg.value = g.segment || 1;
    if (start) start.value = g.startFt || 0;
    if (width) width.value = g.widthFt || 4;
    if (type) type.value = g.gateType || "single";
  }
  function applySelectedGate() {
    var idx = selectedGateIndex();
    if (idx < 0) {
      alert("Add a gate first.");
      return;
    }
    var g = gates()[idx];
    if (!g) return;
    g.segment = Number((document.getElementById("v28GateSegment") || {}).value || g.segment || 1);
    g.startFt = Number((document.getElementById("v28GateStartFt") || {}).value || g.startFt || 0);
    g.widthFt = Number((document.getElementById("v28GateWidthFt") || {}).value || g.widthFt || 4);
    g.gateType = (document.getElementById("v28GateType") || {}).value || g.gateType || "single";
    g.swing = (document.getElementById("v28Swing") || {}).value || g.swing || "outswing_left";
    ensureStart(g);
    if (typeof calculateQuote === "function") calculateQuote();
    refreshGateSelect();
    renderMap();
  }
  function findGateItem(type) {
    var items = inventory();
    for (var i = 0; i < items.length; i++) {
      var text = String((items[i].ItemID || "") + " " + (items[i].Description || "")).toUpperCase();
      if (text.indexOf("GATE") >= 0) {
        if (type === "double") {
          if (text.indexOf("DOUBLE") >= 0 || text.indexOf("DRIVE") >= 0 || text.indexOf("DRIVEWAY") >= 0) return items[i];
        } else {
          return items[i];
        }
      }
    }
    return null;
  }
  function addGate() {
    var type = (document.getElementById("v28GateType") || {}).value || "single";
    var seg = Number((document.getElementById("v28GateSegment") || {}).value || 1);
    var start = Number((document.getElementById("v28GateStartFt") || {}).value || 0);
    var width = Number((document.getElementById("v28GateWidthFt") || {}).value || (type === "double" ? 10 : 4));
    var swing = (document.getElementById("v28Swing") || {}).value || "outswing_left";
    var item = findGateItem(type);
    var g = {
      segment: seg,
      startFt: start,
      widthFt: width,
      gateType: type,
      swing: swing,
      itemId: item ? item.ItemID : (type === "double" ? "DOUBLE-GATE" : "GATE"),
      description: item ? item.Description : (type === "double" ? "Double Driveway Gate" : "Walk Gate"),
      unitPrice: item ? Number(item.Retail || 0) : 0,
      item: item || null
    };
    ensureStart(g);
    gates().push(g);
    if (typeof calculateQuote === "function") calculateQuote();
    refreshGateSelect();
    renderMap();
  }
  function deleteGate() {
    var idx = selectedGateIndex();
    if (idx < 0) return;
    gates().splice(idx, 1);
    if (typeof calculateQuote === "function") calculateQuote();
    refreshGateSelect();
    renderMap();
  }
  function ensureGateLinesInQuote(q) {
    if (!q || !Array.isArray(q.lineItems)) return q;
    gates().forEach(function (g, i) {
      ensureStart(g);
      var code = g.itemId || ("GATE-" + (i + 1));
      var exists = false;
      for (var j = 0; j < q.lineItems.length; j++) {
        if (String(q.lineItems[j].code || "") === String(code)) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        var price = gatePrice(g);
        q.lineItems.push({
          code: code,
          item: (g.description || code) + " - " + swingFull(g.swing),
          qty: 1,
          unit: "EA",
          unitPrice: price,
          total: price,
          source: "Layout Gate"
        });
      }
    });
    var total = 0;
    q.lineItems.forEach(function (line) {
      total += Number(line.total || 0);
    });
    if (!q.pricing) q.pricing = {};
    q.pricing.grandTotal = Math.round((total + Number.EPSILON) * 100) / 100;
    return q;
  }
  function getQuote() {
    if (typeof calculateQuote === "function" && !window.v28Calculating) {
      calculateQuote();
    }
    try {
      if (typeof latestQuote !== "undefined" && latestQuote) return ensureGateLinesInQuote(latestQuote);
    } catch (e) {}
    return null;
  }
  function quantitySummary(q) {
    var lengths = segLens();
    var totalLf = 0;
    var sections = 0;
    var linePosts = 0;
    for (var i = 0; i < lengths.length; i++) {
      totalLf += Number(lengths[i] || 0);
      var runs = runsForSegment(i + 1);
      runs.forEach(function (run) {
        if (run.type === "fence") {
          var sw = sectionWidth();
          var count = Math.ceil(Number(run.length || 0) / sw);
          sections += count;
          linePosts += Math.max(0, count - 1);
        }
      });
    }
    var counts = {};
    try { counts = q.layout.counts || {}; } catch (e) {}
    var cornerPosts = counts.cornerPosts == null ? Math.max(0, lengths.length - 1) : counts.cornerPosts;
    var endPosts = counts.endPosts == null ? 2 : counts.endPosts;
    var totalPosts = counts.totalPosts == null ? linePosts + cornerPosts + endPosts : counts.totalPosts;
    return [
      ["Total Linear Feet", totalLf],
      ["Fence Sections / Panels", sections],
      ["Line Posts", linePosts],
      ["Corner Posts", cornerPosts],
      ["End Posts", endPosts],
      ["Total Posts", totalPosts],
      ["Post Caps", totalPosts],
      ["Gates / Doors", gates().length]
    ];
  }
  function buildCustomerHtml(showButtons) {
    var q = getQuote();
    if (!q) return "<html><body><h2>No quote calculated yet</h2></body></html>";
    var showTotals = showLineTotalColumn();
    var qtyRows = quantitySummary(q).map(function (r) {
      return "<tr><td>" + esc(r[0]) + "</td><td class='right'>" + esc(r[1]) + "</td></tr>";
    }).join("");
    var headers = "<th>Description</th><th class='right'>Qty</th>";
    if (showTotals) headers += "<th class='right'>Line Total</th>";
    var lineRows = (q.lineItems || []).map(function (line) {
      var row = "<tr><td>" + esc(line.item || "") + "</td><td class='right'>" + esc(line.qty || "") + " " + esc(line.unit || "") + "</td>";
      if (showTotals) row += "<td class='right'>" + displayLineTotal(line.total || 0) + "</td>";
      row += "</tr>";
      return row;
    }).join("");
    var gateRows = gates().map(function (g, i) {
      ensureStart(g);
      return "<tr><td>G" + (i + 1) + "</td><td>" + esc(g.gateType === "double" ? "Double Driveway" : "Walk Gate") + "</td><td>" + esc(g.segment) + "</td><td>" + esc(g.startFt) + "'</td><td>" + esc(Number(g.startFt || 0) + Number(g.widthFt || 0)) + "'</td><td>" + esc(g.widthFt) + "'</td><td>" + esc(swingFull(g.swing)) + "</td></tr>";
    }).join("");
    if (!gateRows) gateRows = "<tr><td colspan='7'>No gates selected.</td></tr>";
    var buttons = showButtons ? "<div class='preview-actions'><button onclick='window.print()'>Print Quote</button><button onclick='window.close()'>Close Preview</button></div>" : "";
    return ""
      + "<html><head><title>Customer Quote</title><style>"
      + "@page{size:letter portrait;margin:.22in;}body{margin:0;background:" + (showButtons ? "#e5e7eb" : "#fff") + ";font-family:Arial,sans-serif;color:#111827;font-size:10.5px;}"
      + ".preview-actions{position:sticky;top:0;background:#111827;padding:9px;display:flex;gap:9px;z-index:20}.preview-actions button{background:#047857;color:#fff;border:0;border-radius:8px;padding:9px 13px;font-weight:800;cursor:pointer}"
      + ".page{background:#fff;width:8in;min-height:10.25in;margin:" + (showButtons ? "14px auto" : "0") + ";padding:.07in;box-shadow:" + (showButtons ? "0 2px 16px rgba(0,0,0,.18)" : "none") + "}"
      + ".title{font-size:19px;font-weight:900;margin-bottom:4px}.top{display:grid;grid-template-columns:.72fr 1.5fr;gap:7px;align-items:start}.box{border:1px solid #cbd5e1;border-radius:7px;padding:5px;break-inside:avoid}"
      + ".drawing svg{width:100%;height:auto;max-height:3.95in;display:block}table{width:100%;border-collapse:collapse;margin-top:4px}th,td{border:1px solid #d1d5db;padding:3px 4px;font-size:9.2px;vertical-align:top}th{background:#f3f4f6;text-align:left;font-weight:800}.right{text-align:right}.section{margin-top:5px}.total{font-size:17px;font-weight:900;text-align:right;margin-top:4px}@media print{body{background:#fff}.preview-actions{display:none}.page{margin:0;box-shadow:none;width:auto;min-height:auto;padding:0}}"
      + "</style></head><body>" + buttons
      + "<div class='page'><div class='title'>Fence Quote</div><div class='top'>"
      + "<div class='box'><div><strong>Customer:</strong> " + esc(q.customerName || "") + "</div><div><strong>Address:</strong> " + esc(q.jobAddress || "") + "</div><div><strong>Quote Type:</strong> " + esc(q.scope || "") + "</div><div><strong>Section Width:</strong> " + sectionWidth() + "'</div><div class='total'>Grand Total: $" + money(q.pricing && q.pricing.grandTotal || 0) + "</div><table><thead><tr><th>Quantity Summary</th><th class='right'>Qty</th></tr></thead><tbody>" + qtyRows + "</tbody></table></div>"
      + "<div class='box drawing'><strong>Gate Swing / Map</strong>" + buildMapSvg() + "</div></div>"
      + "<div class='section box'><strong>Gate / Door Details</strong><table><thead><tr><th>Gate</th><th>Type</th><th>Seg</th><th>Start</th><th>End</th><th>Width</th><th>Swing</th></tr></thead><tbody>" + gateRows + "</tbody></table></div>"
      + "<div class='section box'><strong>Quote Lines</strong><table><thead><tr>" + headers + "</tr></thead><tbody>" + lineRows + "</tbody></table></div>"
      + "</div></body></html>";
  }
  function previewCustomer() {
    var w = window.open("", "_blank");
    if (!w) {
      alert("Popup blocked. Allow popups for this app.");
      return;
    }
    w.document.open();
    w.document.write(buildCustomerHtml(true));
    w.document.close();
    w.focus();
  }
  function printCustomer() {
    var w = window.open("", "_blank");
    if (!w) {
      alert("Popup blocked. Allow popups for this app.");
      return;
    }
    w.document.open();
    w.document.write(buildCustomerHtml(false));
    w.document.close();
    w.focus();
    setTimeout(function () { w.print(); }, 500);
  }
  function hideDuplicates() {
    var keep = {
      v28UnifiedGatePanel: true
    };
    var boxes = document.querySelectorAll(".select-line");
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      if (keep[box.id]) continue;
      var text = String(box.textContent || "").toLowerCase();
      if (
        text.indexOf("fixed customer quote preview") >= 0 ||
        text.indexOf("customer quote preview") >= 0 ||
        text.indexOf("preview / print quote") >= 0 ||
        text.indexOf("move gate") >= 0 ||
        text.indexOf("drag gate") >= 0 ||
        text.indexOf("gate map") >= 0 ||
        text.indexOf("gate swing") >= 0 ||
        text.indexOf("add gate on drawing") >= 0
      ) {
        box.style.display = "none";
      }
    }
  }
  function installPanel() {
    var systemTab = document.getElementById("tab-system") || document.getElementById("tab-quick");
    if (!systemTab || document.getElementById("v28UnifiedGatePanel")) return;
    var panel = document.createElement("div");
    panel.id = "v28UnifiedGatePanel";
    panel.className = "select-line";
    panel.innerHTML = ''
      + '<h3>Gate / Map / Customer Print</h3>'
      + '<p class="small">One place to add gates, drag gates, change swing, and print the customer quote.</p>'
      + '<div class="row"><div><label>Gate Type</label><select id="v28GateType"><option value="single">Single Walk Gate</option><option value="double">Double Driveway Gate</option></select></div><div><label>Segment #</label><input id="v28GateSegment" type="number" min="1" step="1" value="1"></div></div>'
      + '<div class="row"><div><label>Gate Start Ft</label><input id="v28GateStartFt" type="number" min="0" step="0.5" value="2"></div><div><label>Gate Width Ft</label><input id="v28GateWidthFt" type="number" min="1" step="0.5" value="4"></div></div>'
      + '<div class="row"><div><label>Section Width Ft</label><input id="v28SectionWidth" type="number" min="1" step="0.5" value="' + sectionWidth() + '"></div><div><label>Swing Direction</label><select id="v28Swing"><option value="outswing_left">Outswing Left</option><option value="outswing_right">Outswing Right</option><option value="inswing_left">Inswing Left</option><option value="inswing_right">Inswing Right</option></select></div></div>'
      + '<div class="actions"><button class="green" onclick="v28AddGate()">Add Gate</button><button class="blue" onclick="v28ApplySelectedGate()">Update Selected Gate</button><button class="red" onclick="v28DeleteGate()">Delete Gate</button></div>'
      + '<label>Select Existing Gate</label><select id="v28GateSelect" onchange="v28LoadSelectedGate()"></select>'
      + '<div class="row"><div><label>Customer Line Totals</label><select id="v28CustomerTotalsMode"><option value="grand_only" selected>Hide item totals - grand total only</option><option value="mask">Mask item totals - show ***last digits</option><option value="show">Show item totals</option></select></div><div><label>Customer Unit Prices</label><select id="v28CustomerUnitPrices"><option value="hide" selected>Always hide unit prices</option></select></div></div>'
      + '<div class="actions"><button class="blue" onclick="v28PreviewCustomer()">Preview Customer Quote</button><button class="green" onclick="v28PrintCustomer()">Print Customer Quote</button><button class="gray" onclick="v28RenderMap()">Refresh Map</button></div>'
      + '<div id="v28CleanGateMap" style="margin-top:10px;border:1px solid #d1d5db;border-radius:10px;background:#fff;padding:8px;overflow:auto;"></div>';
    systemTab.insertBefore(panel, systemTab.firstChild);
  }
  function patchGlobals() {
    window.v28AddGate = addGate;
    window.v28DeleteGate = deleteGate;
    window.v28ApplySelectedGate = applySelectedGate;
    window.v28LoadSelectedGate = loadSelectedGate;
    window.v28PreviewCustomer = previewCustomer;
    window.v28PrintCustomer = printCustomer;
    window.v28RenderMap = renderMap;
    window.v28BuildMapSvg = buildMapSvg;
    window.v27RenderMap = renderMap;
    window.v26RenderMap = renderMap;
    window.v25RenderInlineMap = renderMap;
    window.v24PreviewCustomerQuote = previewCustomer;
    window.v24PrintCustomerQuoteDirect = printCustomer;
    window.v20PreviewCustomerQuote = previewCustomer;
    window.v20PrintCustomerQuoteDirect = printCustomer;
    window.v19PreviewCustomerQuote = previewCustomer;
    window.v19PrintCustomerQuoteDirect = printCustomer;
    window.v27BuildGateLineMapSvg = buildMapSvg;
    window.v26BuildGateLineSvg = buildMapSvg;
    window.v25BuildCustomerClearMapSvg = buildMapSvg;
    window.v24BuildCleanCustomerMapSvg = buildMapSvg;
    window.v23BuildCleanMapSvg = buildMapSvg;
    window.v22BuildDraggableSvg = buildMapSvg;
    window.v21BuildBetterMapSvg = buildMapSvg;
    window.v20BuildMapSvg = buildMapSvg;
    window.v19BuildMapSvg = buildMapSvg;
    if (!window.v28OriginalCalculateQuote && typeof calculateQuote === "function") {
      window.v28OriginalCalculateQuote = calculateQuote;
      window.calculateQuote = function () {
        if (window.v28Calculating) return;
        window.v28Calculating = true;
        try {
          window.v28OriginalCalculateQuote();
          try {
            if (typeof latestQuote !== "undefined" && latestQuote) ensureGateLinesInQuote(latestQuote);
          } catch (e) {}
        } finally {
          window.v28Calculating = false;
        }
      };
    }
  }
  function init() {
    installPanel();
    patchGlobals();
    hideDuplicates();
    gates().forEach(ensureStart);
    refreshGateSelect();
    if (typeof calculateQuote === "function") calculateQuote();
    renderMap();
    setTimeout(function () {
      hideDuplicates();
      refreshGateSelect();
      renderMap();
    }, 1000);
  }
  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(init, 1800);
  });
})();