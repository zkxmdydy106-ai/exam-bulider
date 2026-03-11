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
                if (/[a-zA-Z0-9]+/.test(text)) {
                    // 부모가 이미 수식, i, em 등이면 건너뜀
                    if (node.parentNode && ['I', 'EM', 'SUB', 'SUP', 'OBJECT'].includes(node.parentNode.nodeName)) {
                        return;
                    }

                    const wrapper = document.createElement('span');
                    // 숫자와 영어 매칭 (한글 제외)
                    const replaced = text.replace(/([a-zA-Z0-9]+)/g, (match) => {
                        // HWP 수식 스크립트용 문자열 변환 (간단한 처리)
                        const eqStr = match.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

                        // HWP 수식 객체 HTML 마크업 모방 (이탤릭체 스타일 폴백 포함)
                        return `<i style="font-family: 'Times New Roman', serif;">${eqStr}</i>`;
                    });

                    if (replaced !== text) {
                        wrapper.innerHTML = replaced;
                        node.parentNode?.replaceChild(wrapper, node);
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
