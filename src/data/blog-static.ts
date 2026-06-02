export type BlogListItem = {
  title: string;
  slug: string;
  excerpt: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  date: string;
};

export const STATIC_US_LIST = [
  {
    title: "Social Security Overpayment Letter: What It Means and How to Fight It",
    slug: "social-security-overpayment-letter",
    excerpt: "The SSA is demanding money back — sometimes thousands of dollars. Here's what the letter means, your appeal rights, and how to request a waiver before the deadline.",
    badge: "🔥 Trending 2026",
    badgeVariant: "destructive" as const,
    date: "May 28, 2026",
  },
  {
    title: "IRS CP14 Notice: What It Means and What to Do",
    slug: "irs-cp14-notice-explained",
    excerpt: "A CP14 is the IRS's first balance-due notice. It's fixable — but ignoring it leads to CP501, CP504, and eventually a levy. Here's exactly what to do.",
    badge: "Most common",
    badgeVariant: "secondary" as const,
    date: "May 20, 2026",
  },
  {
    title: "IRS CP2000 Notice: It's Not a Bill — Here's What to Do",
    slug: "irs-cp2000-notice-explained",
    excerpt: "Three million CP2000s are sent every year. Most people panic — but it's a proposed adjustment, not a final bill. You have 30 days to agree or dispute.",
    badge: "3M sent/year",
    badgeVariant: "secondary" as const,
    date: "May 14, 2026",
  },
  {
    title: "IRS LT11 Notice: Final Notice Before Levy — Act Within 30 Days",
    slug: "irs-lt11-notice-final-levy",
    excerpt: "LT11 is the last stop before the IRS seizes wages and bank accounts. The 30-day CDP hearing window is your most powerful right — don't miss it.",
    badge: "Urgent",
    badgeVariant: "destructive" as const,
    date: "May 7, 2026",
  },
  {
    title: "IRS CP504 Notice: Last Warning Before State Refund Levy",
    slug: "irs-cp504-notice-explained",
    excerpt: "CP504 is the IRS's final notice before seizing your state tax refund. Act now — a payment plan or CDP hearing can stop the collection clock.",
    badge: "Pre-levy",
    badgeVariant: "destructive" as const,
    date: "April 30, 2026",
  },
  {
    title: "Got an IRS Letter? How to Read It in 5 Minutes",
    slug: "how-to-read-irs-letter",
    excerpt: "Every IRS letter has three things you need to find: the notice number, the deadline, and the specific action required. Here's the exact method.",
    date: "April 22, 2026",
  },
  {
    title: "State Tax Notice Explained: What to Do in Any State",
    slug: "state-tax-notice-explained",
    excerpt: "Got a balance-due or audit notice from your state? Each state has different rules, portals, and appeal windows. Here's what to do wherever you are.",
    date: "April 15, 2026",
  },
] as BlogListItem[];
export const STATIC_HU_LIST = [
  {
    title: "Mit jelent a NAV felszólítás és mit kell tenni?",
    slug: "mit-jelent-a-nav-felszolitas",
    excerpt: "Lépésről lépésre útmutató, ha NAV felszólító levelet kaptál.",
    date: "2026. január 20.",
  },
  {
    title: "Hogyan kell számlát könyvelőnek küldeni?",
    slug: "hogyan-kell-szamlat-konyvelonek-kuldeni",
    excerpt: "Gyakorlati workflow KKV-knak a számla OCR és export használatához.",
    date: "2026. február 10.",
  },
  {
    title: "Legjobb iratkezelő szoftver KKV-knak 2026-ban",
    slug: "legjobb-iratkezelo-szoftver-kkv-2026",
    excerpt: "Milyen szempontok alapján válassz dokumentumkezelő rendszert vállalkozásodnak.",
    date: "2026. március 1.",
  },
] as BlogListItem[];

