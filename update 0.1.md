Implementation Plan for Upgrading ValuerPro Project with AI, OCR, Maps Integration, and UI Enhancements

Task 1: Report List UI Enhancements

Style the buttons: Replace the plain text links with styled buttons or icon-buttons for “View”, “Edit”, “Delete”. For example, use TailwindCSS classes to add borders, colors and hover effects, and include icons (e.g. eye, pencil, trash) from a library like [Heroicons
material-tailwind.com
]. Tailwind’s button styles (e.g. rounded borders, padding, hover shadows) can make them look “advanced”
material-tailwind.com
.

Pre-populate Edit form: Change the Edit action so it navigates to the same multi-step “Create Report” wizard but with existing data loaded. In Next.js this means having a route like /reports/[id]/edit that fetches the report via reportsAPI.getById(id) (per the backend API
GitHub
) and calls the wizard’s loadReport(id) function. In the WizardProvider’s loadReport (currently it only fills basic info
GitHub
), extend it to fetch the report’s related property/location data and call updateStepData for each wizard step. This way all form fields (report info, identification, etc.) are populated for editing.

View Report PDF/DOCX: Change the “View” action to open the generated report. The backend defines stub endpoints like GET /api/v1/reports/{id}/generate-pdf and .../generate-docx
GitHub
. On click, call the appropriate endpoint and either stream the PDF/docx for viewing or open it in a new tab. For example, using the HTML a href or window.open on the PDF URL will let the user see the final document format.

Task 2: OCR & AI Data Extraction

Allow multiple file uploads: The FileUpload component already supports multiple files (multiple={true})
GitHub
. Ensure the “Create Report” wizard step (likely an “Appendices” or upload step) uses <FileUpload multiple> so users can select several images or PDFs at once. Adjust the max file count if needed. Accept relevant formats (PDF, JPG, PNG) or add TIFF/DOCX as required by stakeholders.

Use specialized OCR then AI: For each uploaded page/image, call Google’s Vision OCR (or Google Document AI) to extract text. Google Cloud’s Document AI is optimized for documents and PDFs, while Cloud Vision API works for images
cloud.google.com
. In practice, first send each file to Google Cloud Vision OCR (it achieves ~98% accuracy on text
cloud.google.com
) to get the raw text. Then feed the text to an LLM (e.g. OpenAI GPT-4) with prompts to parse out the specific fields (lot number, plan date, coordinates, deed info, etc.). This two-step approach is recommended because “GPT-4o is not precise when it comes to OCR” – using a dedicated OCR first and then prompting GPT yields correct results
medium.com
medium.com
.

Populate wizard fields: Take the extracted text/data from OCR+AI and dispatch it into the wizard state. For example, if the AI finds a “Lot Number: 123” or “Extent: 2 roods”, call updateStepData('identification', { lot_number: '123', extent_local: '2 roods', ... }). The WizardProvider’s updateStepData will merge this into the form state
GitHub
. Work through all 12 steps: wherever the OCR/AI can fill a field (e.g. plan number, owner, boundaries), prefill it and let the user review/adjust. Keep the “Run OCR” and “Analyze” buttons (as in FileUpload) to let users trigger this for each file.

Choose best tools: We recommend Google’s APIs for OCR and maps (as configured in the env and README
GitHub
). Use Google Vision/Document AI for OCR (per [28]) and Google Maps APIs (below). For AI parsing, use a strong LLM via OpenAI API to interpret the OCR text. This combination (Google OCR + GPT) is known to give very accurate extractions
medium.com
.

Task 3: Location & Access Details

Reverse geocoding: After OCR, the plan or deed may contain coordinates/address. Use Google Maps Geocoding API (Reverse Geocoding) to convert latitude/longitude into structured address components (village, GN division, DS division, district, province). Google’s Geocoding API returns administrative levels (country, state/province, city)
developers.google.com
. You can call it server-side (there’s a stub POST /api/v1/maps/reverse-geocode) or client-side with the Google Maps JS SDK. Populate fields like location.district, province, etc. using the geocoder output (for Sri Lanka, administrative_area_level_1 = Province, level_2 = District). If Google doesn’t return GN/DS divisions, these may need a local dataset lookup.

Remove “current location” auto-fill: As requested, remove the “Get Current Location” button and GPS prompt. The code currently has a “Get Current Location” that uses browser geolocation
GitHub
. Simply delete or hide this button, and disable auto-filling latitude/longitude since valuers enter data post-survey. This avoids confusing the workflow.

Access & Directions: Use Google Maps Directions API (or the Maps JavaScript API) to compute directions from a major city. For example, find the nearest city town center (could be from the City field) and request a route to the property coordinates. Display key info (distance and estimated travel time) in the “Directions” field or via a map. You might also generate a simple route description (“Take A to B road north from CityX...”).

Confirm/edit location data: After auto-filling, show all location fields (GN division, DS division, village, postal code, etc.) pre-filled from the OCR and map data. Let the user verify and correct any discrepancies (as per spec, “confirm the information are correct”).

Task 4: Transport & Connectivity

