
// Javascript for index.html


let cs;
let pinging = false;
UI.ready(event => {
  UI.clickAction('collection_create', createCollection);
  setSelectCollections();

  UI.clickAction('websocket', websocketClick);
  UI.clickAction('ping', pingClick);
  UI.clickAction('renewal', renewTokenClick);
  showToken();
});

// set the select options for collection
async function setSelectCollections () {
  let collections = await getCollections();
  let htmlOptions = collections.map(collection => `<option value="${collection}">${collection}</option>`);
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
      setSelectCollections();
    })
    .catch(error => {
      Common.appendError(error.toString());
    })
}


function websocketClick (ev) {
  if (cs && cs.isOpen()) {
    cs.close();
    delete cs;
  }
  else if (cs && !cs.isOpen()) {
    appendError(`Client socket state ${cs.getState()}`);
  }
  else {
    cs = new ClientSocket({ onOpen, onError, onClose, onMessage, tokenName: TokenName });
    console.log(cs.socket.readyState)
  }
}


function pingClick (ev) {
  pinging = !pinging;
  UI.elementHTML('ping', (pinging ? 'Stop Ping' : 'Start Ping'));
  if (pinging) {
    Common.appendMessage('Start ping');
    ping();
    return;
  }
  appendMessage('Stop ping');
}


async function renewTokenClick (ev) {
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
    UI.appendError(error.message);
    return;
  }
  if (!data[TokenName]) {
    UI.appendError('Did not receive renewed token.');
    return;
  }
  showToken();
}


function showToken () {
  UI.inputValue('token', ClientSocket.getToken());
}




function onOpen () {
	appendMessage('WebSocket open');
  UI.elementHTML('websocket', 'Close Socket');
}

function onError () {
	appendError('WebSocket error');
}

function onClose () {
  delete cs;
  cs = null;
	appendMessage('WebSocket closed');
  UI.elementHTML('websocket', 'Open Socket');
}

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

		default:
		Common.appendError('Unknown action ' + data.action);
		return;
	}
}

function ping () {
  if (!pinging) return;
  if (cs && cs.isOpen()) cs.send(JSON.stringify({ action: 'ping', text: 'echo this' }));
  else Common.appendError('Client socket is not open');
  setTimeout(ping, 3000);
}
