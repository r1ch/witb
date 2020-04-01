Vue.component('google-login', {
	data: () => ({
		authenticated: false,
		profileURL : false
	}),
	template: `
		<div class = "row">
			<div v-if = "!authenticated" class="g-signin2" data-width="200" data-height="50" data-onsuccess="authenticate" data-theme="dark"></div>
			<img :src="profileURL"></img>
		</div>
	`,
	mounted: function() {
		Credentials.then(() => {
			this.authenticated = true;
			this.profileURL = profile.getImageUrl();
		})
	}
})

var app = new Vue({
	el: '#app',
	data: {},
	methods: {
		fetch(method,URL,destination){
			signHttpRequest(method, URL)
				.then(axios)
				.then(({
					data
				}) => {
					this[destination] = data
				})
		},
		fetchGames: ()=>fetch("GET","/games","games")
	},
	mounted: function(){
		fetchGames()
	}
})
