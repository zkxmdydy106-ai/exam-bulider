import React from 'react';
import classes from './BoxGndBlock.module.css';
import { Plus, X } from 'lucide-react';

interface BoxGndBlockProps {
    boxList: string[];
    onChange: (boxList: string[]) => void;
}

const BoxGndBlock: React.FC<BoxGndBlockProps> = ({ boxList, onChange }) => {
    const handleItemChange = (index: number, value: string) => {
        const newList = [...boxList];
        newList[index] = value;
        onChange(newList);
    };

    const handleAddItem = () => {
        const prefixes = ['ㄱ. ', 'ㄴ. ', 'ㄷ. ', 'ㄹ. ', 'ㅁ. ', 'ㅂ. '];
        const prefix = prefixes[boxList.length] || '';
        onChange([...boxList, prefix]);
    };

    const handleRemoveItem = (index: number) => {
        const newList = boxList.filter((_, i) => i !== index);
        onChange(newList);
    };

    return (
        <div className={classes.boxWrapper}>
            <div className={classes.boxInternal}>
                <div className={classes.boxPrompt}>&lt;보 기&gt;</div>
                <div className={classes.listContainer}>
                    {boxList.map((item, index) => (
                        <div key={index} className={classes.listItem}>
                            <input
                                type="text"
                                className={classes.itemInput}
                                value={item}
                                onChange={(e) => handleItemChange(index, e.target.value)}
                                placeholder="내용을 입력하세요"
                            />
                            <button
                                className={classes.removeBtn}
                                onClick={() => handleRemoveItem(index)}
                                title="항목 삭제"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>

                {boxList.length < 6 && (
                    <button className={classes.addBtn} onClick={handleAddItem}>
                        <Plus size={14} /> 항목 추가
                    </button>
                )}
            </div>
        </div>
    );
};

export default BoxGndBlock;
