import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Loader, RotateCw, Minus, Plus } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { useEffect, useRef, useState } from "react";
import { Separator } from "@repo/ui/components/separator";
import { useResizeDetector } from "react-resize-detector";
import { toast } from "sonner";
import { cn } from "@repo/ui/lib/utils";
import { Input } from "@repo/ui/components/input";
import PDFFullscreenRenderer from "./pdf-fullscreen-renderer";

// Use CDN for PDF.js worker to avoid bundling issues with Next.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFRendererProps {
    url: string;
    showToolbar?: boolean;
    showPageCountBadge?: boolean;
    pageCountBadgeClassName?: string;
    pageClassName?: string;
}

const PDFRenderer = ({ url, showToolbar = true, showPageCountBadge = false, pageCountBadgeClassName, pageClassName }: PDFRendererProps) => {
    const [numPages, setNumPages] = useState<number>();
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [customPageNumber, setCustomPageNumber] = useState<number>(1);
    const [scale, setScale] = useState<number>(1);
    const [rotation, setRotation] = useState<number>(0);
    const [renderedScale, setRenderedScale] = useState<number | null>(null);
    const { width } = useResizeDetector();
    const pageRefs = useRef(new Map());

    const isLoading = renderedScale !== scale;

    useEffect(() => {
        setCustomPageNumber(currentPage);
    }, [currentPage]);

    const handlePageSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const page = Number(customPageNumber);
            if (page && numPages && page >= 1 && page <= numPages) {
                const pageElement = pageRefs.current.get(page);
                if (pageElement) {
                    pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            } else {
                setCustomPageNumber(currentPage); // Reset if invalid
            }
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget;
        if (!container) return;

        const pageElements = container.querySelectorAll('[data-page-number]');
        const containerRect = container.getBoundingClientRect();

        for (const page of pageElements) {
            const rect = page.getBoundingClientRect();
            if (rect.bottom > containerRect.top + 50) {
                const pageNum = Number(page.getAttribute("data-page-number"));
                if (!isNaN(pageNum)) {
                    setCurrentPage(pageNum);
                }
                break;
            }
        }
    };

    return (
        <div className="w-full rounded-md shadow flex flex-col items-center h-full">
            {showToolbar && <div className="py-1 bg-muted/50 w-full border-b flex items-center justify-center px-2 gap-2">
                <div className="flex items-center gap-1">
                    <Button
                        onClick={() => setScale((prev) => Math.max(0.5, prev - 0.25))}
                        variant="ghost"
                        aria-label="zoom out"
                        size="icon"
                        className="hover:bg-primary/10 rounded-full"
                    >
                        <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-sm w-12 text-center">
                        {Math.round(scale * 100)}%
                    </span>
                    <Button
                        onClick={() => setScale((prev) => Math.min(2.5, prev + 0.25))}
                        variant="ghost"
                        aria-label="zoom in"
                        size="icon"
                        className="hover:bg-primary/10 rounded-full"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-1.5 mx-2 text-sm text-muted-foreground">
                    <Input
                        className="w-12 h-8 text-center px-1 py-0"
                        value={customPageNumber}
                        onChange={(e) => setCustomPageNumber(Number(e.target.value))}
                        onKeyDown={handlePageSubmit}
                        type="number"
                    />
                    <span>/</span>
                    <span>{numPages || "-"}</span>
                </div>

                <Separator orientation="vertical" className="data-[orientation=vertical]:h-6" />

                <Button
                    onClick={() => setRotation((prev) => prev + 90)}
                    variant="ghost"
                    aria-label="rotate 90 degrees"
                    size="icon"
                    className="hover:bg-primary/10 rounded-full"
                >
                    <RotateCw className="h-4 w-4" />
                </Button>
                <PDFFullscreenRenderer url={url} />
            </div>}

            <div className="flex-1 w-full max-h-screen">
                <div className={cn("max-h-[85dvh] overflow-y-auto p-1", pageClassName)} onScroll={handleScroll}>
                    <Document
                        key={url}
                        loading={
                            <div className="flex justify-center h-full overflow-y-auto">
                                <Loader className="my-24 h-6 w-6 animate-spin" />
                            </div>
                        }
                        onLoadError={() =>
                            toast.error('Error loading PDF')
                        }
                        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                        file={url}
                    >
                        {isLoading && renderedScale ? (
                            <Page
                                width={width}
                                pageNumber={1}
                                scale={scale}
                                rotate={rotation}
                                key={"@" + renderedScale + "_rendered"}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                            />
                        ) : null}
                        {Array.from({ length: numPages || 0 }).map((_, i) => (
                            <div
                                key={`page_${i + 1}`}
                                data-page-number={i + 1}
                                ref={(el: HTMLDivElement | null) => {
                                    if (el) pageRefs.current.set(i + 1, el);
                                    else pageRefs.current.delete(i + 1);
                                }}
                                className={cn(isLoading ? "hidden" : "")}
                            >
                                <Page
                                    width={width}
                                    pageNumber={i + 1}
                                    scale={scale}
                                    rotate={rotation}
                                    loading={
                                        <div className="flex justify-center">
                                            <Loader className="my-24 h-6 w-6 animate-spin" />
                                        </div>
                                    }
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                    onRenderSuccess={() => setRenderedScale(scale)}
                                />
                            </div>
                        ))}
                        {(showPageCountBadge) && <div className="inset-x-0 flex items-center justify-center">
                            <div className={cn("absolute bottom-10 bg-muted/50 rounded-full px-2 py-0.5", pageCountBadgeClassName)}>
                                Total Pages : {numPages || 0}
                            </div>
                        </div>}
                    </Document>
                </div>
            </div>
        </div>
    )
}

export default PDFRenderer