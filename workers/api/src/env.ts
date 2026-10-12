export interface Env {
  HYPERDRIVE: Hyperdrive;
  MEDIA: R2Bucket;
  PRIVATE: R2Bucket;
  EXPORTS: R2Bucket;
  EVENTS: Queue<OutboxMessage>;
  WORKOS_CLIENT_ID: string;
  ALLOWED_ORIGINS: string;
  R2_ACCOUNT_ID: string;
  R2_MEDIA_BUCKET_NAME: string;
  HOUSE_CODE_SHA256?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
}

export interface OutboxMessage {
  outbox_id: number;
  topic: string;
  payload: Record<string, unknown>;
}

/** Postgres session claims set per request via app.set_claims(). */
export interface Claims {
  uid: string;           // app.users.id
  sub: string;           // WorkOS user id
  sid?: string;
  org_id?: string;
  role?: string;
  step_up_at?: number;   // unix seconds of last passkey assertion
}
