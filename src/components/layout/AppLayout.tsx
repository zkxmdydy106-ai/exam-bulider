import React, { useState, useEffect } from 'react';
import { usePaperStore } from '../../store/usePaperStore';
import { copyToHWP, copySingleToHWP } from '../../utils/clipboardExport';
import classes from './AppLayout.module.css';
import modalClasses from './AppLayout.modal.module.css';
import EditorCanvas from '../editor/EditorCanvas';
import MathSymbolPanel from '../editor/blocks/MathSymbolPanel';
import { FileDown, Settings, Plus, Copy, Trash, GripVertical, FileText } from 'lucide-react';

const AppLayout: React.FC = () => {
    const { title, questions, activeQuestionId, addQuestion, setActiveQuestion, deleteQuestion, copyQuestion, reorderQuestions } = usePaperStore();

    // Drag and Drop State
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // Settings Modal State
    const [showSettings, setShowSettings] = useState(false);
    const [apiKey, setApiKey] = useState('');

    useEffect(() => {
        setApiKey(localStorage.getItem('GEMINI_API_KEY') || '');

        // 1. 초기 로드 시 자동저장 데이터 복원
        const savedData = localStorage.getItem('MATH_PAPER_AUTOSAVE');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                usePaperStore.setState({
                    title: parsed.title,
                    questions: parsed.questions,
                    activeQuestionId: parsed.activeQuestionId
                });
            } catch (e) {
                console.error('Failed to parse autosave data', e);
            }
        }

        // 2. 50초 주기(Debounce) 자동 저장
        let timeoutId: number;
        const unsubscribe = usePaperStore.subscribe((state) => {
            clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => {
                localStorage.setItem('MATH_PAPER_AUTOSAVE', JSON.stringify({
                    title: state.title,
                    questions: state.questions,
                    activeQuestionId: state.activeQuestionId
                }));
            }, 50000); // 50 seconds debounce
        });

        return () => {
            clearTimeout(timeoutId);
            unsubscribe();
        };
    }, []);

    const handleSaveSettings = () => {
        localStorage.setItem('GEMINI_API_KEY', apiKey);
        setShowSettings(false);
        alert('설정이 저장되었습니다.');
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        // HTML5 drag image can be customized here if needed
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === dropIndex) return;
        reorderQuestions(draggedIndex, dropIndex);
        setDraggedIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    return (
        <div className={classes.appContainer}>
            {/* Header */}
            <header className={classes.header}>
                <div className={classes.headerTitle}>
                    <FileText className={classes.headerIcon} />
                    <h1>{title}</h1>
                </div>
                <div className={classes.headerActions}>
                    <button className={classes.btnSecondary} onClick={() => setShowSettings(true)}>
                        <Settings size={18} /> 설정
                    </button>
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
                                className={`${classes.thumbnailItem} ${activeQuestionId === q.id ? classes.active : ''} ${draggedIndex === index ? classes.dragging : ''}`}
                                onClick={() => setActiveQuestion(q.id)}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, index)}
                                onDragEnd={handleDragEnd}
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
                        <EditorCanvas />
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
                                <button className={classes.actionBtn} onClick={() => copyQuestion(activeQuestionId)}>
                                    <Copy size={16} /> 현재 문항 복제 (목록에)
                                </button>
                                <button className={classes.actionBtn} onClick={() => {
                                    const q = questions.find(q => q.id === activeQuestionId);
                                    if (q) copySingleToHWP(q, questions.findIndex(q => q.id === activeQuestionId));
                                }}>
                                    <FileDown size={16} /> 현재 문항 복사 (HWP 클립보드)
                                </button>
                                <button
                                    className={`${classes.actionBtn} ${classes.danger}`}
                                    onClick={() => deleteQuestion(activeQuestionId)}
                                >
                                    <Trash size={16} /> 삭제
                                </button>

                                <div style={{ marginTop: '16px' }}>
                                    <MathSymbolPanel />
                                </div>
                            </div>
                        ) : (
                            <p className={classes.muted}>문항을 선택하면 속성이 표시됩니다.</p>
                        )}
                    </div>
                </aside>
            </main>

            {/* Settings Modal */}
            {showSettings && (
                <div className={modalClasses.modalOverlay}>
                    <div className={modalClasses.modalContent}>
                        <h2>환경 설정</h2>
                        <div className={modalClasses.formGroup}>
                            <label>Gemini API Key</label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="생성된 API 키 입력"
                            />
                            <p className={modalClasses.helpText}>AI 도형 기능을 사용하려면 Google AI Studio에서 발급받은 무료 API 키를 입력하세요. 앱의 비용 절감을 위해 브라우저 내부(로컬스토리지)에만 안전하게 보관됩니다.</p>
                        </div>
                        <div className={modalClasses.modalActions}>
                            <button className={classes.btnSecondary} onClick={() => {
                                setApiKey(localStorage.getItem('GEMINI_API_KEY') || '');
                                setShowSettings(false);
                            }}>취소</button>
                            <button className={classes.btnPrimary} onClick={handleSaveSettings}>저장</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppLayout;
