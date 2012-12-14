(function($)
{
	$.fn.blink = function(options)
	{
		var defaults = { delay:500 };
		var options = $.extend(defaults, options);
		
		return this.each(function()
		{
			var obj = $(this);
			setInterval(function()
			{
				if($(obj).attr("visibility") == "visible")
				{
					$(obj).attr('visibility','hidden');
					$(obj).fadeIn('slow');
				}
				else
				{
					$(obj).attr('visibility','visible');
					$(obj).fadeOut('slow');
				}
			}, options.delay);
		});
	}
}(jQuery))
