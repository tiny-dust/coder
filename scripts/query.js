#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const IGNORE = new Set(['node_modules', '.git', '.coder', 'dist', 'build', 'coverage']);
const SOURCE_EXTENSIONS = new Set(['.vue', '.ts', '.tsx', '.js', '.jsx']);
const CHECK_EXTENSIONS = new Set(['.vue', '.ts', '.tsx', '.js', '.jsx']);
const COMPONENT_DIRS = new Set(['components', 'component', 'views', 'pages', 'layouts', 'widgets']);
const FUNCTION_DIRS = new Set(['utils', 'util', 'lib', 'libs', 'helpers', 'helper', 'composables', 'shared']);
// Larger projects switch to a SQLite index automatically (SQLite loads per-row instead of the whole JSON).
const SQLITE_THRESHOLD_ENTRIES = 300; // at 300+ entries the index switches from JSON to SQLite

function usage() {
  console.log(`Usage: node query.js [options] <name>\n\nOptions:\n  --root <dir>       Project root (default: current directory)\n  --init             Detect stack (framework/version/language) and write .coder/profile.json\n  --refresh          Incrementally rebuild the local index\n  --check            Verify size limits and enum rules (.vue ≤ 500, script ≤ 300, others ≤ 500; no enum/as-const enums)\n  --json             Print machine-readable JSON\n  --no-snippet       Text output only: skip source snippets\n  --lines <n>        Snippet length in lines (default 30)\n  --kind <kind>      component, function, or all (default: all)\n  --db               Force SQLite index mode (auto when > ${SQLITE_THRESHOLD_ENTRIES} entries)\n  --no-db            Force JSON index mode\n  --help             Show this help`);
}

function parseArgs(argv) {
  const opts = { root: process.cwd(), refresh: false, json: false, kind: 'all', name: '', init: false, check: false, db: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--init') opts.init = true;
    else if (arg === '--refresh') opts.refresh = true;
  else if (arg === '--check') opts.check = true;
  else if (arg === '--no-snippet') opts.noSnippet = true;
  else if (arg === '--lines') opts.lines = argv[++i];
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

function walk(dir, out = [], extensions = SOURCE_EXTENSIONS) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(entry.name) || entry.name.startsWith('.')) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, out, extensions);
    else if (extensions.has(path.extname(entry.name))) out.push(file);
  }
  return out;
}

function countLines(text) {
  if (!text) return 0;
  return text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n').length;
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

// Per-symbol locations with start/end lines, plus the file's import list.
function locateExports(text) {
  const lines = text.split('\n');
  const symbols = [];
  const re = /export\s+(?:default\s+)?(?:async\s+)?(function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)?/;
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(re);
    if (!match) continue;
    const name = match[2] || 'default';
    let end = i;
    if (match[1] === 'function' || match[1] === 'function*' || match[1] === 'class') {
      // Brace matching from the first { after the signature.
      let depth = 0;
      let started = false;
      outer: for (let j = i; j < lines.length; j += 1) {
        for (const ch of lines[j]) {
          if (ch === '{') {
            depth += 1;
            started = true;
          } else if (ch === '}') {
            depth -= 1;
            if (started && depth === 0) {
              end = j;
              break outer;
            }
          }
        }
      }
    } else {
      // const/let: ends at the line where braces/brackets balance (or same line for simple values).
      let depth = 0;
      for (let j = i; j < lines.length; j += 1) {
        for (const ch of lines[j]) {
          if ('{[('.includes(ch)) depth += 1;
          else if ('}])'.includes(ch)) depth -= 1;
        }
        end = j;
        if (j > i && depth <= 0) break;
        if (j === i && depth <= 0 && !/[{[(]/.test(lines[j])) break;
      }
    }
    symbols.push({ name, startLine: i + 1, endLine: end + 1 });
  }
  const imports = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/import\s+(?:type\s+)?[\s\S]*?from\s+['"]([^'"]+)['"]/);
    if (m) imports.push({ source: m[1], line: i + 1 });
    else if (/^import\s+['"]/.test(lines[i].trim())) imports.push({ source: lines[i].trim().replace(/^import\s+['"]|['"];.*$/g, ''), line: i + 1 });
  }
  return { symbols, imports };
}

