/*
 * This file is used to create the options page to 
 * render the options for scrapbook management.
 * 
 *  */
var saved_entries = [];

/*
 * event handler attached with onclick events of the page menu...
 * */
function selectedPage(event){
	console.log('Fetching page from SB...');
	//Steps: Selected a new page... Get its URL of the page by using its ID. Open the page
	//The page will send in the opentab message to the 
	
	var params={};
	params.pageid = event.data.pageID //sel[0].substring(1,sel[0].length).trim();
	var globalWindow = chrome.extension.getBackgroundPage();
	
	params.callback = function(data, notedata){//data from DB...
		
		var noteDataToRender = notedata.rows;
		
		if( data.rows.item(0).data )
			globalWindow.dataToRender = data.rows.item(0).data;
		
		
		var notesArr = new Array();
		for(i=0; noteDataToRender!=null && noteDataToRender!=undefined && i<noteDataToRender.length;i++){
			notesArr[i] = noteDataToRender.item(i)

		}
		globalWindow.noteDataToRender = notesArr;
		
		chrome.tabs.create({url: "newpage.html"}, function(tab){});
		
	
	}

	if(!window.bookFE){
		getPageDataDB(params,  window.bookFE);
	}else{
		getPageDataDB(params, window.bookFE);
	}
	
	
}

function checkboxClick() {
  row = this.parentElement.parentElement;

  if (this.checked) {
    $(row).addClass('sb_ui-state-highlight');
  } else {
    $(row).removeClass('sb_ui-state-highlight');
  }
}

// Expects:
//   r.id
//   r.title
//   r.url
function addRow(r) {
  if (!saved_entries.length) {
    $('#content #no-saved-pages').remove();
  }
 
  
  var tr = $(document.createElement('tr')).attr('id', 'tr-' + r.pageid);
  r.element = tr;
  saved_entries.push(r);
  setNewEntryVisibility(r);

  var td1 = $(document.createElement('td')).addClass('checkbox-cell').attr('text-align','left');
  var checkbox = $(document.createElement('input')).
    attr({id: 'pgid-' + r.pageid, type: 'checkbox'});
  checkbox.get(0).onclick = checkboxClick;
  td1.append(checkbox);
  tr.append(td1);
  r.checkbox = checkbox;

  //var div = $(document.createElement('div'));
  var td_name = $(document.createElement('td')).addClass('page_list_entry').attr('align', 'left');
  var td_url = $(document.createElement('td')).addClass('page_list_entry').attr('align', 'left');
  var td_foldername = $(document.createElement('td')).addClass('page_list_entry').attr('align', 'left');
  
  var link = $(document.createElement('a')).
	bind('click',{pageID:r.pageid, pageName:r.title},selectedPage).
    attr('href', '#').
    attr('title', r.title ? r.title : '(no title)').
    text(r.title ? truncateText(r.title) : '(no title)');
    
  var urlSpan = $(document.createElement('span')).
    addClass('page_list_url').
    attr('title',r.url).
    text(truncateText(r.url));
  
  var folder = $(document.createElement('span')).
    css('font','bold').
    attr('title',r.foldername).
    text(truncateText(r.foldername));  
    
  
  td_name.append(link);
  td_url.append(urlSpan);
  td_foldername.append(folder);
  tr.append(td_name).append(td_url).append(td_foldername);
  $('#content').append(tr);
}

function showNoPages() {
 
  var tr_th = $(document.createElement('tr'));
  var th_cu = $(document.createElement('th')).attr('align', 'left').
  text('Check/Uncheck');
  var th_name = $(document.createElement('th')).attr('align', 'left').
  text('Page Name');
  var th_url = $(document.createElement('th')).attr('align', 'left').
  text('URL');
  var th_folder = $(document.createElement('th')).attr('align', 'left').
  text('Folder');
  tr_th.append(th_cu).append(th_name).append(th_url).append(th_folder);
  
  $('#content').append(tr_th);
  $('#content').append('<tr id="no-saved-pages"><td>Checking DB for pages....</td></tr>');
}

