export default function DataProcessingAgreement() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold">Adatfeldolgozasi megallapodas (DPA)</h1>
        <p className="text-muted-foreground">
          Ez mintaszoveg, B2B hasznalathoz jogi szemelyre szabott veglegesites szukseges.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">1. Felek es szerepkorok</h2>
          <p>
            Ugyfel: adatkezelo. Szolgaltato: adatfeldolgozo. A szolgaltato az ugyfel utasitasa alapjan kezel adatot.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">2. Kezeles targya es idotartama</h2>
          <p>
            A kezeles targya a szolgaltatas nyujtasa soran feltoltott es keletkezo szemelyes adatok kezelese.
            Az idotartam az alapul szolgalo szolgaltatasi szerzodes idotartama.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">3. Adattipusok es erintettek</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Adattipusok: dokumentumtartalom, fiokadatok, naploadatok</li>
            <li>Erintettek: ugyfel vegfelhasznaloi, dokumentumokban szereplo szemelyek</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">4. Adatfeldolgozo kotelezettsegei</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Titoktartas es megfelelo jogosultsagkezeles</li>
            <li>Technikai es szervezeti vedelmi intezkedesek</li>
            <li>Subprocessor bevonas csak megfelelo feltetelekkel</li>
            <li>Adatvedelmi incidens bejelentese kesedelem nelkul</li>
            <li>Egyuttmukodes erintetti kerelmek es auditok eseten</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">5. Subprocessor lista</h2>
          <p>
            Aktualis subprocessor lista es valtozasertesites modja: [link].
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">6. Adattorles es visszaadas</h2>
          <p>
            A szerzodes megszunesekor az adatok visszaadasa vagy torlese az ugyfel utasitasa szerint tortenik,
            jogszabalyi kotelezettseg figyelembevetelevel.
          </p>
        </section>

        <p className="text-sm text-muted-foreground">Utolso frissites: [datum]</p>
      </div>
    </div>
  );
}
