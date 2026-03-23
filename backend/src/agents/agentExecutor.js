// agents/agentExecutor.js
const { callAI }    = require('./aiRunner');
const { webSearch } = require('../tools/webSearch');
const { fsTool }    = require('../tools/fileSystem');
const { v4: uuidv4 }= require('uuid');

const TOOL_INSTRUCTIONS = `
You have access to these tools. To use a tool, write EXACTLY this format on its own line:
TOOL_CALL: {"tool":"<name>","args":{...}}

Available tools:
- web_search:  {"tool":"web_search","args":{"query":"search terms"}}
- file_write:  {"tool":"file_write","args":{"path":"filename.js","content":"file content"}}
- file_read:   {"tool":"file_read","args":{"path":"filename.js"}}
- file_list:   {"tool":"file_list","args":{}}

After using a tool you will receive a TOOL_RESULT. Use it to continue your response.
Only use tools when genuinely needed. Always show your reasoning before calling a tool.
`;

async function executeAgent({ agent, task, previousMessages = [], onUpdate }) {
  const emit = (type, data) => onUpdate && onUpdate({ type, agentId: agent.id, data });

  emit('thinking', { message: `${agent.name} is thinking...` });

  // Build system message
  const skills   = JSON.parse(agent.skills || '[]').join(', ');
  const systemMsg = {
    role: 'system',
    content: `${agent.system_prompt}

Your skills: ${skills}

Current task: "${task.title}"
Task description: ${task.description}

${TOOL_INSTRUCTIONS}

Work in your isolated workspace. Be thorough and produce real, usable output.`
  };

  const messages = [
    systemMsg,
    ...previousMessages.map(m => ({
      role:    m.from_agent === agent.id ? 'assistant' : 'user',
      content: `[${m.from_agent_name || m.from_agent}]: ${m.content}`
    })),
    {
      role:    'user',
      content: `Please work on this task: ${task.description}`
    }
  ];

  let fullResponse  = '';
  let iterCount     = 0;
  const MAX_ITERS   = 5;

  while (iterCount < MAX_ITERS) {
    iterCount++;

    // Call AI with streaming
    let aiOutput = '';
    try {
      aiOutput = await callAI(agent, messages, (token) => {
        aiOutput += token;
        emit('token', { token });
      });
    } catch (e) {
      emit('error', { message: `AI call failed: ${e.message}` });
      return { ok: false, error: e.message };
    }

    fullResponse += aiOutput;

    // ── PARSE TOOL CALLS ──────────────────────────────────────────────────
    const toolCallRe = /TOOL_CALL:\s*(\{[\s\S]*?\})/gm;
    let match;
    let hadToolCall = false;

    while ((match = toolCallRe.exec(aiOutput)) !== null) {
      hadToolCall = true;
      let toolCall;
      try { toolCall = JSON.parse(match[1]); } catch { continue; }

      const { tool, args } = toolCall;
      emit('tool_use', { tool, args });

      let toolResult;

      switch (tool) {
        case 'web_search': {
          emit('thinking', { message: `${agent.name} is searching: "${args.query}"` });
          toolResult = await webSearch(args.query, 5);
          break;
        }
        case 'file_write': {
          toolResult = fsTool.write(agent.id, task.id, args.path, args.content);
          emit('file_written', { path: args.path, agentId: agent.id, taskId: task.id });
          break;
        }
        case 'file_read': {
          toolResult = fsTool.read(agent.id, task.id, args.path);
          break;
        }
        case 'file_list': {
          toolResult = fsTool.list(agent.id, task.id);
          break;
        }
        default:
          toolResult = { ok: false, error: `Unknown tool: ${tool}` };
      }

      // Feed result back for next iteration
      messages.push({ role: 'assistant', content: aiOutput });
      messages.push({
        role:    'user',
        content: `TOOL_RESULT: ${JSON.stringify(toolResult, null, 2)}\n\nContinue your response based on this result.`
      });

      emit('tool_result', { tool, result: toolResult });
      fullResponse += `\n[Tool: ${tool}]\n${JSON.stringify(toolResult, null, 2)}\n`;

      break; // Process one tool call per iteration then re-run AI
    }

    if (!hadToolCall) break; // No tool calls → done
  }

  emit('done', { response: fullResponse });
  return { ok: true, response: fullResponse };
}

module.exports = { executeAgent };
