// Copia os arquivos do armazenamento local do Twenty para o bucket S3/R2.
// Rodar DENTRO do container do servidor (console do EasyPanel), depois do
// deploy com STORAGE_TYPE=s3 — usa as variáveis STORAGE_S3_* do próprio
// container e o SDK da AWS que já vem no Twenty:
//   cd /app/packages/twenty-server && node /tmp/copiar.mjs [pasta-local] [--aplicar]
// Sem --aplicar só lista. Idempotente: pula arquivo que já existe no bucket
// com o mesmo tamanho. A chave no bucket é o caminho relativo à pasta local,
// igual ao que o driver local usa (local.driver.ts ↔ s3.driver.ts).

import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(path.join(process.cwd(), 'package.json'));
const { S3Client, HeadObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

const args = process.argv.slice(2);
const APPLY = args.includes('--aplicar');
const localRoot = path.resolve(
  args.find((arg) => !arg.startsWith('--')) ?? process.env.STORAGE_LOCAL_PATH ?? '.local-storage',
);
const bucket = process.env.STORAGE_S3_NAME;

for (const name of ['STORAGE_S3_NAME', 'STORAGE_S3_ENDPOINT', 'STORAGE_S3_ACCESS_KEY_ID', 'STORAGE_S3_SECRET_ACCESS_KEY']) {
  if (!process.env[name]) {
    console.error(`Falta a variável ${name} no container`);
    process.exit(1);
  }
}

const client = new S3Client({
  region: process.env.STORAGE_S3_REGION || 'auto',
  endpoint: process.env.STORAGE_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.STORAGE_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.STORAGE_S3_SECRET_ACCESS_KEY,
  },
});

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

const sizeInBucket = async (key) => {
  try {
    return (await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))).ContentLength;
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404) return null;
    throw error;
  }
};

try {
  await stat(localRoot);
} catch {
  console.error(`Pasta local ${localRoot} não existe — o volume está montado?`);
  process.exit(1);
}

console.log(`${APPLY ? '' : '[simulação] '}${localRoot} → bucket ${bucket}`);
let copied = 0;
let skipped = 0;
let bytes = 0;
for await (const file of walk(localRoot)) {
  const key = path.relative(localRoot, file).split(path.sep).join('/');
  const { size } = await stat(file);
  if ((await sizeInBucket(key)) === size) {
    skipped += 1;
    continue;
  }
  copied += 1;
  bytes += size;
  if (!APPLY) {
    console.log(`  ${key} (${size} B)`);
    continue;
  }
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: createReadStream(file), ContentLength: size }),
  );
  if (copied % 50 === 0) console.log(`  ${copied} arquivos...`);
}
console.log(
  `${APPLY ? 'Copiados' : 'A copiar'}: ${copied} (${(bytes / 1024 / 1024).toFixed(1)} MB); já no bucket: ${skipped}`,
);
if (!APPLY) console.log('Rode de novo com --aplicar.');
