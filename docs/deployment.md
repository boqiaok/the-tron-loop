# Production deployment

Production runs on one Ubuntu/Debian server behind Cloudflare:

```text
Browser ──HTTPS──▶ Cloudflare ──HTTPS (origin certificate)──▶ Caddy
                                                        ├── /api/*          → server:3001
                                                        └── everything else → web:3000
server ──TLS──▶ Neon PostgreSQL
server ──S3 API──▶ Cloudflare R2 (whson-media) ◀── media.whson.com ◀── Browser
```

GitHub Actions verifies each push to `main`, builds the `server` and `web`
images, pushes them to GitHub Container Registry, and restarts the services on
the server over SSH. The server never builds images itself.

## One-time setup

### 1. Cloudflare

1. Add the domain to Cloudflare and change the registrar's nameservers to the
   ones Cloudflare assigns.
2. DNS: add proxied (orange cloud) `A` records for `@` and `www` pointing at
   the server's IP address.
3. SSL/TLS → Overview: set the encryption mode to **Full (strict)**.
4. SSL/TLS → Origin Server: create an origin certificate covering
   `example.com` and `*.example.com`. Keep the certificate and private key for
   step 3 of the server setup.
5. R2 Object Storage: create the buckets `whson-media` (production) and
   `whson-media-dev` (local development) with the location hint
   **Western North America**.
6. `whson-media` → Settings → Custom Domains: connect `media.example.com`.
   `whson-media-dev` → Settings: enable the public development URL
   (`https://pub-….r2.dev`) for local use.
7. R2 → Manage API tokens: create an **Object Read & Write** token scoped to
   both buckets. Keep the access key ID, secret access key and account ID.

### 2. Server

Check that the server is `x86_64`; the images are built for `linux/amd64`.

```bash
uname -m
```

Add swap so a memory spike does not kill a container on a 1 GB server:

```bash
sudo fallocate -l 1G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Install Docker (https://docs.docker.com/engine/install/) and allow the deploy
user to run it:

```bash
sudo usermod -aG docker "$USER"
```

Allow only SSH and web traffic:

```bash
sudo ufw allow OpenSSH && sudo ufw allow 80,443/tcp && sudo ufw enable
```

### 3. Application files

```bash
sudo mkdir -p /opt/the-tron-loop && sudo chown "$USER" /opt/the-tron-loop
git clone https://github.com/boqiaok/the-tron-loop.git /opt/the-tron-loop
cd /opt/the-tron-loop
```

Create `.env` from `.env.example` and set `SITE_DOMAIN` to the apex domain.

Create `server/.env` with the production secrets. `docker-compose.prod.yml`
already sets `NODE_ENV`, `PORT`, `WEB_ORIGIN`, `PUBLIC_API_URL` and
`ADMIN_COOKIE_SECURE`.

```dotenv
DATABASE_URL=postgresql://…@ep-….ap-southeast-2.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require
IMPORTS_ENABLED=true
EVENTFINDA_USERNAME=
EVENTFINDA_PASSWORD=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=whson-media
MEDIA_PUBLIC_URL=https://media.example.com
```

Use Neon's direct connection string (the host without `-pooler`).

Save the Cloudflare origin certificate and key:

```bash
mkdir -p infrastructure/caddy/certs
nano infrastructure/caddy/certs/origin.pem
nano infrastructure/caddy/certs/origin.key
chmod 600 infrastructure/caddy/certs/origin.key
```

`.env`, `server/.env` and `infrastructure/caddy/certs/` are ignored by Git, so
deployments never overwrite them.

### 4. GitHub

Create a deploy key pair on your own machine and authorise it on the server:

```bash
ssh-keygen -t ed25519 -f the-tron-loop-deploy -N '' -C github-actions-deploy
ssh-copy-id -i the-tron-loop-deploy.pub user@server-ip
ssh-keyscan -t ed25519 server-ip
```

In the repository, open Settings → Environments, create `production`, and add:

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `SSH_HOST` | Server IP address |
| Secret | `SSH_USER` | Deploy user |
| Secret | `SSH_PRIVATE_KEY` | Contents of `the-tron-loop-deploy` |
| Secret | `SSH_KNOWN_HOSTS` | Output of `ssh-keyscan` |
| Variable | `DEPLOY_PATH` | `/opt/the-tron-loop` |

Then delete the local private key file.

## Deploying

Push to `main`, or run the **Deploy** workflow manually from the Actions tab.
The server container applies pending migrations before it starts.

To deploy by hand on the server:

```bash
cd /opt/the-tron-loop
git pull
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --wait
```

## Operations

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f server
```

Neon provides point-in-time restore for the database. Uploaded images live in
R2, so the server holds no data that needs backing up besides `.env`,
`server/.env` and the origin certificate.
