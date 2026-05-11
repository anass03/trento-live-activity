require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./data/db');

const PORT = process.env.PORT || 3000;

async function start() {
  await sequelize.authenticate();
  console.log('PostgreSQL connected');
  await sequelize.sync({ alter: true });
  console.log('Models synced');
  app.listen(PORT, () => console.log(`API Gateway listening on port ${PORT}`));
}

start().catch((err) => {
  console.error('Startup error:', err);
  process.exit(1);
});
