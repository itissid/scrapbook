/**This file will contain interfaces to store data on DB
 * Would probably need to move heavy database operations to workers... :|
 * Especially the ones where the entire scrapbook is rendered...
 * **/

//var globalWindow = chrome.extension.getBackgroundPage();

/**Clean up of code: need to just pass 2 standard call backs i.e. Success and error callback. 
 * I have given different signatures to different functions, which I need to clean up.
 * */
function saveNewPageDB(params, callback, errorcallback){
	//db = openDatabase('dummy','1.0','dummy','5*1024*1024',null);
	var globalWindow = chrome.extension.getBackgroundPage();
	var wrapperdbObj =  new wrapperDBObj(globalWindow.sbookInterface.sBookInterfaceData);
	var url = protectInjection(params.url);
	var nick = protectInjection(params.title);
	var folderID = protectInjection(params.folderid);
	//console.log('In save page data:'+params.data)
	//console.log('In save notes data:'+params.data)
	var c2 =0;
		
	var notes = params.notes;
	var annotations = params.annotations;
	
	if(notes==null || notes == undefined){
		notes= null;
		c2 = 0
	}else{
		for(var i in notes)
			c2++;
	}
		
	var count =0;
	var recid;
	queries = new Array();
	successCallBacks =  new Array();
	
	var newRecordCallback = function(data){
		console.log('got insert iD:'+data.insertId);
		recid = data.insertId;	
		//Note the queries depend on inserted ID...
		queries.push('insert into sbpage(data, pageid) values(\''+protectInjection(params.data)+'\', \''+recid+'\' )');
		successCallBacks.push(finalcallback);
		if(notes!=null || notes != undefined){
			for(var i in notes){
				queries.push("insert into sbnotes(  note , type , timestamp , left , top , zindex , width, height, pageid )  VALUES ('"+protectInjection(notes[i].text) +"','"+protectInjection(notes[i].type) +"','"+ protectInjection(notes[i].timestamp) +"','"+ protectInjection(notes[i].left) +"','"+ protectInjection(notes[i].top) +"','"+ protectInjection(notes[i].zIndex)+"','"+ protectInjection(notes[i].width)+"','"+ protectInjection(notes[i].height)+"' , '"+recid+"')");
				successCallBacks.push(finalcallback);
			}
		}
		//Dont execute the transaction again...
	}
	
	var finalcallback = function(data){
		count++;
		if(count == c2+1){//Patched Logic for just inserting pages as bookmarks. No data.
		
			if(c2 > 0){
				console.log('Inserted rec#:'+recid);
				callback({status:'OK',message:'Saved page with '+c2+' notes', pageid:recid});
			}else{
				console.log('Inserted rec#:'+recid);
				callback({status:'OK',message:'Page saved', pageid:recid});
			}
		
		}
	}
	var failureCallBack = function(e){
		errorcallback(e);
	}
	
	
	successCallBacks.push(newRecordCallback);
	queries.push(
	'insert into sbmain(url,nickname,folderid)  values(\''+url+'\',\''+nick+'\',\''+ folderID +'\' )'
	)
	
	
	//console.log("In save page: Queries:"+queries);
	doDMLTransactions(new wrapperDBObj(globalWindow.sbookInterface.sBookInterfaceData), queries, null, successCallBacks, failureCallBack,null);
	
	//here is tempelate to save the data
}	
function deletePagesDB(params,callback,failurecallback){
	var pageids = params.pageids;
	var queries = [];
	var successCallBacks =[];
	var globalWindow = chrome.extension.getBackgroundPage();
	
	var ct = 0;
	var successcallback = function(data){
		ct++;
		console.log('Deleted ct: '+ct)
		if(ct == l){
			callback({status:'OK',message:'Pages Deleted', pageids:pageids})
		}
	}
	var failureCallBack = function(e){
		console.log('Error'+e.message);
		failurecallback({status:'BAD',message:e.message})
		
	}
	
	pageids.forEach(function(pageid){
		queries.push('delete from sbmain where pageid=\''+protectInjection(pageid)+'\'');
		successCallBacks.push(successcallback);
	})
	var l = queries.length;
	doDMLTransactions(new wrapperDBObj(globalWindow.sbookInterface.sBookInterfaceData), queries, null, successCallBacks, failureCallBack,null);
	
	
}
/*Will be recursive DFS deletion...*/
function deleteFolderDB(params, callback, failureCallback ){
	//Need to get all sub folder and delete them too. 
	var folderid = params.folderid;
	var globalWindow = chrome.extension.getBackgroundPage();
	
	function recurse(data){
		if(data.rows.length<1){
			//Just delete the folder
			stmt = ['delete from sbfolder where folderid='+folderid];

			function deleteLeaf(data){
				console.log('Deleted child fid:'+folderid);
				if(!params.recurse || params.recurse !='Y'){
					callback({status: 'OK' , message: 'Deleted all folders' })
				}
				
			}
			doDMLTransactions(new wrapperDBObj(globalWindow.sbookInterface.sBookInterfaceData), stmt, null, [deleteLeaf], failureCallback,null);
			
		}else{
			for(i =0 ; i < data.rows.length; i++ ){
				deleteFolderDB({folderid: data.rows.item(i).folderid , recurse :'Y'}, callback, failureCallback )
			}//
			//After deleting all the child nodes, delete the parent.
			stmt = ['delete from sbfolder where folderid='+folderid];
			function deleteParent(data){
				console.log('Deleted parent fid:'+folderid);
				if(!params.recurse || params.recurse !='Y'){
					callback({status: 'OK' , message: 'Deleted all folders' })
				}
				
			}
			doDMLTransactions(new wrapperDBObj(globalWindow.sbookInterface.sBookInterfaceData), stmt, null, [deleteParent], failureCallback,null);
		}
	}
	//Who were the parents...
	stmt = ['select folderid from sbfolder where parentid ='+folderid];
	doDMLTransactions(new wrapperDBObj(globalWindow.sbookInterface.sBookInterfaceData), stmt, null, [recurse], failureCallback,null);
}


