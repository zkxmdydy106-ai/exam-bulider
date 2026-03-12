import type { Question } from '../store/usePaperStore';
import { applyAutoItalic } from './textFormatters';

/**
 * 상태 JSON을 HWP 호환 HTML Document로 파싱하여 클립보드에 주입하는 유틸리티
 */
export const copyToHWP = async (title: string, questions: Question[]) => {
  try {
    const htmlString = await generatePlatformHTML(title, questions);
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
    const htmlString = await generatePlatformHTML('', [question], index);
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
    q.blocks?.forEach(block => {
      if (block.type === 'text' && block.content) {
        text += block.content.replace(/<[^>]+>/g, '') + '\n';
      } else if (block.type === 'box-gnd' && block.boxList) {
        text += '\n<보 기>\n' + block.boxList.map(item => `- ${item}`).join('\n') + '\n';
      } else if (block.type === 'table' && block.tableData) {
        // text += '\n[표 데이터]\n';
      } else if (block.type === 'image') {
        // text += '\n[이미지/그래프]\n';
      } else if (block.type === 'graph') {
        // text += '\n[수학/그래프]\n';
      }
    });

    if (q.options && q.options.length > 0) {
      text += q.options.map((opt, optIdx) => {
        const circleNum = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'][optIdx] || `(${optIdx + 1})`;
        return `${circleNum} ${opt}`;
      }).join('  ');
    }
    return text.trim();
  }).join('\n\n');
};

const svgToPngBase64 = (svgContent: string): Promise<string> => {
  return new Promise((resolve) => {
    try {
      let svg = svgContent;
      if (!svg.includes('xmlns=')) {
        svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      
      // HWP Canvas 베이킹을 위해 명시적인 픽셀 조절 (100% 같은 상대크기 배제)
      // viewBox나 기본 비율은 유지하되 width/height를 강제 주입
      if (svg.includes('width="100%"')) {
          svg = svg.replace('width="100%"', 'width="400"');
      }
      if (svg.includes('height="100%"')) {
          svg = svg.replace('height="100%"', 'height="300"');
      }

      const encodedSvg = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // use original sizes, fallback to 400x300
        canvas.width = img.width || 400;
        canvas.height = img.height || 300;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff'; // HWP prefers solid background for transparency
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(encodedSvg);
        }
      };
      img.onerror = () => resolve(encodedSvg);
      img.src = encodedSvg;
    } catch(e) {
      resolve('');
    }
  });
};

const generatePlatformHTML = async (title: string, questions: Question[], startIndex: number = 0) => {
  // HWP는 중첩된 최신 HTML보단, Flat 한 Table, p, span, basic inline style을 잘 인식함.
  let html = `<html><head><meta charset="utf-8"></head><body>
    <div style="font-family: 'Batang', 'Malgun Gothic', sans-serif; max-width: 800px;">
        ${title ? `<h1 style="text-align: center; font-size: 24px; margin-bottom: 30px;">${title}</h1>` : ''}
  `;

  for (let index = 0; index < questions.length; index++) {
    const q = questions[index];
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
    for (const block of (q.blocks || [])) {
      if (block.type === 'text') {
        let content = block.content || '';
        content = applyAutoItalic(content);
        html += `<div style="font-size: 15px; line-height: 1.6; margin-bottom: 15px;">${content}</div>`;
      }
      else if (block.type === 'table' && block.tableData) {
        html += `<table style="width: 100%; border-collapse: collapse; border: 1px solid black; margin-bottom: 15px;">`;
        block.tableData.cells.forEach(row => {
          html += `<tr>`;
          row.forEach(cell => {
            html += `<td style="border: 1px solid black; padding: 8px; text-align: center;">${applyAutoItalic(cell)}</td>`;
          });
          html += `</tr>`;
        });
        html += `</table>`;
      }
      else if (block.type === 'box-gnd' && block.boxList) {
        html += `
          <table width="100%" border="1" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse; border: 1px solid black; margin-bottom: 20px; margin-top: 15px;">
            <tr>
              <td align="center" style="padding: 10px; text-align: center; font-size: 15px; font-family: 'Batang', 'BatangChe', serif; border: none;">
                &lt;보 기&gt;
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 20px 20px 20px; line-height: 1.8; font-size: 15px; border: none;">
                ${block.boxList.map(item => `<div>${applyAutoItalic(item)}</div>`).join('')}
              </td>
            </tr>
          </table>
        `;
      }
      else if (block.type === 'image' && block.imageUrl) {
        // base64로 캡처된 이미지는 HWP로 잘 붙어들어감
        // HWP 호환성을 위해 max-width:100% 제거
        html += `<div style="text-align: center; margin-bottom: 15px;"><img src="${block.imageUrl}" /></div>`;
      }
      else if (block.type === 'ai-generator' && block.svgContent) {
        // HWP는 SVG를 바로 그릴 수 없으므로, 캔버스를 통해 PNG로 베이킹함
        const pngDataUrl = await svgToPngBase64(block.svgContent);
        html += `<div style="text-align: center; margin-bottom: 15px;"><img src="${pngDataUrl}" /></div>`;
      }
      else if (block.type === 'graph' && block.graphData) {
        // GraphBlock을 SVG로 렌더링하도록 개선 필요 (이후 추가 작업)
        // 현재는 placeholder
      }
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
        html += `<td style="font-size: 15px; padding-right: 15px; white-space: nowrap;">${circleNum}&nbsp;${applyAutoItalic(opt)}</td>`;
      });
      html += `</tr></table>`;
    }

    html += `
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  html += `</div></body></html>`;
  return html;
};
