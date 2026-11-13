'use strict';

const path = require('node:path');
const express = require('express');
const { createStore } = require('./store');
const { requireAdmin } = require('./auth');
const { renderStats } = require('./views');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Pseudo : 2 à 30 caractères, lettres (accents compris), chiffres, . _ -
const PSEUDO_RE = /^[\p{L}\p{N}._-]{2,30}$/u;

// Garde-fou éthique : on refuse ce qui ressemble à un e-mail.
const EMAIL_LIKE_RE = /@/;

function createApp({ adminToken, dataFile }) {
  const app = express();
  const store = createStore(dataFile);

  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback'); // derrière nginx sur la même machine

  // En-têtes de sécurité de base (sans dépendance supplémentaire).
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow',
      'Content-Security-Policy':
        "default-src 'self'; style-src 'self'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    });
    next();
  });

  app.use(express.urlencoded({ extended: false, limit: '1kb' }));

  app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

  app.post('/acces', async (req, res, next) => {
    const pseudo = String(req.body.pseudo || '').trim();

    // Entrée invalide : on renvoie vers l'accueil, sans rien enregistrer.
    if (!PSEUDO_RE.test(pseudo) || EMAIL_LIKE_RE.test(pseudo)) {
      return res.redirect(303, '/?erreur=pseudo');
    }

    try {
      await store.addPseudo(pseudo);
      // Révélation immédiate : redirection vers la page de sensibilisation.
      return res.redirect(303, '/sensibilisation');
    } catch (err) {
      return next(err);
    }
  });

  app.get('/sensibilisation', (req, res) =>
    res.sendFile(path.join(PUBLIC_DIR, 'sensibilisation.html')),
  );

  app.get('/stats', requireAdmin(adminToken), async (req, res, next) => {
    try {
      const data = await store.read();
      res.set('Cache-Control', 'no-store');
      res.type('html').send(renderStats(data));
    } catch (err) {
      next(err);
    }
  });

  app.get('/healthz', (req, res) => res.json({ status: 'ok' }));

  app.use(express.static(PUBLIC_DIR, { index: false, extensions: false }));

  app.use((req, res) => res.status(404).type('text/plain').send('Page introuvable.'));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).type('text/plain').send('Erreur interne.');
  });

  return app;
}

module.exports = { createApp, PSEUDO_RE };
