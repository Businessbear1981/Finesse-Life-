// Cloudflare R2 client. R2 is S3-API-compatible, so we use the AWS SDK
// with R2's endpoint. Install: npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
//
// All R2 operations are SERVER-SIDE only. Never ship CF_R2_TOKEN to the client.
// For client uploads, generate a presigned PUT URL on the server and return it.

import {S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';

const endpoint = process.env.R2_ENDPOINT ?? `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? '';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? '';
const bucket = process.env.R2_BUCKET ?? 'finesse-life';
const publicUrl = process.env.R2_PUBLIC_URL ?? '';

if (!accessKeyId || !secretAccessKey) {
  console.warn('[r2] R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY not set — storage disabled');
}

export const r2 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: {accessKeyId, secretAccessKey},
});

export function publicUrlFor(key: string): string {
  return publicUrl ? `${publicUrl.replace(/\/$/, '')}/${key}` : '';
}

export async function uploadObject(key: string, body: Buffer | Uint8Array, contentType?: string) {
  await r2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return publicUrlFor(key);
}

export async function presignPut(key: string, contentType: string, expiresInSeconds = 60 * 5) {
  return getSignedUrl(
    r2,
    new PutObjectCommand({Bucket: bucket, Key: key, ContentType: contentType}),
    {expiresIn: expiresInSeconds},
  );
}

export async function presignGet(key: string, expiresInSeconds = 60 * 5) {
  return getSignedUrl(r2, new GetObjectCommand({Bucket: bucket, Key: key}), {
    expiresIn: expiresInSeconds,
  });
}

export async function deleteObject(key: string) {
  await r2.send(new DeleteObjectCommand({Bucket: bucket, Key: key}));
}
