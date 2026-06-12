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
  | "credit_report_dispute"
  | "medical_bill_negotiation"
  | "medical_bill_itemized"
  | "utility_deferral"
  | "hoa_dispute"
  | "court_answer"
  | "eviction_response"
  | "cp2000_response"
  | "penalty_abatement"
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
  /** A pre-chosen strategy: the option card IS the strategy, so the letter is
   *  drafted directly for it (no AI strategy step). Used by dispute flows. */
  strategyPreset?: { title: string; detail: string };
  /**
   * When true, the letter step first asks the AI for tailored response
   * strategies (accept / dispute / procedural ...) and lets the user pick one.
   * Only enable on broad "respond/answer" paths — for already-specific paths
   * (settle, validate, itemized ...) we draft the letter directly to avoid a
   * redundant second choice.
   */
  useStrategies?: boolean;
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
const IRS_ID_VERIFY = "https://www.irs.gov/identity-theft-fraud-scams/identity-verification-service";
const US_TAX_COURT = "https://ustaxcourt.gov/petitioners.html";
const SSA_OVERPAYMENT = "https://www.ssa.gov/overpayments/";
const CFPB_DEBT = "https://www.consumerfinance.gov/consumer-tools/debt-collection/";
const HUD_COUNSELOR = "https://www.hud.gov/i_want_to/talk_to_a_housing_counselor";
const MEDICAID_GOV = "https://www.medicaid.gov/";
const USCIS_FIND_LEGAL = "https://www.uscis.gov/scams-fraud-and-misconduct/avoid-scams/find-legal-services";
const STUDENT_AID = "https://studentaid.gov/manage-loans/default";
const STUDENT_AID_IDR = "https://studentaid.gov/manage-loans/repayment/plans/income-driven";
const DMV_SERVICES = "https://www.usa.gov/motor-vehicle-services";

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
    question: "You've received a court summons. How do you want to respond? (Don't ignore it — missing the deadline can mean an automatic loss.)",
    paths: [
      {
        key: "accept_pay",
        label: "Accept and arrange payment",
        description: "Agree to the claim and arrange to pay — in full or through a payment plan.",
        steps: [
          "Make sure you can pay or can negotiate workable terms.",
          "We'll draft an Answer that admits the claim and proposes payment.",
          "File on your court's official Answer form by the deadline and keep a stamped copy.",
        ],
        formKeys: [],
        letterType: "court_answer",
        strategyPreset: {
          title: "Accept and arrange payment",
          detail: "The writer agrees to the claim and proposes to pay the amount owed in full or through a reasonable payment plan, and asks that any agreement be put in writing.",
        },
        externalUrl: courtSelfHelpUrl(stateCode),
        externalLabel: "Official court self-help & forms",
      },
      {
        key: "partial_dispute",
        label: "Partially dispute",
        description: "Agree to part of the claim but dispute the rest, such as the amount or specific damages.",
        steps: [
          "Be clear about exactly what you agree with and what you dispute.",
          "Gather evidence that supports your position.",
          "We'll draft an Answer that admits part and disputes the rest; file it by the deadline.",
        ],
        formKeys: [],
        letterType: "court_answer",
        strategyPreset: {
          title: "Partially dispute",
          detail: "The writer agrees to part of the claim but disputes specific amounts or damages, references supporting evidence, and does not admit the disputed portion.",
        },
        externalUrl: courtSelfHelpUrl(stateCode),
        externalLabel: "Official court self-help & forms",
      },
      {
        key: "full_dispute",
        label: "Fully dispute",
        description: "Dispute the entire claim if you believe it's wrong — wrong amount, mistaken identity, or statute of limitations.",
        tone: "caution",
        steps: [
          "Gather strong evidence to support your position.",
          "We'll draft an Answer that denies the claim and raises your general defenses.",
          "File on the official Answer form by the deadline and be prepared for a hearing.",
        ],
        formKeys: [],
        letterType: "court_answer",
        strategyPreset: {
          title: "Fully dispute",
          detail: "The writer denies the entire claim (for example wrong amount, mistaken identity, or that the statute of limitations has expired), asks that it be decided on the merits, and does not admit any liability.",
        },
        externalUrl: courtSelfHelpUrl(stateCode),
        externalLabel: "Official court self-help & forms",
      },
      {
        key: "procedural",
        label: "Raise procedural issues",
        description: "Challenge the summons on procedural grounds, such as improper service or wrong jurisdiction.",
        tone: "caution",
        steps: [
          "Note any errors in how the summons was served or filed.",
          "We'll draft a response that raises the procedural objection.",
          "Procedural defenses can be complex — consider the court self-help center or an attorney.",
        ],
        formKeys: [],
        letterType: "court_answer",
        strategyPreset: {
          title: "Raise procedural issues",
          detail: "The writer challenges the summons on procedural grounds such as improper service or lack of jurisdiction, while preserving (not waiving) defenses and without admitting the underlying claim.",
        },
        externalUrl: courtSelfHelpUrl(stateCode),
        externalLabel: "Official court self-help & forms",
      },
      {
        key: "get_help",
        label: "Not sure? Get legal help",
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
        key: "payment_plan",
        label: "Offer to pay / propose a plan",
        description: "If this is a pay-or-quit notice and you can catch up, offer to pay or propose a payment plan.",
        tone: "positive",
        steps: [
          "Check the deadline and the exact amount demanded.",
          "We'll draft a letter offering payment or a realistic plan.",
          "Send it in a trackable way (keep proof) before the deadline.",
        ],
        formKeys: [],
        letterType: "eviction_response",
        strategyPreset: {
          title: "Offer to pay or propose a payment plan",
          detail: "The writer offers to pay the amount owed or proposes a specific, realistic payment plan to cure the default and stay in the home, and asks for written confirmation.",
        },
      },
      {
        key: "habitability",
        label: "Raise repairs / habitability",
        description: "If the unit has serious problems the landlord won't fix, that may be a defense.",
        tone: "caution",
        steps: [
          "List the conditions and any repair requests you've made (with dates).",
          "We'll draft a letter raising the habitability/repair issues.",
          "Keep copies and photos as evidence.",
        ],
        formKeys: [],
        letterType: "eviction_response",
        strategyPreset: {
          title: "Raise repairs and habitability",
          detail: "The writer responds to the notice by documenting serious repair/habitability problems and prior repair requests, asserting these as a defense, without admitting the landlord's claim.",
        },
      },
      {
        key: "dispute",
        label: "Dispute the notice",
        description: "If the notice is wrong (already paid, improper notice, retaliation), state your position.",
        tone: "caution",
        steps: [
          "Note exactly what is incorrect about the notice.",
          "We'll draft a letter stating your position with any evidence.",
          "Send it in a trackable way and keep a copy.",
        ],
        formKeys: [],
        letterType: "eviction_response",
        strategyPreset: {
          title: "Dispute the notice",
          detail: "The writer disputes the notice (for example the rent was already paid, the notice was improper or defective, or it is retaliatory), states the facts, and does not admit the claim.",
        },
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
        useStrategies: true,
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

function irsCp2000(): ActionPathsResult {
  return {
    question: "The IRS proposes changes to your return (CP2000). How would you like to respond?",
    paths: [
      {
        key: "respond",
        label: "Respond to the CP2000 (agree or disagree)",
        description: "Use the Response form included with the notice to agree or disagree with the proposed changes.",
        recommended: true,
        steps: [
          "Compare the proposed changes to your own records (1099s, W-2s, brokerage statements).",
          "On the CP2000 Response form, check 'agree' or 'disagree' for each item.",
          "If you disagree, attach copies of documents that support your figures.",
          "Respond by the date on the notice (usually 30 days) — a CP2000 is NOT a bill yet and NOT an amended return.",
        ],
        formKeys: [],
        letterType: "cp2000_response",
      },
      {
        key: "agree_pay",
        label: "I agree — and need to pay",
        description: "If the proposed amount is correct but you can't pay in full, request an installment agreement.",
        steps: [
          "Sign and return the CP2000 Response form agreeing to the changes.",
          "Pay online, or request a payment plan with Form 9465.",
        ],
        formKeys: ["irs_form_9465"],
        externalUrl: IRS_DIRECT_PAY,
        externalLabel: "Pay the IRS online",
      },
      {
        key: "authorize_rep",
        label: "Have a tax pro handle it",
        description: "Authorize a CPA, attorney, or enrolled agent to respond for you.",
        steps: ["Complete Form 2848 (Power of Attorney) naming your representative."],
        formKeys: ["irs_form_2848"],
      },
    ],
  };
}

function irsNoticeOfDeficiency(): ActionPathsResult {
  return {
    question: "This is a Notice of Deficiency (\"90-day letter\"). You have a strict deadline — choose carefully.",
    paths: [
      {
        key: "tax_court",
        label: "Petition the U.S. Tax Court (90-day deadline)",
        description: "This is the only way to dispute the tax BEFORE paying it. The deadline is exactly 90 days from the date on the notice (150 if you're outside the U.S.) and CANNOT be extended.",
        tone: "caution",
        recommended: true,
        steps: [
          "Find the date printed on the notice — your petition is due 90 days from that date (150 days if addressed to you outside the U.S.).",
          "File a petition online at the U.S. Tax Court (a small filing fee applies, or request a waiver).",
          "Strongly consider hiring a tax attorney or CPA before filing — this is a court case.",
          "Missing this deadline means the IRS can assess the tax and you lose the right to challenge it in Tax Court.",
        ],
        formKeys: [],
        externalUrl: US_TAX_COURT,
        externalLabel: "File a U.S. Tax Court petition",
      },
      {
        key: "agree",
        label: "I agree with the changes",
        description: "If the IRS is right, you can sign the enclosed waiver (Form 5564) and arrange payment.",
        steps: [
          "Sign and return Form 5564 (Notice of Deficiency – Waiver), enclosed with the notice.",
          "Pay online, or request a payment plan with Form 9465.",
        ],
        formKeys: ["irs_form_9465"],
        externalUrl: IRS_DIRECT_PAY,
        externalLabel: "Pay the IRS online",
      },
      {
        key: "advocate",
        label: "Get help from the Taxpayer Advocate",
        description: "Free IRS-internal help if this is causing hardship. Note: contacting them does NOT extend the 90-day Tax Court deadline.",
        steps: ["Complete Form 911 to request Taxpayer Advocate Service assistance."],
        formKeys: ["irs_form_911"],
      },
    ],
  };
}

function irsIdentityVerification(): ActionPathsResult {
  return {
    question: "The IRS needs to verify your identity before processing your return. How would you like to do it?",
    paths: [
      {
        key: "verify_online",
        label: "Verify my identity online",
        description: "The fastest way — confirm your identity on the official IRS verification service.",
        tone: "positive",
        recommended: true,
        steps: [
          "Have the letter (e.g. 5071C/4883C/5747C), your prior-year return, and this year's return handy.",
          "Go to the IRS Identity Verification Service and follow the steps, or call the number on your letter.",
          "Only use the official irs.gov link — never a link from a text or email.",
        ],
        formKeys: [],
        externalUrl: IRS_ID_VERIFY,
        externalLabel: "IRS Identity Verification Service",
      },
      {
        key: "identity_theft",
        label: "I didn't file this return",
        description: "If the IRS is asking about a return you never filed, report identity theft.",
        tone: "caution",
        steps: [
          "Complete Form 14039 (Identity Theft Affidavit).",
          "Follow the letter's instructions and keep copies of everything.",
        ],
        formKeys: ["irs_form_14039"],
      },
    ],
  };
}

function irsAudit(): ActionPathsResult {
  return {
    question: "The IRS is examining (auditing) your return. How would you like to handle it?",
    paths: [
      {
        key: "respond",
        label: "Send the records they asked for",
        description: "Most audits are resolved by providing documentation by the deadline.",
        recommended: true,
        steps: [
          "List exactly which items/years the letter is questioning.",
          "Gather receipts, statements, and records that support those items.",
          "Send COPIES (never originals) by the deadline, to the address/fax on the letter.",
        ],
        formKeys: [],
        letterType: "generic_response",
      },
      {
        key: "authorize_rep",
        label: "Have a tax pro represent me",
        description: "A CPA, attorney, or enrolled agent can deal with the auditor for you.",
        steps: ["Complete Form 2848 (Power of Attorney) naming your representative."],
        formKeys: ["irs_form_2848"],
      },
      {
        key: "disagree",
        label: "I disagree with the audit result",
        description: "You can appeal the examiner's findings or request audit reconsideration.",
        tone: "caution",
        steps: [
          "Follow the appeal instructions in the examination report (you usually have 30 days).",
          "If the audit already closed, you can request audit reconsideration with new documents.",
        ],
        formKeys: [],
        letterType: "generic_dispute",
      },
      {
        key: "advocate",
        label: "Get help from the Taxpayer Advocate",
        description: "Free help if the audit is causing hardship or is stuck.",
        steps: ["Complete Form 911 to request Taxpayer Advocate Service assistance."],
        formKeys: ["irs_form_911"],
      },
    ],
  };
}

function irsPenalty(): ActionPathsResult {
  return {
    question: "The IRS charged a penalty. How would you like to respond?",
    paths: [
      {
        key: "abate",
        label: "Ask the IRS to remove the penalty",
        description: "You may qualify for First-Time Abatement (clean 3-year history) or reasonable-cause relief.",
        tone: "positive",
        recommended: true,
        steps: [
          "If you filed and paid on time the last 3 years, request First-Time Abatement.",
          "Otherwise, explain the reasonable cause (illness, disaster, records lost, reliance on a pro).",
          "Call the number on the notice, or send the request — you can also use Form 843.",
        ],
        formKeys: ["irs_form_843"],
        letterType: "penalty_abatement",
      },
      {
        key: "pay",
        label: "Pay the penalty",
        description: "Pay the balance to stop additional interest.",
        steps: ["Pay online and keep the confirmation."],
        formKeys: [],
        externalUrl: IRS_DIRECT_PAY,
        externalLabel: "Pay the IRS online",
      },
    ],
  };
}

function irsLien(): ActionPathsResult {
  return {
    question: "The IRS filed (or intends to file) a Notice of Federal Tax Lien. How would you like to respond?",
    paths: [
      {
        key: "cdp_hearing",
        label: "Request a Collection Due Process hearing (30-day deadline)",
        description: "You generally have 30 days from the lien notice to request a CDP hearing, where you can propose alternatives or dispute the lien.",
        tone: "caution",
        recommended: true,
        steps: [
          "Complete Form 12153 (Request for a CDP or Equivalent Hearing) before the 30-day deadline.",
          "State what you want (lien withdrawal, payment plan, offer, or that you dispute the liability).",
        ],
        formKeys: ["irs_form_12153"],
      },
      {
        key: "resolve",
        label: "Resolve the balance",
        description: "Paying or arranging payment is the path to releasing the lien.",
        steps: [
          "Pay in full, or request an installment agreement (Form 9465).",
          "If you can't pay, see whether an Offer in Compromise (Form 656) fits.",
        ],
        formKeys: ["irs_form_9465", "irs_form_656"],
        externalUrl: IRS_DIRECT_PAY,
        externalLabel: "Pay the IRS online",
      },
      {
        key: "appeal",
        label: "Appeal the lien filing",
        description: "Use the Collection Appeals Program to challenge the lien filing itself.",
        steps: ["Complete Form 9423 (Collection Appeal Request)."],
        formKeys: ["irs_form_9423"],
      },
    ],
  };
}

function foreclosure(): ActionPathsResult {
  return {
    question: "This is about your mortgage / a possible foreclosure. Act quickly — free help is available.",
    paths: [
      {
        key: "hud_counselor",
        label: "Talk to a HUD-approved housing counselor (free)",
        description: "Free, government-approved counselors help you understand your options and contact your servicer.",
        tone: "positive",
        recommended: true,
        steps: [
          "Call the HOPE™ Hotline at 888-995-4673 (888-995-HOPE), available 24/7, or find a local counselor on HUD's site.",
          "Have your mortgage statement and this notice ready.",
        ],
        formKeys: [],
        externalUrl: HUD_COUNSELOR,
        externalLabel: "Find a HUD-approved housing counselor",
      },
      {
        key: "loss_mitigation",
        label: "Apply for loss mitigation / loan modification",
        description: "Ask your loan servicer about options to keep your home (modification, forbearance, repayment plan).",
        steps: [
          "Contact your servicer's loss-mitigation department (number on your statement).",
          "Submit a COMPLETE loss-mitigation application — under federal rules the servicer generally must review it before moving to foreclosure.",
          "Keep copies and written confirmation of everything you send.",
        ],
        formKeys: [],
        letterType: "generic_response",
      },
      {
        key: "legal_help",
        label: "Get legal help / contest the foreclosure",
        description: "If a foreclosure case is filed, deadlines are short. Free or low-cost legal aid may be available.",
        tone: "caution",
        steps: [
          "Contact local legal aid right away if you've been served with court papers.",
          "Do not ignore court deadlines — losing by default forfeits your defenses.",
        ],
        formKeys: [],
        externalUrl: NATIONAL_COURT_HELP,
        externalLabel: "Find legal help",
      },
    ],
  };
}

function wageGarnishment(stateCode?: string | null): ActionPathsResult {
  return {
    question: "Your wages or bank account are being garnished. How would you like to respond?",
    paths: [
      {
        key: "claim_exemption",
        label: "Claim your exemptions (protect your income)",
        description: "A lot of income is legally protected — Social Security, disability, veterans' benefits, and a portion of wages. You can file a claim of exemption with the court.",
        tone: "caution",
        recommended: true,
        steps: [
          "Find the deadline on the garnishment papers to file a claim of exemption — it's often very short.",
          "List protected income (Social Security, SSI, VA, child support, and the protected share of wages).",
          "File the exemption claim with the court that issued the garnishment.",
        ],
        formKeys: [],
        externalUrl: courtSelfHelpUrl(stateCode),
        externalLabel: "State court self-help",
      },
      {
        key: "dispute_debt",
        label: "Dispute the underlying debt",
        description: "If you don't owe this debt or it isn't yours, dispute it.",
        steps: [
          "Send a written dispute / debt-validation request to the creditor or collector.",
          "Keep proof you sent it (certified mail).",
        ],
        formKeys: [],
        letterType: "debt_validation",
      },
      {
        key: "legal_help",
        label: "Get legal help",
        description: "Garnishment rules are state-specific — legal aid can help you protect more of your income.",
        steps: ["Contact local legal aid or a consumer attorney."],
        formKeys: [],
        externalUrl: NATIONAL_COURT_HELP,
        externalLabel: "Find legal help",
      },
    ],
  };
}

function childSupport(stateCode?: string | null): ActionPathsResult {
  return {
    question: "This is about child support. How would you like to respond?",
    paths: [
      {
        key: "respond_deadline",
        label: "Respond by the deadline",
        description: "If this is a court summons or an enforcement notice, you must respond on time to protect your rights.",
        tone: "caution",
        recommended: true,
        steps: [
          "Find the response deadline and the court or child-support agency handling your case.",
          "File your response (often on an official court form) before the deadline.",
        ],
        formKeys: [],
        externalUrl: courtSelfHelpUrl(stateCode),
        externalLabel: "State court self-help",
        letterType: "court_answer",
      },
      {
        key: "modify",
        label: "Ask to change the amount",
        description: "If your income or circumstances changed, you can request a modification — don't just stop paying.",
        steps: [
          "Contact your state child-support agency to request a review/modification.",
          "Gather proof of your current income and expenses.",
        ],
        formKeys: [],
      },
      {
        key: "payment_plan",
        label: "Arrange a payment plan for arrears",
        description: "If you've fallen behind, the agency may set up an affordable repayment plan.",
        steps: ["Contact your state child-support agency before enforcement (license suspension, garnishment) starts."],
        formKeys: [],
      },
    ],
  };
}

function uscis(): ActionPathsResult {
  return {
    question: "This is an immigration (USCIS) notice. Immigration deadlines are strict — choose carefully.",
    paths: [
      {
        key: "respond_rfe",
        label: "Respond to the request by the deadline",
        description: "For a Request for Evidence (RFE) or Notice of Intent to Deny (NOID), send ALL requested evidence in ONE response before the deadline.",
        tone: "caution",
        recommended: true,
        steps: [
          "Find the exact response deadline on the notice — missing it usually means denial.",
          "Gather every document listed, and include the notice's barcode/cover page on top.",
          "Submit everything together in a single response and keep copies + proof of mailing.",
        ],
        formKeys: [],
      },
      {
        key: "attorney",
        label: "Talk to an immigration attorney or accredited rep",
        description: "Immigration outcomes are high-stakes. Free or low-cost accredited help is available — avoid 'notario' scams.",
        steps: [
          "Find a licensed immigration attorney or a DOJ-recognized accredited representative.",
          "Bring the notice and your full case history.",
        ],
        formKeys: [],
        externalUrl: USCIS_FIND_LEGAL,
        externalLabel: "Find legal services (USCIS)",
      },
      {
        key: "appeal",
        label: "If you were denied — appeal or file a motion",
        description: "Many denials can be appealed or reopened with Form I-290B within a short deadline.",
        steps: [
          "Check the notice for appeal rights and the deadline (often 30 days).",
          "File Form I-290B (Notice of Appeal or Motion) if it applies to your case.",
        ],
        formKeys: [],
        externalUrl: "https://www.uscis.gov/i-290b",
        externalLabel: "About Form I-290B",
      },
    ],
  };
}

function medicaid(): ActionPathsResult {
  return {
    question: "This is a Medicaid notice. How would you like to respond?",
    paths: [
      {
        key: "appeal",
        label: "Appeal / request a fair hearing",
        description: "If your Medicaid was denied, reduced, or terminated, you have the right to appeal — and the deadline is often short.",
        tone: "caution",
        recommended: true,
        steps: [
          "Find the appeal deadline on the notice (sometimes as little as 10–30 days).",
          "Request a fair hearing as instructed on the notice.",
          "If you appeal before the change takes effect, your benefits may continue during the appeal.",
        ],
        formKeys: [],
      },
      {
        key: "renew",
        label: "Send the information they requested (renewal)",
        description: "For a renewal or information request, respond by the deadline to avoid losing coverage.",
        steps: [
          "Gather the requested documents (income, residency, household).",
          "Submit them by the deadline through your state Medicaid agency.",
        ],
        formKeys: [],
        externalUrl: MEDICAID_GOV,
        externalLabel: "Medicaid.gov",
      },
    ],
  };
}

function trafficCitation(stateCode?: string | null): ActionPathsResult {
  return {
    question: "You got a traffic ticket / citation. How would you like to handle it?",
    paths: [
      {
        key: "contest",
        label: "Contest it in court",
        description: "Plead not guilty and ask for a hearing — useful if the ticket is wrong or points would hurt your license/insurance.",
        tone: "caution",
        recommended: true,
        steps: [
          "Find the response deadline on the citation (often 15–30 days).",
          "Enter a not-guilty plea and request a hearing the way the citation describes.",
          "Bring evidence (photos, witnesses, records) to your hearing.",
        ],
        formKeys: [],
        externalUrl: courtSelfHelpUrl(stateCode),
        externalLabel: "Traffic court self-help",
      },
      {
        key: "traffic_school",
        label: "Ask about traffic school",
        description: "Many courts let you take a defensive-driving course to keep points off your record.",
        steps: ["Ask the court (by the deadline) whether traffic school is available for your ticket."],
        formKeys: [],
      },
      {
        key: "pay",
        label: "Just pay the ticket",
        description: "Paying usually counts as pleading guilty and may add points — pay by the deadline to avoid extra penalties.",
        steps: ["Pay through the court or citation portal printed on the ticket and keep the confirmation."],
        formKeys: [],
      },
    ],
  };
}

function dmvNotice(): ActionPathsResult {
  return {
    question: "This is a DMV / driver's license notice. How would you like to respond?",
    paths: [
      {
        key: "reinstate",
        label: "Reinstate my license / registration",
        description: "Resolve the underlying issue (unpaid tickets, insurance lapse, fees) and complete your state's reinstatement steps.",
        tone: "positive",
        recommended: true,
        steps: [
          "Read the notice for exactly why the action was taken and what's required to fix it.",
          "Pay any reinstatement fees and resolve the underlying cause.",
          "Follow your state DMV's reinstatement process.",
        ],
        formKeys: [],
        externalUrl: DMV_SERVICES,
        externalLabel: "Find your state DMV",
      },
      {
        key: "hearing",
        label: "Request a DMV hearing",
        description: "For suspensions you can contest (points, admin actions), request an administrative hearing by the deadline.",
        tone: "caution",
        steps: ["Request a hearing as the notice instructs, before the deadline, to keep your driving privileges if possible."],
        formKeys: [],
      },
      {
        key: "insurance",
        label: "File required insurance (SR-22)",
        description: "If the notice requires proof of insurance (SR-22/FR-44), your insurer can file it with the state.",
        steps: ["Ask your auto insurer to file the SR-22/FR-44 with your state DMV."],
        formKeys: [],
      },
    ],
  };
}

function jurySummons(): ActionPathsResult {
  return {
    question: "You received a jury duty summons. How would you like to respond?",
    paths: [
      {
        key: "respond",
        label: "Respond and plan to serve",
        description: "Confirm receipt and note your reporting date and instructions.",
        recommended: true,
        steps: [
          "Complete and return the questionnaire by the date on the summons (many courts allow online response).",
          "Note your reporting date, time, and location, and any call-in instructions.",
        ],
        formKeys: [],
      },
      {
        key: "excusal",
        label: "Request an excusal or postponement",
        description: "If serving on that date is a hardship, ask to be excused or to reschedule.",
        steps: [
          "Follow the summons instructions to request an excusal or deferral, with any required proof.",
          "Submit the request before the deadline.",
        ],
        formKeys: [],
      },
    ],
  };
}

function probateEstate(stateCode?: string | null): ActionPathsResult {
  return {
    question: "This is a probate / estate notice. How would you like to respond?",
    paths: [
      {
        key: "attorney",
        label: "Talk to a probate attorney",
        description: "Estate matters have strict deadlines (creditor claims, will contests) and vary a lot by state — professional advice is worth it.",
        tone: "caution",
        recommended: true,
        steps: [
          "Note any deadline on the notice (claim periods can be just a few months).",
          "Consult a probate attorney, especially if significant assets or a dispute are involved.",
        ],
        formKeys: [],
        externalUrl: courtSelfHelpUrl(stateCode),
        externalLabel: "Probate court self-help",
      },
      {
        key: "heir",
        label: "I'm an heir or beneficiary",
        description: "Respond to the notice to protect your interest in the estate.",
        steps: [
          "Read what the notice asks of you and the deadline.",
          "File any objection or claim with the probate court on time.",
        ],
        formKeys: [],
      },
      {
        key: "creditor",
        label: "I'm owed money by the estate (creditor)",
        description: "File a creditor's claim against the estate before the claim deadline.",
        steps: [
          "Find the creditor-claim deadline in the notice.",
          "File your claim with the probate court, with documentation, before it expires.",
        ],
        formKeys: [],
        letterType: "generic_response",
      },
    ],
  };
}

function studentLoan(): ActionPathsResult {
  return {
    question: "This is about a student loan. How would you like to handle it?",
    paths: [
      {
        key: "lower_payment",
        label: "Lower my monthly payment",
        description: "Federal loans offer income-driven repayment (IDR) plans — payments are based on income and can be as low as $0.",
        tone: "positive",
        recommended: true,
        steps: [
          "Confirm whether your loans are federal (studentaid.gov) or private (your lender).",
          "For federal loans, apply for an income-driven repayment plan.",
          "Ask your servicer to confirm your new payment in writing.",
        ],
        formKeys: [],
        externalUrl: STUDENT_AID_IDR,
        externalLabel: "Income-driven repayment (federal)",
      },
      {
        key: "get_out_of_default",
        label: "Get out of default",
        description: "If a federal loan is in default, loan rehabilitation or consolidation can restore good standing and stop wage garnishment or tax-refund offset.",
        tone: "caution",
        steps: [
          "Contact your federal loan servicer or the default resolution group.",
          "Ask about loan rehabilitation or consolidation to exit default.",
        ],
        formKeys: [],
        externalUrl: STUDENT_AID,
        externalLabel: "Get out of default (federal)",
      },
      {
        key: "dispute",
        label: "Dispute the loan or balance",
        description: "If the loan isn't yours, was paid, or the balance is wrong, dispute it in writing.",
        steps: [
          "Write to the servicer/collector identifying the error and requesting verification.",
          "For a loan you never took out, also report possible identity theft.",
        ],
        formKeys: [],
        letterType: "debt_validation",
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
  if (t === "irs_notice_deficiency") return irsNoticeOfDeficiency();
  if (t === "irs_notice_cp2000") return irsCp2000();
  if (t === "irs_identity_verification") return irsIdentityVerification();
  if (t === "irs_audit") return irsAudit();
  if (t === "irs_penalty") return irsPenalty();
  if (t === "irs_lien") return irsLien();
  if (t.startsWith("irs_notice") || t.startsWith("irs_")) return irsGeneric();

  if (t.startsWith("state_tax")) {
    if (t.includes("balance_due")) return stateTaxBalanceDue();
    return genericOfficial();
  }

  if (t === "ssa_overpayment") return ssaOverpayment();
  if (t === "ssa_benefit_change" || t === "ssa_generic") return ssaGeneric();

  if (t === "va_debt" || t === "va_benefit") return vaBenefitOrDebt();

  if (t === "court_summons") return courtSummons(stateCode);
  if (t === "court_judgment") return courtJudgment(stateCode);
  if (t === "child_support") return childSupport(stateCode);
  if (t === "wage_garnishment") return wageGarnishment(stateCode);
  if (t === "eviction_notice") return evictionNotice(stateCode);

  if (t === "bank_collection" || t === "credit_card_chargeoff") return debtCollection();
  if (t === "mortgage_default") return foreclosure();

  if (t === "medical_bill") return medicalBill();
  if (t === "utility_disconnect") return utilityDisconnect();
  if (t === "hoa_violation") return hoaViolation();

  if (t.startsWith("uscis")) return uscis();
  if (t.startsWith("medicaid")) return medicaid();

  if (t === "traffic_citation") return trafficCitation(stateCode);
  if (t === "dmv_notice") return dmvNotice();
  if (t === "jury_summons") return jurySummons();
  if (t === "probate_estate") return probateEstate(stateCode);
  if (t === "student_loan") return studentLoan();

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
