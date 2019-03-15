module.exports = {
    default: {
        ttl: 24 * 60 * 60 * 1000
    },
    services: [
        {
            province: 'ontario',
            enabled: true,
            years: [2017, 2016],
        },
        {
            province: 'alberta',
            enabled: false,
            years: [2018],
        },
        {
            province: 'quebec',
            enabled: false,
            years: [2018],
        },
    ]
};
