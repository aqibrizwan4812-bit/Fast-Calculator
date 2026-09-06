/* =======================================================
   Expression evaluator (tokenizer + recursive-descent parser)
   ======================================================= */

function tokenize(expr) {
  const tokens = [];
  const funcs = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'ln', 'sqrt'];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === ' ') { i++; continue; }

    if (/[0-9.]/.test(ch)) {
      let num = ch; i++;
      while (i < expr.length && /[0-9.]/.test(expr[i])) { num += expr[i]; i++; }
      tokens.push({ type: 'num', value: parseFloat(num) });
      continue;
    }

    if (/[a-zA-Z]/.test(ch)) {
      let name = ch; i++;
      while (i < expr.length && /[a-zA-Z]/.test(expr[i])) { name += expr[i]; i++; }
      if (name === 'pi') tokens.push({ type: 'num', value: Math.PI });
      else if (name === 'e') tokens.push({ type: 'num', value: Math.E });
      else if (funcs.includes(name)) tokens.push({ type: 'func', value: name });
      else throw new Error('Unknown token: ' + name);
      continue;
    }

    if (ch === '×') { tokens.push({ type: 'op', value: '*' }); i++; continue; }
    if (ch === '÷') { tokens.push({ type: 'op', value: '/' }); i++; continue; }
    if (ch === '−') { tokens.push({ type: 'op', value: '-' }); i++; continue; }
    if (ch === '√') { tokens.push({ type: 'func', value: 'sqrt' }); i++; continue; }
    if (ch === 'π') { tokens.push({ type: 'num', value: Math.PI }); i++; continue; }

    if ('+-*/^!%()'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }

    throw new Error('Unexpected character: ' + ch);
  }
  return tokens;
}

function parseExpression(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const isOp = (v) => peek() && peek().type === 'op' && peek().value === v;

  function parseExpr() {
    let node = parseTerm();
    while (isOp('+') || isOp('-')) {
      const op = next().value;
      node = { type: 'binop', op, left: node, right: parseTerm() };
    }
    return node;
  }

  function parseTerm() {
    let node = parseFactor();
    while (isOp('*') || isOp('/')) {
      const op = next().value;
      node = { type: 'binop', op, left: node, right: parseFactor() };
    }
    return node;
  }

  function parseFactor() {
    let node = parseUnary();
    if (isOp('^')) {
      next();
      node = { type: 'binop', op: '^', left: node, right: parseFactor() };
    }
    return node;
  }

  function parseUnary() {
    if (isOp('-')) { next(); return { type: 'unary', op: '-', operand: parseUnary() }; }
    if (isOp('+')) { next(); return parseUnary(); }
    return parsePostfix();
  }

  function parsePostfix() {
    let node = parsePrimary();
    while (isOp('!') || isOp('%')) {
      const op = next().value;
      node = { type: 'postfix', op, operand: node };
    }
    return node;
  }

  function parsePrimary() {
    const tok = peek();
    if (!tok) throw new Error('Unexpected end of expression');

    if (tok.type === 'num') { next(); return { type: 'num', value: tok.value }; }

    if (tok.type === 'func') {
      next();
      if (!isOp('(')) throw new Error('Expected ( after function');
      next();
      const arg = parseExpr();
      if (!isOp(')')) throw new Error('Expected )');
      next();
      return { type: 'call', name: tok.value, arg };
    }

    if (isOp('(')) {
      next();
      const node = parseExpr();
      if (!isOp(')')) throw new Error('Expected )');
      next();
      return node;
    }

    throw new Error('Unexpected token');
  }

  const result = parseExpr();
  if (pos !== tokens.length) throw new Error('Unexpected trailing input');
  return result;
}

