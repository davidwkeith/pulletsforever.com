# pulletsforever.com

A personal blog about backyard chickens, technology, and other interests. Built with [Eleventy](https://www.11ty.dev/).

## Development

```bash
# Install dependencies
npm install

# Run development server
npm start

# Build for production
npm run build
```

## Blog Post Frontmatter

Blog posts support the following frontmatter fields (see [frontmatter.json](frontmatter.json)):

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Post title |
| `date` | Yes | Publication date (`YYYY-MM-DD` or ISO 8601) |
| `description` | No | Short description for meta tags |
| `tags` | No | Array of categorization tags |
| `modified` | No | Last modification date (`YYYY-MM-DD`) |

---

## Webmentions

This site supports [webmentions](https://indieweb.org/Webmention) via [webmention.io](https://webmention.io/).

### Receiving Webmentions

1. Set the `WEBMENTION_IO_TOKEN` environment variable (get from webmention.io dashboard)
2. Webmentions are fetched at build time and cached in `.cache/webmentions.json`
3. Client-side JavaScript refreshes webmentions for visitors

### Sending Webmentions

Webmentions are sent automatically as part of `npm run deploy`. To send manually:

```bash
# Preview what would be sent
npm run webmentions:send:dry

# Send webmentions
npm run webmentions:send
```

Sent webmentions are tracked in `.cache/webmentions-sent.json` to avoid duplicates.

---

## Micropub

This site supports [Micropub](https://indieweb.org/Micropub), enabling posting from IndieWeb clients like [Quill](https://quill.p3k.io/), [Indigenous](https://indigenous.realize.be/), or [iA Writer](https://ia.net/writer).

### Features

- **Create posts**: Articles, notes, photos, and replies
- **Update posts**: Modify title, tags, content, and other properties
- **Delete posts**: Remove posts from the repository
- **Media uploads**: Images and videos stored in Cloudflare R2
- **IndieAuth**: Secure authentication via [indieauth.com](https://indieauth.com/)

### Endpoints

| Endpoint | URL |
|----------|-----|
| Micropub | `https://micropub.pulletsforever.com/micropub` |
| Media | `https://micropub.pulletsforever.com/media` |
| Authorization | `https://indieauth.com/auth` |
| Token | `https://indieauth.com/token` |

### Supported Post Types

| Type | Description |
|------|-------------|
| Article | Post with `name` (title) and `content` |
| Note | Post with `content` only (no title) |
| Photo | Post with `photo` property |
| Reply | Post with `in-reply-to` URL |

### Micropub Properties Mapping

| Micropub Property | Frontmatter Field | Notes |
|-------------------|-------------------|-------|
| `name` | `title` | If absent, treated as note |
| `content` | Post body | HTML or plain text |
| `published` | `date` | ISO 8601 format |
| `category` | `tags` | Array of tags |
| `summary` | `description` | Meta description |
| `photo` | Embedded image | Rendered as markdown image |
| `in-reply-to` | `in-reply-to` | URL being replied to |
| `mp-slug` | Filename/URL slug | Auto-generated if absent |

### Deployment

The Micropub endpoint runs as a Cloudflare Worker. See `workers/micropub/` for source code.

#### Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- GitLab personal access token with `api` scope

#### 1. Create R2 Bucket

```bash
# Create the media storage bucket
wrangler r2 bucket create pulletsforever-media
```

#### 2. Configure Custom Domain (Optional)

In the Cloudflare dashboard:
1. Go to **Workers & Pages** → **pulletsforever-micropub**
2. Click **Settings** → **Triggers** → **Custom Domains**
3. Add `micropub.pulletsforever.com`

For media serving, create a public R2 bucket custom domain:
1. Go to **R2** → **pulletsforever-media** → **Settings**
2. Under **Public access**, connect a custom domain: `media.pulletsforever.com`

#### 3. Set Secrets

```bash
cd workers/micropub

# GitLab token for committing posts
wrangler secret put GITLAB_TOKEN
# Paste your GitLab personal access token (api scope)
```

#### 4. Deploy

```bash
cd workers/micropub
npm install
wrangler deploy
```

#### Environment Variables

Configured in `wrangler.toml`:

| Variable | Description |
|----------|-------------|
| `SITE_URL` | Your site URL (e.g., `https://pulletsforever.com`) |
| `GITLAB_PROJECT_ID` | GitLab project path (e.g., `username/repo`) |
| `GITLAB_BRANCH` | Branch for commits (default: `main`) |
| `BLOG_PATH` | Path to blog posts (default: `src/posts`) |
| `MEDIA_URL` | Public URL for uploaded media |
| `MAX_FILE_SIZE` | Maximum upload size in bytes (default: 10MB) |

#### Required Scopes

When authenticating with a Micropub client, request these scopes:

| Scope | Required For |
|-------|--------------|
| `create` | Creating new posts, uploading media |
| `update` | Modifying existing posts |
| `delete` | Removing posts |
| `media` | Uploading files (optional, `create` also works) |

### Development

```bash
cd workers/micropub
npm install

# Run tests
npm test

# Start local dev server
wrangler dev
```

### Security Notes

- SVG uploads are blocked to prevent XSS attacks
- Tokens are verified with indieauth.com on every request
- The `me` URL must match the configured `SITE_URL`

---

## Site Deployment

The main site is deployed as a [Cloudflare Worker](https://developers.cloudflare.com/workers/) with statically built assets from Eleventy.

### Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (already installed as a dev dependency)

### Deploy via Wrangler CLI

```bash
# Build and deploy the Worker + static assets
npm run deploy
```

This will:
1. Build the site with Eleventy (`npm run build`)
2. Sign `security.txt` with GPG (if configured)
3. Deploy a Worker (`workers/site/`) with `_site/` as static assets
4. Ping WebSub hub for feed subscribers
5. Send webmentions for new outgoing links

### Deploy via Git Integration (Recommended)

For automatic deployments on every push:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages**
2. Click **Create application** → **Workers** → **Import a repository**
3. Select your GitLab repository
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Deploy command**: `npx wrangler deploy`
   - **Root directory**: `/` (or leave empty)
5. Add environment variables (see [Environment Variables](#environment-variables) below)
6. Click **Save and Deploy**

After setup, every push to your main branch will automatically trigger a new deployment.

### Environment Variables

Configure these in the Cloudflare dashboard under **Workers & Pages** → your project → **Settings** → **Variables and Secrets**.

| Variable | Required | Description |
|----------|----------|-------------|
| `WEBMENTION_IO_TOKEN` | No | Token for fetching webmentions at build time |
| `GPG_PRIVATE_KEY` | No | ASCII-armored PGP private key for signing `security.txt` |

#### Configuring OpenPGP Signing

The deploy pipeline signs `security.txt` with a cleartext OpenPGP signature per [RFC 9116 §2.3](https://www.rfc-editor.org/rfc/rfc9116#section-2.3) using [openpgp.js](https://openpgpjs.org/). If `GPG_PRIVATE_KEY` is not set, signing is skipped gracefully.

An Ed25519 key is recommended (small enough for Cloudflare's 5KB secret limit):

```bash
# Generate with gpg
gpg --quick-generate-key "Your Name <security@example.com>" ed25519 sign 2y
gpg --armor --export-secret-keys KEY_ID

# Or generate with openpgp.js (no gpg required)
node -e "import('openpgp').then(async o=>{const k=await o.generateKey({type:'ecc',curve:'ed25519',userIDs:[{name:'Your Name',email:'security@example.com'}],format:'armored'});console.log(k.privateKey)})"
```

Add `GPG_PRIVATE_KEY` as an **encrypted** variable in **Variables and Secrets** with the full ASCII-armored output.

Verify locally:
```bash
GPG_PRIVATE_KEY="$(cat key.asc)" npm run sign:security-txt:dry
```

### Custom Domain

To use your custom domain (`pulletsforever.com`):

1. In Cloudflare Dashboard → **Workers & Pages** → **pulletsforever**
2. Go to **Custom domains**
3. Click **Set up a custom domain**
4. Enter `pulletsforever.com` and follow the DNS configuration instructions

---

## License

- **Code**: [ISC License](https://opensource.org/license/isc-license-txt)
- **Content**: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
