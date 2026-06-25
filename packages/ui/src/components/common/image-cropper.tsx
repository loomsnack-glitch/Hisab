import React, { useEffect, useRef, useState } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@repo/ui/components/dialog';
import { Button } from '@repo/ui/components/button';

interface ImageCropperProps {
    open: boolean;
    onOpenChange: (isOpen: boolean) => void;
    file: File | null;
    onCropComplete: (file: File) => void | Promise<void>;
    aspectRatio?: number;
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    outputType?: string;
    outputQuality?: number;
    circularCrop?: boolean;
}

function centerAspectCrop(
    mediaWidth: number,
    mediaHeight: number,
    aspect: number,
) {
    return centerCrop(
        makeAspectCrop(
            {
                unit: '%',
                width: 90,
            },
            aspect,
            mediaWidth,
            mediaHeight,
        ),
        mediaWidth,
        mediaHeight,
    )
}

export function ImageCropper({
    open,
    onOpenChange,
    file,
    onCropComplete,
    aspectRatio = 1,
    title = 'Crop Image',
    description,
    confirmLabel = 'Crop & Save',
    cancelLabel = 'Cancel',
    outputType,
    outputQuality = 0.92,
    circularCrop = false,
}: ImageCropperProps) {
    const [imgSrc, setImgSrc] = useState('');
    const imgRef = useRef<HTMLImageElement>(null);
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!file) {
            setImgSrc('');
            setCrop(undefined);
            setCompletedCrop(undefined);
            return;
        }

        setCrop(undefined);
        setCompletedCrop(undefined);

        const objectUrl = URL.createObjectURL(file);
        setImgSrc(objectUrl);

        return () => {
            URL.revokeObjectURL(objectUrl);
        };
    }, [file]);

    function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
        const { width, height } = e.currentTarget;
        if (aspectRatio) {
            setCrop(centerAspectCrop(width, height, aspectRatio));
        } else {
            setCrop(centerCrop(
                {
                    unit: '%',
                    width: 90,
                    height: 90,
                },
                width,
                height
            ));
        }
    }

    async function handleCropSubmit() {
        if (
            completedCrop?.width &&
            completedCrop?.height &&
            imgRef.current &&
            file
        ) {
            const canvas = document.createElement('canvas');
            const image = imgRef.current;
            const scaleX = image.naturalWidth / image.width;
            const scaleY = image.naturalHeight / image.height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                throw new Error('No 2d context');
            }

            const pixelRatio = window.devicePixelRatio;
            canvas.width = Math.floor(completedCrop.width * scaleX * pixelRatio);
            canvas.height = Math.floor(completedCrop.height * scaleY * pixelRatio);

            ctx.scale(pixelRatio, pixelRatio);
            ctx.imageSmoothingQuality = 'high';

            const cropX = completedCrop.x * scaleX;
            const cropY = completedCrop.y * scaleY;
            const cropWidth = completedCrop.width * scaleX;
            const cropHeight = completedCrop.height * scaleY;

            ctx.drawImage(
                image,
                cropX,
                cropY,
                cropWidth,
                cropHeight,
                0,
                0,
                cropWidth,
                cropHeight,
            );

            const resolvedOutputType = outputType || file.type || 'image/jpeg';

            setIsSubmitting(true);

            try {
                const blob = await new Promise<Blob>((resolve, reject) => {
                    canvas.toBlob((nextBlob) => {
                        if (!nextBlob) {
                            reject(new Error('Failed to crop image.'));
                            return;
                        }

                        resolve(nextBlob);
                    }, resolvedOutputType, outputQuality);
                });

                const croppedFile = new File([blob], file.name, {
                    type: resolvedOutputType,
                    lastModified: Date.now(),
                });

                await onCropComplete(croppedFile);
                onOpenChange(false);
            } finally {
                setIsSubmitting(false);
            }
        } else {
            onOpenChange(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description ? <DialogDescription>{description}</DialogDescription> : null}
                </DialogHeader>
                <div className="flex justify-center items-center overflow-hidden bg-slate-100 rounded-md max-h-[60vh] p-2">
                    {!!imgSrc && (
                        <ReactCrop
                            crop={crop}
                            onChange={(_, percentCrop) => setCrop(percentCrop)}
                            onComplete={(c) => setCompletedCrop(c)}
                            aspect={aspectRatio}
                            circularCrop={circularCrop}
                            keepSelection
                        >
                            <img
                                ref={imgRef}
                                alt="Crop me"
                                src={imgSrc}
                                onLoad={onImageLoad}
                                className="max-h-[50vh] object-contain"
                            />
                        </ReactCrop>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        {cancelLabel}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleCropSubmit}
                        disabled={!completedCrop?.width || !completedCrop?.height}
                        isLoading={isSubmitting}
                        loadingText="Preparing..."
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
