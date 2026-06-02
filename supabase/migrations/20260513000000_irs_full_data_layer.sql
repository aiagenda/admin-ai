-- =============================================================================
-- IRS full data layer:
--   1. IRS forms in public.forms
--   2. Playbook related_forms + related_laws linkage
--   3. law_registry IRC entries
--   4. knowledge_documents IRS seed (no embeddings — run kb:embeddings after)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. IRS FORMS
-- -----------------------------------------------------------------------------
INSERT INTO public.forms (
  key, name, pdf_url, fillable_url, online_url,
  institution, description, form_type, category, tags,
  fillable_online, official_source_url, instructions, last_updated
) VALUES

-- 9465: Installment Agreement Request
(
  'irs_form_9465',
  'Form 9465 — Installment Agreement Request',
  'https://www.irs.gov/pub/irs-pdf/f9465.pdf',
  'https://www.irs.gov/pub/irs-pdf/f9465.pdf',
  'https://www.irs.gov/pub/irs-pdf/f9465.pdf',
  'IRS',
  'Request a monthly installment plan if you cannot pay your taxes in full. Use with CP14, CP504, or any balance-due notice.',
  'form',
  'tax',
  ARRAY['irs','installment','payment plan','balance due','CP14','CP504','monthly payment'],
  true,
  'https://www.irs.gov/forms-pubs/about-form-9465',
  E'1. Complete Part I with your name, SSN/EIN, address.\n2. Enter the tax year and type of tax owed.\n3. Propose a monthly payment amount and start date.\n4. Mail to the address on your notice, or submit via IRS Online Account.\n5. Keep a copy for your records.',
  '2024-01-01'
),

-- 843: Claim for Refund / Abatement
(
  'irs_form_843',
  'Form 843 — Claim for Refund and Request for Abatement',
  'https://www.irs.gov/pub/irs-pdf/f843.pdf',
  'https://www.irs.gov/pub/irs-pdf/f843.pdf',
  'https://www.irs.gov/pub/irs-pdf/f843.pdf',
  'IRS',
  'Request abatement (cancellation) of penalties and interest, or claim a refund of tax, penalties, or interest already paid. Often used for first-time penalty abatement.',
  'form',
  'tax',
  ARRAY['irs','abatement','penalty','interest','refund','first time','reasonable cause'],
  true,
  'https://www.irs.gov/forms-pubs/about-form-843',
  E'1. Select the type of tax and the relevant tax period.\n2. Check the reason for abatement: reasonable cause, IRS error, statutory exception, or other.\n3. Attach supporting documentation (e.g., medical records, disaster declarations).\n4. Mail to the IRS address on your notice or the address in the form instructions.',
  '2024-01-01'
),

-- 433-A: Collection Information Statement (individuals)
(
  'irs_form_433a',
  'Form 433-A — Collection Information Statement (Individuals)',
  'https://www.irs.gov/pub/irs-pdf/f433a.pdf',
  'https://www.irs.gov/pub/irs-pdf/f433a.pdf',
  'https://www.irs.gov/pub/irs-pdf/f433a.pdf',
  'IRS',
  'Required when applying for an Offer in Compromise or when the IRS needs a full financial picture (assets, income, expenses, liabilities) to evaluate payment options.',
  'form',
  'tax',
  ARRAY['irs','offer in compromise','OIC','collection','financial statement','433'],
  true,
  'https://www.irs.gov/forms-pubs/about-form-433-a',
  E'1. List all assets (real estate, vehicles, bank accounts, investments).\n2. List monthly income and necessary expenses.\n3. List all liabilities.\n4. Sign under penalty of perjury.\n5. Attach bank statements and pay stubs.',
  '2024-01-01'
),

-- 433-B: Collection Information Statement (businesses)
(
  'irs_form_433b',
  'Form 433-B — Collection Information Statement (Businesses)',
  'https://www.irs.gov/pub/irs-pdf/f433b.pdf',
  'https://www.irs.gov/pub/irs-pdf/f433b.pdf',
  'https://www.irs.gov/pub/irs-pdf/f433b.pdf',
  'IRS',
  'Business version of the Collection Information Statement. Used for Offer in Compromise and installment agreement evaluations for businesses.',
  'form',
  'tax',
  ARRAY['irs','offer in compromise','OIC','business','collection','financial statement','433'],
  true,
  'https://www.irs.gov/forms-pubs/about-form-433-b',
  E'1. Enter business identification (EIN, type of business entity).\n2. List business assets, receivables, and liabilities.\n3. Report business income and expenses.\n4. Sign and date.',
  '2024-01-01'
),

