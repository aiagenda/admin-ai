import { PageSEO } from "@/components/PageSEO";
import { LegalDocumentBody } from "@/components/LegalDocumentBody";

export default function SecurityPage() {
  return (
    <div className="min-h-screen py-8 px-4">
      <PageSEO pageKey="legalSecurity" path="/legal/security" />
      <div className="container mx-auto max-w-4xl space-y-6">
        <LegalDocumentBody page="security" />
      </div>
    </div>
  );
}
