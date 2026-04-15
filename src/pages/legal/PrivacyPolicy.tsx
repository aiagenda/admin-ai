export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold">Adatkezelesi tajekoztato</h1>
        <p className="text-muted-foreground">
          Ez a minta tajekoztato sablonjellegu, indulasi alap. Elesites elott jogi felulvizsgalat szukseges.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">1. Adatkezelo adatai</h2>
          <p>
            Adatkezelo: [Cegnev]
            <br />
            Szekhely: [Cim]
            <br />
            Kapcsolat: [email], [telefonszam]
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">2. Kezelt adatok kore</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Regisztracios adatok (nev, email, fiokazonositok)</li>
            <li>Feltoltott dokumentumok es a bennuk szereplo adatok</li>
            <li>Szamlazasi adatok, elofizetesi adatok</li>
            <li>Technikai naplok, biztonsagi es audit adatok</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">3. Adatkezeles celja es jogalapja</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Szolgaltatas nyujtasa es fiokkezeles (szerzodes teljesitese)</li>
            <li>Szamlazas es jogi kotelezettsegek teljesitese (jogi kotelezettseg)</li>
            <li>Biztonsag, visszaeles-megelozes (jogos erdek)</li>
            <li>Marketing kommunikacio (hozzajarulas, ahol szukseges)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">4. Adatfeldolgozok es cimzettek</h2>
          <p>
            A szolgaltatas futtatasa soran adatfeldolgozoket vehetunk igenybe (pl. felho-infrastruktura, auth, fizetes,
            naplozas). Aktualis lista: [link/oldal].
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">5. Adatmegorzes</h2>
          <p>
            Az adatokat csak a celhoz szukseges ideig kezeljuk. Reszletes megorzesi idok: [tabla vagy policy hivatkozas].
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">6. Erintetti jogok</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Hozzaferes, helyesbites, torles</li>
            <li>Kezeles korlatozasa, tiltakozas</li>
            <li>Adathordozhatosag</li>
            <li>Hozzajarulas visszavonasa</li>
            <li>Panasztetel a NAIH-nal</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">7. Panasz es jogorvoslat</h2>
          <p>
            Felugyeleti hatosag: Nemzeti Adatvedelmi es Informacioszabadsag Hatosag (NAIH)
            <br />
            Web: https://www.naih.hu/
          </p>
        </section>

        <p className="text-sm text-muted-foreground">Utolso frissites: [datum]</p>
      </div>
    </div>
  );
}
