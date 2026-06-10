// Guided action paths: given an analyzed document's doc_type, offer the user a
// small set of clear choices ("What would you like to do?") instead of dumping
// every possible form at once. Each path explains the option in plain English,
// lists the concrete next steps, and links the relevant official form(s) we have
// in the database (by key) and/or an official external action URL, and/or an
// AI-generated response letter (letterType).
//
// Design rules:
// - Keep options to 2–4 per document. Too many overwhelms a stressed user.
// - Mark exactly one option as `recommended` when there is a sensible default.
// - `formKeys` reference rows in the `forms` table (US official forms we host).
// - `externalUrl` points to the official agency / court self-help action.
// - `letterType` triggers the AI response-letter generator for that option.

export type LetterType =
  | "debt_validation"
  | "debt_dispute"
  | "medical_bill_negotiation"
  | "medical_bill_itemized"
  | "utility_deferral"
  | "hoa_dispute"
  | "court_answer"
  | "eviction_response"
  | "generic_dispute"
  | "generic_response";

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
  /** When set, offers an AI-drafted response letter of this type. */
  letterType?: LetterType;
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
const CFPB_DEBT = "https://www.consumerfinance.gov/consumer-tools/debt-collection/";

// ---------------------------------------------------------------------------
// State court self-help portals (for court / eviction responses).
// Falls back to a national directory when a state isn't listed.
// ---------------------------------------------------------------------------
const STATE_COURT_SELF_HELP: Record<string, string> = {
  CA: "https://selfhelp.courts.ca.gov/",
  NY: "https://www.nycourts.gov/courthelp/",
  TX: "https://www.txcourts.gov/programs-services/legal-resources/",
  FL: "https://help.flcourts.gov/",
  AZ: "https://www.azcourts.gov/selfservicecenter",
  IL: "https://www.illinoiscourts.gov/forms/approved-forms/",
  PA: "https://www.pacourts.us/learn/representing-yourself",
  OH: "https://www.supremecourt.ohio.gov/courts/services-for-the-public/",
  GA: "https://georgiacourts.gov/self-help/",
  NC: "https://www.nccourts.gov/help-topics",
  MI: "https://courts.michigan.gov/self-help/",
  NJ: "https://www.njcourts.gov/self-help",
  WA: "https://www.courts.wa.gov/newsinfo/resources/?fa=newsinfo_jis.scforms",
  MA: "https://www.mass.gov/topics/court-forms",
  VA: "https://www.vacourts.gov/courts/court_forms.html",
};

const NATIONAL_COURT_HELP = "https://www.lawhelp.org/";

function courtSelfHelpUrl(stateCode?: string | null): string {
  if (stateCode) {
    const s = stateCode.toUpperCase();
    if (STATE_COURT_SELF_HELP[s]) return STATE_COURT_SELF_HELP[s];
  }
  return NATIONAL_COURT_HELP;
}

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
        steps: ["Pay online via IRS Direct Pay and keep the confirmation."],
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
        letterType: "generic_response",
      },
      {
        key: "authorize_rep",
        label: "Have someone represent me",
        description: "Authorize a CPA, attorney, or enrolled agent to deal with the IRS for you.",
        steps: ["Complete Form 2848 (Power of Attorney) naming your representative."],
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
        letterType: "generic_dispute",
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
        letterType: "generic_dispute",
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
          "Complete Form SSA-632 (Request for Waiver) explaining why it wasn't your fault.",
          "Show that repaying would be a hardship and attach proof.",
        ],
        formKeys: ["ssa_form_632"],
        externalUrl: SSA_OVERPAYMENT,
        externalLabel: "SSA overpayments info",
      },
      {
        key: "reconsider",
        label: "I disagree with the amount",
        description: "Ask SSA to review the decision if you think the overpayment is wrong.",
        tone: "caution",
        steps: [
          "File Form SSA-561 (Request for Reconsideration) within 60 days.",
          "Explain why you disagree and include evidence.",
        ],
        formKeys: ["ssa_form_561"],
      },
      {
        key: "lower_rate",
        label: "Lower my monthly repayment",
        description: "If the overpayment is correct but the withholding is too high, ask for a smaller monthly amount.",
        steps: [
          "Complete Form SSA-634 (Request for Change in Overpayment Recovery Rate).",
          "Show the monthly amount you can realistically afford.",
        ],
        formKeys: ["ssa_form_634"],
      },
    ],
  };
}

