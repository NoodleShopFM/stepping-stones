#!/usr/bin/env node
/** Rebuild the static lookup data. Run: node scripts/generate_tables.mjs
 * No dependencies. Each record is Float32 [PMF, CDF <= s, survival >= s].
 * The Float64 DP trims less than 5e-13 mass from each extreme tail.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIR = join(ROOT, 'data');
const MAX = 630;
const ENDINGS = [8, 42, 90, 150, 210, 270, 330, 390, 450, 510, 570, 630];
const TRIM = 5e-13;
const p = Array.from({ length: 9 }, (_, k) => k < 8 ? 2 ** (-k - 1) : 1 / 256);

mkdirSync(DIR, { recursive: true });
const records = [null];
const chunks = [];
let previous = new Float64Array([1]);
let first = 1, chunkIndex = 0, bytes = [], byteLength = 0, totalEntries = 0;

for (let n = 1; n <= MAX; n++) {
  const next = new Float64Array(previous.length + 8);
  for (let s = 0; s < previous.length; s++) {
    for (let k = 0; k < 9; k++) next[s + k] += previous[s] * p[k];
  }
  previous = next;
  const cdf = new Float64Array(next.length), sf = new Float64Array(next.length);
  let running = 0;
  for (let s = 0; s < next.length; s++) { running += next[s]; cdf[s] = running; }
  if (Math.abs(running - 1) > 2e-12) throw new Error(`PMF mass drift at n=${n}: ${running}`);
  running = 0;
  for (let s = next.length - 1; s >= 0; s--) { running += next[s]; sf[s] = running; }
  let low = 0, high = next.length - 1;
  while (low < high && cdf[low] < TRIM) low++;
  while (high > low && sf[high] < TRIM) high--;
  records.push({ chunk: chunkIndex, offset: byteLength, min: low, count: high - low + 1 });
  const b = Buffer.allocUnsafe((high - low + 1) * 12);
  for (let s = low; s <= high; s++) {
    const off = (s - low) * 12;
    b.writeFloatLE(next[s], off);
    b.writeFloatLE(cdf[s], off + 4);
    b.writeFloatLE(sf[s], off + 8);
  }
  bytes.push(b); byteLength += b.length; totalEntries += high - low + 1;
  if (ENDINGS.includes(n)) {
    const filename = `steps_${String(first).padStart(3, '0')}_${String(n).padStart(3, '0')}.bin`;
    const chunk = Buffer.concat(bytes);
    writeFileSync(join(DIR, filename), chunk);
    chunks.push({ file: filename, first, last: n, bytes: chunk.length });
    bytes = []; byteLength = 0; first = n + 1; chunkIndex++;
  }
}
const index = {
  format: 'stepping-stones-steps-v1', max_attempts: MAX,
  fields: ['pmf', 'cdf_le', 'sf_ge'], dtype: 'float32',
  endianness: 'little', stride_bytes: 12,
  tail_trim_per_side_lt: TRIM, chunks, records,
};
writeFileSync(join(DIR, 'index.json'), JSON.stringify(index) + '\n');
console.log(`${totalEntries.toLocaleString()} entries; ${chunks.reduce((s,c) => s + c.bytes, 0).toLocaleString()} binary bytes`);
for (const c of chunks) console.log(c.file, c.bytes);
