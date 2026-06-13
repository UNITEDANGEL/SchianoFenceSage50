/*
Version 11 Inventory-Based Wholesale Pricing

Rules:
- Do not use fixed $110 / $130 values.
- Retail = actual Sage inventory Retail price.
- Wholesale = Retail x 0.85.
- Auto mode:
  - Qty 1 = retail
  - Qty 2+ = wholesale
- Force Retail = actual inventory retail
- Force Wholesale = actual inventory retail x 0.85
- Custom price still wins when entered.
*/

const V11_WHOLESALE_FACTOR = 0.85;

function v11RoundMoney(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function v11Retail(item) {
  return v11RoundMoney(Number(item?.Retail || 0));
}

function v11Wholesale(item) {
  return v11RoundMoney(v11Retail(item) * V11_WHOLESALE_FACTOR);
}

function v11GetPricingRule() {
  return document.getElementById("v7DefaultPriceRule")?.value ||
         document.getElementById("v6SectionPriceMode")?.value ||
         "auto";
}

function v11InstallInventoryPricingNote() {
  const pricingTab = document.getElementById("tab-pricing");
  if (!pricingTab || document.getElementById("v11InventoryPricingNote")) return;

  const box = document.createElement("div");
  box.id = "v11InventoryPricingNote";
  box.className = "select-line";
  box.innerHTML = `
    <h3>Inventory-Based Wholesale Pricing</h3>
    <p class="small">The app now uses actual Sage inventory retail prices. Wholesale is calculated as 15% below retail.</p>

    <div class="notice">
      Retail = Sage inventory retail price.<br>
      Wholesale = Retail x 0.85.<br>
      Auto = Qty 1 uses retail, Qty 2+ uses wholesale.
    </div>
  `;

  pricingTab.prepend(box);
}

function v11PatchOldFixedSectionInputs() {
  const retailInput = document.getElementById("v6SectionRetailPrice");
  const wholesaleInput = document.getElementById("v6SectionWholesalePrice");
  const customInput = document.getElementById("v6CustomSectionPrice");

  if (retailInput) {
    retailInput.value = "";
    retailInput.placeholder = "uses inventory retail";
    retailInput.disabled = true;
    retailInput.title = "Retail comes from actual Sage inventory price.";
  }

  if (wholesaleInput) {
    wholesaleInput.value = "";
    wholesaleInput.placeholder = "inventory retail x 0.85";
    wholesaleInput.disabled = true;
    wholesaleInput.title = "Wholesale is calculated as 15% below inventory retail.";
  }

  if (customInput) {
    customInput.placeholder = "optional override";
  }

  const mode = document.getElementById("v6SectionPriceMode");
  if (mode) {
    [...mode.options].forEach(opt => {
      if (opt.value === "retail") opt.textContent = "Force retail inventory price";
      if (opt.value === "wholesale") opt.textContent = "Force wholesale: inventory retail x 0.85";
      if (opt.value === "auto") opt.textContent = "Auto: 1 retail, quantity wholesale";
      if (opt.value === "custom") opt.textContent = "Use custom section price";
      if (opt.value === "inventory") opt.textContent = "Use inventory retail price";
    });
  }

  const rule = document.getElementById("v7DefaultPriceRule");
  if (rule) {
    [...rule.options].forEach(opt => {
      if (opt.value === "retail") opt.textContent = "Force Retail - inventory price";
      if (opt.value === "wholesale") opt.textContent = "Force Wholesale - retail x 0.85";
      if (opt.value === "auto") opt.textContent = "Auto: 1 item retail, quantity wholesale";
      if (opt.value === "custom") opt.textContent = "Use custom prices where entered";
    });
  }
}

function v11PriceForItem(item, qty, customPrice) {
  if (customPrice !== undefined && customPrice !== null && String(customPrice).trim() !== "") {
    return v11RoundMoney(Number(customPrice));
  }

  const rule = v11GetPricingRule();
  const retail = v11Retail(item);
  const wholesale = v11Wholesale(item);
  const quantity = Number(qty || 0);

  if (rule === "retail" || rule === "inventory") return retail;
  if (rule === "wholesale") return wholesale;
  if (rule === "custom") return retail;

  return quantity >= 2 ? wholesale : retail;
}

function v11PatchPricingFunctions() {
  window.v11PriceForItem = v11PriceForItem;

  window.v6SectionUnitPrice = function(sectionItem, qty) {
    const custom = document.getElementById("v6CustomSectionPrice")?.value || "";
    const sectionMode = document.getElementById("v6SectionPriceMode")?.value || "auto";

    if (sectionMode === "custom" && custom !== "") {
      return v11RoundMoney(Number(custom));
    }

    if (sectionMode === "retail" || sectionMode === "inventory") {
      return v11Retail(sectionItem);
    }

    if (sectionMode === "wholesale") {
      return v11Wholesale(sectionItem);
    }

    return Number(qty || 0) >= 2 ? v11Wholesale(sectionItem) : v11Retail(sectionItem);
  };

  window.v5GetPrice = function(item, customPrice) {
    return v11PriceForItem(item, 1, customPrice);
  };

  window.makeLine = function(item, qty, unit, fallbackCode, fallbackDescription, unitPriceOverride) {
    const code = item ? item.ItemID : fallbackCode;
    const desc = item ? item.Description : fallbackDescription;
    const price = item ? v11PriceForItem(item, qty, unitPriceOverride) : Number(unitPriceOverride || 0);

    return {
      code,
      item: desc,
      qty: v11RoundMoney(qty),
      unit,
      unitPrice: v11RoundMoney(price),
      total: v11RoundMoney(Number(qty || 0) * price),
      source: item ? "Sage Inventory / " + v11GetPricingRule() + " / wholesale=retail*0.85" : "Manual/Fallback"
    };
  };
}

function v11PatchInventorySearchPrices() {
  if (!window.v11OriginalSearchInventory && typeof window.searchInventory === "function") {
    window.v11OriginalSearchInventory = window.searchInventory;
  }

  window.searchInventory = function() {
    const tbody = document.getElementById("inventoryResults");
    if (!tbody) return;

    const q = (document.getElementById("inventorySearch")?.value || "").toLowerCase().trim();
    const cat = document.getElementById("inventoryCategory")?.value || "";
    const limit = Number(document.getElementById("inventoryLimit")?.value || 40);

    tbody.innerHTML = "";

    const results = inventoryItems.filter(item => {
      const text = (item.ItemID + " " + item.Description + " " + item.Category + " " + item.Style + " " + item.Material).toLowerCase();
      if (cat && item.Category !== cat) return false;
      if (q && !text.includes(q)) return false;
      return true;
    }).slice(0, limit);

    results.forEach(item => {
      const retail = v11Retail(item);
      const wholesale = v11Wholesale(item);

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
          Retail: $${retail.toFixed(2)}<br>
          Wholesale: $${wholesale.toFixed(2)}<br>
          <span class="small">Wholesale = Retail x 0.85</span>
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
      status.textContent = "Showing " + results.length + " of " + inventoryItems.length + " items. Retail from inventory, wholesale = retail x 0.85.";
    }

    if (typeof v5FixInventoryHeader === "function") {
      v5FixInventoryHeader();
    }
  };
}

function v11PatchBulkAddPricing() {
  window.v5AddCheckedInventoryItems = function() {
    const checks = Array.from(document.querySelectorAll(".v5InventoryCheck")).filter(cb => cb.checked);

    if (!checks.length) {
      alert("Check one or more inventory items first.");
      return;
    }

    checks.forEach(cb => {
      const itemId = cb.dataset.itemid;
      const item = inventoryItems.find(x => x.ItemID === itemId);
      if (!item) return;

      const qtyInput = document.querySelector('.v5Qty[data-itemid="' + CSS.escape(itemId) + '"]');
      const priceInput = document.querySelector('.v5CustomPrice[data-itemid="' + CSS.escape(itemId) + '"]');

      const qty = Number(qtyInput?.value || 1);
      const customPrice = priceInput?.value || "";
      const price = v11PriceForItem(item, qty, customPrice);

      addons.push({
        code: item.ItemID,
        item: item.Description,
        qty,
        unit: "EA",
        unitPrice: v11RoundMoney(price),
        total: v11RoundMoney(qty * price),
        source: customPrice !== "" ? "Custom Price" : "Sage Inventory / " + v11GetPricingRule() + " / wholesale=retail*0.85"
      });
    });

    if (typeof renderAddons === "function") renderAddons();
    alert("Added " + checks.length + " item(s) using inventory retail / wholesale rules.");
  };
}

document.addEventListener("DOMContentLoaded", function() {
  setTimeout(function() {
    v11InstallInventoryPricingNote();
    v11PatchOldFixedSectionInputs();
    v11PatchPricingFunctions();
    v11PatchInventorySearchPrices();
    v11PatchBulkAddPricing();

    if (typeof searchInventory === "function") searchInventory();
    if (typeof calculateQuote === "function") calculateQuote();
  }, 3100);
});
