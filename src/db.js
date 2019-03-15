const {MongoClient} = require('mongodb');

const collectionName = 'sunshine_list';

module.exports = async (mongoUri) => {
    const db = (await MongoClient.connect(mongoUri, { useNewUrlParser: true })).db();
    const collection = db.collection(collectionName);

    return {
        mongoUri,
        db,
        collection,
        getList: async (year = null, province = null) => {
            const query = {};
            if (year != null && !isNaN(year)) query.year = year;
            if (province != null && province.length > 0) {
                query.province = province.toLowerCase();
            }

            return await collection.find(query, {
                projection: { dataset: 0 }
            }).toArray();
        },
        addData: async (dataset, data = []) => {
            if (!dataset || dataset.length === 0 || data.length === 0) return;
            dataset = dataset.toLowerCase();

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
            // await collection.removeMany({ dataset });
            // await collection.insertMany(data);
        }
    };
};
