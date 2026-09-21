import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import yaml from 'js-yaml';
import { validateData } from './validate.js';
import { renderMissionSvg } from './mission-svg.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, 'missions.yaml');
const OUTPUT_DIR = path.join(__dirname, '..', 'static', 'maps');

function main() {
  const raw = readFileSync(DATA_PATH, 'utf8');
  const data = validateData(yaml.load(raw));

  mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const [key, mission] of Object.entries(data.missions)) {
    const svg = renderMissionSvg(mission, data.table, data.colors);
    writeFileSync(path.join(OUTPUT_DIR, `${key}.svg`), svg);
    console.log(`Rendered ${key}.svg`);
  }
}

main();
