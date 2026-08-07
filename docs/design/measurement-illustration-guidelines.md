# Measurement illustration guidelines

This document defines the replaceable illustration contract for Guided body-measurement steps. The files in `src/frontend/src/assets/measurements` are intentionally simple placeholders. They may be replaced independently without changing measurement behavior, field mappings, API contracts, or persistence.

## File and metadata contract

Each supported measurement concept has one stable SVG filename:

- `neck.svg`
- `chest.svg`
- `waist.svg`
- `abdomen.svg`
- `hips.svg`
- `upper-arm.svg`
- `forearm.svg`
- `thigh.svg`
- `calf.svg`

Do not create separate left and right files unless the guidance genuinely differs by side. Paired fields reuse one conceptual asset by default. If a future workflow requires a side-specific drawing, declare it in the optional `sideAssets` metadata rather than branching in a React component.

The canonical mapping is `MEASUREMENT_DEFINITIONS` in `measurementSessionModel.ts`. Each definition provides:

- a stable asset import;
- a concise localized alt-text source;
- the existing short technique-instruction source;
- an optional extended-instruction source;
- optional side-specific asset overrides.

The frontend renders the metadata and does not infer measurement rules from an image. Do not put validation, unit conversion, anatomical interpretation, or other business logic in illustration metadata.

## Canvas and responsive dimensions

Every illustration must:

- be SVG with `viewBox="0 0 400 300"`;
- use a 4:3 canvas;
- omit fixed `width` and `height` attributes;
- use `preserveAspectRatio="xMidYMid meet"`;
- remain legible at approximately 200 by 150 CSS pixels.

The component reserves a 4:3 region before the image loads to prevent layout shift. Its maximum rendered sizes are 320 by 240 on desktop, 280 by 210 on tablet, 240 by 180 on mobile, and 200 by 150 on short-height mobile viewports. Replacement artwork must not rely on overflow outside the viewBox.

Keep essential anatomy, tape placement, and endpoints inside a safe area of at least 20 units from every viewBox edge. Allow additional visual breathing room around the highlighted measurement line.

## Visual construction

Use clear, restrained geometry suitable for instructional placeholders:

- favor simple paths, circles, and basic shapes;
- use rounded joins and caps;
- keep primary silhouette strokes near 5 units and measurement highlights near 8 to 10 units on the canonical canvas;
- combine position, shape, stroke weight, or markers so meaning is not conveyed by color alone;
- maintain WCAG-oriented contrast against both the illustration surface and the surrounding modal;
- avoid fine detail that disappears at the short-height size;
- avoid gendered, diagnostic, or idealized body cues when they are not necessary to show placement.

The current neutral palette is not an API. Replacement assets should work on the component's light surface and be reviewable for future theme variants. If theme-specific assets become necessary, extend metadata explicitly; do not encode theme selection in filenames or business models.

## Accessibility and localization

Guided-step images are informative and receive localized alt text from the translation engine. Alt text should identify the body region and that the image shows tape placement. Operational technique remains in the nearby Technique disclosure, so alt text should not repeat the full instruction.

The component also supports decorative rendering with an empty alt value and `aria-hidden`. Use decorative mode only when equivalent information is already announced in the same context. Images must never be keyboard-focusable.

Add every new alt-text source to:

- the bundled Brazilian Portuguese frontend catalog; and
- the backend translation seed/catalog with a stable, feature-scoped key.

Do not embed visible words, alt text, localized copy, or fonts inside SVG files.

## Safe replacement checklist

Before replacing an asset:

1. Keep its filename stable, or update the single metadata import deliberately.
2. Confirm the exact 400 by 300 viewBox and aspect-ratio contract.
3. Remove fixed dimensions, scripts, event handlers, `foreignObject`, external links, external resources, embedded raster data, and fonts.
4. Confirm all required artwork stays inside the safe area.
5. Confirm tape placement remains understandable without relying only on color.
6. Review contrast at desktop, mobile, and short-height sizes.
7. Confirm the asset is original, licensed for repository distribution, or public domain; record attribution when the license requires it.
8. Run the component, Guided workflow, localization, lint, build, and browser geometry tests.

Do not copy anatomy diagrams, branded illustrations, or stock assets without verified redistribution and derivative-work rights. Prefer project-owned source artwork with a documented author and license.

## Failure behavior

If an asset cannot load, the component removes the broken image and leaves a stable, non-announced placeholder surface. The step title, technique text, measurement input, navigation, and save flow remain available. Asset loading must not block modal interaction or introduce a focus target.

Illustrations belong only to active Guided measurement steps. Do not render them in Manual entry, the Guided review table, history, comparisons, analytics, or other dense data views unless that scope is separately designed and tested.
