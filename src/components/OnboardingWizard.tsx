import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Upload, ChevronRight, ChevronLeft, Home, LayoutGrid, FileText, Archive, Clock, Search, Receipt, Settings, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanType } from "@/hooks/usePlanType";
import { useTutorial } from "@/contexts/TutorialContext";
import { motion, AnimatePresence } from "framer-motion";

const KEY = "onboarding_wizard_done";
function getDone(userId) { try { const d = JSON.parse(localStorage.getItem(KEY) || "{}"); return d[userId] === true; } catch { return false; } }
function setDone(userId) { try { const d = JSON.parse(localStorage.getItem(KEY) || "{}"); d[userId] = true; localStorage.setItem(KEY, JSON.stringify(d)); } catch { localStorage.setItem(KEY, JSON.stringify({ [userId]: true })); } }

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

export function OnboardingWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { planLabel, planType } = usePlanType(user ?? null);
  const { openTutorial, setOpenTutorial } = useTutorial();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const steps = useMemo(() => {
    const base = [
      { id: "welcome", icon: Sparkles, title: "Üdv az AdminAI-ban!", body: ["Az AdminAI segít megérteni a hivatalos dokumentumokat: feltöltöd a papírt, és emberi nyelven elmagyarázzuk, mit kaptál és mit kell tenned.", "Nem kell könyvelőre várni minden kérdésnél."] },
      { id: "plan", icon: Sparkles, title: `A te csomagod: ${planLabel}`, body: [planType === "enterprise" ? "A Professzionális csomaggal minden elérhető: korlátlan dokumentum, könyvelés modul, AI keresés." : planType === "basic" ? "Az Alap csomaggal több dokumentumot tölthetsz fel, részletes elemzés és hosszabb archívum." : "Az Ingyenes csomaggal kipróbálhatod a szolgáltatást. Több dokumentumhoz vagy könyveléshez válaszd az Alap vagy Professzionális csomagot."] },
      { id: "home", icon: Home, title: "Főoldal – áttekintés", body: ["A főoldalon láthatod: a statisztikákat, a feltöltés és archívum gyors gombjait, a közelgő határidőket, a felhasználási limitet és az AI Keresést.", "Minden egy helyen, áttekinthetően."] },
      { id: "cards", icon: LayoutGrid, title: "Kártyák sorrendje – drag & drop", body: ["A főoldal blokkjait átrendezheted. Menj a Beállításokba (Profil menü → Beállítások), majd a Kártyák sorrendje részben húzd a sorokat (drag and drop).", "Így a főoldal pont olyan sorrendben jelenik meg, ahogy neked jó – különösen mobilon hasznos."] },
      { id: "upload", icon: Upload, title: "Dokumentum feltöltés", body: ["A főoldalon az Új dokumentum feltöltése gombbal feltölthetsz PDF vagy kép alapú dokumentumot.", "Az AI elemzi a fájlt, és megkapod az összefoglalót, a teendőket és a határidőket."] },
      { id: "result", icon: FileText, title: "Elemzés eredménye", body: ["A feltöltés után az elemzés oldalon láthatod: mi a dokumentum, mit kell tenned, milyen határidők vannak.", "Az archívumból bármikor újra megnyithatod egy dokumentum elemzését."] },
      { id: "archive", icon: Archive, title: "Dokumentum archívum", body: ["A főoldalon a Dokumentum archívum gombra kattintva minden feltöltött dokumentumod és elemzésed egy helyen látható.", "Szűrhetsz, kereshetsz, és bármelyikre kattintva megnyitod az eredményt."] },
      { id: "deadlines", icon: Clock, title: "Határidők és limit", body: ["A főoldalon a Közelgő határidők blokk mutatja a közelgő esedékességeket.", "A Felhasználási limit mutatja, mennyi dokumentum marad a havi keretből."] },
      { id: "search", icon: Search, title: "AI Keresés", body: ["A főoldal alján az AI Keresés blokkban természetes nyelven kérdezhetsz a feltöltött dokumentumaidról.", "Pl. NAV levelek, fizetési határidők, adóbevallás – a rendszer a releváns elemzésekből válaszol."] },
      ...(planType === "enterprise" ? [{ id: "invoices", icon: Receipt, title: "Könyvelés modul", body: ["A menüben a Könyvelés alatt számlákat tölthetsz fel. Az OCR kiolvassa az adatokat, kategorizáljuk, és egy kattintással Excelbe exportálhatod a könyvelődnek – a képek beágyazva."] }] : []),
      { id: "settings", icon: Settings, title: "Beállítások", body: ["A Profil menüből a Beállításokban állíthatod: a könyvelő emailjét, az automatikus havi jelentést, a kártyák sorrendjét (drag & drop), és a határidő emlékeztetőket."] },
      { id: "done", icon: CheckCircle2, title: "Minden megvan", body: ["Most már ismered az AdminAI fő funkcióit. Bármikor újranézheted a segítőt: Profil menü → Segítő.", "Jó munkát!"] },
    ];
    return base;
  }, [planLabel, planType]);

  const totalSteps = steps.length;
  const isLastStep = step === totalSteps - 1;
  const current = steps[step];
  const StepIcon = current?.icon ?? Sparkles;

  useEffect(() => { if (!user) return; if (getDone(user.id)) return; setOpen(true); }, [user?.id]);
  useEffect(() => { if (openTutorial) setOpen(true); }, [openTutorial]);

  const handleClose = (markDone) => { setOpen(false); setOpenTutorial(false); if (user && markDone) setDone(user.id); };
  const handleNext = () => { if (step < totalSteps - 1) setStep((s) => s + 1); else handleClose(true); };
  const handleBack = () => { if (step > 0) setStep((s) => s - 1); };
  const handleStart = () => { handleClose(true); navigate("/upload"); };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose(false)}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 sm:rounded-xl rounded-t-2xl fixed bottom-0 sm:bottom-[50%] sm:translate-y-[50%]">
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between gap-2 mb-2">
            <DialogHeader className="p-0 flex-1">
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <motion.span key={current?.id} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 24 }} className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <StepIcon className="h-4 w-4 text-primary" />
                </motion.span>
                <AnimatePresence mode="wait">
                  <motion.span key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
                    {current?.title}
                  </motion.span>
                </AnimatePresence>
              </DialogTitle>
              <DialogDescription className="sr-only">
                Segítő: {current?.title}. Lépés {step + 1} a {totalSteps}-ból.
              </DialogDescription>
            </DialogHeader>
            <Button variant="ghost" size="sm" onClick={() => handleClose(true)} className="shrink-0 text-muted-foreground">Átugrom</Button>
          </div>
          <Progress value={((step + 1) / totalSteps) * 100} className="h-1.5" />
          <p className="text-xs text-muted-foreground mt-1.5">{step + 1} / {totalSteps}</p>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[140px]">
          <AnimatePresence mode="wait">
            <motion.div key={step} variants={container} initial="hidden" animate="show" exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-3">
              {current?.body.map((paragraph, i) => (
                <motion.p key={i} variants={item} className="text-muted-foreground text-sm sm:text-base leading-relaxed">{paragraph}</motion.p>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
        <DialogFooter className="flex-row gap-2 justify-between p-4 pt-2 border-t">
          <div>{step > 0 ? <Button variant="ghost" size="sm" onClick={handleBack}><ChevronLeft className="h-4 w-4 mr-1" />Vissza</Button> : <Button variant="ghost" size="sm" onClick={() => handleClose(false)}>Később</Button>}</div>
          <div className="flex gap-2">{isLastStep ? <Button onClick={handleStart}><Upload className="h-4 w-4 mr-2" />Feltöltés</Button> : <Button onClick={handleNext}>Tovább <ChevronRight className="h-4 w-4 ml-1" /></Button>}</div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
