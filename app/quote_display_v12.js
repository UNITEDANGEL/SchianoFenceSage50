/*
Version 12 Quote Display Options

Adds:
- Internal Sage-style quote view
- Customer-facing quote view
- Option to hide Item ID
- Option to hide Unit Price
- Print Customer Quote button
*/

function v12InstallDisplayControls() {
  const pricingTab = document.getElementById("tab-pricing");
  if (!pricingTab || document.getElementById("v12QuoteDisplayMode")) return;

  const box = document.createElement("div");
  box.className = "select-line";
  box.innerHTML = `
    <h3>Quote Display / Print Options</h3>
    <p class="small">Sage export keeps all pricing details. Customer print can hide item codes and unit prices.</p>

    <label>Quote Display Mode</label>
    <select id="v12QuoteDisplayMode" onchange="v12RenderDisplayPreview(); calculateQuote();">
      <option value="internal" selected>Internal / Sage View</option>
      <option value="customer">Customer View</option>
    </select>

    <div class="row">
      <div>
        <label>Show Item ID on Customer Quote?</label>
        <select id="v12ShowItemId" onchange="v12RenderDisplayPreview(); calculateQuote();">
          <option value="no" selected>No</option>
          <option value="yes">Yes</option>
        </select>
      </div>
      <div>
        <label>Show Unit Price on Customer Quote?</label>
        <select id="v12ShowUnitPrice" onchange="v12RenderDisplayPreview(); calculateQuote();">
          <option value="no" selected>No</option>
          <option value="yes">Yes</option>
        </select>
      </div>
    </div>

    <div class="actions">
      <button class="blue" onclick="v12RenderDisplayPreview()">Refresh Display</button>
      <button class="green" onclick="v12PrintCustomerQuote()">Print Customer Quote</button>
    </div>

    <div class="notice" style="margin-top:10px;">
      Recommended customer quote: Description, Quantity, and Total only.
    </div>
  `;

  pricingTab.prepend(box);
}

function v12CustomerMode() {
  return document.getElementById("v12QuoteDisplayMode")?.value === "customer";
}

function v12ShowItemId() {
  if (!v12CustomerMode()) return true;
  return document.getElementById("v12ShowItemId")?.value === "yes";
}

function v12ShowUnitPrice() {
  if (!v12CustomerMode()) return true;
  return document.getElementById("v12ShowUnitPrice")?.value === "yes";
}

function v12PatchRenderQuote() {
  if (window.v12OriginalRenderQuote) return;

  window.v12OriginalRenderQuote = window.renderQuote;

  window.renderQuote = function() {
    window.v12OriginalRenderQuote();
    v12RenderDisplayPreview();
  };
}

function v12RenderDisplayPreview() {
  if (!latestQuote || !latestQuote.lineItems) return;

  const tbody = document.getElementById("lineItems");
  if (!tbody) return;

  const table = tbody.closest("table");
  const thead = table ? table.querySelector("thead tr") : null;

  const showItemId = v12ShowItemId();
  const showUnitPrice = v12ShowUnitPrice();

  if (thead) {
    let headers = "";
    if (showItemId) headers += "<th>Item ID</th>";
    headers += "<th>Description</th>";
    if (showUnitPrice) headers += "<th>Unit Price</th>";
    headers += "<th>Qty</th><th>Total</th>";
    thead.innerHTML = headers;
  }

  tbody.innerHTML = "";

  latestQuote.lineItems.forEach(row => {
    const tr = document.createElement("tr");

    let html = "";

    if (showItemId) {
      html += `<td><strong>${v12Esc(row.code)}</strong></td>`;
    }

    html += `<td>${v12Esc(row.item)}<br><span class="small">${v12Esc(row.source || "")}</span></td>`;

    if (showUnitPrice) {
      html += `<td>$${v12Money(row.unitPrice)}</td>`;
    }

    html += `<td>${v12Esc(row.qty)} ${v12Esc(row.unit || "")}</td>`;
    html += `<td>$${v12Money(row.total)}</td>`;

    tr.innerHTML = html;
    tbody.appendChild(tr);
  });
}

function v12PrintCustomerQuote() {
  if (typeof calculateQuote === "function") calculateQuote();
  if (!latestQuote) return;

  const showItemId = document.getElementById("v12ShowItemId")?.value === "yes";
  const showUnitPrice = document.getElementById("v12ShowUnitPrice")?.value === "yes";

  const rows = latestQuote.lineItems.map(line => {
    let cells = "";

    if (showItemId) {
      cells += `<td>${v12Esc(line.code || "")}</td>`;
    }

    cells += `<td>${v12Esc(line.item || "")}</td>`;

    if (showUnitPrice) {
      cells += `<td style="text-align:right;">$${v12Money(line.unitPrice || 0)}</td>`;
    }

    cells += `<td style="text-align:right;">${v12Esc(String(line.qty || ""))} ${v12Esc(line.unit || "")}</td>`;
    cells += `<td style="text-align:right;">$${v12Money(line.total || 0)}</td>`;

    return `<tr>${cells}</tr>`;
  }).join("");

  let headers = "";
  if (showItemId) headers += "<th>Item ID</th>";
  headers += "<th>Description</th>";
  if (showUnitPrice) headers += '<th style="text-align:right;">Unit Price</th>';
  headers += '<th style="text-align:right;">Quantity</th>';
  headers += '<th style="text-align:right;">Total</th>';

  const w = window.open("", "_blank");
  if (!w) return;

  w.document.write(`
    <html>
    <head>
      <title>${v12Esc(latestQuote.quoteNumber || "Fence Quote")}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 28px; color: #111827; }
        h1 { margin-bottom: 4px; }
        .meta { margin-bottom: 18px; font-size: 14px; }
        .meta div { margin-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
        th { background: #f3f4f6; text-align: left; }
        th, td { border: 1px solid #d1d5db; padding: 8px; }
        .total { margin-top: 18px; text-align: right; font-size: 22px; font-weight: bold; }
        .note { margin-top: 20px; font-size: 12px; color: #4b5563; }
      </style>
    </head>
    <body>
      <h1>Fence Quote</h1>

      <div class="meta">
        <div><strong>Quote #:</strong> ${v12Esc(latestQuote.quoteNumber || "")}</div>
        <div><strong>Date:</strong> ${v12Esc(latestQuote.quoteDate || "")}</div>
        <div><strong>Customer:</strong> ${v12Esc(latestQuote.customerName || "")}</div>
        <div><strong>Job Address:</strong> ${v12Esc(latestQuote.jobAddress || "")}</div>
        <div><strong>Quote Type:</strong> ${v12Esc(latestQuote.scope || "")}</div>
      </div>

      <table>
        <thead>
          <tr>${headers}</tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div class="total">Total: $${v12Money(latestQuote.pricing?.grandTotal || 0)}</div>

      <div class="note">
        This quote is valid according to company terms. Final measurements and availability may affect total.
      </div>
    </body>
    </html>
  `);

  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
}

function v12Esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

function v12Money(n) {
  return Number(n || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

document.addEventListener("DOMContentLoaded", function() {
  setTimeout(function() {
    v12InstallDisplayControls();
    v12PatchRenderQuote();

    if (typeof calculateQuote === "function") calculateQuote();
  }, 3400);
});