-- 12153: Request for Collection Due Process Hearing
(
  'irs_form_12153',
  'Form 12153 — Request for a Collection Due Process or Equivalent Hearing',
  'https://www.irs.gov/pub/irs-pdf/f12153.pdf',
  'https://www.irs.gov/pub/irs-pdf/f12153.pdf',
  'https://www.irs.gov/pub/irs-pdf/f12153.pdf',
  'IRS',
  'File within 30 days of a Final Notice of Intent to Levy (LT11 / CP90) to request a hearing with the IRS Office of Appeals and temporarily stop collection action.',
  'form',
  'tax',
  ARRAY['irs','CDP','collection due process','appeal','levy','lien','LT11','CP90','CP504','hearing'],
  true,
  'https://www.irs.gov/forms-pubs/about-form-12153',
  E'1. Enter taxpayer information and the type of IRS action you received (lien / levy).\n2. State the issues you want to discuss: installment agreement, OIC, innocent spouse, or dispute the underlying liability.\n3. DEADLINE: must be postmarked within 30 days of the date on the Final Notice.\n4. Mail or fax to the address on the CDP notice (not the general IRS address).',
  '2024-01-01'
),

-- 656: Offer in Compromise
(
  'irs_form_656',
  'Form 656 — Offer in Compromise',
  'https://www.irs.gov/pub/irs-pdf/f656.pdf',
  'https://www.irs.gov/pub/irs-pdf/f656.pdf',
  'https://www.irs.gov/pub/irs-pdf/f656.pdf',
  'IRS',
  'Propose to settle your IRS tax debt for less than the full amount owed. Must be submitted with Form 433-A (individuals) or 433-B (businesses) and a $205 application fee (or fee waiver).',
  'form',
  'tax',
  ARRAY['irs','offer in compromise','OIC','settle','debt','reduction','433'],
  true,
  'https://www.irs.gov/payments/offer-in-compromise',
  E'1. Use the IRS OIC Pre-Qualifier tool first (irs.gov/oic-prequalifier) to check eligibility.\n2. Complete Form 656 and the applicable 433 form.\n3. Include $205 application fee (check/money order to "United States Treasury") or Form 656-A for low-income waiver.\n4. Include initial payment (lump sum: 20% of offer; periodic: first installment).\n5. Mail to the IRS Offer in Compromise unit address in the instructions.',
  '2024-01-01'
),

-- 2848: Power of Attorney
(
  'irs_form_2848',
  'Form 2848 — Power of Attorney and Declaration of Representative',
  'https://www.irs.gov/pub/irs-pdf/f2848.pdf',
  'https://www.irs.gov/pub/irs-pdf/f2848.pdf',
  'https://www.irs.gov/pub/irs-pdf/f2848.pdf',
  'IRS',
  'Authorize a CPA, enrolled agent, attorney, or other representative to act on your behalf before the IRS.',
  'form',
  'tax',
  ARRAY['irs','power of attorney','representative','CPA','enrolled agent','attorney','POA'],
  true,
  'https://www.irs.gov/forms-pubs/about-form-2848',
  E'1. Enter taxpayer identification and tax matters (form type, year).\n2. Enter representative information and designation (attorney, CPA, enrolled agent, etc.).\n3. Taxpayer must sign and date Part I.\n4. Representative signs Part II.\n5. Submit via IRS Online (tax pro account) or mail/fax to the IRS CAF unit.',
  '2024-01-01'
),

-- 1040-X: Amended Return
(
  'irs_form_1040x',
  'Form 1040-X — Amended U.S. Individual Income Tax Return',
  'https://www.irs.gov/pub/irs-pdf/f1040x.pdf',
  'https://www.irs.gov/filing/amended-return-frequently-asked-questions',
  'https://www.irs.gov/filing/amended-return-frequently-asked-questions',
  'IRS',
  'Correct a previously filed Form 1040. Use when you receive a notice about a discrepancy or when you discover an error on your return.',
  'form',
  'tax',
  ARRAY['irs','amended return','1040X','correction','CP2000','income discrepancy'],
  true,
  'https://www.irs.gov/forms-pubs/about-form-1040-x',
  E'1. Download and compare to your original 1040.\n2. Only fill in the lines that changed (Column A = original, Column B = net change, Column C = corrected).\n3. Attach any supporting schedules or W-2/1099 corrections.\n4. Mail to the address in the 1040-X instructions for your state.\n5. Cannot be e-filed in all cases; check current IRS guidance.',
  '2024-01-01'
)

