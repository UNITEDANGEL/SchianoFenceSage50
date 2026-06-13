/*
Version 15 Payment + Element-Level Inventory Overrides

Adds:
- Cash / Credit Card payment method
- Credit card fee = 3.5%
- Element-level inventory item overrides
- Override color/category/quantity/item for individual material lines
- Descriptions come from actual inventory item descriptions
*/

let v15ElementOverrides = [];

function v15InstallPaymentControls() {
  const quick = document.getElementById("tab-quick");
  const pricing = document.getElementById("tab-pricing");

  const html = `
    <div id="v15PaymentPanel" class="select-line">
      <h3>Payment Method</h3>
      <p class="small">Cash/check has no fee. Credit card adds 3.5%.</p>

      <div class="row">
        <div>
          <label>Payment Type</label>
          <select id="v15PaymentMethod" onchange="calculateQuote()">
            <option value="cash" selected>Cash / Check</option>
            <option value="credit_card">Credit Card + 3.5%</option>
          </select>
        </div>
        <div>
          <label>Credit Card Fee %</label>
          <input id="v15CardFeePct" type="number" min="0" step="0.1" value="3.5" onchange="calculateQuote()">
        </div>
      </div>
    </div>
  `;

  if (quick && !document.getElementById("v15PaymentPanel")) {
    quick.insertAdjacentHTML("beforeend", html);
  } else if (pricing && !document.getElementById("v15PaymentPanel")) {
    pricing.insertAdjacentHTML("afterbegin", html);
  }
}

function v15InstallElementOverridePanel() {
  const quick = document.getElementById("tab-quick");
  if (!quick || document.getElementById("v15OverridePanel")) return;

  const panel = document.createElement("div");
  panel.id = "v15OverridePanel";
  panel.className = "select-line";
  panel.innerHTML = `
    <h3>Element-Level Material Overrides</h3>
    <p class="small">
      Use this when one post, one section, one clamp, one cap, or one gate is a different color/item.
      The quote line uses the actual Sage inventory description and price.
    </p>

    <div class="row">
      <div>
        <label>Element Category</label>
        <select id="v15OverrideCategory" onchange="v15RefreshOverrideItems()">
          <option value="Section">Section</option>
          <option value="Line Post">Line Post</option>
          <option value="Corner Post">Corner Post</option>
          <option value="End Post">End Post</option>
          <option value="Cap">Cap</option>
          <option value="Gate">Gate</option>
          <option value="Bracket">Bracket</option>
          <option value="Hinge">Hinge</option>
          <option value="Latch">Latch</option>
          <option value="Other">Other / Hardware / Clamp</option>
        </select>
      </div>
      <div>
        <label>Element Color</label>
        <select id="v15OverrideColor" onchange="v15RefreshOverrideItems()">
          <option value="">Use Any / Inventory Search</option>
          <option value="White">White</option>
          <option value="Almond">Almond</option>
          <option value="Adobe">Adobe</option>
          <option value="Gray">Gray</option>
          <option value="Black">Black</option>
          <option value="Green">Green</option>
        </select>
      </div>
    </div>

    <label>Search Description / Item ID</label>
    <input id="v15OverrideSearch" placeholder="Example: clamp, PC55T, black, almond, latch" oninput="v15RefreshOverrideItems()">

    <label>Matching Inventory Item</label>
    <select id="v15OverrideItem"></select>

    <div class="row">
      <div>
        <label>Quantity</label>
        <input id="v15OverrideQty" type="number" min="0" step="0.01" value="1">
      </div>
      <div>
        <label>Custom Unit Price</label>
        <input id="v15OverrideCustomPrice" type="number" min="0" step="0.01" placeholder="blank = pricing rule">
      </div>
    </div>

    <label>Override Note</label>
    <input id="v15OverrideNote" placeholder="Example: one black post at driveway side">

    <div class="actions">
      <button class="blue" onclick="v15RefreshOverrideItems()">Refresh Items</button>
      <button class="green" onclick="v15AddElementOverride()">Add Override Line</button>
    </div>

    <div id="v15OverrideStatus" class="notice" style="margin-top:10px;">Pick category/color/search to find matching inventory items.</div>

    <h3>Added Element Overrides</h3>
    <div id="v15OverrideList"></div>
  `;

  quick.appendChild(panel);
}

