
// Javascript for index.html


let cs;
let pinging = false;
UI.ready(event => {
  // collection controls
  getSelectCollections();
  UI.clickAction('collection_create', createCollection);
  UI.clickAction('collection_delete', deleteCollection);

  // query string controls
  UI.clickAction('build_query', buildQuery);
  UI.changeAction('document_id', idChange);

  // collection query controls
  UI.clickAction('document_delete', documentDelete);
  UI.clickAction('document_insert', documentInsert);
  UI.clickAction('document_find', documentFind);
  UI.clickAction('document_update', documentUpdate);

  // authentication token
  showToken();
  UI.clickAction('renewal', renewTokenClick);

  // websocket controls
  UI.clickAction('websocket', websocketClick);
  UI.clickAction('ping', pingClick);
});




// set the select options for collection
async function getSelectCollections (selected) {
  let collections = await getCollections();
  let htmlOptions = collections.map(collection => `<option value="${collection}"${(collection === selected ? ' selected' : '')}>${collection}</option>`);
  UI.elementHTML('collection_names', htmlOptions);
}

// get collection names
async function getCollections () {
  let response;
  try {
    response = await Common.fetch('/api/collections');
  }
  catch (error) {
    Common.appendError(error.toString());
    return;
  }
  return response.collections;
}

// create a new collection
function createCollection () {
  let collection = UI.inputValue('collection_name');
  Common.fetch('/api/collections', 'post', { collection })
    .then(() => {
      getSelectCollections(collection);
    })
    .catch(error => {
      Common.appendError(error.toString());
    });
}

// delete the selected collection
function deleteCollection () {
  let collection = UI.inputValue('collection_names');
  Common.fetch(`/api/collections/${collection}`, 'delete')
    .then(() => {
      getSelectCollections();
    })
    .catch(error => {
      Common.appendError(error.toString());
    });
}



// build query object into query string
function buildQuery () {
  Common.clearAll();
  UI.inputValue('collection_query_string', '');
  let qoin = UI.inputValue('collection_query_object');
  if (!qoin || !qoin.length) return;
  let qo;
  try {
    qo = JSON.parse(qoin);
  }
  catch (error) {
    Common.appendError(error.message);
    return;
  }
  UI.inputValue('collection_query_string', encodeURIComponent(JSON.stringify(qo)));
}

// act on a change to the value in the _id input
function idChange (e) {
  UI.element('collection_query_string').disabled = (e.target.value.length ? true : false);
}




// delete document
function documentDelete () {
  Common.clearAll();
  disableDocumentButtons();
  if (!UI.inputValue('document_id').length && !UI.inputValue('collection_query_string').length) {
    if (!confirm('This action will remove all documents in the selected collection!')) return;
  }
  Common.fetch(restUrl(), 'delete')
    .then(res => {
      enableDocumentButtons();
      UI.inputValue('documents', JSON.stringify(res, null, 2));
    })
    .catch(error => {
      enableDocumentButtons();
      Common.appendError(error.toString());
    });
}

// find documents
function documentFind () {
  Common.clearAll();
  disableDocumentButtons();
  Common.fetch(restUrl())
    .then(res => {
      enableDocumentButtons();
      UI.inputValue('documents', JSON.stringify(res, null, 2));
    })
    .catch(error => {
      enableDocumentButtons();
      Common.appendError(error.toString());
    });
}

// insert a document
function documentInsert () {
  Common.clearAll();
  disableDocumentButtons();
  let doc;
  try {
    doc = JSON.parse(UI.inputValue('documents'));
  }
  catch (error) {
    enableDocumentButtons();
    Common.appendError(error);
    return;
  }
  let collection = UI.inputValue('collection_names');
  Common.fetch(restUrl(true), 'post', doc)
    .then(res => {
      enableDocumentButtons();
      Common.appendMessage(`Inserted new document ${res._id} into ${collection}.`);
    })
    .catch(error => {
      enableDocumentButtons();
      Common.appendError(error.toString());
    });
}

