IRS minta PDF-ek — teszteléshez (NEM valódi IRS dokumentum)

Cél:
- Elemzés / playbook (irs_notice_balance_due, irs_notice_intent_to_levy, irs_notice_generic)
- Kapcsolódó űrlapok és Knowledge Base találatok kipróbálása

Fájlok:
1) 01_IRS_CP14_balance_due_sample.pdf  — CP14 / egyenleg
2) 02_IRS_LT11_intent_to_levy_sample.pdf — LT11 / végrehajtás + CDP + Form 12153
3) 03_IRS_CP2000_proposed_changes_sample.pdf — CP2000 / javasolt módosítás + 1040-X

Feltöltés: az app PDF-et fogad a dokumentum feltöltésnél.

Újragenerálás: python3 scripts/generate_irs_test_pdfs.py
