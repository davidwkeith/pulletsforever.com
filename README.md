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

## Project Structure

```
pulletsforever.com/
├── src/              # Content and templates
│   ├── blog/         # Blog posts
│   ├── _data/        # Data files (metadata, schema, CSP, etc.)
│   ├── _includes/    # Layouts, partials, macros, CSS, JS
│   └── ...
├── plugins/          # Custom Eleventy plugins
├── workers/          # Cloudflare Workers
│   └── micropub/     # Micropub endpoint
└── _site/            # Generated output (gitignored)
```

---

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

After publishing new content with external links:

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
| `BLOG_PATH` | Path to blog posts (default: `src/blog`) |
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

The main site is deployed to [Cloudflare Pages](https://pages.cloudflare.com/), which uses Workers under the hood to serve static files.

### Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (already installed as a dev dependency)

### Deploy via Wrangler CLI

```bash
# Build and deploy to Cloudflare Pages
npm run deploy
```

This will:
1. Build the site with Eleventy (`npm run build`)
2. Deploy the `_site/` directory to Cloudflare Pages

### Deploy via Git Integration (Recommended)

For automatic deployments on every push:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages**
2. Click **Create application** → **Pages** → **Connect to Git**
3. Select your GitLab repository
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `_site`
   - **Root directory**: `/` (or leave empty)
5. Add environment variables if needed (e.g., `WEBMENTION_IO_TOKEN`)
6. Click **Save and Deploy**

After setup, every push to your main branch will automatically trigger a new deployment.

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
