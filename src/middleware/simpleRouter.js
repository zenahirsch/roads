"use strict";
/**
 * simpleRouter.js
 * Copyright(c) 2018 Aaron Hedges <aaron@dashron.com>
 * MIT Licensed
 * 
 * Exposes the SimpleRouter class to be used with roads middleware. 
 */

const url_module = require('url');

/**
 * Applies a prefix to paths of route files
 * 
 * @todo I'm pretty sure there's an existing library that will do this more accurately
 * @param {string} path - The HTTP path of a route
 * @param {string} [prefix] - An optional prefix for the HTTP path
 */
function buildRouterPath(path, prefix) {
	if (!prefix) {
		prefix = '';
	}

	if (prefix.length && path === '/') {
		return prefix;
	}

	return prefix + path;
}

/**
 * This is a simple router middleware for roads. 
 * You can assign functions to url paths, and those paths can have some very basic variable templating
 * 
 * Templating is basic. Each URI is considered to be a series of "path parts" separated by slashes.
 * If a path part starts with a #, it is assumed to be a numeric variable. Non-numbers will not match this route
 * If a path part starts with a $, it is considered to be an alphanumeric variabe. All non-slash values will match this route.
 * 
 * Any variables will be added to the route's request url object under the "args" object.
 * 
 * e.g.
 * /users/#user_id will match /users/12345, not /users/abcde. If a request is made to /users/12345 the route's requestUrl object will contain { args: {user_id: 12345}} along with all other url object values
 * 
 * @name SimpleRouter
 */
module.exports = class SimpleRouter {
	/**
	 * @param {Road} [road] - The road that will receive the SimpleRouter middleware
	 */
	constructor (road) {
		this.routes = [];
		if (road) {
			this.applyMiddleware(road);
		}
	}

	/**
	 * Assigns the middleware to the provided road
	 * 
	 * @param  {Road} road - The road that will receive the SimpleRouter middleware
	 */
	applyMiddleware (road) {
		var _self = this;

		// We do this to ensure we have access to the SimpleRouter once we lose this due to road's context
		road.use(function (request_method, request_url, request_body, request_headers, next) {
			return _self._middleware.call(this, _self.routes, request_method, request_url, request_body, request_headers, next);
		});
	}

	/**
	 * Adds a route to this router. The route is a function that will match the standard roads request signature.
	 * It will be associated with one HTTP method, and one or many HTTP paths
	 * 
	 * @param {string} method - The HTTP method that will trigger the provided function
	 * @param {(string|array)} paths - One or many URL paths that will trigger the provided function
	 * @param {function} fn - The function containing all of your route logic
	 */
	addRoute (method, paths, fn) {
		var context = this;
		if (!Array.isArray(paths)) {
			paths = [paths];
		}

		paths.forEach((path) => {
			context.routes.push({
				path: path,
				method: method,
				fn: fn
			});
		});
	}

	/**
	 * Add an entire file worth of routes. 
	 * 
	 * The file should be a node module that exposes an object. 
	 * Each key should be an HTTP path, each value should be an object.
	 * In that object, each key should be an HTTP method, and the value should be your route function.
	 * 
	 * @param {string} file_path - The file path
	 * @param {string} [prefix] - A string that will help namespace this file. e.g. if you call this on a file with a route of "/posts", and the prefix "/users", the route will be assigned to "/users/posts"
	 */
	addRouteFile (file_path, prefix) {
		let routes = require(file_path);
		for (var path in routes) {
			for (var method in routes[path]) {
				this.addRoute(method, buildRouterPath(path, prefix), routes[path][method]);
			}
		}
	}

	/**
	 * Slightly non-standar roads middleware to execute the functions in this router when requests are received by the road
	 * The first method is the routes to ensure that we can properly use this router once we loose the "this" value
	 * from the roads context
	 * 
	 * @todo there might be a better way to do this
	 */
	_middleware (routes, request_method, request_url, request_body, request_headers, next) {
		let context = this;
		let response = null;
		let hit = false;

		let parsed_url = url_module.parse(request_url, true);

		for (let i = 0; i < routes.length; i++) {
			let route = routes[i];

			if (compareRouteAndApplyArgs(route, parsed_url, request_method)) {
				response = (route.fn).call(context, parsed_url, request_body, request_headers, next);
				hit = true;
				break;
			}
		}

		if (hit) {
			return response;
		}

		return next();
	}
};

/**
 * Checks to see if the route matches the request, and if true assigns any applicable url variables and returns the route
 * 
 * @param {object} route - Route object from this simple router class
 * @param {object} route.method - HTTP method associated with this route
 * @param {object} route.path - HTTP path associated with this route
 * @param {object} request_url - Parsed HTTP request url
 * @param {string} request_method - HTTP request method
 */
function compareRouteAndApplyArgs (route, request_url, request_method) {
	if (route.method !== request_method) {
		return false;
	}

	let template = route.path.split('/');
	if (template[0] === '') {
		template = template.slice(1); // Slice kills the emptystring before the leading slash
	}

	let actual = request_url.pathname.split('/');
	if (actual[0] === '') {
		actual = actual.slice(1); // Slice kills the emptystring before the leading slash
	}

	if (template.length != actual.length) {
		return false;
	}

	for (let i = 0; i < template.length; i++) {
		let actual_part = actual[i];
		let template_part = template[i];
		
		// Process variables first
		if (template_part[0] === '#') {
			// # templates only accept numbers
			if (isNaN(Number(actual_part))) {
				return false;
			}

			applyArg(request_url, template_part.substring(1), Number(actual_part));
			continue;
		}

		if (template_part[0] === '$') {
			// $ templates accept any non-slash alphanumeric character
			applyArg(request_url, template_part.substring(1), String(actual_part));
			// Continue so that 
			continue;
		}

		// Process exact matches second
		if (actual_part === template_part) {
			continue;
		}

		return false;
	}

	return true;
}

/**
 * Assigns a value to the parsed request urls args parameter
 * 
 * @param {object} request_url - The parsed url object
 * @param {string} template_part - The template variable
 * @param {*} actual_part - The url value
 */
function applyArg(request_url, template_part, actual_part) {
	if (typeof(request_url.args) === "undefined") {
		request_url.args = {};
	}

	if (typeof request_url.args !== "object") {
		throw new Error("The request url's args have already been defined as a " + typeof request_url.args + " and we expected an object. For safety we are throwing this error instead of overwriting your existing data. Please use a different field name in your code");
	}

	request_url.args[template_part] = actual_part;
}
