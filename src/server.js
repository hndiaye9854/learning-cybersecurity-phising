'use strict';

require('dotenv').config({ quiet: true });
const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const DATA_FILE = process.env.DATA_FILE || 'data/submissions.json';

if (!ADMIN_TOKEN) {
  console.warn('⚠️  ADMIN_TOKEN non défini : la page /stats est désactivée.');
} else if (ADMIN_TOKEN.length < 12) {
  console.warn('⚠️  ADMIN_TOKEN est court : utilisez au moins 12 caractères.');
}

const app = createApp({ adminToken: ADMIN_TOKEN, dataFile: DATA_FILE });

const server = app.listen(PORT, HOST, () => {
  console.log(`Démo de sensibilisation disponible sur http://${HOST}:${PORT}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
