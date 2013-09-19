/*
 * Copyright © 2010 Eugeniy Meshcheryakov <eugen@debian.org>
 *
 * This file is licensed under GNU LGPL version 3 or later.
 * See file LGPL-3 for details.
 */

/* Base64 function is from src/third_party/WebKit/SunSpider/tests/string-base64.js
 * in Chromium sources. See COPYRIGHT.base64 for details. */
var toBase64Table = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
var base64Pad = '=';

function toBase64(data) {
  var result = '';
  var length = data.length;
  var i;
  // Convert every three bytes to 4 ascii characters.
  for (i = 0; i < (length - 2); i += 3) {
    result += toBase64Table[(data.charCodeAt(i) & 0xff) >> 2];
    result += toBase64Table[((data.charCodeAt(i) & 0x03) << 4) + ((data.charCodeAt(i+1) & 0xff) >> 4)];
    result += toBase64Table[((data.charCodeAt(i+1) & 0x0f) << 2) + ((data.charCodeAt(i+2) & 0xff) >> 6)];
    result += toBase64Table[data.charCodeAt(i+2) & 0x3f];
  }

  // Convert the remaining 1 or 2 bytes, pad out to 4 characters.
  if (length%3) {
    i = length - (length%3);
    result += toBase64Table[(data.charCodeAt(i) & 0xff) >> 2];
    if ((length%3) == 2) {
      result += toBase64Table[((data.charCodeAt(i) & 0x03) << 4) + ((data.charCodeAt(i+1) & 0xff) >> 4)];
      result += toBase64Table[(data.charCodeAt(i+1) & 0x0f) << 2];
      result += base64Pad;
    } else {
      result += toBase64Table[(data.charCodeAt(i) & 0x03) << 4];
      result += base64Pad + base64Pad;
   }
 }
 return result;
}

function makeDataUrl(contentType, data) {
  return 'data:' + contentType + ';base64,' + toBase64(data);
}

function makeDataUrlFromUTF8(contentType, data) {
  return makeDataUrl(contentType, unescape(encodeURIComponent(data)));
}