ON CONFLICT (key) DO UPDATE SET
  name               = EXCLUDED.name,
  pdf_url            = EXCLUDED.pdf_url,
  fillable_url       = EXCLUDED.fillable_url,
  online_url         = EXCLUDED.online_url,
  institution        = EXCLUDED.institution,
  description        = EXCLUDED.description,
  form_type          = EXCLUDED.form_type,
  category           = EXCLUDED.category,
  tags               = EXCLUDED.tags,
  fillable_online    = EXCLUDED.fillable_online,
  official_source_url = EXCLUDED.official_source_url,
  instructions       = EXCLUDED.instructions,
  last_updated       = EXCLUDED.last_updated;


-- -----------------------------------------------------------------------------
-- 2. PLAYBOOK ↔ FORMS + LAWS LINKAGE
-- -----------------------------------------------------------------------------

-- Intent to Levy (CP504, LT11): 9465 (installment), 12153 (CDP appeal), 433-A (OIC financials), 656 (OIC), 2848 (POA)
UPDATE public.playbooks
SET
  related_forms = ARRAY['irs_form_9465','irs_form_12153','irs_form_433a','irs_form_656','irs_form_2848'],
  related_laws  = ARRAY['IRC § 6320','IRC § 6321','IRC § 6330','IRC § 6331','IRC § 7122']
WHERE doc_type = 'irs_notice_intent_to_levy';

-- Balance Due (CP14): 9465 (installment), 843 (abatement), 433-A (if hardship), 656 (OIC if eligible)
UPDATE public.playbooks
SET
  related_forms = ARRAY['irs_form_9465','irs_form_843','irs_form_433a','irs_form_656'],
  related_laws  = ARRAY['IRC § 6601','IRC § 6651','IRC § 6654','IRC § 6159']
WHERE doc_type = 'irs_notice_balance_due';

-- Generic IRS notice: 9465, 843, 2848
UPDATE public.playbooks
SET
  related_forms = ARRAY['irs_form_9465','irs_form_843','irs_form_2848'],
  related_laws  = ARRAY['IRC § 7521','IRC § 7522']
WHERE doc_type = 'irs_notice_generic';


-- -----------------------------------------------------------------------------
-- 3. LAW REGISTRY — IRC entries
-- -----------------------------------------------------------------------------
INSERT INTO public.law_registry (
  short_name, official_title, source_url, aliases, topics, typical_sections, notes
) VALUES

('IRC § 6159',
  'Internal Revenue Code § 6159 — Agreements for Payment of Tax Liability in Installments',
  'https://www.law.cornell.edu/uscode/text/26/6159',
  ARRAY['installment agreement','payment plan','IRS payment plan','6159'],
  ARRAY['irs','tax','payment','installment','balance due'],
  '{"installment agreement": "§ 6159(a)", "termination": "§ 6159(b)", "user fee": "§ 6159(f)"}'::jsonb,
  'Legal basis for IRS installment agreements. Cross-reference with Form 9465.'),

('IRC § 6320',
  'Internal Revenue Code § 6320 — Notice and Opportunity for Hearing upon Filing of Notice of Lien',
  'https://www.law.cornell.edu/uscode/text/26/6320',
  ARRAY['lien','tax lien','CDP lien','6320','NFTL'],
  ARRAY['irs','lien','appeal','CDP','collection'],
  '{"CDP hearing right": "§ 6320(a)", "hearing process": "§ 6320(b)", "judicial review": "§ 6320(c)"}'::jsonb,
  'Right to hearing when IRS files a tax lien. 30-day deadline from notice date.'),

('IRC § 6321',
  'Internal Revenue Code § 6321 — Lien for Taxes',
  'https://www.law.cornell.edu/uscode/text/26/6321',
  ARRAY['tax lien','federal lien','6321'],
  ARRAY['irs','lien','enforcement','collection'],
  '{"lien creation": "§ 6321"}'::jsonb,
  'Establishes the federal tax lien on all property and rights when a taxpayer neglects or refuses to pay.'),