export type BlogPostEntry = {
  title: string;
  description: string;
  content: string[];
  keywords: string;
  datePublished: string;
  dateModified: string;
  faqSchema?: { question: string; answer: string }[];
};

// ─── HU posts ─────────────────────────────────────────────────────────────────
export const STATIC_HU_POSTS: Record<string, BlogPostEntry> = {
  "mit-jelent-a-nav-felszolitas": {
    title: "Mit jelent a NAV felszólítás és mit kell tenni?",
    description: "Gyakorlati útmutató NAV felszólítás esetére: határidők, teendők, hogyan értelmezd gyorsan a hivatalos levelet.",
    content: [
      "Ha NAV felszólítást kapsz, a legfontosabb a határidő és a pontos kötelezettség azonosítása. A dokumentumok gyakran rövid, jogi nyelvű mondatokban írják le, mit kell tenni, emiatt könnyű félreérteni a lényeget.",
      "Első lépésként ellenőrizd, milyen ügyre vonatkozik a levél: hiánypótlás, fizetési felszólítás vagy adategyeztetés. Ez meghatározza, hogy azonnali fizetési kötelezettséged van-e, vagy dokumentumot kell benyújtanod.",
      "Második lépésként jegyezd fel a határidőt és a szükséges mellékleteket. Ha több dokumentumra hivatkozik a levél, érdemes egy listát készíteni arról, mi áll rendelkezésre és mi hiányzik.",
      "Harmadik lépésként döntsd el, hogy önállóan intézed, vagy könyvelővel egyeztetsz. A GovLetter ebben segít: közérthető összefoglalót ad, kiemeli a teendőket és a kritikus dátumokat.",
      "A cél nem csak az, hogy megértsd a levelet, hanem az is, hogy időben és pontosan reagálj. Ezzel csökkenthető a bírság vagy további eljárás kockázata.",
    ],
    keywords: "NAV felszólítás, NAV levél, adóhatósági felszólítás, határidő, teendők, hivatalos levél, GovLetter",
    datePublished: "2026-01-20T08:00:00+01:00",
    dateModified: "2026-05-01T10:00:00+01:00",
  },
  "hogyan-kell-szamlat-konyvelonek-kuldeni": {
    title: "Hogyan kell számlát könyvelőnek küldeni? Lépésről lépésre",
    description: "Számla OCR és export workflow KKV-knak: így készítsd elő a számlákat könyvelésre gyorsan és átláthatóan.",
    content: [
      "A könyvelőnek küldött számlák akkor hasznosak, ha egységes formátumban, hiánytalan adatokkal érkeznek.",
      "Jó workflow: gyűjtsd egy helyre a számlákat, futtasd OCR-rel, ellenőrizd a kulcsmezőket (dátum, összeg, partner), majd exportáld táblázatba.",
      "Érdemes havi rutinban gondolkodni: heti gyűjtés, havi zárás előtti export, és egy rövid ellenőrzőlista.",
      "A GovLetter könyvelés modulja ezt a folyamatot támogatja: számla OCR, kategorizálás, export és visszakereshető archívum egy felületen.",
      "A cél a kevesebb kézi adatbevitel és a jobb pontosság.",
    ],
    keywords: "számla könyvelőnek, számla OCR, könyvelés KKV, számlák export, GovLetter",
    datePublished: "2026-02-10T08:00:00+01:00",
    dateModified: "2026-05-01T10:00:00+01:00",
  },
  "legjobb-iratkezelo-szoftver-kkv-2026": {
    title: "Legjobb iratkezelő szoftver KKV-knak 2026-ban",
    description: "Milyen iratkezelő szoftvert válasszon egy KKV? Fő szempontok, összehasonlítási keretrendszer és gyakorlati checklist.",
    content: [
      "Az iratkezelő szoftver kiválasztásánál a KKV-k gyakran csak az árat nézik, pedig a valódi megtakarítást a workflow adja.",
      "Fontos szempont a kereshetőség, verziókezelés, jogosultságok, export lehetőségek, és hogy van-e AI támogatás a dokumentum értelmezéséhez.",
      "Ha hivatalos leveleket is kezelsz, akkor külön előny, ha a rendszer teendőlistát és határidő-fókuszt ad.",
      "A GovLetter ebben a kategóriában azoknak jó választás, akik a dokumentum értelmezést és a számla OCR-t egy rendszerben szeretnék kezelni.",
      "Javaslat: vezess be egy 30 napos pilotot, mérd a feldolgozási időt és a hibaarányt.",
    ],
    keywords: "iratkezelő szoftver KKV, digitális iratkezelés, dokumentum archívum, GovLetter",
    datePublished: "2026-03-01T08:00:00+01:00",
    dateModified: "2026-05-01T10:00:00+01:00",
  },
};

