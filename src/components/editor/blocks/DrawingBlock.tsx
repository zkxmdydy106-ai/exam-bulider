import React, { useState, useRef, useEffect } from 'react';
import classes from './DrawingBlock.module.css';
import { Circle, Square, Download, PenTool, Eraser } from 'lucide-react';

interface DrawingBlockProps {
    imageUrl?: string;
    onChange: (imageUrl: string) => void;
}

type ShapeType = 'freehand' | 'circle' | 'square' | 'triangle';

const DrawingBlock: React.FC<DrawingBlockProps> = ({ imageUrl, onChange }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [activeShape, setActiveShape] = useState<ShapeType>('freehand');
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        if (!imageUrl) {
            clearCanvas();
        }
    }, [imageUrl]);

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;

        if (activeShape === 'freehand') {
            setIsDrawing(true);
            ctx.beginPath();
            ctx.moveTo(x, y);
        } else {
            // 원클릭 도형 붙이기
            ctx.fillStyle = 'transparent';
            if (activeShape === 'circle') {
                ctx.beginPath();
                ctx.arc(x, y, 30, 0, 2 * Math.PI);
                ctx.stroke();
            } else if (activeShape === 'square') {
                ctx.strokeRect(x - 30, y - 30, 60, 60);
            } else if (activeShape === 'triangle') {
                ctx.beginPath();
                ctx.moveTo(x, y - 30);
                ctx.lineTo(x + 30, y + 30);
                ctx.lineTo(x - 30, y + 30);
                ctx.closePath();
                ctx.stroke();
            }
        }
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || activeShape !== 'freehand') return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing) {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx) {
                ctx.closePath();
            }
            setIsDrawing(false);
        }
    };

    const handleSaveImage = () => {
        if (canvasRef.current) {
            const dataUrl = canvasRef.current.toDataURL('image/png');
            onChange(dataUrl);
            alert('자유 도형 캔버스가 문항에 이미지로 삽입되었습니다.');
        }
    };

    return (
        <div className={classes.drawingContainer}>
            <div className={classes.toolbar}>
                <button
                    className={`${classes.toolBtn} ${activeShape === 'freehand' ? classes.active : ''}`}
                    onClick={() => setActiveShape('freehand')}
                    title="자유 그리기 (드래그)"
                >
                    <PenTool size={16} /> 펜 그리기
                </button>
                <div style={{ width: '1px', background: '#e9ecef', margin: '0 4px' }} />
                <button
                    className={`${classes.toolBtn} ${activeShape === 'circle' ? classes.active : ''}`}
                    onClick={() => setActiveShape('circle')}
                    title="원 (클릭하여 배치)"
                >
                    <Circle size={16} />
                </button>
                <button
                    className={`${classes.toolBtn} ${activeShape === 'square' ? classes.active : ''}`}
                    onClick={() => setActiveShape('square')}
                    title="사각형 (클릭하여 배치)"
                >
                    <Square size={16} />
                </button>
                <button
                    className={`${classes.toolBtn} ${activeShape === 'triangle' ? classes.active : ''}`}
                    onClick={() => setActiveShape('triangle')}
                    title="삼각형 (클릭하여 배치)"
                >
                    🔺
                </button>
                <div style={{ flex: 1 }} />
                <button
                    className={classes.toolBtn}
                    onClick={clearCanvas}
                    title="캔버스 비우기"
                    style={{ color: '#fa5252' }}
                >
                    <Eraser size={16} /> 전체 지우기
                </button>
            </div>

            <div className={classes.canvasArea}>
                {imageUrl ? (
                    <div className={classes.previewMode}>
                        <img src={imageUrl} alt="생성된 다이어그램" className={classes.previewImage} />
                        <button className={classes.clearBtn} onClick={() => onChange('')}>다시 그리기</button>
                    </div>
                ) : (
                    <div className={classes.editMode}>
                        <canvas
                            ref={canvasRef}
                            width={400}
                            height={300}
                            className={classes.drawingCanvas}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            style={{ cursor: activeShape === 'freehand' ? 'crosshair' : 'crosshair' }}
                        />
                        <button className={classes.saveBtn} onClick={handleSaveImage}>
                            <Download size={16} /> 현재 캔버스 완성하기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DrawingBlock;
