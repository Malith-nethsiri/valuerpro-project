# Frontend (App UI/UX)

## Must-haves

* **Report Wizard (step-by-step)**

  1. Report Info (purpose, client, ref no., report date, inspection date)
  2. Identification & Title (lot, plan, plan date, surveyor, land name, extent, boundaries)
  3. Location & Access (address, GN/DS, district/province, lat/lng, access narrative)
  4. Site (shape, level, soil, water-table, frontage, features, flood risk)
  5. Buildings (multi-building form: type, storeys, area, materials, age, condition, occupancy, layout)
  6. Utilities (electricity/water/telecom/sewerage/drainage)
  7. Planning/Zoning (zoning, street line, reservations/easements)
  8. Locality/Market context (free text)
  9. Valuation (land rate, building rates, depreciation, other items, FSV %) + live calculator
  10. Disclaimers & Certificate (toggle + editable text)
  11. Appendices (map, survey plan, photos, comparables)
  12. Review & Generate (preview → DOCX/PDF)
* **AI Assist panels** beside each step

  * Show OCR/AI suggestions with confidence %, “Accept/Reject/Edit”.
* **OCR review UI**

  * Per-file text view, highlight key fields (lot/plan/boundaries), quick copy to form.
* **Map & coordinates picker**

  * Search address, drop pin, capture static map for Appendix A.
* **Photo/Document uploader**

  * Reorder, captions, figure numbering.
* **Valuation calculator**

  * Land: perches → value; Buildings: area × rate – depreciation; “round to nearest X”.
  * Auto compute **FSV** from MV via %.
* **Executive Summary auto-fill** from completed sections.
* **Number-to-words** generator (LKR) to avoid mismatches.
* **Compliance checks**

  * “Ready to finalize” checklist for missing critical fields (extent, value, inspection date, certificate).
* **Autosave, versioning & status** (Draft/In progress/Finalized).
* **Signature block**

  * Upload scanned signature; toggle e-signature.
* **Export & preview**

  * One-click **DOCX** and **PDF** (what-you-see preview).

## Nice-to-haves

* Template chooser (bank/visa/commercial variants), firm branding (logo/colors).
* Inline grammar/tone polish (“Make more formal”).
* Multi-property support (repeat sections per property with auto totals).
* Comments/mentions for team review.

---

# Backend (APIs, services)

## Must-haves

* **Auth & Profile**

  * JWT auth; `valuer_profile` (name, titles, quals, panels, address, phones, email, membership/registration no., signature image).
* **Report CRUD**

  * Create/update/read/delete reports; status transitions; version history.
* **File services**

  * Upload, virus scan (optional), type tagging (survey\_plan/photo/other), image compression, page thumbnails.
* **OCR/AI pipeline**

  * OCR (Vision), Sinhala→English translation, key-field extraction (lot/plan/boundaries/extent/surveyor/land name), confidence scoring.
  * Narrative generators (identification paragraph, access draft, building paragraph skeletons) – always editable.
* **Geospatial**

  * Geocode/reverse-geocode; static map image generator; optional route text (directions).
* **Valuation engine**

  * Unit conversions (perches↔m²/ha; acres/roods/perches formatter), currency formatter, number-to-words (LKR), rounding rules, FSV % calculator.
* **Template rendering**

  * Merge data → **DOCX** (python-docx + placeholders) and **PDF** (ReportLab or DOCX→PDF); figure captions, page numbers (X of Y), TOC optional, appendix assembly.
* **Business rules & validation**

  * Pre-finalization checks (inspection date present, extent > 0, MV computed, certificate composed, owner or title assumption set).
* **Audit & security**

  * Per-field change log, who changed/when; read/write permissions; finalized reports are locked & checksummed.
* **Background jobs**

  * Queue long tasks (OCR, doc gen); progress polling.
* **Email/send**

  * Optional: email final PDF/DOCX; download URLs with expiry.

## Nice-to-haves

* Comparables service (store/query rates by locality).
* Firm-level template manager & disclaimer library.
* e-Signature / signing log (with hash).
* Rate limiting, caching (maps, number-to-words), observability (logs/metrics/traces).

---

# Database (core schema)

## Must-have tables (key fields)

