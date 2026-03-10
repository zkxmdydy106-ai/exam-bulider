import type { Question } from '../store/usePaperStore';

/**
 * 상태 JSON을 HWP 호환 HTML Document로 파싱하여 클립보드에 주입하는 유틸리티
 */
export const copyToHWP = async (title: string, questions: Question[]) => {
    try {
        const htmlString = generatePlatformHTML(title, questions);

        const blobHtml = new Blob([htmlString], { type: 'text/html' });
        const blobText = new Blob(['HWP로 붙여넣기 하세요.'], { type: 'text/plain' });

        const clipboardItem = new ClipboardItem({
            'text/html': blobHtml,
            'text/plain': blobText,
        });

        await navigator.clipboard.write([clipboardItem]);
        alert('시험지가 클립보드에 복사되었습니다. 한글(HWP)에서 Ctrl+V 로 붙여넣으세요.');
    } catch (err) {
        console.error('클립보드 복사 실패:', err);
        alert('클립보드 복사에 실패했습니다.');
    }
};

const generatePlatformHTML = (title: string, questions: Question[]) => {
    // HWP는 중첩된 최신 HTML보단, Flat 한 Table, p, span, basic inline style을 잘 인식함.
    let html = `
    <div style="font-family: 'Batang', 'Malgun Gothic', sans-serif; max-width: 800px;">
      <h1 style="text-align: center; font-size: 24px; margin-bottom: 30px;">${title}</h1>
  `;

    questions.forEach((q, index) => {
        html += `
      <div style="margin-bottom: 30px; page-break-inside: avoid;">
        <table style="width: 100%; border-collapse: collapse; border: none;">
          <tr>
            <td style="width: 30px; vertical-align: top; padding-top: 5px; font-weight: bold; font-size: 16px;">
              ${index + 1}.
            </td>
            <td style="vertical-align: top; padding-top: 5px;">
    `;

        // 1. 블록 렌더링
        if (q.type === 'text') {
            let content = q.content || '';
            if (q.metadata?.autoItalic) {
                // 숫자/영문 자동 이탤릭 파싱 적용
                content = applyAutoItalic(content);
            }
            html += `<div style="font-size: 15px; line-height: 1.6; margin-bottom: 15px;">${content}</div>`;
        }
        else if (q.type === 'table' && q.tableData) {
            html += `<table style="width: 100%; border-collapse: collapse; border: 1px solid black; margin-bottom: 15px;">`;
            q.tableData.cells.forEach(row => {
                html += `<tr>`;
                row.forEach(cell => {
                    html += `<td style="border: 1px solid black; padding: 8px; text-align: center;">${cell}</td>`;
                });
                html += `</tr>`;
            });
            html += `</table>`;
        }
        else if (q.type === 'box-gnd' && q.boxList) {
            // HWP에서 박스는 table(1x1)로 표현해야 테두리가 유지됨
            html += `
        <table style="width: 100%; border-collapse: collapse; border: 1px solid black; margin-bottom: 15px; margin-top: 10px;">
          <tr>
            <td style="padding: 15px; text-align: center; font-weight: bold; font-family: serif; border-bottom: 1px dashed gray;">
              &lt;보 기&gt;
            </td>
          </tr>
          <tr>
            <td style="padding: 15px; line-height: 1.8;">
              ${q.boxList.map(item => `<div>${item}</div>`).join('')}
            </td>
          </tr>
        </table>
      `;
        }
        else if (q.type === 'image' && q.imageUrl) {
            html += `<div style="text-align: center; margin-bottom: 15px;"><img src="${q.imageUrl}" style="max-width: 100%; height: auto;" /></div>`;
        }

        // 2. 객관식 보기 렌더링
        if (q.options && q.options.length > 0) {
            html += `<div style="margin-top: 10px; font-size: 15px; display: flex; flex-wrap: wrap; gap: 15px;">`;
            q.options.forEach((opt, optIdx) => {
                const circleNum = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'][optIdx] || `(${optIdx + 1})`;
                // HWP에서 inline-block 속성을 잘 못먹는 경우가 있으므로 span으로 쭉 나열
                html += `<span style="margin-right: 20px; white-space: nowrap;">${circleNum} ${opt}</span>`;
            });
            html += `</div>`;
        }

        html += `
            </td>
          </tr>
        </table>
      </div>
    `;
    });

    html += `</div>`;
    return html;
};

// 숫자 및 영대소문자 정규식을 이용한 이탤릭 파싱
const applyAutoItalic = (htmlText: string) => {
    // HTML 태그 내부는 건드리면 안되므로 위험한 파싱이지만 MVP에서는 정규식을 약간 혼합사용
    // 완벽하려면 DOMParser를 사용해야 함
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        const walk = (node: Node) => {
            if (node.nodeType === 3) { // Text node
                const text = node.nodeValue || '';
                // 연속된 영문/숫자를 <i> 태그로 감싸기
                if (/[a-zA-Z0-9]+/.test(text)) {
                    const wrapper = document.createElement('span');
                    wrapper.innerHTML = text.replace(/([a-zA-Z0-9]+)/g, '<i>$1</i>');
                    node.parentNode?.replaceChild(wrapper, node);
                }
            } else {
                Array.from(node.childNodes).forEach(walk);
            }
        };

        Array.from(doc.body.childNodes).forEach(walk);
        return doc.body.innerHTML;
    } catch (e) {
        return htmlText;
    }
};
