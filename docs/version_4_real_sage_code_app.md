# Version 4 Real Sage Code App

## What changed

- App now loads classified Sage inventory.
- App has Fence System tab.
- Quote lines now use actual Sage Item IDs for:
  - sections
  - line posts
  - corner posts
  - end posts
  - caps
  - concrete
  - gates
  - add-ons
- L-shape post math uses:
  - panels = ceiling(length / section width)
  - open shape total posts = panels + 1
  - end posts = 2
  - corner posts = number of bends
  - line posts = total posts - end posts - corner posts
- Example:
  - 48 ft + 48 ft L-shape
  - 8 ft section
  - sections = 12
  - total posts = 13
  - corner posts = 1
  - end posts = 2
  - line posts = 10
