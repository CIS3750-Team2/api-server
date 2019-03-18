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
                        limit: 'integer - number of entries to return - optional, default: 10',
                        start: 'integer - number of entries to skip before return limit entries - optional, default: 0',
                        filter: 'object - filters to apply to query - optional, default: no filter',
                        search: 'string - quick search to tokenize and filter entries with - optional, default: none',
                        sortField: 'string - field to use for sorting - optional, default: "year"',
                        sortOrder: '"ascending" | "descending" - order of entries to sort - optional, default: "descending"'
                    },
                    returns: 'A list of sunshine list entries specific to parameters'
                }
            }
        })
    });

    require('./sunshine')(app, db);
};
