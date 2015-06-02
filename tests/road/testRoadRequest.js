"use strict";

var roads = require('../../index.js');
var url_module = require('url');


/**
 * Create a mock resource
 */
function createResource (methods, resources) {
	var endpoint = function (method) {
		return function* (url, body, headers) {
			return {
				path: url.path,
				method: method,
				body: body,
				headers: headers
			};
		};
	};

	var definition = {
		methods : {
		},
		context: 'I am a context'
	};

	if (methods) {
		methods.forEach(function (method) {
			definition.methods[method] = endpoint(method);
		});
	}

	if (resources) {
		definition.resources = resources;
	}

	return new roads.Resource(definition);
}

/**
 * Ensure that the basic request system lines up
 */
exports.testRequest = function (test) {
	var resource = createResource(['GET']);

	var road = new roads.Road(resource);

	road.request('GET', '/', 'yeah', {
		"one" : "two"
	}).then(function (response) {
		test.deepEqual(response, {
			status: 200,
			headers : {},
			body : {
				path : '/',
				method : 'GET',
				body : 'yeah',
				headers : {
					'one' : 'two'
				}
			}
		});

		test.done();
	});
};

/**
 * Ensure that the sub routes line up for strings
 */
exports.testStringSubRequest = function (test) {
	var sub_resource = createResource(['GET']);
	var sub_resource2 = createResource(['GET']);

	var resource = createResource(['GET'], {
		'#test' : sub_resource,
		'$stuff' : sub_resource2
	});

	var road = new roads.Road(resource);

	road.request('GET', '/huh', 'yeah', {
		"one" : "two"
	}).then(function (response) {
		test.deepEqual(response, {
			status: 200,
			headers : {},
				body : {
				path : '/huh',
				method : 'GET',
				body : 'yeah',
				headers : {
					'one' : 'two'
				}
			}
		});

		test.done();
	});
};

/**
 * Ensure that the sub routes line up for numbers
 */
exports.testNumberSubRequest = function (test) {
	var sub_resource = createResource(['GET']);
	var sub_resource2 = createResource(['GET']);

	var resource = createResource(['GET'], {
		'#test' : sub_resource,
		'$stuff' : sub_resource2
	});

	var road = new roads.Road(resource);

	road.request('GET', '/1234', 'yeah', {
		"one" : "two"
	}).then(function (response) {
		test.deepEqual(response, {
			status: 200,
			headers : {},
			body : {
				path : '/1234',
				method : 'GET',
				body : 'yeah',
				headers : {
					'one' : 'two'
				}
			}
		});

		test.done();
	});
};

/**
 * Ensure that we get proper errors for invalid path requests
 */
exports.testMissingPathRequest = function (test) {
	var resource = createResource(['GET']);

	var road = new roads.Road(resource);

	road.request('GET', '/huh', 'yeah', {
		"one" : "two"
	}).then(function (response) {
		// this endpoint should error
		test.ok(false);
		test.done();
	}).catch(function (e) {
		test.equal(e.code, 404);
		test.equal(e.message, '/huh');
		test.done();
	});
};

/**
 * Ensure that route errors naturally bubble up through the promise catch
 */
exports.testMethodWithError = function (test) {
	var resource = new roads.Resource({
		methods : {
			GET : function () {
				throw new Error('huh');
			}
		}
	});

	var road = new roads.Road(resource);

	road.request('GET', '/', 'yeah', {
		"one" : "two"
	}).then(function (response) {
		// this endpoint should error
		test.ok(false);
		test.done();
	}).catch(function (e) {
		test.equal(e.message, 'huh');
		test.done();
	});
};

/**
 * Ensure that route errors naturally bubble up through the promise catch
 */
exports.testCoroutineMethodWithError = function (test) {
	var resource = new roads.Resource({
		methods : {
			GET : function* () {
				throw new Error('huh');
			}
		}
	});

	var road = new roads.Road(resource);

	road.request('GET', '/', 'yeah', {
		"one" : "two"
	}).then(function (response) {
		// this endpoint should error
		test.ok(false);
		test.done();
	}).catch(function (e) {
		test.equal(e.message, 'huh');
		test.done();
	});
};


/**
 * Ensure that we get proper errors for invalid HTTP methods
 */
