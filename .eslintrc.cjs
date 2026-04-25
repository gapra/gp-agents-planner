/* eslint-env node */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    project: ["./tsconfig.json"],
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  env: {
    node: true,
    es2022: true,
  },
  ignorePatterns: ["dist/", "node_modules/", "*.cjs", "vitest.config.ts"],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/consistent-type-imports": "error",
    "no-console": ["warn", { allow: ["error", "warn"] }],
    eqeqeq: ["error", "always"],
  },
  overrides: [
    {
      files: ["tests/**/*.ts"],
      parserOptions: { project: ["./tsconfig.test.json"] },
      rules: {
        "@typescript-eslint/no-non-null-assertion": "off",
      },
    },
  ],
};