Nearest city distance: Calculate distance from the property to the nearest major town (e.g. district capital) using Google Maps Distance Matrix API. The property’s coordinates are the origin; use the known city coordinates as destination. This yields driving distance/time
developers.google.com
. Populate a new field “Distance to Town Center” (or use the existing location.distance_to_town) with that value. As requested, remove the “Distance to Colombo” field (the UI currently has it
GitHub
) since it’s not needed.

Local amenities: For “nearest school”, “nearest hospital”, “nearest religious place”, etc., use Google Places API. Send a Places Nearby Search request at the property coordinates with types=‘school’, ‘hospital’, ‘place_of_worship’, etc., and find the closest by distance (or use the first result). Populate fields like property nearest_school, nearest_hospital with the name and distance (from Places result’s geometry plus another distance-matrix call if needed). You may need to add these fields into the appropriate step (perhaps the Site or Locality step) and UI.

Public transport and landmarks: For “Public Transport Access”, use Google Places for bus/rail stations near the site or simply default text (“Bus routes on Main Rd”). Fill “Nearest Railway Station” similarly. For the nearest_landmark field (already exists), you could automatically use Google’s “place name” result or let user edit it.

Map Integration: Implement the placeholder map section: use Google Maps Static or JS map to show a pin at the property (using NEXT_PUBLIC_GOOGLE_MAPS_API_KEY). Buttons like “View on Map”/“Satellite View” can toggle between map types or open Google Maps. This helps the user visualize the location as they enter data.

Task 5: Electric Supply (Utilities)

Remove average bill field: As requested, drop the “Monthly Average Bill” input. In the Utilities step, remove this field from the Electricity section (currently “Monthly Average Bill (Rs.)”
GitHub
). It’s unnecessary for the report. Ensure any references to monthly_cost in state/API are also removed.

Keep other fields: Retain the electricity availability, supply type, connection status, and notes fields
GitHub
GitHub
. Also ensure that “electricity available” and “connection status” are captured from the deed/field data if possible (maybe AI could pre-fill “Connected” if the deed mentions an account number).

Task 6: Planning & Zoning

Automate zoning info: Use the property coordinates to determine applicable zoning/building regs. For example, reverse geocode to find the local planning authority (urban council, municipal, or UDA area). Then retrieve the relevant regulations. This might involve:

Urban Development Authority (UDA): If in a UDA zone, fetch the UDA Development Plan and Building Regulations (e.g. Urban Dev. Authority Planning & Development Regulations 2020
uda.gov.lk
). These PDFs/lines have height limits, FAR, setbacks, etc. You could maintain a mapping (by GN division or GPS boundary) of which gazette applies.

Local authorities: If not UDA, identify the local municipal/city planning regulations (these might be web documents or stored data).

Populate fields: Fill fields like “Zoning**,” “Floor Area Ratio,” “Setbacks,” etc., based on the above documents. For example, the UDA regulations specify “FAR = 2.0” in a given zone
uda.gov.lk
. You might not be able to automate all, but at minimum present a summary from the relevant regulation and let the valuer copy key points.

NBRO/Landslide clearance: Include a field for “NBRO clearance required?” or “Landslide risk zone?”. Use NBRO maps (available online) to check if the coordinates lie in a hazard zone. Alternatively, have the valuer select Yes/No based on hazard maps. Since NBRO approval is site-specific, at least note it must be verified manually. You could add a note or link to NBRO’s hazard portal. (For context, Sri Lanka forbids construction in landslide-prone zones without NBRO approval
sundaytimes.lk
.)

Regulatory summary: Optionally, provide links or uploaded documents (in Appendices) of the relevant regulations so the user doesn’t have to search them. The app could let admin upload PDFs of UDA or local regulations per area and associate them with the property location.

General Recommendations & Tools

Consistent styling: Adopt a cohesive UI style across all updates. If the site uses Tailwind and Heroicons elsewhere, use them for buttons, fields, and modals for consistency
material-tailwind.com
. Consider theme colors or button shapes that match the existing design. You can offer both “icon + text” and “text-only” variants (i.e. user preference) when adding buttons or toggles.

API usage: Leverage Google Cloud Vision (or Document AI) for OCR
cloud.google.com
 and the OpenAI API for text analysis as discussed. For mapping, use the Google Maps/Places/Distance Matrix APIs (keys already in .env)
GitHub
. These are well-supported and high-quality for text/image recognition and geospatial data.

Error handling: Since many fields depend on external services, ensure the UI handles cases where OCR or Maps fail (e.g. show a warning and let user enter manually). For each auto-fill, allow user editing.

Thorough testing: Finally, test with real deed/plan examples. Make sure multi-page PDFs yield all pages’ text, check that geocoding returns correct Sri Lankan administrative names, and verify distances (e.g. between Colombo or local city). The front-end already has e2e tests for the wizard – update them or add new tests for the new fields and buttons to ensure stability.

By following this plan, we modernize the UI (Task 1), fully automate data entry where possible (Tasks 2–3), simplify forms by removing useless fields (Tasks 4), and enrich reports with local regulatory info (Task 5). These changes use best-in-class tools (Google OCR/Maps, OpenAI) to give valuers a smooth, data-driven workflow