('IRC § 6330',
  'Internal Revenue Code § 6330 — Notice and Opportunity for Hearing Before Levy',
  'https://www.law.cornell.edu/uscode/text/26/6330',
  ARRAY['levy','CDP levy','6330','LT11','CP90','Final Notice'],
  ARRAY['irs','levy','appeal','CDP','enforcement','collection'],
  '{"30-day appeal right": "§ 6330(a)", "hearing": "§ 6330(b)", "suspension of levy": "§ 6330(e)"}'::jsonb,
  'Must file Form 12153 within 30 days of Final Notice of Intent to Levy to get CDP hearing. Levy is suspended during hearing.'),

('IRC § 6331',
  'Internal Revenue Code § 6331 — Levy and Distraint',
  'https://www.law.cornell.edu/uscode/text/26/6331',
  ARRAY['levy','garnishment','seizure','6331','wage levy','bank levy'],
  ARRAY['irs','levy','enforcement','wages','bank account','collection'],
  '{"levy authority": "§ 6331(a)", "continuous levy on wages": "§ 6331(e)", "exempt property": "§ 6334"}'::jsonb,
  'IRS authority to seize wages, bank accounts, and property. Cross-reference § 6330 for appeal rights.'),

('IRC § 6601',
  'Internal Revenue Code § 6601 — Interest on Underpayment, Nonpayment, or Extensions',
  'https://www.law.cornell.edu/uscode/text/26/6601',
  ARRAY['interest','underpayment interest','6601'],
  ARRAY['irs','interest','balance due','underpayment'],
  '{"interest accrual": "§ 6601(a)", "rate": "§ 6621"}'::jsonb,
  'Interest accrues on unpaid tax from the due date. Cannot be abated except in limited IRS-error circumstances.'),

('IRC § 6651',
  'Internal Revenue Code § 6651 — Failure to File / Failure to Pay Penalties',
  'https://www.law.cornell.edu/uscode/text/26/6651',
  ARRAY['failure to file','failure to pay','FTF','FTP','penalty','6651'],
  ARRAY['irs','penalty','balance due','filing','abatement'],
  '{"failure to file": "§ 6651(a)(1)", "failure to pay": "§ 6651(a)(2)", "reasonable cause": "§ 6651(a)"}'::jsonb,
  'Most common IRS penalties. Can be abated for reasonable cause or first-time abatement. Use Form 843.'),

('IRC § 6654',
  'Internal Revenue Code § 6654 — Underpayment of Estimated Tax by Individuals',
  'https://www.law.cornell.edu/uscode/text/26/6654',
  ARRAY['estimated tax','underpayment','quarterly','6654'],
  ARRAY['irs','estimated tax','penalty','self-employed','quarterly payments'],
  '{"penalty": "§ 6654(a)", "safe harbor": "§ 6654(d)"}'::jsonb,
  'Penalty for not paying enough estimated taxes during the year. Safe harbor: pay 100% of prior year tax (110% if AGI > $150k).'),

('IRC § 7122',
  'Internal Revenue Code § 7122 — Compromises',
  'https://www.law.cornell.edu/uscode/text/26/7122',
  ARRAY['offer in compromise','OIC','compromise','settle','7122'],
  ARRAY['irs','offer in compromise','OIC','settlement','collection'],
  '{"authority to compromise": "§ 7122(a)", "grounds": "§ 7122(b)", "rejected offers": "§ 7122(d)"}'::jsonb,
  'Legal basis for IRS Offer in Compromise. Three grounds: doubt as to liability, doubt as to collectibility, effective tax administration.'),

('IRC § 7521',
  'Internal Revenue Code § 7521 — Procedures Involving Taxpayer Interviews',
  'https://www.law.cornell.edu/uscode/text/26/7521',
  ARRAY['taxpayer rights','interview','representative','7521','right to representation'],
  ARRAY['irs','rights','representative','audit','interview'],
  '{"right to recording": "§ 7521(a)", "right to representation": "§ 7521(b)"}'::jsonb,
  'Taxpayer Bill of Rights: right to have a representative present at IRS interviews.'),

