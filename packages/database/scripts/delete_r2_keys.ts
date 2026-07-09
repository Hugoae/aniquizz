import 'dotenv/config';
import { DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { createR2Client, getR2Bucket } from './lib/r2-client';

async function main() {
  const keys = process.argv.slice(2);
  if (keys.length === 0) {
    console.error('Usage: ts-node delete_r2_keys.ts <key1> [key2...]');
    process.exit(1);
  }

  const r2 = createR2Client();
  const bucket = getR2Bucket();
  await r2.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    }),
  );
  console.log(`Deleted ${keys.length} object(s) from ${bucket}:`, keys.join(', '));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
