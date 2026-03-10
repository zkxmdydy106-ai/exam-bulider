import React, { useRef, useEffect } from 'react';
import classes from './TextBlock.module.css';
import { Bold, Italic, Underline, Sigma } from 'lucide-react';

const parseMath = (html: string) => {
    let result = html;
    // 1. 단축어 변환
    result = result.replace(/\bintegral\b/g, '∫');
    result = result.replace(/\bsum\b/g, '∑');
    result = result.replace(/\bpi\b/g, 'π');
    result = result.replace(/\btheta\b/g, 'θ');
    result = result.replace(/\balpha\b/g, 'α');
    result = result.replace(/\bbeta\b/g, 'β');
    result = result.replace(/\binfty\b/g, '∞');

    // 2. 위첨자 (예: x^2, y^10)
    result = result.replace(/([a-zA-Z0-9]+)\^([a-zA-Z0-9]+)/g, '$1<sup>$2</sup>');

    // 3. 아래첨자 (예: a_n, x_1)
    result = result.replace(/([a-zA-Z0-9]+)_([a-zA-Z0-9]+)/g, '$1<sub>$2</sub>');

    // 4. 분수 (예: 1/4, x/y) -> 가로줄 있는 형태
    result = result.replace(/([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)/g,
        '<span style="display: inline-flex; flex-direction: column; align-items: center; vertical-align: middle; font-size: 0.85em; line-height: 1.1; margin: 0 4px;"><span style="border-bottom: 1px solid; width: 100%; text-align: center;">$1</span><span>$2</span></span>'
    );

    return result;
};

interface TextBlockProps {
    content: string;
    onChange: (content: string) => void;
}

const TextBlock: React.FC<TextBlockProps> = ({ content, onChange }) => {
    const contentEditableRef = useRef<HTMLDivElement>(null);

    // Initialize content only once to avoid cursor jumping
    useEffect(() => {
        if (contentEditableRef.current && contentEditableRef.current.innerHTML !== content) {
            // Only set HTML if it's completely empty to initialize, otherwise we let the DOM handle state
            // to not break the user's cursor position.
            if (!contentEditableRef.current.innerHTML && content) {
                contentEditableRef.current.innerHTML = content;
            }
        }
    }, [content]);

    const handleInput = () => {
        if (contentEditableRef.current) {
            onChange(contentEditableRef.current.innerHTML);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Ctrl+M for Math Italic mode
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
            e.preventDefault();
            document.execCommand('italic', false, '');
            handleInput();
        }
    };

    const handleBlur = () => {
        if (contentEditableRef.current) {
            const parsed = parseMath(contentEditableRef.current.innerHTML);
            if (parsed !== contentEditableRef.current.innerHTML) {
                contentEditableRef.current.innerHTML = parsed;
                onChange(parsed);
            } else {
                handleInput();
            }
        }
    };

    const handleFormat = (command: string) => {
        document.execCommand(command, false, '');
        contentEditableRef.current?.focus();
        handleInput();
    };

    return (
        <div className={classes.textBlockContainer}>
            <div className={classes.toolbar}>
                <div className={classes.formatGroup}>
                    <button onMouseDown={(e) => { e.preventDefault(); handleFormat('bold'); }} className={classes.formatBtn} title="굵게"><Bold size={16} /></button>
                    <button onMouseDown={(e) => { e.preventDefault(); handleFormat('italic'); }} className={classes.formatBtn} title="기울임"><Italic size={16} /></button>
                    <button onMouseDown={(e) => { e.preventDefault(); handleFormat('underline'); }} className={classes.formatBtn} title="밑줄"><Underline size={16} /></button>
                </div>
                <div className={classes.formatGroup}>
                    <button
                        onMouseDown={(e) => {
                            e.preventDefault();
                            if (contentEditableRef.current) {
                                const parsed = parseMath(contentEditableRef.current.innerHTML);
                                contentEditableRef.current.innerHTML = parsed;
                                onChange(parsed);
                            }
                        }}
                        className={classes.actionBtn}
                        title="수식/단축어 자동 변환 (y^2, a_n, 1/4, integral, sum 등)"
                    >
                        <Sigma size={16} /> 수식 변환
                    </button>
                    <span className={classes.shortcutHint}>y^2, a_n, 1/4, integral</span>
                </div>
                <div className={classes.formatGroup}>
                    <span className={classes.shortcutHint} style={{ marginLeft: '8px', color: '#1971c2', fontWeight: 600 }}>Ctrl+M: 영문/숫자 이탤릭(수학) 전환</span>
                </div>
            </div>
            <div
                ref={contentEditableRef}
                className={classes.editorArea}
                contentEditable
                onBlur={handleBlur}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                suppressContentEditableWarning
                data-placeholder="문제를 입력하세요... (수식 로마자는 Ctrl+M 토글)"
            />
        </div>
    );
};

export default TextBlock;
