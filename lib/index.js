'use strict';

/**
 * Module dependencies.
 */

var lodash = require('lodash');

/**
 * Constants.
 */

var LEVELS = ['debug', 'info', 'warn', 'error'];

/**
 * Event logger.
 */

function logEvent(ctx, data, request) {
  try {
    if (!data) return;
    var obj = {};
    var msg = '';
    if (ctx.includeTags && Array.isArray(data.tags)) {
      obj.tags = ctx.joinTags ? data.tags.join(ctx.joinTags) : data.tags;
    }

    if (data instanceof Error) {
      ctx.log[ctx.level](data);
      return;
    }

    if (request) {
      obj.requestInfo = {
        method: request.method,
        headers: JSON.stringify(request.headers),
        url: request.url.path,
      }
    }

    var type = typeof data.data;

    if (type === 'string') {
      msg = data.data;
    } else if (ctx.includeData && data.data !== undefined) {
      obj.baseInfo = data.data;
    } else if (ctx.skipUndefined) {
      return;
    }

  } catch (e) {
    console.error(`error in loadEvent, error info is ${e.message}`)
    return;
  }
}

/**
 * Plugin.
 */

function register(server, options, next) {
  try {
    if (!options.logger) {
      return next(new Error('logger required'));
    }

    var log = options.logger;
    var handler = options.handler || function() {};

    delete options.logger;
    delete options.handler;

    options = lodash.defaults(options, {
      includeTags: false,
      includeData: true,
      mergeData: false,
      skipUndefined: true,
    });

    var makeCtx = function(tags, level) {
      if (tags.error) {
        level = 'error';
      } else if (tags.warn) {
        level = 'warn';
      } else if (tags.info) {
        level = 'info';
      } else if (tags.debug) {
        level = 'debug';
      }

      return {
        level: level,
        log: log,
        includeTags: options.includeTags,
        includeData: options.includeData,
        mergeData: options.mergeData,
        skipUndefined: options.skipUndefined,
        joinTags: options.joinTags,
      };
    };

    server.ext('onRequest', function(request, reply) {
      var rlog = request.log;

      request.winston = log;

      request.log = function() {
        rlog.apply(request, arguments);
      };

      LEVELS.forEach(function(level) {
        request.log[level] = function() {
          request.winston[level].apply(request.winston, arguments);
        };
      });

      return reply.continue();
    });

    server.on('log', function(data, tags) {
      var ctx = makeCtx(tags, 'info');

      if (handler.call(ctx, 'log', data, tags)) {
        return;
      }

      logEvent(ctx, data);
    });

    server.on('request', function(request, data, tags) {
      var ctx = makeCtx(tags, 'info');

      if (handler.call(ctx, 'request', request, data, tags)) {
        return;
      }

      logEvent(ctx, data, request);
    });

    server.on('request-internal', function(request, data, tags) {
      var ctx = makeCtx(tags, 'debug');

      if (ctx.level === 'debug') {
        return;
      }

      if (handler.call(ctx, 'request-internal', request, data, tags)) {
        return;
      }

      logEvent(ctx, data, request);
    });

    server.on('request-error', function(request, err) {
      var tags = {};
      var ctx = makeCtx(tags, 'error');

      if (handler.call(ctx, 'request-error', request, err, tags)) {
        return;
      }

      logEvent(ctx, err, request);
    });

    next();
  } catch (e) {
    console.error(`error in registerWinston, error info is ${e.message}`)
    next();
  }
}

/**
 * Attributes.
 */

register.attributes = {
  name: 'hapi-winston',
};

/**
 * Module exports.
 */

exports.log = logEvent;
exports.register = register;