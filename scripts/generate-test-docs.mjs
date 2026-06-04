/**
 * Generate 20 realistic US government / financial test documents as PDFs.
 * Run: node scripts/generate-test-docs.mjs
 * Output: test-documents/ folder
 */
import PdfPrinter from "../node_modules/pdfmake/src/printer.js";
import { readFileSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

// Load built-in fonts (pdfmake exports the vfs directly as module.exports)
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const vfs = require("../node_modules/pdfmake/build/vfs_fonts.js");

const fonts = {
  Roboto: {
    normal: Buffer.from(vfs["Roboto-Regular.ttf"], "base64"),
    bold: Buffer.from(vfs["Roboto-Medium.ttf"], "base64"),
    italics: Buffer.from(vfs["Roboto-Italic.ttf"], "base64"),
    bolditalics: Buffer.from(vfs["Roboto-MediumItalic.ttf"], "base64"),
  },
};

const printer = new PdfPrinter(fonts);
const OUT = "test-documents";
mkdirSync(OUT, { recursive: true });

async function makePdf(filename, docDef) {
  return new Promise((resolve, reject) => {
    const doc = printer.createPdfKitDocument(docDef);
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => {
      const buf = Buffer.concat(chunks);
      writeFileSync(path.join(OUT, filename), buf);
      console.log(`✓ ${filename}`);
      resolve();
    });
    doc.on("error", reject);
    doc.end();
  });
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const PAGE = { margin: [60, 50, 60, 50], pageSize: "LETTER" };
const HEADER_IRS   = { text: "Department of the Treasury — Internal Revenue Service", style: "agency" };
const HEADER_SSA   = { text: "Social Security Administration", style: "agency" };
const HEADER_FTB   = { text: "State of California — Franchise Tax Board", style: "agency" };
const HEADER_USCIS = { text: "U.S. Department of Homeland Security — USCIS", style: "agency" };
const HEADER_VA    = { text: "U.S. Department of Veterans Affairs — Debt Management Center", style: "agency" };
const HEADER_CMS   = { text: "Centers for Medicare & Medicaid Services", style: "agency" };
const HEADER_DOL   = { text: "State of Texas — Texas Workforce Commission", style: "agency" };
const HEADER_COURT = { text: "SUPERIOR COURT OF THE STATE OF CALIFORNIA\nCOUNTY OF LOS ANGELES", style: "agency" };

const baseStyles = {
  agency: { fontSize: 11, bold: true, color: "#1a3a6b", margin: [0, 0, 0, 4] },
  h1:     { fontSize: 14, bold: true, margin: [0, 10, 0, 6] },
  h2:     { fontSize: 11, bold: true, margin: [0, 10, 0, 4] },
  label:  { fontSize: 9, color: "#555" },
  small:  { fontSize: 9, color: "#666" },
  notice: { fontSize: 9, italics: true, color: "#444", margin: [0, 12, 0, 0] },
  bold:   { bold: true },
  mono:   { font: "Roboto", fontSize: 10 },
};

function hr() { return { canvas: [{ type: "line", x1: 0, y1: 0, x2: 492, y2: 0, lineWidth: 0.5, lineColor: "#bbb" }], margin: [0, 6, 0, 6] }; }
function sp(h = 6) { return { text: " ", fontSize: h / 2 }; }

function addressBlock(lines) {
  return { text: lines.join("\n"), style: "small", margin: [0, 0, 0, 8] };
}

function metaRow(label, value) {
  return {
    columns: [
      { text: label, style: "label", width: 140 },
      { text: value, style: "mono", width: "*" },
    ],
    margin: [0, 1, 0, 1],
  };
}

function urgentBox(text) {
  return {
    table: { widths: ["*"], body: [[{ text, bold: true, color: "white", fillColor: "#c0392b", margin: [8, 6, 8, 6] }]] },
    layout: "noBorders",
    margin: [0, 8, 0, 8],
  };
}

function infoBox(text, color = "#1a3a6b") {
  return {
    table: { widths: ["*"], body: [[{ text, color: "white", fillColor: color, margin: [8, 6, 8, 6] }]] },
    layout: "noBorders",
    margin: [0, 8, 0, 8],
  };
}

// ─── Document definitions ─────────────────────────────────────────────────────

const docs = [

// 1. IRS CP14 — Balance Due First Notice
{
  file: "01_IRS_CP14_Balance_Due.pdf",
  def: {
    ...PAGE,
    styles: baseStyles,
    content: [
      HEADER_IRS, hr(),
      { columns: [
        addressBlock(["John A. Doe", "1247 Maple Street", "Austin, TX 78701-4321"]),
        { stack: [
          metaRow("Notice:", "CP14"),
          metaRow("Tax Year:", "2023"),
          metaRow("Notice Date:", "April 15, 2025"),
          metaRow("Social Security Number:", "XXX-XX-4521"),
          metaRow("Amount Due:", "$3,421.87"),
        ], alignment: "right" },
      ]},
      { text: "Notice CP14 — We Believe You Owe Additional Tax", style: "h1" },
      urgentBox("AMOUNT DUE: $3,421.87 — Please pay by May 5, 2025 to avoid additional penalties and interest."),
      { text: "Why you received this notice", style: "h2" },
      { text: "Our records show that you owe taxes for the tax year ending December 31, 2023. You have unpaid taxes of $2,980.00 plus accrued penalties of $298.00 and interest of $143.87.", margin: [0, 0, 0, 8] },
      { text: "Your account summary", style: "h2" },
      { table: { widths: [200, "*"], body: [
        [{ text: "Unpaid tax", bold: true }, "$2,980.00"],
        [{ text: "Failure-to-pay penalty (IRC §6651)", bold: true }, "$298.00"],
        [{ text: "Interest charged (IRC §6601)", bold: true }, "$143.87"],
        [{ text: "Total amount due", bold: true, fillColor: "#f0f0f0" }, { text: "$3,421.87", bold: true, fillColor: "#f0f0f0" }],
      ]}, layout: "lightHorizontalLines", margin: [0, 0, 0, 10] },
      { text: "What you need to do", style: "h2" },
      { ul: ["Pay the full amount by May 5, 2025 to stop additional interest and penalties from accruing.", "If you cannot pay in full, you may be able to set up a payment plan. Visit IRS.gov/payments or call 1-800-829-1040.", "If you disagree with the amount, you may request an appeal within 60 days of the notice date."] },
      { text: "How to pay", style: "h2" },
      { text: "Pay online at IRS Direct Pay (irs.gov/directpay), by check payable to 'United States Treasury', or by phone at 1-800-829-1040. Include your SSN and tax year on all payments.", margin: [0, 0, 0, 8] },
      hr(),
      { text: "This is not a bill for taxes you have already paid. If you have recently made a payment, allow 2–3 weeks for processing before contacting us.", style: "notice" },
    ],
  },
},

// 2. IRS CP2000 — Proposed Income Adjustment
{
  file: "02_IRS_CP2000_Income_Mismatch.pdf",
  def: {
    ...PAGE,
    styles: baseStyles,
    content: [
      HEADER_IRS, hr(),
      { columns: [
        addressBlock(["Sarah M. Johnson", "8834 Oak Avenue, Apt 4B", "Phoenix, AZ 85001-2211"]),
        { stack: [
          metaRow("Notice:", "CP2000"),
          metaRow("Tax Year:", "2023"),
          metaRow("Notice Date:", "June 10, 2025"),
          metaRow("SSN:", "XXX-XX-7832"),
          metaRow("Proposed Amount Due:", "$1,204.00"),
        ], alignment: "right" },
      ]},
      { text: "Notice CP2000 — We Propose Changes to Your 2023 Tax Return", style: "h1" },
      infoBox("This is a PROPOSED notice, not a bill. You have 60 days to respond. You are not required to pay until the issue is resolved.", "#2874a6"),
      { text: "What we found", style: "h2" },
      { text: "Our records show income that is different from what you reported on your 2023 federal income tax return. The income shown below was reported to us by a payer on Form 1099 but does not appear on your return.", margin: [0, 0, 0, 8] },
      { table: { widths: [150, 100, 100, "*"], body: [
        [{ text: "Payer", bold: true }, { text: "Form Type", bold: true }, { text: "Amount Reported", bold: true }, { text: "Amount on Return", bold: true }],
        ["Stripe Payments Inc.", "1099-K", "$18,420.00", "$0"],
        ["Upwork Global Inc.", "1099-NEC", "$4,200.00", "$0"],
      ]}, layout: "lightHorizontalLines", margin: [0, 0, 0, 10] },
      { text: "Proposed adjustment", style: "h2" },
      { table: { widths: [200, "*"], body: [
        ["Additional income subject to tax", "$22,620.00"],
        ["Additional tax at 22% bracket", "$4,976.40"],
        ["Less: estimated self-employment deductions", "($3,772.40)"],
        [{ text: "Proposed additional tax", bold: true }, { text: "$1,204.00", bold: true }],
      ]}, layout: "lightHorizontalLines", margin: [0, 0, 0, 10] },
      { text: "Your options", style: "h2" },
      { ul: ["Agree: Complete and return the response form with payment of $1,204.00.", "Disagree: Provide documentation showing why the income is incorrect or already reported. Respond within 60 days.", "Partial agreement: Explain which items you agree/disagree with."] },
      hr(),
      { text: "Respond by: August 10, 2025 | Questions? Call 1-800-829-8374", style: "notice" },
    ],
  },
},

// 3. IRS CP504 — Intent to Levy
{
  file: "03_IRS_CP504_Intent_to_Levy.pdf",
  def: {
    ...PAGE,
    styles: baseStyles,
    content: [
      HEADER_IRS, hr(),
      { columns: [
        addressBlock(["Robert T. Williams", "555 Pine Road", "Nashville, TN 37201-8800"]),
        { stack: [
          metaRow("Notice:", "CP504"),
          metaRow("Tax Year:", "2022"),
          metaRow("Notice Date:", "March 1, 2025"),
          metaRow("SSN:", "XXX-XX-3309"),
          metaRow("Amount Due:", "$8,754.22"),
        ], alignment: "right" },
      ]},
      { text: "Notice CP504 — Intent to Seize (Levy) Your State Tax Refund or Other Property", style: "h1" },
      urgentBox("URGENT: PAY IMMEDIATELY — We intend to levy (seize) your state tax refund and other property. Amount due: $8,754.22"),
      { text: "What this means", style: "h2" },
      { text: "This is your FINAL NOTICE before the IRS levies (seizes) your state tax refund, wages, bank accounts, or other assets. We have sent you several previous notices and have not received payment. If you do not pay within 30 days, we WILL seize your property without further notice.", margin: [0, 0, 0, 8] },
      { text: "Account balance", style: "h2" },
      { table: { widths: [200, "*"], body: [
        ["Tax assessed (Form 1040)", "$6,800.00"],
        ["Failure-to-pay penalty (IRC §6651)", "$680.00"],
        ["Failure-to-file penalty (IRC §6651)", "$1,020.00"],
        ["Interest (IRC §6601)", "$254.22"],
        [{ text: "Total amount due NOW", bold: true, fillColor: "#f8d7da" }, { text: "$8,754.22", bold: true, fillColor: "#f8d7da" }],
      ]}, layout: "lightHorizontalLines", margin: [0, 0, 0, 10] },
      { text: "Your rights before levy", style: "h2" },
      { ul: [
        "Request a Collection Due Process (CDP) hearing by filing Form 12153 within 30 days of this notice.",
        "Request an installment agreement using Form 9465 if you cannot pay in full.",
        "Contact the Taxpayer Advocate Service at 1-877-777-4778 if you are experiencing financial hardship.",
        "Explore Offer in Compromise (Form 656) if you cannot pay the full amount.",
      ]},
      { text: "How to pay", style: "h2" },
      { text: "IRS Direct Pay: irs.gov/directpay | Phone: 1-800-829-1040 | Make checks payable to: United States Treasury", margin: [0, 0, 0, 8] },
      hr(),
      { text: "Response deadline: 30 days from notice date (April 1, 2025) | Notice reference: LT-2025-CP504-78832", style: "notice" },
    ],
  },
},

// 4. IRS LT11 — Final Notice Before Levy (Wage Garnishment)
{
  file: "04_IRS_LT11_Final_Notice_Levy.pdf",
  def: {
    ...PAGE,
    styles: baseStyles,
    content: [
      HEADER_IRS, hr(),
      { columns: [
        addressBlock(["Maria L. Garcia", "2201 Elm Street", "Chicago, IL 60601-5511"]),
        { stack: [
          metaRow("Notice:", "LT11 / Letter 1058"),
          metaRow("Tax Year:", "2021–2022"),
          metaRow("Notice Date:", "February 14, 2025"),
          metaRow("SSN:", "XXX-XX-6641"),
          metaRow("Amount Due:", "$14,320.98"),
        ], alignment: "right" },
      ]},
      { text: "LT11 — Final Notice of Intent to Levy and Notice of Your Right to a Hearing", style: "h1" },
      urgentBox("FINAL NOTICE — 30 DAYS TO ACT. Failure to respond will result in levy of wages, bank accounts, and other assets."),
      { text: "We intend to seize your property", style: "h2" },
      { text: "You have not fully paid your outstanding federal tax debt despite previous notices. This is your final opportunity to resolve this matter before we levy your wages, salary, retirement funds, bank accounts, real estate, vehicles, and other property.", margin: [0, 0, 0, 8] },
      { table: { widths: [200, "*"], body: [
        ["2021 Form 1040 — Tax", "$7,200.00"],
        ["2022 Form 1040 — Tax", "$4,800.00"],
        ["Combined penalties", "$1,440.00"],
        ["Accrued interest", "$880.98"],
        [{ text: "Total balance due", bold: true }, { text: "$14,320.98", bold: true }],
      ]}, layout: "lightHorizontalLines", margin: [0, 0, 0, 10] },
      { text: "Your appeal rights (important — act within 30 days)", style: "h2" },
      { ul: [
        "File Form 12153 to request a Collection Due Process (CDP) hearing — this suspends levy action while under review.",
        "File for an installment agreement (Form 9465) to pay in monthly amounts.",
        "File Form 656 for an Offer in Compromise if you cannot afford to pay the full amount.",
        "File Form 2848 to have a representative (attorney/CPA/enrolled agent) handle this for you.",
      ]},
      hr(),
      { text: "30-day deadline: March 16, 2025 | IRS office: Austin Compliance Services Center | IRS EIN: 72-0745160", style: "notice" },
    ],
  },
},

// 5. IRS CP75 — Audit / Examination Notice (EITC)
{
  file: "05_IRS_CP75_Audit_EITC.pdf",
  def: {
    ...PAGE,
    styles: baseStyles,
    content: [
      HEADER_IRS, hr(),
      { columns: [
        addressBlock(["Carlos E. Martinez", "990 Willow Lane", "Houston, TX 77001-3344"]),
        { stack: [
          metaRow("Notice:", "CP75"),
          metaRow("Tax Year:", "2023"),
          metaRow("Notice Date:", "July 8, 2025"),
          metaRow("SSN:", "XXX-XX-1188"),
          metaRow("EITC Claimed:", "$3,584.00"),
        ], alignment: "right" },
      ]},
      { text: "Notice CP75 — We're Auditing Your 2023 Tax Return — Earned Income Tax Credit", style: "h1" },
      infoBox("Action required: Submit the requested documents by August 22, 2025.", "#1a5276"),
      { text: "Why we're contacting you", style: "h2" },
      { text: "We are auditing your 2023 federal income tax return because we need to verify your eligibility for the Earned Income Tax Credit (EITC) you claimed. Your EITC claim of $3,584.00 is being held while we review your qualification.", margin: [0, 0, 0, 8] },
      { text: "Documents you must provide", style: "h2" },
      { ul: [
        "Proof of residence for all qualifying children listed on your return (school records, medical records, or government-issued documents showing your address and the child's name).",
        "Birth certificates or adoption papers for all qualifying children.",
        "Your W-2s, 1099s, or business records showing all 2023 income.",
        "If self-employed: Schedule C, bank statements, and receipts for business expenses.",
      ]},
      { text: "How to respond", style: "h2" },
      { text: "Mail or fax the requested documents to the address below. Include a copy of this notice with your response.", margin: [0, 0, 0, 8] },
      { text: "Internal Revenue Service\nAudit Correspondence Unit\nP.O. Box 9053\nOgden, UT 84409-0053\nFax: 1-877-807-9215", style: "small", margin: [0, 0, 0, 10] },
      hr(),
      { text: "Response deadline: August 22, 2025 | Reference: 2025-CP75-HOU-449321 | Questions: 1-800-829-0922", style: "notice" },
    ],
  },
},

// 6. IRS CP12 — Math Error — Refund Decreased
{
  file: "06_IRS_CP12_Refund_Changed.pdf",
  def: {
    ...PAGE,
    styles: baseStyles,
    content: [
      HEADER_IRS, hr(),
      { columns: [
        addressBlock(["Amanda K. Thompson", "3300 Birch Court", "Seattle, WA 98101-7722"]),
        { stack: [
          metaRow("Notice:", "CP12"),
          metaRow("Tax Year:", "2023"),
          metaRow("Notice Date:", "May 20, 2025"),
          metaRow("SSN:", "XXX-XX-9902"),
          metaRow("Adjusted Refund:", "$1,847.00"),
        ], alignment: "right" },
      ]},
      { text: "Notice CP12 — We Changed Your Return — Refund Amount Adjusted", style: "h1" },
      infoBox("We found a math error on your return. Your refund has been adjusted to $1,847.00. No action required unless you disagree.", "#27ae60"),
      { text: "What we changed and why", style: "h2" },
      { table: { widths: [200, 120, 120], body: [
        [{ text: "Item", bold: true }, { text: "Your Return", bold: true }, { text: "Our Correction", bold: true }],
        ["Child Tax Credit (3 children)", "$5,600.00", "$4,000.00"],
        ["Credit for Other Dependents", "$0.00", "$500.00"],
        ["Total credits applied", "$5,600.00", "$4,500.00"],
        [{ text: "Adjusted refund", bold: true }, { text: "$3,047.00", bold: true }, { text: "$1,847.00", bold: true }],
      ]}, layout: "lightHorizontalLines", margin: [0, 0, 0, 10] },
      { text: "Explanation", style: "h2" },
      { text: "The Child Tax Credit for Tax Year 2023 is limited to $2,000 per qualifying child under age 17. You claimed the full credit for three children ($5,600), but the maximum allowable is $4,000 (2 children under 17 × $2,000). Your third dependent qualifies for the $500 Credit for Other Dependents instead.", margin: [0, 0, 0, 8] },
      { text: "What happens next", style: "h2" },
      { text: "Your corrected refund of $1,847.00 will be issued within 4–6 weeks. If you disagree with this change, you have 60 days to contact us.", margin: [0, 0, 0, 8] },
      hr(),
      { text: "Disagree? Call 1-800-829-0922 or write to us within 60 days. Include this notice and your explanation.", style: "notice" },
    ],
  },
},

// 7. SSA Overpayment Notice
{
  file: "07_SSA_Overpayment_Notice.pdf",
  def: {
    ...PAGE,
    styles: baseStyles,
    content: [
      HEADER_SSA, hr(),
      { columns: [
        addressBlock(["Dorothy A. Wilson", "742 Evergreen Terrace", "Springfield, OH 45501"]),
        { stack: [
          metaRow("Beneficiary:", "DOROTHY A. WILSON"),
          metaRow("Claim Number:", "123-45-6789A"),
          metaRow("Date of Notice:", "January 15, 2025"),
          metaRow("Amount Overpaid:", "$2,140.00"),
          metaRow("Repayment Deadline:", "February 15, 2025"),
        ], alignment: "right" },
      ]},
      { text: "Important Notice: You Were Overpaid Social Security Benefits", style: "h1" },
      urgentBox("You have been overpaid $2,140.00 in Social Security benefits. You must repay this money or request a waiver."),
      { text: "Why you were overpaid", style: "h2" },
      { text: "Our records show that you received more Social Security Disability Insurance (SSDI) benefits than you were entitled to during the period August 2024 through December 2024. This occurred because your countable income exceeded the Substantial Gainful Activity (SGA) limit of $1,550/month for 3 months during this period.", margin: [0, 0, 0, 8] },
      { table: { widths: [120, 100, 100, "*"], body: [
        [{ text: "Period", bold: true }, { text: "Benefits Paid", bold: true }, { text: "Benefits Owed", bold: true }, { text: "Overpayment", bold: true }],
        ["August 2024", "$1,428.00", "$0.00", "$1,428.00"],
        ["September 2024", "$356.00", "$0.00", "$356.00"],
        ["October 2024", "$356.00", "$0.00", "$356.00"],
        [{ text: "Total", bold: true }, { text: "$2,140.00", bold: true }, { text: "$0.00", bold: true }, { text: "$2,140.00", bold: true }],
      ]}, layout: "lightHorizontalLines", margin: [0, 0, 0, 10] },
      { text: "Your options", style: "h2" },
      { ol: [
        { text: [{ text: "Repay in full: ", bold: true }, "Send a check or money order for $2,140.00 payable to 'Social Security Administration'."] },
        { text: [{ text: "Request a repayment plan: ", bold: true }, "Call 1-800-772-1213 to arrange smaller monthly payments."] },
        { text: [{ text: "Request a waiver: ", bold: true }, "If the overpayment was not your fault AND repayment would be a financial hardship, you may request that SSA forgive the debt (Form SSA-632)."] },
        { text: [{ text: "Request reconsideration: ", bold: true }, "If you believe the overpayment is incorrect, you have 60 days to ask SSA to review the decision (Form SSA-561)."] },
      ]},
      hr(),
      { text: "SSA Helpline: 1-800-772-1213 (TTY 1-800-325-0778) | Office: 400 N. Main St., Springfield, OH 45501", style: "notice" },
    ],
  },
},

// 8. SSA Benefit Change Notice
{
  file: "08_SSA_Benefit_Change.pdf",
  def: {
    ...PAGE,
    styles: baseStyles,
    content: [
      HEADER_SSA, hr(),
      { columns: [
        addressBlock(["George H. Brown", "1600 Pennsylvania Ave NW", "Washington, DC 20500"]),
        { stack: [
          metaRow("Beneficiary:", "GEORGE H. BROWN"),
          metaRow("Claim Number:", "234-56-7890B"),
          metaRow("Notice Date:", "December 1, 2024"),
          metaRow("Effective Date:", "January 2025"),
        ], alignment: "right" },
      ]},
      { text: "Your Social Security Benefits Will Change in January 2025", style: "h1" },
      infoBox("Your monthly Social Security retirement benefit is changing due to the 2025 Cost-of-Living Adjustment (COLA). No action is required.", "#1a7a4a"),
      { text: "Your new benefit amount", style: "h2" },
      { table: { widths: [200, "*"], body: [
        [{ text: "Your benefit before change (Dec 2024)", bold: true }, "$1,860.00/month"],
        ["2025 COLA increase (2.5%)", "+ $46.50/month"],
        [{ text: "Your new benefit (effective Jan 2025)", bold: true }, { text: "$1,906.50/month", bold: true }],
        ["Medicare Part B premium (deducted)", "– $185.00/month"],
        [{ text: "Net payment to your bank account", bold: true }, { text: "$1,721.50/month", bold: true }],
      ]}, layout: "lightHorizontalLines", margin: [0, 0, 0, 10] },
      { text: "Medicare Part B premium", style: "h2" },
      { text: "The Medicare Part B premium for 2025 is $185.00 per month (up from $174.70 in 2024). This amount is automatically deducted from your Social Security payment.", margin: [0, 0, 0, 8] },
      { text: "Direct deposit information", style: "h2" },
      { text: "Your benefit will be deposited to your bank account on the second Wednesday of each month (based on your birth date). Verify your direct deposit information at ssa.gov/myaccount.", margin: [0, 0, 0, 8] },
      hr(),
      { text: "Questions? Visit ssa.gov or call 1-800-772-1213. Your local SSA office: 1099 New York Ave NW, Washington DC 20005.", style: "notice" },
    ],
  },
},

// 9. California FTB State Tax Balance Due
{
  file: "09_CA_FTB_State_Tax_Balance_Due.pdf",
  def: {
    ...PAGE,
    styles: baseStyles,
    content: [
      HEADER_FTB, hr(),
      { columns: [
        addressBlock(["Lisa R. Anderson", "7788 Sunset Blvd, #202", "Los Angeles, CA 90028"]),
        { stack: [
          metaRow("Notice Type:", "Balance Due"),
          metaRow("Tax Year:", "2023"),
          metaRow("Notice Date:", "March 15, 2025"),
          metaRow("SSN:", "XXX-XX-4471"),
          metaRow("Amount Due:", "$1,892.43"),
          metaRow("Due Date:", "April 30, 2025"),
        ], alignment: "right" },
      ]},
      { text: "California Franchise Tax Board — Balance Due Notice", style: "h1" },
      urgentBox("BALANCE DUE: $1,892.43 — Pay by April 30, 2025 to avoid additional penalties."),
      { text: "Account detail", style: "h2" },
      { table: { widths: [200, "*"], body: [
        ["2023 California Income Tax", "$1,580.00"],
        ["Late filing penalty (25%)", "$198.00"],
        ["Interest (daily rate 0.025%)", "$114.43"],
        [{ text: "Total Amount Due", bold: true }, { text: "$1,892.43", bold: true }],
      ]}, layout: "lightHorizontalLines", margin: [0, 0, 0, 10] },
      { text: "How to pay", style: "h2" },
      { ul: [
        "Online: ftb.ca.gov/pay — available 24/7",
        "Phone: 800-852-5711 (weekdays 8am–5pm)",
        "Mail check to: Franchise Tax Board, PO Box 942867, Sacramento CA 94267-0011",
        "Make check payable to: Franchise Tax Board. Write your SSN and tax year on check.",
      ]},
      { text: "Payment plan options", style: "h2" },
      { text: "If you cannot pay in full, you may request an installment agreement online at ftb.ca.gov. Monthly payments are available for balances up to $25,000.", margin: [0, 0, 0, 8] },
      hr(),
      { text: "FTB reference: 2025-CA-1040-BAL-2289014 | Questions: 800-852-5711 | ftb.ca.gov", style: "notice" },
    ],
  },
},

// 10. USCIS Request for Evidence
{
  file: "10_USCIS_RFE_I765.pdf",
  def: {
    ...PAGE,
    styles: baseStyles,
    content: [
      HEADER_USCIS, hr(),
      { columns: [
        addressBlock(["Min-Jun Kim", "450 Market Street, Apt 8C", "San Francisco, CA 94105"]),
        { stack: [
          metaRow("Form Type:", "I-765 (Employment Authorization)"),
          metaRow("Notice Type:", "Request for Evidence (RFE)"),
          metaRow("Receipt Number:", "MSC2590112345"),
          metaRow("Notice Date:", "April 2, 2025"),
          metaRow("Response Deadline:", "July 1, 2025 (90 days)"),
        ], alignment: "right" },
      ]},
      { text: "Request for Evidence — Form I-765, Application for Employment Authorization", style: "h1" },
      urgentBox("RESPOND BY JULY 1, 2025. Failure to respond may result in denial of your application."),
      { text: "Basis for this request", style: "h2" },
      { text: "USCIS has reviewed your Form I-765, Application for Employment Authorization, filed under category (c)(9) — pending adjustment of status. Your application cannot be approved because additional evidence is required to establish eligibility.", margin: [0, 0, 0, 8] },
      { text: "Evidence required", style: "h2" },
      { ol: [
        "A copy of your Form I-485 (Application to Register Permanent Residence) receipt notice showing your application is currently pending.",
        "Copy of your most recent visa stamp or I-94 arrival/departure record.",
        "Two passport-style photographs meeting USCIS requirements (2x2 inches, white background).",
        "Copy of valid government-issued photo ID (passport biographical page).",
      ]},
      { text: "How to respond", style: "h2" },
      { text: "Mail all requested evidence to the USCIS National Benefits Center address below. Include a copy of this notice with your response. All documents must be in English or accompanied by a certified translation.", margin: [0, 0, 0, 8] },
      { text: "USCIS — National Benefits Center\nAttn: I-765 RFE Response\nPO Box 648003\nLee's Summit, MO 64064-8003", style: "small", margin: [0, 0, 0, 10] },
      hr(),
      { text: "Response must be received (not postmarked) by July 1, 2025 | Receipt: MSC2590112345 | USCIS.gov", style: "notice" },
    ],
  },
},

// 11. VA Debt Management Notice
{
  file: "11_VA_Debt_Management.pdf",
  def: {
    ...PAGE,
    styles: baseStyles,
    content: [
      HEADER_VA, hr(),
      { columns: [
        addressBlock(["James D. Miller", "222 Veterans Way", "Dallas, TX 75201-4488"]),
        { stack: [
          metaRow("Veteran Name:", "JAMES D. MILLER"),
          metaRow("File Number:", "22-334-8821"),
          metaRow("Notice Date:", "May 5, 2025"),
          metaRow("Amount Owed:", "$1,340.00"),
          metaRow("Service Branch:", "U.S. Army"),
        ], alignment: "right" },
      ]},
      { text: "Notice of Indebtedness to the Department of Veterans Affairs", style: "h1" },
      infoBox("You have 30 days to repay, request a waiver, or set up a payment plan.", "#8e44ad"),
      { text: "Reason for debt", style: "h2" },
      { text: "Your disability compensation was overpaid during the period March 2024 – August 2024 because our records were not updated to reflect your return to full-time employment. Under 38 U.S.C. § 5112, VA is required to recover benefits paid in error.", margin: [0, 0, 0, 8] },
      { table: { widths: [200, "*"], body: [
        ["Monthly compensation rate paid", "$1,340.00 × 6 months"],
        ["Monthly compensation owed (reduced)", "$1,116.67 × 6 months"],
        [{ text: "Total overpayment", bold: true }, { text: "$1,340.00", bold: true }],
      ]}, layout: "lightHorizontalLines", margin: [0, 0, 0, 10] },
      { text: "Your options", style: "h2" },
      { ul: [
        "Repay in full: Send check payable to 'VA Debt Management Center', PO Box 11930, St. Paul MN 55111.",
        "Request a payment plan: Call 1-800-827-0648.",
        "Request a waiver: Submit VA Form 5655 (Financial Status Report) to request waiver of the debt if it would cause hardship.",
        "Request a hearing: You have the right to a hearing before VA makes a final decision on this debt.",
        "File a Supplemental Claim: If you believe the debt is incorrect, file VA Form 20-0995.",
      ]},
      hr(),
      { text: "VA Debt Management Center: 1-800-827-0648 | va.gov/manage-va-debt | 30-day response window", style: "notice" },
    ],
  },
},

// 12. Medicare IRMAA Premium Adjustment
{
  file: "12_Medicare_IRMAA_Premium.pdf",
  def: {
    ...PAGE,
    styles: baseStyles,
    content: [
      HEADER_CMS, hr(),
      { columns: [
        addressBlock(["Patricia G. Davis", "1 Beach Drive", "Miami, FL 33101-7755"]),
        { stack: [
          metaRow("Beneficiary:", "PATRICIA G. DAVIS"),
          metaRow("Medicare ID:", "1EG4-TE5-MK72"),
          metaRow("Notice Date:", "November 20, 2024"),
          metaRow("Effective:", "January 2025"),
          metaRow("New Part B Premium:", "$370.20/month"),
        ], alignment: "right" },
      ]},
      { text: "Medicare Part B and Part D Income-Related Monthly Adjustment Amount (IRMAA) for 2025", style: "h1" },
      infoBox("Your 2025 Medicare premiums are higher because your 2023 income was above certain limits. You may appeal if your income has decreased.", "#2874a6"),
      { text: "Why your premium increased", style: "h2" },
      { text: "Social Security uses your most recently filed federal tax return (2023) to determine your Medicare premiums. Because your 2023 modified adjusted gross income (MAGI) was in a higher income bracket, you will pay an Income-Related Monthly Adjustment Amount (IRMAA) in addition to the standard premium.", margin: [0, 0, 0, 8] },
      { table: { widths: [160, 100, 100, "*"], body: [
        [{ text: "2023 MAGI Range", bold: true }, { text: "Standard Premium", bold: true }, { text: "IRMAA Surcharge", bold: true }, { text: "Total Monthly Premium", bold: true }],
        ["$103,001 – $129,000 (your bracket)", "$185.00", "$185.20", "$370.20"],
        ["(Standard bracket below $103,000)", "$185.00", "$0.00", "$185.00"],
      ]}, layout: "lightHorizontalLines", margin: [0, 0, 0, 10] },
      { text: "If your income has changed", style: "h2" },
      { text: "If you had a significant life event in 2024 or 2025 that reduced your income (retirement, death of spouse, divorce, loss of pension), you may request that SSA use more recent income information. File Form SSA-44 to appeal.", margin: [0, 0, 0, 8] },
      hr(),
      { text: "Questions: SSA at 1-800-772-1213 | Medicare.gov | To appeal: Form SSA-44 within 60 days", style: "notice" },
    ],
  },
},

// 13. Court Civil Summons
{
  file: "13_Court_Civil_Summons.pdf",
  def: {
    ...PAGE,
    styles: baseStyles,
    content: [
      HEADER_COURT, hr(),
      { text: "SUMMONS — CIVIL", style: { fontSize: 16, bold: true, alignment: "center", margin: [0, 8, 0, 8] } },
      metaRow("Case Number:", "23STCV-08821-CIV"),
      metaRow("Filing Date:", "October 3, 2024"),
      metaRow("Department:", "32 — Unlimited Civil"),
      metaRow("Judge:", "Hon. Sandra M. Reyes"),
      hr(),
      { text: "PLAINTIFF:", style: "h2" },
      { text: "APEX FINANCIAL SERVICES LLC, a Delaware limited liability company", margin: [0, 0, 0, 8] },
      { text: "vs.", style: { alignment: "center", bold: true, margin: [0, 4, 0, 4] } },
      { text: "DEFENDANT:", style: "h2" },
      { text: "ROBERT A. NGUYEN, an individual; and DOES 1–20, inclusive", margin: [0, 0, 0, 12] },
      hr(),
      { text: "TO THE DEFENDANT — NOTICE:", style: "h2" },
      { text: "YOU ARE BEING SUED. You have 30 calendar days after this summons and legal papers are served on you to file a written response at this court and have a copy served on the plaintiff. A letter or phone call will not protect you; your written response must be in proper legal form if you want the court to hear your case.", margin: [0, 0, 0, 8] },
      { text: "If you do not respond within 30 days, the court may grant judgment against you by default for the money, property, or other relief requested in the complaint.", bold: true, margin: [0, 0, 0, 8] },
      { text: "Cause of action: Breach of Contract — Outstanding balance of $4,217.00 on Credit Account #XXXX-XXXX-XXXX-8834 pursuant to written credit agreement.", margin: [0, 0, 0, 10] },
      { text: "How to respond", style: "h2" },
      { text: "File a written Answer or other legal response with the court clerk at: 111 N. Hill Street, Los Angeles, CA 90012. Clerk's office hours: Mon–Fri 8:30am–4:30pm.", margin: [0, 0, 0, 8] },
      { text: "If you cannot afford an attorney, you may qualify for free legal help at lacba.org/volunteer-lawyer-program.", style: "small" },
      hr(),
      { text: "Issued by: Office of the Court Clerk, Los Angeles Superior Court | Date issued: October 3, 2024", style: "notice" },
    ],
  },
},

// 14. Unemployment Determination Letter
{
  file: "14_Unemployment_Determination.pdf",
  def: {
    ...PAGE,
    styles: baseStyles,
    content: [
      HEADER_DOL, hr(),
      { columns: [
        addressBlock(["Kevin B. Scott", "5050 Congress Ave", "Austin, TX 78701"]),
        { stack: [
          metaRow("Claimant:", "KEVIN B. SCOTT"),
          metaRow("SSN:", "XXX-XX-7733"),
          metaRow("Claim ID:", "TX-2025-UC-3342891"),
          metaRow("Notice Date:", "March 22, 2025"),
          metaRow("Weekly Benefit Amount:", "$449.00"),
        ], alignment: "right" },
      ]},
      { text: "Notice of Determination — Unemployment Insurance Benefits", style: "h1" },
      infoBox("Your claim has been APPROVED. Benefits begin March 30, 2025.", "#27ae60"),
      { text: "Determination details", style: "h2" },
      { text: "Your application for unemployment insurance benefits has been reviewed. Based on the information provided and wages reported by your former employer (ACME TECH CORPORATION), you have been found eligible for benefits.", margin: [0, 0, 0, 8] },
      { table: { widths: [200, "*"], body: [
        ["Last day worked:", "March 8, 2025"],
        ["Reason for separation:", "Layoff — position eliminated"],
        ["Base period wages:", "$46,200.00"],
        ["Weekly benefit amount (WBA):", "$449.00"],
        ["Maximum benefit amount:", "$11,674.00 (26 weeks)"],
        ["Benefit year begin:", "March 16, 2025"],
        ["Benefit year end:", "March 14, 2026"],
      ]}, layout: "lightHorizontalLines", margin: [0, 0, 0, 10] },
      { text: "Your responsibilities", style: "h2" },
      { ul: [
        "File your weekly claim every Sunday–Friday at Unemployment.Texas.gov or call the Tele-Serv system.",
        "Report all wages earned and job offers during each week you claim benefits.",
        "Be actively seeking work: you must make at least 3 job search contacts each week.",
        "Report any job offers you receive, even if you decline them.",
      ]},
      hr(),
      { text: "TWC Telephone Worktrend System: 800-558-8321 | Online: Unemployment.Texas.gov | Mail: PO Box 149137, Austin TX 78714", style: "notice" },
    ],
  },
},

// 15. Eviction / Pay or Quit Notice
{
  file: "15_Eviction_Pay_or_Quit.pdf",
  def: {
    ...PAGE,
    styles: baseStyles,
    content: [
      { text: "3-DAY NOTICE TO PAY RENT OR QUIT", style: { fontSize: 16, bold: true, alignment: "center", color: "#8b0000", margin: [0, 0, 0, 8] } },
      hr(),
      { text: "TO TENANT(S) IN POSSESSION OF THE PREMISES DESCRIBED HEREIN:", margin: [0, 0, 0, 8] },
      metaRow("Tenant Name(s):", "Jennifer L. Park and All Occupants"),
      metaRow("Property Address:", "1414 Clement Street, Apt 3, San Francisco, CA 94118"),
      metaRow("Notice Date:", "June 1, 2025"),
      hr(),
      { text: "PLEASE TAKE NOTICE that you are hereby required to pay the rent now due and past due on the above-described premises within THREE (3) DAYS from the date of service of this notice, as follows:", margin: [0, 8, 0, 8] },
      { table: { widths: [200, "*"], body: [
        [{ text: "Period", bold: true }, { text: "Amount", bold: true }],
        ["May 2025 rent (unpaid)", "$2,800.00"],
        ["June 2025 rent (current)", "$2,800.00"],
        ["Late fee (5% per lease §4.2)", "$280.00"],
        [{ text: "TOTAL AMOUNT DUE", bold: true }, { text: "$5,880.00", bold: true }],
      ]}, layout: "lightHorizontalLines", margin: [0, 0, 0, 12] },
      { text: "OR ALTERNATIVELY: Vacate and surrender possession of the said premises within THREE (3) DAYS from the date of service of this notice to the owner/agent.", bold: true, margin: [0, 0, 0, 8] },
      { text: "Payment must be made by: June 4, 2025 at 5:00 PM", bold: true, color: "#8b0000", margin: [0, 0, 0, 8] },
      { text: "Payment accepted: Personal check, cashier's check, or money order payable to SUNSET REALTY PARTNERS LLC.", margin: [0, 0, 0, 8] },
      { text: "Mail or deliver payment to:", style: "h2" },
      { text: "Sunset Realty Partners LLC\n Attn: Property Management\n 22 Financial District, Suite 400\n San Francisco, CA 94104\n Tel: (415) 555-0122", style: "small", margin: [0, 0, 0, 10] },
      urgentBox("FAILURE TO PAY OR VACATE WITHIN 3 DAYS WILL RESULT IN UNLAWFUL DETAINER (EVICTION) PROCEEDINGS BEING FILED AGAINST YOU IN COURT."),
      hr(),
      { text: "If you believe you have tenant protections under SF Rent Ordinance or AB 1482, contact a tenant rights organization: sf.gov/topics/renter-resources | 415-703-8634", style: "notice" },
    ],
  },
},

// 16. Medical Bill
{
  file: "16_Hospital_Medical_Bill.pdf",
  def: {
    ...PAGE,
    styles: baseStyles,
    content: [
      { text: "VALLEY GENERAL HOSPITAL", style: { fontSize: 16, bold: true, color: "#1a3a6b" } },
      { text: "1 Hospital Drive, Phoenix, AZ 85001 | Tel: (602) 555-0199 | Tax ID: 86-1234567", style: "small", margin: [0, 0, 0, 8] },
      hr(),
      { text: "PATIENT STATEMENT OF ACCOUNT", style: "h1" },
      { columns: [
        { stack: [
          metaRow("Patient:", "David R. Harris"),
          metaRow("DOB:", "07/15/1978"),
          metaRow("Account #:", "VGH-2025-089441"),
        ]},
        { stack: [
          metaRow("Statement Date:", "04/10/2025"),
          metaRow("Service Date:", "03/22/2025"),
          metaRow("Amount Due:", "$847.50"),
        ], alignment: "right" },
      ]},
      hr(),
      { text: "Service Detail", style: "h2" },
      { table: { widths: [60, 200, 80, 80, "*"], body: [
        [{ text: "Code", bold: true }, { text: "Description", bold: true }, { text: "Billed", bold: true }, { text: "Insurance", bold: true }, { text: "Your Share", bold: true }],
        ["99214", "Office/Outpatient Visit — Established Patient", "$325.00", "$260.00", "$65.00"],
        ["93000", "Electrocardiogram (ECG/EKG)", "$185.00", "$148.00", "$37.00"],
        ["85025", "Complete Blood Count (CBC)", "$110.00", "$88.00", "$22.00"],
        ["80053", "Comprehensive Metabolic Panel", "$195.00", "$156.00", "$39.00"],
        ["36415", "Venipuncture (blood draw)", "$75.00", "$60.00", "$15.00"],
        ["", { text: "Subtotal", bold: true }, { text: "$890.00", bold: true }, { text: "$712.00", bold: true }, { text: "$178.00", bold: true }],
        ["", "Hospital facility fee", "$3,375.00", "$2,705.50", "$669.50"],
        ["", { text: "TOTAL PATIENT RESPONSIBILITY", bold: true }, "", "", { text: "$847.50", bold: true }],
      ]}, layout: "lightHorizontalLines", margin: [0, 0, 0, 10] },
      { text: "Insurance: BlueCross BlueShield of Arizona | Plan: PPO Gold | Member ID: XCZ-884412-01 | Claim: 2025032209441", style: "small", margin: [0, 0, 0, 8] },
      { text: "Payment options", style: "h2" },
      { ul: ["Online: valleygeneral.org/pay-bill", "Phone: (602) 555-0199", "Mail check to address above (include account #)", "Payment plans available — call financial counseling: (602) 555-0198"] },
      hr(),
      { text: "Questions about your bill? Call (602) 555-0199 weekdays 8am–6pm. Financial assistance may be available — ask for a Patient Financial Services counselor.", style: "notice" },
    ],
  },
},

// 17. Insurance EOB
{
  file: "17_Insurance_EOB.pdf",
  def: {
    ...PAGE,
    styles: baseStyles,
    content: [
      { text: "AETNA HEALTH INSURANCE", style: { fontSize: 14, bold: true, color: "#c0392b" } },
      { text: "151 Farmington Avenue, Hartford, CT 06156 | aetna.com | Member Services: 1-800-872-3862", style: "small", margin: [0, 0, 0, 8] },
      hr(),
      { text: "EXPLANATION OF BENEFITS (EOB) — This is NOT a bill", style: { ...baseStyles.h1, color: "#c0392b" } },
      { columns: [
        { stack: [
          metaRow("Member:", "Emily C. Robinson"),
          metaRow("Member ID:", "W839204412"),
          metaRow("Group #:", "CORP-441-TX"),
        ]},
        { stack: [
          metaRow("Claim #:", "AET-2025-0338814"),
          metaRow("Date Processed:", "04/15/2025"),
          metaRow("Service Date:", "04/03/2025"),
        ], alignment: "right" },
      ]},
      hr(),
      { text: "Claim Summary", style: "h2" },
      metaRow("Provider:", "Austin Radiology Associates — In-Network"),
      metaRow("Service:", "MRI Brain without contrast (CPT 70553)"),
      { table: { widths: [200, "*"], body: [
        [{ text: "Provider charged", bold: true }, "$4,200.00"],
        ["Negotiated (contracted) rate", "– $2,730.00"],
        [{ text: "Amount applied to deductible", bold: true }, "$300.00"],
        ["Coinsurance (20% after deductible)", "$234.00"],
        [{ text: "Aetna paid", bold: true }, "$936.00"],
        [{ text: "Your responsibility", bold: true }, { text: "$534.00", bold: true }],
      ]}, layout: "lightHorizontalLines", margin: [0, 0, 0, 10] },
      { text: "Deductible & out-of-pocket status (year to date)", style: "h2" },
      { table: { widths: [200, 100, "*"], body: [
        [{ text: "Benefit", bold: true }, { text: "Used", bold: true }, { text: "Remaining", bold: true }],
        ["Individual deductible ($1,500)", "$1,500.00", "$0.00 (MET)"],
        ["Individual out-of-pocket max ($5,000)", "$1,534.00", "$3,466.00"],
      ]}, layout: "lightHorizontalLines", margin: [0, 0, 0, 10] },
      { text: "What to do if you disagree", style: "h2" },
      { text: "If you believe this claim was processed incorrectly, you have 180 days to file an appeal. Visit aetna.com/appeals or call Member Services at 1-800-872-3862.", margin: [0, 0, 0, 8] },
      hr(),
      { text: "THIS IS NOT A BILL. You may receive a bill directly from the provider for your share of $534.00.", style: "notice" },
    ],
  },
},

// 18. Business Invoice
{
  file: "18_Business_Invoice.pdf",
  def: {
    ...PAGE,
    styles: baseStyles,
    content: [
      { columns: [
        { stack: [
          { text: "SUNRISE CONSULTING LLC", style: { fontSize: 14, bold: true, color: "#1a3a6b" } },
          { text: "400 Technology Square, Suite 200\nBoston, MA 02139", style: "small" },
          { text: "EIN: 47-3829104 | info@sunriseconsulting.com", style: "small" },
        ]},
        { stack: [
          { text: "INVOICE", style: { fontSize: 20, bold: true, color: "#1a3a6b", alignment: "right" } },
          { text: "#INV-2025-0447", style: { alignment: "right", bold: true } },
          metaRow("Invoice Date:", "June 1, 2025"),
          metaRow("Due Date:", "June 30, 2025 (Net 30)"),
        ], alignment: "right" },
      ]},
      hr(),
      { text: "BILL TO:", style: "h2" },
      { text: "Meridian Software Inc.\n1800 Peachtree St NW, Suite 500\nAtlanta, GA 30309\nAttn: Accounts Payable", style: "small", margin: [0, 0, 0, 12] },
      { table: { widths: [300, 60, 80, "*"], body: [
        [{ text: "Description", bold: true }, { text: "Hours", bold: true }, { text: "Rate", bold: true }, { text: "Amount", bold: true }],
        ["IT Infrastructure Assessment — Phase 2", "24", "$225.00/hr", "$5,400.00"],
        ["Network Security Audit & Report", "12", "$225.00/hr", "$2,700.00"],
        ["Cloud Migration Planning Document", "8", "$225.00/hr", "$1,800.00"],
        ["Project Management & Client Calls", "6", "$175.00/hr", "$1,050.00"],
        ["Expenses: travel, lodging (receipts attached)", "—", "—", "$1,234.50"],
      ]}, layout: "lightHorizontalLines", margin: [0, 0, 0, 8] },
      hr(),
      { columns: [
        { text: " ", width: "*" },
        { table: { widths: [120, 80], body: [
          ["Subtotal", "$12,184.50"],
          ["Sales Tax (GA, 8.9%)", "$0.00"],
          [{ text: "TOTAL DUE", bold: true }, { text: "$12,184.50", bold: true }],
        ]}, layout: "noBorders", alignment: "right" },
      ]},
      sp(8),
      { text: "Payment Terms & Methods", style: "h2" },
      { ul: ["ACH/Bank Transfer: Routing 026009593 — Account 5544887712 (Bank of America)", "Check: Payable to Sunrise Consulting LLC", "Zelle/Wire: Contact billing@sunriseconsulting.com for instructions"] },
      { text: "Please include invoice number INV-2025-0447 with your payment.", style: "small", margin: [0, 8, 0, 0] },
      hr(),
      { text: "Thank you for your business! Questions? billing@sunriseconsulting.com | (617) 555-0182 | Payment due June 30, 2025.", style: "notice" },
    ],
  },
},

// 19. Office Supplies Receipt (for bookkeeping module)
{
  file: "19_Receipt_Office_Supplies.pdf",
  def: {
    ...PAGE,
    styles: baseStyles,
    content: [
      { text: "STAPLES", style: { fontSize: 18, bold: true, color: "#cc0000", alignment: "center" } },
      { text: "Store #1047 — 400 Congress Ave, Austin TX 78701\nTel: (512) 555-0144\nEIN: 04-3374954", style: { fontSize: 9, alignment: "center", color: "#555" }, margin: [0, 0, 0, 8] },
      hr(),
      { text: "RECEIPT", style: { alignment: "center", bold: true, fontSize: 12 } },
      { text: "Date: May 15, 2025  |  Time: 10:32 AM  |  Cashier: Maria T.  |  Transaction: 00847291", style: { fontSize: 8, alignment: "center", color: "#666" }, margin: [0, 2, 0, 8] },
      hr(),
      { table: { widths: [200, 60, 80, "*"], body: [
        [{ text: "Item", bold: true }, { text: "Qty", bold: true }, { text: "Price", bold: true }, { text: "Total", bold: true }],
        ["HP Copy Paper (500 sheets)", "2", "$11.99", "$23.98"],
        ["Staples Brand Ballpoint Pens (12pk)", "1", "$7.49", "$7.49"],
        ["Post-it Notes 3x3 (6 packs)", "1", "$12.99", "$12.99"],
        ["Avery Labels 30/sheet (100 sheets)", "1", "$18.99", "$18.99"],
        ["Sharpie Markers Assorted (8pk)", "1", "$8.99", "$8.99"],
        ["Scotch Tape Dispenser + 3 refills", "1", "$9.99", "$9.99"],
        ["Manila File Folders (25pk)", "2", "$6.49", "$12.98"],
      ]}, layout: "lightHorizontalLines", margin: [0, 0, 0, 8] },
      hr(),
      { table: { widths: ["*", 80], body: [
        ["Subtotal", "$95.41"],
        ["Texas Sales Tax (8.25%)", "$7.87"],
        [{ text: "TOTAL", bold: true }, { text: "$103.28", bold: true }],
        ["VISA ****4892 (Approved)", "$103.28"],
        [{ text: "CHANGE", bold: true }, { text: "$0.00", bold: true }],
      ]}, layout: "noBorders", margin: [0, 0, 0, 8] },
      hr(),
      { text: "Authorization Code: 438291 | Auth: Approved  |  Thank you for shopping at Staples!", style: "notice" },
    ],
  },
},

// 20. 1099-NEC Contractor Income
{
  file: "20_1099_NEC_Contractor_Income.pdf",
  def: {
    ...PAGE,
    styles: baseStyles,
    content: [
      { text: "FORM 1099-NEC — Nonemployee Compensation", style: { fontSize: 13, bold: true, color: "#1a3a6b", margin: [0, 0, 0, 8] } },
      { text: "Tax Year 2024", style: { fontSize: 11, color: "#555" } },
      hr(),
      { columns: [
        { stack: [
          { text: "PAYER", style: "h2" },
          { text: "TechBridge Solutions Inc.\n2500 Innovation Drive, Suite 800\nSan Jose, CA 95134\nEIN: 82-4412831\nPhone: (408) 555-0233", style: "small" },
        ], width: "50%" },
        { stack: [
          { text: "RECIPIENT", style: "h2" },
          { text: "Alex M. Rivera\n8832 Wilshire Blvd, Unit 205\nLos Angeles, CA 90036\nSSN: XXX-XX-8821", style: "small" },
        ], width: "50%" },
      ]},
      hr(),
      { text: "Compensation Summary", style: "h2" },
      { table: { widths: [30, 200, "*"], body: [
        [{ text: "Box", bold: true }, { text: "Description", bold: true }, { text: "Amount", bold: true }],
        ["1", "Nonemployee Compensation", "$47,200.00"],
        ["4", "Federal income tax withheld", "$0.00"],
        ["5", "State tax withheld (CA)", "$0.00"],
        ["6", "State (CA) / Payer's state number", "CA / 82-4412831"],
        ["7", "State income (CA)", "$47,200.00"],
      ]}, layout: "lightHorizontalLines", margin: [0, 0, 0, 10] },
      { text: "Description of services", style: "h2" },
      { text: "Software development consulting services provided under Independent Contractor Agreement dated January 8, 2024. Payments reflect full-year compensation per quarterly invoices #INV-Q1-2024 through #INV-Q4-2024.", margin: [0, 0, 0, 8] },
      infoBox("Important: As an independent contractor, you are responsible for self-employment tax (SE tax) on this income. File Schedule SE with your Form 1040. Consider making estimated quarterly tax payments (Form 1040-ES) to avoid underpayment penalties.", "#1a5276"),
      { text: "What to do with this form", style: "h2" },
      { ul: [
        "Report this income on Schedule C (Profit or Loss from Business) of your Form 1040.",
        "Calculate self-employment tax on Schedule SE (15.3% on net earnings up to $168,600).",
        "Deduct one-half of SE tax on Form 1040, Schedule 1.",
        "Keep this form for your records — you may need it if the IRS questions your return.",
      ]},
      hr(),
      { text: "Payer copy filed with IRS per IRC §6041A. Questions: (408) 555-0233 | TechBridge Solutions Inc.", style: "notice" },
    ],
  },
},

]; // end docs array

// Generate all PDFs
console.log(`\nGenerating ${docs.length} test documents → ${OUT}/\n`);
for (const { file, def } of docs) {
  try {
    await makePdf(file, def);
  } catch (e) {
    console.error(`✗ ${file}: ${e.message}`);
  }
}

console.log(`\nDone! ${docs.length} PDFs in ${OUT}/`);
