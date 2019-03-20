const {MongoClient} = require('mongodb');

const collectionName = 'sunshine_list';

const textFilterTypes = {
    includes: text => ({ $regex: text, $options: 'i' }),
    not_includes: text => ({ $not: new RegExp(text, 'i') }),
    matches: text => ({ $regex: `^${text}$`, $options: 'im' }),
    not_matches: text => ({ $not: new RegExp(`^${text}$`, 'im') })
};

const toMongoQuery = ({ filter }) => {
    const query = {};

    if (filter) {
        if (filter.provinces) {
            query.province = {
                $in: filter.provinces
            };
        }

        if (filter.minYear || filter.maxYear) {
            query.year = {};
            if (filter.minYear) query.year['$gte'] = filter.minYear;
            if (filter.maxYear) query.year['$lte'] = filter.maxYear;
        }

        if (filter.minSalary || filter.maxSalary) {
            query.salary = {};
            if (filter.minSalary) query.salary['$gte'] = filter.minSalary;
            if (filter.maxSalary) query.salary['$lte'] = filter.maxSalary;
        }

        if (filter.textFilters) {
            const expressions = filter.textFilters
                .filter(({ type, field }) =>
                    type != null
                    && textFilterTypes[type]
                    && field != null
                    && field.length > 0
                )
                .map(({ type, field, text = '' }) => ({
                    [field]: textFilterTypes[type.toLowerCase()](text)
                }));

            if (expressions.length > 0) query.$and = expressions;
        }
    }

    return query;
};

const toMongoSort = ({ sortField, sortOrder }) => ({
    [sortField]: (
        sortOrder === 'asc'
        || sortOrder === 'ascending'
        || sortOrder === 1
        || sortOrder === true
    ) ? 1 : -1
});

module.exports = async (mongoUri) => {
    console.log('Initializing database and generating indexes...');
    const db = (await MongoClient.connect(mongoUri, { useNewUrlParser: true })).db();
    const collection = db.collection(collectionName);
    await collection.createIndex({ "$**": "text" });

    const getCursor = ({ search = '', ...query }) => (
        search.length === 0
            ? collection.find(toMongoQuery(query))
            : collection.find({
                ...toMongoQuery(query),
                $text: {
                    $search: search,
                    $caseSensitive: false
                }
            }, { projection: { score: { $meta: 'textScore' } } })
    );

    return {
        mongoUri,
        db,
        collection,
        getList: async ({ start, limit, ...query }) => {
            const list = await (
                !query.search || query.search.length === 0
                    ? getCursor(query)
                        .sort(toMongoSort(query))
                        .skip(start)
                        .limit(limit)
                        .toArray()
                    : getCursor(query)
                        .sort({
                            score: { $meta: 'textScore' },
                            ...toMongoSort(query)
                        })
                        .skip(start)
                        .limit(limit)
                        .toArray()
            );

            return list.map((entry) => ({
                ...entry,
                dataset: undefined,
                score: undefined
            }));
        },
        getCount: async (query) => await getCursor(query).count(),
        addData: async (datasetName, data = []) => {
            if (!datasetName || datasetName.length === 0 || data.length === 0) return;
            const dataset = datasetName.toLowerCase();

            await collection.bulkWrite([
                {
                    deleteMany: {
                        filter: { dataset }
                    }
                },
                ...data.map((entry) => ({
                    insertOne: {
                        document: {
                            ...entry,
                            dataset
                        }
                    }
                }))
            ], { ordered: true });
        }
    };
};
