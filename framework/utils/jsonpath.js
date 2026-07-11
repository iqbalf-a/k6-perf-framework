// Minimal JSONPath Plus-like parser for k6 (no bundler needed)
// Supports: $.field  $..field  [*]  [n]  [-n]  [start:end]  [?(@.field op value)]
// Operators: == != < > <= >=
// Returns: single value, array of values, or null if not found

function findClosingBracket(str, open) {
    let depth = 0;
    for (let i = open; i < str.length; i++) {
        if (str[i] === '[') depth++;
        else if (str[i] === ']') { depth--; if (depth === 0) return i; }
    }
    return str.length;
}

function parseFilter(expr) {
    // @.field op value  (op: == != < > <= >=)
    const m = expr.match(/^@\.([a-zA-Z0-9_.]+)\s*(==|!=|<=|>=|<|>)\s*(.+)$/);
    if (!m) return null;
    const [, field, op, raw] = m;
    let value;
    if (raw.startsWith('"') || raw.startsWith("'")) value = raw.slice(1, -1);
    else if (raw === 'true')  value = true;
    else if (raw === 'false') value = false;
    else if (raw === 'null')  value = null;
    else value = parseFloat(raw);
    return { field, op, value };
}

function evalFilter(item, expr) {
    if (!expr) return true;
    // support nested field: @.a.b
    const actual = expr.field.split('.').reduce((o, k) => (o != null ? o[k] : null), item);
    switch (expr.op) {
        case '==': return actual == expr.value;  // eslint-disable-line eqeqeq
        case '!=': return actual != expr.value;  // eslint-disable-line eqeqeq
        case '<':  return actual <  expr.value;
        case '>':  return actual >  expr.value;
        case '<=': return actual <= expr.value;
        case '>=': return actual >= expr.value;
    }
    return false;
}

function tokenize(path) {
    let p = path.trim();
    if (p.startsWith('$.')) p = p.slice(2);
    else if (p.startsWith('$')) p = p.slice(1);
    if (!p) return [];

    const tokens = [];
    let i = 0;

    while (i < p.length) {
        if (p[i] === '.') {
            if (p[i + 1] === '.') {
                // recursive descent: ..field
                i += 2;
                const start = i;
                while (i < p.length && p[i] !== '.' && p[i] !== '[') i++;
                tokens.push({ type: 'recursive', key: p.slice(start, i) });
            } else {
                i++; // skip separator dot
            }
        } else if (p[i] === '[') {
            const end = findClosingBracket(p, i);
            const content = p.slice(i + 1, end);
            i = end + 1;

            if (content === '*') {
                tokens.push({ type: 'wildcard' });
            } else if (content.startsWith('?(')) {
                // filter: [?(@.field op value)] — returns ALL matching items
                const inner = content.slice(2, -1);
                tokens.push({ type: 'filter', expr: parseFilter(inner) });
            } else if (content.includes(':')) {
                const parts = content.split(':');
                const sliceStart = parts[0] === '' ? undefined : parseInt(parts[0]);
                const sliceEnd   = parts[1] === '' ? undefined : parseInt(parts[1]);
                tokens.push({ type: 'slice', start: sliceStart, end: sliceEnd });
            } else if (/^-?\d+$/.test(content)) {
                tokens.push({ type: 'index', index: parseInt(content) });
            }
        } else {
            const start = i;
            while (i < p.length && p[i] !== '.' && p[i] !== '[') i++;
            const key = p.slice(start, i);
            if (key) tokens.push({ type: 'key', key });
        }
    }

    return tokens;
}

function step(nodes, token) {
    const result = [];
    for (const node of nodes) {
        if (node === null || node === undefined) continue;

        switch (token.type) {
            case 'key':
                if (Array.isArray(node)) {
                    // auto-descend: after filter/wildcard, extract field from each item
                    for (const item of node) {
                        if (item != null && item[token.key] !== undefined) result.push(item[token.key]);
                    }
                } else if (typeof node === 'object') {
                    if (node[token.key] !== undefined) result.push(node[token.key]);
                }
                break;

            case 'wildcard':
                if (Array.isArray(node)) result.push(...node);
                else if (typeof node === 'object') result.push(...Object.values(node));
                break;

            case 'index': {
                if (Array.isArray(node)) {
                    const idx = token.index < 0 ? node.length + token.index : token.index;
                    if (idx >= 0 && idx < node.length) result.push(node[idx]);
                }
                break;
            }

            case 'slice':
                if (Array.isArray(node)) result.push(...node.slice(token.start, token.end));
                break;

            case 'filter':
                // returns ALL items matching the condition
                if (Array.isArray(node)) {
                    for (const item of node) {
                        if (evalFilter(item, token.expr)) result.push(item);
                    }
                }
                break;

            case 'recursive': {
                const seen = new Set();
                const recurse = (obj) => {
                    if (obj === null || typeof obj !== 'object' || seen.has(obj)) return;
                    seen.add(obj);
                    if (!Array.isArray(obj) && obj[token.key] !== undefined) result.push(obj[token.key]);
                    for (const val of Object.values(obj)) {
                        if (typeof val === 'object') recurse(val);
                    }
                };
                recurse(node);
                break;
            }
        }
    }
    return result;
}

/**
 * Evaluate a JSONPath Plus-like expression against a parsed JSON body.
 *
 * Examples:
 *   jsonpath(body, '$.data.items[*].id')
 *   jsonpath(body, '$.data.items[?(@.status=="active")].id')   → array of all active ids
 *   jsonpath(body, '$.data.items[?(@.price<10)].name')         → array of cheap item names
 *   jsonpath(body, '$.data.items[-1].name')                    → last item name
 *   jsonpath(body, '$..token')                                 → recursive search
 *
 * Returns: single value | array (multiple matches) | null (not found)
 */
export function jsonpath(body, path) {
    if (path === '$') return body;
    const tokens = tokenize(path);
    let nodes = [body];
    for (const token of tokens) {
        nodes = step(nodes, token);
        if (nodes.length === 0) return null;
    }
    if (nodes.length === 0) return null;
    if (nodes.length === 1) return nodes[0];
    return nodes;
}
