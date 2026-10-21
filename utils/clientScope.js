const { User, Contact } = require('../models');

/**
 * Resolves the client company a 'client' user belongs to, by matching the
 * user's email against the client's contacts.
 * @param {number|string} userId
 * @returns {Promise<number|null>} clientId, or null when the user is not linked to any client
 */
const resolveClientIdForUser = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user || !user.email) return null;
  const contact = await Contact.findOne({ where: { email: user.email } });
  return contact ? contact.clientId : null;
};

/**
 * Returns the email of the given user, or null if not found.
 * @param {number|string} userId
 * @returns {Promise<string|null>}
 */
const getUserEmail = async (userId) => {
  const user = await User.findByPk(userId);
  return user ? user.email : null;
};

module.exports = { resolveClientIdForUser, getUserEmail };
