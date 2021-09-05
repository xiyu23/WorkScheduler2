const logger = require('../../utils/log.js');
const Lunar = require('../../utils/lunarConvert.js');

//index.js
//获取应用实例
const app = getApp()
const __DEV__ = true;

//获取屏幕宽度
let winWidth = wx.getSystemInfoSync().windowWidth;
const PREV = 2;
const NEXT = 12;
const MAX_PERIODS = 12;
let NOW;
let PREV_MOST_DATE;
let NEXT_MOST_DATE;
let CURRENT_MONTH_ID;
let TODAY_NO;//2018-12-21

let PERIOD_DAYS = [];//工作周期天数，设置为[1,10]供用户自行选择
for (let i = 1; i <= MAX_PERIODS; i++) {
  PERIOD_DAYS.push(i);
}

console.log('load cache...');
let periods_obj = ReadUserPeriodsSync();//从localStorage读取用户设置的轮班数据 ['白1', '夜1', ...]
console.log('cache:', periods_obj);

let PERIODS = Array.isArray(periods_obj['periods']) ? periods_obj['periods'] : [];
let ANCHOR_DATE = null;
if (periods_obj['date']) {
  // stupid: mp sdk does not support new Date('2021-1-5'), which results in <Date null>
  // console.warn('valid date: ', periods_obj['date']);
  // ANCHOR_DATE = new Date('2021-1-5');

  // TODO: 正则取出2021、1、5
  const strs = periods_obj['date'].split('-');
  const y = parseInt(strs[0]);
  const m = parseInt(strs[1]) - 1;
  const d = parseInt(strs[2]);
  ANCHOR_DATE = new Date(y, m, d);
}

//从local storage读取用户设置的周期
function ReadUserPeriodsSync() {
  let value = {};
  try {
    value = wx.getStorageSync('user_periods')
  } catch (e) {
    console.warn('cannot get user_periods from localstorage')
    value = { date: '', periods: [] };
  }
  return value;
}

let DateWidth = 0;
let DAYS_CHOOSEN = 1;
let inputPeriodsObj = {};

let SPECIAL_DATES = ['春节', '元宵节', '端午节', '中秋节', '重阳节', '除夕'];
let MEANINGFUL_DATES = ['七夕']

function log(msg) {
  if (__DEV__) {
    console.log(msg);
  }
}

function RefreshConstants() {
  NOW = new Date();
  let year = NOW.getFullYear(), month = NOW.getMonth(), date = NOW.getDate();
  PREV_MOST_DATE = new Date(year, month - PREV, 1);//能往前看几个月的日历: 2018-11-1 (PREV==1)
  NEXT_MOST_DATE = new Date(year, month + NEXT, 1);//往后看几个月：2019-12-1 (NEXT==12)
  CURRENT_MONTH_ID = 'm_' + year + '-' + (month + 1);//当前月份ID，用于scroll到今天
  TODAY_NO = year + '-' + (month + 1) + '-' + date;//今日，标志css用
}