function v15InventoryText(item) {
  return String([
    item.ItemID,
    item.Description,
    item.Category,
    item.Material,
    item.Style,
    item.Color,
    item.HeightFt,
    item.WidthFt
  ].join(" ")).toLowerCase();
}

function v15RefreshOverrideItems() {
  const sel = document.getElementById("v15OverrideItem");
  const status = document.getElementById("v15OverrideStatus");
  if (!sel || !Array.isArray(inventoryItems)) return;

  const category = document.getElementById("v15OverrideCategory")?.value || "";
  const color = document.getElementById("v15OverrideColor")?.value || "";
  const q = (document.getElementById("v15OverrideSearch")?.value || "").toLowerCase().trim();

  let results = inventoryItems.filter(item => {
    const text = v15InventoryText(item);

    if (category && category !== "Other" && item.Category !== category) return false;
    if (color && item.Color && item.Color !== color) return false;
    if (q && !text.includes(q)) return false;

    if (category === "Other") {
      if (["Section", "Line Post", "Corner Post", "End Post", "Cap", "Gate"].includes(item.Category)) return false;
    }

    return true;
  });

  results = results.sort((a, b) => {
    let sa = 0;
    let sb = 0;

    if (color && a.Color === color) sa += 10;
    if (color && b.Color === color) sb += 10;

    if (category && a.Category === category) sa += 10;
    if (category && b.Category === category) sb += 10;

    return sb - sa;
  }).slice(0, 150);

  sel.innerHTML = "";

  if (!results.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No matching inventory item found";
    sel.appendChild(opt);

    if (status) {
      status.className = "warn";
      status.textContent = "No match. Try clearing color or searching by item description/code.";
    }
    return;
  }

  results.forEach(item => {
    const retail = Number(item.Retail || 0);
    const wholesale = typeof v11Wholesale === "function" ? v11Wholesale(item) : retail * 0.85;

    const opt = document.createElement("option");
    opt.value = item.ItemID;
    opt.dataset.item = JSON.stringify(item);
    opt.textContent = item.ItemID + " - " + item.Description + " | " + (item.Color || "no color") + " | Retail $" + retail.toFixed(2) + " | Wholesale $" + wholesale.toFixed(2);
    sel.appendChild(opt);
  });

  if (status) {
    status.className = "good";
    status.textContent = "Found " + results.length + " matching item(s). Descriptions and prices come from inventory.";
  }
}

function v15SelectedOverrideItem() {
  const sel = document.getElementById("v15OverrideItem");
  if (!sel || !sel.value) return null;

  const opt = sel.options[sel.selectedIndex];
  if (opt && opt.dataset.item) return JSON.parse(opt.dataset.item);

  return inventoryItems.find(x => x.ItemID === sel.value) || null;
}

function v15PriceForItem(item, qty, custom) {
  if (typeof v11PriceForItem === "function") return v11PriceForItem(item, qty, custom);
  if (custom !== undefined && custom !== null && String(custom).trim() !== "") return Number(custom);
  return Number(item?.Retail || 0);
}

function v15AddElementOverride() {
  const item = v15SelectedOverrideItem();
  if (!item) {
    alert("Pick an inventory item first.");
    return;
  }

  const qty = Number(document.getElementById("v15OverrideQty")?.value || 1);
  const custom = document.getElementById("v15OverrideCustomPrice")?.value || "";
  const note = document.getElementById("v15OverrideNote")?.value || "";
  const price = v15PriceForItem(item, qty, custom);

  v15ElementOverrides.push({
    code: item.ItemID,
    item: item.Description,
    category: item.Category || document.getElementById("v15OverrideCategory")?.value || "",
    color: item.Color || document.getElementById("v15OverrideColor")?.value || "",
    qty,
    unit: "EA",
    unitPrice: Math.round((price + Number.EPSILON) * 100) / 100,
    total: Math.round((qty * price + Number.EPSILON) * 100) / 100,
    note,
    source: custom !== "" ? "Element Override / Custom Price" : "Element Override / Inventory Price"
  });

  v15RenderOverrideList();
  if (typeof calculateQuote === "function") calculateQuote();
}

