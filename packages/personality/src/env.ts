/**
 * Worker bindings for the personality proxy.
 *
 * This package no longer owns the engine — it's a thin HTTP forwarder
 * that hands `api.wildmat.dev/personality/*` off to the personality
 * service at `${PERSONALITY_SERVICE_BASE_URL}/*`.
 *
 * - `PERSONALITY_SERVICE_BASE_URL` — origin for the upstream personality
 *   service (e.g. `https://personality.wildmat.dev`). No trailing slash.
 * - `ENVIRONMENT` — free-form env tag emitted in logs (production / preview / dev).
 */
export type Env = {
  PERSONALITY_SERVICE_BASE_URL: string;
  ENVIRONMENT?: string;
};