function isOldPageInDB(params,callback,failurecallback){
	
	var nick = protectInjection(params.title);
	var folderID = protectInjection(params.folderid);
	var queries=[
	'select * from sbmain where nickname = \''+nick+'\' and folderid = \''+folderID+'\'' //is there the same nickname 
	]
	
	checkPresence = function(data){
		if(!data.rows || data.rows.length <1){
			callback({status:'OK', message: 'New page request', code:1 });
		}else{
			callback({status:'OK', message:'Page exists.',code:0});
		}
		
	}
	failureCallBack = function(e){
		failurecallback(e);
	}
	var globalWindow = chrome.extension.getBackgroundPage();
	doDMLTransactions(new wrapperDBObj(globalWindow.sbookInterface.sBookInterfaceData), queries, null, [checkPresence], failureCallBack, null);
	
}

/*Overwrite the records of that page.
 * Mainly done to replace notes and teh page content.
 * Deletion is too expensive.
 * */

function overwritePageDB(params,callback, errorcallback){
	var globalWindow = chrome.extension.getBackgroundPage();
	var wrapperdbObj =  new wrapperDBObj(globalWindow.sbookInterface.sBookInterfaceData);
	var url = protectInjection(params.url);
	var nick = protectInjection(params.title);
	var folderID = protectInjection(params.folderid);
	var data_t = protectInjection(params.data);
	var arr = params.data;
	var count =0;
	var pageid = params.pageid;
	var c2 =0;
		
	var notes = params.notes;
	var queries  =[];
	var callbacks = [];
	
	var grabPageId = function(data){
		console.log('Got page id:'+ data.rows.item(0).pageid)
		pageid = data.rows.item(0).pageid;
		
		['delete from sbnotes where pageid= \''+pageid+'\' ',
		//'delete from sbannotation where pageid= \''+pageid+'\' ',
		'update sbmain set url= \''+url+'\' where pageid=\''+pageid+'\'',
		'update sbpage set data=\''+data_t+'\' where pageid=\''+pageid+'\''].forEach(function(i){
			queries.push(i)
		});
		callbacks.push(deletedRecord);
		//callbacks.push(deletedRecord);
		callbacks.push(finalcallback);
		callbacks.push(finalcallback);
		if(notes != null && notes != undefined){
			for(var i in notes){
				queries.push("insert into sbnotes(  note , type , timestamp , left , top , zindex , width, height, pageid )  VALUES ('"+protectInjection(notes[i].text) +"','"+protectInjection(notes[i].type) +"','"+ protectInjection(notes[i].timestamp) +"','"+ protectInjection(notes[i].left) +"','"+ protectInjection(notes[i].top) +"','"+ protectInjection(notes[i].zIndex)+"','"+ protectInjection(notes[i].width)+"','"+ protectInjection(notes[i].height)+"' ,'"+pageid+"')");
				callbacks.push(finalcallback);
				c2++;
			}
		}
	}
	
	var deletedRecord = function(data){
		if(data.rowsAffected >= 1){
			console.log('Deleted data record...');
			//saveNewPageDB(params, callback, errorcallback);
		}
	}
	 
	var finalcallback = function(data){
		count++;
		
		if(count == c2+2){//Patched Logic for just inserting pages as bookmarks. No data.
		
			if(c2 > 0)
				callback({status:'OK',message:'Saved page with '+c2+' notes', pageid:pageid});
			
			else
				callback({status:'OK',message:'Page saved', pageid:pageid});
		
		}else{
			console.log('Updated '+data.rowsAffected+' records.')
		}
	}
	var failureCallBack = function(e){
		errorcallback(e);
	}
	
	
	queries.push(
	'select pageid from sbmain where nickname = \''+nick+'\' and folderid = \''+folderID+'\' ');
	
	callbacks.push(grabPageId);
	
	
	try{
	doDMLTransactions(new wrapperDBObj(globalWindow.sbookInterface.sBookInterfaceData), queries, null, callbacks, failureCallBack, null);
	}catch(error){
		console.log(error.message);
		throw(error);
	}
}

