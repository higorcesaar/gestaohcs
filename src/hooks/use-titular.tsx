import { createContext, useContext, useEffect, useState } from "react";

type Titular = "all" | "Higor" | "Mirelly";
const TitularCtx = createContext<{ titular: Titular; setTitular: (t: Titular) => void }>({
  titular: "all",
  setTitular: () => {},
});

const KEY = "cesar.titular";

export function TitularProvider({ children }: { children: React.ReactNode }) {
  const [titular, setTitularState] = useState<Titular>("all");
  useEffect(() => {
    const v = (typeof window !== "undefined" ? localStorage.getItem(KEY) : null) as Titular | null;
    if (v === "Higor" || v === "Mirelly" || v === "all") setTitularState(v);
  }, []);
  const setTitular = (t: Titular) => {
    setTitularState(t);
    if (typeof window !== "undefined") localStorage.setItem(KEY, t);
  };
  return <TitularCtx.Provider value={{ titular, setTitular }}>{children}</TitularCtx.Provider>;
}

export function useTitular() {
  return useContext(TitularCtx);
}

/** Apply titular filter to a Supabase query builder (PostgrestFilterBuilder) */
export function applyTitular<T extends { eq: (col: string, v: unknown) => T }>(q: T, titular: Titular): T {
  return titular === "all" ? q : q.eq("titular", titular);
}
