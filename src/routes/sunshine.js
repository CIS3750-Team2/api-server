
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

const queryFromReq = (req) => {
    const {
        limit,
        start,

        filter,
        search,

        sortField,
        sortOrder
    } = req.query;

    const {
        provinces,
        minYear, maxYear,
        minSalary, maxSalary,
        textFilters
    } = JSON.parse(filter || '{}') || {};

    return {
        limit: parseInt(limit) || defaultQuery.limit,
        start: parseInt(start) || defaultQuery.start,

        filter: {
            provinces: provinces || defaultQuery.filter.provinces,
            minYear: minYear && parseInt(minYear),
            maxYear: maxYear && parseInt(maxYear),
            minSalary: minSalary && parseInt(minSalary),
            maxSalary: maxSalary && parseInt(maxSalary),
            textFilters: textFilters || defaultQuery.filter.textFilters
        },
        search: search || defaultQuery.search,

        sortField: sortField || defaultQuery.sortField,
        sortOrder: sortOrder || defaultQuery.sortOrder
    };
};

module.exports = (app, db) => {
    const listHandler = async (req, res) => {
        const query = queryFromReq(req);

        try {
            const result = await db.getList(query);
            res.status(200).json(result);
        } catch (err) {
            console.error('An error occurred while accessing list route!');
            console.log(err);
            res.status(500).json({
                error: process.env.NODE_ENV === 'development' ? err : 'Internal Server Error',
                message: 'An error was encountered while trying to load the specified list of provincial data. Please try again.'
            });
        }
    };

    const countHandler = async (req, res) => {
        const query = queryFromReq(req);

        try {
            const count = await db.getCount(query);
            res.status(200).json(count);
        } catch (err) {
            console.error('An error occurred while accessing count route!');
            console.log(err);
            res.status(500).json({
                error: process.env.NODE_ENV === 'development' ? err : 'Internal Server Error',
                message: 'An error was encountered while trying to load the specified count of provincial data. Please try again.'
            });
        }
    };

    const fieldsHandler = async (req, res) => {
        res.status(200).json(db.getFields());
    };

    const exportHandler = async (req, res) => {
        const query = queryFromReq(req);

        // headers - array of strings
        const headersToCSV = (headers) => {
            var line = '';
            for (header of headers) {
                line += '"' + header.toString() + '",';
            }
            line += '\n';
            return line;
        }

        // entry - an object from database to convert to a CSV line
        // headers - array of headers
        const entryToCSV = (entry, headers) => {
            var line = '';
            for (header of headers) {
                if (entry[header] === undefined) {
                    line += ',"",';
                } else {
                    line += ('"' + entry[header].toString() + '",');
                }
            }
            line += '\n';
            return line;
        }

        try {
            const cursor = await db.getCursor(query);
            const csvHeaders = db.getFields();
            res.setHeader('Content-disposition', 'attachment; filename=SundialExport.csv');
            res.setHeader('Content-Type', 'text/csv');
            res.write(headersToCSV(csvHeaders));
            while (await cursor.hasNext()) {
                const entry = await cursor.next();
                res.write(entryToCSV(entry, csvHeaders));
            }
        } catch (err) {
            console.error('An error occurred while accessing export route!');
            console.log(err);
        }
        res.end();
    };

    app.get('/sunshine/list', listHandler);
    app.get('/sunshine/count', countHandler);
    app.get('/sunshine/fields', fieldsHandler);
    app.get('/sunshine/export', exportHandler);
    app.get('/sunshine', listHandler);
};
