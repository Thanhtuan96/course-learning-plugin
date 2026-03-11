# Professor Web UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local web app at `localhost:3000` with a split-pane layout (lecture panel + Professor chat) powered by Claude API, reading/writing the same course files as the CLI.

**Architecture:** Node.js + Express backend serves React + Vite frontend. Chat messages POST to `/api/chat` which calls Claude API with streaming (SSE). WebSocket broadcasts file changes so the lecture panel refreshes automatically when `professor:next` runs. Course files (`courses/{slug}/*.md`) are read/written from the directory where the server starts.

**Tech Stack:** Node.js 18+, Express 4, React 18, Vite 5, @anthropic-ai/sdk, marked (markdown), shiki (syntax highlighting), ws (WebSocket)

---

### Task 1: Web directory scaffold

**Files:**
- Create: `web/package.json`
- Create: `web/.env.example`
- Create: `web/.gitignore`

**Step 1: Create `web/package.json`**

```json
{
  "name": "professor-web",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "node server.js",
    "test": "node --test tests/"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "marked": "^12.0.0",
    "ws": "^8.16.0"
  },
  "devDependencies": {
    "vite": "^5.2.0",
    "@vitejs/plugin-react": "^4.2.1"
  }
}
```

**Step 2: Create `web/.env.example`**

```
ANTHROPIC_API_KEY=your-key-here
PORT=3000
COURSES_DIR=../courses
```

**Step 3: Create `web/.gitignore`**

```
node_modules/
.env
client/dist/
```

**Step 4: Install dependencies**

```bash
cd web && npm install
```

Expected: `node_modules/` created, no errors.

**Step 5: Commit**

```bash
git add web/package.json web/.env.example web/.gitignore
git commit -m "feat(web): scaffold web directory with dependencies"
```

---

### Task 2: Course files API

**Files:**
- Create: `web/routes/courses.js`
- Create: `web/tests/courses.test.js`

**Step 1: Write the failing test**

Create `web/tests/courses.test.js`:

```js
import { strict as assert } from 'assert';
import { test } from 'node:test';
import { listCourses, readCourseFile } from '../routes/courses.js';
import { mkdirSync, writeFileSync, rmSync } from 'fs';

const FIXTURE_DIR = '/tmp/professor-test-courses';

test('listCourses returns empty array when dir missing', async () => {
  const result = await listCourses('/tmp/nonexistent-99999');
  assert.deepEqual(result, []);
});

test('listCourses returns course slugs', async () => {
  mkdirSync(`${FIXTURE_DIR}/react-hooks`, { recursive: true });
  writeFileSync(`${FIXTURE_DIR}/react-hooks/COURSE.md`, '# Course: React Hooks\n**Last active**: 2026-03-01');

  const result = await listCourses(FIXTURE_DIR);
  assert.ok(result.some(c => c.slug === 'react-hooks'));

  rmSync(FIXTURE_DIR, { recursive: true });
});

test('readCourseFile returns null when file missing', async () => {
  const result = await readCourseFile('/tmp/nonexistent', 'COURSE.md');
  assert.equal(result, null);
});
```

**Step 2: Run test to verify it fails**

```bash
cd web && node --test tests/courses.test.js
```

Expected: FAIL — `Cannot find module '../routes/courses.js'`

**Step 3: Implement `web/routes/courses.js`**

```js
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

export async function listCourses(coursesDir) {
  if (!existsSync(coursesDir)) return [];

  return readdirSync(coursesDir)
    .filter(entry => statSync(join(coursesDir, entry)).isDirectory())
    .map(slug => {
      const courseFile = join(coursesDir, slug, 'COURSE.md');
      const content = existsSync(courseFile) ? readFileSync(courseFile, 'utf-8') : '';
      const lastActive = (content.match(/\*\*Last active\*\*: (.+)/) || [])[1] || 'Unknown';
      const topicName = (content.match(/^# .* Course: (.+)/m) || content.match(/^# 📚 Course: (.+)/m) || [])[1] || slug;
      return { slug, name: topicName, lastActive };
    });
}

export async function readCourseFile(coursesDir, filename) {
  const filepath = join(coursesDir, filename);
  if (!existsSync(filepath)) return null;
  return readFileSync(filepath, 'utf-8');
}

export function buildCoursesRouter(coursesDir) {
  import('express').then(() => {}); // ensure express is loaded
  const { Router } = await import('express');
  const router = Router();

  router.get('/', async (req, res) => {
    const courses = await listCourses(coursesDir);
    res.json(courses);
  });

  router.get('/:slug/:file', async (req, res) => {
    const { slug, file } = req.params;
    const allowed = ['COURSE.md', 'LECTURE.md', 'NOTES.md', 'CAPSTONE.md'];
    if (!allowed.includes(file)) return res.status(400).json({ error: 'File not allowed' });

    const content = await readCourseFile(join(coursesDir, slug), file);
    if (!content) return res.status(404).json({ error: 'Not found' });
    res.json({ content });
  });

  return router;
}
```

