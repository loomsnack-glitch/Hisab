import { toast } from "sonner";

export const handleFileDownload = async (url: string, filename: string) => {
    try {
        if (!url) {
            toast.error('Failed to download file');
            return;
        }

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        // link.target = '_blank';
        link.rel = 'noreferrer';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        toast.error(`Failed to download file ${filename}`);
    }
};