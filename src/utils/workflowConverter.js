/**
 * Workflow format converter between OpenProse and ComfyUI JSON formats
 * Supports: session, agent, parallel, repeat, for, loop, if/elif/else, try/catch, choice, block/do, let/const, context, use, input/output
 */

/**
 * @typedef {Object} ComfyUINode
 * @property {string} id
 * @property {string} type
 * @property {[number, number]} pos
 * @property {{ width?: number, height?: number }} [size]
 * @property {Record<string, any>} properties
 * @property {Record<string, any>} [inputs]
 */

/**
 * @typedef {Object} ComfyUIEdge
 * @property {string} from
 * @property {number} from_slot
 * @property {string} to
 * @property {number} to_slot
 */

/**
 * @typedef {Object} ComfyUIWorkflow
 * @property {ComfyUINode[]} nodes
 * @property {ComfyUIEdge[]} edges
 */

// Node type colors and icons
export const NODE_TYPES = {
  Start: { bg: '#22c55e', border: '#16a34a', color: '#4ade80', slots: { in: 0, out: 1 } },
  End: { bg: '#22c55e', border: '#16a34a', color: '#4ade80', slots: { in: 1, out: 0 } },
  Session: { bg: '#3b82f6', border: '#2563eb', color: '#60a5fa', slots: { in: 1, out: 1 } },
  Agent: { bg: '#a855f7', border: '#9333ea', color: '#c084fc', slots: { in: 1, out: 1 } },
  Parallel: { bg: '#eab308', border: '#ca8a04', color: '#facc15', slots: { in: 1, out: 2 } },
  Loop: { bg: '#f97316', border: '#ea580c', color: '#fb923c', slots: { in: 1, out: 1 } },
  Conditional: { bg: '#ef4444', border: '#dc2626', color: '#f87171', slots: { in: 1, out: 2 } },
  TryCatch: { bg: '#6b7280', border: '#4b5563', color: '#9ca3af', slots: { in: 1, out: 2 } },
  Block: { bg: '#14b8a6', border: '#0d9488', color: '#2dd4bf', slots: { in: 1, out: 1 } },
  Variable: { bg: '#64748b', border: '#475569', color: '#94a3b8', slots: { in: 0, out: 1 } },
  Input: { bg: '#22c55e', border: '#16a34a', color: '#4ade80', slots: { in: 0, out: 1 } },
  Output: { bg: '#ec4899', border: '#db2777', color: '#f472b6', slots: { in: 1, out: 0 } },
  Choice: { bg: '#8b5cf6', border: '#7c3aed', color: '#a78bfa', slots: { in: 1, out: 2 } },
  Context: { bg: '#06b6d4', border: '#0891b2', color: '#22d3ee', slots: { in: 1, out: 1 } }
};

// Keywords for OpenProse syntax
const KEYWORDS = [
  'session', 'resume', 'agent', 'parallel', 'repeat', 'for', 'loop',
  'if', 'elif', 'else', 'try', 'catch', 'finally', 'choice', 'option',
  'block', 'do', 'let', 'const', 'context', 'use', 'input', 'output'
];

// Auto-generated node ID counter
let nodeIdCounter = 1;
const genId = () => `node_${nodeIdCounter++}`;

/**
 * Parse OpenProse text into structured AST
 * @param {string} prose
 * @returns {{ statements: any[], errors: string[] }}
 */
