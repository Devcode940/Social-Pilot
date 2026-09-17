import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Explicit `any` is tolerated (warn) in AI-response parsing code,
      // but new code should prefer `unknown` + narrowing.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-comment": "off",

      // React: exhaustive-deps as a warning (many intentional mount-once effects).
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",

      // Next.js: allow raw <img> for user-uploaded/external images.
      "@next/next/no-img-element": "off",

      // General: keep the sharp edges on.
      "prefer-const": "error",
      "no-debugger": "error",
      "no-empty": "error",
    },
  },
  {
    // Vendored shadcn/ui primitives: upstream patterns (e.g. Math.random in a
    // memoised skeleton) intentionally trip the experimental purity rules.
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "examples/**",
      "skills/**",
    ],
  },
];

export default eslintConfig;