function ssaGeneric(): ActionPathsResult {
  return {
    question: "How would you like to handle this Social Security notice?",
    paths: [
      {
        key: "respond",
        label: "Respond / send what they need",
        description: "Provide the information SSA requested.",
        recommended: true,
        steps: [
          "Re-read the notice for what is requested and the deadline.",
          "Update your information at ssa.gov/myaccount or by mail.",
        ],
        formKeys: [],
        letterType: "generic_response",
      },
      {
        key: "reconsider",
        label: "I disagree with this decision",
        description: "Ask SSA to reconsider a decision you believe is wrong.",
        tone: "caution",
        steps: [
          "File Form SSA-561 (Request for Reconsideration) within 60 days.",
          "Explain why you disagree and include supporting evidence.",
        ],
        formKeys: ["ssa_form_561"],
      },
    ],
  };
}

function courtSummons(stateCode?: string | null): ActionPathsResult {
  return {
    question: "You've received a court summons. Acting before the deadline is critical.",
    paths: [
      {
        key: "answer",
        label: "File an Answer (respond to the case)",
        description: "Prepare a written response so you don't lose by default. We'll draft a starting point.",
        tone: "caution",
        recommended: true,
        steps: [
          "Note the response deadline on the summons (often 20–30 days) — missing it can mean an automatic loss.",
          "Use the draft Answer below as a starting point.",
          "File on your court's official Answer form and keep a stamped copy.",
        ],
        formKeys: [],
        letterType: "court_answer",
        externalUrl: courtSelfHelpUrl(stateCode),
        externalLabel: "Official court self-help & forms",
      },
      {
        key: "settle",
        label: "Try to settle before the hearing",
        description: "Contact the other party or their attorney to resolve the matter.",
        steps: [
          "Reach out in writing and keep records of all communication.",
          "Get any agreement in writing before the hearing date.",
        ],
        formKeys: [],
        letterType: "generic_response",
      },
      {
        key: "get_help",
        label: "Get legal help",
        description: "A lawyer or legal aid can guide you — many offer free help for those who qualify.",
        steps: [
          "Contact your local legal aid or the court self-help center.",
          "Bring the summons and all related documents.",
        ],
        formKeys: [],
        externalUrl: courtSelfHelpUrl(stateCode),
        externalLabel: "Find court self-help",
      },
    ],
  };
}

function courtJudgment(stateCode?: string | null): ActionPathsResult {
  return {
    question: "A judgment has been entered. Here are your options.",
    paths: [
      {
        key: "set_aside",
        label: "Ask to set aside the judgment",
        description: "If you were never properly served or missed the case for a valid reason, you may be able to reopen it.",
        tone: "caution",
        recommended: true,
        steps: [
          "Act quickly — deadlines to set aside a judgment are short.",
          "Use the draft motion/letter as a starting point.",
          "File the official motion at the court that issued the judgment.",
        ],
        formKeys: [],
        letterType: "court_answer",
        externalUrl: courtSelfHelpUrl(stateCode),
        externalLabel: "Official court self-help & forms",
      },
      {
        key: "arrange_payment",
        label: "Arrange to pay the judgment",
        description: "Negotiate a payment plan or settlement to avoid wage garnishment or liens.",
        steps: [
          "Contact the other party in writing to propose a payment plan.",
          "Get any agreement in writing and keep records.",
        ],
        formKeys: [],
        letterType: "generic_response",
      },
    ],
  };
}