('IRC § 7522',
  'Internal Revenue Code § 7522 — Content of Tax Due, Deficiency, and Other Notices',
  'https://www.law.cornell.edu/uscode/text/26/7522',
  ARRAY['notice requirements','7522','IRS notice'],
  ARRAY['irs','notice','rights'],
  '{"notice content": "§ 7522(a)"}'::jsonb,
  'Requires IRS notices to clearly state the amount owed and the basis for the tax.'),

('Pub. 594',
  'IRS Publication 594 — The IRS Collection Process',
  'https://www.irs.gov/pub/irs-pdf/p594.pdf',
  ARRAY['collection process','IRS collection','pub 594','publication 594'],
  ARRAY['irs','collection','levy','lien','installment','OIC','rights'],
  '{"overview": "full text"}'::jsonb,
  'Plain-language explanation of the IRS collection process. Good reference to share with clients.')

ON CONFLICT (short_name) DO UPDATE SET
  official_title   = EXCLUDED.official_title,
  source_url       = EXCLUDED.source_url,
  aliases          = EXCLUDED.aliases,
  topics           = EXCLUDED.topics,
  typical_sections = EXCLUDED.typical_sections,
  notes            = EXCLUDED.notes,
  updated_at       = now();


-- -----------------------------------------------------------------------------
-- 4. KNOWLEDGE BASE SEED — IRS notice types + key rights (embeddings: see below)
--    After DB apply: from repo root with .env.local (service role + OPENAI):
--      npm run kb:sync
--    (runs kb:chunks for docs without chunks, then kb:embeddings)
-- -----------------------------------------------------------------------------
-- Idempotent: remove prior seed rows by exact title so re-run does not duplicate.
DELETE FROM public.knowledge_documents
WHERE title IN (
  'IRS CP14 — Balance Due Notice: What It Means and What to Do',
  'IRS CP504 / LT11 — Final Notice of Intent to Levy: Your Rights and Deadlines',
  'IRS CP2000 — Proposed Changes to Your Tax Return',
  'IRS First-Time Penalty Abatement (FTA) — How to Request It',
  'IRS Offer in Compromise — Settling Your Tax Debt for Less',
  'Taxpayer Bill of Rights — Your 10 Rights When Dealing with the IRS'
);

INSERT INTO public.knowledge_documents (
  title, content, category, source_type, source_url, source_institution, metadata
) VALUES

(
  'IRS CP14 — Balance Due Notice: What It Means and What to Do',
  E'## What is a CP14?\n\nA CP14 is the IRS''s first notice that you owe money on your federal taxes. It covers a specific tax year and shows the balance due including any penalties and interest that have accrued.\n\n## Key facts\n\n- **Response deadline:** Usually 21 days from the notice date, though the specific date is printed on the notice.\n- **Interest and penalties continue to accrue** until you pay in full, so acting quickly reduces the total amount.\n\n## Your options\n\n1. **Pay in full** — via IRS Direct Pay (directpay.irs.gov), EFTPS, check, or debit/credit card.\n2. **Set up an installment agreement** — File Form 9465 or use your IRS Online Account. If you owe $50,000 or less, you may qualify for an online payment plan without financial disclosure.\n3. **Request abatement of penalties** — If this is your first penalty or you have reasonable cause, file Form 843.\n4. **Dispute the amount** — If you believe the tax is incorrect, respond in writing with supporting documents by the deadline on the notice.\n\n## Relevant laws\n\n- IRC § 6651 (failure to pay penalty)\n- IRC § 6601 (interest on underpayment)\n- IRC § 6159 (installment agreements)\n\n## Official resource\n\nhttps://www.irs.gov/individuals/understanding-your-cp14-notice',
  'tax',
  'guide',
  'https://www.irs.gov/individuals/understanding-your-cp14-notice',
  'IRS',
  '{"doc_type": "irs_notice_balance_due", "notice_code": "CP14", "language": "en"}'::jsonb
),

