# US test documents (GovLetter)

Synthetic PDFs for upload QA — **not** real government mail.

## Download (recommended)

**Complete pack (38 notices + federal/state/civil + invoices + handwritten PNGs):**

- After deploy: https://www.govletter.com/downloads/GovLetter_US_complete_test_pack.zip
- In repo: `public/downloads/GovLetter_US_complete_test_pack.zip`

**Invoices / bookkeeping only:** `test-documents/us/invoices/GovLetter_US_invoice_test_pack.zip`

See **US_TEST_MANIFEST.md** for file → `doc_type` mapping.

## Regenerate

```bash
npm run test-docs:all
```

## App usage

| Flow | Route | Files |
|------|-------|-------|
| Official notices | Upload | `01`–`38` PDFs in pack `/notices/` |
| Invoices & receipts | Bookkeeping | `/invoices_typed/`, `/invoices_handwritten/` |
