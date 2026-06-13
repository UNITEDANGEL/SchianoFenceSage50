(function(){
  "use strict";
  const STORE_KEY = "sage50_integrated_gate_customer_v30";
  const state = {
    gates: [],
    selectedGateId: null,
    fenceLength: 48,
    sectionWidth: 8,
    style: "Lakeland",
    color: "White",
    height: "4 ft",
    customerName: "",
    jobAddress: "",
    quoteNo: "",
    notes: ""
  };
  function $(id){ return document.getElementById(id); }
  function money(n){
    return Number(n || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  }
  function safeText(v){
    return String(v || "").replace(/[<>&]/g, function(c){
      return {"<":"&lt;",">":"&gt;","&":"&amp;"}[c];
    });
  }
  function getExisting(ids, fallback){
    for(const id of ids){
      const e = $(id);
      if(e && e.value !== undefined && String(e.value).trim() !== "") return e.value;
    }
    return fallback;
  }
  function syncFromApp(){
    state.fenceLength = Number(getExisting(["runLength","fenceLength","totalFeet","length"], state.fenceLength)) || state.fenceLength;
    state.sectionWidth = Number(getExisting(["sectionWidth","panelWidth"], state.sectionWidth)) || state.sectionWidth;
    state.style = getExisting(["style","fenceStyle"], state.style);
    state.color = getExisting(["color","fenceColor"], state.color);
    state.height = getExisting(["height","fenceHeight"], state.height);
    state.customerName = getExisting(["customerName","customer"], state.customerName);
    state.jobAddress = getExisting(["jobAddress","address"], state.jobAddress);
    state.quoteNo = getExisting(["quoteNumber","quoteNo"], state.quoteNo);
    state.notes = getExisting(["notes","scope"], state.notes);
  }
  function load(){
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      Object.assign(state, saved);
      if(!Array.isArray(state.gates)) state.gates = [];
    } catch(e){}
  }
  function save(){
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }
  function sectionText(length){
    const sw = Number(state.sectionWidth || 8);
    const full = Math.floor(length / sw);
    const rem = Math.round((length - full * sw) * 100) / 100;
    if(full === 0 && rem > 0) return rem + "' cut";
    if(rem > 0) return full + " x " + sw + "' + " + rem + "' cut";
    return full + " x " + sw + "'";
  }
  function swingLabel(s){
    return {
      outswing_left: "Outswing Left",
      outswing_right: "Outswing Right",
      inswing_left: "Inswing Left",
      inswing_right: "Inswing Right"
    }[s] || "Outswing Left";
  }
  function swingShort(s){
    if(String(s).startsWith("in")) return "IN";
    return "OUT";
  }
  function selectedGate(){
    return state.gates.find(g => g.id === state.selectedGateId) || state.gates[0] || null;
  }
  function xFromFt(ft){
    return 70 + (ft / Number(state.fenceLength || 48)) * 860;
  }
  function ftFromX(x){
    const t = Math.max(0, Math.min(1, (x - 70) / 860));
    return t * Number(state.fenceLength || 48);
  }
  function addGate(type){
    syncFromPanel();
    const len = Number(state.fenceLength || 48);
    const width = type === "double" ? 10 : 4;
    const g = {
      id: "gate_" + Date.now(),
      type,
      width: Math.min(width, len),
      start: Math.max(0, Math.min(len - width, 2)),
      swing: "outswing_left",
      color: state.color || "White"
    };
    state.gates.push(g);
    state.selectedGateId = g.id;
    save();
    render();
  }
  function clearMap(){
    state.gates = [];
    state.selectedGateId = null;
    save();
    render();
  }
  function removeGate(){
    const g = selectedGate();
    if(!g) return;
    state.gates = state.gates.filter(x => x.id !== g.id);
    state.selectedGateId = state.gates[0] ? state.gates[0].id : null;
    save();
    render();
  }
  function updateGate(){
    const g = selectedGate();
    if(!g) return;
    const len = Number(state.fenceLength || 48);
    g.type = $("v30_gateType").value;
    g.width = Math.max(1, Math.min(len, Number($("v30_gateWidth").value || g.width)));
    g.start = Math.max(0, Math.min(len - g.width, Number($("v30_gateStart").value || g.start)));
    g.swing = $("v30_gateSwing").value;
    g.color = $("v30_gateColor").value || state.color || "White";
    save();
    render();
  }
  function syncFromPanel(){
    if($("v30_fenceLength")) state.fenceLength = Math.max(1, Number($("v30_fenceLength").value || 48));
    if($("v30_sectionWidth")) state.sectionWidth = Math.max(1, Number($("v30_sectionWidth").value || 8));
    if($("v30_style")) state.style = $("v30_style").value || "Lakeland";
    if($("v30_color")) state.color = $("v30_color").value || "White";
    if($("v30_height")) state.height = $("v30_height").value || "4 ft";
    if($("v30_customerName")) state.customerName = $("v30_customerName").value || "";
    if($("v30_jobAddress")) state.jobAddress = $("v30_jobAddress").value || "";
    if($("v30_quoteNo")) state.quoteNo = $("v30_quoteNo").value || "";
    if($("v30_notes")) state.notes = $("v30_notes").value || "";
    const len = Number(state.fenceLength || 48);
    for(const g of state.gates){
      if(g.width > len) g.width = len;
      if(g.start + g.width > len) g.start = Math.max(0, len - g.width);
    }
    save();
  }
  function fencePhotoHtml(){
    const single = "../catalog_images/White-4-ft-Lakeland-with-single-gate.jpg";
    const doubleGate = "../catalog_images/Lakeland-double-gate-danny-oubre-2-1.jpg";
    const cloudy = "../catalog_images/Cloudy-White-Lakeland-with-single-gate.jpg";
    const hasDouble = state.gates.some(g => g.type === "double");
    const src = hasDouble ? doubleGate : single;
    return `
      <div class="v30-photo-box">
        <img src="${src}" onerror="
          if(!this.dataset.try){this.dataset.try='1';this.src='${cloudy}'}
          else {this.style.display='none';this.parentElement.querySelector('.v30-photo-fallback').style.display='block'}
        ">
        <div class="v30-photo-fallback" style="display:none">
          <svg viewBox="0 0 520 230" width="100%" height="190">
            <rect width="520" height="230" fill="white"></rect>
            <line x1="40" y1="155" x2="480" y2="155" stroke="#111827" stroke-width="8"></line>
            <rect x="215" y="75" width="90" height="80" fill="none" stroke="#f97316" stroke-width="8"></rect>
            <path d="M215 155 Q260 75 305 155" fill="none" stroke="#dc2626" stroke-width="5"></path>
            <text x="260" y="200" text-anchor="middle" font-family="Arial" font-size="18" font-weight="800">Fence / Gate Sketch</text>
          </svg>
        </div>
      </div>
    `;
  }
  function buildMapSvg(printMode){
    const len = Number(state.fenceLength || 48);
    const y = 185;
    let svg = `
      <svg id="v30_gateSvg" viewBox="0 0 1000 400" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="v30_arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#dc2626"></path>
          </marker>
        </defs>
        <rect x="0" y="0" width="1000" height="400" fill="white"></rect>
        <text x="500" y="30" text-anchor="middle" font-family="Arial" font-size="21" font-weight="900">Customer Fence Map</text>
        <text x="500" y="56" text-anchor="middle" font-family="Arial" font-size="13">${safeText(state.style)} | ${safeText(state.color)} | ${safeText(state.height)} | ${len} ft</text>
    `;
    if(!state.gates.length){
      svg += `
        <rect x="70" y="115" width="860" height="145" fill="#f9fafb" stroke="#cbd5e1" stroke-dasharray="9 6" rx="14"></rect>
        <text x="500" y="165" text-anchor="middle" font-family="Arial" font-size="21" font-weight="900" fill="#6b7280">Blank Map</text>
        <text x="500" y="197" text-anchor="middle" font-family="Arial" font-size="14" fill="#6b7280">Add a gate to place it on the drawing.</text>
        <text x="500" y="225" text-anchor="middle" font-family="Arial" font-size="14" fill="#6b7280">Map stays blank by default.</text>
      </svg>`;
      return svg;
    }
    svg += `<line x1="70" y1="${y}" x2="930" y2="${y}" stroke="#111827" stroke-width="8" stroke-linecap="round"></line>`;
    for(const g of state.gates){
      const x1 = xFromFt(g.start);
      const x2 = xFromFt(g.start + g.width);
      const mid = (x1 + x2) / 2;
      const selected = g.id === state.selectedGateId;
      const isIn = String(g.swing).startsWith("in");
      const isLeft = String(g.swing).includes("left");
      const side = isIn ? 1 : -1;
      const hingeX = isLeft ? x1 : x2;
      const gatePx = Math.abs(x2 - x1);
      const openLen = Math.min(120, Math.max(55, gatePx));
      const openY = y + side * openLen;
      const arcCX = hingeX + (isLeft ? gatePx * .55 : -gatePx * .55);
      const arcCY = y + side * Math.min(95, Math.max(35, gatePx * .85));
      const labelY = isIn ? y + 125 : y - 115;
      const leftLen = Math.max(0, g.start);
      const rightLen = Math.max(0, len - (g.start + g.width));
      svg += `
        <rect x="${x1}" y="${y-24}" width="${x2-x1}" height="48" fill="white"></rect>
        <circle cx="${hingeX}" cy="${y}" r="10" fill="#dc2626"></circle>
        <text x="${hingeX}" y="${y + (isIn ? -18 : 28)}" text-anchor="middle" font-family="Arial" font-size="11" font-weight="900" fill="#dc2626">HINGE</text>
        <path d="M ${hingeX} ${y} Q ${arcCX} ${arcCY} ${hingeX} ${openY}" fill="none" stroke="#dc2626" stroke-width="6" marker-end="url(#v30_arrow)"></path>
        <line x1="${hingeX}" y1="${y}" x2="${hingeX}" y2="${openY}" stroke="#dc2626" stroke-width="5" stroke-linecap="round"></line>
        <text x="${mid}" y="${labelY}" text-anchor="middle" font-family="Arial" font-size="18" font-weight="900" fill="#dc2626">${swingShort(g.swing)} SWING</text>
        <g class="v30-draggable-gate" data-gate-id="${g.id}" style="cursor:grab">
          <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#f97316" stroke-width="${selected ? 26 : 19}" stroke-linecap="round"></line>
          <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#7c2d12" stroke-width="2"></line>
          <circle cx="${x1}" cy="${y}" r="7" fill="#7c2d12"></circle>
          <circle cx="${x2}" cy="${y}" r="7" fill="#7c2d12"></circle>
        </g>
        <text x="${mid}" y="${y+53}" text-anchor="middle" font-family="Arial" font-size="14" font-weight="900" fill="#7c2d12">${g.width}' ${g.type === "double" ? "DOUBLE GATE" : "GATE"}</text>
        <text x="${mid}" y="${y+74}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="900" fill="#dc2626">${swingLabel(g.swing)}</text>
        <text x="${Math.max(125,(70+x1)/2)}" y="${y-34}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="800" fill="#1e3a8a">${leftLen > 0 ? sectionText(leftLen) : ""}</text>
        <text x="${Math.min(875,(x2+930)/2)}" y="${y-34}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="800" fill="#1e3a8a">${rightLen > 0 ? sectionText(rightLen) : ""}</text>
      `;
    }
    svg += `<text x="70" y="365" font-family="Arial" font-size="12" fill="#4b5563">${printMode ? "Gate location, hinge side, and swing direction shown for customer." : "Drag the orange gate left/right. Red arc shows swing/open direction."}</text>`;
    svg += `</svg>`;
    return svg;
  }
  function gateRows(){
    if(!state.gates.length){
      return `<tr><td colspan="4">No gate added.</td></tr>`;
    }
    return state.gates.map(g => `
      <tr>
        <td>${g.type === "double" ? "Double Driveway Gate" : "Single Walk Gate"}</td>
        <td class="right">${g.width}'</td>
        <td class="right">${g.start}' from start</td>
        <td>${swingLabel(g.swing)}</td>
      </tr>
    `).join("");
  }
  function renderControls(){
    const g = selectedGate();
    if(!g){
      return `<div class="v30-warn">No gate added. Map is blank by default.</div>`;
    }
    return `
      <div class="v30-row">
        <div>
          <label>Gate Type</label>
          <select id="v30_gateType">
            <option value="single" ${g.type === "single" ? "selected" : ""}>Single Walk Gate</option>
            <option value="double" ${g.type === "double" ? "selected" : ""}>Double Driveway Gate</option>
          </select>
        </div>
        <div>
          <label>Gate Width Ft</label>
          <input id="v30_gateWidth" type="number" step="0.5" value="${g.width}">
        </div>
      </div>
      <div class="v30-row">
        <div>
          <label>Gate Start Ft</label>
          <input id="v30_gateStart" type="number" step="0.5" value="${g.start}">
        </div>
        <div>
          <label>Gate Swing</label>
          <select id="v30_gateSwing">
            <option value="outswing_left" ${g.swing === "outswing_left" ? "selected" : ""}>Outswing Left</option>
            <option value="outswing_right" ${g.swing === "outswing_right" ? "selected" : ""}>Outswing Right</option>
            <option value="inswing_left" ${g.swing === "inswing_left" ? "selected" : ""}>Inswing Left</option>
            <option value="inswing_right" ${g.swing === "inswing_right" ? "selected" : ""}>Inswing Right</option>
          </select>
        </div>
      </div>
      <label>Gate Color</label>
      <input id="v30_gateColor" value="${safeText(g.color || state.color || "White")}">
      <div class="v30-actions">
        <button id="v30_updateGate" class="v30-blue">Update Gate</button>
        <button id="v30_removeGate" class="v30-red">Remove Gate</button>
      </div>
    `;
  }
  function inventoryStatus(){
    fetch("../inventory/schiano_inventory_items.json")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const count = Array.isArray(data) ? data.length : (data && data.items ? data.items.length : 0);
        const box = $("v30_inventoryStatus");
        if(!box) return;
        box.className = count ? "v30-ok" : "v30-warn";
        box.textContent = count ? "Inventory loaded: " + count + " items" : "Inventory file found, but no items detected.";
      })
      .catch(() => {
        const box = $("v30_inventoryStatus");
        if(!box) return;
        box.className = "v30-warn";
        box.textContent = "Inventory not loaded.";
      });
  }
  function installTab(){
    if($("v30_page")) return;
    const style = document.createElement("style");
    style.textContent = `
      #v30_page{display:none;padding:14px;background:#eef2f7;color:#111827;font-family:Arial,sans-serif}
      #v30_page.v30-active{display:block}
      #v30_page *{box-sizing:border-box}
      .v30-wrap{max-width:1500px;margin:0 auto;display:grid;grid-template-columns:360px 1fr 360px;gap:12px;align-items:start}
      .v30-card{background:white;border:1px solid #d1d5db;border-radius:14px;padding:12px;box-shadow:0 1px 5px rgba(0,0,0,.08);margin-bottom:12px}
      .v30-card h2{font-size:17px;margin:0 0 8px}
      .v30-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .v30-card label{display:block;font-size:12px;font-weight:900;margin-top:7px;color:#374151}
      .v30-card input,.v30-card select,.v30-card textarea{width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px;font-size:14px;background:white}
      .v30-card textarea{min-height:70px}
      .v30-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
      .v30-actions button,#v30_tab_btn{border:0;border-radius:9px;padding:10px 12px;font-weight:900;cursor:pointer}
      .v30-blue{background:#2563eb;color:white}
      .v30-green{background:#047857;color:white}
      .v30-red{background:#dc2626;color:white}
      .v30-gray{background:#4b5563;color:white}
      .v30-warn{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:10px;padding:9px;font-size:12px}
      .v30-ok{background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;border-radius:10px;padding:9px;font-size:12px}
      .v30-small{font-size:12px;color:#6b7280;line-height:1.35}
      .v30-map svg{width:100%;height:auto;background:white;border:1px solid #d1d5db;border-radius:14px}
      .v30-photo-box img{width:100%;max-height:210px;object-fit:contain;border:1px solid #d1d5db;border-radius:10px;background:white}
      .v30-card table{width:100%;border-collapse:collapse;margin-top:8px}
      .v30-card td,.v30-card th{border:1px solid #d1d5db;padding:6px;font-size:12px}
      .v30-card th{background:#f3f4f6;text-align:left}
      .right{text-align:right}
      @media(max-width:1100px){.v30-wrap{grid-template-columns:1fr}}
      @media print{#v30_page,#v30_tab_btn{display:none!important}}
    `;
    document.head.appendChild(style);
    let nav = document.querySelector(".nav");
    if(!nav){
      nav = document.createElement("div");
      nav.className = "nav";
      nav.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;background:#e5e7eb;padding:10px 14px;border-bottom:1px solid #cbd5e1";
      document.body.insertBefore(nav, document.body.firstChild);
    }
    const btn = document.createElement("button");
    btn.id = "v30_tab_btn";
    btn.textContent = "Gate Map + Customer Print";
    btn.style.background = "#047857";
    btn.style.color = "white";
    btn.addEventListener("click", showV30);
    nav.appendChild(btn);
    const page = document.createElement("section");
    page.id = "v30_page";
    document.body.appendChild(page);
  }
  function showV30(){
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    const page = $("v30_page");
    page.classList.add("v30-active");
    render();
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function render(){
    syncFromApp();
    installTab();
    const page = $("v30_page");
    page.innerHTML = `
      <div class="v30-wrap">
        <div>
          <div class="v30-card">
            <h2>Customer / Fence</h2>
            <label>Quote #</label><input id="v30_quoteNo" value="${safeText(state.quoteNo)}">
            <label>Customer Name</label><input id="v30_customerName" value="${safeText(state.customerName)}">
            <label>Job Address</label><textarea id="v30_jobAddress">${safeText(state.jobAddress)}</textarea>
            <div class="v30-row">
              <div><label>Fence Length Ft</label><input id="v30_fenceLength" type="number" step="0.5" value="${state.fenceLength}"></div>
              <div><label>Section Width Ft</label><input id="v30_sectionWidth" type="number" step="0.5" value="${state.sectionWidth}"></div>
            </div>
            <div class="v30-row">
              <div><label>Style</label><input id="v30_style" value="${safeText(state.style)}"></div>
              <div><label>Color</label><input id="v30_color" value="${safeText(state.color)}"></div>
            </div>
            <label>Height</label><input id="v30_height" value="${safeText(state.height)}">
            <label>Notes</label><textarea id="v30_notes">${safeText(state.notes)}</textarea>
            <div class="v30-actions">
              <button id="v30_addSingle" class="v30-blue">Add Walk Gate</button>
              <button id="v30_addDouble" class="v30-blue">Add Double Driveway Gate</button>
              <button id="v30_clearMap" class="v30-gray">Blank / Clear Map</button>
            </div>
          </div>
          <div class="v30-card">
            <h2>Selected Gate</h2>
            <div id="v30_gateControls">${renderControls()}</div>
          </div>
        </div>
        <div>
          <div class="v30-card">
            <h2>Gate Map</h2>
            <div class="v30-map">${buildMapSvg(false)}</div>
            <p class="v30-small">Blank by default. Add a gate, then drag the orange gate. Red arc/hinge shows swing direction clearly.</p>
          </div>
        </div>
        <div>
          <div class="v30-card">
            <h2>Fence / Gate Picture</h2>
            ${fencePhotoHtml()}
          </div>
          <div class="v30-card">
            <h2>Inventory</h2>
            <div id="v30_inventoryStatus" class="v30-warn">Checking inventory...</div>
          </div>
          <div class="v30-card">
            <h2>Customer Print</h2>
            <div class="v30-actions">
              <button id="v30_printCustomer" class="v30-green">Print Customer Quote</button>
            </div>
            <p class="v30-small">Print includes fence picture, customer map, hinge, swing direction, and gate details.</p>
          </div>
        </div>
      </div>
    `;
    $("v30_addSingle").addEventListener("click", () => addGate("single"));
    $("v30_addDouble").addEventListener("click", () => addGate("double"));
    $("v30_clearMap").addEventListener("click", clearMap);
    ["v30_fenceLength","v30_sectionWidth","v30_style","v30_color","v30_height","v30_customerName","v30_jobAddress","v30_quoteNo","v30_notes"].forEach(id => {
      const e = $(id);
      if(e) e.addEventListener("change", () => { syncFromPanel(); render(); });
    });
    const update = $("v30_updateGate");
    if(update) update.addEventListener("click", updateGate);
    const remove = $("v30_removeGate");
    if(remove) remove.addEventListener("click", removeGate);
    $("v30_printCustomer").addEventListener("click", printCustomer);
    attachDrag();
    inventoryStatus();
  }
  function attachDrag(){
    document.querySelectorAll(".v30-draggable-gate").forEach(el => {
      let dragging = false;
      const gateId = el.getAttribute("data-gate-id");
      el.addEventListener("pointerdown", e => {
        dragging = true;
        state.selectedGateId = gateId;
        try { el.setPointerCapture(e.pointerId); } catch(ex){}
        e.preventDefault();
        save();
      });
      el.addEventListener("pointermove", e => {
        if(!dragging) return;
        const svg = $("v30_gateSvg");
        const g = state.gates.find(x => x.id === gateId);
        if(!svg || !g) return;
        const rect = svg.getBoundingClientRect();
        const viewX = (e.clientX - rect.left) * (1000 / rect.width);
        const center = ftFromX(viewX);
        let start = center - g.width / 2;
        start = Math.max(0, Math.min(Number(state.fenceLength) - g.width, start));
        g.start = Math.round(start * 100) / 100;
        save();
        render();
      });
      el.addEventListener("pointerup", () => dragging = false);
      el.addEventListener("pointercancel", () => dragging = false);
    });
  }
  function printCustomer(){
    syncFromPanel();
    const html = `
      <html>
      <head>
        <title>Customer Fence Quote</title>
        <style>
          body{font-family:Arial,sans-serif;color:#111827;margin:18px;font-size:12px}
          h1{font-size:23px;margin:0 0 8px}
          h2{font-size:16px;margin:12px 0 6px}
          .top{display:grid;grid-template-columns:1.2fr .8fr;gap:12px}
          .box{border:1px solid #d1d5db;border-radius:10px;padding:10px;margin-bottom:10px}
          table{width:100%;border-collapse:collapse}
          td,th{border:1px solid #d1d5db;padding:6px;font-size:11px}
          th{background:#f3f4f6;text-align:left}
          .right{text-align:right}
          svg{width:100%;height:auto;max-height:4in}
          img{max-width:100%;max-height:2.1in;object-fit:contain;border:1px solid #d1d5db;border-radius:8px}
          @page{size:letter portrait;margin:.3in}
        </style>
      </head>
      <body>
        <h1>Fence Quote</h1>
        <div class="top">
          <div class="box">
            <div><b>Quote #:</b> ${safeText(state.quoteNo)}</div>
            <div><b>Customer:</b> ${safeText(state.customerName)}</div>
            <div><b>Address:</b> ${safeText(state.jobAddress)}</div>
            <div><b>Fence:</b> ${safeText(state.style)} | ${safeText(state.color)} | ${safeText(state.height)}</div>
          </div>
          <div class="box">
            <b>Fence / Gate Picture</b>
            ${fencePhotoHtml()}
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
            ${gateRows()}
          </table>
        </div>
        <div class="box">
          <h2>Notes</h2>
          <div>${safeText(state.notes)}</div>
        </div>
      </body>
      </html>
    `;
    const w = window.open("", "_blank");
    if(!w){
      alert("Popup blocked. Allow popups to print customer quote.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
  }
  load();
  window.SageGateCustomerV30 = {
    addGate,
    clearMap,
    printCustomer,
    state,
    show: showV30
  };
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", () => { installTab(); });
  } else {
    installTab();
  }
})();
