/*
Single Screen Upgrade v2
Adds:
- Full quote/job data panel
- Extra data fields
- Gate-only print sheet
- Customer gate detail printout with map, swing, photo, and section split
*/
(function () {
  function el(id) { return document.getElementById(id); }
  function getVal(id, fallback) {
    var e = el(id);
    if (!e) return fallback;
    return e.value || fallback;
  }
  function num(id, fallback) {
    var e = el(id);
    if (!e) return fallback;
    var n = Number(e.value);
    return isNaN(n) ? fallback : n;
  }
  function money(n) {
    return Number(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  function swingLabel(v) {
    var m = {
      outswing_left: "Outswing Left",
      outswing_right: "Outswing Right",
      inswing_left: "Inswing Left",
      inswing_right: "Inswing Right"
    };
    return m[v] || "Outswing Left";
  }
  function quoteTypeLabel(v) {
    var m = {
      materials_only: "Materials Only",
      materials_labor: "Materials + Labor",
      labor_only: "Labor Only"
    };
    return m[v] || "Materials Only";
  }
  function pricingLabel(v) {
    var m = {
      auto: "Auto",
      retail: "Retail",
      wholesale: "Wholesale"
    };
    return m[v] || "Auto";
  }
  function sectionText(length) {
    var sw = num("sectionWidth", 8);
    var full = Math.floor(Number(length || 0) / sw);
    var rem = Math.round((Number(length || 0) - full * sw + Number.EPSILON) * 100) / 100;
    if (full === 0 && rem > 0) return rem + "' cut";
    if (rem > 0) return full + " x " + sw + "' + " + rem + "' cut";
    return full + " x " + sw + "'";
  }
  function localCalc() {
    if (typeof calc === "function") return calc();
    var runLen = num("runLength", 48);
    var gateStart = num("gateStart", 2);
    var gateWidth = num("gateWidth", 4);
    var gateEnd = gateStart + gateWidth;
    var leftLen = gateStart;
    var rightLen = Math.max(0, runLen - gateEnd);
    var sw = num("sectionWidth", 8);
    return {
      runLen: runLen,
      gateStart: gateStart,
      gateWidth: gateWidth,
      gateEnd: gateEnd,
      leftLen: leftLen,
      rightLen: rightLen,
      leftSections: Math.ceil(leftLen / sw),
      rightSections: Math.ceil(rightLen / sw),
      totalSections: Math.ceil(leftLen / sw) + Math.ceil(rightLen / sw),
      linePosts: Math.max(0, Math.ceil(leftLen / sw) - 1) + Math.max(0, Math.ceil(rightLen / sw) - 1),
      endPosts: 2,
      gatePosts: 2,
      totalPosts: Math.max(0, Math.ceil(leftLen / sw) - 1) + Math.max(0, Math.ceil(rightLen / sw) - 1) + 4,
      materialAmount: num("materialsRetail", 0),
      gateAmount: num("gateRetail", 0),
      laborAmount: num("laborRetail", 0),
      grand: num("materialsRetail", 0) + num("gateRetail", 0) + num("laborRetail", 0),
      deposit: 0
    };
  }
  function ensureExtraFields() {
    if (el("quoteNumber")) return;
    var firstCard = document.querySelector(".grid .card");
    if (!firstCard) return;
    var block = document.createElement("div");
    block.innerHTML = ''
      + '<h2 style="margin-top:14px;">Extra Quote Data</h2>'
      + '<div class="row">'
      + '  <div><label>Quote Number</label><input id="quoteNumber" value="Q-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 9000 + 1000) + '" oninput="renderAll()"></div>'
      + '  <div><label>Quote Date</label><input id="quoteDate" type="date" oninput="renderAll()"></div>'
      + '</div>'
      + '<div class="row">'
      + '  <div><label>Customer Phone</label><input id="customerPhone" placeholder="Phone" oninput="renderAll()"></div>'
      + '  <div><label>Customer Email</label><input id="customerEmail" placeholder="Email" oninput="renderAll()"></div>'
      + '</div>'
      + '<div class="row">'
      + '  <div><label>Fence Height</label><select id="fenceHeight" onchange="renderAll()"><option>4 ft</option><option>5 ft</option><option>6 ft</option><option>7 ft</option><option>8 ft</option></select></div>'
      + '  <div><label>Material</label><select id="fenceMaterial" onchange="renderAll()"><option selected>PVC / Vinyl</option><option>Aluminum</option><option>Chain Link</option><option>Wood</option></select></div>'
      + '</div>'
      + '<label>Notes / Customer Scope</label><textarea id="customerNotes" rows="3" placeholder="Example: Install Lakeland PVC fence with walk gate on left side..." oninput="renderAll()"></textarea>';
    firstCard.appendChild(block);
    var dateBox = el("quoteDate");
    if (dateBox) {
      var d = new Date();
      dateBox.value = d.toISOString().slice(0, 10);
    }
  }
  function addGateSheetButtons() {
    if (el("printGateSheetButton")) return;
    var topbar = document.querySelector(".topbar");
    if (topbar) {
      var b = document.createElement("button");
      b.id = "printGateSheetButton";
      b.className = "orange";
      b.textContent = "Print Gate Detail Sheet";
      b.onclick = printGateSheet;
      topbar.appendChild(b);
    }
    var actions = document.querySelector(".actions");
    if (actions) {
      var b2 = document.createElement("button");
      b2.id = "printGateSheetButton2";
      b2.className = "orange";
      b2.textContent = "Print Gate Detail Sheet";
      b2.onclick = printGateSheet;
      actions.appendChild(b2);
    }
  }
  function productImageHtml() {
    var img = el("productPhoto");
    if (img && img.src && !img.classList.contains("hidden")) {
      return '<img style="width:100%;max-height:260px;object-fit:contain;border:1px solid #d1d5db;border-radius:10px;background:#fff;" src="' + img.src + '">';
    }
    if (typeof buildProductSketch === "function") {
      return buildProductSketch();
    }
    return '<div style="border:1px solid #d1d5db;border-radius:10px;padding:20px;text-align:center;">Product image / sketch</div>';
  }
  function buildFullDataPanelHtml() {
    var c = localCalc();
    return ''
      + '<div class="card" style="margin-top:12px;">'
      + '<h2>Full Quote Data</h2>'
      + '<table><tbody>'
      + '<tr><td>Quote #</td><td class="right">' + getVal("quoteNumber", "") + '</td></tr>'
      + '<tr><td>Quote Date</td><td class="right">' + getVal("quoteDate", "") + '</td></tr>'
      + '<tr><td>Customer</td><td class="right">' + getVal("customerName", "") + '</td></tr>'
      + '<tr><td>Phone</td><td class="right">' + getVal("customerPhone", "") + '</td></tr>'
      + '<tr><td>Email</td><td class="right">' + getVal("customerEmail", "") + '</td></tr>'
      + '<tr><td>Style</td><td class="right">' + getVal("style", "Lakeland") + '</td></tr>'
      + '<tr><td>Color</td><td class="right">' + getVal("color", "White") + '</td></tr>'
      + '<tr><td>Height</td><td class="right">' + getVal("fenceHeight", "4 ft") + '</td></tr>'
      + '<tr><td>Material</td><td class="right">' + getVal("fenceMaterial", "PVC / Vinyl") + '</td></tr>'
      + '<tr><td>Quote Type</td><td class="right">' + quoteTypeLabel(getVal("quoteType", "materials_only")) + '</td></tr>'
      + '<tr><td>Pricing</td><td class="right">' + pricingLabel(getVal("pricingMode", "auto")) + '</td></tr>'
      + '<tr><td>Run Length</td><td class="right">' + c.runLen + "'</td></tr>"
      + '<tr><td>Gate Opening</td><td class="right">' + c.gateWidth + "'</td></tr>"
      + '<tr><td>Gate Start / End</td><td class="right">' + c.gateStart + "' - " + c.gateEnd + "'</td></tr>"
      + '<tr><td>Gate Swing</td><td class="right">' + swingLabel(getVal("swing", "outswing_left")) + '</td></tr>'
      + '<tr><td>Left Fence Split</td><td class="right">' + sectionText(c.leftLen) + '</td></tr>'
      + '<tr><td>Right Fence Split</td><td class="right">' + sectionText(c.rightLen) + '</td></tr>'
      + '<tr><td>Total Sections</td><td class="right">' + c.totalSections + '</td></tr>'
      + '<tr><td>Total Posts</td><td class="right">' + c.totalPosts + '</td></tr>'
      + '</tbody></table>'
      + '</div>';
  }
  function updateFullDataPanel() {
    var rightCol = document.querySelector(".grid > div:nth-child(3)");
    if (!rightCol) return;
    var existing = el("fullQuoteDataPanel");
    if (!existing) {
      existing = document.createElement("div");
      existing.id = "fullQuoteDataPanel";
      rightCol.appendChild(existing);
    }
    existing.innerHTML = buildFullDataPanelHtml();
  }
  function buildGateSheetHtml() {
    var c = localCalc();
    var map = typeof buildMapSvg === "function" ? buildMapSvg() : "";
    var photo = productImageHtml();
    return ''
      + '<html><head><title>Gate Detail Sheet</title><style>'
      + '@page{size:letter portrait;margin:.25in;}'
      + 'body{font-family:Arial,sans-serif;color:#111827;margin:0;font-size:12px;}'
      + '.page{padding:0;}'
      + 'h1{font-size:22px;margin:0 0 8px;}'
      + 'h2{font-size:16px;margin:10px 0 6px;}'
      + '.grid{display:grid;grid-template-columns:1.2fr .8fr;gap:10px;align-items:start;}'
      + '.box{border:1px solid #d1d5db;border-radius:10px;padding:8px;break-inside:avoid;}'
      + 'table{width:100%;border-collapse:collapse;margin-top:6px;}'
      + 'td,th{border:1px solid #d1d5db;padding:5px;font-size:11px;}'
      + 'th{background:#f3f4f6;text-align:left;}'
      + '.right{text-align:right;}'
      + 'svg{width:100%;height:auto;max-height:3.65in;}'
      + 'img{width:100%;max-height:2.4in;object-fit:contain;}'
      + '</style></head><body>'
      + '<div class="page">'
      + '<h1>Gate Detail Sheet</h1>'
      + '<div><b>Customer:</b> ' + getVal("customerName", "") + ' &nbsp; <b>Address:</b> ' + getVal("jobAddress", "") + '</div>'
      + '<div><b>Style:</b> ' + getVal("style", "Lakeland") + ' &nbsp; <b>Color:</b> ' + getVal("color", "White") + ' &nbsp; <b>Height:</b> ' + getVal("fenceHeight", "4 ft") + '</div>'
      + '<div class="grid" style="margin-top:10px;">'
      + '<div class="box"><h2>Gate Location / Swing Map</h2>' + map + '</div>'
      + '<div class="box"><h2>Product Picture / Sketch</h2>' + photo + '</div>'
      + '</div>'
      + '<div class="grid" style="margin-top:10px;">'
      + '<div class="box"><h2>Gate Data</h2>'
      + '<table><tbody>'
      + '<tr><td>Gate Type</td><td class="right">' + getVal("gateType", "single") + '</td></tr>'
      + '<tr><td>Gate Opening</td><td class="right">' + c.gateWidth + "'</td></tr>"
      + '<tr><td>Gate Start</td><td class="right">' + c.gateStart + "' from segment start</td></tr>"
      + '<tr><td>Gate End</td><td class="right">' + c.gateEnd + "' from segment start</td></tr>"
      + '<tr><td>Swing Direction</td><td class="right">' + swingLabel(getVal("swing", "outswing_left")) + '</td></tr>'
      + '</tbody></table></div>'
      + '<div class="box"><h2>Section Split Around Gate</h2>'
      + '<table><tbody>'
      + '<tr><td>Left Side Fence</td><td class="right">' + c.leftLen + "' / " + sectionText(c.leftLen) + '</td></tr>'
      + '<tr><td>Gate Opening</td><td class="right">' + c.gateWidth + "'</td></tr>"
      + '<tr><td>Right Side Fence</td><td class="right">' + c.rightLen + "' / " + sectionText(c.rightLen) + '</td></tr>'
      + '<tr><td>Total Fence Sections</td><td class="right">' + c.totalSections + '</td></tr>'
      + '</tbody></table></div>'
      + '</div>'
      + '<div class="box" style="margin-top:10px;"><h2>Notes</h2><div>' + getVal("customerNotes", "") + '</div></div>'
      + '</div></body></html>';
  }
  function printGateSheet() {
    if (typeof renderAll === "function") renderAll();
    var w = window.open("", "_blank");
    if (!w) {
      alert("Popup blocked. Allow popups for this app.");
      return;
    }
    w.document.open();
    w.document.write(buildGateSheetHtml());
    w.document.close();
    w.focus();
    setTimeout(function () {
      w.print();
    }, 500);
  }
  function patchRenderAll() {
    if (window.singleScreenV2RenderPatched) return;
    window.singleScreenV2RenderPatched = true;
    if (typeof renderAll === "function") {
      window.originalRenderAllV2 = renderAll;
      window.renderAll = function () {
        window.originalRenderAllV2();
        updateFullDataPanel();
      };
    }
  }
  function init() {
    ensureExtraFields();
    addGateSheetButtons();
    patchRenderAll();
    window.printGateSheet = printGateSheet;
    if (typeof renderAll === "function") renderAll();
    updateFullDataPanel();
  }
  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(init, 500);
  });
})();