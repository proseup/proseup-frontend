import { useRef, useCallback } from 'react'

// OpenProse syntax highlighting
const PROSE_HIGHLIGHT = {
  keywords: {
    session: 'text-violet-400',
    resume: 'text-violet-400',
    agent: 'text-purple-400',
    parallel: 'text-yellow-400',
    repeat: 'text-orange-400',
    for: 'text-orange-400',
    loop: 'text-orange-400',
    if: 'text-red-400',
    elif: 'text-red-400',
    else: 'text-red-400',
    try: 'text-gray-400',
    catch: 'text-gray-400',
    finally: 'text-gray-400',
    choice: 'text-fuchsia-400',
    option: 'text-fuchsia-400',
    block: 'text-teal-400',
    do: 'text-teal-400',
    let: 'text-slate-300',
    const: 'text-slate-300',
    context: 'text-cyan-400',
    use: 'text-emerald-400',
    input: 'text-green-400',
    output: 'text-pink-400',
  },
  builtins: {
    true: 'text-blue-400',
    false: 'text-blue-400',
    none: 'text-slate-500',
    null: 'text-slate-500',
  },
  strings: 'text-lime-300',
  comments: 'text-slate-500 italic',
  references: 'text-amber-400', // **condition**
  punctuation: 'text-slate-500',
  numbers: 'text-sky-400',
  properties: 'text-blue-300',
};

function getLineClass(line) {
  const trimmed = line.trim();

  // Comments
  if (trimmed.startsWith('#')) return PROSE_HIGHLIGHT.comments;

  // Empty lines
  if (!trimmed) return 'text-slate-700';

  return null; // Use default styling
}

function highlightLine(line) {
  const trimmed = line.trim();

  // Empty/comment lines - return as-is
  if (!trimmed || trimmed.startsWith('#')) {
    return (
      <span className={getLineClass(trimmed)}>
        {trimmed || ' '}
      </span>
    );
  }

  // Process the line token by token
  const tokens = [];
  let i = 0;
  let inString = false;
  let currentString = '';
  let currentToken = '';

  const flushToken = () => {
    if (!currentToken) return;

    // Check if it's a keyword
    const keyword = PROSE_HIGHLIGHT.keywords[currentToken];
    if (keyword) {
      tokens.push(<span key={tokens.length} className={keyword + ' font-medium'}>{currentToken}</span>);
    } else if (PROSE_HIGHLIGHT.builtins[currentToken]) {
      tokens.push(<span key={tokens.length} className={PROSE_HIGHLIGHT.builtins[currentToken]}>{currentToken}</span>);
    } else if (/^\d+$/.test(currentToken)) {
      tokens.push(<span key={tokens.length} className={PROSE_HIGHLIGHT.numbers}>{currentToken}</span>);
    } else {
      tokens.push(<span key={tokens.length} className="text-slate-200">{currentToken}</span>);
    }
    currentToken = '';
  };

  while (i < line.length) {
    const char = line[i];

    if (inString) {
      if (char === '"') {
        tokens.push(<span key={tokens.length} className={PROSE_HIGHLIGHT.strings}>"{currentString}"</span>);
        currentString = '';
        inString = false;
      } else {
        currentString += char;
      }
      i++;
      continue;
    }

    if (char === '"') {
      flushToken();
      inString = true;
      i++;
      continue;
    }

    if (char === '*' && line[i + 1] === '*') {
      flushToken();
      // Check for reference **...**
      const endIndex = line.indexOf('**', i + 2);
      if (endIndex !== -1) {
        const ref = line.substring(i, endIndex + 2);
        tokens.push(<span key={tokens.length} className={PROSE_HIGHLIGHT.references}>{ref}</span>);
        i = endIndex + 2;
        continue;
      }
    }

    if (/[\s:=(,)]/.test(char)) {
      flushToken();
      if (char === ':' && line[i + 1] === ' ') {
        tokens.push(<span key={tokens.length} className="text-slate-500">:</span>);
        tokens.push(<span key={tokens.length} className="text-slate-600"> </span>);
        i += 2;
        continue;
      }
      if (char === '=' && line[i + 1] === ' ') {
        tokens.push(<span key={tokens.length} className="text-slate-400 font-medium"> = </span>);
        i += 2;
        continue;
      }
      if (char === '(' || char === ')') {
        tokens.push(<span key={tokens.length} className="text-slate-500">{char}</span>);
      } else if (char === ',') {
        tokens.push(<span key={tokens.length} className="text-slate-500">,</span>);
      } else if (char === ' ') {
        tokens.push(<span key={tokens.length} className="text-slate-600">{char}</span>);
      }
      i++;
      continue;
    }

    currentToken += char;
    i++;
  }

  flushToken();

  return (
    <span className="text-slate-200">
      {tokens.length > 0 ? tokens : <span className="text-slate-200">{line}</span>}
    </span>
  );
}

export function ProseEditor({ value, onChange, placeholder = '输入 .prose 工作流代码...' }) {
  const textareaRef = useRef(null)

  const lines = value.split('\n')
  const lineCount = Math.max(lines.length, 20)

  const handleKeyDown = useCallback((e) => {
    // Tab handling
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      // Set cursor position after the tab
      requestAnimationFrame(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      });
    }
  }, [value, onChange]);

  return (
    <div className="flex bg-gray-900 rounded-lg overflow-hidden border border-gray-700 h-full">
      {/* Line Numbers */}
      <div className="py-4 px-3 text-right text-gray-500 text-sm font-mono select-none bg-gray-900/50 border-r border-gray-800 min-w-[3rem]">
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} className="leading-6">{i + 1}</div>
        ))}
      </div>

      {/* Editor */}
      <div className="flex-1 relative">
        {/* Highlighted background */}
        <div className="absolute inset-0 py-4 px-4 pointer-events-none overflow-hidden font-mono text-sm">
          {lines.map((line, i) => (
            <div key={i} className={`leading-6 whitespace-pre-wrap break-all ${getLineClass(line)}`}>
              {highlightLine(line)}
            </div>
          ))}
          {/* Extra empty lines */}
          {Array.from({ length: lineCount - lines.length }, (_, i) => (
            <div key={`empty-${i}`} className="leading-6 font-mono text-sm text-slate-700">{' '}</div>
          ))}
        </div>

        {/* Actual textarea - transparent text to show highlight underneath */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="relative w-full py-4 px-4 bg-transparent font-mono text-sm leading-6 resize-none outline-none min-h-full text-transparent caret-white"
          spellCheck={false}
          placeholder={placeholder}
          style={{ minHeight: '400px' }}
        />
      </div>
    </div>
  )
}
