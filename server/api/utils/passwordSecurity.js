const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const isBcryptHash = (value) => /^\$2[aby]\$\d\d\$/.test(String(value || ''));

// Accept legacy plaintext accounts until they log in successfully; never
// downgrade a stored bcrypt credential back to plaintext.
async function verifyPassword(submitted, stored) {
  if (typeof submitted !== 'string' || typeof stored !== 'string') return false;
  if (isBcryptHash(stored)) return bcrypt.compare(submitted, stored);
  const a = Buffer.from(submitted.trim());
  const b = Buffer.from(stored.trim());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function hashPassword(value) {
  if (typeof value !== 'string' || !value.length) throw new Error('Password is required');
  return bcrypt.hash(value, 12);
}

// A keyed fingerprint prevents disclosure of passwords or reusable hashes
// through a decodable JWT while still revoking tokens after password changes.
function credentialVersion(stored, secret) {
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return crypto.createHmac('sha256', secret).update(String(stored)).digest('hex');
}

module.exports = { isBcryptHash, verifyPassword, hashPassword, credentialVersion };
