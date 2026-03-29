# FamilyDoc

## Current State
App is a shared-credential family document manager. Three critical bugs exist:
1. `storageHelper.ts` imports `getSharedStorageClient` from `config.ts` but the function is never defined/exported there -- all uploads crash
2. `StorageClient.putFile` signature only accepts `(blobBytes, onProgress)` but `storageHelper.ts` calls it with `(bytes, onProgress, mimeType, filename)` -- mimeType/filename are silently ignored, all files stored as `application/octet-stream`
3. Excel 'Uploaded' links open raw blob URLs without auth gate; user wants Option B: open in browser viewer (Chrome native PDF/image viewer), auth-protected

## Requested Changes (Diff)

### Add
- Export `getSharedStorageClient` from `config.ts` -- creates and caches a StorageClient using loaded config
- New `DocumentViewerPage` component: full-screen viewer that shows a PDF in iframe or image full-screen; has a Download button; triggered by `?view=BLOBID` URL param
- App.tsx: on load, detect `?view=` query param; store pending blob in sessionStorage; after login, auto-open viewer
- `storageHelper.ts` `getBlobUrl`: add `?inline=true` or ensure URL resolves to viewable format

### Modify
- `StorageClient.putFile(blobBytes, onProgress?, mimeType?, filename?)`: accept and use mimeType in fileHeaders (`Content-Type` set to actual mimeType), `Content-Disposition: inline` so browser renders inline
- `excelExport.ts`: Excel 'Uploaded' URLs should point to `appBaseUrl?view=BLOBID` (app URL with view param), not raw blob URL
- `HomePage.tsx` `handleExport`: pass app base URL to be embedded in Excel links
- `App.tsx`: detect `?view=` param on load; if not logged in, store param and show login; after login navigate to viewer

### Remove
- Nothing removed

## Implementation Plan
1. Add `getSharedStorageClient` export to `config.ts`
2. Update `StorageClient.putFile` to accept `mimeType` and `filename`, use them in `fileHeaders` with `Content-Disposition: inline`
3. Add `DocumentViewerPage.tsx` -- full-screen viewer with iframe (PDF) or img (image), plus Download button
4. Update `App.tsx` to handle `?view=BLOBID` param -- store in sessionStorage if not logged in, resolve after login
5. Update `excelExport.ts` to accept and embed app base URL in 'Uploaded' hyperlinks
6. Update `HomePage.tsx` to pass `window.location.origin + window.location.pathname` when calling generateExcel
