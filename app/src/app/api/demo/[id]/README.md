Phase 2: `GET /api/demo/[id]` — listing context + cached analysis JSON.

```bash
curl http://localhost:3000/api/demo/cruise-ship
# Returns: { "listing": { label, description, imageUrl, hint }, "analysis": { ... } }
```
