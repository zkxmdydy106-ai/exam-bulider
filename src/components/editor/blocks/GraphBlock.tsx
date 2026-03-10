import React, { useState, useEffect } from 'react';
import classes from './GraphBlock.module.css';

interface FunctionGraph {
    id: string;
    expression: string;
    color: string;
    visible: boolean;
}

interface GraphBlockProps {
    graphData?: {
        axes: { xLabel: string; yLabel: string; showOrigin: boolean; domain: [number, number]; range: [number, number] };
        functions: FunctionGraph[];
        pointLabels: Array<{ id: string; x: number; y: number; label: string; type: string }>;
    };
    onChange: (graphData: any) => void;
}

const COLORS = ['#e03131', '#1971c2', '#2f9e44', '#f59f00', '#9c36b5'];

const GraphBlock: React.FC<GraphBlockProps> = ({ graphData, onChange }) => {
    const [axes] = useState(graphData?.axes || { xLabel: 'x', yLabel: 'y', showOrigin: true, domain: [-10, 10], range: [-10, 10] });
    const [functions, setFunctions] = useState<FunctionGraph[]>(graphData?.functions || [{ id: 'f1', expression: 'x^2', color: COLORS[0], visible: true }]);

    const width = 400;
    const height = 300;
    const margin = 20;

    // SVG 좌표계 변환 함수
    const scaleX = (x: number) => {
        const [minX, maxX] = axes.domain;
        return margin + ((x - minX) / (maxX - minX)) * (width - 2 * margin);
    };

    const scaleY = (y: number) => {
        const [minY, maxY] = axes.range;
        return height - margin - ((y - minY) / (maxY - minY)) * (height - 2 * margin);
    };

    const updateParent = () => {
        onChange({
            axes,
            functions,
            pointLabels: graphData?.pointLabels || []
        });
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            updateParent();
        }, 500);
        return () => clearTimeout(timer);
    }, [axes, functions]);

    const addFunction = () => {
        const newId = `f${Date.now()}`;
        setFunctions([...functions, { id: newId, expression: 'x', color: COLORS[functions.length % COLORS.length], visible: true }]);
    };

    const updateFunction = (id: string, updates: Partial<FunctionGraph>) => {
        setFunctions(functions.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const deleteFunction = (id: string) => {
        setFunctions(functions.filter(f => f.id !== id));
    };

    // 매우 단순한 다항식 문자열 평가기 (MVP용 - 실제로는 mathjs 등을 사용해야 함)
    const evaluateMock = (expr: string, x: number) => {
        try {
            // 보안상 위험하지만 MVP 시연 목적으로 제한적 Function 객체 사용
            // 'x^2' -> 'x**2'
            const jsExpr = expr.replace(/\^/g, '**');
            const fn = new Function('x', `return ${jsExpr}`);
            return fn(x);
        } catch (e) {
            return NaN;
        }
    };

    const generatePath = (expr: string) => {
        const [minX, maxX] = axes.domain;
        const step = (maxX - minX) / 100;
        let path = '';

        for (let x = minX; x <= maxX; x += step) {
            const y = evaluateMock(expr, x);
            if (isNaN(y) || y < axes.range[0] || y > axes.range[1]) {
                // 범위를 벗어난 경우 그리지 않음 (간단한 처리)
                continue;
            }

            const svgX = scaleX(x);
            const svgY = scaleY(y);

            if (path === '') {
                path += `M ${svgX} ${svgY} `;
            } else {
                path += `L ${svgX} ${svgY} `;
            }
        }
        return path;
    };

    return (
        <div className={classes.container}>
            {/* 렌더링 영역 */}
            <div className={classes.canvasWrapper}>
                <svg width={width} height={height} className={classes.svgGraph}>
                    {/* 그리드 라인 */}
                    <line x1={margin} y1={scaleY(0)} x2={width - margin} y2={scaleY(0)} stroke="#ccc" strokeWidth="1" />
                    <line x1={scaleX(0)} y1={margin} x2={scaleX(0)} y2={height - margin} stroke="#ccc" strokeWidth="1" />

                    {/* x축, y축 화살표 */}
                    <polygon points={`${width - margin},${scaleY(0) - 4} ${width - margin + 8},${scaleY(0)} ${width - margin},${scaleY(0) + 4}`} fill="#333" />
                    <polygon points={`${scaleX(0) - 4},${margin} ${scaleX(0)},${margin - 8} ${scaleX(0) + 4},${margin}`} fill="#333" />

                    {/* 라벨 */}
                    {axes.showOrigin && <text x={scaleX(0) - 15} y={scaleY(0) + 15} fontSize="14" fontStyle="italic">O</text>}
                    <text x={width - margin + 15} y={scaleY(0) + 5} fontSize="14" fontStyle="italic">{axes.xLabel}</text>
                    <text x={scaleX(0) - 5} y={margin - 15} fontSize="14" fontStyle="italic" textAnchor="middle">{axes.yLabel}</text>

                    {/* 함수 그래프 */}
                    {functions.filter(f => f.visible).map(f => (
                        <path
                            key={f.id}
                            d={generatePath(f.expression)}
                            stroke={f.color}
                            strokeWidth="2"
                            fill="none"
                        />
                    ))}
                </svg>
            </div>

            {/* 설정 영역 */}
            <div className={classes.settingsPanel}>
                <div className={classes.panelHeader}>
                    <h4>함수 그래프 식</h4>
                    <button className={classes.addBtn} onClick={addFunction}>+ 함수 추가</button>
                </div>

                <div className={classes.functionList}>
                    {functions.map((f, idx) => (
                        <div key={f.id} className={classes.functionItem}>
                            <div
                                className={classes.colorIndicator}
                                style={{ backgroundColor: f.color }}
                                onClick={() => updateFunction(f.id, { visible: !f.visible })}
                                title="클릭하여 숨기기/보이기"
                            />
                            <span className={classes.fLabel}>f_{idx + 1}(x) =</span>
                            <input
                                type="text"
                                value={f.expression}
                                onChange={(e) => updateFunction(f.id, { expression: e.target.value })}
                                className={classes.exprInput}
                                placeholder="예: x^2 - 2*x + 1"
                            />
                            <button className={classes.delBtn} onClick={() => deleteFunction(f.id)}>✕</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GraphBlock;
