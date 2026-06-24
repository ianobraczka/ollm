# OLM's Teaching Assistant (MVP)

Chat with an AI assistant grounded in **built-in curriculum frameworks** and optional **session uploads** (PDF, DOCX, or TXT). Use it to draft lesson plans, activities, rubrics, and classroom ideas.

**Assessment Assistant** ([`/assessment-assistant`](http://localhost:3030/assessment-assistant)) connects to **Schoology** via the REST API to browse courses, assignments, submissions, and rubrics.

**Built-in sources** (bundled with the app):

- Brazilian **BNCC**
- **Massachusetts Curriculum Framework**

**Session-only uploads:** no authentication, database, or persistent user storage. Uploaded text lives in browser memory for the current session only.

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4 + shadcn-style UI
- Google Gemini API (`@google/generative-ai`)
- `pdf-parse` · `mammoth` · plain TXT parsing

## Requirements

- Node.js **≥ 20.19** (see `package.json` engines)
- A [Gemini API key](https://aistudio.google.com/apikey)

## Setup

```bash
npm install
cp .env.example .env.local
# Edit .env.local and set GEMINI_API_KEY
npm run dev
```

Open [http://localhost:3030](http://localhost:3030) (OLM's Teaching Assistant uses port **3030** by default).

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Generative AI API key |
| `GEMINI_MODEL` | No | Override the default model chain (see `src/lib/gemini.ts`) |
| `SCHOOLOGY_BASE_URL` | For Assessment Assistant | Schoology REST API base (default `https://api.schoology.com/v1`) |
| `SCHOOLOGY_CONSUMER_KEY` | For Assessment Assistant | Two-legged API consumer key |
| `SCHOOLOGY_CONSUMER_SECRET` | For Assessment Assistant | Two-legged API consumer secret |
| `SCHOOLOGY_DOMAIN` | No | Schoology web UI host for “Open in Schoology” links only (not API calls) |
| `SCHOOLOGY_DEBUG` | No | Set to `1` to enable debug routes and `data/schoology-debug.log` |

## Built-in reference documents

Built-in frameworks ship as **pre-extracted `.txt` files** under `/data/documents`. They are read on the server when selected — PDFs are **not** parsed on every request.

### Add or update a built-in document

1. Create or edit a `.txt` file under `data/documents/`, for example:
   - `data/documents/bncc.txt`
   - `data/documents/massachusetts-framework.txt`
2. Register it in `src/lib/builtInDocuments.ts` with:
   - `id` — stable key sent from the client (e.g. `bncc`)
   - `title` — label shown in the UI and in prompts
   - `description` — short helper text in the document selector
   - `filePath` — path relative to project root (e.g. `data/documents/bncc.txt`)
3. Restart the dev server (or redeploy) so the new file is picked up.

If a registered file is missing at runtime, `/api/chat` returns a clear error explaining which path to add.

### Convert PDFs to TXT

Use any reliable text-extraction workflow before committing files:

```bash
# Example with pdftotext (poppler-utils)
pdftotext -layout source.pdf data/documents/bncc.txt

# Or Python (pdfminer.six)
python -m pdfminer.high_level source.pdf -o data/documents/bncc.txt
```

Review the output for encoding issues, headers/footers, and table formatting. The MVP sends full selected text to Gemini (truncated per document at 100k characters).

### Deployment note

Built-in `.txt` files are **bundled with the deployment** (included in the repo / Vercel project). Uploaded documents remain **temporary** in the browser and are never written to disk on the server.

On Vercel, `next.config.ts` uses `outputFileTracingIncludes` so `data/documents/**` is copied into the `/api/chat` serverless bundle. Without this, `readFile` at runtime fails with “Built-in document file is missing” even when the files exist in Git.

## Project structure

```
data/
  documents/          # Pre-extracted built-in .txt files
src/
  app/
    api/chat/         # Streaming Gemini; loads selected built-ins + optional upload
    api/parse/        # PDF/DOCX/TXT extraction for session uploads
    api/assessment-assistant/  # Schoology REST API (session, courses, materials, retrieve, file)
    assessment-assistant/      # Assessment Assistant UI
  components/
    AssessmentAssistantPage.tsx
    AssessmentAssistantSidebar.tsx
    DocumentSelector.tsx
    UploadBox.tsx
    ChatWindow.tsx
    Sidebar.tsx
    ...
  lib/
    schoology/            # OAuth 1.0 signing + REST API client (no Playwright / scraping)
    builtInDocuments.ts   # Registry (id, title, description, filePath)
    loadBuiltInDocument.ts
    documentContext.ts    # buildDocumentContext()
    buildPrompt.ts
    gemini.ts
```

## How chat context works (not RAG)

This MVP does **not** use embeddings, chunking, or a vector database. For each message:

1. The client sends `selectedBuiltInDocs`, optional `uploadedDocumentText`, and `useUploadedDocument`.
2. The server loads only the selected built-in `.txt` files from disk.
3. `buildDocumentContext()` combines sources as:

   ```
   [SOURCE: BNCC]
   ...

   [SOURCE: Massachusetts Curriculum Framework]
   ...

   [SOURCE: Uploaded document]
   ...
   ```

4. Gemini receives the structured context plus conversation history.

Later versions may add chunking, semantic search, and source-level citations.

## Document size limits

As an MVP performance safeguard, each selected reference document is **truncated to 100,000 characters** before being sent to Gemini.

- Built-in `.txt` documents and the optional uploaded document are both affected.
- The user’s chat messages are **not** truncated by this logic.

Later versions should replace truncation with chunking, search, embeddings, or a full RAG pipeline.

## Deploy to Vercel

1. Push the repo to GitHub (include `data/documents/*.txt`).
2. Import the project in [Vercel](https://vercel.com).
3. Add `GEMINI_API_KEY` in **Project → Settings → Environment Variables**.
4. For Assessment Assistant, add `SCHOOLOGY_CONSUMER_KEY`, `SCHOOLOGY_CONSUMER_SECRET`, and optionally `SCHOOLOGY_BASE_URL` / `SCHOOLOGY_DOMAIN`.
5. Deploy (Node 20+).

## MVP limitations (by design)

- No user accounts or saved chats
- No vector DB / embeddings / RAG
- Up to **5 session uploads**; each source truncated at **100k characters** for performance
- Uploads are not persisted
- Gemini **503** / **529** triggers fallback to the next model in the chain

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server on port 3030 |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run verify:schoology` | Verify Schoology API credentials (`app-user-info` flow) |

## Assessment Assistant (Schoology)

Local feature at [`/assessment-assistant`](http://localhost:3030/assessment-assistant). Lists your Schoology courses, assignments, submissions, and rubrics via the **Schoology REST API** only — **no Playwright, no browser automation, and no HTML page scraping**.

The browser calls same-origin `/api/assessment-assistant/*` routes. The server signs outbound requests to `https://api.schoology.com/v1` with **two-legged OAuth 1.0** (`SCHOOLOGY_CONSUMER_KEY` + `SCHOOLOGY_CONSUMER_SECRET`).

### Architecture

```
Browser UI → /api/assessment-assistant/* → lib/schoology/* → signed fetch → api.schoology.com/v1
```

- **Auth / profile:** `GET /app-user-info` → `GET /users/{uid}` (not `/users/me`)
- **Courses:** `GET /users/{uid}/sections`
- **Materials:** `GET /sections/{id}/assignments`, grading categories, etc.
- **Assignment detail:** `GET /sections/{id}/assignments/{id}`, submissions, grades, rubrics
- **Files:** API `download_path` URLs proxied through `/api/assessment-assistant/file`

`https://app.schoology.com/...` URLs are built only for display (“Open in Schoology” links), never fetched for data extraction.

No browser OAuth redirect, no callback URL, and no ngrok required for local development.

### Setup (local)

1. Obtain **two-legged** Schoology API keys at **Integration → API** (`/api` → Request API Keys).  
   Platform App keys (App Publisher → API Info) are **three-legged only** and will return  
   `This application is not authorized to make 2-legged OAuth requests.`
2. Copy `.env.example` to `.env.local` and set:

```bash
SCHOOLOGY_BASE_URL=https://api.schoology.com/v1
SCHOOLOGY_CONSUMER_KEY=your_consumer_key
SCHOOLOGY_CONSUMER_SECRET=your_consumer_secret
# Optional — web UI links only (not API):
# SCHOOLOGY_DOMAIN=https://app.schoology.com
```

3. Restart `npm run dev` after changing `.env.local`.
4. Open `/assessment-assistant` — connection and courses load automatically when credentials are valid.

**Log out** in the UI disconnects locally (clears course list in the browser). API credentials remain in `.env.local` until you remove them or click refresh to reconnect.

### Setup (production)

Add the same `SCHOOLOGY_*` variables in your host’s environment (e.g. Vercel **Project → Settings → Environment Variables**). Do not commit `.env.local`.

### Verify credentials

```bash
npm run verify:schoology
```

Or in development:

```bash
curl http://localhost:3030/api/assessment-assistant/verify
```

Full diagnostics: `GET /api/assessment-assistant/debug` (development or `SCHOOLOGY_DEBUG=1`). Writes `data/schoology-debug-report.json`.

### API routes

| Route | Purpose |
|-------|---------|
| `GET /api/assessment-assistant/session` | Connection status + user profile (`picture_url` when available) |
| `GET /api/assessment-assistant/courses` | Teacher sections |
| `GET /api/assessment-assistant/materials?sectionId=` | Assignments grouped by grading period |
| `POST /api/assessment-assistant/retrieve` | Assignment/test detail, submissions, rubric |
| `GET /api/assessment-assistant/file` | Proxied download for submission attachments |
| `GET /api/assessment-assistant/verify` | Dev credential check |
| `GET /api/assessment-assistant/debug` | Dev diagnostics |

### Notes

- Keys must belong to a user with API access and appropriate teacher permissions.
- Profile pictures come from the `picture_url` field on `GET /users/{id}`.
- Assessment display URLs are built in `src/lib/schoology/schoologyUrls.ts`.
- The network tab should show only same-origin `/api/assessment-assistant/*` requests, never direct calls to `api.schoology.com` from the browser.
