module.exports = (app, db) => {
    app.get('/sunshine', async (req, res) => {
        let { year, province } = req.query;

        if (year) {
            year = parseInt(year);
            if (year < 0 || year > 3000) year = undefined;
        }

        if (province && typeof province === 'string' && province.length > 0) {
            province = province.toLowerCase();
        } else {
            province = undefined;
        }

        try {
            const result = await db.getList(year, province);
            res.status(200).json(result);
        } catch (err) {
            console.log(err);
            res.status(500).json({
                error: process.env.NODE_ENV === 'development' ? err : 'Internal Server Error',
                message: 'An error was encountered while trying to load the specified list of provincial data. Please try again.'
            });
        }
    });
};
