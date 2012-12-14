
/**UI for the new note**/
function Note()
{
    var self = this;
	this.doc = document;//$('#sbinnerframe')[0].contentDocument;
    var note = this.doc.createElement('div');
    
    $(note).attr('id','sbnotes5832');
    $(note).resizable();
    $(note).draggable();
    //note.className = 'note';
    
    note.addEventListener('mousedown', function(e) { return self.onMouseDown(e) }, false);
    note.addEventListener('click', function() { return self.onNoteClick() }, false);
    this.note = note;

    var close = this.doc.createElement('div');    
    //close.className = 'closebutton';
    close.addEventListener('click', function(event) { return self.close(event) }, false);
    note.appendChild(close);

    var edit = this.doc.createElement('div');
    //edit.className = 'edit';
    edit.setAttribute('contenteditable', true);
    //edit.addEventListener('keyup', function() { return self.onKeyUp() }, false);
    note.appendChild(edit);
    this.editField = edit;

    var ts = this.doc.createElement('div');
    //ts.className = 'timestamp';
    ts.addEventListener('mousedown', function(e) { return self.onMouseDown(e) }, false);
    note.appendChild(ts);
    this.lastModified = ts;

    this.doc.body.appendChild(note);
    
	$(note).css('display','block')
	$(note).addClass('hover');
	
	$(note).attr('style',
		'background-color: rgb(255, 240, 70);'+
		'height: 250px;'+
		'padding: 10px;'+
		'position: absolute;'+
		'width: 200px;'+
		'-webkit-box-shadow: 0px 5px 10px rgba(0, 0, 0, 0.5);'
	)
	$(close).css('display','block')
	const png_image_src = 'data:image/png;base64, '+'iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAABkWlDQ1BJQ0MgUHJvZmlsZQAAeJyVkT1LHFEUhp87SCwS1gSnUotrJ7obFkWwSKNTLJIUy6Kyu93szLgujLOXO9evIm2aCJp0gSD6D2wShEDQOrESt0yTxlIEtVAYi5uwjSK'
	/*.note:hover .closebutton {
		display: block;
	}*/
				
	$(close).attr('style',
		'display: block;'+
		'background-image :url(data:image/png;base64,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%3D);'+
		//'background-image: url('+png_image_src+');'+
		'height: 30px;'+
		'position: absolute;'+
		'left: -15px;'+
		'top: -15px;'+
		'width: 30px;'
	)
		
	/*$(close).hover(
		function(){
			$(this).css("display","block")
		},function(){
			$(this).css("display","none")
		}
	)
	/*$(close)
	.closebutton:active {
		background-image: url(deleteButtonPressed.png);
	}*/
	$(edit).css('outline','none')
	$(ts).attr('style',
		'position: absolute;'+
		'left: 0px;'+
		'right: 0px;'+
		'bottom: 0px;'+
		'font-size: 9px;'+
		'background-color: #db0;'+
		'color: white;'+
		'border-top: 1px solid #a80;'+
		'padding: 2px 4px;'+
		'text-align: right;'

	)

	
    
    return this;
}
/**
 * Very low level control of the widget. 
 * Needed for easy 
 * */
