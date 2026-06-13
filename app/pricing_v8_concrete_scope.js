/*
Version 8 Concrete + Scope Rules

Rules:
- Quote scope should be selectable in Fence System.
- Materials + Labor = include materials, labor, and concrete bags.
- Materials Only = include fence materials only, no labor and no concrete bags.
- Labor Only = include labor and install supplies, including concrete.
- Concrete quantity = 1 bag per post.
- Concrete picker should prefer actual concrete bag item, not abrasive wheels.
*/

function v8InstallScopeInFenceSystem() {
  const systemTab = document.getElementById("tab-system");
  if (!systemTab || document.getElementById("v8QuoteScopeSystem")) return;

  const box = document.createElement("div");
  box.className = "select-line";
  box.innerHTML = `
    <h3>Quote Scope</h3>
    <p class="small">Choose whether this quote includes materials, labor, or both. Concrete bags are install supplies and only appear when labor is included.</p>

    <label>Quote Type</label>
    <select id="v8QuoteScopeSystem" onchange="v8SyncScope(); calculateQuote();">
      <option value="materials_labor" selected>Materials + Labor</option>
      <option value="materials_only">Materials Only</option>
      <option value="labor_only">Labor Only</option>
    </select>

    <div class="notice" style="margin-top:10px;">
      Concrete rule: 1 concrete bag per post, included only with labor/install quotes. No concrete bags on materials-only quotes.
    </div>
  `;

  systemTab.prepend(box);
}

function v8SyncScope() {
  const systemScope = document.getElementById("v8QuoteScopeSystem")?.value;
  const pricingScope = document.getElementById("v7QuoteScope");

  if (systemScope && pricingScope) {
    pricingScope.value = systemScope;
  }
}

function v8GetScope() {
  return document.getElementById("v8QuoteScopeSystem")?.value ||
         document.getElementById("v7QuoteScope")?.value ||
         "materials_labor";
}

function v8IsConcreteBagItem(item) {
  if (!item) return false;

  const id = String(item.ItemID || "").toUpperCase();
  const desc = String(item.Description || "").toUpperCase();
  const text = id + " " + desc;

  if (text.includes("ABRASIVE")) return false;
  if (text.includes("CUTTING WHEEL")) return false;
  if (text.includes("WHEEL")) return false;
  if (text.includes("BLADE")) return false;
  if (text.includes("DISC")) return false;

  if (id === "CONCRETE") return true;
  if (text.includes("CONCRETE") && text.includes("BAG")) return true;
  if (text.includes("CRETE") && text.includes("BAG")) return true;
  if (text.includes("80LB") || text.includes("80 LB")) return true;

  return false;
}

function v8PatchConcretePicker() {
  if (window.v8OriginalFindItems) return;

  window.v8OriginalFindItems = window.findItems;

  window.findItems = function(filter) {
    let results = window.v8OriginalFindItems(filter);

    if (filter && filter.category === "Concrete") {
      const bagItems = results.filter(v8IsConcreteBagItem);
      if (bagItems.length) {
        results = bagItems;
      }

      results = results.sort((a, b) => {
        const aid = String(a.ItemID || "").toUpperCase();
        const bid = String(b.ItemID || "").toUpperCase();

        if (aid === "CONCRETE") return -1;
        if (bid === "CONCRETE") return 1;

        return String(a.Description || "").localeCompare(String(b.Description || ""));
      });
    }

    return results;
  };
}

function v8IsConcreteLine(line) {
  const code = String(line.code || "").toUpperCase();
  const desc = String(line.item || "").toUpperCase();

  return code === "CONCRETE" ||
         (desc.includes("CONCRETE") && desc.includes("BAG")) ||
         (desc.includes("CRETE") && desc.includes("BAG")) ||
         desc.includes("80LB") ||
         desc.includes("80 LB");
}

function v8IsLaborLine(line) {
  const code = String(line.code || "").toUpperCase();
  const desc = String(line.item || "").toUpperCase();
  const source = String(line.source || "").toUpperCase();

  return code.includes("LABOR") ||
         desc.includes("LABOR") ||
         desc.includes("INSTALL") ||
         source.includes("LABOR");
}

function v8PatchConcreteAndScope() {
  if (window.v8OriginalCalculateQuote) return;

  window.v8OriginalCalculateQuote = window.calculateQuote;

  window.calculateQuote = function() {
    v8SyncScope();
    window.v8OriginalCalculateQuote();

    if (!latestQuote || !latestQuote.lineItems) return;

    const scope = v8GetScope();

    if (scope === "materials_only") {
      latestQuote.lineItems = latestQuote.lineItems.filter(line => {
        if (v8IsLaborLine(line)) return false;
        if (v8IsConcreteLine(line)) return false;
        return true;
      });
      latestQuote.scope = "Materials Only";
      latestQuote.materialSummary.concreteBags = 0;
    }

    if (scope === "labor_only") {
      latestQuote.lineItems = latestQuote.lineItems.filter(line => {
        if (v8IsLaborLine(line)) return true;
        if (v8IsConcreteLine(line)) return true;
        return false;
      });
      latestQuote.scope = "Labor Only";
    }

    if (scope === "materials_labor") {
      latestQuote.scope = "Materials + Labor";
    }

    const grandTotal = latestQuote.lineItems.reduce((sum, x) => sum + Number(x.total || 0), 0);
    const depositPct = Number(document.getElementById("depositPct")?.value || 0);

    latestQuote.pricing.grandTotal = Math.round((grandTotal + Number.EPSILON) * 100) / 100;
    latestQuote.pricing.depositDue = Math.round((grandTotal * depositPct / 100 + Number.EPSILON) * 100) / 100;

    renderQuote();

    const missing = document.getElementById("missingCodes");
    if (missing) {
      const note = document.createElement("div");
      note.className = "notice";
      note.style.marginTop = "10px";
      note.innerHTML = "Concrete rule active: 1 bag per post, included only when labor is included.";
      missing.appendChild(note);
    }
  };
}

function v8PatchRenderCounts() {
  if (window.v8OriginalRenderQuote) return;

  window.v8OriginalRenderQuote = window.renderQuote;

  window.renderQuote = function() {
    window.v8OriginalRenderQuote();

    if (!latestQuote) return;

    const scope = v8GetScope();
    const concreteRows = Array.from(document.querySelectorAll("#materialCounts tr"));

    if (scope === "materials_only") {
      concreteRows.forEach(row => {
        if ((row.textContent || "").toLowerCase().includes("concrete")) {
          row.children[1].textContent = "0 - not included on materials-only quote";
        }
      });
    }
  };
}

function v8SetConcreteOneBagPerPost() {
  const input = document.getElementById("concreteBagsPerPost");
  if (input) {
    input.value = "1";
  }
}

document.addEventListener("DOMContentLoaded", function() {
  setTimeout(function() {
    v8InstallScopeInFenceSystem();
    v8SetConcreteOneBagPerPost();
    v8PatchConcretePicker();
    v8PatchConcreteAndScope();
    v8PatchRenderCounts();

    if (typeof refreshSystemOptions === "function") refreshSystemOptions();
    if (typeof calculateQuote === "function") calculateQuote();
  }, 1900);
});
