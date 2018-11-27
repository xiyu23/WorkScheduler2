
//index.js
//获取应用实例
const app = getApp()

//获取屏幕宽度
let winWidth = wx.getSystemInfoSync().windowWidth;
console.log('winWidth='+winWidth);
const PREV = 0;
const NEXT = 12;

const NOW = new Date();
const PREV_MOST_DATE = new Date(NOW.getFullYear(), NOW.getMonth() - PREV, 1);
const NEXT_MOST_DATE = new Date(NOW.getFullYear(), NOW.getMonth() + NEXT, 1);
const CURRENT_MONTH_ID = 'm_' + NOW.getFullYear() + '-' + (NOW.getMonth() + 1);
let PERIOD_DAYS = [];//工作周期天数，设置为[1,10]供用户自行选择
for (let i = 1; i < 11; i++){
  PERIOD_DAYS.push(i);
}
let PERIODS = [];//从localStorage读取用户设置的轮班数据 ['白1', '夜1', ...]
let hasSetCalender = false;
if (0 < PERIODS.length){
  hasSetCalender = true;
}

let inputPeriodsObj = {};
let DateWidth = 0;


Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo'),

    weeks: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    dateWidth: DateWidth,//小方格的宽度
    monthMetadata:[],
    //scroll-view
    toView: 'm_2018-11',

    //初始化calendar数据
    switchOn: false,
    promptText: '',
    setCalendarStep: 1,
    periodDaysChoosen: [],
    periodDays: PERIOD_DAYS,//picker view天数选择

  },
  //事件处理函数
  bindViewTap: function() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },
  //日历跳转至今天
  jumpToToday: function(){
    this.setData({ toView: CURRENT_MONTH_ID});
  },
  //设置轮班周期
  setPeriod: function(e){
    let isOn = e.detail.value;
    if (isOn){
      //TODO如果已经设置过,则将数据填充进去
      this.setData({ switchOn: true, setCalendarStep: 1, periodDaysChoosen: []}); 
    }
    else{
      //关闭switcher,完成设置轮班周期
      let T = this.data.periodDaysChoosen.length;
      if (T < 1) {
        this.setData({switchOn: false});
        return;
      }

      PERIODS = [];
      for (let i = 0; i < T; i++) {
        if (inputPeriodsObj[i]) {
          PERIODS.push(inputPeriodsObj[i]);
        }
        else {
          PERIODS.push('');
        }
      }
      inputPeriodsObj = {};
      this.setData({ switchOn: false });//关闭设置
      console.log(PERIODS);

      //对当前日历，刷新每天的状态
      dataGenerator.SetPeriods(PERIODS, NOW);
      let l = this.data.monthMetadata.length;
      if (l < 2){
        console.log('[fatal error]there should be at least 2 months at any time.');
        return;
      }

      let oldestDate = new Date(this.data.monthMetadata[0].month);
      let newMonthData = [];
      for (let i = 0; i < l; i++){
        let date = new Date(oldestDate.getFullYear(), oldestDate.getMonth()+i);
        newMonthData.push(dataGenerator.GetMonthlyStatus(date));
      }
      this.setData({ monthMetadata: newMonthData});//:[].push(), why don't work?
    }
  },
  //开始设置轮班周期
  startSetting: function(){
    this.setData({ setCalendarStep: 2});
  },
  //输入框输入每天状态
  onInputConfirm: function(e){
    let val = e.detail.value;
    let id = e.target.id.replace(/^txtPeriod_/, '');//txtPeriod_0
    inputPeriodsObj[id] = val;
  },
  //选了一个轮班周期天数
  bindChange: function(e){
    const val = e.detail.value;
    let days = [];
    for (let i = 0; i < val[0]+1; i++){
      days.push(i);
    }
    this.setData({ periodDaysChoosen: days});
  },
  //scroll-view start
  upper: function (e) {
    console.log(e)
    //上滑至顶部，向前加载月份
    let prevMonthData = LoadPreviousMonthData.call(this);
    if (prevMonthData != null){
      let innerArr = this.data.monthMetadata;
      innerArr.unshift(prevMonthData);
      this.setData({monthMetadata:innerArr});
    }
    else{
      console.log('[info]scroll-view hits upper, no previous month data found.');
    }
  },
  lower: function (e) {
    console.log(e)
    //下滑至底部，向后加载月份
    let nextMonthData = LoadNextMonthData.call(this);
    if (nextMonthData != null) {
      let innerArr = this.data.monthMetadata;
      innerArr.push(nextMonthData);
      this.setData({ monthMetadata: innerArr });
    }
    else {
      console.log('[info]scroll-view hits lower, but no next month data found.');
    }
  },
  //scroll-view end

  onLoad: function () {
    //let _this = this;
    if (app.globalData.userInfo) {
      console.log('onload 1');
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      })
      wx.getLocation({
        type: 'wgs84',
        success: (res) => {
          if (!res){
            console.log('cannot get position');
            return;
          }
          let latitude = res.latitude // 纬度
          let longitude = res.longitude // 经度
          console.log(longitude+', ' + latitude);
          
          this.setData({latitude:latitude, longitude:longitude});
        }
      })
    } else if (this.data.canIUse){
      console.log('onload 2');
      // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
      // 所以此处加入 callback 以防止这种情况
      app.userInfoReadyCallback = res => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        });

        //提示信息
        let promptMsg = 'hi';
        if (res.userInfo.nickName){
          promptMsg += ' '+ res.userInfo.nickName + (res.userInfo.gender == 1 ? '小哥哥' : '小姐姐');
        }
        console.log(res.userInfo);
        promptMsg += ', 现在开始设置轮班周期吧？';
        this.setData({promptText:promptMsg});
      }
      wx.getLocation({
        type: 'wgs84',
        success: (res) => {
          if (!res) {
            console.log('cannot get position');
            return;
          }
          let latitude = res.latitude // 纬度
          let longitude = res.longitude // 经度
          console.log(longitude + ', ' + latitude);

          this.setData({ latitude: latitude, longitude: longitude });
        }
      })
    } else {
      console.log('onload 3');
      // 在没有 open-type=getUserInfo 版本的兼容处理
      wx.getUserInfo({
        success: res => {
          app.globalData.userInfo = res.userInfo
          this.setData({
            userInfo: res.userInfo,
            hasUserInfo: true
          })
        }
      })
    }

    let that =this;

    console.log('[info]query width...');
    wx.createSelectorQuery().select('.calendar').boundingClientRect(function (rect) {
      DateWidth = Math.floor(rect.width / 7);
      console.log('[info]query finished, 小方格的宽度是:' + DateWidth);
      console.log('[info]start to init monthMetadata ...');

      //初始化calendar数据
      dataGenerator.SetPeriods(PERIODS, NOW);
      let innerArra = that.data.monthMetadata;
      innerArra.push(dataGenerator.GetMonthlyStatus(NOW));
      let nextMonthData = LoadNextMonthData.call(that);
      if (nextMonthData != null) {
        innerArra.push(nextMonthData);
      }
      that.setData({ monthMetadata: innerArra, toView: CURRENT_MONTH_ID, dateWidth: DateWidth});//:[].push(), why don't work?
    }).exec();
    console.log('[info]please wait...'); 
    
  },
  getUserInfo: function(e) {
    console.log(e)
    app.globalData.userInfo = e.detail.userInfo
    this.setData({
      userInfo: e.detail.userInfo,
      hasUserInfo: true
    })
  }
})

