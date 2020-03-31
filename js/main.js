Vue.component('google-login', {
	data: () => ({
		authenticated: false
	}),
	template: `
		<div class = "row">
			<div v-if = "!authenticated" class="g-signin2" data-width="200" data-height="50" data-onsuccess="authenticate" data-theme="dark"></div>
		</div>
	`,
	mounted: function() {
		Credentials.then(() => {
			this.authenticated = true
		})
	}
})

var app = new Vue({
	el: '#app',
	data: {}
})