export function parseProse(prose) {
  const statements = [];
  const errors = [];
  const lines = prose.split('\n');
  let currentStatement = null;
  let currentBlock = null;
  let blockIndent = 0;
  let i = 0;

  const getIndent = (line) => {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  };

  const parseExpression = (expr) => {
    expr = expr.trim();

    // String literal
    if (expr.startsWith('"') && expr.endsWith('"')) {
      return { type: 'string', value: expr.slice(1, -1) };
    }

    // Boolean/named reference like **condition**
    if (expr.startsWith('**') && expr.endsWith('**')) {
      return { type: 'reference', value: expr.slice(2, -2) };
    }

    // Array literal
    if (expr.startsWith('[') && expr.endsWith(']')) {
      const items = expr.slice(1, -1).split(',').map(s => parseExpression(s.trim()));
      return { type: 'array', items };
    }

    // Object property access like context: result
    if (expr.includes(':')) {
      const [key, ...rest] = expr.split(':');
      return { type: 'property', key: key.trim(), value: parseExpression(rest.join(':').trim()) };
    }

    // Variable reference or assignment like a = session "Task A"
    if (expr.includes('=')) {
      const [left, right] = expr.split('=').map(s => s.trim());
      return { type: 'assignment', left, right: parseExpression(right) };
    }

    // Function call like session "Task"
    const funcMatch = expr.match(/^(\w+)\s+(.*)$/);
    if (funcMatch) {
      return { type: 'call', func: funcMatch[1], args: parseExpression(funcMatch[2]) };
    }

    return { type: 'identifier', value: expr };
  };

  const parseStatement = (line) => {
    const trimmed = line.trim();

    // Empty line or comment
    if (!trimmed || trimmed.startsWith('#')) {
      return null;
    }

    // Agent definition: agent name:
    const agentMatch = trimmed.match(/^agent\s+(\w+)\s*:$/);
    if (agentMatch) {
      return { type: 'agent', name: agentMatch[1], properties: {} };
    }

    // Session: session "name" or session: agentName
    const sessionMatch = trimmed.match(/^session\s*(?::\s*(\w+))?(?:\s+"(.*)")?$/);
    if (sessionMatch) {
      return {
        type: 'session',
        agent: sessionMatch[1] || null,
        name: sessionMatch[2] || null,
        context: null
      };
    }

    // Parallel: parallel:
    if (trimmed === 'parallel:') {
      return { type: 'parallel', branches: [] };
    }

    // Repeat: repeat N:
    const repeatMatch = trimmed.match(/^repeat\s+(\d+)\s*:$/);
    if (repeatMatch) {
      return { type: 'repeat', count: parseInt(repeatMatch[1], 10), body: [] };
    }

    // For: for item in [...]:
    const forMatch = trimmed.match(/^for\s+(\w+)\s+in\s+(.+):$/);
    if (forMatch) {
      return { type: 'for', variable: forMatch[1], collection: parseExpression(forMatch[2]), body: [] };
    }

    // Loop: loop until **condition** (max: N):
    const loopMatch = trimmed.match(/^loop\s+until\s+\*\*(\w+)\*\*\s*\((?:max:\s*(\d+))?\):$/);
    if (loopMatch) {
      return { type: 'loop', condition: loopMatch[1], max: loopMatch[2] ? parseInt(loopMatch[2], 10) : null, body: [] };
    }

    // If: if **condition**:
    const ifMatch = trimmed.match(/^if\s+\*\*(\w+)\*\*\s*:$/);
    if (ifMatch) {
      return { type: 'if', condition: ifMatch[1], body: [], elif: [], elseBody: null };
    }

    // Elif: elif **condition**:
    const elifMatch = trimmed.match(/^elif\s+\*\*(\w+)\*\*\s*:$/);
    if (elifMatch) {
      return { type: 'elif', condition: elifMatch[1], body: [] };
    }

    // Else:
    if (trimmed === 'else:') {
      return { type: 'else', body: [] };
    }

    // Try:
    if (trimmed === 'try:') {
      return { type: 'try', body: [], catchBody: null, finallyBody: null };
    }

    // Catch: catch as err:
    const catchMatch = trimmed.match(/^catch\s+as\s+(\w+)\s*:$/);
    if (catchMatch) {
      return { type: 'catch', errorVar: catchMatch[1], body: [] };
    }

    // Finally:
    if (trimmed === 'finally:') {
      return { type: 'finally', body: [] };
    }

    // Choice: choice **condition**:
    const choiceMatch = trimmed.match(/^choice\s+\*\*(\w+)\*\*\s*:$/);
    if (choiceMatch) {
      return { type: 'choice', selector: choiceMatch[1], options: [] };
    }

    // Option: option "Label":
    const optionMatch = trimmed.match(/^option\s+"([^"]+)"\s*:$/);
    if (optionMatch) {
      return { type: 'option', label: optionMatch[1], body: [] };
    }

    // Block: block name(params):
    const blockMatch = trimmed.match(/^block\s+(\w+)\s*\(([^)]*)\)\s*:$/);
    if (blockMatch) {
      return { type: 'block', name: blockMatch[1], params: blockMatch[2].split(',').map(s => s.trim()).filter(Boolean), body: [] };
    }

    // Do: do name(args)
    const doMatch = trimmed.match(/^do\s+(\w+)\s*\(([^)]*)\)\s*$/);
    if (doMatch) {
      return { type: 'do', name: doMatch[1], args: doMatch[2].split(',').map(s => s.trim()).filter(Boolean) };
    }

    // Let: let var = value
    const letMatch = trimmed.match(/^let\s+(\w+)\s*=\s*(.+)$/);
    if (letMatch) {
      return { type: 'let', name: letMatch[1], value: parseExpression(letMatch[2]) };
    }

    // Const: const var = value
    const constMatch = trimmed.match(/^const\s+(\w+)\s*=\s*(.+)$/);
    if (constMatch) {
      return { type: 'const', name: constMatch[1], value: parseExpression(constMatch[2]) };
    }

    // Context: context: var
    const contextMatch = trimmed.match(/^context:\s*(.+)$/);
    if (contextMatch) {
      return { type: 'context', variable: contextMatch[1].trim() };
    }

    // Use: use "path"
    const useMatch = trimmed.match(/^use\s+"([^"]+)"\s*$/);
    if (useMatch) {
      return { type: 'use', path: useMatch[1] };
    }

    // Input: input name: "description"
    const inputMatch = trimmed.match(/^input\s+(\w+)\s*:\s*(.+)$/);
    if (inputMatch) {
      return { type: 'input', name: inputMatch[1], description: inputMatch[2].trim() };
    }

    // Output: output name = value
    const outputMatch = trimmed.match(/^output\s+(\w+)\s*=\s*(.+)$/);
    if (outputMatch) {
      return { type: 'output', name: outputMatch[1], value: parseExpression(outputMatch[2]) };
    }

    // Resume: resume: agentName
    const resumeMatch = trimmed.match(/^resume:\s*(\w+)$/);
    if (resumeMatch) {
      return { type: 'resume', agent: resumeMatch[1] };
    }

    // Branch assignment in parallel: a = session "Task"
    const branchMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
    if (branchMatch) {
      return { type: 'branch', name: branchMatch[1], value: parseExpression(branchMatch[2]) };
    }

    return null;
  };

  // Main parsing loop
  i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    const indent = getIndent(line);

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      i++;
      continue;
    }

    // Handle block closing (dedent)
    if (currentBlock && indent < blockIndent) {
      statements.push(currentBlock);
      currentBlock = null;
      blockIndent = 0;
      continue;
    }

    const stmt = parseStatement(line);

    if (stmt) {
      if (stmt.body !== undefined && Array.isArray(stmt.body)) {
        // This statement has a body (block start)
        currentBlock = stmt;
        blockIndent = indent + 2; // Assume 2-space indent for body
        i++;
      } else {
        statements.push(stmt);
        i++;
      }
    } else {
      // Unknown syntax - might be continuation or error
      if (trimmed.startsWith('  ') || trimmed.startsWith('\t')) {
        // Indented line - might be part of current block's properties
        if (currentBlock && Array.isArray(currentBlock.body)) {
          const propMatch = trimmed.match(/^(\w+):\s*(.*)$/);
          if (propMatch) {
            currentBlock.properties = currentBlock.properties || {};
            currentBlock.properties[propMatch[1]] = propMatch[2].trim();
            i++;
            continue;
          }
        }
      }
      errors.push(`Unknown syntax at line ${i + 1}: ${trimmed}`);
      i++;
    }
  }

  if (currentBlock) {
    statements.push(currentBlock);
  }

  return { statements, errors };
}

