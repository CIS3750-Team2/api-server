module.exports = {
    default: {
        ttl: 24 * 60 * 60 * 1000
    },
    services: [
        {
            province: 'ontario',
            enabled: true,
            years: [
                2017, 2016, 2015, 2014,
                2013, 2012, 2011, 2010,
                2009, 2008, 2007, 2006,
                2005, 2004, 2003, 2002,
                2001, 2000, 1999, 1998,
                1997, 1996
            ],
        },
        {
            province: 'alberta',
            enabled: true,
            years: [
                2017, 2016, 2015, 2014,
                2013, 2012
            ],
        },
        {
            province: 'quebec',
            enabled: false,
            years: [
                2017
            ],
        },
    ]
};
