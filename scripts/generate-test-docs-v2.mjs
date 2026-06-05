/**
 * Generate a fresh pack of 24 realistic US test documents as PDFs.
 *   - 14 invoices / receipts (for the Bookkeeping module)
 *   - 10 varied official / financial letters (for document analysis)
 *
 * Run:    node scripts/generate-test-docs-v2.mjs
 * Output: test-documents/realistic_v3/
 */
import PdfPrinter from "../node_modules/pdfmake/src/printer.js";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
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
const OUT = "test-documents/realistic_v3";
mkdirSync(OUT, { recursive: true });

function makePdf(filename, docDef) {
  return new Promise((resolve, reject) => {
    const doc = printer.createPdfKitDocument(docDef);
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => {
      writeFileSync(path.join(OUT, filename), Buffer.concat(chunks));
      console.log(`✓ ${filename}`);
      resolve();
    });
    doc.on("error", reject);
    doc.end();
  });
}

// ─── Shared styles & helpers ────────────────────────────────────────────────
const PAGE = { margin: [55, 50, 55, 55], pageSize: "LETTER" };

const baseStyles = {
  agency: { fontSize: 11, bold: true, color: "#1a3a6b", margin: [0, 0, 0, 4] },
  brand: { fontSize: 18, bold: true, color: "#111" },
  h1: { fontSize: 14, bold: true, margin: [0, 10, 0, 6] },
  h2: { fontSize: 11, bold: true, margin: [0, 10, 0, 4] },
  label: { fontSize: 9, color: "#555" },
  small: { fontSize: 9, color: "#666" },
  notice: { fontSize: 9, italics: true, color: "#444", margin: [0, 12, 0, 0] },
  th: { fontSize: 9, bold: true, color: "white", fillColor: "#1a3a6b", margin: [6, 5, 6, 5] },
  mono: { font: "Roboto", fontSize: 10 },
};

const usd = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
function hr() { return { canvas: [{ type: "line", x1: 0, y1: 0, x2: 497, y2: 0, lineWidth: 0.5, lineColor: "#bbb" }], margin: [0, 6, 0, 6] }; }
function addressBlock(lines) { return { text: lines.join("\n"), style: "small", margin: [0, 0, 0, 8] }; }
function metaRow(label, value) {
  return { columns: [{ text: label, style: "label", width: 150 }, { text: value, style: "mono", width: "*" }], margin: [0, 1, 0, 1] };
}
function urgentBox(text) {
  return { table: { widths: ["*"], body: [[{ text, bold: true, color: "white", fillColor: "#c0392b", margin: [8, 6, 8, 6] }]] }, layout: "noBorders", margin: [0, 8, 0, 8] };
}
function infoBox(text, color = "#1a7a4a") {
  return { table: { widths: ["*"], body: [[{ text, color: "white", fillColor: color, margin: [8, 6, 8, 6] }]] }, layout: "noBorders", margin: [0, 8, 0, 8] };
}

const BILL_TO = ["GovLetter Test User", "1247 Maple Street, Suite 4", "Austin, TX 78701", "EIN: 47-2210984"];

/**
 * Build a clean invoice / receipt PDF definition.
 * items: [{ desc, qty, unit }]   taxRate: decimal (e.g. 0.0825) or 0 for tax-exempt
 */
