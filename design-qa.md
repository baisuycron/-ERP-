**Source visual truth**

- Browser Comment 1 additional attached image (conversation attachment; no local filesystem path).

**Implementation evidence**

- Screenshot: `D:\Thunderobot\GitHub\-ERP-\.tools\batch-invoice-type-sheet-qa.png`
- URL: `http://127.0.0.1:5173/`
- Viewport: 1055 × 898; embedded mobile viewport: 390 × 844.
- State: 批量申请开票页面，订单 20260212022895774 的发票类型底部选择面板已打开。

**Full-view comparison evidence**

- The implementation keeps the batch application page visible under a neutral translucent mask.
- The selector is anchored to the mobile viewport bottom, uses an inset white sheet with rounded top corners, and presents two centered options separated by a thin divider.
- The sheet remains flush to the mobile viewport bottom and is independent of the order-list scroll position.

**Focused region comparison evidence**

- Focused region: bottom invoice-type selector.
- Typography: Chinese UI font fallback, 22px medium-weight centered option labels, matching the reference hierarchy.
- Spacing/layout: 14px horizontal inset, 68px option rows, 24px top radius, full-width tappable rows.
- Colors/tokens: white sheet, #111827 labels, #eceef2 divider, rgba(17, 24, 39, 0.36) mask.
- Image quality/assets: no image assets are present in the reference selector; no placeholders or approximated image assets were introduced.
- Copy/content: “电子普通发票” and “电子增值税专用发票” match the reference.

**Findings**

- No actionable P0, P1, or P2 visual mismatches remain.

**Open Questions**

- None.

**Implementation Checklist**

- [x] Replace the separate picker page with an in-place bottom sheet.
- [x] Close on backdrop click.
- [x] Apply the selected invoice type and close the sheet.
- [x] Keep available options driven by the selected invoice title.
- [x] Respect reduced-motion preferences and keyboard focus visibility.
- [x] Verify production build and browser interaction.

**Patches made**

- Moved the selector to the phone viewport layer so it is unaffected by list scrolling.
- Matched the reference inset, rounded sheet, divider, mask, option typography, and bottom anchoring.
- Preserved existing per-order validation and invoice-type option derivation.

**Follow-up Polish**

- None required for this scoped interaction.

final result: passed
