import { mock } from "bun:test";
import { Window } from "happy-dom";

mock.module("@repo/assets/logo.png", () => ({ default: "logo.png" }));

const testWindow = new Window({ url: "http://localhost" });
const requestAnimationFrame = (callback: FrameRequestCallback) =>
    Number(setTimeout(() => callback(Date.now()), 16));
const cancelAnimationFrame = (id: number) => clearTimeout(id);

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
    requestAnimationFrame,
    cancelAnimationFrame,
});
