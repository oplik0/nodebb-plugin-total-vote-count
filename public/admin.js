'use strict';

define('admin/plugins/total-vote-count', ['alerts'], function (alerts) {
	const ACP = {};

	ACP.init = function () {
		$('#recalculate').on('click', () => {
			socket.emit('admin.plugins.totalVotes.calculate', {}, function (err) {
				if (err) {
					return alerts.error(err);
				}
				alerts.success('Votes recalculated');
			});
		});

		$('#revert').on('click', () => {
			socket.emit('admin.plugins.totalVotes.revert', {}, function (err) {
				if (err) {
					return alerts.error(err);
				}
				alerts.success('Votes reverted');
			});
		});
	};

	return ACP;
});
