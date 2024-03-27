'use strict';

const db = require.main.require('./src/database');
const topics = require.main.require('./src/topics');
const batch = require.main.require('./src/batch');
const socketAdmin = require.main.require('./src/socket.io/admin');

const plugin = module.exports;

plugin.init = async function (params) {
	const { router } = params;
	const routeHelpers = require.main.require('./src/routes/helpers');

	routeHelpers.setupAdminPageRoute(router, '/admin/plugins/total-vote-count', [], (req, res) => {
		res.render('admin/plugins/total-vote-count', {
			title: 'Total Vote Count',
		});
	});
};

plugin.addAdminNavigation = async function (header) {
	header.plugins.push({
		route: '/plugins/total-vote-count',
		icon: 'fa-book',
		name: 'Total vote count',
	});
	return header;
};

plugin.getTopics = async (hookData) => {
	hookData.topics.forEach((t) => {
		if (t && t.hasOwnProperty('totalVoteCount')) {
			t.votes = parseInt(t.totalVoteCount, 10);
		}
	});

	return hookData;
};

plugin.filterTopicsSortOptions = async (hookData) => {
	hookData.fields.push('totalVoteCount');
	hookData.sortMap.votes = function (a, b) {
		if (a.hasOwnProperty('totalVoteCount') && b.hasOwnProperty('totalVoteCount') &&
			a.totalVoteCount !== b.totalVoteCount) {
			return b.totalVoteCount - a.totalVoteCount;
		}
		if (a.votes !== b.votes) {
			return b.votes - a.votes;
		}
		return b.postcount - a.postcount;
	};
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
	const tids = [...new Set(hookData.posts.map(p => p && p.tid))];
	await recalculateTotalTopicVotes(tids);
};

async function recalculateTotalTopicVotes(tids) {
	if (!tids.length) {
		return;
	}
	const topicData = await topics.getTopicsFields(tids, [
		'tid', 'cid', 'upvotes', 'downvotes', 'pinned',
	]);
	const voteData = await db.getSortedSetsMembersWithScores(
		tids.map(tid => `tid:${tid}:posts:votes`)
	);

	for (const [index, topic] of Object.entries(topicData)) {
		if (topic) {
			topic.totalVoteCount = parseInt(topic.votes, 10) || 0;
			for (const { score } of voteData[index]) {
				topic.totalVoteCount += score;
			}
		}
	}

	const promises = [
		db.sortedSetAddBulk(topicData.map(t => (['topics:votes', t.totalVoteCount, t.tid]))),
		db.setObjectBulk(topicData.map(t => ([`topic:${t.tid}`, { totalVoteCount: t.totalVoteCount }]))),
	];
	const nonPinned = topicData.filter(t => t && !t.pinned);
	if (nonPinned.length) {
		promises.push(db.sortedSetAddBulk(nonPinned.map(t => ([`cid:${t.cid}:tids:votes`, t.totalVoteCount, t.tid]))));
	}
	await Promise.all(promises);
}

socketAdmin.plugins.totalVotes = Object.create(null);
socketAdmin.plugins.totalVotes.calculate = async (/* socket */) => {
	await batch.processSortedSet('topics:tid', recalculateTotalTopicVotes, {
		batch: 500,
	});
};

socketAdmin.plugins.totalVotes.revert = async (/* socket */) => {
	await batch.processSortedSet('topics:tid', async (tids) => {
		let topicData = await db.getObjectsFields(
			tids.map(tid => `topic:${tid}`),
			['tid', 'cid', 'upvotes', 'downvotes', 'pinned']
		);
		topicData = topicData.filter(t => t && t.cid);
		topicData.forEach((t) => {
			t.votes = parseInt(t.upvotes || 0, 10) - parseInt(t.downvotes || 0, 10);
		});

		const promises = [
			db.sortedSetAddBulk(topicData.map(t => ([`topics:votes`, t.votes, t.tid]))),
			db.deleteObjectFields(tids.map(tid => `topic:${tid}`), ['totalVoteCount']),
		];
		const nonPinned = topicData.filter(t => t && !t.pinned);
		if (nonPinned.length) {
			promises.push(
				db.sortedSetAddBulk(nonPinned.map(t => ([`cid:${t.cid}:tids:votes`, t.votes, t.tid])))
			);
		}

		await Promise.all(promises);
	}, {
		batch: 500,
	});
};

