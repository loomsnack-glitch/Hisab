export const createConcurrentTaskQueue = (maximumConcurrency: number) => {
    if (!Number.isInteger(maximumConcurrency) || maximumConcurrency < 1) {
        throw new Error("maximumConcurrency must be a positive integer");
    }

    let runningCount = 0;
    const pending: Array<() => void> = [];

    const runNext = () => {
        pending.shift()?.();
    };

    const run = <Value>(task: () => Promise<Value>): Promise<Value> =>
        new Promise((resolve, reject) => {
            const execute = () => {
                runningCount += 1;
                Promise.resolve()
                    .then(task)
                    .then(resolve, reject)
                    .finally(() => {
                        runningCount -= 1;
                        runNext();
                    });
            };

            if (runningCount < maximumConcurrency) {
                execute();
                return;
            }
            pending.push(execute);
        });

    return { run };
};
