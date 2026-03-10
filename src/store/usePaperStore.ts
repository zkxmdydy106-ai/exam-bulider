import { create } from 'zustand';

export type QuestionType = 'text' | 'table' | 'box-gnd' | 'image';

export interface Question {
  id: string;
  type: QuestionType;
  content?: string;
  options: string[];
  
  // Specific to table
  tableData?: {
    rows: number;
    cols: number;
    cells: string[][];
  };
  
  // Specific to box-gnd
  boxList?: string[];
  
  // Specific to image
  imageUrl?: string;
  
  // Metadata like auto-italic settings
  metadata?: {
    autoItalic?: boolean;
  };
}

interface PaperState {
  title: string;
  questions: Question[];
  activeQuestionId: string | null;
  
  // Actions
  setTitle: (title: string) => void;
  addQuestion: (type: QuestionType) => void;
  updateQuestion: (id: string, updates: Partial<Question>) => void;
  deleteQuestion: (id: string) => void;
  copyQuestion: (id: string) => void;
  setActiveQuestion: (id: string | null) => void;
  reorderQuestions: (startIndex: number, endIndex: number) => void;
}

const generateId = () => `q_${Math.random().toString(36).substring(2, 9)}`;

export const usePaperStore = create<PaperState>((set) => ({
  title: '새 시험지',
  questions: [],
  activeQuestionId: null,

  setTitle: (title) => set({ title }),

  addQuestion: (type) => set((state) => {
    const newQuestion: Question = {
      id: generateId(),
      type,
      options: ['보기 1', '보기 2', '보기 3', '보기 4', '보기 5'],
      content: type === 'text' ? '<p>문항 내용을 입력하세요.</p>' : '',
      boxList: type === 'box-gnd' ? ['ㄱ. ', 'ㄴ. ', 'ㄷ. '] : undefined,
      tableData: type === 'table' ? { rows: 2, cols: 2, cells: [['', ''], ['', '']] } : undefined,
    };
    return {
      questions: [...state.questions, newQuestion],
      activeQuestionId: newQuestion.id,
    };
  }),

  updateQuestion: (id, updates) => set((state) => ({
    questions: state.questions.map((q) => 
      q.id === id ? { ...q, ...updates } : q
    )
  })),

  deleteQuestion: (id) => set((state) => ({
    questions: state.questions.filter((q) => q.id !== id),
    activeQuestionId: state.activeQuestionId === id ? null : state.activeQuestionId
  })),

  copyQuestion: (id) => set((state) => {
    const targetIndex = state.questions.findIndex(q => q.id === id);
    if (targetIndex === -1) return state;
    
    const target = state.questions[targetIndex];
    const copied: Question = { ...target, id: generateId() };
    
    const newQuestions = [...state.questions];
    newQuestions.splice(targetIndex + 1, 0, copied);
    
    return { questions: newQuestions, activeQuestionId: copied.id };
  }),

  setActiveQuestion: (id) => set({ activeQuestionId: id }),

  reorderQuestions: (startIndex, endIndex) => set((state) => {
    const result = Array.from(state.questions);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return { questions: result };
  }),
}));