function factorial(n) {
  if (n < 0 || Math.floor(n) !== n) throw new Error('Factorial needs a non-negative integer');
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function evalNode(node, isDeg) {
  switch (node.type) {
    case 'num': return node.value;
    case 'unary': return -evalNode(node.operand, isDeg);
    case 'postfix': {
      const v = evalNode(node.operand, isDeg);
      if (node.op === '!') return factorial(v);
      if (node.op === '%') return v / 100;
      break;
    }
    case 'binop': {
      const l = evalNode(node.left, isDeg);
      const r = evalNode(node.right, isDeg);
      switch (node.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return l / r;
        case '^': return Math.pow(l, r);
      }
      break;
    }
    case 'call': {
      const arg = evalNode(node.arg, isDeg);
      const rad = isDeg ? (arg * Math.PI) / 180 : arg;
      switch (node.name) {
        case 'sin': return Math.sin(rad);
        case 'cos': return Math.cos(rad);
        case 'tan': return Math.tan(rad);
        case 'asin': { const v = Math.asin(arg); return isDeg ? (v * 180) / Math.PI : v; }
        case 'acos': { const v = Math.acos(arg); return isDeg ? (v * 180) / Math.PI : v; }
        case 'atan': { const v = Math.atan(arg); return isDeg ? (v * 180) / Math.PI : v; }
        case 'log': return Math.log10(arg);
        case 'ln': return Math.log(arg);
        case 'sqrt': return Math.sqrt(arg);
      }
      break;
    }
  }
  throw new Error('Could not evaluate');
}

function autoBalance(expr) {
  let open = 0;
  for (const ch of expr) {
    if (ch === '(') open++;
    if (ch === ')') open--;
  }
  return open > 0 ? expr + ')'.repeat(open) : expr;
}

function evaluateExpression(expr, isDeg) {
  const balanced = autoBalance(expr);
  const tokens = tokenize(balanced);
  const ast = parseExpression(tokens);
  const result = evalNode(ast, isDeg);
  if (!isFinite(result)) throw new Error('Math error');
  return result;
}

function formatNumber(num) {
  if (Object.is(num, -0)) num = 0;
  const rounded = Math.round((num + Number.EPSILON) * 1e10) / 1e10;
  if (Math.abs(rounded) > 1e12 || (Math.abs(rounded) < 1e-9 && rounded !== 0)) {
    return rounded.toExponential(6).replace(/\.?0+e/, 'e');
  }
  const str = String(rounded);
  if (str.length > 14) return rounded.toPrecision(10).replace(/\.?0+$/, '');
  return str;
}

/* =======================================================
   UI wiring
   ======================================================= */

const expressionLine = document.getElementById('expressionLine');
const resultLine = document.getElementById('resultLine');
const historyPanel = document.getElementById('historyPanel');
const historyList = document.getElementById('historyList');
const historyEmpty = document.getElementById('historyEmpty');
const sciRow = document.getElementById('sciRow');
const sciToggle = document.getElementById('sciToggle');
const degToggle = document.getElementById('degToggle');
const themeToggle = document.getElementById('themeToggle');
const memoryIndicator = document.getElementById('memoryIndicator');
const toast = document.getElementById('toast');

let expr = '';
let justEvaluated = false;
let isDeg = true;
let memoryValue = 0;
let history = [];

function render() {
  expressionLine.textContent = expr || '\u00A0';
  if (!expr) {
    resultLine.textContent = '0';
    return;
  }
  try {
    const val = evaluateExpression(expr, isDeg);
    resultLine.textContent = formatNumber(val);
  } catch (e) {
    resultLine.textContent = justEvaluated ? resultLine.textContent : '…';
  }
}

function insertText(text) {
  if (justEvaluated) {
    // start fresh unless the inserted text is an operator (continue from result)
    const startsWithOp = /^[+\-−×÷^]/.test(text);
    expr = startsWithOp ? resultLine.textContent + text : text;
    justEvaluated = false;
  } else {
    expr += text;
  }
  render();
}

function appendAfterCurrent(text) {
  justEvaluated = false;
  expr += text;
  render();
}

function backspace() {
  justEvaluated = false;
  expr = expr.slice(0, -1);
  render();
}

function clearAll() {
  expr = '';
  justEvaluated = false;
  render();
}

function toggleSign() {
  const m = expr.match(/(\d*\.?\d+)$/);
  if (!m) {
    expr += expr === '' ? '-' : '';
    render();
    return;
  }
  const numStr = m[0];
  const idx = expr.length - numStr.length;
  if (idx > 0 && expr[idx - 1] === '-') {
    const prevPrev = idx - 2 >= 0 ? expr[idx - 2] : null;
    const unaryContext = idx - 1 === 0 || (prevPrev && '+-−×÷^('.includes(prevPrev));
    if (unaryContext) {
      expr = expr.slice(0, idx - 1) + expr.slice(idx);
      render();
      return;
    }
  }
  expr = expr.slice(0, idx) + '-' + expr.slice(idx);
  render();
}

function equals() {
  if (!expr) return;
  try {
    const val = evaluateExpression(expr, isDeg);
    const formatted = formatNumber(val);
    pushHistory(expr, formatted);
    expr = formatted;
    resultLine.textContent = formatted;
    expressionLine.textContent = '\u00A0';
    justEvaluated = true;
  } catch (e) {
    resultLine.textContent = 'Error';
    justEvaluated = true;
    expr = '';
  }
}

/* ---------- History ---------- */

function pushHistory(sourceExpr, result) {
  history.unshift({ expr: sourceExpr, result });
  if (history.length > 50) history.pop();
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = '';
  historyEmpty.style.display = history.length ? 'none' : 'block';
  history.forEach((item) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="history-expr">${item.expr}</span><span class="history-result">${item.result}</span>`;
    li.addEventListener('click', () => {
      expr = item.result;
      justEvaluated = true;
      render();
      resultLine.textContent = item.result;
      historyPanel.classList.remove('open');
    });
    historyList.appendChild(li);
  });
}

document.getElementById('historyToggle').addEventListener('click', () => {
  historyPanel.classList.toggle('open');
});

document.getElementById('clearHistory').addEventListener('click', () => {
  history = [];
  renderHistory();
});

/* ---------- Memory ---------- */

function updateMemoryIndicator() {
  memoryIndicator.classList.toggle('active', memoryValue !== 0);
}

document.querySelectorAll('[data-mem]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.mem;
    if (action === 'MC') { memoryValue = 0; }
    else if (action === 'MR') { insertText(formatNumber(memoryValue)); }
    else {
      try {
        const current = expr ? evaluateExpression(expr, isDeg) : 0;
        memoryValue += action === 'M+' ? current : -current;
      } catch (e) { /* ignore invalid expr */ }
    }
    updateMemoryIndicator();
  });
});

/* ---------- Button wiring ---------- */

document.querySelectorAll('[data-digit]').forEach((btn) => {
  btn.addEventListener('click', () => insertText(btn.dataset.digit));
});

document.querySelectorAll('[data-insert]').forEach((btn) => {
  btn.addEventListener('click', () => insertText(btn.dataset.insert));
});

document.querySelectorAll('[data-append]').forEach((btn) => {
  btn.addEventListener('click', () => appendAfterCurrent(btn.dataset.append));
});

document.getElementById('allClear').addEventListener('click', clearAll);
document.getElementById('backspace').addEventListener('click', backspace);
document.getElementById('toggleSign').addEventListener('click', toggleSign);
document.getElementById('equals').addEventListener('click', equals);

/* ---------- Scientific mode toggle ---------- */

sciToggle.addEventListener('click', () => {
  const open = sciRow.classList.toggle('open');
  sciToggle.textContent = open ? 'Basic mode' : 'Scientific mode';
});

/* ---------- Degree / Radian toggle ---------- */

degToggle.addEventListener('click', () => {
  isDeg = !isDeg;
  degToggle.textContent = isDeg ? 'DEG' : 'RAD';
  render();
});

/* ---------- Theme toggle ---------- */

themeToggle.addEventListener('click', () => {
  const isLight = document.body.getAttribute('data-theme') === 'light';
  document.body.setAttribute('data-theme', isLight ? 'dark' : 'light');
  themeToggle.textContent = isLight ? '🌙' : '☀️';
});

/* ---------- Copy result ---------- */

document.getElementById('copyBtn').addEventListener('click', () => {
  const text = resultLine.textContent;
  navigator.clipboard?.writeText(text).then(() => showToast('Copied ' + text));
});

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1400);
}

/* ---------- Keyboard support ---------- */

document.addEventListener('keydown', (e) => {
  if (e.key >= '0' && e.key <= '9') { insertText(e.key); return; }
  if (e.key === '.') { insertText('.'); return; }
  if (e.key === '+') { insertText('+'); return; }
  if (e.key === '-') { insertText('−'); return; }
  if (e.key === '*') { insertText('×'); return; }
  if (e.key === '/') { e.preventDefault(); insertText('÷'); return; }
  if (e.key === '^') { insertText('^'); return; }
  if (e.key === '(' || e.key === ')') { insertText(e.key); return; }
  if (e.key === '%') { appendAfterCurrent('%'); return; }
  if (e.key === '!') { appendAfterCurrent('!'); return; }
  if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); equals(); return; }
  if (e.key === 'Backspace') { backspace(); return; }
  if (e.key === 'Escape') { clearAll(); return; }
});

render();
updateMemoryIndicator();
