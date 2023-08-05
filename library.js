'use strict';

const db = require.main.require('./src/database');

const plugin = {};

plugin.getTopics = async (hookData) => {
	const voteData = await db.getSortedSetsMembersWithScores(
		hookData.topics.map(t => `tid:${t.tid}:posts:votes`)
	);
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
