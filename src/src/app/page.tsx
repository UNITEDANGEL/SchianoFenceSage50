"use client";
import { useEffect, useMemo, useState } from "react";
type GateType = "single" | "double";
type Swing = "outswing_left" | "outswing_right" | "inswing_left" | "inswing_right";
type Gate = {
  id: string;
  type: GateType;
  width: number;
  start: number;
  swing: Swing;
};
type InventoryItem = {
  ItemID?: string;
  "Item ID"?: string;
  Description?: string;
  "RETAIL 1"?: number | string;
  LastUnitCost?: number | string;
  [key: string]: unknown;
};
const swingLabels: Record<Swing, string> = {
  outswing_left: "Outswing Left",
  outswing_right: "Outswing Right",
  inswing_left: "Inswing Left",
  inswing_right: "Inswing Right"
};
function money(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function sectionText(length: number, sectionWidth: number) {
  const full = Math.floor(length / sectionWidth);
  const rem = Math.round((length - full * sectionWidth) * 100) / 100;
  if (full === 0 && rem > 0) return `${rem}' cut`;
  if (rem > 0) return `${full} x ${sectionWidth}' + ${rem}' cut`;
  return `${full} x ${sectionWidth}'`;
}
function imagePath(gates: Gate[]) {
  const hasDouble = gates.some((g) => g.type === "double");
  return hasDouble
    ? "/images/Lakeland-double-gate-danny-oubre-2-1.jpg"
    : "/images/White-4-ft-Lakeland-with-single-gate.jpg";
}
function buildQuoteRows(gates: Gate[], fenceLength: number, sectionWidth: number, inventory: InventoryItem[]) {
  const sections = Math.ceil(fenceLength / sectionWidth);
  const posts = sections + 1;
  const rows = [
    {
      description: "Fence sections",
      qty: sections,
      unit: 0,
      total: 0
    },
    {
      description: "5x5 PVC posts",
      qty: posts,
      unit: 0,
      total: 0
    },
    {
      description: "PC55T post caps",
      qty: posts,
      unit: 0,
      total: 0
    },
    ...gates.map((g) => ({
      description: g.type === "double" ? "Double driveway gate" : "Single walk gate",
      qty: 1,
      unit: 0,
      total: 0
    }))
  ];
  const gateRetail = inventory.find((x) => String(x.Description || "").toLowerCase().includes("gate"));
  const retailRaw = gateRetail?.["RETAIL 1"];
  const retail = typeof retailRaw === "number" ? retailRaw : Number(String(retailRaw || "0").replace(/[$,]/g, ""));
  return rows.map((row) => {
    if (row.description.toLowerCase().includes("gate") && retail > 0) {
      return { ...row, unit: retail, total: retail * row.qty };
    }
    return row;
  });
}
function GateMap({
  gates,
  selectedGateId,
  fenceLength,
  sectionWidth,
  styleName,
  color,
  height,
  setSelectedGateId,
  updateGateStart
}: {
  gates: Gate[];
  selectedGateId: string | null;
  fenceLength: number;
  sectionWidth: number;
  styleName: string;
  color: string;
  height: string;
  setSelectedGateId: (id: string) => void;
  updateGateStart: (id: string, start: number) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const xFromFt = (ft: number) => 70 + (ft / fenceLength) * 860;
  const ftFromX = (x: number) => {
    const t = Math.max(0, Math.min(1, (x - 70) / 860));
    return t * fenceLength;
  };
  function pointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragId) return;
    const gate = gates.find((g) => g.id === dragId);
    if (!gate) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const viewX = (e.clientX - rect.left) * (1000 / rect.width);
    const center = ftFromX(viewX);
    let start = center - gate.width / 2;
    start = Math.max(0, Math.min(fenceLength - gate.width, start));
    updateGateStart(dragId, Math.round(start * 100) / 100);
  }
  return (
    <svg
      viewBox="0 0 1000 400"
      onPointerMove={pointerMove}
      onPointerUp={() => setDragId(null)}
      onPointerCancel={() => setDragId(null)}
    >
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
          <path d="M0,0 L0,6 L9,3 z" fill="#dc2626" />
        </marker>
      </defs>
      <rect width="1000" height="400" fill="white" />
      <text x="500" y="30" textAnchor="middle" fontFamily="Arial" fontSize="21" fontWeight="900">
        Customer Fence Map
      </text>
      <text x="500" y="55" textAnchor="middle" fontFamily="Arial" fontSize="13">
        {styleName} | {color} | {height} | {fenceLength} ft
      </text>
      {gates.length === 0 ? (
        <>
          <rect x="70" y="115" width="860" height="150" rx="14" fill="#f9fafb" stroke="#cbd5e1" strokeDasharray="9 6" />
          <text x="500" y="170" textAnchor="middle" fontFamily="Arial" fontSize="22" fontWeight="900" fill="#6b7280">
            Blank Map
          </text>
          <text x="500" y="205" textAnchor="middle" fontFamily="Arial" fontSize="14" fill="#6b7280">
            Click Add Walk Gate or Add Double Driveway Gate.
          </text>
        </>
      ) : (
        <>
          <line x1="70" y1="190" x2="930" y2="190" stroke="#111827" strokeWidth="8" strokeLinecap="round" />
          {gates.map((gate) => {
            const y = 190;
            const x1 = xFromFt(gate.start);
            const x2 = xFromFt(gate.start + gate.width);
            const mid = (x1 + x2) / 2;
            const isIn = gate.swing.startsWith("in");
            const isLeft = gate.swing.includes("left");
            const side = isIn ? 1 : -1;
            const hingeX = isLeft ? x1 : x2;
            const gatePx = Math.abs(x2 - x1);
            const openY = y + side * Math.min(115, Math.max(55, gatePx));
            const arcCX = hingeX + (isLeft ? gatePx * 0.55 : -gatePx * 0.55);
            const arcCY = y + side * Math.min(95, Math.max(35, gatePx * 0.85));
            const selected = gate.id === selectedGateId;
            const leftLen = Math.max(0, gate.start);
            const rightLen = Math.max(0, fenceLength - (gate.start + gate.width));
            const labelY = isIn ? y + 135 : y - 120;
            return (
              <g key={gate.id}>
                <rect x={x1} y={y - 26} width={x2 - x1} height="52" fill="white" />
                <circle cx={hingeX} cy={y} r="10" fill="#dc2626" />
                <text x={hingeX} y={y + 30} textAnchor="middle" fontFamily="Arial" fontSize="11" fontWeight="900" fill="#dc2626">
                  HINGE
                </text>
                <path
                  d={`M ${hingeX} ${y} Q ${arcCX} ${arcCY} ${hingeX} ${openY}`}
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="6"
                  markerEnd="url(#arrow)"
                />
                <line x1={hingeX} y1={y} x2={hingeX} y2={openY} stroke="#dc2626" strokeWidth="5" />
                <text x={mid} y={labelY} textAnchor="middle" fontFamily="Arial" fontSize="18" fontWeight="900" fill="#dc2626">
                  {isIn ? "IN SWING" : "OUT SWING"}
                </text>
                <g
                  style={{ cursor: "grab" }}
                  onPointerDown={(e) => {
                    setSelectedGateId(gate.id);
                    setDragId(gate.id);
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                >
                  <line x1={x1} y1={y} x2={x2} y2={y} stroke="#f97316" strokeWidth={selected ? 26 : 19} strokeLinecap="round" />
                  <line x1={x1} y1={y} x2={x2} y2={y} stroke="#7c2d12" strokeWidth="2" />
                  <circle cx={x1} cy={y} r="7" fill="#7c2d12" />
                  <circle cx={x2} cy={y} r="7" fill="#7c2d12" />
                </g>
                <text x={mid} y={y + 55} textAnchor="middle" fontFamily="Arial" fontSize="14" fontWeight="900" fill="#7c2d12">
                  {gate.width}' {gate.type === "double" ? "DOUBLE GATE" : "GATE"}
                </text>
                <text x={mid} y={y + 76} textAnchor="middle" fontFamily="Arial" fontSize="12" fontWeight="900" fill="#dc2626">
                  {swingLabels[gate.swing]}
                </text>
                <text x={Math.max(125, (70 + x1) / 2)} y={y - 35} textAnchor="middle" fontFamily="Arial" fontSize="12" fontWeight="800" fill="#1e3a8a">
                  {leftLen > 0 ? sectionText(leftLen, sectionWidth) : ""}
                </text>
                <text x={Math.min(875, (x2 + 930) / 2)} y={y - 35} textAnchor="middle" fontFamily="Arial" fontSize="12" fontWeight="800" fill="#1e3a8a">
                  {rightLen > 0 ? sectionText(rightLen, sectionWidth) : ""}
                </text>
              </g>
            );
          })}
          <text x="70" y="370" fontFamily="Arial" fontSize="12" fill="#4b5563">
            Drag orange gate. Red dot is hinge. Red arc shows swing.
          </text>
        </>
      )}
    </svg>
  );
}
export default function Page() {
  const [tab, setTab] = useState("quote");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [fenceLength, setFenceLength] = useState(48);
  const [sectionWidth, setSectionWidth] = useState(8);
  const [styleName, setStyleName] = useState("Lakeland");
  const [color, setColor] = useState("White");
  const [height, setHeight] = useState("4 ft");
  const [quoteType, setQuoteType] = useState("materials_only");
  const [pricingMode, setPricingMode] = useState("auto");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customerName, setCustomerName] = useState("");
  const [jobAddress, setJobAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [gates, setGates] = useState<Gate[]>([]);
  const [selectedGateId, setSelectedGateId] = useState<string | null>(null);
  useEffect(() => {
    fetch("/data/schiano_inventory_items.json")
      .then((res) => res.json())
      .then((data) => setInventory(Array.isArray(data) ? data : data.items || []))
      .catch(() => setInventory([]));
  }, []);
  const selectedGate = gates.find((g) => g.id === selectedGateId) || gates[0] || null;
  const rows = useMemo(
    () => buildQuoteRows(gates, fenceLength, sectionWidth, inventory),
    [gates, fenceLength, sectionWidth, inventory]
  );
  const subtotal = rows.reduce((sum, row) => sum + row.total, 0);
  const cardFee = paymentMethod === "credit_card" ? subtotal * 0.035 : 0;
  const total = subtotal + cardFee;
  function addGate(type: GateType) {
    const width = type === "double" ? 10 : 4;
    const gate: Gate = {
      id: `gate_${Date.now()}`,
      type,
      width: Math.min(width, fenceLength),
      start: Math.max(0, Math.min(fenceLength - width, 2)),
      swing: "outswing_left"
    };
    setGates((prev) => [...prev, gate]);
    setSelectedGateId(gate.id);
  }
  function updateSelectedGate(patch: Partial<Gate>) {
    if (!selectedGate) return;
    setGates((prev) =>
      prev.map((g) => {
        if (g.id !== selectedGate.id) return g;
        const next = { ...g, ...patch };
        next.width = Math.max(1, Math.min(fenceLength, next.width));
        next.start = Math.max(0, Math.min(fenceLength - next.width, next.start));
        return next;
      })
    );
  }
  function updateGateStart(id: string, start: number) {
    setGates((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        return { ...g, start: Math.max(0, Math.min(fenceLength - g.width, start)) };
      })
    );
  }
  function removeSelectedGate() {
    if (!selectedGate) return;
    setGates((prev) => prev.filter((g) => g.id !== selectedGate.id));
    setSelectedGateId(null);
  }
  function printCustomerQuote() {
    window.print();
  }
  return (
    <>
      <div className="header no-print">
        <h1>Schiano Fence Sage 50 Quote App</h1>
        <p>Next.js clean rebuild: Sage inventory, quote controls, blank gate map, movable gates, swing visual, customer print.</p>
      </div>
      <div className="tabs no-print">
        {[
          ["quote", "Quick Quote"],
          ["gate", "Gate Map + Customer Print"],
          ["inventory", "Inventory"],
          ["sage", "Sage Export"]
        ].map(([key, label]) => (
          <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      <div className="wrap no-print">
        {tab === "quote" && (
          <div className="grid">
            <div>
              <div className="card">
                <h2>Customer</h2>
                <label>Customer Name</label>
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                <label>Job Address</label>
                <textarea value={jobAddress} onChange={(e) => setJobAddress(e.target.value)} />
                <label>Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="card">
                <h2>Quote Settings</h2>
                <label>Quote Type</label>
                <select value={quoteType} onChange={(e) => setQuoteType(e.target.value)}>
                  <option value="materials_only">Materials Only</option>
                  <option value="materials_labor">Materials + Labor</option>
                  <option value="labor_only">Labor Only</option>
                </select>
                <label>Pricing Mode</label>
                <select value={pricingMode} onChange={(e) => setPricingMode(e.target.value)}>
                  <option value="auto">Auto</option>
                  <option value="retail">Retail</option>
                  <option value="wholesale">Wholesale</option>
                </select>
                <label>Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="credit_card">Credit Card + 3.5%</option>
                </select>
              </div>
            </div>
            <div>
              <div className="card">
                <h2>Fence System</h2>
                <div className="row">
                  <div>
                    <label>Fence Length Ft</label>
                    <input type="number" value={fenceLength} onChange={(e) => setFenceLength(Number(e.target.value) || 1)} />
                  </div>
                  <div>
                    <label>Section Width Ft</label>
                    <input type="number" value={sectionWidth} onChange={(e) => setSectionWidth(Number(e.target.value) || 8)} />
                  </div>
                </div>
                <div className="row">
                  <div>
                    <label>Style</label>
                    <input value={styleName} onChange={(e) => setStyleName(e.target.value)} />
                  </div>
                  <div>
                    <label>Color</label>
                    <input value={color} onChange={(e) => setColor(e.target.value)} />
                  </div>
                </div>
                <label>Height</label>
                <input value={height} onChange={(e) => setHeight(e.target.value)} />
              </div>
              <div className="card">
                <h2>Quote Lines</h2>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th className="right">Qty</th>
                      <th className="right">Unit</th>
                      <th className="right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={index}>
                        <td>{row.description}</td>
                        <td className="right">{row.qty}</td>
                        <td className="right">${money(row.unit)}</td>
                        <td className="right">${money(row.total)}</td>
                      </tr>
                    ))}
                    {cardFee > 0 && (
                      <tr>
                        <td>Credit Card Fee 3.5%</td>
                        <td className="right">1</td>
                        <td className="right">${money(cardFee)}</td>
                        <td className="right">${money(cardFee)}</td>
                      </tr>
                    )}
                    <tr>
                      <th colSpan={3} className="right">Grand Total</th>
                      <th className="right">${money(total)}</th>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <div className="card">
                <h2>Inventory Status</h2>
                <div className={inventory.length ? "ok" : "warn"}>
                  {inventory.length ? `Inventory loaded: ${inventory.length} items` : "Inventory not loaded yet"}
                </div>
              </div>
              <div className="card">
                <h2>Fence Picture</h2>
                <img className="photo" src={imagePath(gates)} alt="Country Estate fence gate example" />
              </div>
            </div>
          </div>
        )}
        {tab === "gate" && (
          <div className="grid">
            <div>
              <div className="card">
                <h2>Gate Controls</h2>
                <div className="actions">
                  <button className="btn blue" onClick={() => addGate("single")}>Add Walk Gate</button>
                  <button className="btn blue" onClick={() => addGate("double")}>Add Double Driveway Gate</button>
                  <button className="btn gray" onClick={() => { setGates([]); setSelectedGateId(null); }}>Blank / Clear Map</button>
                </div>
                {selectedGate ? (
                  <>
                    <label>Gate Type</label>
                    <select value={selectedGate.type} onChange={(e) => updateSelectedGate({ type: e.target.value as GateType })}>
                      <option value="single">Single Walk Gate</option>
                      <option value="double">Double Driveway Gate</option>
                    </select>
                    <div className="row">
                      <div>
                        <label>Gate Width Ft</label>
                        <input type="number" step="0.5" value={selectedGate.width} onChange={(e) => updateSelectedGate({ width: Number(e.target.value) || 1 })} />
                      </div>
                      <div>
                        <label>Gate Start Ft</label>
                        <input type="number" step="0.5" value={selectedGate.start} onChange={(e) => updateSelectedGate({ start: Number(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <label>Gate Swing</label>
                    <select value={selectedGate.swing} onChange={(e) => updateSelectedGate({ swing: e.target.value as Swing })}>
                      <option value="outswing_left">Outswing Left</option>
                      <option value="outswing_right">Outswing Right</option>
                      <option value="inswing_left">Inswing Left</option>
                      <option value="inswing_right">Inswing Right</option>
                    </select>
                    <div className="actions">
                      <button className="btn red" onClick={removeSelectedGate}>Remove Selected Gate</button>
                    </div>
                  </>
                ) : (
                  <div className="warn" style={{ marginTop: 10 }}>No gate added. Map is blank by default.</div>
                )}
              </div>
              <div className="card">
                <h2>Customer Print</h2>
                <button className="btn green" onClick={printCustomerQuote}>Print Customer Quote</button>
                <p className="small">Printout includes fence picture, map, hinge dot, swing arc, and gate details.</p>
              </div>
            </div>
            <div>
              <div className="card">
                <h2>Gate Map</h2>
                <div className="map">
                  <GateMap
                    gates={gates}
                    selectedGateId={selectedGate?.id || null}
                    fenceLength={fenceLength}
                    sectionWidth={sectionWidth}
                    styleName={styleName}
                    color={color}
                    height={height}
                    setSelectedGateId={setSelectedGateId}
                    updateGateStart={updateGateStart}
                  />
                </div>
              </div>
            </div>
            <div>
              <div className="card">
                <h2>Fence / Gate Picture</h2>
                <img className="photo" src={imagePath(gates)} alt="Country Estate fence gate example" />
              </div>
              <div className="card">
                <h2>Gate Details</h2>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Gate</th>
                      <th>Width</th>
                      <th>Location</th>
                      <th>Swing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gates.length ? (
                      gates.map((gate) => (
                        <tr key={gate.id}>
                          <td>{gate.type === "double" ? "Double Driveway Gate" : "Single Walk Gate"}</td>
                          <td>{gate.width}'</td>
                          <td>{gate.start}' from start</td>
                          <td>{swingLabels[gate.swing]}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4}>No gate added.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {tab === "inventory" && (
          <div className="card">
            <h2>Sage Inventory</h2>
            <div className={inventory.length ? "ok" : "warn"}>
              {inventory.length ? `Loaded ${inventory.length} inventory items from public/data/schiano_inventory_items.json` : "Inventory not loaded"}
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Item ID</th>
                  <th>Description</th>
                  <th>Retail</th>
                </tr>
              </thead>
              <tbody>
                {inventory.slice(0, 100).map((item, index) => (
                  <tr key={index}>
                    <td>{String(item.ItemID || item["Item ID"] || "")}</td>
                    <td>{String(item.Description || "")}</td>
                    <td>{String(item["RETAIL 1"] || "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === "sage" && (
          <div className="card">
            <h2>Sage Export</h2>
            <div className="warn">Next step: wire final Sage 50 CSV export from the React quote lines.</div>
          </div>
        )}
      </div>
      <div className="print-only wrap">
        <h1>Fence Quote</h1>
        <div className="grid">
          <div className="card">
            <h2>Customer</h2>
            <p><b>Name:</b> {customerName}</p>
            <p><b>Address:</b> {jobAddress}</p>
            <p><b>Fence:</b> {styleName} | {color} | {height}</p>
          </div>
          <div className="card">
            <h2>Fence / Gate Picture</h2>
            <img className="photo" src={imagePath(gates)} alt="Country Estate fence gate example" />
          </div>
        </div>
        <div className="card">
          <h2>Customer Map</h2>
          <div className="map">
            <GateMap
              gates={gates}
              selectedGateId={selectedGate?.id || null}
              fenceLength={fenceLength}
              sectionWidth={sectionWidth}
              styleName={styleName}
              color={color}
              height={height}
              setSelectedGateId={setSelectedGateId}
              updateGateStart={updateGateStart}
            />
          </div>
        </div>
        <div className="card">
          <h2>Gate Details</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Gate</th>
                <th>Width</th>
                <th>Location</th>
                <th>Swing</th>
              </tr>
            </thead>
            <tbody>
              {gates.length ? gates.map((gate) => (
                <tr key={gate.id}>
                  <td>{gate.type === "double" ? "Double Driveway Gate" : "Single Walk Gate"}</td>
                  <td>{gate.width}'</td>
                  <td>{gate.start}' from start</td>
                  <td>{swingLabels[gate.swing]}</td>
                </tr>
              )) : <tr><td colSpan={4}>No gate added.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2>Quote Total</h2>
          <p style={{ fontSize: 24, fontWeight: 900 }}>${money(total)}</p>
        </div>
      </div>
    </>
  );
}
