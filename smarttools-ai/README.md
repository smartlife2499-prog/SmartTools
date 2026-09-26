# 🧰 SmartTools AI

Privacy-first collection of 14 free utility & AI tools.

**Visitors never need an API key.** AI works out of the box.

## How AI works

A tiny Cloudflare Pages Function (`/api/gemini`) keeps your Gemini API key secret on the server.  
The browser only talks to your own `/api/gemini` endpoint.

## Deploy (Cloudflare Pages – free)

### 1. Get a free Gemini key
https://aistudio.google.com/apikey  
(no credit card required)

### 2. Push this folder to GitHub

### 3. Create a Pages project
- Cloudflare Dashboard → **Workers & Pages** → **Create** → Connect your repo
- Build command: leave empty
- Build output directory: `/` (the folder that contains `index.html`)
- Deploy

### 4. Add the secret (important)
After the first deploy:
1. Open the project → **Settings** → **Environment variables**
2. Add variable:
   - **Variable name:** `GEMINI_API_KEY`
   - **Value:** your key from step 1
   - Type: **Secret** / Encrypt
3. Save → **Retry deployment** (or push a small commit)

That’s it. AI tools now work for every visitor.

## Local testing

```bash
npx serve .
# or open index.html
```

Note: `/api/gemini` only works after deploying to Cloudflare Pages.  
Locally the AI tools will show a friendly “deploy to Cloudflare” message.

## Tools

| Tool | AI | Notes |
|------|----|-------|
| Background Remover | – | UI + instructions for on-device model |
| PDF Summarizer | ✅ | Extract local → Gemini summary |
| Essay & Rewrite | ✅ | Rewrite, expand, formal, grammar… |
| Study & Quiz | ✅ | Real Q&A cards from notes |
| Code Explainer | ✅ | Clear explanations + tips |
| CV / Resume Builder | – | Client-side PDF (jsPDF) |
| Email Generator | ✅ | Professional emails |
| Translator | ✅ | Many languages |
| Social Captions | ✅ | Instagram, LinkedIn, X… |
| Image Prompt Gen | ✅ | Strong prompts for any image model |
| Calculators | – | Pure JS |
| PDF → Text | – | PDF.js |
| Text → Speech | – | Web Speech API |
| Speech → Text | – | Web Speech API |

## Privacy

- Gemini key lives only in Cloudflare (secret)
- History & drafts stay in the user’s browser (localStorage)
- PDFs and images are processed locally where possible

## GitHub Pages deploy

If you use **GitHub Pages** instead of (or as well as) Cloudflare:

1. Push the **contents** of the `smarttools-ai` folder to the root of your repo (or to the `docs/` folder).
2. Repo → **Settings → Pages**:
   - Source: Deploy from a branch
   - Branch: `main` (or `master`)
   - Folder: `/ (root)` — or `/docs` if you put files there
3. Save. Site will be at `https://YOUR_USERNAME.github.io/REPO_NAME/`

**Important:**
- `index.html` must be at the published root (not inside another folder).
- Filenames are case-sensitive on GitHub Pages.
- CSS path is `css/style.css` and tools are under `tools/`.

If CSS is missing, check the browser Network tab — the request for `style.css` should return 200, not 404.
