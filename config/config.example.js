var config = {
  production: {
    session: {
      key: 'the.express.session.id',
      secret: 'somethings.secret'
    },
    database: 'mongodb://user:pwd@url:27017/name',
    facebook: {
      appid: '',
      appsecret: '',
      callback: ''
    },
    twitter: {
      consumerKey: '',
      consumerSecret: '',
      callbackURL: ''
    }
  },
  default: {
    session: {
      key: 'key',
      secret: 'secret'
    },
    database: 'mongodb://localhost:27017/videocloud',
    facebook: {
      appid: '',
      appsecret: '',
      callback: ''
    },
    twitter: {
      consumerKey: '',
      consumerSecret: '',
      callbackURL: ''
    }
  }
}

exports.get = function get(env) {
  return config[env] || config.default;
}
