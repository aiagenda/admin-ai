#!/usr/bin/env python3
"""Realistic synthetic US notice PDFs for NoticeIQ QA. NOT real IRS/state/bank mail."""
from __future__ import annotations

import zipfile
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
US_ROOT = ROOT / "test-documents" / "us"
W, H = letter
LM = 0.65 * inch
RM = W - 0.65 * inch


def _wm(c: canvas.Canvas) -> None:
    c.saveState()
    c.setFillColorRGB(0.92, 0.92, 0.92)
    c.setFont("Helvetica-Bold", 26)
    c.translate(W / 2, H / 2)
    c.rotate(32)
    c.drawCentredString(0, 0, "SAMPLE — NOT A GOVERNMENT DOCUMENT")
    c.restoreState()


def _irs_top(c: canvas.Canvas, code: str, subtitle: str) -> float:
    y = H - LM
    c.setFont("Helvetica-Bold", 10)
    c.drawString(LM, y, "Department of the Treasury")
    c.setFont("Helvetica", 9)
    c.drawString(LM, y - 12, "Internal Revenue Service")
    c.setFont("Helvetica-Bold", 24)
    c.drawRightString(RM, y, code)
    c.setFont("Helvetica", 8)
    c.drawRightString(RM, y - 14, subtitle)
    c.setStrokeColor(colors.black)
    c.line(LM, y - 26, RM, y - 26)
    return y - 38


def _meta_block(c: canvas.Canvas, y: float, rows: list[tuple[str, str]]) -> float:
    c.setFont("Helvetica", 8)
    for label, val in rows:
        c.setFont("Helvetica-Bold", 8)
        c.drawString(LM, y, label)
        c.setFont("Helvetica", 8)
        c.drawString(LM + 95, y, val)
        y -= 11
    return y - 6


def _address(c: canvas.Canvas, y: float) -> float:
    c.setFont("Helvetica", 9)
    for line in [
        "JANE Q. TAXPAYER",
        "123 MAIN STREET APT 4B",
        "SAN FRANCISCO CA 94105-1234",
    ]:
        c.drawString(LM, y, line)
        y -= 12
    return y - 10


def _box(c: canvas.Canvas, x: float, y: float, w: float, h: float, fill=None) -> None:
    if fill:
        c.setFillColor(fill)
        c.rect(x, y, w, h, fill=1, stroke=0)
    c.setFillColor(colors.black)
    c.setStrokeColor(colors.black)
    c.rect(x, y, w, h, fill=0, stroke=1)


def _amount_table(c: canvas.Canvas, y: float, rows: list[tuple[str, str]], total: str) -> float:
    col1, col2 = LM, RM - 80
    row_h = 16
    table_w = RM - LM
    n = len(rows) + 1
    _box(c, LM, y - n * row_h, table_w, n * row_h, colors.HexColor("#f5f5f5"))
    cy = y - 12
    c.setFont("Helvetica-Bold", 8)
    c.drawString(col1 + 4, cy, "Description")
    c.drawRightString(col2, cy, "Amount")
    cy -= row_h
    c.setFont("Helvetica", 8)
    for desc, amt in rows:
        c.drawString(col1 + 4, cy, desc)
        c.drawRightString(col2, cy, amt)
        cy -= row_h
    c.setFont("Helvetica-Bold", 9)
    c.drawString(col1 + 4, cy, "TOTAL AMOUNT DUE")
    c.drawRightString(col2, cy, total)
    return y - n * row_h - 14


