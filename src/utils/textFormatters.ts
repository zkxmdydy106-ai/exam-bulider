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
                        if (parent.style.fontFamily !== "'Cambria Math', 'Times New Roman', serif") {
                            parent.style.fontFamily = "'Cambria Math', 'Times New Roman', serif";
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

                if (/[a-zA-Z0-9+\-=<>]+/.test(text)) {
                    const wrapper = document.createElement('span');
                    
                    // 연산자 양옆에 얇은 공백(Thin Space) 추가하여 수식 가독성 향상 (HWP 폰트 매칭)
                    // (이미 공백이 있는 경우에는 중복 추가하지 않음)
                    let formattedText = text;
                    formattedText = formattedText.replace(/([^\s])([+\-=<>])([^\s])/g, '$1\u2009$2\u2009$3');
                    formattedText = formattedText.replace(/([^\s])([+\-=<>])\s/g, '$1\u2009$2 ');
                    formattedText = formattedText.replace(/\s([+\-=<>])([^\s])/g, ' $1\u2009$2');

                    // 숫자와 영어 매칭 (한글 제외)
                    const replaced = formattedText.replace(/([a-zA-Z0-9]+)/g, (match) => {
                        const eqStr = match.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        return `<i style="font-family: 'Cambria Math', 'Times New Roman', serif;">${eqStr}</i>`;
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
