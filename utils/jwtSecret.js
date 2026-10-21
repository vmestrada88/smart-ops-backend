/**
 * Returns the JWT signing secret. There is intentionally no fallback value:
 * a missing secret must fail loudly instead of signing tokens with a guessable key.
 * @returns {string}
 */
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
};

module.exports = { getJwtSecret };
