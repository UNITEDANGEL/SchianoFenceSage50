/*
Version 14 Quick Quote Dashboard

Goal:
- Keep all tabs/options.
- Add one-screen Quick Quote dashboard for common daily use.
- Quote type, pricing, material/style/color/height, section/post/cap/concrete/gate controls visible together.
- Default cap item = PC55T when available.
*/

function v14InstallQuickQuoteTab() {
  if (document.getElementById("tab-quick")) return;

  const tabs = document.querySelector(".tabs");
  if (tabs) {
    const btn = document.createElement("button");
    btn.className = "tab active";
    btn.textContent = "Quick Quote";
    btn.onclick = function() { showTab("quick", btn); };
    tabs.prepend(btn);

    document.querySelectorAll(".tab").forEach(x => {
      if (x !== btn) x.classList.remove("active");
    });
  }

  const cardBody = document.querySelector(".card-body");
  if (!cardBody) return;

  document.querySelectorAll(".tab-page").forEach(x => x.classList.remove("active"));

  const page = document.createElement("div");
  page.id = "tab-quick";
  page.className = "tab-page active";
  page.innerHTML = `
    <h3>Quick Quote Dashboard</h3>
    <p class="small">Main daily quote screen. Advanced options still remain in the tabs.</p>

    <div class="select-line">
      <h3>Customer / Quote</h3>
      <div class="row">
        <div>
          <label>Customer Name</label>
          <input id="v14CustomerNameQuick" placeholder="Customer name">
        </div>
        <div>
          <label>Sage Customer ID</label>
          <input id="v14CustomerIdQuick" placeholder="CASH">
        </div>
      </div>

      <label>Job Address</label>
      <input id="v14JobAddressQuick" placeholder="Job / ship-to address">

      <div class="row">
        <div>
          <label>Quote Type</label>
          <select id="v14QuoteScopeQuick" onchange="v14SyncFromQuick(); calculateQuote();">
            <option value="materials_only" selected>Materials Only</option>
            <option value="materials_labor">Materials + Labor</option>
            <option value="labor_only">Labor Only</option>
          </select>
        </div>
        <div>
          <label>Price Rule</label>
          <select id="v14PriceRuleQuick" onchange="v14SyncFromQuick(); calculateQuote();">
            <option value="auto" selected>Auto: 1 retail, quantity wholesale</option>
            <option value="retail">Force Retail</option>
            <option value="wholesale">Force Wholesale</option>
            <option value="custom">Custom / Override</option>
          </select>
        </div>
      </div>
    </div>

    <div class="select-line">
      <h3>Fence System</h3>

      <div class="row">
        <div>
          <label>Material</label>
          <select id="v14MaterialQuick" onchange="v14SyncFromQuick(); refreshSystemOptions(); v14DefaultCapPC55T(); calculateQuote();">
            <option value="">Any</option>
            <option value="PVC/Vinyl" selected>PVC / Vinyl</option>
            <option value="Wood">Wood</option>
            <option value="Aluminum">Aluminum</option>
            <option value="Chain Link">Chain Link</option>
          </select>
        </div>
        <div>
          <label>Style</label>
          <select id="v14StyleQuick" onchange="v14SyncFromQuick(); refreshSystemOptions(); v14DefaultCapPC55T(); calculateQuote();"></select>
        </div>
      </div>

      <div class="row3">
        <div>
          <label>Color</label>
          <select id="v14ColorQuick" onchange="v14SyncFromQuick(); refreshSystemOptions(); v14DefaultCapPC55T(); calculateQuote();">
            <option value="">Any</option>
            <option value="White" selected>White</option>
            <option value="Almond">Almond</option>
            <option value="Adobe">Adobe</option>
            <option value="Gray">Gray</option>
            <option value="Black">Black</option>
            <option value="Green">Green</option>
          </select>
        </div>
        <div>
          <label>Height</label>
          <select id="v14HeightQuick" onchange="v14SyncFromQuick(); refreshSystemOptions(); v14DefaultCapPC55T(); calculateQuote();">
            <option value="">Any</option>
            <option value="3">3 ft</option>
            <option value="4">4 ft</option>
            <option value="4.5">54 in / 4.5 ft</option>
            <option value="5">5 ft</option>
            <option value="6" selected>6 ft</option>
            <option value="7">7 ft</option>
            <option value="8">8 ft</option>
          </select>
        </div>
        <div>
          <label>Section Width Ft</label>
          <input id="v14SectionWidthQuick" type="number" min="1" step="0.5" value="8" onchange="v14SyncFromQuick(); calculateQuote();">
        </div>
      </div>

      <label>Section Item</label>
      <select id="v14SectionItemQuick" onchange="v14CopyQuickSelect('v14SectionItemQuick','sectionItem'); calculateQuote();"></select>

      <div class="row">
        <div>
          <label>Line Post Item</label>
          <select id="v14LinePostQuick" onchange="v14CopyQuickSelect('v14LinePostQuick','linePostItem'); calculateQuote();"></select>
        </div>
        <div>
          <label>Corner Post Item</label>
          <select id="v14CornerPostQuick" onchange="v14CopyQuickSelect('v14CornerPostQuick','cornerPostItem'); calculateQuote();"></select>
        </div>
      </div>

      <div class="row">
        <div>
          <label>End Post Item</label>
          <select id="v14EndPostQuick" onchange="v14CopyQuickSelect('v14EndPostQuick','endPostItem'); calculateQuote();"></select>
        </div>
        <div>
          <label>Post Cap Item</label>
          <select id="v14CapQuick" onchange="v14CopyQuickSelect('v14CapQuick','capItem'); calculateQuote();"></select>
        </div>
      </div>

      <div class="notice" style="margin-top:10px;">
        Cap default rule: PC55T is selected automatically when found in inventory.
      </div>
    </div>

    <div class="select-line">
      <h3>Layout Presets / Lengths</h3>

      <div class="row">
        <div>
          <label>Preset Shape</label>
          <select id="v14PresetQuick">
            <option value="straight">Straight</option>
            <option value="l" selected>L-shape</option>
            <option value="u">U-shape</option>
            <option value="box">Box / Rectangle</option>
            <option value="zigzag">Zigzag</option>
          </select>
        </div>
        <div>
          <label>Open / Closed</label>
          <select id="v14ClosedQuick" onchange="v14SyncFromQuick(); rebuildSegments(); draw(); calculateQuote();">
            <option value="open" selected>Open shape</option>
            <option value="closed">Closed shape / full enclosure</option>
          </select>
        </div>
      </div>

      <div class="actions">
        <button class="blue" onclick="v14ApplyQuickPreset()">Load Shape</button>
        <button class="green" onclick="calculateQuote()">Calculate</button>
      </div>

      <div class="small" style="margin-top:8px;">
        Segment lengths are still edited under the drawing. This panel keeps the main quote choices on one screen.
      </div>
    </div>

    <div class="select-line">
      <h3>Gate on Drawing</h3>

      <div class="row">
        <div>
          <label>Gate Segment #</label>
          <input id="v14GateSegmentQuick" type="number" min="1" step="1" value="1">
        </div>
        <div>
          <label>Position %</label>
          <input id="v14GatePositionQuick" type="number" min="0" max="100" step="1" value="50">
        </div>
      </div>

      <div class="row">
        <div>
          <label>Gate Width Ft</label>
          <input id="v14GateWidthQuick" type="number" min="1" step="0.5" value="4" onchange="v14SyncGateQuick(); v13RefreshGateItems();">
        </div>
        <div>
          <label>Gate Color</label>
          <select id="v14GateColorQuick" onchange="v14SyncGateQuick(); v13RefreshGateItems();">
            <option value="">Use Fence Color</option>
            <option value="White">White</option>
            <option value="Almond">Almond</option>
            <option value="Adobe">Adobe</option>
            <option value="Gray">Gray</option>
            <option value="Black">Black</option>
            <option value="Green">Green</option>
          </select>
        </div>
      </div>

      <label>Matching Gate Item</label>
      <select id="v14GateItemQuick" onchange="v14CopyQuickSelect('v14GateItemQuick','v13GateItem');"></select>

      <div class="actions">
        <button class="blue" onclick="v14RefreshQuickGateItems()">Refresh Gate Items</button>
        <button class="green" onclick="v14AddQuickGate()">Add Gate to Drawing</button>
      </div>
    </div>

    <div class="select-line">
      <h3>Print / Export</h3>
      <div class="actions">
        <button class="green" onclick="calculateQuote()">Refresh Quote</button>
        <button class="blue" onclick="exportSageCsv()">Export Sage Quote CSV</button>
        <button class="orange" onclick="v12PrintCustomerQuote()">Print Customer Quote</button>
        <button class="gray" onclick="exportJobJson()">Export Job JSON</button>
      </div>
    </div>
  `;

  cardBody.prepend(page);
}

