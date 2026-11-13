# Portail de sensibilisation au phishing

Démo pédagogique réalisée dans le cadre d’un exercice de cybersécurité encadré
par l’enseignant. Elle montre qu’un portail d’apparence légitime suffit à
convaincre quelqu’un de saisir une information, puis sensibilise la personne
**immédiatement** après la saisie.

> ⚠️ Ce projet est une démo de sensibilisation, **pas** un outil de collecte
> d’identifiants. Ne le modifiez pas pour demander des mots de passe, des
> adresses e-mail ou d’autres données personnelles.

---

## Sommaire

1. [Objectif pédagogique](#objectif-pédagogique)
2. [Cadre éthique](#cadre-éthique)
3. [Fonctionnement](#fonctionnement)
4. [Structure du projet](#structure-du-projet)
5. [Installation locale](#installation-locale)
6. [Configuration](#configuration)
7. [Lancement avec Docker](#lancement-avec-docker)
8. [Déploiement sur un VPS (Docker + nginx + certbot)](#déploiement-sur-un-vps)
9. [GitHub : dépôt et CI](#github--dépôt-et-ci)
10. [Déploiement automatique par SSH](#déploiement-automatique-par-ssh)
11. [Licence](#licence)

---

## Objectif pédagogique

- Montrer qu’un design soigné et une promesse attractive (« tous les cours
  résumés ») suffisent à faire saisir une information sur un site inconnu.
- Révéler aussitôt le test et expliquer les signaux d’alerte : nom de domaine
  inhabituel, sentiment d’urgence, offre trop belle, vérification de
  l’expéditeur et de l’URL.
- Illustrer, pendant la présentation, « ce qui aurait pu être capturé » grâce
  à la page `/stats`.

## Cadre éthique

| Règle | Mise en œuvre dans le code |
|---|---|
| Seul un **pseudonyme** est demandé | Un unique champ texte ; aucun champ mot de passe / e-mail (vérifié par les tests) |
| Pas de donnée personnelle stockée | Le fichier ne contient que `{ pseudo, at }` : ni IP, ni user-agent. Les pseudos contenant `@` sont refusés. nginx n’enregistre pas les accès (`access_log off`) |
| Révélation immédiate | Après la soumission, redirection directe vers `/sensibilisation` |
| Aucune usurpation | Portail générique, sans nom d’enseignant, d’établissement ni logo réel |
| Données minimales et temporaires | Supprimez les données après la présentation (voir [Réinitialiser](#réinitialiser-les-données)) |

Autres bonnes pratiques :

- Annoncez l’exercice en fin de séance à toute la classe, même à ceux qui
  n’ont pas cliqué.
- N’utilisez la page `/stats` que pour la présentation ; ne vous moquez de
  personne. Le message est : « ça arrive à tout le monde ».
- Coupez le service une fois l’exercice terminé.

## Fonctionnement

| Route | Rôle |
|---|---|
| `GET /` | Le « leurre » : portail de révision avec un champ pseudo |
| `POST /acces` | Valide le pseudo (2–30 caractères : lettres, chiffres, `.` `_` `-`), incrémente le compteur, ajoute le pseudo à la liste, redirige vers `/sensibilisation` |
| `GET /sensibilisation` | Révèle le test et explique les signaux d’alerte |
| `GET /stats` | Nombre de soumissions + liste des pseudos. Protégée par HTTP Basic Auth : identifiant libre, mot de passe = `ADMIN_TOKEN` |
| `GET /healthz` | Sonde de santé (Docker, CI) |

Sécurité : pseudos échappés à l’affichage (anti-XSS), comparaison du
mot de passe en temps constant, en-têtes de sécurité (CSP, `X-Frame-Options`,
`noindex`…), écritures du fichier JSON sérialisées et atomiques, conteneur
non-root en lecture seule.

## Structure du projet

```
.
├── src/
│   ├── server.js          # point d'entrée (lecture .env, écoute)
│   ├── app.js             # routes Express
│   ├── store.js           # stockage JSON (compteur + pseudos)
│   ├── auth.js            # protection /stats (Basic Auth, ADMIN_TOKEN)
│   └── views.js           # rendu HTML de /stats (échappé)
├── public/
│   ├── index.html         # le "leurre"
│   ├── sensibilisation.html
│   ├── styles.css
│   └── app.js             # affichage du message d'erreur du formulaire
├── test/app.test.js       # tests (node:test)
├── deploy/
│   └── nginx/cyber.hamidnd.me.conf
├── .github/workflows/
│   ├── ci.yml             # lint + tests à chaque push
│   └── deploy.yml         # déploiement SSH (désactivé par défaut)
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── eslint.config.js
├── LICENSE
└── package.json
```

## Installation locale

Prérequis : Node.js ≥ 20.

```bash
git clone https://github.com/<votre-compte>/learning-cybersecurity-phising.git
cd learning-cybersecurity-phising
npm install
cp .env.example .env        # puis éditez ADMIN_TOKEN
npm start                   # ou : npm run dev (rechargement automatique)
```

Ouvrez <http://localhost:3010>, puis <http://localhost:3010/stats>
(identifiant : n’importe quoi, mot de passe : votre `ADMIN_TOKEN`).

Vérifications :

```bash
npm run lint
npm test
```

## Configuration

Variables lues depuis `.env` (voir `.env.example`) :

| Variable | Défaut | Description |
|---|---|---|
| `PORT` | `3010` | Port d’écoute de l’application |
| `HOST_PORT` | `8130` | Port publié sur l’hôte par docker compose (`127.0.0.1` uniquement) |
| `ADMIN_TOKEN` | *(vide)* | Mot de passe de `/stats`. Si vide, `/stats` est désactivée |
| `DATA_FILE` | `data/submissions.json` | Fichier de stockage |

Générer un jeton robuste :

```bash
openssl rand -base64 24
```

### Réinitialiser les données

```bash
rm data/submissions.json                       # en local
docker compose down -v                         # avec Docker (supprime le volume)
```

## Lancement avec Docker

```bash
cp .env.example .env        # éditez ADMIN_TOKEN
docker compose up -d --build
docker compose logs -f
```

L’application écoute sur le port 3010 dans le conteneur et n’est publiée que sur
`127.0.0.1:8130` (pas exposée directement sur Internet) ; nginx sert de reverse proxy HTTPS. Les données sont
conservées dans le volume Docker `phishing-demo-data`.

## Déploiement sur un VPS

Exemple pour **Debian/Ubuntu** et le domaine **cyber.hamidnd.me**.

### 1. DNS

Chez votre registrar, créez un enregistrement `A` (et `AAAA` si IPv6)
`cyber.hamidnd.me` → IP du VPS. Vérifiez :

```bash
dig +short cyber.hamidnd.me
```

### 2. Paquets

```bash
sudo apt update
sudo apt install -y git nginx certbot python3-certbot-nginx
# Docker (méthode officielle)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # puis déconnexion / reconnexion
```

### 3. Pare-feu

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'     # ports 80 et 443
sudo ufw enable
```

### 4. Récupérer le code et lancer l’application

```bash
cd ~
git clone https://github.com/<votre-compte>/learning-cybersecurity-phising.git
cd learning-cybersecurity-phising
cp .env.example .env
sed -i "s|^ADMIN_TOKEN=.*|ADMIN_TOKEN=$(openssl rand -base64 24)|" .env
grep ADMIN_TOKEN .env           # notez-le pour la présentation
docker compose up -d --build
curl -s http://127.0.0.1:8130/healthz   # → {"status":"ok"}
```

### 5. Certificat HTTPS (Let’s Encrypt)

nginx doit tourner et le DNS doit pointer vers le VPS :

```bash
sudo mkdir -p /var/www/certbot
sudo certbot certonly --nginx -d cyber.hamidnd.me
```

Certbot crée le certificat dans `/etc/letsencrypt/live/cyber.hamidnd.me/`
ainsi que `options-ssl-nginx.conf` et `ssl-dhparams.pem`.

### 6. Configuration nginx

```bash
sudo cp deploy/nginx/cyber.hamidnd.me.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/cyber.hamidnd.me.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Ouvrez <https://cyber.hamidnd.me>.

### 7. Renouvellement automatique

Le paquet certbot installe un timer systemd. Test :

```bash
sudo certbot renew --dry-run
systemctl list-timers | grep certbot
```

### 8. Mettre à jour / arrêter

```bash
cd ~/learning-cybersecurity-phising
git pull && docker compose up -d --build   # mise à jour
docker compose down                        # arrêt (données conservées)
docker compose down -v                     # arrêt + suppression des données
```

Après la présentation, pensez à arrêter le service et à supprimer les données.

## GitHub : dépôt et CI

### Créer le dépôt et pousser

Avec le CLI `gh` :

```bash
gh auth login                       # une seule fois
gh repo create learning-cybersecurity-phising --private --source=. --remote=origin --push
```

Ou via l’interface web : créez un dépôt **vide** (sans README ni licence) sur
<https://github.com/new>, puis :

```bash
git remote add origin git@github.com:<votre-compte>/learning-cybersecurity-phising.git
git push -u origin main
```

Un dépôt **privé** est conseillé tant que l’exercice n’est pas terminé (sinon
vos camarades pourraient découvrir la démo avant de la vivre).

### Intégration continue

`.github/workflows/ci.yml` s’exécute à chaque push et pull request :

1. `npm ci` (Node 20 et 22) ;
2. `npm run lint` (ESLint) ;
3. `npm test` (tests de l’application) ;
4. démarrage réel du serveur et appel de `/healthz` ;
5. construction de l’image Docker.

## Déploiement automatique par SSH

Le workflow `.github/workflows/deploy.yml` se lance à chaque push sur `main`
(ou manuellement depuis l’onglet *Actions*). Il :

1. construit l’image Docker sur GitHub Actions ;
2. la compresse et la copie sur le VPS par SCP ;
3. la charge sur le VPS, remplace le conteneur `phishing-demo`
   (port `127.0.0.1:8130` vers 3010, volume `phishing-demo-data`, lecture seule) ;
4. vérifie que `/healthz` répond, sinon affiche les logs et échoue.

Il est **désactivé par défaut** : le job ne s’exécute que si la variable de
dépôt `DEPLOY_ENABLED` vaut `true`. Sans elle, le workflow est simplement
ignoré (pas d’échec à chaque push).

Pour l’activer :

1. Sur le VPS, créez une clé dédiée au déploiement :
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/gh_deploy -N "" -C "github-deploy"
   cat ~/.ssh/gh_deploy.pub >> ~/.ssh/authorized_keys
   cat ~/.ssh/gh_deploy        # clé privée à copier dans le secret GitHub
   ```
2. Sur le VPS, créez le fichier d’environnement lu par le conteneur :
   ```bash
   mkdir -p ~/phishing-demo
   echo "ADMIN_TOKEN=$(openssl rand -base64 24)" > ~/phishing-demo/.env
   chmod 600 ~/phishing-demo/.env
   ```
3. Dans GitHub, *Settings → Secrets and variables → Actions*, ajoutez les
   secrets `VPS_HOST`, `VPS_USERNAME`, `VPS_SSH_KEY` et `VPS_PORT`
   (optionnel, 22 par défaut). Avec `gh` :
   ```bash
   gh secret set VPS_HOST --body "IP_DU_VPS"
   gh secret set VPS_USERNAME --body "votre_utilisateur"
   gh secret set VPS_SSH_KEY < ~/.ssh/gh_deploy
   ```
4. Activez le déploiement :
   ```bash
   gh variable set DEPLOY_ENABLED --body true
   ```

L’utilisateur SSH doit appartenir au groupe `docker`. Le volume
`phishing-demo-data` est le même que celui de `docker-compose.yml` : passer de
l’un à l’autre conserve les données. nginx et certbot restent configurés comme
décrit plus haut.

Bonnes pratiques : utilisateur dédié sur le VPS, clé SSH dédiée et révocable,
aucun secret dans le code.

## Licence

[MIT](LICENSE), © 2026 Hamidou NDIAYE.
