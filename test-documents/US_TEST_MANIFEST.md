# GovLetter US test document pack

Synthetic samples for **Upload** (official notices) and **Bookkeeping / Invoice upload** (receipts & invoices). Not real government mail.

## Quick download

| Pack | Use |
|------|-----|
| **Complete pack (all scenarios)** | `public/downloads/GovLetter_US_complete_test_pack.zip` |
| Invoices only | `test-documents/us/invoices/GovLetter_US_invoice_test_pack.zip` |

**Production URL (after deploy):** https://www.govletter.com/downloads/GovLetter_US_complete_test_pack.zip

## Regenerate

```bash
node scripts/generate-test-docs.mjs          # 38 notice PDFs → test-documents/
python3 scripts/generate_us_invoice_samples.py  # invoices + handwritten PNGs
node scripts/build-us-test-pack.mjs          # zip → public/downloads/
```

## Notices (`01`–`38`) → Upload page

| File | Expected `doc_type` | Test focus |
|------|---------------------|------------|
| 01_IRS_CP14_Balance_Due | irs_notice_balance_due | IRS balance, amount, deadline |
| 02_IRS_CP2000_Income_Mismatch | irs_notice_generic | Proposed changes |
| 03_IRS_CP504_Intent_to_Levy | irs_notice_intent_to_levy | Levy warning |
| 04_IRS_LT11_Final_Notice_Levy | irs_notice_intent_to_levy | Final levy |
| 05_IRS_CP75_Audit_EITC | irs_notice_generic | Audit / EITC |
| 06_IRS_CP12_Refund_Changed | irs_notice_generic | Refund adjustment |
| 07_SSA_Overpayment_Notice | ssa_overpayment | SSA overpayment |
| 08_SSA_Benefit_Change | ssa_benefit_change | COLA / benefit change |
| 09_CA_FTB_State_Tax_Balance_Due | state_tax_CA_balance_due | CA state tax |
| 10_USCIS_RFE_I765 | uscis_rfe | Request for evidence |
| 11_VA_Debt_Management | va_debt | VA debt |
| 12_Medicare_IRMAA_Premium | medicare_premium | Part B/IRMAA |
| 13_Court_Civil_Summons | court_summons | Civil summons |
| 14_Unemployment_Determination | unemployment_determination | State UI |
| 15_Eviction_Pay_or_Quit | eviction_notice | Landlord notice |
| 16_Hospital_Medical_Bill | medical_bill | Patient statement |
| 17_Insurance_EOB | insurance_eob | EOB (not a bill) |
| 18_Business_Invoice | (invoice flow) | B2B invoice — use Bookkeeping |
| 19_Receipt_Office_Supplies | (invoice flow) | Retail receipt |
| 20_1099_NEC_Contractor_Income | (tax form) | 1099-NEC |
| 21_NY_DTF_State_Tax_Audit | state_tax_audit | NY audit |
| 22_TX_Comptroller_Refund_Offset | state_tax_refund_offset | Refund offset |
| 23_IL_DOR_State_Tax_Generic | state_tax_generic | Generic state letter |
| 24_USCIS_Biometrics_Appointment | uscis_biometrics | ASC appointment |
| 25_USCIS_Approval_Notice_I485 | uscis_decision | Approval |
| 26_Medicare_LIS_Application_Result | medicare_lis | Extra Help |
| 27_Medicare_General_Enrollment | medicare_generic | Part B enrollment |
| 28_VA_Benefit_Rating_Decision | va_benefit | Rating decision |
| 29_Court_Default_Judgment | court_judgment | Default judgment |
| 30_Child_Support_Enforcement | child_support | Child support |
| 31_Chase_Bank_Collection | bank_collection | Bank collection |
| 32_Capital_One_Chargeoff | credit_card_chargeoff | Charge-off |
| 33_Wells_Fargo_Mortgage_Default | mortgage_default | Mortgage default |
| 34_Duke_Energy_Disconnect_Notice | utility_disconnect | Utility disconnect |
| 35_HOA_Covenant_Violation | hoa_violation | HOA violation |
| 36_SSA_Generic_Correspondence | ssa_generic | SSA general |
| 37_IRS_CP71C_Reminder_Generic | irs_notice_generic | IRS reminder |
| 38_USPS_OIG_Official_Letter | official_letter_generic | Generic official |

## Also in complete zip

- `us_federal/` — IRS, SSA samples
- `us_state/` — CA FTB
- `us_civil/` — bank collection, utility disconnect
- `invoices_typed/` — 5 US business invoices (PDF)
- `invoices_handwritten/` — 5 handwritten-style PNGs for OCR

## App routes

- **Notices:** `/upload` (or home → upload)
- **Invoices / receipts:** Bookkeeping / invoice upload route in app
