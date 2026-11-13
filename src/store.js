'use strict';

/**
 * Stockage minimaliste dans un fichier JSON.
 *
 * Données conservées : uniquement le pseudo saisi et l'horodatage.
 * Aucune adresse IP, aucun user-agent, aucune donnée personnelle.
 */

const fs = require('node:fs/promises');
const path = require('node:path');

const EMPTY = Object.freeze({ count: 0, entries: [] });

function createStore(filePath) {
  const resolved = path.resolve(filePath);
  // Chaîne de promesses : sérialise les écritures pour éviter les conflits.
  let queue = Promise.resolve();

  async function read() {
    try {
      const raw = await fs.readFile(resolved, 'utf8');
      const data = JSON.parse(raw);
      return {
        count: Number.isInteger(data.count) ? data.count : 0,
        entries: Array.isArray(data.entries) ? data.entries : [],
      };
    } catch (err) {
      if (err.code === 'ENOENT') return { ...EMPTY, entries: [] };
      throw err;
    }
  }

  async function write(data) {
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    const tmp = `${resolved}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tmp, resolved); // remplacement atomique
  }

  function addPseudo(pseudo) {
    const task = queue.then(async () => {
      const data = await read();
      data.count += 1;
      data.entries.push({ pseudo, at: new Date().toISOString() });
      await write(data);
      return data.count;
    });
    // Une erreur ne doit pas bloquer les écritures suivantes.
    queue = task.catch(() => {});
    return task;
  }

  return { read, addPseudo };
}

module.exports = { createStore };
