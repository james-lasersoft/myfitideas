export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "MyFitIdeas API",
    version: "1.0.0",
    description: "Platform-neutral API for the MyFitIdeas web and mobile clients.",
  },
  servers: [{ url: "/api/v1", description: "Version 1" }],
  paths: {
    "/auth/register": { post: { summary: "Register a user", responses: { "200": { description: "User registered" } } } },
    "/auth/login": { post: { summary: "Authenticate a user", responses: { "200": { description: "Authenticated" } } } },
    "/users/profile": { get: { summary: "Get authenticated user test profile", responses: { "200": { description: "Profile returned" } } } },
    "/profile": {
      get: { summary: "Get current user profile", responses: { "200": { description: "Profile returned" } } },
      put: { summary: "Update current user profile", responses: { "200": { description: "Profile updated" } } },
    },
    "/measurements": {
      get: { summary: "List measurements", responses: { "200": { description: "Measurements returned" } } },
      post: { summary: "Create a measurement", responses: { "201": { description: "Measurement created" } } },
    },
    "/measurements/compare": {
      get: {
        summary: "Compare two body-measurement sessions",
        description: "Returns a fixed-size, non-paginated comparison for exactly two sessions owned by the authenticated user. Values are normalized to canonical units and dates use ISO 8601.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "baselineSessionId", in: "query", required: true, schema: { type: "string" } },
          { name: "comparisonSessionId", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Session comparison returned",
            content: { "application/json": { schema: { $ref: "#/components/schemas/MeasurementSessionComparison" } } },
          },
          "400": { description: "Missing or identical session IDs" },
          "404": { description: "One or both sessions are unavailable to the authenticated user" },
        },
      },
    },
    "/hydration": {
      get: { summary: "List hydration entries", responses: { "200": { description: "Entries returned" } } },
      post: { summary: "Create a hydration entry", responses: { "201": { description: "Entry created" } } },
    },
    "/hydration/daily-total": { get: { summary: "Get daily hydration total", responses: { "200": { description: "Daily total returned" } } } },
    "/hydration/{id}": { delete: { summary: "Delete a hydration entry", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "204": { description: "Entry deleted" } } } },
    "/dashboard": { get: { summary: "Get dashboard summary", responses: { "200": { description: "Dashboard returned" } } } },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      MeasurementComparisonValue: {
        type: "object",
        required: ["baselineValue", "comparisonValue", "displayUnit", "absoluteChange", "percentageChange", "status"],
        properties: {
          baselineValue: { type: ["number", "null"] },
          comparisonValue: { type: ["number", "null"] },
          displayUnit: { type: "string", enum: ["cm", "kg", "percent", "ratio"] },
          absoluteChange: { type: ["number", "null"] },
          percentageChange: { type: ["number", "null"] },
          status: {
            type: "string",
            enum: ["COMPARABLE", "MISSING_BASELINE", "MISSING_COMPARISON", "MISSING_BOTH", "ZERO_BASELINE"],
          },
        },
      },
      MeasurementSessionComparison: {
        type: "object",
        required: ["baselineSession", "comparisonSession", "coreMeasurements", "pairedMeasurements", "calculatedMetrics"],
        properties: {
          baselineSession: { $ref: "#/components/schemas/MeasurementComparisonSessionMetadata" },
          comparisonSession: { $ref: "#/components/schemas/MeasurementComparisonSessionMetadata" },
          coreMeasurements: {
            type: "array",
            items: {
              type: "object",
              required: ["field", "value"],
              properties: {
                field: { type: "string", enum: ["neck", "chest", "waist", "abdomen", "hips"] },
                value: { $ref: "#/components/schemas/MeasurementComparisonValue" },
              },
            },
          },
          pairedMeasurements: {
            type: "array",
            items: {
              type: "object",
              required: ["field", "left", "right"],
              properties: {
                field: { type: "string", enum: ["upperArms", "forearms", "thighs", "calves"] },
                left: { $ref: "#/components/schemas/MeasurementComparisonValue" },
                right: { $ref: "#/components/schemas/MeasurementComparisonValue" },
              },
            },
          },
          calculatedMetrics: {
            type: "array",
            items: {
              type: "object",
              required: ["field", "value", "baselineMethod", "comparisonMethod"],
              properties: {
                field: { type: "string", enum: ["bodyFat", "waistToHeightRatio", "fatMass", "leanMass"] },
                value: { $ref: "#/components/schemas/MeasurementComparisonValue" },
                baselineMethod: { type: ["string", "null"] },
                comparisonMethod: { type: ["string", "null"] },
              },
            },
          },
        },
      },
      MeasurementComparisonSessionMetadata: {
        type: "object",
        required: ["id", "recordedAt"],
        properties: {
          id: { type: "string" },
          recordedAt: { type: "string", format: "date-time" },
        },
      },
      ErrorResponse: {
        type: "object",
        required: ["success", "error", "meta"],
        properties: {
          success: { type: "boolean", const: false },
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              details: {},
            },
          },
          meta: {
            type: "object",
            required: ["requestId", "timestamp"],
            properties: {
              requestId: { type: "string" },
              timestamp: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
  },
} as const;
