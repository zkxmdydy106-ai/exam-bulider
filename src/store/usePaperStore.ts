import { create } from 'zustand';

export type BlockType = 'text' | 'table' | 'box-gnd' | 'image' | 'graph';

export interface BaseBlock {
  blockId: string;
  type: BlockType;
}

export interface TextBlockData extends BaseBlock {
  type: 'text';
  content: string;
}

export interface TableBlockData extends BaseBlock {
  type: 'table';
  tableData: {
    rows: number;
    cols: number;
    cells: string[][];
  };
}

export interface BoxGndBlockData extends BaseBlock {
  type: 'box-gnd';
  boxList: string[];
}

export interface ImageBlockData extends BaseBlock {
  type: 'image';
  imageUrl?: string;
}

export interface GraphBlockData extends BaseBlock {
  type: 'graph';
  graphData: {
    axes: { xLabel: string; yLabel: string; showOrigin: boolean; domain: [number, number]; range: [number, number] };
    functions: Array<{ id: string; expression: string; color: string; visible: boolean }>;
    pointLabels: Array<{ id: string; x: number; y: number; label: string; type: string }>;
  };
}

export type Block = TextBlockData | TableBlockData | BoxGndBlockData | ImageBlockData | GraphBlockData;

export type QuestionType = 'text' | 'table' | 'box-gnd' | 'image' | 'math-mixed' | 'graph';

export interface Question {
  id: string;
  type: QuestionType;
  blocks: Block[];
  options: string[];

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
  updateBlock: (questionId: string, blockId: string, updates: Partial<Block>) => void;
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
    const initialBlocks: Block[] = [];

    // Default text block is always added
    initialBlocks.push({
      blockId: `b_text_${Math.random().toString(36).substring(2, 9)}`,
      type: 'text',
      content: type === 'text' ? '<p>문항 내용을 입력하세요.</p>' : ''
    });

    if (type === 'table') {
      initialBlocks.push({
        blockId: `b_table_${Math.random().toString(36).substring(2, 9)}`,
        type: 'table',
        tableData: { rows: 3, cols: 3, cells: [['', '', ''], ['', '', ''], ['', '', '']] }
      });
    } else if (type === 'box-gnd') {
      initialBlocks.push({
        blockId: `b_box_${Math.random().toString(36).substring(2, 9)}`,
        type: 'box-gnd',
        boxList: ['ㄱ. ', 'ㄴ. ', 'ㄷ. ']
      });
    } else if (type === 'image') {
      initialBlocks.push({
        blockId: `b_image_${Math.random().toString(36).substring(2, 9)}`,
        type: 'image',
        imageUrl: ''
      });
    }

    const newQuestion: Question = {
      id: generateId(),
      type,
      blocks: initialBlocks,
      options: ['보기 1', '보기 2', '보기 3', '보기 4', '보기 5'],
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

  updateBlock: (questionId, blockId, updates) => set((state) => ({
    questions: state.questions.map((q) => {
      if (q.id === questionId) {
        return {
          ...q,
          blocks: q.blocks.map(b => b.blockId === blockId ? { ...b, ...updates } as Block : b)
        };
      }
      return q;
    })
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
