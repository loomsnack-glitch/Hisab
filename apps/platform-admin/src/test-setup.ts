import { Window } from "happy-dom";

const testWindow = new Window({ url: "http://localhost" });
Object.assign(globalThis, {
    Element: testWindow.Element,
    Event: testWindow.Event,
    document: testWindow.document,
    HTMLElement: testWindow.HTMLElement,
    HTMLInputElement: testWindow.HTMLInputElement,
    Node: testWindow.Node,
    MutationObserver: testWindow.MutationObserver,
    ResizeObserver: testWindow.ResizeObserver,
    navigator: testWindow.navigator,
    window: testWindow,
});
