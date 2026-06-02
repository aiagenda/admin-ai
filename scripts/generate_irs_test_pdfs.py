#!/usr/bin/env python3
"""Generate small synthetic IRS-style PDFs for app testing. Not real IRS output."""
from __future__ import annotations

import zlib
from pathlib import Path


def _escape_pdf(s: str) -> str:
    return s.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")


def _build_text_stream(lines: list[str]) -> bytes:
    parts: list[str] = ["BT", "/F1 10 Tf", "72 760 Td"]
    for i, line in enumerate(lines):
        if i > 0:
            parts.append("0 -13 Td")
        parts.append(f"({_escape_pdf(line)}) Tj")
    parts.append("ET")
    return "\n".join(parts).encode("utf-8")


def write_minimal_pdf(lines: list[str], out_path: Path) -> None:
    stream = _build_text_stream(lines)
    compressed = zlib.compress(stream)
    stream_obj_num = 4
    font_obj_num = 5

    objects: dict[int, bytes] = {}
    objects[1] = b"<< /Type /Catalog /Pages 2 0 R >>"
    objects[2] = b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>"
    objects[3] = (
        f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        f"/Contents {stream_obj_num} 0 R /Resources << /Font << /F1 {font_obj_num} 0 R >> >> >>"
    ).encode("ascii")
    objects[font_obj_num] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
    objects[stream_obj_num] = (
        f"<< /Length {len(compressed)} /Filter /FlateDecode >>\nstream\n".encode("ascii")
        + compressed
        + b"\nendstream"
    )

    parts: list[bytes] = [b"%PDF-1.4\n"]
    offsets: list[int] = [0]

    for i in sorted(objects.keys()):
        offsets.append(sum(len(p) for p in parts))
        parts.append(f"{i} 0 obj\n".encode("ascii"))
        parts.append(objects[i])
        parts.append(b"\nendobj\n")

    xref_start = sum(len(p) for p in parts)
    xref_lines = [b"xref\n", f"0 {len(objects) + 1}\n".encode("ascii"), b"0000000000 65535 f \n"]
    for off in offsets[1:]:
        xref_lines.append(f"{off:010d} 00000 n \n".encode("ascii"))

    trailer = (
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_start}\n%%EOF\n"
    ).encode("ascii")

    out_path.write_bytes(b"".join(parts) + b"".join(xref_lines) + trailer)


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    out_dir = root / "test-documents" / "irs"
    out_dir.mkdir(parents=True, exist_ok=True)

    cp14 = [
        "Department of the Treasury — Internal Revenue Service",
        "Notice CP14 — Balance Due",
        "Tax Year: 2024   Form: 1040",
        "Taxpayer: SAMPLE TAXPAYER QA (SSN ending 1234)",
        "Our records show you owe $1,247.89 for the tax period shown above.",
        "This amount includes tax, penalties, and interest as of May 1, 2026.",
        "You must pay in full within 21 days from the date of this notice.",
        "Pay online: IRS Direct Pay (directpay.irs.gov) or use your IRS Online Account.",
        "If you cannot pay in full, you may request an installment agreement (Form 9465).",
        "If you disagree, respond in writing before the deadline with supporting documents.",
        "Reference: IRC Section 6651 (failure to pay) and Section 6601 (interest).",
        "For more information: https://www.irs.gov/individuals/understanding-your-cp14-notice",
        "— End of sample notice (not a real IRS document; for software testing only) —",
    ]

    lt11 = [
        "Department of the Treasury — Internal Revenue Service",
        "Letter LT11 — Final Notice — Notice of Intent to Levy",
        "and Your Right to a Collection Due Process (CDP) Hearing",
        "Taxpayer: SAMPLE TAXPAYER QA (EIN 12-3456789)",
        "Total unpaid balance: $8,432.10 (tax, penalties, and interest).",
        "We intend to levy your property or rights to property (including wages and bank accounts).",
        "IMPORTANT: You have 30 days from the date of this letter to request a CDP hearing.",
        "To request a CDP hearing, file Form 12153 with the office shown on this notice.",
        "You may also propose an installment agreement (Form 9465) or an Offer in Compromise (Form 656).",
        "Related notices may include CP504 (final notice before levy on certain payments).",
        "Legal references include Internal Revenue Code Sections 6330 and 6331.",
        "Official hub: https://www.irs.gov/individuals/understanding-your-irs-notice-or-letter",
        "— End of sample notice (not a real IRS document; for software testing only) —",
    ]

    cp2000 = [
        "Department of the Treasury — Internal Revenue Service",
        "Notice CP2000 — Proposed Changes to Your Tax Return",
        "Tax Year: 2023   Form: 1040",
        "Taxpayer: SAMPLE TAXPAYER QA",
        "We propose changes to your return based on information from third parties (W-2/1099).",
        "Proposed additional tax: $2,150.00 plus interest if you agree or do not respond.",
        "You must respond by the date shown on page 1 of this notice (typically within 60 days).",
        "If you agree, sign and return the response form with payment or a payment plan request.",
        "If you disagree, send a written explanation with documents by the response deadline.",
        "You may file Form 1040-X (Amended U.S. Individual Income Tax Return) if appropriate.",
        "See: https://www.irs.gov/individuals/understanding-your-cp2000-notice",
        "— End of sample notice (not a real IRS document; for software testing only) —",
    ]

    specs = [
        ("01_IRS_CP14_balance_due_sample.pdf", cp14),
        ("02_IRS_LT11_intent_to_levy_sample.pdf", lt11),
        ("03_IRS_CP2000_proposed_changes_sample.pdf", cp2000),
    ]

    for name, lines in specs:
        write_minimal_pdf(lines, out_dir / name)
        print("Wrote", out_dir / name)

    readme = out_dir / "README.txt"
    readme.write_text(
        """IRS minta PDF-ek — teszteléshez (NEM valódi IRS dokumentum)

Cél:
- Elemzés / playbook (irs_notice_balance_due, irs_notice_intent_to_levy, irs_notice_generic)
- Kapcsolódó űrlapok és Knowledge Base találatok kipróbálása

Fájlok:
1) 01_IRS_CP14_balance_due_sample.pdf  — CP14 / egyenleg
2) 02_IRS_LT11_intent_to_levy_sample.pdf — LT11 / végrehajtás + CDP + Form 12153
3) 03_IRS_CP2000_proposed_changes_sample.pdf — CP2000 / javasolt módosítás + 1040-X

Feltöltés: az app PDF-et fogad a dokumentum feltöltésnél.

Újragenerálás: python3 scripts/generate_irs_test_pdfs.py
""",
        encoding="utf-8",
    )
    print("Wrote", readme)


if __name__ == "__main__":
    main()
