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

Vue.component('witb-games',{
	props: ['games'],
	data: ()=>{
		currentGame:null
	},
	template: `
		<div class = "row">
			<witb-game v-for = "game in games" :key="game.identifier" :game="game" v-if = "!currentGame || currentGame == game.identifier"></witb-game>
		</div>
	`
})

Vue.component('witb-game',{
	props: ['game'],
	data: ()=>{
	},
	template: `
		<div>
			{{game.details}}
		</div>
	`
})

var app = new Vue({
	el: '#app',
	data: {
		games:[]
	},
	methods: {
		API(method,URL,destination){
			signHttpRequest(method, URL)
				.then(axios)
				.then(({
					data
				}) => {
					this[destination] = data
				})
		},
		fetchGames(){this.API("GET","/games","games")}
	},
	mounted: function(){
		this.fetchGames()
	}
})