function invoice({ vendor, vendorAddr, kind = "INVOICE", number, date, due, items, taxRate, note, category }) {
  const subtotal = items.reduce((s, it) => s + it.qty * it.unit, 0);
  const tax = +(subtotal * taxRate).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);

  const itemRows = items.map((it) => [
    { text: it.desc, fontSize: 10, margin: [6, 4, 6, 4] },
    { text: String(it.qty), fontSize: 10, alignment: "center", margin: [6, 4, 6, 4] },
    { text: usd(it.unit), fontSize: 10, alignment: "right", margin: [6, 4, 6, 4] },
    { text: usd(it.qty * it.unit), fontSize: 10, alignment: "right", margin: [6, 4, 6, 4] },
  ]);

  const totalsBody = [
    [{ text: "Subtotal", alignment: "right", style: "label", border: [false, false, false, false] }, { text: usd(subtotal), alignment: "right", style: "mono", border: [false, false, false, false] }],
    [{ text: taxRate > 0 ? `Sales Tax (${(taxRate * 100).toFixed(3).replace(/\.?0+$/, "")}%)` : "Sales Tax (exempt)", alignment: "right", style: "label", border: [false, false, false, false] }, { text: usd(tax), alignment: "right", style: "mono", border: [false, false, false, false] }],
    [{ text: "TOTAL", alignment: "right", bold: true, fontSize: 12, border: [false, true, false, false], borderColor: ["", "#333", "", ""], margin: [0, 4, 0, 0] }, { text: usd(total), alignment: "right", bold: true, fontSize: 12, color: "#1a3a6b", border: [false, true, false, false], borderColor: ["", "#333", "", ""], margin: [0, 4, 0, 0] }],
  ];

  return {
    ...PAGE,
    styles: baseStyles,
    content: [
      {
        columns: [
          { stack: [{ text: vendor, style: "brand" }, { text: vendorAddr.join("\n"), style: "small", margin: [0, 4, 0, 0] }], width: "*" },
          { stack: [{ text: kind, fontSize: 22, bold: true, color: "#1a3a6b", alignment: "right" }, { text: `#${number}`, style: "mono", alignment: "right", margin: [0, 4, 0, 0] }], width: "auto" },
        ],
      },
      hr(),
      {
        columns: [
          { stack: [{ text: "BILL TO", style: "label", margin: [0, 0, 0, 3] }, { text: BILL_TO.join("\n"), style: "small" }], width: "*" },
          { stack: [metaRow("Invoice date:", date), ...(due ? [metaRow("Due date:", due)] : []), ...(category ? [metaRow("Category:", category)] : [])], width: "auto", alignment: "right" },
        ],
        margin: [0, 4, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: ["*", 40, 70, 80],
          body: [
            [{ text: "Description", style: "th" }, { text: "Qty", style: "th", alignment: "center" }, { text: "Unit", style: "th", alignment: "right" }, { text: "Amount", style: "th", alignment: "right" }],
            ...itemRows,
          ],
        },
        layout: { hLineColor: () => "#ddd", vLineColor: () => "#ddd", hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
      },
      { columns: [{ text: "", width: "*" }, { table: { widths: [120, 90], body: totalsBody }, layout: "noBorders", width: "auto" }], margin: [0, 8, 0, 0] },
      ...(note ? [{ text: note, style: "notice" }] : []),
      { text: "Thank you for your business. Payment due upon receipt unless otherwise noted.", style: "notice", margin: [0, 18, 0, 0] },
    ],
  };
}

