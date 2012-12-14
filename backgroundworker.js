importScripts ('sbstorage.js');
importScripts('common.js');
JSONjtreeDataCache =[];
SBookInterface =function(params){
	this.sBookInterfaceData ={
		dbName : params.dbName,
		dispName : params.dbName,
		dbSize : params.dbSize,
		dbVersion : params.dbVersion
	}
}
	
redoCache = function(callback){
	var pfid_fid = {};//Parentid_foldeid pairs...{p_id1:[fid1, fid2], pid2:[..]....}; //get the FID's for each l0_folder's id as the parent
	var f_table = {}//{fid1:{jtf object} , fid2:{...}} For the main JSON object//Append these to the children
	var fid_pageid = {};//{fid1:[pid0], pid1:{pagename: nickname, url:url}}}
	var page_table ={};//{pageid1:{jtp object} , pageid2:{...}} For the main JSON object//Append these to the children of each jtf
	var defaultParams =  {dbName:'DefaultSbook' ,dbVersion:1.0, dbSize:5000*1024*1024 };//Global name
	var sbookInterface = new SBookInterface(defaultParams);
		
	function buildJSON(children, fid){
		var subfids = pfid_fid[fid];
		if(subfids){
			subfids.forEach(function(i){
				buildJSON(f_table[i].f.children, i);
				children.push(f_table[i].f);
			})
			
		}
		
		var subpageids = fid_pageid[fid];
		
		if(subpageids){
			subpageids.forEach(function(i){
				children.push(page_table[i].p);
			})
		}
	}
			
	getFoldersDB({workerdbobj: sbookInterface},function(data){
		var dat = data.rows;
		
		
		getPagesDB({workerdbobj : sbookInterface}, function(data){
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
			callback(JSONjtreeDataCache);
		})
	})
}

onmessage = function (event) {
  var action = event.data.action;
  
  redoCache(function(JSONjtreeDataCache){
	//action for knowing what the request was...
	postMessage({data:JSONjtreeDataCache, action: action});  
  })
};
