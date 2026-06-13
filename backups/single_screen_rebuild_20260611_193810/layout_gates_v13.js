/*
Version 13 Layout Gates + Element Color

Adds:
- Place gates on drawing segments
- Gate has segment number, position, width, color, style, inventory item
- Gate item matching uses selected material/style/color/height
- Gate appears visually on drawing
- Gate is added to quote lines from layout placement
*/

let v13LayoutGates = [];
let v13GateMode = false;

function v13InstallGateDrawingControls() {
  const gateTab = document.getElementById("tab-gates");
  if (!gateTab || document.getElementById("v13GateDrawingPanel")) return;

  const panel = document.createElement("div");
  panel.id = "v13GateDrawingPanel";
  panel.className = "select-line";
  panel.innerHTML = `
    <h3>Drawing Gate Placement</h3>
    <p class="small">Add gates directly to a fence segment. Gate color and style should match the selected fence system unless overridden.</p>

    <div class="row">
      <div>
        <label>Gate Segment #</label>
        <input id="v13GateSegment" type="number" min="1" step="1" value="1">
      </div>
      <div>
        <label>Gate Position on Segment %</label>
        <input id="v13GatePositionPct" type="number" min="0" max="100" step="1" value="50">
      </div>
    </div>

    <div class="row">
      <div>
        <label>Gate Width Ft</label>
        <input id="v13GateWidthFt" type="number" min="1" step="0.5" value="4">
      </div>
      <div>
        <label>Gate Color</label>
        <select id="v13GateColor" onchange="v13RefreshGateItems()">
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

    <label>Matching Gate Item</label>
    <select id="v13GateItem"></select>

    <div class="actions">
      <button class="blue" onclick="v13RefreshGateItems()">Refresh Gate Items</button>
      <button class="green" onclick="v13AddGateToDrawing()">Add Gate to Drawing</button>
    </div>

    <div id="v13GateStatus" class="notice" style="margin-top:10px;">
      Gates added here will show on the drawing and export as real Sage gate item codes.
    </div>

    <h3>Layout Gates</h3>
    <div id="v13LayoutGateList"></div>
  `;

  gateTab.prepend(panel);
}

function v13GateColor() {
  return document.getElementById("v13GateColor")?.value ||
         document.getElementById("systemColor")?.value ||
         "";
}

function v13CurrentMaterial() {
  return document.getElementById("systemMaterial")?.value || "";
}

function v13CurrentStyle() {
  return document.getElementById("systemStyle")?.value || "";
}

function v13CurrentHeight() {
  return document.getElementById("systemHeight")?.value || "";
}

function v13GateWidth() {
  return Number(document.getElementById("v13GateWidthFt")?.value || 0);
}

function v13GateScore(item) {
  const material = v13CurrentMaterial();
  const style = v13CurrentStyle();
  const color = v13GateColor();
  const height = v13CurrentHeight();
  const width = v13GateWidth();

  let score = 0;
  const text = (item.ItemID + " " + item.Description).toUpperCase();

  if (item.Category === "Gate") score += 50;
  if (material && item.Material === material) score += 10;
  if (style && item.Style === style) score += 15;
  if (color && item.Color === color) score += 20;
  if (height && String(item.HeightFt) === String(height)) score += 10;

  if (width) {
    if (String(item.WidthFt) === String(width)) score += 15;
    if (text.includes(String(width) + "X") || text.includes("X" + String(width))) score += 5;
  }

  if (text.includes("GATE")) score += 10;
  if (text.includes("WALK")) score += 4;
  if (text.includes("DRIVE")) score += 2;

  return score;
}

function v13FindGateItems() {
  if (!Array.isArray(inventoryItems)) return [];

  const color = v13GateColor();
  const style = v13CurrentStyle();
  const material = v13CurrentMaterial();

  return inventoryItems
    .filter(item => {
      if (item.Category !== "Gate") return false;

      if (color && item.Color && item.Color !== color) return false;
      if (style && item.Style && item.Style !== style) return false;
      if (material && item.Material && item.Material !== material) return false;

      return true;
    })
    .sort((a, b) => v13GateScore(b) - v13GateScore(a));
}

function v13RefreshGateItems() {
  const sel = document.getElementById("v13GateItem");
  const status = document.getElementById("v13GateStatus");
  if (!sel) return;

  const items = v13FindGateItems();

  sel.innerHTML = "";

  if (!items.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No matching gate item found";
    sel.appendChild(opt);

    if (status) {
      status.className = "warn";
      status.textContent = "No matching gate found. Try changing gate color, style, height, or search inventory manually.";
    }
    return;
  }

  items.slice(0, 100).forEach(item => {
    const opt = document.createElement("option");
    opt.value = item.ItemID;
    opt.dataset.item = JSON.stringify(item);
    opt.textContent = item.ItemID + " - " + item.Description + " | Retail $" + Number(item.Retail || 0).toFixed(2);
    sel.appendChild(opt);
  });

  if (status) {
    status.className = "good";
    status.textContent = "Found " + items.length + " matching gate item(s) for " + (v13CurrentStyle() || "selected style") + " / " + (v13GateColor() || "selected color") + ".";
  }
}

function v13SelectedGateItem() {
  const sel = document.getElementById("v13GateItem");
  if (!sel || !sel.value) return null;

  const opt = sel.options[sel.selectedIndex];
  if (opt && opt.dataset.item) return JSON.parse(opt.dataset.item);

  return inventoryItems.find(x => x.ItemID === sel.value) || null;
}

