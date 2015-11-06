'use strict';
/**
 * Module dependencies
 */


/**
 * Mount API
 */

module.exports = function (app) {
	app.get('/api/v1/stats', function (req, res, next) {
		var reporters = app.get('reporters');
		var data = reporters.map(function (reporter) {
			return reporter.getClusterStats();
		});
		res.json(data);
	});

	app.get('/api/v1/status', function (req, res, next) {
		var memoryUsage = process.memoryUsage();
		var reporter = app.get('reporters')[0];
		res.json(reporter.getClusterStatus());
	});

};