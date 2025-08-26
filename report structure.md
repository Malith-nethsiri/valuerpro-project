> **How to use this template**
> Replace the placeholders like `{{this}}` with actual values. Sections marked *optional* can be hidden if not relevant. This structure is designed to be auto‑filled by ValuerPro (OCR + AI + user inputs) and exported to PDF/DOCX.

---

# Cover Page / Letterhead

**Left header (static from `valuer_profile`):**
{{valuer.titles}} {{valuer.full\_name}}
{{valuer.qualifications}}
Panel Valuer: {{valuer.panels\_list}}

**Right header (static from `valuer_profile`):**
{{valuer.address\_multiline}}
Tel: {{valuer.phones\_list}}
Email: {{valuer.email}}

**Meta line (right-aligned):**
**My Ref:** {{report.ref}}    **Date:** {{report.date}}

**Centered Title**

## VALUATION REPORT

**Subject (dynamic, from OCR + inputs):**
Valuation Report of the Property depicted as **Lot {{id.lot\_number}}** in **Plan No. {{id.plan\_number}}** dated **{{id.plan\_date}}**, prepared by **{{id.surveyor\_name}} – Licensed Surveyor**.

---

# Executive Summary (optional)

| Item                        | Details                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------- |
| Property Type               | {{summary.property\_type}}                                                          |
| Location                    | {{location.village}}, {{location.district}} District, {{location.province}}         |
| Land Extent                 | {{id.extent\_local}} (≈ {{id.extent\_metric}})                                      |
| Buildings                   | {{summary.buildings\_brief}}                                                        |
| **Open Market Value (OMV)** | **Rs. {{valuation.market\_value\_numeric}}**                                        |
| **Forced Sale Value (FSV)** | **Rs. {{valuation.forced\_sale\_value\_numeric}}** ({{valuation.fsv\_pct}}% of OMV) |

> *(Executive Summary auto-fills after sections 4–13 are complete.)*

---

## 1. Introduction & Instructions

This report is prepared at the request of **{{client.name}}** for **{{report.purpose}}**. The subject property, owned by **{{title.owner\_name}}**, is valued on the basis of **{{basis\_of\_value}}** in accordance with **International Valuation Standards (IVS)** and the standards of the **Institute of Valuers of Sri Lanka**, for the stated purpose only.

## 2. Scope, Standards & Independence (*optional*)

The valuer inspected the property, reviewed provided documents (survey plan/deed/approvals), and relied on market evidence. No structural survey or legal due‑diligence was undertaken. The valuer has no present or prospective interest in the property and is independent of the client and subject.

## 3. Inspection Details

**Date of Inspection:** {{inspection.date}}
**Inspected By:** {{inspection.by}}
**Weather / Access Notes (*optional*):** {{inspection.notes}}

## 4. Property Identification & Title

**Identification:** The property is identified as **Lot {{id.lot\_number}}** in **Plan No. {{id.plan\_number}}** dated **{{id.plan\_date}}** prepared by **{{id.surveyor\_name}}, Licensed Surveyor**; land known as **“{{id.land\_name}}”**.
**Extent:** {{id.extent\_local}} (≈ {{id.extent\_metric}}).
**Boundaries (per plan):** **North** – {{id.boundaries.north}}; **East** – {{id.boundaries.east}}; **South** – {{id.boundaries.south}}; **West** – {{id.boundaries.west}}.
**Title:** {{title.interest}} interest held by **{{title.owner\_name}}** by Deed No. **{{title.deed\_no}}** dated **{{title.deed\_date}}** ({{title.notary}}). *If unavailable, state: “Title documents not provided; valuation assumes clear, marketable title.”*

## 5. Situation / Location

The subject property is situated at **{{address.full}}** in **{{location.village}}**, within the **{{location.gn\_division}}** GN Division, **{{location.ds\_division}}** Divisional Secretariat, **{{location.district}}** District, **{{location.province}}** Province. Coordinates: {{location.lat}}, {{location.lng}} (*if available*).

## 6. Access

From **{{access.landmark}}**, proceed **{{access.directions}}** via **{{access.road\_names}}** to reach the property. The final access is **{{access.road\_width}}** wide **{{access.road\_surface}}** road with **{{access.maintainer}}** maintenance.

## 7. Site (Land) Description

