require('dotenv').config();

const init = async () => {

};

init().then(() => console.log(`
    Started api-service.
    Port    = ${process.env.PORT}
    Redis   = ${process.env.REDIS_HOST}
    MongoDB = ${process.env.MONGO_HOST}
`), () => console.log(`
    Failed to start api-service.
`));