exports.testMissingMethodRequest = function (test) {
	var resource = createResource(['GET']);

	var road = new roads.Road(resource);

	road.request('POST', '/', 'yeah', {
		"one" : "two"
	}).then(function (response) {
		// this endpoint should error
		test.ok(false);
		test.done();
	}).catch(function (e) {
		test.equal(e.code, 405);
		test.deepEqual(e.message, ['GET']);
		test.done();
	});
};

/**
 * Ensure that we get proper errors for invalid HTTP methods, and the middleware properly includes the resource context
 */
exports.testMissingMethodRequestWithHandler = function (test) {
	var resource = createResource(['GET']);

	var road = new roads.Road(resource);

	road.use(function (method, url, body, headers, next) {
		test.equal("I am a context", this.resource_context);
		return next();
	});

	road.request('POST', '/', 'yeah', {
		"one" : "two"
	}).then(function (response) {
		// this endpoint should error
		test.ok(false);
		test.done();
	}).catch(function (e) {
		test.equal(e.code, 405);
		test.deepEqual(e.message, ['GET']);
		test.done();
	});
};

/**
 * Ensure that a request handler that executes, then calls the actual route returns as expected
 */
exports.testRequestWithHandlerCalled = function (test) {
	var resource = createResource(['GET']);

	var road = new roads.Road(resource);
	road.use(function (method, url, body, headers, next) {
		return next();
	});//*/

	road.request('GET', '/', 'yeah', {
		"one" : "two"
	}).then(function (response) {
		test.deepEqual(response, {
			status: 200,
			headers : {},
			body : {
				path : '/',
				method : 'GET',
				body : 'yeah',
				headers : {
					'one' : 'two'
				}
			}
		});

		test.done();
	});
};

/**
 * Ensure that a request handler that executes, then calls the actual route returns as expected
 */
exports.testRequestWithMultipleHandlersCalled = function (test) {
	var resource = createResource(['GET']);

	var road = new roads.Road(resource);
	road.use(function (method, url, body, headers, next) {
		return next()
			.then(function (response) {
				if (response.step1) {
					response.step2 = true;
				}
				return response;
			});
	});//*/

	road.use(function (method, url, body, headers, next) {
		// TODO: prove that this worked via tests
		return next()
			.then(function (response) {
				response.step1 = true;
				return response;
			});
	});//*/

	road.request('GET', '/', 'yeah', {
		"one" : "two"
	}).then(function (response) {
		test.deepEqual(response, {
			status: 200,
			headers : {},
			body : {
				path : '/',
				method : 'GET',
				body : 'yeah',
				headers : {
					'one' : 'two'
				},
				step1 : true,
				step2 : true
			}
		});

		test.done();
	});
};

/**
 * Ensure that a request handler that executes, then calls the actual route returns as expected
 */
exports.testRequestErrorWithHandler = function (test) {
	var resource = new roads.Resource({
		methods : {
			GET : function () {
				throw new Error('huh');
			}
		}
	});

	var road = new roads.Road(resource);

	road.use(function (method, url, body, headers, next) {
		return next();
	});//*/

	road.request('GET', '/', 'yeah', {
		"one" : "two"
	}).then(function (response) {
		// this endpoint should error
		test.ok(false);
		test.done();
	}).catch(function (e) {
		test.equal(e.message, 'huh');
		test.done();
	});
};


/**
 * Ensure that a request handler that executes, then calls the actual route returns as expected
 */
exports.testCoroutineRequestErrorWithHandler = function (test) {
	var resource = new roads.Resource({
		methods : {
			GET : function* () {
				throw new Error('huh');
			}
		}
	});

	var road = new roads.Road(resource);

	road.use(function (method, url, body, headers, next) {
		return next();
	});//*/

	road.request('GET', '/', 'yeah', {
		"one" : "two"
	}).then(function (response) {
		// this endpoint should error
		test.ok(false);
		test.done();
	}).catch(function (e) {
		test.equal(e.message, 'huh');
		test.done();
	});
};
/**
 * Ensure a request handler that does not call the actual route returns as expected
 */
exports.testRequestWithHandlerNotCalled = function (test) {
	var resource = createResource(['GET']);
	var road = new roads.Road(resource);
	var response = {"stuff" : "what"};

	road.use(function (url, body, headers, next) {
		return response;
	});//*/

	road.request('GET', '/', 'yeah', {
		"one" : "two"
	}).then(function (new_response) {
		test.deepEqual(new_response, {
			status: 200,
			headers : {},
			body : response
		});
		test.done();
	});
};

