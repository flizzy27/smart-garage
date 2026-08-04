/**
 * Short-lived cookies that carry one OIDC login attempt between the start route
 * and the callback. They are deleted as soon as the callback runs, whether it
 * succeeded or not, so a stale attempt can never be replayed.
 */
export const OIDC_STATE_COOKIE = "smart_garage_oidc_state";
export const OIDC_VERIFIER_COOKIE = "smart_garage_oidc_verifier";
export const OIDC_NEXT_COOKIE = "smart_garage_oidc_next";

/** Ten minutes is plenty to finish a login and short enough to limit replay. */
export const OIDC_TRANSACTION_MAX_AGE_SECONDS = 600;
