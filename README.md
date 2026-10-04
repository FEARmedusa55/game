# Block Guide Megathread

Static, nature/shader-themed megathread site. No build step.

## Edit content
- **In the browser:** click **✎ Edit** (pages, nav, sidebar boxes, title, footer, button). Saved locally; use **Export JSON** to get the file.
- **In the repo:** edit `content/site.json` (Markdown inside `body` fields). Link pages with `[text](#/page-id)`.

## Publish (GitHub Pages)
Repo → Settings → Pages → Source: **GitHub Actions**. Every push to `main` runs `.github/workflows/pages.yml` and deploys automatically.
(Alternative with no workflow: Source = "Deploy from a branch" → `main` / root.)
