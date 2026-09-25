/**
 * Platform publish adapter contract (Part 07 §8).
 * One interface per channel; upstream publish flow stays unchanged when the
 * underlying API (provider → direct) swaps.
 */

export type AdapterPostCard = {
  id: string;
  platform: string;
  account: string;
  caption?: string | null;
  coverUrl?: string | null;
  postUrl?: string | null;
};

export type PublishAdapterResult = {
  url: string;
  published: boolean;
  /** Set when tokens are missing, audit is pending, or the platform refused live publish. */
  error?: string;
  /** Opaque platform id for verify / metrics (media id, publish_id, video id). */
  externalId?: string;
};

export type VerifyAdapterResult = {
  ok: boolean;
  url?: string;
  error?: string;
};

export interface PublishAdapter {
  platform: string;
  publish(postCard: AdapterPostCard): Promise<PublishAdapterResult>;
  verify(postCard: AdapterPostCard): Promise<VerifyAdapterResult>;
}