* **users**: id, email, hash, role, active
* **valuer\_profile** (1–1 users): titles, full\_name, qualifications\[], panels\[], address, phones\[], email, registration\_no, signature\_file\_id
* **clients**: id, name, address, contacts
* **reports**: id, ref, purpose, basis\_of\_value, type, status, report\_date, inspection\_date, client\_id, user\_id, template\_id, currency, fsv\_pct, finalized\_at
* **properties** (1–N per report): id, report\_id, property\_index, property\_type
* **identification** (1–1 per property): lot\_number, plan\_number, plan\_date, surveyor\_name, land\_name, extent\_perches, extent\_metric\_sqm, boundaries JSON{north,east,south,west}, title\_owner, deed\_no, deed\_date, notary, interest (freehold/leasehold)
* **location** (1–1 per property): address\_full, village, gn\_division, ds\_division, district, province, lat, lng
* **access** (1–1): landmark, directions\_text, road\_names, road\_width, road\_surface, maintainer
* **site** (1–1): shape, topography, level\_vs\_road, soil, water\_table\_depth\_ft, frontage\_ft, features\[], flood\_risk
* **buildings** (N per property): type, storeys, structure, roof\_type, roof\_structure, walls, floors, doors, windows, layout\_text, area\_sqft, area\_sqm, age\_years, condition, occupancy
* **utilities** (1–1): electricity bool, water bool, telecom bool, sewerage text/enum, drainage text, other text
* **planning** (1–1): zoning, street\_line, easements, notes
* **locality** (1–1): narrative
* **valuation\_lines** (N per property): line\_type (land/building/other), description, qty, unit (perch/sqft/etc), rate, depreciation\_pct, value, sort\_order
* **valuation\_summary** (1–1 per report or property): market\_value, market\_value\_words, forced\_sale\_value
* **disclaimers** (1–1 per report): text
* **certificate** (1–1): text
* **appendices** (N per report): type (map/plan/photo/comparable/other), file\_id, caption, sort\_order
* **files**: id, path, mime, size, checksum, kind (survey\_plan/photo/other), uploaded\_by, report\_id nullable
* **ocr\_results**: file\_id, language, raw\_text, blocks\_json, created\_at
* **ai\_suggestions**: report\_id, property\_id nullable, section (enum), content, confidence, accepted\_by, accepted\_at
* **revisions**: report\_id, version, diff, author\_id, created\_at
* **templates**: id, name, docx\_template\_blob/ref, fields\_map, active

## Indexing & integrity

* FK indexes on report\_id/property\_id; composite (report\_id, sort\_order) for lines & appendices.
* Unique `reports.ref` per user/firm.
* Constraints: extent\_perches > 0; if property\_type=vacant land → buildings=0.
* Soft delete flags or archival tables as needed.

---

# Data ↔ Template (key mappings)

* `{{valuer.*}}` → **valuer\_profile**
* `{{report.*}}` / `{{client.name}}` → **reports**, **clients**
* `{{id.*}}` / `{{location.*}}` / `{{access.*}}` / `{{site.*}}` → **identification**, **location**, **access**, **site**
* `{{b.*}}` (repeat) → **buildings** rows
* `{{utilities.*}}`, `{{planning.*}}`, `{{locality.narrative}}` → respective tables
* `{{calc.*}}`, `{{valuation.*}}` → **valuation\_lines** + **valuation\_summary** (backend computes); number-to-words stored to avoid mismatch
* Appendices placeholders → **appendices** + **files** (with captions)

---

# API surface (essentials)

* `POST /auth/login`, `GET/PUT /auth/me`
* `POST /reports`, `GET /reports/:id`, `PUT /reports/:id`, `POST /reports/:id/finalize`
* `POST /reports/:id/files` (upload), `GET /reports/:id/files`
* `POST /ocr/:file_id` → text; `POST /ai/extract` → key fields; `POST /ai/narrate` → paragraphs
* `POST /maps/geocode`, `POST /maps/static-map`
* `POST /valuation/compute` → summary + lines + words
* `GET /reports/:id/generate-docx`, `GET /reports/:id/generate-pdf`

---

# Validation checklist (gate before “Finalize”)

* Report info filled (purpose, dates, ref) ✔️
* Identification complete (lot/plan/date/surveyor/extent/boundaries) ✔️
* Location (district/province + address or village) ✔️
* Valuation lines present and **market\_value** computed ✔️
* **market\_value\_words** matches numeric ✔️
* Certificate & Assumptions present ✔️
* At least one appendix (survey plan) ✔️

