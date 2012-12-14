handleDownloadFile = function(request, sendResponse) {
	try {
		var req = new XMLHttpRequest();
		req.open('GET', request.href, false);
		if (request.binary) req.overrideMimeType('text/plain; charset=x-user-defined');
		req.send();
	if (req.readyState == 4 && req.status == 200) {
	  request.contentType = req.getResponseHeader('Content-Type');
	  request.data = req.responseText;
	  request.status = 'OK';
	}
	else {
	  request.message = "Unexpected error";
	  request.status = 'BAD';
	}
  }
  catch (e) {
	console.error('Download error: ' + e.message);
	
	request.message = e.message;
	request.status = 'BAD';
  }
  sendResponse(request);
}	
/**
 * Caching for speed up. Need to move this operaion to web workers 
 */

function jtf(dat){
	this.f =  { 
				data:{ 
					title:truncateText(dat['foldername']),
					attr:{
						icon : "folder"
						
						//'class': 'jstree_clicked'
					}
				},
				attr: {id : dat['folderid'] , type:'folder', rel:"folder" , level :dat['level']},
				state: dat['state'] ?  dat['state']: "closed",
				children: []
			  }
	 
}

function jtp(dat){
	this.p =  { 
				data:{ 
					title:truncateText(dat['nickname']),
					attr:{
						'href': 'javascript:window.selectedPage('+dat['pageid']+')',
						"icon" : "file",
						"pid" : dat['pageid'] 
						//'class': 'jstree-clicked'
					}
				},
				attr: {id : dat['pageid'] , type: 'page', rel:"page" }
				
			  }
	 
}	

redoCache = function(callback){
	var pfid_fid = {};//Parentid_foldeid pairs...{p_id1:[fid1, fid2], pid2:[..]....}; //get the FID's for each l0_folder's id as the parent
	var f_table = {}//{fid1:{jtf object} , fid2:{...}} For the main JSON object//Append these to the children
	var fid_pageid = {};//{fid1:[pid0], pid1:{pagename: nickname, url:url}}}
	var page_table ={};//{pageid1:{jtp object} , pageid2:{...}} For the main JSON object//Append these to the children of each jtf
	
	function buildJSON(children, fid){
		var subfids = pfid_fid[fid];
		if(subfids){
			$.each(subfids, function(){
				buildJSON(f_table[this].f.children, this);
				children.push(f_table[this].f);
			})
		}
		
		var subpageids = fid_pageid[fid];
		if(subpageids){
			$.each(subpageids, function(){
				children.push(page_table[this].p);
			})
		}
	}
			
	getFoldersDB(null, function(data){
		var dat = data.rows;
		
		
		getPagesDB(null, function(data){
			var p_dat = data.rows;
			//process the folders
			for(var i =0; i<dat.length;i++){
				//NOTE TO SELF: Ignore root folder... for now
				if(dat.item(i)['folderid']!=-1){
						
					f_table[dat.item(i)['folderid']] = new jtf(dat.item(i));
						
					if(pfid_fid[dat.item(i)['parentid']] == undefined ){
					
						pfid_fid[dat.item(i)['parentid']] = [dat.item(i)['folderid']];// dat.item(i)['folderid'];
					
					}else{
					
						var lst = pfid_fid[dat.item(i)['parentid']];
						lst.push(dat.item(i)['folderid']); //dat.item(i)['folderid'];
					
					}
					
				}
				
			}
			for(var i =0; i<p_dat.length;i++){

				page_table[p_dat.item(i)['pageid']] = new jtp(p_dat.item(i));

				
				if(fid_pageid[p_dat.item(i)['folderid']]==undefined){
					fid_pageid[p_dat.item(i)['folderid']] = [p_dat.item(i)['pageid']];
				}else{
					var lst = fid_pageid[p_dat.item(i)['folderid']];
					lst.push(p_dat.item(i)['pageid']); //dat.item(i)['folderid'];
				}
				
			}
			//Root node...
			JSONjtreeDataCache ={
				data: 'root',
				attr: {id : -1 , type:'folder', rel:"folder" , level :-1},
				state: 'open',
				children :[]
			};
			buildJSON(JSONjtreeDataCache.children, -1);
			callback();
		})
	})
}
/**
* Saving the annotations... 
*/
saveAnnotationsOnPage = function(sendResponse, params){

	overwritePageDB(params, function(data){
		console.log(data);
		//Cache need not be changed, records have been updated only
		
		sendResponse({status:'OK', message: 'Saved Annotations to Database.'})	
		} ,function(error){
			console.log(error.message);
			sendResponse({status:'BAD', message: error.message})	
		
		})
}
truncateText = function(text){
	if(text && text.trim()!=''){
		
		if(text.length>30){
			var a = text.toString().substring(0,30);
			return a.concat('...')
		}else{
			return text;
		}
	}else{
		return text;
	}
}

