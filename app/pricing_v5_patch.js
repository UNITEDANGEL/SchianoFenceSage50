/*
Version 5 Pricing Patch
Adds:
- Retail / Wholesale-Cost / Cost-plus-markup / Custom multiplier pricing
- Custom unit price per selected inventory item
- Bulk/multiple inventory selection
- Add selected inventory items to quote add-ons
- Core section/post/cap/concrete pricing now follows selected price mode
*/

let v5PriceMode = "retail";

function v5Money(n) {
  return Number(n || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function v5Num(n) {
  const x = Number(n || 0);
  return isNaN(x) ? 0 : x;
}

function v5Round(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function v5GetPrice(item, customPrice) {
  if (customPrice !== undefined && customPrice !== null && String(customPrice).trim() !== "") {
    return v5Round(Number(customPrice));
  }

  if (!item) return 0;

  const retail = v5Num(item.Retail);
  const cost = v5Num(item.Cost);

  const mode = document.getElementById("v5PriceMode")?.value || "retail";
  const costMarkupPct = v5Num(document.getElementById("v5CostMarkupPct")?.value || 0);
  const multiplier = v5Num(document.getElementById("v5CustomMultiplier")?.value || 1);

  if (mode === "retail") return v5Round(retail);
  if (mode === "wholesale") return v5Round(cost);
  if (mode === "cost_plus") return v5Round(cost * (1 + costMarkupPct / 100));
  if (mode === "custom_multiplier") return v5Round(retail * multiplier);

  return v5Round(retail);
}

function v5InstallPricingControls() {
  if (document.getElementById("v5PriceMode")) return;

  const pricingTab = document.getElementById("tab-pricing");
  if (pricingTab) {
    const box = document.createElement("div");
    box.className = "select-line";
    box.innerHTML = `
      <h3>Price Source</h3>
      <p class="small">Choose how the app prices Sage inventory items. Retail uses RETAIL 1. Wholesale uses Last Unit Cost. Cost-plus adds markup to cost. Custom multiplier multiplies retail.</p>

      <div class="row">
        <div>
          <label>Inventory Price Mode</label>
          <select id="v5PriceMode">
            <option value="retail" selected>Retail Price / RETAIL 1</option>
            <option value="wholesale">Wholesale / Last Unit Cost</option>
            <option value="cost_plus">Wholesale Cost + Markup %</option>
            <option value="custom_multiplier">Retail x Custom Multiplier</option>
          </select>
        </div>
        <div>
          <label>Cost Markup %</label>
          <input id="v5CostMarkupPct" type="number" min="0" step="0.1" value="35">
        </div>
      </div>

      <div class="row">
        <div>
          <label>Custom Retail Multiplier</label>
          <input id="v5CustomMultiplier" type="number" min="0" step="0.01" value="1">
        </div>
        <div>
          <label>Default Bulk Item Qty</label>
          <input id="v5DefaultBulkQty" type="number" min="0" step="0.01" value="1">
        </div>
      </div>

      <div class="notice" style="margin-top:10px;">
        Custom price still wins when you type a price on a selected line.
      </div>
    `;
    pricingTab.prepend(box);
  }

  const inventoryTab = document.getElementById("tab-inventory");
  if (inventoryTab && !document.getElementById("v5BulkAddButton")) {
    const box = document.createElement("div");
    box.className = "select-line";
    box.innerHTML = `
      <h3>Bulk Add Inventory Items</h3>
      <p class="small">Check multiple inventory rows, enter quantities/custom prices if needed, then add them to the quote.</p>

      <div class="actions">
        <button id="v5BulkAddButton" class="green" onclick="v5AddCheckedInventoryItems()">Add Checked Items</button>
        <button class="gray" onclick="v5CheckVisibleInventory(false)">Clear Checks</button>
      </div>
    `;
    const status = document.getElementById("inventoryStatus");
    if (status) status.after(box);
  }
}

function makeLine(item, qty, unit, fallbackCode, fallbackDescription, unitPriceOverride) {
  const code = item ? item.ItemID : fallbackCode;
  const desc = item ? item.Description : fallbackDescription;
  const price = item ? v5GetPrice(item, unitPriceOverride) : v5Num(unitPriceOverride || 0);

  return {
    code,
    item: desc,
    qty: v5Round(qty),
    unit,
    unitPrice: v5Round(price),
    total: v5Round(qty * price),
    source: item ? "Sage Inventory / " + (document.getElementById("v5PriceMode")?.value || "retail") : "Manual/Fallback"
  };
}

function addGate() {
  const item = selectedItem("newGateItem");
  if (!item) {
    alert("Pick a gate item first.");
    return;
  }

  const qty = v5Num(document.getElementById("newGateQty")?.value || 1);
  const override = document.getElementById("newGatePriceOverride")?.value || "";
  const price = v5GetPrice(item, override);

  gates.push({
    code: item.ItemID,
    item: item.Description,
    qty,
    unit: "EA",
    unitPrice: price,
    total: v5Round(qty * price),
    source: "Sage Inventory / " + (document.getElementById("v5PriceMode")?.value || "retail")
  });

  renderGates();
}

function addAddon() {
  const item = selectedItem("addonInventoryItem");
  if (!item) {
    alert("Pick an inventory item first.");
    return;
  }

  const qty = v5Num(document.getElementById("addonQty")?.value || 1);
  const unit = document.getElementById("addonUnit")?.value || "EA";
  const override = document.getElementById("addonPriceOverride")?.value || "";
  const price = v5GetPrice(item, override);

  addons.push({
    code: item.ItemID,
    item: item.Description,
    qty,
    unit,
    unitPrice: price,
    total: v5Round(qty * price),
    source: "Sage Inventory / " + (document.getElementById("v5PriceMode")?.value || "retail")
  });

  renderAddons();
}

function searchInventory() {
  const tbody = document.getElementById("inventoryResults");
  if (!tbody) return;

  const q = (document.getElementById("inventorySearch")?.value || "").toLowerCase().trim();
  const cat = document.getElementById("inventoryCategory")?.value || "";
  const limit = v5Num(document.getElementById("inventoryLimit")?.value || 40);

  tbody.innerHTML = "";

  const results = inventoryItems.filter(item => {
    const text = (item.ItemID + " " + item.Description + " " + item.Category + " " + item.Style + " " + item.Material).toLowerCase();
    if (cat && item.Category !== cat) return false;
    if (q && !text.includes(q)) return false;
    return true;
  }).slice(0, limit);

  results.forEach((item, idx) => {
    const retail = v5Num(item.Retail);
    const cost = v5Num(item.Cost);
    const selectedPrice = v5GetPrice(item, "");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <input type="checkbox" class="v5InventoryCheck" data-itemid="${escapeHtml(item.ItemID)}">
      </td>
      <td>
        <strong>${escapeHtml(item.ItemID)}</strong><br>
        <span class="small">${escapeHtml(item.Category || "")}</span>
      </td>
      <td>${escapeHtml(item.Description)}</td>
      <td>
        Retail: $${v5Money(retail)}<br>
        Cost: $${v5Money(cost)}<br>
        Selected: <strong>$${v5Money(selectedPrice)}</strong>
      </td>
      <td>
        <input class="v5Qty" data-itemid="${escapeHtml(item.ItemID)}" type="number" min="0" step="0.01" value="${document.getElementById("v5DefaultBulkQty")?.value || 1}">
      </td>
      <td>
        <input class="v5CustomPrice" data-itemid="${escapeHtml(item.ItemID)}" type="number" min="0" step="0.01" placeholder="custom">
      </td>
    `;
    tbody.appendChild(tr);
  });

  const status = document.getElementById("inventoryStatus");
  if (status) {
    status.textContent = "Showing " + results.length + " of " + inventoryItems.length + " items. Check multiple rows to bulk add.";
  }

  v5FixInventoryHeader();
}

function v5FixInventoryHeader() {
  const table = document.querySelector("#inventoryResults")?.closest("table");
  if (!table) return;

  const thead = table.querySelector("thead tr");
  if (!thead) return;

  if (!thead.dataset.v5) {
    thead.innerHTML = `
      <th>Pick</th>
      <th>Item ID</th>
      <th>Description</th>
      <th>Prices</th>
      <th>Qty</th>
      <th>Custom Price</th>
    `;
    thead.dataset.v5 = "1";
  }
}

function v5CheckVisibleInventory(checked) {
  document.querySelectorAll(".v5InventoryCheck").forEach(cb => cb.checked = checked);
}

function v5AddCheckedInventoryItems() {
  const checks = Array.from(document.querySelectorAll(".v5InventoryCheck")).filter(cb => cb.checked);

  if (!checks.length) {
    alert("Check one or more inventory items first.");
    return;
  }

  checks.forEach(cb => {
    const itemId = cb.dataset.itemid;
    const item = inventoryItems.find(x => x.ItemID === itemId);
    if (!item) return;

    const qtyInput = document.querySelector('.v5Qty[data-itemid="' + cssEscape(itemId) + '"]');
    const priceInput = document.querySelector('.v5CustomPrice[data-itemid="' + cssEscape(itemId) + '"]');

    const qty = v5Num(qtyInput?.value || 1);
    const customPrice = priceInput?.value || "";
    const price = v5GetPrice(item, customPrice);

    addons.push({
      code: item.ItemID,
      item: item.Description,
      qty,
      unit: "EA",
      unitPrice: price,
      total: v5Round(qty * price),
      source: customPrice !== "" ? "Custom Price" : "Sage Inventory / " + (document.getElementById("v5PriceMode")?.value || "retail")
    });
  });

  renderAddons();
  alert("Added " + checks.length + " item(s) to Add-ons / quote lines.");
}

function cssEscape(s) {
  if (window.CSS && CSS.escape) return CSS.escape(s);
  return String(s).replace(/"/g, '\\"');
}

function renderAddons() {
  const holder = document.getElementById("addonList");
  if (!holder) return;

  holder.innerHTML = "";
  addons.forEach((a, i) => {
    const div = document.createElement("div");
    div.className = "addon-row";
    div.innerHTML = `
      <label>${a.qty} ${escapeHtml(a.unit || "EA")}</label>
      <div class="small">
        <strong>${escapeHtml(a.code)}</strong> - ${escapeHtml(a.item)}<br>
        Price: $${v5Money(a.unitPrice)} | Total: $${v5Money(a.total)} | ${escapeHtml(a.source || "")}
      </div>
      <button class="red" onclick="removeAddon(${i})">Remove</button>
    `;
    holder.appendChild(div);
  });
}

function renderGates() {
  const holder = document.getElementById("gateList");
  if (!holder) return;

  holder.innerHTML = "";
  gates.forEach((g, i) => {
    const div = document.createElement("div");
    div.className = "gate-row";
    div.innerHTML = `
      <label>${g.qty}x</label>
      <div class="small">
        <strong>${escapeHtml(g.code)}</strong> - ${escapeHtml(g.item)}<br>
        Price: $${v5Money(g.unitPrice)} | Total: $${v5Money(g.total)} | ${escapeHtml(g.source || "")}
      </div>
      <button class="red" onclick="removeGate(${i})">Remove</button>
    `;
    holder.appendChild(div);
  });
}

function v5PatchExportMetadata() {
  const oldExport = window.exportSageCsv;
  window.exportSageCsv = function() {
    if (!latestQuote) calculateQuote();

    const taxable = document.getElementById("taxableFlag")?.value || "Y";
    const priceMode = document.getElementById("v5PriceMode")?.value || "retail";

    const rows = [];
    rows.push([
      "QuoteNumber",
      "QuoteDate",
      "CustomerID",
      "CustomerName",
      "ShipToAddress",
      "ItemID",
      "Description",
      "Quantity",
      "Unit",
      "UnitPrice",
      "LineTotal",
      "Taxable",
      "PriceMode",
      "JobName",
      "Notes"
    ]);

    latestQuote.lineItems.forEach(item => {
      rows.push([
        latestQuote.quoteNumber,
        latestQuote.quoteDate,
        latestQuote.customerId,
        latestQuote.customerName,
        latestQuote.jobAddress,
        item.code,
        item.item,
        item.qty,
        item.unit,
        item.unitPrice,
        item.total,
        taxable,
        priceMode,
        latestQuote.jobAddress,
        latestQuote.notes
      ]);
    });

    downloadText(toCsv(rows), latestQuote.quoteNumber + "_sage_quote.csv", "text/csv");
  };
}

document.addEventListener("DOMContentLoaded", function() {
  setTimeout(function() {
    v5InstallPricingControls();
    v5PatchExportMetadata();
    if (typeof searchInventory === "function") searchInventory();
  }, 800);
});
