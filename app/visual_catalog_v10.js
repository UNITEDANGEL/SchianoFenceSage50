/*
Version 10 Visual Catalog
- Loads fence_visual_catalog.json
- Adds manufacturer selector
- Shows preview image for selected style/color/height
- Adds Print Quote With Image
*/

let v10VisualCatalog = [];

async function v10LoadCatalog() {
  const paths = [
    "../config/fence_visual_catalog.json",
    "config/fence_visual_catalog.json"
  ];

  for (const path of paths) {
    try {
      const res = await fetch(path);
      if (!res.ok) continue;
      const data = await res.json();
      v10VisualCatalog = Array.isArray(data.catalog) ? data.catalog : [];
      v10PopulateManufacturers();
      v10SyncPreview();
      return;
    } catch (err) {}
  }
}

function v10InstallUi() {
  const systemTab = document.getElementById("tab-system");
  if (!systemTab || document.getElementById("v10VisualPanel")) return;

  const panel = document.createElement("div");
  panel.id = "v10VisualPanel";
  panel.className = "select-line";
  panel.style.marginTop = "12px";
  panel.innerHTML = `
    <h3>Fence Preview / Quote Image</h3>
    <p class="small">Choose a manufacturer and the app will show the matching fence image for the selected style/color/height. This image can be printed with the quote.</p>

    <div class="row">
      <div>
        <label>Manufacturer</label>
        <select id="v10Manufacturer" onchange="v10SyncPreview()">
          <option value="">Any Manufacturer</option>
        </select>
      </div>
      <div>
        <label>Preview Status</label>
        <input id="v10PreviewStatus" value="Waiting for selection..." readonly>
      </div>
    </div>

    <div id="v10PreviewWrap" style="margin-top:12px; border:1px solid #e5e7eb; border-radius:10px; background:#f8fafc; padding:12px;">
      <div style="font-size:12px; color:#6b7280;">No image selected yet.</div>
    </div>

    <div class="actions" style="margin-top:12px;">
      <button class="blue" onclick="v10SyncPreview()">Refresh Preview</button>
      <button class="green" onclick="v10PrintQuoteWithImage()">Print Quote With Image</button>
    </div>
  `;

  systemTab.appendChild(panel);
}

function v10PopulateManufacturers() {
  const sel = document.getElementById("v10Manufacturer");
  if (!sel) return;

  const list = [...new Set(v10VisualCatalog.map(x => x.manufacturer).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">Any Manufacturer</option>';

  list.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });

  if (list.includes("Internal / Sage")) {
    sel.value = "Internal / Sage";
  }
}

function v10CurrentSelection() {
  return {
    manufacturer: document.getElementById("v10Manufacturer")?.value || "",
    material: document.getElementById("systemMaterial")?.value || "",
    style: document.getElementById("systemStyle")?.value || "",
    color: document.getElementById("systemColor")?.value || "",
    height: document.getElementById("systemHeight")?.value || ""
  };
}

function v10MatchScore(item, sel) {
  let score = 0;

  if (sel.manufacturer && item.manufacturer === sel.manufacturer) score += 20;
  if (sel.material && item.material === sel.material) score += 10;
  if (sel.style && item.style === sel.style) score += 20;
  if (sel.color && item.color === sel.color) score += 10;
  if (sel.height && String(item.height_ft) === String(sel.height)) score += 10;

  return score;
}

function v10FindBestMatch() {
  const sel = v10CurrentSelection();

  const scored = v10VisualCatalog
    .map(item => ({ item, score: v10MatchScore(item, sel) }))
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return null;
  if (scored[0].score <= 0) return null;

  return scored[0].item;
}

