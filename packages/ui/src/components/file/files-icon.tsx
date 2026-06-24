import PDFIcon from '@repo/assets/files-icon/pdf.svg'
import DOCIcon from '@repo/assets/files-icon/doc.svg'
import PPTIcon from '@repo/assets/files-icon/ppt.svg'
import ImageIcon from '@repo/assets/files-icon/jpg.svg'
import GIFIcon from '@repo/assets/files-icon/gif.svg'
import JsIcon from '@repo/assets/files-icon/js.svg'
import JSONIcon from '@repo/assets/files-icon/json.svg'
import XLSIcon from '@repo/assets/files-icon/xls.svg'
import CSVIcon from '@repo/assets/files-icon/csv.svg'
import ZIPIcon from '@repo/assets/files-icon/zip.svg'
import TXTIcon from '@repo/assets/files-icon/txt.svg'
import MP3Icon from '@repo/assets/files-icon/mp3.svg'
import MP4Icon from '@repo/assets/files-icon/mp4.svg'
import PNGIcon from '@repo/assets/files-icon/png.svg'
import SVGIcon from '@repo/assets/files-icon/svg.svg'
import UnknownIcon from '@repo/assets/files-icon/unknown.svg'
import { cn } from '@repo/ui/lib/utils'

const getFileTypeIcon = (filename: string) => {
    if (!filename) {
        return UnknownIcon;
    }
    const extension = filename?.split('.')?.pop()?.toLowerCase();
    switch (extension) {
        case 'pdf':
            return PDFIcon;
        case 'doc':
        case 'docx':
            return DOCIcon;
        case 'ppt':
        case 'pptx':
            return PPTIcon;
        case 'jpg':
        case 'jpeg':
            return ImageIcon;
        case 'gif':
            return GIFIcon;
        case 'js':
            return JsIcon;
        case 'json':
            return JSONIcon;
        case 'xls':
        case 'xlsx':
        case 'xlsm':
            return XLSIcon;
        case 'csv':
            return CSVIcon;
        case 'zip':
        case 'rar':
            return ZIPIcon;
        case 'txt':
            return TXTIcon;
        case 'mp3':
            return MP3Icon;
        case 'mp4':
            return MP4Icon;
        case 'png':
            return PNGIcon;
        case 'svg':
            return SVGIcon;
        default:
            return UnknownIcon;
    }
}

interface FilesIconProps {
    filename: string;
    className?: string;
    imgClassName?: string;
}


const FilesIcon = ({ filename, className, imgClassName }: FilesIconProps) => {
    const thumbnailSrc = getFileTypeIcon(filename);
    return (
        <div className={cn(className)}
        >
            <img src={thumbnailSrc} alt="file-icon" className={cn("max-h-16 max-w-16 size-10 object-cover", imgClassName)} />
        </div>
    )
}

export default FilesIcon