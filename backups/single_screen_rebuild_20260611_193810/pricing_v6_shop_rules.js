/*
Version 6 Shop Pricing Rules
- Retail section price: $130
- Wholesale section price: $110
- Wholesale applies at quantity threshold
- PVC post auto-match uses 5x5 posts only
*/

const V6_SHOP_RULES = {
  retailSectionPrice: 130,
  wholesaleSectionPrice: 110,
  wholesaleQtyThreshold: 2,
  use5x5PostsOnly: true
};

function v6InstallShopPricingControls() {
  const pricingTab = document.getElementById("tab-pricing");
  if (!pricingTab || document.getElementById("v6SectionRetailPrice")) return;

  const box = document.createElement("div");
  box.className = "select-line";
  box.innerHTML = `
    <h3>Shop Section Pricing</h3>
    <p class="small">Retail is for one section/small purchase. Wholesale is for quantity purchases.</p>

    <div class="row3">
      <div>
        <label>Retail Section Price</label>
        <input id="v6SectionRetailPrice" type="number" min="0" step="0.01" value="130">
      </div>
      <div>
        <label>Wholesale Section Price</label>
        <input id="v6SectionWholesalePrice" type="number" min="0" step="0.01" value="110">
      </div>
      <div>
        <label>Wholesale Qty Starts At</label>
        <input id="v6WholesaleQtyThreshold" type="number" min="1" step="1" value="2">
      </div>
    </div>

    <label>Section Price Mode</label>
    <select id="v6SectionPriceMode">
      <option value="auto" selected>Auto: retail for 1, wholesale for quantity</option>
      <option value="retail">Force retail section price</option>
      <option value="wholesale">Force wholesale section price</option>
      <option value="inventory">Use inventory price</option>
      <option value="custom">Use custom section price</option>
    </select>

    <label>Custom Section Price</label>
    <input id="v6CustomSectionPrice" type="number" min="0" step="0.01" placeholder="only used in custom mode">

    <div class="notice" style="margin-top:10px;">
      Current rule: one section = $130 retail. Quantity sections = $110 wholesale unless you override it.
    </div>
  `;

  pricingTab.prepend(box);
}

function v6SectionUnitPrice(sectionItem, qty) {
  const retail = Number(document.getElementById("v6SectionRetailPrice")?.value || 130);
  const wholesale = Number(document.getElementById("v6SectionWholesalePrice")?.value || 110);
  const threshold = Number(document.getElementById("v6WholesaleQtyThreshold")?.value || 2);
  const mode = document.getElementById("v6SectionPriceMode")?.value || "auto";
  const custom = document.getElementById("v6CustomSectionPrice")?.value || "";

  if (mode === "retail") return retail;
  if (mode === "wholesale") return wholesale;
  if (mode === "custom" && custom !== "") return Number(custom);
  if (mode === "inventory") {
    if (typeof v5GetPrice === "function") return v5GetPrice(sectionItem, "");
    return Number(sectionItem?.Retail || 0);
  }

  return Number(qty || 0) >= threshold ? wholesale : retail;
}

function v6IsAllowed5x5Post(item) {
  if (!item) return false;

  const id = String(item.ItemID || "").toUpperCase();
  const desc = String(item.Description || "").toUpperCase();
  const text = id + " " + desc;

  if (id.startsWith("5LP") || id.startsWith("5CP") || id.startsWith("5EP") || id.startsWith("5BP")) return true;
  if (text.includes("5 X 5") || text.includes("5X5")) return true;

  return false;
}

function v6FenceHeightNumber() {
  return Number(document.getElementById("systemHeight")?.value || 0);
}

function v6PostHeightScore(item) {
  const id = String(item.ItemID || "").toUpperCase();
  const desc = String(item.Description || "").toUpperCase();
  const text = id + " " + desc;
  const fenceHeight = v6FenceHeightNumber();

  let score = 0;

  if (!v6IsAllowed5x5Post(item)) score -= 1000;

  if (fenceHeight <= 4.5) {
    if (id.includes("78") || text.includes("7 8") || text.includes("7-8") || text.includes("7'8")) score += 100;
    if (id.endsWith("8") || text.includes("8")) score += 30;
    if (id.endsWith("9") || text.includes("9")) score -= 20;
  } else {
    if (id.endsWith("9") || text.includes("9")) score += 100;
    if (id.endsWith("8") || text.includes("8")) score += 20;
    if (id.includes("78")) score -= 30;
  }

  return score;
}

function v6PatchFindItemsFor5x5Posts() {
  if (window.v6OriginalFindItems) return;
  window.v6OriginalFindItems = window.findItems;

  window.findItems = function(filter) {
    let results = window.v6OriginalFindItems(filter);

    if (filter && ["Line Post", "Corner Post", "End Post", "Blank Post"].includes(filter.category)) {
      const material = document.getElementById("systemMaterial")?.value || "";
      if (material === "PVC/Vinyl" || material === "") {
        results = results
          .filter(v6IsAllowed5x5Post)
          .sort((a, b) => v6PostHeightScore(b) - v6PostHeightScore(a));
      }
    }

    return results;
  };
}

function v6PatchCalculateQuoteForSectionPricing() {
  if (window.v6OriginalMakeLine) return;
  window.v6OriginalMakeLine = window.makeLine;

  window.makeLine = function(item, qty, unit, fallbackCode, fallbackDescription, unitPriceOverride) {
    let isSection = false;

    if (item) {
      const cat = String(item.Category || "").toLowerCase();
      const desc = String(item.Description || "").toLowerCase();
      isSection = cat === "section" || desc.includes("section") || desc.includes(" sec") || desc.includes("panel");
    }

    if (isSection) {
      const unitPrice = v6SectionUnitPrice(item, qty);
      return {
        code: item.ItemID,
        item: item.Description,
        qty: Math.round((Number(qty || 0) + Number.EPSILON) * 100) / 100,
        unit,
        unitPrice,
        total: Math.round((Number(qty || 0) * unitPrice + Number.EPSILON) * 100) / 100,
        source: "Shop Section Pricing / " + (document.getElementById("v6SectionPriceMode")?.value || "auto")
      };
    }

    return window.v6OriginalMakeLine(item, qty, unit, fallbackCode, fallbackDescription, unitPriceOverride);
  };
}

function v6ShowShopRuleBadge() {
  const holder = document.getElementById("systemWarnings");
  if (!holder || document.getElementById("v6ShopRuleNote")) return;

  const note = document.createElement("div");
  note.id = "v6ShopRuleNote";
  note.className = "notice";
  note.style.marginTop = "10px";
  note.innerHTML = `
    <strong>Shop Rules Active:</strong><br>
    Sections: $130 retail for one section, $110 wholesale for quantity.<br>
    PVC posts: auto-selection limited to 5x5 post codes only, such as 5LP / 5CP / 5EP families.
  `;
  holder.after(note);
}

document.addEventListener("DOMContentLoaded", function() {
  setTimeout(function() {
    v6InstallShopPricingControls();
    v6PatchFindItemsFor5x5Posts();
    v6PatchCalculateQuoteForSectionPricing();
    v6ShowShopRuleBadge();

    if (typeof refreshSystemOptions === "function") refreshSystemOptions();
    if (typeof calculateQuote === "function") calculateQuote();
  }, 1200);
});