function v10ResolveImagePath(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return "../" + path.replace(/^\.?\//, "");
}

function v10SyncPreview() {
  const wrap = document.getElementById("v10PreviewWrap");
  const status = document.getElementById("v10PreviewStatus");
  if (!wrap || !status) return;

  const match = v10FindBestMatch();
  const sel = v10CurrentSelection();

  if (!match) {
    status.value = "No matching image found";
    wrap.innerHTML = `
      <div class="notice">
        No image matched the current selection.<br>
        Current selection: ${v10Esc(sel.style)} / ${v10Esc(sel.color)} / ${v10Esc(sel.height)} ft
      </div>
    `;
    return;
  }

  const imgSrc = v10ResolveImagePath(match.image_path);
  status.value = "Image ready";
  wrap.innerHTML = `
    <div style="display:grid; grid-template-columns: 1fr; gap:10px;">
      <img src="${imgSrc}" alt="${v10Esc(match.caption || match.style)}" style="width:100%; max-height:320px; object-fit:contain; background:white; border:1px solid #d1d5db; border-radius:8px;">
      <div class="small">
        <strong>${v10Esc(match.caption || "")}</strong><br>
        Manufacturer: ${v10Esc(match.manufacturer || "")}<br>
        Material: ${v10Esc(match.material || "")}<br>
        Style: ${v10Esc(match.style || "")}<br>
        Color: ${v10Esc(match.color || "")}<br>
        Height: ${v10Esc(String(match.height_ft || ""))} ft
      </div>
    </div>
  `;
}

function v10PrintQuoteWithImage() {
  if (typeof calculateQuote === "function") calculateQuote();
  const match = v10FindBestMatch();
  const imgSrc = match ? v10ResolveImagePath(match.image_path) : "";
  const quote = window.latestQuote || null;

  const w = window.open("", "_blank");
  if (!w) return;

  const title = quote?.quoteNumber || "Fence Quote";
  const customer = quote?.customerName || "";
  const address = quote?.jobAddress || "";
  const total = quote?.pricing?.grandTotal || 0;
  const scope = quote?.scope || "";
  const notes = quote?.notes || "";
  const lines = Array.isArray(quote?.lineItems) ? quote.lineItems : [];

  const rows = lines.map(line => `
    <tr>
      <td style="border:1px solid #ccc; padding:6px;">${v10Esc(line.code || "")}</td>
      <td style="border:1px solid #ccc; padding:6px;">${v10Esc(line.item || "")}</td>
      <td style="border:1px solid #ccc; padding:6px; text-align:right;">${v10Esc(String(line.qty || ""))}</td>
      <td style="border:1px solid #ccc; padding:6px; text-align:right;">$${v10Money(line.total || 0)}</td>
    </tr>
  `).join("");

  w.document.write(`
    <html>
    <head>
      <title>${v10Esc(title)}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
        h1,h2,h3 { margin: 0 0 10px 0; }
        .top { display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; align-items: start; }
        .card { border: 1px solid #ccc; border-radius: 10px; padding: 14px; }
        img { max-width: 100%; max-height: 420px; object-fit: contain; border: 1px solid #ddd; border-radius: 8px; background: #fff; }
        table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 12px; }
        .meta div { margin-bottom: 6px; }
        .total { font-size: 22px; font-weight: bold; margin-top: 12px; }
      </style>
    </head>
    <body>
      <h1>Fence Quote</h1>
      <div class="top">
        <div class="card meta">
          <div><strong>Quote #:</strong> ${v10Esc(title)}</div>
          <div><strong>Customer:</strong> ${v10Esc(customer)}</div>
          <div><strong>Address:</strong> ${v10Esc(address)}</div>
          <div><strong>Scope:</strong> ${v10Esc(scope)}</div>
          <div><strong>Date:</strong> ${v10Esc(quote?.quoteDate || "")}</div>
          <div><strong>Notes:</strong> ${v10Esc(notes)}</div>
          <div class="total">Total: $${v10Money(total)}</div>
        </div>
        <div class="card">
          <h3>Selected Fence Image</h3>
          ${imgSrc ? `<img src="${imgSrc}" alt="Fence Preview">` : `<div>No image selected.</div>`}
          <div style="margin-top:10px; font-size:12px;">
            ${match ? `
              <strong>${v10Esc(match.caption || "")}</strong><br>
              ${v10Esc(match.manufacturer || "")} / ${v10Esc(match.material || "")} / ${v10Esc(match.style || "")} / ${v10Esc(match.color || "")}
            ` : `No matching catalog image.`}
          </div>
        </div>
      </div>

      <h3 style="margin-top:24px;">Quote Lines</h3>
      <table>
        <thead>
          <tr>
            <th style="border:1px solid #ccc; padding:6px; text-align:left;">Item ID</th>
            <th style="border:1px solid #ccc; padding:6px; text-align:left;">Description</th>
            <th style="border:1px solid #ccc; padding:6px; text-align:right;">Qty</th>
            <th style="border:1px solid #ccc; padding:6px; text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
    </html>
  `);

  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
}

function v10Esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

function v10Money(n) {
  return Number(n || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

document.addEventListener("DOMContentLoaded", function() {
  setTimeout(async function() {
    v10InstallUi();
    await v10LoadCatalog();

    ["systemMaterial","systemStyle","systemColor","systemHeight"].forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.dataset.v10) {
        el.dataset.v10 = "1";
        el.addEventListener("change", v10SyncPreview);
      }
    }
  }, 2600);
});
