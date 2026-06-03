// Guided action paths: given an analyzed document's doc_type, offer the user a
// small set of clear choices ("What would you like to do?") instead of dumping
// every possible form at once. Each path explains the option in plain English,
// lists the concrete next steps, and links the relevant official form(s) we have
// in the database (by key) and/or an official external action URL.
//
// Design rules:
// - Keep options to 2–4 per document. Too many overwhelms a stressed user.
// - Mark exactly one option as `recommended` when there is a sensible default.
// - `formKeys` reference rows in the `forms` table (US IRS forms we host).
//   If a key is missing from the DB, the UI simply shows the steps + external link.
// - `externalUrl` points to the official agency action (e.g. IRS Direct Pay).

export interface ActionPath {
  key: string;
  label: string;
  /** One-line plain-English description of what this choice means. */
  description: string;
  /** Short ordered steps for this path, in everyday language. */
  steps: string[];
  /** Keys of forms (in the `forms` table) relevant to this path. */
  formKeys: string[];
  /** Optional official external action (e.g. pay online, request hearing). */
  externalUrl?: string;
  externalLabel?: string;
  /** Highlight as the suggested default. At most one per document. */
  recommended?: boolean;
  /** Visual tone for the option card. */
  tone?: "default" | "positive" | "caution";
}

export interface ActionPathsResult {
  /** Heading shown above the options, tailored to the document. */
  question: string;
  paths: ActionPath[];
}

const IRS_DIRECT_PAY = "https://www.irs.gov/payments";
const IRS_OIC_PREQUAL = "https://irs.treasury.gov/oic_pre_qualifier/";
const SSA_OVERPAYMENT = "https://www.ssa.gov/overpayments/";

// ---------------------------------------------------------------------------
// doc_type → guided options
// ---------------------------------------------------------------------------

function irsBalanceDue(): ActionPathsResult {
  return {
    question: "You owe a balance to the IRS. What would you like to do?",
    paths: [
      {
        key: "pay_full",
        label: "Pay the full amount",
        description: "Pay what you owe now to stop interest and penalties from growing.",
        tone: "positive",
        recommended: true,
        steps: [
          "Confirm the amount due and the notice number from your letter.",
          "Pay securely online via IRS Direct Pay (bank account) or by card.",
          "Keep the confirmation number for your records.",
        ],
        formKeys: [],
        externalUrl: IRS_DIRECT_PAY,
        externalLabel: "Pay at IRS.gov",
      },
      {
        key: "payment_plan",
        label: "Set up a payment plan",
        description: "Can't pay all at once? Request to pay in smaller monthly installments.",
        steps: [
          "Use Form 9465 to request an installment agreement.",
          "If you owe a larger amount, also complete Form 433-A (your financial details).",
          "Propose a monthly payment you can realistically afford.",
        ],
        formKeys: ["irs_form_9465", "irs_form_433a"],
      },
      {
        key: "penalty_relief",
        label: "Ask to remove penalties",
        description: "If you had a reasonable cause (illness, disaster, etc.) you can request penalty abatement.",
        steps: [
          "Use Form 843 to claim a refund or request abatement of penalties.",
          "Explain your reasonable cause clearly and attach supporting documents.",
        ],
        formKeys: ["irs_form_843"],
      },
      {
        key: "disagree",
        label: "I think this is wrong",
        description: "If you believe the amount is incorrect, you can dispute it or amend your return.",
        tone: "caution",
        steps: [
          "Compare the notice against your filed return and records.",
          "If your return had an error, file Form 1040-X to amend it.",
          "Otherwise, call the IRS number on your notice to dispute the balance.",
        ],
        formKeys: ["irs_form_1040x"],
      },
    ],
  };
}

