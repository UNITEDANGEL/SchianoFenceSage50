# SAGE 50 INTEGRATE - Fencing Estimator App Plan

## Main Goal

Build a fencing estimator for a fencing business that can handle any fence shape, any fence type, calculate material/labor/quote totals, and export Sage 50-ready quote data.

## First Working App

The first app is a local browser app.

It can:

- Draw any fence shape by clicking points.
- Support open shapes and closed shapes.
- Enter real-world footage for each fence segment.
- Select fence type.
- Enter fence height.
- Add gates.
- Calculate total linear feet.
- Estimate posts, panels/sections, rails, concrete, caps, gate hardware, labor, and quote total.
- Export a Sage-ready CSV file.
- Export a job JSON file.

## Supported Fence Shapes

The app is not limited to U-shape.

It supports:

- Straight line
- L-shape
- U-shape
- Box / rectangle
- Multi-section custom shape
- Open or closed layouts

## Supported Fence Types

Starter fence types:

- Wood Privacy
- Vinyl Privacy
- Chain Link
- Aluminum

Fence rules are editable in the app code and will later move into a config file.

## Sage 50 Strategy

Phase 1:

- Export Sage-ready CSV quote file.
- Import or copy into Sage 50 manually.

Phase 2:

- Map exact Sage 50 quote/import fields.
- Add customer/item code mapping.
- Add direct integration using approved Sage 50 method if available.

## Build Priority

1. Working estimator app.
2. Reliable shape measurement.
3. Correct material math.
4. Sage CSV export.
5. Saved customer/job files.
6. Direct Sage integration later.

## Current Status

Initial local app scaffold created.

## Next Upgrade

Add saved pricing database and Sage item-code mapping.
