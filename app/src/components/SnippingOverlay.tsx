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
    const [showToast, setShowToast] = useState(false);

    useEffect(() => {
        const img = new Image();
        img.src = image;
        img.onload = () => {
            setImgObj(img);
            draw(img, null, null);
        };
    }, [image]);

    // ESC key to cancel
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

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
                    const mainCtx = canvasRef.current?.getContext('2d');
                    if (mainCtx) {
                        const scaleX = imgObj.naturalWidth / window.innerWidth;
                        const scaleY = imgObj.naturalHeight / window.innerHeight;
                        ctx.drawImage(imgObj, x * scaleX, y * scaleY, w * scaleX, h * scaleY, 0, 0, w, h);
                        onCrop(canvas.toDataURL('image/png'));
                    }
                }
            } else if (w > 2 || h > 2) {
                // Show toast for too small selection
                setShowToast(true);
                setTimeout(() => setShowToast(false), 2000);
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

            {/* Cancel Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg backdrop-blur-md transition-colors text-sm font-medium shadow-lg"
                style={{ zIndex: 10000 }}
            >
                Cancel (ESC)
            </button>

            {/* Toast for small selection */}
            {showToast && (
                <div
                    className="fixed bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-yellow-500/90 text-black rounded-lg shadow-lg backdrop-blur-md text-sm font-medium animate-pulse"
                    style={{ zIndex: 10001 }}
                >
                    Selection too small. Please drag a larger area.
                </div>
            )}
        </div>
    );
}
