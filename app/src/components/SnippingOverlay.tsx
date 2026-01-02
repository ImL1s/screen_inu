import { useRef, useState, useEffect } from 'react';
import { X, Crop, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Region {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface Props {
    image?: string; // Optional now
    onCrop: (result: string | Region) => void;
    onClose: () => void;
    directMode?: boolean;
}

export function SnippingOverlay({ image, onCrop, onClose, directMode = false }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
    const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
    const [imgObj, setImgObj] = useState<HTMLImageElement | null>(null);
    const [showToast, setShowToast] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Initial load of image (only if provided)
    useEffect(() => {
        if (!image) return;
        const img = new Image();
        img.src = image;
        img.onload = () => {
            setImgObj(img);
        };
    }, [image]);

    // ESC key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Main Draw Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Size handling
        if (directMode) {
            // Match viewport exactly
            if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }
        } else if (imgObj) {
            // Match image size
            if (canvas.width !== imgObj.naturalWidth || canvas.height !== imgObj.naturalHeight) {
                canvas.width = imgObj.naturalWidth;
                canvas.height = imgObj.naturalHeight;
            }
        }

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Background / Image
        if (directMode) {
            // Dim the desktop behind
            // IMPORTANT: Clear the canvas initially to be fully transparent so we can see desktop?
            // No, we want to dim it. background-color is handled by container maybe?
            // Let's draw semi-transparent black
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; // Dim effect
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (imgObj) {
            ctx.drawImage(imgObj, 0, 0);
            // Dim Overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // 3. Selection
        if (startPos && currentPos) {
            const x = Math.min(startPos.x, currentPos.x);
            const y = Math.min(startPos.y, currentPos.y);
            const w = Math.abs(currentPos.x - startPos.x);
            const h = Math.abs(currentPos.y - startPos.y);

            // Cut out the selection (Hole)
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, w, h);

            if (directMode) {
                // Make hole transparent to see desktop clearly
                ctx.globalCompositeOperation = 'destination-out';
                ctx.fill();
            } else if (imgObj) {
                // Show original image
                ctx.clip();
                ctx.drawImage(imgObj, 0, 0);
            }
            ctx.restore();

            // Border
            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);

            // Size Label
            if (w > 20 && h > 20) {
                const label = `${Math.round(w)} x ${Math.round(h)}`;
                const fontSize = 14;
                ctx.font = `bold ${fontSize}px "Space Mono", monospace`;
                const textMetrics = ctx.measureText(label);

                // Label BG
                ctx.fillStyle = '#0a0a0a';
                ctx.fillRect(x, y - 24, textMetrics.width + 10, 24);

                // Label Text
                ctx.fillStyle = '#00ff88';
                ctx.fillText(label, x + 5, y - 7);
            }
        }

    }, [imgObj, startPos, currentPos, directMode]);

    // Helper: Map coordinates
    const mapCoordinates = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();

        if (directMode) {
            // In direct mode (fullscreen window), client coords ARE canvas coords
            return {
                x: e.clientX,
                y: e.clientY
            };
        } else {
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            };
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const coords = mapCoordinates(e);
        setStartPos(coords);
        setCurrentPos(coords);
        setIsDragging(true);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (startPos) {
            setCurrentPos(mapCoordinates(e));
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        if (startPos && currentPos) {
            const x = Math.min(startPos.x, currentPos.x);
            const y = Math.min(startPos.y, currentPos.y);
            const w = Math.abs(currentPos.x - startPos.x);
            const h = Math.abs(currentPos.y - startPos.y);

            // Min size threshold
            if (w > 10 && h > 10) {
                if (directMode) {
                    // Return coordinates directly
                    // Adjust for DPI if needed? Backend takes pixels.
                    // window.devicePixelRatio might be needed if Tauri uses logical pixels for window size but physical for screen capture.
                    // Usually we multiply by dpr.
                    const dpr = window.devicePixelRatio || 1;
                    onCrop({
                        x: Math.round(x * dpr),
                        y: Math.round(y * dpr),
                        width: Math.round(w * dpr),
                        height: Math.round(h * dpr)
                    });
                } else if (imgObj) {
                    // Crop image
                    const outputCanvas = document.createElement('canvas');
                    outputCanvas.width = w;
                    outputCanvas.height = h;
                    const ctx = outputCanvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(imgObj, x, y, w, h, 0, 0, w, h);
                        onCrop(outputCanvas.toDataURL('image/png'));
                    }
                }
            } else if (w > 2 || h > 2) {
                setShowToast(true);
                setTimeout(() => setShowToast(false), 2000);
            }
            setStartPos(null);
            setCurrentPos(null);
        }
    };

    return (
        <div className={`fixed inset-0 z-[9999] cursor-crosshair font-mono ${directMode ? 'bg-transparent' : 'bg-black'}`}>
            <canvas
                ref={canvasRef}
                className="w-full h-full block object-contain"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            />

            {/* UI Overlay Elements (Guide, Cancel) */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: isDragging ? 0.3 : 1, y: 0 }}
                className="fixed top-8 left-1/2 transform -translate-x-1/2 flex items-center gap-3 px-6 py-3 bg-[#0a0a0a] text-[#00ff88] border-2 border-[#00ff88] shadow-[4px_4px_0px_white] z-[10000] pointer-events-none"
            >
                <Crop size={16} className="text-[#00ff88]" />
                <span className="text-xs font-bold uppercase tracking-widest">{directMode ? 'SELECT ON SCREEN' : 'DRAG TO CAPTURE'}</span>
            </motion.div>

            <button
                onClick={onClose}
                className="fixed top-6 right-6 p-3 bg-[#ff6b35] text-[#0a0a0a] border-2 border-[#0a0a0a] shadow-[4px_4px_0px_#0a0a0a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#0a0a0a] transition-all z-[10001]"
            >
                <X size={20} strokeWidth={3} />
            </button>

            <AnimatePresence>
                {showToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-12 left-1/2 transform -translate-x-1/2 px-6 py-4 bg-[#ff6b35] text-[#0a0a0a] border-2 border-[#0a0a0a] shadow-[8px_8px_0px_#0a0a0a] z-[10002] flex items-center gap-3"
                    >
                        <AlertCircle size={20} strokeWidth={2.5} />
                        <span className="text-xs font-bold uppercase tracking-wider">TOO SMALL</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
