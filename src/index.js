require('dotenv').config();
const {env: {PORT, REDIS_URL, MONGODB_URI}} = process;

process.on('unhandledRejection', (err) => console.error('Uncaught error', err));

const init = async () => {
    // setup routing and express middleware
    const app = require('express')();
    const corsMiddleware = require('cors')({
        origin: true,
        credentials: true
    });
    app.use(corsMiddleware);
    app.use(require('body-parser').json());
    app.options('*', corsMiddleware);

    // initialize database manager and queue manager
    const db = await require('./db')(MONGODB_URI);
    const queue = require('./queue')(REDIS_URL);
    await queue.init(db.addData);

    require('./routes')(app, db);

    return new Promise((resolve, reject) =>
        app.listen(PORT)
            .on('listening', () => resolve())
            .on('error', (err) => reject(err))
    );
};

init().then(() => console.log(`
    Started api-service (API is listening now).
    Port    = ${PORT}
    Redis   = ${REDIS_URL}
    MongoDB = ${MONGODB_URI}
`), (err) => console.error(`
    Failed to start api-service.
    ${err}
`));
