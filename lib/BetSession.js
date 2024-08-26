const axios = require("axios");
const Cookies = require("./util/Cookies.js");

// constant
const MAGIC_NUMBER = 9700;
const MIN_MULTIPLIER = 1.01;
const MAX_MULTIPLIER = MAGIC_NUMBER / 2;

/* bet session */
class BetSession {

  /* constructor */
  constructor(platform, cookies) {
    // platform and authentication details
    this.platform = platform;
    this.cookies = new Cookies(cookies);

    // initial data
    this.initialBetAmount = undefined;
    this.initialMultiplier = undefined;
    this.initialLowerLimit = 0;

    // variable data
    this.currentBetAmount = undefined;
    this.currentMultiplier = undefined;
    this.currentOption = undefined;
    this.currentUltimateOption = undefined;
    this.currentBalance = undefined;
    this.currentProfit = 0;
    this.currentResult;

    // for ultimate dice
    this.currentLowerLimit = 0;

    // bet and streak counter
    this.count = 0;          // bet count
    this.winStreak = 0;      // track win streak 
    this.lossStreak = 0;     // track loss streak

    // event handlers container, 
    // these arrays will contain all event hanlders functions
    this.winHandlers = [];
    this.lossHandlers = [];
    this.betHandlers = [];
    this.streakOfWinHandlers = [];
    this.streakOfLossHandlers = [];

    // running auto bet
    this.isRunning = false;
    this.isUltimate = false; // true if it is an ultimate dice game
  }

  /* betting */
  async bet(betAmount, multiplier, callback, option = "higher") {
    var url = `https://${this.platform}/process.php`;
    var headers = {
      "Cookie": this.cookies.toString(),
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36", 
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
    };
    var payload = {
      "action": "bet_game_dice",
      "bet_amount": betAmount,
      "payout": multiplier,
      "bet_on": option,
      "csrf_test_name": this.cookies.getCookie("csrf_cookie_name")
    };
    /* making request */
    await axios({
      url: url,
      method: "post",
      headers: headers,
      data: payload
    })
    .then(response => callback(undefined, response.data))
    .catch(err => callback(err, undefined));
  }

  /* ultimate dice betting */
  async betUltimate(betAmount, multiplier, callback, lowerLimit, option = "inside") {
    var url = `https://${this.platform}/process.php`;
    var headers = {
      "Cookie": this.cookies.toString(),
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36", 
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
    };

    // ultimate dice data
    var ultimateDiceData = this.getUltimateUpperLimit(multiplier, lowerLimit);

    // payload
    var payload = {
      "action": "bet_game_ultimate_dice",
      "bet_amount": betAmount,
      "lower_limit": ultimateDiceData.lowerLimit,
      "upper_limit": ultimateDiceData.upperLimit,
      "bet_on": option,
      "csrf_test_name": this.cookies.getCookie("csrf_cookie_name")
    };
    console.log(payload);
    /* making request */
    await axios({
      url: url,
      method: "post",
      headers: headers,
      data: payload
    })
    .then(response => callback(undefined, response.data))
    .catch(err => callback(err, undefined));
  }

  /* auto betting */
  async autoBet(betAmount, multiplier, option = "higher") {
    this.initialBetAmount = betAmount;
    this.initialMultiplier = multiplier;
    this.currentBetAmount = betAmount;
    this.currentMultiplier = multiplier;
    this.currentOption = option;

    // auto bet loop
    this.isRunning = true;
    while(this.isRunning) {
      // betting
      await this.bet(this.currentBetAmount, this.currentMultiplier, (err, response) => {
        // request successfull
        if(response) {
          this.currentResult = response;
          var resultAmount = response["amount"];
          this.currentProfit += resultAmount;
          this.currentBalance = response["balance"];
          // on win
          if(resultAmount > 1) {
            this.winStreak++;
            this.lossStreak = 0;
            this.runBasicHandlers(this.winHandlers);
            this.runStreakOfWinHandlers(); // check win streak
          }
          // on loss
          else {
            this.winStreak = 0;
            this.lossStreak++;
            this.runBasicHandlers(this.lossHandlers);
            this.runStreakOfLossHandlers(); // check loss streak
          }
        }
        // request fails
        else {
          console.log(err);
        }

        // counting bet and running every bet handlers
        this.runBasicHandlers(this.betHandlers)
        this.count++;
      }, this.currentOption);
    }
  }

  /* auto betting */
  async autoBetUltimate(betAmount, multiplier, lowerLimit = 0, option = "inside") {
    this.initialBetAmount = betAmount;
    this.initialMultiplier = multiplier;
    this.initialLowerLimit = lowerLimit;
    this.currentBetAmount = betAmount;
    this.currentMultiplier = multiplier;
    this.currentOption = option;
    this.currentLowerLimit = lowerLimit;

    // auto bet loop
    this.isRunning = true;
    this.isUltimate = true;

    while(this.isRunning) {
      // betting
      await this.betUltimate(this.currentBetAmount, this.currentMultiplier, (err, response) => {
        // request successfull
        if(response) {
          this.currentResult = response;
          var resultAmount = response["amount"];
          this.currentProfit += resultAmount;
          this.currentBalance = response["balance"];
          // on win
          if(resultAmount > 1) {
            this.winStreak++;
            this.lossStreak = 0;
            this.runBasicHandlers(this.winHandlers);
            this.runStreakOfWinHandlers(); // check win streak
          }
          // on loss
          else {
            this.winStreak = 0;
            this.lossStreak++;
            this.runBasicHandlers(this.lossHandlers);
            this.runStreakOfLossHandlers(); // check loss streak
          }
        }
        // request fails
        else {
          console.log(err);
        }

        // counting bet and running every bet handlers
        this.runBasicHandlers(this.betHandlers)
        this.count++;
      }, this.currentLowerLimit, this.currentOption);
    }
  }

