# US document types (`doc_type`)

Used by `analyze-document` and `get_matching_playbook`. Hungarian NAV types apply only when `market = hu`.

## Federal tax
| doc_type | issuer |
|----------|--------|
| irs_notice_balance_due | irs |
| irs_notice_intent_to_levy | irs |
| irs_notice_generic | irs |

## State tax (use `state_code` on analysis)
| doc_type | issuer |
|----------|--------|
| state_tax_balance_due | state_tax_authority |
| state_tax_audit | state_tax_authority |
| state_tax_refund_offset | state_tax_authority |
| state_tax_generic | state_tax_authority |

## Federal agencies
| doc_type | issuer |
|----------|--------|
| ssa_overpayment | ssa |
| ssa_benefit_change | ssa |
| ssa_generic | ssa |
| uscis_rfe | uscis |
| uscis_biometrics | uscis |
| uscis_decision | uscis |
| medicare_premium | cms |
| medicare_lis | cms |
| medicare_generic | cms |
| va_debt | va |
| va_benefit | va |
| unemployment_determination | state_labor |

## Civil / financial
| doc_type | issuer |
|----------|--------|
| court_summons | court |
| court_judgment | court |
| child_support | court |
| bank_collection | bank |
| credit_card_chargeoff | bank |
| mortgage_default | bank |
| utility_disconnect | utility |
| hoa_violation | hoa |
| eviction_notice | landlord |
| medical_bill | hospital |
| insurance_eob | insurer |
| official_letter_generic | other |
