
// Class to handle WebSocket connection to server

class ClientSocket {
	constructor (options) {
    options = options || {};
    let tokenName = options.tokenName || 'token';
		let token = ClientSocket.getToken(tokenName);
		let protocols = [(token ? `${tokenName}_${token}` : '')];
		this.socket = new WebSocket((window.location.protocol === 'https:' ? 'wss' : 'ws') + '://' + window.location.host, protocols);
		this.socket.onopen = options.onOpen || this.onOpen.bind(this);
		this.socket.onerror = options.onError || this.onError.bind(this);
		this.socket.onclose = options.onClose || this.onClose.bind(this);
		this.socket.onmessage = options.onMessage || this.onMessage.bind(this);
	}

  getState () {
    switch (this.socket.readyState) {
      case this.socket.CONNECTING:
        return 'connecting';

      case this.socket.OPEN:
        return 'open';

      case this.socket.CLOSING:
        return 'closing';

      case this.socket.CLOSED:
        return 'closed';

      default:
        return 'unknown';
    }
  }

  isOpen () {
    return this.socket.OPEN === this.socket.readyState;
  }

  close () {
    this.socket.close();
    setTimeout(() => {
      if ([this.socket.OPEN, this.socket.CLOSING].includes(this.socket.readyState)) this.socket.terminate();
    }, 10000);
  }

	send (message) {
		this.socket.send(message);
	}

	onOpen () {
		console.log('WebSocket opened');
	}

	onError (error) {
		console.log('WebSocket error: ' + error.message);
	}

	onClose () {
		console.log('WebSocket closed');
	}

	onMessage (message) {
		console.log('WebSocket message. ' + message);
	}


  static getToken (tokenName) {
    return Common.getCookie(tokenName || TokenName);
  }



}
