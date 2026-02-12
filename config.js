import __config_prod_js from './config.prod.js';
// Pick environment config (dev/prod). Default to dev when NODE_ENV !== 'production'.
const env =
  process.env.NODE_ENV === "production" ? "production" : "development";
let cfg;
if (env === "production") {
  cfg = require("./config.prod.js");
} else {
  cfg = require("./config.dev.js");
}

export default {
  BASE_PATH: cfg.BASE_PATH,
  DATABASE_URL: process.env.DATABASE_URL || cfg.DATABASE_URL,
  API_URL_BASE: process.env.API_URL_BASE || cfg.API_URL_BASE,
  ASSET_PREFIX: cfg.ASSET_PREFIX || "",
};
