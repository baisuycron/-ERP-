# Template execution contract

- **Reference:** `C:\Users\Administrator.DESKTOP-734BMB4\Desktop\发票管理操作手册-供应商平台.docx`
- **Reference SHA-256:** `f67333e0e2310df443a6fbd2d61b513efef4a321606d8262a49e48336c1f41cd`
- **Reference evidence:** one A4 portrait section (8.268 x 11.693 in); margins L/R 1.25 in, T/B 1.00 in; 227 body paragraphs; 34 inline images; no tables. The requested output is a new manual, so invoice-specific body text and screenshots are intentionally removed while the source document's style definitions and page system are retained.
- **Render evidence:** the required LibreOffice renderer is unavailable on this host (`WinError 2` while starting the converter). Structural evidence was collected with `python-docx`, `section_audit.py`, `style_lint.py`, and `heading_audit.py`; final output must receive structural QA and the render limitation must be disclosed.

## Page system and recurring components

- Retain source A4 portrait geometry and blank header/footer system.
- Reuse and normalize the source title/heading hierarchy: `Title`, `Heading 1`, `Heading 2`, `Heading 3`, and `Normal`.
- Reference content flow: title; `Heading 1` core overview; `Heading 1` operation flow; `Heading 2` feature module; `Heading 3` numbered operation topics; short path, steps, and notes in normal paragraphs.
- The source contains screenshot-only paragraphs between narrative blocks. The new manual has no verified live screenshots, so those slots are intentionally omitted rather than filled with invented UI evidence.

## Content slots

1. **Title:** `【操作手册】限时购1-供应商平台`.
2. **Core overview:** verified prototype scope and key configuration objects.
3. **Operation flow / 限时购1:** list, create, product/SKU configuration, save validation, edit and single-product termination, detail view, status interpretation, and prototype boundaries.
4. **Notes:** explicitly state that activity buyer range and buyer grouping have been removed from 限时购1, and distinguish UI prototype behavior from backend transaction behavior.

## Fidelity gates

- Preserve the reference document unchanged and generate a separate DOCX.
- Use A4 portrait, the retained style names, title and three heading levels, short action-path paragraphs, numbered steps, and note paragraphs.
- Do not claim unimplemented persistence, stock deduction, buyer-side price calculation, or activity early-termination behavior as production capability.
