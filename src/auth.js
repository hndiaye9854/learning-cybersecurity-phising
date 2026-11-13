'use strict';

const crypto = require('node:crypto');

/** Comparaison en temps constant (évite les attaques temporelles). */
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/**
 * Middleware HTTP Basic Auth : l'identifiant est libre,
 * le mot de passe doit être égal à ADMIN_TOKEN.
 */
function requireAdmin(adminToken) {
  return (req, res, next) => {
    if (!adminToken) {
      return res
        .status(503)
        .type('text/plain')
        .send('Page désactivée : ADMIN_TOKEN n’est pas défini.');
    }

    const header = req.get('authorization') || '';
    const [scheme, encoded] = header.split(' ');
    if (scheme === 'Basic' && encoded) {
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      const password = decoded.slice(decoded.indexOf(':') + 1);
      if (safeEqual(password, adminToken)) return next();
    }

    res.set('WWW-Authenticate', 'Basic realm="Statistiques", charset="UTF-8"');
    return res.status(401).type('text/plain').send('Authentification requise.');
  };
}

module.exports = { requireAdmin, safeEqual };
