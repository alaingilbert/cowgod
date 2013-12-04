#!/usr/bin/env node

var fs = require('fs');
var util = require('util');
var argv = require('optimist').argv;
var sys = require('sys');
var exec = require('child_process').exec;
var argv = require('optimist').argv;

var cowgod = require('./cowgod.js');

if (typeof argv.nick === 'undefined') {
	console.log('Need a -nick name!');
	process.exit(1);
} else {
	var myname = argv.nick;
	var settings = require('./settings_'+myname+'.js');
}       
cowgod.logger('! My Name Is '+myname+' headed for '+settings.plug_room);

var PlugAPI  = require('plugapi');
var UPDATECODE = 'fe940c';

var log_tsv  = fs.createWriteStream(settings.log_tsv,  {'flags': 'a'});

var nugget = {
	//moo: function() {
	//	console.log('Moo!');
	//};

	log: function() {
		cowgod.logger('raw nugget.log');
		for (var i = 0; i < arguments.length; i++) {
			console.log(arguments[i]);
		}
	}
}

// var bot = new PlugAPI(settings.plug_auth);
// bot.connect(settings.plug_room);
//

var bot = new PlugAPI(settings.plug_auth, UPDATECODE);
util.log(util.inspect(bot));
cowgod.set_active_bot(bot);

cowgod.logger('doing that logging thing, whatever the fuck that is');
bot.setLogObject(nugget);
cowgod.logger('connecting to '+settings.plug_room);
bot.connect(settings.plug_room);

cowgod.id_to_name('52499dacc3b97a430c54501d');

bot.on('roomJoin', function(data) {
	cowgod.logger('roomJoin');
	logger_tsv([ 'event','roomJoin','nickname',data.user.profile.username,'plug_user_id',data.user.profile.id,'djPoints',data.user.profile.djPoints,'fans',data.user.profile.fans,'listenerPoints',data.user.profile.listenerPoints,'avatarID',data.user.profile.avatarid ]);
	util.log(util.inspect(data));
	cowgod.remember_user(data.user.profile.id,data.user.profile.username);
	process_waitlist();

});

bot.on('chat', function(data) {
	log_chat(data);
	cowgod.remember_user(data.fromID,data.from);
});

bot.on('emote', function(data) {
	log_chat(data);
	cowgod.remember_user(data.fromID,data.from);
});

bot.on('close', function(data) {
	cowgod.logger('close');
	util.log(util.inspect(data));
});

bot.on('error', function(data) {
	cowgod.logger('error');
	util.log(util.inspect(data));
});

bot.on('userJoin', function(data) {
	log_join(data);
	cowgod.remember_user(data.id,data.username);
});

bot.on('userLeave', function(data) {
	log_part(data);
});

bot.on('djUpdate', function(data) {
	log_djupdate(data);
	process_waitlist();
});

bot.on('curateUpdate', function(data) {
	// this is like a TT snag
	log_curate(data);
});

bot.on('voteUpdate', function(data) {
	log_vote(data);
});

bot.on('userUpdate', function(data) {
	cowgod.logger('userUpdate');
	util.log(util.inspect(data));
});

bot.on('djAdvance', function(data) {
	log_play(data);
	if (data.media.author !== 'undefined') {
		lag_vote();
	}
	process_waitlist();
});

function do_vote (vote) {
	// bot.chat('Woot!');
	cowgod.logger(' I am wooting');
	bot.woot();
}

function lag_vote (vote) {
	waitms = parseInt(Math.random() * 20000)+500;
	cowgod.logger('- will vote '+vote+' in '+waitms+' ms');
	setTimeout(function(){ do_vote(vote); }, waitms);
}

function logger_tsv(larray) {
	if (typeof log_tsv === 'undefined') {
	} else {
		var d = Math.round(new Date().getTime() / 1000.0);

		log_tsv.write('clock\t'+d);
		log_tsv.write('\t');
		log_tsv.write(larray.join('\t'));
		log_tsv.write('\n');
	}
}

function log_chat(data) {
	if (data.type == 'message') {
		cowgod.logger('<'+data.from+'> '+data.message);
	} else if (data.type == 'emote') {
		cowgod.logger('* '+data.from+' '+data.message);
	} else {
		cowgod.logger('chat (unknown type)');
		util.log(util.inspect(data));
	}
	logger_tsv([ 'event','chat','nickname',data.from,'room',data.room,'plug_user_id',data.fromID,'message',data.message,'type',data.type ]);
}

function log_vote(data) {
	if (data.vote == 1) {
		cowgod.logger(cowgod.id_to_name(data.id)+' wooted');
	} else {
		cowgod.logger('vote (unknown type)');
		util.log(util.inspect(data));
	}
	logger_tsv([ 'event','vote','vote',data.vote,'plug_user_id',data.id ]);
}

function log_join(data) {
	cowgod.logger(data.username+' joined the room');
	logger_tsv([ 'event','join','nickname',data.username,'plug_user_id',data.id,'status',data.status,'fans',data.fans,'listenerPoints',data.listenerPoints,'avatarID',data.avatarID,'djPoints',data.djPoints,'permission',data.permission ]);
}

function log_part(data) {
	cowgod.logger(cowgod.id_to_name(data.id)+' left the room');
	logger_tsv([ 'event','part','plug_user_id',data.id ]);
}

function log_curate(data) {
	cowgod.logger(cowgod.id_to_name(data.id)+' snagged this song');
	logger_tsv([ 'event','snag','plug_user_id',data.id ]);
}

function log_play(data) {
	cowgod.logger(cowgod.id_to_name(data.currentDJ)+' is playing '+data.media.title+' by '+data.media.author);
	if (data.media.author !== 'undefined') {
		logger_tsv( [ 'event','djAdvance','plug_user_id',data.currentDJ,'playlistID',data.playlistID,'song',data.media.author,'title',data.media.title,'duration',data.media.duration,'media_id',data.media.id,'media_cid',data.media.cid,'media_format',data.media.format ]);
	}
}

function log_djupdate(data) {
	cowgod.logger('djUpdate:');
	util.log(util.inspect(data));
	cowgod.logger('--');
	util.log(util.inspect(data.djs));
	cowgod.logger('--');
	for (var u in data.djs) {
		cowgod.logger('logging a u.user '+u);
		util.log(util.inspect(data.djs[u]));
	}
}

function process_waitlist() {
	cowgod.logger('calling getWaitList');
	bot.getWaitList(function(data) {
		cowgod.logger('I gotWaitList');
		util.log(util.inspect(data));
	});
}
