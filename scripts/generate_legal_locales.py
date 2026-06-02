#!/usr/bin/env python3
"""Write src/locales/{en,hu}/legal.json for Privacy, Terms, Cookies, DPA, Security, Imprint."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_EN = ROOT / "src" / "locales" / "en" / "legal.json"
OUT_HU = ROOT / "src" / "locales" / "hu" / "legal.json"

# Attorney review required. English text is US/EU-oriented SaaS + AI document processing.
EN = {
    "privacy": {
        "title": "Privacy Policy",
        "intro": "This Privacy Policy explains how we collect, use, disclose, and protect information when you use our websites and services (the “Services”), including document upload, analysis, and related features. It is not legal advice. A qualified attorney should review the final text for your entity, markets, and data flows.",
        "lastUpdatedLabel": "Last updated:",
        "lastUpdated": "May 6, 2026",
        "sections": [
            {
                "title": "Who we are",
                "paragraphs": [
                    "The data controller is identified in your account, contract, or imprint, and is referred to in this policy as “we,” “us,” or “our.” If you have questions, contact us using the details in the “Contact” section below.",
                ],
            },
            {
                "title": "What we process",
                "paragraphs": [
                    "We may process: account and authentication data (e.g., email, user IDs, OAuth profile where you choose Google or similar sign-in); content you upload (e.g., PDFs, images) and derived outputs (e.g., extracted text, summaries, structured fields, task lists); billing-related information processed by our payment provider (we generally do not store full payment card numbers); technical data (e.g., IP address, device/browser type, timestamps, logs) required to operate and secure the Services.",
                ],
            },
            {
                "title": "AI features",
                "paragraphs": [
                    "Certain features use automated processing and machine learning models to interpret documents and generate summaries or suggestions. Outputs may be imperfect and must be verified before you rely on them for compliance, tax, or legal decisions. Do not treat outputs as legal, tax, or professional advice.",
                ],
            },
            {
                "title": "Purposes and legal bases (EEA/UK users)",
                "paragraphs": [
                    "Where GDPR applies, we rely on appropriate bases such as: performance of a contract (providing the Services); legitimate interests (security, abuse prevention, product improvement subject to balancing); compliance with legal obligations; and consent where required (e.g., certain cookies or marketing communications).",
                ],
            },
            {
                "title": "United States — California residents (summary)",
                "paragraphs": [
                    "If you are a California resident, you may have rights under the CCPA/CPRA, including rights to know, delete, and correct personal information, and to opt out of certain “sharing” or “sales” as defined by law. We do not “sell” personal information in the conventional sense of selling lists; we use service providers (subprocessors) to run the Services. For requests, use the contact email below. You may also use an authorized agent where permitted by law.",
                ],
            },
            {
                "title": "Subprocessors / service providers",
                "paragraphs": [
                    "We use infrastructure and service providers to host, authenticate, process payments, and operate the Services. See the Subprocessors page in our documentation for a representative list (e.g., hosting, database, payment processor, email). Providers are bound by contractual obligations appropriate to their role.",
                ],
            },
            {
                "title": "International transfers",
                "paragraphs": [
                    "If you access the Services from outside the country where data is processed, your information may be transferred across borders. Where required, we use appropriate safeguards (such as Standard Contractual Clauses) and supplemental measures as applicable.",
                ],
            },
            {
                "title": "Retention",
                "paragraphs": [
                    "We retain information for as long as needed to provide the Services, comply with law, resolve disputes, and enforce agreements. Retention periods may vary by data category and product settings (including deletion upon account closure, subject to backups and legal holds).",
                ],
            },
            {
                "title": "Security",
                "paragraphs": [
                    "We implement technical and organizational measures appropriate to the risk, including encryption in transit (HTTPS), access controls, and monitoring. No method of transmission or storage is 100% secure.",
                ],
            },
            {
                "title": "Your rights and choices",
                "paragraphs": [
                    "Depending on your location, you may have rights to access, rectify, delete, restrict processing, object, or port your data. You may withdraw consent where processing is consent-based. Contact us to exercise rights. You may lodge a complaint with your local supervisory authority where applicable.",
                ],
            },
            {
                "title": "Children",
                "paragraphs": [
                    "The Services are not directed to children under 13 (or the minimum age required in your jurisdiction). Do not provide personal information of children through the Services.",
                ],
            },
            {
                "title": "Changes",
                "paragraphs": [
                    "We may update this policy from time to time. We will post the updated version and revise the “Last updated” date. Where required, we will provide additional notice.",
                ],
            },
            {
                "title": "Contact",
                "paragraphs": [
                    "Privacy inquiries: use the privacy contact published in your product imprint or configure environment variables at deployment for accurate contact details.",
                ],
            },
        ],
    },
    "terms": {
        "title": "Terms of Service",
        "intro": "These Terms govern access to and use of the Services. They are a starting point for a US/EU SaaS offering and require attorney review before production use.",
        "lastUpdatedLabel": "Last updated:",
        "lastUpdated": "May 6, 2026",
        "sections": [
            {
                "title": "Agreement",
                "paragraphs": [
                    "By accessing or using the Services, you agree to these Terms. If you use the Services on behalf of an organization, you represent that you have authority to bind that organization.",
                ],
            },
            {
                "title": "The Services",
                "paragraphs": [
                    "We provide software that helps you upload, analyze, organize, and export documents. Features may change. Outputs may include AI-generated summaries and extractions that can be incomplete or inaccurate.",
                ],
            },
            {
                "title": "Not legal, tax, or professional advice",
                "paragraphs": [
                    "The Services are not a substitute for advice from qualified professionals. You are responsible for decisions you make based on outputs.",
                ],
            },
            {
                "title": "Accounts and security",
                "paragraphs": [
                    "You must provide accurate registration information and safeguard credentials. Notify us promptly of unauthorized use.",
                ],
            },
            {
                "title": "Fees, billing, taxes",
                "paragraphs": [
                    "Paid plans are billed via our payment processor (e.g., Stripe). Fees are as shown at checkout. Taxes may apply based on location and law. If you dispute a charge, contact support before initiating chargebacks where reasonable.",
                ],
            },
            {
                "title": "Refunds and cancellation",
                "paragraphs": [
                    "Refund eligibility depends on the plan you purchased and applicable law. Where subscriptions renew automatically, you may cancel according to in-product flows or provider receipts. Configure final refund rules with counsel and align Stripe settings.",
                ],
            },
            {
                "title": "Acceptable use",
                "paragraphs": [
                    "You may not misuse the Services, attempt unauthorized access, interfere with operation, upload unlawful content, or use the Services to violate third-party rights.",
                ],
            },
            {
                "title": "Intellectual property",
                "paragraphs": [
                    "We retain rights in the Services and branding. You retain rights in your content; you grant us a license to host and process your content as needed to provide the Services.",
                ],
            },
            {
                "title": "Disclaimer",
                "paragraphs": [
                    'THE SERVICES ARE PROVIDED “AS IS” AND “AS AVAILABLE,” WITHOUT WARRANTIES OF ANY KIND, TO THE MAXIMUM EXTENT PERMITTED BY LAW.',
                ],
            },
            {
                "title": "Limitation of liability",
                "paragraphs": [
                    "TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR TOTAL LIABILITY ARISING OUT OF OR RELATED TO THE SERVICES WILL NOT EXCEED THE GREATER OF AMOUNTS YOU PAID FOR THE SERVICES IN THE TWELVE (12) MONTHS BEFORE THE CLAIM OR ONE HUNDRED US DOLLARS (US $100). SOME JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS; IN THOSE CASES, LIMITS APPLY TO THE FULLEST EXTENT ALLOWED.",
                ],
            },
            {
                "title": "Termination",
                "paragraphs": [
                    "You may stop using the Services at any time. We may suspend or terminate access for breach or risk. Provisions that should survive will survive termination.",
                ],
            },
            {
                "title": "Governing law and disputes",
                "paragraphs": [
                    "The governing law and venue for disputes depend on your contracting entity and customer location and must be finalized with counsel. Until then, this section is intentionally left as a placeholder for legal completion.",
                ],
            },
            {
                "title": "Changes",
                "paragraphs": [
                    "We may modify these Terms. Continued use after the effective date may constitute acceptance where permitted by law.",
                ],
            },
        ],
    },
    "cookies": {
        "title": "Cookie Notice",
        "intro": "This notice describes how we use cookies and similar technologies. Align banner/consent UX with what you actually deploy.",
        "lastUpdatedLabel": "Last updated:",
        "lastUpdated": "May 6, 2026",
        "sections": [
            {
                "title": "What are cookies?",
                "paragraphs": [
                    "Cookies are small text files stored on your device. Similar technologies include local storage and pixels.",
                ],
            },
            {
                "title": "Strictly necessary",
                "paragraphs": [
                    "These are required for core functionality such as authentication sessions and security. They may be exempt from consent under EU ePrivacy guidance depending on implementation.",
                ],
            },
            {
                "title": "Analytics and performance",
                "paragraphs": [
                    "If enabled, we may use analytics to understand usage and improve reliability. Configure your analytics provider and consent gates accordingly.",
                ],
            },
            {
                "title": "Marketing",
                "paragraphs": [
                    "If you use marketing cookies or ads personalization, disclose it and obtain consent where required.",
                ],
            },
            {
                "title": "Managing preferences",
                "paragraphs": [
                    "You can control cookies through browser settings and, where provided, an in-app preference center.",
                ],
            },
        ],
    },
    "dpa": {
        "title": "Data Processing Agreement (DPA)",
        "intro": "This DPA template is for business customers where we process personal data on your behalf. It must be customized and executed for your legal entities.",
        "lastUpdatedLabel": "Last updated:",
        "lastUpdated": "May 6, 2026",
        "sections": [
            {
                "title": "Roles",
                "paragraphs": [
                    "You act as a controller (or independent controller, as applicable) for personal data you submit. We act as a processor for the purposes and duration described in your subscription or order.",
                ],
            },
            {
                "title": "Instructions",
                "paragraphs": [
                    "We process personal data only on documented instructions from you unless otherwise required by applicable law.",
                ],
            },
            {
                "title": "Confidentiality and security",
                "paragraphs": [
                    "We ensure personnel are bound by confidentiality and implement appropriate technical and organizational measures.",
                ],
            },
            {
                "title": "Subprocessors",
                "paragraphs": [
                    "We may engage subprocessors. We impose data protection terms and remain responsible for their performance.",
                ],
            },
            {
                "title": "Assistance and breaches",
                "paragraphs": [
                    "We assist you with responding to data subject requests where reasonable and notify you without undue delay if we become aware of a personal data breach relevant to your data.",
                ],
            },
            {
                "title": "Deletion or return",
                "paragraphs": [
                    "Upon termination, we delete or return personal data according to your instructions and applicable law, subject to backups and legal retention.",
                ],
            },
        ],
    },
    "security": {
        "title": "Security Overview",
        "intro": "High-level summary of security practices. Supplement with SOC 2 / penetration testing artifacts as your program matures.",
        "lastUpdatedLabel": "Last updated:",
        "lastUpdated": "May 6, 2026",
        "sections": [
            {
                "title": "Infrastructure",
                "paragraphs": [
                    "We rely on reputable cloud infrastructure providers for hosting and managed database services with modern baseline controls.",
                ],
            },
            {
                "title": "Application security",
                "paragraphs": [
                    "We use TLS for data in transit, enforce authenticated access for customer data, and apply least-privilege principles internally.",
                ],
            },
            {
                "title": "Incident response",
                "paragraphs": [
                    "We maintain internal procedures for detecting, containing, and recovering from security incidents and notifying affected parties where required.",
                ],
            },
            {
                "title": "Responsible disclosure",
                "paragraphs": [
                    "If you believe you found a vulnerability, report it to the security contact published by the operator. Do not perform destructive testing without authorization.",
                ],
            },
        ],
    },
    "imprint": {
        "title": "Imprint / Company Information",
        "intro": "Legal identifiers for public disclosure. Replace placeholders via environment variables at build time.",
        "lastUpdatedLabel": "Last updated:",
        "lastUpdated": "May 6, 2026",
        "sections": [
            {
                "title": "Provider",
                "paragraphs": [
                    "Legal entity name, registered address, registration numbers, and VAT identifiers must be inserted for your jurisdiction.",
                ],
            },
            {
                "title": "Contact",
                "paragraphs": [
                    "General support and privacy contacts should match what you publish in production DNS and templates.",
                ],
            },
            {
                "title": "Hosting / infrastructure",
                "paragraphs": [
                    "Operational subprocessors such as hosting and payment processors are listed in the Subprocessors documentation.",
                ],
            },
        ],
    },
}

HU = {
    "privacy": {
        "title": "Adatkezelési tájékoztató",
        "intro": "Ez a tájékoztató összefoglalja a személyes adatok kezelését a szolgáltatás használata során. Végleges jogi szöveget ügyvédi felülvizsgálattal kell jóváhagyni.",
        "lastUpdatedLabel": "Utolsó frissítés:",
        "lastUpdated": "2026. május 6.",
        "sections": [
            {
                "title": "Az adatkezelő",
                "paragraphs": [
                    "Az adatkezelő megnevezése, székhelye és elérhetősége a szerződésben, impresszumban vagy a fiókban feltüntetett módon kerül közzétételre.",
                ],
            },
            {
                "title": "Kezelt adatok köre",
                "paragraphs": [
                    "Kezelhetünk regisztrációs és belépési adatokat (pl. e-mail, OAuth profil), feltöltött dokumentumokat és azokból származtatott elemzéseket, számlázáshoz kapcsolódó adatokat (kártyaadatokat általában nem tárolunk — a fizetési szolgáltató kezeli), valamint technikai naplókat (IP, böngésző, időbélyegek) a működtetéshez és biztonsághoz.",
                ],
            },
            {
                "title": "AI funkciók",
                "paragraphs": [
                    "Egyes funkciók automatizált feldolgozást és gépi tanulást alkalmaznak. A kimenetek hibásak lehetnek — jogi, adózási vagy szakmai döntéshez mindig szükség van emberi ellenőrzésre.",
                ],
            },
            {
                "title": "Adatkezelés célja és jogalapja (GDPR)",
                "paragraphs": [
                    "Szerződés teljesítése, jogos érdek (biztonság, visszaélés megelőzése), jogi kötelezettség, illetve ahol szükséges, az érintett hozzájárulása.",
                ],
            },
            {
                "title": "Adatfeldolgozók",
                "paragraphs": [
                    "Tárhely, adatbázis, fizetés, e-mail és egyéb üzemeltetési szolgáltatók igénybevétele szükséges lehet. Listát a Szubfeldolgozók dokumentációban érdemes közzétenni.",
                ],
            },
            {
                "title": "Őrzési idő",
                "paragraphs": [
                    "Az adatokat a célhoz szükséges ideig őrizzük, majd töröljük vagy anonimizáljuk, ha jogszabály nem kötelez másra.",
                ],
            },
            {
                "title": "Érintetti jogok",
                "paragraphs": [
                    "Hozzáférés, helyesbítés, törlés, korlátozás, tiltakozás, adathordozhatóság — jogszabály szerinti keretek között. Panasz a NAIH-nál.",
                ],
            },
            {
                "title": "Kapcsolat",
                "paragraphs": [
                    "Adatvédelmi megkereséshez használja a közzétett kapcsolati címet vagy a telepítéskor beállított env változókat.",
                ],
            },
        ],
    },
    "terms": {
        "title": "Általános szerződési feltételek",
        "intro": "Ezek a feltételek a szolgáltatás igénybevételére vonatkoznak. Véglegesítéshez ügyvédi felülvizsgálat szükséges.",
        "lastUpdatedLabel": "Utolsó frissítés:",
        "lastUpdated": "2026. május 6.",
        "sections": [
            {
                "title": "A szolgáltatás tárgya",
                "paragraphs": [
                    "A platform dokumentum- és számlafeldolgozási, archívum és kapcsolódó funkciókat nyújt.",
                ],
            },
            {
                "title": "Fiók és jogosultság",
                "paragraphs": [
                    "A felhasználó felel a fiók adatainak védelméért. Visszaélésszerű használat esetén korlátozhatjuk a hozzáférést.",
                ],
            },
            {
                "title": "Díjazás és számlázás",
                "paragraphs": [
                    "Az előfizetési díjak az árak oldalon szerepelnek. Automatikus megújítás és lemondás feltételeit egyértelműen közöljük.",
                ],
            },
            {
                "title": "Felelősség korlátozása",
                "paragraphs": [
                    "A szolgáltatás „ahogy van” alapon működik. Az AI kimenetet szakmailag ellenőrizni kell. A jogszabályban nem zárható felelősség nem korlátozható.",
                ],
            },
            {
                "title": "Szerződés megszűnése",
                "paragraphs": [
                    "Az előfizetés lemondható. A már teljesített időszak díjai általában nem visszatérítendők, kivéve ha jogszabály másként rendelkezik.",
                ],
            },
        ],
    },
    "cookies": {
        "title": "Cookie tájékoztató",
        "intro": "Minta dokumentum — technikai és marketing süti használatát a tényleges beállításoknak megfelelően frissíteni kell.",
        "lastUpdatedLabel": "Utolsó frissítés:",
        "lastUpdated": "2026. május 6.",
        "sections": [
            {
                "title": "Mik azok a cookie-k?",
                "paragraphs": [
                    "A cookie-k kis adatfájlok a böngészőben. Hasonló technológiák a localStorage és egyéb tárolók.",
                ],
            },
            {
                "title": "Kategóriák",
                "paragraphs": [
                    "Szükséges: bejelentkezés, biztonság. Elemzés és marketing csak akkor, ha ténylegesen használjuk és a jogszabálynak megfelelő hozzájárulás/jogalap rendelkezik róla.",
                ],
            },
        ],
    },
    "dpa": {
        "title": "Adatfeldolgozási megállapodás (DPA)",
        "intro": "B2B minta — jogi személyre szabott véglegesítés szükséges.",
        "lastUpdatedLabel": "Utolsó frissítés:",
        "lastUpdated": "2026. május 6.",
        "sections": [
            {
                "title": "Felek és szerepkörök",
                "paragraphs": [
                    "Ügyfél: adatkezelő. Szolgáltató: adatfeldolgozó.",
                ],
            },
            {
                "title": "Subprocessor lista",
                "paragraphs": [
                    "A szubfeldolgozók közzététele és változás értesítése szerződés szerint.",
                ],
            },
        ],
    },
    "security": {
        "title": "Biztonság",
        "intro": "Összefoglaló a védelmi gyakorlatokról.",
        "lastUpdatedLabel": "Utolsó frissítés:",
        "lastUpdated": "2026. május 6.",
        "sections": [
            {
                "title": "Infrastruktúra",
                "paragraphs": [
                    "HTTPS/TLS, jogosultságkezelés, naplózás és audit nyomvonala kritikus műveleteknél.",
                ],
            },
            {
                "title": "Sebezhetőség bejelentés",
                "paragraphs": [
                    "Biztonsági bejelentés: használja a közzétett security e-mail címet.",
                ],
            },
        ],
    },
    "imprint": {
        "title": "Impresszum / Szolgáltatói adatok",
        "intro": "Valós cégadatokkal ki kell tölteni.",
        "lastUpdatedLabel": "Utolsó frissítés:",
        "lastUpdated": "2026. május 6.",
        "sections": [
            {
                "title": "Szolgáltató",
                "paragraphs": [
                    "Cégnév, székhely, cégjegyzék, adószám — kitöltendő.",
                ],
            },
            {
                "title": "Kapcsolat",
                "paragraphs": [
                    "E-mail és telefon — kitöltendő.",
                ],
            },
        ],
    },
}


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    write_json(OUT_EN, EN)
    write_json(OUT_HU, HU)
    print("wrote", OUT_EN)
    print("wrote", OUT_HU)


if __name__ == "__main__":
    main()
