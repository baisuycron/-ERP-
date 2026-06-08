from __future__ import annotations

import json
import re
from email import policy
from email.parser import BytesParser
from html.parser import HTMLParser
from pathlib import Path


BASE_DIR = Path(r"D:\Thunderobot\GitHub\-ERP-\outputs\km_invoice_prd_tests")
FILES = {
    "phase1": Path(r"C:\Users\Thunderobot\Desktop\PRD-发票一期需求.mhtml"),
    "phase2": Path(r"C:\Users\Thunderobot\Desktop\PRD-发票二期需求.mhtml"),
    "phase3": Path(r"C:\Users\Thunderobot\Desktop\PRD-发票三期需求.mhtml"),
}


class TextHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.skip_depth = 0

    def handle_starttag(self, tag: str, attrs) -> None:
        tag = tag.lower()
        if tag in {"script", "style", "noscript", "svg"}:
            self.skip_depth += 1
            return
        if tag in {"br", "p", "div", "section", "article", "tr", "li", "h1", "h2", "h3", "h4", "table"}:
            self.parts.append("\n")
        if tag in {"td", "th"}:
            self.parts.append("\t")

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in {"script", "style", "noscript", "svg"} and self.skip_depth:
            self.skip_depth -= 1
            return
        if tag in {"p", "div", "section", "article", "tr", "li", "h1", "h2", "h3", "h4", "table"}:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if self.skip_depth:
            return
        text = data.strip()
        if text:
            self.parts.append(text)

    def get_text(self) -> str:
        raw = "".join(self.parts)
        raw = raw.replace("\u200b", "").replace("\xa0", " ")
        raw = re.sub(r"[ \t]+\n", "\n", raw)
        raw = re.sub(r"\n[ \t]+", "\n", raw)
        raw = re.sub(r"\n{3,}", "\n\n", raw)
        raw = re.sub(r"[ \t]{2,}", "\t", raw)
        return raw.strip()


def decode_part(part) -> str:
    payload = part.get_payload(decode=True)
    if payload is None:
        return ""
    charset = part.get_content_charset() or "utf-8"
    try:
        return payload.decode(charset, errors="replace")
    except LookupError:
        return payload.decode("utf-8", errors="replace")


def extract_html(path: Path) -> tuple[str, list[dict[str, object]]]:
    msg = BytesParser(policy=policy.default).parsebytes(path.read_bytes())
    html_parts: list[str] = []
    images: list[dict[str, object]] = []
    for part in msg.walk():
        content_type = part.get_content_type()
        if content_type == "text/html":
            html_parts.append(decode_part(part))
        elif content_type.startswith("image/"):
            images.append({
                "content_type": content_type,
                "content_id": (part.get("Content-ID") or "").strip("<>"),
                "location": part.get("Content-Location") or "",
                "filename": part.get_filename() or "",
                "bytes": len(part.get_payload(decode=True) or b""),
            })
    if not html_parts:
        raw = path.read_text("utf-8", errors="replace")
        html_parts = [raw]
    return max(html_parts, key=len), images


def html_to_text(html: str) -> str:
    parser = TextHTMLParser()
    parser.feed(html)
    return parser.get_text()


def trim_to_prd(text: str, title: str) -> str:
    # KM exports include a long left navigation tree before the article. Keep from
    # the first actual PRD title/版本记录 onwards.
    candidates = [m.start() for m in re.finditer(re.escape(title), text)]
    start = candidates[-1] if candidates else -1
    if start < 0:
        m = re.search(r"#?版本记录|版本号\s+变更时间|一[、.]\s*需求背景", text)
        start = m.start() if m else 0
    tail_markers = ["仅供内部使用", "暂无赞赏", "全文评论"]
    end = len(text)
    for marker in tail_markers:
        idx = text.find(marker, start)
        if idx > 0:
            end = min(end, idx)
    return text[start:end].strip()


def section_outline(text: str) -> list[str]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    out = []
    pat = re.compile(r"^(#{0,6}\s*)?([一二三四五六七八九十]+[、.]\s*.+|[0-9]+(?:\.[0-9]+)*[、.，]?\s*.+|5\.[123].+)$")
    for line in lines:
        clean = re.sub(r"\s+", " ", line)
        if len(clean) <= 80 and pat.match(clean):
            out.append(clean)
    return out[:120]


def main() -> None:
    BASE_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {}
    titles = {
        "phase1": "PRD-发票一期需求",
        "phase2": "PRD-发票二期需求",
        "phase3": "PRD-发票三期需求",
    }
    for key, path in FILES.items():
        html, images = extract_html(path)
        text = trim_to_prd(html_to_text(html), titles[key])
        out_path = BASE_DIR / f"{key}_prd_text.txt"
        out_path.write_text(text, "utf-8")
        manifest[key] = {
            "source": str(path),
            "text_path": str(out_path),
            "text_chars": len(text),
            "image_count": len(images),
            "large_images": [img for img in images if int(img["bytes"]) > 20_000][:20],
            "outline": section_outline(text),
            "head": text[:1200],
        }
    (BASE_DIR / "invoice_prd_mhtml_extract_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        "utf-8",
    )
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