Page({
  data: {
    userInfo: {},

    weeks: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    dateWidth: DateWidth,//小方格的宽度
    monthMetadata: [],

    //为标志今天css
    todayNo: TODAY_NO,

    //scroll-view
    toView: CURRENT_MONTH_ID,

    //初始化calendar数据
    switcherPrompt: '打开右侧开关以设置轮班周期',
    switchOn: false,
    promptText: '',
    periodDays: PERIOD_DAYS,//picker view天数选择
    focusIndex: -1
  },
  //事件处理函数
  bindViewTap: function () {
    if (__DEV__) {
      wx.navigateTo({
        url: '../logs/logs'
      })
    }
  },
  //日历跳转至今天
  jumpToToday: function () {
    this.setData({ toView: CURRENT_MONTH_ID });
  },
  //设置轮班周期
  setPeriod: function (e) {
    let isOn = e.detail.value;
    if (isOn) {
      //TODO如果已经设置过,则将数据填充进去
      //this.setData({ switchOn: true, periodDaysChoosen: []}); 
      this.setData({ switcherPrompt: '完成后请关闭右侧开关以生效', switchOn: true, dayIndex: 0, daysChoosen: [{ dayNo: 0, dayStatusPrompt: '今天上什么班?' }] });
      DAYS_CHOOSEN = 1;
    }
    else {
      this.setData({ switcherPrompt: '打开右侧开关以设置轮班周期' })
      //关闭switcher,完成设置轮班周期
      this.setData({ switchOn: false });//关闭设置

      log('DAYS_CHOOSEN=' + DAYS_CHOOSEN)

      if (DAYS_CHOOSEN < 1) {
        return;
      }

      let setPERIODS = [];//user set periods
      let isEmpty = true;
      for (let i = 0; i < DAYS_CHOOSEN; i++) {
        if (inputPeriodsObj[i]) {
          setPERIODS.push(inputPeriodsObj[i]);
          isEmpty = false;
        }
        else {
          setPERIODS.push('');
        }
      }
      inputPeriodsObj = {};


      log(setPERIODS);

      if (isEmpty) {
        log('[info]user set day status finished, but all are empty.');
        return;
      }
      PERIODS = setPERIODS;

      //对当前日历，刷新每天的状态
      dataGenerator.SetPeriods(PERIODS, NOW);
      let l = this.data.monthMetadata.length;
      if (l < 2) {
        log('[fatal error]there should be at least 2 months at any time.');
        return;
      }

      //存储用户数据至缓存
      let that = this;
      wx.setStorage({
        key: "user_periods",
        data: { date: TODAY_NO, periods: PERIODS },
        success: function () {

          log('当前最早日期: ')
          log(that.data.monthMetadata[0])

          let oldestDate = new Date(+that.data.monthMetadata[0].month.substr(0, 4), that.data.monthMetadata[0].month.substr(5) - 1);
          log(oldestDate)
          let newMonthData = [];
          for (let i = 0; i < l; i++) {
            let date = new Date(oldestDate.getFullYear(), oldestDate.getMonth() + i);
            newMonthData.push(dataGenerator.GetMonthlyStatus(date));
          }

          log(newMonthData)

          that.setData({ monthMetadata: newMonthData }, function () {
            log('setData completed');
            wx.showToast({
              title: '设置成功!',
              icon: 'success',
              duration: 2000
            })
          });//:[].push(), why don't work?
        },
        fail: function () {
          wx.showToast({
            title: '写入缓存失败!',
            icon: 'error',
            duration: 2000
          })
        }
      })
    }
  },
  //输入框输入每天状态
  onInputBlur: function (e) {
    let val = e.detail.value;
    let id = e.target.id.replace(/^txtPeriod_/, '');//txtPeriod_0 
    inputPeriodsObj[id] = val;
  },

  //点击键盘右下角的响应
  onInputConfirm: function (e) {
    let id = parseInt(e.target.id.replace(/^txtPeriod_/, ''));
    let hasNext = DAYS_CHOOSEN - 1 != id;
    if (hasNext) {
      this.setData({ focusIndex: id + 1 });
    }
  },
  //选了一个轮班周期天数
  bindChange: function (e) {
    DAYS_CHOOSEN = e.detail.value[0] + 1;
    let days = [];
    for (let i = 0; i < DAYS_CHOOSEN; i++) {
      let prompt = i + '天后';
      if (i == 0) {
        prompt = '今天';
      }
      else if (i == 1) {
        prompt = '明天';
      }
      else if (i == 2) {
        prompt = '后天';
      }
      days.push({ dayNo: i, dayStatusPrompt: prompt + '上什么班?' });
    }
    this.setData({ daysChoosen: days });
  },
  //scroll-view start
  upper: function (e) {
    logger.info('uppper triggered...')

    //上滑至顶部，向前加载月份
    let prevMonthData = LoadPreviousMonthData.call(this);
    if (prevMonthData != null) {
      let innerArr = this.data.monthMetadata;
      innerArr.unshift(prevMonthData);
      this.setData({ monthMetadata: innerArr });
    }
    else {
      logger.info('[info]scroll-view hits upper, no previous month data found.');
    }
  },
  lower: function (e) {
    //下滑至底部，向后加载月份
    let nextMonthData = LoadNextMonthData.call(this);
    if (nextMonthData != null) {
      let innerArr = this.data.monthMetadata;
      innerArr.push(nextMonthData);
      this.setData({ monthMetadata: innerArr });
    }
    else {
      logger.info('[info]scroll-view hits lower, but no next month data found.');
    }
  },
  //scroll-view end

  onShow: function () {
    logger.info('onShow...');

    let now = new Date();
    let dayNO = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();//今日，标志css用
    if (dayNO == TODAY_NO) {
      logger.info('仍是今天，不必重新初始化日历');
      return;
    }

    //刷新时间
    RefreshConstants();

    let that = this;
    RefreshCalendar(that);
  },

  onLoad: function () {
    logger.info('onload...');

    if (app.globalData.userInfo) {
      logger.info('onload has userInfo');
      this.setData({
        userInfo: app.globalData.userInfo,
      })
    } else {
      logger.info('onload has NOT userInfo');
      // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
      // 所以此处加入 callback 以防止这种情况
      app.userInfoReadyCallback = res => {
        this.setData({
          userInfo: res.userInfo,
        });
      }
    }

  },
  getUserInfo: function (e) {
    app.globalData.userInfo = e.detail.userInfo
    this.setData({
      userInfo: e.detail.userInfo,
    })
  }
})

