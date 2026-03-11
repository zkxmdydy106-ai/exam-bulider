// Utility functions for text formatting

export const applyAutoItalic = (htmlText: string) => {
    if (!htmlText) return '';
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        const walk = (node: Node) => {
            // 텍스트 노드인 경우에만 치환 수행
            if (node.nodeType === 3) {
                const text = node.nodeValue || '';
                if (!text.trim()) return;

                const parent = node.parentNode as HTMLElement;
                const parentName = parent?.nodeName;

                // 1) 부모가 이미 수식, i, em 등이면 처리
                if (parentName && ['I', 'EM', 'SUB', 'SUP', 'OBJECT'].includes(parentName)) {
                    if (['I', 'EM'].includes(parentName)) {
                        // 복붙 시 폰트 복구
                        if (parent.style.fontFamily !== "'Times New Roman', serif") {
                            parent.style.fontFamily = "'Times New Roman', serif";
                        }
                        // 한글 이탤릭 방지
                        if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text)) {
                            const wrapper = document.createElement('span');
                            const replaced = text.replace(/([ㄱ-ㅎ|ㅏ-ㅣ|가-힣]+(?:[ \t]+[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]+)*)/g, '<span style="font-style: normal; font-family: \'Malgun Gothic\', sans-serif;">$1</span>');
                            if (replaced !== text) {
                                wrapper.innerHTML = replaced;
                                parent.replaceChild(wrapper, node);
                            }
                        }
                    }
                    return;
                }

                if (/[a-zA-Z0-9]+/.test(text)) {
                    const wrapper = document.createElement('span');
                    // 숫자와 영어 매칭 (한글 제외)
                    const replaced = text.replace(/([a-zA-Z0-9]+)/g, (match) => {
                        const eqStr = match.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        return `<i style="font-family: 'Times New Roman', serif;">${eqStr}</i>`;
                    });

                    if (replaced !== text) {
                        wrapper.innerHTML = replaced;
                        parent?.replaceChild(wrapper, node);
                    }
                }
            } else {
                if (node instanceof HTMLElement && (node.className.includes('math-fraction') || node.className.includes('math-lim'))) {
                    // 복잡한 템플릿의 경우 텍스트 치환에서 제외
                    return;
                }
                Array.from(node.childNodes).forEach(walk);
            }
        };

        Array.from(doc.body.childNodes).forEach(walk);
        return doc.body.innerHTML;
    } catch (e) {
        return htmlText;
    }
};
