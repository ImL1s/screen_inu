import { useRef, useState, useEffect } from 'react';

interface Props {
    image: string;
    onCrop: (croppedImage: string) => void;
    onClose: () => void;
}

export function SnippingOverlay({ image, onCrop, onClose }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
    const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
    const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);

    useEffect(() => {
        const img = new Image();
        img.src = image;
        img.onload = () => {
            setImgObj(img);
            draw(img, null, null);
        };
    }, [image]);

    useEffect(() => {
        if (imgObj) {
            draw(imgObj, startPos, currentPos);
        }
    }, [startPos, currentPos, imgObj]);

    const draw = (
        img: HTMLImageElement,
        start: { x: number; y: number } | null,
        current: { x: number; y: number } | null
    ) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size to window size (or image size?)
        // Usually full screen capture matches window size if full screen.
        // Assuming prompt said "Global shortcut", likely transparent fullscreen window.
        // For now, match window inner dimensions. 
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Draw background image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height); // Scaling might be an issue if DPI differs
        // Overlay dimming
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (start && current) {
            const x = Math.min(start.x, current.x);
            const y = Math.min(start.y, current.y);
            const w = Math.abs(current.x - start.x);
            const h = Math.abs(current.y - start.y);

            // Clear the selection area (show original image)
            // We clip the path, clear the semi-transparent black, and redraw image segment?
            // Easier: Draw image again clipped.
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.clip();
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            ctx.restore();

            // Draw border
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setStartPos({ x: e.clientX, y: e.clientY });
        setCurrentPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (startPos) {
            setCurrentPos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseUp = () => {
        if (startPos && currentPos && imgObj) {
            // Crop logic
            const x = Math.min(startPos.x, currentPos.x);
            const y = Math.min(startPos.y, currentPos.y);
            const w = Math.abs(currentPos.x - startPos.x);
            const h = Math.abs(currentPos.y - startPos.y);

            if (w > 10 && h > 10) { // Minimal threshold
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // We draw the source image onto the crop canvas
                    // Source coord: (x, y) with w, h
                    // But careful about scaling. If we drew full image to fit canvas.width (window), scaling factor is needed?
                    // For "capture_full_screen", image usually matches logical pixels if handled right, or physical.
                    // NOTE: xcap returns physical pixels. Window is logical.
                    // We simplify by drawing what we see. 
                    // Getting the pixels from the main canvas is safer to match WYSIWYG.
                    const mainCtx = canvasRef.current?.getContext('2d');
                    if (mainCtx) {
                        mainCtx.getImageData(x, y, w, h);
                        // This simple approach grabs the "dimmed" pixels if we are not careful?
                        // No, because we redrew the clear image in the selection loop. 
                        // But wait, the main canvas has the dim overlay painted on it except the hole?
                        // Yes. But `getImageData` gets the final pixel values.
                        // The hole has pure image.
                        // So dragging from the hole is fine.

                        // BUT: `getImageData` is affected by DPI on some browsers.
                        // Better implementation: use original image obj and scale coords.
                        const scaleX = imgObj.naturalWidth / window.innerWidth;
                        const scaleY = imgObj.naturalHeight / window.innerHeight;

                        ctx.drawImage(imgObj, x * scaleX, y * scaleY, w * scaleX, h * scaleY, 0, 0, w, h);
                        onCrop(canvas.toDataURL('image/png'));
                    }
                }
            }
            setStartPos(null);
            setCurrentPos(null);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, cursor: 'crosshair' }}>
            <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            />
            <button
                onClick={onClose}
                style={{ position: 'absolute', top: 10, right: 10, zIndex: 10000 }}
            >
                Cancel
            </button>
        </div>
    );
}