function RefreshCalendar(that) {
  logger.info('query width...');
  wx.createSelectorQuery().select('.calendar').boundingClientRect(function (rect) {
    DateWidth = Math.floor(rect.width / 7);
    logger.info(`query finished, 小方格的宽度是: ${DateWidth}`);
    logger.info(`start to init monthMetadata: ${JSON.stringify(that.data.monthMetadata)}`);
    that.setData({ toView: CURRENT_MONTH_ID, dateWidth: DateWidth, todayNo: TODAY_NO });

    //初始化calendar数据
    if (PERIODS.length < 1 || !(ANCHOR_DATE instanceof Date)) {
      logger.warn(`[info]no cache data found`);
      //return;
    }
    dataGenerator.SetPeriods(PERIODS, ANCHOR_DATE == null ? NOW : ANCHOR_DATE);
    const innerArra = that.data.monthMetadata;
    innerArra.push(dataGenerator.GetMonthlyStatus(NOW));
    let nextMonthData = LoadNextMonthData.call(that);
    if (nextMonthData != null) {
      innerArra.push(nextMonthData);
    }
    that.setData({ monthMetadata: innerArra });//:[].push(), why don't work?
  }).exec();
}

function LoadPreviousMonthData() {
  let currentOldestMonth = -1;
  if (Array.isArray(this.data.monthMetadata) && this.data.monthMetadata.length < 1) {
    logger.error('[error]LoadPreviousMonthData: calendar is empty for now.');
    return null;
  }
  try {
    log(this.data.monthMetadata[0])

    currentOldestMonth = this.data.monthMetadata[0].month;//2018-11
    let year = parseInt(currentOldestMonth.substr(0, 4)),
      month = parseInt(currentOldestMonth.substr(5));

    log('current oldest year=' + year + ',month=' + month)

    let prevMonth = new Date(year, month - 2, 1);
    if (IsInValidPeriod(prevMonth)) {
      log('[info]load previous month limited: ' + prevMonth);
      return null;
    }
    log('[info]ready to load previous month: ' + prevMonth);
    return dataGenerator.GetMonthlyStatus(prevMonth);
  }
  catch (e) {
    logger.error(e);
    return null;
  }
}

