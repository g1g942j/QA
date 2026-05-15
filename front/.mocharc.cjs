module.exports = {
  require: ["tsx/cjs", "./tests/ui/mocha-root-hooks.ts"],
  spec: [
    "tests/ui/specs/system-landing.spec.ts",
    "tests/ui/specs/system-products-form.spec.ts",
    "tests/ui/specs/system-products-macro-boundaries.spec.ts",
    "tests/ui/specs/system-products-filter-sort.spec.ts",
    "tests/ui/specs/system-dishes.spec.ts",
    "tests/ui/specs/system-dishes-filter-sort.spec.ts",
    "tests/ui/specs/system-product-dish-integration.spec.ts",
    "tests/ui/specs/system-crud-view-photo.spec.ts",
  ],
  timeout: 60_000,
  slow: 10_000,
  ui: "bdd",
};
