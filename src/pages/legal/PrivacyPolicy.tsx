import { PageSEO } from "@/components/PageSEO";
import { LegalDocumentBody } from "@/components/LegalDocumentBody";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen py-8 px-4">
      <PageSEO pageKey="legalPrivacy" path="/legal/privacy" />
      <div className="container mx-auto max-w-4xl space-y-6">
        <LegalDocumentBody page="privacy" />
      </div>
    </div>
  );
}
