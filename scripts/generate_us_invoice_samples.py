#!/usr/bin/env python3
"""Synthetic US invoice PDFs + handwritten-style PNGs for bookkeeping/OCR QA."""
from __future__ import annotations

import random
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "test-documents" / "us" / "invoices"
W, H = letter
LM = 0.75 * inch
RM = W - 0.75 * inch

SAMPLES = [
    {
        "file": "01_contractor_plumbing_invoice.pdf",
        "title": "INVOICE",
        "vendor": "Bay Area Plumbing LLC",
        "addr": "1847 Mission St, San Francisco, CA 94103",
        "ein": "94-3829104",
        "inv": "BAP-2026-1042",
        "date": "February 18, 2026",
        "due": "March 4, 2026",
        "buyer": "Jane Q. Taxpayer",
        "buyer_addr": "123 Main St Apt 4B, San Francisco, CA 94105",
        "rows": [
            ("Emergency drain repair (2 hrs)", "1", "185.00", "370.00"),
            ("PVC parts & fittings", "1", "48.50", "48.50"),
        ],
        "subtotal": "418.50",
        "tax_label": "Sales tax (8.625%)",
        "tax": "36.09",
        "total": "454.59",
    },
    {
        "file": "02_office_supplies_staples.pdf",
        "title": "TAX INVOICE",
        "vendor": "Staples Business Advantage",
        "addr": "500 Staples Dr, Framingham, MA 01702",
        "ein": "04-2896127",
        "inv": "STA-8849201",
        "date": "February 10, 2026",
        "due": "March 12, 2026",
        "buyer": "GovLetter Demo LLC",
        "buyer_addr": "548 Market St, San Francisco, CA 94104",
        "rows": [
            ("Copy paper 20lb (10 reams)", "10", "42.99", "429.90"),
            ("HP 64XL ink cartridge", "2", "38.49", "76.98"),
            ("File folders letter size (box)", "3", "12.99", "38.97"),
        ],
        "subtotal": "545.85",
        "tax_label": "CA sales tax",
        "tax": "47.08",
        "total": "592.93",
    },
    {
        "file": "03_hotel_receipt_marriott.pdf",
        "title": "GUEST FOLIO / INVOICE",
        "vendor": "Marriott San Francisco",
        "addr": "780 Mission St, San Francisco, CA 94103",
        "ein": "52-1234567",
        "inv": "MSF-260214-8821",
        "date": "February 14, 2026",
        "due": "Paid — corporate card",
        "buyer": "Alex Rivera",
        "buyer_addr": "Conference attendee — Room 1214",
        "rows": [
            ("Room rate (2 nights)", "2", "289.00", "578.00"),
            ("City occupancy tax", "1", "34.68", "34.68"),
            ("Wi-Fi premium", "1", "19.99", "19.99"),
        ],
        "subtotal": "632.67",
        "tax_label": "Sales tax",
        "tax": "54.56",
        "total": "687.23",
    },
    {
        "file": "04_saas_subscription_quickbooks.pdf",
        "title": "INVOICE",
        "vendor": "Intuit Inc. — QuickBooks Online",
        "addr": "2700 Coast Ave, Mountain View, CA 94043",
        "ein": "77-0034661",
        "inv": "INT-2026-02-884201",
        "date": "February 1, 2026",
        "due": "February 1, 2026",
        "buyer": "GovLetter Demo LLC",
        "buyer_addr": "548 Market St, San Francisco, CA 94104",
        "rows": [
            ("QuickBooks Online Plus (monthly)", "1", "90.00", "90.00"),
        ],
        "subtotal": "90.00",
        "tax_label": "Tax",
        "tax": "0.00",
        "total": "90.00",
    },
    {
        "file": "05_landscaping_services.pdf",
        "title": "INVOICE",
        "vendor": "Green Lawn & Tree Care",
        "addr": "PO Box 442, Austin, TX 78701",
        "ein": "82-5519023",
        "inv": "GLTC-1188",
        "date": "February 22, 2026",
        "due": "Upon receipt",
        "buyer": "Robert & Maria Chen",
        "buyer_addr": "902 Oak Hill Dr, Austin, TX 78704",
        "rows": [
            ("Spring cleanup & mulch (labor)", "4", "65.00", "260.00"),
            ("Oak tree trim — backyard", "1", "320.00", "320.00"),
            ("Disposal fee", "1", "45.00", "45.00"),
        ],
        "subtotal": "625.00",
        "tax_label": "TX sales tax (8.25%)",
        "tax": "51.56",
        "total": "676.56",
    },
]