function getFoldersDB(params, successcallback, errorcallback){
		
		var wrapperdbObj = null;
		if(!params ||  !params.workerdbobj){
			var globalWindow = chrome.extension.getBackgroundPage();
			wrapperdbObj =  new wrapperDBObj(globalWindow.sbookInterface.sBookInterfaceData);
		}
		else
			wrapperdbObj = new wrapperDBObj(params.workerdbobj.sBookInterfaceData);
		//wrapperObj, queries,params, successCallbacks, failureCallback,refs
		
		var successCallBack = function(data){
			successcallback(data);
		}
		
		var failureCallBack = function(e){
			errorcallback(e);
		}
		
		var stmt = ['select foldername as foldername,folderid as folderid,level as level,parentid as parentid from sbfolder'];
		
		doDMLTransactions(wrapperdbObj, stmt, null, [successCallBack],  failureCallBack ,null);
}
function getPagesDB(params, successcallback, errorcallback){
		if(!params ||  !params.workerdbobj){
			var globalWindow = chrome.extension.getBackgroundPage();
			wrapperdbObj =  new wrapperDBObj(globalWindow.sbookInterface.sBookInterfaceData);
		}
		else
			wrapperdbObj = new wrapperDBObj(params.workerdbobj.sBookInterfaceData);
			
		var successCallBack = function(data){
			successcallback(data);
		}
		
		var failureCallBack = function(e){
			errorcallback(e);
			
		}
		
		var stmt = ['select sbmain.folderid as folderid, sbmain.pageid as pageid, sbmain.nickname as nickname from sbmain inner join sbfolder on sbmain.folderid= sbfolder.folderid'];
		
		doDMLTransactions(wrapperdbObj, stmt, null, [successCallBack], failureCallBack , null);
	
}

function getDataForOptionsPageDB(successcallback, errorcallback){
		var globalWindow = chrome.extension.getBackgroundPage();
		var wrapperdbObj =  new wrapperDBObj(globalWindow.sbookInterface.sBookInterfaceData);
		
		var successCallBack = function(data){
			successcallback(data);
		}
		
		var failureCallBack = function(e){
			errorcallback(e);
			
		}
		
		var stmt = ['select sbmain.url as url, sbfolder.folderName as foldername, sbmain.pageid as pageid, sbmain.nickname as nickname from sbmain inner join sbfolder on sbmain.folderid= sbfolder.folderid order by sbmain.nickname'];
		
		doDMLTransactions(wrapperdbObj, stmt, null, [successCallBack], failureCallBack , null);
	
}

