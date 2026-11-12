import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import { z } from 'zod';

const dataDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'nl');
const categories = ['batting', 'pitching', 'catching', 'infield', 'outfield', 'throwing', 'baserunning', 'situational', 'conditioning'];
const strings = z.array(z.string());
const drill = z.object({
  id: z.string().min(1), name_nl: z.string().min(1), category: z.string().min(1),
  subcategories: strings, skills: strings,
  duration_minutes: z.object({ default: z.number(), minimum: z.number(), maximum: z.number() }),
  players_min: z.number(), players_max: z.number(), equipment_required: strings, equipment_optional: strings,
  indoor_friendly: z.boolean(), space_required: z.string(), difficulty: z.string(), description: z.string(),
  setup: strings, execution: strings, coaching_points: strings, common_mistakes: strings, safety_notes: strings,
  variations: z.array(z.object({ name: z.string(), difficulty: z.string(), description: z.string() }).passthrough()),
  youtube: z.object({ url: z.string(), title: z.string(), start_seconds: z.number() }).passthrough().nullable(),
  selection: z.object({ minimum_repeat_gap_days: z.number(), preferred_session_blocks: strings }).passthrough(),
}).passthrough();

export async function buildCatalog(directory = dataDirectory, readSource = readFile) {
  const read = async name => JSON.parse(await readSource(resolve(directory, name), 'utf8'));
  const drills = (await Promise.all(categories.map(async category => z.array(drill).parse(await read(`drills_${category}.json`))))).flat();
  if (!drills.length || new Set(drills.map(item => item.id)).size !== drills.length) throw new Error('Catalog is empty or contains duplicate drill IDs');
  const categoryMap = z.record(z.string(), strings).parse(await read('categories.json'));
  const warmup = z.object({ duration_minutes: z.number(), blocks: z.array(z.object({ name: z.string(), duration_minutes: z.number(), items: strings }).passthrough()) }).passthrough().parse(await read('warmup.json'));
  const document = { id: 'catalog', pk: 'catalog', kind: 'catalog', drills, categories: categoryMap, warmup };
  if (Buffer.byteLength(JSON.stringify(document), 'utf8') > 2 * 1024 * 1024) throw new Error('Catalog exceeds the Cosmos item size limit');
  return document;
}

export async function importCatalog(container, document) {
  const { resources } = await container.items.query({ query: 'SELECT c.id, c.pk FROM c WHERE c.kind = @kind', parameters: [{ name: '@kind', value: 'catalog' }] }).fetchAll();
  if (resources.some(item => item.id !== document.id || item.pk !== document.pk)) throw new Error('A different catalog document already exists; resolve it before importing');
  await container.items.upsert(document);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--apply') || args.length > 1) throw new Error('Usage: npm run catalog:import --workspace honkbal-trainer-api [-- --apply]');
  const document = await buildCatalog();
  if (!args.includes('--apply')) {
    console.log(`Validated ${document.drills.length} drills. Dry run only; no data was written.`);
    return;
  }
  const endpoint = process.env.COSMOSDB_ENDPOINT;
  if (!endpoint || new URL(endpoint).protocol !== 'https:') throw new Error('COSMOSDB_ENDPOINT must be an HTTPS Cosmos endpoint');
  const client = new CosmosClient({ endpoint, aadCredentials: new DefaultAzureCredential() });
  await importCatalog(client.database(process.env.COSMOSDB_DATABASE || 'honkbal').container('reference-data'), document);
  console.log(`Imported ${document.drills.length} drills into reference-data.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error('Catalog import failed:', error); process.exitCode = 1; });
}
