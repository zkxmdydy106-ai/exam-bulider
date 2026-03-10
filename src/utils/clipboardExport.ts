import type { Question } from '../store/usePaperStore';

/**
 * 상태 JSON을 HWP 호환 HTML Document로 파싱하여 클립보드에 주입하는 유틸리티
 */
export const copyToHWP = async (title: string, questions: Question[]) => {
  try {
    const htmlString = generatePlatformHTML(title, questions);
    const plainText = generateFallbackText(questions);

    const blobHtml = new Blob([htmlString], { type: 'text/html' });
    const blobText = new Blob([plainText], { type: 'text/plain' });

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

/**
 * 단일 문항을 HWP 클립보드에 복사
 */
export const copySingleToHWP = async (question: Question, index: number) => {
  try {
    // 단일 문항용 HTML 구조 생성 (타이틀 제외, 하나의 문항만)
    const htmlString = generatePlatformHTML('', [question], index);
    const plainText = generateFallbackText([question], index);

    const blobHtml = new Blob([htmlString], { type: 'text/html' });
    const blobText = new Blob([plainText], { type: 'text/plain' });

    const clipboardItem = new ClipboardItem({
      'text/html': blobHtml,
      'text/plain': blobText,
    });

    await navigator.clipboard.write([clipboardItem]);
    alert(`${index + 1}번 문항이 HWP 클립보드에 복사되었습니다.`);
  } catch (err) {
    console.error('단일 문항 복사 실패:', err);
    alert('단일 문항 복사에 실패했습니다.');
  }
};

const generateFallbackText = (questions: Question[], startIndex: number = 0) => {
  return questions.map((q, index) => {
    let text = `${startIndex + index + 1}. `;
    if (q.type === 'text' && q.content) {
      text += q.content.replace(/<[^>]+>/g, '') + '\n';
    } else if (q.type === 'box-gnd' && q.boxList) {
      text += '\n<보 기>\n' + q.boxList.map(item => `- ${item}`).join('\n') + '\n';
    } else if (q.type === 'table' && q.tableData) {
      text += '\n[표 데이터]\n';
    } else if (q.type === 'image') {
      text += '\n[이미지/그래프]\n';
    }

    if (q.options && q.options.length > 0) {
      text += q.options.map((opt, optIdx) => `(${optIdx + 1}) ${opt}`).join('  ');
    }
    return text.trim();
  }).join('\n\n');
};

const generatePlatformHTML = (title: string, questions: Question[], startIndex: number = 0) => {
  // HWP는 중첩된 최신 HTML보단, Flat 한 Table, p, span, basic inline style을 잘 인식함.
  let html = `
    <div style="font-family: 'Batang', 'Malgun Gothic', sans-serif; max-width: 800px;">
        ${title ? `<h1 style="text-align: center; font-size: 24px; margin-bottom: 30px;">${title}</h1>` : ''}
  `;

  questions.forEach((q, index) => {
    html += `
      <div style="margin-bottom: 30px; page-break-inside: avoid;">
        <table style="width: 100%; border-collapse: collapse; border: none;">
          <tr>
            <td style="width: 30px; vertical-align: top; padding-top: 5px; font-weight: bold; font-size: 16px;">
              ${startIndex + index + 1}.
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
      // HWP에서 완벽한 박스를 렌더링하기 위해 가장 원시적인 HTML 구조를 사용합니다
      // CSS 호환성에 구기지 않도록 inline table properties를 함께 넣습니다.
      html += `
        <table width="100%" border="1" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse; border: 1px solid black; margin-bottom: 20px; margin-top: 15px;">
          <tr>
            <td align="center" style="padding: 10px; text-align: center; font-size: 15px; font-family: 'Batang', 'BatangChe', serif; border: none;">
              &lt;보 기&gt;
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 20px 20px 20px; line-height: 1.8; font-size: 15px; border: none;">
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
    // 요구사항: 옆으로 1~5번 쫙 풀어서 나열, 동그라미 번호 필수
    if (q.options && q.options.length > 0) {
      // HWP에서 1줄에 5개를 나란히 놓기 위해서 table 레이아웃 사용이 가장 확실함
      html += `<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 15px; width: 100%;"><tr>`;
      q.options.forEach((opt, optIdx) => {
        // 동그라미 기호 적용 (①②③④⑤)
        const circleNum = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'][optIdx] || `(${optIdx + 1})`;
        // 사용자가 명시적으로 요구한 ① 문자열 사용
        html += `<td style="font-size: 15px; padding-right: 15px; white-space: nowrap;">${circleNum}&nbsp;${opt}</td>`;
      });
      html += `</tr></table>`;
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