/***/
function getPageDataDB(params, callback, faliurecallback){
	var globalWindow = chrome.extension.getBackgroundPage();
	
	var wrapperdbObj =  new wrapperDBObj(globalWindow.sbookInterface.sBookInterfaceData);
	//var stmt = [ 'select sbmain.url as url ,sbpage.data as data , sbpage.annotationtype as annotationtype from sbpage inner join sbmain on sbpage.pageid = sbmain.pageid where sbmain.pageid =\''+ params.pageid+'\''];
	var stmt =[];
	stmt.push('select * from sbmain left outer join sbpage on sbmain.pageid = sbpage.pageid where sbmain.pageid=\''+ params.pageid+'\'');//retrieve the page atleast so outer join..
	stmt.push('select * from sbnotes inner join sbmain on sbmain.pageid = sbnotes.pageid where sbnotes.pageid=\''+ params.pageid+'\'');
	var callbacks = [];
	var pageData = null;
	var notesData = null;
	//TO DO Get the notes data also 
	var firstCallBack = function(pagedata){
		pageData = pagedata;
	}
	var secondCallback = function(notesdata){
		notesData = notesdata;
		callback(pageData, notesData);
	}
	callbacks.push(firstCallBack);
	callbacks.push(secondCallback);
	
	var failureCallBack = function(e){
		faliurecallback(e);
		return;
	}
	
		
	doDMLTransactions(wrapperdbObj, stmt, null, callbacks,  failureCallBack ,null);
	
}

function checkAndAddFolderDB(params, callback, failurecallback){
	var folderName = protectInjection(params.folderName);
	var parentFolderName = protectInjection(params.parentFolder);
	var parentID = protectInjection(params.parentFolderId);
	var level = protectInjection(params.level);
	var globalWindow = chrome.extension.getBackgroundPage();
	var wrapperdbObj =  new wrapperDBObj(globalWindow.sbookInterface.sBookInterfaceData);
	stmt = ['select * from sbfolder where foldername =\''+folderName+'\' and parentid=\''+parentID+'\''];
	var failureCallBack = function(e){
		bookFE.errorcallback(e);
		return;
	}
	var callbackfinal = function(data){
		var recid = data.insertId;	
		callback({status:'OK', message:'Added folder '+folderName+' to '+parentFolderName, code: 0 , folderid: recid});
	
	}
	var callbackexists = function(data){
		if(data.rows.length<1){
			stmt = ['insert into sbfolder values(( select max(folderid)+1 from sbfolder),\''+folderName+'\' ,\''+level+'\',  \''+parentID+'\' )']
			doDMLTransactions(wrapperdbObj, stmt, null, [callbackfinal],  failureCallBack ,null);
		}else{
			bookFE.callback({status:'OK', message: 'Folder '+ data.rows.item(0).foldername+' already exists.', code:1 });
		}
	}
	
	doDMLTransactions(wrapperdbObj, stmt, null, [callbackexists],  failureCallBack ,null);
	
	
}

/**To DO need to initialize scrapbook code properly.*/
function createTables(){
	//wrapperobj.dbObj.transaction(function(t){
	queries =  [
	'create table sbfolder( folderid integer primary key asc, foldername varchar(50), level integer not null, parentid integer not null default -1, constraint ck1 unique(foldername, parentid) )', 
	'create table sbmain (url varchar(500) , nickname varchar(15), pageid Integer primary key asc,  folderid integer not null default -1,constraint ck2 unique(nickname, folderid))',
	'create table sbpage(pageid integer not null , data blob, foreign key (pageID) references sbmain(pageID) ) ',
	'create table sbannotation(pageid integer not null , annotation varchar(10), foreign key (pageID) references sbmain(pageID) ) ',
	'create table sbnotes(pageid integer not null,  note TEXT, type TEXT, timestamp REAL, left TEXT, top TEXT, zindex REAL, width TEXT, height TEXT, foreign key (pageID) references sbmain(pageID))',
	'CREATE TRIGGER delete_page BEFORE DELETE ON sbmain FOR EACH ROW BEGIN DELETE from sbpage WHERE pageid = OLD.pageid; END;',//To delete all data when page is deleted
	'CREATE TRIGGER delete_annot BEFORE DELETE ON sbmain FOR EACH ROW BEGIN DELETE from sbannotation WHERE pageid = OLD.pageid; END;',//To delete all data when page is deleted
	'CREATE TRIGGER delete_notes BEFORE DELETE ON sbmain FOR EACH ROW BEGIN DELETE from sbnotes WHERE pageid = OLD.pageid; END;',//To delete all data when page is deleted
	'CREATE TRIGGER delete_folder2 BEFORE DELETE ON sbfolder FOR EACH ROW BEGIN DELETE FROM sbmain WHERE folderid = OLD.folderid; END',//to delete all pages when folder is deleted
	'insert into sbfolder values(-1, \'root\',0,-1)'
	]
	
	var successCallback = function(data){
		console.log('Done with statements...');
	}
	var failureCallBack = function(e){
		console.log('DDL stmt error from system::'+e.message);
	}
	var globalWindow = chrome.extension.getBackgroundPage();
	doDDLTransactions(new wrapperDBObj(globalWindow.sbookInterface.sBookInterfaceData), queries, successCallback, failureCallBack);

}