function v15RemoveElementOverride(i) {
  v15ElementOverrides.splice(i, 1);
  v15RenderOverrideList();
  if (typeof calculateQuote === "function") calculateQuote();
}

function v15RenderOverrideList() {
  const holder = document.getElementById("v15OverrideList");
  if (!holder) return;

  holder.innerHTML = "";

  if (!v15ElementOverrides.length) {
    holder.innerHTML = '<div class="small">No element overrides added yet.</div>';
    return;
  }

  v15ElementOverrides.forEach((x, i) => {
    const div = document.createElement("div");
    div.className = "select-line";
    div.innerHTML = `
      <div><strong>${v15Esc(x.code)}</strong> - ${v15Esc(x.item)}</div>
      <div class="small">
        Category: ${v15Esc(x.category)} | Color: ${v15Esc(x.color)} | Qty: ${x.qty} | Total: $${v15Money(x.total)}
        ${x.note ? "<br>Note: " + v15Esc(x.note) : ""}
      </div>
      <button class="red" onclick="v15RemoveElementOverride(${i})">Remove</button>
    `;
    holder.appendChild(div);
  });
}

function v15PatchCalculateQuote() {
  if (window.v15OriginalCalculateQuote) return;

  window.v15OriginalCalculateQuote = window.calculateQuote;

  window.calculateQuote = function() {
    window.v15OriginalCalculateQuote();

    if (!latestQuote || !latestQuote.lineItems) return;

    v15ElementOverrides.forEach(x => {
      latestQuote.lineItems.push({
        code: x.code,
        item: x.item + (x.note ? " - " + x.note : ""),
        qty: x.qty,
        unit: x.unit,
        unitPrice: x.unitPrice,
        total: x.total,
        source: x.source + (x.color ? " / " + x.color : "")
      });
    });

    const method = document.getElementById("v15PaymentMethod")?.value || "cash";
    const feePct = Number(document.getElementById("v15CardFeePct")?.value || 3.5);

    let subtotal = latestQuote.lineItems.reduce((sum, line) => sum + Number(line.total || 0), 0);

    if (method === "credit_card" && subtotal > 0) {
      const fee = Math.round((subtotal * feePct / 100 + Number.EPSILON) * 100) / 100;

      latestQuote.lineItems.push({
        code: "CC-FEE",
        item: "Credit Card Processing Fee " + feePct + "%",
        qty: 1,
        unit: "EA",
        unitPrice: fee,
        total: fee,
        source: "Payment Method"
      });

      subtotal += fee;
    }

    latestQuote.paymentMethod = method === "credit_card" ? "Credit Card" : "Cash / Check";
    latestQuote.creditCardFeePct = method === "credit_card" ? feePct : 0;
    latestQuote.elementOverrides = v15ElementOverrides;

    latestQuote.pricing.grandTotal = Math.round((subtotal + Number.EPSILON) * 100) / 100;

    if (typeof v9LaborIncluded === "function" && !v9LaborIncluded()) {
      latestQuote.pricing.depositDue = 0;
    }

    if (typeof renderQuote === "function") renderQuote();
  };
}

function v15PatchPrintPaymentInfo() {
  if (window.v15OriginalPrintCustomerQuote || typeof window.v12PrintCustomerQuote !== "function") return;

  window.v15OriginalPrintCustomerQuote = window.v12PrintCustomerQuote;

  window.v12PrintCustomerQuote = function() {
    if (typeof calculateQuote === "function") calculateQuote();
    window.v15OriginalPrintCustomerQuote();
  };
}

function v15Esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

function v15Money(n) {
  return Number(n || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

document.addEventListener("DOMContentLoaded", function() {
  setTimeout(function() {
    v15InstallPaymentControls();
    v15InstallElementOverridePanel();
    v15PatchCalculateQuote();
    v15PatchPrintPaymentInfo();
    v15RefreshOverrideItems();
    v15RenderOverrideList();

    if (typeof calculateQuote === "function") calculateQuote();
  }, 4800);
});
