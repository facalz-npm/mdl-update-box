const axios = require('axios');
const cheerio = require('cheerio');
const {
    Octokit
} = require('@octokit/rest');
require('dotenv/config');

async function main(gistId, githubToken, user, title) {

    if (!user || !gistId || !githubToken) {
        console.log('Invalid configuration! To know more: https://github.com/facalz-npm/mdl-update-box#readme');
        return process.exit(1);
    };

    if (!title) title = '🔹 List Updates | MyDramaList';

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

        const check = $('.profile-header .hidden-sm-down h1').first().text();

        if (!check) {
            console.log('Invalid user!');
            return process.exit(1);
        };

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
                movie = false;
            };

            const regex = new RegExp('(Currently watching).([0-9]*\/[0-9]{' + episodes + '})([0-9a-z ]*)|(Completed|Plan to watch|On-hold|Dropped)([0-9a-z ]*)|(Currently watching)([0-9a-z ]*)');

            const stats = regex.exec(array[i].stats);

            if (stats[1] == 'Currently watching') stats[1] = 'Watching';
            if (stats[6] == 'Currently watching') stats[6] = 'Watching';

            if (movie) {
                if (stats[1]) list.push({
                    name: name,
                    stats: stats[1],
                    episodes: stats[2],
                    date: stats[3]
                });

                else if (stats[4] == 'Completed') list.push({
                    name: name,
                    stats: stats[4],
                    episodes: `${episodesFixed}/${episodesFixed}`,
                    date: stats[5]
                });

                else if (stats[6] == 'Watching') list.push({
                    name: name,
                    stats: stats[6],
                    episodes: `0/${episodesFixed}`,
                    date: stats[7]
                });

                else list.push({
                    name: name,
                    stats: stats[4],
                    episodes: `0/${episodesFixed}`,
                    date: stats[5]
                });

            } else {

                if (stats[1] == 'Watching') list.push({
                    name: name,
                    stats: stats[1],
                    episodes: stats[2],
                    date: stats[3]
                });

                else if (stats[4] == 'Completed') list.push({
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
        };

        var resume = [];

        for (let i = 0; i < list.length; i++) {
            resume.push(`${truncate(list[i].name, 23).padEnd(23)} ${list[i].stats.padEnd(13)} ${list[i].episodes.padStart(5)} ${list[i].date.padStart(14)}`);
        };
        return resume.join('\n');
    };

    try {
        var data = await scrap(user);
        if (!data) data = 'Nothing around here...';
        updateGist(data, title);
        console.log(data);
    } catch (error) {
        console.log('Something went error! ', error);
    };
};

module.exports = main;