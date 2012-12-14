/*
 * Copyright © 2010 Eugeniy Meshcheryakov <eugen@debian.org>
 *
 * This file is licensed under GNU LGPL version 3 or later.
 * See file LGPL-3 for details. This is the script run on pages reproduced on an
 * already saved HTML file...
 */



function makeDataUrl(contentType, data) {
  return 'data:' + contentType + ';base64,' + toBase64(data);
}

function makeDataUrlFromUTF8(contentType, data) {
  return makeDataUrl(contentType, unescape(encodeURIComponent(data)));
}

function DocumentSaver() {
  this.cloneRoot = null; // Root of the cloned document
  this.stylesheets = [];
  //this.params = params_t;
  

  

  /*
   * Add meta tag with HTML content type and encoding set to UTF-8
   */
  this.addMetaTag = function() {
    var head = this.cloneRoot.getElementsByTagName('head')[0];
    if (!head) {
      // FIXME should never happen
      console.error('HTML document without <head>');
      return;
    }
    var meta = this.doc.createElement('meta');
    meta.httpEquiv = 'Content-Type';
    meta.content = 'text/html; charset=utf-8';
    head.appendChild(meta);
  }

  

  this.processLink = function(clone, elem) {
    switch (elem.rel.toLowerCase()) {
      case 'stylesheet':
        return;
    }
    clone.appendChild(elem.cloneNode(false));
  }

  /* ============== Element processing funtcions ========================== */

  /*
   * for <a> and <area>
   * Converts URLs to absolute if they are nonlocal.
   * FIX ME Avoid XSS..
   */
  // for <a> and <area>
	this.processAnchor = function(clone, elem) {
	  var newClone = elem.cloneNode(false);
	  var href = elem.getAttribute('href');
	  /* convert href to an absolute url, if it does not point to current page */
	  if (href && (href[0] != '#')) newClone.href = elem.href;
	  clone.appendChild(newClone);
	  return newClone;
	}


	this.processImage = function(clone, elem) {
	  var newClone = elem.cloneNode(false);
	  var url = elem.src;
	  newClone.url = url; // convert to absolute for now
	  console.log('Image url: ' + url);
	  clone.appendChild(newClone);
	  
	  
	}

 
  /* FIXME this does not work on images.google.com and maybe others

  this.processCanvas = function(clone, elem) {
    var newClone = document.createElement('img');
    // copy all attributes from canvas, FIXME should be ok?
    var attrs = elem.attributes;
    for (var i = 0; i < attrs.length; i++)
      newClone.setAttribute(attrs[i].name, attrs[i].value); // FIXME or textValue? what about namespace?
    // and save the data itself
    try {
      newClone.src = elem.toDataURL();
    }
    catch (e) {
      console.error(e.message);
    }
    clone.appendChild(newClone);
  }
  */

  /*
   * Process meta elements
   * Removes attributes that can conflict with correct saving/restoring
   */
  this.processMeta = function(clone, elem) {
    if (elem.httpEquiv &&
        (elem.httpEquiv.toLowerCase() == 'refresh' ||
         elem.httpEquiv.toLowerCase() == 'content-type'))
      return;
    var newClone = elem.cloneNode(false);
    clone.appendChild(newClone);
    return newClone;
  }
  //We already processed all the i frames...
  this.processFrame = function(clone, elem) {
    var newClone = elem.cloneNode(false);
    // TODO convert src to absolute
    /*if (elem.contentDocument) {
      var frameSaver = new DocumentSaver();
      frameSaver.processDocument(elem.contentDocument,
          function(clone) {
            var newURL = makeDataUrlFromUTF8('text/html; charset=utf-8',
              new XMLSerializer().serializeToString(clone));
            newClone.src = newURL;
            
          });
    }
    else
		console.error('iframe without contentDocument');*/
    clone.appendChild(newClone);
    return newClone;
  }

  /*
   * Process an HTML element and it's children.
   * Parameters:
   *    clone - clone of the parent element
   *    elem - current element (in original document)
   */
  this.processElement = function(clone, elem) {
    var newClone = null;
  
	switch (elem.nodeName.toLowerCase()) {
	case 'link':
	//All links node were already processed...and removed...
	return;
	case 'area':
	case 'a':
		newClone = this.processAnchor(clone, elem);
		break;
	case 'img':
		this.processImage(clone, elem);
		break;
	/* FIXME does not work
	case 'canvas':
	processCanvas(clone,elem);
	return;
	*/
	case 'style':
		newClone = elem.cloneNode(false);
		clone.appendChild(newClone);
	break;
	case 'script':
	/* ignore, it will not work in many cases */
		return;
	case 'meta':
		newClone = this.processMeta(clone, elem);
		break;
	case 'div':
		if((elem.id && elem.id.toString().trim()== 'sbsite-bottom-bar') || elem.id.trim()=='sbnotes5832'){
			return;
		}
	case 'iframe':
	case 'frame':
		newClone = this.processFrame(clone, elem);
		break;
      
    default:
      newClone = elem.cloneNode(false);
      clone.appendChild(newClone);
    }

    if (newClone != null) {
      for (var child = elem.firstChild; child != null; child = child.nextSibling)
        this.processRecursive(newClone, child);
    }
  }

  this.processRecursive = function(clone, node) {
    switch (node.nodeType) {
    case node.TEXT_NODE:
    case node.CDATA_SECTION_NODE:
      clone.appendChild(node.cloneNode(false));
      break;
    case node.COMMENT_NODE:
      /* ignore */
      break;
    case node.ELEMENT_NODE:
      this.processElement(clone, node);
      break;
    default:
      console.log('Unhandled node: ' + node);
      break; /* TODO */
    }
  }

  this.processDoc = function(clone, node) {
    for (var child = node.firstChild; child != null; child = child.nextSibling)
      this.processRecursive(clone, child);
  }

  this.processStyleSheet = function(styleSheet) {
    // XXX See issues 45786 and 49001
    if (!styleSheet.cssRules) {
      console.warn('Empty cssRules. Saved page will look incorrect.');
      return '';
    }

    var rules = [];
    for (var i = 0; i < styleSheet.cssRules.length; i++) {
      var rule = styleSheet.cssRules[i];
      if (rule.type == rule.IMPORT_RULE) {
        rules.push(this.processStyleSheet(rule.styleSheet));
      } else if (rule.type == rule.CHARSET_RULE) {
        // ignore
      } else {
        rules.push(rule.cssText);
      }
    }
    return rules.join('\n');
  }

  /*
   * Process document inlining images/stylesheets/etc.. and removing scripts.
   */
  this.processDocument = function(doc, callback) {
    
    this.doc = doc;
    this.callback = callback;

    var rootNode = this.doc.getElementsByTagName('html')[0];
    if (!rootNode) {
      console.error("No html node in document");
      return;
    }
    this.cloneRoot = rootNode.cloneNode(false);
    this.processDoc(this.cloneRoot, rootNode);
    //
	this.addMetaTag();
    this.callback(this.cloneRoot);	
	
  }
}