function v14SyncFromQuick() {
  const pairs = [
    ["v14CustomerNameQuick", "customerName"],
    ["v14CustomerIdQuick", "customerId"],
    ["v14JobAddressQuick", "jobAddress"],
    ["v14QuoteScopeQuick", "v8QuoteScopeSystem"],
    ["v14QuoteScopeQuick", "v7QuoteScope"],
    ["v14PriceRuleQuick", "v7DefaultPriceRule"],
    ["v14MaterialQuick", "systemMaterial"],
    ["v14StyleQuick", "systemStyle"],
    ["v14ColorQuick", "systemColor"],
    ["v14HeightQuick", "systemHeight"],
    ["v14SectionWidthQuick", "sectionWidthFt"],
    ["v14ClosedQuick", "layoutClosed"]
  ];

  pairs.forEach(([from, to]) => {
    const a = document.getElementById(from);
    const b = document.getElementById(to);
    if (a && b) b.value = a.value;
  });

  if (typeof v8SyncScope === "function") v8SyncScope();
  if (typeof v9SyncDepositRule === "function") v9SyncDepositRule();
}

function v14SyncToQuick() {
  const pairs = [
    ["customerName", "v14CustomerNameQuick"],
    ["customerId", "v14CustomerIdQuick"],
    ["jobAddress", "v14JobAddressQuick"],
    ["v8QuoteScopeSystem", "v14QuoteScopeQuick"],
    ["v7DefaultPriceRule", "v14PriceRuleQuick"],
    ["systemMaterial", "v14MaterialQuick"],
    ["systemStyle", "v14StyleQuick"],
    ["systemColor", "v14ColorQuick"],
    ["systemHeight", "v14HeightQuick"],
    ["sectionWidthFt", "v14SectionWidthQuick"],
    ["layoutClosed", "v14ClosedQuick"]
  ];

  pairs.forEach(([from, to]) => {
    const a = document.getElementById(from);
    const b = document.getElementById(to);
    if (a && b) b.value = a.value;
  });
}

