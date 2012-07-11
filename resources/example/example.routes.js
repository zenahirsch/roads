module.exports = [{ 
	match : /^\/$/,
	GET : function (uri_bundle, view) {
		var resource = this.getResource('user');
		resource.request('/users/1', view.child('user'));
		resource.request('/users/5', view.child('user_two'));
		
		view.set('cookie_old_value', uri_bundle.cookie.get('date'));
		var date = new Date().toString();
		
		if (uri_bundle.cookie.get('second_date')) {
			uri_bundle.cookie.delete('second_date');
		} else {
			uri_bundle.cookie.set('second_date', { value : date, domain : '127.0.0.1' });
		}

		uri_bundle.cookie.set('date', { value : date , domain : '127.0.0.1' });
		

		view.set('cookie_new_value', date);

		view.render('index.html');
	},
	options : {
		modes : ['text/html']
	}
}];