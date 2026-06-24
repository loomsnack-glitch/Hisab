import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { useEffect } from "react";
import PDFRenderer from "./pdf-renderer";
import { ImageViewer } from "./image-renderer";
import HeicImage from "./heic-renderer";
import JsonViewer from "./json-renderer";
import TextFileViewer from "./text-file-viewer";
import { handleFileDownload } from "@/utils/helper";

type FileViewerProps = {
    filename: string;
    url: string;
    type: string;
    open: boolean;
    onClose: () => void;
    isLoading: boolean;
    showDownload: boolean;
    caption?: string;
    onPrevious?: () => void;
    onNext?: () => void;
    currentAttachmentIndex?: number | null;
    totalAttachments?: number;
    isSliderEnabled?: boolean;
};

const FileViewer = ({ filename, url, type, open, onClose, isLoading, showDownload, caption, onPrevious = () => { }, onNext = () => { }, currentAttachmentIndex, totalAttachments, isSliderEnabled = false }: FileViewerProps) => {

    const currentAttachmentIndexExist = currentAttachmentIndex !== null && currentAttachmentIndex !== undefined;

    const imageStyle = {
        width: '100%',
        height: '100%',
        maxHeight: '85dvh',
        transition: 'filter 1s ease',
        // opacity: loading ? 0.5 : 1,
        filter: 'none',
    };

    const renderContent = () => {
        switch (type) {
            case 'txt':
            case 'TXT':
                return <TextFileViewer url={url} />;
            case 'json':
            case 'JSON':
                return <JsonViewer url={url} />;
            case 'pdf':
            case 'PDF':
                return <PDFRenderer url={url} />;
            case 'heic':
            case 'HEIC':
            case 'heif':
            case 'HEIF':
                return <HeicImage src={url} alt="File content" className='object-contain' />;
            case 'jpg':
            case 'JPG':
            case 'jpeg':
            case 'JPEG':
            case 'png':
            case 'PNG':
            case 'gif':
            case 'GIF':
            case 'svg':
            case 'SVG':
            case 'webp':
            case 'WEBP':
                return <ImageViewer src={url} alt="File content" imageStyle={imageStyle} visibleButtons={['zoomIn', 'zoomOut', 'rotateLeft', 'rotateRight', 'reset', 'fullscreen']}
                    className='object-contain' />;
            case 'mp4':
            case 'MP4':
            case 'webm':
            case 'WEBM':
            case 'mov':
            case 'MOV':
                return (
                    <video controls style={{ maxWidth: '100%', maxHeight: '90vh', paddingBottom: '4px' }} key={url}>
                        <source src={url} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                );
            case 'm4a':
            case 'M4A':
                return (
                    <audio controls style={{ width: '100%' }}>
                        <source src={url} type="audio/x-m4a" />
                        Your browser does not support the audio tag.
                    </audio>
                );
            case 'mp3':
            case 'MP3':
            case 'wav':
            case 'WAV':
            case 'ogg':
            case 'OGG':
                return (
                    <audio controls style={{ width: '100%' }}>
                        <source src={url} type={`audio/${type}`} />
                        Your browser does not support the audio tag.
                    </audio>
                );
            default:
                return <p>
                    File type not supported. Please download the file to view it.
                </p>;
        }
    };

    useEffect(() => {
        if (open && isSliderEnabled) {
            const handleKeyDown = (event: KeyboardEvent) => {
                const isNavKey = event.key === 'ArrowLeft' || event.key === 'ArrowRight';

                if (!isNavKey || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

                if (!currentAttachmentIndexExist || totalAttachments === undefined) {
                    console.log("FileViewer: Missing index or totalAttachments", { currentAttachmentIndexExist, totalAttachments });
                    return;
                }

                if (event.key === 'ArrowLeft') {
                    if (currentAttachmentIndex > 0) {
                        // console.log("FileViewer: Navigating to previous", currentAttachmentIndex - 1);
                        event.preventDefault();
                        event.stopPropagation();
                        onPrevious();
                    }
                } else if (event.key === 'ArrowRight') {
                    if (currentAttachmentIndex < (totalAttachments || 0) - 1) {
                        // console.log("FileViewer: Navigating to next", currentAttachmentIndex + 1);
                        event.preventDefault();
                        event.stopPropagation();
                        onNext();
                    }
                }
            };

            window.addEventListener('keydown', handleKeyDown, true); // Use capture to interecpt events
            // console.log("FileViewer: Keyboard listener added", { currentAttachmentIndex, totalAttachments });

            return () => {
                window.removeEventListener('keydown', handleKeyDown, true);
                // console.log("FileViewer: Keyboard listener removed");
            };
        }
    }, [currentAttachmentIndex, totalAttachments, onPrevious, onNext, isSliderEnabled, open, currentAttachmentIndexExist]);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[calc(100dvw-8dvw)] grid-rows-[auto_1fr] h-[calc(100dvh-1dvh)] gap-2" showCloseButton={false}>
                <DialogHeader className='flex-row border-b items-center justify-between pb-2'>
                    <DialogTitle>
                        File Viewer
                    </DialogTitle>
                    <DialogDescription className='sr-only'>
                        {filename}
                    </DialogDescription>
                    <div className="flex gap-2">

                        {showDownload && <Button size='sm' variant='outline' className="rounded-lg" onClick={() => handleFileDownload(url, filename)}>
                            <Download size={18} />
                            <span className="ml-2">Download</span>
                        </Button>}

                        <Button variant="ghost" onClick={onClose}>
                            <X size={18} />
                        </Button>
                    </div>
                </DialogHeader>
                {isLoading ?
                    <div className="flex justify-center items-center h-72">
                        <div className="">Loading...</div>
                    </div> :
                    <div className="overflow-hidden w-full flex justify-between items-center min-h-[69dvh] max-h-dvh px-1 gap-x-1">
                        {isSliderEnabled && currentAttachmentIndexExist && <Button variant="ghost" className="h-fit w-fit rounded-full p-1" onClick={onPrevious} disabled={currentAttachmentIndex <= 0}>
                            <ChevronLeft className='size-8' />
                        </Button>}
                        <div className='w-full h-full flex items-center justify-center relative'>{renderContent()}</div>
                        {isSliderEnabled && currentAttachmentIndexExist && totalAttachments && <Button variant="ghost" className="h-fit w-fit rounded-full p-1" onClick={onNext} disabled={currentAttachmentIndex >= 0 && currentAttachmentIndex >= totalAttachments - 1}>
                            <ChevronRight className='size-8' />
                        </Button>}
                    </div>}
                {caption && <div className='text-sm text-gray-600 min-w-0 m-4 border p-2 rounded-sm border-input'>{caption}</div>}
            </DialogContent>
        </Dialog>
    );
};

export default FileViewer;