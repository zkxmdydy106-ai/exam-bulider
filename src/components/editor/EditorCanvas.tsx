import React from 'react';
import type { Question } from '../../store/usePaperStore';
import { usePaperStore } from '../../store/usePaperStore';
import classes from './EditorCanvas.module.css';
import TextBlock from './blocks/TextBlock';
import TableBlock from './blocks/TableBlock';
import BoxGndBlock from './blocks/BoxGndBlock';
import DrawingBlock from './blocks/DrawingBlock';
import GraphBlock from './blocks/GraphBlock';
import AIGeneratorBlock from './blocks/AIGeneratorBlock';
import OptionManager from './options/OptionManager';

const EditorCanvas: React.FC = () => {
    const { questions, activeQuestionId, updateQuestion, updateBlock } = usePaperStore();
    const activeQuestion = questions.find((q: Question) => q.id === activeQuestionId);

    if (!activeQuestion) return null;

    return (
        <div className={classes.canvasWrapper}>
            <div className={classes.questionHeader}>
                <div className={classes.questionTabs}>
                    {(['text', 'table', 'box-gnd', 'image', 'graph', 'ai-generator'] as const).map(type => (
                        <button
                            key={type}
                            className={`${classes.tabBtn} ${activeQuestion.type === type ? classes.activeTab : ''}`}
                            onClick={() => {
                                // If tab is clicked, replace the blocks completely to match the selected type
                                // to mimic "changing the question type" rather than appending infinitely.
                                // We always keep one text block as base.
                                const initialBlocks: any[] = [];

                                initialBlocks.push({
                                    blockId: `b_text_${Math.random().toString(36).substring(2, 9)}`,
                                    type: 'text',
                                    content: activeQuestion.blocks?.find(b => b.type === 'text')?.content || ''
                                });

                                if (type === 'table') {
                                    initialBlocks.push({ blockId: `b_table_${Math.random().toString(36).substring(2, 9)}`, type: 'table', tableData: { rows: 3, cols: 3, cells: [['', '', ''], ['', '', ''], ['', '', '']] } });
                                } else if (type === 'box-gnd') {
                                    initialBlocks.push({ blockId: `b_box_${Math.random().toString(36).substring(2, 9)}`, type: 'box-gnd', boxList: ['ㄱ. ', 'ㄴ. '] });
                                } else if (type === 'image') {
                                    initialBlocks.push({ blockId: `b_image_${Math.random().toString(36).substring(2, 9)}`, type: 'image', imageUrl: '' });
                                } else if (type === 'graph') {
                                    initialBlocks.push({
                                        blockId: `b_graph_${Math.random().toString(36).substring(2, 9)}`,
                                        type: 'graph',
                                        graphData: { axes: { xLabel: 'x', yLabel: 'y', showOrigin: true, domain: [-10, 10], range: [-10, 10] }, functions: [{ id: 'f1', expression: 'x^2', color: '#e03131', visible: true }], pointLabels: [] }
                                    });
                                } else if (type === 'ai-generator') {
                                    initialBlocks.push({
                                        blockId: `b_ai_${Math.random().toString(36).substring(2, 9)}`,
                                        type: 'ai-generator',
                                        prompt: '',
                                        svgContent: '',
                                        status: 'idle'
                                    });
                                }

                                updateQuestion(activeQuestion.id, { type, blocks: initialBlocks });
                            }}
                        >
                            {type === 'text' && '기본 텍스트'}
                            {type === 'table' && '표 포함'}
                            {type === 'box-gnd' && 'ㄱ/ㄴ/ㄷ 조합'}
                            {type === 'image' && '이미지/도형'}
                            {type === 'graph' && '수학/그래프'}
                            {type === 'ai-generator' && 'AI 도형 생성 (프롬프트)'}
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
                    {activeQuestion.blocks?.map((block) => {
                        if (block.type === 'text') {
                            return (
                                <TextBlock
                                    key={block.blockId}
                                    content={block.content}
                                    onChange={(content) => updateBlock(activeQuestion.id, block.blockId, { content })}
                                />
                            );
                        }
                        if (block.type === 'table') {
                            return (
                                <TableBlock
                                    key={block.blockId}
                                    tableData={block.tableData}
                                    onChange={(tableData) => updateBlock(activeQuestion.id, block.blockId, { tableData })}
                                />
                            );
                        }
                        if (block.type === 'box-gnd') {
                            return (
                                <BoxGndBlock
                                    key={block.blockId}
                                    boxList={block.boxList}
                                    onChange={(boxList) => updateBlock(activeQuestion.id, block.blockId, { boxList })}
                                />
                            );
                        }
                        if (block.type === 'image') {
                            return (
                                <DrawingBlock
                                    key={block.blockId}
                                    imageUrl={block.imageUrl}
                                    onChange={(imageUrl) => updateBlock(activeQuestion.id, block.blockId, { imageUrl })}
                                />
                            );
                        }
                        if (block.type === 'graph' && block.graphData) {
                            return (
                                <GraphBlock
                                    key={block.blockId}
                                    graphData={block.graphData}
                                    onChange={(graphData) => updateBlock(activeQuestion.id, block.blockId, { graphData })}
                                />
                            );
                        }
                        if (block.type === 'ai-generator') {
                            return (
                                <AIGeneratorBlock
                                    key={block.blockId}
                                    blockData={block as any}
                                    onChange={(data: any) => updateBlock(activeQuestion.id, block.blockId, data)}
                                />
                            );
                        }
                        return null;
                    })}

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
