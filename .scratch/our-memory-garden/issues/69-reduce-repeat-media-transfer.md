# 69 — Reduce repeat photo and page list transfer

Status: resolved

- Serve a conditional response for previously downloaded public display photos after checking live page visibility. A matching browser copy receives an empty 304 response without reading photo data from object storage.
- Unlisted photos and originals still require an administrator and use no-store. Making a photo private stops anonymous requests even when they include its previous validator.
- Fetch only page card fields for the Dashboard and Pages list. Limit Dashboard results to its five visible cards.
