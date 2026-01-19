export type StatementVariable = {
  type: 'number' | 'percent' | 'text';
  value: string;
};

export type FormulaContext = {
  rowValues: Map<string, number>;
  rowOrder: string[];
  parentMap: Map<string, string[]>;
  variables: Record<string, StatementVariable>;
};

export type FormulaValidationResult = {
  missingRowRefs: string[];
  missingVariables: string[];
  hasCycle: boolean;
};

function parseVariableValue(variable?: StatementVariable): number {
  if (!variable) return 0;
  if (variable.type === 'text') return 0;
  const raw = parseFloat(variable.value);
  if (!Number.isFinite(raw)) return 0;
  if (variable.type === 'percent') {
    return raw / 100;
  }
  return raw;
}

export function extractRowRefs(formula: string): Set<string> {
  const refs = new Set<string>();
  if (!formula) return refs;
  const rowRegex = /ROW\(\s*["']([^"']+)["']\s*\)/g;
  const rangeRegex = /SUM_RANGE\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/g;
  const childRegex = /SUM_CHILDREN\(\s*["']([^"']+)["']\s*\)/g;
  let match = rowRegex.exec(formula);
  while (match) {
    refs.add(match[1]);
    match = rowRegex.exec(formula);
  }
  match = rangeRegex.exec(formula);
  while (match) {
    refs.add(match[1]);
    refs.add(match[2]);
    match = rangeRegex.exec(formula);
  }
  match = childRegex.exec(formula);
  while (match) {
    refs.add(match[1]);
    match = childRegex.exec(formula);
  }
  return refs;
}

export function extractVariableRefs(formula: string): Set<string> {
  const refs = new Set<string>();
  if (!formula) return refs;
  const varRegex = /VAR\(\s*["']([^"']+)["']\s*\)/g;
  let match = varRegex.exec(formula);
  while (match) {
    refs.add(match[1]);
    match = varRegex.exec(formula);
  }
  return refs;
}

export function detectFormulaCycles(formulas: Map<string, string>): boolean {
  const deps = new Map<string, Set<string>>();
  formulas.forEach((formula, rowId) => {
    deps.set(rowId, extractRowRefs(formula));
  });
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (node: string): boolean => {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    const neighbors = deps.get(node) || new Set<string>();
    for (const neighbor of neighbors) {
      if (formulas.has(neighbor)) {
        if (visit(neighbor)) return true;
      }
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  };

  for (const node of formulas.keys()) {
    if (visit(node)) return true;
  }
  return false;
}

export function evaluateFormula(formula: string, ctx: FormulaContext): number {
  if (!formula) return 0;
  const SUM = (...args: number[]) => args.reduce((sum, value) => sum + (Number(value) || 0), 0);
  const ROW = (id: string) => ctx.rowValues.get(id) || 0;
  const VAR = (name: string) => parseVariableValue(ctx.variables[name]);
  const SUM_CHILDREN = (parentId: string) => {
    const children = ctx.parentMap.get(parentId) || [];
    return children.reduce((sum, childId) => sum + (ctx.rowValues.get(childId) || 0), 0);
  };
  const SUM_RANGE = (fromId: string, toId: string) => {
    const startIndex = ctx.rowOrder.indexOf(fromId);
    const endIndex = ctx.rowOrder.indexOf(toId);
    if (startIndex === -1 || endIndex === -1) return 0;
    const [start, end] = startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
    let total = 0;
    for (let i = start; i <= end; i += 1) {
      total += ctx.rowValues.get(ctx.rowOrder[i]) || 0;
    }
    return total;
  };
  const DIFF = (a: number, b: number) => (Number(a) || 0) - (Number(b) || 0);
  const ABS = (value: number) => Math.abs(Number(value) || 0);
  const IF = (condition: any, whenTrue: any, whenFalse: any) => (condition ? whenTrue : whenFalse);

  try {
    const fn = new Function(
      'SUM',
      'SUM_CHILDREN',
      'SUM_RANGE',
      'DIFF',
      'ABS',
      'IF',
      'ROW',
      'VAR',
      `return (${formula});`
    );
    const result = fn(SUM, SUM_CHILDREN, SUM_RANGE, DIFF, ABS, IF, ROW, VAR);
    return Number.isFinite(result) ? Number(result) : 0;
  } catch {
    return 0;
  }
}
