import { createContext, useContext, useState, type ReactNode } from "react";

type TutorialContextType = {
  openTutorial: boolean;
  setOpenTutorial: (open: boolean) => void;
};

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [openTutorial, setOpenTutorial] = useState(false);
  return (
    <TutorialContext.Provider value={{ openTutorial, setOpenTutorial }}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (ctx === undefined) throw new Error("useTutorial must be used within TutorialProvider");
  return ctx;
}