Note.prototype = {
    get id()
    {
        if (!("_id" in this))
            this._id = 0;
        return this._id;
    },

    set id(x)
    {
        this._id = x;
    },
	get type(){
		return this._type;
	},
	set type(t){
		this._type = t;
	},
    get text()
    {
        return this.editField.innerHTML;
    },

    set text(x)
    {
        this.editField.innerHTML = x;
    },

    get timestamp()
    {
        if (!("_timestamp" in this))
            this._timestamp = 0;
        return this._timestamp;
    },

    set timestamp(x)
    {
        if (this._timestamp == x)
            return;

        this._timestamp = x;
        var date = new Date();
        date.setTime(parseFloat(x));
        this.lastModified.textContent = modifiedString(date);
    },

    get left()
    {
        return this.note.style.left;
    },

    set left(x)
    {
        this.note.style.left = x;
    },
	get width()
	{
		return this.note.style.width;
	},
	set width(x)
	{
		this.note.style.width = x;
	},
	get height()
	{
		return this.note.style.height;
	},
	set height(x)
	{
		this.note.style.height = x;
	},
    get top()
    {
        return this.note.style.top;
    },

    set top(x)
    {
        this.note.style.top = x;
    },

    get zIndex()
    {
        return this.note.style.zIndex;
    },

    set zIndex(x)
    {
        this.note.style.zIndex = x;
    },
	
    close: function(event)
    {
        //this.cancelPendingSave();

        var note = this;
        var duration = event.shiftKey ? 2 : .25;
        this.note.style.webkitTransition = '-webkit-transform ' + duration + 's ease-in, opacity ' + duration + 's ease-in';
        this.note.offsetTop; // Force style recalc
        this.note.style.webkitTransformOrigin = "0 0";
        this.note.style.webkitTransform = 'skew(30deg, 0deg) scale(0)';
        this.note.style.opacity = '0';

        var self = this;
        window.notes.remove(this.id);
        setTimeout(function() { document.body.removeChild(self.note) }, duration * 1000);
    },
	
}
function modifiedString(date)
{
    return 'Last Modified: ' + date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
}

//Main class responsible for creating notes/handling there deletion/ recreating them from DB 
function sbnotes(){
	//increment this by 
	this.highestId =0;
	this.captured = null;
	this.highestZ =25;
	
	/*Math.max.apply(null,$.map($('body > *'), function(e,n){
		if($(e).css('position')=='absolute')
			return parseInt($(e).css('z-index'))||1 ;
		})
	);*/
	this.noteArr = {};
	/**
	 * old notes
	 * */
	this.recreateNotes = function(notes){
		this.doc = document;//$('#sbinnerframe')[0].contentDocument;
		//pass in the result set from the DB
		try{
			for (var i = 0; i < notes.length; ++i) {
				var row = notes[i];
				var note = new Note();//recreate the notes....
				//With the position and the location :) This is really good.... All i have to do is index the db with page id...
				note.id = this.highestId++;
				
				note.text = row['note'];
				note.timestamp = row['timestamp'];
				note.left = row['left'];
				note.top = row['top'];
				note.zIndex = row['zindex'];
				note.type = row['type'];
				note.width = row['width'];
				note.height = row['height'];
				this.highestZ = Math.max(this.highestZ, row['zindex']);
				
				this.noteArr[note.id] =  {id : note.id, Note: note};
				///this.noteArr.push(note);//save all the notes
				
			}	
			console.log('Created '+notes.length+' notes');
			
			}catch(e){
				
			}
		//TO DO Send message to CS that notes are created
	}
	/**
	 * New note... Need to create a note on the page and send the data to 
	 * the extension about the new note...
	 * */
	this.createNewNote = function(){
		try{
			var note = new Note();//has an ID 
			note.id = this.highestId++;
			note.timestamp = new Date().getTime();
			note.left = Math.round(Math.random() * 400) + 'px';
			note.top = (this.doc.body.scrollTop+10).toString() + 'px';
			note.zIndex = ++this.highestZ;
			note.type = 'text';
			this.noteArr[note.id] = {id : note.id, Note: note};
			
			
			return({status: 'OK', data :note, message: 'Created new note'})
		}catch(e){
			return({status: 'BAD', data :null, message: e.message})
		}
		//TO DO Send message to Extension that new note is create
	}
	/**
	 * Called when there is a request to save the notes.
	 * */
	this.getNotes = function(){
		var ret = {};
		for(i in this.noteArr){
			if(this.noteArr[i]){
				if(this.noteArr[i].Note.text.trim()!='')
					ret[i] = {id : this.noteArr[i].Note.id, type:this.noteArr[i].Note.type , text: this.noteArr[i].Note.text, timestamp: this.noteArr[i].Note.timestamp, left: this.noteArr[i].Note.left, top: this.noteArr[i].Note.top, zIndex: this.noteArr[i].Note.zIndex, width: this.noteArr[i].Note.width, height: this.noteArr[i].Note.height};
			
				console.log(this.noteArr[i]);
			}
				
		}
		return ret;
	}
	this.remove = function(id){
		this.noteArr[id] = null;
		
	}
}
