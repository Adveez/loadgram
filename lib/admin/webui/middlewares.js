'use strict';
/**
 * Module dependencies
 */

var express = require('express');
var compression = require('compression');
var nunjucks = require('nunjucks');

/**
 * Mount front middlewares
 */

exports.front = function (app) {
	// Compress responses
	app.use(compression());

	// Serve static assets
	app.use(express.static(__dirname + '/public'));

	// Use the templating system
	var env = new nunjucks.Environment(new nunjucks.FileSystemLoader(__dirname + '/views'));
	env.express(app);
};

/**
 * Mount back middlewares
 */

exports.back = function (app) {
	app.use(function(req, res, next) {
		res.status(404);
		if (req.accepts('html')) {
			var locals = {
				title : 'Loadgram Admin | Page Not Found'
			};
			return res.render('404.html', locals);
		}
		res.end();
	});

	app.use(function(err, req, res, next){
		console.error(err);
		if (req.accepts('html')) {
			res.redirect('/500');
		}
		res.status(500).end();
	});
};