function LoadNextMonthData() {
  let currentFurtherMonth = -1;
  if (Array.isArray(this.data.monthMetadata) && this.data.monthMetadata.length < 1) {
    logger.error('[error]LoadNextMonthData: calendar is empty for now.');
    return null;
  }
  try {
    currentFurtherMonth = this.data.monthMetadata[this.data.monthMetadata.length - 1].month;//2018-11
    let year = parseInt(currentFurtherMonth.substr(0, 4)),
      month = parseInt(currentFurtherMonth.substr(5));

    let nextMonth = new Date(year, month, 1);
    if (IsInValidPeriod(nextMonth)) {
      logger.info('[info]load next month limited: ' + nextMonth);
      return null;
    }
    logger.info('[info]ready to load next month: ' + nextMonth);
    return dataGenerator.GetMonthlyStatus(nextMonth);
  }
  catch (e) {
    logger.error(e);
    return null;
  }
}
//限制为日历滚动月份: [-1, +12]
function IsInValidPeriod(date) {
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
    function GetLunarDay(solarDate) {
      if (!(solarDate instanceof Date)) {
        if (typeof solarDate !== 'string') {
          logger.error('[error]GetLunarDay failed, passed in solarDate is neither instance of Date, nor date string:' + solarDate);
          throw new Error('invalid solarDate passed in(must be either string or Date)');
        }
        let arr = solarDate.split('-');
        if (arr.length != 3) {
          logger.error('[error]GetLunarDay failed, invalid solarDate: ' + solarDate);
          throw new Error('invalid solarDate passed in(length invalid)');
        }
        solarDate = new Date(arr[0], (parseInt(arr[1]) + 11) % 12, arr[2]);
      }

      var yy = solarDate.getFullYear();
      var mm = solarDate.getMonth() + 1;
      var dd = solarDate.getDate();
      return Lunar.toFullLunar(yy, mm, dd);
    }




    if (__DEV__) {
      //test cases
      const solarDays = [
        {
          solar: '1989-05-18',
          expectLunarDay: '己巳(蛇)年 四月十四',
        },
        {
          solar: '1990-03-21',
          expectLunarDay: '庚午(马)年 二月廿五',
        },
        {
          solar: '1991-09-15',
          expectLunarDay: '辛未(羊)年 八月初八',
        },
        {
          solar: '1990-10-26',
          expectLunarDay: '庚午(马)年 九月初九',
          festival: '重阳节',
        },
        {
          solar: '1990-11-26',
          expectLunarDay: '庚午(马)年 十月初十',
        },
        {
          solar: '1993-11-11',
          expectLunarDay: '癸酉(鸡)年 九月廿八',
        },
        {
          solar: '2019-05-01',
          expectLunarDay: '己亥(猪)年 三月廿七',
          festival: '劳动节',
        },
        {
          solar: '2019-05-04',
          expectLunarDay: '己亥(猪)年 三月三十',
        },
        {
          solar: '2019-05-24',
          expectLunarDay: '己亥(猪)年 四月二十',
        },
        {
          solar: '2019-06-07',
          expectLunarDay: '己亥(猪)年 五月初五',
          festival: '端午节',
        },
        {
          solar: '2019-08-07',
          expectLunarDay: '己亥(猪)年 七月初七',
          festival: '七夕',
        },
        {
          solar: '2019-09-13',
          expectLunarDay: '己亥(猪)年 八月十五',
          festival: '中秋节',
        },
        {
          solar: '2020-01-01',
          expectLunarDay: '己亥(猪)年 腊月初七',
          festival: '元旦',
        },
        {
          solar: '2020-01-24',
          expectLunarDay: '己亥(猪)年 腊月三十',
          festival: '除夕',
        },
        {
          solar: '2020-01-25',
          expectLunarDay: '庚子(鼠)年 正月初一',
          festival: '春节',
        },
        {
          solar: '2020-06-25',
          expectLunarDay: '庚子(鼠)年 五月初五',
          festival: '端午节',
        },
        {
          solar: '2020-10-01',
          expectLunarDay: '庚子(鼠)年 八月十五',
          festival: '中秋节', // TODO 重合节日
        },
        {
          solar: '2021-01-01',
          expectLunarDay: '庚子(鼠)年 十一月十八',
          festival: '元旦',
        },
        {
          solar: '2021-02-11',
          expectLunarDay: '庚子(鼠)年 腊月三十',
          festival: '除夕',
        },
        {
          solar: '2021-02-12',
          expectLunarDay: '辛丑(牛)年 正月初一',
          festival: '春节',
        },
        {
          solar: '2021-05-01',
          expectLunarDay: '辛丑(牛)年 三月二十',
          festival: '劳动节',
        },
        {
          solar: '2021-06-14',
          expectLunarDay: '辛丑(牛)年 五月初五',
          festival: '端午节',
        },
        {
          solar: '2021-08-14',
          expectLunarDay: '辛丑(牛)年 七月初七',
          festival: '七夕',
        },
        {
          solar: '2021-09-14',
          expectLunarDay: '辛丑(牛)年 八月初八',
        },
        {
          solar: '2021-09-21',
          expectLunarDay: '辛丑(牛)年 八月十五',
          festival: '中秋节',
        },
        {
          solar: '2021-11-02',
          expectLunarDay: '辛丑(牛)年 九月廿八',
        },
        {
          solar: '2021-11-11',
          expectLunarDay: '辛丑(牛)年 十月初七',
        },
        {
          solar: '2022-01-01',
          expectLunarDay: '辛丑(牛)年 十一月廿九',
          festival: '元旦',
        },
        {
          solar: '2022-01-31',
          expectLunarDay: '辛丑(牛)年 腊月廿九',
          festival: '除夕',
        },
        {
          solar: '2022-02-01',
          expectLunarDay: '壬寅(虎)年 正月初一',
          festival: '春节',
        },
        {
          solar: '2022-04-05',
          expectLunarDay: '壬寅(虎)年 三月初五',
          festival: '清明节',
        },
        {
          solar: '2022-05-01',
          expectLunarDay: '壬寅(虎)年 四月初一',
          festival: '劳动节',
        },
        {
          solar: '2022-06-03',
          expectLunarDay: '壬寅(虎)年 五月初五',
          festival: '端午节',
        },
        {
          solar: '2022-08-04',
          expectLunarDay: '壬寅(虎)年 七月初七',
          festival: '七夕',
        },
      ];

      const total = solarDays.length;
      let failedCount = 0;
      for (let i = 0; i < total; i++) {
        const {
          solar,
          expectLunarDay,
          festival: expFestival = '',
        } = solarDays[i];
        const fullLunar = GetLunarDay(solar);
        const {
          fullLunarDayString,
          lunaryDay,
          festival: resFestival,
        } = fullLunar;

        if (fullLunarDayString === expectLunarDay && expFestival === resFestival) {
          continue;
        }

        failedCount++;
        const isLunarDayCorrect = fullLunarDayString === expectLunarDay;
        const isFestivalCorrect = expFestival === resFestival;
        if (!isLunarDayCorrect) {
          logger.warn(`lunar day is wrong: ${fullLunarDayString} !== ${expectLunarDay}`);
        }
        if (!isFestivalCorrect) {
          logger.warn(`festival is wrong: ${expFestival} !== ${resFestival}`);
        }
        logger.error(`case ${i}/${total} failed.
          solarDay: ${solar}
          expectedLunarDay: ${expectLunarDay} (got ${fullLunarDayString})
          expectedFestival: ${expFestival} (got ${resFestival})
        `);
      }

      if (0 < failedCount) {
        logger.error(`Lunar Calculation Cases Failed, only passed: ${total - failedCount} of ${total}`);
      } else {
        logger.info(`All lunar calculation cases(${total}) passed!`);
      }

      //test cases
    }

    //not worked... why!!! after awhile searching, frustrated!!
    return { GetLunarDay: GetLunarDay };


  })();

  //---------------------------农历计算END-----------------------//

  function log(msg) {
    log(msg);
  }

  let periods =

    //['早', '中', '晚', '休', '休'],
    ['白1', '夜1', '下夜1', '白2', '夜2', '休', '休', '休'],
    refPoint = {
      date: '2018-11-25', statusIndex: 2
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
        log('[error]GetMonthlyStatus, invalid Date passed in: ' + date);
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
      log('[error]GetMonthlyStatus, invalid arguments passed in: ' + arguments);
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
      //data for rendering
      const fullLunar = LUNAR.GetLunarDay(date);
      const {
        // fullLunarDayString,
        lunaryDay,
        festival,
      } = fullLunar;
      const specialClass = -1 < SPECIAL_DATES.indexOf(festival) ? 'red' : (-1 < MEANINGFUL_DATES.indexOf(festival) ? 'purple' : '');
      monthStatusArr.push({
        date: (i - padBefore + 1),
        traDate: specialClass ? festival : lunaryDay,
        status: (status1Index < 0 ? '' : periods[(status1Index + i - padBefore) % T]),
        specialclass: specialClass
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
        refDate = new Date(+arr[0], arr[1] - 1, +arr[2]);
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
  function SetPeriods(p, date) {
    periods = p;
    T = p.length;
    refPoint.date = date.ToStringFormat();
    refPoint.statusIndex = 0;
  }
  return { GetMonthlyStatus: GetMonthlyStatus, SetPeriods: SetPeriods };

})();