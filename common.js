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
