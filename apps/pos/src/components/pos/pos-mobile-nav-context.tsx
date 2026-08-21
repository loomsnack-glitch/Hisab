import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type PosMobileNavContextValue = {
    billsCount: number;
    setBillsCount: (count: number) => void;
};

const PosMobileNavContext = createContext<PosMobileNavContextValue | null>(null);

export const PosMobileNavProvider = ({ children }: { children: ReactNode }) => {
    const [billsCount, setBillsCount] = useState(0);
    const value = useMemo(() => ({ billsCount, setBillsCount }), [billsCount]);

    return <PosMobileNavContext.Provider value={value}>{children}</PosMobileNavContext.Provider>;
};

export const usePosMobileNav = () => {
    const context = useContext(PosMobileNavContext);
    return context ?? { billsCount: 0, setBillsCount: () => {} };
};