Wait — the router function uses top-level await inside a non-async function. Let me fix:

```js
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { Router } from 'express';

export async function listCourses(coursesDir) {
  if (!existsSync(coursesDir)) return [];

  return readdirSync(coursesDir)
    .filter(entry => statSync(join(coursesDir, entry)).isDirectory())
    .map(slug => {
      const courseFile = join(coursesDir, slug, 'COURSE.md');
      const content = existsSync(courseFile) ? readFileSync(courseFile, 'utf-8') : '';
      const lastActive = (content.match(/\*\*Last active\*\*: (.+)/) || [])[1] || 'Unknown';
      const topicName = (content.match(/# 📚 Course: (.+)/) || content.match(/# Course: (.+)/) || [])[1] || slug;
      return { slug, name: topicName.trim(), lastActive: lastActive.trim() };
    });
}

export function readCourseFile(dir, filename) {
  const filepath = join(dir, filename);
  if (!existsSync(filepath)) return null;
  return readFileSync(filepath, 'utf-8');
}

export function buildCoursesRouter(coursesDir) {
  const router = Router();

  router.get('/', async (req, res) => {
    const courses = await listCourses(coursesDir);
    res.json(courses);
  });

  router.get('/:slug/:file', (req, res) => {
    const { slug, file } = req.params;
    const allowed = ['COURSE.md', 'LECTURE.md', 'NOTES.md', 'CAPSTONE.md'];
    if (!allowed.includes(file)) return res.status(400).json({ error: 'File not allowed' });

    const content = readCourseFile(join(coursesDir, slug), file);
    if (!content) return res.status(404).json({ error: 'Not found' });
    res.json({ content });
  });

  return router;
}
```

**Step 4: Run test to verify it passes**

```bash
cd web && node --test tests/courses.test.js
```

Expected: 3 tests PASS.

**Step 5: Commit**

```bash
git add web/routes/courses.js web/tests/courses.test.js
git commit -m "feat(web): add courses API route with file reader"
```

---

### Task 3: Professor context builder

**Files:**
- Create: `web/professor.js`
- Create: `web/tests/professor.test.js`

**Step 1: Write the failing test**

Create `web/tests/professor.test.js`:

```js
import { strict as assert } from 'assert';
import { test } from 'node:test';
import { buildSystemPrompt, buildCourseContext } from '../professor.js';

test('buildSystemPrompt returns string with professor agent content', async () => {
  const prompt = await buildSystemPrompt('/tmp/nonexistent-agent.md');
  assert.equal(typeof prompt, 'string');
  assert.ok(prompt.length > 0);
});

test('buildCourseContext returns empty string when no courses', async () => {
  const ctx = buildCourseContext(null, null);
  assert.equal(ctx, '');
});

test('buildCourseContext includes COURSE.md content when provided', () => {
  const ctx = buildCourseContext('# Course: React', '# Section 1');
  assert.ok(ctx.includes('# Course: React'));
  assert.ok(ctx.includes('# Section 1'));
});
```

**Step 2: Run test to verify it fails**

```bash
cd web && node --test tests/professor.test.js
```

Expected: FAIL — `Cannot find module '../professor.js'`

**Step 3: Implement `web/professor.js`**

