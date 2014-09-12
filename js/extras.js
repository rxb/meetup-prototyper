function whichTransitionEvent(){
    var t;
    var el = document.createElement('fakeelement');
    var transitions = {
      'transition':'transitionend',
      'OTransition':'oTransitionEnd',
      'MozTransition':'transitionend',
      'WebkitTransition':'webkitTransitionEnd'
    }

    for(t in transitions){
        if( el.style[t] !== undefined ){
            return transitions[t];
        }
    }
}
var transitionEnd = whichTransitionEvent();

function getHashParams() {
	var hashParams = {};
	var e, a = /\+/g,
		// Regex for replacing addition symbol with a space
		r = /([^&;=]+)=?([^&;]*)/g,
		d = function(s) {
			return decodeURIComponent(s.replace(a, " "));
		},
		q = window.location.hash.substring(1);
	while (e = r.exec(q))
	hashParams[d(e[1])] = d(e[2]);
	return hashParams;
}
