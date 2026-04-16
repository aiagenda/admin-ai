import { Link } from "react-router-dom";

type LegalQuickLinksProps = {
  className?: string;
};

export function LegalQuickLinks({ className }: LegalQuickLinksProps) {
  return (
    <div className={className}>
      <p className="text-sm font-medium">Jogi és adatvédelmi dokumentumok</p>
      <div className="mt-2 flex flex-wrap gap-2 text-sm">
        <Link className="underline text-primary" to="/legal/privacy">
          Adatkezelési tájékoztató
        </Link>
        <Link className="underline text-primary" to="/legal/cookies">
          Cookie tájékoztató
        </Link>
        <Link className="underline text-primary" to="/legal/terms">
          ÁSZF
        </Link>
        <Link className="underline text-primary" to="/legal/dpa">
          DPA
        </Link>
        <Link className="underline text-primary" to="/legal/imprint">
          Impresszum
        </Link>
        <Link className="underline text-primary" to="/legal/security">
          Biztonság
        </Link>
      </div>
    </div>
  );
}