def build_cp14(path: Path) -> None:
    c = canvas.Canvas(str(path), pagesize=letter)
    _wm(c)
    y = _irs_top(c, "CP14", "Balance Due — First Notice")
    y = _meta_block(c, y, [
        ("Notice number:", "CP14 123-456-78901"),
        ("Tax year:", "2024"),
        ("Form:", "1040  U.S. Individual Income Tax Return"),
        ("Notice date:", "April 15, 2026"),
        ("TIN (last 4):", "XX-XXX1234"),
    ])
    y = _address(c, y)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(LM, y, "What you owe")
    y -= 16
    c.setFont("Helvetica", 9)
    c.drawString(LM, y, "We charged your account as follows. Pay the total amount due by May 6, 2026 to avoid additional")
    y -= 12
    c.drawString(LM, y, "penalties and interest. If you already paid, allow 3 weeks for processing.")
    y -= 18
    y = _amount_table(c, y, [
        ("Tax", "$1,089.00"),
        ("Failure-to-pay penalty", "$98.45"),
        ("Interest", "$60.44"),
    ], "$1,247.89")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(LM, y, "What you need to do by May 6, 2026")
    y -= 14
    for bullet in [
        "• Pay $1,247.89 using IRS Direct Pay, debit/credit card, or check with Form 1040-V payment voucher.",
        "• If you cannot pay in full, request an installment agreement (Form 9465) at irs.gov/payments.",
        "• If you disagree, mail a signed explanation with supporting documents before the due date.",
    ]:
        c.setFont("Helvetica", 8)
        c.drawString(LM + 8, y, bullet)
        y -= 22
    _box(c, LM, 1.2 * inch, RM - LM, 1.0 * inch, colors.HexColor("#fafafa"))
    c.setFont("Helvetica", 7)
    c.drawString(LM + 6, 1.85 * inch, "Detach and return with payment — Form 1040-V payment voucher (sample)")
    c.drawString(LM + 6, 1.65 * inch, "Make check payable to: United States Treasury")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(LM + 6, 1.45 * inch, "Amount due:  $1,247.89")
    c.setFont("Helvetica", 7)
    c.drawString(LM + 6, 1.25 * inch, "Notice CP14  •  Tax year 2024  •  TIN ending 1234")
    c.setFont("Helvetica", 6)
    c.drawString(LM, 0.55 * inch, "Page 1 of 2  •  Catalog Number 59874B  •  SAMPLE FOR SOFTWARE TESTING ONLY")
    c.showPage()
    _wm(c)
    y = _irs_top(c, "CP14", "Page 2 — Additional information")
    c.setFont("Helvetica-Bold", 9)
    c.drawString(LM, y, "Penalties and interest (IRC Sections 6651 and 6601)")
    y -= 14
    c.setFont("Helvetica", 8)
    for para in [
        "We charge penalties when tax is not paid by the due date and interest on unpaid tax until the balance is paid.",
        "For more information visit irs.gov/individuals/understanding-your-cp14-notice.",
        "If you need assistance, call the number on this notice. Have a copy of your tax return available.",
    ]:
        c.drawString(LM, y, para[:95])
        y -= 11
        if len(para) > 95:
            c.drawString(LM, y, para[95:190])
            y -= 11
    c.save()
    print("Wrote", path)


def build_lt11(path: Path) -> None:
    c = canvas.Canvas(str(path), pagesize=letter)
    _wm(c)
    y = _irs_top(c, "LT11", "Final Notice — Intent to Levy")
    y = _meta_block(c, y, [
        ("Letter number:", "LT11 987-654-32109"),
        ("Notice date:", "April 20, 2026"),
        ("TIN:", "12-3456789"),
    ])
    y = _address(c, y)
    _box(c, LM, y - 52, RM - LM, 52, colors.HexColor("#fff3cd"))
    c.setFont("Helvetica-Bold", 11)
    c.drawString(LM + 8, y - 18, "URGENT — ACTION REQUIRED WITHIN 30 DAYS")
    c.setFont("Helvetica", 9)
    c.drawString(LM + 8, y - 34, "We intend to levy your wages, bank accounts, or other property unless you take action.")
    y -= 62
    y = _amount_table(c, y, [
        ("Total unpaid balance", "$8,432.10"),
    ], "$8,432.10")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(LM, y, "Your Collection Due Process (CDP) rights")
    y -= 14
    for line in [
        "You have 30 days from the date of this letter to request a CDP hearing (Form 12153).",
        "You may also apply for an installment agreement (Form 9465) or Offer in Compromise (Form 656).",
        "Related: CP504 final notice; IRC Sections 6330 and 6331.",
    ]:
        c.setFont("Helvetica", 8)
        c.drawString(LM, y, line)
        y -= 13
    c.setFont("Helvetica", 6)
    c.drawString(LM, 0.55 * inch, "SAMPLE FOR SOFTWARE TESTING ONLY — NOT IRS")
    c.save()
    print("Wrote", path)


