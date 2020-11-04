
const TokenName = 'necrud_token';


class Common {

  static async fetch (endpoint, method, body) {
    let url = `/${endpoint}`.replace(/^\/\//, '/');
    let settings = {
      method: method ? method.toUpperCase() : 'GET',
      cache: 'no-cache',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      body: (body ? JSON.stringify(body) : undefined)
    };
    let response = await fetch(url, settings);
    let error;
    let data;
    try {
      data = await response.json();
    }
    catch (err) {
      error = err.toString();
    }
    if (response.ok) return data;
    throw new Error(error || data.error || `Fetch failed [${response.status}] ${response.statusText}`);
  }

  static getCookie (cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }

  static appendMessage (message) {
  	UI.elementAppendHTML('messages', message + '<br>');
  }

  static appendError (error) {
  	UI.elementAppendHTML('errors', error + '<br>');
  }

  static clearAll () {
    UI.elementHTML('messages', '');
    UI.elementHTML('errors', '');
  }

}
