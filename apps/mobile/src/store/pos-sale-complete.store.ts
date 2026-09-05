import { create } from "zustand";
import type { SaleDetailDTO } from "@repo/types";

type PosSaleCompleteStore = {
    sale: SaleDetailDTO | null;
    setSale: (sale: SaleDetailDTO) => void;
    clear: () => void;
};

export const usePosSaleCompleteStore = create<PosSaleCompleteStore>()((set) => ({
    sale: null,
    setSale: (sale) => set({ sale }),
    clear: () => set({ sale: null }),
}));

export const clearPosCompletedSale = () => usePosSaleCompleteStore.getState().clear();
