import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSEO } from "@/components/PageSEO";
import { useNavigate, Link } from "react-router-dom";

export default function UseCaseNavPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen py-12 px-4">
      <PageSEO pageKey="useCaseNav" path="/nav-hatarozat-ertelmezes" />
      <div className="container mx-auto max-w-4xl space-y-8">
        <header className="space-y-3">
          <h1 className="text-4xl font-bold">NAV határozat értelmezése AI-val, magyarul</h1>
          <p className="text-lg text-muted-foreground">
            Ha NAV határozatot, felszólítást vagy adóhivatali levelet kaptál, az első kérdés mindig ugyanaz: mit jelent ez pontosan, és mit kell most tenni?
            Az GovLetter erre ad gyors, közérthető választ.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Mikor hasznos az GovLetter NAV leveleknél?</h2>
          <p>
            A legtöbb vállalkozó és magánszemély nem jogász, mégis rendszeresen találkozik olyan dokumentumokkal, amelyekben rövid határidők,
            jogkövetkezmények és bonyolult kifejezések vannak. Az GovLetter célja, hogy a hivatalos nyelvet hétköznapi magyarra fordítsa.
            A rendszer külön jelöli a sürgős teendőket, és kiemeli a határidőket, hogy ne csússz ki a válaszadási időből.
          </p>
          <p>
            A gyakorlatban ez azt jelenti, hogy a NAV határozat értelmezés nem csak egy általános összefoglaló: kapsz egy rövid,
            érthető változatot és egy részletes, jogi szemléletű kivonatot is. Így eldöntheted, hogy önállóan lépsz tovább,
            vagy könyvelő/jogi szakértő bevonására van szükség.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Hogyan működik a NAV határozat elemzése?</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">1. Feltöltés</CardTitle></CardHeader>
              <CardContent>PDF-et vagy fotót töltesz fel az adóhivatali levélről.</CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">2. AI értelmezés</CardTitle></CardHeader>
              <CardContent>Az AI kiemeli, miről szól a dokumentum és mik a konkrét teendők.</CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">3. Teendőlista</CardTitle></CardHeader>
              <CardContent>Határidőkkel és prioritásokkal kapsz lépésről lépésre listát.</CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Milyen dokumentumtípusoknál működik jól?</h2>
          <p>
            Tipikusan NAV hiánypótlási felszólítás, adófolyószámla értesítés, bírságértesítés, fizetési felszólítás,
            valamint más hatósági levelek esetén ad gyors értelmezést. A rendszer nem helyettesít hivatalos jogi tanácsadást,
            de jelentősen lerövidíti azt az időt, amíg megérted a dokumentum lényegét.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Kezdd el most</h2>
          <p>
            Próbáld ki ingyenesen, és nézd meg, hogyan segít az GovLetter egy NAV határozat vagy adóhivatal levél gyors értelmezésében.
            Ha rendszeresen kapsz hivatalos dokumentumokat, érdemes megnézni a <Link className="text-primary underline" to="/dokumentum-archivum">dokumentum archívum</Link> és
            a <Link className="text-primary underline" to="/szamla-ocr">számla OCR</Link> funkciókat is.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => navigate("/auth")}>Ingyenes kipróbálás</Button>
            <Button variant="outline" onClick={() => navigate("/arak")}>Árak</Button>
          </div>
        </section>
      </div>
    </div>
  );
}
