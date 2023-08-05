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
			const allVotes = voteData[index].reduce((all, current) => all + current.score, 0);
			topic.votes += allVotes;
		}
	}
	return hookData;
};

module.exports = plugin;
