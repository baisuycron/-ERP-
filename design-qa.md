**Source visual truth**

- User correction screenshot: `C:\Users\THUNDE~1\AppData\Local\Temp\codex-clipboard-36c6974a-4a6f-48ad-89bc-d368b22be4bb.png`
- Source pixels: 1932 × 1359.
- Intended state: 平台中心原有框架，店铺菜单展开并新增“店铺管理”；用户明确取消整页 1:1 复刻，要求点击前后框架不发生跳动。

**Implementation evidence**

- Browser-rendered screenshot: `D:\Thunderobot\GitHub\-ERP-\outputs\platform-shop-management-stable-shell.png`
- Side-by-side comparison: `D:\Thunderobot\GitHub\-ERP-\outputs\platform-shop-management-shell-comparison.png`
- URL: `http://127.0.0.1:6173/`
- CSS viewport: 2048 × 1079; device scale factor: 1.
- Implementation pixels: 2047 × 1079（平台工作区保留滚动条宽度）。
- State: 平台中心 > 店铺 > 店铺管理，默认筛选条件与单条店铺数据。

**Density and normalization**

- Source and implementation were not treated as the same content viewport because the user changed the target from full-page fidelity to shell stability.
- For the combined visual check, both screenshots were proportionally normalized to 700px height without cropping or density-dependent findings.
- Exact shell dimensions were additionally read from the browser before and after navigation.

**Full-view comparison evidence**

- The source invoice page and the implementation store-management page use the same existing platform shell: sidebar hierarchy, header tabs, logo treatment, top actions, workspace background, and menu spacing remain consistent.
- The store-management content changes as intended, while the surrounding platform frame remains fixed.

**Focused region comparison evidence**

- Focused region: left navigation, logo/header, and workspace boundary.
- Invoice page metrics: sidebar 132px, top bar 56px, workspace left 132px, workspace width 1916px.
- Store-management page metrics: sidebar 132px, top bar 56px, workspace left 132px, workspace width 1916px.
- Logo background is the same existing platform gradient in both states.
- Browser comparison result: `stable: true`.

**Required fidelity surfaces**

- Fonts and typography: existing Microsoft YaHei / PingFang SC fallback and established platform weights are preserved; no page-specific shell typography overrides remain.
- Spacing and layout rhythm: platform shell dimensions are identical before and after clicking “店铺管理”; only the workspace content changes.
- Colors and visual tokens: existing platform background, border, text, accent, and action colors are reused.
- Image quality and asset fidelity: the temporary generated logo image was removed; the project’s existing logo treatment is preserved.
- Copy and content: the new menu label is “店铺管理”; store filters, table headings, row actions, and pagination use the requested Chinese copy.

**Interaction verification**

- “发票管理” → “店铺管理” navigation tested.
- Store name filtering tested with a non-matching value; the empty state appeared.
- Reset tested; the default row was restored.
- Primary filters, tabs, batch operation selector, checkboxes, row actions, and pagination controls are interactive.
- Browser console errors checked: none.
- Production build completed successfully.

**Comparison history**

- Pass 1 finding [P1]: the initial 1:1 treatment introduced a 153px sidebar, 59px top bar, replacement logo image, different top actions, and collapsed unrelated submenus, creating a visible shell jump.
- Fix: removed all store-management-specific shell overrides, restored the original sidebar/menu behavior and top actions, and removed the temporary image asset.
- Post-fix evidence: invoice and store-management shell metrics are identical, and the combined comparison shows the same platform frame around different content pages.

**Findings**

- No actionable P0, P1, or P2 issues remain for the revised requirement.

**Open Questions**

- None.

**Implementation Checklist**

- [x] Keep the original platform shell unchanged.
- [x] Add “店铺管理” under the store menu.
- [x] Open a dedicated store-management content page.
- [x] Preserve all existing top actions and expanded submenu behavior.
- [x] Verify navigation, filtering, reset, build, and browser console.

**Follow-up Polish**

- No blocking follow-up is required.

final result: passed
