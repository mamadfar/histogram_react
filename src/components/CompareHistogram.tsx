import {useState, useEffect, useRef, ChangeEvent, SetStateAction, Dispatch, useCallback} from "react";
import {WITHOUT_FLASH, WITH_FLASH} from "../constants/Image.constant.tsx";

interface HistogramData {
    histBrightness: number[];
    histR: number[];
    histG: number[];
    histB: number[];
}

function CompareHistogram() {
    const [imageSrc1, setImageSrc1] = useState<string>(WITHOUT_FLASH);
    const [imageSrc2, setImageSrc2] = useState<string>(WITH_FLASH);
    const [histogramData1, setHistogramData1] = useState<HistogramData | null>(null);
    const [histogramData2, setHistogramData2] = useState<HistogramData | null>(null);
    const [histogramType, setHistogramType] = useState<string>('value');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const img1Ref = useRef<HTMLImageElement>(null);
    const img2Ref = useRef<HTMLImageElement>(null);

    const getImageData = (imgSrc: string): Promise<ImageData> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                if (!context) {
                    reject(new Error("Failed to get canvas context"));
                    return;
                }
                canvas.width = img.width;
                canvas.height = img.height;
                context.drawImage(img, 0, 0);
                resolve(context.getImageData(0, 0, img.width, img.height));
            };
            img.onerror = reject;
            img.src = imgSrc;
        });
    }

    const processImage = useCallback(async (imgSrc: string,setHistogramData: Dispatch<SetStateAction<HistogramData | null>>) => {
        if (!imgSrc) return;

        const inImg = await getImageData(imgSrc);
        const src = new Uint32Array(inImg.data.buffer);

        const histBrightness = new Array(256).fill(0);
        const histR = new Array(256).fill(0);
        const histG = new Array(256).fill(0);
        const histB = new Array(256).fill(0);

        for (let i = 0; i < src.length; i++) {
            const r = src[i] & 0xFF;
            const g = (src[i] >> 8) & 0xFF;
            const b = (src[i] >> 16) & 0xFF;
            histBrightness[r]++;
            histBrightness[g]++;
            histBrightness[b]++;
            histR[r]++;
            histG[g]++;
            histB[b]++;
        }

        setHistogramData({ histBrightness, histR, histG, histB });
    }, [])

    const drawHistogram = useCallback((histogramData: HistogramData | null, ctx: CanvasRenderingContext2D, color: string, offset: number) => {
        if (!histogramData || !canvasRef.current) return;
        const { histBrightness, histR, histG, histB } = histogramData;
        const maxCount = histogramType === 'value' ? Math.max(...histBrightness) : Math.max(...histR, ...histG, ...histB);
        const dx = canvasRef.current.width / 256;
        const dy = (canvasRef.current.height - 8) / maxCount;

        for (let i = 0; i < 256; i++) {
            const x = i * dx + offset;
            if (histogramType === 'value') {
                drawLine(ctx, x, histBrightness[i] * dy, `rgba(0,0,0,${color})`);
            } else {
                drawLine(ctx, x, histR[i] * dy, `rgba(220,0,0,${color})`);
                drawLine(ctx, x, histG[i] * dy, `rgba(0,210,0,${color})`);
                drawLine(ctx, x, histB[i] * dy, `rgba(0,0,255,${color})`);
            }
        }
    }, [histogramType])

    const drawLine = (
        ctx: CanvasRenderingContext2D,
        x: number,
        height: number,
        strokeStyle: string
    ) => {
        if (!canvasRef.current) return;
        ctx.strokeStyle = strokeStyle;
        ctx.beginPath();
        ctx.moveTo(x, canvasRef.current.height);
        ctx.lineTo(x, canvasRef.current.height - height);
        ctx.stroke();
    }

    const handleImageChange = (
        event: ChangeEvent<HTMLInputElement>,
        setImageSrc: Dispatch<SetStateAction<string>>
    ) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setImageSrc(URL.createObjectURL(file));
        }
    }

    const handleHistogramTypeChange = (event: ChangeEvent<HTMLInputElement>) => {
        setHistogramType(event.target.value);
    }

    useEffect(() => {
        void processImage(imageSrc1, setHistogramData1);
    }, [imageSrc1, processImage]);

    useEffect(() => {
        void processImage(imageSrc2, setHistogramData2);
    }, [imageSrc2, processImage]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        if (!ctx) return;
        drawHistogram(histogramData1, ctx, '0.5', -0.5);
        drawHistogram(histogramData2, ctx, '0.5', 0.5);
    }, [drawHistogram, histogramData1, histogramData2, histogramType]);

    return (
        <div className="container mx-auto my-6 p-4 space-y-6">
            <div>
                <div className="flex space-x-4 mb-4">
                    <label className="flex items-center">
                        <input type="radio" name="rType" value="value" checked={histogramType === 'value'} onChange={handleHistogramTypeChange} className="mr-2" /> Value
                    </label>
                    <label className="flex items-center">
                        <input type="radio" name="rType" value="color" checked={histogramType === 'color'} onChange={handleHistogramTypeChange} className="mr-2" /> Color
                    </label>
                </div>
                <div className="grid md:grid-cols-2 grid-rows-1 gap-4 h-full">
                    <div className="h-auto flex flex-col justify-between">
                        <div className="h-full border p-4">
                            <p className="font-semibold">Original image 1</p>
                            <img ref={img1Ref} src={imageSrc1} alt="Source" className="mt-2 max-w-full h-auto max-h-56"/>
                        </div>
                        <p className="mt-2 font-semibold">Image 1</p>
                        <input type="file" onChange={(e) => handleImageChange(e, setImageSrc1)} className="border p-2 w-full mt-2"/>
                    </div>
                    <div className="h-auto flex flex-col justify-between">
                        <div className="h-full border p-4">
                            <p className="font-semibold">Original image 2</p>
                            <img ref={img2Ref} src={imageSrc2} alt="Source" className="mt-2 max-w-full h-auto max-h-56"/>
                        </div>
                        <p className="mt-2 font-semibold">Image 2</p>
                        <input type="file" onChange={(e) => handleImageChange(e, setImageSrc2)} className="border p-2 w-full mt-2"/>
                    </div>
                </div>
            </div>

            <div>
                <p className="font-semibold">Combined Histogram</p>
                <div className="border p-4">
                    <canvas ref={canvasRef} width="512" height="256" className="w-full h-80"></canvas>
                </div>
            </div>
        </div>
    );

}

export default CompareHistogram;
