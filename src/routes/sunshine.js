const defaultQuery = {
    limit: 10,
    start: 0,

    filter: {
        provinces: require('../services').services.map(
            ({ province }) => province.toLowerCase()
        ),

        minYear: undefined,
        maxYear: undefined,
        minSalary: undefined,
        maxSalary: undefined,

        textFilters: []
    },

    sortField: 'year',
    sortOrder: 'descending'
};

module.exports = (app, db) => {
    const listHandler = async (req, res) => {
        const {
            limit,
            start,

            filter,
            search,

            sortField,
            sortOrder
        } = req.query;

        const query = {
            limit: parseInt(limit) || defaultQuery.limit,
            start: parseInt(start) || defaultQuery.start,

            filter: {
                ...defaultQuery.filter,
                ...JSON.parse(filter || '{}')
            },
            search: search || defaultQuery.search,

            sortField: sortField || defaultQuery.sortField,
            sortOrder: sortOrder || defaultQuery.sortOrder
        };

        try {
            const result = await db.getList(query);
            res.status(200).json(result);
        } catch (err) {
            console.log(err);
            res.status(500).json({
                error: process.env.NODE_ENV === 'development' ? err : 'Internal Server Error',
                message: 'An error was encountered while trying to load the specified list of provincial data. Please try again.'
            });
        }
    };

    app.get('/sunshine/list', listHandler);
    app.get('/sunshine', listHandler);
};
