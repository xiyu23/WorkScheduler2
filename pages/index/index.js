//index.js
//获取应用实例
const app = getApp()

Page({
  data: {
    motto: 'Hello World',
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo'),

    cellobj: { date: '25', traDate: '十八', status: '下夜班1'},
    cellobj1: { date: '26', traDate: '十九', status: '' },

    monthData: {
      month: '2018-11',
      status:
        [null,
          null,
          null,
          { date: 1, traDate: '廿四', status: '休' },
          { date: 2, traDate: '廿五', status: '早' },
          { date: 3, traDate: '廿六', status: '中' },
          { date: 4, traDate: '廿七', status: '晚' },
          { date: 5, traDate: '廿八', status: '休' },
          { date: 6, traDate: '廿九', status: '休' },
          { date: 7, traDate: '三十', status: '早' },
          { date: 8, traDate: '十月', status: '中' },
          { date: 9, traDate: '初二', status: '晚' },
          { date: 10, traDate: '初三', status: '休' },
          { date: 11, traDate: '初四', status: '休' }
        ]
    }
  },
  //事件处理函数
  bindViewTap: function() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },
  clickMe: function(){
    this.setData({ motto:'点我干啥'})
  },
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
        })
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
