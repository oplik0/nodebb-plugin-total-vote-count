'use strict';

const winston = require.main.require('winston');

const db = require.main.require('./src/database');

const plugin = {};

plugin.getTopics = async (hookData) => {
	let voteData;
	try {
		voteData = await db.getSortedSetsMembersWithScores(
			hookData.topics.map(t => `tid:${t.tid}:posts:votes`)
		);
	} catch (e) {
		winston.error(`Error getting vote data ${e}`);
		return hookData;
	}
	for (const [index, topic] of Object.entries(hookData.topics)) {
		if (topic) {
			for (const { score } of voteData[index]) {
				topic.votes += score;
			}
		}
	}
	return hookData;
};

module.exports = plugin;