HANDWRITTEN = [
    {
        "file": "handwritten_01_contractor_job.png",
        "vendor": "Mike's Handyman",
        "phone": "(415) 555-0192",
        "inv": "MH-47",
        "date": "2/19/26",
        "buyer": "J. Taxpayer — 123 Main St",
        "lines": [
            ("Fix kitchen faucet", "2 hrs @ $85", "$170"),
            ("Parts (washer kit)", "", "$18"),
            ("Trip charge", "", "$35"),
        ],
        "total": "$223.00",
        "note": "Payable: Venmo @mikeshandyman or check",
    },
    {
        "file": "handwritten_02_catering_receipt.png",
        "vendor": "Rosie's Catering",
        "phone": "510-555-4421",
        "inv": "#208",
        "date": "Feb 8 2026",
        "buyer": "Office lunch — GovLetter team",
        "lines": [
            ("Sandwich platter (12)", "", "$144"),
            ("Salad bowl lg", "", "$38"),
            ("Delivery + tip", "", "$22"),
        ],
        "total": "$204.00",
        "note": "Thank you! — Rosie",
    },
    {
        "file": "handwritten_03_auto_repair.png",
        "vendor": "Joe's Garage",
        "phone": "(512) 555-8810",
        "inv": "1844",
        "date": "2/15/26",
        "buyer": "Maria Chen — 2019 Honda CR-V",
        "lines": [
            ("Oil change synthetic", "", "$72"),
            ("Air filter", "", "$24"),
            ("Labor", "1 hr", "$95"),
        ],
        "total": "$191.00",
        "note": "Net 15 — cash/check OK",
    },
    {
        "file": "handwritten_04_freelance_design.png",
        "vendor": "Sam Ortiz Design",
        "phone": "sam@design.io",
        "inv": "SO-2026-03",
        "date": "March 1, 2026",
        "buyer": "GovLetter LLC",
        "lines": [
            ("Logo refresh concepts", "8 hrs", "$800"),
            ("Social templates x5", "flat", "$250"),
        ],
        "total": "$1,050.00",
        "note": "1099-NEC will be issued — EIN 88-1234567",
    },
    {
        "file": "handwritten_05_farmers_market.png",
        "vendor": "Valley Fresh Farm Stand",
        "phone": "",
        "inv": "—",
        "date": "2/22/26",
        "buyer": "Walk-in customer",
        "lines": [
            ("Organic eggs (2 dz)", "", "$14"),
            ("Heirloom tomatoes 3lb", "", "$12"),
            ("Honey jar", "", "$18"),
        ],
        "total": "$44.00",
        "note": "CASH ONLY — no receipt reprints",
    },
]


def _wm(c: canvas.Canvas) -> None:
    c.saveState()
    c.setFillColorRGB(0.93, 0.93, 0.93)
    c.setFont("Helvetica-Bold", 22)
    c.translate(W / 2, H / 2)
    c.rotate(28)
    c.drawCentredString(0, 0, "SAMPLE — FICTITIOUS INVOICE")
    c.restoreState()


def _typed_pdf(path: Path, s: dict) -> None:
    c = canvas.Canvas(str(path), pagesize=letter)
    _wm(c)
    y = H - LM
    c.setFont("Helvetica-Bold", 18)
    c.drawString(LM, y, s["title"])
    y -= 28
    c.setFont("Helvetica-Bold", 11)
    c.drawString(LM, y, s["vendor"])
    c.setFont("Helvetica", 9)
    y -= 14
    c.drawString(LM, y, s["addr"])
    y -= 12
    c.drawString(LM, y, f"EIN: {s['ein']}")
    y -= 22
    c.setFont("Helvetica-Bold", 9)
    c.drawString(LM, y, "Bill to:")
    c.setFont("Helvetica", 9)
    y -= 12
    c.drawString(LM, y, s["buyer"])
    y -= 12
    c.drawString(LM, y, s["buyer_addr"])
    rx = RM - 180
    ty = H - LM - 28
    for label, val in [
        ("Invoice #", s["inv"]),
        ("Date", s["date"]),
        ("Due", s["due"]),
    ]:
        c.setFont("Helvetica-Bold", 8)
        c.drawString(rx, ty, label)
        c.setFont("Helvetica", 8)
        c.drawString(rx + 52, ty, val)
        ty -= 12
    y -= 20
    cols = [LM, LM + 220, LM + 280, LM + 340, RM - 60]
    headers = ["Description", "Qty", "Unit", "Amount"]
    c.setFont("Helvetica-Bold", 8)
    for i, h in enumerate(headers):
        c.drawString(cols[i] + 4, y, h)
    y -= 4
    c.line(LM, y, RM, y)
    y -= 14
    c.setFont("Helvetica", 9)
    for desc, qty, unit, amt in s["rows"]:
        c.drawString(cols[0] + 4, y, desc[:48])
        c.drawString(cols[1] + 4, y, qty)
        c.drawString(cols[2] + 4, y, f"${unit}")
        c.drawRightString(RM - 8, y, f"${amt}")
        y -= 16
    y -= 10
    for label, val in [
        ("Subtotal", f"${s['subtotal']}"),
        (s["tax_label"], f"${s['tax']}"),
        ("TOTAL DUE", f"${s['total']}"),
    ]:
        c.setFont("Helvetica-Bold" if "TOTAL" in label else "Helvetica", 9)
        c.drawString(LM + 320, y, label)
        c.drawRightString(RM - 8, y, val)
        y -= 14
    c.setFont("Helvetica-Oblique", 7)
    c.drawString(LM, 0.9 * inch, "Synthetic test document for GovLetter invoice OCR — not a real vendor invoice.")
    c.save()