The land is **{{site.shape}}**, **{{site.topography}}** and approximately **{{site.level\_vs\_road}}** relative to the access road. Soil is **{{site.soil}}**; water table approx. **{{site.water\_table\_depth}}** ft. Site features include **{{site.features\_list}}** (e.g., boundary wall, gate, drainage). Frontage approx. **{{site.frontage}}** (*if known*). The site is **{{site.flood\_risk}}** to flooding/water‑logging.

## 8. Improvements / Buildings (*omit if vacant land*)

**Building {{b.index}} – {{b.type}}:** {{b.storeys}}‑storey {{b.structure}} with **{{b.roof.type}}** roof on {{b.roof.structure}}; walls {{b.walls}}; floors {{b.floors}}; doors {{b.doors}}; windows {{b.windows}}. Layout: {{b.layout}}. Approx. floor area **{{b.area\_sqft}} sq.ft** (≈ {{b.area\_sqm}} m²). Age **{{b.age}}** years; **{{b.condition}}** condition; **{{b.occupancy}}**. *Repeat for each building as needed.*

## 9. Services & Utilities

Electricity: {{utilities.electricity}}; Water: {{utilities.water}}; Telephone/Internet: {{utilities.telecom}}; Sewerage: {{utilities.sewerage}}; Drainage: {{utilities.drainage}}; Other: {{utilities.other}}.

## 10. Planning / Zoning / Restrictions (*optional*)

{{planning.zoning}}; Street line/building line: {{planning.street\_line}}; Reservations / easements: {{planning.easements}}. *If none:* “No adverse planning restrictions identified that materially affect the property.”

## 11. Locality & Market Context

{{locality.narrative}}
(*E.g., nature of the neighborhood, proximity to amenities, demand drivers, notable developments.*)

## 12. Valuation Approach & Market Evidence

**Approach:** {{valuation.approach}} (e.g., Comparison method for land; Depreciated Replacement Cost for buildings).
**Market Evidence:** Similar lands ({{evidence.size\_range}}) in {{location.village}} / {{location.town}} transact at **Rs. {{evidence.low}} – {{evidence.high}} per perch**, adjusted for location/conveniences. (*List comparables if available.*)

## 13. Valuation Calculations

**Land:** {{id.extent\_perches}} P @ Rs. {{calc.land\_rate\_perch}} /P = **Rs. {{calc.land\_value}}**
**Building {{b.index}}:** {{b.area\_sqft}} sq.ft @ Rs. {{b.rate\_sqft}} /sq.ft = Rs. {{b.cost}}
Less **{{b.dep\_pct}}%** depreciation = **Rs. {{b.value\_after\_dep}}**
**Other improvements (if any):** {{calc.other\_items}} = **Rs. {{calc.other\_value}}**
**Total Open Market Value (OMV)** = **Rs. {{valuation.market\_value\_numeric}}** (rounded)
**Forced Sale Value (FSV)** = **Rs. {{valuation.forced\_sale\_value\_numeric}}** (assumed {{valuation.fsv\_pct}}% of OMV)

**In Words:** {{valuation.market\_value\_words}}
*(e.g., “Sri Lanka Rupees Twenty Two Million Five Hundred Thousand Only”)*

## 14. Conclusion / Opinion of Value

In the valuer’s opinion, the **Open Market Value** of the subject property (land{{conclusion.plus\_buildings}}) **as at {{inspection.date}}** is **Rs. {{valuation.market\_value\_numeric}}** ({{valuation.market\_value\_words}}).
(*If required:* The **Forced Sale Value** is **Rs. {{valuation.forced\_sale\_value\_numeric}}**.)

## 15. Certificate of Identity

I hereby certify that the property inspected and valued herein is identical to that described as **Lot {{id.lot\_number}}** in **Plan No. {{id.plan\_number}}** dated **{{id.plan\_date}}** prepared by **{{id.surveyor\_name}}, Licensed Surveyor**.

## 16. Assumptions & Limiting Conditions

* The valuation assumes a clear, marketable title free of encumbrances unless stated otherwise.
* No structural survey or soil investigation was undertaken; buildings are assumed sound commensurate with age and type.
* The valuation is for **{{report.purpose}}** and for the exclusive use of **{{client.name}}**; no responsibility to third parties.
* Values are current **as at {{inspection.date}}** and may change with market conditions.
* Measurements are approximate; plans/deeds are relied upon where applicable.
* The valuer confirms independence and adherence to IVS/IVSL standards.

