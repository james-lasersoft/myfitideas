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
    "/analytics/body-transformation": {
      get: {
        summary: "Get body-transformation trends",
        description: "Returns authenticated-user weight, circumference, derived-metric, sufficiency, and consistency analytics. The fixed-size response is not paginated; source history remains internal. Values use the user display units and dates use ISO 8601.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "period", in: "query", schema: { type: "string", enum: ["LAST_7_DAYS", "LAST_30_DAYS", "LAST_90_DAYS", "ALL_HISTORY", "CUSTOM"], default: "LAST_30_DAYS" } },
          { name: "startDate", in: "query", description: "Required for CUSTOM; YYYY-MM-DD.", schema: { type: "string", format: "date" } },
          { name: "endDate", in: "query", description: "Required for CUSTOM; YYYY-MM-DD.", schema: { type: "string", format: "date" } },
        ],
        responses: {
          "200": { description: "Body-transformation analytics returned", content: { "application/json": { schema: { $ref: "#/components/schemas/BodyTransformationAnalytics" } } } },
          "400": { description: "Invalid period or custom date range" },
          "401": { description: "Authentication required" },
          "403": { description: "Entitlement or permission required" },
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
                field: { type: "string", enum: ["bmi", "bodyFat", "waistToHeightRatio", "fatMass", "leanMass"] },
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
      BodyTransformationTrend: {
        type: "object",
        required: ["startValue", "endValue", "absoluteChange", "percentageChange", "unitCode", "observationCount", "startDate", "endDate", "direction", "reliability"],
        properties: {
          startValue: { type: ["number", "null"] },
          endValue: { type: ["number", "null"] },
          absoluteChange: { type: ["number", "null"] },
          percentageChange: { type: ["number", "null"] },
          unitCode: { type: "string", enum: ["cm", "in", "kg", "lb", "percent", "ratio", "kg_per_m2"] },
          observationCount: { type: "integer", minimum: 0 },
          startDate: { type: ["string", "null"], format: "date-time" },
          endDate: { type: ["string", "null"], format: "date-time" },
          direction: { type: "string", enum: ["INCREASING", "DECREASING", "STABLE", "INSUFFICIENT_DATA"] },
          reliability: { type: "string", enum: ["UNAVAILABLE", "CURRENT_ONLY", "BASIC_CHANGE", "TREND_ELIGIBLE"] },
        },
      },
      BodyTransformationConsistency: {
        type: "object",
        required: ["observationCount", "coveredIntervalCount", "totalIntervalCount", "coveragePercentage", "intervalUnit"],
        properties: {
          observationCount: { type: "integer", minimum: 0 },
          coveredIntervalCount: { type: "integer", minimum: 0 },
          totalIntervalCount: { type: "integer", minimum: 0 },
          coveragePercentage: { type: ["number", "null"], minimum: 0, maximum: 100 },
          intervalUnit: { type: "string", enum: ["DAY", "WEEK"] },
        },
      },
      BodyTransformationAnalytics: {
        type: "object",
        required: ["period", "dataSufficiency", "weight", "coreMeasurements", "pairedMeasurements", "calculatedMetrics", "consistency"],
        properties: {
          period: {
            type: "object",
            required: ["type", "startDate", "endDate"],
            properties: {
              type: { type: "string", enum: ["LAST_7_DAYS", "LAST_30_DAYS", "LAST_90_DAYS", "ALL_HISTORY", "CUSTOM"] },
              startDate: { type: ["string", "null"], format: "date-time" },
              endDate: { type: "string", format: "date-time" },
            },
          },
          dataSufficiency: {
            type: "object",
            required: ["bodyWeightObservationCount", "measurementSessionCount", "hasAnyData"],
            properties: {
              bodyWeightObservationCount: { type: "integer", minimum: 0 },
              measurementSessionCount: { type: "integer", minimum: 0 },
              hasAnyData: { type: "boolean" },
            },
          },
          weight: { $ref: "#/components/schemas/BodyTransformationTrend" },
          coreMeasurements: {
            type: "array",
            items: {
              type: "object", required: ["field", "trend"],
              properties: {
                field: { type: "string", enum: ["neck", "chest", "waist", "hips"] },
                trend: { $ref: "#/components/schemas/BodyTransformationTrend" },
              },
            },
          },
          pairedMeasurements: {
            type: "array",
            items: {
              type: "object", required: ["field", "left", "right"],
              properties: {
                field: { type: "string", enum: ["upperArms", "thighs", "calves"] },
                left: { $ref: "#/components/schemas/BodyTransformationTrend" },
                right: { $ref: "#/components/schemas/BodyTransformationTrend" },
              },
            },
          },
          calculatedMetrics: {
            type: "array",
            items: {
              type: "object", required: ["field", "trend"],
              properties: {
                field: { type: "string", enum: ["bmi", "bodyFat", "waistToHeightRatio", "fatMass", "leanMass"] },
                trend: { $ref: "#/components/schemas/BodyTransformationTrend" },
              },
            },
          },
          consistency: {
            type: "object", required: ["bodyWeight", "measurementSessions"],
            properties: {
              bodyWeight: { $ref: "#/components/schemas/BodyTransformationConsistency" },
              measurementSessions: { $ref: "#/components/schemas/BodyTransformationConsistency" },
            },
          },
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
