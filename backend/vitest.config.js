import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["__tests__/**/*.test.js"],
        // Set before src/config/env.js loads, so a local .env never changes
        // the values the tests rely on (dotenv does not override them).
        env: {
            NODE_ENV: "test",
            PORT: "0",
            CORS_ORIGIN: "*",
            PUBLIC_URL: "",
            MAX_IMAGE_MB: "1",
            MONGODB_URI: "mongodb://127.0.0.1:27017/aloca-test",
            ACCESS_TOKEN_SECRET: "test-access-secret",
            REFRESH_TOKEN_SECRET: "test-refresh-secret",
            API_KEY_CHAT: "test-gemini-key",
            MODEL_NAME: "model-a",
            MODEL_FALLBACKS: "model-b, model-c",
            HERE_API_KEY: "test-here-key",
            USERNAME_MAIL: "noreply@example.com",
            PASSWORD_MAIL: "test",
        },
        clearMocks: true,
        coverage: {
            provider: "v8",
            // every source file, including entry point, seeds, models and repositories
            include: ["src/**/*.js"],
            reporter: ["text", "lcov", "json-summary"],
            reportsDirectory: "coverage",
            // CI fails below these numbers
            thresholds: {
                statements: 95,
                branches: 95,
                functions: 95,
                lines: 95,
            },
        },
    },
});
