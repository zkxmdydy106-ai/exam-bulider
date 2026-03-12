import React, { useState, useRef, useEffect } from 'react';
import classes from './AIGeneratorBlock.module.css';
import { Sparkles } from 'lucide-react';

interface AIGeneratorBlockProps {
    blockData: {
        blockId: string;
        prompt: string;
        svgContent: string;
        status: 'idle' | 'loading' | 'success' | 'error';
        errorMsg?: string;
    };
    onChange: (data: any) => void;
}

const AIGeneratorBlock: React.FC<AIGeneratorBlockProps> = ({ blockData, onChange }) => {
    const [localPrompt, setLocalPrompt] = useState(blockData.prompt || '');
    // SVG 렌더링용 ref — dangerouslySetInnerHTML 대신 직접 DOM에 삽입하여 확실하게 화면에 표시
    const svgContainerRef = useRef<HTMLDivElement>(null);

    // svgContent가 변경될 때마다 직접 DOM에 삽입
    useEffect(() => {
        if (svgContainerRef.current && blockData.svgContent) {
            svgContainerRef.current.innerHTML = blockData.svgContent;
            // 삽입된 SVG 엘리먼트의 크기를 강제로 확보
            const svgEl = svgContainerRef.current.querySelector('svg');
            if (svgEl) {
                // width/height가 없거나 0이면 기본값 부여
                if (!svgEl.getAttribute('width') || svgEl.getAttribute('width') === '0') {
                    svgEl.setAttribute('width', '100%');
                }
                if (!svgEl.getAttribute('height') || svgEl.getAttribute('height') === '0') {
                    svgEl.setAttribute('height', 'auto');
                }
                // viewBox가 없으면 naturalWidth 기반으로 하나 만들기
                if (!svgEl.getAttribute('viewBox')) {
                    svgEl.setAttribute('viewBox', '0 0 400 300');
                }
                // display block으로 강제하여 높이가 0이 되지 않게
                svgEl.style.display = 'block';
                svgEl.style.maxWidth = '100%';
                svgEl.style.height = 'auto';
            }
        }
    }, [blockData.svgContent]);

    const handleGenerate = async () => {
        if (!localPrompt.trim()) return;

        const apiKey = localStorage.getItem('GEMINI_API_KEY');
        if (!apiKey) {
            onChange({
                ...blockData,
                status: 'error',
                errorMsg: 'API Key가 설정되어 있지 않습니다. 우측상단 [설정] 메뉴에서 Gemini API Key를 입력해 주세요.'
            });
            return;
        }

        onChange({ ...blockData, prompt: localPrompt, status: 'loading', errorMsg: '' });

        try {
            // Gemini 2.5 Flash — 빠르고 무료 티어에 적합
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        role: 'user',
                        parts: [{ text: `다음 수학/기하학적 요구사항을 만족하는 순수 SVG 코드를 작성해 줘. SVG 코드 이외에 마크다운 이나 다른 설명은 절대 출력하지 마. 배경은 투명(transparent)으로 해줘. 반드시 viewBox 속성을 포함하고, width와 height는 pixel 단위로 적어줘 (예: width="400" height="300").\n요구사항: ${localPrompt}` }]
                    }],
                    systemInstruction: {
                        parts: [{ text: "너는 전문가 수준의 기하학 도형 SVG 생성기야. 응답에는 오직 <svg>...</svg> 순수 문자열만 포함해야 해. 마크다운 코드블록(```)도 쓰지 마." }]
                    },
                    generationConfig: {
                        temperature: 0.1
                    }
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || `API 호출 실패 (${response.status})`);
            }

            const data = await response.json();
            let textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            // SVG 코드 추출 (마크다운 코드블록 안에 있을 수도 있음)
            const svgMatch = textOutput.match(/<svg[\s\S]*?<\/svg>/);
            if (svgMatch) {
                textOutput = svgMatch[0];

                // width 속성이 아예 없으면 명시적 픽셀 크기 강제 삽입
                if (!textOutput.includes('width=')) {
                    textOutput = textOutput.replace('<svg', '<svg width="400" height="300"');
                }
                // viewBox가 없으면 기본 뷰박스 삽입
                if (!textOutput.includes('viewBox')) {
                    textOutput = textOutput.replace('<svg', '<svg viewBox="0 0 400 300"');
                }
                // xmlns가 없으면 추가 (Canvas 렌더링을 위해 필수)
                if (!textOutput.includes('xmlns=')) {
                    textOutput = textOutput.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
                }
                // 100% 같은 상대 크기는 픽셀로 교체
                textOutput = textOutput.replace(/width="100%"/g, 'width="400"');
                textOutput = textOutput.replace(/height="100%"/g, 'height="300"');
            } else {
                throw new Error('응답에서 유효한 SVG 코드를 찾을 수 없습니다.');
            }

            onChange({ ...blockData, status: 'success', svgContent: textOutput, prompt: localPrompt });
        } catch (error: any) {
            onChange({ ...blockData, status: 'error', errorMsg: error.message || '알 수 없는 오류가 발생했습니다.' });
        }
    };

    return (
        <div className={classes.container}>
            <div className={classes.header}>
                <div className={classes.title}>
                    <Sparkles size={18} /> AI 도형/에셋 생성기
                </div>
                {blockData.status === 'loading' && <span style={{ fontSize: '0.85rem', color: '#64748b' }}>생성 중...</span>}
            </div>

            <div className={classes.promptArea}>
                <input
                    type="text"
                    className={classes.input}
                    value={localPrompt}
                    onChange={(e) => setLocalPrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate(); }}
                    placeholder="프롬프트 예: 반지름이 5인 원에 내접하는 정육각형을 그리고 꼭짓점에 A, B, C 표시해줘"
                    disabled={blockData.status === 'loading'}
                />
                <button
                    className={classes.generateBtn}
                    onClick={handleGenerate}
                    disabled={blockData.status === 'loading' || !localPrompt.trim()}
                >
                    그리기
                </button>
            </div>

            {blockData.errorMsg && (
                <div className={classes.errorText}>
                    {blockData.errorMsg}
                </div>
            )}

            <div className={classes.canvasArea}>
                {blockData.status === 'idle' && !blockData.svgContent && (
                    <span className={classes.emptyText}>도형 요구사항을 프롬프트창에 입력하고 '그리기'를 누르세요.</span>
                )}
                {blockData.status === 'loading' && (
                    <span className={classes.emptyText}>AI가 SVG 코드를 계산하여 그리고 있습니다... (약 3~5초 소요)</span>
                )}
                {/* SVG 렌더링 영역: ref 기반으로 직접 DOM에 삽입 */}
                {(blockData.status === 'success' || blockData.svgContent) && (
                    <div
                        ref={svgContainerRef}
                        className={classes.svgRenderArea}
                    />
                )}
            </div>
        </div>
    );
};

export default AIGeneratorBlock;
