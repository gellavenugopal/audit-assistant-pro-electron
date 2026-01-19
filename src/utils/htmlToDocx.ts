import {
  AlignmentType,
  BorderStyle,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType,
} from 'docx';

type ConvertOptions = {
  font?: string;
  fontSize?: number;
  lineHeight?: number;
  paragraphSpacing?: number;
};

type RunStyle = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  highlight?: boolean;
  color?: string;
};

type TrimState = { trimLeading: boolean };

const parseColor = (value?: string | null) => {
  if (!value) return undefined;
  const hexMatch = value.match(/#([0-9a-f]{3,6})/i);
  if (hexMatch) {
    const raw = hexMatch[1];
    const hex = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
    return hex.toUpperCase();
  }
  const rgbMatch = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    const toHex = (num: string) => Number(num).toString(16).padStart(2, '0');
    return `${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`.toUpperCase();
  }
  return undefined;
};

const getAlignment = (element: HTMLElement) => {
  const styleAlign = element.style?.textAlign?.toLowerCase() || '';
  if (styleAlign === 'center') return AlignmentType.CENTER;
  if (styleAlign === 'right') return AlignmentType.RIGHT;
  if (styleAlign === 'left') return AlignmentType.LEFT;
  if (styleAlign === 'justify') return AlignmentType.JUSTIFIED;
  if (element.classList.contains('align-center')) return AlignmentType.CENTER;
  if (element.classList.contains('align-right')) return AlignmentType.RIGHT;
  if (element.classList.contains('align-left')) return AlignmentType.LEFT;
  if (element.classList.contains('align-justify')) return AlignmentType.JUSTIFIED;
  if (element.classList.contains('title') || element.classList.contains('subtitle')) {
    return AlignmentType.CENTER;
  }
  if (element.closest('.signature')) return AlignmentType.RIGHT;
  return AlignmentType.JUSTIFIED;
};

const buildRuns = (
  node: ChildNode,
  styles: RunStyle,
  state: TrimState,
  baseRunProps: { font: string; size: number }
): TextRun[] => {
  if (node.nodeType === Node.TEXT_NODE) {
    let text = node.textContent || '';
    if (state.trimLeading) {
      text = text.replace(/^\s+/, '');
    }
    text = text.replace(/\s+/g, ' ');
    if (!text.trim()) return [];
    state.trimLeading = false;
    return [
      new TextRun({
        ...baseRunProps,
        text,
        bold: styles.bold,
        italics: styles.italic,
        underline: styles.underline ? { type: UnderlineType.SINGLE } : undefined,
        highlight: styles.highlight ? 'yellow' : undefined,
        color: styles.color,
      }),
    ];
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as HTMLElement;
    if (element.tagName === 'BR') {
      state.trimLeading = true;
      return [new TextRun({ ...baseRunProps, text: '', break: 1 })];
    }
    if (element.tagName === 'STYLE') {
      return [];
    }

    const nextStyles: RunStyle = { ...styles };
    if (element.tagName === 'B' || element.tagName === 'STRONG') nextStyles.bold = true;
    if (element.tagName === 'I' || element.tagName === 'EM') nextStyles.italic = true;
    if (element.tagName === 'U') nextStyles.underline = true;
    if (element.classList.contains('highlight')) nextStyles.highlight = true;
    const styleColor = parseColor(element.style?.color || element.getAttribute('color'));
    if (styleColor) nextStyles.color = styleColor;

    let runs: TextRun[] = [];
    element.childNodes.forEach((child) => {
      runs = runs.concat(buildRuns(child, nextStyles, state, baseRunProps));
    });
    return runs;
  }

  return [];
};

const buildRunsFromNodes = (
  nodes: NodeListOf<ChildNode> | ChildNode[],
  baseRunProps: { font: string; size: number },
  baseStyles: RunStyle = {}
) => {
  const state: TrimState = { trimLeading: true };
  let runs: TextRun[] = [];
  nodes.forEach((child) => {
    runs = runs.concat(buildRuns(child, baseStyles, state, baseRunProps));
  });
  return runs;
};

