import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const project = path.resolve(import.meta.dirname, '..');
const sourceDir = path.join(project, 'public/frontend/design');
const require = createRequire(path.join(project, 'tests/package.json'));
const postcss = require('postcss');
const {JSDOM} = require('jsdom');
const bundles = JSON.parse(fs.readFileSync(path.join(sourceDir, 'bundles.json'), 'utf8'));

// A declaration can be removed only if EVERY selector in its group receives
// the same declaration later, at the same priority and under the same conditions.
export function duplicateDeclarations(sheets) {
  const seen = new Map();
  const duplicates = [];
  const rules = [];
  for (const sheet of sheets) sheet.walkRules(rule => { rules.push(rule); });

  for (const rule of rules.reverse()) {
    const context = [];
    let parent = rule.parent;
    while (parent.type === 'atrule' && ['media', 'supports', 'container'].includes(parent.name)) {
      context.unshift([parent.name, parent.params]);
      parent = parent.parent;
    }
    // Nested rules, layers, scopes and animation steps have other cascade semantics.
    if (parent.type !== 'root' || rule.nodes.some(node => !['comment', 'decl'].includes(node.type))) continue;

    const selectors = rule.selectors;
    for (const declaration of [...rule.nodes].reverse()) {
      if (declaration.type !== 'decl') continue;
      const {prop, value, important} = declaration;
      const keys = selectors.map(selector => JSON.stringify([context, selector.trim(), prop, value, !!important]));
      if (keys.every(key => seen.has(key))) {
        duplicates.push({declaration, coveredBy: [...new Set(keys.map(key => seen.get(key)))]});
      } else {
        for (const key of keys) seen.set(key, declaration);
      }
    }
  }
  return duplicates.reverse();
}

function readSheet(file) {
  const absolute = path.join(project, file);
  return postcss.parse(fs.readFileSync(absolute, 'utf8'), {from: absolute});
}

function location(node) {
  const file = path.relative(project, node.source.input.file).replaceAll('\\', '/');
  return file + ':' + node.source.start.line;
}

export function audit() {
  const errors = [];
  const sources = bundles.flatMap(bundle => bundle.sources);
  const outputs = bundles.map(bundle => bundle.output);
  const diskSources = fs.readdirSync(sourceDir, {recursive: true})
    .filter(file => file.endsWith('.css')).map(file => file.replaceAll('\\', '/')).sort();
  if (JSON.stringify([...sources].sort()) !== JSON.stringify(diskSources)) {
    errors.push('Cada CSS fuente debe aparecer una sola vez en bundles.json.');
  }
  if (new Set(outputs).size !== outputs.length) errors.push('Hay salidas repetidas en bundles.json.');

  const shell = fs.readFileSync(path.join(project, 'backend/views/shell.php'), 'utf8');
  const html = JSDOM.fragment(shell.replace(/<\?[\s\S]*?\?>/g, ''));
  const loaded = [...html.querySelectorAll('link[rel~="stylesheet" i]')]
    .map(link => 'public/' + link.getAttribute('href').split(/[?#]/)[0]);
  if (JSON.stringify(loaded) !== JSON.stringify(outputs)) {
    errors.push('Las hojas enlazadas en shell.php o su orden difieren de bundles.json.');
  }

  const sourceSheets = sources.map(file => readSheet('public/frontend/design/' + file));
  const runtimeSheets = outputs.map(readSheet);
  for (const sheets of [sourceSheets, runtimeSheets]) {
    for (const {declaration, coveredBy} of duplicateDeclarations(sheets)) {
      errors.push(location(declaration) + ' ' + declaration.parent.selector + ' / ' + declaration.prop
        + ' se repite en ' + coveredBy.map(location).join(', '));
    }
  }
  for (const sheet of runtimeSheets) {
    sheet.walkAtRules('import', rule => { errors.push(location(rule) + ' carga CSS fuera del manifiesto.'); });
  }
  return {loaded, sources, errors};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {loaded, sources, errors} = audit();
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('OK CSS. ' + sources.length + ' fuentes y ' + loaded.length
      + ' hojas en el orden del shell, sin declaraciones idénticas redundantes detectadas.');
  }
}
