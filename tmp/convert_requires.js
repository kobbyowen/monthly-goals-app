const fs = require('fs');
const path = require('path');

const root = process.cwd();
const exts = ['.js', '.ts', '.tsx', '.mjs', '.cjs'];
const ignore = ['node_modules', '.next', 'tmp', '.git'];

function readFile(p){
  try { return fs.readFileSync(p,'utf8'); } catch(e){ return null; }
}

function writeFile(p, s){ fs.writeFileSync(p, s, 'utf8'); }

function isLikelyESModule(src){
  // simple heuristic: contains import/export or starts with export default
  return /(^|\n)\s*(import |export |export default)/.test(src);
}

function processFile(full){
  const src = readFile(full);
  if (!src) return false;
  if (full.includes('node_modules')) return false;

  // collect simple require declarations
  // patterns: const X = require('mod');  or  var X = require("mod");
  const declRe = /^(?:\s*)(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*require\((['"])([^'"\)]+)\2\)\s*;?/mg;
  // destructured: const { a, b } = require('mod');
  const destrRe = /^(?:\s*)(?:const|let|var)\s+\{\s*([A-Za-z0-9_,\s]+)\s*\}\s*=\s*require\((['"])([^'"\)]+)\2\)\s*;?/mg;

  let imports = [];
  let out = src;
  let m;
  while((m = destrRe.exec(src))){
    const names = m[1].trim();
    const mod = m[3];
    // skip dynamic or path patterns we can't handle cleanly
    if(mod.includes('+') || mod.includes('${')) continue;
    imports.push({ type: 'named', names, mod, raw: m[0] });
  }
  while((m = declRe.exec(src))){
    const local = m[1];
    const mod = m[3];
    if(mod.includes('+') || mod.includes('${')) continue;
    imports.push({ type: 'default', local, mod, raw: m[0]});
  }

  if(imports.length === 0){
    // handle inline require('path').resolve usages by adding import path from 'path' if found
    const inlineRe = /require\((['"])([^'"\)]+)\1\)\s*\./g;
    const inlineMods = new Set();
    while((m = inlineRe.exec(src))){
      inlineMods.add(m[2]);
    }
    if(inlineMods.size === 0) return false;
    // add imports for these modules if not already present
    for(const mod of inlineMods){
      const ident = mod.replace(/[^a-zA-Z0-9_]/g,'_');
      // skip if already imported
      if(new RegExp(`import\s+.*from\s+['\"]${mod}['\"]`).test(src)) continue;
      // prepend import at top
      out = `import ${ident} from '${mod}';\n` + out;
      // replace require('mod'). with ident.
      out = out.replace(new RegExp(`require\\(['\"]${mod}['\"]\\)\\.`,'g'), `${ident}.`);
    }
    writeFile(full, out);
    console.log('patched inline requires ->', path.relative(root, full));
    return true;
  }

  // Only modify files that are likely ES modules or .ts/.tsx
  const ext = path.extname(full);
  if(!isLikelyESModule(src) && !['.ts', '.tsx', '.mjs'].includes(ext)){
    // skip conversion for plain CommonJS files unless forced
    return false;
  }

  // build import lines and remove original require declarations
  let importLines = [];
  for(const imp of imports){
    if(imp.type === 'default'){
      // if local variable is path or similar and used as .resolve calls, keep name
      const local = imp.local;
      importLines.push(`import ${local} from '${imp.mod}';`);
      out = out.replace(imp.raw, '');
    } else if(imp.type === 'named'){
      importLines.push(`import { ${imp.names} } from '${imp.mod}';`);
      out = out.replace(imp.raw, '');
    }
  }

  // inject imports after existing import block or at top
  const firstImport = out.search(/(^|\n)import\s+/);
  if(firstImport !== -1){
    // insert before first import
    out = out.slice(0, firstImport) + importLines.join('\n') + '\n' + out.slice(firstImport);
  } else {
    out = importLines.join('\n') + '\n' + out;
  }

  writeFile(full, out);
  console.log('converted requires ->', path.relative(root, full));
  return true;
}

function walk(dir){
  for(const name of fs.readdirSync(dir)){
    if(ignore.includes(name)) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if(stat.isDirectory()) walk(full);
    else if(exts.includes(path.extname(name))) processFile(full);
  }
}

walk(root);
console.log('done');
