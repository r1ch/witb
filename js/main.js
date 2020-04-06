var API = {
	created: function () {
		console.log("API created... use this to warm it")
	},
	methods: {
		API(method,URL,body,handler){
			signHttpRequest(method, URL, body)
			.then(axios)
			.then(({data}) => {
				if(handler) handler(data)
			})
		},
	}
}

Vue.component('google-login', {
	data: () => ({
		authenticated: false,
		profile: false
	}),
	template: `
		<div class = "row">
			<div v-if = "!authenticated" class="g-signin2" data-width="200" data-height="50" data-onsuccess="authenticate" data-theme="dark"></div>
			<img v-if = "profile" :src="profile.summary.url"></img>
		</div>
	`,
	mounted: function() {
		Credentials.then(() => {
			this.authenticated = true;
			this.profile = profile
		})
	}
})

Vue.component('witb-games',{
	mixins:[API],
	data: ()=>({
		games:[],
		currentGame:null
	}),
	computed:{
		currentGameIdentifier(){
			return this.currentGame ? this.currentGame.identifier : false;
		}
	},
	mounted: function(){
		this.fetchGames();
	},
	methods: {
		fetchGames(){this.API("GET","/games",null,games=>this.games=games)},
		chooseGame(event){
			this.currentGame = event
			this.API("PUT",`/games/${this.currentGame.identifier}/players`,profile.summary)
		}
	},
	template: `
		<div class = "row">
		      <p v-if="currentGame">{{currentGame.title}}</p>
		      <ul class="collection with-header" v-if = "games">
				<witb-game @chooseGame= "chooseGame" v-for = "game in games" :key="game.identifier" :game="game" :currentGameIdentifier = "currentGameIdentifier"></witb-game>
			</ul>
		</div>
	`
})

Vue.component('witb-game',{
	mixins: [API],
	props: ['game','currentGameIdentifier'],
	data: ()=>({
		players:[]
	}),
	methods: {
		chooseGame(){
			this.$emit("chooseGame",this.game)
			this.API("GET",`/games/${this.game.identifier}/players`,false,players=>this.players=players)
		}
	},
	template: `
		<li class="collection-item" @click="chooseGame">
			{{game.title}}
			<a class = "btn" @click="chooseGame" v-if="currentGameIdentifier != game.identifier">Join</a>
			<witb-player v-for = "player in players" :key = "player.identifier" :player="player"></witb-player>
		</li>
	`
})

Vue.component('witb-player',{
	props: ['player'],
	template: `
		<li class="collection-item">
			{{player.name}}
			<img :src="player.url"></img>
		</li>
	`
})

var app = new Vue({
	el: '#app',
	data: {
	}
})
