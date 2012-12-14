/**
 * This will be a simple middle ware to communicate to the data base and the scrapbookPopup page.
 * Its main job is to render the popup's and the folder structure of the book.
 * Improvements: Clean up code by templating using Mustache...
 * */
// I must seperate datalogic  from presentation logic...This class does the rendering of non static elements of the Sbook plugin...

function scrapBookFrontEnd(params){
	
	this.messagePlaceholder = params.placeholder//A div element id display messages from call backs
	this.folderPlaceHolder = params.folderPlaceHolder||'foldermenu';
	this.sbookPlaceHolder = params.sbookPlaceHolder||'sbookmenu';
	this.selectedFolderID = -1;//By default all folder/pages added to 
	this.searchFlag = 0;
	/**all messages displayed **/
	this.callback = function(response){
		 var pl = '#'+	this.messagePlaceholder;//
		 $(pl).empty();
		 $(pl).append('<div class = "sb_ui-state-highlight sb_ui-corner-all">'+
								'<p><span class="sb_ui-icon sb_ui-icon-info" style="float: left; margin-right: .3em; margin-left:0.4 em;">'+
								'</span> <strong>OK: </strong></p></div>');
		 $(pl+'>div>p>strong').append(document.createTextNode(response.message))
		 $(pl).show();
		 $(pl).hide(5000);
	}
	
	/**Remember to show error code as well. Dont hide error message*/
	this.errorcallback = function(response){
		 var pl = '#'+	this.messagePlaceholder;//
		 $(pl).empty();
		 $(pl).append('<div class = "sb_ui-state-error sb_ui-corner-al">'+
								'<p><span class="sb_ui-icon sb_ui-icon-alert" style="float: left; margin-right: .3em;">'+
								'</span> <strong>Error: </strong></p></div>');
		 $(pl+'>div>p>strong').append(document.createTextNode(response.message+' :: '+response.code))
		 $(pl).show();
	}

	/*Open a folder programatically in jstree*/
	this.openFolder = function(fid){
		if(fid==null || fid== undefined)
			return;
		var folder = $('#sbmainmenu').find('li[rel="folder"][id='+fid+']');
		var self  = this;
		$('#sbmainmenu').jstree('open_node', folder, function(){
				console.log('opened folder'+fid);
				//Find the closest paret and open it recusively
				self.openFolder($('#sbmainmenu').find('li[rel="folder"][id='+fid+']').closest('li:not(#'+fid+')').attr('id'))
		}, false);
		
	}


/**
 * Render the full book.... ['Folderid','pageid','Page Name']
 * */
	this.renderFullBook = function(callback){
		var bgwindow = chrome.extension.getBackgroundPage();
		//TODO: Wait for cache to load...
		//Always have cache...
		var callback = callback;
		var self = this;
		$("#sbmainmenu").jstree('destroy');
		$("#sbmainmenu").bind('loaded.jstree', function(e,data){
						$(e.currentTarget).find('a').each(function(){
							$(this).bind('click', function(){ 
								//Rebind the lost handlers
								if($(this).attr('pid')){
									window.selectedPage($(this).attr('pid'));
								}
								
							});   
						});
						bgwindow.isProcessed = true;
						console.log('calling back afetr rendering...')
						
						 $("#sbsearch").keydown(function (event){
							
							setTimeout('$("#sbmainmenu").jstree("search", $("#sbsearch").val())',1000);

						});
						callback();

				}).jstree({ 
					"json_data" : {
						
						"data" : bgwindow.JSONjtreeDataCache
					},
				
					"themes":{
					   "theme":"apple",
					   "dots":true
					},
					"ui":{
					 "select_limit": 1
					},
					"types" : {
						"types" : {
							"select_node" : true,
							// The File type
							"page" : {
								// I want this type to have no children (so only leaf nodes)
								// In my case - those are pages
								"valid_children" :  [ "page" ],
								//OVERRIDE the theme icons
								"icon" : {
									"image" : "images/file.png"
								},
							
							},
							// The `folder` type
							"folder" : {
								"valid_children" : [ "folder", "page" ],
								"icon" : {
									"image" : "images/folder.png"
								}
							},
							"drive" : {
								// Root nodes...
								"valid_children" : [ "page", "folder" ],
								"icon" : {
									"image" : "images/folder.png"
								},
								// those options prevent the functions with the same name to be used on the `drive` type nodes
								// internally the `before` event is used
								"start_drag" : false,
								"move_node" : false,
								"delete_node" : false,
								"remove" : false
							}

						}
					},
					"search":{
							"case_insensitive": true
							
					},
					"contextmenu":{
						//"select_node": true,
						"show_at_node": false,
						"items": function(node){

								if($(node).attr('type')=='folder'){
									if($(node).attr('id')!=-1){
										return({
												"add":{
													"label"				: "Add a folder",
													"action"			: function (obj) { window.addFolder({ parentfoldername: $(obj[0]).children('a').text().trim(), parentid : $(obj[0]).attr('id'), parentlevel:  $(obj[0]).attr('level')}) },
													
													"_class"			: "class",	// class is applied to the item LI node
													"separator_before"	: false,	// Insert a separator before the item
													"separator_after"	: true,		// Insert a separator after the item
													// false or string - if does not contain `/` - used as classname
													"icon"				: false,
												
												},
												"scrap":{
													"label"				: "Scrap the page",
													"action"			: function (obj) { window.scrapPage({folderName: $(obj[0]).children('a').text().trim(), folderid: $(obj[0]).attr('id')}) },
													
													"_class"			: "class",	// class is applied to the item LI node
													"separator_before"	: true,	// Insert a separator before the item
													"separator_after"	: false,		// Insert a separator after the item
													// false or string - if does not contain `/` - used as classname
													"icon"				: false,
												},
												"delete":{
													"label"				: "Delete the folder",
													"action"			: function (obj) { self.deleteFolder({folderid: $(obj[0]).attr('id')}) },
													
													"_class"			: "class",	// class is applied to the item LI node
													"separator_before"	: true,	// Insert a separator before the item
													"separator_after"	: false,		// Insert a separator after the item
													// false or string - if does not contain `/` - used as classname
													"icon"				: false,
												} 
										})
									}else{
										return({
												"add":{
													"label"				: "Add a folder",
													"action"			: function (obj) { window.addFolder({ parentfoldername: $(obj[0]).children('a').text().trim(), parentid : $(obj[0]).attr('id'), parentlevel:  $(obj[0]).attr('level')}) },
													
													"_class"			: "class",	// class is applied to the item LI node
													"separator_before"	: false,	// Insert a separator before the item
													"separator_after"	: true,		// Insert a separator after the item
													// false or string - if does not contain `/` - used as classname
													"icon"				: false,
												
												},
												"scrap":{
													"label"				: "Scrap the page",
													"action"			: function (obj) { window.scrapPage({folderName: $(obj[0]).children('a').text().trim(), folderid: $(obj[0]).attr('id')}) },
													
													"_class"			: "class",	// class is applied to the item LI node
													"separator_before"	: true,	// Insert a separator before the item
													"separator_after"	: false,		// Insert a separator after the item
													// false or string - if does not contain `/` - used as classname
													"icon"				: false,
												} 
												
										})
										
									}
								}else if($(node).attr('type')=='page'){
									return({
											"open":{
												"label"				: "Open",
												"action"			: function (obj) { window.selectedPage($(obj[0]).attr('id')) },
												
												"_class"			: "class",	// class is applied to the item LI node
												"separator_before"	: false,	// Insert a separator before the item
												"separator_after"	: true,		// Insert a separator after the item
												// false or string - if does not contain `/` - used as classname
												"icon"				: false,
											
											},
											"delete":{
												"label"				: "Delete",
												"action"			: function (obj) { console.log(obj); deletePages({pageids: [parseInt(($(obj[0]).attr('id')))], obj:obj }); },
												
												"_class"			: "class",	// class is applied to the item LI node
												"separator_before"	: false,	// Insert a separator before the item
												"separator_after"	: true,		// Insert a separator after the item
												// false or string - if does not contain `/` - used as classname
												"icon"				: false,
											} 
											
									})
								}
							}
					
					
		
				   },
					"plugins" : [ "themes", "contextmenu", "json_data" ,"ui", "types" , "search"]
				}).bind('create.jstree', function(e,data){
						console.log('Created node...');
						console.log($(e.currentTarget).find('a'));

				})	//End of 	$("#sbmainmenu").jstree(...
		
	}
	this.deleteFolder = function(params){
		//TO DO: Warn the user...
		var self = this;
		jConfirm("Delete folder & subpages(this cant be undone)?", 'Confirmation Dialog', function(r) {
			if(r==true){
					deleteFolderDB({folderid: params.folderid},function(params){
					console.log('Deleted all folders...');
					var bgwindow = chrome.extension.getBackgroundPage();
					
					bgwindow.redoCache(function(){
						self.renderFullBook(function(){
							console.log('Cache redone full book renderd after folder delete...');
						})
					})
				},function(err){
					console.log(err.message);
				})
			}
			
		})
		
	}
	
}
//gather events and 
function searchText(){
}