```js
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const FALLBACK_SYSTEM_PROMPT = `You are Professor Claude — a Socratic technology mentor.
Your job is to help the user LEARN, not to do their work for them.
Never write working code for the user. Ask questions instead of giving answers.
Guide them to discover solutions themselves through Socratic questioning.`;

export async function buildSystemPrompt(agentPath) {
  const resolvedPath = agentPath || join(__dirname, '..', 'agents', 'professor.md');

  if (!existsSync(resolvedPath)) {
    return FALLBACK_SYSTEM_PROMPT;
  }

  const content = readFileSync(resolvedPath, 'utf-8');
  // Strip YAML frontmatter if present
  return content.replace(/^---[\s\S]+?---\n/, '').trim();
}

export function buildCourseContext(courseContent, lectureContent) {
  if (!courseContent && !lectureContent) return '';

  const parts = [];
  if (courseContent) {
    parts.push('## Current Course State (COURSE.md)\n' + courseContent);
  }
  if (lectureContent) {
    parts.push('## Current Lecture (LECTURE.md)\n' + lectureContent);
  }

  return '\n\n---\n\n' + parts.join('\n\n');
}
```

**Step 4: Run test to verify it passes**

```bash
cd web && node --test tests/professor.test.js
```

Expected: 3 tests PASS.

**Step 5: Commit**

```bash
git add web/professor.js web/tests/professor.test.js
git commit -m "feat(web): add professor context builder with system prompt loader"
```

---

### Task 4: Chat API with Claude streaming

**Files:**
- Create: `web/routes/chat.js`

**Step 1: Create `web/routes/chat.js`**

```js
import Anthropic from '@anthropic-ai/sdk';
import { Router } from 'express';
import { readCourseFile } from './courses.js';
import { buildSystemPrompt, buildCourseContext } from '../professor.js';
import { join } from 'path';
import { existsSync } from 'fs';

export function buildChatRouter(coursesDir, agentPath) {
  const router = Router();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  router.post('/', async (req, res) => {
    const { messages, courseSlug } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    // Build context from current course files
    let courseContent = null;
    let lectureContent = null;
    if (courseSlug) {
      const courseDir = join(coursesDir, courseSlug);
      courseContent = readCourseFile(courseDir, 'COURSE.md');
      lectureContent = readCourseFile(courseDir, 'LECTURE.md');
    }

    const systemPrompt = await buildSystemPrompt(agentPath);
    const courseContext = buildCourseContext(courseContent, lectureContent);
    const fullSystem = systemPrompt + courseContext;

    // Set up SSE for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const stream = client.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: fullSystem,
        messages,
      });

      stream.on('text', (text) => {
        res.write(`data: ${JSON.stringify({ type: 'text', text })}\n\n`);
      });

      stream.on('message', () => {
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
      });

      stream.on('error', (err) => {
        res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
        res.end();
      });
    } catch (err) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
      res.end();
    }
  });

  return router;
}
```

**Step 2: Manual verification note**

This route requires a real Anthropic API key to test end-to-end. Automated unit test is skipped here. It will be tested in Task 13 (end-to-end).

**Step 3: Commit**

```bash
git add web/routes/chat.js
git commit -m "feat(web): add streaming chat API route using Claude SSE"
```

---

### Task 5: Express server with WebSocket

**Files:**
- Create: `web/server.js`

**Step 1: Create `web/server.js`**

