# Sage 50 Integrate Project Code Audit

Root: G:\My Drive\SAGE_50_INTEGRATE_PROJECT
Generated: 06/12/2026 20:36:52

## Main Files

| File | Size | Modified |
|---|---:|---|
| app\clean_gate_swing_map_v23.js | 17685 | 06/10/2026 22:36:26 |
| app\customer_clear_map_v25.js | 18552 | 06/10/2026 22:42:54 |
| app\customer_quote_v20_clear_map_gate_move.js | 26831 | 06/10/2026 22:18:47 |
| app\draggable_gate_map_v22.js | 18242 | 06/10/2026 22:31:05 |
| app\drawing_gate_builder_v21.js | 30401 | 06/10/2026 22:24:15 |
| app\drawing_quote_v16.js | 14475 | 06/10/2026 22:00:38 |
| app\drawing_quote_v17_preview_move_gate.js | 20088 | 06/10/2026 22:07:27 |
| app\fence_system_preview_v18.js | 17686 | 06/10/2026 22:11:52 |
| app\gate_line_drag_map_v26.js | 16590 | 06/10/2026 22:45:57 |
| app\gate_map_cleanup_v27.js | 20268 | 06/11/2026 21:21:43 |
| app\gate_quote_workbench.html | 12298 | 06/11/2026 19:13:21 |
| app\index.html | 49595 | 06/10/2026 22:45:57 |
| app\layout_gates_v13.js | 11413 | 06/10/2026 21:47:19 |
| app\payment_element_overrides_v15.js | 12417 | 06/10/2026 21:55:55 |
| app\pricing_v11_inventory_wholesale.js | 9528 | 06/10/2026 21:41:02 |
| app\pricing_v5_patch.js | 12296 | 06/10/2026 21:16:27 |
| app\pricing_v6_shop_rules.js | 6896 | 06/10/2026 21:20:31 |
| app\pricing_v7_quote_scope.js | 6329 | 06/10/2026 21:23:23 |
| app\pricing_v8_concrete_scope.js | 7026 | 06/10/2026 21:27:16 |
| app\pricing_v9_material_default.js | 4821 | 06/10/2026 21:30:06 |
| app\quick_quote_v14.js | 16141 | 06/10/2026 21:52:07 |
| app\quote_display_v12.js | 7235 | 06/10/2026 21:43:43 |
| app\quote_print_fix_v19.js | 18774 | 06/10/2026 22:15:03 |
| app\unified_customer_print_v24.js | 24786 | 06/10/2026 22:40:14 |
| app\unified_gate_customer_v28.js | 33542 | 06/11/2026 19:03:25 |
| app\visual_catalog_v10.js | 9576 | 06/10/2026 21:35:56 |

## Inventory Files

| File | Size | Modified |
|---|---:|---|
| inventory\classified_inventory.csv | 292110 | 06/10/2026 21:12:26 |
| inventory\classified_inventory.json | 1017163 | 06/10/2026 21:12:25 |
| inventory\inventory_summary.md | 283 | 06/11/2026 00:36:08 |
| inventory\schiano_inventory_items.csv | 202377 | 06/11/2026 00:36:08 |
| inventory\schiano_inventory_items.json | 571751 | 06/11/2026 00:36:08 |

## Capability Detection

| Capability | Status | Matched Terms |
|---|---|---|
| Loads Sage inventory JSON | FOUND | schiano_inventory_items.json, classified_inventory.json, inventory |
| Uses real Sage item IDs | FOUND | ItemID, Item ID, item_id, sage |
| Retail / wholesale pricing | FOUND | wholesale, retail, 0.85 |
| Materials only / labor only / materials + labor | FOUND | materials_only, labor_only, materials_labor |
| Concrete excluded on materials-only | FOUND | concrete, materials_only, labor |
| Credit card 3.5 percent fee | FOUND | 3.5, credit |
| Customer quote preview | FOUND | Customer Quote, printCustomer, customer quote |
| Hide unit prices / customer price display | FOUND | grand_only, hide |
| Sage CSV export | FOUND | csv, sage_quote, export |
| Drawing / map exists | FOUND | svg, canvas, drawing, map |
| Gate add controls | FOUND | addGate, Add Gate, gateType, gateWidth, gateStart |
| Movable / draggable gate | FOUND | drag, draggable, pointerdown, pointermove, mousedown, mousemove |
| Gate swing direction | FOUND | outswing, inswing, swing, swingLabel |
| Double driveway gate | FOUND | double, driveway, gateType |
| Section split recalculation | FOUND | section, split, sectionWidth, Math.ceil, gateStart, gateWidth |
| Element-level color selection | FOUND | gateColor, color |
| Post cap default PC55T | FOUND | PC55T |
| 5x5 post defaults | FOUND | 5LP, 5EP, 5x5 |

## Script References Loaded By app/index.html

- pricing_v5_patch.js
- pricing_v6_shop_rules.js
- pricing_v7_quote_scope.js
- pricing_v8_concrete_scope.js
- pricing_v9_material_default.js
- visual_catalog_v10.js
- pricing_v11_inventory_wholesale.js
- quote_display_v12.js
- layout_gates_v13.js
- quick_quote_v14.js
- payment_element_overrides_v15.js
- drawing_quote_v16.js
- drawing_quote_v17_preview_move_gate.js
- fence_system_preview_v18.js
- quote_print_fix_v19.js
- customer_quote_v20_clear_map_gate_move.js
- drawing_gate_builder_v21.js
- draggable_gate_map_v22.js
- clean_gate_swing_map_v23.js
- unified_customer_print_v24.js
- customer_clear_map_v25.js
- gate_line_drag_map_v26.js

## Likely Current App Summary

- Gate placement / movement code appears to exist.
- Inventory integration code appears to exist.
- Sage/CSV export code appears to exist.
- Customer preview / print code appears to exist.
