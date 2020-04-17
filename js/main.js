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
	inject:['profile','listenFor'],
	data: ()=>({
		games:[],
		currentGame:false
	}),
	computed:{
		currentGameIdentifier(){
			return this.currentGame ? this.currentGame.identifier : false;
		}
	},
	mounted: function(){
		this.fetchGames();
		this.listenFor("GAME",this.fetchGames)
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
			<ul class="list-group" v-if = "games" >
				<witb-game @chooseGame= "chooseGame" v-if = "!(currentGame && currentGame.started)"  v-for = "game in games" :key="game.identifier" :game="game" :currentGameIdentifier = "currentGameIdentifier"></witb-game>
				<witb-playspace v-if = "currentGame && currentGame.started" :game = "currentGame"></witb-playspace>
			</ul>
		</div>
	`
})

Vue.component('witb-game',{
	mixins: [APIMixin],
	inject:['profile','listenFor'],
	props: ['game','currentGameIdentifier'],
	data: function(){
		return{
			players:[],
			remoteNames:[]
		}
	},
	computed: {
		names : function(){
			let list = []
			for(let i=0;i<this.game.namesPerPerson;i++){
				list.push({
					key:i,
					value: this.remoteNames[i]||""
				})
			}
			return list
		},
		gameReady : function(){
			return 	this.game.identifier == this.currentGameIdentifier && 
				this.players.length > 1 &&
				this.players.filter(player=>player.numberOfNames != this.game.namesPerPerson).length == 0
		}
	},
	mounted: function(){
		this.listenFor("PLAYER",this.fetchPlayers)
	},
	methods: {
		fetchPlayers(){
			this.API("GET",`/games/${this.game.identifier}/players`,false,players=>this.players=players)
		},
		chooseGame(){
			this.$emit("chooseGame",this.game)
			this.fetchPlayers()
			this.API("GET",`/games/${this.game.identifier}/players/${this.profile.id}/names`,false,(names)=>{
				this.remoteNames = names
			})
		},
		saveNames(){
			this.API("PUT",`/games/${this.game.identifier}/players/${this.profile.id}/names`,this.names.map(name=>name.value).filter(value=>value!=""),(names)=>{
				this.remoteNames = names
			})
		},
		startGame(){
			this.API("POST",`/games/${this.game.identifier}/start`)
		}
	},
	template: `
		<li class="list-group-item">
			{{game.title}}
			<button class = "btn btn-primary" @click="chooseGame" v-if="currentGameIdentifier != game.identifier">Join</button>
			<button class = "btn btn-primary" @click="startGame" :class="{'disabled': !gameReady}" v-if="currentGameIdentifier == game.identifier && !game.started">Start</button>
			<ul class = "list-group" v-if = "currentGameIdentifier == game.identifier && !game.started">
				<witb-me @saveNames="saveNames" :game="game" :names="names"></witb-me>
				<witb-player v-for = "player in players" :key = "player.identifier" :player="player" v-if = "player.identifier!=profile.id"></witb-player>
			</ul>
		</li>
	`
})

Vue.component('witb-playspace',{
	mixins:[APIMixin],
	inject:['profile'],
	props: ['game'],
	methods:{},
	template:`
		<div class = "row">
			<h3>{{game.title}}</h3><br>
			Current round: {{game.rounds[game.roundIndex]}}<br>
			It's {{game.players[game.playerIndex].name}}'s go<br>
			<witb-playname :name="name"></witb-playname>
		</div>
	`	
})

Vue.component('witb-playname',{
	props: ['name','pass'],
	methods:{},
	template: `
		<div class="input-field col s6">
          		<i class="material-icons prefix">account_circle</i>
          		<input id="icon_prefix" type="text" class="validate">
		  	<label for="icon_prefix">{{name}}</label>
        	</div>
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
		<li class="list-group-item">
			<img :src="profile.url" class="rounded-circle"></img>
			<span class = "title">{{profile.name}}</span>
			<p>Please pick {{game.namesPerPerson}} names</p>
			<input v-for = "name in names" v-model="name.value" :key="name.key"></input>
			<a class = "btn" @click="saveNames">Save</a>
		</li>
	`
})

Vue.component('witb-player',{
	props: ['player'],
	template: `
		<li class="list-group-item">
			<img :src="player.url" class = "circle"></img>
			<span class = "title">{{player.name}}</span>
			<p>Names done: {{player.numberOfNames}}</p>
		</li>
	`
})

var app = new Vue({
	el: '#app',
	data: {
		profile: {ready:false,id:0,name:'',url:'',token:''},
		socket: null,
		messages: []
	},
	methods:{
		userReady(event){
			console.log(`User Ready ${JSON.stringify(event)}`)
			let basicProfile = event.getBasicProfile();
			this.profile.id = basicProfile.getId();
			this.profile.name = basicProfile.getGivenName();
			this.profile.url = basicProfile.getImageUrl();
			this.profile.token = event.getAuthResponse().id_token
			this.profile.ready = true
		},
		listenFor(key,handler){
			this.socket.addEventListener("message",event=>event.data == key ? handler() : false)
		}
	},
	provide: function(){
		return {
			profile: this.profile,
			listenFor: this.listenFor
		}
	},
	created: function(){
		this.socket = new WebSocket(window.config.socketGatewayUrl + window.config.socketGatewayPath)
		this.socket.onmessage = event=>{
			this.messages.shift(event.data)
			if(this.messages.length > 3) this.mesages.pop() 
		}
	},
	template: `
		<div class = "container">
			<google-login @userReady = "userReady"></google-login>
			<witb-games></witb-games>
			<span class = "badge badge-pill badge-primary" v-for = "message in messages">
				{{message.substring(0,1)}}
			</p>
		</div>
	`
})	
