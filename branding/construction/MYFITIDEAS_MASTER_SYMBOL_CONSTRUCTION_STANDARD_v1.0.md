# MyFitIdeas Master Symbol Construction Standard v1.0

**Status:** Authoritative construction reference for the Master Symbol v1.0 candidate  
**Source artwork:** `MyFitIdeas Master Symbol v1.0.svg`  
**Prepared:** 2026-07-31  
**Branch:** `feature/phase-2.1-branding`

## 1. Purpose

This document records the measured geometry, color assignments, design intent, and reproduction rules for the MyFitIdeas Master Symbol v1.0. It is intended to support brand consistency, future asset production, design-system implementation, archival recordkeeping, and trademark-registration preparation.

The symbol consists of five positive vector elements:

1. Top leaf
2. Left leaf
3. Right leaf
4. Head
5. Body

All white areas are negative space created by the spacing between those five elements. No white design object is required in the canonical symbol.

## 2. Source File Properties

- SVG canvas: 1000 x 1000 px
- SVG viewBox: 0 0 264.58333 264.58333
- Authoring application: Inkscape 1.4.4
- Artwork bounds: approximately 813.023 x 836.186 px
- Artwork center axis: vertical centerline through the head and body
- Rendering model: flat vector fills, no strokes, no shadows, no raster effects

## 3. Master Unit

The construction system uses the head diameter as the master unit.

> **1 MU = head diameter = 112.5 px in the 1000 px master canvas**

All ratios below are measured from the current SVG and rounded for documentation.

## 4. Measured Proportions

| Element | Measured size (px) | Ratio in MU |
|---|---:|---:|
| Head diameter | 112.500 x 112.500 | 1.000 x 1.000 |
| Top leaf | 217.759 x 416.157 | 1.936 x 3.699 |
| Body | 345.579 x 317.034 | 3.072 x 2.818 |
| Right leaf | 389.999 x 522.359 | 3.467 x 4.643 |
| Left leaf | 393.985 x 519.308 | 3.502 x 4.616 |
| Complete symbol bounds | 813.023 x 836.186 | 7.227 x 7.433 |

The small difference between left and right leaf measurements is an optical correction and should not be treated as an error. The symbol is visually balanced rather than mechanically mirrored in every measured detail.

## 5. Canonical Colors

| Element | Token | HEX | RGB |
|---|---|---|---|
| Top leaf | Deep Growth Green | `#48BE30` | 72, 190, 48 |
| Left leaf | Growth Green | `#5FCB3C` | 95, 203, 60 |
| Right leaf | Growth Green | `#5FCB3C` | 95, 203, 60 |
| Head | Spring Bud | `#A6E84A` | 166, 232, 74 |
| Body | Spring Bud | `#A6E84A` | 166, 232, 74 |
| Negative space | Background | transparent / contextual | n/a |

The master symbol uses flat fills. Gradients, shadows, glows, bevels, texture, and outlines are not part of the canonical mark.

## 6. Geometry Rules

- The head is a mathematically perfect circle.
- The top leaf is centered on the vertical axis.
- The body is centered on the same vertical axis and tapers to the base.
- Side leaves rise from the lower center and open outward.
- Leaf tips remain pointed but not needle-like.
- Internal leaf channels are negative space and must remain visibly open at approved reproduction sizes.
- Curves must remain smooth and continuous, with minimal control nodes.
- Abrupt direction changes, flat spots, and visible seams are not permitted.

## 7. Symbol Meaning

| Element | Intended meaning |
|---|---|
| Top leaf | aspiration, renewal, upward growth |
| Head | human potential and individual identity |
| Body | transformation, momentum, and emergence |
| Left leaf | support and foundation |
| Right leaf | balance and sustained development |
| Negative space | openness, movement, and continuous growth |

## 8. Design Principles

1. Geometry over tracing.
2. Meaning over decoration.
3. Continuous botanical curves.
4. Purposeful negative space.
5. Minimal node count.
6. Optical balance before strict mathematical symmetry.
7. Scalability from small digital icons to large-format print.
8. Flat canonical artwork with optional marketing treatments derived from, but never replacing, the master.

## 9. Clear Space

Until the wordmark lockup is finalized, the recommended protected clear space around the standalone symbol is:

> **Minimum clear space = 0.5 MU on all sides**

Preferred presentation clear space is 1.0 MU where layout permits.

No typography, border, photograph, icon, or interface element should enter the protected clear-space area.

## 10. Minimum Reproduction Testing

The final minimum-size rules will be confirmed after controlled exports and visual testing. The current validation targets are:

- 32 px height: smallest general digital use
- 48 px height: preferred minimum for UI placement
- 64 px and above: full internal negative-space fidelity
- 15 mm height: preliminary print minimum

A small-size optimized derivative may be created later if the internal leaf channels lose clarity below 32 px. That derivative must be documented separately and may not replace the master geometry.

## 11. File Governance

- The authoritative source file must never be overwritten casually.
- Geometry revisions require a new semantic version.
- Color-only revisions require a documented palette revision.
- All official derivatives must identify the master version from which they were generated.
- The source Inkscape file may contain construction or reference layers, but production exports must exclude hidden raster references and construction guides.

## 12. Pending Validation

Before Master Symbol v1.0 is marked final, complete these checks:

- Export and inspect at 32, 48, 64, 128, 256, 512, and 1024 px.
- Test on white, transparent, dark, and light botanical backgrounds.
- Confirm monochrome and reversed versions.
- Confirm print reproduction at 15 mm and 25 mm heights.
- Verify that embedded reference imagery is removed from the production-clean SVG.
- Record final file checksum in the Brand Asset Manifest.

---

This document is a technical and archival brand record. It is not legal advice and does not by itself establish trademark registration or ownership rights.