(
  'IRS CP504 / LT11 — Final Notice of Intent to Levy: Your Rights and Deadlines',
  E'## What is a CP504 or LT11?\n\nA CP504 is a "Final Notice Before Levy on State Tax Refund or Other Property." An LT11 (also called CP90) is the "Final Notice of Intent to Levy and Notice of Your Right to a Hearing." Both mean the IRS is warning it will seize assets if you do not respond.\n\n## Critical deadline\n\n**LT11 / CP90:** You have **30 days from the notice date** to request a Collection Due Process (CDP) hearing by filing Form 12153. Missing this deadline means you lose your CDP hearing right and the levy can proceed.\n\n**CP504:** Slightly different — mainly allows levying state tax refunds. Still act immediately.\n\n## Your options (act before the deadline)\n\n1. **Pay in full** — stops all collection action immediately.\n2. **Request a CDP hearing** — File Form 12153 within 30 days (LT11/CP90). This suspends the levy while your hearing is pending. At the hearing you can propose an installment agreement, Offer in Compromise, or challenge the underlying liability.\n3. **Set up a payment plan** — File Form 9465 or call the IRS. May stop levy action if approved before levy is executed.\n4. **Offer in Compromise** — If you cannot pay in full, file Form 656 + Form 433-A. Submitting a complete OIC generally suspends collection.\n5. **Innocent spouse relief** — If the debt belongs to a current/former spouse, you may request relief.\n\n## Relevant laws\n\n- IRC § 6330 (CDP hearing right before levy — 30-day window)\n- IRC § 6331 (IRS levy authority)\n- IRC § 6321 (federal tax lien)\n- IRC § 7122 (Offer in Compromise)\n\n## Official resources\n\n- https://www.irs.gov/individuals/understanding-your-irs-notice-or-letter\n- https://www.irs.gov/taxtopics/tc201\n- https://www.irs.gov/payments/offer-in-compromise',
  'tax',
  'guide',
  'https://www.irs.gov/individuals/understanding-your-irs-notice-or-letter',
  'IRS',
  '{"doc_type": "irs_notice_intent_to_levy", "notice_codes": ["CP504","LT11","CP90"], "language": "en"}'::jsonb
),

(
  'IRS CP2000 — Proposed Changes to Your Tax Return',
  E'## What is a CP2000?\n\nA CP2000 is not a bill — it is a **proposed change** to your tax return based on income information the IRS received from employers, banks, or other payers (W-2s, 1099s) that does not match what you reported.\n\n## Response deadline\n\nThe notice shows a specific response date (typically 60 days). You must respond even if you agree, to avoid the IRS assessing the proposed amount automatically.\n\n## Your options\n\n1. **Agree** — Sign and return the agreement form with full or partial payment, or set up a payment plan.\n2. **Disagree** — Respond in writing by the deadline with supporting documentation (e.g., records showing the income was already reported, is excluded, or has basis offsets). Include your name, SSN, and the tax year.\n3. **Partial agreement** — Agree to some items and dispute others.\n4. **File an amended return (Form 1040-X)** — If you need to add deductions or credits to offset the proposed income.\n\n## Relevant laws\n\n- IRC § 6213 (deficiency procedures)\n- IRC § 6651 (failure to pay)\n\n## Official resource\n\nhttps://www.irs.gov/individuals/understanding-your-cp2000-notice',
  'tax',
  'guide',
  'https://www.irs.gov/individuals/understanding-your-cp2000-notice',
  'IRS',
  '{"doc_type": "irs_notice_generic", "notice_code": "CP2000", "language": "en"}'::jsonb
),

(
  'IRS First-Time Penalty Abatement (FTA) — How to Request It',
  E'## What is First-Time Penalty Abatement?\n\nThe IRS will waive certain penalties for taxpayers who have a clean compliance history. This is called First-Time Abatement (FTA). It is an administrative waiver, not codified in a single IRC section, but granted under IRM 20.1.1.3.6.\n\n## Which penalties qualify?\n\n- Failure-to-file (IRC § 6651(a)(1))\n- Failure-to-pay (IRC § 6651(a)(2))\n- Failure to deposit (IRC § 6656)\n\n**Does not apply to:** estimated tax underpayment penalties (IRC § 6654), accuracy-related penalties (IRC § 6662).\n\n## Eligibility requirements\n\n1. You filed (or filed a valid extension) for all required returns for the prior 3 years.\n2. You paid, or arranged to pay, any tax due for the prior 3 years.\n3. You have no prior penalties (or they were waived) for the prior 3 years.\n4. You are in compliance today (current return filed, tax paid or in a payment plan).\n\n## How to request\n\n- **By phone:** Call the IRS using the number on your notice. Ask specifically for "first-time abatement."\n- **By mail (Form 843):** Check "reasonable cause" or reference FTA in your explanation. State that you meet all three eligibility requirements.\n\n## Official resource\n\nhttps://www.irs.gov/businesses/small-businesses-self-employed/penalty-relief-due-to-first-time-penalty-abatement-or-other-administrative-waiver',
  'tax',
  'guide',
  'https://www.irs.gov/businesses/small-businesses-self-employed/penalty-relief-due-to-first-time-penalty-abatement-or-other-administrative-waiver',
  'IRS',
  '{"doc_type": "irs_notice_balance_due", "topic": "penalty_abatement", "language": "en"}'::jsonb
),

