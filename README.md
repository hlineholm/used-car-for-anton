# used-car-for-anton

Minimal static site for browsing automatic commuter cars around Uppsala.

## Files

| Path | Role |
| --- | --- |
| `README.md` | Repo overview. |
| `index.html` | The page. Shows shortlist sections first, then the full filterable inventory. |
| `data.json` | Generated page data. |
| `scripts/serve.py` | Local HTTP preview helper. |

## Run locally

```bash
python3 scripts/serve.py
```

Open:

```text
http://127.0.0.1:8123/
```

## GitHub Pages

Publish the repo root. `index.html` is the entrypoint and it loads `data.json` in the browser.

GitHub Pages does **not** support a real password gate on its own. If you want access control, use a front door like Cloudflare Access or Tailscale in front of the page.

## Notes

- The page is static.
- The shortlist stays near the top.
- The full inventory stays below with filters and chained sorts.
- Service and forum notes are heuristic guidance, not service-history proof.
