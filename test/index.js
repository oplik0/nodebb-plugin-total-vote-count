/**
 * You can run these tests by executing `npx mocha test/plugins-installed.js`
 * from the NodeBB root folder. The regular test runner will also run these
 * tests.
 *
 * Keep in mind tests do not activate all plugins, so if you are testing
 * hook listeners, socket.io, or mounted routes, you will need to add your
 * plugin to `config.json`, e.g.
 *
 * {
 *     "test_plugins": [
 *         "nodebb-plugin-total-vote-count"
 *     ]
 * }
 */

'use strict';

/* globals describe, it, before, afterEach */

const assert = require('assert');
const util = require('util');

const topics = require.main.require('./src/topics');
const posts = require.main.require('./src/posts');
const categories = require.main.require('./src/categories');
const user = require.main.require('./src/user');

const sleep = util.promisify(setTimeout);

describe('nodebb-plugin-total-vote-count', () => {
	let authorUid;
	let commenterUid;
	let postData;
	let topicData;
	let responseData;
	let cid;
	before(async () => {
		[authorUid, commenterUid, { cid }] = await Promise.all([
			user.create({ username: 'totalVotesAuthor' }),
			user.create({ username: 'totalVotesCommenter' }),
			categories.create({
				name: 'Test Category',
				description: 'Test category created by testing script',
			}),
		]);
		({ postData, topicData } = await topics.post({
			uid: authorUid,
			cid: cid,
			title: 'Test Total Vote Count Topic Title',
			content: 'The content of test topic',
		}));

		responseData = await topics.reply({
			uid: commenterUid,
			tid: topicData.tid,
			content: 'The content of test reply',
		});
	});

	afterEach(async () => {
		await posts.unvote(postData.pid, commenterUid);
		await posts.unvote(responseData.pid, authorUid);
	});

	it('should start with 0 votes', async () => {
		const [topic] = await topics.getTopicsByTids([topicData.tid]);
		assert.strictEqual(topic.votes, 0);
	});

	it('should equal initial post votes if no other posts are upvoted', async () => {
		await posts.upvote(postData.pid, commenterUid);
		await sleep(1000);
		let [topic] = await topics.getTopicsByTids([topicData.tid]);
		assert.strictEqual(topic.votes, 1);

		await posts.downvote(postData.pid, commenterUid);
		await sleep(1000);
		[topic] = await topics.getTopicsByTids([topicData.tid]);
		assert.strictEqual(topic.votes, -1);
		await posts.unvote(postData.pid, commenterUid);
	});

	it('should consider response votes', async () => {
		await posts.upvote(responseData.pid, authorUid);
		await sleep(1000);
		let [topic] = await topics.getTopicsByTids([topicData.tid]);
		assert.strictEqual(topic.votes, 1);

		await posts.downvote(responseData.pid, authorUid);
		await sleep(1000);
		[topic] = await topics.getTopicsByTids([topicData.tid]);
		assert.strictEqual(topic.votes, -1);
	});

	it('should consider both post and response votes', async () => {
		await posts.upvote(postData.pid, commenterUid);
		await posts.upvote(responseData.pid, authorUid);
		await sleep(1000);
		const [topic] = await topics.getTopicsByTids([topicData.tid]);
		assert.strictEqual(topic.votes, 2);
	});

	it('should allow post and response votes to cancel out', async () => {
		await posts.upvote(postData.pid, commenterUid);
		await posts.downvote(responseData.pid, authorUid);
		await sleep(1000);
		const [topic] = await topics.getTopicsByTids([topicData.tid]);
		assert.strictEqual(topic.votes, 0);
	});
});
