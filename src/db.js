const {MongoClient} = require('mongodb');

const collectionName = 'sunshine_list';

const textFilterTypes = {
    includes: text => ({ $regex: text, $options: 'i' }),
    not_includes: text => ({ $not: new RegExp(text, 'i') }),
    matches: text => ({ $regex: `^${text}$`, $options: 'im' }),
    not_matches: text => ({ $not: new RegExp(`^${text}$`, 'im') })
};

const plotMethodOp = {
    avg: '$avg',
    max: '$max',
    min: '$min',
    std: '$stdDevSamp',
    sum: '$sum',
    count: '$sum'
};
const plotMethods = Object.keys(plotMethodOp);

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
        plotMethods,
        collection,
        getCursor,
        getFields: () => [
            '_id',
            'firstName', 'lastName',
            'sector', 'salary', 'taxableBenefits',
            'employer', 'title', 'province',
            'year', 'positionClass', 'severance',
            'original'
        ],
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

            return list.map((entry) => {
                let {salary, taxableBenefits} = entry;
                if (salary && typeof salary === 'string') {
                    salary = parseFloat(salary.replace(/[$,]+/g, ''));
                }
                if (taxableBenefits && typeof taxableBenefits === 'string') {
                    taxableBenefits = parseFloat(taxableBenefits.replace(/[$,]+/g, ''));
                }

                return {
                    ...entry,
                    salary,
                    taxableBenefits,
                    dataset: undefined,
                    score: undefined
                };
            });
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
                ...data.map(({ salary, taxableBenefits, ...entry }) => {
                    if (salary && typeof salary === 'string') {
                        salary = parseFloat(salary.replace(/[$,]+/g, ''));
                    }
                    if (taxableBenefits && typeof taxableBenefits === 'string') {
                        taxableBenefits = parseFloat(taxableBenefits.replace(/[$,]+/g, ''));
                    }

                    return {
                        insertOne: {
                            document: {
                                ...entry,
                                salary,
                                taxableBenefits,
                                dataset
                            }
                        }
                    };
                })
            ], { ordered: true });
        },
        getPlot: async (yField, xField, method, query) => {
            const pipeline = [];
            if (query.filter) {
                pipeline.push({ $match: toMongoQuery(query) });
            }
            if (query.search && query.search.length > 0) {
                pipeline.push({ $text: { $search: search, $caseSensitive: false } });
            }

            // ensure y-fields are correct type
            pipeline.push({
                $match: {
                    $and: [
                        { [yField]: { $type: 'number' } },
                        { [yField]: { $ne: NaN } }
                    ]
                }
            });
            // add stats calculation to pipeline
            pipeline.push({
                $group: {
                    _id: `$${xField}`,
                    y: {
                        [plotMethodOp[method]]: method === 'count' ? 1 : `$${yField}`
                    }
                }
            });
            // change _id to x
            pipeline.push({
                $project: {
                    _id: false,
                    x: '$_id',
                    y: true
                }
            });
            // sort final results by sort stage
            pipeline.push({ $sort: { x: 1 } });

            return await collection.aggregate(pipeline, {
                allowDiskUse: true
            }).toArray();
        }
    };
};