/**
 * Convert OpenProse AST to ComfyUI workflow
 * @param {string} prose
 * @returns {ComfyUIWorkflow}
 */
export function proseToComfyUI(prose) {
  nodeIdCounter = 1;
  const { statements, errors } = parseProse(prose);

  if (errors.length > 0) {
    console.warn('Prose parsing errors:', errors);
  }

  const nodes = [];
  const edges = [];
  const nodeMap = new Map();
  let yOffset = 0;
  const X_START = 100;
  const X_GAP = 280;
  const Y_GAP = 120;

  const createNode = (type, properties, pos) => {
    const id = genId();
    const node = { id, type, pos, size: [240, 80], properties, inputs: {}, outputs: {} };
    nodes.push(node);
    nodeMap.set(id, node);
    return node;
  };

  const addEdge = (fromId, toId, fromSlot = 0, toSlot = 0) => {
    edges.push({ from: fromId, from_slot: fromSlot, to: toId, to_slot: toSlot });
  };

  // Process statements and build nodes
  const processStatements = (stmts, startX, startY) => {
    let currentX = startX;
    let currentY = startY;

    stmts.forEach((stmt) => {
      switch (stmt.type) {
        case 'input': {
          const node = createNode('Input', {
            name: stmt.name,
            description: stmt.description
          }, [currentX, currentY]);
          currentY += Y_GAP;
          break;
        }

        case 'output': {
          const node = createNode('Output', {
            name: stmt.name,
            expression: stmt.value
          }, [currentX, currentY]);
          currentY += Y_GAP;
          break;
        }

        case 'agent': {
          const node = createNode('Agent', {
            name: stmt.name,
            ...stmt.properties
          }, [currentX, currentY]);
          currentY += Y_GAP;
          break;
        }

        case 'session': {
          const node = createNode('Session', {
            name: stmt.name || 'Session',
            agent: stmt.agent,
            context: stmt.context
          }, [currentX, currentY]);
          currentY += Y_GAP;
          break;
        }

        case 'resume': {
          const node = createNode('Session', {
            name: `Resume ${stmt.agent}`,
            agent: stmt.agent,
            resume: true
          }, [currentX, currentY]);
          currentY += Y_GAP;
          break;
        }

        case 'let':
        case 'const': {
          const node = createNode('Variable', {
            name: stmt.name,
            value: stmt.value,
            mutable: stmt.type === 'let'
          }, [currentX, currentY]);
          currentY += Y_GAP;
          break;
        }

        case 'context': {
          const node = createNode('Context', {
            variable: stmt.variable
          }, [currentX, currentY]);
          currentY += Y_GAP;
          break;
        }

        case 'parallel': {
          const node = createNode('Parallel', {
            branches: stmt.branches || []
          }, [currentX, currentY]);
          currentY += Y_GAP;
          break;
        }

        case 'repeat': {
          const node = createNode('Loop', {
            type: 'repeat',
            count: stmt.count,
            body: stmt.body
          }, [currentX, currentY]);
          currentY += Y_GAP;
          break;
        }

        case 'for': {
          const node = createNode('Loop', {
            type: 'for',
            variable: stmt.variable,
            collection: stmt.collection,
            body: stmt.body
          }, [currentX, currentY]);
          currentY += Y_GAP;
          break;
        }

        case 'loop': {
          const node = createNode('Loop', {
            type: 'loop',
            condition: stmt.condition,
            max: stmt.max,
            body: stmt.body
          }, [currentX, currentY]);
          currentY += Y_GAP;
          break;
        }

        case 'if': {
          const node = createNode('Conditional', {
            condition: stmt.condition,
            branches: [
              { condition: stmt.condition, body: stmt.body },
              ...(stmt.elif || []).map(e => ({ condition: e.condition, body: e.body })),
              stmt.elseBody ? { condition: 'else', body: stmt.elseBody } : null
            ].filter(Boolean)
          }, [currentX, currentY]);
          currentY += Y_GAP;
          break;
        }

        case 'choice': {
          const node = createNode('Choice', {
            selector: stmt.selector,
            options: stmt.options || []
          }, [currentX, currentY]);
          currentY += Y_GAP;
          break;
        }

        case 'try': {
          const node = createNode('TryCatch', {
            body: stmt.body,
            catchBody: stmt.catchBody,
            finallyBody: stmt.finallyBody,
            errorVar: stmt.errorVar
          }, [currentX, currentY]);
          currentY += Y_GAP;
          break;
        }

        case 'block': {
          const node = createNode('Block', {
            name: stmt.name,
            params: stmt.params,
            body: stmt.body
          }, [currentX, currentY]);
          currentY += Y_GAP;
          break;
        }

        case 'do': {
          const node = createNode('Block', {
            type: 'call',
            name: stmt.name,
            args: stmt.args
          }, [currentX, currentY]);
          currentY += Y_GAP;
          break;
        }

        case 'use': {
          const node = createNode('Block', {
            type: 'use',
            path: stmt.path
          }, [currentX, currentY]);
          currentY += Y_GAP;
          break;
        }

        case 'branch': {
          const node = createNode('Session', {
            name: `${stmt.name} = ${JSON.stringify(stmt.value)}`,
            branch: stmt.name
          }, [currentX, currentY]);
          currentY += Y_GAP;
          break;
        }
      }
    });

    return { maxX: currentX, maxY: currentY };
  };

  // If no nodes, return empty workflow
  if (statements.length === 0) {
    return { nodes: [], edges: [] };
  }

  // Add Start node
  const startNode = createNode('Start', { name: 'Start' }, [X_START - 100, yOffset + 60]);
  yOffset = 60;

  // Process all statements
  processStatements(statements, X_START, yOffset);

  // Add End node
  createNode('End', { name: 'End' }, [X_START + nodes.length * X_GAP, 200]);

  // Auto-connect sequential nodes
  for (let i = 0; i < nodes.length - 1; i++) {
    addEdge(nodes[i].id, nodes[i + 1].id);
  }

  // Auto-layout nodes from left to right
  autoLayout(nodes, edges);

  return { nodes, edges };
}

