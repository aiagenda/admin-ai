export default function SecurityPage() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold">Biztonsag</h1>
        <p className="text-muted-foreground">
          Ez a rovid osszefoglalo segit transzparensen kommunikalni a vedelmi gyakorlatokat.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">1. Infrastruktura</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Titkositott adatkapcsolat (HTTPS/TLS)</li>
            <li>Role-based access es minimum jogosultsag elve</li>
            <li>Naplozas es audit nyomvonal kritikus muveleteknel</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">2. Adatvedelmi intezkedesek</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Adatminimalizalas es celhoz kotott kezeles</li>
            <li>Megorzesi idok alkalmazasa es torlesi folyamatok</li>
            <li>Subprocessor ellenorzes es szerzodeses garanciak</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">3. Incidenskezeles</h2>
          <p>
            Biztonsagi esemeny eseten belso folyamat indul: eszleles, izolalas, hataselemzes, dokumentalas,
            szukseg eseten bejelentes es erintes.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">4. Felelos bejelentes</h2>
          <p>
            Sebezhetoseg bejelentes: [security email].
            Kerdjuk, ne tegyel nyilvanossa nem javitott hibakat.
          </p>
        </section>

        <p className="text-sm text-muted-foreground">Utolso frissites: [datum]</p>
      </div>
    </div>
  );
}
