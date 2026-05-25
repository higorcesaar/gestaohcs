import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type PageHeaderData = {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
};

const PageHeaderCtx = createContext<{
  header: PageHeaderData;
  setHeader: (h: PageHeaderData) => void;
}>({ header: {}, setHeader: () => {} });

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<PageHeaderData>({});
  return (
    <PageHeaderCtx.Provider value={{ header, setHeader }}>
      {children}
    </PageHeaderCtx.Provider>
  );
}

export function usePageHeader() {
  return useContext(PageHeaderCtx).header;
}

/**
 * Set the current page header. Pass deps for values that change.
 * Re-runs whenever deps change; resets on unmount.
 */
export function useSetPageHeader(builder: () => PageHeaderData, deps: ReadonlyArray<unknown>) {
  const { setHeader } = useContext(PageHeaderCtx);
  useEffect(() => {
    setHeader(builder());
    return () => setHeader({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