/**
 * Auto-layout algorithm (left-to-right flow)
 * @param {ComfyUINode[]} nodes
 * @param {ComfyUIEdge[]} edges
 */
export function autoLayout(nodes, edges) {
  if (nodes.length === 0) return;

  const X_START = 100;
  const Y_START = 100;
  const X_GAP = 280;
  const Y_GAP = 120;

  // Build adjacency map
  const outEdges = new Map();
  const inEdges = new Map();
  nodes.forEach(n => {
    outEdges.set(n.id, []);
    inEdges.set(n.id, []);
  });
  edges.forEach(e => {
    outEdges.get(e.from)?.push(e);
    inEdges.get(e.to)?.push(e);
  });

  // Find root nodes (no incoming edges)
  const roots = nodes.filter(n => (inEdges.get(n.id) || []).length === 0);
  const visited = new Set();
  const layers = [];

  // BFS to assign layers
  const assignLayers = (startNodes) => {
    let layer = 0;
    const queue = startNodes.map(n => ({ node: n, layer: 0 }));

    while (queue.length > 0) {
      const { node, layer } = queue.shift();

      if (visited.has(node.id)) continue;
      visited.add(node.id);

      if (!layers[layer]) layers[layer] = [];
      layers[layer].push(node);

      const outs = outEdges.get(node.id) || [];
      outs.forEach(e => {
        const target = nodes.find(n => n.id === e.to);
        if (target && !visited.has(target.id)) {
          queue.push({ node: target, layer: layer + 1 });
        }
      });
    }
  };

  assignLayers(roots.length > 0 ? roots : [nodes[0]]);

  // Handle disconnected nodes
  nodes.forEach(n => {
    if (!visited.has(n.id)) {
      if (!layers[0]) layers[0] = [];
      layers[0].push(n);
    }
  });

  // Position nodes
  layers.forEach((layerNodes, layerIndex) => {
    const x = X_START + layerIndex * X_GAP;
    layerNodes.forEach((node, posIndex) => {
      node.pos = [x, Y_START + posIndex * Y_GAP];
    });
  });
}

