# Family Documents - Excel Export Feature

## Current State
The app is a family document manager with shared credentials. The Home page has a header with a Folder icon, title "Family Documents", and a Logout button. Person cards are shown in a grid. Documents are stored as blobs via blob-storage, with types from DOCUMENT_TYPES list in PersonDetailPage.tsx. The backend exposes `getAllPersons()`, `getAllDocuments()`, and individual document/person queries.

## Requested Changes (Diff)

### Add
- **Export to Excel button** in the Home page header, placed immediately beside the Logout button
- **Excel generation utility** (`src/frontend/src/utils/excelExport.ts`) that:
  - Takes persons and their documents as input
  - Uses `xlsx` (SheetJS) library to generate an `.xlsx` file
  - Columns (in order): Name, DOB, Aadhaar No., PAN No., Voter ID, Driving License No., Passport No., Passport Size Photo, Birth Certificate, Insurance Policy, Ration Card, 10th Marksheet, 12th Marksheet, Degree Certificate, Income Certificate, Caste Certificate, Medical Records, Other
  - For each person row, fills cells based on their documents
- **OCR extraction utility** (`src/frontend/src/utils/ocrExtract.ts`) using `tesseract.js` that:
  - Accepts an image blob URL and a document type
  - Runs OCR to extract text from the image
  - Applies regex patterns to extract:
    - Aadhaar No.: 12-digit number (e.g., `XXXX XXXX XXXX`)
    - PAN No.: format `ABCDE1234F` (5 letters, 4 digits, 1 letter)
    - DOB: common date formats (DD/MM/YYYY, DD-MM-YYYY, etc.)
    - Voter ID: format `ABC1234567` (3 letters + 7 digits)
    - Driving License: 16-character alphanumeric (state code + digits)
    - Passport No.: format `A1234567` (1 letter + 7 digits)
  - Returns extracted value or `"Uploaded"` as fallback if extraction fails
  - For PDFs (non-image blobs), returns `"Uploaded"` without attempting OCR

### Modify
- **HomePage.tsx**: Add Export button next to Logout, add export logic that fetches blob URLs for all documents, runs OCR on images, and triggers download of the Excel file

### Remove
- Nothing removed

## Implementation Plan
1. Install `xlsx` and `tesseract.js` packages in frontend
2. Create `src/frontend/src/utils/ocrExtract.ts` — OCR helper with pattern extraction per doc type
3. Create `src/frontend/src/utils/excelExport.ts` — builds worksheet data and triggers `.xlsx` download using SheetJS
4. Update `HomePage.tsx`:
   - Add `FileSpreadsheet` icon import from lucide-react
   - Add Export button next to Logout button in header
   - On click: show loading state, fetch all persons + documents, run OCR on each document image, build Excel, download
5. Validate (lint + typecheck + build)