function DocumentSaver() {
  this.cloneRoot = null; // Root of the cloned document
  this.waitCount = 1; // Number of requests to wait for, 1 for main script
  this.stylesheets = [];
  
  
  this.incrementWait = function() {
    this.waitCount++;
  }

  /*
   * Decrement wait counter and check if script should finish saving the page.
   */
  this.decrementWait = function() {
    this.waitCount--;
    // FIXME what if there is no cloneRoot?
    if (!this.waitCount && this.cloneRoot) {
      this.finalizeStylesheets();
      this.addMetaTag();
      
      this.waitCount = 1;
	  this.callback(this.cloneRoot);	
    }
  }

  this.finalizeStylesheets = function() {
    if (this.stylesheets.length) {
      var head = this.cloneRoot.getElementsByTagName('head')[0];
      if (head)
        this.stylesheets.forEach(function(st) {head.appendChild(st);});
      else {
        // FIXME should never happen
        console.error('HTML document without <head>');
      }
    }
  }

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

  this.requestFile = function(href, callback, binary) {
    this.incrementWait();
    chrome.runtime.sendMessage({
      requestType: 'downloadFile',
      href: href,
      binary: binary
    }, callback);
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
   * FIX ME Avoid XSS .
   */
  this.processAnchor = function(clone, elem) {
    var newClone = elem.cloneNode(false);
    var href = elem.getAttribute('href');
    /* convert href to an absolute url, if it does not point to current page */
    if (href && (href[0] != '#')) {
		newClone.href = elem.href;
		
	}if(href){
		newClone.target = '_blank'
	}
   //Extensions have no DOM access so we need to check only for messages.
	if(href && !href.match('chrome[.]extension|chrome[.]tabs') )
		clone.appendChild(newClone);
    return newClone;
  }

  /*
   * Replaces image element URL with data URL for downloaded file.
   */
  this.handleImageFile = function(image) {
    var owner = this;
    return function(response) {
      if (response.data && response.contentType)
        image.src = makeDataUrl(response.contentType, response.data);
      owner.decrementWait();
    }
  }

  /*
   * Launches file download for an image.
   */
  this.processImage = function(clone, elem) {
    var newClone = elem.cloneNode(false);
    var url = elem.src; 
    var href = elem.getAttribute('href');
    if(href){
		newClone.target = '_blank'
	}
    newClone.url = url; // convert to absolute for now
    console.log('Image url: ' + url);
    clone.appendChild(newClone);
  
    if (url) {
      if (url.toLowerCase().match(/^https?:\/\//)) {
        this.requestFile(url, this.handleImageFile(newClone), true);
      }
    }
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

  this.processFrame = function(clone, elem) {
    var newClone = elem.cloneNode(false);
    // TODO convert src to absolute
    if (elem.contentDocument) {
      this.incrementWait();
      var frameSaver = new DocumentSaver();
      var owner = this;
      //TO DO process Iframe if the domains are same...
      //if(this.doc.domain == elem.contentDocument.domain){
      frameSaver.processDocument(elem.contentDocument,
          function(clone) {
			  //TO DO change this to inline HTML incase of same iframe...
            var newURL = makeDataUrlFromUTF8('text/html;charset=utf-8',
              new XMLSerializer().serializeToString(clone));
            //TO DO: dont put in source. Put in innerHTML
            newClone.src = newURL;
            owner.decrementWait();//finally for an extra frame element...
          });
	  /*}else{
		  console.log('Dropping Iframe for  XSS security reason')
	  }*/
    }
    else{
		console.error('iframe without contentDocument');
	}
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
      this.processLink(clone, elem);
      return;
    case 'area':
    case 'a':
      newClone = this.processAnchor(clone, elem);
      break;
    case 'img':
      this.processImage(clone, elem);
      return;
    /* FIXME does not work
    case 'canvas':
      processCanvas(clone,elem);
      return;
    */
    case 'style':
      return;
    case 'script':
      /* ignore, it will not work in many cases */
      return;
    case 'meta':
      newClone = this.processMeta(clone, elem);
      break;
    case 'iframe':
    case 'frame':
      newClone = this.processFrame(clone, elem);
      break;
    default:
      //TODO: Cycle thru attributes only keep class and CSS attributes
      newClone = elem.cloneNode(false);
      var href = elem.getAttribute('href');
	  if(href){
			newClone.target = '_blank'
	  }
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


  /* XXX remove when chrome bug is fixed */
  this.handleStyleFile = function(style) {
    var owner = this;
    return function(response) {
      if (response.data)
        style.appendChild(owner.doc.createTextNode(response.data)); /* TODO check content type */
      owner.decrementWait();
    }
  }

  this.processStyles = function() {
    if (!this.doc.styleSheets) return;

    for (var i = 0; i < this.doc.styleSheets.length; i++) {
      var styleSheet = this.doc.styleSheets[i];
      var elem = this.doc.createElement('style');
      if (styleSheet.media.length)
        elem.media = styleSheet.media.mediaText;
      elem.type = styleSheet.type;
      if ((styleSheet.cssRules == null) && styleSheet.href) {
        /* XXX Workaround for chrome bugs. Should be removed in future versions. */
        console.warn('Downloading stylesheet.');
        this.requestFile(styleSheet.href, this.handleStyleFile(elem), false);
      }
      else
        elem.appendChild(this.doc.createTextNode(this.processStyleSheet(styleSheet)));
      this.stylesheets.push(elem);
    }
  }

  /*
   * Process document inlining images/stylesheets/etc.. and removing scripts.
   */
  this.processDocument = function(doc, callback) {
    console.log(doc);
    // TODO check content type
    this.doc = doc;
    this.callback = callback;
    
    var rootNode = doc.getElementsByTagName('html')[0];
    if (!rootNode) {
      console.error("No html node in document");
      return;
    }
    this.cloneRoot = rootNode.cloneNode(false);
    // TODO process html root too
    this.processDoc(this.cloneRoot, rootNode);
    this.processStyles();
    this.decrementWait();
  }
}