def _hand_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Bradley Hand Bold.ttf",
        "/System/Library/Fonts/Supplemental/Noteworthy.ttc",
        "/Library/Fonts/Comic Sans MS.ttf",
    ]
    for p in candidates:
        if Path(p).exists():
            try:
                return ImageFont.truetype(p, size)
            except OSError:
                continue
    return ImageFont.load_default()


def _handwritten_png(path: Path, s: dict) -> None:
    random.seed(s["file"])
    w, h = 850, 1100
    img = Image.new("RGB", (w, h), (252, 250, 245))
    draw = ImageDraw.Draw(img)
    title_f = _hand_font(36)
    body_f = _hand_font(22)
    small_f = _hand_font(18)

    def scribble_line(x1: int, y1: int, x2: int, y2: int) -> None:
        pts = []
        steps = max(abs(x2 - x1), abs(y2 - y1)) // 3 + 5
        for i in range(steps + 1):
            t = i / steps
            pts.append((int(x1 + (x2 - x1) * t) + random.randint(-2, 2), int(y1 + (y2 - y1) * t) + random.randint(-2, 2)))
        draw.line(pts, fill=(40, 40, 55), width=2)

    y = 48
    draw.text((48, y), s["vendor"], fill=(20, 30, 80), font=title_f)
    y += 52
    if s["phone"]:
        draw.text((48, y), s["phone"], fill=(60, 60, 60), font=small_f)
        y += 32
    draw.text((48, y), f"Invoice {s['inv']}    Date: {s['date']}", fill=(40, 40, 40), font=body_f)
    y += 40
    draw.text((48, y), f"Customer: {s['buyer']}", fill=(40, 40, 40), font=body_f)
    y += 50
    scribble_line(48, y, w - 48, y)
    y += 24
    for desc, mid, amt in s["lines"]:
        draw.text((56, y), desc, fill=(30, 30, 30), font=body_f)
        if mid:
            draw.text((420, y), mid, fill=(80, 80, 80), font=small_f)
        draw.text((w - 130, y), amt, fill=(30, 30, 30), font=body_f)
        y += 38
    y += 16
    scribble_line(48, y, w - 48, y)
    y += 28
    draw.text((w - 220, y), f"Total: {s['total']}", fill=(10, 10, 10), font=title_f)
    y += 60
    draw.text((48, y), s["note"], fill=(100, 60, 40), font=small_f)
    draw.text((48, h - 56), "HANDWRITTEN SAMPLE — US small-business style bill", fill=(150, 150, 150), font=small_f)
    for _ in range(400):
        px, py = random.randint(0, w - 1), random.randint(0, h - 1)
        c = random.randint(235, 250)
        draw.point((px, py), fill=(c, c - 2, c - 4))
    img.save(path, "PNG")


def _write_readme() -> None:
    (OUT / "README.md").write_text(
        """# US invoice test samples (GovLetter bookkeeping / OCR)

Fictitious documents for invoice upload, OCR, and accountant export.

## Typed invoices (PDF)

| File | Scenario |
|------|----------|
| `typed_pdf/01_contractor_plumbing_invoice.pdf` | Home services + sales tax |
| `typed_pdf/02_office_supplies_staples.pdf` | B2B retail, line items |
| `typed_pdf/03_hotel_receipt_marriott.pdf` | Travel folio |
| `typed_pdf/04_saas_subscription_quickbooks.pdf` | SaaS subscription |
| `typed_pdf/05_landscaping_services.pdf` | Local services, TX tax |

## Handwritten-style (PNG)

In the US, small vendors often use handwritten bills: handyman, auto shops, catering, farmers markets, freelancers.

| File | Scenario |
|------|----------|
| `handwritten_png/handwritten_01_contractor_job.png` | Handyman |
| `handwritten_png/handwritten_02_catering_receipt.png` | Catering |
| `handwritten_png/handwritten_03_auto_repair.png` | Auto repair |
| `handwritten_png/handwritten_04_freelance_design.png` | Freelancer / 1099 |
| `handwritten_png/handwritten_05_farmers_market.png` | Cash farmers market |

## Regenerate

```bash
python3 scripts/generate_us_invoice_samples.py
```

Zip: `GovLetter_US_invoice_test_pack.zip`
""",
        encoding="utf-8",
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    typed_dir = OUT / "typed_pdf"
    hand_dir = OUT / "handwritten_png"
    typed_dir.mkdir(exist_ok=True)
    hand_dir.mkdir(exist_ok=True)

    for s in SAMPLES:
        _typed_pdf(typed_dir / s["file"], s)
        print("PDF", s["file"])

    for s in HANDWRITTEN:
        _handwritten_png(hand_dir / s["file"], s)
        print("PNG", s["file"])

    _write_readme()
    zip_path = OUT / "GovLetter_US_invoice_test_pack.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(OUT / "README.md", "README.md")
        for p in typed_dir.glob("*.pdf"):
            zf.write(p, f"typed_pdf/{p.name}")
        for p in hand_dir.glob("*.png"):
            zf.write(p, f"handwritten_png/{p.name}")

    print("ZIP", zip_path.relative_to(ROOT))


if __name__ == "__main__":
    main()
