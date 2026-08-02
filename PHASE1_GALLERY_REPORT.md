# Phase 1 Gallery Report — Candid Art Studios

Date: 2026-08-02

## Executive Summary

This Phase 1 work converted the Gallery from a media-first (Images/Videos selector) flow to a client-first flow. The Gallery now displays client cards immediately; clicking a client opens a single modal containing both the client's Photos and Videos. Photos are paginated (30 per page) with a Load More button. Videos are listed by filename (extensions removed) and play in a dedicated player area inside the modal. All changes were done incrementally and surgically, preserving the existing design, lightbox, and upload workflow. No commits or pushes were made.


## Files Modified / Added

Modified:

1. script.js
   - Why: Implement client-first gallery, modal photo pagination (Load More), unified client modal with photos & videos, safe path encoding, error handling for missing assets, and preserve the lightbox usage.
   - What changed (high-level):
     - Removed Images/Videos page-level selector behavior.
     - Added `loadAllClients()` to fetch and merge `/data/gallery-images.json` and `/data/gallery-videos.json` into a combined client map.
     - Reworked `renderClients()` to show one client card per client using safe encoded thumbnail paths.
     - Implemented `openClientModal(clientName, clientData)` to render:
       - Photos (first 30), Load More pagination, lazy-loaded images, skip missing images, use existing lightbox via `openLightboxFromSrc`.
       - Videos list (filenames with extensions removed), player area to play chosen video in-page (HTML5 video), poster fallback handling.
     - Added `encodePath()` helper used everywhere for safe path encoding (handles spaces, `&`, and special characters).
     - Ensured only `openClientModal()` opens the modal (i.e., the only code path that does `galleryModal.hidden = false`).
   - Risk: Low. Touches central gallery flow but preserves lightbox and other unaffected features.

2. style.css
   - Why: Add small UI rules for client modal photo grid, load-more button, and video player/list styling; ensure modal respects the HTML hidden attribute.
   - What changed:
     - Added `.gallery-modal[hidden] { display: none; }` to ensure modal is not shown by CSS when hidden attribute is present.
     - Added `.gallery-client-photos` grid and responsive rules; `.load-more`, `.video-player`, `.video-list`, `.video-item` styles.
   - Risk: Low. Non-intrusive visual changes scoped to the gallery modal.

3. index.html
   - Why: Remove the Images/Videos selector from the Gallery section (client-first requirement).
   - What changed:
     - Removed the `div#gallery-choices` containing Images/Videos buttons.
     - Left the `div#gallery-grid` container (client cards rendered by JS).
     - No other page sections modified.
   - Risk: Low.

Added (helpers, local-only):

4. generate-gallery-index.ps1 (previously added)
   - Purpose: Builds `/data/gallery-images.json` and `/data/gallery-videos.json` from local `images/` and `Videos/`. This is required because browsers cannot list server directories; the front-end consumes these JSON manifests.
   - Risk: Low. Local-only helper; does not change site behavior until run.

5. compress-videos.ps1 (previously added)
   - Purpose: Implements the UploadQueue → Videos compression workflow (uses included `ffmpeg` path); also generates posters and can optionally run the index generator.
   - Risk: Low. Local-only helper; preserves originals.

6. data/gallery-images.json, data/gallery-videos.json (sample files)
   - Purpose: Small sample manifests so the client-first UI can be tested immediately.
   - Risk: None.


## Bugs Found & Fixes

Bug #1 — Gallery modal appeared automatically on page load
- Symptom: The landing page showed an empty modal immediately.
- Root cause: CSS defined `.gallery-modal` with `display:flex` but did not hide the element when the HTML `hidden` attribute was present. The DOM had `hidden` but CSS overrode its visibility.
- Fix: Add `.gallery-modal[hidden] { display: none; }` in `style.css`. Also verified that no JS sets `galleryModal.hidden = false` during initialization; the modal is only opened by `openClientModal()`.

Bug #2 — Intermittent click behavior / runtime script error
- Symptom: Clicking gallery UI sometimes did nothing; event handlers didn't always attach.
- Root cause: A malformed template string and duplicated stray markup in `renderClients()` caused a JS parse/runtime problem in some browsers, preventing subsequent listener setup.
- Fix: Corrected `renderClients()` HTML generation and ensured proper escaping/encoding. Also added defensive checks before using fetched data.

Bug #3 — Paths with spaces and ampersands caused broken URLs
- Symptom: Filenames like `Mark & Trixie/Photos/SDE 4-58.jpg` failed to load or produced 404 in some browsers.
- Root cause: Path components were not properly URL-encoded before being used in `src` or CSS backgrounds.
- Fix: Added `encodePath()` helper that normalizes backslashes and encodes each path segment; used everywhere for `img.src`, `video.src`, `video.poster`, and `background-image` values.

Bug #4 — `_thumb` metadata exposed incorrectly
- Symptom: Metadata with `_thumb` sometimes surfaced in UI or in folder lists.
- Root cause: Client merging logic included keys starting with `_` when enumerating folders.
- Fix: The client modal ignores keys beginning with `_` when building photo/video lists; `_thumb` value is still used as the client thumbnail image (metadata value) but the key itself is never shown in UI.