function v13AddGateToDrawing() {
  const item = v13SelectedGateItem();

  if (!item) {
    alert("Pick a matching gate item first.");
    return;
  }

  const seg = Number(document.getElementById("v13GateSegment")?.value || 1);
  const pos = Number(document.getElementById("v13GatePositionPct")?.value || 50);
  const width = Number(document.getElementById("v13GateWidthFt")?.value || 4);
  const color = v13GateColor();

  const maxSeg = Math.max(1, segmentLengths.length);
  if (seg < 1 || seg > maxSeg) {
    alert("Gate segment must be between 1 and " + maxSeg + ".");
    return;
  }

  v13LayoutGates.push({
    segment: seg,
    positionPct: pos,
    widthFt: width,
    color,
    itemId: item.ItemID,
    description: item.Description,
    unitPrice: v13GateUnitPrice(item, 1),
    item
  });

  v13RenderGateList();
  if (typeof draw === "function") draw();
  if (typeof calculateQuote === "function") calculateQuote();
}

function v13GateUnitPrice(item, qty) {
  if (typeof v11PriceForItem === "function") return v11PriceForItem(item, qty, "");
  if (typeof v5GetPrice === "function") return v5GetPrice(item, "");
  return Number(item?.Retail || 0);
}

function v13RemoveGate(index) {
  v13LayoutGates.splice(index, 1);
  v13RenderGateList();
  if (typeof draw === "function") draw();
  if (typeof calculateQuote === "function") calculateQuote();
}

function v13RenderGateList() {
  const holder = document.getElementById("v13LayoutGateList");
  if (!holder) return;

  holder.innerHTML = "";

  if (!v13LayoutGates.length) {
    holder.innerHTML = '<div class="small">No layout gates added yet.</div>';
    return;
  }

  v13LayoutGates.forEach((g, i) => {
    const div = document.createElement("div");
    div.className = "select-line";
    div.innerHTML = `
      <div><strong>${v13Esc(g.itemId)}</strong> - ${v13Esc(g.description)}</div>
      <div class="small">
        Segment ${g.segment}, ${g.positionPct}% position, ${g.widthFt} ft wide, color ${v13Esc(g.color || "")}
      </div>
      <button class="red" onclick="v13RemoveGate(${i})">Remove Gate</button>
    `;
    holder.appendChild(div);
  });
}

function v13PatchDrawForGates() {
  if (window.v13OriginalDraw) return;

  window.v13OriginalDraw = window.draw;

  window.draw = function() {
    window.v13OriginalDraw();
    v13DrawGates();
  };
}

function v13DrawGates() {
  if (!Array.isArray(v13LayoutGates) || !v13LayoutGates.length) return;
  if (!Array.isArray(points) || points.length < 2) return;

  ctx.save();

  v13LayoutGates.forEach(g => {
    const idx = Number(g.segment || 1) - 1;
    const a = points[idx];
    const b = points[idx + 1] || (document.getElementById("layoutClosed")?.value === "closed" ? points[0] : null);
    if (!a || !b) return;

    const pct = Math.min(100, Math.max(0, Number(g.positionPct || 50))) / 100;
    const x = a.x + (b.x - a.x) * pct;
    const y = a.y + (b.y - a.y) * pct;

    ctx.fillStyle = "#f97316";
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.rect(x - 18, y - 18, 36, 36);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "white";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("G", x, y);

    ctx.fillStyle = "#111827";
    ctx.font = "12px Arial";
    ctx.fillText((g.widthFt || "") + " ft", x, y + 32);
  });

  ctx.restore();
}

function v13PatchQuoteForLayoutGates() {
  if (window.v13OriginalCalculateQuote) return;

  window.v13OriginalCalculateQuote = window.calculateQuote;

  window.calculateQuote = function() {
    window.v13OriginalCalculateQuote();

    if (!latestQuote || !latestQuote.lineItems) return;

    v13LayoutGates.forEach(g => {
      const item = g.item || inventoryItems.find(x => x.ItemID === g.itemId);
      const unitPrice = v13GateUnitPrice(item, 1);

      latestQuote.lineItems.push({
        code: g.itemId,
        item: g.description,
        qty: 1,
        unit: "EA",
        unitPrice: unitPrice,
        total: unitPrice,
        source: "Layout Gate / " + (g.color || "selected color")
      });
    });

    const grandTotal = latestQuote.lineItems.reduce((sum, x) => sum + Number(x.total || 0), 0);
    latestQuote.pricing.grandTotal = Math.round((grandTotal + Number.EPSILON) * 100) / 100;

    if (typeof v9LaborIncluded === "function" && !v9LaborIncluded()) {
      latestQuote.pricing.depositDue = 0;
    }

    latestQuote.layoutGates = v13LayoutGates;

    if (typeof renderQuote === "function") renderQuote();
  };
}

function v13PatchSystemColorChange() {
  ["systemMaterial", "systemStyle", "systemColor", "systemHeight"].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.dataset.v13) {
      el.dataset.v13 = "1";
      el.addEventListener("change", function() {
        v13RefreshGateItems();
        if (typeof refreshSystemOptions === "function") refreshSystemOptions();
        if (typeof calculateQuote === "function") calculateQuote();
      });
    }
  });
}

function v13Esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

document.addEventListener("DOMContentLoaded", function() {
  setTimeout(function() {
    v13InstallGateDrawingControls();
    v13PatchDrawForGates();
    v13PatchQuoteForLayoutGates();
    v13PatchSystemColorChange();
    v13RefreshGateItems();
    v13RenderGateList();

    if (typeof draw === "function") draw();
  }, 3800);
});
