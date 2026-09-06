import { POS_PREFERENCE_KEYS, posStorage } from "./storage";
import { parsePosPrinterSelection, serializePosPrinterSelection, type PosPrinterSelection } from "./pos-printer-boundary";

export const getPosPrinterSelection = () => parsePosPrinterSelection(posStorage.getPreference(POS_PREFERENCE_KEYS.printer));

export const setPosPrinterSelection = (selection: PosPrinterSelection) => {
    posStorage.setPreference(POS_PREFERENCE_KEYS.printer, serializePosPrinterSelection(selection));
};
