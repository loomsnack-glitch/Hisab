import axios from 'axios';
import heic2any from 'heic2any';
import { ImageIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

const imageCache = new Map(); // Cache for converted images

interface HeicImageProps {
    src: string | File;
    alt: string;
    className?: string;
    width?: number;
    height?: number;
    onLoad?: () => void;
    onError?: (error: Error) => void;
}

export const HeicImage = ({
    src,
    alt,
    className = '',
    width,
    height,
    onLoad,
    onError,
}: HeicImageProps) => {
    const [convertedImage, setConvertedImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let isMounted = true;
        let blobUrl: string | null = null;

        const processImage = async () => {
            try {
                if (!isMounted) return;

                setLoading(true);
                setError(null);
                setProgress(0);

                let imageBlob: Blob;

                if (src instanceof File) {
                    imageBlob = src;
                    setProgress(20);
                } else {
                    if (imageCache.has(src)) {
                        // Use the cached image URL if available
                        const cachedData = imageCache.get(src);
                        setConvertedImage(cachedData.url);
                        setLoading(false);
                        onLoad?.();
                        return;
                    }

                    const response = await axios.get(src, {
                        responseType: 'blob',
                    });
                    imageBlob = response.data;
                    setProgress(20);
                }

                // Check if the image is HEIC
                const isHeic =
                    imageBlob.type === "binary/octet-stream" ||
                    imageBlob.type === 'application/octet-stream' ||
                    imageBlob.type === 'image/heif' ||
                    imageBlob.type === 'image/heic' ||
                    (typeof src === 'string'
                        ? src?.toLowerCase().endsWith('.heic')
                        : src instanceof File && src.name.toLowerCase().endsWith('.heic'));

                if (isHeic) {
                    setProgress(40);

                    // Try to display HEIC natively first
                    try {
                        blobUrl = URL.createObjectURL(imageBlob);

                        // Test if the browser can actually display HEIC
                        const testImg = new Image();
                        const canDisplayNatively = await new Promise<boolean>((resolve) => {
                            if (!blobUrl) return resolve(false);
                            testImg.onload = () => resolve(true);
                            testImg.onerror = () => resolve(false);
                            testImg.src = blobUrl;
                            // Timeout after 2 seconds
                            setTimeout(() => resolve(false), 2000);
                        });

                        if (canDisplayNatively && isMounted) {
                            setProgress(100);
                            setConvertedImage(blobUrl);
                            if (typeof src === 'string') {
                                imageCache.set(src, { url: blobUrl, isNative: true });
                            }
                            setLoading(false);
                            onLoad?.();
                            return;
                        } else {
                            // Fallback to conversion if native display fails
                            URL.revokeObjectURL(blobUrl);
                            blobUrl = null;
                        }
                    } catch {
                        console.log('Native HEIC display failed, converting to JPEG');
                    }

                    // Convert to JPEG as fallback
                    setProgress(60);
                    const result = await heic2any({
                        blob: imageBlob,
                        toType: 'image/jpeg',
                        quality: 0.8,
                    });

                    if (!result || !isMounted) {
                        throw new Error('Failed to convert HEIC image');
                    }

                    // Handle potential Blob[] return from heic2any
                    const convertedBlob = Array.isArray(result) ? result[0] : result;

                    setProgress(80);
                    blobUrl = URL.createObjectURL(convertedBlob);
                    if (isMounted) {
                        setConvertedImage(blobUrl);
                        if (typeof src === 'string') {
                            imageCache.set(src, { url: blobUrl, isNative: false });
                        }
                    }
                    setProgress(100);
                } else {
                    blobUrl = src instanceof File ? URL.createObjectURL(src) : src;
                    if (isMounted) {
                        setConvertedImage(blobUrl);
                    }
                    setProgress(100);
                }

                if (isMounted) {
                    setLoading(false);
                    onLoad?.();
                }
            } catch (err: any) {
                if (!isMounted) return;
                const errorMessage = err instanceof Error ? err.message : 'Failed to process image';
                const error = new Error(errorMessage);
                setError(error);
                setLoading(false);
                onError?.(error);
            }
        };

        processImage();

        return () => {
            isMounted = false;
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl); // Revoke the blob URL when the component unmounts
            }
        };
    }, [src, onLoad, onError]);

    if (loading) {
        return (
            <div
                className={`flex flex-col items-center justify-center ${className}`}
                style={{ width: width || '100%', height: height || '300px' }}
            >
                <div className="w-48 h-2 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                    {progress < 40 ? 'Loading image...' :
                        progress < 60 ? 'Checking native HEIC support...' :
                            'Converting to JPEG...'} {progress}%
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div
                className={`flex flex-col items-center justify-center bg-gray-100 ${className}`}
                style={{ width: width || '100%', height: height || '300px' }}
            >
                <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
        );
    }

    return (
        <img
            src={convertedImage || ''}
            alt={alt}
            className={`object-cover ${className}`}
            width={width}
            height={height}
            onError={() => {
                const error = new Error('Failed to load image');
                setError(error);
                onError?.(error);
            }}
        />
    );
};

export default HeicImage;