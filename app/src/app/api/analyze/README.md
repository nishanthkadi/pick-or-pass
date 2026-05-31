Phase 2: `POST /api/analyze` — live Gemini analysis (server key or BYOK).

```bash
curl -X POST http://localhost:3000/api/analyze \
  -F "listingText=Comes with extra characters..." \
  -F "images=@../assets/listing-2.jpg"
```

JSON + BYOK: `{ "listingText", "images": [{ "data": "<base64>", "mimeType": "image/jpeg" }], "apiKey" }`
