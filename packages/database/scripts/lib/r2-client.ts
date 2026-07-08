import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * Videos are content-addressed (the key never points at different bytes), so they
 * can be cached forever. A long, immutable Cache-Control lets the browser reuse
 * the buffer warmed during the intro/reveal for instant playback, and lets the
 * CDN edge serve repeats without hitting the origin.
 */
export const VIDEO_CACHE_CONTROL = "public, max-age=31536000, immutable";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function createR2Client(): S3Client {
  const accountId = requireEnv("R2_ACCOUNT_ID");

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

export function getR2Bucket(): string {
  return requireEnv("R2_BUCKET");
}

export function getR2PublicUrl(key: string): string {
  const base = requireEnv("R2_PUBLIC_URL").replace(/\/$/, "");
  return `${base}/${key}`;
}

export async function r2ObjectExists(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error: unknown) {
    const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

export async function r2UploadFile(
  client: S3Client,
  bucket: string,
  key: string,
  body: Buffer,
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "video/mp4",
      CacheControl: VIDEO_CACHE_CONTROL,
    }),
  );
}

/**
 * Backfill `Cache-Control` on every existing object (in-place copy with
 * `MetadataDirective: REPLACE`). Run once after adding the header to uploads so
 * previously-stored videos also become cacheable. Returns the count updated.
 */
export async function r2BackfillCacheControl(
  client: S3Client,
  bucket: string,
): Promise<number> {
  let updated = 0;
  let continuationToken: string | undefined;

  do {
    const listResponse = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      }),
    );

    const objects = listResponse.Contents ?? [];
    for (const object of objects) {
      if (!object.Key) continue;
      await client.send(
        new CopyObjectCommand({
          Bucket: bucket,
          Key: object.Key,
          CopySource: `${bucket}/${encodeURIComponent(object.Key)}`,
          MetadataDirective: "REPLACE",
          ContentType: "video/mp4",
          CacheControl: VIDEO_CACHE_CONTROL,
        }),
      );
      updated += 1;
    }

    continuationToken = listResponse.IsTruncated ? listResponse.NextContinuationToken : undefined;
  } while (continuationToken);

  return updated;
}

export async function r2EmptyBucket(client: S3Client, bucket: string): Promise<number> {
  let totalDeleted = 0;

  while (true) {
    const listResponse = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1000 }),
    );

    const objects = listResponse.Contents ?? [];
    if (objects.length === 0) break;

    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: objects.map((object) => ({ Key: object.Key! })),
        },
      }),
    );

    totalDeleted += objects.length;
  }

  return totalDeleted;
}
