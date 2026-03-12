import type { Question } from '../store/usePaperStore';
import { applyAutoItalic } from './textFormatters';

/**
 * 상태 JSON을 HWP 호환 HTML Document로 파싱하여 클립보드에 주입하는 유틸리티
 * HWP는 CSS flex, grid 등 최신 레이아웃을 무시하므로, 반드시 table + inline style 기반으로 직렬화
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

/**
 * 평문(Plain Text) 폴백 생성
 * - 객관식 보기에 원문자(①②③④⑤) 사용
 * - 이미지/그래프 등은 텍스트가 없으므로 생략
 */
const generateFallbackText = (questions: Question[], startIndex: number = 0) => {
  return questions.map((q, index) => {
    let text = `${startIndex + index + 1}. `;
    q.blocks?.forEach(block => {
      if (block.type === 'text' && block.content) {
        text += block.content.replace(/<[^>]+>/g, '') + '\n';
      } else if (block.type === 'box-gnd' && block.boxList) {
        text += '\n<보 기>\n' + block.boxList.map(item => `- ${item}`).join('\n') + '\n';
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

/**
 * SVG 문자열을 Canvas에 그려서 PNG Base64 data URL로 변환
 * HWP는 <img src="data:image/svg+xml;..."> 형태를 전혀 인식하지 못하므로
 * 반드시 PNG로 래스터화(bake)해야 한다.
 */
const svgToPngBase64 = (svgContent: string, defaultWidth = 400, defaultHeight = 300): Promise<string> => {
  return new Promise((resolve) => {
    try {
      let svg = svgContent;

      // xmlns가 없으면 Canvas에서 렌더링 불가하므로 추가
      if (!svg.includes('xmlns=')) {
        svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      // 상대 크기(100%, auto 등)를 절대 픽셀로 교체 — Canvas는 상대크기를 해석 못함
      svg = svg.replace(/width="100%"/g, `width="${defaultWidth}"`);
      svg = svg.replace(/height="100%"/g, `height="${defaultHeight}"`);
      svg = svg.replace(/width="auto"/g, `width="${defaultWidth}"`);
      svg = svg.replace(/height="auto"/g, `height="${defaultHeight}"`);

      // width/height 속성이 아예 없으면 강제 삽입
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
        // 실제 이미지 크기 사용, 부정확하면 기본 크기 사용
        const w = (img.naturalWidth && img.naturalWidth > 1) ? img.naturalWidth : defaultWidth;
        const h = (img.naturalHeight && img.naturalHeight > 1) ? img.naturalHeight : defaultHeight;
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          // HWP는 투명 PNG를 검은색으로 표시할 수 있으므로 흰색 배경 강제
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/png'));
        } else {
          // Canvas context 실패 시 SVG data URL 그대로 전달 (최후의 수단)
          resolve(encodedSvg);
        }
      };
      img.onerror = () => {
        // SVG 파싱 실패 시 빈 문자열 반환
        console.warn('SVG를 이미지로 변환하는 데 실패했습니다:', svgContent.substring(0, 100));
        resolve('');
      };
      img.src = encodedSvg;
    } catch (e) {
      console.error('svgToPngBase64 오류:', e);
      resolve('');
    }
  });
};

/**
 * GraphBlock의 graphData로부터 SVG 문자열을 직접 생성
 * (GraphBlock.tsx의 렌더링 로직을 서버사이드에서 재현)
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
    } catch {
      return NaN;
    }
  };

  let svgParts: string[] = [];
  svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
  // 흰색 배경
  svgParts.push(`<rect width="${width}" height="${height}" fill="white"/>`);
  // 축
  svgParts.push(`<line x1="${margin}" y1="${scaleY(0)}" x2="${width - margin}" y2="${scaleY(0)}" stroke="#ccc" stroke-width="1"/>`);
  svgParts.push(`<line x1="${scaleX(0)}" y1="${margin}" x2="${scaleX(0)}" y2="${height - margin}" stroke="#ccc" stroke-width="1"/>`);
  // 화살표
  svgParts.push(`<polygon points="${width - margin},${scaleY(0) - 4} ${width - margin + 8},${scaleY(0)} ${width - margin},${scaleY(0) + 4}" fill="#333"/>`);
  svgParts.push(`<polygon points="${scaleX(0) - 4},${margin} ${scaleX(0)},${margin - 8} ${scaleX(0) + 4},${margin}" fill="#333"/>`);
  // 라벨
  if (axes.showOrigin) svgParts.push(`<text x="${scaleX(0) - 15}" y="${scaleY(0) + 15}" font-size="14" font-style="italic">O</text>`);
  svgParts.push(`<text x="${width - margin + 15}" y="${scaleY(0) + 5}" font-size="14" font-style="italic">${axes.xLabel}</text>`);
  svgParts.push(`<text x="${scaleX(0) - 5}" y="${margin - 15}" font-size="14" font-style="italic" text-anchor="middle">${axes.yLabel}</text>`);

  // 함수 그래프
  for (const f of functions) {
    if (!f.visible) continue;
    const [minX, maxX] = axes.domain;
    const step = (maxX - minX) / 200;
    let path = '';
    for (let x = minX; x <= maxX; x += step) {
      const y = evaluateMock(f.expression, x);
      if (isNaN(y) || y < axes.range[0] - 5 || y > axes.range[1] + 5) continue;
      const svgX = scaleX(x);
      const svgY = scaleY(y);
      path += (path === '' ? `M ${svgX} ${svgY} ` : `L ${svgX} ${svgY} `);
    }
    if (path) svgParts.push(`<path d="${path}" stroke="${f.color}" stroke-width="2" fill="none"/>`);
  }

  // 점과 라벨
  for (const p of pointLabels) {
    const sx = scaleX(Number(p.x) || 0);
    const sy = scaleY(Number(p.y) || 0);
    svgParts.push(`<circle cx="${sx}" cy="${sy}" r="3" fill="#212529"/>`);
    svgParts.push(`<text x="${sx + 6}" y="${sy - 6}" font-size="14" font-style="italic" fill="#212529">${p.label}</text>`);
  }

  svgParts.push('</svg>');
  return svgParts.join('\n');
};

/**
 * HWP에서 CSS display:inline-flex 기반 분수를 인식하지 못하는 문제 대응
 * inline-flex 분수 HTML을 a/b 형태의 순수 텍스트로 치환
 */
const sanitizeFractionsForHWP = (html: string): string => {
  // CSS inline-flex 분수 구조를 감지하여 분자/분모 텍스트만 추출
  return html.replace(
    /<span[^>]*display:\s*inline-flex[^>]*flex-direction:\s*column[^>]*>[^<]*<span[^>]*border-bottom[^>]*>([^<]*)<\/span>[^<]*<span[^>]*>([^<]*)<\/span>[^<]*<\/span>/gi,
    (_, numerator, denominator) => {
      // HWP 호환: 분수는 단순히 분자/분모 형태로 대체
      return `<span style="font-size:15px;">${numerator.trim()}/${denominator.trim()}</span>`;
    }
  );
};

/**
 * HWP 호환 HTML 전체 구조 생성
 * - table 레이아웃 기반 (HWP가 가장 잘 인식)
 * - 이미지/SVG는 모두 PNG data URL로 베이킹
 * - <sup>, <sub> 태그는 HWP가 인식하므로 그대로 유지
 */
const generatePlatformHTML = async (title: string, questions: Question[], startIndex: number = 0) => {
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

    // 블록 렌더링
    for (const block of (q.blocks || [])) {
      if (block.type === 'text') {
        let content = block.content || '';
        content = applyAutoItalic(content);
        // HWP가 CSS flex 분수를 무시하므로 순수 텍스트로 치환
        content = sanitizeFractionsForHWP(content);
        html += `<div style="font-size: 15px; line-height: 1.6; margin-bottom: 15px;">${content}</div>`;
      }
      else if (block.type === 'table' && block.tableData) {
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
        // base64 이미지는 HWP에서 직접 인식됨. width/height 명시 필수
        html += `<div style="text-align: center; margin-bottom: 15px;"><img src="${block.imageUrl}" width="400" /></div>`;
      }
      else if (block.type === 'ai-generator' && block.svgContent) {
        // SVG → PNG로 완전히 래스터화하여 HWP가 일반 사진처럼 인식하게 함
        const pngDataUrl = await svgToPngBase64(block.svgContent);
        if (pngDataUrl) {
          html += `<div style="text-align: center; margin-bottom: 15px;"><img src="${pngDataUrl}" width="400" /></div>`;
        }
      }
      else if (block.type === 'graph' && block.graphData) {
        // 그래프 데이터로부터 SVG를 직접 구성한 뒤 PNG로 베이킹
        const graphSvg = renderGraphToSvg(block.graphData);
        const pngDataUrl = await svgToPngBase64(graphSvg);
        if (pngDataUrl) {
          html += `<div style="text-align: center; margin-bottom: 15px;"><img src="${pngDataUrl}" width="400" /></div>`;
        }
      }
    }

    // 객관식 보기 렌더링 — ①②③④⑤ 원문자 번호 필수
    if (q.options && q.options.length > 0) {
      html += `<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 15px; width: 100%;"><tr>`;
      q.options.forEach((opt, optIdx) => {
        const circleNum = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'][optIdx] || `(${optIdx + 1})`;
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
