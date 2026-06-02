import { PageSEO } from "@/components/PageSEO";
import { LegalDocumentBody } from "@/components/LegalDocumentBody";

export default function DataProcessingAgreement() {
  return (
    <div className="min-h-screen py-8 px-4">
      <PageSEO pageKey="legalDpa" path="/legal/dpa" />
      <div className="container mx-auto max-w-4xl space-y-6">
        <LegalDocumentBody page="dpa" />
      </div>
    </div>
  );
}
