export default function Imprint() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold">Impresszum / Szolgaltatoi adatok</h1>
        <p className="text-muted-foreground">
          Toltse ki valos cegadatokkal. Nyilvanos weboldalon ennek egyertelmunek kell lennie.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Szolgaltato</h2>
          <p>
            Cegnev: [Cegnev]
            <br />
            Szekhely: [Cim]
            <br />
            Levelezesi cim: [Cim]
            <br />
            Cegjegyzekszam: [szam]
            <br />
            Adoszam: [szam]
            <br />
            EU VAT: [szam]
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Kapcsolat</h2>
          <p>
            Email: [email]
            <br />
            Telefonszam: [telefonszam]
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Targhelyszolgaltato</h2>
          <p>
            Nev: [provider]
            <br />
            Cim: [provider cim]
            <br />
            Kontakt: [provider kontakt]
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Fogyasztovedelmi tajekoztatas</h2>
          <p>
            Panaszkezeles modja: [rovid leiras]. Bekelteto testulet: [megnevezes/link].
          </p>
        </section>

        <p className="text-sm text-muted-foreground">Utolso frissites: [datum]</p>
      </div>
    </div>
  );
}
