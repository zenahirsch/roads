"use strict";
/**
 * applyPublicRoutes.js
 * Copyright(c) 2018 Aaron Hedges <aaron@dashron.com>
 * MIT Licensed
 * 
 * This file is an example of how to assign some public routes to a roads server
 */

 /**
  * Before calling this function you should create your roads object and bind a SimpleRouter to that road.
  * You then pass the road to this function to assign a collection of example routes that will be rendered
  * on both the client and the server
  * 
  * @param {SimpleRouter} router - The router that the routes will be added to
  */
module.exports = function (router) {
	router.addRoute('GET', '/', function () {
		this.setTitle('Root Resource');
		// In the real world the body of the response should be created from a template engine.
		return new this.Response('Hello!<br /> Try the <a href="/public" data-roads-pjax="link">public test link</a>. It\'s available to the server and can be rendered from the client! Try clicking it for the client path, or control clicking for the server.<br />\
Try the <a href="/private">private test link</a>. It\'s available to the server, but is not build in the client! Check your console for proof of the 404!');
	});

	router.addRoute('GET', 'public', function () {
		this.setTitle('Public Resource');
		console.log('Here are all cookies accessible to this code: ', this.cookies);
		console.log("Cookies are not set until you access the private route.");
		console.log("Notice that the http only cookies do not show in your browser's console.log");
		let html = 'Hello!<br /> The page you are looking at can be renderd via server or client. The landing page can too, so try going back <a href="/" data-roads-pjax="link">home</a>!<br />';

		// todo: make a client request to /privateJSON and get { "private-success": true }

		return new this.Response(html);
	});
};