```js
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import 'dotenv/config';

import { buildCoursesRouter } from './routes/courses.js';
import { buildChatRouter } from './routes/chat.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3000;
const COURSES_DIR = process.env.COURSES_DIR
  ? join(process.cwd(), process.env.COURSES_DIR)
  : join(process.cwd(), 'courses');
const AGENT_PATH = join(__dirname, '..', 'agents', 'professor.md');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// Serve React app in production (after build)
const distDir = join(__dirname, 'client', 'dist');
if (existsSync(distDir)) {
  app.use(express.static(distDir));
}

// API routes
app.use('/api/courses', buildCoursesRouter(COURSES_DIR));
app.use('/api/chat', buildChatRouter(COURSES_DIR, AGENT_PATH));

// File change notification endpoint (called after professor writes files)
app.post('/api/notify', (req, res) => {
  const { event, courseSlug } = req.body;
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(JSON.stringify({ event, courseSlug }));
    }
  });
  res.json({ ok: true });
});

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, coursesDir: COURSES_DIR }));

// Fallback for SPA routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  if (existsSync(distDir)) {
    res.sendFile(join(distDir, 'index.html'));
  } else {
    res.send('<p>Run <code>cd web/client && npm run build</code> first, or use dev mode.</p>');
  }
});

server.listen(PORT, () => {
  console.log(`\n📚 Professor Web UI`);
  console.log(`   Local:  http://localhost:${PORT}`);
  console.log(`   Courses: ${COURSES_DIR}`);
  console.log(`\nCtrl+C to stop\n`);
});
```

**Step 2: Add dotenv dependency and install**

In `web/package.json`, add to dependencies:
```json
"dotenv": "^16.4.5"
```

Then:
```bash
cd web && npm install
```

**Step 3: Verify server starts**

```bash
cd web && ANTHROPIC_API_KEY=test node server.js
```

Expected: Server starts, prints URL, no crash.

**Step 4: Commit**

```bash
git add web/server.js web/package.json web/package-lock.json
git commit -m "feat(web): add Express server with WebSocket support"
```

---

### Task 6: React + Vite client scaffold

**Files:**
- Create: `web/client/package.json`
- Create: `web/client/vite.config.js`
- Create: `web/client/index.html`
- Create: `web/client/src/main.jsx`
- Create: `web/client/src/App.jsx`
- Create: `web/client/src/App.css`

**Step 1: Create `web/client/package.json`**

```json
{
  "name": "professor-client",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "marked": "^12.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.2.0"
  }
}
```

**Step 2: Create `web/client/vite.config.js`**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
});
```

**Step 3: Create `web/client/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Professor - Socratic Learning</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

**Step 4: Create `web/client/src/main.jsx`**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 5: Create `web/client/src/App.jsx` (skeleton)**

```jsx
import { useState, useEffect } from 'react';

