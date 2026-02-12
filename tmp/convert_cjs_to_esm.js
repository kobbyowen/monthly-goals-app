const fs = require('fs');
const path = require('path');

const root = process.cwd();
const exts = ['.js', '.ts', '.mjs', '.cjs'];
const ignore = ['node_modules', '.next', 'tmp', '.git'];

function read(p){ try { return fs.readFileSync(p,'utf8'); } catch(e){ return null; }}
function write(p, s){ fs.writeFileSync(p, s, 'utf8'); }

function processFile(full){
  let src = read(full);
  if(!src) return false;
  let out = src;
  // replace require(...) occurrences with import when top-level const/let/var assignment
  out = out.replace(/^(\s*)(?:const|let|var)\s+([A-Za-z0-9_${}\[\],\s]+)\s*=\s*require\((['"])([^'"\)]+)\3\)\s*;?/mg, (m, indent, left, q, mod) =>{
    // destructured or single identifier
    if(/^[{\[]/.test(left.trim())){
      return `${indent}import ${left.trim()} from '${mod}';`;
    }
    return `${indent}import ${left.trim()} from '${mod}';`;
  });

  // handle inline require('mod').something -> import mod from 'mod' then replace occurrences
  const inlineReqs = new Set();
  let m;
  while((m = /require\((['"])([^'"\)]+)\1\)\s*\.([A-Za-z0-9_$.]+)/g.exec(out))){
    inlineReqs.add(m[2]);
    // to avoid infinite loop, break; we will handle generally below
    break;
  }
  inlineReqs.forEach(mod => {
    const id = mod.replace(/[^A-Za-z0-9_$]/g, '_');
    if(!new RegExp(`import\\s+${id}\\s+from\\s+['\"]${mod}['\"]`).test(out)){
      out = `import ${id} from '${mod}';\n` + out;
      out = out.replace(new RegExp(`require\(['\"]${mod}['\"]\)`, 'g'), id);
    }
  });

  // replace module.exports = X -> export default X
  out = out.replace(/module\.exports\s*=\s*([\s\S]*?);?\n?$/m, (m, rhs) => {
    // if rhs starts with '{' it's likely an object of named exports: module.exports = { a, b }
    const trimmed = rhs.trim();
    if(trimmed.startsWith('{') && trimmed.endsWith('}')){
      // convert to named exports
      const inside = trimmed.slice(1, -1).trim();
      // handle simple 'a: a' or 'a'
      const parts = inside.split(',').map(s=>s.trim()).filter(Boolean);
      const lines = parts.map(p=>{
        if(p.includes(':')){
          const [k,v] = p.split(':').map(s=>s.trim());
          return `export const ${k} = ${v};`;
        }
        return `export const ${p} = ${p};`;
      }).join('\n');
      return lines + '\n';
    }
    return `export default ${rhs}`;
  });

  // replace exports.foo = bar -> export const foo = bar
  out = out.replace(/exports\.([A-Za-z0-9_$]+)\s*=\s*([\s\S]*?);/g, (m, name, rhs) => {
    return `export const ${name} = ${rhs};`;
  });

  // Remove leftover require('module') usages by adding imports at top (best-effort)
  const requireOnly = [];
  while((m = /require\((['"])([^'"\)]+)\1\)/g.exec(out))){
    requireOnly.push(m[2]);
    break;
  }
  requireOnly.forEach((mod)=>{
    const id = mod.replace(/[^A-Za-z0-9_$]/g, '_');
    if(!new RegExp(`import\s+.*from\s+['\"]${mod}['\"]`).test(out)){
      out = `import ${id} from '${mod}';\n` + out;
      out = out.replace(new RegExp(`require\(['\"]${mod}['\"]\)`, 'g'), id);
    }
  });

  if(out !== src){
    write(full, out);
    console.log('converted CJS -> ESM:', path.relative(root, full));
    return true;
  }
  return false;
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
