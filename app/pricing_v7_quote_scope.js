/*
Version 7 Quote Scope Patch

Adds:
- Materials + Labor
- Materials Only
- Labor Only
- Retail / Wholesale / Auto pricing control
- Default rule: one section/item = retail
- Quantity/bulk = wholesale unless overridden
*/

function v7InstallQuoteScopeControls() {
  const pricingTab = document.getElementById("tab-pricing");
  if (!pricingTab || document.getElementById("v7QuoteScope")) return;

  const box = document.createElement("div");
  box.className = "select-line";
  box.innerHTML = `
    <h3>Quote Scope</h3>
    <p class="small">Choose what the customer is buying: full install, materials only, or labor only.</p>

    <label>Quote Type</label>
    <select id="v7QuoteScope">
      <option value="materials_labor" selected>Materials + Labor</option>
      <option value="materials_only">Materials Only</option>
      <option value="labor_only">Labor Only</option>
    </select>

    <label>Default Price Rule</label>
    <select id="v7DefaultPriceRule">
      <option value="auto" selected>Auto: 1 item = retail, quantity = wholesale</option>
      <option value="retail">Force Retail</option>
      <option value="wholesale">Force Wholesale</option>
      <option value="custom">Use Custom Prices Where Entered</option>
    </select>

    <div class="notice" style="margin-top:10px;">
      Default rule active: one section/item uses retail. Quantity/bulk uses wholesale unless overridden.
    </div>
  `;

  pricingTab.prepend(box);
}

function v7IsLaborLine(line) {
  const code = String(line.code || "").toUpperCase();
  const desc = String(line.item || "").toUpperCase();
  const source = String(line.source || "").toUpperCase();

  return (
    code.includes("LABOR") ||
    desc.includes("LABOR") ||
    desc.includes("INSTALL") ||
    source.includes("LABOR")
  );
}

function v7IsMaterialLine(line) {
  return !v7IsLaborLine(line);
}

function v7PatchCalculateQuoteScope() {
  if (window.v7OriginalCalculateQuote) return;

  window.v7OriginalCalculateQuote = window.calculateQuote;

  window.calculateQuote = function() {
    window.v7OriginalCalculateQuote();

    if (!latestQuote || !latestQuote.lineItems) return;

    const scope = document.getElementById("v7QuoteScope")?.value || "materials_labor";

    if (scope === "materials_only") {
      latestQuote.lineItems = latestQuote.lineItems.filter(v7IsMaterialLine);
      latestQuote.scope = "Materials Only";
    }

    if (scope === "labor_only") {
      latestQuote.lineItems = latestQuote.lineItems.filter(v7IsLaborLine);
      latestQuote.scope = "Labor Only";
    }

    if (scope === "materials_labor") {
      latestQuote.scope = "Materials + Labor";
    }

    const grandTotal = latestQuote.lineItems.reduce((sum, x) => sum + Number(x.total || 0), 0);
    const depositPct = Number(document.getElementById("depositPct")?.value || 0);
    latestQuote.pricing.grandTotal = Math.round((grandTotal + Number.EPSILON) * 100) / 100;
    latestQuote.pricing.depositDue = Math.round((grandTotal * depositPct / 100 + Number.EPSILON) * 100) / 100;

    v7RenderQuoteScopeBadge();
    renderQuote();
  };
}

function v7PatchSectionPricingRule() {
  if (window.v7OriginalSectionUnitPrice || typeof v6SectionUnitPrice !== "function") return;

  window.v7OriginalSectionUnitPrice = window.v6SectionUnitPrice;

  window.v6SectionUnitPrice = function(sectionItem, qty) {
    const rule = document.getElementById("v7DefaultPriceRule")?.value || "auto";

    const retail = Number(document.getElementById("v6SectionRetailPrice")?.value || 130);
    const wholesale = Number(document.getElementById("v6SectionWholesalePrice")?.value || 110);
    const threshold = Number(document.getElementById("v6WholesaleQtyThreshold")?.value || 2);

    if (rule === "retail") return retail;
    if (rule === "wholesale") return wholesale;

    if (rule === "custom") {
      const custom = document.getElementById("v6CustomSectionPrice")?.value || "";
      if (custom !== "") return Number(custom);
    }

    return Number(qty || 0) >= threshold ? wholesale : retail;
  };
}

function v7RenderQuoteScopeBadge() {
  const holder = document.getElementById("quoteBadges");
  if (!holder || !latestQuote) return;

  const scope = latestQuote.scope || "Materials + Labor";
  const rule = document.getElementById("v7DefaultPriceRule")?.value || "auto";

  if (!document.getElementById("v7ScopeBadge")) {
    const span = document.createElement("span");
    span.id = "v7ScopeBadge";
    span.className = "pill dark";
    holder.prepend(span);
  }

  document.getElementById("v7ScopeBadge").textContent = scope + " / " + rule;
}

function v7PatchSageCsvScope() {
  if (window.v7OriginalExportSageCsv) return;

  window.v7OriginalExportSageCsv = window.exportSageCsv;

  window.exportSageCsv = function() {
    if (!latestQuote) calculateQuote();

    const taxable = document.getElementById("taxableFlag")?.value || "Y";
    const priceMode = document.getElementById("v7DefaultPriceRule")?.value || document.getElementById("v5PriceMode")?.value || "auto";
    const scope = latestQuote.scope || document.getElementById("v7QuoteScope")?.value || "Materials + Labor";

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
      "QuoteScope",
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
        scope,
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
    v7InstallQuoteScopeControls();
    v7PatchSectionPricingRule();
    v7PatchCalculateQuoteScope();
    v7PatchSageCsvScope();

    if (typeof calculateQuote === "function") calculateQuote();
  }, 1600);
});
