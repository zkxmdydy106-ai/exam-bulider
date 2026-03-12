import type { Question } from '../store/usePaperStore';
import { applyAutoItalic } from './textFormatters';

/**
 * HWP 호환 클립보드 복사 유틸리티
 *
 * 핵심 전략: ClipboardItem API 대신 document.execCommand('copy')를 사용
 * → 브라우저가 Windows CF_HTML 형식을 자동으로 생성하므로
 *   HWP가 <sup>, <sub>, <img> 등을 제대로 인식함
 */

/**
 * 전체 시험지 → HWP 클립보드 복사
 */
export const copyToHWP = async (title: string, questions: Question[]) => {
  try {
    const htmlString = await generatePlatformHTML(title, questions);
    await copyHTMLViaDOM(htmlString);
    alert('시험지가 클립보드에 복사되었습니다. 한글(HWP)에서 Ctrl+V 로 붙여넣으세요.');
  } catch (err) {
    console.error('클립보드 복사 실패:', err);
    alert('클립보드 복사에 실패했습니다.');
  }
};

/**
 * 단일 문항 → HWP 클립보드 복사
 */
export const copySingleToHWP = async (question: Question, index: number) => {
  try {
    const htmlString = await generatePlatformHTML('', [question], index);
    await copyHTMLViaDOM(htmlString);
    alert(`${index + 1}번 문항이 HWP 클립보드에 복사되었습니다.`);
  } catch (err) {
    console.error('단일 문항 복사 실패:', err);
    alert('단일 문항 복사에 실패했습니다.');
  }
};

/**
 * ★ 핵심 함수: HTML을 실제 DOM에 렌더링한 뒤 execCommand('copy')로 복사
 *
 * ClipboardItem API는 text/html만 넣지만,
 * execCommand('copy')는 브라우저가 CF_HTML + CF_UNICODETEXT 등
 * 다양한 Windows 클립보드 형식을 자동 생성하므로
 * HWP가 이미지, 위첨자, 표 등을 훨씬 잘 인식한다.
 */
const copyHTMLViaDOM = (html: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 화면 밖에 숨겨진 임시 컨테이너를 만든다
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.opacity = '0';
    container.innerHTML = html;
    document.body.appendChild(container);

    // 이미지가 있을 경우 로드를 기다린다 (base64 이미지는 즉시 로드됨)
    const images = container.querySelectorAll('img');
    const imagePromises = Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((res) => {
        img.onload = () => res();
        img.onerror = () => res(); // 실패해도 계속 진행
      });
    });

    Promise.all(imagePromises).then(() => {
      try {
        // 컨테이너 전체 선택
        const range = document.createRange();
        range.selectNodeContents(container);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }

        // execCommand('copy')로 복사 — Windows CF_HTML 형식 자동 생성
        const success = document.execCommand('copy');

        // 선택 해제 및 임시 컨테이너 제거
        if (selection) selection.removeAllRanges();
        document.body.removeChild(container);

        if (success) {
          resolve();
        } else {
          // execCommand 실패 시 fallback으로 ClipboardItem API 시도
          fallbackClipboardCopy(html).then(resolve).catch(reject);
        }
      } catch (e) {
        document.body.removeChild(container);
        fallbackClipboardCopy(html).then(resolve).catch(reject);
      }
    });
  });
};

/**
 * Fallback: ClipboardItem API (execCommand가 동작하지 않을 경우)
 */
const fallbackClipboardCopy = async (html: string) => {
  const blobHtml = new Blob([html], { type: 'text/html' });
  const blobText = new Blob([html.replace(/<[^>]+>/g, '')], { type: 'text/plain' });
  const clipboardItem = new ClipboardItem({
    'text/html': blobHtml,
    'text/plain': blobText,
  });
  await navigator.clipboard.write([clipboardItem]);
};

/**
 * SVG 문자열을 Canvas에 그려서 PNG data URL로 변환
 * HWP는 data:image/svg+xml 형식을 인식하지 못하므로 반드시 PNG로 래스터화
 */
