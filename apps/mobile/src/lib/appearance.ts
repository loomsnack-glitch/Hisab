import { Uniwind } from "uniwind";
import { POS_PREFERENCE_KEYS, posStorage } from "./storage";
import { resolvePosDisplaySize, resolvePosTheme, type PosDisplaySize, type PosTheme } from "./pos-appearance-boundary";

Uniwind.setTheme(resolvePosTheme(posStorage.getPreference(POS_PREFERENCE_KEYS.theme)));

export const getPosTheme = (): PosTheme => resolvePosTheme(posStorage.getPreference(POS_PREFERENCE_KEYS.theme));
export const setPosTheme = (theme: PosTheme) => {
    posStorage.setPreference(POS_PREFERENCE_KEYS.theme, theme);
    Uniwind.setTheme(theme);
};
export const getPosDisplaySize = (): PosDisplaySize => resolvePosDisplaySize(posStorage.getPreference(POS_PREFERENCE_KEYS.displaySize));
export const setPosDisplaySize = (displaySize: PosDisplaySize) => {
    posStorage.setPreference(POS_PREFERENCE_KEYS.displaySize, displaySize);
};
