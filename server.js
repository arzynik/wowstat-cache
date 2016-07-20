var elasticsearch = require('elasticsearch');
var express = require('express');
var app = express();
var request = require('request');
var apiKey = process.env.BATTLENET_API_KEY;

var regions = {
	us: 'https://us.api.battle.net/wow/realm/status?locale=en_US',
	eu: 'https://eu.api.battle.net/wow/realm/status?locale=en_GB',
	cn: 'https://api.battlenet.com.cn/wow/realm/status?locale=zh_CN',
	tw: 'https://tw.api.battle.net/wow/realm/status?locale=zh_TW',
	kr: 'https://kr.api.battle.net/wow/realm/status?locale=ko_KR'
};

var client = new elasticsearch.Client({
	host: process.env.SEARCHBOX_URL
});
/*
client.indices.delete({
	index: 'realms'
});*/

client.indices.create({
	index: 'realms'
});

app.get('/update', (req, res) => {

	var processRegion = (region) => {
		request(regions[region] + '&apikey=' + apiKey, (error, response, body) => {
			if (!error && response.statusCode == 200) {

				body = JSON.parse(body);

				for (var i in body.realms) {
					body.realms[i].region = region;
					client.index({
						index: 'realms',
						type: 'realm',
						body: body.realms[i],
						id: region + '_' + body.realms[i].slug
					}, (err, resp) => {
						if (err) {
							console.log(err);
						}
					});
				}
			}
		});
	};

	for (var r in regions) {
		processRegion(r);
	}

	res.send('indexing...');
});

app.get('/', (req, res) => {
	res.redirect('http://wowst.at');
});

app.get('/status', (req, res) => {
	client.search({
		index: 'realms',
		type: 'realm',
		sort: [
			'slug'
		],
		body: {
			query: {
				match: {
					region: req.query.region
				}
			}
		},
		size: 1000
	}).then((resp) => {
		res.json(resp);
	}, (err) => {
		res.end();
		console.log(err);
	});
});

app.listen(process.env.PORT || 3000, () => {
	console.log('WoW Stat cache server now running!');
});