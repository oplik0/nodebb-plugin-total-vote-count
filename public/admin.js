'use strict';

/* globals define, $, socket */

define('admin/plugins/total-vote-count', ['alerts'], (alerts) => {
	const ACP = {};

	ACP.init = function () {
		$('#recalculate').on('click', () => {
			socket.emit('admin.plugins.totalVotes.calculate', {}, (err) => {
				if (err) {
					return alerts.error(err);
				}
				alerts.success('Votes recalculated');
			});
		});

		$('#revert').on('click', () => {
			socket.emit('admin.plugins.totalVotes.revert', {}, (err) => {
				if (err) {
					return alerts.error(err);
				}
				alerts.success('Votes reverted');
			});
		});
	};

	return ACP;
});
