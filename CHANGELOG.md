# CHANGELOG

## Initial Build

- Created project folder
- Added first local fencing estimator app
- Added quote CSV export
- Added job JSON export

## Version 2 Upgrade

- Added improved 3-panel layout.
- Added tabbed input sections.
- Added preset shapes: straight, L-shape, U-shape, box, zigzag/custom.
- Added more fence types.
- Added gate list with type, width, quantity, and price.
- Added add-ons such as permit, delivery, haul away, and custom extras.
- Added pricing controls for markup, tax, discount, deposit, and minimum charge.
- Added site condition controls for terrain and access.
- Added better quote/material summary panel.
- Added Sage-ready CSV export with more customer fields.

## Version 3 Inventory Integration

- Added Inventory tab.
- Loads inventory/schiano_inventory_items.json.
- Added search by Item ID and description.
- Added category filters.
- Allows selected Sage inventory item to be added to quote add-ons.
- Added Start-App.ps1 local server script for browser inventory loading.

## Version 4 Direction - Real Sage Fence Profiles

The estimator must stop using generic line items for posts, sections, gates, and materials.

New rule:

- Fence sections must use real Sage inventory Item IDs.
- Line posts must use real Sage inventory Item IDs.
- Corner posts must use real Sage inventory Item IDs.
- End posts must use real Sage inventory Item IDs.
- Gates must use real Sage inventory Item IDs.
- Concrete and hardware must use real Sage inventory Item IDs.

The app should ask for fence family/style first, such as Lakeland, Malibu, Hampton, Chesterfield, etc., then ask for section size, height, color, and matching post system.

## Sage Quote Export Workflow Added

- Added docs\sage_quote_workflow.md.
- Added config\sage_quote_export_mapping.json.
- Added sage_export\starter_sage_quote_template.csv.
- Next required step is exporting one real sample quote from Sage 50 to learn the exact import/export field order.

## Version 4 Real Sage Code App

- Created inventory\classified_inventory.json.
- Created inventory\classified_inventory.csv.
- Rebuilt app\index.html with real Sage inventory code selection.
- Added Fence System tab.
- Added real section/post/cap/concrete/gate line generation.
- Added Sage quote CSV export using ItemID.

## Version 5 Pricing Upgrade

- Added retail price mode.
- Added wholesale / cost price mode.
- Added cost-plus-markup price mode.
- Added retail custom multiplier price mode.
- Added custom unit price overrides.
- Added multiple inventory selection from Inventory tab.
- Added bulk add checked inventory items to quote.
- Sage quote CSV now includes PriceMode column.

## Version 6 Shop Pricing Rules

- Added retail section price: $130.
- Added wholesale section price: $110.
- Added automatic section pricing:
  - 1 section uses retail.
  - quantity/bulk sections use wholesale.
- Added controls to force retail, force wholesale, use inventory price, or custom section price.
- PVC post auto-selection now prioritizes 5x5 post codes only.
- 4 ft fence post selection prioritizes 5LP78-style posts.
- Taller fence post selection prioritizes 5LP9 / 5EP9-style posts.

## Version 7 Quote Scope

- Added quote type selector:
  - Materials + Labor
  - Materials Only
  - Labor Only
- Added default price rule selector:
  - Auto: 1 item = retail, quantity = wholesale
  - Force Retail
  - Force Wholesale
  - Custom
- Sage quote CSV now includes QuoteScope and PriceMode columns.
- Default section rule remains:
  - 1 section = retail
  - quantity/bulk = wholesale

## Version 8 Concrete + Quote Scope Rules

- Added Quote Scope selector inside Fence System tab.
- Concrete bags are now treated as install supplies.
- Concrete is included only when labor is included.
- Materials Only quotes exclude concrete bags.
- Labor Only quotes include labor and concrete bags.
- Materials + Labor quotes include materials, labor, and concrete bags.
- Concrete quantity is fixed at 1 bag per post.
- Concrete picker now avoids abrasive cutting wheels, blades, discs, and unrelated items.
- Concrete picker prioritizes the actual CONCRETE / 80LB bag item.

## Version 9 Material-Only Default

- Default quote type is now Materials Only.
- Materials Only quotes include material items only.
- Materials Only excludes labor.
- Materials Only excludes concrete bags.
- Materials Only has no deposit.
- Deposit is only enabled when labor/installation is included.
- Labor Only and Materials + Labor quotes may include deposit.

## Manufacturer Source Added - CEF

- Added Country Estate Fence / CEF as manufacturer reference.
- Website: https://cefmfg.com/
- Materials: Vinyl, Aluminum, Wood.
- Use CEF for product/style reference only.
- Continue using Sage inventory item codes and shop pricing for quotes.

## Version 10 Fence Image Preview