// ─── INVOICES / RECEIPTS (14) ───────────────────────────────────────────────
const docs = [
  { file: "01_Invoice_Staples_Office_Supplies.pdf", def: invoice({
    vendor: "Staples, Inc.", vendorAddr: ["500 Staples Drive", "Framingham, MA 01702", "billing@staples.com"],
    kind: "RECEIPT", number: "STP-2026-884512", date: "01/14/2026", category: "Office expenses",
    items: [{ desc: "HP 64XL Black Ink Cartridge", qty: 2, unit: 38.99 }, { desc: "Letter-size copy paper, 10 reams", qty: 1, unit: 54.99 }, { desc: "Stapler & staples set", qty: 1, unit: 12.49 }],
    taxRate: 0.0625 }) },

  { file: "02_Invoice_Amazon_Business_Monitor.pdf", def: invoice({
    vendor: "Amazon Business", vendorAddr: ["410 Terry Avenue North", "Seattle, WA 98109"],
    kind: "INVOICE", number: "AMZ-114-7729043-2210", date: "01/09/2026", category: "Equipment",
    items: [{ desc: 'Dell 27" 4K USB-C Monitor (U2723QE)', qty: 1, unit: 549.99 }, { desc: "USB-C cable, 6 ft", qty: 1, unit: 14.99 }],
    taxRate: 0.095 }) },

  { file: "03_Invoice_Adobe_Creative_Cloud.pdf", def: invoice({
    vendor: "Adobe Inc.", vendorAddr: ["345 Park Avenue", "San Jose, CA 95110"],
    kind: "INVOICE", number: "ADBE-2026-0099217", date: "01/01/2026", due: "01/01/2026", category: "Software / SaaS",
    items: [{ desc: "Creative Cloud All Apps — monthly", qty: 1, unit: 59.99 }],
    taxRate: 0, note: "Recurring subscription. Auto-renews monthly." }) },

  { file: "04_Invoice_Google_Workspace.pdf", def: invoice({
    vendor: "Google LLC", vendorAddr: ["1600 Amphitheatre Parkway", "Mountain View, CA 94043"],
    kind: "INVOICE", number: "GWS-2026-55410982", date: "01/05/2026", category: "Software / SaaS",
    items: [{ desc: "Google Workspace Business Standard (8 seats)", qty: 8, unit: 18.00 }],
    taxRate: 0 }) },

  { file: "05_Invoice_Delta_Airfare.pdf", def: invoice({
    vendor: "Delta Air Lines, Inc.", vendorAddr: ["1030 Delta Boulevard", "Atlanta, GA 30354"],
    kind: "RECEIPT", number: "DL-ETKT-0067412289", date: "01/22/2026", category: "Travel",
    items: [{ desc: "AUS → JFK round-trip, Main Cabin", qty: 1, unit: 412.20 }, { desc: "Seat selection (2 segments)", qty: 1, unit: 45.00 }, { desc: "Federal excise & segment taxes", qty: 1, unit: 30.00 }],
    taxRate: 0, note: "Taxes and fees included in fare." }) },

  { file: "06_Invoice_Marriott_Hotel.pdf", def: invoice({
    vendor: "Marriott International", vendorAddr: ["JW Marriott Austin", "110 E 2nd Street", "Austin, TX 78701"],
    kind: "RECEIPT", number: "MAR-2026-44120087", date: "01/19/2026", category: "Travel — lodging",
    items: [{ desc: "Room, King — 2 nights @ $279.00", qty: 2, unit: 279.00 }, { desc: "Self-parking, 2 nights", qty: 2, unit: 42.00 }],
    taxRate: 0.15, note: "Includes 15% combined hotel occupancy tax." }) },

  { file: "07_Receipt_Uber_Ride.pdf", def: invoice({
    vendor: "Uber Technologies, Inc.", vendorAddr: ["1725 3rd Street", "San Francisco, CA 94158"],
    kind: "RECEIPT", number: "UBR-2026-AX9920", date: "01/20/2026", category: "Travel — local transport",
    items: [{ desc: "UberX trip — Airport to Downtown (12.4 mi)", qty: 1, unit: 31.20 }, { desc: "Booking fee", qty: 1, unit: 3.55 }],
    taxRate: 0 }) },

  { file: "08_Receipt_Shell_Fuel.pdf", def: invoice({
    vendor: "Shell Oil Company", vendorAddr: ["Shell Station #44120", "6200 N Lamar Blvd", "Austin, TX 78752"],
    kind: "RECEIPT", number: "SHL-7741-220190", date: "01/16/2026", category: "Car & truck — fuel",
    items: [{ desc: "Unleaded 87 — 14.812 gal @ $2.949", qty: 1, unit: 43.68 }],
    taxRate: 0, note: "Fuel taxes included at the pump." }) },

  { file: "09_Invoice_HomeDepot_Supplies.pdf", def: invoice({
    vendor: "The Home Depot", vendorAddr: ["Store #6574", "1213 N IH-35", "Round Rock, TX 78664"],
    kind: "RECEIPT", number: "HD-6574-009923", date: "01/12/2026", category: "Repairs & maintenance",
    items: [{ desc: "LED shop light fixture, 4 ft", qty: 3, unit: 24.97 }, { desc: "Extension cord, 25 ft 12-gauge", qty: 1, unit: 39.98 }, { desc: "Drywall anchors, 100-pack", qty: 1, unit: 8.47 }],
    taxRate: 0.0825 }) },

  { file: "10_Invoice_Verizon_Business.pdf", def: invoice({
    vendor: "Verizon Business", vendorAddr: ["One Verizon Way", "Basking Ridge, NJ 07920"],
    kind: "INVOICE", number: "VZB-2026-00471129", date: "01/03/2026", due: "01/25/2026", category: "Utilities — phone/internet",
    items: [{ desc: "Business Unlimited — 4 lines", qty: 4, unit: 40.00 }, { desc: "Business internet 300 Mbps", qty: 1, unit: 69.00 }],
    taxRate: 0.07, note: "Includes federal, state, and 911 surcharges." }) },

  { file: "11_Invoice_Meta_Advertising.pdf", def: invoice({
    vendor: "Meta Platforms, Inc.", vendorAddr: ["1 Hacker Way", "Menlo Park, CA 94025"],
    kind: "INVOICE", number: "META-2026-7741209", date: "01/31/2026", category: "Advertising",
    items: [{ desc: "Facebook & Instagram Ads — Jan 2026 campaign", qty: 1, unit: 750.00 }],
    taxRate: 0, note: "Charged to card on file. Campaign reach: 142,300 impressions." }) },

  { file: "12_Invoice_Upwork_Contractor_1099.pdf", def: invoice({
    vendor: "Skyline Design Studio (via Upwork)", vendorAddr: ["Freelance contractor", "Portland, OR 97201", "TIN on file (1099-NEC)"],
    kind: "INVOICE", number: "UPW-2026-552081", date: "01/28/2026", due: "02/11/2026", category: "Contract labor (1099)",
    items: [{ desc: "Brand identity & logo design", qty: 1, unit: 1200.00 }, { desc: "Landing page UI mockups (3)", qty: 3, unit: 200.00 }],
    taxRate: 0, note: "1099-NEC reportable. No sales tax on professional services." }) },

  { file: "13_Invoice_WeWork_Coworking.pdf", def: invoice({
    vendor: "WeWork Inc.", vendorAddr: ["75 Rockefeller Plaza", "New York, NY 10019"],
    kind: "INVOICE", number: "WEW-2026-330914", date: "01/01/2026", due: "01/05/2026", category: "Rent — office",
    items: [{ desc: "Dedicated desk membership — Jan 2026", qty: 1, unit: 420.00 }, { desc: "Conference room credits", qty: 1, unit: 30.00 }],
    taxRate: 0.08875 }) },

  { file: "14_Receipt_Business_Meal.pdf", def: invoice({
    vendor: "Olive Garden", vendorAddr: ["Restaurant #1144", "9000 Research Blvd", "Austin, TX 78758"],
    kind: "RECEIPT", number: "OG-1144-228841", date: "01/24/2026", category: "Meals (50% deductible)",
    items: [{ desc: "Business lunch — 3 guests", qty: 1, unit: 78.40 }, { desc: "Gratuity (18%)", qty: 1, unit: 14.11 }],
    taxRate: 0.0825, note: "Business meal — generally 50% deductible. Attendees: client meeting." }) },

  // ─── LETTERS (10) ──────────────────────────────────────────────────────────
  { file: "15_IRS_CP14_Balance_Due.pdf", def: { ...PAGE, styles: baseStyles, content: [
    { text: "Department of the Treasury — Internal Revenue Service", style: "agency" }, hr(),
    { columns: [addressBlock(["GovLetter Test User", "1247 Maple Street, Suite 4", "Austin, TX 78701"]), { stack: [metaRow("Notice:", "CP14"), metaRow("Tax year:", "2025"), metaRow("Notice date:", "02/02/2026")], alignment: "right" }] },
    { text: "You have unpaid taxes for 2025", style: "h1" },
    { text: "Our records show you have a balance due on your 2025 federal income tax return. The amount includes tax, penalties, and interest calculated through the notice date.", margin: [0, 0, 0, 8] },
    { table: { widths: [200, "*"], body: [["Tax owed", usd(2410.00)], ["Failure-to-pay penalty", usd(48.20)], ["Interest", usd(31.67)], [{ text: "Amount due by 02/23/2026", bold: true }, { text: usd(2489.87), bold: true }]] }, layout: "lightHorizontalLines" },
    urgentBox("Pay $2,489.87 by February 23, 2026 to avoid additional penalties and interest."),
    { text: "Pay online at irs.gov/payments or set up a payment plan with Form 9465. Notice CP14 — Account 47-XXXXX.", style: "notice" },
  ] } },

  { file: "16_IRS_CP2000_Underreported.pdf", def: { ...PAGE, styles: baseStyles, content: [
    { text: "Department of the Treasury — Internal Revenue Service", style: "agency" }, hr(),
    { columns: [addressBlock(["GovLetter Test User", "1247 Maple Street, Suite 4", "Austin, TX 78701"]), { stack: [metaRow("Notice:", "CP2000"), metaRow("Tax year:", "2024"), metaRow("Respond by:", "03/05/2026")], alignment: "right" }] },
    { text: "Proposed changes to your 2024 tax return", style: "h1" },
    { text: "Income reported to the IRS by third parties does not match the income on your 2024 return. This is a proposal, not a bill. You may agree or disagree.", margin: [0, 0, 0, 8] },
    { table: { widths: [220, "*"], body: [["Underreported 1099-NEC income", usd(8200.00)], ["Additional tax", usd(1804.00)], ["Accuracy penalty", usd(360.80)], [{ text: "Proposed amount due", bold: true }, { text: usd(2164.80), bold: true }]] }, layout: "lightHorizontalLines" },
    { text: "Respond by March 5, 2026 using the enclosed response form. If you disagree, include documentation.", margin: [0, 8, 0, 0] },
    { text: "Notice CP2000. This is NOT a final bill.", style: "notice" },
  ] } },

  { file: "17_IRS_Letter_5071C_ID_Verify.pdf", def: { ...PAGE, styles: baseStyles, content: [
    { text: "Department of the Treasury — Internal Revenue Service", style: "agency" }, hr(),
    addressBlock(["GovLetter Test User", "1247 Maple Street, Suite 4", "Austin, TX 78701"]),
    { text: "Verify your identity (Letter 5071C)", style: "h1" },
    { text: "We received a 2025 federal income tax return with your name and SSN. To protect you from identity theft, we must verify your identity before processing the return or any refund.", margin: [0, 0, 0, 8] },
    infoBox("Verify online at idverify.irs.gov, or call 1-800-830-5084. Have this letter and a prior-year return ready.", "#1a3a6b"),
    { text: "If you did not file this return, contact us immediately. Letter 5071C.", style: "notice" },
  ] } },

  { file: "18_SSA_COLA_Benefit_Statement.pdf", def: { ...PAGE, styles: baseStyles, content: [
    { text: "Social Security Administration", style: "agency" }, hr(),
    addressBlock(["Dorothy F. Nguyen", "901 Oak Lane", "Miami, FL 33101"]),
    { text: "Your new benefit amount for 2026", style: "h1" },
    { text: "Your Social Security benefits will increase by 2.5% in 2026 due to the annual cost-of-living adjustment (COLA).", margin: [0, 0, 0, 8] },
    { table: { widths: [220, "*"], body: [["2025 monthly benefit", usd(1842.00)], ["Medicare Part B premium", usd(-185.00)], ["2026 monthly benefit (after COLA)", usd(1703.05)]] }, layout: "lightHorizontalLines" },
    { text: "No action needed. Payments begin January 2026. ssa.gov/myaccount", style: "notice" },
  ] } },

  { file: "19_CA_FTB_Balance_Due.pdf", def: { ...PAGE, styles: baseStyles, content: [
    { text: "State of California — Franchise Tax Board", style: "agency" }, hr(),
    { columns: [addressBlock(["Kevin P. Walsh", "233 S Wacker Dr", "San Diego, CA 92101"]), { stack: [metaRow("Notice:", "FTB 4963"), metaRow("Tax year:", "2024"), metaRow("Due:", "03/01/2026")], alignment: "right" }] },
    { text: "State income tax balance due", style: "h1" },
    { table: { widths: [200, "*"], body: [["Tax due", usd(1120.00)], ["Penalty", usd(56.00)], ["Interest", usd(22.40)], [{ text: "Total due", bold: true }, { text: usd(1198.40), bold: true }]] }, layout: "lightHorizontalLines" },
    urgentBox("Pay $1,198.40 by March 1, 2026 to avoid collection action."),
    { text: "Pay at ftb.ca.gov. Account CA-2024-7741098.", style: "notice" },
  ] } },

  { file: "20_USCIS_I797C_Receipt_Notice.pdf", def: { ...PAGE, styles: baseStyles, content: [
    { text: "U.S. Department of Homeland Security — USCIS", style: "agency" }, hr(),
    { columns: [addressBlock(["Ana L. Gutierrez", "1200 Peachtree St NE", "Atlanta, GA 30309"]), { stack: [metaRow("Receipt #:", "IOE0921774120"), metaRow("Form:", "I-765"), metaRow("Notice date:", "01/30/2026")], alignment: "right" }] },
    { text: "Notice of Action — Receipt (I-797C)", style: "h1" },
    { text: "We received your Application for Employment Authorization (Form I-765) and it is now pending. Keep this notice for your records.", margin: [0, 0, 0, 8] },
    { table: { widths: [200, "*"], body: [["Priority date", "01/28/2026"], ["Estimated processing", "3–5 months"], ["Fee received", usd(520.00)]] }, layout: "lightHorizontalLines" },
    { text: "Check status at egov.uscis.gov with your receipt number. Do not mail duplicate forms.", style: "notice" },
  ] } },

  { file: "21_VA_Disability_Award.pdf", def: { ...PAGE, styles: baseStyles, content: [
    { text: "U.S. Department of Veterans Affairs", style: "agency" }, hr(),
    addressBlock(["Thomas E. Ward", "5521 Patriot Way", "Colorado Springs, CO 80906"]),
    { text: "Disability compensation award", style: "h1" },
    infoBox("Your claim has been APPROVED. Combined disability rating: 70%.", "#1a7a4a"),
    { table: { widths: [220, "*"], body: [["Combined rating", "70%"], ["Monthly compensation", usd(1759.19)], ["Effective date", "01/01/2026"], ["Retroactive payment", usd(5277.57)]] }, layout: "lightHorizontalLines" },
    { text: "You may appeal the rating within one year. va.gov/disability", style: "notice" },
  ] } },

  { file: "22_Medicare_Summary_Notice.pdf", def: { ...PAGE, styles: baseStyles, content: [
    { text: "Centers for Medicare & Medicaid Services", style: "agency" }, hr(),
    { columns: [addressBlock(["Harold J. Pierce", "44 Elm St", "Columbus, OH 43215"]), { stack: [metaRow("Period:", "Oct–Dec 2025"), metaRow("Medicare #:", "1EG4-TE5-MK72")], alignment: "right" }] },
    { text: "Medicare Summary Notice — Part B", style: "h1" },
    { text: "This is NOT a bill. It shows what your providers billed, what Medicare approved and paid, and what you may owe.", margin: [0, 0, 0, 8] },
    { table: { widths: [220, 90, 90, "*"], body: [
      [{ text: "Service", style: "th" }, { text: "Billed", style: "th", alignment: "right" }, { text: "Approved", style: "th", alignment: "right" }, { text: "You may owe", style: "th", alignment: "right" }],
      ["Office visit (99214)", { text: usd(245.00), alignment: "right" }, { text: usd(112.00), alignment: "right" }, { text: usd(22.40), alignment: "right" }],
      ["Lab — metabolic panel", { text: usd(89.00), alignment: "right" }, { text: usd(41.00), alignment: "right" }, { text: usd(0.00), alignment: "right" }],
    ] }, layout: "lightHorizontalLines" },
    { text: "Review for accuracy. Report suspected fraud to 1-800-MEDICARE.", style: "notice" },
  ] } },

  { file: "23_County_Court_Small_Claims_Summons.pdf", def: { ...PAGE, styles: baseStyles, content: [
    { text: "SUPERIOR COURT OF THE STATE OF CALIFORNIA\nCOUNTY OF LOS ANGELES — SMALL CLAIMS DIVISION", style: "agency" }, hr(),
    { columns: [addressBlock(["GovLetter Test User", "Defendant", "1247 Maple Street, Suite 4", "Austin, TX 78701"]), { stack: [metaRow("Case #:", "25SMSC04120"), metaRow("Hearing:", "03/18/2026 8:30 AM"), metaRow("Dept:", "B-14")], alignment: "right" }] },
    { text: "Plaintiff's Claim and Order to Go to Small Claims Court (SC-100)", style: "h1" },
    { text: "Pacific Rentals LLC (Plaintiff) is suing you for $4,820.00 for unpaid equipment rental and damages.", margin: [0, 0, 0, 8] },
    urgentBox("You MUST appear on March 18, 2026 at 8:30 AM, Dept. B-14. Failure to appear may result in a judgment against you."),
    { text: "Bring all evidence and witnesses. You may settle before the hearing. Case 25SMSC04120.", style: "notice" },
  ] } },

  { file: "24_Health_Insurance_EOB.pdf", def: { ...PAGE, styles: baseStyles, content: [
    { text: "Blue Cross Blue Shield — Explanation of Benefits", style: "agency" }, hr(),
    { columns: [addressBlock(["GovLetter Test User", "1247 Maple Street, Suite 4", "Austin, TX 78701"]), { stack: [metaRow("Member ID:", "XYG884120077"), metaRow("Claim #:", "CLM-2026-7741209"), metaRow("Date of service:", "01/15/2026")], alignment: "right" }] },
    { text: "Explanation of Benefits — THIS IS NOT A BILL", style: "h1" },
    { table: { widths: [200, "*"], body: [
      ["Provider charged", usd(1340.00)],
      ["Plan discount", usd(-512.00)],
      ["Plan paid", usd(662.40)],
      ["Applied to deductible", usd(120.00)],
      [{ text: "Your responsibility", bold: true }, { text: usd(165.60), bold: true }],
    ] }, layout: "lightHorizontalLines" },
    { text: "You may receive a separate bill from your provider for $165.60. Questions: number on your member ID card.", style: "notice" },
  ] } },
];

await Promise.all(docs.map((d) => makePdf(d.file, d.def)));
console.log(`\nDone — ${docs.length} documents written to ${OUT}/`);
