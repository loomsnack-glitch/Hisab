import { Expand, Loader2 } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@repo/ui/components/dialog";
import { useState } from "react";
import { Document, Page } from "react-pdf";
import { useResizeDetector } from "react-resize-detector";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { toast } from "sonner";

const PDFFullscreenRenderer = ({ url }: { url: string }) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [numPages, setNumPages] = useState<number>();
    const { width, ref } = useResizeDetector();
    return (
        <Dialog
            open={isOpen}
            onOpenChange={(v) => {
                if (!v) {
                    setIsOpen(v);
                }
            }}
        >
            <DialogTrigger onClick={() => setIsOpen(true)} render={
                <Button variant="ghost" aria-label="fullscreen" size="icon" className="hover:bg-primary/10 rounded-full">
                    <Expand className="h-4 w-4" />
                </Button>
            } />
            <DialogContent className="w-full sm:w-full sm:max-w-full h-dvh">
                <DialogHeader className='sr-only'>
                    PDF Viewer
                </DialogHeader>
                <ScrollArea className="max-h-[calc(100dvh-3rem)] mt-6">
                    <div ref={ref}>
                        <Document
                            loading={
                                <div className="flex justify-center">
                                    <Loader2 className="my-24 h-6 w-6 animate-spin" />
                                </div>
                            }
                            onLoadError={() =>
                                toast.error('Error loading PDF')
                            }
                            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                            file={url}
                            className="max-h-full"
                        >
                            {new Array(numPages).fill(0).map((_, i) => (
                                <Page key={i} pageNumber={i + 1} width={width} />
                            ))}
                        </Document>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}

export default PDFFullscreenRenderer