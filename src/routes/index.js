module.exports = (app, db) => {
    app.get('/', (req, res) => {
        res.json({
            message: 'Welcome to the Sundial API. Please feel free to use our endpoints for your applications :)',
            routes: {
                info: {
                    endpoint: '/',
                    description: 'This page here.',
                    methods: ['GET'],
                    parameters: {},
                    returns: 'This page here.'
                },
                sunshine: {
                    endpoint: '/sunshine',
                    description: 'Main data route for this API. Used to query aggregated sunshine list data for Canada.',
                    methods: ['GET'],
                    parameters: {
                        year: 'An integer denoting which year of sunshine data you want to receive, optional, defaults to all.',
                        province: 'A string indicating the name of the province you want to receive, optional, defaults to all.'
                    },
                    returns: 'A list of sunshine list entries specific to parameters'
                }
            }
        })
    });

    require('./sunshine')(app, db);
};
