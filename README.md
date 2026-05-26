# OLLM — AI Teaching Assistant (MVP)

Upload a pedagogical document (PDF, DOCX, or TXT) and chat with an AI assistant that uses the document as context to help create lesson plans, activities, rubrics, and classroom ideas.

**Session-only:** no authentication, database, or persistent storage. Uploaded text lives in browser memory for the current session.

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

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Generative AI API key |
| `GEMINI_MODEL` | No | Default: `gemini-2.0-flash` |

## Project structure

```
src/
  app/
    api/chat/     # Streaming Gemini responses
    api/parse/    # PDF/DOCX/TXT text extraction
    page.tsx
    layout.tsx
  components/
    UploadBox.tsx
    ChatWindow.tsx
    MessageBubble.tsx
    QuickActions.tsx
    Sidebar.tsx
    ui/
  lib/
    parsers.ts    # parsePdf, parseDocx, parseTxt
    buildPrompt.ts
    gemini.ts
  types/
```

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Add `GEMINI_API_KEY` in **Project → Settings → Environment Variables**.
4. Deploy (Node 20+ is used by default on Vercel).

API routes use the Node.js runtime for `pdf-parse` and `mammoth`. Document parsing runs on the server per upload; chat sends document text with each request (no server-side session store).

## MVP limitations (by design)

- No user accounts or saved chats
- No vector DB / embeddings / RAG
- Document context is truncated (~28k characters) in the prompt
- Files are not written to disk

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
