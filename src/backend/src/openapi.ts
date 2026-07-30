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
