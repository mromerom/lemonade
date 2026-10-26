// Lets Node import files with Vite's "?raw" suffix as strings, so the content
// checker can load the same modules the app does.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, next) {
  if (specifier.endsWith('?raw')) {
    const resolved = await next(specifier.slice(0, -4), context);
    return { url: `${resolved.url}?raw`, shortCircuit: true };
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url.endsWith('?raw')) {
    const source = readFileSync(fileURLToPath(url.slice(0, -4)), 'utf8');
    return { format: 'module', source: `export default ${JSON.stringify(source)};`, shortCircuit: true };
  }
  return next(url, context);
}
