export default function TermsOfService() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold">Altalanos Szerzodesi Feltetelek (ASZF)</h1>
        <p className="text-muted-foreground">
          Ez sablon, amelynek jogi veglegesitese ugyvedi felulvizsgalattal tortenjen.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">1. Szolgaltatas targya</h2>
          <p>
            A platform AI alapu dokumentum- es szamlafeldolgozast, archivumot es kapcsolodo funkciokat nyujt.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">2. Fiok es jogosultsag</h2>
          <p>
            A felhasznalo felel a fiok adatai vedelmeert. A szolgaltato visszaelesszeru hasznalat eseten korlatozhatja
            a fiokot.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">3. Dijazas es szamlazas</h2>
          <p>
            Az elofizetesi dijak a pricing oldalon szerepelnek. A szamlazas periodikusan tortenik, az automatikus
            megujulast es lemondasi felteteleket egyertelmuen jelezni kell.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">4. Felelosseg es korlatozas</h2>
          <p>
            A szolgaltatas "as is" alapon mukodik. Az AI outputot a felhasznalo koteles szakmailag ellenorizni.
            Jogszabalyban nem zarhato felelosseg nem korlatozhato.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">5. Szerzodes megszunese</h2>
          <p>
            A felhasznalo barmikor lemondhatja az elofizetest. A mar teljesitett idoszak dijai nem visszaterithetok,
            kiveve ha a jogszabaly maskepp rendelkezik.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">6. Iranyado jog es vitarendezes</h2>
          <p>
            Magyar jog alkalmazando. Fogyasztoi jogvita eseten bekelteto testuleti vagy birosagi ut nyitott.
          </p>
        </section>

        <p className="text-sm text-muted-foreground">Utolso frissites: [datum]</p>
      </div>
    </div>
  );
}
