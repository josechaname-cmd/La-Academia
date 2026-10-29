import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const frontendRoot = path.join(root, 'public', 'frontend');

function filesBelow(directory, extension) {
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesBelow(absolute, extension);
    return entry.isFile() && absolute.endsWith(extension) ? [absolute] : [];
  });
}

function relative(absolute) {
  return path.relative(root, absolute).replaceAll('\\', '/');
}

function localImports(source) {
  const imports = new Set();
  const patterns = [
    /\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      if (match[1].startsWith('.')) imports.add(match[1]);
    }
  }
  return [...imports];
}

const productionJs = filesBelow(frontendRoot, '.js').map(file => path.resolve(file));
const productionSet = new Set(productionJs);
const visited = new Set();

function visit(file) {
  const absolute = path.resolve(file);
  if (visited.has(absolute)) return;
  assert(productionSet.has(absolute), `Import fuera del frontend activo: ${relative(absolute)}`);
  visited.add(absolute);
  const source = fs.readFileSync(absolute, 'utf8');
  for (const specifier of localImports(source)) {
    const clean = specifier.split(/[?#]/, 1)[0];
    const resolved = path.resolve(path.dirname(absolute), clean);
    assert(fs.existsSync(resolved), `Import inexistente en ${relative(absolute)}: ${specifier}`);
    visit(resolved);
  }
}

visit(path.join(frontendRoot, 'app.js'));
const unreachable = productionJs.filter(file => !visited.has(file)).map(relative);
assert.deepEqual(unreachable, [], `JavaScript de producción sin alcance desde app.js: ${unreachable.join(', ')}`);

const activeMarkupSources = [
  ...filesBelow(path.join(root, 'backend', 'views'), '.php'),
  ...productionJs,
];
let inlineStyles = 0;
for (const file of activeMarkupSources) {
  const source = fs.readFileSync(file, 'utf8');
  assert(!/<style\b/i.test(source), `Bloque <style> fuera de la arquitectura CSS: ${relative(file)}`);
  assert(!/<[^>]+\son[a-z]+\s*=/i.test(source), `Evento DOM0 dentro de una plantilla: ${relative(file)}`);
  const count = [...source.matchAll(/\sstyle\s*=\s*['"]/gi)].length;
  assert.equal(count, 0, `Atributo style bloqueado por CSP en la plantilla: ${relative(file)}`);
  inlineStyles += count;
}
assert.equal(inlineStyles, 0, 'Las plantillas no deben incluir estilos bloqueados por CSP');

const designRoot = path.join(frontendRoot, 'design');
const cssSources = filesBelow(designRoot, '.css');
let importantDeclarations = 0;
for (const file of cssSources) {
  const source = fs.readFileSync(file, 'utf8');
  const count = [...source.matchAll(/!important\b/g)].length;
  if (count) assert.equal(relative(file), 'public/frontend/design/foundation.css', `!important fuera de foundation.css: ${relative(file)}`);
  importantDeclarations += count;
}
assert.equal(importantDeclarations, 4, 'Los !important se limitan a ocultación y movimiento reducido');

console.log(`OK architecture: ${visited.size}/${productionJs.length} módulos JS alcanzables, sin <style> ni eventos DOM0, ${inlineStyles} atributos style en plantillas y ${importantDeclarations} !important controlados.`);