function evictionNotice(stateCode?: string | null): ActionPathsResult {
  return {
    question: "You've received an eviction or pay-or-quit notice. Time matters.",
    paths: [
      {
        key: "respond",
        label: "Respond to your landlord",
        description: "Propose a payment plan, raise repair/habitability issues, or state your position in writing.",
        tone: "positive",
        recommended: true,
        steps: [
          "Read the notice for the deadline and exactly what is demanded.",
          "Use the draft response letter below as a starting point.",
          "Send it in a trackable way and keep a copy.",
        ],
        formKeys: [],
        letterType: "eviction_response",
      },
      {
        key: "court_answer",
        label: "A court case was filed — file an Answer",
        description: "If you were served with an unlawful detainer/eviction lawsuit, you must respond on the court form fast.",
        tone: "caution",
        steps: [
          "Check the deadline — eviction responses are often only ~5 days.",
          "Use the draft Answer as a starting point, then file the official court form.",
          "Contact local legal aid immediately.",
        ],
        formKeys: [],
        letterType: "court_answer",
        externalUrl: courtSelfHelpUrl(stateCode),
        externalLabel: "Official court self-help & forms",
      },
      {
        key: "get_help",
        label: "Get tenant help",
        description: "Local legal aid and tenant organizations can help — often free.",
        steps: [
          "Contact your local legal aid or tenant rights organization right away.",
          "Bring the notice and your lease.",
        ],
        formKeys: [],
        externalUrl: NATIONAL_COURT_HELP,
        externalLabel: "Find legal help",
      },
    ],
  };
}

function debtCollection(): ActionPathsResult {
  return {
    question: "A debt collector contacted you. You have strong rights under federal law.",
    paths: [
      {
        key: "validate",
        label: "Make them prove the debt",
        description: "Send a debt validation letter under the FDCPA. They must verify the debt before collecting further.",
        tone: "positive",
        recommended: true,
        steps: [
          "Send the validation letter below within 30 days of first contact if possible.",
          "Send it by mail with tracking and keep a copy.",
          "Collection and credit reporting should pause until they verify.",
        ],
        formKeys: [],
        letterType: "debt_validation",
        externalUrl: CFPB_DEBT,
        externalLabel: "Your debt collection rights",
      },
      {
        key: "dispute",
        label: "I don't recognize / dispute this debt",
        description: "Formally dispute the debt's accuracy and ask them to stop reporting it until resolved.",
        tone: "caution",
        steps: [
          "Use the dispute letter below to state what's wrong.",
          "Send it by trackable mail and keep records.",
        ],
        formKeys: [],
        letterType: "debt_dispute",
        externalUrl: CFPB_DEBT,
        externalLabel: "Your debt collection rights",
      },
      {
        key: "arrange",
        label: "Set up a payment / settlement",
        description: "If the debt is yours, negotiate a payment plan or a reduced lump-sum settlement — in writing.",
        steps: [
          "Use the letter below to propose an affordable amount.",
          "Get any agreement in writing BEFORE you pay.",
        ],
        formKeys: [],
        letterType: "generic_response",
      },
    ],
  };
}

function medicalBill(): ActionPathsResult {
  return {
    question: "How would you like to handle this medical bill?",
    paths: [
      {
        key: "itemized",
        label: "Request an itemized bill",
        description: "Ask for a full line-by-line bill so you can check every charge for errors.",
        tone: "positive",
        recommended: true,
        steps: [
          "Send the request below for an itemized bill with billing codes.",
          "Compare it against your insurance Explanation of Benefits (EOB).",
        ],
        formKeys: [],
        letterType: "medical_bill_itemized",
      },
      {
        key: "negotiate",
        label: "Ask for a discount or financial assistance",
        description: "Request a reduction, charity care, or an interest-free payment plan.",
        steps: [
          "Send the negotiation letter below to the billing department.",
          "Ask about financial assistance/charity care eligibility.",
        ],
        formKeys: [],
        letterType: "medical_bill_negotiation",
      },
    ],
  };
}

