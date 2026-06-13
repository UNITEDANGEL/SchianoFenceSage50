/*
Version 16 Drawing + Quote Print

Adds:
- Clear drawing overlay with section split markers
- 8 ft section breakdown per segment
- line post markers on drawing
- gate/door shown on quote print
- compact print layout with drawing + layout summary + quote lines
*/

function v16Round(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function v16Money(n) {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function v16Esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function v16GetCanvas() {
  return document.querySelector("canvas");
}

function v16SectionWidthFt() {
  return Number(
    document.getElementById("v14SectionWidthQuick")?.value ||
    document.getElementById("sectionWidthFt")?.value ||
    8
  );
}

function v16GetGateList() {
  if (Array.isArray(window.v13LayoutGates)) return window.v13LayoutGates;
  return [];
}

function v16GatesForSegment(segmentNumber) {
  return v16GetGateList().filter(g => Number(g.segment || 0) === Number(segmentNumber || 0));
}

function v16BuildSegmentBreakdown(lengthFt, segmentNumber) {
  const sectionWidth = Math.max(0.01, v16SectionWidthFt());
  const gates = v16GatesForSegment(segmentNumber);
  const gateWidthFt = gates.reduce((sum, g) => sum + Number(g.widthFt || 0), 0);

  const usableFt = Math.max(0, Number(lengthFt || 0) - gateWidthFt);
  const fullSections = Math.floor(usableFt / sectionWidth);
  const remainderFt = v16Round(usableFt - (fullSections * sectionWidth));
  const partialSections = remainderFt > 0.01 ? 1 : 0;
  const totalSections = fullSections + partialSections;
  const linePosts = Math.max(0, totalSections - 1);

  return {
    segmentNumber,
    lengthFt: v16Round(lengthFt),
    sectionWidthFt: v16Round(sectionWidth),
    gateCount: gates.length,
    gateWidthFt: v16Round(gateWidthFt),
    usableFt: v16Round(usableFt),
    fullSections,
    partialSections,
    remainderFt: v16Round(remainderFt),
    totalSections,
    linePosts,
    label: remainderFt > 0.01
      ? (fullSections + " x " + sectionWidth + "' + 1 x " + remainderFt + "'")
      : (fullSections + " x " + sectionWidth + "'")
  };
}

function v16BuildLayoutBreakdown() {
  const lengths = Array.isArray(window.segmentLengths) ? window.segmentLengths : [];
  return lengths.map((len, i) => v16BuildSegmentBreakdown(len, i + 1));
}

function v16InstallPrintControls() {
  const quick = document.getElementById("tab-quick");
  if (!quick || document.getElementById("v16PrintPanel")) return;

  const panel = document.createElement("div");
  panel.id = "v16PrintPanel";
  panel.className = "select-line";
  panel.innerHTML = `
    <h3>Drawing / Quote Print</h3>
    <p class="small">
      Prints a customer quote with the drawing, gate/door locations, and section/post breakdown.
    </p>

    <div class="actions">
      <button class="green" onclick="v16PrintQuoteWithDrawing()">Print Quote With Drawing</button>
      <button class="blue" onclick="v16PreviewLayoutSummary()">Refresh Drawing Summary</button>
    </div>

    <div id="v16LayoutSummaryPreview" style="margin-top:10px;"></div>
  `;

  quick.appendChild(panel);
}

function v16PreviewLayoutSummary() {
  const holder = document.getElementById("v16LayoutSummaryPreview");
  if (!holder) return;

  const rows = v16BuildLayoutBreakdown();
  if (!rows.length) {
    holder.innerHTML = '<div class="small">No segment lengths found yet.</div>';
    return;
  }

  let html = `
    <table style="width:100%; border-collapse:collapse; font-size:12px;">
      <thead>
        <tr>
          <th style="border:1px solid #d1d5db; padding:6px; text-align:left;">Seg</th>
          <th style="border:1px solid #d1d5db; padding:6px; text-align:right;">Len Ft</th>
          <th style="border:1px solid #d1d5db; padding:6px; text-align:right;">Gate Ft</th>
          <th style="border:1px solid #d1d5db; padding:6px; text-align:right;">Usable Ft</th>
          <th style="border:1px solid #d1d5db; padding:6px; text-align:left;">Sections</th>
          <th style="border:1px solid #d1d5db; padding:6px; text-align:right;">Line Posts</th>
        </tr>
      </thead>
      <tbody>
  `;

  rows.forEach(r => {
    html += `
      <tr>
        <td style="border:1px solid #d1d5db; padding:6px;">${r.segmentNumber}</td>
        <td style="border:1px solid #d1d5db; padding:6px; text-align:right;">${r.lengthFt}</td>
        <td style="border:1px solid #d1d5db; padding:6px; text-align:right;">${r.gateWidthFt}</td>
        <td style="border:1px solid #d1d5db; padding:6px; text-align:right;">${r.usableFt}</td>
        <td style="border:1px solid #d1d5db; padding:6px;">${v16Esc(r.label)}</td>
        <td style="border:1px solid #d1d5db; padding:6px; text-align:right;">${r.linePosts}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  holder.innerHTML = html;
}

function v16PatchDraw() {
  if (window.v16OriginalDraw || typeof window.draw !== "function") return;

  window.v16OriginalDraw = window.draw;

  window.draw = function() {
    window.v16OriginalDraw();
    v16OverlayPostsAndSections();
  };
}

function v16OverlayPostsAndSections() {
  if (!window.ctx || !Array.isArray(window.points) || points.length < 2) return;
  if (!Array.isArray(window.segmentLengths) || !segmentLengths.length) return;

  ctx.save();

  const sectionWidth = Math.max(0.01, v16SectionWidthFt());

  segmentLengths.forEach((segLen, i) => {
    const a = points[i];
    const b = points[i + 1] || ((document.getElementById("layoutClosed")?.value === "closed") ? points[0] : null);
    if (!a || !b) return;

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const pixelLen = Math.sqrt(dx * dx + dy * dy);
    if (pixelLen <= 0) return;

    const breakdown = v16BuildSegmentBreakdown(segLen, i + 1);

    const ux = dx / pixelLen;
    const uy = dy / pixelLen;

    for (let ft = sectionWidth; ft < Number(segLen || 0); ft += sectionWidth) {
      const t = ft / Number(segLen || 1);
      if (t >= 1) break;

      const x = a.x + dx * t;
      const y = a.y + dy * t;

      ctx.beginPath();
      ctx.fillStyle = "#2563eb";
      ctx.strokeStyle = "#1e3a8a";
      ctx.lineWidth = 2;
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#111827";
      ctx.font = "11px Arial";
      ctx.textAlign = "center";
      ctx.fillText("LP", x, y - 10);
    }

    const midX = a.x + dx * 0.5;
    const midY = a.y + dy * 0.5;

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.strokeStyle = "#9ca3af";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(midX - 55, midY - 18, 110, 36, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#111827";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Seg " + (i + 1) + ": " + breakdown.label, midX, midY - 2);
    ctx.fillText("LP: " + breakdown.linePosts, midX, midY + 12);
  });

  ctx.restore();
}

function v16PatchCalculateQuote() {
  if (window.v16OriginalCalculateQuote || typeof window.calculateQuote !== "function") return;

  window.v16OriginalCalculateQuote = window.calculateQuote;

  window.calculateQuote = function() {
    window.v16OriginalCalculateQuote();

    if (!window.latestQuote) return;

    latestQuote.layoutBreakdown = v16BuildLayoutBreakdown();
    latestQuote.sectionWidthFt = v16SectionWidthFt();
    latestQuote.gateLayout = v16GetGateList();

    v16PreviewLayoutSummary();
  };
}

function v16DrawingDataUrl() {
  const canvas = v16GetCanvas();
  if (!canvas) return "";
  try {
    return canvas.toDataURL("image/png");
  } catch (e) {
    return "";
  }
}

function v16PrintQuoteWithDrawing() {
  if (typeof calculateQuote === "function") calculateQuote();
  if (!window.latestQuote) return;

  const quote = latestQuote;
  const imgSrc = v16DrawingDataUrl();
  const layout = Array.isArray(quote.layoutBreakdown) ? quote.layoutBreakdown : [];
  const gates = Array.isArray(quote.gateLayout) ? quote.gateLayout : [];
  const showItemId = typeof v12ShowItemId === "function" ? v12ShowItemId() : false;
  const showUnitPrice = typeof v12ShowUnitPrice === "function" ? v12ShowUnitPrice() : false;

  let quoteHeaders = "";
  if (showItemId) quoteHeaders += "<th style='text-align:left;'>Item ID</th>";
  quoteHeaders += "<th style='text-align:left;'>Description</th>";
  if (showUnitPrice) quoteHeaders += "<th style='text-align:right;'>Unit Price</th>";
  quoteHeaders += "<th style='text-align:right;'>Qty</th><th style='text-align:right;'>Total</th>";

  const quoteRows = (quote.lineItems || []).map(line => {
    let cells = "";
    if (showItemId) cells += "<td>" + v16Esc(line.code || "") + "</td>";
    cells += "<td>" + v16Esc(line.item || "") + "</td>";
    if (showUnitPrice) cells += "<td style='text-align:right;'>$" + v16Money(line.unitPrice || 0) + "</td>";
    cells += "<td style='text-align:right;'>" + v16Esc(String(line.qty || "")) + " " + v16Esc(line.unit || "") + "</td>";
    cells += "<td style='text-align:right;'>$" + v16Money(line.total || 0) + "</td>";
    return "<tr>" + cells + "</tr>";
  }).join("");

  const layoutRows = layout.map(r => `
    <tr>
      <td>${r.segmentNumber}</td>
      <td style="text-align:right;">${r.lengthFt}</td>
      <td style="text-align:right;">${r.gateWidthFt}</td>
      <td style="text-align:right;">${r.usableFt}</td>
      <td>${v16Esc(r.label)}</td>
      <td style="text-align:right;">${r.linePosts}</td>
    </tr>
  `).join("");

  const gateRows = gates.length ? gates.map(g => `
    <tr>
      <td>${v16Esc(String(g.segment || ""))}</td>
      <td>${v16Esc(String(g.positionPct || ""))}%</td>
      <td>${v16Esc(String(g.widthFt || ""))} ft</td>
      <td>${v16Esc(g.itemId || "")}</td>
      <td>${v16Esc(g.description || "")}</td>
      <td>${v16Esc(g.color || "")}</td>
    </tr>
  `).join("") : `<tr><td colspan="6">No gates / doors on drawing.</td></tr>`;

  const w = window.open("", "_blank");
  if (!w) return;

  w.document.write(`
    <html>
      <head>
        <title>${v16Esc(quote.quoteNumber || "Fence Quote")}</title>
        <style>
          @page { size: letter portrait; margin: 0.35in; }
          body { font-family: Arial, sans-serif; color:#111827; margin:0; font-size:12px; }
          .page { width: 100%; }
          .title { font-size:20px; font-weight:bold; margin-bottom:8px; }
          .grid { display:grid; grid-template-columns: 1.2fr 1fr; gap:12px; }
          .box { border:1px solid #cbd5e1; border-radius:8px; padding:8px; }
          .meta div { margin-bottom:4px; }
          .drawing img { width:100%; max-height:250px; object-fit:contain; border:1px solid #d1d5db; }
          table { width:100%; border-collapse:collapse; margin-top:8px; }
          th, td { border:1px solid #d1d5db; padding:5px; font-size:11px; }
          th { background:#f3f4f6; }
          .section { margin-top:10px; }
          .total { font-size:18px; font-weight:bold; text-align:right; margin-top:8px; }
          .small { font-size:10px; color:#4b5563; }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="title">Fence Quote</div>

          <div class="grid">
            <div class="box meta">
              <div><strong>Quote #:</strong> ${v16Esc(quote.quoteNumber || "")}</div>
              <div><strong>Date:</strong> ${v16Esc(quote.quoteDate || "")}</div>
              <div><strong>Customer:</strong> ${v16Esc(quote.customerName || "")}</div>
              <div><strong>Customer ID:</strong> ${v16Esc(quote.customerId || "")}</div>
              <div><strong>Job Address:</strong> ${v16Esc(quote.jobAddress || "")}</div>
              <div><strong>Quote Type:</strong> ${v16Esc(quote.scope || "")}</div>
              <div><strong>Payment:</strong> ${v16Esc(quote.paymentMethod || "Cash / Check")}</div>
              <div><strong>Section Width:</strong> ${v16Esc(String(quote.sectionWidthFt || 8))} ft</div>
              <div><strong>Notes:</strong> ${v16Esc(quote.notes || "")}</div>
              <div class="total">Total: $${v16Money(quote.pricing?.grandTotal || 0)}</div>
            </div>

            <div class="box drawing">
              <div><strong>Drawing / Map</strong></div>
              ${imgSrc ? `<img src="${imgSrc}" alt="Fence Layout Drawing">` : `<div>No drawing available.</div>`}
              <div class="small" style="margin-top:6px;">
                LP = line post. Gates/doors are shown on the drawing.
              </div>
            </div>
          </div>

          <div class="section box">
            <div><strong>Segment / Section Breakdown</strong></div>
            <table>
              <thead>
                <tr>
                  <th>Seg</th>
                  <th style="text-align:right;">Length Ft</th>
                  <th style="text-align:right;">Gate Ft</th>
                  <th style="text-align:right;">Usable Ft</th>
                  <th>Section Split</th>
                  <th style="text-align:right;">Line Posts</th>
                </tr>
              </thead>
              <tbody>
                ${layoutRows || `<tr><td colspan="6">No segment data.</td></tr>`}
              </tbody>
            </table>
          </div>

          <div class="section box">
            <div><strong>Gate / Door Layout</strong></div>
            <table>
              <thead>
                <tr>
                  <th>Seg</th>
                  <th>Position</th>
                  <th>Width</th>
                  <th>Item ID</th>
                  <th>Description</th>
                  <th>Color</th>
                </tr>
              </thead>
              <tbody>${gateRows}</tbody>
            </table>
          </div>

          <div class="section box">
            <div><strong>Quote Lines</strong></div>
            <table>
              <thead><tr>${quoteHeaders}</tr></thead>
              <tbody>${quoteRows}</tbody>
            </table>
          </div>
        </div>
      </body>
    </html>
  `);

  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 600);
}

document.addEventListener("DOMContentLoaded", function() {
  setTimeout(function() {
    v16InstallPrintControls();
    v16PatchDraw();
    v16PatchCalculateQuote();
    v16PreviewLayoutSummary();

    if (typeof calculateQuote === "function") calculateQuote();
    if (typeof draw === "function") draw();
  }, 5300);
});
