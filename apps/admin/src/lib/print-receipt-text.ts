type PrintReceiptTextOptions = {
    text: string;
    title: string;
};

export const printReceiptText = ({ text, title }: PrintReceiptTextOptions) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    Object.assign(frame.style, {
        position: "fixed",
        right: "0",
        bottom: "0",
        width: "0",
        height: "0",
        border: "0",
    });

    document.body.appendChild(frame);

    const frameDocument = frame.contentDocument;
    const frameWindow = frame.contentWindow;
    if (!frameDocument || !frameWindow) {
        frame.remove();
        return false;
    }

    frameDocument.title = title;
    const style = frameDocument.createElement("style");
    style.textContent = `
        @page { margin: 8mm; size: auto; }
        html, body {
            margin: 0;
            padding: 0;
            background: #fff;
            color: #000;
        }
        pre {
            margin: 0;
            color: #000;
            background: #fff;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 11px;
            line-height: 1.35;
            white-space: pre;
        }
    `;
    frameDocument.head.appendChild(style);

    const receipt = frameDocument.createElement("pre");
    receipt.textContent = text;
    frameDocument.body.appendChild(receipt);
    frameDocument.close();

    let printed = false;
    const print = () => {
        if (printed) return;

        printed = true;
        frameWindow.focus();
        frameWindow.print();
        window.setTimeout(() => frame.remove(), 1000);
    };

    window.setTimeout(print, 100);
    return true;
};
