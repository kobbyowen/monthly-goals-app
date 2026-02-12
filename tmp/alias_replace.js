const fs = require("fs");
const path = require("path");

const root = process.cwd();
const exts = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const ignore = ["node_modules", ".next", "tmp", ".git"];

const rules = [
  {
    from: /((?:\.\.\/)+)components(\/[^'"\n]*)?/g,
    to: (m, p1, p2) => `@components${p2 || ""}`,
  },
  {
    from: /((?:\.\.\/)+)hooks(\/[^'"\n]*)?/g,
    to: (m, p1, p2) => `@hooks${p2 || ""}`,
  },
  {
    from: /((?:\.\.\/)+)lib(\/[^'"\n]*)?/g,
    to: (m, p1, p2) => `@lib${p2 || ""}`,
  },
  {
    from: /((?:\.\.\/)+)api(\/[^'"\n]*)?/g,
    to: (m, p1, p2) => `@api${p2 || ""}`,
  },
  {
    from: /((?:\.\.\/)+)services(\/[^'"\n]*)?/g,
    to: (m, p1, p2) => `@services${p2 || ""}`,
  },
  {
    from: /((?:\.\.\/)+)repositories(\/[^'"\n]*)?/g,
    to: (m, p1, p2) => `@repositories${p2 || ""}`,
  },
  {
    from: /((?:\.\.\/)+)utils(\/[^'"\n]*)?/g,
    to: (m, p1, p2) => `@utils${p2 || ""}`,
  },
  {
    from: /((?:\.\.\/)+)server(\/[^'"\n]*)?/g,
    to: (m, p1, p2) => `@server${p2 || ""}`,
  },
  {
    from: /((?:\.\.\/)+)\(pages\)(\/[^'"\n]*)?/g,
    to: (m, p1, p2) => `@pages${p2 || ""}`,
  },
];

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (ignore.includes(name)) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (exts.includes(path.extname(name))) {
      let src = fs.readFileSync(full, "utf8");
      let out = src;
      // only replace module specifiers (in import/require/dynamic-import)
      // a simple approach: replace occurrences of "../components/..." and '../../components'
      for (const r of rules) {
        out = out.replace(r.from, r.to);
      }
      if (out !== src) {
        fs.writeFileSync(full, out, "utf8");
        console.log("Updated", path.relative(root, full));
      }
    }
  }
}

walk(root);
console.log("Done");
