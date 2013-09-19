/**
 * Content script notes:
 * 
 * 
 * */

window.topID = 0;//This will be the ID of all the DOM nodes created in 1 request

//Details for a specfic page
window.pageProp ={ 
	isnew : true, 
	pageid : null, 
	title : null,
	folderName : null,
	folderid : null,
	url : null
}


//Event listener for recieving annotation requests from Extension
//acts as client of the command pattern
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
	
	/**The call back function needed for async actions......*/
		this.callback = function(params){
			console.log(params.code);
			console.log('Got a success message... '+params.message);

			sendResponse(params);// ll this work?
		}
		this.errorcallback = function(params){
			console.log(params.returnCode);
			console.log('An error occured...'+params.message+'::'+params.code+'::'+params.message);
			sendResponse(params);// ll this work?
		}
	   try{
			if(request.requestType == 'setpageproperty'){
				console.log('Setting page property...'+request.propName+' :: '+ request.propValue);
				window.pageProp[request.propName] = request.propValue;
			}
			else if(request.requestType == 'getpageproperty'){
				console.log('getting page prop: '+window.pageProp[request.propName]  );
				sendResponse({ status :'OK',message :'Sending property', code: 510, data: window.pageProp[request.propName]  });
				
			}
			else if(request.requestType == 'scrap'){
				//Save is a little complicated. the idea is that the saving will be 
				//of many rows will probably have to entail removing all previous annotations
				// and adding in just new ones...
				
				
				var m = /http:\/\/.*|file:\/\/.*|https:\/\/.*/	
				//URL is the only problematic candidate as the title and folder ID are ok..
				console.log(request.reqParams.url);
				var ext_url = request.reqParams.url;
				var cs_url = window.pageProp.url;//
				if(!m.test(ext_url)){
					
					if(!m.test(cs_url)){
						//Raise exception 
						console.log({ status :'BAD',message :'Inconsistent url schemes', code: 192 })
					}else{
						window.pageProp.url = cs_url;
					}
				}else{
					window.pageProp.url = ext_url;
				}
				//Save some properties of this page...
				window.pageProp.folderid = request.reqParams.folderid;
				window.pageProp.folderName = request.reqParams.folderName;
				window.pageProp.pageid = request.reqParams.pageid;
				window.pageProp.title = request.reqParams.title;
				//renderUI();
				//send some data back to save...
				var retParams = request.reqParams;
				retParams.data = null;
				retParams.notes = null;
				sendResponse({ status :'WAIT',message :'Scrapping page..', code: 191 });
				//retparams need to send all the marked rows back
				retParams.requestType = 'scrappedpage';
				
				var docSaver = new DocumentSaver()
				docSaver.processDocument(document, function(doccontent){
				  try{
						retParams.data = new XMLSerializer().serializeToString(doccontent);
						retParams.status = 'OK';
						retParams.message = 'Page Serialized to single file';
						retParams.code = 551;
					}catch(err){
						retParams.status = 'BAD';
						retParams.message = err.message;
						retParams.code = 555;
						retParams.data = null;
					}
					console.log(retParams);
					chrome.runtime.sendMessage(retParams);	
				});
				//processDocument(retParams);

				//decrementWait();
				
				
				
				
			}
			
		}catch(err){
		  sendResponse({ status :'BAD',message :err.message, code: 999 });
		}
		console.log('Do you see it?');//Ok now mark up this text 
     
      
    
  });