function irsIntentToLevy(): ActionPathsResult {
  return {
    question: "The IRS intends to levy (seize) to collect this debt. How do you want to respond?",
    paths: [
      {
        key: "payment_plan",
        label: "Set up a payment plan",
        description: "Arrange affordable monthly payments to stop the levy.",
        tone: "positive",
        recommended: true,
        steps: [
          "Use Form 9465 to request an installment agreement right away.",
          "Add Form 433-A so the IRS can see what you can afford.",
          "Act before the deadline on your notice to pause collection.",
        ],
        formKeys: ["irs_form_9465", "irs_form_433a"],
      },
      {
        key: "cdp_hearing",
        label: "Request a hearing (appeal)",
        description: "Within 30 days you can request a Collection Due Process hearing, or appeal the action under the Collection Appeals Program.",
        tone: "caution",
        steps: [
          "File Form 12153 to request a Collection Due Process (CDP) hearing, or",
          "File Form 9423 for a faster Collection Appeals Program (CAP) appeal.",
          "Mail before the 30-day deadline shown on your notice — this pauses the levy.",
        ],
        formKeys: ["irs_form_12153", "irs_form_9423"],
      },
      {
        key: "hardship",
        label: "I can't afford to pay",
        description: "If paying would cause real hardship, you may settle for less, pause collection, or get advocate help.",
        steps: [
          "Check eligibility with the IRS Offer in Compromise pre-qualifier.",
          "Submit Form 656 (Offer in Compromise) with Form 433-A, or",
          "Ask the Taxpayer Advocate Service for help with Form 911 if hardship is urgent.",
        ],
        formKeys: ["irs_form_656", "irs_form_433a", "irs_form_911"],
        externalUrl: IRS_OIC_PREQUAL,
        externalLabel: "Check OIC eligibility",
      },
      {
        key: "pay_full",
        label: "Pay the full amount",
        description: "Pay the balance now to resolve the levy immediately.",
        steps: [
          "Pay online via IRS Direct Pay and keep the confirmation.",
        ],
        formKeys: [],
        externalUrl: IRS_DIRECT_PAY,
        externalLabel: "Pay at IRS.gov",
      },
    ],
  };
}

function irsGeneric(): ActionPathsResult {
  return {
    question: "How would you like to handle this IRS notice?",
    paths: [
      {
        key: "respond",
        label: "Respond / provide what they asked",
        description: "Send the information or documents the notice requests.",
        recommended: true,
        steps: [
          "Re-read the notice for exactly what is being requested and by when.",
          "Gather the requested documents.",
          "Respond by the deadline using the address or fax on the notice.",
        ],
        formKeys: [],
      },
      {
        key: "authorize_rep",
        label: "Have someone represent me",
        description: "Authorize a CPA, attorney, or enrolled agent to deal with the IRS for you.",
        steps: [
          "Complete Form 2848 (Power of Attorney) naming your representative.",
        ],
        formKeys: ["irs_form_2848"],
      },
      {
        key: "disagree",
        label: "I disagree with this notice",
        description: "Dispute the notice or correct your return.",
        tone: "caution",
        steps: [
          "Call the number on the notice to discuss the issue, or",
          "File Form 1040-X if your original return needs correcting.",
        ],
        formKeys: ["irs_form_1040x"],
      },
      {
        key: "advocate",
        label: "Get help from the Taxpayer Advocate",
        description: "If your IRS problem is causing hardship or hasn't been resolved through normal channels, the Taxpayer Advocate Service can help — free.",
        steps: [
          "Complete Form 911 to request Taxpayer Advocate Service assistance.",
          "Describe the hardship or the unresolved issue and what you need.",
        ],
        formKeys: ["irs_form_911"],
      },
      {
        key: "identity_theft",
        label: "Someone used my identity",
        description: "If this notice suggests a fraudulent return or tax-related identity theft, report it to the IRS.",
        tone: "caution",
        steps: [
          "Complete Form 14039 (Identity Theft Affidavit).",
          "Attach it as instructed and keep copies of everything.",
        ],
        formKeys: ["irs_form_14039"],
      },
    ],
  };
}

function vaBenefitOrDebt(): ActionPathsResult {
  return {
    question: "How would you like to respond to this VA decision or notice?",
    paths: [
      {
        key: "supplemental_claim",
        label: "Submit new evidence (Supplemental Claim)",
        description: "If you have new and relevant evidence, ask VA to review the decision again.",
        tone: "positive",
        recommended: true,
        steps: [
          "Complete VA Form 20-0995 (Supplemental Claim).",
          "Identify the new and relevant evidence supporting your claim.",
          "File within any deadline stated on your decision letter.",
        ],
        formKeys: ["va_form_20_0995"],
      },
      {
        key: "higher_level_review",
        label: "Ask a senior reviewer (Higher-Level Review)",
        description: "Disagree with the decision but have no new evidence? Request a more experienced reviewer.",
        steps: [
          "Complete VA Form 20-0996 (Higher-Level Review).",
          "Explain what you believe was decided incorrectly.",
        ],
        formKeys: ["va_form_20_0996"],
      },
      {
        key: "va_contact",
        label: "Contact VA / arrange repayment",
        description: "For a debt, you can dispute it, request a waiver, or set up a payment plan with VA.",
        steps: [
          "Call VA at the number on your letter to discuss options.",
          "Request a waiver or payment plan if the debt would cause hardship.",
        ],
        formKeys: [],
        externalUrl: "https://www.va.gov/manage-va-debt/",
        externalLabel: "Manage VA debt",
      },
    ],
  };
}

