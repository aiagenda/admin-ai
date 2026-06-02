#!/usr/bin/env python3
"""Generate src/locales/{hu,en}/translation.json — extend HU/EN dicts as needed."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

HU_SEO = {
    "home": {
        "title": "AdminAI – hivatalos levelek, NAV iratok értelmezése | AI, számla OCR, KKV",
        "description": "Hivatalos és NAV-irat: magyar magyarázat, teendők, határidők. Egy ingyenes próba; utána dokumentumonként vagy havi csomag. Számla OCR és könyvelés támogatás magyar vállalkozásoknak.",
        "keywords": "NAV levél magyarázat, hivatalos levél értelmezés, adóhatósági irat, számla OCR, könyvelés KKV, dokumentum AI, iratkezelés, AdminAI",
        "websiteDescription": "Hivatalos levelek és NAV-iratok magyar értelmezése, teendők és határidők. Számla OCR és könyvelés támogatás KKV-knak.",
    },
    "pricing": {
        "title": "AdminAI árak: dokumentum, havi csomag, számla modul | Árak",
        "description": "Dokumentum- és havi csomagok, egy ingyenes próba, Stripe fizetés. Hivatalos levelek értelmezése, számla OCR és könyvelési támogatás magyar KKV-knak.",
        "keywords": "AdminAI ár, dokumentum AI csomag, havi előfizetés, számla OCR, NAV levél, Stripe, magyar KKV",
    },
    "arak": {
        "title": "AdminAI árak 2026 | próba, dokumentum, havi csomag, számla modul",
        "description": "Hivatalos levelek és NAV-iratok AI-értelmezése, egy próba, dokumentum- és havi csomag, számla OCR és archívum. Hasonlítsd össze a csomagokat, válassz magyar KKV-nak valót.",
        "keywords": "AdminAI ár 2026, dokumentum AI csomag, havi csomag KKV, számla OCR ár, NAV levél, előfizetés",
    },
    "upload": {
        "title": "Dokumentum feltöltése | AdminAI",
        "description": "PDF vagy kép feltöltése: AI elemzés, teendők, határidők, könyvelőnek export.",
        "keywords": "dokumentum feltöltés, PDF elemzés, NAV levél feltöltés, AdminAI",
    },
    "auth": {
        "title": "Bejelentkezés vagy regisztráció | AdminAI",
        "description": "Fiók a dokumentum- és számlafeldolgozáshoz: hivatalos levelek értelmezése, számla OCR, könyvelés. Google vagy e-mail.",
        "keywords": "AdminAI bejelentkezés, regisztráció, Google",
    },
    "authBootstrap": {
        "title": "Bejelentkezés | AdminAI",
        "description": "Jelentkezz be Google-fiókkal vagy e-maillel. Hivatalos levelek, NAV-iratok és számlák feldolgozása.",
        "keywords": "",
    },
    "authCallback": {
        "title": "Bejelentkezés folyamatban | AdminAI",
        "description": "OAuth bejelentkezés visszatérési pont. Nem publikus, keresők ne indexeljék.",
        "keywords": "",
    },
    "notFound": {
        "title": "404 – oldal nem található | AdminAI",
        "description": "A keresett oldal nem elérhető. Vissza a főoldalra: hivatalos levelek, NAV-iratok, számla OCR.",
        "keywords": "",
    },
    "help": {
        "title": "Súgó és GYIK | feltöltés, elemzés, könyvelés, export – AdminAI",
        "description": "AdminAI: PDF feltöltés, elemzés, egyszerű és részletes magyarázat, archívum, export, számlák, határidők. Részletes GYIK és hibaelhárítás.",
        "keywords": "AdminAI súgó, dokumentum feltöltés, elemzés magyarázat, archívum, könyvelés modul, NAV, GYIK",
    },
    "gyik": {
        "title": "GYIK: NAV határozat, számla OCR, adatkezelés | AdminAI",
        "description": "NAV felszólítás, határidők, számla OCR, könyvelőnek export, dokumentumbiztonság. Gyakori kérdések és válaszok az AdminAI hivatalos- és számlafeldolgozó funkcióiról.",
        "keywords": "NAV felszólítás GYIK, számla OCR, könyvelés export, dokumentum AI kérdések, hivatalos levél, AdminAI",
    },
    "blog": {
        "title": "AdminAI blog | NAV, számla OCR, KKV iratkezelés",
        "description": "NAV felszólítás és hivatalos levelek értelmezése, számla OCR, könyvelési export, iratkezelés tippek. Blog magyar kis- és középvállalkozásoknak.",
        "keywords": "NAV blog, számla OCR, iratkezelés KKV, hivatalos levél, könyvelés, AdminAI",
    },
    "comparisonChatgpt": {
        "title": "AdminAI vs ChatGPT dokumentum értelmezésre",
        "description": "AdminAI vs ChatGPT: miért jobb egy célzott magyar dokumentum-értelmező rendszer NAV levelekhez, határidőkhöz és számla OCR-hez.",
        "keywords": "AdminAI vs ChatGPT, dokumentum értelmezés AI, NAV levél ChatGPT helyett",
    },
    "comparisonBillingo": {
        "title": "AdminAI vs Billingo - bejövő dokumentum értelmezés",
        "description": "AdminAI vs Billingo: Billingo erős számlázásban, AdminAI pedig a kapott hivatalos dokumentumok értelmezésében és teendőkezelésben.",
        "keywords": "AdminAI vs Billingo, Billingo alternatíva, NAV levél értelmezés",
    },
    "comparisonSzamlazz": {
        "title": "AdminAI vs Számlázz.hu – dokumentum értelmezés és könyvelés",
        "description": "AdminAI vs Számlázz.hu: számlázó és dokumentum értelmezés összehasonlítása KKV-knak.",
        "keywords": "AdminAI vs Számlázz, dokumentum értelmezés, könyvelés",
    },
    "useCaseNav": {
        "title": "NAV határozat és hatósági levél értelmezése KKV-knak | AdminAI",
        "description": "NAV határozat és hivatalos levél értelmezése: teendők, határidők, közérthető magyarázat.",
        "keywords": "NAV határozat, hatósági levél, dokumentum értelmezés",
    },
    "useCaseOcr": {
        "title": "Számla OCR és számla felismerés szoftver KKV-knak | AdminAI",
        "description": "Számla OCR magyar vállalkozásoknak: fotózd le a számlát, az AdminAI kiolvassa az adatokat és Excelbe exportálja könyveléshez.",
        "keywords": "számla OCR, számla felismerés szoftver, könyvelés automatizálás",
    },
    "useCaseArchive": {
        "title": "Dokumentum archiválás és iratkezelő szoftver KKV-knak | AdminAI",
        "description": "Iratkezelő szoftver KKV-knak: dokumentum archiválás, kereshetőség, határidőkövetés és AI-alapú értelmezés egy rendszerben.",
        "keywords": "iratkezelő szoftver KKV, dokumentum archiválás, digitális iratkezelés",
    },
    "legalPrivacy": {
        "title": "Adatkezelési tájékoztató | AdminAI",
        "description": "Hogyan kezeljük a személyes adatokat az AdminAI szolgáltatásban: cél, jogalap, megőrzés, érintetti jogok. Tájékoztató vállalkozásoknak és magánszemélyeknek.",
        "keywords": "adatkezelési tájékoztató, GDPR, adatkezelés, AdminAI, személyes adat",
    },
    "legalCookies": {
        "title": "Cookie (süti) tájékoztató | AdminAI",
        "description": "Milyen sütiket használ az AdminAI webes alkalmazás, mire szolgálnak, és hogyan kezelheted a beállításokat.",
        "keywords": "cookie tájékoztató, süti, adatkezelés, AdminAI",
    },
    "legalTerms": {
        "title": "Általános szerződési feltételek (ÁSZF) | AdminAI",
        "description": "Az AdminAI használatának feltételei, szolgáltatás, díjazás, felelősség, felmondás. Tájékozódás regisztráció előtt.",
        "keywords": "ÁSZF, felhasználási feltételek, adminai.hu",
    },
    "legalDpa": {
        "title": "Adatfeldolgozási megállapodás (DPA) | AdminAI",
        "description": "B2B jellegű adatfeldolgozás keretrendszere: szerepkörök, utasítások, alfeldolgozók, TOM. Tájékozódás és szerződéses háttér.",
        "keywords": "DPA, adatfeldolgozás, GDPR, AdminAI",
    },
    "legalImprint": {
        "title": "Impresszum és elérhetőségek | AdminAI",
        "description": "Hivatalos elérhetőségek, szolgáltatói adatok, kapcsolattartási cím az adminai.hu szolgáltatáshoz.",
        "keywords": "impresszum, szolgáltatói adatok, AdminAI",
    },
    "legalSecurity": {
        "title": "Biztonság | AdminAI",
        "description": "Dokumentum- és fiók-adatok védelme: hozzáférés, környezet, gyakorlati ajánlások. Tájékozódás a felhő- és fiókbiztonságról.",
        "keywords": "informatikai biztonság, adatvédelem, AdminAI",
    },
}

EN_SEO = {
    "home": {
        "title": "NoticeIQ – understand agency letters & invoices | AI for SMBs",
        "description": "Plain-language summaries, next steps, and deadlines from PDFs and scans. Free trial, then per-document or monthly plans. Invoice OCR and bookkeeping-friendly export.",
        "keywords": "IRS letter, tax notice, agency letter, invoice OCR, SMB admin AI, NoticeIQ",
        "websiteDescription": "Plain-language breakdowns of official letters and deadlines. Invoice OCR and export for small businesses.",
    },
    "pricing": {
        "title": "NoticeIQ pricing – documents, monthly plans, bookkeeping add-on",
        "description": "Per-document and monthly bundles with a free trial and Stripe checkout. Built for official letters, invoice OCR, and bookkeeping workflows.",
        "keywords": "NoticeIQ pricing, document AI, monthly plan, invoice OCR, Stripe",
    },
    "arak": {
        "title": "NoticeIQ pricing (2026) – trial, documents, monthly, invoices",
        "description": "Compare plans for AI breakdowns of official letters, invoice OCR, and archive. Built for busy SMB teams.",
        "keywords": "NoticeIQ pricing, SMB, invoice OCR, subscription",
    },
    "upload": {
        "title": "Upload a document | NoticeIQ",
        "description": "Upload a PDF or photo for AI analysis: deadlines, amounts, and export for your accountant.",
        "keywords": "upload PDF, document AI, NoticeIQ",
    },
    "auth": {
        "title": "Sign in or create account | NoticeIQ",
        "description": "Access document and invoice workflows: Google or email sign-in.",
        "keywords": "NoticeIQ login, sign up",
    },
    "authBootstrap": {
        "title": "Signing in | NoticeIQ",
        "description": "Complete sign-in with Google or email.",
        "keywords": "",
    },
    "authCallback": {
        "title": "Completing sign-in | NoticeIQ",
        "description": "OAuth redirect endpoint (not indexed).",
        "keywords": "",
    },
    "notFound": {
        "title": "404 – page not found | NoticeIQ",
        "description": "This page does not exist. Return home for document analysis and invoice tools.",
        "keywords": "",
    },
    "help": {
        "title": "Help & FAQ | NoticeIQ",
        "description": "How upload, analysis, archive, invoices, and export work — troubleshooting and tips.",
        "keywords": "NoticeIQ help, upload, invoice module, FAQ",
    },
    "gyik": {
        "title": "FAQ: tax letters, invoice OCR, privacy | NoticeIQ",
        "description": "Deadlines, OCR, exports, and security — common questions about NoticeIQ.",
        "keywords": "FAQ, invoice OCR, tax letter, NoticeIQ",
    },
    "blog": {
        "title": "NoticeIQ blog – tax letters, invoices, SMB operations",
        "description": "Practical guides for interpreting notices and streamlining invoice workflows.",
        "keywords": "tax blog, invoice OCR, SMB, NoticeIQ",
    },
    "comparisonChatgpt": {
        "title": "NoticeIQ vs ChatGPT for official documents",
        "description": "Why a purpose-built workflow beats a general chatbot for deadlines, structured extraction, and archives.",
        "keywords": "NoticeIQ vs ChatGPT, document AI",
    },
    "comparisonBillingo": {
        "title": "NoticeIQ vs Billingo – incoming documents",
        "description": "Billingo focuses on outbound invoicing; NoticeIQ focuses on understanding letters you receive.",
        "keywords": "Billingo, incoming mail, NoticeIQ",
    },
    "comparisonSzamlazz": {
        "title": "NoticeIQ vs Számlázz.hu – different jobs",
        "description": "Invoicing platforms vs document interpretation — what each is best at.",
        "keywords": "Számlázz, document AI, NoticeIQ",
    },
    "useCaseNav": {
        "title": "Understand tax authority letters (SMB) | NoticeIQ",
        "description": "Turn complex notices into clear next steps and calendar-ready deadlines.",
        "keywords": "tax notice, authority letter, SMB",
    },
    "useCaseOcr": {
        "title": "Invoice OCR for SMBs | NoticeIQ",
        "description": "Capture invoice fields from scans and photos and export to spreadsheets.",
        "keywords": "invoice OCR, bookkeeping export",
    },
    "useCaseArchive": {
        "title": "Document archive for SMBs | NoticeIQ",
        "description": "Searchable archive with AI summaries for operational and compliance paperwork.",
        "keywords": "document archive, SMB",
    },
    "legalPrivacy": {
        "title": "Privacy policy | NoticeIQ",
        "description": "How we process personal data: purposes, retention, and your rights.",
        "keywords": "privacy, GDPR, NoticeIQ",
    },
    "legalCookies": {
        "title": "Cookie notice | NoticeIQ",
        "description": "Cookies used by the web app and how to control them.",
        "keywords": "cookies, NoticeIQ",
    },
    "legalTerms": {
        "title": "Terms of service | NoticeIQ",
        "description": "Terms covering access, billing, liability, and termination.",
        "keywords": "terms, NoticeIQ",
    },
    "legalDpa": {
        "title": "Data processing agreement (DPA) | NoticeIQ",
        "description": "B2B processing roles, instructions, and subprocessors (template-level overview).",
        "keywords": "DPA, processing agreement",
    },
    "legalImprint": {
        "title": "Imprint & contact | NoticeIQ",
        "description": "Provider details and contact channels.",
        "keywords": "imprint, contact",
    },
    "legalSecurity": {
        "title": "Security overview | NoticeIQ",
        "description": "How we protect documents and accounts at a high level.",
        "keywords": "security, NoticeIQ",
    },
}


def main() -> None:
    for lng, seo in (("hu", HU_SEO), ("en", EN_SEO)):
        path = ROOT / "src" / "locales" / lng / "translation.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps({"seo": seo}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("wrote", path)


if __name__ == "__main__":
    main()
