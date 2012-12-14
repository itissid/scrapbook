/** What to push on stack?
 * Type of do actions:
 * 1) Create mark element(s) id: 'mark'
 * 2) Change color of parent : id 'changeParentColor'
 * The above should be enough to get the mark and undo action going.
 * */

/**Notes will require a totally different annotation style.
 * Notes will require a seperate DB note and store stuff. 
 * The highlighted anotations stuff is just HTML page saved to the page.
 * 
 * */
/**
 * Possible bugs error cases still to be handled: 
 * 1) Runaway marking due to orphaned siblings
 * 2) Removal of mark nodes cant be done because it may create DOM inconsistencies in it. 
 * A bug caused by too many annotations of th same section of text.
 * 
 * 
 * */
/**
 * Really ought to use jquery heavily here and rewrite this code. with Jquery i wont need to use the stack for undo
 * Just put in the topID as an attribute in the mark tags and use jquery selectors.
 * **/
function annotation(){	
	
	/**
	 * Apply a certain style. and mark on the page.
	 * */
	this.topID = 0; //Written to attributes
	this.doc = null;
	this.doAnnotation = function(style){
		
		try{
			this.markSelection(style);
			//Much cleaner than the stack...Now i dont need to take care of the stack's top position
			//Just use the jQuery selector on topID-1 to remove prev elements.
			this.topID++;
		}catch(e){
			//Something was pushed once. Increment the topID
			//Subtle bugs cause runaway marking of all elements
			//With jQuery I can just remove the 
			//Best to remove the elements with the current annotation
			this.undoAction();
			
			return;	
		}
		//console.log(window.stack.print())
		//only if something was pushed do we do this
		//if(window.stack.top > prevTop)
			//	window.topID++;
		//must push multiple mark elements on the stack with an ID to indicate
		
	}
	
	
	this.undoAction = function(){
		var maxID =-1;
		$(this.doc).find('mark[current="Y"]').each(function(){
			var t_id = parseFloat($(this).attr('id'));
			if(isNaN(t_id)==false && t_id!=-1){
				if(t_id > maxID)
					maxID = t_id;
			}
			
		})
		this.topID = maxID+1;//readjust the topID
		var self = this;
		$(this.doc).find('mark[current="Y"]').filter('#'+(this.topID-1)).each(function(){
				
			try{
				//Couldnt do this with Jquery :(
				var markElement = this;
				var nextSibling = markElement.nextSibling;//Need to insert just before this
				var textNode = self.doc.createTextNode(markElement.textContent);
				var parentNode = markElement.parentNode;//maybe HTML or MARK... Its ok...
				parentNode.removeChild(markElement);
				parentNode.insertBefore(textNode,nextSibling);
				
			}catch(e){
				//We were not able to remove a mark element
				//Best to put the ID of these elements as -1 and let user erase them using DOM eraser...
				console.log('Error while removing the mark element. Remove manually');
				$(this).attr('id',-1);
				this.topID--;
				return
			}
		})
		this.topID--;
		
	}
	
	
	//Sort of like Finding the inorder successor in the DOM tree
	this.GetNextLeaf = function(node) {
		while (!node.nextSibling) {
			node = node.parentNode;
			if (!node) {
				return node;	
			}
		}
		var leaf = node.nextSibling;
		while (leaf.firstChild) {
			leaf = leaf.firstChild;
		}
		return leaf;
	}
	//Sorta like finding the inorder predecessor in the DOM tree.
	this.GetPreviousLeaf = function  (node) {
		while (!node.previousSibling) {
			node = node.parentNode;
			if (!node) {
				return node;
			}
		}
		var leaf = node.previousSibling;
		while (leaf.lastChild) {
			leaf = leaf.lastChild;
		}
		return leaf;
	}

		// If the text content of an element contains white-spaces only, then does not need to mark
	this.IsTextVisible = function(text) {
		for (var i = 0; i < text.length; i++) {
			if (text[i] != ' ' && text[i] != '\t' && text[i] != '\r' && text[i] != '\n')
				return true;
		}
		return false;
	}

	this.markLeaf  = function(node, style) {
		//console.log('From markleaf::'+style)
		if (!this.IsTextVisible (node.textContent))
			return;
		
		var parentNode = node.parentNode;
			// if the node does not have siblings and the parent is a mark element, then modify its color
		if(parentNode){	
			if (!node.previousSibling && !node.nextSibling) {
				try{
					if (parentNode.tagName && parentNode.tagName.toLowerCase () == "mark") {
						parentNode.setAttribute('style', style);
						$(parentNode).attr({'style': style ,'current':'Y', 'id':this.topID})
						
						//window.stack.push({actionID : window.topID, actionType : 'changeParentColor' , nodeName: parentNode});
						return;
					}
				}catch(e){
					alert('Error while annotating! Save work and reopen file');
					return;
				}
			}

			// Create a mark element around the node
			try{
				var mark = this.doc.createElement ("mark");
				mark.setAttribute('style', style);
				mark.setAttribute('id', this.topID);
				mark.setAttribute('current', 'Y');
				var nextSibling = node.nextSibling;
				parentNode.removeChild (node);
				mark.appendChild (node);
				parentNode.insertBefore (mark, nextSibling);
					
				//$(node).wrap(mark);
				//$(mark).attr({'style': style ,'current':'Y', 'id':this.topID})
			}
			catch(e){
				alert('Error while annotating! Save work and reopen file');
				return;
			}
			//window.stack.push({actionID : window.topID, actionType : 'mark' , nodeName: mark});
		}
	}

	this.markLeafFromTo = function  (node, style, from, end) {
		//console.log('From markleafFromto::'+style)
		var text = node.textContent;
		//looks like an assertion that node is text only.
		if (!this.IsTextVisible (text))
			return;
		
		if (from < 0){
			from = 0;
		}
		
		if (end < 0){
			end = text.length;
		}

		if (from == 0 && end >= text.length) {
			// end avoid unnecessary mark elements
			this.markLeaf (node, style);
			return;
		}

		var part1 = text.substring (0, from);
		var part2 = text.substring (from, end);
		var part3 = text.substring (end, text.length);

		var parentNode = node.parentNode;
		var nextSibling = node.nextSibling;
		
		if(parentNode){	
			try{
			parentNode.removeChild (node);
				if (part1.length > 0) {
					var textNode = this.doc.createTextNode (part1);
					parentNode.insertBefore (textNode, nextSibling);
				}
				if (part2.length > 0) {
					var mark = this.doc.createElement ("mark");
					
					///console.log(mark.style);
					///console.log(mark);
					var textNode = this.doc.createTextNode (part2);
					mark.appendChild (textNode);
					parentNode.insertBefore (mark, nextSibling);
					$(mark).attr({'style': style ,'current':'Y', 'id':this.topID})
					
				}
				if (part3.length > 0) {
					var textNode = this.doc.createTextNode (part3);
					parentNode.insertBefore (textNode, nextSibling);
				}
			}catch(e){
				alert('Error while annotating! Save work and reopen file');
				return;
			}
			//window.stack.push({actionID : window.topID, actionType : 'mark' , nodeName: mark});
		}
	}

	this.markNode = function(node, style) {
		var childNode = node.firstChild;
		if (!childNode) {
			this.markLeaf (node, style);
			return;
		}

		while (childNode) {
				// store the next sibling of the childNode, because colorizing modifies the DOM structure
			var nextSibling = childNode.nextSibling;
			this.markNode (childNode, style);//doing DFS here
			childNode = nextSibling;
		}
	}

	this.markNodeFromTo = function  (node, style, from, to) {
		var childNode = node.firstChild;
		if (!childNode) {
			this.markLeafFromTo (node, style, from, to);
			return;
		}

		for (var i = from; i < to; i++) {
			this.markNode (node.childNodes[i], style);
		}
	}

	this.markSelection = function(style) {
		///console.log('From marksel::'+style)
		//this.doc = $('#sbinnerframe')[0].contentDocument;//is this the only iframe?
		var self =this;
		$('iframe').each(function(){
				if(!this.contentDocument.getSelection().isCollapsed){
					self.doc = this.contentDocument;
				}
		})
		if(self.doc){
			this.doc = self.doc;
			
		}else{
			alert ("Please select some content first!");
			return;
		}
		
		if (this.doc.getSelection) {        // Firefox, Opera, Safari
			var selectionRange = this.doc.getSelection ();

			if (selectionRange.isCollapsed) {
				alert ("Please select some content first!");
			}
			else {
				var range = selectionRange.getRangeAt(0);
				range = this.adjustRange(range);
				
				// store the start and end points of the current selection, because the selection will be removed
				//TODO: Get Sentence boundary as well.
				var startContainer = range.startContainer;
				var startOffset = range.startOffset;
				var endContainer = range.endContainer;
				var endOffset = range.endOffset;
				//Need to move offset to end of word...
					// because of Opera, we need to remove the selection before modifying the DOM hierarchy
				selectionRange.removeAllRanges ();
				
				if (startContainer == endContainer) {
					this.markNodeFromTo (startContainer,  style, startOffset, endOffset);
				}
				else {
					if (startContainer.firstChild) {
						var startLeaf = startContainer.childNodes[startOffset];
					}
					else {
						var startLeaf = this.GetNextLeaf(startContainer);
						this.markLeafFromTo (startContainer, style, startOffset, -1);
					}
					
					if (endContainer.firstChild) {
						if (endOffset > 0) {
							var endLeaf = endContainer.childNodes[endOffset - 1];
						}
						else {
							var endLeaf = this.GetPreviousLeaf (endContainer);
						}
					}
					else {
						var endLeaf = this.GetPreviousLeaf (endContainer);
						this.markLeafFromTo (endContainer, style, 0, endOffset);
					}

					while (startLeaf) {
						var nextLeaf = this.GetNextLeaf (startLeaf);
						this.markLeaf (startLeaf, style);
						if (startLeaf == endLeaf) {
							break;
						}
						startLeaf = nextLeaf;
					}
				}
			}
		}
		else {
			alert ("Unable to highlight the selection. Try breaking up your selection");
		}
	}  
	
	/**
	 * Function is meant to adjust the expand the range to the full word... We dissalow partial
	 * word selection... 
	 * */
	this.adjustRange = function (rangeObj){
		var r1 = rangeObj.cloneRange();
		//now expand range till first char and last one is either a white space...
		var rexp = new RegExp(/[\t\v\s]/)//A match for space
		var strText = r1.toString();
	
		try{
			while(!rexp.test(strText.charAt(0))){//Keep backing off till whole word is selected or you hit the start of the container
				r1.setStart(r1.startContainer,r1.startOffset-1);
				strText = r1.toString();
			}
		}catch(e){
			console.log(r1.toString())
		}
		strText = r1.toString();
		try{
			while(!rexp.test(strText.charAt(strText.length-1))){//Keep moving forwarding till whole word is selected or you hit the end of the container
				r1.setEnd(r1.endContainer,r1.endOffset+1);
				strText = r1.toString();
			}
		}catch(e){
			console.log(r1.toString())
		}
		return r1;
	}
	
}

/*Debugging functions....*/
function error(t,e){
	if(e && e.code==1){
		console.log('Database error detected:'+e.message);
	}else if(e && e.code==5){
		console.log('Sytax Error: '+e.message)		
	}
}
function success(e){
	console.log('OK::'+e.message);
	//console.log(e);
}