/**
 * Ensure that you can handle errors properly from the request handler
 */
exports.testRequestErrorWithHandlerThatCatchesErrors = function (test) {
	var resource = new roads.Resource({
		methods : {
			GET : function () {
				throw new Error('huh');
			}
		}
	});

	var road = new roads.Road(resource);

	road.use(function (method, url, body, headers, next) {
		return next()
			.catch(function (error) {
				return {"error" : error.message};
			});
	});//*/

	road.request('GET', '/', 'yeah', {
		"one" : "two"
	}).then(function (response) {
		test.deepEqual(response, {
			status: 200,
			headers : {},
			body : {"error":"huh"}
		});
		test.done();
	});
};


module.exports.testDoubleRootResourceRequestWithNoOverlapSucceeds = function (test) {
	var road = new roads.Road([new roads.Resource({
		methods: {
			GET: function () {
				return 'yeah';
			}
		}
	}), new roads.Resource({
		methods: {
			POST: function () {
				return 'oh my';
			}
		}
	})]);

	road.request('GET', '/', '', {})
	.then(function (response) {
		test.equal(response.body, 'yeah');
		return road.request('POST', '/', '', {});
	})
	.then(function (response) {
		test.equal(response.body, 'oh my');
		test.done();
	});
};

module.exports.testDoubleResourceRequestWithNoOverlapSucceeds = function (test) {
	var road = new roads.Road([new roads.Resource({
		resources: {
			'main': new roads.Resource({
				methods: {
					GET: function () {
						return 'yeah';
					}
				}
			})
		}
	}), new roads.Resource({
		resources: {
			'secondary': new roads.Resource({
				methods: {
					POST: function () {
						return 'oh my';
					}
				}
			})
		}
	})]);

	road.request('GET', '/main')
	.then(function (response) {
		test.equal(response.body, 'yeah');
		return road.request('POST', '/secondary');
	})
	.then(function (response) {
		test.equal(response.body, 'oh my');
		test.done();
	});
};

module.exports.testDoubleResourceRequestWithResourceOverlapChoosesCorrectMethod = function (test) {
	var road = new roads.Road([new roads.Resource({
		resources: {
			'main': new roads.Resource({
				methods: {
					GET: function () {
						return 'yeah';
					}
				}
			})
		}
	}), new roads.Resource({
		resources: {
			'main': new roads.Resource({
				methods: {
					POST: function () {
						return 'oh my';
					}
				}
			})
		}
	})]);

	road.request('GET', '/main')
	.then(function (response) {
		test.equal(response.body, 'yeah');
		return road.request('POST', '/main');
	})
	.then(function (response) {
		test.equal(response.body, 'oh my');
		test.done();
	});
};

module.exports.testDoubleResourceRequestWithMethodOverlapChoosesFirst = function (test) {
	var road = new roads.Road([new roads.Resource({
		resources: {
			'main': new roads.Resource({
				methods: {
					GET: function () {
						return 'yeah';
					}
				}
			})
		}
	}), new roads.Resource({
		resources: {
			'main': new roads.Resource({
				methods: {
					GET: function () {
						return 'oh my';
					}
				}
			})
		}
	})]);

	road.request('GET', '/main')
	.then(function (response) {
		test.equal(response.body, 'yeah');
		test.done();
	});
};

module.exports.testMultipleResourceRequestResourceHitThenMissWill405AndRetainContext = function (test) {
	var road = new roads.Road([new roads.Resource({
		resources: {
			'main': new roads.Resource({
				methods: {
					POST: function () {
						return 'yeah';
					}
				},
				context: 'first resource context'
			})
		}
	}), new roads.Resource({
		resources: {
			'main': new roads.Resource({
				methods: {
					DELETE: function () {
						return 'oh my';
					},
					PUT: function () {
						return 'oh my';
					}
				},
				context: 'second resource context'
			})
		}
	}), new roads.Resource({
		resources: {
			'test': new roads.Resource({
				methods: {
					GET: function () {
						return 'oh my';
					}
				}
			})
		}
	})]);

	road.use(function (method, url, body, headers, next) {
		test.equal('first resource context', this.resource_context);
		return next();
	});

	road.request('GET', '/main')
	.then(function (response) {
		test.fail();
		test.done();
	})
	.catch(function (err) {
		test.equal(err.code, 405);
		test.deepEqual(err.message, ['POST', 'PUT', "DELETE"]);
		test.done();
	});
};