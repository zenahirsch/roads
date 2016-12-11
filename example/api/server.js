"use strict";
/**
* server.js
* Copyright(c) 2016 Aaron Hedges <aaron@dashron.com>
* MIT Licensed
 */

var roads = require(__dirname + '/../../index');
var api = new roads.Road();

var notFoundRepresentation = require('./representations/server/notFound');
var notAllowedRepresentation = require('./representations/server/notAllowed');
var unknownRepresentation = require('./representations/server/unknown');

api.use(roads.middleware.killSlash);
api.use(roads.middleware.cors(['http://localhost:8081']));
var router = new roads.middleware.SimpleRouter();
router.applyMiddleware(api);

require('./applyRoutes.js')(api);


var server = new roads.Server(api, function (err) {
	var response = null;
	console.log(err.stack);
	
	switch (err.code) {
		case 404:
			return new roads.Response(notFoundRepresentation(err), 404);
		case 405:
			return new roads.Response(notAllowedRepresentation(err), 405);
		case 500:
		default:
			return new roads.Response(unknownRepresentation(err), 500);
	}
});

server.listen(8081, function () {
	console.log('server has started');
});
