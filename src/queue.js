const Queue = require('bull');
const serviceInfo = require('./services');

const jobOpts = {
    delay: 1000,
    removeOnComplete: true,
    removeOnFail: true
};
const refreshJobOpts = {
    ...jobOpts,
    repeat: { every: serviceInfo.default.ttl }
};

const jobErrorHandler = (err) => console.warn(err);
const jobStalledHandler = (job) => console.warn('Stalled job: ', job);
const jobFailedHandler = (job, err) => console.warn('Failed job: ', job, 'Error: ', err);

module.exports = (redisUrl) => {
    let refreshQueue;
    let updateQueue;

    const init = async (addDataHandler = () => {}) => {
        refreshQueue = new Queue('refresh', redisUrl);
        updateQueue = new Queue('update', redisUrl);

        // clean any old repeated refreshes
        Promise.all([
            refreshQueue.clean(100, 'completed'),
            refreshQueue.clean(100, 'wait'),
            refreshQueue.clean(100, 'delayed')
        ]).catch((err) =>
            console.warn('Error cleaning refresh queue: ', err)
        );

        // register the update job processor
        updateQueue.process(1,async ({ data = {} }) =>
            Promise.all(Object.keys(data).map(
                (dataset) => addDataHandler(dataset, data[dataset])
            ))
        );

        // register repeated jobs for each provincial data service
        serviceInfo.services
            .filter(({ enabled }) => enabled)
            .forEach((service) => {
                refreshQueue.add(service.province, service, jobOpts);
                refreshQueue.add(service.province, service, refreshJobOpts);
            });

        // register error loggers
        refreshQueue.on('global:error', jobErrorHandler);
        refreshQueue.on('global:stalled', jobStalledHandler);
        refreshQueue.on('global:failed', jobFailedHandler);
        updateQueue.on('global:error', jobErrorHandler);
        updateQueue.on('global:stalled', jobStalledHandler);
        updateQueue.on('global:failed', jobFailedHandler);
    };

    return {
        redisUrl,
        getRefreshQueue: () => refreshQueue,
        getUpdateQueue: () => updateQueue,
        init
    };
};
