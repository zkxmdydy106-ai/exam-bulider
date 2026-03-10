import React from 'react';
import type { Question } from '../../store/usePaperStore';
import { usePaperStore } from '../../store/usePaperStore';
import classes from './EditorCanvas.module.css';
import TextBlock from './blocks/TextBlock';
import TableBlock from './blocks/TableBlock';
import BoxGndBlock from './blocks/BoxGndBlock';
import DrawingBlock from './blocks/DrawingBlock';
import OptionManager from './options/OptionManager';

const EditorCanvas: React.FC = () => {
    const { questions, activeQuestionId, updateQuestion } = usePaperStore();
    const activeQuestion = questions.find((q: Question) => q.id === activeQuestionId);

    if (!activeQuestion) return null;

    return (
        <div className={classes.canvasWrapper}>
            <div className={classes.questionHeader}>
                <div className={classes.questionTabs}>
                    {(['text', 'table', 'box-gnd', 'image'] as const).map(type => (
                        <button
                            key={type}
                            className={`${classes.tabBtn} ${activeQuestion.type === type ? classes.activeTab : ''}`}
                            onClick={() => updateQuestion(activeQuestion.id, { type })}
                        >
                            {type === 'text' && '기본 텍스트'}
                            {type === 'table' && '표 포함'}
                            {type === 'box-gnd' && 'ㄱ/ㄴ/ㄷ 조합'}
                            {type === 'image' && '이미지/도형'}
                        </button>
                    ))}
                </div>
                <div className={classes.questionTools}>
                    <button
                        className={`${classes.toolBtn} ${activeQuestion.metadata?.autoItalic ? classes.active : ''}`}
                        onClick={() => updateQuestion(activeQuestion.id, {
                            metadata: { ...activeQuestion.metadata, autoItalic: !activeQuestion.metadata?.autoItalic }
                        })}
                        title="영문/숫자 자동 이탤릭 (작성 완료 후 적용)"
                    >
                        <i>I</i>
                    </button>
                </div>
            </div>

            <div className={classes.questionBody}>
                <div className={classes.questionNumberArea}>
                    <span className={classes.questionNumber}>
                        {questions.findIndex((q: Question) => q.id === activeQuestion.id) + 1}.
                    </span>
                </div>

                <div className={classes.questionContentArea}>
                    {/* 동적 블록 렌더링 */}
                    {activeQuestion.type === 'text' && (
                        <TextBlock
                            content={activeQuestion.content || ''}
                            onChange={(content) => updateQuestion(activeQuestion.id, { content })}
                        />
                    )}

                    {activeQuestion.type === 'table' && activeQuestion.tableData && (
                        <TableBlock
                            tableData={activeQuestion.tableData}
                            onChange={(tableData) => updateQuestion(activeQuestion.id, { tableData })}
                        />
                    )}

                    {activeQuestion.type === 'box-gnd' && activeQuestion.boxList && (
                        <BoxGndBlock
                            boxList={activeQuestion.boxList}
                            onChange={(boxList) => updateQuestion(activeQuestion.id, { boxList })}
                        />
                    )}

                    {activeQuestion.type === 'image' && (
                        <DrawingBlock
                            imageUrl={activeQuestion.imageUrl}
                            onChange={(imageUrl) => updateQuestion(activeQuestion.id, { imageUrl })}
                        />
                    )}

                    {/* 객관식 보기 영역 */}
                    <div className={classes.optionsArea}>
                        <OptionManager
                            options={activeQuestion.options}
                            onChange={(options) => updateQuestion(activeQuestion.id, { options })}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditorCanvas;
