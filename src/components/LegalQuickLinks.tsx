import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

type LegalQuickLinksProps = { className?: string };

export function LegalQuickLinks({ className }: LegalQuickLinksProps) {
  const { t } = useTranslation("common");
  const p = "legalLinks";
  return (
    <div className={className}>
      <p className="text-sm font-medium">{t(`${p}.title`)}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-sm">
        <Link className="underline text-primary" to="/legal/privacy">{t(`${p}.privacy`)}</Link>
        <Link className="underline text-primary" to="/legal/cookies">{t(`${p}.cookies`)}</Link>
        <Link className="underline text-primary" to="/legal/terms">{t(`${p}.terms`)}</Link>
        <Link className="underline text-primary" to="/legal/dpa">{t(`${p}.dpa`)}</Link>
        <Link className="underline text-primary" to="/legal/imprint">{t(`${p}.imprint`)}</Link>
        <Link className="underline text-primary" to="/legal/security">{t(`${p}.security`)}</Link>
      </div>
    </div>
  );
}
