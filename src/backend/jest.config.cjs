module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],

  transform: {
    "^.+\\.tsx?$": "babel-jest",
  },

  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  moduleFileExtensions: ["ts", "tsx", "js", "json"],

  clearMocks: true,

  collectCoverageFrom: [
    "src/controllers/**/*.ts",
    "src/middleware/**/*.ts",
    "!src/**/*.d.ts",
  ],
};
