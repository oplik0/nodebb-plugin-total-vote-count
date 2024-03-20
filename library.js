'use strict';

const winston = require.main.require('winston');

const db = require.main.require('./src/database');
const topics = require.main.require('./src/topics');

const plugin = module.exports;

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

plugin.updatePostVoteCount = async (hookData) => {
	const { tid } = hookData.post;
	const topicData = await topics.getTopicFields(tid, ['cid', 'upvotes', 'downvotes', 'pinned']);
	const voteData = await db.getSortedSetMembersWithScores(`tid:${tid}:posts:votes`);

	let { votes } = topicData;
	for (const { score } of voteData) {
		votes += score;
	}

	const promises = [
		db.sortedSetAdd('topics:votes', votes, tid),
	];

	if (!topicData.pinned) {
		promises.push(db.sortedSetAdd(`cid:${topicData.cid}:tids:votes`, votes, tid));
	}
	await Promise.all(promises);
};
