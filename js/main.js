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

Vue.component('witb-container',{
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
			this.API("GET","/games",null,games=>{
				this.games=games
				if(this.currentGame) this.currentGame = this.games.find(game=>game.identifier==this.currentGame.identifier)
			})
		},
		chooseGame(event){
			this.currentGame = event
			this.API("PUT",`/games/${this.currentGame.identifier}/players`,this.profile)
		},
		endTurn(namesGot){
			this.API("PUT",`/games/${this.currentGame.identifier}/turn`,{game:this.currentGame,namesGot:namesGot,profile:this.profile},game=>this.currentGame=game)
		}
	},
	template: `
		<div v-if = "games" >
			<witb-game @chooseGame= "chooseGame" v-if = "!currentGameIdentifier || (currentGameIdentifier == game.identifier && !game.started)"  v-for = "game in games" :key="game.identifier" :game="game" :currentGameIdentifier = "currentGameIdentifier"></witb-game>
			<witb-playspace @endTurn = "endTurn" v-if = "currentGame && currentGame.started" :game = "currentGame"></witb-playspace>
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
			remoteNames:[],
			team:0,
			startProblem: ""
		}
	},
	computed: {
		gameReady : function(){
			if(this.game.identifier != this.currentGameIdentifier) this.startProblem = "Not in this game"
			else if(this.players.length <= 1) this.startProblem = "Not enough players"
			else if(this.players.filter(player=>player.numberOfNames != this.game.namesPerPerson).length !=0) this.startProblem = "Some player missing names"
			else this.startProblem = ""
			return this.startProblem == ""
		},
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
	},
	mounted: function(){
		this.listenFor("PLAYER",this.fetchOthers)
	},
	methods: {
		fetchOthers(){
			this.API("GET",`/games/${this.game.identifier}/players`,false,players=>this.players=players)
		},
		fetchMe(){
			this.API("GET",`/players/${this.profile.id}`,false,my=>{
				console.log(JSON.stringify(my))
				this.remoteNames = my.names || []
				this.team = my.team || 0
			})
		},
		chooseGame(){
			this.$emit("chooseGame",this.game)
			this.fetchOthers()
			this.fetchMe()
		},
		saveNames(names){
			this.API("PUT",`/players/${this.profile.id}/names`,{names:this.names.map(name=>name.value).filter(value=>value!="")},my=>{
				this.remoteNames = my.names || []
			})
		},
		saveTeam(team){
			this.API("PUT",`/players/${this.profile.id}/team`,{team:team},my=>{
				this.team = my.team || 0
			})
		},
		startGame(){
			if(this.gameReady) this.API("POST",`/games/${this.game.identifier}/start`)
		}
	},
	template: `
		<div class = row>
			<h5>{{game.title}}</h5>
			<ul class = "list-group-flush" v-if = "currentGameIdentifier == game.identifier">
				<witb-me @saveNames="saveNames" @saveTeam = "saveTeam" :game="game" :names="names" :team="team"></witb-me>
				<witb-player v-for = "player in players" :key = "player.identifier" :player="player" v-if="player.identifier!=profile.id"></witb-player>
			</ul>
			<br>	
			<div class = "offset-3 col-6">
				<button class = "btn btn-primary col-6" @click="chooseGame" v-if="currentGameIdentifier != game.identifier">Join</button>
				<button class = "btn btn-primary col-6" @click="startGame" :class="{'disabled': !gameReady}" v-if="currentGameIdentifier == game.identifier">Start</button>
				<span v-if = "startProblem" class="form-text text-muted">{{startProblem}}</span>
			</div>
		</div>
	`
})

Vue.component('witb-playspace',{
	mixins:[APIMixin],
	inject:['profile','teams','teamColours'],
	props: ['game'],
	data: function(){
		return {
			stages : {
				Ready:0,
				Started:1,
				Finished:2,
				Done:3,
				Next:4
			},
			stage: 0,
			startTime: false,
			timer: false,
			timeRemaining: this.game.secondsPerRound,
			namesLeft : this.game.namesLeftThisRound,
			nameInPlay : "",
			passed : "",
			namesGot : [],
		}
	},
	computed:{
		scores: function(){
			if(!this.game.turns) return {}
			return this.game.turns.reduce((map, turn) => ({
			  ...map,
			  [turn.teamIndex]: (map[turn.teamIndex] || 0) + turn.names.length,
			}), {})
		},
		team: function(){
			return this.game.teams[this.game.teamIndex]
		},
		player: function(){
			return this.team.players[this.game.teamPlayerIndex[this.game.teamIndex]]
		}
	},
	watch: {
		"game.playIndex"(newVal,oldVal){
			if(this.stage == this.stages.Done){
				console.log("After go, clean up")
				this.startTime = false
				this.timer && clearInterval(this.time)
				this.timer = false
				this.timeRemaining = this.game.secondsPerRound
				this.namesLeft = this.game.namesLeftThisRound
				this.nameInPlay = ""
				this.passed = ""
				this.namesGot = []
				this.stage = this.stages.Next
			} else {
				console.log("Pre go, prepare")
				this.stage = this.stages.Ready
			}
		}
	},
	methods:{
		pickNextName : function(){
			if(this.namesLeft && this.namesLeft.length > 0 && this.stage < this.stages.Finished){
				console.log(`Old name: ${this.nameInPlay}`)
				this.nameInPlay = this.namesLeft.splice(this.namesLeft.length * Math.random() | 0, 1)[0]
				console.log(`New name: ${this.nameInPlay}`)
			} else {
				this.nameInPlay = ""
				if(this.stage < this.stages.Finished) this.stage = this.stages.Finished
				console.log(`No names or time, ${this.nameInPlay}`)
			}
		},
		start : function(){
			this.pickNextName()
			this.startTimer()
			this.stage = this.stages.Started
		},
		startTimer : function(){
			this.startTime = Date.now()
			this.timer = setInterval(()=>{this.tick()},500)
		},
		tick : function(){
			this.timeRemaining = Math.max((this.startTime+this.game.secondsPerRound*1000-Date.now())/1000|0,0)
			if(this.timeRemaining <= 0){
				clearInterval(this.timer)
				this.stage = this.stages.Finished
			}
		},
		gotIt : function(name){
			console.log(`GotIt before, got: event: ${this.namesGot}, event: ${name}, nameInPlay: ${this.nameInPlay}, passed:${this.passed}`)
			this.namesGot.push(name)
			this.pickNextName()
			console.log(`GotIt after, event: ${this.namesGot}, event: ${name}, nameInPlay: ${this.nameInPlay}, passed:${this.passed}`)
		},
		passIt : function(name){
			console.log(`PassIt before, event: ${this.namesGot}, event: ${name}, nameInPlay: ${this.nameInPlay}, passed:${this.passed}`)
			this.passed = name
			this.pickNextName()
			console.log(`PassIt after, event: ${this.namesGot}, event: ${name}, nameInPlay: ${this.nameInPlay}, passed:${this.passed}`)
		},
		gotPass : function(name){
			console.log(`gotPass before, event: ${this.namesGot}, event: ${name}, nameInPlay: ${this.nameInPlay}, passed:${this.passed}`)
			this.namesGot.push(name)
			this.passed = false
			console.log(`gotPass after, event: ${this.namesGot}, event: ${name}, nameInPlay: ${this.nameInPlay}, passed:${this.passed}`)
		},
		endTurn : function(){
			this.timer && clearInterval(this.timer)
			this.stage = this.stages.Done
			this.$emit("endTurn",this.namesGot)
		}
	},
	template:`
		<div class="card" :class = "teamColours(teams[player.team].livery).card">
			{{game.title}}
			<div class="card-body">
				<h5 class="card-title">{{player.name}}'s Turn</h5>
    				<h6 class="card-subtitle mb-2 text-muted" v-if = "!game.ended">{{game.rounds[game.roundIndex]}} round</h6>
				<h6 class="card-subtitle mb-2" v-if = "game.ended">Finished!</h6>
				<span v-for = "(value,index) in scores" class="badge badge-pill" :class = "teamColours(teams[game.teams[index].team].livery).badge">{{value}}</span>
			</div>
			<ul class="list-group list-group-flush" v-if = "!game.ended && stage<stages.Done && player.identifier == profile.id">
				<witb-playname @gotIt = "gotPass" :name="passed" :canPass = "false"></witb-playname>
				<witb-playname @gotIt = "gotIt" @passIt = "passIt" :name="nameInPlay" :canPass = "passed == ''"></witb-playname>
			</ul>
			<div class="card-body" v-if = "!game.ended && player.identifier == profile.id">
				<button @click = "start" class =  "btn btn-primary" v-if = "stage==stages.Ready">Start my go</button>
				<h6 v-if = "stage<stages.Done">{{timeRemaining}} s</h6>
				<button @click = "endTurn" class =  "btn btn-primary" v-if = "stage==stages.Finished">End my go</button>
			</div>
		</div>
	`	
})

Vue.component('witb-playname',{
	props: ['name','canPass'],
	methods:{
		gotIt: function(){
			this.$emit("gotIt",this.name)
		},
		passIt : function(){
			this.$emit("passIt",this.name)
		}
	},
	template: `
		<li class = "list-group-item" v-if='name!=""'>
			<div class="btn-group" role="group">
				<button @click = "gotIt" type="button" class="btn btn-success">Got it!</button>
				<button type="button" class="btn btn-secondary" disabled>{{name}}</button>
				<button @click = "passIt" type="button" class="btn btn-danger" v-if = "canPass">Pass</button>
			</div>
		</li>
	`
})

Vue.component('witb-me',{
	inject: ['teams','teamColours'],
	props: ['game','names','team'],
	methods: {
		saveNames: function(){
			this.$emit("saveNames",this.names)
		},
		saveTeam: function(team){
			this.$emit("saveTeam",team)
		}
	},
	template: `
		<li class="list-group-item" :class="teamColours(teams[team].livery).li">
			<div class="form-group row">
				<label class="col-4">Team</label> 
				<div class="col-8">
					<div class="btn-group" role="group">
						<button @click = "saveTeam(teamOption.key)" v-for = "teamOption in teams" :key="teamOption.key" class = "btn" :class = "teamColours(teamOption.livery).button">{{teamOption.name}}</button>
					</div>
					<span class="form-text text-muted">Pick your team</span>
				</div>
			</div>
			<div class="form-group row">
				<label class="col-4 col-form-label">Names</label> 
				<div class="col-8">
					<input v-for = "name in names" v-model="name.value" :key="name.key" type="text" required="required" class="form-control">
					<span class="form-text text-muted">Pick {{game.namesPerPerson}} names</span>
				</div>
			</div>
			<div class="form-group row">
				<div class="offset-2 col-10">
					<button @click = "saveNames" class="btn btn-primary">Save Names</button>
					<span class="form-text text-muted">{{names.filter(name=>name.value!="").length}} names saved</span>
				</div>
			</div>
		</li>
	`
})

Vue.component('witb-player',{
	props: ['player'],
	inject:['teams','teamColours'],
	template: `
		  <li class="list-group-item" :class="teamColours(teams[player.team].livery).li">
			<span class = "title">{{player.name}}</span>
			<span class="badge badge-primary badge-pill">{{player.numberOfNames}}</span>
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
			listenFor: this.listenFor,
			teams: [
				{name:"1",livery:"primary",key:0},
				{name:"2",livery:"success",key:1},
				{name:"3",livery:"danger",key:2},
				{name:"4",livery:"warning",key:3}
			],
			teamColours: (livery)=>({
				li:`list-group-item-${livery}`,
				button:`btn-${livery}`,
				card:`border-${livery}`,
				badge:`badge-${livery}`
			})
			
		}
	},
	created: function(){
		this.socket = new WebSocket(window.config.socketGatewayUrl + window.config.socketGatewayPath)
		this.socket.onmessage = event=>{
			this.messages.unshift(event.data)
			if(this.messages.length > 3) this.messages.pop()
			setTimeout(()=>{
				if(this.messages) this.messages.pop()
			},5000)
		}
	},
	template: `
		<div class = "container">
			<google-login @userReady = "userReady"></google-login>
			<witb-container></witb-container>
			<span class = "badge badge-pill badge-primary" v-for = "message in messages">
				{{message.substring(0,1)}}		
			</span>
		</div>
	`
})	
