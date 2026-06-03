# US invoice test samples (GovLetter bookkeeping / OCR)

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
