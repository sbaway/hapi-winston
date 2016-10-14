# hapi-winston
a winstion plugin for winston

###usage

```javascript
#### hapi.js
import hapiWinston from 'hapi-winston'

server.register(
  {
    register: hapiWinston,
    options: { logger },
  },
  (err) => {
    if (err) {
      logger.error(`error in register hapi-winston, error info is: ${err.stack}`)
    }
  }
)


####logger.js
import winston from 'winston'
import RotateFile from 'winston-daily-rotate-file'
import moment from 'moment'

import { config } from '../config'

const winstonConfig = config.winston

/****
winstonConfig like this:
winston: {
  consoleLevel: 'debug',
  fileLevel: 'error',
  filename: 'ad-service.log',
}
****/

winston.setLevels({
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
})

winston.addColors({
  debug: 'blue',
  info: 'cyan',
  warn: 'yellow',
  error: 'red',
})

const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      level: winstonConfig.consoleLevel,
      prettyPrint: true,
      colorize: true,
      silent: false,
      timestamp: () => moment(new Date()).format('YYYY-MM-DD hh:mm:ss'),
    }),
    new (RotateFile)({
      level: winstonConfig.fileLevel,
      prettyPrint: true,
      silent: false,
      colorize: false,
      filename: winstonConfig.filename,
      timestamp: () => moment(new Date()).format('YYYY-MM-DD hh:mm:ss'),
      json: false,
      maxFiles: 10,
      datePattern: '.yyyy-MM-dd',
    }),
  ],
})

export default logger

####inject global function 
global.logger = require('./logger.js')

```
