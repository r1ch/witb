var APIMixin = {
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
	mixins:[APIMixin],
	data: () => ({
		authenticated: false,
	}),
	template: `
		<div class = "row">
			<div v-if = "!authenticated" class="g-signin2" data-width="200" data-height="50" data-onsuccess="authenticate" data-theme="dark"></div>
		</div>
	`,
	mounted: function() {
		Credentials.then((user) => {
			this.authenticated = true;
			this.$emit("userReady",user)
		})
	}
})

Vue.component('witb-games',{
	mixins:[APIMixin],
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
			<ul class="collection with-header" v-if = "games">
				<witb-game @chooseGame= "chooseGame" v-for = "game in games" :key="game.identifier" :game="game" :currentGameIdentifier = "currentGameIdentifier"></witb-game>
			</ul>
		</div>
	`
})

Vue.component('witb-game',{
	mixins: [APIMixin],
	inject:['profile'],
	props: ['game','currentGameIdentifier'],
	data: function(){
		return{
			players:[],
			remoteNames:[]
		}
	},
	computed: {
		names : function(){
			let list = Array(this.game.namesPerPerson).fill("")
			list = [...this.remoteNames, ...list]
			return list.slice(0,this.game.namesPerPerson)
		}
	},
	methods: {
		chooseGame(){
			this.$emit("chooseGame",this.game)
			this.API("GET",`/games/${this.game.identifier}/players`,false,players=>this.players=players)
			this.API("GET",`/games/${this.game.identifier}/players/${this.profile.id}/names`,false,(names)=>{
				this.remoteNames = names
			})
		},
		saveNames(event){
			console.log(`saveNames: ${event} ${this.names}`)
		}
	},
	template: `
		<li class="collection-item">
			{{game.title}}
			<a class = "btn" @click="chooseGame" v-if="currentGameIdentifier != game.identifier">Join</a>
			<ul class = "collection" v-if = "currentGameIdentifier == game.identifier">
				<witb-me @saveNames="saveNames" :game="game" :names="names"></witb-me>
				<witb-player v-for = "player in players" :key = "player.identifier" :player="player" v-if = "player.identifier!=profile.id"></witb-player>
			</ul>
		</li>
	`
})

Vue.component('witb-me',{
	inject: ['profile'],
	props: ['game','names'],
	methods: {
		saveNames: function(){
			this.$emit("saveNames",this.names)
		}
	},
	template: `
		<li class="collection-item avatar">
			<img :src="profile.url" class = "circle"></img>
			<span class = "title">{{profile.name}}</span>
			<p>Please pick {{game.namesPerPerson}} names</p>
			<input v-for = "name in names" v-model="name"></input>
			<a class = "btn" @click="saveNames">Save</a>
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

var app = new Vue({
	el: '#app',
	data: {
		profile: {ready:false,id:0,name:'',url:'',token:''}
	},
	methods:{
		userReady(event){
			console.log(`User Ready ${event}`)
			let basicProfile = event.getBasicProfile();
			this.profile.id = basicProfile.getId();
			this.profile.name = basicProfile.getGivenName();
			this.profile.url = basicProfile.getImageUrl();
			this.profile.token = event.getAuthResponse().id_token
			this.profile.ready = true
		}
	},
	provide: function(){
		return {
			profile: this.profile
		}
	},
	template: `
		<div class = "container">
			<google-login @userReady = "userReady"></google-login>
			<witb-games></witb-games>
		</div>
	`
})	
