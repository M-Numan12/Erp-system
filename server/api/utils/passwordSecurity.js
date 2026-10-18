const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const isPasswordHash = (value) => /^\\$2[aby]\\$\\d\\d\\$/.test(value || '');
const hashPassword = async (password) => bcrypt.hash(String(password), 12);
const verifyPassword = async (input, stored) => {
  if (isPasswordHash(stored)) return bcrypt.compare(String(input), stored);
  const a = Buffer.from(String(input));
  const b = Buffer.from(String(stored || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const credentialFingerprint = (storedPassword) => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
  return crypto.createHmac('sha256', process.env.JWT_SECRET)
    .update(String(storedPassword)).digest('hex');
};

module.exports = { isPasswordHash, hashPassword, verifyPassword, credentialFingerprint };
