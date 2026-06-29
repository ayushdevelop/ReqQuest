# ReqQuest ⚔️

> Turn natural language into API requests — right from your terminal.

```bash
reqquest "get all posts from jsonplaceholder"
reqquest "POST to https://api.example.com/users with body name=John email=john@example.com"
reqquest "DELETE https://api.example.com/posts/42 with bearer token abc123"
```

ReqQuest uses an LLM (Groq, Gemini, or OpenAI) to parse your prompt into a structured HTTP request, shows you exactly what it's going to send, asks for confirmation, then executes it.

---

## Install

```bash
npm install -g reqquest-cli
```

Requires **Node.js 18+**.

---

## Setup

ReqQuest needs one API key to work. Pick whichever you have:

| Provider | Key | Get one |
|----------|-----|---------|
| Groq | `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) — free, fast ✓ |
| Gemini | `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) — free tier |
| OpenAI | `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) — paid |

**Option 1 — config file (recommended, no shell edits needed):**

```bash
mkdir -p ~/.reqquest
echo 'GROQ_API_KEY=your_key_here' >> ~/.reqquest/.env
```

**Option 2 — shell export:**

```bash
export GROQ_API_KEY=your_key_here
```

---

## Usage

### Run a quest

```bash
reqquest "get users from jsonplaceholder"
reqquest "POST https://httpbin.org/post with body message=hello"
reqquest "fetch https://api.github.com/users/torvalds"
```

ReqQuest shows the generated request and asks for confirmation before executing.

### Choose a companion

Pick your terminal spirit animal:

```bash
reqquest "get posts" --companion wizard    # Merlin (default)
reqquest "get posts" --companion rogue     # Shadow
reqquest "get posts" --companion samurai   # Kensei
reqquest "get posts" --companion robot     # Unit-7
```

### View history

```bash
reqquest history               # list recent requests
reqquest history --limit 50    # show more
reqquest history clear         # wipe history
```

### Replay a past request

```bash
reqquest history               # find an ID
reqquest replay mqxv50s        # prefix match — no need for full ID
reqquest replay mqxv50s --companion rogue   # override companion
```

---

## How it works

1. Your prompt is sent to the LLM with a strict JSON schema
2. The LLM returns a structured `RequestConfig` (method, url, headers, query, body)
3. ReqQuest validates it with [Zod](https://zod.dev)
4. You see the full request and confirm before anything is sent
5. The request is executed with [axios](https://axios-http.com)
6. The result (and every request) is saved to `~/.reqquest/history.json`

---

## Examples

```bash
# Simple GET
reqquest "fetch current user from https://api.github.com/user with bearer token ghp_xxx"

# POST with JSON body
reqquest "POST to https://jsonplaceholder.typicode.com/posts title=Hello body=World userId=1"

# Query parameters
reqquest "GET https://api.example.com/search with query q=nodejs limit=10"

# DELETE
reqquest "delete post 5 from jsonplaceholder"
```

---

## History file

All executed requests are stored in `~/.reqquest/history.json`. Cancelled requests are only saved if you opt in when prompted. History is capped at 100 entries (newest first).

---

## License

MIT
