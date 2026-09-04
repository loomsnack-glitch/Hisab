import { create } from "zustand";
import {
    initialPosSession,
    transitionPosSession,
    type PosSessionEvent,
    type PosSessionSnapshot,
} from "../lib/pos-session";

type PosSessionStore = PosSessionSnapshot & {
    dispatch: (event: PosSessionEvent) => void;
};

const usePosSessionStore = create<PosSessionStore>()((set) => ({
    ...initialPosSession,
    dispatch: (event) => set((snapshot) => transitionPosSession(snapshot, event)),
}));

export const usePosSessionSnapshot = () => usePosSessionStore((state) => state);
export const usePosSessionDispatch = () => usePosSessionStore((state) => state.dispatch);
