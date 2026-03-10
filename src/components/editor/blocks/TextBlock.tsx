import React, { useRef, useEffect } from 'react';
import classes from './TextBlock.module.css';
import { Bold, Italic, Underline } from 'lucide-react';

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

    const handleFormat = (command: string) => {
        document.execCommand(command, false, '');
        contentEditableRef.current?.focus();
        handleInput();
    };

    return (
        <div className={classes.textBlockContainer}>
            <div className={classes.toolbar}>
                <button onMouseDown={(e) => { e.preventDefault(); handleFormat('bold'); }} className={classes.formatBtn} title="굵게"><Bold size={16} /></button>
                <button onMouseDown={(e) => { e.preventDefault(); handleFormat('italic'); }} className={classes.formatBtn} title="기울임"><Italic size={16} /></button>
                <button onMouseDown={(e) => { e.preventDefault(); handleFormat('underline'); }} className={classes.formatBtn} title="밑줄"><Underline size={16} /></button>
            </div>
            <div
                ref={contentEditableRef}
                className={classes.editorArea}
                contentEditable
                onBlur={handleInput}
                onInput={handleInput}
                suppressContentEditableWarning
                data-placeholder="문제를 입력하세요..."
            />
        </div>
    );
};

export default TextBlock;
