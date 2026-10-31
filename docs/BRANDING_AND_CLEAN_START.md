# Tackly brand and clean start

## Shared identity

The canonical logo is `public/brand/tackly-mark.svg`: a warm sand clay tile, a raised folded note and a recessed charcoal check. Depth comes from restrained gradients, bevel lines and offset shapes, not blur filters. It is a vector design, readable at favicon size and independent of UI theme. Its standalone brand palette is intentionally embedded in the SVG; application components continue using design tokens.

`TacklyMark` reuses this asset in the main sidebar and authentication header. The nearby workspace/brand text supplies its accessible name, so the image is decorative rather than announced twice. Root metadata links the same SVG as the scalable browser icon. `src/app/favicon.ico` contains 16/32/48/64-pixel renditions; `src/app/apple-icon.png` is a 180-pixel rendition. Both raster assets come from rendering the canonical SVG. Re-render all renditions when changing the logo. Five unused framework starter SVGs were removed.

## No demo content in real workspaces

New local sessions start with zero notes. Signed-out/default taxonomy starts with no fabricated tags or categories. User-imported vocabulary remains available, and cloud taxonomy continues coming from its actual workspace. Standard empty columns remain editable board structure; personal columns are not reset. All views continue using the same real note records.

The old mock notes remain **test-only fixtures** for regression coverage; no production store or catalogue imports them.

On first hydration of pre-v2 `tackly:notes` persistence, migration removes only the eleven known legacy sample IDs when both owner=`mock-owner` and board=`mock-board`. It also removes duplicate copies of those IDs. Personal UUID notes, cloud records, same-titled user notes, different owners/boards, archived/trash records and imported vocabulary are preserved. The known sample IDs are treated as sample-origin notes even if edited. No cloud accounts, boards or notes are deleted.

Before removal, the original persisted state is saved once to the browser-only key `tackly:legacy-samples-backup:v1`. The backup is not sent to a server or included in downloadable source artifacts. If browser storage cannot save the backup, cleanup keeps the original notes visible and displays a retryable notice. After making browser storage writable, Retry cleanup or a later hydration completes cleanup. Successful data migration uses persistence version 2.

Source rollback does not overwrite browser data or undo cloud state. To recover the exact pre-cleanup local snapshot, use the backed-up `{state, version}` value as `tackly:notes` on a separate browser profile/copy first. Retain the current personal data before any snapshot restore: a full historical snapshot would otherwise replace notes created after cleanup. Ordinary app use never restores demo content automatically.

Evidence, exact commands, hashes and tested source rollback: `../../brand-cleanup-evidence/VERIFICATION.txt`.
