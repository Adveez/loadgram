'use strict';
/**
 * Module dependencies
 */

var middlewares = require('./webui/middlewares');
var pages = require('./webui/pages');

/**
 * Mount WebUI
 */

module.exports = function (app, ws) {
	middlewares.front(app);
	pages(app);
	middlewares.back(app);

	// Setup broadcast when reports change
	ws.broadcast = function broadcast (data) {
		ws.clients.forEach(function each (client) {
			client.send(data);
		});
	};
	var broadcaster = function (reporter) {
		return function onChange() {
			var data = JSON.stringify({
				status : reporter.getClusterStatus(),
				stats : reporter.getClusterStats()
			});
			ws.broadcast(data);
		};
	};
	var reporters = app.get('reporters');
	reporters.forEach(function (reporter) {
		reporter.on('change', broadcaster(reporter));
	});
};