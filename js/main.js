var API = {
	created: function () {
		console.log("API created")
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
	mixins:[API],
	data: () => ({
		authenticated: false,
	}),
	template: `
		<div class = "row">
			<div v-if = "!authenticated" class="g-signin2" data-width="200" data-height="50" data-onsuccess="authenticate" data-theme="dark"></div>
		</div>
	`,
	mounted: function() {
		Credentials.then((profile) => {
			this.authenticated = true;
			this.$emit("profileReady",profile)
		})
	}
})

Vue.component('witb-games',{
	mixins:[API],
	inject:['profile'],
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
		fetchGames(){
			this.API("GET","/games",null,games=>this.games=games)
		},
		chooseGame(event){
			this.currentGame = event
			this.API("PUT",`/games/${this.currentGame.identifier}/players`,this.profile)
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
	inject:['profile'],
	props: ['game','currentGameIdentifier'],
	data: function(){
		return{
			players:[],
			names:[]
		}
	},
	methods: {
		chooseGame(){
			this.$emit("chooseGame",this.game)
			this.API("GET",`/games/${this.game.identifier}/players`,false,players=>this.players=players)
			console.log(this.profile,"PF")
			this.API("GET",`/games/${this.game.identifier}/players/${this.profile.id}/names`,false,(names)=>{
				if(names.length > 0) this.names = names
				else this.names = Array(this.game.namesPerPerson).fill("")
			})
		}
	},
	template: `
		<li class="collection-item" @click="chooseGame">
			{{game.title}}
			<a class = "btn" @click="chooseGame" v-if="currentGameIdentifier != game.identifier">Join</a>
			<ul class = "collection">
				<witb-player v-for = "player in players" :key = "player.identifier" :player="player" v-if = "player.identifier!=this.profile.id"></witb-player>
			</ul>
			<witb-name v-for = "name in names" :name="name"></witb-name>
		</li>
	`
})

Vue.component('witb-player',{
	props: ['player'],
	template: `
		<li class="collection-item avatar">
			<img :src="player.url" class = "circle"></img>
			<span class = "title">{{player.name}}</span>
			<p>Names done: {{player.names}}</p>
		</li>
	`
})

Vue.component('witb-name',{
	props: ['name'],
	template: `
		<li class="collection-item">
			{{name}}
		</li>
	`
})


var app = new Vue({
	el: '#app',
	data: {
		profile: false
	},
	methods:{
		profileReady(event){
			this.profile = event
		}
	},
	provide: function(){
		return {
			profile: this.profile
		}
	}
})	