## 17. Signature

{{valuer.full\_name}}
{{valuer.qualifications}}
Membership/Registration: {{valuer.registration\_no}}
Date: {{report.date}}

*(Optional scanned signature image block here)*

## 18. Appendices

* **Appendix A – Location Map** (auto‑generated from coordinates/address)
* **Appendix B – Survey Plan** (uploaded scan)
* **Appendix C – Photographs** (captions: Front view, Street view, Interior, etc.)
* **Appendix D – Comparable Sales/Evidence** (if any)

---

# Styling & Layout Guidelines (for PDF/DOCX)

* **Fonts:** Headings 13–14pt bold; body 11–12pt. Use a professional serif (Times New Roman) or clean sans‑serif (Calibri).
* **Spacing:** 1.15–1.2 line spacing; 6–10pt before headings; keep paragraphs 3–5 sentences.
* **Page Elements:** Footer with “Page X of Y” and **{{report.ref}}**; repeat mini header (valuer name + report title) if desired.
* **Tables:** Align currency right; show thousands separators; two decimals where needed; bold totals.
* **Images:** 300+ DPI; figure captions below images; reference figures in text.
* **Number Consistency:** Auto‑generate value in words from numeric (avoid mismatches).

---

# Field Mapping to ValuerPro Data

* `valuer_profile` → letterhead blocks, signature block.
* `reports` → `report.ref`, `report.date`, `purpose`, `inspection.date/by`.
* `ai_analysis.identification` → `id.*` (lot, plan, date, surveyor, land name, extent, boundaries).
* `location` form → village, GN/DS divisions, district, province, coords.
* `description` forms → site.*, buildings\[*].*, utilities.*
* `valuation` forms → land\_rate\_perch, building rates, depreciation, other items, rounding, FSV %.
* Generated → `market_value_words`, executive summary fields.

---

# Mini Preview (filled example — excerpt)

*(This is how the generated report should read once populated.)*

**VALUTION REPORT**
**My Ref:** EB/408‑2024    **Date:** 15 Oct 2024
**Subject:** Valuation of Lot 15 in Plan No. 1035 dated 25/03/2004 by W\.K. Perera, LS.

**Introduction.** This report is prepared at the request of Miss R.D.Z. Hingis for visa purposes. The subject property, owned by Mr. W\.M.L. Sapumal Bandara, is valued on the basis of Market Value in accordance with IVS.

**Identification & Title.** The property is identified as Lot 15 in Plan No. 1035 dated 25/03/2004 by W\.K. Perera, LS. Extent 13.8 Perches (\~0.035 Ha). Boundaries: North – Lot 7 (6 m road); East – Lot 108 (1 m drain); South – Lot 12; West – Lot 10. Title is assumed clear and marketable.

**Description.** The site is rectangular, level with the access road, enclosed by a brick masonry parapet wall with a steel roller gate. A single‑storey masonry dwelling (\~1,768 sq.ft) with RCC flat roof to the front and asbestos sheet to the kitchen, tiled floors, timber doors/windows, provides verandah, living/dining, 4 rooms, kitchen and bathroom. Utilities include electricity, pipe‑borne water and telephone. Approximate age 15 years; condition fair; owner‑occupied.

**Valuation (summary).** Land 13.8 P @ Rs. 650,000/P = Rs. 8,970,000. Building 1,768 sq.ft @ Rs. 8,500/sq.ft less 10% = Rs. 13,525,200. **OMV = Rs. 22,495,200**, rounded **Rs. 22,500,000**. *In words: Sri Lanka Rupees Twenty Two Million Five Hundred Thousand Only.*

**Conclusion.** In my opinion, the **Open Market Value as at 14 Oct 2024 is Rs. 22,500,000**. Forced Sale Value is assessed at **Rs. 18,000,000** (\~80% of OMV).

**Certificate of Identity.** I certify the property inspected is identical to Lot 15 in Plan No. 1035 dated 25/03/2004 by W\.K. Perera, LS.

(Signature)

---

> **Note:** You can hide any *optional* section for brevity (e.g., Scope/Standards, Planning) in simple residential reports, but keep Certificate, Assumptions, and Appendices where possible to maintain professional completeness.
