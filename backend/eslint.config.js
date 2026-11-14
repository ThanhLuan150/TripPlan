import js from "@eslint/js";
import globals from "globals";

export default [
    { ignores: ["node_modules/", "coverage/", ".yarn/"] },
    js.configs.recommended,
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: { ...globals.node },
        },
        linterOptions: {
            reportUnusedDisableDirectives: "error",
        },
        rules: {
            // `const { secret, ...rest } = obj` is the way fields are dropped here
            "no-unused-vars": ["error", { argsIgnorePattern: "^_", ignoreRestSiblings: true, caughtErrors: "none" }],
            eqeqeq: ["error", "always"],
            "no-var": "error",
            "prefer-const": "error",
        },
    },
];
