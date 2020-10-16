
class UI {
  static ready (handler) {
    window.addEventListener('load', handler);
  }

  static element (id) {
    return document.getElementById(id);
  }

  static elements (className) {
    return document.getElementsByClassName(className);
  }

  static elementHTML (id, html) {
    UI.element(id).innerHTML = html;
  }

  static elementAppendHTML (id, html) {
    UI.element(id).innerHTML += html;
  }

  static inputValue (id, value) {
    if (value === undefined) return UI.element(id).value;
    UI.element(id).value = value;
  }

  static clickAction (id, action) {
    UI.element(id).addEventListener('click', action);
  }

  static changeAction (id, action) {
    UI.element(id).addEventListener('change', action);
  }
}