- Added manufacturer selector and fence image preview.
- Added local fence visual catalog JSON.
- Added placeholder fence images.
- Added Print Quote With Image feature.
- Preview matches manufacturer, material, style, color, and height.
- Real photos can be dropped into catalog_images and mapped in config\fence_visual_catalog.json.

## Version 11 Inventory-Based Wholesale Pricing

- Removed fixed $110 / $130 section pricing behavior.
- Retail now comes from actual Sage inventory retail price.
- Wholesale now equals retail x 0.85.
- Auto rule:
  - quantity 1 uses retail
  - quantity 2+ uses wholesale
- Force Retail uses inventory retail.
- Force Wholesale uses inventory retail x 0.85.
- Custom override still works.

## Version 12 Quote Display Options

- Added Internal / Sage View.
- Added Customer View.
- Customer View can hide Item ID.
- Customer View can hide Unit Price.
- Recommended customer quote shows:
  - Description
  - Quantity
  - Total
- Sage export still keeps Item ID, unit price, quantity, and total.

## Version 13 Layout Gates + Element Color

- Added gate placement by fence segment.
- Gates now show on the drawing.
- Gates include segment number, position percent, width, color, and Sage item code.
- Gate item matching uses style/material/color/height.
- Gate prices come from actual inventory pricing rules.
- Layout gates are added to the quote lines automatically.
- Element color matters because different colors can have different Sage prices.

## Version 14 Quick Quote Dashboard

- Added Quick Quote tab as the default one-screen workflow.
- Common options are now visible together:
  - customer
  - quote type
  - pricing rule
  - material
  - style
  - color
  - height
  - section width
  - section item
  - line post
  - corner post
  - end post
  - cap item
  - shape preset
  - gate placement
  - print/export buttons
- Advanced tabs remain available.
- Default quote type remains Materials Only.
- Default price rule remains Auto: one retail, quantity wholesale.
- Default cap item now attempts to use PC55T.

## Version 15 Payment + Element-Level Overrides

- Added Cash / Check payment option.
- Added Credit Card payment option with 3.5% fee.
- Added element-level material override panel.
- Supports one post, one section, one cap, one clamp/hardware, or one gate in a different color.
- Override lines use real Sage inventory descriptions.
- Override lines use real inventory prices with current retail/wholesale/custom pricing rules.
- Credit card fee is added as a quote line.

## Version 16 Drawing + Quote Print

- Added clear drawing overlay with section split labels.
- Added line post markers (LP) on the drawing.
- Added segment breakdown using section width, such as 8 ft sections.
- Added gate/door layout table to the printed quote.
- Added Print Quote With Drawing button.
- Printed quote now includes:
  - customer/job info
  - drawing/map
  - segment breakdown
  - gate/door summary
  - quote lines

## Version 17 Clear Drawing + Movable Gate + Quote Preview

- Added move/edit gate controls.
- Gates can be moved to another segment.
- Gates can be moved by position percent.
- Gates can be resized and color-labeled after placement.
- Added clearer SVG-style quote drawing.
- Added Preview Quote button.
- Added Print Direct button.
- Preview includes:
  - clear layout map
  - line post markers
  - section splits
  - gate/door locations
  - segment breakdown
  - quote lines

## Version 18 Fence System Preview + Clear Section Labels

- Added Customer Quote Preview directly on Fence System page.
- Added clear drawing preview on Fence System page.
- Drawing now labels each divided section as S1, S2, S3, etc.
- Drawing shows LP markers at section divisions.
- Drawing labels each segment with total length, number of sections, and line post count.
- Preview quote opens before print.
- Preview includes drawing, segment breakdown, gate placement, and quote lines.

## Version 19 Customer Quote Print Fix

- Fixed blank customer print/preview issue.
- Customer preview now uses the actual latestQuote object.
- Customer preview now always includes:
  - material quantity summary
  - layout map
  - segment division breakdown
  - gate/door placement
  - quote lines with quantity and total
- Replaced older preview/print functions with fixed version.

## Version 20 Customer Quote Clarity + Better Map + Gate Move

- Customer quote now defaults to hiding unit price.
- Added customer quote option to show/hide unit price.
- Added customer quote option to show/hide item ID.
- Customer quote quantity summary is clearer:
  - total linear feet
  - sections/panels
  - line posts
  - corner posts
  - end posts
  - total posts
  - post caps
  - gates/doors
  - concrete bags when applicable
- Improved drawing map:
  - each section labeled S1, S2, S3...
  - line posts labeled LP
  - gate/door shown clearly in orange
  - gate label shows segment and position percentage
- Added gate move controls directly on Fence System page.

## Version 21 Drawing Gate Builder