function LoadPreviousMonthData(){
  let currentOldestMonth = -1;
  if (Array.isArray(this.data.monthMetadata) && this.data.monthMetadata.length < 1){
    console.log('[error]LoadPreviousMonthData: calendar is empty for now.');
    return null;
  }
  try{
    currentOldestMonth = this.data.monthMetadata[0].month;//2018-11
    let year = parseInt(currentOldestMonth.substr(0, 4)),
       month = parseInt(currentOldestMonth.substr(5));
    
    let prevMonth = new Date(year, month-2, 1);
    if (IsInValidPeriod(prevMonth)){
      console.log('[info]load previous month limited: ' + prevMonth);
      return null;
    }
    console.log('[info]ready to load previous month: ' + prevMonth);
    return dataGenerator.GetMonthlyStatus(prevMonth);
  }
  catch(e){
    console.log(e);
    return null;
  }
}

function LoadNextMonthData() {
  let currentFurtherMonth = -1;
  if (Array.isArray(this.data.monthMetadata) && this.data.monthMetadata.length < 1) {
    console.log('[error]LoadNextMonthData: calendar is empty for now.');
    return null;
  }
  try {
    currentFurtherMonth = this.data.monthMetadata[this.data.monthMetadata.length-1].month;//2018-11
    let year = parseInt(currentFurtherMonth.substr(0, 4)),
      month = parseInt(currentFurtherMonth.substr(5));

    let nextMonth = new Date(year, month, 1);
    if (IsInValidPeriod(nextMonth)) {
      console.log('[info]load next month limited: ' + nextMonth);
      return null;
    }
    console.log('[info]ready to load next month: ' + nextMonth);
    return dataGenerator.GetMonthlyStatus(nextMonth);
  }
  catch (e) {
    console.log(e);
    return null;
  }
}
//限制为日历滚动月份: [-1, +12]
function IsInValidPeriod(date){
  return date < PREV_MOST_DATE || NEXT_MOST_DATE < date;
}