  /* operation to perform */

  // getting the value of the upper limit matching to the odd and the lower limit
  getUltimateUpperLimit(multiplier, lowerLimit = 0) {
    var distance = parseFloat((Math.round(MAGIC_NUMBER / multiplier) / 100).toFixed(2));
    var upperLimit = lowerLimit + distance;
    var overflow = 0;
    if(upperLimit > 100)
      overflow = upperLimit - 100;
    return {
      lowerLimit: lowerLimit - overflow,
      upperLimit: upperLimit - overflow,
      multiplier: multiplier
    };
  }

  // get current win chance
  getCurrentWinChance() {
    return parseFloat((Math.round(MAGIC_NUMBER / this.currentMultiplier) / 100).toFixed(2));
  }

  // increase bet amount
  increaseBetAmount(percentage) {
    this.currentBetAmount += (percentage * this.currentBetAmount) / 100;
  }

  // decrease bet amount
  decreaseBetAmount(percentage) {
    this.currentBetAmount -= (percentage * this.currentBetAmount) / 100;
    if(this.currentBetAmount < 0)
      this.currentBetAmount = 0;
  }

  // increase win chance with the percentage
  increaseWinChance(percentage) {
    var increasedWinChance = this.getCurrentWinChance() + ((this.getCurrentWinChance() * percentage) / 100);
    this.multiplier = (increasedWinChance * 1.01) / 96.04;
  }

  // decrease win chance with the percentage 
  decreaseWinChance(percentage) {
    var decreasedWinChance = this.getCurrentWinChance() - ((this.getCurrentWinChance() * percentage) / 100);
    this.multiplier = (decreasedWinChance * 1.01) / 96.04;
  }

  // add bet to the bet amount
  addToBetAmount(amount) {
    this.currentBetAmount += amount;
  }

  // substract from the bet amount
  substractFromTheBetAmount(amount) {
    this.currentBetAmount -= amount;
    if(this.currentBetAmount < 0)
      this.currentBetAmount = 0;
  }

  // add value to win chance
  addToWinChance(incrementValue) {
    this.currentMultiplier = (this.getCurrentWinChance() + incrementValue) * (1.01 / 96.04);
  }

  // substract from the win chance
  substractFromTheWinChance(decrementValue) {
    this.currentMultiplier = (this.getCurrentWinChance() + decrementValue) * (1.01 / 96.04);
  }

  // setting the bet amount 
  setBetAmount(amount) {
    this.currentBetAmount = amount;
  }

  // switching option, (higher, lower)
  switchOverUnder() {
    this.currentOption = (this.currentOption === "higher") ? "lower" : "higher";
    if(this.isUltimate)
      this.currentOption = (this.currentOption === "inside") ? "outside" : "inside";
  }

  // reseting the bet amount to its inital value
  resetBetAmount() {
    this.currentBetAmount = this.initialBetAmount;
  }

  // reseting the win chance 
  resetWinChance() {
    this.currentMultiplier = this.initialMultiplier;
  }

  // stopping auto bet
  stopAutoBet() {
    this.isRunning = false;
  }


  // setting seed value
  async setSeed(seed) {
    var url = `https://${this.platform}/process.php`;
    var headers = {
      "Cookie": this.cookies.toString(),
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36", 
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
    };
    var payload = {
      "action": "change_client_seed",
      "client_seed": seed,
      "csrf_test_name": this.cookies.getCookie("csrf_cookie_name")
    };
    await axios({
      url: url,
      method: "post",
      headers: headers,
      data: payload
    })
    .then(response => {
      // console.log(response);
    })
    .catch(err => console.log({err}));
  }

  // randomize seed value, set randomized seed, length 16
  async randomizeSeed() {
    var newSeed = "";
    for(let i = 0; i < 16; i++) {
      var randomInt = Math.floor(Math.random() * (122 - 97 + 1)) + 97;
      newSeed += String.fromCharCode(randomInt);
    }
    await this.setSeed(newSeed);
  }

  /* attributes getter value */

  // getting the current balance of the account
  getCurrentBalance() {
    return this.currentBalance;
  }

  // getting the bet session current profit of the account
  getCurrentProfit() {
    return this.currentProfit;
  }

  // getting the current option of the bet session
  getCurrentOption() {
    return this.currentOption;
  }

  // getting the current multiplier of the bet session
  getCurrentMultiplier() {
    return this.currentMultiplier;
  }

  /* events */

  /* run function on win */
  onWin(func) {
    this.winHandlers.push(func);
  }

  /* run function on loss */
  onLoss(func) {
    this.lossHandlers.push(func);
  }

  /* run function on every bet */
  onBet(func) {
    this.betHandlers.push(func);
  }

  /* run fuction on every streakof win or loss */
  onStreakOfWin(count, func) {
    this.streakOfWinHandlers.push({count, func});
  }

  onStreakOfLoss(count, func) {
    this.streakOfLossHandlers.push({count, func});
  }

  /* run basic handlers (win, loss, bet) handlers only */
  runBasicHandlers(handlers) {
    for(var func of handlers)
      func.call();
  }

  /* run win streak handlers */
  runStreakOfWinHandlers() {
    for(var handler of this.streakOfWinHandlers) {
      if(this.winStreak % handler.count == 0)
        handler.func.call();
    }
  }

  /* run loss streak handlers */
  runStreakOfLossHandlers() {
    for(var handler of this.streakOfLossHandlers) {
      if(this.lossStreak % handler.count == 0)
        handler.func.call();
    }
  }
}

module.exports = BetSession;