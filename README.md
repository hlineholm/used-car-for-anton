# used-car-for-anton

Minimal static site for browsing automatic commuter cars around Uppsala.

## Files

| Path | Role |
| --- | --- |
| `README.md` | Repo overview. |
| `index.html` | The page. Shows summary cards, shortcut cards, then the full filterable inventory. |
| `data.json` | Generated page data. |
| `src/app.ts` | TypeScript browser app (UI wiring and rendering). |
| `src/core.ts` | TypeScript core filter/sort logic. |
| `tests/core.test.ts` | Unit tests for filter/sort behavior. |
| `app.js`, `core.js` | Built JavaScript loaded by the static page. |
| `scripts/serve.py` | Local HTTP preview helper. |

## Run locally

```bash
python3 scripts/serve.py
```

Open:

```text
http://127.0.0.1:8123/
```

## Build and test

```bash
npm install
npm run build
npm test
```

## GitHub Pages

Publish the repo root. `index.html` is the entrypoint and it loads `data.json` in the browser.

GitHub Pages does **not** support a real password gate on its own. If you want access control, use a front door like Cloudflare Access or Tailscale in front of the page.

## Notes

- The page is static.
- The page focuses on one full inventory with shortcuts and a card/list toggle.
- Service and forum notes are heuristic guidance, not service-history proof.
