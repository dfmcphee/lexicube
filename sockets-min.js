module.exports=function(e,c,b,a,d){d.sockets.on("connection",function(f){f.on("sendchat",function(g){d.sockets.emit("updatechat",f.username,g)});f.on("adduser",function(g){f.username=g.username;f.userId=g.id;f.userColor=g.color;e.findById(f.userId,function(i,h){if(h){h.color=g.color;h.online=true;h.save(function(l,j,k){if(l){return next(l)}f.broadcast.emit("updatechat","SERVER",f.username+" has connected");e.find({online:true},function(m,n){d.sockets.emit("updateusers",n)})});b.where("players").lt(11).exec(function(j,l){if(!j&&l&&l.length>0){var k=l[0];f.roomId=k._id;k.players=k.players+1;k.save();c.findById(k.front,function(m,n){d.sockets.emit("updategrid",n,f.roomId)});c.findById(k.back,function(m,n){d.sockets.emit("updategrid",n,f.roomId)});c.findById(k.left,function(m,n){d.sockets.emit("updategrid",n,f.roomId)});c.findById(k.right,function(m,n){d.sockets.emit("updategrid",n,f.roomId)});c.findById(k.top,function(m,n){d.sockets.emit("updategrid",n,f.roomId)});c.findById(k.bottom,function(m,n){d.sockets.emit("updategrid",n,f.roomId)});console.log(k)}else{new b({players:1}).save(function(o,n,m){if(o){console.log("There was a problem saving room.")}else{f.roomId=n._id;a.generateRoom(n._id)}})}})}else{f.emit("refreshuser",g.id)}})});f.on("updateSelection",function(g){console.log("user #"+g.user+" has selected a word");d.sockets.emit("updateSelections",g)});f.on("checkword",a.checkWord);f.on("sendletter",function(g){b.findById(f.roomId,function(h,i){if(i){c.findById(i[g.side],function(j,k){if(!k||j){return}k.guessed[g.index]=g.letter;k.save();f.broadcast.emit("updateletter",g)})}})});f.on("disconnect",function(){e.findById(f.userId,function(h,g){if(g){g.online=false;g.save(function(k,i,j){if(k){return next(k)}b.findById(f.roomId,function(l,m){if(m){m.players=m.players-1;m.save()}})})}});e.find({online:true},function(g,h){d.sockets.emit("updateusers",h)});f.broadcast.emit("updatechat","SERVER",f.username+" has disconnected")})})};