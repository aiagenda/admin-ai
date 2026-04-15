import { Link } from "react-router-dom";

type LegalQuickLinksProps = {
  className?: string;
};

export function LegalQuickLinks({ className }: LegalQuickLinksProps) {
  return (
    <div className={className}>
      <p className="text-sm font-medium">Jogi es adatvedelmi dokumentumok</p>
      <div className="mt-2 flex flex-wrap gap-2 text-sm">
        <Link className="underline text-primary" to="/legal/privacy">
          Adatkezelesi tajekoztato
        </Link>
        <Link className="underline text-primary" to="/legal/cookies">
          Cookie tajekoztato
        </Link>
        <Link className="underline text-primary" to="/legal/terms">
          ASZF
        </Link>
        <Link className="underline text-primary" to="/legal/dpa">
          DPA
        </Link>
        <Link className="underline text-primary" to="/legal/imprint">
          Impresszum
        </Link>
        <Link className="underline text-primary" to="/legal/security">
          Biztonsag
        </Link>
      </div>
    </div>
  );
}
