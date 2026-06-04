import { useEffect } from "react";

export function LangSync() {
  useEffect(() => {
    document.documentElement.lang = "en";
  }, []);
  return null;
}
