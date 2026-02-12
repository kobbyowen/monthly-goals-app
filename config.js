const devConfig = require("./config.dev.js");
const prodConfig = require("./config.prod.js");

const env =
  process.env.NODE_ENV === "production" ? "production" : "development";
const cfg = env === "production" ? prodConfig : devConfig;

module.exports = {
  BASE_PATH: cfg.BASE_PATH,
  DATABASE_URL: process.env.DATABASE_URL || cfg.DATABASE_URL,
  API_URL_BASE: process.env.API_URL_BASE || cfg.API_URL_BASE,
  ASSET_PREFIX: cfg.ASSET_PREFIX || "",
};
