-- Deepen the legal layer: seed the core US consumer-protection and tax
-- statutes, remove the leftover EU/GDPR entry, and bind playbooks to the
-- right laws so the Legal References panel shows real citations.

-- 1. Remove non-US leftover
DELETE FROM public.law_registry WHERE short_name = 'GDPR';

-- 2. Seed missing US statutes (Cornell LII as a stable official-text source)
INSERT INTO public.law_registry (short_name, official_title, source_url, aliases, topics, notes) VALUES
  ('FDCPA', 'Fair Debt Collection Practices Act — 15 U.S.C. §1692 et seq.',
   'https://www.law.cornell.edu/uscode/text/15/1692',
   ARRAY['fair debt collection practices act','15 usc 1692','debt collection law','1692g'],
   ARRAY['debt','collection','validation','consumer'],
   'Governs third-party debt collectors. §1692g gives you the right to request validation of a debt within 30 days of first contact.'),
  ('FCRA', 'Fair Credit Reporting Act — 15 U.S.C. §1681 et seq.',
   'https://www.law.cornell.edu/uscode/text/15/1681',
   ARRAY['fair credit reporting act','15 usc 1681','credit report law','1681i'],
   ARRAY['credit report','dispute','consumer','bureau'],
   '§1681i requires credit bureaus to investigate disputed items, generally within 30 days, and correct or delete inaccurate information.'),
  ('RESPA', 'Real Estate Settlement Procedures Act — 12 U.S.C. §2605',
   'https://www.law.cornell.edu/uscode/text/12/2605',
   ARRAY['real estate settlement procedures act','12 usc 2605','mortgage servicing','loss mitigation'],
   ARRAY['mortgage','foreclosure','servicer','loss mitigation'],
   'Requires mortgage servicers to follow loss-mitigation procedures; a servicer generally cannot start foreclosure until the loan is 120 days delinquent.'),
  ('FCBA', 'Fair Credit Billing Act — 15 U.S.C. §1666',
   'https://www.law.cornell.edu/uscode/text/15/1666',
   ARRAY['fair credit billing act','15 usc 1666','billing dispute'],
   ARRAY['billing','dispute','medical','credit card'],
   'Lets you dispute billing errors on open-end credit accounts in writing.'),
  ('CCPA §303', 'Consumer Credit Protection Act, Title III — 15 U.S.C. §1673 (wage garnishment limits)',
   'https://www.law.cornell.edu/uscode/text/15/1673',
   ARRAY['consumer credit protection act','15 usc 1673','garnishment limit','title iii'],
   ARRAY['garnishment','wages','exemption'],
   'Caps how much of your disposable earnings can be garnished and protects you from being fired for one garnishment.'),
  ('IRC § 6212', 'Internal Revenue Code §6212 — Notice of Deficiency',
   'https://www.law.cornell.edu/uscode/text/26/6212',
   ARRAY['26 usc 6212','notice of deficiency','statutory notice'],
   ARRAY['IRS','deficiency','tax court'],
   'Authorizes the IRS to send a Notice of Deficiency (the "90-day letter").'),
  ('IRC § 6213', 'Internal Revenue Code §6213 — Restrictions on Assessment; Petition to Tax Court',
   'https://www.law.cornell.edu/uscode/text/26/6213',
   ARRAY['26 usc 6213','tax court petition','90 days','150 days'],
   ARRAY['IRS','deficiency','tax court','deadline'],
   'Gives you 90 days (150 if outside the U.S.) to petition the U.S. Tax Court after a Notice of Deficiency. This deadline cannot be extended.'),
  ('IRC § 6662', 'Internal Revenue Code §6662 — Accuracy-Related Penalty',
   'https://www.law.cornell.edu/uscode/text/26/6662',
   ARRAY['26 usc 6662','accuracy penalty','substantial understatement'],
   ARRAY['IRS','penalty','accuracy'],
   'Imposes a 20% accuracy-related penalty for, e.g., negligence or a substantial understatement of tax.'),
  ('IRC § 6015', 'Internal Revenue Code §6015 — Innocent Spouse Relief',
   'https://www.law.cornell.edu/uscode/text/26/6015',
   ARRAY['26 usc 6015','innocent spouse','form 8857'],
   ARRAY['IRS','innocent spouse','joint return'],
   'Lets a spouse seek relief from joint-and-several liability on a joint return (requested on Form 8857).'),
  ('HEA § 1087', 'Higher Education Act — 20 U.S.C. §1087 (federal student loan relief)',
   'https://www.law.cornell.edu/uscode/text/20/1087',
   ARRAY['higher education act','20 usc 1087','student loan rehabilitation','discharge'],
   ARRAY['student loan','default','rehabilitation'],
   'Governs federal student-loan repayment, rehabilitation, and discharge options.')
ON CONFLICT (short_name) DO NOTHING;

-- 3. Bind playbooks to the relevant laws (idempotent set).
UPDATE public.playbooks SET related_laws = ARRAY['IRC § 6212','IRC § 6213'] WHERE doc_type = 'irs_notice_deficiency';
UPDATE public.playbooks SET related_laws = ARRAY['IRC § 6212','IRC § 6662'] WHERE doc_type = 'irs_notice_cp2000';
UPDATE public.playbooks SET related_laws = ARRAY['IRC § 7521','IRC § 6662'] WHERE doc_type = 'irs_audit';
UPDATE public.playbooks SET related_laws = ARRAY['IRC § 6651','IRC § 6662','IRC § 6601'] WHERE doc_type = 'irs_penalty';
UPDATE public.playbooks SET related_laws = ARRAY['IRC § 6320','IRC § 6321','IRC § 6330'] WHERE doc_type = 'irs_lien';
UPDATE public.playbooks SET related_laws = ARRAY['FDCPA'] WHERE doc_type IN ('bank_collection','credit_card_chargeoff');
UPDATE public.playbooks SET related_laws = ARRAY['CCPA §303','FDCPA'] WHERE doc_type = 'wage_garnishment';
UPDATE public.playbooks SET related_laws = ARRAY['RESPA'] WHERE doc_type = 'mortgage_default';
UPDATE public.playbooks SET related_laws = ARRAY['FCBA','FDCPA'] WHERE doc_type = 'medical_bill';
UPDATE public.playbooks SET related_laws = ARRAY['HEA § 1087','FDCPA'] WHERE doc_type = 'student_loan';
