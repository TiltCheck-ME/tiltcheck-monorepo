export const TERMS_VERSION = process.env.IDENTITY_TERMS_VERSION || 'v1';
export const PRIVACY_VERSION = process.env.IDENTITY_PRIVACY_VERSION || 'v1';
export const MAGIC_REQUIRED = process.env.IDENTITY_REQUIRE_MAGIC === 'true';
export const LEGAL_REQUIRED = process.env.IDENTITY_REQUIRE_LEGAL !== 'false';