/* 数据生成器 
调用方法：let monthData = dataGenerator.GetMonthlyStatus(2019, 01);
*/
let dataGenerator = (function () {
  //---------------------------农历计算START-----------------------//
  //ALSO NOT WORKED...
  //import * as LUNA from "./lunar.js";
  let LUNAR = (function () {
    function log(msg) {
      console.log(msg);
    }

    function GetFestival(calendar) {
      if (!(calendar instanceof Date)) {
        if (typeof calendar !== 'string') {
          console.log('[error]GetFestival failed, passed in calendar is neither instance of Date, nor date string:' + calendar);
          return '';
        }
        let arr = calendar.split('-');
        if (arr.length != 3) {
          log('[error]GetFestival failed, invalid calendar: ' + calendar);
          return '';
        }
        calendar = new Date(arr[0], arr[1] - 1, arr[2]);
      }
      var month = calendar.getMonth();
      var date = calendar.getDate();
      if ((month == 0) && (date == 1)) return "元旦";
      if ((month == 2) && (date == 12)) return "植树节";
      if ((month == 3) && (date == 5)) return "清明节";
      if ((month == 4) && (date == 1)) return "国际劳动节";
      if ((month == 4) && (date == 4)) return "青年节";
      if ((month == 5) && (date == 1)) return "国际儿童节";
      if ((month == 7) && (date == 1)) return "建军节";
      if ((month == 7) && (date == 16)) return "七夕情人节";
      if ((month == 9) && (date == 1)) return "国庆节";
      if ((month == 11) && (date == 24)) return "平安夜";
      if ((month == 11) && (date == 25)) return "圣诞节";

      return '';
    }

    /*农历部分*/
    var CalendarData = new Array(100);
    var madd = new Array(12);
    var tgString = "甲乙丙丁戊己庚辛壬癸";
    var dzString = "子丑寅卯辰巳午未申酉戌亥";
    var numString = "一二三四五六七八九十";
    var monString = "正二三四五六七八九十冬腊";
    var weekString = "日一二三四五六";
    var sx = "鼠牛虎兔龙蛇马羊猴鸡狗猪";
    var cYear, cMonth, cDay, TheDate;
    CalendarData = new Array(0xA4B, 0x5164B, 0x6A5, 0x6D4, 0x415B5, 0x2B6, 0x957, 0x2092F, 0x497, 0x60C96, 0xD4A, 0xEA5, 0x50DA9, 0x5AD, 0x2B6, 0x3126E, 0x92E, 0x7192D, 0xC95, 0xD4A, 0x61B4A, 0xB55, 0x56A, 0x4155B, 0x25D, 0x92D, 0x2192B, 0xA95, 0x71695, 0x6CA, 0xB55, 0x50AB5, 0x4DA, 0xA5B, 0x30A57, 0x52B, 0x8152A, 0xE95, 0x6AA, 0x615AA, 0xAB5, 0x4B6, 0x414AE, 0xA57, 0x526, 0x31D26, 0xD95, 0x70B55, 0x56A, 0x96D, 0x5095D, 0x4AD, 0xA4D, 0x41A4D, 0xD25, 0x81AA5, 0xB54, 0xB6A, 0x612DA, 0x95B, 0x49B, 0x41497, 0xA4B, 0xA164B, 0x6A5, 0x6D4, 0x615B4, 0xAB6, 0x957, 0x5092F, 0x497, 0x64B, 0x30D4A, 0xEA5, 0x80D65, 0x5AC, 0xAB6, 0x5126D, 0x92E, 0xC96, 0x41A95, 0xD4A, 0xDA5, 0x20B55, 0x56A, 0x7155B, 0x25D, 0x92D, 0x5192B, 0xA95, 0xB4A, 0x416AA, 0xAD5, 0x90AB5, 0x4BA, 0xA5B, 0x60A57, 0x52B, 0xA93, 0x40E95);
    madd[0] = 0;
    madd[1] = 31;
    madd[2] = 59;
    madd[3] = 90;
    madd[4] = 120;
    madd[5] = 151;
    madd[6] = 181;
    madd[7] = 212;
    madd[8] = 243;
    madd[9] = 273;
    madd[10] = 304;
    madd[11] = 334;

    function GetBit(m, n) {
      return (m >> n) & 1;
    }

    function e2c() {
      TheDate = (arguments.length != 3) ? new Date() : new Date(arguments[0], arguments[1], arguments[2]);
      var total, m, n, k;
      var isEnd = false;
      var tmp = TheDate.getYear();
      if (tmp < 1900) {
        tmp += 1900;
      }
      total = (tmp - 1921) * 365 + Math.floor((tmp - 1921) / 4) + madd[TheDate.getMonth()] + TheDate.getDate() - 38;
      if (TheDate.getYear() % 4 == 0 && TheDate.getMonth() > 1) {
        total++;
      }
      for (m = 0; ; m++) {
        k = (CalendarData[m] < 0xfff) ? 11 : 12;
        for (n = k; n >= 0; n--) {
          if (total <= 29 + GetBit(CalendarData[m], n)) {
            isEnd = true;
            break;
          }
          total = total - 29 - GetBit(CalendarData[m], n);
        }
        if (isEnd) break;
      }
      cYear = 1921 + m;
      cMonth = k - n + 1;
      cDay = total;
      if (k == 12) {
        if (cMonth == Math.floor(CalendarData[m] / 0x10000) + 1) {
          cMonth = 1 - cMonth;
        }
        if (cMonth > Math.floor(CalendarData[m] / 0x10000) + 1) {
          cMonth--;
        }
      }
    }

    function GetcDateString() {
      var tmp = "";
      tmp += tgString.charAt((cYear - 4) % 10);
      tmp += dzString.charAt((cYear - 4) % 12);
      tmp += "(";
      tmp += sx.charAt((cYear - 4) % 12);
      tmp += ")年 ";
      if (cMonth < 1) {
        tmp += "(闰)";
        tmp += monString.charAt(-cMonth - 1);
      } else {
        tmp += monString.charAt(cMonth - 1);
      }
      tmp += "月";
      tmp += (cDay < 11) ? "初" : ((cDay < 20) ? "十" : ((cDay < 30) ? "廿" : "三十"));
      if (cDay % 10 != 0 || cDay == 10) {
        tmp += numString.charAt((cDay - 1) % 10);
      }
      return tmp;
    }


    //根据阳历日期，获取农历日期
    //solarDate - Date or String
    function GetLunarDay(solarDate) {
      if (!(solarDate instanceof Date)) {
        if (typeof solarDate !== 'string') {
          console.log('[error]GetLunarDay failed, passed in solarDate is neither instance of Date, nor date string:' + solarDate);
          return '';
        }
        let arr = solarDate.split('-');
        if (arr.length != 3) {
          log('[error]GetLunarDay failed, invalid solarDate: ' + solarDate);
          return '';
        }
        return GetLunarDay(arr[0], arr[1], arr[2]);
      }

      var yy = solarDate.getFullYear();
      var mm = solarDate.getMonth() + 1;
      var dd = solarDate.getDate();
      return GetLunarDay(yy, mm, dd);

      function GetLunarDay(solarYear, solarMonth, solarDay) {
        //solarYear = solarYear<1900?(1900+solarYear):solarYear;
        if (solarYear < 1980 || solarYear > 2020) {
          return "";
        } else {
          solarMonth = (parseInt(solarMonth) > 0) ? (solarMonth - 1) : 11;
          e2c(solarYear, solarMonth, solarDay);
          return GetcDateString();
        }
      }
    }

    //根据阳历日期，获取农历日子，仅返回初一~三十（初一则显示月份）
    function GetOnlyLunarDay(date) {
      let lunar = GetLunarDay(date);
      if (!lunar) {
        return lunar;
      }
      //lunar=辛未(羊)年 八月初八
      lunar = lunar.replace(/^.*?\s(.*)$/, '$1');//八月初八
      let lunarDay = lunar.replace(/^.*?(.{2})$/, '$1');
      let lunarMonth = lunar.replace(/^(.*?)(.{2})$/, '$1');
      return lunarDay == "初一" ? lunarMonth : lunarDay;
    }

    //not worked... why!!! after awhile searching, frustrated!!
    //export {GetLunarDay, GetFestival, GetOnlyLunarDay};
    return { GetLunarDay: GetLunarDay, GetFestival: GetFestival, GetOnlyLunarDay: GetOnlyLunarDay };
    //test cases
    /*
    log(GetLunarDay('1989-05-18'));
    log(GetLunarDay('1991-09-15'));
    log(GetLunarDay('2018-11-25'));
    log(GetLunarDay('1990-05-27'));
    log(GetLunarDay('2020-01-25'));

    log(GetFestival('1991-09-15'));
    log(GetFestival('2018-11-25'));
    log(GetFestival('1990-05-27'));
    log(GetFestival('1990-10-01'));
    log(GetFestival('2018-01-01'));

    log(GetOnlyLunarDay('1989-05-18'));
    log(GetOnlyLunarDay('1991-09-15'));
    log(GetOnlyLunarDay('2018-11-25'));
    log(GetOnlyLunarDay('1990-05-27'));
    log(GetOnlyLunarDay('2020-01-25'));
    */
    //test cases

  })();

  //---------------------------农历计算END-----------------------//

  function log(msg) {
    console.log(msg);
  }

  let periods =

    //['早', '中', '晚', '休', '休'],
    ['白1', '夜1', '下夜1', '白2', '夜2', '休','休','休'],
    refPoint = {
      date:'2018-11-25', statusIndex: 2
      //date: '2018-5-3', statusIndex: 2
    };
  //轮班周期
  let T = periods.length;

  if (!refPoint['date']) {//未指定轮班参考日期
    refPoint.date = '';
    statusIndex = -1;
  }
  else {//检查数据
    let index = parseInt(refPoint['statusIndex']);
    if (isNaN(index) || index < 0 || T - 1 < index) {
      log('[error]invalid refPoint.statusIndex: ' + refPoint.statusIndex);
      refPoint.date = '';
      statusIndex = -1;
    }
    else {
      refPoint['statusIndex'] = index;
    }
  }


  //2018年11月25日08:55:11 => 2018-11-01
  let now = new Date();
  now.setDate(1);
  now.setHours(0);
  now.setMinutes(0);
  now.setSeconds(0);
  now.setMilliseconds(0);
  let todayYear = now.getFullYear(),
    todayMonth = now.getMonth() + 1,
    todayDay = now.getDate();

  //获取指定年月的轮班数据
  //input:
  //  year - 2018
  //  month - 11 (1-based)
  //
  //output:
  //  { month: '2018-11', status: [ { date: 25, traDate: '十八', statusIndex: 2 }, ...] }
  function GetMonthlyStatus(year, month) {
    if (arguments.length == 1) {//assuming Date
      let date = arguments[0];
      if (!(date instanceof Date)) {
        console.log('[error]GetMonthlyStatus, invalid Date passed in: ' + date);
        return [];
      }
      year = date.getFullYear();
      month = date.getMonth() + 1;
    }
    else if (arguments.length == 2) {//assuming Number
      year = parseInt(year);
      month = parseInt(month);
    }
    else {
      console.log('[error]GetMonthlyStatus, invalid arguments passed in: ' + arguments);
      return [];
    }
    //给定年月第一天
    let firstDate = new Date(year, month - 1, 1);

    //根据指定日期的状态，推算本月第一天的状态
    let status1Index = -1;
    if (!!refPoint.date) {
      let diffDays = GetDiffDays(firstDate, refPoint.date);
      status1Index = diffDays < 0 ? (refPoint.statusIndex - (-diffDays % T) + T) % T : (refPoint.statusIndex + (diffDays % T)) % T;
    }


    //计算第一行pad天数
    let padBefore = (firstDate.getDay() + 6) % 7;

    //计算本月天数
    firstDate.setMonth(month);
    firstDate.setDate(0);


    let daysInCurrentMonth = firstDate.getDate();
    firstDate.setDate(1);
    firstDate.setMonth(month - 1);

    //本月所需要的完整天数
    let totalCell = Math.floor((padBefore + daysInCurrentMonth + 6) / 7) * 7;

    //本月最后一行pad天数
    let padAfter = totalCell - padBefore - daysInCurrentMonth;

    let monthStatusArr = [];//[{ date: 25, traDate: '十八', statusIndex: 2 }, ...]
    for (let i = 0; i < totalCell; i++) {
      if (i < padBefore || (totalCell - padAfter - 1) < i) {
        monthStatusArr.push(null);
        continue;
      }

      let date = firstDate.AddDays(i - padBefore);//2018-11-25
      //detail
      //monthStatusArr.push({date:date.ToStringFormat(), traDate:LUNAR.GetOnlyLunarDay(date), statusIndex: (status1Index < 0 ? '' : (status1Index+i - padBefore)%T)});


      //data for rendering
      monthStatusArr.push({
        date: (i - padBefore + 1),
        traDate: LUNAR.GetOnlyLunarDay(date),
        status: (status1Index < 0 ? '' : periods[(status1Index + i - padBefore) % T])
      });
    }

    let strMonthInfo = year + '-' + month;
    return { month: strMonthInfo, status: monthStatusArr };

    //date1 < refDate, return 负值
    //refDate <= date1, return 正值
    function GetDiffDays(date1, refDate) {
      if (!(date1 instanceof Date)) {
        let arr = date1.split('-');
        if (arr.length != 3) {
          log('[error]invalid date1: ' + date1);
          return 0;
        }
        date1 = new Date(arr[0], arr[1] - 1, arr[2]);
      }
      if (!(refDate instanceof Date)) {
        let arr = refDate.split('-');
        if (arr.length != 3) {
          log('[error]invalid date1: ' + refDate);
          return 0;
        }
        refDate = new Date(arr[0], arr[1] - 1, arr[2]);
      }

      let iDays = parseInt(Math.abs(date1.getTime() - refDate.getTime()) / 1000 / 60 / 60 / 24)
      return date1 < refDate ? -iDays : iDays;
    }
  }

  //init date prototype
  (function () {
    if (!Date.prototype.AddDays) {
      Date.prototype.AddDays = function (i) {
        return new Date(this.getFullYear(), this.getMonth(), this.getDate() + i);
      };
    }
    if (!Date.prototype.ToStringFormat) {
      Date.prototype.ToStringFormat = function () {
        return this.getFullYear() + '-' + (this.getMonth() + 1) + '-' + this.getDate();
      };
    }
  }());

  //设置轮班状态
  //p = ['白',...]
  //date = date object
  function SetPeriods(p, date){
    periods = p;
    T = p.length;
    refPoint.date = date.ToStringFormat();
    refPoint.statusIndex = 0;

    console.log(p);
    console.log(date);
  }
  //log(GetMonthlyStatus(2019, 01));
  return { GetMonthlyStatus: GetMonthlyStatus, SetPeriods: SetPeriods };

})();