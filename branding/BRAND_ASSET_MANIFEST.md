# MyFitIdeas Brand Asset Manifest

**Manifest version:** 1.0  
**Last updated:** 2026-07-31  
**Maintained on:** `feature/phase-2.1-branding`

## Purpose

This manifest is the authoritative inventory of approved and in-progress MyFitIdeas brand assets. It records version, status, purpose, source relationship, and validation requirements so that design, development, marketing, legal, and future mobile teams use the correct files.

## Status Definitions

- **Authoritative source:** Primary editable file from which derivatives are created.
- **Approved:** Accepted for the stated use.
- **Candidate:** Geometry or content approved in principle but awaiting production validation.
- **Draft:** Still under development.
- **Superseded:** Retained only for history; not for current use.
- **Archived:** Preserved for provenance or registration records.

## Current Assets

| Asset | Version | Status | Repository location | Purpose | Notes |
|---|---:|---|---|---|---|
| MyFitIdeas Master Symbol | 1.0 | Candidate authoritative source | Pending upload to `branding/master/` | Primary standalone brand symbol | Five positive vector elements; flat fills; production-clean derivative still required |
| Master Symbol Construction Standard | 1.0 | Approved reference | `branding/construction/MYFITIDEAS_MASTER_SYMBOL_CONSTRUCTION_STANDARD_v1.0.md` | Geometry, ratios, meaning, clear space, and governance | Measurements derived from the 1000 px Inkscape SVG |
| Canonical Palette | 1.0 | Working canonical | `branding/colors/MYFITIDEAS_CANONICAL_PALETTE_v1.0.md` | Color reference and initial registration record | Subject to final contrast and application testing |
| Canonical Palette Swatch | 1.0 | Working canonical | `branding/colors/myfitideas-canonical-palette-v1.svg` | Visual color reference | SVG swatch sheet |
| Wordmark | 1.0 | Draft not started | Pending | “My Fit Ideas” typography | Must be designed after symbol construction standard |
| Primary stacked lockup | 1.0 | Draft not started | Pending | Symbol plus wordmark | Must derive from approved symbol and wordmark |
| Primary horizontal lockup | 1.0 | Draft not started | Pending | Wide-format branding | Must derive from approved symbol and wordmark |
| Monochrome symbol | 1.0 | Draft not started | Pending | One-color reproduction | Black, white, and single-brand-color variants required |
| Small-size symbol | 1.0 | Validation pending | Pending | Favicon and compact UI use | Create only if master channels lose clarity below 32 px |
| Brand Standards Manual | 1.0 | Draft not started | Pending | Complete identity system | Will consolidate construction, color, typography, and usage |
| Trademark preparation record | 1.0 | Draft | Pending | Creation history and registration support | Not legal advice; counsel review recommended before filing |

## Canonical Symbol Color Assignment

| Element | HEX | RGB |
|---|---|---|
| Top leaf | `#48BE30` | 72, 190, 48 |
| Side leaves | `#5FCB3C` | 95, 203, 60 |
| Head and body | `#A6E84A` | 166, 232, 74 |
| Negative space | transparent/contextual | n/a |

## Required Metadata for Every Official Asset

Each new official brand asset should record:

- Asset name
- Semantic version
- Creation or approval date
- Authoring application
- Source master version
- Intended use
- Color mode
- Dimensions or viewBox
- Export format
- Approval status
- Repository path
- SHA-256 checksum when final
- Superseded asset, if applicable

## Naming Standard

Use lowercase kebab-case for exported production assets and descriptive title case only for editable source archives when necessary.

Examples:

- `myfitideas-master-symbol-v1.0.svg`
- `myfitideas-symbol-monochrome-black-v1.0.svg`
- `myfitideas-logo-horizontal-primary-v1.0.svg`
- `myfitideas-app-icon-1024-v1.0.png`

Do not use filenames such as `final`, `final2`, `new`, or `latest`.

## Versioning Rules

- **Major:** Significant identity redesign or changed brand meaning.
- **Minor:** Noticeable geometry, lockup, or palette revision that remains recognizably the same identity.
- **Patch:** Production cleanup, metadata correction, or technically equivalent export correction.

Examples:

- `1.0.1`: embedded reference image removed without changing visible geometry.
- `1.1.0`: adjusted leaf spacing or revised canonical palette.
- `2.0.0`: redesigned symbol or materially different wordmark system.

## Production Validation Checklist

Before marking any SVG or export as Approved:

- Confirm no embedded reference raster remains.
- Confirm no hidden construction object affects output.
- Confirm strokes are intentional or absent.
- Confirm transparency behaves correctly.
- Confirm all intended shapes remain editable.
- Inspect 32, 48, 64, 128, 256, 512, and 1024 px exports.
- Inspect on white, dark, and transparent backgrounds.
- Verify monochrome reproduction.
- Record checksum and source master version.

## Change Log

### 1.0 - 2026-07-31

- Established the initial authoritative brand asset inventory.
- Recorded Master Symbol v1.0 candidate status.
- Added construction-standard and canonical-palette references.
- Added naming, versioning, metadata, and validation rules.
