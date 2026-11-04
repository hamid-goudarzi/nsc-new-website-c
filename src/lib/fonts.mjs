// The @font-face rules, inlined into every page's <head> so text styles don't wait for an extra request.
import fs from 'node:fs';
import path from 'node:path';
const css = fs.readFileSync(path.join(process.cwd(), 'public/assets/fonts.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').trim();
export const fontCss = (pre = '') => css.replace(/url\(\.\.\/fonts\//g, `url(${pre}fonts/`);
