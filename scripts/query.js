#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const IGNORE = new Set(['node_modules', '.git', '.coder', 'dist', 'build', 'coverage']);
const SOURCE_EXTENSIONS = new Set(['.vue', '.ts']);
const COMPONENT_DIRS = new Set(['components', 'component', 'views', 'pages', 'layouts', 'widgets']);
const FUNCTION_DIRS = new Set(['utils', 'util', 'lib', 'libs', 'helpers', 'helper', 'composables', 'shared']);

function usage() {
  console.log(`Usage: node query.js [options] <name>\n\nOptions:\n  --root <dir>       Project root (default: current directory)\n  --refresh          Rebuild the local .coder/index.json\n  --json             Print machine-readable JSON\n  --kind <kind>      component, function, or all (default: all)\n  --help             Show this help`);
}

function parseArgs(argv) {
  const opts = { root: process.cwd(), refresh: false, json: false, kind: 'all', name: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--refresh') opts.refresh = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--root') opts.root = path.resolve(argv[++i] || '');
    else if (arg === '--kind') opts.kind = argv[++i] || 'all';
    else if (!arg.startsWith('-') && !opts.name) opts.name = arg;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!['all', 'component', 'function'].includes(opts.kind)) throw new Error('--kind must be component, function, or all');
  return opts;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(entry.name) || entry.name.startsWith('.')) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, out);
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) out.push(file);
  }
  return out;
}

function projectRoot(start) {
  let current = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(current, 'package.json'))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error(`No package.json found above ${start}`);
    current = parent;
  }
}

function classify(file) {
  const ext = path.extname(file);
  if (ext === '.vue') return 'component';
  const parts = file.split(path.sep);
  return parts.some((part) => FUNCTION_DIRS.has(part)) ? 'function' : 'module';
}

function exportsFrom(text) {
  const names = [];
  const re = /export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/g;
  let match;
  while ((match = re.exec(text))) names.push(match[1]);
  const defaults = text.match(/export\s+default\s+(?:function|class)?\s*([A-Za-z_$][\w$]*)?/);
  if (defaults && defaults[1]) names.push(`default:${defaults[1]}`);
  return [...new Set(names)];
}

function componentInfo(text) {
  const props = [];
  const generic = text.match(/defineProps\s*<([\s\S]*?)>\s*\(/);
  if (generic) for (const match of generic[1].matchAll(/([A-Za-z_$][\w$]*)\s*[?:]/g)) props.push(match[1]);
  const object = text.match(/defineProps\s*\(\s*\{([\s\S]*?)\}\s*\)/);
  if (object) for (const match of object[1].matchAll(/([A-Za-z_$][\w$]*)\s*:/g)) props.push(match[1]);
  const emits = [...text.matchAll(/defineEmits\s*\(\s*\[([\s\S]*?)\]/g)].flatMap((m) => [...m[1].matchAll(/["']([^"']+)["']/g)].map((x) => x[1]));
  return { props: [...new Set(props)], emits: [...new Set(emits)], hasTemplate: /<template\b/.test(text), hasScriptSetup: /<script\s+setup/.test(text) };
}

function buildIndex(root, previous = null) {
  const files = walk(root).sort();
  const byPath = new Map((previous?.entries || []).map((entry) => [entry.path, entry]));
  const entries = [];
  for (const file of files) {
    const relative = path.relative(root, file);
    const stat = fs.statSync(file);
    const cached = byPath.get(relative);
    // Incremental: reuse unchanged entries (same size + mtime), re-read only modified files.
    if (cached && cached.bytes === stat.size && cached.mtimeMs === stat.mtimeMs) {
      entries.push(cached);
      continue;
    }
    const text = fs.readFileSync(file, 'utf8');
    const kind = classify(file);
    entries.push({ name: path.basename(file, path.extname(file)), path: relative, kind, extension: path.extname(file).slice(1), exports: exportsFrom(text), ...kind === 'component' ? componentInfo(text) : {}, bytes: stat.size, mtimeMs: stat.mtimeMs, hash: crypto.createHash('sha1').update(text).digest('hex').slice(0, 12) });
  }
  return { version: 1, generatedAt: new Date().toISOString(), root, entries };
}

function loadIndex(root, refresh) {
  const dir = path.join(root, '.coder');
  const file = path.join(dir, 'index.json');
  const previous = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  if (!refresh && previous) return previous;
  const index = buildIndex(root, previous);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(index, null, 2)}\n`);
  return index;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) return usage();
  if (!opts.name && !opts.refresh) throw new Error('Provide a component/function name, or use --refresh');
  const root = projectRoot(opts.root);
  const index = loadIndex(root, opts.refresh);
  if (!opts.name) return console.log(opts.json ? JSON.stringify({ refreshed: true, count: index.entries.length }) : `Indexed ${index.entries.length} Vue/TypeScript files in ${path.join(root, '.coder/index.json')}`);
  const query = opts.name.toLowerCase();
  const matches = index.entries.filter((entry) => (opts.kind === 'all' || entry.kind === opts.kind) && [entry.name, entry.path, ...entry.exports].some((value) => value.toLowerCase().includes(query)));
  const result = matches.map((entry) => ({ ...entry, absolutePath: path.join(root, entry.path) }));
  if (opts.json) return console.log(JSON.stringify({ query: opts.name, results: result }, null, 2));
  if (!result.length) throw new Error(`No match for "${opts.name}"${opts.kind === 'all' ? '' : ` (${opts.kind})`}. Run with --refresh after source changes.`);
  for (const entry of result) {
    console.log(`## ${entry.name} [${entry.kind}]`);
    console.log(`- File: ${entry.path}`);
    if (entry.exports?.length) console.log(`- Exports: ${entry.exports.join(', ')}`);
    if (entry.kind === 'component') console.log(`- SFC: template=${entry.hasTemplate}, script setup=${entry.hasScriptSetup}, props=${entry.props.join(', ') || 'none'}, emits=${entry.emits.join(', ') || 'none'}`);
    console.log(`- Index hash: ${entry.hash}`);
  }
}

try { main(); } catch (error) { console.error(`[coder] ${error.message}`); process.exitCode = 1; }
