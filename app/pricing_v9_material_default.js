/*
Version 9 Material-Only Default Rules

Rules:
- Default quote type = Materials Only
- Materials Only = materials only, no labor, no concrete, no deposit
- Materials + Labor = materials, labor, concrete, deposit allowed
- Labor Only = labor, concrete, deposit allowed
*/

function v9SetMaterialOnlyDefault() {
  const systemScope = document.getElementById("v8QuoteScopeSystem");
  const pricingScope = document.getElementById("v7QuoteScope");

  if (systemScope) systemScope.value = "materials_only";
  if (pricingScope) pricingScope.value = "materials_only";

  const depositInput = document.getElementById("depositPct");
  if (depositInput) depositInput.value = "0";
}

function v9LaborIncluded() {
  const scope =
    document.getElementById("v8QuoteScopeSystem")?.value ||
    document.getElementById("v7QuoteScope")?.value ||
    "materials_only";

  return scope === "materials_labor" || scope === "labor_only";
}

function v9SyncDepositRule() {
  const depositInput = document.getElementById("depositPct");
  if (!depositInput) return;

  if (!v9LaborIncluded()) {
    depositInput.value = "0";
    depositInput.disabled = true;
    depositInput.title = "Deposit is only used when labor/installation is included.";
  } else {
    depositInput.disabled = false;
    depositInput.title = "Deposit is allowed because labor/installation is included.";
    if (Number(depositInput.value || 0) === 0) {
      depositInput.value = "50";
    }
  }
}

function v9InstallDepositNote() {
  const pricingTab = document.getElementById("tab-pricing");
  if (!pricingTab || document.getElementById("v9DepositRuleNote")) return;

  const note = document.createElement("div");
  note.id = "v9DepositRuleNote";
  note.className = "notice";
  note.style.marginTop = "10px";
  note.innerHTML = `
    <strong>Deposit Rule:</strong><br>
    Materials Only = no deposit.<br>
    Deposit is only calculated when labor/installation is included.
  `;

  const depositInput = document.getElementById("depositPct");
  if (depositInput && depositInput.closest("div")) {
    depositInput.closest("div").after(note);
  } else {
    pricingTab.appendChild(note);
  }
}

function v9PatchCalculateDeposit() {
  if (window.v9OriginalCalculateQuote) return;

  window.v9OriginalCalculateQuote = window.calculateQuote;

  window.calculateQuote = function() {
    v9SyncDepositRule();

    window.v9OriginalCalculateQuote();

    if (!latestQuote) return;

    if (!v9LaborIncluded()) {
      latestQuote.scope = "Materials Only";
      latestQuote.pricing.depositDue = 0;

      if (latestQuote.materialSummary) {
        latestQuote.materialSummary.concreteBags = 0;
      }

      latestQuote.lineItems = latestQuote.lineItems.filter(line => {
        const code = String(line.code || "").toUpperCase();
        const desc = String(line.item || "").toUpperCase();
        const source = String(line.source || "").toUpperCase();

        const isLabor =
          code.includes("LABOR") ||
          desc.includes("LABOR") ||
          desc.includes("INSTALL") ||
          source.includes("LABOR");

        const isConcrete =
          code === "CONCRETE" ||
          desc.includes("CONCRETE") ||
          desc.includes("CRETE") ||
          desc.includes("80LB") ||
          desc.includes("80 LB");

        return !isLabor && !isConcrete;
      });

      const grandTotal = latestQuote.lineItems.reduce((sum, x) => sum + Number(x.total || 0), 0);
      latestQuote.pricing.grandTotal = Math.round((grandTotal + Number.EPSILON) * 100) / 100;
      latestQuote.pricing.depositDue = 0;
    }

    renderQuote();

    const depositDisplay = document.getElementById("kpiDeposit");
    if (depositDisplay && !v9LaborIncluded()) {
      depositDisplay.textContent = "$0.00 - no deposit on materials only";
    }
  };
}

function v9PatchScopeChangeEvents() {
  const systemScope = document.getElementById("v8QuoteScopeSystem");
  const pricingScope = document.getElementById("v7QuoteScope");

  if (systemScope && !systemScope.dataset.v9) {
    systemScope.dataset.v9 = "1";
    systemScope.addEventListener("change", function() {
      if (pricingScope) pricingScope.value = systemScope.value;
      v9SyncDepositRule();
      calculateQuote();
    });
  }

  if (pricingScope && !pricingScope.dataset.v9) {
    pricingScope.dataset.v9 = "1";
    pricingScope.addEventListener("change", function() {
      if (systemScope) systemScope.value = pricingScope.value;
      v9SyncDepositRule();
      calculateQuote();
    });
  }
}

document.addEventListener("DOMContentLoaded", function() {
  setTimeout(function() {
    v9SetMaterialOnlyDefault();
    v9InstallDepositNote();
    v9PatchCalculateDeposit();
    v9PatchScopeChangeEvents();
    v9SyncDepositRule();

    if (typeof calculateQuote === "function") calculateQuote();
  }, 2300);
});
