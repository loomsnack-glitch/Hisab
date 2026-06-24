import { useState, useEffect } from 'react';

export function useImageLoader({ src }: { src: string }) {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

    useEffect(() => {
        const img = new Image();

        img.onload = () => {
            setImageDimensions({ width: img.width, height: img.height });
            setIsLoading(false);
            setError(null);
        };

        img.onerror = () => {
            setError('Failed to load image');
            setIsLoading(false);
        };

        img.src = src;

        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [src]);

    return { isLoading, error, imageDimensions };
} 