(
  'IRS Offer in Compromise — Settling Your Tax Debt for Less',
  E'## What is an Offer in Compromise (OIC)?\n\nAn OIC lets you settle your federal tax debt for less than the full amount owed if paying in full would create financial hardship. The IRS evaluates your ability to pay, income, expenses, and asset equity.\n\n## Three grounds for an OIC\n\n1. **Doubt as to Liability** — You believe you do not owe the full amount.\n2. **Doubt as to Collectibility** — Your assets and income are less than the full tax liability.\n3. **Effective Tax Administration (ETA)** — Paying in full would create economic hardship or be inequitable.\n\n## Required forms\n\n- **Form 656** — The actual offer\n- **Form 433-A** (individuals) or **Form 433-B** (businesses) — Financial disclosure\n- **$205 application fee** (or Form 656-A for low-income waiver)\n- **Initial payment** — 20% of offer amount (lump sum) or first installment payment\n\n## Pre-qualification\n\nUse the IRS OIC Pre-Qualifier tool before applying: https://irs.treasury.gov/oic_pre_qualifier/\n\n## What happens after submission\n\n- Collection action is generally suspended while the OIC is under review.\n- IRS has 2 years to accept or reject; if no decision in 2 years, the offer is deemed accepted.\n- If rejected, you have 30 days to appeal to the IRS Office of Appeals.\n\n## Relevant laws\n\n- IRC § 7122 (authority to compromise)\n- IRC § 6331 (levy suspension during OIC review)\n\n## Official resource\n\nhttps://www.irs.gov/payments/offer-in-compromise',
  'tax',
  'guide',
  'https://www.irs.gov/payments/offer-in-compromise',
  'IRS',
  '{"doc_type": "irs_notice_intent_to_levy", "topic": "offer_in_compromise", "language": "en"}'::jsonb
),

(
  'Taxpayer Bill of Rights — Your 10 Rights When Dealing with the IRS',
  E'## The 10 Fundamental Rights (IRC § 7803(a)(3))\n\n1. **Right to Be Informed** — Know what you need to do to comply with tax laws.\n2. **Right to Quality Service** — Receive prompt, courteous, professional assistance.\n3. **Right to Pay No More than the Correct Amount** — Pay only what is legally due.\n4. **Right to Challenge the IRS Position** — Provide documentation and have the IRS consider your position.\n5. **Right to Appeal an IRS Decision** — Administratively (Appeals) and judicially (Tax Court, District Court, Claims Court).\n6. **Right to Finality** — Know the maximum amount of time you have to challenge an IRS decision.\n7. **Right to Privacy** — IRS actions will be no more intrusive than necessary.\n8. **Right to Confidentiality** — Information shared with the IRS will not be disclosed.\n9. **Right to Retain Representation** — Authorize someone to represent you; get a postponement to hire one.\n10. **Right to a Fair and Just Tax System** — Request Taxpayer Advocate assistance if experiencing hardship.\n\n## Key deadlines to know\n\n- **Statute of limitations on assessment:** Generally 3 years from filing date (IRC § 6501).\n- **Collection statute:** Generally 10 years from assessment date (IRC § 6502).\n- **CDP hearing:** 30 days from Final Notice of Intent to Levy.\n\n## Taxpayer Advocate Service (TAS)\n\nFree, independent help from the IRS: https://www.taxpayeradvocate.irs.gov/\n\n## Official resource\n\nhttps://www.taxpayeradvocate.irs.gov/get-help/taxpayer-rights/',
  'tax',
  'guide',
  'https://www.taxpayeradvocate.irs.gov/get-help/taxpayer-rights/',
  'IRS',
  '{"topic": "taxpayer_rights", "language": "en"}'::jsonb
);