function showPageList() {
  showNoPages();
  chrome.runtime.sendMessage({requestType: 'getSBPageList'},
    function(resp){
	var dat = resp.data;
	var emptyflag = true;	
      if (dat) {
		for(i in dat){
			emptyflag =false;
			addRow(dat[i]);
		}
      }if(emptyflag==true){
		  $('#content #no-saved-pages').remove();
		  $('#content').append('<tr id="no-saved-pages"><td>No pages in DB....</td></tr>');
	  }
      
     console.log(resp);
    });
}
//TO DO
function deletePages() {
  var checked = $('#content input[type="checkbox"]:checked');
  var ids = [];
  for (var i = 0; i < checked.length; i++) {
    ids.push(checked[i].id.replace(/^pgid-/,''));
  }
  if(ids.length>0){
	  chrome.runtime.sendMessage({requestType: 'deletePages', pageids: ids}, function(response){
		if (response.status =='OK' && response.pageids){
			console.log('Deleted pages from sbook');
			handlePagesDeleted(response);
		
		}else if(i!=0){
			console.err('Err while deleting pages');
		}
	  });
	}
}

function handlePageAdded(request) {
  addRow(request);
}

function handlePagesDeleted(request) {
  var ids = request.pageids;
  for (var i = 0; i < ids.length; i++) {
    for (var j = 0; j < saved_entries.length; j++) {
      if (saved_entries[j].pageid == ids[i]) {
        saved_entries[j].element.remove();
        saved_entries.splice(j, 1);
        break;
      }
    }
  }
   window.sbnotification = webkitNotifications.createNotification(
		  'images/scrap128.png',  
		  'Scrapbook',  
		  ids.length+' page(s) deleted.'  // notification body text
	);
	window.sbnotification.show();
	setTimeout('window.sbnotification.cancel()',3000)
  //if (!saved_entries.length) showNoPages();
}

function messageListener(request, sender, sendResponse) {
  switch (request.type) {
  case 'notifyPagesDeleted':
    handlePagesDeleted(request);
    break;
  case 'notifyPageAdded':
    handlePageAdded(request);
    break;
  }
}

// Select only visible entries here, so user will not delete
// entries that were not meant to be deleted.
function selectAll() {
  saved_entries.forEach(function (entry) {
    if (!entry.visible) return;
    var elem = entry.checkbox.get(0);
    elem.checked =  true;
    elem.onclick();
  });
}

function deselectAll() {
  saved_entries.forEach(function (entry) {
    var elem = entry.checkbox.get(0);
    elem.checked = false;
    elem.onclick();
  });
}

function showEntry(entry) {
  entry.element.removeClass('sb_ui-helper-hidden');
  entry.visible = true;
}

function hideEntry(entry) {
  entry.element.addClass('sb_ui-helper-hidden');
  entry.visible = false;
}

/*
 * Display or hide new entry depending on current value
 * in search text box.
 */
function setNewEntryVisibility(ent) {
  var val = $('#search').val().toLowerCase();
  if (val.length && (ent.title.toLowerCase().search(val) == -1))
    hideEntry(ent);
  else
    showEntry(ent);
}

/*
 * Called on search text boxes keyup event (twice?).
 * Should update visibility attributes on all entries.
 */
function searchChange() {
  deselectAll();
  var val = $('#search').val().toLowerCase();
  if (val.length) {
    saved_entries.forEach(function (ent) {
      if (ent.title.toLowerCase().search(val) == -1) {
        hideEntry(ent);
      }
      else {
        showEntry(ent);
      }
    });
  } else {
    saved_entries.forEach(showEntry);
  }
}

// Translate text on web page to user's language
function setupMessages() {
  translateInnerText('page-title', 'savedPages');
  translateInnerText('title', 'savedPages');
  translateInnerText('select-all-button', 'selectAll');
  translateInnerText('deselect-all-button', 'deselectAll');
  translateInnerText('delete-button', 'deletePages');
}

$(document).ready(function () {
  //setupMessages();
  $('button').attr('class','sb_ui-button sb_ui-widget sb_ui-state-default sb_ui-corner-all sb_ui-button-text-only')
  showPageList();
});

function truncateText(text){
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
chrome.runtime.onMessage.addListener(messageListener);
