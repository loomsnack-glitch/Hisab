import { useDebugValue, useEffect, useMemo, useRef, useSyncExternalStore } from "react";

const objectIs = Object.is;

type SelectionInst<Selection> = {
    hasValue: boolean;
    value: Selection | null;
};

export function useSyncExternalStoreWithSelector<Snapshot, Selection>(
    subscribe: (onStoreChange: () => void) => () => void,
    getSnapshot: () => Snapshot,
    getServerSnapshot: (() => Snapshot) | undefined,
    selector: (snapshot: Snapshot) => Selection,
    isEqual?: (a: Selection, b: Selection) => boolean,
): Selection {
    const selectionRef = useRef<SelectionInst<Selection> | null>(null);
    if (selectionRef.current === null) {
        selectionRef.current = { hasValue: false, value: null };
    }
    const selectionInst = selectionRef.current;

    const [getSelection, getServerSelection] = useMemo(() => {
        let hasMemo = false;
        let memoizedSnapshot: Snapshot;
        let memoizedSelection: Selection;

        const memoizedSelector = (nextSnapshot: Snapshot): Selection => {
            if (!hasMemo) {
                hasMemo = true;
                memoizedSnapshot = nextSnapshot;
                const nextSelection = selector(nextSnapshot);

                if (isEqual !== undefined && selectionInst.hasValue) {
                    const currentSelection = selectionInst.value as Selection;
                    if (isEqual(currentSelection, nextSelection)) {
                        memoizedSelection = currentSelection;
                        return memoizedSelection;
                    }
                }

                memoizedSelection = nextSelection;
                return memoizedSelection;
            }

            const currentSelection = memoizedSelection;
            if (objectIs(memoizedSnapshot, nextSnapshot)) {
                return currentSelection;
            }

            const nextSelection = selector(nextSnapshot);
            if (isEqual !== undefined && isEqual(currentSelection, nextSelection)) {
                memoizedSnapshot = nextSnapshot;
                return currentSelection;
            }

            memoizedSnapshot = nextSnapshot;
            memoizedSelection = nextSelection;
            return memoizedSelection;
        };

        return [
            () => memoizedSelector(getSnapshot()),
            getServerSnapshot === undefined ? undefined : () => memoizedSelector(getServerSnapshot()),
        ] as const;
    }, [getSnapshot, getServerSnapshot, selector, isEqual, selectionInst]);

    const value = useSyncExternalStore(subscribe, getSelection, getServerSelection);

    useEffect(() => {
        selectionInst.hasValue = true;
        selectionInst.value = value;
    }, [selectionInst, value]);

    useDebugValue(value);
    return value;
}
