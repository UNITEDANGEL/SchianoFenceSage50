(function(){
  "use strict";
  const STATE_KEY = "sage50_gate_customer_repair_v29";
  const state = {
    gates: [],
    selectedGateId: null,
    fenceLength: 48,
    sectionWidth: 8,
    style: "Lakeland",
    color: "White",
    height: "4 ft",
    customer: "",
    address: "",
    quoteNumber: "",
    notes: "",
    priceMode: "grand_only"
  };
  function $(id){ return document.getElementById(id); }
  function money(n){
    return Number(n || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  }
  function loadState(){
    try {
      const saved = JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
      Object.assign(state, saved);
      if (!Array.isArray(state.gates)) state.gates = [];
    } catch(e) {}
  }
  function saveState(){
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }
  function getExistingValue(ids, fallback){
    for (const id of ids) {
      const el = $(id);
      if (el && el.value !== undefined && String(el.value).trim() !== "") return el.value;
    }
    return fallback;
  }
  function syncFromExistingApp(){
    state.fenceLength = Number(getExistingValue(["runLength","totalFeet","fenceLength","length"], state.fenceLength)) || state.fenceLength;
    state.sectionWidth = Number(getExistingValue(["sectionWidth","panelWidth"], state.sectionWidth)) || state.sectionWidth;
    state.style = getExistingValue(["style","fenceStyle"], state.style);
    state.color = getExistingValue(["color","fenceColor"], state.color);
    state.height = getExistingValue(["height","fenceHeight"], state.height);
    state.customer = getExistingValue(["customerName","customer"], state.customer);
    state.address = getExistingValue(["jobAddress","address"], state.address);
    state.quoteNumber = getExistingValue(["quoteNumber","quoteNo"], state.quoteNumber);
    state.notes = getExistingValue(["notes","scope"], state.notes);
    state.priceMode = getExistingValue(["customerPriceDisplay"], state.priceMode);
  }
  function sectionText(length){
    const sw = Number(state.sectionWidth || 8);
    const full = Math.floor(length / sw);
    const rem = Math.round((length - full * sw) * 100) / 100;
    if (full === 0 && rem > 0) return rem + "' cut";
    if (rem > 0) return full + " x " + sw + "' + " + rem + "' cut";
    return full + " x " + sw + "'";
  }
  function selectedGate(){
    return state.gates.find(g => g.id === state.selectedGateId) || state.gates[0] || null;
  }
  function addGate(type){
    const width = type === "double" ? 10 : 4;
    const start = Math.max(0, Math.min(Number(state.fenceLength || 48) - width, 2));
    const gate = {
      id: "gate_" + Date.now(),
      type,
      width,
      start,
      swing: "outswing_left",
      color: state.color || "White"
    };
    state.gates.push(gate);
    state.selectedGateId = gate.id;
    saveState();
    renderAll();
  }
  function removeSelectedGate(){
    const g = selectedGate();
    if (!g) return;
    state.gates = state.gates.filter(x => x.id !== g.id);
    state.selectedGateId = state.gates.length ? state.gates[0].id : null;
    saveState();
    renderAll();
  }
  function updateSelectedGate(){
    const g = selectedGate();
    if (!g) return;
    g.width = Math.max(1, Number($("v29_gateWidth").value || g.width));
    g.start = Math.max(0, Math.min(Number(state.fenceLength) - g.width, Number($("v29_gateStart").value || g.start)));
    g.swing = $("v29_gateSwing").value;
    g.type = $("v29_gateType").value;
    g.color = $("v29_gateColor").value || state.color;
    saveState();
    renderAll();
  }
  function xFromFt(ft){
    return 70 + (ft / Number(state.fenceLength || 48)) * 860;
  }
  function ftFromX(x){
    const t = Math.max(0, Math.min(1, (x - 70) / 860));
    return t * Number(state.fenceLength || 48);
  }
  function gateImageHtml(){
    const localCandidates = [
      "../catalog_images/White-4-ft-Lakeland-with-single-gate.jpg",
      "../catalog_images/Lakeland-double-gate-danny-oubre-2-1.jpg",
      "../catalog_images/Cloudy-White-Lakeland-with-single-gate.jpg",
      "catalog_images/White-4-ft-Lakeland-with-single-gate.jpg",
      "catalog_images/Lakeland-double-gate-danny-oubre-2-1.jpg",
      "catalog_images/Cloudy-White-Lakeland-with-single-gate.jpg"
    ];
    return `
      <div class="v29-gate-photo-box">
        <img id="v29_gate_photo" src="${localCandidates[0]}" onerror="
          if(!this.dataset.try){this.dataset.try='1';this.src='${localCandidates[1]}'}
          else if(this.dataset.try==='1'){this.dataset.try='2';this.src='${localCandidates[2]}'}
          else {this.style.display='none';this.parentElement.querySelector('.v29-photo-fallback').style.display='block'}
        ">
        <div class="v29-photo-fallback" style="display:none">
          <svg viewBox="0 0 500 220" width="100%" height="180">
            <rect x="0" y="0" width="500" height="220" fill="#fff"/>
            <line x1="40" y1="150" x2="460" y2="150" stroke="#111827" stroke-width="8"/>
            <rect x="205" y="70" width="90" height="80" fill="none" stroke="#f97316" stroke-width="8"/>
            <path d="M205 150 Q250 70 295 150" fill="none" stroke="#dc2626" stroke-width="4"/>
            <text x="250" y="190" text-anchor="middle" font-family="Arial" font-size="18" font-weight="700">Gate Image / Sketch</text>
          </svg>
        </div>
      </div>
    `;
  }
  function swingLabel(s){
    return {
      outswing_left: "Outswing Left",
      outswing_right: "Outswing Right",
      inswing_left: "Inswing Left",
      inswing_right: "Inswing Right"
    }[s] || "Outswing Left";
  }
  function buildMapSvg(printMode){
    const len = Number(state.fenceLength || 48);
    const y = 170;
    let svg = `
      <svg id="v29_svg" viewBox="0 0 1000 360" width="100%" height="360" xmlns="http://www.w3.org/2000/svg" style="touch-action:none;user-select:none;background:white;border:1px solid #d1d5db;border-radius:12px">
        <defs>
          <marker id="v29_arrow" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#dc2626"></path>
          </marker>
        </defs>
        <rect x="0" y="0" width="1000" height="360" fill="white"></rect>
        <text x="500" y="30" text-anchor="middle" font-family="Arial" font-size="20" font-weight="800">Customer Fence Map</text>
        <text x="500" y="54" text-anchor="middle" font-family="Arial" font-size="13">${state.style} | ${state.color} | ${state.height} | ${len} ft</text>
    `;
    if (!state.gates.length) {
      svg += `
        <rect x="70" y="105" width="860" height="120" fill="#f9fafb" stroke="#cbd5e1" stroke-dasharray="8 6" rx="12"></rect>
        <text x="500" y="155" text-anchor="middle" font-family="Arial" font-size="18" font-weight="800" fill="#6b7280">Blank Map</text>
        <text x="500" y="182" text-anchor="middle" font-family="Arial" font-size="13" fill="#6b7280">Add a gate to place it on the drawing.</text>
        <text x="500" y="210" text-anchor="middle" font-family="Arial" font-size="13" fill="#6b7280">Map stays blank by default until gate/layout is added.</text>
      </svg>`;
      return svg;
    }
    svg += `<line x1="70" y1="${y}" x2="930" y2="${y}" stroke="#111827" stroke-width="8" stroke-linecap="round"></line>`;
    for (const g of state.gates) {
      const x1 = xFromFt(g.start);
      const x2 = xFromFt(g.start + g.width);
      const mid = (x1 + x2) / 2;
      const isSelected = g.id === state.selectedGateId;
      const isIn = String(g.swing).startsWith("in");
      const isLeft = String(g.swing).includes("left");
      const side = isIn ? 1 : -1;
      const hingeX = isLeft ? x1 : x2;
      const gatePx = Math.abs(x2 - x1);
      const openY = y + side * Math.min(110, Math.max(45, gatePx));
      const arcCX = hingeX + (isLeft ? gatePx * .45 : -gatePx * .45);
      const arcCY = y + side * Math.min(90, Math.max(35, gatePx * .75));
      const left = Math.max(0, g.start);
      const right = Math.max(0, len - (g.start + g.width));
      svg += `
        <rect x="${x1}" y="${y-20}" width="${x2-x1}" height="40" fill="white"></rect>
        <path d="M ${hingeX} ${y} Q ${arcCX} ${arcCY} ${hingeX} ${openY}" fill="none" stroke="#dc2626" stroke-width="5" marker-end="url(#v29_arrow)"></path>
        <line x1="${hingeX}" y1="${y}" x2="${hingeX}" y2="${openY}" stroke="#dc2626" stroke-width="4" stroke-linecap="round"></line>
        <g class="v29-draggable-gate" data-gate-id="${g.id}" style="cursor:grab">
          <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#f97316" stroke-width="${isSelected ? 22 : 16}" stroke-linecap="round"></line>
          <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#7c2d12" stroke-width="2"></line>
          <circle cx="${x1}" cy="${y}" r="7" fill="#7c2d12"></circle>
          <circle cx="${x2}" cy="${y}" r="7" fill="#7c2d12"></circle>
        </g>
        <text x="${mid}" y="${y+46}" text-anchor="middle" font-family="Arial" font-size="14" font-weight="800" fill="#7c2d12">${g.width}' ${g.type === "double" ? "DOUBLE GATE" : "GATE"}</text>
        <text x="${mid}" y="${y+66}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="800" fill="#dc2626">${swingLabel(g.swing)}</text>
        <text x="${Math.max(115, (70+x1)/2)}" y="${y-30}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="#1e3a8a">${left > 0 ? sectionText(left) : ""}</text>
        <text x="${Math.min(885, (x2+930)/2)}" y="${y-30}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="#1e3a8a">${right > 0 ? sectionText(right) : ""}</text>
      `;
    }
    svg += `<text x="70" y="330" font-family="Arial" font-size="12" fill="#4b5563">${printMode ? "Gate location and swing direction shown for customer." : "Drag the orange gate left/right. Change width/swing using controls."}</text>`;
    svg += `</svg>`;
    return svg;
  }
  function selectedGateControls(){
    const g = selectedGate();
    if (!g) {
      return `
        <div class="v29-empty">
          No gate added yet. Map is blank by default.
        </div>
      `;
    }
    return `
      <div class="v29-row">
        <div>
          <label>Gate Type</label>
          <select id="v29_gateType">
            <option value="single" ${g.type === "single" ? "selected" : ""}>Single Walk Gate</option>
            <option value="double" ${g.type === "double" ? "selected" : ""}>Double Driveway Gate</option>
          </select>
        </div>
        <div>
          <label>Gate Width Ft</label>
          <input id="v29_gateWidth" type="number" step="0.5" value="${g.width}">
        </div>
      </div>
      <div class="v29-row">
        <div>
          <label>Gate Start Ft</label>
          <input id="v29_gateStart" type="number" step="0.5" value="${g.start}">
        </div>
        <div>
          <label>Gate Swing</label>
          <select id="v29_gateSwing">
            <option value="outswing_left" ${g.swing === "outswing_left" ? "selected" : ""}>Outswing Left</option>
            <option value="outswing_right" ${g.swing === "outswing_right" ? "selected" : ""}>Outswing Right</option>
            <option value="inswing_left" ${g.swing === "inswing_left" ? "selected" : ""}>Inswing Left</option>
            <option value="inswing_right" ${g.swing === "inswing_right" ? "selected" : ""}>Inswing Right</option>
          </select>
        </div>
      </div>
      <label>Gate Color</label>
      <input id="v29_gateColor" value="${g.color || state.color || "White"}">
      <div class="v29-actions">
        <button id="v29_updateGate" class="v29-blue">Update Gate</button>
        <button id="v29_removeGate" class="v29-red">Remove Gate</button>
      </div>
    `;
  }
  function inventoryStatus(){
    return fetch("../inventory/schiano_inventory_items.json")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const count = Array.isArray(data) ? data.length : (data && data.items ? data.items.length : 0);
        const box = $("v29_inventoryStatus");
        if (box) box.textContent = count ? "Inventory loaded: " + count + " items" : "Inventory file found but no items detected";
      })
      .catch(() => {
        const box = $("v29_inventoryStatus");
        if (box) box.textContent = "Inventory not loaded";
      });
  }
  function quoteTotalGuess(){
    let total = 0;
    const selectors = [".grand", "#grandTotal", "#totalBox", "#totalsBox"];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const m = el.textContent.match(/\$?([0-9,]+\.[0-9]{2}|[0-9,]+)/g);
        if (m && m.length) {
          const last = m[m.length-1].replace(/[$,]/g,"");
          const n = Number(last);
          if (!isNaN(n)) total = n;
        }
      }
    }
    return total;
  }
  function printCustomerQuote(){
    syncFromExistingApp();
    saveState();
    const gate = selectedGate();
    const total = quoteTotalGuess();
    const html = `
      <html>
      <head>
        <title>Customer Fence Quote</title>
        <style>
          body{font-family:Arial,sans-serif;color:#111827;margin:0;padding:18px;font-size:12px}
          h1{font-size:22px;margin:0 0 6px}
          h2{font-size:16px;margin:14px 0 6px}
          .top{display:grid;grid-template-columns:1.4fr .9fr;gap:12px;align-items:start}
          .box{border:1px solid #d1d5db;border-radius:10px;padding:10px;margin-bottom:10px}
          table{width:100%;border-collapse:collapse;margin-top:6px}
          td,th{border:1px solid #d1d5db;padding:6px;font-size:11px}
          th{background:#f3f4f6;text-align:left}
          .right{text-align:right}
          .grand{text-align:right;font-size:24px;font-weight:900;margin-top:10px}
          svg{width:100%;height:auto;max-height:3.85in}
          img{max-width:100%;max-height:2.1in;object-fit:contain;border:1px solid #d1d5db;border-radius:8px}
          .v29-photo-fallback svg{max-height:2.1in}
          @page{size:letter portrait;margin:.32in}
        </style>
      </head>
      <body>
        <h1>Fence Quote</h1>
        <div class="top">
          <div class="box">
            <div><b>Quote #:</b> ${state.quoteNumber || ""}</div>
            <div><b>Customer:</b> ${state.customer || ""}</div>
            <div><b>Address:</b> ${state.address || ""}</div>
            <div><b>Fence:</b> ${state.style} | ${state.color} | ${state.height}</div>
          </div>
          <div class="box">
            <b>Gate Image</b>
            ${gateImageHtml()}
          </div>
        </div>
        <div class="box">
          <h2>Customer Map</h2>
          ${buildMapSvg(true)}
        </div>
        <div class="box">
          <h2>Gate Details</h2>
          <table>
            <tr><th>Gate</th><th>Width</th><th>Location</th><th>Swing</th></tr>
            ${
              state.gates.length
              ? state.gates.map(g => `<tr><td>${g.type === "double" ? "Double Driveway Gate" : "Single Walk Gate"}</td><td>${g.width}'</td><td>${g.start}' from start</td><td>${swingLabel(g.swing)}</td></tr>`).join("")
              : `<tr><td colspan="4">No gate added.</td></tr>`
            }
          </table>
        </div>
        <div class="box">
          <h2>Notes</h2>
          <div>${state.notes || ""}</div>
          ${total ? `<div class="grand">Grand Total: $${money(total)}</div>` : ""}
        </div>
      </body>
      </html>
    `;
    const w = window.open("", "_blank");
    if (!w) {
      alert("Popup blocked. Allow popups to print customer quote.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
  }
  function renderModule(){
    syncFromExistingApp();
    let mount = $("v29_gate_customer_module");
    if (!mount) {
      mount = document.createElement("section");
      mount.id = "v29_gate_customer_module";
      document.body.insertBefore(mount, document.body.firstChild);
    }
    mount.innerHTML = `
      <style>
        #v29_gate_customer_module{background:#eef2f7;border-bottom:4px solid #111827;padding:12px;font-family:Arial,sans-serif;color:#111827}
        #v29_gate_customer_module *{box-sizing:border-box}
        .v29-wrap{max-width:1500px;margin:0 auto;display:grid;grid-template-columns:350px 1fr 330px;gap:12px;align-items:start}
        .v29-card{background:white;border:1px solid #d1d5db;border-radius:14px;padding:12px;box-shadow:0 1px 5px rgba(0,0,0,.08)}
        .v29-card h2{font-size:17px;margin:0 0 8px}
        .v29-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .v29-card label{display:block;font-size:12px;font-weight:900;margin-top:7px;color:#374151}
        .v29-card input,.v29-card select{width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px;font-size:14px;background:white}
        .v29-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
        .v29-actions button{border:0;border-radius:9px;padding:10px 12px;font-weight:900;cursor:pointer}
        .v29-blue{background:#2563eb;color:white}
        .v29-green{background:#047857;color:white}
        .v29-red{background:#dc2626;color:white}
        .v29-gray{background:#4b5563;color:white}
        .v29-empty{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:10px;padding:10px;font-size:13px}
        .v29-small{font-size:12px;color:#6b7280;line-height:1.35}
        .v29-gate-photo-box img{width:100%;height:auto;max-height:180px;object-fit:contain;border:1px solid #d1d5db;border-radius:10px}
        @media(max-width:1100px){.v29-wrap{grid-template-columns:1fr}}
        @media print{#v29_gate_customer_module{display:none!important}}
      </style>
      <div class="v29-wrap">
        <div class="v29-card">
          <h2>Gate Controls</h2>
          <div class="v29-row">
            <div>
              <label>Fence Length Ft</label>
              <input id="v29_fenceLength" type="number" step="0.5" value="${state.fenceLength}">
            </div>
            <div>
              <label>Section Width Ft</label>
              <input id="v29_sectionWidth" type="number" step="0.5" value="${state.sectionWidth}">
            </div>
          </div>
          <div class="v29-row">
            <div>
              <label>Style</label>
              <input id="v29_style" value="${state.style}">
            </div>
            <div>
              <label>Color</label>
              <input id="v29_color" value="${state.color}">
            </div>
          </div>
          <label>Height</label>
          <input id="v29_height" value="${state.height}">
          <div class="v29-actions">
            <button id="v29_addSingle" class="v29-blue">Add Walk Gate</button>
            <button id="v29_addDouble" class="v29-blue">Add Double Driveway Gate</button>
            <button id="v29_clearMap" class="v29-gray">Blank / Clear Map</button>
          </div>
          <hr>
          ${selectedGateControls()}
        </div>
        <div class="v29-card">
          <h2>Blank Map / Gate Placement</h2>
          <div id="v29_map">${buildMapSvg(false)}</div>
          <div class="v29-small">Map is blank by default. Add a gate, then drag the orange gate left/right.</div>
        </div>
        <div class="v29-card">
          <h2>Customer Print + Gate Image</h2>
          ${gateImageHtml()}
          <div class="v29-actions">
            <button id="v29_printCustomer" class="v29-green">Print Customer Quote</button>
          </div>
          <p id="v29_inventoryStatus" class="v29-small">Checking inventory...</p>
          <p class="v29-small">Customer print includes map, gate swing direction, gate details, and gate image/sketch.</p>
        </div>
      </div>
    `;
    $("v29_fenceLength").addEventListener("change", () => {
      state.fenceLength = Math.max(1, Number($("v29_fenceLength").value || 48));
      for (const g of state.gates) {
        if (g.start + g.width > state.fenceLength) g.start = Math.max(0, state.fenceLength - g.width);
      }
      saveState(); renderAll();
    });
    $("v29_sectionWidth").addEventListener("change", () => {
      state.sectionWidth = Math.max(1, Number($("v29_sectionWidth").value || 8));
      saveState(); renderAll();
    });
    $("v29_style").addEventListener("change", () => { state.style = $("v29_style").value; saveState(); renderAll(); });
    $("v29_color").addEventListener("change", () => { state.color = $("v29_color").value; saveState(); renderAll(); });
    $("v29_height").addEventListener("change", () => { state.height = $("v29_height").value; saveState(); renderAll(); });
    $("v29_addSingle").addEventListener("click", () => addGate("single"));
    $("v29_addDouble").addEventListener("click", () => addGate("double"));
    $("v29_clearMap").addEventListener("click", () => {
      state.gates = [];
      state.selectedGateId = null;
      saveState();
      renderAll();
    });
    const updateBtn = $("v29_updateGate");
    if (updateBtn) updateBtn.addEventListener("click", updateSelectedGate);
    const removeBtn = $("v29_removeGate");
    if (removeBtn) removeBtn.addEventListener("click", removeSelectedGate);
    $("v29_printCustomer").addEventListener("click", printCustomerQuote);
    attachDragging();
    inventoryStatus();
  }
  function attachDragging(){
    document.querySelectorAll(".v29-draggable-gate").forEach(gateEl => {
      let dragging = false;
      const gateId = gateEl.getAttribute("data-gate-id");
      gateEl.addEventListener("pointerdown", e => {
        dragging = true;
        state.selectedGateId = gateId;
        try { gateEl.setPointerCapture(e.pointerId); } catch(ex){}
        e.preventDefault();
        saveState();
      });
      gateEl.addEventListener("pointermove", e => {
        if (!dragging) return;
        const svg = $("v29_svg");
        if (!svg) return;
        const g = state.gates.find(x => x.id === gateId);
        if (!g) return;
        const rect = svg.getBoundingClientRect();
        const viewX = (e.clientX - rect.left) * (1000 / rect.width);
        const center = ftFromX(viewX);
        let start = center - g.width / 2;
        start = Math.max(0, Math.min(Number(state.fenceLength) - g.width, start));
        g.start = Math.round(start * 100) / 100;
        saveState();
        renderModule();
      });
      gateEl.addEventListener("pointerup", () => dragging = false);
      gateEl.addEventListener("pointercancel", () => dragging = false);
    });
  }
  function renderAll(){
    renderModule();
  }
  loadState();
  window.SageGateCustomerRepairV29 = {
    addGate,
    clearMap: function(){ state.gates = []; state.selectedGateId = null; saveState(); renderAll(); },
    printCustomerQuote,
    state
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderAll);
  } else {
    renderAll();
  }
})();
