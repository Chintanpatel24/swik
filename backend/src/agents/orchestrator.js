const { callAI }       = require('./aiRunner');
const { executeAgent } = require('./agentExecutor');
const { agentOps, taskOps, msgOps } = require('../db');
const { v4: uuid }     = require('uuid');

async function orchestrateTask(taskId, broadcast) {
  const task = taskOps.getById(taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  const all     = agentOps.getAll();
  const boss    = all.find(a => a.role === 'boss');
  const workers = all.filter(a => a.role !== 'boss');

  const emit = (type, data) => broadcast?.({ type, data });

  const saveMsg = (from, to, content, type='chat') => {
    const msg = {
      id: uuid(), task_id: taskId,
      from_agent: from?.id || from,
      to_agent:   to?.id   || to   || null,
      content, type,
    };
    msgOps.create(msg);
    emit('new_message', { ...msg, from_agent_name: from?.name || from });
    return msg;
  };

  taskOps.update(taskId, { ...task, status: 'running', assigned_to: boss?.id });
  emit('task_update', taskOps.getById(taskId));

  // ── Step 1: Boss plans ──────────────────────────────────────
  emit('agent_status', { agentId: boss?.id, status: 'thinking', message: 'Planning task…' });

  const workerDesc = workers.map(w => {
    const skills = (() => { try { return JSON.parse(w.skills||'[]'); } catch { return []; } })();
    return `- ${w.name} (${w.role}, Floor ${w.floor}): ${skills.join(', ')}`;
  }).join('\n');

  let plan = '';
  if (boss) {
    saveMsg(boss, null, `Analysing task: "${task.title}"`, 'thinking');
    try {
      plan = await callAI(boss, [
        { role: 'system', content: boss.system_prompt || 'You are the boss.' },
        {
          role: 'user',
          content: `Task: "${task.title}"\nDetails: ${task.description}\n\nTeam:\n${workerDesc}\n\nRespond ONLY with JSON:\n{"plan":"brief plan","subtasks":[{"assignee":"name","instruction":"specific instruction"}]}`,
        },
      ]);
      saveMsg(boss, null, plan, 'planning');
    } catch (e) {
      console.error('[Boss]', e.message);
      plan = JSON.stringify({ plan: task.description, subtasks: [{ assignee: workers[0]?.name, instruction: task.description }] });
    }
  }

  // ── Step 2: Parse and delegate ──────────────────────────────
  let subtasks = [];
  try {
    const json = plan.match(/\{[\s\S]*\}/)?.[0];
    if (json) subtasks = JSON.parse(json).subtasks || [];
  } catch {}
  if (!subtasks.length) {
    subtasks = workers.slice(0, 2).map(w => ({ assignee: w.name, instruction: task.description }));
  }

  // ── Step 3: Workers execute in parallel ─────────────────────
  const results = await Promise.all(subtasks.map(async sub => {
    const worker = workers.find(w => w.name.toLowerCase() === sub.assignee?.toLowerCase()) || workers[0];
    if (!worker) return null;

    if (boss) saveMsg(boss, worker, `${worker.name}, please: ${sub.instruction}`, 'delegation');
    emit('agent_status', { agentId: worker.id, status: 'working', message: sub.instruction.slice(0, 60) });

    const result = await executeAgent({
      agent: worker,
      task:  { ...task, description: sub.instruction },
      onUpdate: ({ type, data }) => {
        if (type === 'thinking') emit('agent_status', { agentId: worker.id, status: 'thinking', message: data.message });
        if (type === 'tool_use') {
          emit('agent_status', { agentId: worker.id, status: 'searching', message: `Using ${data.tool}` });
          saveMsg(worker, null, `Using tool: ${data.tool}`, 'tool');
        }
        if (type === 'done')  {
          saveMsg(worker, boss, (data.response||'').slice(0, 800), 'result');
          emit('agent_status', { agentId: worker.id, status: 'idle' });
        }
      },
    });
    return { agent: worker.name, ...result };
  }));

  // ── Step 4: Boss synthesises ────────────────────────────────
  let finalResult = results.filter(Boolean).map(r => `**${r.agent}**: ${r.response || r.error}`).join('\n\n---\n\n');

  if (boss && results.filter(Boolean).length) {
    emit('agent_status', { agentId: boss.id, status: 'thinking', message: 'Synthesising results…' });
    try {
      const synthesis = await callAI(boss, [
        { role: 'system', content: boss.system_prompt || 'You are the boss.' },
        { role: 'user', content: `Task "${task.title}" completed. Team results:\n\n${finalResult}\n\nWrite a concise final summary.` },
      ]);
      saveMsg(boss, null, synthesis, 'summary');
      finalResult = synthesis;
    } catch (e) { console.error('[Boss synthesis]', e.message); }
    emit('agent_status', { agentId: boss.id, status: 'idle' });
  }

  taskOps.update(taskId, { ...task, status: 'done', result: finalResult });
  emit('task_update', taskOps.getById(taskId));
  emit('task_complete', { taskId, result: finalResult });
  return { ok: true, result: finalResult };
}

module.exports = { orchestrateTask };
