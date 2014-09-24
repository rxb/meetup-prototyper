/*
* GIMME 
* Provides a simple interface for grabbing data from the Meetup API
* Builds a context object for use in mustache or handlebars templates ( Gimme.context )
* Usage example:

var shoppingList = [
	{"gimme": "group"},
 	{"gimme": "open_events"},

	// "key" field lets you specify what the object will be called in the context 
	// useful for creating more than one obj per API method
	// this example will use the "open_events" method, but will be called "open_events_nyc"
	{"gimme": "open_events", "key": "open_events_nyc", "zip": "10012"}, 

	// you can explicitly define any field supported by the api, if you care to
	{"gimme": "event", "event_id": 112067582}
];

var extraContext = {
	"days": ["Monday", "Tuesday", "Wednesday"] 
}

var gme = new Gimme(shoppingList, function(){
	$('body').append( Handlebars.compile( $('#main-template').html() )( gme.context ) ); // render template
}, extraContext);

*/

function Gimme(shoppingList, onFetchComplete, extraContext){
	this.callsCompleted = 0;
	this.shoppingList = shoppingList;
	this.onFetchComplete = onFetchComplete || function(){};
	this.extraContext = extraContext || {};
	this.context = {};
	this.fetch();
}

Gimme.prototype = {
	apiUrl: 'https://api.meetup.com/',
	apiKey: '715d68731b3913292f447f4c45547',
	
	// iterates through shoppingList
	fetch: function(){
		if( this.shoppingList.length > 0 ){
			for(var i=0; i<this.shoppingList.length; i++){
				var gimme = this.shoppingList[i].gimme;
				var key = this.shoppingList[i].key || gimme;
				delete this.shoppingList[i].gimme;
				delete this.shoppingList[i].key;
				var opts = this.inventory[ gimme ]( this.shoppingList[i], this );
				$.extend(opts.data, this.shoppingList[i]); 
				this.ajax(opts, key);
 			}
		}
		else{
			// nothing requested, so jump straight to finish
			this.finish();
		}
	},
	
	// execute ajax calls defined in inventory
	ajax: function(opts, key){
		var self = this;
		var complete = function(){
	    	self.callsCompleted++;
			if(self.callsCompleted == self.shoppingList.length){
				// shopping list has been completed
				self.finish();
			}
		};
		var defaults = {
			success: function(data){
				self.context[key] = opts.parse(data);
				complete();
			},
			error: function(jqXHR, textStatus, errorThrown){
				console.log('error: '+textStatus);
				complete();
			},
			url: this.apiUrl+opts.method,
			dataType : 'jsonp',
			localCache   : true,
			data: {
				"key": this.apiKey
			}
		}
		$.ajax( $.extend(true, defaults, opts) );
	},
	
	// when all ajax calls are done
	finish: function(){
		// combine all contexts call the callback		
		$.extend( this.context, this.extraContext, this.defaultContext);
		this.onFetchComplete.call(this);
	},
	
	
	// DEFAULTS
	// the idea is to never have to specify and fields you don't care about when using Gimme
	// these are used for defaults when unspecified fields are required
	// things like event_id, group_id, member_id might stop working at any time if deleted from production db
	defaults: {
		page: 20,
		event_id: 112067582,
		group_id: 1227102,
		urlkey: 'shutterbugexcursions',
		board_id: 854675,
		member_id: 4353803,
		zip: 15205,
	},
	
	/*
	* INVENTORY
	* These are methods that build setup objects for the API calls to be run by Gimme.ajax
	* In the parse method, you can massage data into more easily iteratable structures, if necessary
	*/
	inventory: {
		
		// single event
		event: function( data, self ){
			var event_id = data.event_id || self.defaults.event_id;
			return {
				method: '2/event/'+event_id,
				parse: function(data){
					return data;
				},
				data: {}
			};
		},
		
		// non-private events from groups across the system
		open_events: function( data, self ){
			return {
				method: '2/open_events/',
				parse: function(data){
					return data.results;
				},
				data: {
					zip: self.defaults.zip,
					page: self.defaults.page
				}
			};
		},
		
		// same as open_events, except events are grouped by date
		// array of objects that each contain a date and an array of events on that date
		// good for grouped views of events, like the top-level calendar view
		dates_with_open_events: function( data, self ){
			return {
				method: '2/open_events/',
				parse: function(data){
					var open_events = data.results;
					var dates = [];
					var last_date = 0;
					// nest those events
					if(open_events && open_events.length > 0){
						for(var i=0; i<open_events.length; i++){
							var ev = open_events[i];
							if(!moment( ev.time ).isSame(last_date, 'day')){
								var this_date = moment( ev.time ).startOf('day');
								dates.push({date: this_date, events: [] });	
								last_date = this_date;							
							}
							dates[dates.length-1].events.push(ev);
						}
					}
					return dates;
				},
				data: {
					zip: self.defaults.zip,
					page: self.defaults.page * 2,
					order: 'time',
					status: 'upcoming'
				}
			};
		},
		
        
        
        
		// events from a single group
		events: function( data, self ){
			return {
				method: '2/events/',
				parse: function(data){
					return data.results;
				},
				data: {
					group_id: self.defaults.group_id,
					page: self.defaults.page,
                    limited_events: true,
                    text_format: 'plain'
				}
			};
		},	
        
		// events from a single group
		events_for_member: function( data, self ){
			return {
				method: '2/events/',
				parse: function(data){
					return data.results;
				},
				data: {
					member_id: self.defaults.member_id,
					page: self.defaults.page,
                    limited_events: true,
                    text_format: 'plain',
                    "fields": "venue"
				}
			};
		},	
        	
		
		event_comments: function( data, self ){
			return {
				method: '2/event_comments/',
				parse: function(data){
					// reconstruct event commment nesting
					var raw_comments = data.results;
					var event_comments = [];
					var this_thread;

					var parseComment = function(c){
						if(c.member_photo && c.member_photo.photo_link){
							c.photo = c.member_photo.photo_link;
						}
						if(c.like_count > 0){
							c.likes = {like_count: c.like_count};
						}
						//c.datetime = format_date(c.time);
						return c;
					}

					if(raw_comments && raw_comments.length > 0){
						// nest comments 
						for(var i=0; i<raw_comments.length; i++){
							this_thread = raw_comments[i];
							event_comments.push( parseComment(raw_comments[i]) );

							if(raw_comments[i+1]){
								while(this_thread.event_comment_id == raw_comments[i+1].in_reply_to){
									if(typeof this_thread.replies == 'undefined'){
										this_thread.replies = [];
										this_thread.has_replies = true;
									}
									this_thread.replies.push( parseComment(raw_comments[i+1]) );
									i++;
								}
							}
						}	
					}
					return event_comments;
				},
				data: {
					"order": "thread",
					"fields": "like_count,member_photo",
					"page": self.defaults.page,
					"event_id": self.defaults.event_id
				}
			};
		},
		
		rsvps: function( data, self ){
			return {
				method: '2/rsvps',
				parse: function(data){
					// add additional data massaging here
					var rsvps = $.map(data.results, function(n, i){

						var r = {
							id: n.member.member_id, 
							name: n.member.name, 
							match: n.member.name.toUpperCase() 
						};
						
						// easier to not have guests field when 0 guests
						if(n.guests > 0){
							r.guests = n.guests;
						}	
						
						// this is total fakery, but simulates info from the social server
						if(i == 0){
							r.host = true;
						}
						else if(i > 0 && i <= 2){
							r.friend = true
						}
						else if(i > 2 && i <= 4){
							r.fof = true
						}

						// flatten photo link
						if( typeof n.member != 'undefined' && typeof n.member_photo != 'undefined' ){
							r.photo = n.member_photo.photo_link;
						}

						return r;
					});
					return rsvps;
				},
				data: {
					event_id: self.defaults.event_id					
				}
			};
		},
		
		groups: function( data, self ){
			return {
				method: '2/groups',
				parse: function(data){
					// add additional data massaging here
					var groups = $.map(data.results, function(n, i){
						if( typeof n.photos !== 'undefined' && n.photos.length > 0 ){
							n.photo = n.photos[0].photo_link;
						}
						else if( typeof n.group_photo !== 'undefined'){
							n.photo = n.group_photo.photo_link;
						}
                        n.description = (n.description) ? n.description.replace(/<p>[\s]*<\/p>/g,"") : '';
                        n.events = [];
						return n;
					});
					return groups;
					
				},
				data: {
					zip: self.defaults.zip,
					fields: 'photos,next_event,join_info',
					order: 'members'
				}
			};
		},
		
		// there's not a singular group API method, but let's emulate one for consistency
		group: function( data, self ){
			return {
				method: '2/groups',
				parse: function(data){
					var group = data.results[0];
                    if( typeof group.group_photo !== 'undefined' ){
					    group.logo = group.group_photo.photo_link;
                    }
                    
					if( typeof group.photos !== 'undefined' && group.photos.length > 0){
						group.photo = group.photos[0].photo_link;
					}
					else if( typeof group.group_photo !== 'undefined' ){
						group.photo = group.group_photo.photo_link;
					}
                    
                    
					return group;
				},
				data: {
					page: 1, 
					fields: 'photos,sponsors,join_info,similar_groups',
					group_id: self.defaults.group_id
				}
			};			
		},
		
		photo_albums: function( data, self ){
			return {
				method: '2/photo_albums',
				parse: function(data){
					return data.results;
				},
				data: {
					group_id: self.defaults.group_id
				}
			};
		},
		
		photos: function( data, self ){
			return {
				method: '2/photos',
				parse: function(data){					
					return data.results;
				},
				data: {
					group_id: self.defaults.group_id
				}
			};
		},
		
		members: function( data, self ){
			return {
				method: '2/members',
				parse: function(data){					
					// add additional data massaging here
					
					var members = data.results;
					
					// sort people with bios to the top
					members.sort(function(a, b){
					    var keyA = (a.bio)? a.bio.length : 0;
					    var keyB = (b.bio)? b.bio.length : 0;
					    if(keyA > keyB) return -1;
					    if(keyA < keyB) return 1;
					    return 0;
					});
					
					members = $.map(members, function(n, i){
                        n.match = n.name.toUpperCase();
						if( (typeof n.photo !== 'undefined') && (typeof n.photo.photo_link !== 'undefined') ){
							n.photo = n.photo.photo_link;
						}
						return n;
					});
					return members;
				},
				data: {
					group_id: self.defaults.group_id,
					page: self.defaults.page,
					order: 'visited',
					desc: true
				}
			};
		},
		
		profile: function( data, self ){
			var gid = data.group_id || self.defaults.group_id;
			var gid = data.member_id || self.defaults.member_id;
			return {
				method: '2/profile/'+data.group_id+"/"+data.member_id,
				parse: function(data){
					if( (typeof data.photo !== 'undefined') && (typeof data.photo.photo_link !== 'undefined') ){
						data.photo = data.photo.photo_link;
					}					
					return data;
				},
				data: {}
			};
		},
		
		categories: function( data, self ){
			return {
				method: '2/topic_categories/',
				parse: function(data){					
					return data.results;
				},
				data: {
				    "fields": "best_topics"
				}
			};
		},
		
		discussions: function( data, self ){
			var uk = data.urlkey || self.defaults.urlkey;
			var bid = data.board_id || self.defaults.board_id;
			var fake_replies = [
				[
					{
						name: "Sally Smeetup",
						photo: "http://api.randomuser.me/0.3/portraits/women/1.jpg",
						body: "That's really awesome! Thanks for sharing.",
						likes: 2
					}
				],
				[],
				[
					{
						name: "Joe Smithers",
						photo: "http://api.randomuser.me/0.3/portraits/men/3.jpg",
						body: "So true. This is the reason I'm glad I found this group. Thanks to all of you."				
					},
					{
						name: "Jason Anderson",
						photo: "http://api.randomuser.me/0.3/portraits/men/4.jpg",
						body: "I've been wondering about this sort of thing for a long time. Do you have any additional info?",
						likes: 1				
					}
				],
				[],
				[
					{
						name: "Amy Black",
						photo: "http://api.randomuser.me/0.3/portraits/women/5.jpg",
						body: "That's interesting, but I'm not sure I really understand. Can anyone else help me out here?",
						likes: 14				
					}
				],
				[
					{
						name: "Franklin",
						photo: "http://api.randomuser.me/0.3/portraits/men/5.jpg",
						body: "See now, that's exactly what I've been trying to explain to people, but I've never had much success.",
						likes: 2				
					}
				]
			];
			return {
				method: uk+'/boards/'+bid+'/discussions',
				parse: function(data){	
					var discussions = data.data; // this one is "data", not "results"
					discussions = $.map(discussions, function(n, i){
						
						/* I'm mostly using this for faking Coco Talk, so here's some backfill */
						
						// strip bbcode
						n.body = n.body.replace(/\[(\w+)[^\]]*](.*?)\[\/\1]/g, ''); 
						var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
						
						// attach a member photo, since API doesn't supply it
						n.started_by.photo = "http://api.randomuser.me/0.3/portraits/women/"+(i+10)+".jpg";
						
						// attach random likes
						n.likes = 0;
						has_likes = Math.floor(Math.random()*2); // does it have likes at all?
						if (has_likes == 1){
							n.likes = Math.floor(Math.random()*9); // between 1 and 9 likes
						}
						
						// attach replies
						n.replies = fake_replies[ i ] || [];
						
						return n;
					});
						
					return discussions;
				},
				data: {}
			};
		},
		
		coco: function( data, self ){
			// get events
			// get event discussions
			// get discussion
			// how to add photo avatars?
		}
		
		
	},

	// DEFAULTCONTEXT
	// bonus context items that don't require API calls
	// contains ipsum-like text for now
	// generic users or other data could be a good addition
	defaultContext: {
		ipsum: {
			paragraph: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
			sentence: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
		},
		lebowski: {
			paragraph: "Yeah, well, right man, there are many facets to this, uh, you know, many interested parties. If I can find your money, man— what's in it for the Dude? A ut turpis praesent felis ligula, malesuada suscipit malesuada non. Thankie… Just one thing, Dude. D'ya have to use s'many cuss words? Ultrices non urna sed orci ipsum, placerat id condimentum rutrum, rhoncus ac lorem aliquam. That wasn't her toe. Placerat posuere neque, at dignissim magna ullamcorper in aliquam.",
			sentence: "Yeah, well, right man, there are many facets to this, uh, you know, many interested parties."
		},
		hipster: {
			paragraph: "Trust fund McSweeney's vinyl Tonx gentrify pork belly sriracha, hashtag Echo Park mlkshk ennui stumptown PBR. Pickled Austin tote bag Banksy, banjo 3 wolf moon put a bird on it roof party narwhal. Shabby chic messenger bag try-hard High Life. Gluten-free Neutra hashtag you probably haven't heard of them wayfarers. Mixtape cred Tumblr, artisan swag polaroid freegan ethical. Pork belly fingerstache biodiesel roof party, gluten-free +1 forage salvia hella brunch. Tote bag salvia wolf keytar whatever pour-over messenger bag.",
			sentence: "Trust fund McSweeney's vinyl Tonx gentrify pork belly sriracha, hashtag Echo Park mlkshk ennui stumptown PBR."
		}
		
	}
}