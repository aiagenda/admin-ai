#!/usr/bin/env python3
"""Generate src/locales/{hu,en}/translation.json — extend HU/EN dicts as needed."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

HU_SEO = {
    "home": {
        "title": "GovLetter – hivatalos levelek, NAV iratok értelmezése | AI, számla OCR, KKV",
        "description": "Hivatalos és NAV-irat: magyar magyarázat, teendők, határidők. Egy ingyenes próba; utána dokumentumonként vagy havi csomag. Számla OCR és könyvelés támogatás magyar vállalkozásoknak.",
        "keywords": "NAV levél magyarázat, hivatalos levél értelmezés, adóhatósági irat, számla OCR, könyvelés KKV, dokumentum AI, iratkezelés, GovLetter",
        "websiteDescription": "Hivatalos levelek és NAV-iratok magyar értelmezése, teendők és határidők. Számla OCR és könyvelés támogatás KKV-knak.",
    },
    "pricing": {
        "title": "GovLetter árak: dokumentum, havi csomag, számla modul | Árak",
        "description": "Dokumentum- és havi csomagok, egy ingyenes próba, Stripe fizetés. Hivatalos levelek értelmezése, számla OCR és könyvelési támogatás magyar KKV-knak.",
        "keywords": "GovLetter ár, dokumentum AI csomag, havi előfizetés, számla OCR, NAV levél, Stripe, magyar KKV",
    },
    "arak": {
        "title": "GovLetter árak 2026 | próba, dokumentum, havi csomag, számla modul",
        "description": "Hivatalos levelek és NAV-iratok AI-értelmezése, egy próba, dokumentum- és havi csomag, számla OCR és archívum. Hasonlítsd össze a csomagokat, válassz magyar KKV-nak valót.",
        "keywords": "GovLetter ár 2026, dokumentum AI csomag, havi csomag KKV, számla OCR ár, NAV levél, előfizetés",
    },
    "upload": {
        "title": "Dokumentum feltöltése | GovLetter",
        "description": "PDF vagy kép feltöltése: AI elemzés, teendők, határidők, könyvelőnek export.",
        "keywords": "dokumentum feltöltés, PDF elemzés, NAV levél feltöltés, GovLetter",
    },
    "auth": {
        "title": "Bejelentkezés vagy regisztráció | GovLetter",
        "description": "Fiók a dokumentum- és számlafeldolgozáshoz: hivatalos levelek értelmezése, számla OCR, könyvelés. Google vagy e-mail.",
        "keywords": "GovLetter bejelentkezés, regisztráció, Google",
    },
    "authBootstrap": {
        "title": "Bejelentkezés | GovLetter",
        "description": "Jelentkezz be Google-fiókkal vagy e-maillel. Hivatalos levelek, NAV-iratok és számlák feldolgozása.",
        "keywords": "",
    },
    "authCallback": {
        "title": "Bejelentkezés folyamatban | GovLetter",
        "description": "OAuth bejelentkezés visszatérési pont. Nem publikus, keresők ne indexeljék.",
        "keywords": "",
    },
    "notFound": {
        "title": "404 – oldal nem található | GovLetter",
        "description": "A keresett oldal nem elérhető. Vissza a főoldalra: hivatalos levelek, NAV-iratok, számla OCR.",
        "keywords": "",
    },
    "help": {
        "title": "Súgó és GYIK | feltöltés, elemzés, könyvelés, export – GovLetter",
        "description": "GovLetter: PDF feltöltés, elemzés, egyszerű és részletes magyarázat, archívum, export, számlák, határidők. Részletes GYIK és hibaelhárítás.",
        "keywords": "GovLetter súgó, dokumentum feltöltés, elemzés magyarázat, archívum, könyvelés modul, NAV, GYIK",
    },
    "gyik": {
        "title": "GYIK: NAV határozat, számla OCR, adatkezelés | GovLetter",
        "description": "NAV felszólítás, határidők, számla OCR, könyvelőnek export, dokumentumbiztonság. Gyakori kérdések és válaszok az GovLetter hivatalos- és számlafeldolgozó funkcióiról.",
        "keywords": "NAV felszólítás GYIK, számla OCR, könyvelés export, dokumentum AI kérdések, hivatalos levél, GovLetter",
    },
    "blog": {
        "title": "GovLetter blog | NAV, számla OCR, KKV iratkezelés",
        "description": "NAV felszólítás és hivatalos levelek értelmezése, számla OCR, könyvelési export, iratkezelés tippek. Blog magyar kis- és középvállalkozásoknak.",
        "keywords": "NAV blog, számla OCR, iratkezelés KKV, hivatalos levél, könyvelés, GovLetter",
    },
    "comparisonChatgpt": {
        "title": "GovLetter vs ChatGPT dokumentum értelmezésre",
        "description": "GovLetter vs ChatGPT: miért jobb egy célzott magyar dokumentum-értelmező rendszer NAV levelekhez, határidőkhöz és számla OCR-hez.",
        "keywords": "GovLetter vs ChatGPT, dokumentum értelmezés AI, NAV levél ChatGPT helyett",
    },
    "comparisonBillingo": {
        "title": "GovLetter vs Billingo - bejövő dokumentum értelmezés",
        "description": "GovLetter vs Billingo: Billingo erős számlázásban, GovLetter pedig a kapott hivatalos dokumentumok értelmezésében és teendőkezelésben.",
        "keywords": "GovLetter vs Billingo, Billingo alternatíva, NAV levél értelmezés",
    },
    "comparisonSzamlazz": {
        "title": "GovLetter vs Számlázz.hu – dokumentum értelmezés és könyvelés",
        "description": "GovLetter vs Számlázz.hu: számlázó és dokumentum értelmezés összehasonlítása KKV-knak.",
        "keywords": "GovLetter vs Számlázz, dokumentum értelmezés, könyvelés",
    },
    "useCaseNav": {
        "title": "NAV határozat és hatósági levél értelmezése KKV-knak | GovLetter",
        "description": "NAV határozat és hivatalos levél értelmezése: teendők, határidők, közérthető magyarázat.",
        "keywords": "NAV határozat, hatósági levél, dokumentum értelmezés",
    },
    "useCaseOcr": {
        "title": "Számla OCR és számla felismerés szoftver KKV-knak | GovLetter",
        "description": "Számla OCR magyar vállalkozásoknak: fotózd le a számlát, az GovLetter kiolvassa az adatokat és Excelbe exportálja könyveléshez.",
        "keywords": "számla OCR, számla felismerés szoftver, könyvelés automatizálás",
    },
    "useCaseArchive": {
        "title": "Dokumentum archiválás és iratkezelő szoftver KKV-knak | GovLetter",
        "description": "Iratkezelő szoftver KKV-knak: dokumentum archiválás, kereshetőség, határidőkövetés és AI-alapú értelmezés egy rendszerben.",
        "keywords": "iratkezelő szoftver KKV, dokumentum archiválás, digitális iratkezelés",
    },
    "legalPrivacy": {
        "title": "Adatkezelési tájékoztató | GovLetter",
        "description": "Hogyan kezeljük a személyes adatokat az GovLetter szolgáltatásban: cél, jogalap, megőrzés, érintetti jogok. Tájékoztató vállalkozásoknak és magánszemélyeknek.",
        "keywords": "adatkezelési tájékoztató, GDPR, adatkezelés, GovLetter, személyes adat",
    },
    "legalCookies": {
        "title": "Cookie (süti) tájékoztató | GovLetter",
        "description": "Milyen sütiket használ az GovLetter webes alkalmazás, mire szolgálnak, és hogyan kezelheted a beállításokat.",
        "keywords": "cookie tájékoztató, süti, adatkezelés, GovLetter",
    },
    "legalTerms": {
        "title": "Általános szerződési feltételek (ÁSZF) | GovLetter",
        "description": "Az GovLetter használatának feltételei, szolgáltatás, díjazás, felelősség, felmondás. Tájékozódás regisztráció előtt.",
        "keywords": "ÁSZF, felhasználási feltételek, govletter.hu",
    },
    "legalDpa": {
        "title": "Adatfeldolgozási megállapodás (DPA) | GovLetter",
        "description": "B2B jellegű adatfeldolgozás keretrendszere: szerepkörök, utasítások, alfeldolgozók, TOM. Tájékozódás és szerződéses háttér.",
        "keywords": "DPA, adatfeldolgozás, GDPR, GovLetter",
    },
    "legalImprint": {
        "title": "Impresszum és elérhetőségek | GovLetter",
        "description": "Hivatalos elérhetőségek, szolgáltatói adatok, kapcsolattartási cím az govletter.hu szolgáltatáshoz.",
        "keywords": "impresszum, szolgáltatói adatok, GovLetter",
    },
    "legalSecurity": {
        "title": "Biztonság | GovLetter",
        "description": "Dokumentum- és fiók-adatok védelme: hozzáférés, környezet, gyakorlati ajánlások. Tájékozódás a felhő- és fiókbiztonságról.",
        "keywords": "informatikai biztonság, adatvédelem, GovLetter",
    },
}

EN_SEO = {
    "home": {
        "title": "GovLetter – understand agency letters & invoices | AI for SMBs",
        "description": "Plain-language summaries, next steps, and deadlines from PDFs and scans. Free trial, then per-document or monthly plans. Invoice OCR and bookkeeping-friendly export.",
        "keywords": "IRS letter, tax notice, agency letter, invoice OCR, SMB admin AI, GovLetter",
        "websiteDescription": "Plain-language breakdowns of official letters and deadlines. Invoice OCR and export for small businesses.",
    },
    "pricing": {
        "title": "GovLetter pricing – documents, monthly plans, bookkeeping add-on",
        "description": "Per-document and monthly bundles with a free trial and Stripe checkout. Built for official letters, invoice OCR, and bookkeeping workflows.",
        "keywords": "GovLetter pricing, document AI, monthly plan, invoice OCR, Stripe",
    },
    "arak": {
        "title": "GovLetter pricing (2026) – trial, documents, monthly, invoices",
        "description": "Compare plans for AI breakdowns of official letters, invoice OCR, and archive. Built for busy SMB teams.",
        "keywords": "GovLetter pricing, SMB, invoice OCR, subscription",
    },
    "upload": {
        "title": "Upload a document | GovLetter",
        "description": "Upload a PDF or photo for AI analysis: deadlines, amounts, and export for your accountant.",
        "keywords": "upload PDF, document AI, GovLetter",
    },
    "auth": {
        "title": "Sign in or create account | GovLetter",
        "description": "Access document and invoice workflows: Google or email sign-in.",
        "keywords": "GovLetter login, sign up",
    },
    "authBootstrap": {
        "title": "Signing in | GovLetter",
        "description": "Complete sign-in with Google or email.",
        "keywords": "",
    },
    "authCallback": {
        "title": "Completing sign-in | GovLetter",
        "description": "OAuth redirect endpoint (not indexed).",
        "keywords": "",
    },
    "notFound": {
        "title": "404 – page not found | GovLetter",
        "description": "This page does not exist. Return home for document analysis and invoice tools.",
        "keywords": "",
    },
    "help": {
        "title": "Help & FAQ | GovLetter",
        "description": "How upload, analysis, archive, invoices, and export work — troubleshooting and tips.",
        "keywords": "GovLetter help, upload, invoice module, FAQ",
    },
    "gyik": {
        "title": "FAQ: tax letters, invoice OCR, privacy | GovLetter",
        "description": "Deadlines, OCR, exports, and security — common questions about GovLetter.",
        "keywords": "FAQ, invoice OCR, tax letter, GovLetter",
    },
    "blog": {
        "title": "GovLetter blog – tax letters, invoices, SMB operations",
        "description": "Practical guides for interpreting notices and streamlining invoice workflows.",
        "keywords": "tax blog, invoice OCR, SMB, GovLetter",
    },
    "comparisonChatgpt": {
        "title": "GovLetter vs ChatGPT for official documents",
        "description": "Why a purpose-built workflow beats a general chatbot for deadlines, structured extraction, and archives.",
        "keywords": "GovLetter vs ChatGPT, document AI",
    },
    "comparisonBillingo": {
        "title": "GovLetter vs Billingo – incoming documents",
        "description": "Billingo focuses on outbound invoicing; GovLetter focuses on understanding letters you receive.",
        "keywords": "Billingo, incoming mail, GovLetter",
    },
    "comparisonSzamlazz": {
        "title": "GovLetter vs Számlázz.hu – different jobs",
        "description": "Invoicing platforms vs document interpretation — what each is best at.",
        "keywords": "Számlázz, document AI, GovLetter",
    },
    "useCaseNav": {
        "title": "Understand tax authority letters (SMB) | GovLetter",
        "description": "Turn complex notices into clear next steps and calendar-ready deadlines.",
        "keywords": "tax notice, authority letter, SMB",
    },
    "useCaseOcr": {
        "title": "Invoice OCR for SMBs | GovLetter",
        "description": "Capture invoice fields from scans and photos and export to spreadsheets.",
        "keywords": "invoice OCR, bookkeeping export",
    },
    "useCaseArchive": {
        "title": "Document archive for SMBs | GovLetter",
        "description": "Searchable archive with AI summaries for operational and compliance paperwork.",
        "keywords": "document archive, SMB",
    },
    "legalPrivacy": {
        "title": "Privacy policy | GovLetter",
        "description": "How we process personal data: purposes, retention, and your rights.",
        "keywords": "privacy, GDPR, GovLetter",
    },
    "legalCookies": {
        "title": "Cookie notice | GovLetter",
        "description": "Cookies used by the web app and how to control them.",
        "keywords": "cookies, GovLetter",
    },
    "legalTerms": {
        "title": "Terms of service | GovLetter",
        "description": "Terms covering access, billing, liability, and termination.",
        "keywords": "terms, GovLetter",
    },
    "legalDpa": {
        "title": "Data processing agreement (DPA) | GovLetter",
        "description": "B2B processing roles, instructions, and subprocessors (template-level overview).",
        "keywords": "DPA, processing agreement",
    },
    "legalImprint": {
        "title": "Imprint & contact | GovLetter",
        "description": "Provider details and contact channels.",
        "keywords": "imprint, contact",
    },
    "legalSecurity": {
        "title": "Security overview | GovLetter",
        "description": "How we protect documents and accounts at a high level.",
        "keywords": "security, GovLetter",
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
