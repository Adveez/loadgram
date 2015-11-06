'use strict';
/**
 * Module dependencies
 */

/**
 * Mount pages
 */

module.exports = function (app) {
	app.get('/', function (req, res, next) {
		var locals = {
			title : 'Loadgram Admin'
		}
		return res.render('index.html', locals);
	});
};