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
	methods: {
		chooseGame(event){
			this.currentGame = event
		}
	},
	template: `
		<div class = "row">
CG:{{currentGame}}
		      <ul class="collection with-header" v-if = "games">
				<witb-game @chooseGame= "chooseGame" v-for = "game in games" :key="game.identifier" :game="game" :currentGame="currentGame" v-if = "!currentGame || currentGame == game.identifier"></witb-game>
			</ul>
		</div>
	`
})

Vue.component('witb-game',{
	props: ['game','currentGame'],
	data: ()=>({
	}),
	methods: {
		chooseGame(){
			this.$emit("chooseGame",this.game.identifier)
		}
	},
	template: `
		<li class="collection-item" @click="chooseGame">
			{{game.details.title}}
			<a class = "btn" @click="chooseGame">Join</a>
		</li>
	`
})

var app = new Vue({
	el: '#app',
	data: {
		games:[],
		players:[]
	},
	methods: {
		API(method,URL,destination,data){
			signHttpRequest(method, URL)
				.then(axios)
				.then(({
					data
				}) => {
					destination && this[destination] = data
				})
		},
		fetchGames(){this.API("GET","/games","games")},
		joinGame(game){
			this.API("PUT","/players","players",false,{identifier:profile.getId(),name:profile.getGivenName()})
		}
	},
	mounted: function(){
		this.fetchGames()
	}
})
