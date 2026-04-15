export default function CookiePolicy() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold">Cookie tajekoztato</h1>
        <p className="text-muted-foreground">
          Ez minta dokumentum. Elesites elott jogi es technikai felulvizsgalat szukseges.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">1. Mik azok a cookie-k?</h2>
          <p>
            A cookie-k kis adatfajlok, amelyeket a bongeszo tarol. Hasonlo technologiak lehetnek localStorage, pixel,
            fingerprinting alapuk azonositasok.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">2. Cookie kategoriak</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Szukseges cookie-k: bejelentkezes, biztonsag, alapfunkciok</li>
            <li>Statisztikai cookie-k: anonim meres, teljesitmeny monitorozas</li>
            <li>Marketing cookie-k: kampanymeres, remarketing (ha hasznalt)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">3. Jogalap</h2>
          <p>
            A szukseges cookie-k jogalapja jogos erdek vagy szolgaltatas mukodesehez szukseges kezeles.
            A nem szukseges cookie-k csak hozzajarulas alapjan aktivak.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">4. Hozzajarulas kezelese</h2>
          <p>
            A hozzajarulas a cookie banneren adhato meg. Barmikor modosithato vagy visszavonhato a
            "Cookie beallitasok" feluleten.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">5. Felhasznalt szolgaltatok</h2>
          <p>
            Reszletes lista (szolgaltato, cel, tarolasi ido): [tabla/link].
          </p>
        </section>

        <p className="text-sm text-muted-foreground">Utolso frissites: [datum]</p>
      </div>
    </div>
  );
}
