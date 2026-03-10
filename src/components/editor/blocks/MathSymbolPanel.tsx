import React from 'react';
import classes from './MathSymbolPanel.module.css';

const SYMBOLS = {
    common: ['±', '∓', '=', '≠', '<', '>', '≤', '≥', '∞', '∴', '∵'],
    set: ['∈', '∉', '⊂', '⊆', '∪', '∩', '∅', '∀', '∃'],
};

const TEMPLATES = [
    {
        label: '분수 (Fraction)',
        html: '<span class="math-fraction" style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 2px;"><span class="num" style="border-bottom:1px solid currentColor;padding:0 2px;font-size:0.9em;line-height:1;">분자</span><span class="den" style="padding:0 2px;font-size:0.9em;line-height:1;">분모</span></span>&nbsp;',
    },
    {
        label: '극한 (Limit)',
        html: '<span class="math-lim" style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 2px;"><span class="lim-text" style="font-size:1em;line-height:1;">lim</span><span class="lim-sub" style="font-size:0.7em;line-height:1;">n→∞</span></span>&nbsp;',
    },
];

const MathSymbolPanel: React.FC = () => {
    const handleInsertText = (e: React.MouseEvent, text: string) => {
        e.preventDefault(); // Prevent losing focus from the active text editor
        document.execCommand('insertText', false, text);
    };

    const handleInsertHTML = (e: React.MouseEvent, html: string) => {
        e.preventDefault();
        document.execCommand('insertHTML', false, html);
    };

    return (
        <div className={classes.panelContainer}>
            <div>
                <div className={classes.sectionTitle}>공통 기호</div>
                <div className={classes.symbolGrid}>
                    {SYMBOLS.common.map(sym => (
                        <button
                            key={sym}
                            className={classes.symbolBtn}
                            onMouseDown={(e) => handleInsertText(e, sym)}
                            title={sym}
                        >
                            {sym}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <div className={classes.sectionTitle}>집합/명제</div>
                <div className={classes.symbolGrid}>
                    {SYMBOLS.set.map(sym => (
                        <button
                            key={sym}
                            className={classes.symbolBtn}
                            onMouseDown={(e) => handleInsertText(e, sym)}
                            title={sym}
                        >
                            {sym}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <div className={classes.sectionTitle}>자주 쓰는 템플릿</div>
                <div className={classes.templateGrid}>
                    {TEMPLATES.map(temp => (
                        <button
                            key={temp.label}
                            className={classes.templateBtn}
                            onMouseDown={(e) => handleInsertHTML(e, temp.html)}
                        >
                            {temp.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className={classes.hintText}>
                텍스트 상자를 클릭한 후 기호를 누르세요.
            </div>
        </div>
    );
};

export default MathSymbolPanel;
