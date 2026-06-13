(function () {
  "use strict";
  const KEY = "sage50_gate_map_customer_v31";
  let state = {
    gates: [],
    selected: null,
    fenceLength: 48,
    sectionWidth: 8,
    style: "Lakeland",
    color: "White",
    height: "4 ft"
  };
  function $(id){ return document.getElementById(id); }
  function load(){
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
      Object.assign(state, saved);
      if (!Array.isArray(state.gates)) state.gates = [];
    } catch(e){}
  }
  function save(){
    localStorage.setItem(KEY, JSON.stringify(state));
  }
  function num(id, fallback){
    const e = $(id);
    const n = e ? Number(e.value) : fallback;
    return isNaN(n) ? fallback : n;
  }
  function text(id, fallback){
    const e = $(id);
    return e ? e.value : fallback;
  }
  function esc(s){
    return String(s || "").replace(/[<>&"]/g, function(c){
      return {"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c];
    });
  }
  function syncInputs(){
    if ($("v31_len")) state.fenceLength = Math.max(1, num("v31_len", 48));
    if ($("v31_sec")) state.sectionWidth = Math.max(1, num("v31_sec", 8));
    if ($("v31_style")) state.style = text("v31_style", "Lakeland");
    if ($("v31_color")) state.color = text("v31_color", "White");
    if ($("v31_height")) state.height = text("v31_height", "4 ft");
    for (const g of state.gates) {
      if (g.width > state.fenceLength) g.width = state.fenceLength;
      if (g.start + g.width > state.fenceLength) g.start = Math.max(0, state.fenceLength - g.width);
    }
    save();
  }
  function selectedGate(){
    return state.gates.find(g => g.id === state.selected) || state.gates[0] || null;
  }
  function addGate(type){
    syncInputs();
    const width = type === "double" ? 10 : 4;
    const len = state.fenceLength;
    const g = {
      id: "g" + Date.now(),
      type: type,
      width: Math.min(width, len),
      start: Math.max(0, Math.min(len - width, 2)),
      swing: "outswing_left"
    };
    state.gates.push(g);
    state.selected = g.id;
    save();
    render();
  }
  function clearMap(){
    state.gates = [];
    state.selected = null;
    save();
    render();
  }
  function removeGate(){
    const g = selectedGate();
    if (!g) return;
    state.gates = state.gates.filter(x => x.id !== g.id);
    state.selected = state.gates[0] ? state.gates[0].id : null;
    save();
    render();
  }
  function updateGate(){
    const g = selectedGate();
    if (!g) return;
    g.type = text("v31_gate_type", g.type);
    g.width = Math.max(1, Math.min(state.fenceLength, num("v31_gate_width", g.width)));
    g.start = Math.max(0, Math.min(state.fenceLength - g.width, num("v31_gate_start", g.start)));
    g.swing = text("v31_gate_swing", g.swing);
    save();
    render();
  }
  function sectionText(length){
    const sw = state.sectionWidth;
    const full = Math.floor(length / sw);
    const rem = Math.round((length - full * sw) * 100) / 100;
    if (full === 0 && rem > 0) return rem + "' cut";
    if (rem > 0) return full + " x " + sw + "' + " + rem + "' cut";
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
  function xFromFt(ft){
    return 70 + (ft / state.fenceLength) * 860;
  }
  function ftFromX(x){
    const t = Math.max(0, Math.min(1, (x - 70) / 860));
    return t * state.fenceLength;
  }
  function mapSvg(){
    let out = `
      <svg id="v31_svg" viewBox="0 0 1000 400" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="v31_arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#dc2626"></path>
          </marker>
        </defs>
        <rect width="1000" height="400" fill="white"></rect>
        <text x="500" y="30" text-anchor="middle" font-family="Arial" font-size="21" font-weight="900">Customer Fence Map</text>
        <text x="500" y="55" text-anchor="middle" font-family="Arial" font-size="13">${esc(state.style)} | ${esc(state.color)} | ${esc(state.height)} | ${state.fenceLength} ft</text>
    `;
    if (!state.gates.length) {
      out += `
        <rect x="70" y="115" width="860" height="150" rx="14" fill="#f9fafb" stroke="#cbd5e1" stroke-dasharray="9 6"></rect>
        <text x="500" y="170" text-anchor="middle" font-family="Arial" font-size="22" font-weight="900" fill="#6b7280">Blank Map</text>
        <text x="500" y="205" text-anchor="middle" font-family="Arial" font-size="14" fill="#6b7280">Click Add Walk Gate or Add Double Driveway Gate.</text>
      </svg>`;
      return out;
    }
    const y = 190;
    out += `<line x1="70" y1="${y}" x2="930" y2="${y}" stroke="#111827" stroke-width="8" stroke-linecap="round"></line>`;
    for (const g of state.gates) {
      const x1 = xFromFt(g.start);
      const x2 = xFromFt(g.start + g.width);
      const mid = (x1 + x2) / 2;
      const isIn = g.swing.indexOf("in") === 0;
      const isLeft = g.swing.indexOf("left") > -1;
      const side = isIn ? 1 : -1;
      const hingeX = isLeft ? x1 : x2;
      const gatePx = Math.abs(x2 - x1);
      const openY = y + side * Math.min(115, Math.max(55, gatePx));
      const arcCX = hingeX + (isLeft ? gatePx * .55 : -gatePx * .55);
      const arcCY = y + side * Math.min(95, Math.max(35, gatePx * .85));
      const selected = g.id === state.selected;
      const left = Math.max(0, g.start);
      const right = Math.max(0, state.fenceLength - (g.start + g.width));
      const swingWord = isIn ? "IN SWING" : "OUT SWING";
      const labelY = isIn ? y + 135 : y - 120;
      out += `
        <rect x="${x1}" y="${y-26}" width="${x2-x1}" height="52" fill="white"></rect>
        <circle cx="${hingeX}" cy="${y}" r="10" fill="#dc2626"></circle>
        <text x="${hingeX}" y="${y + 30}" text-anchor="middle" font-family="Arial" font-size="11" font-weight="900" fill="#dc2626">HINGE</text>
        <path d="M ${hingeX} ${y} Q ${arcCX} ${arcCY} ${hingeX} ${openY}" fill="none" stroke="#dc2626" stroke-width="6" marker-end="url(#v31_arrow)"></path>
        <line x1="${hingeX}" y1="${y}" x2="${hingeX}" y2="${openY}" stroke="#dc2626" stroke-width="5"></line>
        <text x="${mid}" y="${labelY}" text-anchor="middle" font-family="Arial" font-size="18" font-weight="900" fill="#dc2626">${swingWord}</text>
        <g class="v31_gate_drag" data-id="${g.id}" style="cursor:grab">
          <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#f97316" stroke-width="${selected ? 26 : 19}" stroke-linecap="round"></line>
          <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#7c2d12" stroke-width="2"></line>
          <circle cx="${x1}" cy="${y}" r="7" fill="#7c2d12"></circle>
          <circle cx="${x2}" cy="${y}" r="7" fill="#7c2d12"></circle>
        </g>
        <text x="${mid}" y="${y+55}" text-anchor="middle" font-family="Arial" font-size="14" font-weight="900" fill="#7c2d12">${g.width}' ${g.type === "double" ? "DOUBLE GATE" : "GATE"}</text>
        <text x="${mid}" y="${y+76}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="900" fill="#dc2626">${swingLabel(g.swing)}</text>
        <text x="${Math.max(125,(70+x1)/2)}" y="${y-35}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="800" fill="#1e3a8a">${left > 0 ? sectionText(left) : ""}</text>
        <text x="${Math.min(875,(x2+930)/2)}" y="${y-35}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="800" fill="#1e3a8a">${right > 0 ? sectionText(right) : ""}</text>
      `;
    }
    out += `<text x="70" y="370" font-family="Arial" font-size="12" fill="#4b5563">Drag orange gate. Red dot is hinge. Red arc shows swing.</text></svg>`;
    return out;
  }
  function photoHtml(){
    return `
      <img src="../catalog_images/White-4-ft-Lakeland-with-single-gate.jpg" style="width:100%;max-height:215px;object-fit:contain;border:1px solid #d1d5db;border-radius:10px;background:white"
      onerror="this.style.display='none';this.parentElement.insertAdjacentHTML('beforeend','<div style=&quot;border:1px solid #d1d5db;border-radius:10px;padding:20px;text-align:center&quot;>Fence / gate picture</div>')">
    `;
  }
  function controlsHtml(){
    const g = selectedGate();
    if (!g) return `<div class="v31_warn">No gate added. Map is blank by default.</div>`;
    return `
      <div class="v31_row">
        <div>
          <label>Gate Type</label>
          <select id="v31_gate_type">
            <option value="single" ${g.type === "single" ? "selected" : ""}>Single Walk Gate</option>
            <option value="double" ${g.type === "double" ? "selected" : ""}>Double Driveway Gate</option>
          </select>
        </div>
        <div>
          <label>Gate Width Ft</label>
          <input id="v31_gate_width" type="number" step="0.5" value="${g.width}">
        </div>
      </div>
      <div class="v31_row">
        <div>
          <label>Gate Start Ft</label>
          <input id="v31_gate_start" type="number" step="0.5" value="${g.start}">
        </div>
        <div>
          <label>Gate Swing</label>
          <select id="v31_gate_swing">
            <option value="outswing_left" ${g.swing === "outswing_left" ? "selected" : ""}>Outswing Left</option>
            <option value="outswing_right" ${g.swing === "outswing_right" ? "selected" : ""}>Outswing Right</option>
            <option value="inswing_left" ${g.swing === "inswing_left" ? "selected" : ""}>Inswing Left</option>
            <option value="inswing_right" ${g.swing === "inswing_right" ? "selected" : ""}>Inswing Right</option>
          </select>
        </div>
      </div>
      <div class="v31_actions">
        <button data-v31="update" class="v31_blue">Update Gate</button>
        <button data-v31="remove" class="v31_red">Remove Gate</button>
      </div>
    `;
  }
  function printCustomer(){
    syncInputs();
    const rows = state.gates.length ? state.gates.map(g => `
      <tr><td>${g.type === "double" ? "Double Driveway Gate" : "Single Walk Gate"}</td><td>${g.width}'</td><td>${g.start}' from start</td><td>${swingLabel(g.swing)}</td></tr>
    `).join("") : `<tr><td colspan="4">No gate added.</td></tr>`;
    const w = window.open("", "_blank");
    if (!w) {
      alert("Popup blocked. Allow popups.");
      return;
    }
    w.document.write(`
      <html>
      <head>
        <title>Customer Fence Quote</title>
        <style>
          body{font-family:Arial,sans-serif;margin:18px;color:#111827;font-size:12px}
          h1{font-size:23px;margin:0 0 8px}
          h2{font-size:16px;margin:12px 0 6px}
          .top{display:grid;grid-template-columns:1.2fr .8fr;gap:12px}
          .box{border:1px solid #d1d5db;border-radius:10px;padding:10px;margin-bottom:10px}
          table{width:100%;border-collapse:collapse}
          td,th{border:1px solid #d1d5db;padding:6px;font-size:11px}
          th{background:#f3f4f6;text-align:left}
          svg{width:100%;height:auto;max-height:4in}
          img{max-width:100%;max-height:2.1in;object-fit:contain}
          @page{size:letter portrait;margin:.3in}
        </style>
      </head>
      <body>
        <h1>Fence Quote</h1>
        <div class="top">
          <div class="box">
            <div><b>Fence:</b> ${esc(state.style)} | ${esc(state.color)} | ${esc(state.height)}</div>
            <div><b>Fence Length:</b> ${state.fenceLength} ft</div>
          </div>
          <div class="box"><b>Fence / Gate Picture</b>${photoHtml()}</div>
        </div>
        <div class="box"><h2>Customer Map</h2>${mapSvg()}</div>
        <div class="box">
          <h2>Gate Details</h2>
          <table><tr><th>Gate</th><th>Width</th><th>Location</th><th>Swing</th></tr>${rows}</table>
        </div>
      </body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
  }
  function render(){
    let page = $("v31_page");
    if (!page) return;
    page.innerHTML = `
      <div class="v31_wrap">
        <div>
          <div class="v31_card">
            <h2>Fence / Gate Controls</h2>
            <div class="v31_row">
              <div><label>Fence Length Ft</label><input id="v31_len" type="number" step="0.5" value="${state.fenceLength}"></div>
              <div><label>Section Width Ft</label><input id="v31_sec" type="number" step="0.5" value="${state.sectionWidth}"></div>
            </div>
            <div class="v31_row">
              <div><label>Style</label><input id="v31_style" value="${esc(state.style)}"></div>
              <div><label>Color</label><input id="v31_color" value="${esc(state.color)}"></div>
            </div>
            <label>Height</label><input id="v31_height" value="${esc(state.height)}">
            <div class="v31_actions">
              <button data-v31="add-single" class="v31_blue">Add Walk Gate</button>
              <button data-v31="add-double" class="v31_blue">Add Double Driveway Gate</button>
              <button data-v31="clear" class="v31_gray">Blank / Clear Map</button>
            </div>
          </div>
          <div class="v31_card">
            <h2>Selected Gate</h2>
            ${controlsHtml()}
          </div>
        </div>
        <div>
          <div class="v31_card">
            <h2>Gate Map</h2>
            ${mapSvg()}
          </div>
        </div>
        <div>
          <div class="v31_card">
            <h2>Fence / Gate Picture</h2>
            ${photoHtml()}
          </div>
          <div class="v31_card">
            <h2>Customer Print</h2>
            <button data-v31="print" class="v31_green">Print Customer Quote</button>
          </div>
          <div class="v31_card">
            <h2>Status</h2>
            <div class="v31_ok">Gate module loaded. Gates: ${state.gates.length}</div>
          </div>
        </div>
      </div>
    `;
  }
  function install(){
    if ($("v31_page")) return;
    const style = document.createElement("style");
    style.textContent = `
      #v31_page{display:none;background:#eef2f7;padding:14px;font-family:Arial,sans-serif;color:#111827}
      #v31_page.active{display:block}
      .v31_wrap{display:grid;grid-template-columns:360px 1fr 360px;gap:12px;max-width:1500px;margin:0 auto}
      .v31_card{background:white;border:1px solid #d1d5db;border-radius:14px;padding:12px;box-shadow:0 1px 5px rgba(0,0,0,.08);margin-bottom:12px}
      .v31_card h2{font-size:17px;margin:0 0 8px}
      .v31_row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .v31_card label{display:block;font-size:12px;font-weight:900;margin-top:7px;color:#374151}
      .v31_card input,.v31_card select{width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px;font-size:14px}
      .v31_actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      .v31_actions button,.v31_card button,#v31_btn{border:0;border-radius:9px;padding:10px 12px;font-weight:900;cursor:pointer}
      .v31_blue{background:#2563eb;color:white}.v31_green{background:#047857;color:white}.v31_red{background:#dc2626;color:white}.v31_gray{background:#4b5563;color:white}
      .v31_ok{background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;padding:8px;border-radius:10px;font-size:12px}
      .v31_warn{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;padding:8px;border-radius:10px;font-size:12px}
      #v31_page svg{width:100%;height:auto;background:white;border:1px solid #d1d5db;border-radius:14px}
      @media(max-width:1100px){.v31_wrap{grid-template-columns:1fr}}
      @media print{#v31_page,#v31_btn{display:none!important}}
    `;
    document.head.appendChild(style);
    let nav = document.querySelector(".nav");
    if (!nav) {
      nav = document.createElement("div");
      nav.className = "nav";
      nav.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;background:#e5e7eb;padding:10px 14px;border-bottom:1px solid #cbd5e1";
      document.body.insertBefore(nav, document.body.firstChild);
    }
    const btn = document.createElement("button");
    btn.id = "v31_btn";
    btn.textContent = "Gate Map + Customer Print";
    btn.style.background = "#047857";
    btn.style.color = "white";
    nav.appendChild(btn);
    const page = document.createElement("section");
    page.id = "v31_page";
    document.body.appendChild(page);
    render();
  }
  document.addEventListener("click", function(e){
    const action = e.target && e.target.getAttribute("data-v31");
    if (!action) return;
    e.preventDefault();
    if (action === "add-single") addGate("single");
    if (action === "add-double") addGate("double");
    if (action === "clear") clearMap();
    if (action === "update") updateGate();
    if (action === "remove") removeGate();
    if (action === "print") printCustomer();
  });
  document.addEventListener("change", function(e){
    if (!e.target || !String(e.target.id || "").startsWith("v31_")) return;
    syncInputs();
    render();
  });
  let dragging = false;
  let dragId = null;
  document.addEventListener("pointerdown", function(e){
    const gate = e.target.closest ? e.target.closest(".v31_gate_drag") : null;
    if (!gate) return;
    dragging = true;
    dragId = gate.getAttribute("data-id");
    state.selected = dragId;
    try { gate.setPointerCapture(e.pointerId); } catch(ex){}
    save();
  });
  document.addEventListener("pointermove", function(e){
    if (!dragging || !dragId) return;
    const svg = $("v31_svg");
    const g = state.gates.find(x => x.id === dragId);
    if (!svg || !g) return;
    const rect = svg.getBoundingClientRect();
    const viewX = (e.clientX - rect.left) * (1000 / rect.width);
    const center = ftFromX(viewX);
    let start = center - g.width / 2;
    start = Math.max(0, Math.min(state.fenceLength - g.width, start));
    g.start = Math.round(start * 100) / 100;
    save();
    render();
  });
  document.addEventListener("pointerup", function(){ dragging = false; dragId = null; });
  document.addEventListener("pointercancel", function(){ dragging = false; dragId = null; });
  document.addEventListener("click", function(e){
    if (e.target && e.target.id === "v31_btn") {
      document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
      $("v31_page").classList.add("active");
      render();
      window.scrollTo(0,0);
    }
  });
  load();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }
  window.SageGateV31 = { state, addGate, clearMap, render };
})();
