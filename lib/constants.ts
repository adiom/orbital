import { generateDummyPassword } from "./db/utils";

export const isProductionEnvironment = process.env.NODE_ENV === "production";
export const isDevelopmentEnvironment = process.env.NODE_ENV === "development";
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT
);

// Флаг для тестирования production-авторизации в dev-режиме
// Установите TEST_PRODUCTION_AUTH=true в .env.local для тестирования secure cookies
export const shouldUseSecureCookies =
  isProductionEnvironment || process.env.TEST_PRODUCTION_AUTH === "true";

export const guestRegex = /^guest-\d+$/;

export const DUMMY_PASSWORD = generateDummyPassword();