def build_cp2000(path: Path) -> None:
    c = canvas.Canvas(str(path), pagesize=letter)
    _wm(c)
    y = _irs_top(c, "CP2000", "Proposed Changes to Your Tax Return")
    y = _meta_block(c, y, [
        ("Notice number:", "CP2000 555-444-33322"),
        ("Tax year:", "2023"),
        ("Response due:", "June 15, 2026"),
    ])
    y = _address(c, y)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(LM, y, "Proposed changes based on information we received")
    y -= 16
    y = _amount_table(c, y, [
        ("Income not reported (Form 1099-NEC)", "$18,500.00"),
        ("Proposed additional tax", "$2,150.00"),
        ("Estimated interest (if applicable)", "$124.00"),
    ], "$2,274.00")
    c.setFont("Helvetica", 8)
    c.drawString(LM, y, "Sign and return the enclosed response form if you agree. If you disagree, explain with documents.")
    y -= 12
    c.drawString(LM, y, "You may file Form 1040-X if you need to amend your return.")
    c.setFont("Helvetica", 6)
    c.drawString(LM, 0.55 * inch, "SAMPLE — NOT IRS")
    c.save()
    print("Wrote", path)


def build_bank(path: Path) -> None:
    c = canvas.Canvas(str(path), pagesize=letter)
    _wm(c)
    c.setFillColor(colors.HexColor("#003366"))
    c.rect(0, H - 1.1 * inch, W, 1.1 * inch, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(LM, H - 0.55 * inch, "FIRST NATIONAL SAMPLE BANK")
    c.setFont("Helvetica", 9)
    c.drawString(LM, H - 0.75 * inch, "Collections Department  •  PO Box 1000, Wilmington, DE 19801")
    c.setFillColor(colors.black)
    y = H - 1.35 * inch
    c.setFont("Helvetica-Bold", 12)
    c.drawString(LM, y, "FINAL DEMAND BEFORE CHARGE-OFF")
    y -= 20
    c.setFont("Helvetica", 9)
    c.drawString(LM, y, "April 28, 2026")
    y -= 24
    y = _address(c, y)
    c.setFont("Helvetica", 9)
    c.drawString(LM, y, "Re: Visa credit card account ending 4421")
    y -= 20
    y = _amount_table(c, y, [
        ("Past due balance", "$4,892.17"),
        ("Late fees", "$75.00"),
        ("Interest accrued", "$212.33"),
    ], "$5,179.50")
    c.setFont("Helvetica", 8)
    for line in [
        "You must pay within 10 days to avoid charge-off and credit bureau reporting.",
        "This is an attempt to collect a debt. Any information obtained will be used for that purpose.",
        "SAMPLE FICTIONAL BANK — FOR SOFTWARE TESTING ONLY",
    ]:
        c.drawString(LM, y, line)
        y -= 12
    c.save()
    print("Wrote", path)


def build_ca_ftb(path: Path) -> None:
    c = canvas.Canvas(str(path), pagesize=letter)
    _wm(c)
    c.setFillColor(colors.HexColor("#003f72"))
    c.rect(LM, H - LM - 40, 2.2 * inch, 36, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(LM + 8, H - LM - 26, "FTB")
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(LM + 2.4 * inch, H - LM - 18, "Franchise Tax Board — State of California")
    y = H - LM - 55
    c.setFont("Helvetica-Bold", 12)
    c.drawString(LM, y, "NOTICE OF TAX DUE")
    y -= 18
    y = _meta_block(c, y, [
        ("Notice date:", "April 25, 2026"),
        ("Account:", "1234-5678-9012"),
        ("Tax year:", "2024"),
    ])
    y = _address(c, y)
    y = _amount_table(c, y, [
        ("Tax", "$2,980.00"),
        ("Penalties", "$312.55"),
        ("Interest", "$120.00"),
    ], "$3,412.55")
    c.setFont("Helvetica", 8)
    c.drawString(LM, y, "Pay within 30 days at ftb.ca.gov/pay. Request a payment plan if needed.")
    c.setFont("Helvetica", 6)
    c.drawString(LM, 0.55 * inch, "SAMPLE — NOT CALIFORNIA FTB")
    c.save()
    print("Wrote", path)


def build_ssa(path: Path) -> None:
    c = canvas.Canvas(str(path), pagesize=letter)
    _wm(c)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(LM, H - LM, "Social Security Administration")
    c.setFont("Helvetica", 9)
    c.drawString(LM, H - LM - 14, "Office of Overpayment Recovery")
    c.line(LM, H - LM - 22, RM, H - LM - 22)
    y = H - LM - 36
    c.setFont("Helvetica-Bold", 12)
    c.drawString(LM, y, "Notice of Overpayment")
    y -= 20
    y = _address(c, y)
    y = _amount_table(c, y, [
        ("Benefit overpaid (Jan–Mar 2026)", "$1,860.00"),
    ], "$1,860.00")
    c.setFont("Helvetica", 8)
    c.drawString(LM, y, "Repay within 30 days or request waiver (Form SSA-561).")
    c.setFont("Helvetica", 6)
    c.drawString(LM, 0.55 * inch, "SAMPLE — NOT SSA")
    c.save()
    print("Wrote", path)


def main() -> None:
    specs = [
        (US_ROOT / "federal" / "irs" / "01_IRS_CP14_balance_due_sample.pdf", build_cp14),
        (US_ROOT / "federal" / "irs" / "02_IRS_LT11_intent_to_levy_sample.pdf", build_lt11),
        (US_ROOT / "federal" / "irs" / "03_IRS_CP2000_proposed_changes_sample.pdf", build_cp2000),
        (US_ROOT / "federal" / "ssa" / "04_SSA_overpayment_sample.pdf", build_ssa),
        (US_ROOT / "state" / "CA" / "05_CA_FTB_balance_due_sample.pdf", build_ca_ftb),
        (US_ROOT / "civil" / "bank" / "06_bank_collection_sample.pdf", build_bank),
    ]
    for path, fn in specs:
        path.parent.mkdir(parents=True, exist_ok=True)
        fn(path)
    legacy = ROOT / "test-documents" / "irs"
    legacy.mkdir(parents=True, exist_ok=True)
    for name in ["01_IRS_CP14_balance_due_sample.pdf", "02_IRS_LT11_intent_to_levy_sample.pdf", "03_IRS_CP2000_proposed_changes_sample.pdf"]:
        src = US_ROOT / "federal" / "irs" / name
        (legacy / name).write_bytes(src.read_bytes())
    zip_path = ROOT / "test-documents" / "NoticeIQ_US_test_pack.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for p, _ in specs:
            zf.write(p, f"us/{p.relative_to(US_ROOT).as_posix()}")
    print("Wrote", zip_path)
    desktop = Path.home() / "Desktop" / "us"
    if desktop.parent.exists():
        import shutil
        if desktop.exists():
            shutil.rmtree(desktop)
        shutil.copytree(US_ROOT, desktop)
        print("Copied to", desktop)


if __name__ == "__main__":
    main()
