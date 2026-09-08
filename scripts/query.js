#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const IGNORE = new Set(['node_modules', '.git', '.coder', 'dist', 'build', 'coverage']);
const SOURCE_EXTENSIONS = new Set(['.vue', '.ts']);
const COMPONENT_DIRS = new Set(['components', 'component', 'views', 'pages', 'layouts', 'widgets']);
const FUNCTION_DIRS = new Set(['utils', 'util', 'lib', 'libs', 'helpers', 'helper', 'composables', 'shared']);
// Larger projects switch to a SQLite index automatically (SQLite loads per-row instead of the whole JSON).
const SQLITE_THRESHOLD_ENTRIES = 300; // at 300+ entries the index switches from JSON to SQLite

function usage() {
  console.log(`Usage: node query.js [options] <name>\n\nOptions:\n  --root <dir>       Project root (default: current directory)\n  --init             Detect stack (framework/version/language) and write .coder/profile.json\n  --refresh          Incrementally rebuild the local index\n  --json             Print machine-readable JSON\n  --kind <kind>      component, function, or all (default: all)\n  --db               Force SQLite index mode (auto when > ${SQLITE_THRESHOLD_ENTRIES} entries)\n  --no-db            Force JSON index mode\n  --help             Show this help`);
}

function parseArgs(argv) {
  const opts = { root: process.cwd(), refresh: false, json: false, kind: 'all', name: '', init: false, db: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--init') opts.init = true;
    else if (arg === '--refresh') opts.refresh = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--db') opts.db = true;
    else if (arg === '--no-db') opts.db = false;
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

// ---------- Stack detection (--init) ----------

const UI_LIBRARIES = {
  'element-plus': 'Element Plus',
  'ant-design-vue': 'Ant Design Vue',
  'naive-ui': 'Naive UI',
  vuetify: 'Vuetify',
  'shadcn-vue': 'shadcn-vue',
  'primevue': 'PrimeVue',
  quasar: 'Quasar',
};
const STATE_LIBRARIES = { pinia: 'Pinia', vuex: 'Vuex' };
const HTTP_LIBRARIES = { axios: 'Axios', '@vueuse/core': 'VueUse', 'ofetch': 'ofetch' };

function semverClean(value) {
  return typeof value === 'string' ? value.replace(/[^0-9.]/g, '') : '';
}

function detectStack(root) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const has = (name) => Boolean(deps[name]);
  const language = {
    typescript: has('typescript') || fs.existsSync(path.join(root, 'tsconfig.json')),
    version: deps.typescript ? semverClean(deps.typescript) : null,
  };
  const frameworks = [];
  const fileTypes = [];
  if (deps.vue) {
    frameworks.push({ name: 'vue', version: semverClean(deps.vue) });
    fileTypes.push({ extension: '.vue', role: 'component' });
  }
  if (deps.react) frameworks.push({ name: 'react', version: semverClean(deps.react) });
  if (deps.svelte) frameworks.push({ name: 'svelte', version: semverClean(deps.svelte) });
  const viteVersion = deps.vite || (pkg.devDependencies && pkg.devDependencies.vite);
  const bundler = viteVersion ? { name: 'vite', version: semverClean(viteVersion) } : null;
  const router = deps['vue-router'] ? { name: 'vue-router', version: semverClean(deps['vue-router']) } : null;
  const ui = Object.keys(UI_LIBRARIES).filter(has).map((name) => ({ name, label: UI_LIBRARIES[name], version: semverClean(deps[name]) }));
  const state = Object.keys(STATE_LIBRARIES).filter(has).map((name) => ({ name, label: STATE_LIBRARIES[name], version: semverClean(deps[name]) }));
  const http = Object.keys(HTTP_LIBRARIES).filter(has).map((name) => ({ name, label: HTTP_LIBRARIES[name], version: semverClean(deps[name]) }));
  for (const ext of ['.ts', '.tsx', '.js']) if (walkExtensions(root, ext).length) fileTypes.push({ extension: ext, role: ext === '.ts' || ext === '.tsx' ? 'logic' : 'legacy' });
  return {
    generatedAt: new Date().toISOString(),
    projectRoot: root,
    projectName: pkg.name || path.basename(root),
    language,
    bundler,
    frameworks,
    router,
    ui,
    state,
    http,
    fileTypes,
    toolchain: { linter: deps.oxlint ? 'oxlint' : null, formatter: deps.oxfmt ? 'oxfmt' : null, test: deps.vitest ? 'vitest' : null },
  };
}

function walkExtensions(root, ext, dir = root, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(entry.name) || entry.name.startsWith('.')) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walkExtensions(root, ext, file, out);
    else if (path.extname(file) === ext) out.push(file);
  }
  return out;
}