- Added Add Gate controls directly where the drawing/preview is on Fence System.
- Supports Single Walk Gate and Double Driveway Gate.
- Gate can be added to any segment.
- Gate can be placed by start-foot measurement or position percentage.
- Gate can be moved after placement.
- Gate can be resized after placement.
- Section split now recalculates around the gate opening.
- Example:
  - 12 ft run, 4 ft gate starting at 8 ft = 8 ft fence + 4 ft gate
  - 12 ft run, 5 ft gate starting at 7 ft = 7 ft fence + 5 ft gate
- Map now draws fence runs split around gate openings.

## Version 22 Draggable Gate Map

- Added physical drag gate map on Fence System page.
- Orange gate boxes can be dragged along the fence segment.
- Dragging updates gate start feet.
- Dragging updates gate position percentage.
- Section split recalculates immediately around gate opening.
- Supports cut sections before and after gates.
- Example:
  - 8 ft standard section
  - 4 ft gate placed 2 ft from corner
  - drawing shows 2 ft cut section + 4 ft gate + remaining fence split into 8 ft/cut sections.

## Version 23 Clean Gate Swing Map

- Improved draggable customer map spacing.
- Reduced overlapping labels.
- Enlarged map canvas.
- Added gate swing direction:
  - Outswing Left
  - Outswing Right
  - Inswing Left
  - Inswing Right
- Gate is drawn as a complete orange gate panel.
- Red swing arc shows opening direction.
- Customer quote map now uses the cleaner swing map.

## Version 24 Unified Customer Print + Gate Price + Clean Map

- Added one single Customer Quote Preview / Print panel.
- Hid older duplicate print/preview panels.
- Customer quote defaults to hiding unit price.
- Customer quote has option to show/hide unit price.
- Customer quote has option to show/hide Item ID.
- Gate line is forced into quote lines.
- Gate price is included in total.
- Gate swing direction is displayed in Gate / Door Details.
- Customer map is simplified to reduce overlap and fit on the page.
- Customer map still shows gate and red swing arc.

## Version 25 Customer Clear Map

- Replaced crowded customer map with a cleaner customer-facing map.
- Removed section labels from crowded fence line.
- Keeps only important visual markers on map:
  - segment labels
  - line posts
  - gate panel
  - red swing arc
  - gate swing landing/opening line
- Gate details now shown clearly in table:
  - gate number
  - type
  - segment
  - start
  - end
  - width
  - swing/opening direction
- Customer print remains one-page focused.
- Unit price stays optional and hidden by default.

## Version 26 Gate Line Drag Map

- Replaced big box gate with a simple orange gate/opening line.
- Gate is now drawn directly on the fence line.
- Red line/arc shows the swing direction and where the gate lands when open.
- Gate can be dragged by grabbing the orange line.
- Dragging updates start feet and position percentage.
- Section split updates around the gate opening.
- Labels now show:
  - gate opening width
  - start foot
  - end foot
  - swing direction
  - remaining fence sections/cuts

## Version 27 Gate Map Cleanup

- Fixed gate dragging by using document-level pointer drag events.
- Gate is a simple orange line, not a box.
- Removed boxed callouts from the map.
- Labels are simple text only.
- Swing direction is selected from one clean panel.
- Swing direction is shown with a red line/arc.
- Duplicate/conflicting gate/map/preview panels are hidden.
- Older map builders are overridden to use the same clean map.
## Version 27 Gate Map Cleanup
- Fixed gate dragging by using document-level pointer drag events.
- Gate is a simple orange line, not a box.
- Removed boxed callouts from the map.
- Labels are simple text only.
- Swing direction is selected from one clean panel.
- Swing direction is shown with a red line/arc.
- Duplicate/conflicting gate/map/preview panels are hidden.
- Older map builders are overridden to use the same clean map.
## Version 28 Unified Gate + Customer Quote Control
- Added one unified Gate / Map / Customer Print panel.
- Added direct data entry for gate type, segment, start feet, width, section width, and swing direction.
- Restored draggable orange gate line.
- Gate is no longer a big box.
- Red swing line and arc show opening direction.
- Section splits recalculate around the gate.
- Customer print options:
  - hide item totals and show grand total only
  - mask item totals using ***last digits
  - show item totals
- Unit prices remain hidden for customer quote.
- Gate price is included in quote total.
- Older duplicate gate/map/customer print panels are hidden.## Version 27 Gate Map Cleanup
- Fixed gate dragging by using document-level pointer drag events.
- Gate is a simple orange line, not a box.
- Removed boxed callouts from the map.
- Labels are simple text only.
- Swing direction is selected from one clean panel.
- Swing direction is shown with a red line/arc.
- Duplicate/conflicting gate/map/preview panels are hidden.
- Older map builders are overridden to use the same clean map.