// ─── US posts ─────────────────────────────────────────────────────────────────
export const STATIC_US_POSTS: Record<string, BlogPostEntry> = {
  "irs-cp14-notice-explained": {
    title: "IRS CP14 Notice: What It Means and What to Do",
    description: "Received a CP14 from the IRS? It means you owe a balance. This guide explains what CP14 means, how to verify the amount, your payment options, and the 21-day deadline.",
    keywords: "CP14 notice, IRS CP14, what is CP14, IRS balance due notice, CP14 what does it mean",
    datePublished: "2026-05-20T08:00:00-05:00",
    dateModified: "2026-06-01T08:00:00-05:00",
    faqSchema: [
      { question: "What is an IRS CP14 notice?", answer: "A CP14 is the IRS's first balance-due notice. It means the IRS believes you owe unpaid taxes and is requesting payment within 21 days." },
      { question: "Is a CP14 notice serious?", answer: "Yes, but it is fixable. A CP14 is the earliest stage of IRS collection. Ignoring it leads to escalating notices (CP501, CP503, CP504) and eventually a levy." },
      { question: "What should I do when I get a CP14?", answer: "First verify whether the balance is correct by comparing it to your filed return and payment records. If correct, pay by the deadline or set up a payment plan. If incorrect, call the IRS number on the notice with documentation." },
    ],
    content: [
      "Opening a letter from the IRS and seeing \"Balance Due\" is unsettling. The good news: a CP14 is the first notice in the collection sequence — not an audit, not a lien, and not a levy. It is a fixable bill.",
      "**What CP14 means.** The IRS processed your return and found a gap between what you owed and what they received in payments. The notice states the balance, adds initial penalties and interest, and requests payment within 21 days (or the deadline printed on the notice). The IRS sends millions of CP14s every year — many are the result of timing issues where payments simply were not matched to the account yet.",
      "**Verify the balance before you pay.** Pull out your filed return and payment records. Check that the IRS has credited every payment you made — electronic payments and checks sometimes take time to process. If you filed an amended return that reduces your liability, that may not be reflected yet. Look for these three discrepancies: (1) a payment you made that is not reflected, (2) an amended return credit still being processed, or (3) a penalty calculation error on estimated tax payments.",
      "**Your options if the balance is correct.** Pay in full by the deadline to stop interest and penalties from growing. If you cannot pay in full, apply online for an IRS payment plan (installment agreement) at IRS.gov — the IRS approves most requests automatically if you owe under $50,000. In cases of genuine financial hardship, you may qualify for a temporary delay in collection or an Offer in Compromise.",
      "**Your options if the balance is wrong.** Write a letter to the address on the notice. Include your name, Social Security Number or EIN, the tax year, and copies of proof (bank statements, cancelled checks, amended return confirmation). Keep a copy of everything you send.",
      "**What happens if you ignore it.** The IRS follows a predictable escalation: CP14 → CP501 (reminder) → CP503 (second reminder) → CP504 (intent to levy state refund) → LT11 (final notice of intent to levy wages and bank accounts). Each step adds more interest and penalties. Ignoring a CP14 is the single most expensive mistake taxpayers make.",
      "**Disclaimer.** This article is for informational purposes only and is not tax or legal advice. For personalized guidance, consult a qualified tax professional, enrolled agent, or CPA. GovLetter helps you understand what your notice says — not file on your behalf.",
    ],
  },
  "irs-cp2000-notice-explained": {
    title: "IRS CP2000 Notice: It's Not a Bill — Here's What to Do",
    description: "A CP2000 is a proposed adjustment, not a final bill. This guide explains why you got it, how to agree or dispute it, and the 30-day deadline you must not miss.",
    keywords: "CP2000 notice, IRS CP2000, what is CP2000, IRS proposed adjustment, CP2000 how to respond",
    datePublished: "2026-05-14T08:00:00-05:00",
    dateModified: "2026-06-01T08:00:00-05:00",
    faqSchema: [
      { question: "What is a CP2000 notice?", answer: "A CP2000 is a proposed adjustment — not an audit and not a final bill. The IRS found a mismatch between income reported on your return and information from employers, banks, or brokers." },
      { question: "Do I have to pay a CP2000?", answer: "Not immediately. You have 30 days to agree with the proposal, partially agree, or dispute it with documentation. Only if you agree or don't respond does it become a bill." },
      { question: "What triggers a CP2000?", answer: "The IRS Automated Underreporter program compares your return to W-2s, 1099s, and K-1s from third parties. Common triggers: a 1099 you forgot to report, freelance income, investment sales, or a cancelled debt." },
    ],
    content: [
      "The IRS sends roughly 3 million CP2000 notices every year. Most recipients panic — but the critical thing to know up front is that a CP2000 is not a bill and not an audit. It is a proposed adjustment. You have 30 days to respond.",
      "**What triggered your CP2000.** The IRS Automated Underreporter (AUR) program compares what you reported on your return to information returns filed by your employers, banks, brokers, and other payers (W-2s, 1099-INT, 1099-DIV, 1099-NEC, 1099-B, K-1s). When figures don't match, the system generates a CP2000 proposing additional tax. The most common triggers are: a freelance 1099-NEC you forgot; investment sale proceeds on a 1099-B where the basis was misreported; a cancelled debt on a 1099-C; or a 1099-MISC for a side payment.",
      "**Read the notice carefully.** The CP2000 will show the income item in question, where the IRS got the figure, and the proposed tax, penalty, and interest amount. Before assuming it's right, compare it to your actual return and the original document (your 1099, W-2, etc.).",
      "**Three responses are available.** (1) Agree: if the proposal is correct, sign and return the agreement with payment or payment plan. (2) Partially agree: if some items are correct but others are not, send a written response explaining which items you accept and why you dispute the others, with documentation. (3) Disagree completely: send a written response with supporting documentation — for example, proof that the income was reported elsewhere on your return, or that the basis for an investment sale was higher than the IRS assumed.",
      "**The 30-day deadline is real.** Ignoring a CP2000 causes the proposed adjustment to become a formal assessment, which then requires a separate appeals process to challenge. Acting within the response window is significantly easier and cheaper.",
      "**A note on IRS errors.** CP2000 notices contain errors frequently. A 1099-B for a stock sale might not include your cost basis, making it look like you had more gain than you did. If you sold something for a loss, confirm the IRS is not treating the gross proceeds as income. These errors are correctable — but you must respond in writing with documentation.",
      "**Disclaimer.** This article is for informational purposes only and is not tax or legal advice. GovLetter explains what your notice means — for personalized guidance, consult a qualified tax professional or enrolled agent.",
    ],
  },
  "social-security-overpayment-letter": {
    title: "Social Security Overpayment Letter: What It Means and How to Fight It",
    description: "Got an SSA overpayment letter demanding money back? This 2026 guide explains your appeal rights, waiver options, and exactly how to respond before the deadline.",
    keywords: "social security overpayment letter, SSA overpayment 2026, social security overpayment appeal, SSA overpayment waiver, social security letter what does it mean",
    datePublished: "2026-05-28T08:00:00-05:00",
    dateModified: "2026-06-01T08:00:00-05:00",
    faqSchema: [
      { question: "What is a Social Security overpayment letter?", answer: "An overpayment letter from the SSA means they believe they paid you more in benefits than you were entitled to receive, and they are demanding repayment." },
      { question: "Can I appeal an SSA overpayment?", answer: "Yes. You have 60 days from the date of the notice to request reconsideration — an appeal arguing you do not actually owe the money. You can also request a waiver if you cannot afford repayment and were not at fault." },
      { question: "How much can SSA withhold from my benefits?", answer: "As of 2025, the default withholding rate is 50% for Title II (retirement/disability) benefits and 10% for SSI recipients. You can request a lower rate if hardship is demonstrated." },
    ],
    content: [
      "In 2025 and 2026, millions of Americans have received overpayment letters from the Social Security Administration — sometimes demanding back thousands or even tens of thousands of dollars. The SSA paid out over $21 billion in overpayments in a single fiscal year, and aggressive recovery efforts are ongoing. If you got one of these letters, here is exactly what it means and what you can do.",
      "**What the letter means.** The SSA is saying they paid you more in Social Security or SSI benefits than you were legally entitled to receive. This can happen for many reasons — most of which are SSA errors or delayed reporting, not fraud: income you failed to report, a change in disability status the SSA didn't process in time, a beneficiary dying while payments continued, or calculation errors in the SSA's own systems.",
      "**You have two powerful rights.** First, the right to appeal (called a Reconsideration): you have 60 days from the notice date to argue that you do not actually owe the amount claimed. File Form SSA-561. If you file within 10 days, the SSA cannot withhold benefits while the appeal is pending. Second, the right to a waiver: if you do owe the money but cannot afford to repay it and were not at fault for the overpayment, you can request a waiver on Form SSA-632. A successful waiver means you never have to pay it back.",
      "**Act quickly on the timeline.** The critical window is 10 days for withholding protection and 60 days for reconsideration rights. If you miss the 60-day window, you may still be able to appeal with a showing of good cause, but it becomes harder. Do not ignore the letter.",
      "**What happens if you do nothing.** The SSA will begin withholding 50% of your monthly Title II check (or 10% of SSI) until the alleged overpayment is recovered. For a retiree receiving $2,000 per month, that means living on $1,000 — which is why acting immediately matters.",
      "**How to respond.** Call the number on the notice or visit your local SSA office. Ask for a breakdown of exactly which months you were allegedly overpaid and why. Compare it to your actual benefit history. If there's an error, gather documentation: bank statements, medical records, earnings reports — whatever refutes the SSA's calculation. Submit your appeal or waiver request in writing and keep copies of everything.",
      "**Disclaimer.** This article provides general information only and is not legal advice. SSA rules are complex and situation-specific. For serious overpayment disputes — especially amounts over $5,000 — consider consulting a Social Security disability attorney or legal aid organization in your area. GovLetter helps you understand what your letter says; it cannot represent you in an appeal.",
    ],
  },
  "irs-lt11-notice-final-levy": {
    title: "IRS LT11 Notice: Final Notice Before Levy — Act Within 30 Days",
    description: "LT11 is the IRS's final warning before seizing wages and bank accounts. You have 30 days to request a CDP hearing. This guide explains exactly what to do.",
    keywords: "LT11 notice, IRS LT11, final notice intent to levy, LT11 what to do, IRS levy notice",
    datePublished: "2026-05-07T08:00:00-05:00",
    dateModified: "2026-06-01T08:00:00-05:00",
    faqSchema: [
      { question: "What is an IRS LT11 notice?", answer: "LT11 is the IRS's Final Notice of Intent to Levy. It means the IRS intends to seize wages, bank accounts, or other assets to collect an unpaid tax debt." },
      { question: "What is a CDP hearing and how do I request one?", answer: "A Collection Due Process (CDP) hearing is a formal right to challenge IRS collection action before an independent appeals officer. Request it within 30 days of the LT11 date using Form 12153. Filing stops the levy while your case is reviewed." },
      { question: "What happens if I ignore an LT11?", answer: "After 30 days, the IRS can begin levying wages (garnishing your paycheck), seizing bank account funds, and taking federal payments like Social Security. This is avoidable — but only if you act before the deadline." },
    ],
    content: [
      "If you have received an LT11 (also called Letter 1058), you are at the most critical stage of IRS collection. This is the IRS's final notice before they can legally seize your wages, bank accounts, and other assets. You have exactly 30 days from the date on the notice — not the date you received it — to act.",
      "**What LT11 means.** The IRS has been sending collection notices (CP14, CP501, CP503, CP504) that went unanswered or unresolved. LT11 is the last step before enforcement. Once the 30-day window closes, the IRS can issue levies with no further warning.",
      "**Your most important right: the CDP hearing.** Within 30 days of the LT11 notice date, you can request a Collection Due Process hearing by filing Form 12153. This does two critical things: (1) it stops the levy from being issued while your case is reviewed by an IRS Appeals officer, and (2) it gives you the opportunity to propose alternatives — a payment plan, an Offer in Compromise, or to argue that collection would cause economic hardship. Miss this window and you lose these protections entirely.",
      "**What happens at a CDP hearing.** You present your case to an independent IRS Appeals officer (not the same person who has been working your collection case). You can propose installment agreements, currently-not-collectible status, or an Offer in Compromise. If you disagree with the outcome, you can appeal further to Tax Court.",
      "**What happens if the 30 days pass.** The IRS can: garnish up to 75% of your disposable wages, place a continuous levy on your bank account (taking all deposits), seize federal payments including Social Security benefits (up to 15%), and file a Notice of Federal Tax Lien that damages your credit. All of this is avoidable with the CDP request.",
      "**Get professional help now.** At the LT11 stage, the stakes are high enough that representing yourself is risky. A tax attorney, enrolled agent, or CPA familiar with IRS collections can file the CDP request, negotiate on your behalf, and prevent enforcement action. The cost of professional help is almost always less than the cost of a levy.",
      "**Disclaimer.** This is general information and not legal or tax advice. If you have received an LT11, contact a qualified tax professional immediately. GovLetter helps you understand what the notice says — for active representation, you need a licensed professional.",
    ],
  },
  "irs-cp504-notice-explained": {
    title: "IRS CP504 Notice: Last Warning Before State Refund Levy",
    description: "CP504 means the IRS is about to seize your state tax refund. You have limited time to pay or request a payment plan before collection begins.",
    keywords: "CP504 notice, IRS CP504, notice of intent to levy, CP504 what does it mean, IRS state refund levy",
    datePublished: "2026-04-30T08:00:00-05:00",
    dateModified: "2026-06-01T08:00:00-05:00",
    faqSchema: [
      { question: "What is an IRS CP504 notice?", answer: "CP504 is the IRS's notice of intent to levy your state tax refund and certain federal payments. It is the last notice before the IRS begins collection action." },
      { question: "How long do I have to respond to a CP504?", answer: "The CP504 gives you 30 days to pay the balance or set up a payment arrangement before the IRS begins levying your state tax refund and federal payments." },
    ],
    content: [
      "A CP504 means you are one step away from the IRS seizing your state tax refund and potentially other payments. Unlike the earlier balance-due notices, CP504 is a notice of intent to levy — not just a reminder. It requires immediate action.",
      "**What CP504 authorizes.** Upon issuing CP504, the IRS can begin levying your state income tax refund. It can also begin the Federal Payment Levy Program, which captures federal payments including certain Social Security benefits and federal contractor payments. Critically, CP504 is not the final notice for wage garnishment or bank levies — that requires the separate LT11 / Letter 1058 — but it is a serious escalation.",
      "**Your 30-day window.** You have 30 days from the CP504 date to: (1) pay the balance in full, (2) set up an installment agreement online at IRS.gov, (3) apply for currently-not-collectible status if you genuinely cannot pay, or (4) submit an Offer in Compromise if you believe you cannot pay the full liability.",
      "**Do not ignore this notice.** If you have been ignoring earlier notices (CP14, CP501, CP503), this is the last point at which you can resolve the debt before enforcement. The next step after CP504 is the LT11 final notice, which triggers your CDP hearing rights and a hard 30-day clock before levy of wages and bank accounts.",
      "**If you already have a payment plan.** Contact the IRS immediately. A CP504 may have been sent in error if your installment agreement is current. Call the number on the notice and confirm your agreement is in good standing.",
      "**Disclaimer.** This is general information and not tax or legal advice. GovLetter helps you understand what your notice means. For personalized guidance, consult a qualified tax professional.",
    ],
  },
  "how-to-read-irs-letter": {
    title: "Got an IRS Letter? How to Read It in 5 Minutes",
    description: "Every IRS letter has a notice number, a deadline, and a specific next step. This guide shows you exactly what to look for so you can stop panicking and start acting.",
    keywords: "how to read IRS letter, IRS letter explained, what does IRS letter mean, IRS notice guide, got a letter from IRS",
    datePublished: "2026-04-22T08:00:00-05:00",
    dateModified: "2026-06-01T08:00:00-05:00",
    faqSchema: [
      { question: "What should I do first when I get an IRS letter?", answer: "Don't panic. Open it and look for three things: the notice number (top right corner), the deadline, and the specific action requested. These three items determine everything." },
      { question: "How do I know if an IRS letter is real or a scam?", answer: "Real IRS letters arrive by postal mail — never email, text, or social media. Real notices have your partial SSN and a specific notice number you can verify at IRS.gov. IRS agents do not demand immediate payment by gift card or wire transfer." },
    ],
    content: [
      "Getting a letter from the IRS is stressful — but the worst thing you can do is shove it in a drawer. Every day you delay adds interest and penalties, and some notices have deadlines that permanently close your options if missed. Here is a simple 5-minute method to read any IRS letter.",
      "**Step 1: Find the notice number.** Look at the top right corner of the first page. You will see a code starting with CP (Computer Paragraph — automatically generated) or LT / Letter (generated by an IRS employee). The notice number tells you exactly what the IRS is communicating. Common ones: CP14 (balance due), CP2000 (proposed income adjustment), CP504 (intent to levy state refund), LT11 (final levy notice). You can look up any notice number at IRS.gov/notices.",
      "**Step 2: Find the deadline.** Every notice has a \"Respond By\" date or a payment due date. Write it down immediately. Deadlines on IRS notices run from the notice date — not the date you received the letter, which may be several days later. Missing a deadline almost always makes things worse.",
      "**Step 3: Identify the specific action requested.** Most IRS letters ask you to do one of four things: pay a balance, provide documentation, respond to a proposed change, or call to discuss. Read until you find the specific ask. If the letter is asking you to agree or disagree with a proposed change, you have options — you are not simply being billed.",
      "**Step 4: Verify before you respond.** Before paying or responding, compare the IRS's figures to your records. IRS notices contain errors more often than most people expect. Pull your tax return, your payment receipts, and any 1099s or W-2s the notice references. If the numbers match, respond accordingly. If they do not, document the discrepancy.",
      "**Step 5: Check for scam signs.** Real IRS letters always arrive by mail and include your partial SSN. Real IRS agents do not call demanding immediate payment by gift card, wire transfer, or cryptocurrency. If anything seems off — no notice number, urgent phone threats, requests for unusual payment methods — it is likely a scam. Verify by calling the IRS directly at 1-800-829-1040.",
      "**Disclaimer.** This guide is for general informational purposes and is not tax or legal advice. For complex situations — audits, levies, large balances — consult a qualified tax professional. GovLetter can help you identify and understand the specific notice you received.",
    ],
  },
  "state-tax-notice-explained": {
    title: "State Tax Notice Explained: What to Do in Any State",
    description: "Received a balance-due or audit notice from your state? Each state has different rules, portals, and appeal windows. Here's what to do wherever you are.",
    keywords: "state tax notice explained, state tax letter what to do, state tax balance due, California FTB letter, New York state tax notice",
    datePublished: "2026-04-15T08:00:00-05:00",
    dateModified: "2026-06-01T08:00:00-05:00",
    faqSchema: [
      { question: "What does a state tax notice mean?", answer: "A state tax notice typically means your state tax authority believes you owe additional tax, underpaid estimated taxes, or that there is a discrepancy between your state return and federal return or third-party records." },
      { question: "Is a state tax notice related to an IRS notice?", answer: "Not directly. State and federal taxes are separate. However, if the IRS adjusts your federal return, they share that information with your state — which often triggers a corresponding state notice." },
    ],
    content: [
      "State tax notices work similarly to IRS notices but with important differences: each state has its own agency, its own notice codes, its own deadlines, and its own appeal procedures. Here is how to handle one regardless of which state sent it.",
      "**Step 1: Identify the agency.** The notice will come from your state's department of revenue, franchise tax board, or equivalent. For example: California uses the Franchise Tax Board (FTB), New York uses the Department of Taxation and Finance, Texas has no income tax but does have the Comptroller for sales and business taxes, Illinois uses the Department of Revenue. The agency name and contact information will be on the notice.",
      "**Step 2: Find the notice type.** Most state notices fall into a few categories: balance due (you owe additional tax), proposed assessment (the state proposes adjusting your return — similar to the IRS CP2000), audit notice (they want to review specific items), or refund offset (your refund was applied to a debt). The notice type determines your response.",
      "**Step 3: Check the deadline.** State appeal and response deadlines vary — commonly 30, 60, or 90 days. Some states require payment of a disputed amount before you can appeal (\"pay to play\"). Missing the deadline can eliminate your appeal rights entirely, so find it and mark your calendar immediately.",
      "**Step 4: Verify the figures.** Compare the state's figures to your state return and, where relevant, your federal return and W-2s or 1099s. IRS adjustments flow to states, so if you recently resolved an IRS matter, confirm your state has the updated figures.",
      "**Step 5: Use the state's online portal.** Most states now have online portals where you can view your account, make payments, request payment plans, and submit responses. These are faster and provide a clear paper trail. GovLetter can identify your specific state authority and provide the direct portal link.",
      "**Disclaimer.** State tax laws vary significantly. This guide provides general information and is not tax or legal advice. For audit notices or large balances, consult a CPA or tax attorney licensed in your state.",
    ],
  },
};



export function staticListItems(us: boolean): BlogListItem[] {
  const posts = us ? STATIC_US_POSTS : STATIC_HU_POSTS;
  const meta = us ? STATIC_US_LIST : STATIC_HU_LIST;
  const bySlug = new Map(meta.map((m) => [m.slug, m]));
  return Object.keys(posts).map((slug) => {
    const m = bySlug.get(slug);
    const p = posts[slug];
    return {
      slug,
      title: p.title,
      excerpt: m?.excerpt ?? p.description,
      badge: m?.badge,
      badgeVariant: m?.badgeVariant,
      date: m?.date ?? new Date(p.datePublished).toLocaleDateString(us ? "en-US" : "hu-HU", { year: "numeric", month: "long", day: "numeric" }),
    };
  });
}

export function staticPost(us: boolean, slug: string): BlogPostEntry | undefined {
  const posts = us ? STATIC_US_POSTS : STATIC_HU_POSTS;
  return posts[slug];
}
