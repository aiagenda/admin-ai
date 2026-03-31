import { SEOHead } from "@/components/SEOHead";
import Pricing from "./Pricing";

export default function ArakPage() {
  return (
    <>
      <SEOHead
        title="AdminAI árak és előfizetések | AI dokumentum értelmezés"
        description="AdminAI árak: hasonlítsd össze az ingyenes, alap és professzionális csomagokat. AI dokumentum értelmezés, számla OCR és archívum egy helyen."
        path="/arak"
        keywords="AdminAI ár, dokumentum AI előfizetés, számla OCR ár, NAV dokumentum értelmezés ár"
      />
      <Pricing />
    </>
  );
}