function utilityDisconnect(): ActionPathsResult {
  return {
    question: "Your utility may be disconnected. Act before the shut-off date.",
    paths: [
      {
        key: "arrange",
        label: "Request a payment plan / deferral",
        description: "Ask the utility to spread the balance and hold the disconnection.",
        tone: "positive",
        recommended: true,
        steps: [
          "Send the request below before the shut-off date.",
          "Ask about medical or weather protections that may apply.",
          "Get any arrangement in writing.",
        ],
        formKeys: [],
        letterType: "utility_deferral",
      },
      {
        key: "assistance",
        label: "Find bill assistance",
        description: "Programs like LIHEAP may help pay energy bills if you qualify.",
        steps: [
          "Look up energy assistance (LIHEAP) for your state.",
          "Apply as soon as possible and tell the utility you've applied.",
        ],
        formKeys: [],
        externalUrl: "https://www.acf.hhs.gov/ocs/programs/liheap",
        externalLabel: "Energy assistance (LIHEAP)",
      },
    ],
  };
}

function hoaViolation(): ActionPathsResult {
  return {
    question: "How would you like to respond to this HOA notice?",
    paths: [
      {
        key: "dispute",
        label: "Dispute or request a hearing",
        description: "Ask for the specific rule cited, the evidence, and your right to a hearing before any fines.",
        tone: "caution",
        recommended: true,
        steps: [
          "Send the letter below requesting the CC&R citation and a hearing.",
          "Send it by trackable mail and keep a copy.",
        ],
        formKeys: [],
        letterType: "hoa_dispute",
      },
      {
        key: "comply",
        label: "Fix the issue & confirm",
        description: "Resolve the violation and notify the HOA in writing to close it out.",
        steps: [
          "Correct the cited issue by the deadline.",
          "Send written confirmation (use the letter below) and request the fine be waived.",
        ],
        formKeys: [],
        letterType: "generic_response",
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
        description: "Take the action the letter asks for before any due date. We can draft a response.",
        recommended: true,
        steps: [
          "Identify exactly what is being asked and the deadline.",
          "Gather any documents or payment needed.",
          "Use the draft below, then send it using the contact method on the letter.",
        ],
        formKeys: [],
        letterType: "generic_response",
      },
      {
        key: "dispute",
        label: "I disagree with this",
        description: "Contest the letter or ask for a review. We can draft a dispute letter.",
        tone: "caution",
        steps: [
          "Look for appeal or dispute instructions on the letter.",
          "Use the draft below and send it before the stated deadline; keep a copy.",
        ],
        formKeys: [],
        letterType: "generic_dispute",
      },
    ],
  };
}

/**
 * Returns the guided action paths for a given doc_type, or `null` when there is
 * no tailored set (the caller can then fall back to the plain forms list).
 *
 * @param docType   the analyzed document type
 * @param stateCode optional two-letter US state, used to link the right court
 *                  self-help portal for court/eviction responses.
 */
export function getActionPaths(
  docType: string | null | undefined,
  stateCode?: string | null,
): ActionPathsResult | null {
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
  if (t === "ssa_benefit_change" || t === "ssa_generic") return ssaGeneric();

  if (t === "va_debt" || t === "va_benefit") return vaBenefitOrDebt();

  if (t === "court_summons") return courtSummons(stateCode);
  if (t === "court_judgment") return courtJudgment(stateCode);
  if (t === "child_support") return courtSummons(stateCode);
  if (t === "eviction_notice") return evictionNotice(stateCode);

  if (t === "bank_collection" || t === "credit_card_chargeoff") return debtCollection();
  if (t === "mortgage_default") return debtCollection();

  if (t === "medical_bill") return medicalBill();
  if (t === "utility_disconnect") return utilityDisconnect();
  if (t === "hoa_violation") return hoaViolation();

  // Letters that are clearly actionable but without a tailored path.
  const actionable = [
    "medicare_premium",
    "medicare_lis",
    "medicare_generic",
    "unemployment_determination",
    "insurance_eob",
    "official_letter_generic",
  ];
  if (actionable.includes(t)) return genericOfficial();

  return null;
}
