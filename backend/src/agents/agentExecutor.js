const { callAI }    = require('./aiRunner');
const { webSearch } = require('../tools/webSearch');
const { fsTool }    = require('../tools/fileSystem');
const { v4: uuid }  = require('uuid');

const TOOL_DOCS = `
You have access to tools. To call one, write this EXACTLY on its own line:
TOOL_CALL: {"tool":"<name>","args":{...}}

Available tools:
  web_search  — {"tool":"web_search","args":{"query":"your query"}}
  file_write  — {"tool":"file_write","args":{"path":"filename.js","content":"..."}}
  file_read   — {"tool":"file_read","args":{"path":"filename.js"}}
  file_list   — {"tool":"file_list","args":{}}

After a TOOL_CALL you will receive TOOL_RESULT. Use it and continue.
Only use tools when genuinely needed. Always explain what you are doing.
`;

async function executeAgent({ agent, task, prevMessages = [], onUpdate }) {
  const emit = (type, data) => onUpdate?.({ type, agentId: agent.id, data });

  emit('thinking', { message: `${agent.name} is reading the task…` });

  const skills  = (() => { try { return JSON.parse(agent.skills||'[]'); } catch { return []; } })();
  const sysMsg  = {
    role: 'system',
    content: `${agent.system_prompt || `You are ${agent.name}, a ${agent.role} agent.`}

Your skills: ${skills.join(', ') || 'general'}
Task: "${task.title}"
Description: ${task.description}

${TOOL_DOCS}

Work thoughtfully. Produce real, usable output. Write files when creating code or documents.`,
  };

  const msgs = [
    sysMsg,
    ...prevMessages.slice(-10).map(m => ({
      role:    m.from_agent === agent.id ? 'assistant' : 'user',
      content: `[${m.from_agent_name || m.from_agent}]: ${m.content}`,
    })),
    { role: 'user', content: `Please work on this: ${task.description}` },
  ];

  let fullResponse = '';
  const MAX_ITERS  = 6;

  for (let i = 0; i < MAX_ITERS; i++) {
    let aiOut = '';
    try {
      aiOut = await callAI(agent, msgs, tok => { aiOut += tok; emit('token', { token: tok }); });
    } catch (e) {
      emit('error', { message: e.message });
      return { ok: false, error: e.message };
    }

    fullResponse += aiOut;

    // Parse tool calls
    const re = /TOOL_CALL:\s*(\{[\s\S]*?\})/gm;
    let match; let hadTool = false;
    while ((match = re.exec(aiOut)) !== null) {
      hadTool = true;
      let call;
      try { call = JSON.parse(match[1]); } catch { continue; }

      const { tool, args } = call;
      emit('tool_use', { tool, args });

      let result;
      switch (tool) {
        case 'web_search':
          emit('thinking', { message: `${agent.name} searching: "${args.query}"` });
          result = await webSearch(args.query, 5);
          break;
        case 'file_write':
          result = fsTool.write(agent.id, task.id, args.path, args.content);
          emit('file_written', { path: args.path });
          break;
        case 'file_read':
          result = fsTool.read(agent.id, task.id, args.path);
          break;
        case 'file_list':
          result = fsTool.list(agent.id, task.id);
          break;
        default:
          result = { ok: false, error: `Unknown tool: ${tool}` };
      }

      msgs.push({ role: 'assistant', content: aiOut });
      msgs.push({ role: 'user',      content: `TOOL_RESULT: ${JSON.stringify(result, null, 2)}\nContinue your response.` });
      emit('tool_result', { tool, result });
      break; // one tool per iteration
    }

    if (!hadTool) break;
  }

  emit('done', { response: fullResponse });
  return { ok: true, response: fullResponse };
}

module.exports = { executeAgent };
