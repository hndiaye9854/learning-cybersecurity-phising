'use strict';

/** Échappe le HTML : les pseudos sont des entrées utilisateur (anti-XSS). */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
}

function renderStats({ count, entries }) {
  const rows = entries
    .slice()
    .reverse()
    .map(
      (e, i) => `
        <tr>
          <td>${entries.length - i}</td>
          <td class="pseudo">${escapeHtml(e.pseudo)}</td>
          <td>${escapeHtml(formatDate(e.at))}</td>
        </tr>`,
    )
    .join('');

  const unique = new Set(entries.map((e) => e.pseudo.toLowerCase())).size;

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Statistiques - Démo phishing</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body class="page-stats">
  <main class="container">
    <header class="stats-header">
      <p class="eyebrow">Tableau de bord de la démonstration</p>
      <h1>Ce qui aurait pu être capturé</h1>
      <p class="lead">Chaque ligne correspond à une personne qui a saisi une information
      sur le portail factice. Ici, ce n’est qu’un pseudo. Sur un vrai site
      de phishing, ç’aurait pu être un identifiant et un mot de passe.</p>
    </header>

    <section class="kpis" aria-label="Chiffres clés">
      <div class="kpi"><span class="kpi-value">${count}</span><span class="kpi-label">soumissions</span></div>
      <div class="kpi"><span class="kpi-value">${unique}</span><span class="kpi-label">pseudos distincts</span></div>
    </section>

    <section class="card">
      <h2>Pseudos saisis</h2>
      ${
        entries.length
          ? `<div class="table-wrap"><table>
        <thead><tr><th>#</th><th>Pseudo</th><th>Date</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`
          : '<p class="muted">Aucune soumission pour l’instant.</p>'
      }
    </section>
  </main>
</body>
</html>`;
}

module.exports = { renderStats, escapeHtml };
