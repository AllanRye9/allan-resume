# allan-resume

Online professional CV — full-stack development, system design, and engineering across healthcare, finance, and gaming industries.

## Deployment (Vercel)

1. Import the repository into [Vercel](https://vercel.com).
2. Set the following **Environment Variables** in your Vercel project settings:

   | Variable        | Description                                  | Default     |
   |-----------------|----------------------------------------------|-------------|
   | `ADMIN_PASSWORD`| Password required to log into `/admin`       | `admin123`  |
   | `TOKEN_SALT`    | Random string used to sign admin tokens      | `allan-resume-salt` |

   > ⚠️ **Always change both values before deploying publicly.**

3. Deploy — Vercel serves `index.html` as the root and the `/api/*` functions as serverless endpoints automatically.

## Admin Dashboard (`/admin`)

Navigate to `https://your-domain.vercel.app/admin` to access the admin panel.

### Features

| Section | What it shows |
|---------|---------------|
| **Analytics** | Total visits, unique visitors, countries, average time on page, daily sparkline chart, visitors-by-country bar chart, top IP addresses, recent visit table (IP, country/city, page, duration, referrer) |
| **Content Editor** | Update profile picture, name, title, tagline, email, phone, GitHub URL, LinkedIn URL, featured video, hero image gallery |

### Analytics data collection

Every page load on the resume fires a `POST /api/track` request with the visitor's page, referrer and user-agent. On unload it also sends the time spent on the page. The server resolves country/city from the visitor IP using the free [ipapi.co](https://ipapi.co) service.

> **Note on persistence:** Analytics and content changes are held in memory for the lifetime of each serverless function instance and reset on cold starts. For durable storage, connect [Vercel KV](https://vercel.com/docs/storage/vercel-kv) and update `api/_store.js` to read/write from KV.

## Local development

No build step required — just serve the static files with any HTTP server that also handles the `/api` routes.  
The easiest way is to use the [Vercel CLI](https://vercel.com/docs/cli):

```bash
npm i -g vercel
vercel dev
```

Then open `http://localhost:3000`.
