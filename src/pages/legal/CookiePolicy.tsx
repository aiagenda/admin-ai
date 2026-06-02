import { PageSEO } from "@/components/PageSEO";
import { LegalDocumentBody } from "@/components/LegalDocumentBody";

export default function CookiePolicy() {
  return (
    <div className="min-h-screen py-8 px-4">
      <PageSEO pageKey="legalCookies" path="/legal/cookies" />
      <div className="container mx-auto max-w-4xl space-y-6">
        <LegalDocumentBody page="cookies" />
      </div>
    </div>
  );
}