function v14CopyOptions(fromId, toId) {
  const from = document.getElementById(fromId);
  const to = document.getElementById(toId);
  if (!from || !to) return;

  const old = to.value;
  to.innerHTML = from.innerHTML;
  if ([...to.options].some(o => o.value === old)) to.value = old;
}

function v14CopyQuickSelect(fromId, toId) {
  const from = document.getElementById(fromId);
  const to = document.getElementById(toId);
  if (!from || !to) return;

  to.value = from.value;
}

function v14RefreshQuickSelects() {
  v14CopyOptions("sectionItem", "v14SectionItemQuick");
  v14CopyOptions("linePostItem", "v14LinePostQuick");
  v14CopyOptions("cornerPostItem", "v14CornerPostQuick");
  v14CopyOptions("endPostItem", "v14EndPostQuick");
  v14CopyOptions("capItem", "v14CapQuick");

  v14DefaultCapPC55T();
}

function v14PopulateQuickStyles() {
  const source = document.getElementById("systemStyle");
  const target = document.getElementById("v14StyleQuick");
  if (!source || !target) return;

  const old = target.value || source.value;
  target.innerHTML = source.innerHTML;

  if ([...target.options].some(o => o.value === old)) {
    target.value = old;
  } else {
    const lakeland = [...target.options].find(o => String(o.value).toLowerCase() === "lakeland");
    if (lakeland) target.value = lakeland.value;
  }

  document.getElementById("systemStyle").value = target.value;
}