function componentInfo(text) {
  const props = [];
  const generic = text.match(/defineProps\s*<([\s\S]*?)>\s*\(/);
  if (generic) for (const match of generic[1].matchAll(/([A-Za-z_$][\w$]*)\s*[?:]/g)) props.push(match[1]);
  const object = text.match(/defineProps\s*\(\s*\{([\s\S]*?)\}\s*\)/);
  if (object) {
    // Collect only top-level keys; nested `{ type: ... }` config fields are not props.
    const source = object[1];
    let depth = 0;
    let inString = '';
    for (let i = 0; i < source.length; i += 1) {
      const ch = source[i];
      if (inString) {
        if (ch === inString && source[i - 1] !== '\\') inString = '';
        continue;
      }
      if (ch === '"' || ch === "'") {
        inString = ch;
        continue;
      }
      if (ch === '{' || ch === '[' || ch === '(') {
        depth += 1;
        continue;
      }
      if (ch === '}' || ch === ']' || ch === ')') {
        depth -= 1;
        continue;
      }
      if (depth !== 0 || !/[A-Za-z_$]/.test(ch)) continue;
      const match = source.slice(i).match(/^([A-Za-z_$][\w$]*)\s*:/);
      if (match) {
        props.push(match[1]);
        i += match[0].length - 1;
      }
    }
  }
  const emits = [...text.matchAll(/defineEmits\s*(?:<([\s\S]*?)>|\(\s*\[([\s\S]*?)\]\s*\))/g)].flatMap((m) => [...(m[1] || m[2] || '').matchAll(/["']([^"']+)["']/g)].map((x) => x[1]));
  return { props: [...new Set(props)], emits: [...new Set(emits)], hasTemplate: /<template\b/.test(text), hasScriptSetup: /<script\s+setup/.test(text), computed: computedInfo(text) };
}

function computedInfo(text) {
  const lines = text.split('\n');
  const computed = [];
  const re = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*computed\s*\(/;
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(re);
    if (!match) continue;
    const form = /computed\s*\(\s*\{/.test(lines[i]) ? 'object' : 'getter';
    let end = i;
    let depth = 0;
    let started = false;
    outer: for (let j = i; j < lines.length; j += 1) {
      for (const ch of lines[j]) {
        if ('({['.includes(ch)) {
          depth += 1;
          started = true;
        } else if ('})]'.includes(ch)) {
          depth -= 1;
          if (started && depth === 0) {
            end = j;
            break outer;
          }
        }
      }
    }
    computed.push({ name: match[1], form, startLine: i + 1, endLine: end + 1, lines: end - i + 1 });
  }
  return computed;
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
// Server-side frameworks & notable libraries (any JS/TS backend).
const SERVER_LIBRARIES = {
  hono: 'Hono',
  express: 'Express',
  fastify: 'Fastify',
  '@nestjs/core': 'NestJS',
  koa: 'Koa',
  'drizzle-orm': 'Drizzle ORM',
  prisma: 'Prisma',
  '@prisma/client': 'Prisma',
  mongoose: 'Mongoose',
  'graphql': 'GraphQL',
  ws: 'ws (WebSocket)',
  mqtt: 'MQTT',
  protobufjs: 'Protobuf',
};

function semverClean(value) {
  return typeof value === 'string' ? value.replace(/[^0-9.]/g, '') : '';
}

// Resolve pnpm catalog versions ("catalog:" specifiers) via pnpm-workspace.yaml.
function loadPnpmCatalog(root) {
  const file = path.join(root, 'pnpm-workspace.yaml');
  if (!fs.existsSync(file)) return { catalog: {}, globs: [] };
  const catalog = {};
  const globs = [];
  let section = null;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed === 'catalog:' || trimmed.startsWith('catalogs:')) {
      section = 'catalog';
      continue;
    }
    if (trimmed === 'packages:') {
      section = 'packages';
      continue;
    }
    if (!line.startsWith(' ') || !trimmed) continue;
    if (section === 'catalog' && trimmed.includes(':')) {
      const [name, version] = trimmed.split(':');
      catalog[name.trim().replace(/^['"]|['"]$/g, '')] = String(version || '').trim().replace(/^['"]|['"]$/g, '');
    }
    if (section === 'packages' && trimmed.startsWith('- ')) globs.push(trimmed.slice(2).trim().replace(/^['"]|['"]$/g, ''));
  }
  return { catalog, globs };
}

// Collect member package.json files declared by pnpm workspace globs (apps/*/web, packages/*).
function workspaceMembers(root, globs) {
  const members = [];
  for (const glob of globs) {
    const base = glob.split('/*')[0];
    const dir = path.join(root, base);
    if (!fs.existsSync(dir)) continue;
    const suffix = glob.split('/*').slice(1).join('/');
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const pkgPath = path.join(dir, entry.name, suffix, 'package.json').replace(/\/+$/, (m) => m);
      const normalized = suffix ? path.join(dir, entry.name, suffix, 'package.json') : path.join(dir, entry.name, 'package.json');
      if (fs.existsSync(normalized)) members.push(JSON.parse(fs.readFileSync(normalized, 'utf8')));
      void pkgPath;
    }
  }
  return members;
}

function detectStack(root) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const { catalog, globs } = loadPnpmCatalog(root);
  // All dependency sources: root pkg + pnpm catalog + workspace member packages.
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  for (const [name, version] of Object.entries(catalog)) {
    if (deps[name] === 'catalog:' || !(name in deps)) deps[name] = version;
  }
  const members = workspaceMembers(root, globs);
  for (const member of members) {
    for (const [name, version] of Object.entries({ ...(member.dependencies || {}), ...(member.devDependencies || {}) })) {
      deps[name] = version === 'catalog:' ? (catalog[name] ?? version) : version;
    }
  }
  const versionOf = (name) => (deps[name] === 'catalog:' ? '' : semverClean(deps[name]));
  const has = (name) => Boolean(deps[name]);
  const language = {
    typescript: has('typescript') || fs.existsSync(path.join(root, 'tsconfig.json')),
    version: has('typescript') ? versionOf('typescript') : null,
  };
  const frameworks = [];
  const fileTypes = [];
  if (deps.vue) {
    frameworks.push({ name: 'vue', version: versionOf('vue'), role: 'frontend' });
    fileTypes.push({ extension: '.vue', role: 'component' });
  }
  if (deps.react) frameworks.push({ name: 'react', version: versionOf('react'), role: 'frontend' });
  if (deps.svelte) frameworks.push({ name: 'svelte', version: versionOf('svelte'), role: 'frontend' });
  for (const name of ['hono', 'express', 'fastify', '@nestjs/core', 'koa']) {
    if (deps[name]) frameworks.push({ name, version: versionOf(name), role: 'server' });
  }
  const viteVersion = deps.vite || deps['vite-plus'];
  const bundler = viteVersion ? { name: deps.vite ? 'vite' : 'vite-plus (rolldown/vite)', version: semverClean(String(viteVersion)) } : null;
  const router = deps['vue-router'] ? { name: 'vue-router', version: versionOf('vue-router') } : null;
  const ui = Object.keys(UI_LIBRARIES).filter(has).map((name) => ({ name, label: UI_LIBRARIES[name], version: versionOf(name) }));
  const state = Object.keys(STATE_LIBRARIES).filter(has).map((name) => ({ name, label: STATE_LIBRARIES[name], version: versionOf(name) }));
  const http = Object.keys(HTTP_LIBRARIES).filter(has).map((name) => ({ name, label: HTTP_LIBRARIES[name], version: versionOf(name) }));
  const server = Object.keys(SERVER_LIBRARIES).filter(has).map((name) => ({ name, label: SERVER_LIBRARIES[name], version: versionOf(name) }));
  for (const ext of ['.ts', '.tsx', '.js']) if (walkExtensions(root, ext).length) fileTypes.push({ extension: ext, role: ext === '.ts' || ext === '.tsx' ? 'logic' : 'legacy' });
  return {
    generatedAt: new Date().toISOString(),
    projectRoot: root,
    projectName: pkg.name || path.basename(root),
    workspace: globs.length ? { members: globs, packagesScanned: members.length } : null,
    language,
    bundler,
    frameworks,
    router,
    ui,
    state,
    http,
    server,
    fileTypes,
    toolchain: { linter: deps.oxlint ? 'oxlint' : null, formatter: deps.oxfmt ? 'oxfmt' : null, test: deps.vitest || deps['vite-plus'] ? 'vitest (via vite-plus)' : null },
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
    // Old-index entries missing v3 fields (lines/imports/located exports) are re-read instead of reused.
    if (cached && cached.bytes === stat.size && Math.round(cached.mtimeMs) === Math.round(stat.mtimeMs) && typeof cached.lines === 'number' && Array.isArray(cached.imports) && Array.isArray(cached.exports) && (!cached.exports.length || typeof cached.exports[0] === 'object')) {
      entries.push(cached);
      continue;
    }
    const text = fs.readFileSync(file, 'utf8');
    const kind = classify(file);
    const { symbols, imports } = locateExports(text);
    entries.push({ name: path.basename(file, path.extname(file)), path: relative, kind, extension: path.extname(file).slice(1), lines: text.split('\n').length, exports: symbols, imports, ...kind === 'component' ? componentInfo(text) : {}, bytes: stat.size, mtimeMs: stat.mtimeMs, hash: crypto.createHash('sha1').update(text).digest('hex').slice(0, 12) });
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
    lines INTEGER NOT NULL DEFAULT 0,
    bytes INTEGER NOT NULL,
    mtime_ms REAL NOT NULL,
    hash TEXT NOT NULL,
    exports TEXT NOT NULL,
    imports TEXT NOT NULL DEFAULT '[]',
    props TEXT NOT NULL,
    emits TEXT NOT NULL,
    computed TEXT NOT NULL DEFAULT '[]',
    has_template INTEGER NOT NULL,
    has_script_setup INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_files_name ON files(name);
  CREATE INDEX IF NOT EXISTS idx_files_kind ON files(kind);`);
  ensureSqliteTableColumns(db);
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
    const insert = db.prepare('INSERT INTO files (path, name, kind, extension, lines, bytes, mtime_ms, hash, exports, imports, props, emits, computed, has_template, has_script_setup) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const entry of entries) {
      insert.run(entry.path, entry.name, entry.kind, entry.extension, entry.lines, entry.bytes, entry.mtimeMs, entry.hash, JSON.stringify(entry.exports || []), JSON.stringify(entry.imports || []), JSON.stringify(entry.props || []), JSON.stringify(entry.emits || []), JSON.stringify(entry.computed || []), entry.hasTemplate ? 1 : 0, entry.hasScriptSetup ? 1 : 0);
    }
    db.close();
    writeMeta(root, { version: 3, backend: 'sqlite', autoChosen, generatedAt: new Date().toISOString(), count: entries.length, dbPath: '.coder/index.sqlite' });
    return { backend: 'sqlite', dbPath, count: entries.length };
  }
  fs.mkdirSync(path.join(root, '.coder'), { recursive: true });
  const payload = { version: 3, backend: 'json', generatedAt: new Date().toISOString(), root, entries };
  fs.writeFileSync(path.join(root, '.coder', 'index.json'), `${JSON.stringify(payload, null, 2)}\n`);
  writeMeta(root, { version: 3, backend: 'json', autoChosen, generatedAt: payload.generatedAt, count: entries.length });
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
        lines: row.lines,
        exports: JSON.parse(row.exports),
        imports: JSON.parse(row.imports),
        ...(row.kind === 'component' ? { props: JSON.parse(row.props), emits: JSON.parse(row.emits), computed: JSON.parse(row.computed || '[]'), hasTemplate: Boolean(row.has_template), hasScriptSetup: Boolean(row.has_script_setup) } : {}),
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

function ensureSqliteTableColumns(db) {
  // version 3 added lines + imports columns; migrate old databases in place.
  const cols = db.prepare("PRAGMA table_info(files)").all().map((c) => c.name);
  if (!cols.includes('lines')) db.exec('ALTER TABLE files ADD COLUMN lines INTEGER NOT NULL DEFAULT 0');
  if (!cols.includes('imports')) db.exec("ALTER TABLE files ADD COLUMN imports TEXT NOT NULL DEFAULT '[]'");
  if (!cols.includes('computed')) db.exec("ALTER TABLE files ADD COLUMN computed TEXT NOT NULL DEFAULT '[]'");
}

function printResults(opts, root, matches) {
  if (opts.json) return console.log(JSON.stringify({ query: opts.name, backend: matches.backend, results: matches.entries }, null, 2));
  if (!matches.entries.length) throw new Error(`No match for "${opts.name}"${opts.kind === 'all' ? '' : ` (${opts.kind})`}. Run with --refresh after source changes.`);
  const snippetLines = Number(opts.lines) || 30;
  for (const entry of matches.entries) {
    console.log(`## ${entry.name} [${entry.kind}]`);
    console.log(`- File: ${entry.path} (${entry.lines || '?'} lines)`);
    if (entry.imports?.length) console.log(`- Imports: ${entry.imports.map((i) => `${i.source}:${i.line}`).join(', ')}`);
    if (entry.exports?.length) console.log(`- Exports: ${entry.exports.map((e) => `${e.name} @ L${e.startLine}-${e.endLine}`).join(', ')}`);
    if (entry.kind === 'component') console.log(`- SFC: template=${entry.hasTemplate}, script setup=${entry.hasScriptSetup}, props=${entry.props.join(', ') || 'none'}, emits=${entry.emits.join(', ') || 'none'}, computed=${entry.computed?.map((c) => `${c.name}@L${c.startLine}-${c.endLine}`).join(', ') || 'none'}`);
    console.log(`- Index hash: ${entry.hash}`);
    if (!opts.noSnippet && entry.exports?.length) {
      const text = fs.readFileSync(entry.absolutePath, 'utf8').split('\n');
      for (const symbol of entry.exports.slice(0, 5)) {
        const from = Math.max(0, symbol.startLine - 1);
        const to = Math.min(text.length, symbol.startLine - 1 + snippetLines);
        console.log(`\n\`\`\`${entry.extension} ${symbol.name} L${symbol.startLine}-${symbol.endLine}`);
        console.log(text.slice(from, to).join('\n'));
        if (to < symbol.endLine) console.log(`... (${symbol.endLine - snippetLines - symbol.startLine + 2} more lines)`);
        console.log('```');
      }
    }
  }
}

function runQuery(opts, root, index) {
  const query = opts.name.toLowerCase();
  const matched = index.entries.filter((entry) => (opts.kind === 'all' || entry.kind === opts.kind) && [entry.name, entry.path, ...entry.exports.map((e) => e.name || ''), ...(entry.imports || []).map((i) => i.source)].some((value) => value.toLowerCase().includes(query)));
  const entries = matched.map((entry) => ({ ...entry, absolutePath: path.join(root, entry.path) }));
  printResults(opts, root, { backend: index.backend || 'json', entries });
}

// ---------- Size limit check (--check) ----------

const MAX_FILE_LINES = 500;
const MAX_SCRIPT_LINES = 300;

// Strip comments and string/template literals so keyword scans don't match prose.
function stripCommentsAndStrings(text) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) {
        if (text[i] === '\n') out += '\n';
        i += 1;
      }
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      i += 1;
      while (i < text.length && text[i] !== quote) {
        if (text[i] === '\\') i += 1;
        if (text[i] === '\n') out += '\n';
        i += 1;
      }
      i += 1;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

function findEnumViolations(text) {
  const code = stripCommentsAndStrings(text);
  const findings = [];
  // enum declarations: enum Foo / const enum Foo
  for (const match of code.matchAll(/\b(?:const\s+)?enum\s+([A-Za-z_$][\w$]*)/g)) {
    findings.push({ kind: 'enum', name: match[1] });
  }
  // as const enum simulation: `export const X = { ... } as const` (name uppercase-ish object literal).
  for (const match of code.matchAll(/(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*\{[\s\S]*?\}\s+as\s+const/g)) {
    findings.push({ kind: 'as-const', name: match[1] });
  }
  return findings;
}

function runCheck(opts, root) {
  const files = walk(root, [], CHECK_EXTENSIONS);
  const violations = [];
  const enumHits = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const lines = countLines(text);
    const relative = path.relative(root, file);
    for (const finding of findEnumViolations(text)) {
      enumHits.push({ file: relative, ...finding });
    }
    if (path.extname(file) === '.vue') {
      const scripts = [...text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
      const scriptLines = scripts.reduce((sum, match) => sum + countLines(match[1]), 0);
      if (lines > MAX_FILE_LINES || scriptLines > MAX_SCRIPT_LINES) {
        violations.push({ file: relative, total: lines, script: scriptLines });
      }
    } else if (lines > MAX_FILE_LINES) {
      violations.push({ file: relative, total: lines, script: null });
    }
  }
  if (opts.json) return console.log(JSON.stringify({ ok: violations.length === 0 && enumHits.length === 0, limits: { maxFileLines: MAX_FILE_LINES, maxScriptLines: MAX_SCRIPT_LINES }, sizeViolations: violations, enumViolations: enumHits }, null, 2));
  for (const v of violations) {
    console.log(`OVER LIMIT: ${v.file} — total ${v.total}${v.script !== null ? `, script ${v.script}` : ''} lines`);
  }
  for (const hit of enumHits) {
    console.log(`ENUM VIOLATION: ${hit.file} — ${hit.kind === 'enum' ? '`enum` declaration' : '`as const` object enum'} "${hit.name}". Use enumOf from rattail instead.`);
  }
  if (violations.length || enumHits.length) {
    if (violations.length) console.log(`\n${violations.length} file(s) exceed size limits. Split before finishing: 1) extract subcomponents 2) extract pure functions to utils 3) composable last.`);
    if (enumHits.length) console.log(`\n${enumHits.length} enum violation(s). Replace with enumOf from rattail (see $skill: rattail → references/enumOf.md).`);
    process.exitCode = 1;
    return;
  }
  console.log(`OK: all files within limits (file ≤ ${MAX_FILE_LINES} lines, .vue script ≤ ${MAX_SCRIPT_LINES} lines), no enum/as-const declarations.`);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) return usage();
  const root = projectRoot(opts.root);

  if (opts.check) return runCheck(opts, root);

  if (opts.init) {
    const profile = detectStack(root);
    fs.mkdirSync(path.join(root, '.coder'), { recursive: true });
    fs.writeFileSync(path.join(root, '.coder', 'profile.json'), `${JSON.stringify(profile, null, 2)}\n`);
    if (opts.json) return console.log(JSON.stringify(profile, null, 2));
    console.log(`Stack profile written to ${path.join(root, '.coder/profile.json')}`);
    console.log(`Project: ${profile.projectName}`);
    console.log(`Frameworks: ${profile.frameworks.map((f) => `${f.name}@${f.version || '?'} (${f.role})`).join(', ') || 'none'}`);
    console.log(`Bundler: ${profile.bundler ? `${profile.bundler.name}@${profile.bundler.version}` : 'unknown'}`);
    console.log(`Router: ${profile.router ? `${profile.router.name}@${profile.router.version}` : 'none'}`);
    console.log(`UI: ${profile.ui.map((u) => u.label).join(', ') || 'none'}`);
    console.log(`State: ${profile.state.map((s) => s.label).join(', ') || 'none'}`);
    console.log(`Server: ${profile.server.map((s) => `${s.label}@${s.version || '?'}`).join(', ') || 'none'}`);
    console.log(`Workspace: ${profile.workspace ? `${profile.workspace.packagesScanned} member packages (${profile.workspace.members.join(', ')})` : 'single package'}`);
    console.log(`TypeScript: ${profile.language.typescript ? `yes${profile.language.version ? ` @ ${profile.language.version}` : ''}` : 'no'}`);
    console.log(`File types: ${profile.fileTypes.map((f) => f.extension).join(', ') || 'none'}`);
    console.log(`Toolchain: ${Object.values(profile.toolchain).filter(Boolean).join(', ') || 'none'}`);
    return;
  }

  if (!opts.name && !opts.refresh && !opts.check) throw new Error('Provide a component/function name, or use --refresh');
  if (opts.refresh) {
    const built = buildIndex(root, opts);
    return console.log(opts.json ? JSON.stringify(built, null, 2) : `Indexed ${built.count} files (${built.backend}) in ${built.dbPath || built.indexPath}`);
  }
  const index = readIndex(root);
  // v2 indexes stored exports as plain strings; upgrade them in memory (locations need --refresh).
  if (index.entries.some((e) => e.exports?.length && typeof e.exports[0] === 'string')) {
    for (const entry of index.entries) {
      if (entry.exports?.length && typeof entry.exports[0] === 'string') entry.exports = entry.exports.map((name) => ({ name, startLine: 0, endLine: 0 }));
      entry.imports = entry.imports || [];
    }
  }
  runQuery(opts, root, index);
}

try { main(); } catch (error) { console.error(`[coder] ${error.message}`); process.exitCode = 1; }