/**
 * Convert ComfyUI workflow to OpenProse text
 * @param {ComfyUIWorkflow} workflow
 * @returns {string}
 */
export function comfyUIToProse(workflow) {
  const { nodes, edges } = workflow;

  if (nodes.length === 0) {
    return '';
  }

  const lines = ['# 工作流', ''];

  // Sort nodes by position (left to right)
  const sortedNodes = [...nodes].sort((a, b) => {
    const [ax, ay] = a.pos;
    const [bx, by] = b.pos;
    if (Math.abs(ax - bx) < 50) return ay - by;
    return ax - bx;
  });

  // Build edge map for connections
  const nodeInputs = new Map();
  edges.forEach(e => {
    if (!nodeInputs.has(e.to)) nodeInputs.set(e.to, []);
    nodeInputs.get(e.to).push(e);
  });

  sortedNodes.forEach((node) => {
    switch (node.type) {
      case 'Start':
        lines.push('## 开始');
        lines.push('');
        break;

      case 'End':
        lines.push('## 结束');
        lines.push('');
        break;

      case 'Input':
        lines.push(`input ${node.properties?.name || 'topic'}: "${node.properties?.description || ''}"`);
        lines.push('');
        break;

      case 'Output':
        lines.push(`output ${node.properties?.name || 'result'} = ${JSON.stringify(node.properties?.expression)}`);
        lines.push('');
        break;

      case 'Agent':
        lines.push(`agent ${node.properties?.name || 'agent'}:${node.properties?.model ? `\n  model: ${node.properties.model}` : ''}${node.properties?.persist ? '\n  persist: true' : ''}${node.properties?.prompt ? `\n  prompt: "${node.properties.prompt}"` : ''}`);
        lines.push('');
        break;

      case 'Session':
        if (node.properties?.agent) {
          lines.push(`session: ${node.properties.agent}${node.properties?.context ? `\n  context: ${node.properties.context}` : ''}`);
        } else {
          lines.push(`session "${node.properties?.name || 'Task'}"`);
        }
        lines.push('');
        break;

      case 'Parallel':
        lines.push('parallel:');
        if (node.properties?.branches) {
          node.properties.branches.forEach(b => {
            lines.push(`  ${b.name} = ${JSON.stringify(b.value)}`);
          });
        }
        lines.push('');
        break;

      case 'Loop':
        if (node.properties?.type === 'repeat') {
          lines.push(`repeat ${node.properties?.count || 1}:`);
          lines.push('  session "Repeat task"');
          lines.push('');
        } else if (node.properties?.type === 'for') {
          lines.push(`for ${node.properties?.variable || 'item'} in ${JSON.stringify(node.properties?.collection || [])}:`);
          lines.push('  session "For each item"');
          lines.push('');
        } else if (node.properties?.type === 'loop') {
          lines.push(`loop until **${node.properties?.condition || 'done'}** (max: ${node.properties?.max || 10}):`);
          lines.push('  session "Loop task"');
          lines.push('');
        }
        break;

      case 'Conditional':
        lines.push(`if **${node.properties?.condition || 'condition'}**:`);
        lines.push('  session "True branch"');
        if (node.properties?.branches?.length > 1) {
          node.properties.branches.slice(1).forEach(b => {
            if (b.condition === 'else') {
              lines.push('else:');
            } else {
              lines.push(`elif **${b.condition}**:`);
            }
            lines.push('  session "Branch"');
          });
        }
        lines.push('');
        break;

      case 'Choice':
        lines.push(`choice **${node.properties?.selector || 'selector'}**:`);
        if (node.properties?.options) {
          node.properties.options.forEach(opt => {
            lines.push(`  option "${opt.label}":`);
            lines.push('    session "Option task"');
          });
        }
        lines.push('');
        break;

      case 'TryCatch':
        lines.push('try:');
        lines.push('  session "Try task"');
        if (node.properties?.catchBody) {
          lines.push(`catch as ${node.properties?.errorVar || 'err'}:`);
          lines.push('  session "Catch task"');
        }
        if (node.properties?.finallyBody) {
          lines.push('finally:');
          lines.push('  session "Finally task"');
        }
        lines.push('');
        break;

      case 'Block':
        if (node.properties?.type === 'call') {
          lines.push(`do ${node.properties?.name}(${(node.properties?.args || []).join(', ')})`);
        } else if (node.properties?.type === 'use') {
          lines.push(`use "${node.properties?.path}"`);
        } else {
          lines.push(`block ${node.properties?.name || 'process'}(${(node.properties?.params || []).join(', ')}):`);
          lines.push('  session "Block task"');
        }
        lines.push('');
        break;

      case 'Variable':
        lines.push(`let ${node.properties?.name || 'var'} = ${JSON.stringify(node.properties?.value)}`);
        lines.push('');
        break;

      case 'Context':
        lines.push(`context: ${node.properties?.variable || 'result'}`);
        lines.push('');
        break;

      default:
        lines.push(`session "${node.properties?.name || node.type}"`);
        lines.push('');
    }
  });

  return lines.join('\n').trim();
}

/**
 * Validate OpenProse syntax
 * @param {string} prose
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateProse(prose) {
  const { errors } = parseProse(prose);
  return { valid: errors.length === 0, errors };
}
