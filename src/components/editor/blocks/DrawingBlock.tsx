import React, { useState, useRef, useEffect } from 'react';
import classes from './DrawingBlock.module.css';
import { Circle, Square, Download } from 'lucide-react';

interface DrawingBlockProps {
    imageUrl?: string;
    onChange: (imageUrl: string) => void;
}

type ShapeType = 'circle' | 'square' | 'triangle' | 'graph';

const DrawingBlock: React.FC<DrawingBlockProps> = ({ imageUrl, onChange }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [activeShape, setActiveShape] = useState<ShapeType>('graph');

    // 이 컴포넌트는 MVP에서 가장 기본적인 SVG 기반 도형 렌더링 후 
    // DataURL로 변환하여 HWP 복사용 이미지 박스에 넣는 목적으로 만들어집니다.

    const drawShape = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 캔버스 초기화
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'transparent';

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        if (activeShape === 'circle') {
            ctx.beginPath();
            ctx.arc(cx, cy, 60, 0, 2 * Math.PI);
            ctx.stroke();
        } else if (activeShape === 'square') {
            ctx.strokeRect(cx - 60, cy - 60, 120, 120);
        } else if (activeShape === 'triangle') {
            ctx.beginPath();
            ctx.moveTo(cx, cy - 60);
            ctx.lineTo(cx + 60, cy + 60);
            ctx.lineTo(cx - 60, cy + 60);
            ctx.closePath();
            ctx.stroke();
        } else if (activeShape === 'graph') {
            // X, Y 좌표축
            ctx.beginPath();
            // X축
            ctx.moveTo(20, cy);
            ctx.lineTo(canvas.width - 20, cy);
            // Y축
            ctx.moveTo(cx, 20);
            ctx.lineTo(cx, canvas.height - 20);
            ctx.stroke();

            // 임의의 함수선 하나 추가 (예: 포물선)
            ctx.beginPath();
            ctx.strokeStyle = '#3b82f6';
            for (let x = -50; x <= 50; x++) {
                const drawX = cx + x * 2;
                const drawY = cy - ((x * x) / 30) * 2;
                if (x === -50) ctx.moveTo(drawX, drawY);
                else ctx.lineTo(drawX, drawY);
            }
            ctx.stroke();

            // 원점 O 표시
            ctx.fillStyle = '#000';
            ctx.font = '12px Arial';
            ctx.fillText('O', cx - 15, cy + 15);
            ctx.fillText('x', canvas.width - 20, cy + 15);
            ctx.fillText('y', cx + 10, 20);
        }
    };

    useEffect(() => {
        drawShape();
    }, [activeShape]);

    const handleSaveImage = () => {
        if (canvasRef.current) {
            const dataUrl = canvasRef.current.toDataURL('image/png');
            onChange(dataUrl);
            alert('도형/그래프가 현재 문항에 이미지로 삽입되었습니다.');
        }
    };

    return (
        <div className={classes.drawingContainer}>
            <div className={classes.toolbar}>
                <button
                    className={`${classes.toolBtn} ${activeShape === 'graph' ? classes.active : ''}`}
                    onClick={() => setActiveShape('graph')}
                    title="좌표평면 그래프"
                >
                    📈 좌표 평면
                </button>
                <button
                    className={`${classes.toolBtn} ${activeShape === 'circle' ? classes.active : ''}`}
                    onClick={() => setActiveShape('circle')}
                >
                    <Circle size={16} /> 원
                </button>
                <button
                    className={`${classes.toolBtn} ${activeShape === 'square' ? classes.active : ''}`}
                    onClick={() => setActiveShape('square')}
                >
                    <Square size={16} /> 사각형
                </button>
                <button
                    className={`${classes.toolBtn} ${activeShape === 'triangle' ? classes.active : ''}`}
                    onClick={() => setActiveShape('triangle')}
                    title="정삼각형"
                >
                    🔺 삼각형
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
                            width={300}
                            height={250}
                            className={classes.drawingCanvas}
                        />
                        <button className={classes.saveBtn} onClick={handleSaveImage}>
                            <Download size={16} /> 현재 캔버스 그림 삽입하기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DrawingBlock;
