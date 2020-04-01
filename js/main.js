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
	data: ()=>({
		currentGame:null
	}),
	template: `
		<div class = "row">
			<div class="list-group">
				<witb-game @click = "currentGame=game.identifier" v-for = "game in games" :key="game.identifier" :game="game" v-if = "!currentGame || currentGame == game.identifier"></witb-game>
			</div>
		</div>
	`
})

Vue.component('witb-game',{
	props: ['game'],
	data: ()=>({
	}),
	template: `
		<li class="list-group-item d-flex justify-content-between align-items-center">
			{{game.details.title}}
			<span class="badge badge-primary badge-pill">Write {{game.details.entriesPerPerson}}</span>
			<span class="badge badge-primary badge-pill">{{game.details.timePerRound}}s/round</span>
		</li>
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
