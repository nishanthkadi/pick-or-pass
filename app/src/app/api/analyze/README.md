Phase 2: `POST /api/analyze` — live Gemini analysis (server key or BYOK).

```bash
curl -X POST http://localhost:3000/api/analyze \
  -F "listingText=Toddler Montessori Toy..." \
  -F "sellerStarRating=4.5" \
  -F "images=@../assets/listing-2.jpg"
```

JSON + BYOK: `{ "listingText", "sellerStarRating" (optional, 0–5), "images": [{ "data": "<base64>", "mimeType": "image/jpeg" }], "apiKey" }`
