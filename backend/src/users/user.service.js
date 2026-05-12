const { User } = require('../data/models');
const { serializeUser } = require('../data/presenters');

async function getCurrentUser() {
  const seededEmail = process.env.MOCK_CURRENT_USER_EMAIL || 'mario.rossi@example.com';
  const seededUser = await User.findOne({ where: { email: seededEmail } });
  if (seededUser) return serializeUser(seededUser);

  const firstUser = await User.findOne({ order: [['createdAt', 'ASC']] });
  return serializeUser(firstUser);
}

module.exports = { getCurrentUser };
