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
	/*fetchGames(){this.API("GET","/games",null,games=>this.games=games)},
	joinGame(game){
	this.API("PUT",`/games/${game}/players`,{id:profile.getId(),name:profile.getGivenName(),URL:profile.getImageUrl()},game=>{this.game=game})
	},
	getPlayers(game){
	this.API("GET",`/games/${game}/players`,null,console.log)
	},
	storeNames(game,names){
	this.API("PUT",`/games/${game}/players/${profile.getId()}/names`,names,names=>{this.names=names})
	}*/

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
	mixins:[API],
	data: ()=>({
		games:[],
		currentGame:null
	}),
	mounted: function(){
		this.fetchGames();
	},
	methods: {
		fetchGames(){this.API("GET","/games",null,games=>this.games=games)},
		chooseGame(event){
			currentGame = event
			console.log(currentGame,event)
			this.API("PUT",`/games/${currentGame}/players`,{id:profile.getId(),name:profile.getGivenName(),URL:profile.getImageUrl()})
		}
	},
	template: `
		<div class = "row">
		      <ul class="collection with-header" v-if = "games">
				<witb-game @chooseGame= "chooseGame" v-for = "game in games" :key="game.recordId" :game="game" :currentGame="currentGame" v-if = "!currentGame || currentGame == game.recordId"></witb-game>
			</ul>
		</div>
	`
})

Vue.component('witb-game',{
	mixins: [API],
	props: ['game','currentGame'],
	data: ()=>({
		players:[]
	}),
	methods: {
		chooseGame(){
			this.$emit("chooseGame",this.game.recordId)
			this.API("GET",`/games/${currentGame}/players`,false,players=>this.players=players)
		}
	},
	template: `
		<li class="collection-item" @click="chooseGame">
			{{game.title}}
			<a class = "btn" @click="chooseGame" v-if="game.recordId!=currentGame">Join</a>
			<witb-player v-for = "player in players" :key = "player.recordId" :player="player"></witb-player>
		</li>
	`
})

Vue.component('witb-player',{
	props: ['player'],
	template: `
		<li class="collection-item">
			{{player.name}}
			<img :src="player.URL"></img>
		</li>
	`
})

var app = new Vue({
	el: '#app',
	data: {
	}
})
