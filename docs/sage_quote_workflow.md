# Sage 50 Quote Export Workflow

## Goal

The fence estimator must create a Sage 50 quote that can later be converted inside Sage into a sale, invoice, or sales order.

## Correct Workflow

1. Customer gives fence dimensions.
2. App draws/calculates the fence layout.
3. App asks for the real fence system:
   - Lakeland
   - Malibu
   - Hampton
   - Chesterfield
   - Chain link
   - Aluminum
   - Wood
   - Custom
4. App selects exact Sage inventory item codes:
   - Section item code
   - Line post item code
   - Corner post item code
   - End post item code
   - Gate item code
   - Concrete item code
   - Hardware item codes
   - Labor/service item codes
5. App creates a Sage quote import/export file.
6. User imports or sends the quote into Sage 50.
7. User opens the quote in Sage 50.
8. User prints/emails the quote.
9. When customer approves, user converts the quote into a sale/invoice/order inside Sage.

## Important Rule

The quote must not use generic line items like:

- Line Posts
- Corner Posts
- Sections
- Gates

The quote must use real Sage item codes from inventory.

Example:

- LAKE6
- MAL46
- C5LP8
- C5CP8
- C5EP8
- CONCRETE

## Phase 1 Export Method

Create a Sage quote CSV file from the estimator.

The exact field order must be matched to Sage 50 by exporting a sample quote from Sage first.

## Phase 2 Direct Send Method

After CSV import/export is proven, add direct Sage 50 SDK integration.

## Sage Export Test Procedure

1. In Sage 50, manually create one sample quote.
2. Use a real customer.
3. Add several real inventory items.
4. Include:
   - Section item
   - Line post item
   - Corner post item
   - End post item
   - Gate item
   - Concrete item
   - Labor item
5. Export that quote from Sage 50.
6. Save the exported file into:

   G:\My Drive\SAGE_50_INTEGRATE_PROJECT\sage_export\sample_sage_quote_export.csv

7. Use that file as the template for the estimator export.

## Required App Upgrade

Add a Sage Quote Builder tab.

The tab must include:

- Sage Customer ID
- Quote Number
- Quote Date
- Ship To / Job Address
- Item Code
- Description
- Quantity
- Unit Price
- Taxable flag
- Line total
- Notes
- Export status

## Final Output

The estimator should create:

- quote summary
- job JSON
- Sage quote CSV
- optional customer-facing PDF later
