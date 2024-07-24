/* cookies manager class */
class Cookies {

  /* constructor */
  constructor(cookiesString) {
    this.cookiesString = cookiesString.trim();
    this.cookiesObject = this.convertCookiesStringToObject();
  }

  /* string representation of this cookies class */
  toString() {
    return this.cookiesString;
  }

  /* object representation of thie cookies class */
  toObject() {
    return this.cookiesObject;
  }

  /* setting the whole cookies object from a string */
  set(cookiesString) {
    this.cookiesString = cookiesString.trim();
    this.cookiesObject = this.convertCookiesStringToObject();
  }

  /* getting the whole cookies object */
  get() {
    return this.cookiesString;
  }

  /* converting the string cookies to object */
  convertCookiesStringToObject() {
    var resultCookiesObject = {};
    if(this.cookiesString.length > 1) {
      var splittedCookies = this.cookiesString.split(";");
      for(var cookieString of splittedCookies) {
        var cookieCouple = cookieString.trim().split("=");
        resultCookiesObject[cookieCouple[0]] = cookieCouple[1];
      }
    }
    return resultCookiesObject;
  }

  /* converting the cookies object to string */
  convertCookiesObjectToString() {
    var cookiesArray = [];
    for(var cookie in this.cookiesObject)
      cookiesArray.push(`${cookie}=${this.cookiesObject[cookie]}`);
    return cookiesArray.join(";");
  }

  /* adding or updating cookie value */
  setCookie(cookieName, cookieValue) {
    this.cookiesObject[cookieName] = cookieValue;
    this.cookiesString = this.convertCookiesObjectToString();
  }

  /* getting cookie value */
  getCookie(cookieName) {
    return this.cookiesObject[cookieName];
  }
}

module.exports = Cookies;