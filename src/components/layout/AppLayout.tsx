import React from 'react';
import { usePaperStore } from '../../store/usePaperStore';
import { copyToHWP } from '../../utils/clipboardExport';
import classes from './AppLayout.module.css';
import { FileDown, Settings, Plus, Copy, Trash, GripVertical, FileText } from 'lucide-react';

const AppLayout: React.FC = () => {
    const { title, questions, activeQuestionId, addQuestion, setActiveQuestion, deleteQuestion } = usePaperStore();

    return (
        <div className={classes.appContainer}>
            {/* Header */}
            <header className={classes.header}>
                <div className={classes.headerTitle}>
                    <FileText className={classes.headerIcon} />
                    <h1>{title}</h1>
                </div>
                <div className={classes.headerActions}>
                    <button className={classes.btnSecondary}><Settings size={18} /> 설정</button>
                    <button className={classes.btnPrimary} onClick={() => copyToHWP(title, questions)}>
                        <FileDown size={18} /> 전체 복사 (HWP)
                    </button>
                </div>
            </header>

            <main className={classes.mainContent}>
                {/* Left Sidebar - Thumbnails */}
                <aside className={classes.sidebarLeft}>
                    <div className={classes.sidebarHeader}>
                        <h3>문항 목록</h3>
                        <span className={classes.badge}>{questions.length}</span>
                    </div>

                    <div className={classes.thumbnailList}>
                        {questions.map((q, index) => (
                            <div
                                key={q.id}
                                className={`${classes.thumbnailItem} ${activeQuestionId === q.id ? classes.active : ''}`}
                                onClick={() => setActiveQuestion(q.id)}
                            >
                                <div className={classes.dragHandle}><GripVertical size={14} /></div>
                                <div className={classes.thumbnailNo}>{index + 1}</div>
                                <div className={classes.thumbnailPreview}>
                                    {q.type === 'text' && '텍스트 문항'}
                                    {q.type === 'table' && '표 문항'}
                                    {q.type === 'box-gnd' && 'ㄱㄴㄷ 문항'}
                                    {q.type === 'image' && '이미지 문항'}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={classes.addActions}>
                        <button className={classes.addBtn} onClick={() => addQuestion('text')}><Plus size={16} /> 기본 추가</button>
                    </div>
                </aside>

                {/* Center Canvas - Editor */}
                <section className={classes.editorCanvas}>
                    {activeQuestionId ? (
                        <div className={classes.paperPlaceholder}>
                            {/* This is a temporary placeholder before EditorCanvas component is created */}
                            <h2>에디터 캔버스 ({activeQuestionId})</h2>
                            <p>여기에 선택된 문항 편집 폼이 랜더링됩니다.</p>
                        </div>
                    ) : (
                        <div className={classes.emptyState}>
                            <Plus size={48} className={classes.emptyIcon} />
                            <h2>문항을 선택하거나 새로 추가하세요</h2>
                            <p>좌측 패널에서 문항을 추가해 시험지 작성을 시작하세요.</p>
                        </div>
                    )}
                </section>

                {/* Right Sidebar - Properties/Export */}
                <aside className={classes.sidebarRight}>
                    <div className={classes.sidebarHeader}>
                        <h3>속성 패널</h3>
                    </div>
                    <div className={classes.panelContent}>
                        {activeQuestionId ? (
                            <div className={classes.propertiesGroup}>
                                <label>선택 문항 번호: {questions.findIndex(q => q.id === activeQuestionId) + 1}</label>
                                <button className={classes.actionBtn}><Copy size={16} /> 현재 문항 복제</button>
                                <button
                                    className={`${classes.actionBtn} ${classes.danger}`}
                                    onClick={() => deleteQuestion(activeQuestionId)}
                                >
                                    <Trash size={16} /> 삭제
                                </button>
                            </div>
                        ) : (
                            <p className={classes.muted}>문항을 선택하면 속성이 표시됩니다.</p>
                        )}
                    </div>
                </aside>
            </main>
        </div>
    );
};

export default AppLayout;
