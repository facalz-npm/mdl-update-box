const axios = require('axios');
const cheerio = require('cheerio');
const { Octokit } = require('@octokit/rest');
require('dotenv/config');

async function main(user, gistId, githubToken) {

    const octokit = new Octokit({
        auth: `token ${githubToken}`
    });

    async function updateGist(lines, desc) {
        let gist;
        try {
            gist = await octokit.gists.get({
                gist_id: gistId
            });
        } catch (error) {
            console.error(`Unable to get gist\n${error}`);
        };

        const filename = Object.keys(gist.data.files)[0];

        try {
            await octokit.gists.update({
                gist_id: gistId,
                files: {
                    [filename]: {
                        filename: desc,
                        content: lines
                    }
                }
            });
        } catch (error) {
            console.error(`Unable to update gist\n${error}`);
        };
    };

    function truncate(str, n) {
        return (str.length > n) ? str.substr(0, n - 1) + '…' : str;
    };

    var list = [],
        movie,
        episodes,
        episodesFixed;

    async function scrap(user) {
        const data = await axios.get('https://mydramalist.com/profile/' + user).then((res) => res.data);
        const $ = cheerio.load(data);

        function lastUpdate() {
            return new Promise((resolve, reject) => {
                const list = [];
                $('.listUpdatesBlock .list li').each(async (i, elem) => {
                    const url = $(elem).find('a').attr('href');

                    list.push({
                        url: url,
                        stats: $(elem).find('.activity').text()
                    })
                    if ($('.listUpdatesBlock .list li').length - 1 == i) {
                        resolve(list);
                    };
                });
            });
        };

        var array = new Set(await lastUpdate());
        array = [...array];

        for (let i = 0; i < array.length; i++) {
            const drama = await axios.get(`https://mydramalist.com${array[i].url}`).then((res) => res.data).catch(() => {
                return
            });

            const $$ = cheerio.load(drama);

            const check = $$('.hidden-sm-down:nth-child(1) .list .list-item:nth-child(1) .inline').first().text().slice(0, -1);
            const name = $$('.box .box-header .film-title').text().replace(/( \([0-9]+\))/gm, '');

            if (check == 'Movie') {
                episodesFixed = 1;
                episodes = 1;
                movie = true;
            } else {
                episodesFixed = $$('.hidden-sm-down:nth-child(1) .list .list-item:nth-child(3)').first().text().replace(/^.*?(?=:)\:(\ \#|\ \ |\ )/gm, '');
                episodes = episodesFixed.length;
            };

            const regex = new RegExp('(Currently watching).([0-9]*\/[0-9]{' + episodes + '})([0-9a-z ]*)|(Completed|Plan to watch|On-hold|Dropped)([0-9a-z ]*)|(Currently watching)([0-9a-z ]*)');

            const stats = regex.exec(array[i].stats);

            if (stats[1] == 'Currently watching') stats[1] = 'Watching'

            if (movie) {
                if (stats[1]) {
                    list.push({
                        name: name,
                        stats: stats[1],
                        episodes: stats[2],
                        date: stats[3]
                    });
                } else if (stats[4]) {
                    if (stats[4] == 'Completed') list.push({
                        name: name,
                        stats: stats[4],
                        episodes: `${episodesFixed}/${episodesFixed}`,
                        date: stats[5]
                    });
                    else list.push({
                        name: name,
                        stats: stats[4],
                        episodes: `0/${episodesFixed}`,
                        date: stats[5]
                    });
                };
            } else if (stats[7]) {
                list.push({
                    name: name,
                    stats: stats[6],
                    episodes: `0/${episodesFixed}`,
                    date: stats[7]
                });
            } else if (stats[1]) {
                list.push({
                    name: name,
                    stats: stats[1],
                    episodes: stats[2],
                    date: stats[3]
                });
            } else if (stats[4]) {
                list.push({
                    name: name,
                    stats: stats[4],
                    episodes: `0/${episodesFixed}`,
                    date: stats[5]
                });
            };
        };

        var resume = [];

        for (let i = 0; i < list.length; i++) {
            resume.push(`${truncate(list[i].name, 25).padEnd(25)} ${list[i].stats.padEnd(13)} ${list[i].episodes.padStart(5)} ${list[i].date.padStart(12)}`);
        };
        resume.join('\n');
    };

    try {
        var data = await scrap(user);
        var desc = '🔹 List Updates | MyDramaList';
        updateGist(data, desc);
    } catch (error) {
        console.log('Something went error!', error);
    };
};

module.exports = main;