const svgToPngBase64 = (svgContent: string, defaultWidth = 400, defaultHeight = 300): Promise<string> => {
  return new Promise((resolve) => {
    try {
      let svg = svgContent;

      // xmlns 필수 (Canvas 렌더링에 필요)
      if (!svg.includes('xmlns=')) {
        svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      // 상대 크기 → 절대 픽셀로 변환 (Canvas는 상대크기 해석 불가)
      svg = svg.replace(/width="100%"/g, `width="${defaultWidth}"`);
      svg = svg.replace(/height="100%"/g, `height="${defaultHeight}"`);
      svg = svg.replace(/width="auto"/g, `width="${defaultWidth}"`);
      svg = svg.replace(/height="auto"/g, `height="${defaultHeight}"`);

      // width/height가 아예 없으면 삽입
      if (!svg.match(/width=["']\d+/)) {
        svg = svg.replace('<svg', `<svg width="${defaultWidth}"`);
      }
      if (!svg.match(/height=["']\d+/)) {
        svg = svg.replace('<svg', `<svg height="${defaultHeight}"`);
      }

      const encodedSvg = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const w = (img.naturalWidth && img.naturalWidth > 1) ? img.naturalWidth : defaultWidth;
        const h = (img.naturalHeight && img.naturalHeight > 1) ? img.naturalHeight : defaultHeight;
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(encodedSvg);
        }
      };
      img.onerror = () => {
        console.warn('SVG→PNG 변환 실패');
        resolve('');
      };
      img.src = encodedSvg;
    } catch (e) {
      resolve('');
    }
  });
};

/**
 * GraphBlock 데이터 → SVG 문자열 직접 생성
 */
const renderGraphToSvg = (graphData: any): string => {
  const width = 400;
  const height = 300;
  const margin = 20;
  const axes = graphData.axes || { xLabel: 'x', yLabel: 'y', showOrigin: true, domain: [-10, 10], range: [-10, 10] };
  const functions = graphData.functions || [];
  const pointLabels = graphData.pointLabels || [];

  const scaleX = (x: number) => {
    const [minX, maxX] = axes.domain;
    return margin + ((x - minX) / (maxX - minX)) * (width - 2 * margin);
  };
  const scaleY = (y: number) => {
    const [minY, maxY] = axes.range;
    return height - margin - ((y - minY) / (maxY - minY)) * (height - 2 * margin);
  };
  const evaluateMock = (expr: string, x: number) => {
    try {
      const jsExpr = expr.replace(/\^/g, '**');
      const fn = new Function('x', `return ${jsExpr}`);
      return fn(x);
    } catch { return NaN; }
  };

  let parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
  parts.push(`<rect width="${width}" height="${height}" fill="white"/>`);
  parts.push(`<line x1="${margin}" y1="${scaleY(0)}" x2="${width - margin}" y2="${scaleY(0)}" stroke="#ccc" stroke-width="1"/>`);
  parts.push(`<line x1="${scaleX(0)}" y1="${margin}" x2="${scaleX(0)}" y2="${height - margin}" stroke="#ccc" stroke-width="1"/>`);
  parts.push(`<polygon points="${width - margin},${scaleY(0) - 4} ${width - margin + 8},${scaleY(0)} ${width - margin},${scaleY(0) + 4}" fill="#333"/>`);
  parts.push(`<polygon points="${scaleX(0) - 4},${margin} ${scaleX(0)},${margin - 8} ${scaleX(0) + 4},${margin}" fill="#333"/>`);
  if (axes.showOrigin) parts.push(`<text x="${scaleX(0) - 15}" y="${scaleY(0) + 15}" font-size="14" font-style="italic">O</text>`);
  parts.push(`<text x="${width - margin + 15}" y="${scaleY(0) + 5}" font-size="14" font-style="italic">${axes.xLabel}</text>`);
  parts.push(`<text x="${scaleX(0) - 5}" y="${margin - 15}" font-size="14" font-style="italic" text-anchor="middle">${axes.yLabel}</text>`);

  for (const f of functions) {
    if (!f.visible) continue;
    const [minX, maxX] = axes.domain;
    const step = (maxX - minX) / 200;
    let path = '';
    for (let x = minX; x <= maxX; x += step) {
      const y = evaluateMock(f.expression, x);
      if (isNaN(y) || y < axes.range[0] - 5 || y > axes.range[1] + 5) continue;
      path += (path === '' ? `M ${scaleX(x)} ${scaleY(y)} ` : `L ${scaleX(x)} ${scaleY(y)} `);
    }
    if (path) parts.push(`<path d="${path}" stroke="${f.color}" stroke-width="2" fill="none"/>`);
  }

  for (const p of pointLabels) {
    const sx = scaleX(Number(p.x) || 0);
    const sy = scaleY(Number(p.y) || 0);
    parts.push(`<circle cx="${sx}" cy="${sy}" r="3" fill="#212529"/>`);
    parts.push(`<text x="${sx + 6}" y="${sy - 6}" font-size="14" font-style="italic" fill="#212529">${p.label}</text>`);
  }

  parts.push('</svg>');
  return parts.join('\n');
};

/**
 * CSS inline-flex 분수를 HWP 호환 형태로 치환
 */
const sanitizeFractionsForHWP = (html: string): string => {
  return html.replace(
    /<span[^>]*display:\s*inline-flex[^>]*flex-direction:\s*column[^>]*>[^<]*<span[^>]*border-bottom[^>]*>([^<]*)<\/span>[^<]*<span[^>]*>([^<]*)<\/span>[^<]*<\/span>/gi,
    (_, numerator, denominator) => `<span style="font-size:15px;">${numerator.trim()}/${denominator.trim()}</span>`
  );
};

/**
 * HWP 호환 HTML 생성
 * - 레이아웃용 table 사용 금지! (HWP가 실제 표로 인식하므로)
 * - 문항번호는 <span>으로 인라인, 본문은 <p>/<div>
 * - 보기는 <span>+공백으로 가로 나열
 * - 이미지는 독립 <p> 블록으로 배치
 * - 실제 데이터 표(표 포함 블록)와 ㄱㄴㄷ 박스만 <table> 사용
 */
const generatePlatformHTML = async (title: string, questions: Question[], startIndex: number = 0) => {
  let html = `<div style="font-family: 'Batang', 'Malgun Gothic', sans-serif;">
    ${title ? `<p style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px;">${title}</p>` : ''}
  `;

  for (let index = 0; index < questions.length; index++) {
    const q = questions[index];

    // 문항 시작 — table 없이 div로 구성
    html += `<div style="margin-bottom: 25px;">`;

    // 블록 렌더링
    for (let bi = 0; bi < (q.blocks || []).length; bi++) {
      const block = q.blocks[bi];

      if (block.type === 'text') {
        let content = block.content || '';
        content = applyAutoItalic(content);
        content = sanitizeFractionsForHWP(content);

        // 첫 번째 텍스트 블록에 문항번호를 앞에 붙임
        if (bi === 0) {
          html += `<p style="font-size: 15px; line-height: 1.6; margin-bottom: 10px;"><span style="font-weight: bold; font-size: 16px; margin-right: 5px;">${startIndex + index + 1}.</span>${content}</p>`;
        } else {
          html += `<p style="font-size: 15px; line-height: 1.6; margin-bottom: 10px;">${content}</p>`;
        }
      }
      else if (block.type === 'table' && block.tableData) {
        // 실제 데이터 표 — 이건 진짜 표이므로 table 사용
        html += `<table style="width: 100%; border-collapse: collapse; border: 1px solid black; margin-bottom: 15px;">`;
        block.tableData.cells.forEach(row => {
          html += `<tr>`;
          row.forEach(cell => {
            let cellContent = applyAutoItalic(cell);
            cellContent = sanitizeFractionsForHWP(cellContent);
            html += `<td style="border: 1px solid black; padding: 8px; text-align: center;">${cellContent}</td>`;
          });
          html += `</tr>`;
        });
        html += `</table>`;
      }
      else if (block.type === 'box-gnd' && block.boxList) {
        // ㄱㄴㄷ 보기 박스 — 실제 테두리가 필요하므로 table 유지
        html += `
          <table width="100%" border="1" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse; border: 1px solid black; margin-bottom: 20px; margin-top: 15px;">
            <tr>
              <td align="center" style="padding: 10px; text-align: center; font-size: 15px; font-family: 'Batang', 'BatangChe', serif; border: none;">
                &lt;보 기&gt;
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 20px 20px 20px; line-height: 1.8; font-size: 15px; border: none;">
                ${block.boxList.map(item => `<div>${sanitizeFractionsForHWP(applyAutoItalic(item))}</div>`).join('')}
              </td>
            </tr>
          </table>
        `;
      }
      else if (block.type === 'image' && block.imageUrl) {
        // 이미지 — 독립 p 블록으로 배치 (글자 취급 방지)
        html += `<p style="text-align: center; margin-bottom: 15px;"><img src="${block.imageUrl}" width="400" height="300" /></p>`;
      }
      else if (block.type === 'ai-generator' && block.svgContent) {
        const pngDataUrl = await svgToPngBase64(block.svgContent);
        if (pngDataUrl) {
          html += `<p style="text-align: center; margin-bottom: 15px;"><img src="${pngDataUrl}" width="400" height="300" /></p>`;
        }
      }
      else if (block.type === 'graph' && block.graphData) {
        const graphSvg = renderGraphToSvg(block.graphData);
        const pngDataUrl = await svgToPngBase64(graphSvg);
        if (pngDataUrl) {
          html += `<p style="text-align: center; margin-bottom: 15px;"><img src="${pngDataUrl}" width="400" height="300" /></p>`;
        }
      }
    }

    // 첫 번째 블록이 text가 아닌 경우 (문항번호가 아직 안 나왔을 수 있음)
    if (!q.blocks?.length || q.blocks[0].type !== 'text') {
      html = html.replace(
        `<div style="margin-bottom: 25px;">`,
        `<div style="margin-bottom: 25px;"><p style="font-weight: bold; font-size: 16px;">${startIndex + index + 1}.</p>`
      );
    }

    // 객관식 보기 — table 대신 span+공백으로 가로 나열
    if (q.options && q.options.length > 0) {
      html += `<p style="font-size: 15px; margin-top: 10px;">`;
      q.options.forEach((opt, optIdx) => {
        const circleNum = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'][optIdx] || `(${optIdx + 1})`;
        // 각 보기 사이에 충분한 공백(Tab 문자 3개 분량)을 넣어 가로 배치
        html += `${circleNum}\u00A0${applyAutoItalic(opt)}`;
        if (optIdx < q.options.length - 1) {
          html += `\u00A0\u00A0\u00A0\u00A0\u00A0`;  // 보기 간격 (nbsp 5개)
        }
      });
      html += `</p>`;
    }

    html += `</div>`;
  }

  html += `</div>`;
  return html;
};
