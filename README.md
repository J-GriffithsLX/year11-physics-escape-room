# The Aether Lock

A browser-based digital escape room for NSW Year 11 Physics revision.

Students work through six rooms covering motion, forces, energy, waves,
circuits, and scientific evidence. Each room randomly selects one of five
question variants, producing 15,625 possible missions. Beginner,
intermediate, and advanced pathways use the same physics content with
different levels of scaffolding and hints.

## Student site

The public classroom link is published automatically through GitHub Pages.

## Local development

Requires Node.js 22 or later.

```bash
npm install
npm run build:pages
```

The static site is written to `out/`.

## Content structure

- `app/page.tsx` — escape-room interface and progression
- `app/question-bank.ts` — five variants for each of the six physics rooms
- `app/globals.css` — visual design and responsive layout
- `.github/workflows/deploy-pages.yml` — automatic GitHub Pages deployment