function stateTaxBalanceDue(): ActionPathsResult {
  return {
    question: "You owe a balance to a state tax agency. What would you like to do?",
    paths: [
      {
        key: "pay_full",
        label: "Pay the full amount",
        description: "Pay your state balance to stop penalties and interest.",
        tone: "positive",
        recommended: true,
        steps: [
          "Find your state Department of Revenue payment portal (linked on your notice).",
          "Pay the amount due and save the confirmation.",
        ],
        formKeys: [],
      },
      {
        key: "payment_plan",
        label: "Request a payment plan",
        description: "Most states let you pay in installments — apply through your state agency.",
        steps: [
          "Look for 'payment plan' or 'installment agreement' on your state tax website.",
          "Apply online or by the form referenced on your notice.",
        ],
        formKeys: [],
      },
      {
        key: "disagree",
        label: "I think this is wrong",
        description: "Dispute the assessment with your state tax agency.",
        tone: "caution",
        steps: [
          "Compare the notice with your filed state return.",
          "Follow the protest/appeal instructions printed on the notice before the deadline.",
        ],
        formKeys: [],
      },
    ],
  };
}

function ssaOverpayment(): ActionPathsResult {
  return {
    question: "Social Security says you were overpaid. How would you like to respond?",
    paths: [
      {
        key: "waiver",
        label: "Ask them to waive it",
        description: "If the overpayment wasn't your fault and you can't afford to repay, request a waiver.",
        tone: "positive",
        recommended: true,
        steps: [
          "Request a waiver (Form SSA-632) explaining why it wasn't your fault.",
          "Show that repaying would be a hardship and attach proof.",
        ],
        formKeys: [],
        externalUrl: SSA_OVERPAYMENT,
        externalLabel: "SSA overpayments info",
      },
      {
        key: "reconsider",
        label: "I disagree with the amount",
        description: "Ask SSA to review the decision if you think the overpayment is wrong.",
        tone: "caution",
        steps: [
          "File a Request for Reconsideration (Form SSA-561) within 60 days.",
          "Explain why you disagree and include evidence.",
        ],
        formKeys: [],
        externalUrl: SSA_OVERPAYMENT,
        externalLabel: "SSA overpayments info",
      },
      {
        key: "repay",
        label: "Arrange repayment",
        description: "Set up an affordable repayment rate if the overpayment is correct.",
        steps: [
          "Call SSA at the number on your notice to negotiate a monthly amount.",
        ],
        formKeys: [],
      },
    ],
  };
}

function genericOfficial(): ActionPathsResult {
  return {
    question: "What would you like to do with this letter?",
    paths: [
      {
        key: "respond",
        label: "Respond by the deadline",
        description: "Take the action the letter asks for before any due date.",
        recommended: true,
        steps: [
          "Identify exactly what is being asked and the deadline.",
          "Gather any documents or payment needed.",
          "Respond using the contact method on the letter.",
        ],
        formKeys: [],
      },
      {
        key: "dispute",
        label: "I disagree with this",
        description: "Contest the letter or ask for a review.",
        tone: "caution",
        steps: [
          "Look for appeal or dispute instructions on the letter.",
          "Respond in writing before the stated deadline and keep a copy.",
        ],
        formKeys: [],
      },
    ],
  };
}

/**
 * Returns the guided action paths for a given doc_type, or `null` when there is
 * no tailored set (the caller can then fall back to the plain forms list).
 */
export function getActionPaths(docType: string | null | undefined): ActionPathsResult | null {
  if (!docType) return null;
  const t = docType.toLowerCase();

  if (t === "irs_notice_balance_due") return irsBalanceDue();
  if (t === "irs_notice_intent_to_levy") return irsIntentToLevy();
  if (t.startsWith("irs_notice")) return irsGeneric();

  if (t.startsWith("state_tax")) {
    if (t.includes("balance_due")) return stateTaxBalanceDue();
    return genericOfficial();
  }

  if (t === "ssa_overpayment") return ssaOverpayment();

  if (t === "va_debt" || t === "va_benefit") return vaBenefitOrDebt();

  // Letters that are clearly actionable but without a tailored IRS/SSA path.
  const actionable = [
    "ssa_benefit_change",
    "ssa_generic",
    "medicare_premium",
    "unemployment_determination",
    "court_summons",
    "court_judgment",
    "child_support",
    "bank_collection",
    "credit_card_chargeoff",
    "mortgage_default",
    "utility_disconnect",
    "hoa_violation",
    "eviction_notice",
    "medical_bill",
    "official_letter_generic",
  ];
  if (actionable.includes(t)) return genericOfficial();

  return null;
}
