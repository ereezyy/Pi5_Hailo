const mockAllTasks = [
  { model_id: 'm1', status: 'completed', inference_results: [{ processing_time_ms: 100 }] },
  { model_id: 'm1', status: 'completed', inference_results: [{ processing_time_ms: 200 }] },
  { model_id: 'm1', status: 'failed', inference_results: [] },
  { model_id: 'm2', status: 'completed', inference_results: [{ processing_time_ms: 50 }] },
];

const modelsToTest = [
  { id: 'm1', name: 'Model 1' },
  { id: 'm2', name: 'Model 2' },
  { id: 'm3', name: 'Model 3' },
];

function runSimulation(allTasks, modelsToTest) {
  const benchmarkResults = [];

  const tasksByModel = (allTasks || []).reduce((acc, task) => {
    if (!acc[task.model_id]) acc[task.model_id] = [];
    acc[task.model_id].push(task);
    return acc;
  }, {});

  for (const model of modelsToTest) {
    const tasks = tasksByModel[model.id] || [];

    if (tasks.length === 0) {
      console.log(`Skipping ${model.name} (no tasks)`);
      continue;
    }

    const completedTasks = tasks.filter(t => t.status === 'completed');
    const processingTimes = completedTasks
      .map(t => t.inference_results?.[0]?.processing_time_ms)
      .filter(t => typeof t === 'number');

    if (processingTimes.length === 0) {
      console.log(`Skipping ${model.name} (no completed tasks with processing time)`);
      continue;
    }

    const avgTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
    const minTime = Math.min(...processingTimes);
    const maxTime = Math.max(...processingTimes);
    const avgFps = 1000 / avgTime;
    const successRate = (completedTasks.length / tasks.length) * 100;

    benchmarkResults.push({
      modelId: model.id,
      modelName: model.name,
      avgProcessingTime: avgTime,
      minProcessingTime: minTime,
      maxProcessingTime: maxTime,
      avgFps,
      totalInferences: tasks.length,
      successRate,
    });
  }

  benchmarkResults.sort((a, b) => a.avgProcessingTime - b.avgProcessingTime);
  return benchmarkResults;
}

const results = runSimulation(mockAllTasks, modelsToTest);
console.log('Results:', JSON.stringify(results, null, 2));

// Assertions
if (results.length !== 2) throw new Error(`Expected 2 results, got ${results.length}`);
if (results[0].modelId !== 'm2') throw new Error(`Expected m2 to be fastest`);
if (results[0].avgFps !== 20) throw new Error(`Expected m2 avgFps to be 20`);
if (results[1].modelId !== 'm1') throw new Error(`Expected m1 to be second`);
if (results[1].avgProcessingTime !== 150) throw new Error(`Expected m1 avgProcessingTime to be 150`);
if (results[1].successRate !== (2/3)*100) throw new Error(`Expected m1 successRate to be 66.6...`);

console.log('Simulation passed!');