export default function App() {
  const [courses, setCourses] = useState([]);
  const [activeCourse, setActiveCourse] = useState(null);

  useEffect(() => {
    fetch('/api/courses')
      .then(r => r.json())
      .then(data => {
        setCourses(data);
        if (data.length === 1) setActiveCourse(data[0]);
      });
  }, []);

  return (
    <div className="app">
      <div className="top-bar">
        <span className="logo">Professor</span>
        <select onChange={e => setActiveCourse(courses.find(c => c.slug === e.target.value))}>
          <option value="">Select course...</option>
          {courses.map(c => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="main-pane">
        <div className="lecture-panel">
          {activeCourse ? <p>Loading lecture for {activeCourse.name}...</p> : <p>Select a course to begin.</p>}
        </div>
        <div className="chat-panel">
          <p>Chat will appear here.</p>
        </div>
      </div>
    </div>
  );
}
```

**Step 6: Create `web/client/src/App.css`**

```css
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0f1117;
  color: #e2e8f0;
  height: 100vh;
  overflow: hidden;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.top-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: #1a1d27;
  border-bottom: 1px solid #2d3148;
  flex-shrink: 0;
}

.logo {
  font-weight: 700;
  font-size: 18px;
  color: #7c8cf8;
}

.top-bar select {
  background: #252836;
  color: #e2e8f0;
  border: 1px solid #3d4263;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 14px;
}

.main-pane {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.lecture-panel {
  width: 50%;
  padding: 24px;
  overflow-y: auto;
  border-right: 1px solid #2d3148;
}

.chat-panel {
  width: 50%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
```

**Step 7: Install client dependencies and verify**

```bash
cd web/client && npm install && npm run dev
```

Expected: Vite dev server starts on port 5173, React skeleton renders in browser.

**Step 8: Commit**

```bash
git add web/client/
git commit -m "feat(web): scaffold React+Vite client with split-pane layout"
```

---

### Task 7: LecturePanel component

**Files:**
- Create: `web/client/src/components/LecturePanel.jsx`
- Create: `web/client/src/components/LecturePanel.css`
- Modify: `web/client/src/App.jsx`

**Step 1: Create `web/client/src/components/LecturePanel.jsx`**

```jsx
import { useState, useEffect } from 'react';
import { marked } from 'marked';
import './LecturePanel.css';

marked.setOptions({ breaks: true, gfm: true });

export default function LecturePanel({ courseSlug }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!courseSlug) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseSlug}/LECTURE.md`);
      if (res.ok) {
        const { content } = await res.json();
        setContent(content);
      } else {
        setContent('');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [courseSlug]);

  // Expose reload for WebSocket events
  useEffect(() => {
    window.__refreshLecture = load;
    return () => { delete window.__refreshLecture; };
  }, [courseSlug]);

  if (!courseSlug) {
    return (
      <div className="lecture-panel empty">
        <p>Select a course to see the current lecture.</p>
      </div>
    );
  }

  if (loading) return <div className="lecture-panel loading">Loading...</div>;

  if (!content) {
    return (
      <div className="lecture-panel empty">
        <p>No lecture loaded yet.</p>
        <p>Type <code>professor:next</code> in chat to start your first section.</p>
      </div>
    );
  }

  return (
    <div
      className="lecture-panel"
      dangerouslySetInnerHTML={{ __html: marked(content) }}
    />
  );
}
```

**Step 2: Create `web/client/src/components/LecturePanel.css`**

```css
.lecture-panel {
  padding: 24px;
  overflow-y: auto;
  height: 100%;
  line-height: 1.7;
}

.lecture-panel.empty,
.lecture-panel.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #64748b;
  gap: 8px;
}

.lecture-panel h1, .lecture-panel h2, .lecture-panel h3 {
  color: #a5b4fc;
  margin: 20px 0 10px;
}

.lecture-panel h1 { font-size: 1.5rem; }
.lecture-panel h2 { font-size: 1.2rem; }

.lecture-panel p { margin: 10px 0; }

.lecture-panel code {
  background: #1e2130;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.875em;
  color: #7dd3fc;
}

.lecture-panel pre {
  background: #1a1d27;
  border: 1px solid #2d3148;
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
  margin: 12px 0;
}

.lecture-panel pre code {
  background: none;
  padding: 0;
  color: #e2e8f0;
}

.lecture-panel blockquote {
  border-left: 3px solid #7c8cf8;
  padding-left: 16px;
  color: #94a3b8;
  margin: 12px 0;
}

.lecture-panel ul, .lecture-panel ol {
  padding-left: 24px;
  margin: 8px 0;
}

.lecture-panel input[type="checkbox"] {
  margin-right: 8px;
}

.lecture-panel a { color: #7c8cf8; }

.lecture-panel hr {
  border: none;
  border-top: 1px solid #2d3148;
  margin: 20px 0;
}
```

**Step 3: Update `web/client/src/App.jsx` to use LecturePanel**

Replace the lecture-panel div:

```jsx
import { useState, useEffect } from 'react';
import LecturePanel from './components/LecturePanel.jsx';

export default function App() {
  const [courses, setCourses] = useState([]);
  const [activeCourse, setActiveCourse] = useState(null);

  useEffect(() => {
    fetch('/api/courses')
      .then(r => r.json())
      .then(data => {
        setCourses(data);
        if (data.length === 1) setActiveCourse(data[0]);
      });
  }, []);

  return (
    <div className="app">
      <div className="top-bar">
        <span className="logo">📚 Professor</span>
        <select onChange={e => setActiveCourse(courses.find(c => c.slug === e.target.value) || null)}>
          <option value="">Select course...</option>
          {courses.map(c => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="main-pane">
        <LecturePanel courseSlug={activeCourse?.slug} />
        <div className="chat-panel">
          <p style={{ padding: 20, color: '#64748b' }}>Chat coming in next task...</p>
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Manual verification**

Start server and client:
```bash
# Terminal 1
cd web && ANTHROPIC_API_KEY=test node server.js

# Terminal 2
cd web/client && npm run dev
```

Open `http://localhost:5173`. If a `courses/` dir exists in the project root, courses appear in dropdown. Selecting one shows LECTURE.md content (or empty state).

**Step 5: Commit**

```bash
git add web/client/src/components/LecturePanel.jsx web/client/src/components/LecturePanel.css web/client/src/App.jsx
git commit -m "feat(web): add LecturePanel with markdown rendering"
```

---

### Task 8: ChatPanel with streaming

**Files:**
- Create: `web/client/src/components/ChatPanel.jsx`
- Create: `web/client/src/components/ChatPanel.css`
- Modify: `web/client/src/App.jsx`

**Step 1: Create `web/client/src/components/ChatPanel.jsx`**

```jsx
import { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import './ChatPanel.css';

const COMMAND_PILLS = {
  idle: ['professor:new-topic'],
  lecture: ['professor:discuss', 'professor:hint', 'professor:review', 'professor:quiz'],
  exercise: ['professor:hint', 'professor:review', 'professor:stuck'],
  review: ['professor:done', 'professor:hint'],
};

export default function ChatPanel({ courseSlug }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: courseSlug
      ? 'Course loaded. How can I help you learn today?'
      : 'Welcome to Professor! Type `professor:new-topic` to start your first course.' }
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [phase, setPhase] = useState('idle');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text) {
    if (!text.trim() || streaming) return;

    const userMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setStreaming(true);

    // Add empty assistant message for streaming
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          courseSlug,
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));
          if (data.type === 'text') {
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: updated[updated.length - 1].content + data.text,
              };
              return updated;
            });
          } else if (data.type === 'done') {
            // If professor:next was called, trigger lecture refresh
            if (text.includes('professor:next')) {
              window.__refreshLecture?.();
              setPhase('lecture');
            } else if (text.includes('professor:review')) {
              setPhase('review');
            }
          }
        }
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: `Error: ${err.message}` };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const pills = COMMAND_PILLS[phase] || COMMAND_PILLS.idle;

  return (
    <div className="chat-panel">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div
              className="message-content"
              dangerouslySetInnerHTML={{ __html: marked(msg.content || '▌') }}
            />
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="command-pills">
        {pills.map(cmd => (
          <button key={cmd} onClick={() => send(cmd)} disabled={streaming}>
            {cmd}
          </button>
        ))}
      </div>

      <div className="input-row">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message or command... (Enter to send)"
          disabled={streaming}
          rows={2}
        />
        <button onClick={() => send(input)} disabled={streaming || !input.trim()}>
          {streaming ? '...' : '▶'}
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Create `web/client/src/components/ChatPanel.css`**

```css
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  max-width: 90%;
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.6;
  font-size: 14px;
}

.message.user {
  background: #2a2f4a;
  align-self: flex-end;
  border-bottom-right-radius: 4px;
  color: #e2e8f0;
}

.message.assistant {
  background: #1a1d27;
  align-self: flex-start;
  border-bottom-left-radius: 4px;
  border: 1px solid #2d3148;
  color: #cbd5e1;
}

.message-content p { margin: 6px 0; }
.message-content p:first-child { margin-top: 0; }
.message-content p:last-child { margin-bottom: 0; }

.message-content code {
  background: #0f1117;
  padding: 2px 5px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.85em;
  color: #7dd3fc;
}

.message-content pre {
  background: #0f1117;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 8px 0;
}

.message-content pre code {
  background: none;
  padding: 0;
  color: #e2e8f0;
}

.command-pills {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  flex-wrap: wrap;
  border-top: 1px solid #2d3148;
}

.command-pills button {
  background: #1a1d27;
  border: 1px solid #3d4263;
  color: #a5b4fc;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.command-pills button:hover:not(:disabled) {
  background: #252836;
  border-color: #7c8cf8;
}

.command-pills button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.input-row {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #2d3148;
}

.input-row textarea {
  flex: 1;
  background: #1a1d27;
  border: 1px solid #3d4263;
  border-radius: 8px;
  color: #e2e8f0;
  padding: 10px 14px;
  font-size: 14px;
  resize: none;
  font-family: inherit;
  line-height: 1.5;
}

.input-row textarea:focus {
  outline: none;
  border-color: #7c8cf8;
}

.input-row button {
  background: #4f46e5;
  border: none;
  color: white;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.input-row button:hover:not(:disabled) { background: #4338ca; }
.input-row button:disabled { opacity: 0.4; cursor: not-allowed; }
```

**Step 3: Update `web/client/src/App.jsx` to use ChatPanel**

```jsx
import { useState, useEffect } from 'react';
import LecturePanel from './components/LecturePanel.jsx';
import ChatPanel from './components/ChatPanel.jsx';

export default function App() {
  const [courses, setCourses] = useState([]);
  const [activeCourse, setActiveCourse] = useState(null);

  useEffect(() => {
    fetch('/api/courses')
      .then(r => r.json())
      .then(data => {
        setCourses(data);
        if (data.length === 1) setActiveCourse(data[0]);
      });
  }, []);

  return (
    <div className="app">
      <div className="top-bar">
        <span className="logo">📚 Professor</span>
        <select
          value={activeCourse?.slug || ''}
          onChange={e => setActiveCourse(courses.find(c => c.slug === e.target.value) || null)}
        >
          <option value="">Select course...</option>
          {courses.map(c => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        {activeCourse && (
          <span className="course-status">{activeCourse.lastActive}</span>
        )}
      </div>
      <div className="main-pane">
        <LecturePanel courseSlug={activeCourse?.slug} />
        <ChatPanel courseSlug={activeCourse?.slug} />
      </div>
    </div>
  );
}
```

Add to `App.css`:
```css
.course-status {
  font-size: 12px;
  color: #64748b;
  margin-left: auto;
}
```

**Step 4: Manual end-to-end verification**

1. Start server: `cd web && ANTHROPIC_API_KEY=your-key node server.js`
2. Start client: `cd web/client && npm run dev`
3. Open `http://localhost:5173`
4. If you have a course, select it — lecture panel shows content
5. Type `professor:discuss What is a closure?` — streaming response appears
6. Type `professor:next` — lecture panel refreshes with new section

**Step 5: Commit**

```bash
git add web/client/src/components/ChatPanel.jsx web/client/src/components/ChatPanel.css web/client/src/App.jsx web/client/src/App.css
git commit -m "feat(web): add streaming ChatPanel with context-aware command pills"
```

---

### Task 9: WebSocket for lecture auto-refresh

**Files:**
- Create: `web/client/src/hooks/useWebSocket.js`
- Modify: `web/client/src/components/LecturePanel.jsx`

**Step 1: Create `web/client/src/hooks/useWebSocket.js`**

```js
import { useEffect } from 'react';

export function useWebSocket(onMessage) {
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch {}
    };

    ws.onerror = () => {};

    return () => ws.close();
  }, []);
}
```

**Step 2: Update LecturePanel to use WebSocket hook**

Add import and hook usage to `LecturePanel.jsx`:

```jsx
import { useWebSocket } from '../hooks/useWebSocket.js';

// Inside component, before return:
useWebSocket((data) => {
  if (data.event === 'lecture-updated' && data.courseSlug === courseSlug) {
    load();
  }
});
```

**Step 3: Update `web/routes/chat.js` to broadcast after professor:next**

In the SSE `stream.on('message')` handler, after writing the done event:

```js
stream.on('message', async (msg) => {
  // Check if the last user message contained professor:next
  const lastUserMsg = messages[messages.length - 1];
  if (lastUserMsg?.content?.includes('professor:next') && courseSlug) {
    // Broadcast lecture update to all WebSocket clients
    // We need wss reference - pass it into the router builder
    broadcastLectureUpdate(courseSlug);
  }
  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  res.end();
});
```

Update `buildChatRouter` signature to accept `wss`:

```js
export function buildChatRouter(coursesDir, agentPath, wss) {
  // ...
  function broadcastLectureUpdate(courseSlug) {
    wss?.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ event: 'lecture-updated', courseSlug }));
      }
    });
  }
```

Update `web/server.js` to pass `wss` to chat router:

```js
// Change this line:
app.use('/api/chat', buildChatRouter(COURSES_DIR, AGENT_PATH));
// To:
app.use('/api/chat', buildChatRouter(COURSES_DIR, AGENT_PATH, wss));
```

**Step 4: Manual verification**

1. Run both server and client
2. Select a course, run `professor:next` in chat
3. Lecture panel should update automatically without page refresh

**Step 5: Commit**

```bash
git add web/client/src/hooks/useWebSocket.js web/client/src/components/LecturePanel.jsx web/routes/chat.js web/server.js
git commit -m "feat(web): add WebSocket hook for real-time lecture panel refresh"
```

---

### Task 10: CLI `web` command

**Files:**
- Modify: `bin/cli.js`

**Step 1: Add `web` command to the switch statement in `bin/cli.js`**

Add before the `case 'help':` line:

```js
case 'web': {
  const { join: pathJoin, dirname: pathDirname } = await import('path');
  const { fileURLToPath: toURL } = await import('url');
  const { existsSync: fsExists } = await import('fs');
  const { execSync } = await import('child_process');

  const __dir = pathDirname(toURL(import.meta.url));
  const webDir = pathJoin(__dir, '..', 'web');

  if (!fsExists(webDir)) {
    console.error('❌ Web UI not found. Make sure the plugin is fully installed.');
    process.exit(1);
  }

  if (!fsExists(pathJoin(webDir, 'node_modules'))) {
    console.log('📦 Installing web dependencies...');
    execSync('npm install', { cwd: webDir, stdio: 'inherit' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not set.');
    console.log('   Run: export ANTHROPIC_API_KEY=your-key');
    console.log('   Then: npx course-professor web');
    process.exit(1);
  }

  const port = args[1] || '3000';
  process.env.PORT = port;
  process.env.COURSES_DIR = process.env.COURSES_DIR || './courses';

  console.log(`\n📚 Starting Professor Web UI on port ${port}...\n`);
  await import(pathJoin(webDir, 'server.js'));
  break;
}
```

**Step 2: Update `printUsage()` to include web command**

Add to the Commands section in `printUsage()`:

```
  web [port]        Start local web UI (default port: 3000)
```

Add to Examples:
```
  npx course-professor web          # Start web UI on port 3000
  npx course-professor web 4000     # Start on port 4000
```

**Step 3: Manual verification**

```bash
ANTHROPIC_API_KEY=your-key node bin/cli.js web 3000
```

Expected: Server starts, prints URL, UI accessible at `http://localhost:3000`.

**Step 4: Commit**

```bash
git add bin/cli.js
git commit -m "feat(cli): add 'web' command to launch local web UI"
```

---

### Task 11: Production build setup

**Files:**
- Modify: `web/package.json`
- Create: `web/client/.gitignore`

**Step 1: Add build script to `web/package.json`**

```json
"scripts": {
  "dev": "node server.js",
  "build": "cd client && npm run build",
  "start": "npm run build && node server.js",
  "test": "node --test tests/"
}
```

**Step 2: Create `web/client/.gitignore`**

```
dist/
node_modules/
```

**Step 3: Test production build**

```bash
cd web && npm run build
```

Expected: `web/client/dist/` created.

```bash
cd web && ANTHROPIC_API_KEY=your-key node server.js
```

Open `http://localhost:3000` — app loads from built files (not Vite dev server).

**Step 4: Update CLI `web` command to auto-build if no dist**

In the `case 'web':` block, after the `node_modules` check:

```js
const clientDistDir = pathJoin(webDir, 'client', 'dist');
if (!fsExists(clientDistDir)) {
  console.log('🔨 Building client...');
  execSync('npm run build', { cwd: webDir, stdio: 'inherit' });
}
```

**Step 5: Commit**

```bash
git add web/package.json web/client/.gitignore bin/cli.js
git commit -m "feat(web): add production build pipeline and auto-build on first launch"
```

---

### Task 12: README update

**Files:**
- Modify: `README.md` (add web UI section)

**Step 1: Add web UI section to README**

Find the "Getting Started" or "Commands" section in README.md, then add after the existing commands section:

```markdown
## Web UI

Run a local web interface for a richer learning experience:

```bash
export ANTHROPIC_API_KEY=your-key
npx course-professor web
```

Opens at `http://localhost:3000` with:
- **Lecture panel** — current section rendered with syntax highlighting
- **Chat panel** — Socratic conversation with Professor, streamed in real-time
- **Command pills** — context-aware shortcuts so you don't need to memorize commands

The web UI reads and writes the same `courses/` files as the CLI — switch between them freely.
```

**Step 2: Verify README renders correctly**

Open README.md in a markdown previewer or GitHub.

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add web UI section to README"
```

---

## Verification Checklist

Before declaring complete, verify all of the following manually:

- [ ] `npx course-professor web` starts server without errors
- [ ] `http://localhost:3000` loads the split-pane UI
- [ ] Existing courses appear in the course selector dropdown
- [ ] Selecting a course loads LECTURE.md in the left panel (or empty state)
- [ ] Typing a message and pressing Enter sends it to Professor and streams a response
- [ ] Command pills are clickable and send the command
- [ ] Running `professor:next` in chat refreshes the lecture panel automatically
- [ ] Server and client both work with a real `ANTHROPIC_API_KEY`
- [ ] `node --test web/tests/` — all backend tests pass
- [ ] Production build works: `cd web && npm run build && node server.js`
