import { PageSEO } from "@/components/PageSEO";
import { LegalDocumentBody } from "@/components/LegalDocumentBody";

export default function TermsOfService() {
  return (
    <div className="min-h-screen py-8 px-4">
      <PageSEO pageKey="legalTerms" path="/legal/terms" />
      <div className="container mx-auto max-w-4xl space-y-6">
        <LegalDocumentBody page="terms" />
      </div>
    </div>
  );
}