// ---------- Index backends: JSON and SQLite ----------

function buildEntries(root, previousEntries = []) {
  const files = walk(root).sort();
  const byPath = new Map(previousEntries.map((entry) => [entry.path, entry]));
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
  return entries;
}

function readMeta(root) {
  const metaPath = path.join(root, '.coder', 'meta.json');
  try {
    return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  } catch {
    return null;
  }
}

function writeMeta(root, meta) {
  fs.mkdirSync(path.join(root, '.coder'), { recursive: true });
  fs.writeFileSync(path.join(root, '.coder', 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
}

function decideBackend(root, opts, entryCount) {
  if (opts.db === true) return 'sqlite';
  if (opts.db === false) return 'json';
  const meta = readMeta(root);
  // Only a previously *auto*-chosen backend is sticky; explicit --db/--no-db never persists.
  if (meta?.backend && meta.autoChosen) return meta.backend;
  return entryCount >= SQLITE_THRESHOLD_ENTRIES ? 'sqlite' : 'json';
}

function ensureSqliteAvailable(root) {
  const dir = path.join(root, '.coder');
  const dbPath = path.join(dir, 'index.sqlite');
  let Database;
  try {
    ({ DatabaseSync: Database } = require('node:sqlite'));
  } catch {
    throw new Error('SQLite mode requires Node >= 22.5 (node:sqlite). Use --no-db or upgrade Node.');
  }
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(dbPath);
  db.exec(`CREATE TABLE IF NOT EXISTS files (
    path TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    extension TEXT NOT NULL,
    bytes INTEGER NOT NULL,
    mtime_ms INTEGER NOT NULL,
    hash TEXT NOT NULL,
    exports TEXT NOT NULL,
    props TEXT NOT NULL,
    emits TEXT NOT NULL,
    has_template INTEGER NOT NULL,
    has_script_setup INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_files_name ON files(name);
  CREATE INDEX IF NOT EXISTS idx_files_kind ON files(kind);`);
  return { db, dbPath };
}

function buildIndex(root, opts) {
  const previous = readIndex(root, { db: null, refresh: false, quiet: true });
  const previousEntries = previous?.backend === 'sqlite' ? previous.entries : previous?.entries || [];
  const entries = buildEntries(root, previousEntries);
  const explicit = opts.db === true || opts.db === false;
  const backend = decideBackend(root, opts, entries.length);
  const autoChosen = !explicit;
  if (backend === 'sqlite') {
    const { db, dbPath } = ensureSqliteAvailable(root);
    db.exec('DELETE FROM files');
    const insert = db.prepare('INSERT INTO files (path, name, kind, extension, bytes, mtime_ms, hash, exports, props, emits, has_template, has_script_setup) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const entry of entries) {
      insert.run(entry.path, entry.name, entry.kind, entry.extension, entry.bytes, Math.round(entry.mtimeMs), entry.hash, JSON.stringify(entry.exports || []), JSON.stringify(entry.props || []), JSON.stringify(entry.emits || []), entry.hasTemplate ? 1 : 0, entry.hasScriptSetup ? 1 : 0);
    }
    db.close();
    writeMeta(root, { version: 2, backend: 'sqlite', autoChosen, generatedAt: new Date().toISOString(), count: entries.length, dbPath: '.coder/index.sqlite' });
    return { backend: 'sqlite', dbPath, count: entries.length };
  }
  fs.mkdirSync(path.join(root, '.coder'), { recursive: true });
  const payload = { version: 2, backend: 'json', generatedAt: new Date().toISOString(), root, entries };
  fs.writeFileSync(path.join(root, '.coder', 'index.json'), `${JSON.stringify(payload, null, 2)}\n`);
  writeMeta(root, { version: 2, backend: 'json', autoChosen, generatedAt: payload.generatedAt, count: entries.length });
  return { backend: 'json', indexPath: path.join(root, '.coder', 'index.json'), count: entries.length };
}

function readIndex(root, opts = {}) {
  const meta = readMeta(root);
  if (meta?.backend === 'sqlite') {
    if (!fs.existsSync(path.join(root, '.coder', 'index.sqlite'))) {
      if (opts.quiet) return null;
      throw new Error('SQLite index missing. Run --refresh to rebuild.');
    }
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(path.join(root, '.coder', 'index.sqlite'));
    const rows = db.prepare('SELECT * FROM files').all();
    db.close();
    return {
      backend: 'sqlite',
      entries: rows.map((row) => ({
        name: row.name,
        path: row.path,
        kind: row.kind,
        extension: row.extension,
        exports: JSON.parse(row.exports),
        ...(row.kind === 'component' ? { props: JSON.parse(row.props), emits: JSON.parse(row.emits), hasTemplate: Boolean(row.has_template), hasScriptSetup: Boolean(row.has_script_setup) } : {}),
        bytes: row.bytes,
        mtimeMs: row.mtime_ms,
        hash: row.hash,
      })),
    };
  }
  const jsonPath = path.join(root, '.coder', 'index.json');
  if (!fs.existsSync(jsonPath)) {
    if (opts.quiet) return null;
    throw new Error('No index found. Run --refresh first.');
  }
  return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
}

// ---------- Output ----------

function printResults(opts, root, matches) {
  if (opts.json) return console.log(JSON.stringify({ query: opts.name, backend: matches.backend, results: matches.entries }, null, 2));
  if (!matches.entries.length) throw new Error(`No match for "${opts.name}"${opts.kind === 'all' ? '' : ` (${opts.kind})`}. Run with --refresh after source changes.`);
  for (const entry of matches.entries) {
    console.log(`## ${entry.name} [${entry.kind}]`);
    console.log(`- File: ${entry.path}`);
    if (entry.exports?.length) console.log(`- Exports: ${entry.exports.join(', ')}`);
    if (entry.kind === 'component') console.log(`- SFC: template=${entry.hasTemplate}, script setup=${entry.hasScriptSetup}, props=${entry.props.join(', ') || 'none'}, emits=${entry.emits.join(', ') || 'none'}`);
    console.log(`- Index hash: ${entry.hash}`);
  }
}

function runQuery(opts, root, index) {
  const query = opts.name.toLowerCase();
  const matched = index.entries.filter((entry) => (opts.kind === 'all' || entry.kind === opts.kind) && [entry.name, entry.path, ...entry.exports].some((value) => value.toLowerCase().includes(query)));
  const entries = matched.map((entry) => ({ ...entry, absolutePath: path.join(root, entry.path) }));
  printResults(opts, root, { backend: index.backend || 'json', entries });
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) return usage();
  const root = projectRoot(opts.root);

  if (opts.init) {
    const profile = detectStack(root);
    fs.mkdirSync(path.join(root, '.coder'), { recursive: true });
    fs.writeFileSync(path.join(root, '.coder', 'profile.json'), `${JSON.stringify(profile, null, 2)}\n`);
    if (opts.json) return console.log(JSON.stringify(profile, null, 2));
    console.log(`Stack profile written to ${path.join(root, '.coder/profile.json')}`);
    console.log(`Project: ${profile.projectName}`);
    console.log(`Frameworks: ${profile.frameworks.map((f) => `${f.name}@${f.version || '?'}`).join(', ') || 'none'}`);
    console.log(`Bundler: ${profile.bundler ? `${profile.bundler.name}@${profile.bundler.version}` : 'unknown'}`);
    console.log(`Router: ${profile.router ? `${profile.router.name}@${profile.router.version}` : 'none'}`);
    console.log(`UI: ${profile.ui.map((u) => u.label).join(', ') || 'none'}`);
    console.log(`State: ${profile.state.map((s) => s.label).join(', ') || 'none'}`);
    console.log(`TypeScript: ${profile.language.typescript ? `yes${profile.language.version ? ` @ ${profile.language.version}` : ''}` : 'no'}`);
    console.log(`File types: ${profile.fileTypes.map((f) => f.extension).join(', ') || 'none'}`);
    console.log(`Toolchain: ${Object.values(profile.toolchain).filter(Boolean).join(', ') || 'none'}`);
    return;
  }

  if (!opts.name && !opts.refresh) throw new Error('Provide a component/function name, or use --refresh');
  if (opts.refresh) {
    const built = buildIndex(root, opts);
    return console.log(opts.json ? JSON.stringify(built, null, 2) : `Indexed ${built.count} files (${built.backend}) in ${built.dbPath || built.indexPath}`);
  }
  const index = readIndex(root);
  runQuery(opts, root, index);
}

try { main(); } catch (error) { console.error(`[coder] ${error.message}`); process.exitCode = 1; }
