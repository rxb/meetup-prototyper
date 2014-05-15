// helper to render handlebars partials with an inline JSON for values
// kind of dirty, but for prototyping, readability and speed wins
// currently, all touchlist partials are in js/partials.html
// usage: {{quik 'tl-select' data='{"label": "Countries", "options": ["United States", "North Korea", "Luxembourg"]}' }}
var partialRenderCount = 0; 
Handlebars.registerHelper('quik', function(partialId, options) {
	// probably could make this faster by pre-compiling the partials
	var selector = 'script[type="text/x-handlebars-template"]#' + partialId;
	var source = $(selector).html();
	var attribs = JSON.parse(options.hash.data);

	// if no element id specified, make one using partialRenderCount
	// touchlist partials need an id to hook up inputs and labels
	attribs.id = attribs.id || "partial-"+partialRenderCount; 
	partialRenderCount++;

    var html = Handlebars.compile(source)(attribs);
	return new Handlebars.SafeString(html);
});


//  helper to format an ISO date using Moment.js
//  http://momentjs.com/
//  moment syntax example: moment(Date("2011-07-18T15:50:52")).format("MMMM YYYY")
//  usage: {{dateFormat creation_date format="MMMM YYYY"}}
Handlebars.registerHelper('dateFormat', function(context, block) {
  if (window.moment) {
    var f = block.hash.format || "MMM Do, YYYY";
    return moment( context ).format(f);
  }else{
    return context;   //  moment plugin not available. return data as is.
  };
});

Handlebars.registerHelper('dateRelative', function(context, block) {
  if (window.moment) {
    return moment( context ).fromNow();
  }else{
    return context;   //  moment plugin not available. return data as is.
  };
});

Handlebars.registerHelper('linkify', function(context, block) {
	var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
	return context.replace(exp,"<a href='$1'>$1</a>"); 
});


// helper to format a number with commas
// could be expanded to allow more formatting options
Handlebars.registerHelper('numberFormat', function(context, block) {	
	//Seperates the components of the number
	var n= context.toString().split(".");
	//Comma-fies the first part
	n[0] = n[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	//Combines the two sections
	return n.join(".");
});


// kill blank lines and excessive indenting 
// probably shouldn't call this "trim", really
// it's mostly for the code examples in the documentation
Handlebars.registerHelper('trim', function(context, block) {
	// strip blank lines
	var new_context = context.replace(/^\s*$[\n\r]{1,}/gm,"");
	
	// find out how far first line is indented
	var match = new_context.match(/^\s+/);
	
	// remove that same amount of indentation from all lines
	var re = new RegExp("^"+match[0], "gm");
	new_context = new_context.replace(re, '');
	return new_context;
});

Handlebars.registerHelper('times', function(n, block) {
    var accum = '';
    for(var i = 0; i < n; ++i)
        accum += block.fn(i);
    return accum;
});

Handlebars.registerHelper ('truncate', function (str, len) {
    if (str.length > len && str.length > 0) {
        var new_str = str + " ";
        new_str = str.substr (0, len);
        new_str = str.substr (0, new_str.lastIndexOf(" "));
        new_str = (new_str.length > 0) ? new_str : str.substr (0, len);

        return new Handlebars.SafeString ( new_str +'...' ); 
    }
    return str;
});


Handlebars.registerHelper ('truncateMean', function (str, len) {
    if (str.length > len) {
        var new_str = str.substr (0, len+1);

        while (new_str.length) {
            var ch = new_str.substr ( -1 );
            new_str = new_str.substr ( 0, -1 );

            if (ch == ' ') {
                break;
            }
        }

        if ( new_str == '' ) {
            new_str = str.substr ( 0, len );
        }

        return new Handlebars.SafeString ( new_str +'...' ); 
    }
    return str;
});


Handlebars.registerHelper('json', function(context) {
    return JSON.stringify(context);
});


Handlebars.registerHelper('compare', function(lvalue, rvalue, options) {

    if (arguments.length < 3)
        throw new Error("Handlerbars Helper 'compare' needs 2 parameters");

    operator = options.hash.operator || "==";

    var operators = {
        '==':       function(l,r) { return l == r; },
        '===':      function(l,r) { return l === r; },
        '!=':       function(l,r) { return l != r; },
        '<':        function(l,r) { return l < r; },
        '>':        function(l,r) { return l > r; },
        '<=':       function(l,r) { return l <= r; },
        '>=':       function(l,r) { return l >= r; },
        'typeof':   function(l,r) { return typeof l == r; }
    }

    if (!operators[operator])
        throw new Error("Handlerbars Helper 'compare' doesn't know the operator "+operator);

    var result = operators[operator](lvalue,rvalue);

    if( result ) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }

});


// HSCROLL
// hoizontal scrollability
// <ul class="inlineList hscroll">
// <li> ... </li>
// </ul>
$.fn.hscroll = function(){
	return this.each(function(){
		var $first = $(this).find(' > li:first');
		var qty = $(this).find(' > li').length;
		var h = $first.height();
		var w = $first.width();
		var rows = $(this).data('rows') || 1;
		
		$(this).wrap('<div class="hscroll-wrap" />');		
		$(this).css({width: (w * Math.ceil(qty / rows))});
	});
};

// TABS
// super-ez tabs
// <ul class="tabs">
// <li data-show="thing-1" class="selected">Thing One</li>
// <li data-show="thing-2">Thing Two</li>
// </ul>
// <div id="thing-1">...</div>
// <div id="thing-2">...</div>
$.fn.tabs = function(){
	function show_tab($ul, $li){
		$($ul.data('tab-selectors')).hide();
		$('#'+$li.data('show')).show();
		$ul.find('li').removeClass('selected');
		$li.addClass('selected');
	}
	return this.each(function(){
		var selectors = [];
		var $ul = $(this);
		$ul.find('li').each(function(){
			selectors.push('#'+$(this).data('show'));
		});
		$ul.data('tab-selectors', selectors.join(','));
		$ul.delegate('li', 'click', function(){
			show_tab($ul, $(this));
		});
		show_tab($ul, $ul.find('li.selected:first'));
	});	
};

// Nice to just make some simple Jquery magic available by default 
function defaultRenderCompleteActions(){
	$('.hscroll').hscroll(); 
	$('.tabs').tabs(); 
	$('body').css({backgroundColor: $('[class^=doc-stripe]:last').css('backgroundColor')}); // make last color extend to bottom
    $('body').delegate('a.fake-feature', 'click', function(e){
        e.preventDefault();
        alert("Thanks for clicking! This feature hasn't actually been built yet.");
    });
}