Bug #5 — Missing assets stopped rendering
- Symptom: If a single image was missing, some render flows would halt or show broken images.
- Fix: Added `img.onerror` handler that removes the image element when it fails to load, allowing remaining images to display. If no images exist, shows "No photos available." Similarly, no videos shows "No videos available."


## Design & Implementation Details

1. Client-first approach
- On page load, `loadAllClients()` fetches both `data/gallery-images.json` and `data/gallery-videos.json` (if they exist), merges client entries, and renders one card per client into `#gallery-grid`.
- Client cards show a visual thumbnail (derived from `_thumb` if present, otherwise `images/banner.jpg`) and the client name. Clicking a client opens a single modal for that client.

2. Client modal structure (single modal)
- Photos (header shows count e.g., "Photos (348)")
  - Displays the first 30 photos in a grid `.gallery-client-photos`.
  - A "Load More" button loads the next 30 each click until exhausted.
  - Images are `loading="lazy"` and have `error` handlers to skip missing files.
  - Clicking a photo calls existing `openLightboxFromSrc()` to open the lightbox (preserving prior behavior).
- Videos (header shows count e.g., "Videos (4)")
  - A dedicated `.video-player` area at top of the section: clicking a filename loads the player.
  - A `.video-list` of clickable filename buttons (extensions removed). Clicking loads the selected video into the player and attempts autoplay.
  - Poster usage: player poster is set to `video-file.jpg` if available; if not, the player still works — fallback poster or browser default shown.

3. Metadata filtering
- Keys starting with `_` (e.g., `_thumb`) are never shown as folders in the modal. They are only used internally (e.g., `_thumb` value used for client card thumbnail image).

4. Encoding paths
- `encodePath()` converts paths like `Mark & Trixie/Photos/SDE 4-58.jpg` into a safe web URL by splitting on path separators, encoding each path component with `encodeURIComponent`, and rejoining with `/`.
- Used consistently for `img.src`, video `src`, player `poster`, and CSS `background-image`.


## Performance Improvements

1. Pagination for photos
- Only the first 30 images are rendered initially for each client. Each "Load More" adds the next 30.
- This prevents rendering hundreds of DOM nodes at once and keeps initial page load snappy.

2. Lazy loading images
- Image elements include `loading="lazy"` which defers loading until needed.

3. Minimal DOM updates
- Photos are appended in slices; no large reflows caused by rendering entire galleries.


## UI Improvements (visible)

- Client-first gallery listing on the main Gallery section. Users immediately see client cards.
- Unified modal per client with clearly separated Photos and Videos sections.
- Photos show counts and a Load More CTA enabling progressive reveal.
- Videos display human-readable names (extensions removed) and play in a dedicated player area.
- Thumbnails and the modal are mobile-friendly and responsive.


## Compatibility

- UploadQueue: Preserved. compress-videos.ps1 remains the intended local workflow to process raw uploads. (No changes to the workflow were required.)
- generate-gallery-index.ps1: Preserved. The index generator still creates the JSON manifests consumed by the front-end. The front-end expects the current JSON format (`data/gallery-images.json` / `data/gallery-videos.json` with `clients` object). If you change the generator, keep the same structure.
- compress-videos.ps1: Preserved as-is.
- Netlify: Compatible. The front-end uses static JSON under `/data/` and relative paths; Netlify will serve these files normally once committed.
- Localhost (python -m http.server 8000): Compatible. Test locally using the index generator and the static server.


## Remaining Issues / Notes (Phase 2 candidates)

1. Lightbox navigation through client photo sets: Currently clicking a photo opens the lightbox for that single image only and does not preload the client's full photo set for left/right navigation. If desirable, the lightbox can be fed the current client's photo list so users can navigate between photos inside the modal using Prev/Next.
2. Thumbnail generation: Current photos may be full-size images; consider generating smaller thumbnails (and a separate `thumbnails/` folder) to reduce bandwidth and speed up first render.
3. Video streaming optimizations: Serving many large MP4s from repo or Netlify may cause bandwidth limits. Consider migrating videos to a streaming-optimized host (Cloudinary, Vimeo, S3 + CloudFront) for performance.
4. Poster generation robustness: If poster generation fails (missing ffmpeg), video thumbnails fall back to `images/banner.jpg`. Consider adding a default poster per-client.
5. Accessibility: Keyboard navigation for modal and better ARIA labeling could be improved.
6. Caching and CDN headers: Consider cache-control for static assets and manifests for better client performance.


## Suggested Future Improvements (do NOT implement now)

- Implement client-level lightbox navigation (preload a client's photo list into the lightbox so Prev/Next cycles through client's photos).
- Generate and use low-res thumbnails for grid views; load full images in lightbox on demand.
- Add a server-side job or CI step to run `generate-gallery-index.ps1` before deploying so JSON manifests are always accurate.
- Consider moving videos to a streaming provider and store only pointers in the repo for better streaming performance.
- Add unit or integration tests for the JS gallery logic (where feasible) to reduce regressions.


---

All changes were made locally in the project workspace. No commits, pushes, or deployments were performed per instructions.

If you want, next steps I can take (choose one):
- Run `generate-gallery-index.ps1` locally and show the generated JSON here so you can test.
- Prepare a single commit with a clear message (I will not push) and show the git diff for your review.
- Implement Phase 2 items (thumbnail generation or lightbox navigation) after your approval.


