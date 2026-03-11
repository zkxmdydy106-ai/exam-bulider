import React, { useState } from 'react';
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

    const handleGenerate = async () => {
        if (!localPrompt.trim()) return;

        const apiKey = localStorage.getItem('GEMINI_API_KEY');
        if (!apiKey) {
            onChange({
                ...blockData,
                status: 'error',
                errorMsg: 'API Key가 설정되어 있지 않습니다. 우람상단 [설정] 메뉴에서 Gemini API Key를 입력해 주세요.'
            });
            return;
        }

        onChange({ ...blockData, prompt: localPrompt, status: 'loading', errorMsg: '' });

        try {
            // Using gemini-2.5-flash as it is fast, free tier friendly, and good at coding SVG.
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        role: 'user',
                        parts: [{ text: `다음 수학/기하학적 요구사항을 만족하는 순수 SVG 코드를 작성해 줘. SVG 코드 이외에 마크다운 이나 다른 설명은 절대 출력하지 마. 배경은 투명(transparent)으로 해줘. 너비와 높이는 적절하게 viewbox를 줘.\n요구사항: ${localPrompt}` }]
                    }],
                    systemInstruction: {
                        parts: [{ text: "너는 전문가 수준의 기하학 도형 SVG 생성기야. 응답에는 오직 <svg>...</svg> 마크다운 블록이나 순수 문자열만 포함해야 해." }]
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

            // Extract SVG if the model wrap it in markdown ```xml or ```svg
            const svgMatch = textOutput.match(/<svg[\s\S]*?<\/svg>/);
            if (svgMatch) {
                textOutput = svgMatch[0];
            } else {
                throw new Error('응답에서 유효한 SVG 코드를 찾을 수 없습니다.');
            }

            onChange({ ...blockData, status: 'success', svgContent: textOutput });
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
                {(blockData.status === 'success' || blockData.svgContent) && (
                    <div
                        dangerouslySetInnerHTML={{ __html: blockData.svgContent }}
                        style={{ maxWidth: '100%', maxHeight: '400px', display: 'flex', justifyContent: 'center' }}
                    />
                )}
            </div>
        </div>
    );
};

export default AIGeneratorBlock;