//below function will do the basic transactions that dont require post processing of data like create, insert, delete etc...
//The queries are executed sequentially. So the function is useful for sequential execution of dependent queries.
function doDDLTransactions(wrapperObj, queries, successCallback, failureCallback){
	
	wrapperObj.dbObj.transaction(function(t){
		var data = null;
		function multiSql (t, queries, successCallback, failureCallback){ 
			function next(t,data) { 
				successCallback({message: 'Executing stmt'+queries[queries.length]})
				t.executeSql(queries.shift(), null, queries.length ? next : successCallback, function(t,e){failureCallback(e)}); 
			} 
			next(t,data); 
		} 
		multiSql(t,queries,successCallback, failureCallback);
	})
}

function protectInjection(s){
	if(s!=null || s!=undefined)
		return s.toString().trim().replace(/[\']/g,"''")
	else
		return 'null';
}
/**The successcallbacks can be bound to objects that may contain them. mkaing sure that this references(if any) in closures are processed in the right way.
 * This function will execute multiple SQL queries in a sequential fashion. You may define the call backs to process data after each callback.
 * refs =[scope1,scope2....] If the function is free of scope just put null.
 * **/
 
function doDMLTransactions(wrapperObj, queries,params, successCallbacks, failureCallback,refs){
	
	if(queries.length != successCallbacks.length){
		failureCallback(new Error({message:'Expected equal callback as the number of queries....',code: 299}));
		return;
	}

	
	wrapperObj.dbObj.transaction(function(t){
		var data = 'NULL';
		
		function multiSql (t, queries, successCallbacks, failureCallback,refs){
			 //Noe the call is not recursive as next returns nothing.. Even though it looks like it
			function next(t,data) {
				//Process dome data
				var ret = null;
				if(data != 'NULL'){//first time skip
					if(!refs){
						successCallbacks.shift()(data)
					}
					else if(refs && !refs.shift){//not an array just a refernce
						successCallbacks.shift().call(refs,data)
					}else if(refs && refs.shift){
						var ref = refs.shift();
						
						if(ref==null || ref == undefined )
							ret = successCallbacks.shift()(data);
						else 
							ret = successCallbacks.shift().call(ref, data);
					}
				}
				if(data == 'NULL' || !ret || ret.status =='OK'){
					if(queries.length>0){
						//console.log('executing query::'+queries[0]);
						t.executeSql(queries.shift(), params, queries.length+1? next : function(){}, function(t,e){failureCallback(e)}); 
					}
					
				}else
					failureCallback(ret);//end the execution. Abort rest of the quries in the Queue
			} 
			next(t,data); 
		} 
		multiSql(t,queries,successCallbacks, failureCallback,refs);
	},failureCallback)
}


/**The wrapper object that is used to store the name and the credentials of the DB in use
 * 
 * */

function wrapperDBObj(params){
	this.dbName = params.dbName;
	this.dispName = params.dbName;
	this.dbVersion = params.dbVersion;
	this.dbSize = params.dbSize;
	this.dbObj =  function(){
		try{// I wont need versioning. The new dbname name will be made unique by a unique code generated by 
			//the persons email ID.
			if(isNaN(this.dbSize))
				this.dbSize = 10*1024*1024;//Give it atleast 10 MB of space...
			//this.dbObj = 
			return openDatabase(this.dbName, this.dbVersion, this.dispName, this.dbSize)
		}catch(e){
			alert('Problem Opening DB, will return null. Sys Error Msg::'+e.message)
			return null;
		}
	}.call()
	//This should be called to get the object
	this.getRawDBObj = function(){
		return this.dbObj
	}
	
	//cleanup	?
	this.closeDBObj = function(){
	}
}
