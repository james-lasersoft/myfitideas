# Phase 2: Canonical Measurements and User Preferences

Phase 2 stores health data in canonical metric units while preserving legacy API fields for the current React client.

## Canonical units

- Weight: kilograms
- Height and body dimensions: centimeters
- Hydration: milliliters
- Dates: UTC DateTime serialized as ISO-8601

## Preferences

User profiles store independent preferences for weight, length, hydration, language, and timezone. Preferences affect input and display only.

## Compatibility

Legacy columns remain temporarily. New writes populate canonical and legacy columns. Existing API fields remain available while canonical fields are added.

## Migration assumptions

- Existing weight and target weight values use each user's preferred weight unit.
- Existing waist, chest, and hips values are treated as inches because the original model did not store a unit.
- Existing hydration values use each row's stored unit.
- Existing hydration goals use each user's preferred hydration unit.

Review these assumptions before production deployment.

## Validation

```bash
cd src/backend
npx prisma generate
npx prisma migrate dev
npm run typecheck
npm test
npm run build
```