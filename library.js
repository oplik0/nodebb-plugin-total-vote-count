'use strict';

const _ = require.main.require('lodash');

const db = require.main.require('./src/database');
const topics = require.main.require('./src/topics');

const plugin = module.exports;

plugin.getTopics = async (hookData) => {
	const missingTids = hookData.topics
		.filter(t => t && !t.hasOwnProperty('totalVoteCount'))
		.map(t => t.tid);

	const totalVotes = await recalculateTotalTopicVotes(missingTids);
	const tidToTotalVotes = _.zipObject(missingTids, totalVotes);

	hookData.topics.forEach((t) => {
		if (t) {
			t.votes = t.hasOwnProperty('totalVoteCount') ?
				parseInt(t.totalVoteCount, 10) :
				parseInt(tidToTotalVotes[t.tid], 10);
		}
	});

	return hookData;
};

plugin.updatePostVoteCount = async (hookData) => {
	const { tid } = hookData.post;
	await recalculateTotalTopicVotes([tid]);
};

plugin.actionPostMove = async (hookData) => {
	await recalculateTotalTopicVotes([hookData.tid, hookData.post.tid]);
};

plugin.actionPostDelete = async (hookData) => {
	await recalculateTotalTopicVotes([hookData.post.tid]);
};

plugin.actionPostRestore = async (hookData) => {
	await recalculateTotalTopicVotes([hookData.post.tid]);
};

plugin.actionPostsPurge = async (hookData) => {
	const tids = _.uniq(hookData.posts.map(p => p && p.tid));
	await recalculateTotalTopicVotes(tids);
};

async function recalculateTotalTopicVotes(tids) {
	if (!tids.length) {
		return [];
	}
	const topicData = await topics.getTopicsFields(tids, [
		'cid', 'upvotes', 'downvotes', 'pinned',
	]);
	const voteData = await db.getSortedSetsMembersWithScores(
		tids.map(tid => `tid:${tid}:posts:votes`)
	);

	for (const [index, topic] of Object.entries(topicData)) {
		if (topic) {
			topic.totalVoteCount = 0;
			for (const { score } of voteData[index]) {
				topic.totalVoteCount += score;
			}
		}
	}

	const promises = [
		db.sortedSetAddBulk(topicData.map(t => (['topic:votes', t.totalVoteCount, t.tid]))),
		db.setObjectBulk(topicData.map(t => ([`topic:${t.tid}`, { totalVoteCount: t.totalVoteCount }]))),
	];
	const nonPinned = topicData.filter(t => t && !t.pinned);
	if (nonPinned.length) {
		promises.push(db.sortedSetAddBulk(nonPinned.map(t => ([`cid:${t.cid}:tids:votes`, t.totalVoteCount, t.tid]))));
	}
	await Promise.all(promises);

	return topicData.map(t => t.totalVoteCount);
}
