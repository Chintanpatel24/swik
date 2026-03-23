// agents/orchestrator.js — Boss agent coordinates the whole team
const { callAI }        = require('./aiRunner');
const { executeAgent }  = require('./agentExecutor');
const { agentOps, taskOps, msgOps } = require('../db');
const { v4: uuidv4 }    = require('uuid');

async function orchestrateTask(taskId, broadcast) {
  const task   = taskOps.getById(taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  const agents = agentOps.getAll().filter(a => a.enabled);
  const boss   = agents.find(a => a.role === 'boss');
  const workers= agents.filter(a => a.role !== 'boss');

  const emit = (type, data) => broadcast && broadcast({ type, data });

  // Mark task as running
  taskOps.update(taskId, { ...task, status: 'running', assigned_to: boss?.id });
  emit('task_update', taskOps.getById(taskId));

  function saveMsg(fromAgent, toAgent, content, type = 'chat') {
    const msg = {
      id: uuidv4(), task_id: taskId,
      from_agent: fromAgent?.id || fromAgent,
      to_agent:   toAgent?.id  || toAgent || null,
      content, type
    };
    msgOps.create(msg);
    emit('new_message', { ...msg, from_agent_name: fromAgent?.name || fromAgent });
    return msg;
  }

  // ── STEP 1: Boss analyses task ─────────────────────────────────────────
  emit('agent_status', { agentId: boss?.id, status: 'thinking', message: 'Analysing task...' });

  const workerList = workers.map(w =>
    `- ${w.name} (${w.role}): skills = ${JSON.parse(w.skills || '[]').join(', ')}`
  ).join('\n');

  let plan = '';
  if (boss) {
    try {
      saveMsg(boss, null, `I'm analysing the task: "${task.title}"`, 'thinking');

      plan = await callAI(boss, [
        { role: 'system', content: boss.system_prompt },
        {
          role: 'user',
          content: `Task: "${task.title}"\nDetails: ${task.description}\n\nYour team:\n${workerList}\n\nBreak this into specific subtasks, assign each to the right team member by name. Reply as JSON:\n{\n  "plan": "brief plan",\n  "subtasks": [\n    {"assignee": "name", "instruction": "specific instruction"}\n  ]\n}`
        }
      ]);

      saveMsg(boss, null, plan, 'planning');
    } catch (e) {
      console.error('[Boss] planning error:', e.message);
      plan = JSON.stringify({ plan: task.description, subtasks: [{ assignee: workers[0]?.name, instruction: task.description }] });
    }
  }

  // ── STEP 2: Parse plan and run subtasks ────────────────────────────────
  let subtasks = [];
  try {
    const jsonMatch = plan.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      subtasks = parsed.subtasks || [];
    }
  } catch {
    // If boss plan can't be parsed, just assign to first available worker
    subtasks = workers.slice(0, 2).map(w => ({
      assignee: w.name,
      instruction: task.description
    }));
  }

  if (subtasks.length === 0) {
    subtasks = [{ assignee: workers[0]?.name || 'dev', instruction: task.description }];
  }

  // ── STEP 3: Execute subtasks in parallel ──────────────────────────────
  const results = [];

  await Promise.all(subtasks.map(async (subtask) => {
    const worker = workers.find(w =>
      w.name.toLowerCase() === subtask.assignee?.toLowerCase()
    ) || workers[0];

    if (!worker) return;

    emit('agent_status', { agentId: worker.id, status: 'working', message: `Working on: ${subtask.instruction.slice(0, 50)}...` });

    if (boss) saveMsg(boss, worker, `${worker.name}, please: ${subtask.instruction}`, 'delegation');

    const result = await executeAgent({
      agent: worker,
      task:  { ...task, description: subtask.instruction },
      onUpdate: ({ type, data }) => {
        if (type === 'thinking') emit('agent_status', { agentId: worker.id, status: 'thinking', message: data.message });
        if (type === 'tool_use') {
          emit('agent_status', { agentId: worker.id, status: 'searching', message: `Using: ${data.tool}` });
          saveMsg(worker, null, `Using tool: ${data.tool} ${JSON.stringify(data.args)}`, 'tool');
        }
        if (type === 'done') {
          saveMsg(worker, boss, data.response.slice(0, 1000) + (data.response.length > 1000 ? '...' : ''), 'result');
          emit('agent_status', { agentId: worker.id, status: 'idle' });
        }
        emit('agent_update', { agentId: worker.id, type, data });
      }
    });

    results.push({ agent: worker.name, ...result });
  }));

  // ── STEP 4: Boss synthesises results ──────────────────────────────────
  let finalResult = results.map(r => `${r.agent}: ${r.response || r.error}`).join('\n\n---\n\n');

  if (boss && results.length > 0) {
    emit('agent_status', { agentId: boss.id, status: 'thinking', message: 'Synthesising results...' });
    try {
      const synthesis = await callAI(boss, [
        { role: 'system', content: boss.system_prompt },
        {
          role: 'user',
          content: `The team has completed the task "${task.title}". Here are their results:\n\n${finalResult}\n\nProvide a concise final summary and conclusion.`
        }
      ]);
      saveMsg(boss, null, synthesis, 'summary');
      finalResult = synthesis;
    } catch (e) {
      console.error('[Boss] synthesis error:', e.message);
    }
    emit('agent_status', { agentId: boss.id, status: 'idle' });
  }

  // ── DONE ──────────────────────────────────────────────────────────────
  taskOps.update(taskId, { ...task, status: 'done', result: finalResult });
  emit('task_update', taskOps.getById(taskId));
  emit('task_complete', { taskId, result: finalResult });

  return { ok: true, result: finalResult };
}

module.exports = { orchestrateTask };
