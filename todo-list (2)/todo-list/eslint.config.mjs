import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["dist/", "node_modules/"] },

  // ESLint's recommended rules: the sensible default set the lesson suggests.
  js.configs.recommended,

  // A few extra rules that catch real mistakes and keep the code modern.
  {
    rules: {
      eqeqeq: "error",
      "no-var": "error",
      "prefer-const": "error",
    },
  },

  // The app runs in the browser and uses ES modules.
  {
    files: ["src/**/*.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: globals.browser },
  },

  // Tests run in Node and use ES modules.
  {
    files: ["test/**/*.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: globals.node },
  },

  // webpack.config.js is a CommonJS file that runs in Node.
  {
    files: ["webpack.config.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "commonjs", globals: globals.node },
  },
];