function v14DefaultCapPC55T() {
  const cap = document.getElementById("capItem");
  const quick = document.getElementById("v14CapQuick");

  [cap, quick].forEach(sel => {
    if (!sel) return;

    const pc55t = [...sel.options].find(o => String(o.value).toUpperCase() === "PC55T" || String(o.textContent).toUpperCase().includes("PC55T"));

    if (pc55t) {
      sel.value = pc55t.value;
    }
  });

  if (cap && quick) {
    quick.value = cap.value;
  }
}

function v14PatchRefreshSystemOptions() {
  if (window.v14OriginalRefreshSystemOptions || typeof window.refreshSystemOptions !== "function") return;

  window.v14OriginalRefreshSystemOptions = window.refreshSystemOptions;

  window.refreshSystemOptions = function() {
    window.v14OriginalRefreshSystemOptions();

    v14PopulateQuickStyles();
    v14RefreshQuickSelects();
    v14DefaultCapPC55T();

    if (typeof v13RefreshGateItems === "function") {
      v13RefreshGateItems();
      v14RefreshQuickGateItems();
    }
  };
}

function v14ApplyQuickPreset() {
  const preset = document.getElementById("v14PresetQuick")?.value || "l";
  const shape = document.getElementById("presetShape");
  if (shape) shape.value = preset;

  v14SyncFromQuick();

  if (typeof applyPresetShapeValue === "function") {
    applyPresetShapeValue(preset);
  } else if (typeof applyPresetShape === "function") {
    applyPresetShape();
  }

  if (typeof calculateQuote === "function") calculateQuote();
}

function v14SyncGateQuick() {
  const pairs = [
    ["v14GateSegmentQuick", "v13GateSegment"],
    ["v14GatePositionQuick", "v13GatePositionPct"],
    ["v14GateWidthQuick", "v13GateWidthFt"],
    ["v14GateColorQuick", "v13GateColor"]
  ];

  pairs.forEach(([from, to]) => {
    const a = document.getElementById(from);
    const b = document.getElementById(to);
    if (a && b) b.value = a.value;
  });
}

function v14RefreshQuickGateItems() {
  v14SyncGateQuick();

  if (typeof v13RefreshGateItems === "function") v13RefreshGateItems();

  const from = document.getElementById("v13GateItem");
  const to = document.getElementById("v14GateItemQuick");

  if (from && to) {
    const old = to.value;
    to.innerHTML = from.innerHTML;
    if ([...to.options].some(o => o.value === old)) to.value = old;
  }
}

function v14AddQuickGate() {
  v14SyncGateQuick();
  v14CopyQuickSelect("v14GateItemQuick", "v13GateItem");

  if (typeof v13AddGateToDrawing === "function") {
    v13AddGateToDrawing();
  } else {
    alert("Gate drawing module is not loaded yet.");
  }

  if (typeof calculateQuote === "function") calculateQuote();
}

function v14PatchCalculateToSyncQuick() {
  if (window.v14OriginalCalculateQuote || typeof window.calculateQuote !== "function") return;

  window.v14OriginalCalculateQuote = window.calculateQuote;

  window.calculateQuote = function() {
    v14SyncFromQuick();
    window.v14OriginalCalculateQuote();
    v14SyncToQuick();
  };
}

function v14MoveCommonDefaults() {
  const q = document.getElementById("v14QuoteScopeQuick");
  if (q) q.value = "materials_only";

  const p = document.getElementById("v14PriceRuleQuick");
  if (p) p.value = "auto";

  const m = document.getElementById("v14MaterialQuick");
  if (m) m.value = "PVC/Vinyl";

  const c = document.getElementById("v14ColorQuick");
  if (c) c.value = "White";

  const h = document.getElementById("v14HeightQuick");
  if (h) h.value = "6";

  v14SyncFromQuick();
}

document.addEventListener("DOMContentLoaded", function() {
  setTimeout(function() {
    v14InstallQuickQuoteTab();
    v14PatchRefreshSystemOptions();
    v14PatchCalculateToSyncQuick();
    v14MoveCommonDefaults();

    if (typeof populateStyleList === "function") populateStyleList();
    if (typeof refreshSystemOptions === "function") refreshSystemOptions();

    v14PopulateQuickStyles();
    v14RefreshQuickSelects();
    v14DefaultCapPC55T();
    v14RefreshQuickGateItems();

    if (typeof calculateQuote === "function") calculateQuote();
  }, 4300);
});
