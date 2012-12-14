/*
function initFEObject(){
	var bgwindow = chrome.extension.getBackgroundPage();
	window.bookFE = new scrapBookFrontEnd({
			placeholder:'messages',folderPlaceHolder :  'foldermenu', sbookPlaceHolder : 'sbookmenu' ,  
			dbName:bgwindow.sbookInterface.sBookInterfaceData.dbName ,dbVersion:bgwindow.sbookInterface.sBookInterfaceData.dbVersion,
			dbSize:bgwindow.sbookInterface.sBookInterfaceData.dbSize 
		});
}*/
function init(){
	
	//TO DO Disable/Enable scrap button on URL check...
	s = /^chrome:\/\/[a-zA-Z0-9]*\/.*/;
	/*chrome.tabs.getSelected(null, function(tab) {
		if(tab.url.match(s)){
			$('#scrapbutton').unbind();
		}
	});*/
	$('#sbsavepagetext').empty();
	$('#sbsavepagetext').remove();
	$('#scrapbutton').each(function(){
		$(this).hover(
			function() { $(this).addClass('sb_ui-state-hover'); }, 
			function() { $(this).removeClass('sb_ui-state-hover'); }
			)
		}
    );

	var bgwindow = chrome.extension.getBackgroundPage();
	//Initialize the front end UI.
	window.bookFE = new scrapBookFrontEnd({
		placeholder:'messages',folderPlaceHolder :  'foldermenu', sbookPlaceHolder : 'sbookmenu' 
	});
	
	if(bgwindow.initCacheFlag == false){//Main folder cache...
		$('#sbmainmenu').append('<img id = "sbmenuload" src = "images/throbber.gif"></img>');
		bgwindow.cacheRedoAction('popupaction');
	}else{
		bookFE.renderFullBook(function(){
			console.log('Rendered all menus...');
				$('#sbtoolmenu').append('<div><img id="refreshBook" title="Refresh book" src="images/refresh-icon.png" class="image-refresh-book sb_ui-corner-all  sb_ui-state-default" onclick="refreshsbook()"></div>')	
				$('#refreshBook').hover(
					function() { 
						$(this).addClass('sb_ui-state-hover'); 
					}, 
					function() { 
						$(this).removeClass('sb_ui-state-hover'); 
					}
				);

			});
	}
	//TO DO: check for no data	
	
	
	
	chrome.windows.getCurrent(function setCurrWin(windowC){
		chrome.tabs.getSelected(windowC.id,function dummy(tabC){
			//Send messag to CS asking for the page name...
			var boxC = document.getElementById('PageName');
			boxC.value = tabC.title;
			chrome.tabs.sendRequest(tabC.id, {requestType:"getpageproperty", propName: "title"}, function(response){
				var CSTitle = response.data;
				if(CSTitle && CSTitle.toString().trim()!=''){
					console.log('Setting title from CS:'+CSTitle); 
					boxC.value  = CSTitle;
					chrome.tabs.sendRequest(tabC.id, {requestType:"getpageproperty", propName: "folderid"}, function(response){
						var fid = response.data;
						console.log("FOLDERID from CS: "+fid);
						if(fid!=null && fid!= undefined){
							//TO DO SET value in js Tree
							window.bookFE.openFolder(fid.toString());
						}
						else{
							window.bookFE.openFolder('-1');
						}
							
					})
				}else{
					console.log('Setting title:'+tabC.title);
					boxC.value = tabC.title;
				}
			});
			
		});
	
	});

}
//Called from BG WW.
function initCompleted(){
	$('#sbmainmenu').empty();
	bookFE.renderFullBook(function(){
		console.log('Rendered all menus...');
			$('#sbtoolmenu').append('<div><img id="refreshBook" title="Refresh book" src="images/refresh-icon.png" class="image-refresh-book sb_ui-corner-all  sb_ui-state-default" onclick="refreshsbook()"></div>')	
			$('#refreshBook').hover(
				function() { 
					$(this).addClass('sb_ui-state-hover'); 
				}, 
				function() { 
					$(this).removeClass('sb_ui-state-hover'); 
				}
			);

		});
}
/*Called from BG page... After content script has saved some data*/
function scrappedpage(params){
	var par = $('#sbmainmenu li[rel="folder"][id='+params.folderid+']');
	//create the node. TO DO: Need to wait for seeing if node is loaded... 
	$("#sbmainmenu").jstree("create_node",  par , 0 , new jtp({nickname: params.title , pageid: params.pageid}).p , function(){

		$('#sbmainmenu').find('li[rel="page"][id='+params.pageid+']>a').bind('click', function(){ 
			//Bind the  handlers
			if($(this).attr('pid')){
				window.selectedPage($(this).attr('pid'));
			}
			
		})
		console.log('Scrapped a page. Should appear in tree');
		window.sbnotification = webkitNotifications.createNotification(
				  'images/scrap48.png',  
				  'Scrapbook',  
				  'Page scrapped'  // notification body text
		);
		window.sbnotification.show();
		setTimeout('window.sbnotification.cancel()',3000);
		
	} , true );
	//Open the node
	$("#sbmainmenu").jstree('open_node' ,par , false , false);
	
	$('#sbsavepagetext').empty();
	//$('#sbsavepagetext').remove();
}

/*called from context menu to delete pages*/
deletePages = function(params){
	deletePagesDB(params, function(retParams){

		var bgwindow = chrome.extension.getBackgroundPage();
		var popup = chrome.extension.getViews({type:'popup'})[0];
		
		//TO DO: Move to WW.
		bgwindow.redoCache(function(){
			console.log('PageID: '+retParams.pageids+' deleted, cache is redone.');
			if(popup){
			//Fix the tree...	
			$("#sbmainmenu").jstree("delete_node",  params.obj );
			//Keep the parent open...	
			var parent = $(params.obj).closest('li[rel="folder"]')
			$("#sbmainmenu").jstree('open_node' ,parent , false , false);	
			window.sbnotification = webkitNotifications.createNotification(
				  'images/scrap48.png',  
				  'Scrapbook',  
				  'Page deleted'  // notification body text
			);
			window.sbnotification.show();
			setTimeout('window.sbnotification.cancel()',3000)
			}
		})

		},function(error){
			
			window.sbnotification = webkitNotifications.createNotification(
				  'images/scrap48.png',  
				  'Scrapbook',  
				  'Error while deleting pages: '+error.message  // notification body text
			);
			window.sbnotification.show();
			setTimeout('window.sbnotification.cancel()',3000)
		
	});
}
