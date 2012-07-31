var Resource = require('../../components/resource').Resource;

module.exports = new Resource('blog', {
	router: require('./blog.router'),
	dependencies : {
		user : require('../user/user.resource')
	},
	properties : {
		models : {
			post : require('./models/post.model')
		}
	}
});