const buildParagraphFromElement = (element: HTMLElement, options: ConvertOptions) => {
  const baseRunProps = {
    font: options.font || 'Times New Roman',
    size: options.fontSize || 24,
  };
  const isTitle = element.classList.contains('title') || element.tagName === 'H1';
  const isHeading =
    element.classList.contains('heading') ||
    element.tagName === 'H2' ||
    element.tagName === 'H3';
  const isSubheading = element.classList.contains('subheading') || element.tagName === 'H4';
  const isBullet = element.classList.contains('bullet') || element.tagName === 'LI';
  const isSignature = element.closest('.signature');
  const spacing = {
    after: options.paragraphSpacing ?? 120,
    line: options.lineHeight ?? 276,
    before: isHeading || isSubheading ? 120 : 0,
  };
  const runs = buildRunsFromNodes(
    element.childNodes,
    baseRunProps,
    {
      bold: isTitle || isHeading || isSubheading,
      highlight: element.classList.contains('highlight'),
    }
  );

  return new Paragraph({
    children: runs.length ? runs : [new TextRun({ ...baseRunProps, text: '' })],
    alignment: isSignature ? AlignmentType.RIGHT : getAlignment(element),
    spacing,
    indent: isBullet
      ? {
          left: 360,
          right: 0,
          firstLine: 0,
          hanging: 180,
        }
      : {
          left: 0,
          right: 0,
          firstLine: 0,
          hanging: 0,
        },
  });
};

const buildTableFromElement = (table: HTMLTableElement, options: ConvertOptions) => {
  const baseRunProps = {
    font: options.font || 'Times New Roman',
    size: options.fontSize || 24,
  };

  const rows = Array.from(table.rows).map((row) => {
    const cells = Array.from(row.cells).map((cell) => {
      const cellElement = cell as HTMLTableCellElement;
      const runs = buildRunsFromNodes(cellElement.childNodes, baseRunProps);
      const paragraph = new Paragraph({
        children: runs.length ? runs : [new TextRun({ ...baseRunProps, text: '' })],
        alignment: getAlignment(cellElement),
        spacing: { line: options.lineHeight ?? 276 },
      });
      return new TableCell({
        children: [paragraph],
        width: {
          size: 50,
          type: WidthType.PERCENTAGE,
        },
      });
    });
    return new TableRow({ children: cells });
  });

  return new Table({
    rows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
  });
};

export const convertHtmlToDocxElements = (html: string, options: ConvertOptions = {}) => {
  if (typeof document === 'undefined') {
    return [new Paragraph('')];
  }

  const container = document.createElement('div');
  container.innerHTML = html;
  const elements: Array<Paragraph | Table> = [];
  const root = (container.querySelector('.preview-doc') as HTMLElement | null) || container;

  Array.from(root.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) return;

    if (child.classList.contains('page-break')) {
      elements.push(new Paragraph({ children: [new PageBreak()] }));
      return;
    }

    if (child.tagName === 'TABLE') {
      elements.push(buildTableFromElement(child as HTMLTableElement, options));
      elements.push(new Paragraph(''));
      return;
    }

    if (child.tagName === 'UL' || child.tagName === 'OL') {
      Array.from(child.querySelectorAll('li')).forEach((li) => {
        elements.push(buildParagraphFromElement(li, options));
      });
      return;
    }

    if (child.tagName === 'DIV') {
      Array.from(child.children).forEach((nested) => {
        if (!(nested instanceof HTMLElement)) return;
        if (nested.classList.contains('page-break')) {
          elements.push(new Paragraph({ children: [new PageBreak()] }));
          return;
        }
        if (nested.tagName === 'TABLE') {
          elements.push(buildTableFromElement(nested as HTMLTableElement, options));
          return;
        }
        elements.push(buildParagraphFromElement(nested, options));
      });
      if (!child.children.length) {
        elements.push(buildParagraphFromElement(child, options));
      }
      return;
    }

    if (child.tagName === 'P' || child.tagName.startsWith('H')) {
      elements.push(buildParagraphFromElement(child, options));
      return;
    }

    elements.push(buildParagraphFromElement(child, options));
  });

  if (elements.length === 0) {
    elements.push(new Paragraph(''));
  }

  return elements;
};
