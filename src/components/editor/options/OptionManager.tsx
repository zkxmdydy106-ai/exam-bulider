import React from 'react';
import classes from './OptionManager.module.css';
import { Plus, X } from 'lucide-react';

interface OptionManagerProps {
    options: string[];
    onChange: (options: string[]) => void;
}

const OptionManager: React.FC<OptionManagerProps> = ({ options, onChange }) => {
    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        onChange(newOptions);
    };

    const handleAddOption = () => {
        onChange([...options, `보기 ${options.length + 1}`]);
    };

    const handleRemoveOption = (index: number) => {
        const newOptions = options.filter((_, i) => i !== index);
        onChange(newOptions);
    };

    return (
        <div className={classes.optionsContainer}>
            <h4 className={classes.optionsTitle}>객관식 보기</h4>

            <div className={classes.optionsList}>
                {options.map((opt, index) => (
                    <div key={index} className={classes.optionItem}>
                        <div className={classes.optionNumber}>
                            {/* Using circled numbers ① ② ③ ④ ⑤ for typical korean exams */}
                            {['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'][index] || `(${index + 1})`}
                        </div>
                        <input
                            type="text"
                            className={classes.optionInput}
                            value={opt}
                            onChange={(e) => handleOptionChange(index, e.target.value)}
                            placeholder="보기 내용을 입력하세요"
                        />
                        <button
                            className={classes.removeBtn}
                            onClick={() => handleRemoveOption(index)}
                            title="보기 삭제"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {options.length < 8 && (
                <button className={classes.addBtn} onClick={handleAddOption}>
                    <Plus size={16} /> 보기 추가
                </button>
            )}
        </div>
    );
};

export default OptionManager;