// update a document
function documentUpdate () {
  Common.clearAll();
  disableDocumentButtons();
  let doc;
  try {
    doc = JSON.parse(UI.inputValue('documents'));
  }
  catch (error) {
    enableDocumentButtons();
    Common.appendError(error);
    return;
  }
  let collection = UI.inputValue('collection_names');
  Common.fetch(restUrl(), 'patch', doc)
    .then(res => {
      enableDocumentButtons();
      Common.appendMessage(`Patched document ${res._id} in ${collection}.`);
    })
    .catch(error => {
      enableDocumentButtons();
      Common.appendError(error.toString());
    });
}

// assemble REST URL
function restUrl (noQuery) {
  let collection = UI.inputValue('collection_names');
  let id = UI.inputValue('document_id');
  let queryString = UI.inputValue('collection_query_string');
  return `/db/${collection}` + (noQuery ? '' : (id.length ? `/${id}` : `?q=${queryString}`));
}

// disable document buttons
function disableDocumentButtons () {
  setDocumentButtons(true);
}

// enable document buttons
function enableDocumentButtons () {
  setDocumentButtons(false);
}

// set document button disabled state
function setDocumentButtons (disabled) {
  let buttons = UI.elements('document_button');
  for(let bi = 0; bi < buttons.length; bi++) {
    buttons[bi].disabled = disabled;
  }
}



// renew authentication token
async function renewTokenClick (ev) {
  Common.clearAll();
  let response = await fetch('/authentication', {
    method: 'POST',
    cache: 'no-cache',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    redirect: 'follow',
    referrerPolicy: 'no-referrer',
    body: JSON.stringify({ jwt: ClientSocket.getToken() })
  });
  let data;
  try {
    data = await response.json();
  }
  catch (error) {
    Common.appendError(error.message);
    return;
  }
  if (!data[TokenName]) {
    Common.appendError('Did not receive renewed token.');
    return;
  }
  showToken();
}

// show user authentication token
function showToken () {
  UI.inputValue('token', ClientSocket.getToken());
}



// process websocket request from user interface
function websocketClick (ev) {
  if (cs && cs.isOpen()) {
    cs.close();
    delete cs;
  }
  else if (cs && !cs.isOpen()) {
    Common.appendError(`Client socket state ${cs.getState()}`);
  }
  else {
    cs = new ClientSocket({ onOpen, onError, onClose, onMessage, tokenName: TokenName });
    console.log(cs.socket.readyState)
  }
}

// process ping request from user interface
function pingClick (ev) {
  pinging = !pinging;
  UI.elementHTML('ping', (pinging ? 'Stop Ping' : 'Start Ping'));
  if (pinging) {
    Common.appendMessage('Start ping');
    ping();
    return;
  }
  Common.appendMessage('Stop ping');
}

// handle websocket open event
function onOpen () {
	Common.appendMessage('WebSocket open');
  UI.elementHTML('websocket', 'Close Socket');
}

// handle websocket error event
function onError () {
	Common.appendError('WebSocket error');
}

// handle websocket close event
function onClose () {
  delete cs;
  cs = null;
	Common.appendMessage('WebSocket closed');
  UI.elementHTML('websocket', 'Open Socket');
}

// handle websocket message event
function onMessage (message) {
	let data;
	try {
		data = JSON.parse(message.data);
	}
	catch (error) {
		Common.appendError(error.message);
		return;
	}
	switch (data.action) {
		case 'pong':
  		Common.appendMessage('Ping reply ' + JSON.stringify(data));
  		return;

    case 'message':
      Common.appendMessage(`Message: <pre>${JSON.stringify(data, null, 2)}</pre>`);
      return;

		default:
  		Common.appendError('Unknown action ' + data.action);
  		return;
	}
}

// send ping over websocket
function ping () {
  if (!pinging) return;
  if (cs && cs.isOpen()) cs.send(JSON.stringify({ action: 'ping', text: 'echo this' }));
  else Common.appendError('Client socket is not open');
  setTimeout(ping, 3000);
}
