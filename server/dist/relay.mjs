import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/ws/lib/constants.js
var require_constants = __commonJS({
  "node_modules/ws/lib/constants.js"(exports, module) {
    "use strict";
    var BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
    var hasBlob = typeof Blob !== "undefined";
    if (hasBlob) BINARY_TYPES.push("blob");
    module.exports = {
      BINARY_TYPES,
      CLOSE_TIMEOUT: 3e4,
      EMPTY_BUFFER: Buffer.alloc(0),
      GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
      hasBlob,
      kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
      kListener: Symbol("kListener"),
      kStatusCode: Symbol("status-code"),
      kWebSocket: Symbol("websocket"),
      NOOP: () => {
      }
    };
  }
});

// node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS({
  "node_modules/ws/lib/buffer-util.js"(exports, module) {
    "use strict";
    var { EMPTY_BUFFER } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    function concat(list, totalLength) {
      if (list.length === 0) return EMPTY_BUFFER;
      if (list.length === 1) return list[0];
      const target = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (let i = 0; i < list.length; i++) {
        const buf = list[i];
        target.set(buf, offset);
        offset += buf.length;
      }
      if (offset < totalLength) {
        return new FastBuffer(target.buffer, target.byteOffset, offset);
      }
      return target;
    }
    function _mask(source, mask, output, offset, length) {
      for (let i = 0; i < length; i++) {
        output[offset + i] = source[i] ^ mask[i & 3];
      }
    }
    function _unmask(buffer, mask) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] ^= mask[i & 3];
      }
    }
    function toArrayBuffer(buf) {
      if (buf.length === buf.buffer.byteLength) {
        return buf.buffer;
      }
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
    }
    function toBuffer(data) {
      toBuffer.readOnly = true;
      if (Buffer.isBuffer(data)) return data;
      let buf;
      if (data instanceof ArrayBuffer) {
        buf = new FastBuffer(data);
      } else if (ArrayBuffer.isView(data)) {
        buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
      } else {
        buf = Buffer.from(data);
        toBuffer.readOnly = false;
      }
      return buf;
    }
    module.exports = {
      concat,
      mask: _mask,
      toArrayBuffer,
      toBuffer,
      unmask: _unmask
    };
    if (!process.env.WS_NO_BUFFER_UTIL) {
      try {
        const bufferUtil = __require("bufferutil");
        module.exports.mask = function(source, mask, output, offset, length) {
          if (length < 48) _mask(source, mask, output, offset, length);
          else bufferUtil.mask(source, mask, output, offset, length);
        };
        module.exports.unmask = function(buffer, mask) {
          if (buffer.length < 32) _unmask(buffer, mask);
          else bufferUtil.unmask(buffer, mask);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/limiter.js
var require_limiter = __commonJS({
  "node_modules/ws/lib/limiter.js"(exports, module) {
    "use strict";
    var kDone = Symbol("kDone");
    var kRun = Symbol("kRun");
    var Limiter = class {
      /**
       * Creates a new `Limiter`.
       *
       * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
       *     to run concurrently
       */
      constructor(concurrency) {
        this[kDone] = () => {
          this.pending--;
          this[kRun]();
        };
        this.concurrency = concurrency || Infinity;
        this.jobs = [];
        this.pending = 0;
      }
      /**
       * Adds a job to the queue.
       *
       * @param {Function} job The job to run
       * @public
       */
      add(job) {
        this.jobs.push(job);
        this[kRun]();
      }
      /**
       * Removes a job from the queue and runs it if possible.
       *
       * @private
       */
      [kRun]() {
        if (this.pending === this.concurrency) return;
        if (this.jobs.length) {
          const job = this.jobs.shift();
          this.pending++;
          job(this[kDone]);
        }
      }
    };
    module.exports = Limiter;
  }
});

// node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS({
  "node_modules/ws/lib/permessage-deflate.js"(exports, module) {
    "use strict";
    var zlib = __require("zlib");
    var bufferUtil = require_buffer_util();
    var Limiter = require_limiter();
    var { kStatusCode } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    var TRAILER = Buffer.from([0, 0, 255, 255]);
    var kPerMessageDeflate = Symbol("permessage-deflate");
    var kTotalLength = Symbol("total-length");
    var kCallback = Symbol("callback");
    var kBuffers = Symbol("buffers");
    var kError = Symbol("error");
    var zlibLimiter;
    var PerMessageDeflate2 = class {
      /**
       * Creates a PerMessageDeflate instance.
       *
       * @param {Object} [options] Configuration options
       * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
       *     for, or request, a custom client window size
       * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
       *     acknowledge disabling of client context takeover
       * @param {Number} [options.concurrencyLimit=10] The number of concurrent
       *     calls to zlib
       * @param {Boolean} [options.isServer=false] Create the instance in either
       *     server or client mode
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
       *     use of a custom server window size
       * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
       *     disabling of server context takeover
       * @param {Number} [options.threshold=1024] Size (in bytes) below which
       *     messages should not be compressed if context takeover is disabled
       * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
       *     deflate
       * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
       *     inflate
       */
      constructor(options) {
        this._options = options || {};
        this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
        this._maxPayload = this._options.maxPayload | 0;
        this._isServer = !!this._options.isServer;
        this._deflate = null;
        this._inflate = null;
        this.params = null;
        if (!zlibLimiter) {
          const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
          zlibLimiter = new Limiter(concurrency);
        }
      }
      /**
       * @type {String}
       */
      static get extensionName() {
        return "permessage-deflate";
      }
      /**
       * Create an extension negotiation offer.
       *
       * @return {Object} Extension parameters
       * @public
       */
      offer() {
        const params = {};
        if (this._options.serverNoContextTakeover) {
          params.server_no_context_takeover = true;
        }
        if (this._options.clientNoContextTakeover) {
          params.client_no_context_takeover = true;
        }
        if (this._options.serverMaxWindowBits) {
          params.server_max_window_bits = this._options.serverMaxWindowBits;
        }
        if (this._options.clientMaxWindowBits) {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        } else if (this._options.clientMaxWindowBits == null) {
          params.client_max_window_bits = true;
        }
        return params;
      }
      /**
       * Accept an extension negotiation offer/response.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Object} Accepted configuration
       * @public
       */
      accept(configurations) {
        configurations = this.normalizeParams(configurations);
        this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
        return this.params;
      }
      /**
       * Releases all resources used by the extension.
       *
       * @public
       */
      cleanup() {
        if (this._inflate) {
          this._inflate.close();
          this._inflate = null;
        }
        if (this._deflate) {
          const callback = this._deflate[kCallback];
          this._deflate.close();
          this._deflate = null;
          if (callback) {
            callback(
              new Error(
                "The deflate stream was closed while data was being processed"
              )
            );
          }
        }
      }
      /**
       *  Accept an extension negotiation offer.
       *
       * @param {Array} offers The extension negotiation offers
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsServer(offers) {
        const opts = this._options;
        const accepted = offers.find((params) => {
          if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && (typeof params.client_max_window_bits === "number" ? opts.clientMaxWindowBits > params.client_max_window_bits : !params.client_max_window_bits)) {
            return false;
          }
          return true;
        });
        if (!accepted) {
          throw new Error("None of the extension offers can be accepted");
        }
        if (opts.serverNoContextTakeover) {
          accepted.server_no_context_takeover = true;
        }
        if (opts.clientNoContextTakeover) {
          accepted.client_no_context_takeover = true;
        }
        if (typeof opts.serverMaxWindowBits === "number") {
          accepted.server_max_window_bits = opts.serverMaxWindowBits;
        }
        if (typeof opts.clientMaxWindowBits === "number") {
          accepted.client_max_window_bits = opts.clientMaxWindowBits;
        } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
          delete accepted.client_max_window_bits;
        }
        return accepted;
      }
      /**
       * Accept the extension negotiation response.
       *
       * @param {Array} response The extension negotiation response
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsClient(response) {
        const params = response[0];
        if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
          throw new Error('Unexpected parameter "client_no_context_takeover"');
        }
        if (!params.client_max_window_bits) {
          if (typeof this._options.clientMaxWindowBits === "number") {
            params.client_max_window_bits = this._options.clientMaxWindowBits;
          }
        } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
          throw new Error(
            'Unexpected or invalid parameter "client_max_window_bits"'
          );
        }
        return params;
      }
      /**
       * Normalize parameters.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Array} The offers/response with normalized parameters
       * @private
       */
      normalizeParams(configurations) {
        configurations.forEach((params) => {
          Object.keys(params).forEach((key) => {
            let value = params[key];
            if (value.length > 1) {
              throw new Error(`Parameter "${key}" must have only a single value`);
            }
            value = value[0];
            if (key === "client_max_window_bits") {
              if (value !== true) {
                const num = +value;
                if (!Number.isInteger(num) || num < 8 || num > 15) {
                  throw new TypeError(
                    `Invalid value for parameter "${key}": ${value}`
                  );
                }
                value = num;
              } else if (!this._isServer) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else if (key === "server_max_window_bits") {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
              value = num;
            } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
              if (value !== true) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else {
              throw new Error(`Unknown parameter "${key}"`);
            }
            params[key] = value;
          });
        });
        return configurations;
      }
      /**
       * Decompress data. Concurrency limited.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      decompress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._decompress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Compress data. Concurrency limited.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      compress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._compress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Decompress data.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _decompress(data, fin, callback) {
        const endpoint = this._isServer ? "client" : "server";
        if (!this._inflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._inflate = zlib.createInflateRaw({
            ...this._options.zlibInflateOptions,
            windowBits
          });
          this._inflate[kPerMessageDeflate] = this;
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          this._inflate.on("error", inflateOnError);
          this._inflate.on("data", inflateOnData);
        }
        this._inflate[kCallback] = callback;
        this._inflate.write(data);
        if (fin) this._inflate.write(TRAILER);
        this._inflate.flush(() => {
          const err = this._inflate[kError];
          if (err) {
            this._inflate.close();
            this._inflate = null;
            callback(err);
            return;
          }
          const data2 = bufferUtil.concat(
            this._inflate[kBuffers],
            this._inflate[kTotalLength]
          );
          if (this._inflate._readableState.endEmitted) {
            this._inflate.close();
            this._inflate = null;
          } else {
            this._inflate[kTotalLength] = 0;
            this._inflate[kBuffers] = [];
            if (fin && this.params[`${endpoint}_no_context_takeover`]) {
              this._inflate.reset();
            }
          }
          callback(null, data2);
        });
      }
      /**
       * Compress data.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _compress(data, fin, callback) {
        const endpoint = this._isServer ? "server" : "client";
        if (!this._deflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._deflate = zlib.createDeflateRaw({
            ...this._options.zlibDeflateOptions,
            windowBits
          });
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          this._deflate.on("data", deflateOnData);
        }
        this._deflate[kCallback] = callback;
        this._deflate.write(data);
        this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
          if (!this._deflate) {
            return;
          }
          let data2 = bufferUtil.concat(
            this._deflate[kBuffers],
            this._deflate[kTotalLength]
          );
          if (fin) {
            data2 = new FastBuffer(data2.buffer, data2.byteOffset, data2.length - 4);
          }
          this._deflate[kCallback] = null;
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._deflate.reset();
          }
          callback(null, data2);
        });
      }
    };
    module.exports = PerMessageDeflate2;
    function deflateOnData(chunk) {
      this[kBuffers].push(chunk);
      this[kTotalLength] += chunk.length;
    }
    function inflateOnData(chunk) {
      this[kTotalLength] += chunk.length;
      if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
        this[kBuffers].push(chunk);
        return;
      }
      this[kError] = new RangeError("Max payload size exceeded");
      this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
      this[kError][kStatusCode] = 1009;
      this.removeListener("data", inflateOnData);
      this.reset();
    }
    function inflateOnError(err) {
      this[kPerMessageDeflate]._inflate = null;
      if (this[kError]) {
        this[kCallback](this[kError]);
        return;
      }
      err[kStatusCode] = 1007;
      this[kCallback](err);
    }
  }
});

// node_modules/ws/lib/validation.js
var require_validation = __commonJS({
  "node_modules/ws/lib/validation.js"(exports, module) {
    "use strict";
    var { isUtf8 } = __require("buffer");
    var { hasBlob } = require_constants();
    var tokenChars = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 0 - 15
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 16 - 31
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      // 32 - 47
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      // 48 - 63
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 64 - 79
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      // 80 - 95
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 96 - 111
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0
      // 112 - 127
    ];
    function isValidStatusCode(code) {
      return code >= 1e3 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
    }
    function _isValidUTF8(buf) {
      const len = buf.length;
      let i = 0;
      while (i < len) {
        if ((buf[i] & 128) === 0) {
          i++;
        } else if ((buf[i] & 224) === 192) {
          if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
            return false;
          }
          i += 2;
        } else if ((buf[i] & 240) === 224) {
          if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || // Overlong
          buf[i] === 237 && (buf[i + 1] & 224) === 160) {
            return false;
          }
          i += 3;
        } else if ((buf[i] & 248) === 240) {
          if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || // Overlong
          buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
            return false;
          }
          i += 4;
        } else {
          return false;
        }
      }
      return true;
    }
    function isBlob(value) {
      return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
    }
    module.exports = {
      isBlob,
      isValidStatusCode,
      isValidUTF8: _isValidUTF8,
      tokenChars
    };
    if (isUtf8) {
      module.exports.isValidUTF8 = function(buf) {
        return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
      };
    } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
      try {
        const isValidUTF8 = __require("utf-8-validate");
        module.exports.isValidUTF8 = function(buf) {
          return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/receiver.js
var require_receiver = __commonJS({
  "node_modules/ws/lib/receiver.js"(exports, module) {
    "use strict";
    var { Writable } = __require("stream");
    var PerMessageDeflate2 = require_permessage_deflate();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      kStatusCode,
      kWebSocket
    } = require_constants();
    var { concat, toArrayBuffer, unmask } = require_buffer_util();
    var { isValidStatusCode, isValidUTF8 } = require_validation();
    var FastBuffer = Buffer[Symbol.species];
    var GET_INFO = 0;
    var GET_PAYLOAD_LENGTH_16 = 1;
    var GET_PAYLOAD_LENGTH_64 = 2;
    var GET_MASK = 3;
    var GET_DATA = 4;
    var INFLATING = 5;
    var DEFER_EVENT = 6;
    var Receiver2 = class extends Writable {
      /**
       * Creates a Receiver instance.
       *
       * @param {Object} [options] Options object
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {String} [options.binaryType=nodebuffer] The type for binary data
       * @param {Object} [options.extensions] An object containing the negotiated
       *     extensions
       * @param {Boolean} [options.isServer=false] Specifies whether to operate in
       *     client or server mode
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       */
      constructor(options = {}) {
        super();
        this._allowSynchronousEvents = options.allowSynchronousEvents !== void 0 ? options.allowSynchronousEvents : true;
        this._binaryType = options.binaryType || BINARY_TYPES[0];
        this._extensions = options.extensions || {};
        this._isServer = !!options.isServer;
        this._maxBufferedChunks = options.maxBufferedChunks | 0;
        this._maxFragments = options.maxFragments | 0;
        this._maxPayload = options.maxPayload | 0;
        this._skipUTF8Validation = !!options.skipUTF8Validation;
        this[kWebSocket] = void 0;
        this._bufferedBytes = 0;
        this._buffers = [];
        this._compressed = false;
        this._payloadLength = 0;
        this._mask = void 0;
        this._fragmented = 0;
        this._masked = false;
        this._fin = false;
        this._opcode = 0;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._numFragments = 0;
        this._fragments = [];
        this._errored = false;
        this._loop = false;
        this._state = GET_INFO;
      }
      /**
       * Implements `Writable.prototype._write()`.
       *
       * @param {Buffer} chunk The chunk of data to write
       * @param {String} encoding The character encoding of `chunk`
       * @param {Function} cb Callback
       * @private
       */
      _write(chunk, encoding, cb) {
        if (this._opcode === 8 && this._state == GET_INFO) return cb();
        if (this._maxBufferedChunks > 0 && this._buffers.length >= this._maxBufferedChunks) {
          cb(
            this.createError(
              RangeError,
              "Too many buffered chunks",
              false,
              1008,
              "WS_ERR_TOO_MANY_BUFFERED_PARTS"
            )
          );
          return;
        }
        this._bufferedBytes += chunk.length;
        this._buffers.push(chunk);
        this.startLoop(cb);
      }
      /**
       * Consumes `n` bytes from the buffered data.
       *
       * @param {Number} n The number of bytes to consume
       * @return {Buffer} The consumed bytes
       * @private
       */
      consume(n) {
        this._bufferedBytes -= n;
        if (n === this._buffers[0].length) return this._buffers.shift();
        if (n < this._buffers[0].length) {
          const buf = this._buffers[0];
          this._buffers[0] = new FastBuffer(
            buf.buffer,
            buf.byteOffset + n,
            buf.length - n
          );
          return new FastBuffer(buf.buffer, buf.byteOffset, n);
        }
        const dst = Buffer.allocUnsafe(n);
        do {
          const buf = this._buffers[0];
          const offset = dst.length - n;
          if (n >= buf.length) {
            dst.set(this._buffers.shift(), offset);
          } else {
            dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
            this._buffers[0] = new FastBuffer(
              buf.buffer,
              buf.byteOffset + n,
              buf.length - n
            );
          }
          n -= buf.length;
        } while (n > 0);
        return dst;
      }
      /**
       * Starts the parsing loop.
       *
       * @param {Function} cb Callback
       * @private
       */
      startLoop(cb) {
        this._loop = true;
        do {
          switch (this._state) {
            case GET_INFO:
              this.getInfo(cb);
              break;
            case GET_PAYLOAD_LENGTH_16:
              this.getPayloadLength16(cb);
              break;
            case GET_PAYLOAD_LENGTH_64:
              this.getPayloadLength64(cb);
              break;
            case GET_MASK:
              this.getMask();
              break;
            case GET_DATA:
              this.getData(cb);
              break;
            case INFLATING:
            case DEFER_EVENT:
              this._loop = false;
              return;
          }
        } while (this._loop);
        if (!this._errored) cb();
      }
      /**
       * Reads the first two bytes of a frame.
       *
       * @param {Function} cb Callback
       * @private
       */
      getInfo(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        const buf = this.consume(2);
        if ((buf[0] & 48) !== 0) {
          const error = this.createError(
            RangeError,
            "RSV2 and RSV3 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_2_3"
          );
          cb(error);
          return;
        }
        const compressed = (buf[0] & 64) === 64;
        if (compressed && !this._extensions[PerMessageDeflate2.extensionName]) {
          const error = this.createError(
            RangeError,
            "RSV1 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1"
          );
          cb(error);
          return;
        }
        this._fin = (buf[0] & 128) === 128;
        this._opcode = buf[0] & 15;
        this._payloadLength = buf[1] & 127;
        if (this._opcode === 0) {
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (!this._fragmented) {
            const error = this.createError(
              RangeError,
              "invalid opcode 0",
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._opcode = this._fragmented;
        } else if (this._opcode === 1 || this._opcode === 2) {
          if (this._fragmented) {
            const error = this.createError(
              RangeError,
              `invalid opcode ${this._opcode}`,
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._compressed = compressed;
        } else if (this._opcode > 7 && this._opcode < 11) {
          if (!this._fin) {
            const error = this.createError(
              RangeError,
              "FIN must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_FIN"
            );
            cb(error);
            return;
          }
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
            const error = this.createError(
              RangeError,
              `invalid payload length ${this._payloadLength}`,
              true,
              1002,
              "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
            );
            cb(error);
            return;
          }
        } else {
          const error = this.createError(
            RangeError,
            `invalid opcode ${this._opcode}`,
            true,
            1002,
            "WS_ERR_INVALID_OPCODE"
          );
          cb(error);
          return;
        }
        if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
        this._masked = (buf[1] & 128) === 128;
        if (this._isServer) {
          if (!this._masked) {
            const error = this.createError(
              RangeError,
              "MASK must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_MASK"
            );
            cb(error);
            return;
          }
        } else if (this._masked) {
          const error = this.createError(
            RangeError,
            "MASK must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_MASK"
          );
          cb(error);
          return;
        }
        if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
        else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
        else this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+16).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength16(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        this._payloadLength = this.consume(2).readUInt16BE(0);
        this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+64).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength64(cb) {
        if (this._bufferedBytes < 8) {
          this._loop = false;
          return;
        }
        const buf = this.consume(8);
        const num = buf.readUInt32BE(0);
        if (num > Math.pow(2, 53 - 32) - 1) {
          const error = this.createError(
            RangeError,
            "Unsupported WebSocket frame: payload length > 2^53 - 1",
            false,
            1009,
            "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
          );
          cb(error);
          return;
        }
        this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
        this.haveLength(cb);
      }
      /**
       * Payload length has been read.
       *
       * @param {Function} cb Callback
       * @private
       */
      haveLength(cb) {
        if (this._payloadLength && this._opcode < 8) {
          this._totalPayloadLength += this._payloadLength;
          if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(
              RangeError,
              "Max payload size exceeded",
              false,
              1009,
              "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
            );
            cb(error);
            return;
          }
        }
        if (this._masked) this._state = GET_MASK;
        else this._state = GET_DATA;
      }
      /**
       * Reads mask bytes.
       *
       * @private
       */
      getMask() {
        if (this._bufferedBytes < 4) {
          this._loop = false;
          return;
        }
        this._mask = this.consume(4);
        this._state = GET_DATA;
      }
      /**
       * Reads data bytes.
       *
       * @param {Function} cb Callback
       * @private
       */
      getData(cb) {
        let data = EMPTY_BUFFER;
        if (this._payloadLength) {
          if (this._bufferedBytes < this._payloadLength) {
            this._loop = false;
            return;
          }
          data = this.consume(this._payloadLength);
          if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
            unmask(data, this._mask);
          }
        }
        if (this._opcode > 7) {
          this.controlMessage(data, cb);
          return;
        }
        if (this._maxFragments > 0 && ++this._numFragments > this._maxFragments) {
          const error = this.createError(
            RangeError,
            "Too many message fragments",
            false,
            1008,
            "WS_ERR_TOO_MANY_BUFFERED_PARTS"
          );
          cb(error);
          return;
        }
        if (this._compressed) {
          this._state = INFLATING;
          this.decompress(data, cb);
          return;
        }
        if (data.length) {
          this._messageLength = this._totalPayloadLength;
          this._fragments.push(data);
        }
        this.dataMessage(cb);
      }
      /**
       * Decompresses data.
       *
       * @param {Buffer} data Compressed data
       * @param {Function} cb Callback
       * @private
       */
      decompress(data, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        perMessageDeflate.decompress(data, this._fin, (err, buf) => {
          if (err) return cb(err);
          if (buf.length) {
            this._messageLength += buf.length;
            if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
              const error = this.createError(
                RangeError,
                "Max payload size exceeded",
                false,
                1009,
                "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
              );
              cb(error);
              return;
            }
            this._fragments.push(buf);
          }
          this.dataMessage(cb);
          if (this._state === GET_INFO) this.startLoop(cb);
        });
      }
      /**
       * Handles a data message.
       *
       * @param {Function} cb Callback
       * @private
       */
      dataMessage(cb) {
        if (!this._fin) {
          this._state = GET_INFO;
          return;
        }
        const messageLength = this._messageLength;
        const fragments = this._fragments;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragmented = 0;
        this._numFragments = 0;
        this._fragments = [];
        if (this._opcode === 2) {
          let data;
          if (this._binaryType === "nodebuffer") {
            data = concat(fragments, messageLength);
          } else if (this._binaryType === "arraybuffer") {
            data = toArrayBuffer(concat(fragments, messageLength));
          } else if (this._binaryType === "blob") {
            data = new Blob(fragments);
          } else {
            data = fragments;
          }
          if (this._allowSynchronousEvents) {
            this.emit("message", data, true);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", data, true);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        } else {
          const buf = concat(fragments, messageLength);
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(
              Error,
              "invalid UTF-8 sequence",
              true,
              1007,
              "WS_ERR_INVALID_UTF8"
            );
            cb(error);
            return;
          }
          if (this._state === INFLATING || this._allowSynchronousEvents) {
            this.emit("message", buf, false);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", buf, false);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        }
      }
      /**
       * Handles a control message.
       *
       * @param {Buffer} data Data to handle
       * @return {(Error|RangeError|undefined)} A possible error
       * @private
       */
      controlMessage(data, cb) {
        if (this._opcode === 8) {
          if (data.length === 0) {
            this._loop = false;
            this.emit("conclude", 1005, EMPTY_BUFFER);
            this.end();
          } else {
            const code = data.readUInt16BE(0);
            if (!isValidStatusCode(code)) {
              const error = this.createError(
                RangeError,
                `invalid status code ${code}`,
                true,
                1002,
                "WS_ERR_INVALID_CLOSE_CODE"
              );
              cb(error);
              return;
            }
            const buf = new FastBuffer(
              data.buffer,
              data.byteOffset + 2,
              data.length - 2
            );
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              const error = this.createError(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8"
              );
              cb(error);
              return;
            }
            this._loop = false;
            this.emit("conclude", code, buf);
            this.end();
          }
          this._state = GET_INFO;
          return;
        }
        if (this._allowSynchronousEvents) {
          this.emit(this._opcode === 9 ? "ping" : "pong", data);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit(this._opcode === 9 ? "ping" : "pong", data);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
      /**
       * Builds an error object.
       *
       * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
       * @param {String} message The error message
       * @param {Boolean} prefix Specifies whether or not to add a default prefix to
       *     `message`
       * @param {Number} statusCode The status code
       * @param {String} errorCode The exposed error code
       * @return {(Error|RangeError)} The error
       * @private
       */
      createError(ErrorCtor, message, prefix, statusCode, errorCode) {
        this._loop = false;
        this._errored = true;
        const err = new ErrorCtor(
          prefix ? `Invalid WebSocket frame: ${message}` : message
        );
        Error.captureStackTrace(err, this.createError);
        err.code = errorCode;
        err[kStatusCode] = statusCode;
        return err;
      }
    };
    module.exports = Receiver2;
  }
});

// node_modules/ws/lib/sender.js
var require_sender = __commonJS({
  "node_modules/ws/lib/sender.js"(exports, module) {
    "use strict";
    var { Duplex } = __require("stream");
    var { randomFillSync } = __require("crypto");
    var {
      types: { isUint8Array }
    } = __require("util");
    var PerMessageDeflate2 = require_permessage_deflate();
    var { EMPTY_BUFFER, kWebSocket, NOOP } = require_constants();
    var { isBlob, isValidStatusCode } = require_validation();
    var { mask: applyMask, toBuffer } = require_buffer_util();
    var kByteLength = Symbol("kByteLength");
    var maskBuffer = Buffer.alloc(4);
    var RANDOM_POOL_SIZE = 8 * 1024;
    var randomPool;
    var randomPoolPointer = RANDOM_POOL_SIZE;
    var DEFAULT = 0;
    var DEFLATING = 1;
    var GET_BLOB_DATA = 2;
    var Sender2 = class _Sender {
      /**
       * Creates a Sender instance.
       *
       * @param {Duplex} socket The connection socket
       * @param {Object} [extensions] An object containing the negotiated extensions
       * @param {Function} [generateMask] The function used to generate the masking
       *     key
       */
      constructor(socket, extensions, generateMask) {
        this._extensions = extensions || {};
        if (generateMask) {
          this._generateMask = generateMask;
          this._maskBuffer = Buffer.alloc(4);
        }
        this._socket = socket;
        this._firstFragment = true;
        this._compress = false;
        this._bufferedBytes = 0;
        this._queue = [];
        this._state = DEFAULT;
        this.onerror = NOOP;
        this[kWebSocket] = void 0;
      }
      /**
       * Frames a piece of data according to the HyBi WebSocket protocol.
       *
       * @param {(Buffer|String)} data The data to frame
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @return {(Buffer|String)[]} The framed data
       * @public
       */
      static frame(data, options) {
        let mask;
        let merge = false;
        let offset = 2;
        let skipMasking = false;
        if (options.mask) {
          mask = options.maskBuffer || maskBuffer;
          if (options.generateMask) {
            options.generateMask(mask);
          } else {
            if (randomPoolPointer === RANDOM_POOL_SIZE) {
              if (randomPool === void 0) {
                randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
              }
              randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
              randomPoolPointer = 0;
            }
            mask[0] = randomPool[randomPoolPointer++];
            mask[1] = randomPool[randomPoolPointer++];
            mask[2] = randomPool[randomPoolPointer++];
            mask[3] = randomPool[randomPoolPointer++];
          }
          skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
          offset = 6;
        }
        let dataLength;
        if (typeof data === "string") {
          if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) {
            dataLength = options[kByteLength];
          } else {
            data = Buffer.from(data);
            dataLength = data.length;
          }
        } else {
          dataLength = data.length;
          merge = options.mask && options.readOnly && !skipMasking;
        }
        let payloadLength = dataLength;
        if (dataLength >= 65536) {
          offset += 8;
          payloadLength = 127;
        } else if (dataLength > 125) {
          offset += 2;
          payloadLength = 126;
        }
        const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
        target[0] = options.fin ? options.opcode | 128 : options.opcode;
        if (options.rsv1) target[0] |= 64;
        target[1] = payloadLength;
        if (payloadLength === 126) {
          target.writeUInt16BE(dataLength, 2);
        } else if (payloadLength === 127) {
          target[2] = target[3] = 0;
          target.writeUIntBE(dataLength, 4, 6);
        }
        if (!options.mask) return [target, data];
        target[1] |= 128;
        target[offset - 4] = mask[0];
        target[offset - 3] = mask[1];
        target[offset - 2] = mask[2];
        target[offset - 1] = mask[3];
        if (skipMasking) return [target, data];
        if (merge) {
          applyMask(data, mask, target, offset, dataLength);
          return [target];
        }
        applyMask(data, mask, data, 0, dataLength);
        return [target, data];
      }
      /**
       * Sends a close message to the other peer.
       *
       * @param {Number} [code] The status code component of the body
       * @param {(String|Buffer)} [data] The message component of the body
       * @param {Boolean} [mask=false] Specifies whether or not to mask the message
       * @param {Function} [cb] Callback
       * @public
       */
      close(code, data, mask, cb) {
        let buf;
        if (code === void 0) {
          buf = EMPTY_BUFFER;
        } else if (typeof code !== "number" || !isValidStatusCode(code)) {
          throw new TypeError("First argument must be a valid error code number");
        } else if (data === void 0 || !data.length) {
          buf = Buffer.allocUnsafe(2);
          buf.writeUInt16BE(code, 0);
        } else {
          const length = Buffer.byteLength(data);
          if (length > 123) {
            throw new RangeError("The message must not be greater than 123 bytes");
          }
          buf = Buffer.allocUnsafe(2 + length);
          buf.writeUInt16BE(code, 0);
          if (typeof data === "string") {
            buf.write(data, 2);
          } else if (isUint8Array(data)) {
            buf.set(data, 2);
          } else {
            throw new TypeError("Second argument must be a string or a Uint8Array");
          }
        }
        const options = {
          [kByteLength]: buf.length,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 8,
          readOnly: false,
          rsv1: false
        };
        if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, buf, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(buf, options), cb);
        }
      }
      /**
       * Sends a ping message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      ping(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 9,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a pong message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      pong(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 10,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a data message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Object} options Options object
       * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
       *     or text
       * @param {Boolean} [options.compress=false] Specifies whether or not to
       *     compress `data`
       * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Function} [cb] Callback
       * @public
       */
      send(data, options, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        let opcode = options.binary ? 2 : 1;
        let rsv1 = options.compress;
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (this._firstFragment) {
          this._firstFragment = false;
          if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
            rsv1 = byteLength >= perMessageDeflate._threshold;
          }
          this._compress = rsv1;
        } else {
          rsv1 = false;
          opcode = 0;
        }
        if (options.fin) this._firstFragment = true;
        const opts = {
          [kByteLength]: byteLength,
          fin: options.fin,
          generateMask: this._generateMask,
          mask: options.mask,
          maskBuffer: this._maskBuffer,
          opcode,
          readOnly,
          rsv1
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
          } else {
            this.getBlobData(data, this._compress, opts, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, this._compress, opts, cb]);
        } else {
          this.dispatch(data, this._compress, opts, cb);
        }
      }
      /**
       * Gets the contents of a blob as binary data.
       *
       * @param {Blob} blob The blob
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     the data
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      getBlobData(blob, compress, options, cb) {
        this._bufferedBytes += options[kByteLength];
        this._state = GET_BLOB_DATA;
        blob.arrayBuffer().then((arrayBuffer) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while the blob was being read"
            );
            process.nextTick(callCallbacks, this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          const data = toBuffer(arrayBuffer);
          if (!compress) {
            this._state = DEFAULT;
            this.sendFrame(_Sender.frame(data, options), cb);
            this.dequeue();
          } else {
            this.dispatch(data, compress, options, cb);
          }
        }).catch((err) => {
          process.nextTick(onError, this, err, cb);
        });
      }
      /**
       * Dispatches a message.
       *
       * @param {(Buffer|String)} data The message to send
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     `data`
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      dispatch(data, compress, options, cb) {
        if (!compress) {
          this.sendFrame(_Sender.frame(data, options), cb);
          return;
        }
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        this._bufferedBytes += options[kByteLength];
        this._state = DEFLATING;
        perMessageDeflate.compress(data, options.fin, (_, buf) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while data was being compressed"
            );
            callCallbacks(this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          this._state = DEFAULT;
          options.readOnly = false;
          this.sendFrame(_Sender.frame(buf, options), cb);
          this.dequeue();
        });
      }
      /**
       * Executes queued send operations.
       *
       * @private
       */
      dequeue() {
        while (this._state === DEFAULT && this._queue.length) {
          const params = this._queue.shift();
          this._bufferedBytes -= params[3][kByteLength];
          Reflect.apply(params[0], this, params.slice(1));
        }
      }
      /**
       * Enqueues a send operation.
       *
       * @param {Array} params Send operation parameters.
       * @private
       */
      enqueue(params) {
        this._bufferedBytes += params[3][kByteLength];
        this._queue.push(params);
      }
      /**
       * Sends a frame.
       *
       * @param {(Buffer | String)[]} list The frame to send
       * @param {Function} [cb] Callback
       * @private
       */
      sendFrame(list, cb) {
        if (list.length === 2) {
          this._socket.cork();
          this._socket.write(list[0]);
          this._socket.write(list[1], cb);
          this._socket.uncork();
        } else {
          this._socket.write(list[0], cb);
        }
      }
    };
    module.exports = Sender2;
    function callCallbacks(sender, err, cb) {
      if (typeof cb === "function") cb(err);
      for (let i = 0; i < sender._queue.length; i++) {
        const params = sender._queue[i];
        const callback = params[params.length - 1];
        if (typeof callback === "function") callback(err);
      }
    }
    function onError(sender, err, cb) {
      callCallbacks(sender, err, cb);
      sender.onerror(err);
    }
  }
});

// node_modules/ws/lib/event-target.js
var require_event_target = __commonJS({
  "node_modules/ws/lib/event-target.js"(exports, module) {
    "use strict";
    var { kForOnEventAttribute, kListener } = require_constants();
    var kCode = Symbol("kCode");
    var kData = Symbol("kData");
    var kError = Symbol("kError");
    var kMessage = Symbol("kMessage");
    var kReason = Symbol("kReason");
    var kTarget = Symbol("kTarget");
    var kType = Symbol("kType");
    var kWasClean = Symbol("kWasClean");
    var Event = class {
      /**
       * Create a new `Event`.
       *
       * @param {String} type The name of the event
       * @throws {TypeError} If the `type` argument is not specified
       */
      constructor(type) {
        this[kTarget] = null;
        this[kType] = type;
      }
      /**
       * @type {*}
       */
      get target() {
        return this[kTarget];
      }
      /**
       * @type {String}
       */
      get type() {
        return this[kType];
      }
    };
    Object.defineProperty(Event.prototype, "target", { enumerable: true });
    Object.defineProperty(Event.prototype, "type", { enumerable: true });
    var CloseEvent = class extends Event {
      /**
       * Create a new `CloseEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {Number} [options.code=0] The status code explaining why the
       *     connection was closed
       * @param {String} [options.reason=''] A human-readable string explaining why
       *     the connection was closed
       * @param {Boolean} [options.wasClean=false] Indicates whether or not the
       *     connection was cleanly closed
       */
      constructor(type, options = {}) {
        super(type);
        this[kCode] = options.code === void 0 ? 0 : options.code;
        this[kReason] = options.reason === void 0 ? "" : options.reason;
        this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
      }
      /**
       * @type {Number}
       */
      get code() {
        return this[kCode];
      }
      /**
       * @type {String}
       */
      get reason() {
        return this[kReason];
      }
      /**
       * @type {Boolean}
       */
      get wasClean() {
        return this[kWasClean];
      }
    };
    Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
    var ErrorEvent = class extends Event {
      /**
       * Create a new `ErrorEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.error=null] The error that generated this event
       * @param {String} [options.message=''] The error message
       */
      constructor(type, options = {}) {
        super(type);
        this[kError] = options.error === void 0 ? null : options.error;
        this[kMessage] = options.message === void 0 ? "" : options.message;
      }
      /**
       * @type {*}
       */
      get error() {
        return this[kError];
      }
      /**
       * @type {String}
       */
      get message() {
        return this[kMessage];
      }
    };
    Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
    Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });
    var MessageEvent = class extends Event {
      /**
       * Create a new `MessageEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.data=null] The message content
       */
      constructor(type, options = {}) {
        super(type);
        this[kData] = options.data === void 0 ? null : options.data;
      }
      /**
       * @type {*}
       */
      get data() {
        return this[kData];
      }
    };
    Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
    var EventTarget = {
      /**
       * Register an event listener.
       *
       * @param {String} type A string representing the event type to listen for
       * @param {(Function|Object)} handler The listener to add
       * @param {Object} [options] An options object specifies characteristics about
       *     the event listener
       * @param {Boolean} [options.once=false] A `Boolean` indicating that the
       *     listener should be invoked at most once after being added. If `true`,
       *     the listener would be automatically removed when invoked.
       * @public
       */
      addEventListener(type, handler, options = {}) {
        for (const listener of this.listeners(type)) {
          if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            return;
          }
        }
        let wrapper;
        if (type === "message") {
          wrapper = function onMessage(data, isBinary) {
            const event = new MessageEvent("message", {
              data: isBinary ? data : data.toString()
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "close") {
          wrapper = function onClose(code, message) {
            const event = new CloseEvent("close", {
              code,
              reason: message.toString(),
              wasClean: this._closeFrameReceived && this._closeFrameSent
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "error") {
          wrapper = function onError(error) {
            const event = new ErrorEvent("error", {
              error,
              message: error.message
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "open") {
          wrapper = function onOpen() {
            const event = new Event("open");
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else {
          return;
        }
        wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
        wrapper[kListener] = handler;
        if (options.once) {
          this.once(type, wrapper);
        } else {
          this.on(type, wrapper);
        }
      },
      /**
       * Remove an event listener.
       *
       * @param {String} type A string representing the event type to remove
       * @param {(Function|Object)} handler The listener to remove
       * @public
       */
      removeEventListener(type, handler) {
        for (const listener of this.listeners(type)) {
          if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            this.removeListener(type, listener);
            break;
          }
        }
      }
    };
    module.exports = {
      CloseEvent,
      ErrorEvent,
      Event,
      EventTarget,
      MessageEvent
    };
    function callListener(listener, thisArg, event) {
      if (typeof listener === "object" && listener.handleEvent) {
        listener.handleEvent.call(listener, event);
      } else {
        listener.call(thisArg, event);
      }
    }
  }
});

// node_modules/ws/lib/extension.js
var require_extension = __commonJS({
  "node_modules/ws/lib/extension.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function push(dest, name, elem) {
      if (dest[name] === void 0) dest[name] = [elem];
      else dest[name].push(elem);
    }
    function parse(header) {
      const offers = /* @__PURE__ */ Object.create(null);
      let params = /* @__PURE__ */ Object.create(null);
      let mustUnescape = false;
      let isEscaping = false;
      let inQuotes = false;
      let extensionName;
      let paramName;
      let start = -1;
      let code = -1;
      let end = -1;
      let i = 0;
      for (; i < header.length; i++) {
        code = header.charCodeAt(i);
        if (extensionName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (i !== 0 && (code === 32 || code === 9)) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            const name = header.slice(start, end);
            if (code === 44) {
              push(offers, name, params);
              params = /* @__PURE__ */ Object.create(null);
            } else {
              extensionName = name;
            }
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (paramName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (code === 32 || code === 9) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            push(params, header.slice(start, end), true);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            start = end = -1;
          } else if (code === 61 && start !== -1 && end === -1) {
            paramName = header.slice(start, i);
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else {
          if (isEscaping) {
            if (tokenChars[code] !== 1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (start === -1) start = i;
            else if (!mustUnescape) mustUnescape = true;
            isEscaping = false;
          } else if (inQuotes) {
            if (tokenChars[code] === 1) {
              if (start === -1) start = i;
            } else if (code === 34 && start !== -1) {
              inQuotes = false;
              end = i;
            } else if (code === 92) {
              isEscaping = true;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
          } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
            inQuotes = true;
          } else if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (start !== -1 && (code === 32 || code === 9)) {
            if (end === -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            let value = header.slice(start, end);
            if (mustUnescape) {
              value = value.replace(/\\/g, "");
              mustUnescape = false;
            }
            push(params, paramName, value);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            paramName = void 0;
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        }
      }
      if (start === -1 || inQuotes || code === 32 || code === 9) {
        throw new SyntaxError("Unexpected end of input");
      }
      if (end === -1) end = i;
      const token = header.slice(start, end);
      if (extensionName === void 0) {
        push(offers, token, params);
      } else {
        if (paramName === void 0) {
          push(params, token, true);
        } else if (mustUnescape) {
          push(params, paramName, token.replace(/\\/g, ""));
        } else {
          push(params, paramName, token);
        }
        push(offers, extensionName, params);
      }
      return offers;
    }
    function format(extensions) {
      return Object.keys(extensions).map((extension2) => {
        let configurations = extensions[extension2];
        if (!Array.isArray(configurations)) configurations = [configurations];
        return configurations.map((params) => {
          return [extension2].concat(
            Object.keys(params).map((k) => {
              let values = params[k];
              if (!Array.isArray(values)) values = [values];
              return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
            })
          ).join("; ");
        }).join(", ");
      }).join(", ");
    }
    module.exports = { format, parse };
  }
});

// node_modules/ws/lib/websocket.js
var require_websocket = __commonJS({
  "node_modules/ws/lib/websocket.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events");
    var https = __require("https");
    var http = __require("http");
    var net = __require("net");
    var tls = __require("tls");
    var { randomBytes: randomBytes2, createHash } = __require("crypto");
    var { Duplex, Readable } = __require("stream");
    var { URL: URL2 } = __require("url");
    var PerMessageDeflate2 = require_permessage_deflate();
    var Receiver2 = require_receiver();
    var Sender2 = require_sender();
    var { isBlob } = require_validation();
    var {
      BINARY_TYPES,
      CLOSE_TIMEOUT,
      EMPTY_BUFFER,
      GUID,
      kForOnEventAttribute,
      kListener,
      kStatusCode,
      kWebSocket,
      NOOP
    } = require_constants();
    var {
      EventTarget: { addEventListener, removeEventListener }
    } = require_event_target();
    var { format, parse } = require_extension();
    var { toBuffer } = require_buffer_util();
    var kAborted = Symbol("kAborted");
    var protocolVersions = [8, 13];
    var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
    var WebSocket2 = class _WebSocket extends EventEmitter {
      /**
       * Create a new `WebSocket`.
       *
       * @param {(String|URL)} address The URL to which to connect
       * @param {(String|String[])} [protocols] The subprotocols
       * @param {Object} [options] Connection options
       */
      constructor(address, protocols, options) {
        super();
        this._binaryType = BINARY_TYPES[0];
        this._closeCode = 1006;
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = EMPTY_BUFFER;
        this._closeTimer = null;
        this._errorEmitted = false;
        this._extensions = {};
        this._paused = false;
        this._protocol = "";
        this._readyState = _WebSocket.CONNECTING;
        this._receiver = null;
        this._sender = null;
        this._socket = null;
        if (address !== null) {
          this._bufferedAmount = 0;
          this._isServer = false;
          this._redirects = 0;
          if (protocols === void 0) {
            if (!options || options.protocols === void 0) {
              protocols = [];
            } else if (Array.isArray(options.protocols)) {
              protocols = options.protocols;
            } else {
              protocols = [options.protocols];
            }
          } else if (!Array.isArray(protocols)) {
            if (typeof protocols === "object" && protocols !== null) {
              options = protocols;
              if (options.protocols === void 0) {
                protocols = [];
              } else if (Array.isArray(options.protocols)) {
                protocols = options.protocols;
              } else {
                protocols = [options.protocols];
              }
            } else {
              protocols = [protocols];
            }
          }
          initAsClient(this, address, protocols, options);
        } else {
          this._autoPong = options.autoPong;
          this._closeTimeout = options.closeTimeout;
          this._isServer = true;
        }
      }
      /**
       * For historical reasons, the custom "nodebuffer" type is used by the default
       * instead of "blob".
       *
       * @type {String}
       */
      get binaryType() {
        return this._binaryType;
      }
      set binaryType(type) {
        if (!BINARY_TYPES.includes(type)) return;
        this._binaryType = type;
        if (this._receiver) this._receiver._binaryType = type;
      }
      /**
       * @type {Number}
       */
      get bufferedAmount() {
        if (!this._socket) return this._bufferedAmount;
        return this._socket._writableState.length + this._sender._bufferedBytes;
      }
      /**
       * @type {String}
       */
      get extensions() {
        return Object.keys(this._extensions).join();
      }
      /**
       * @type {Boolean}
       */
      get isPaused() {
        return this._paused;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onclose() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onerror() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onopen() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onmessage() {
        return null;
      }
      /**
       * @type {String}
       */
      get protocol() {
        return this._protocol;
      }
      /**
       * @type {Number}
       */
      get readyState() {
        return this._readyState;
      }
      /**
       * @type {String}
       */
      get url() {
        return this._url;
      }
      /**
       * Set up the socket and the internal resources.
       *
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Object} options Options object
       * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message size
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @private
       */
      setSocket(socket, head, options) {
        const receiver = new Receiver2({
          allowSynchronousEvents: options.allowSynchronousEvents,
          binaryType: this.binaryType,
          extensions: this._extensions,
          isServer: this._isServer,
          maxBufferedChunks: options.maxBufferedChunks,
          maxFragments: options.maxFragments,
          maxPayload: options.maxPayload,
          skipUTF8Validation: options.skipUTF8Validation
        });
        const sender = new Sender2(socket, this._extensions, options.generateMask);
        this._receiver = receiver;
        this._sender = sender;
        this._socket = socket;
        receiver[kWebSocket] = this;
        sender[kWebSocket] = this;
        socket[kWebSocket] = this;
        receiver.on("conclude", receiverOnConclude);
        receiver.on("drain", receiverOnDrain);
        receiver.on("error", receiverOnError);
        receiver.on("message", receiverOnMessage);
        receiver.on("ping", receiverOnPing);
        receiver.on("pong", receiverOnPong);
        sender.onerror = senderOnError;
        if (socket.setTimeout) socket.setTimeout(0);
        if (socket.setNoDelay) socket.setNoDelay();
        if (head.length > 0) socket.unshift(head);
        socket.on("close", socketOnClose);
        socket.on("data", socketOnData);
        socket.on("end", socketOnEnd);
        socket.on("error", socketOnError);
        this._readyState = _WebSocket.OPEN;
        this.emit("open");
      }
      /**
       * Emit the `'close'` event.
       *
       * @private
       */
      emitClose() {
        if (!this._socket) {
          this._readyState = _WebSocket.CLOSED;
          this.emit("close", this._closeCode, this._closeMessage);
          return;
        }
        if (this._extensions[PerMessageDeflate2.extensionName]) {
          this._extensions[PerMessageDeflate2.extensionName].cleanup();
        }
        this._receiver.removeAllListeners();
        this._readyState = _WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
      }
      /**
       * Start a closing handshake.
       *
       *          +----------+   +-----------+   +----------+
       *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
       *    |     +----------+   +-----------+   +----------+     |
       *          +----------+   +-----------+         |
       * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
       *          +----------+   +-----------+   |
       *    |           |                        |   +---+        |
       *                +------------------------+-->|fin| - - - -
       *    |         +---+                      |   +---+
       *     - - - - -|fin|<---------------------+
       *              +---+
       *
       * @param {Number} [code] Status code explaining why the connection is closing
       * @param {(String|Buffer)} [data] The reason why the connection is
       *     closing
       * @public
       */
      close(code, data) {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this.readyState === _WebSocket.CLOSING) {
          if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
            this._socket.end();
          }
          return;
        }
        this._sender.close(code, data, !this._isServer, (err) => {
          if (err) return;
          this._closeFrameSent = true;
          if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
            this._socket.end();
          }
        });
        this._readyState = _WebSocket.CLOSING;
        setCloseTimer(this);
      }
      /**
       * Pause the socket.
       *
       * @public
       */
      pause() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = true;
        this._socket.pause();
      }
      /**
       * Send a ping.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the ping is sent
       * @public
       */
      ping(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.ping(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Send a pong.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the pong is sent
       * @public
       */
      pong(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.pong(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Resume the socket.
       *
       * @public
       */
      resume() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = false;
        if (!this._receiver._writableState.needDrain) this._socket.resume();
      }
      /**
       * Send a data message.
       *
       * @param {*} data The message to send
       * @param {Object} [options] Options object
       * @param {Boolean} [options.binary] Specifies whether `data` is binary or
       *     text
       * @param {Boolean} [options.compress] Specifies whether or not to compress
       *     `data`
       * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when data is written out
       * @public
       */
      send(data, options, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof options === "function") {
          cb = options;
          options = {};
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        const opts = {
          binary: typeof data !== "string",
          mask: !this._isServer,
          compress: true,
          fin: true,
          ...options
        };
        if (!this._extensions[PerMessageDeflate2.extensionName]) {
          opts.compress = false;
        }
        this._sender.send(data || EMPTY_BUFFER, opts, cb);
      }
      /**
       * Forcibly close the connection.
       *
       * @public
       */
      terminate() {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this._socket) {
          this._readyState = _WebSocket.CLOSING;
          this._socket.destroy();
        }
      }
    };
    Object.defineProperty(WebSocket2, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2.prototype, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2.prototype, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    [
      "binaryType",
      "bufferedAmount",
      "extensions",
      "isPaused",
      "protocol",
      "readyState",
      "url"
    ].forEach((property) => {
      Object.defineProperty(WebSocket2.prototype, property, { enumerable: true });
    });
    ["open", "error", "close", "message"].forEach((method) => {
      Object.defineProperty(WebSocket2.prototype, `on${method}`, {
        enumerable: true,
        get() {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) return listener[kListener];
          }
          return null;
        },
        set(handler) {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) {
              this.removeListener(method, listener);
              break;
            }
          }
          if (typeof handler !== "function") return;
          this.addEventListener(method, handler, {
            [kForOnEventAttribute]: true
          });
        }
      });
    });
    WebSocket2.prototype.addEventListener = addEventListener;
    WebSocket2.prototype.removeEventListener = removeEventListener;
    module.exports = WebSocket2;
    function initAsClient(websocket, address, protocols, options) {
      const opts = {
        allowSynchronousEvents: true,
        autoPong: true,
        closeTimeout: CLOSE_TIMEOUT,
        protocolVersion: protocolVersions[1],
        maxBufferedChunks: 256 * 1024,
        maxFragments: 16 * 1024,
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: true,
        followRedirects: false,
        maxRedirects: 10,
        ...options,
        socketPath: void 0,
        hostname: void 0,
        protocol: void 0,
        protocols: void 0,
        timeout: void 0,
        method: "GET",
        host: void 0,
        path: void 0,
        port: void 0
      };
      websocket._autoPong = opts.autoPong;
      websocket._closeTimeout = opts.closeTimeout;
      if (!protocolVersions.includes(opts.protocolVersion)) {
        throw new RangeError(
          `Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
        );
      }
      let parsedUrl;
      if (address instanceof URL2) {
        parsedUrl = address;
      } else {
        try {
          parsedUrl = new URL2(address);
        } catch {
          throw new SyntaxError(`Invalid URL: ${address}`);
        }
      }
      if (parsedUrl.protocol === "http:") {
        parsedUrl.protocol = "ws:";
      } else if (parsedUrl.protocol === "https:") {
        parsedUrl.protocol = "wss:";
      }
      websocket._url = parsedUrl.href;
      const isSecure = parsedUrl.protocol === "wss:";
      const isIpcUrl = parsedUrl.protocol === "ws+unix:";
      let invalidUrlMessage;
      if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
        invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"`;
      } else if (isIpcUrl && !parsedUrl.pathname) {
        invalidUrlMessage = "The URL's pathname is empty";
      } else if (parsedUrl.hash) {
        invalidUrlMessage = "The URL contains a fragment identifier";
      }
      if (invalidUrlMessage) {
        const err = new SyntaxError(invalidUrlMessage);
        if (websocket._redirects === 0) {
          throw err;
        } else {
          emitErrorAndClose(websocket, err);
          return;
        }
      }
      const defaultPort = isSecure ? 443 : 80;
      const key = randomBytes2(16).toString("base64");
      const request = isSecure ? https.request : http.request;
      const protocolSet = /* @__PURE__ */ new Set();
      let perMessageDeflate;
      opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
      opts.defaultPort = opts.defaultPort || defaultPort;
      opts.port = parsedUrl.port || defaultPort;
      opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
      opts.headers = {
        ...opts.headers,
        "Sec-WebSocket-Version": opts.protocolVersion,
        "Sec-WebSocket-Key": key,
        Connection: "Upgrade",
        Upgrade: "websocket"
      };
      opts.path = parsedUrl.pathname + parsedUrl.search;
      opts.timeout = opts.handshakeTimeout;
      if (opts.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate2({
          ...opts.perMessageDeflate,
          isServer: false,
          maxPayload: opts.maxPayload
        });
        opts.headers["Sec-WebSocket-Extensions"] = format({
          [PerMessageDeflate2.extensionName]: perMessageDeflate.offer()
        });
      }
      if (protocols.length) {
        for (const protocol of protocols) {
          if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
            throw new SyntaxError(
              "An invalid or duplicated subprotocol was specified"
            );
          }
          protocolSet.add(protocol);
        }
        opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
      }
      if (opts.origin) {
        if (opts.protocolVersion < 13) {
          opts.headers["Sec-WebSocket-Origin"] = opts.origin;
        } else {
          opts.headers.Origin = opts.origin;
        }
      }
      if (parsedUrl.username || parsedUrl.password) {
        opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
      }
      if (isIpcUrl) {
        const parts = opts.path.split(":");
        opts.socketPath = parts[0];
        opts.path = parts[1];
      }
      let req;
      if (opts.followRedirects) {
        if (websocket._redirects === 0) {
          websocket._originalIpc = isIpcUrl;
          websocket._originalSecure = isSecure;
          websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
          const headers = options && options.headers;
          options = { ...options, headers: {} };
          if (headers) {
            for (const [key2, value] of Object.entries(headers)) {
              options.headers[key2.toLowerCase()] = value;
            }
          }
        } else if (websocket.listenerCount("redirect") === 0) {
          const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
          if (!isSameHost || websocket._originalSecure && !isSecure) {
            delete opts.headers.authorization;
            delete opts.headers.cookie;
            if (!isSameHost) delete opts.headers.host;
            opts.auth = void 0;
          }
        }
        if (opts.auth && !options.headers.authorization) {
          options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
        }
        req = websocket._req = request(opts);
        if (websocket._redirects) {
          websocket.emit("redirect", websocket.url, req);
        }
      } else {
        req = websocket._req = request(opts);
      }
      if (opts.timeout) {
        req.on("timeout", () => {
          abortHandshake(websocket, req, "Opening handshake has timed out");
        });
      }
      req.on("error", (err) => {
        if (req === null || req[kAborted]) return;
        req = websocket._req = null;
        emitErrorAndClose(websocket, err);
      });
      req.on("response", (res) => {
        const location = res.headers.location;
        const statusCode = res.statusCode;
        if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
          if (++websocket._redirects > opts.maxRedirects) {
            abortHandshake(websocket, req, "Maximum redirects exceeded");
            return;
          }
          req.abort();
          let addr;
          try {
            addr = new URL2(location, address);
          } catch (e) {
            const err = new SyntaxError(`Invalid URL: ${location}`);
            emitErrorAndClose(websocket, err);
            return;
          }
          initAsClient(websocket, addr, protocols, options);
        } else if (!websocket.emit("unexpected-response", req, res)) {
          abortHandshake(
            websocket,
            req,
            `Unexpected server response: ${res.statusCode}`
          );
        }
      });
      req.on("upgrade", (res, socket, head) => {
        websocket.emit("upgrade", res);
        if (websocket.readyState !== WebSocket2.CONNECTING) return;
        req = websocket._req = null;
        const upgrade = res.headers.upgrade;
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          abortHandshake(websocket, socket, "Invalid Upgrade header");
          return;
        }
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        if (res.headers["sec-websocket-accept"] !== digest) {
          abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
          return;
        }
        const serverProt = res.headers["sec-websocket-protocol"];
        let protError;
        if (serverProt !== void 0) {
          if (!protocolSet.size) {
            protError = "Server sent a subprotocol but none was requested";
          } else if (!protocolSet.has(serverProt)) {
            protError = "Server sent an invalid subprotocol";
          }
        } else if (protocolSet.size) {
          protError = "Server sent no subprotocol";
        }
        if (protError) {
          abortHandshake(websocket, socket, protError);
          return;
        }
        if (serverProt) websocket._protocol = serverProt;
        const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
        if (secWebSocketExtensions !== void 0) {
          if (!perMessageDeflate) {
            const message = "Server sent a Sec-WebSocket-Extensions header but no extension was requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          let extensions;
          try {
            extensions = parse(secWebSocketExtensions);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          const extensionNames = Object.keys(extensions);
          if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate2.extensionName) {
            const message = "Server indicated an extension that was not requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          try {
            perMessageDeflate.accept(extensions[PerMessageDeflate2.extensionName]);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          websocket._extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
        }
        websocket.setSocket(socket, head, {
          allowSynchronousEvents: opts.allowSynchronousEvents,
          generateMask: opts.generateMask,
          maxBufferedChunks: opts.maxBufferedChunks,
          maxFragments: opts.maxFragments,
          maxPayload: opts.maxPayload,
          skipUTF8Validation: opts.skipUTF8Validation
        });
      });
      if (opts.finishRequest) {
        opts.finishRequest(req, websocket);
      } else {
        req.end();
      }
    }
    function emitErrorAndClose(websocket, err) {
      websocket._readyState = WebSocket2.CLOSING;
      websocket._errorEmitted = true;
      websocket.emit("error", err);
      websocket.emitClose();
    }
    function netConnect(options) {
      options.path = options.socketPath;
      return net.connect(options);
    }
    function tlsConnect(options) {
      options.path = void 0;
      if (!options.servername && options.servername !== "") {
        options.servername = net.isIP(options.host) ? "" : options.host;
      }
      return tls.connect(options);
    }
    function abortHandshake(websocket, stream, message) {
      websocket._readyState = WebSocket2.CLOSING;
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshake);
      if (stream.setHeader) {
        stream[kAborted] = true;
        stream.abort();
        if (stream.socket && !stream.socket.destroyed) {
          stream.socket.destroy();
        }
        process.nextTick(emitErrorAndClose, websocket, err);
      } else {
        stream.destroy(err);
        stream.once("error", websocket.emit.bind(websocket, "error"));
        stream.once("close", websocket.emitClose.bind(websocket));
      }
    }
    function sendAfterClose(websocket, data, cb) {
      if (data) {
        const length = isBlob(data) ? data.size : toBuffer(data).length;
        if (websocket._socket) websocket._sender._bufferedBytes += length;
        else websocket._bufferedAmount += length;
      }
      if (cb) {
        const err = new Error(
          `WebSocket is not open: readyState ${websocket.readyState} (${readyStates[websocket.readyState]})`
        );
        process.nextTick(cb, err);
      }
    }
    function receiverOnConclude(code, reason) {
      const websocket = this[kWebSocket];
      websocket._closeFrameReceived = true;
      websocket._closeMessage = reason;
      websocket._closeCode = code;
      if (websocket._socket[kWebSocket] === void 0) return;
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      if (code === 1005) websocket.close();
      else websocket.close(code, reason);
    }
    function receiverOnDrain() {
      const websocket = this[kWebSocket];
      if (!websocket.isPaused) websocket._socket.resume();
    }
    function receiverOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket._socket[kWebSocket] !== void 0) {
        websocket._socket.removeListener("data", socketOnData);
        process.nextTick(resume, websocket._socket);
        websocket.close(err[kStatusCode]);
      }
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function receiverOnFinish() {
      this[kWebSocket].emitClose();
    }
    function receiverOnMessage(data, isBinary) {
      this[kWebSocket].emit("message", data, isBinary);
    }
    function receiverOnPing(data) {
      const websocket = this[kWebSocket];
      if (websocket._autoPong) websocket.pong(data, !this._isServer, NOOP);
      websocket.emit("ping", data);
    }
    function receiverOnPong(data) {
      this[kWebSocket].emit("pong", data);
    }
    function resume(stream) {
      stream.resume();
    }
    function senderOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket.readyState === WebSocket2.CLOSED) return;
      if (websocket.readyState === WebSocket2.OPEN) {
        websocket._readyState = WebSocket2.CLOSING;
        setCloseTimer(websocket);
      }
      this._socket.end();
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function setCloseTimer(websocket) {
      websocket._closeTimer = setTimeout(
        websocket._socket.destroy.bind(websocket._socket),
        websocket._closeTimeout
      );
    }
    function socketOnClose() {
      const websocket = this[kWebSocket];
      this.removeListener("close", socketOnClose);
      this.removeListener("data", socketOnData);
      this.removeListener("end", socketOnEnd);
      websocket._readyState = WebSocket2.CLOSING;
      if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && this._readableState.length !== 0) {
        const chunk = this.read(this._readableState.length);
        websocket._receiver.write(chunk);
      }
      websocket._receiver.end();
      this[kWebSocket] = void 0;
      clearTimeout(websocket._closeTimer);
      if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
        websocket.emitClose();
      } else {
        websocket._receiver.on("error", receiverOnFinish);
        websocket._receiver.on("finish", receiverOnFinish);
      }
    }
    function socketOnData(chunk) {
      if (!this[kWebSocket]._receiver.write(chunk)) {
        this.pause();
      }
    }
    function socketOnEnd() {
      const websocket = this[kWebSocket];
      websocket._readyState = WebSocket2.CLOSING;
      websocket._receiver.end();
      this.end();
    }
    function socketOnError() {
      const websocket = this[kWebSocket];
      this.removeListener("error", socketOnError);
      this.on("error", NOOP);
      if (websocket) {
        websocket._readyState = WebSocket2.CLOSING;
        this.destroy();
      }
    }
  }
});

// node_modules/ws/lib/stream.js
var require_stream = __commonJS({
  "node_modules/ws/lib/stream.js"(exports, module) {
    "use strict";
    var WebSocket2 = require_websocket();
    var { Duplex } = __require("stream");
    function emitClose(stream) {
      stream.emit("close");
    }
    function duplexOnEnd() {
      if (!this.destroyed && this._writableState.finished) {
        this.destroy();
      }
    }
    function duplexOnError(err) {
      this.removeListener("error", duplexOnError);
      this.destroy();
      if (this.listenerCount("error") === 0) {
        this.emit("error", err);
      }
    }
    function createWebSocketStream2(ws, options) {
      let terminateOnDestroy = true;
      const duplex = new Duplex({
        ...options,
        autoDestroy: false,
        emitClose: false,
        objectMode: false,
        writableObjectMode: false
      });
      ws.on("message", function message(msg, isBinary) {
        const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
        if (!duplex.push(data)) ws.pause();
      });
      ws.once("error", function error(err) {
        if (duplex.destroyed) return;
        terminateOnDestroy = false;
        duplex.destroy(err);
      });
      ws.once("close", function close() {
        if (duplex.destroyed) return;
        duplex.push(null);
      });
      duplex._destroy = function(err, callback) {
        if (ws.readyState === ws.CLOSED) {
          callback(err);
          process.nextTick(emitClose, duplex);
          return;
        }
        let called = false;
        ws.once("error", function error(err2) {
          called = true;
          callback(err2);
        });
        ws.once("close", function close() {
          if (!called) callback(err);
          process.nextTick(emitClose, duplex);
        });
        if (terminateOnDestroy) ws.terminate();
      };
      duplex._final = function(callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open2() {
            duplex._final(callback);
          });
          return;
        }
        if (ws._socket === null) return;
        if (ws._socket._writableState.finished) {
          callback();
          if (duplex._readableState.endEmitted) duplex.destroy();
        } else {
          ws._socket.once("finish", function finish() {
            callback();
          });
          ws.close();
        }
      };
      duplex._read = function() {
        if (ws.isPaused) ws.resume();
      };
      duplex._write = function(chunk, encoding, callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open2() {
            duplex._write(chunk, encoding, callback);
          });
          return;
        }
        ws.send(chunk, callback);
      };
      duplex.on("end", duplexOnEnd);
      duplex.on("error", duplexOnError);
      return duplex;
    }
    module.exports = createWebSocketStream2;
  }
});

// node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS({
  "node_modules/ws/lib/subprotocol.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function parse(header) {
      const protocols = /* @__PURE__ */ new Set();
      let start = -1;
      let end = -1;
      let i = 0;
      for (i; i < header.length; i++) {
        const code = header.charCodeAt(i);
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1) start = i;
        } else if (i !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start !== -1) end = i;
        } else if (code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1) end = i;
          const protocol2 = header.slice(start, end);
          if (protocols.has(protocol2)) {
            throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
          }
          protocols.add(protocol2);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
      if (start === -1 || end !== -1) {
        throw new SyntaxError("Unexpected end of input");
      }
      const protocol = header.slice(start, i);
      if (protocols.has(protocol)) {
        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
      }
      protocols.add(protocol);
      return protocols;
    }
    module.exports = { parse };
  }
});

// node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS({
  "node_modules/ws/lib/websocket-server.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events");
    var http = __require("http");
    var { Duplex } = __require("stream");
    var { createHash } = __require("crypto");
    var extension2 = require_extension();
    var PerMessageDeflate2 = require_permessage_deflate();
    var subprotocol2 = require_subprotocol();
    var WebSocket2 = require_websocket();
    var { CLOSE_TIMEOUT, GUID, kWebSocket } = require_constants();
    var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
    var RUNNING = 0;
    var CLOSING = 1;
    var CLOSED = 2;
    var WebSocketServer2 = class extends EventEmitter {
      /**
       * Create a `WebSocketServer` instance.
       *
       * @param {Object} options Configuration options
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Boolean} [options.autoPong=true] Specifies whether or not to
       *     automatically send a pong in response to a ping
       * @param {Number} [options.backlog=511] The maximum length of the queue of
       *     pending connections
       * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
       *     track clients
       * @param {Number} [options.closeTimeout=30000] Duration in milliseconds to
       *     wait for the closing handshake to finish after `websocket.close()` is
       *     called
       * @param {Function} [options.handleProtocols] A hook to handle protocols
       * @param {String} [options.host] The hostname where to bind the server
       * @param {Number} [options.maxBufferedChunks=262144] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=16384] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=104857600] The maximum allowed message
       *     size
       * @param {Boolean} [options.noServer=false] Enable no server mode
       * @param {String} [options.path] Accept only connections matching this path
       * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
       *     permessage-deflate
       * @param {Number} [options.port] The port where to bind the server
       * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
       *     server to use
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @param {Function} [options.verifyClient] A hook to reject connections
       * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
       *     class to use. It must be the `WebSocket` class or class that extends it
       * @param {Function} [callback] A listener for the `listening` event
       */
      constructor(options, callback) {
        super();
        options = {
          allowSynchronousEvents: true,
          autoPong: true,
          maxBufferedChunks: 256 * 1024,
          maxFragments: 16 * 1024,
          maxPayload: 100 * 1024 * 1024,
          skipUTF8Validation: false,
          perMessageDeflate: false,
          handleProtocols: null,
          clientTracking: true,
          closeTimeout: CLOSE_TIMEOUT,
          verifyClient: null,
          noServer: false,
          backlog: null,
          // use default (511 as implemented in net.js)
          server: null,
          host: null,
          path: null,
          port: null,
          WebSocket: WebSocket2,
          ...options
        };
        if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
          throw new TypeError(
            'One and only one of the "port", "server", or "noServer" options must be specified'
          );
        }
        if (options.port != null) {
          this._server = http.createServer((req, res) => {
            const body = http.STATUS_CODES[426];
            res.writeHead(426, {
              "Content-Length": body.length,
              "Content-Type": "text/plain"
            });
            res.end(body);
          });
          this._server.listen(
            options.port,
            options.host,
            options.backlog,
            callback
          );
        } else if (options.server) {
          this._server = options.server;
        }
        if (this._server) {
          const emitConnection = this.emit.bind(this, "connection");
          this._removeListeners = addListeners(this._server, {
            listening: this.emit.bind(this, "listening"),
            error: this.emit.bind(this, "error"),
            upgrade: (req, socket, head) => {
              this.handleUpgrade(req, socket, head, emitConnection);
            }
          });
        }
        if (options.perMessageDeflate === true) options.perMessageDeflate = {};
        if (options.clientTracking) {
          this.clients = /* @__PURE__ */ new Set();
          this._shouldEmitClose = false;
        }
        this.options = options;
        this._state = RUNNING;
      }
      /**
       * Returns the bound address, the address family name, and port of the server
       * as reported by the operating system if listening on an IP socket.
       * If the server is listening on a pipe or UNIX domain socket, the name is
       * returned as a string.
       *
       * @return {(Object|String|null)} The address of the server
       * @public
       */
      address() {
        if (this.options.noServer) {
          throw new Error('The server is operating in "noServer" mode');
        }
        if (!this._server) return null;
        return this._server.address();
      }
      /**
       * Stop the server from accepting new connections and emit the `'close'` event
       * when all existing connections are closed.
       *
       * @param {Function} [cb] A one-time listener for the `'close'` event
       * @public
       */
      close(cb) {
        if (this._state === CLOSED) {
          if (cb) {
            this.once("close", () => {
              cb(new Error("The server is not running"));
            });
          }
          process.nextTick(emitClose, this);
          return;
        }
        if (cb) this.once("close", cb);
        if (this._state === CLOSING) return;
        this._state = CLOSING;
        if (this.options.noServer || this.options.server) {
          if (this._server) {
            this._removeListeners();
            this._removeListeners = this._server = null;
          }
          if (this.clients) {
            if (!this.clients.size) {
              process.nextTick(emitClose, this);
            } else {
              this._shouldEmitClose = true;
            }
          } else {
            process.nextTick(emitClose, this);
          }
        } else {
          const server = this._server;
          this._removeListeners();
          this._removeListeners = this._server = null;
          server.close(() => {
            emitClose(this);
          });
        }
      }
      /**
       * See if a given request should be handled by this server instance.
       *
       * @param {http.IncomingMessage} req Request object to inspect
       * @return {Boolean} `true` if the request is valid, else `false`
       * @public
       */
      shouldHandle(req) {
        if (this.options.path) {
          const index = req.url.indexOf("?");
          const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
          if (pathname !== this.options.path) return false;
        }
        return true;
      }
      /**
       * Handle a HTTP Upgrade request.
       *
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @public
       */
      handleUpgrade(req, socket, head, cb) {
        socket.on("error", socketOnError);
        const key = req.headers["sec-websocket-key"];
        const upgrade = req.headers.upgrade;
        const version = +req.headers["sec-websocket-version"];
        if (req.method !== "GET") {
          const message = "Invalid HTTP method";
          abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
          return;
        }
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          const message = "Invalid Upgrade header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (key === void 0 || !keyRegex.test(key)) {
          const message = "Missing or invalid Sec-WebSocket-Key header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (version !== 13 && version !== 8) {
          const message = "Missing or invalid Sec-WebSocket-Version header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
            "Sec-WebSocket-Version": "13, 8"
          });
          return;
        }
        if (!this.shouldHandle(req)) {
          abortHandshake(socket, 400);
          return;
        }
        const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
        let protocols = /* @__PURE__ */ new Set();
        if (secWebSocketProtocol !== void 0) {
          try {
            protocols = subprotocol2.parse(secWebSocketProtocol);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Protocol header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
        const extensions = {};
        if (this.options.perMessageDeflate && secWebSocketExtensions !== void 0) {
          const perMessageDeflate = new PerMessageDeflate2({
            ...this.options.perMessageDeflate,
            isServer: true,
            maxPayload: this.options.maxPayload
          });
          try {
            const offers = extension2.parse(secWebSocketExtensions);
            if (offers[PerMessageDeflate2.extensionName]) {
              perMessageDeflate.accept(offers[PerMessageDeflate2.extensionName]);
              extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
            }
          } catch (err) {
            const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        if (this.options.verifyClient) {
          const info = {
            origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
            secure: !!(req.socket.authorized || req.socket.encrypted),
            req
          };
          if (this.options.verifyClient.length === 2) {
            this.options.verifyClient(info, (verified, code, message, headers) => {
              if (!verified) {
                return abortHandshake(socket, code || 401, message, headers);
              }
              this.completeUpgrade(
                extensions,
                key,
                protocols,
                req,
                socket,
                head,
                cb
              );
            });
            return;
          }
          if (!this.options.verifyClient(info)) return abortHandshake(socket, 401);
        }
        this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
      }
      /**
       * Upgrade the connection to WebSocket.
       *
       * @param {Object} extensions The accepted extensions
       * @param {String} key The value of the `Sec-WebSocket-Key` header
       * @param {Set} protocols The subprotocols
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @throws {Error} If called more than once with the same socket
       * @private
       */
      completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
        if (!socket.readable || !socket.writable) return socket.destroy();
        if (socket[kWebSocket]) {
          throw new Error(
            "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
          );
        }
        if (this._state > RUNNING) return abortHandshake(socket, 503);
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        const headers = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${digest}`
        ];
        const ws = new this.options.WebSocket(null, void 0, this.options);
        if (protocols.size) {
          const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
          if (protocol) {
            headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
            ws._protocol = protocol;
          }
        }
        if (extensions[PerMessageDeflate2.extensionName]) {
          const params = extensions[PerMessageDeflate2.extensionName].params;
          const value = extension2.format({
            [PerMessageDeflate2.extensionName]: [params]
          });
          headers.push(`Sec-WebSocket-Extensions: ${value}`);
          ws._extensions = extensions;
        }
        this.emit("headers", headers, req);
        socket.write(headers.concat("\r\n").join("\r\n"));
        socket.removeListener("error", socketOnError);
        ws.setSocket(socket, head, {
          allowSynchronousEvents: this.options.allowSynchronousEvents,
          maxBufferedChunks: this.options.maxBufferedChunks,
          maxFragments: this.options.maxFragments,
          maxPayload: this.options.maxPayload,
          skipUTF8Validation: this.options.skipUTF8Validation
        });
        if (this.clients) {
          this.clients.add(ws);
          ws.on("close", () => {
            this.clients.delete(ws);
            if (this._shouldEmitClose && !this.clients.size) {
              process.nextTick(emitClose, this);
            }
          });
        }
        cb(ws, req);
      }
    };
    module.exports = WebSocketServer2;
    function addListeners(server, map) {
      for (const event of Object.keys(map)) server.on(event, map[event]);
      return function removeListeners() {
        for (const event of Object.keys(map)) {
          server.removeListener(event, map[event]);
        }
      };
    }
    function emitClose(server) {
      server._state = CLOSED;
      server.emit("close");
    }
    function socketOnError() {
      this.destroy();
    }
    function abortHandshake(socket, code, message, headers) {
      message = message || http.STATUS_CODES[code];
      headers = {
        Connection: "close",
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(message),
        ...headers
      };
      socket.once("finish", socket.destroy);
      socket.end(
        `HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join("\r\n") + "\r\n\r\n" + message
      );
    }
    function abortHandshakeOrEmitwsClientError(server, req, socket, code, message, headers) {
      if (server.listenerCount("wsClientError")) {
        const err = new Error(message);
        Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
        server.emit("wsClientError", err, socket, req);
      } else {
        abortHandshake(socket, code, message, headers);
      }
    }
  }
});

// server/relay.mjs
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { open, readFile, rename } from "node:fs/promises";

// node_modules/ws/wrapper.mjs
var import_stream = __toESM(require_stream(), 1);
var import_extension = __toESM(require_extension(), 1);
var import_permessage_deflate = __toESM(require_permessage_deflate(), 1);
var import_receiver = __toESM(require_receiver(), 1);
var import_sender = __toESM(require_sender(), 1);
var import_subprotocol = __toESM(require_subprotocol(), 1);
var import_websocket = __toESM(require_websocket(), 1);
var import_websocket_server = __toESM(require_websocket_server(), 1);

// src/building/types.ts
function emptyHouse() {
  return { version: 1, floors: [], walls: [], openings: [], stairs: [], roofs: [], furniture: [] };
}

// src/building/dimensions.ts
var GRID = 0.91;
var LOT_W = 24;
var LOT_D = 20;
var lotSize = { w: LOT_W, d: LOT_D };
var STORY_HEIGHT = 2.9;
var WALL_HEIGHT = STORY_HEIGHT;
var WALL_THICKNESS = 0.15;
var MAX_LEVEL = 9;
var STAIR_LENGTH = 4;
var STAIR_WIDTH = GRID - 0.12;

// src/building/stairs.ts
function stairPlan(shape = "straight") {
  if (shape === "l") return { flights: [
    { x: 0.5, z: 0, dir: 0, length: 2, bottom: 0, top: 0.5 },
    { x: 1, z: 2.5, dir: 1, length: 2, bottom: 0.5, top: 1 }
  ], landings: [{ x0: 0, z0: 2, x1: 1, z1: 3, height: 0.5 }] };
  if (shape === "u") return { flights: [
    { x: 0.5, z: 0, dir: 0, length: 2, bottom: 0, top: 0.5 },
    { x: 1.5, z: 2, dir: 2, length: 2, bottom: 0.5, top: 1 }
  ], landings: [{ x0: 0, z0: 2, x1: 2, z1: 3, height: 0.5 }] };
  return { flights: [{ x: 0.5, z: 0, dir: 0, length: shape === "compact" ? 3 : STAIR_LENGTH, bottom: 0, top: 1 }], landings: [] };
}
var direction = (dir) => [[0, 1], [1, 0], [0, -1], [-1, 0]][dir];
function stairWorldGrid(s, x, z) {
  const a = x - 0.5, b = z - 0.5;
  const [rx, rz] = [[a, b], [b, -a], [-a, -b], [-b, a]][s.rot];
  return { x: s.x + 0.5 + rx, z: s.z + 0.5 + rz };
}
function stairRects(s) {
  const plan = stairPlan(s.shape);
  const rects = plan.flights.map((f) => {
    const [dx, dz] = direction(f.dir);
    return {
      x0: Math.min(f.x, f.x + dx * f.length) - Math.abs(dz) / 2,
      x1: Math.max(f.x, f.x + dx * f.length) + Math.abs(dz) / 2,
      z0: Math.min(f.z, f.z + dz * f.length) - Math.abs(dx) / 2,
      z1: Math.max(f.z, f.z + dz * f.length) + Math.abs(dx) / 2
    };
  });
  return [...rects, ...plan.landings].map((r) => {
    const pts = [stairWorldGrid(s, r.x0, r.z0), stairWorldGrid(s, r.x1, r.z1)];
    return { x0: Math.min(...pts.map((p) => p.x)), x1: Math.max(...pts.map((p) => p.x)), z0: Math.min(...pts.map((p) => p.z)), z1: Math.max(...pts.map((p) => p.z)) };
  });
}

// src/catalog/materials.json
var materials_default = {
  categories: { exterior: "\u5916\u58C1\u6750", interior: "\u5185\u88C5\uFF08\u58C1\u7D19\uFF09", roof: "\u5C4B\u6839\u6750", floor: "\u5E8A\u6750", wood: "\u6728\u90E8" },
  materials: [
    { id: "siding", name: "\u7AAF\u696D\u7CFB\u30B5\u30A4\u30C7\u30A3\u30F3\u30B0\uFF08\u6A2A\u5F35\u308A\uFF09", category: "exterior", pattern: "siding", roughness: 0.8, metalness: 0, bump: 0.015, colors: ["#f2efe8", "#d9d2c3", "#a59c8c", "#6e6a64", "#3b3d40", "#8a5a44"], note: "\u3044\u3061\u3070\u3093\u5B9A\u756A\u3002\u5B89\u304F\u3066\u8272\u3082\u8C4A\u5BCC" },
    { id: "tile", name: "\u5916\u58C1\u30BF\u30A4\u30EB", category: "exterior", pattern: "brick", roughness: 0.7, metalness: 0, bump: 0.02, colors: ["#e8e2d6", "#c9b9a0", "#9c7b5e", "#6b5546", "#4a4a4a", "#b0563f"], note: "\u6C5A\u308C\u306B\u304F\u304F\u3001\u8272\u3042\u305B\u3057\u306B\u304F\u3044\u9AD8\u7D1A\u611F" },
    { id: "stucco", name: "\u5857\u308A\u58C1\uFF08\u305D\u3068\u3093\u58C1\u98A8\uFF09", category: "exterior", pattern: "stucco", roughness: 0.95, metalness: 0, bump: 0.01, colors: ["#f4f1ea", "#e6dccb", "#cfc2a8", "#b8b2a7", "#8d8a84", "#d8c3a5"], note: "\u8077\u4EBA\u306E\u624B\u4ED5\u4E8B\u306E\u98A8\u5408\u3044\u3002\u767D\u3044\u5BB6\u306B" },
    { id: "woodboard", name: "\u6728\u306E\u7FBD\u76EE\u677F\uFF08\u7E26\u5F35\u308A\uFF09", category: "exterior", pattern: "boardV", roughness: 0.75, metalness: 0, bump: 0.02, colors: ["#c49a6c", "#a0754d", "#7a5535", "#4f3a2a", "#2f2a26", "#d8c09a"], note: "\u3042\u305F\u305F\u304B\u307F\u306E\u3042\u308B\u7E26\u5F35\u308A\u306E\u677F" },
    { id: "galvalume", name: "\u30AC\u30EB\u30D0\u30EA\u30A6\u30E0\u92FC\u677F\uFF08\u89D2\u6CE2\uFF09", category: "exterior", pattern: "rib", roughness: 0.4, metalness: 0.6, bump: 0.02, colors: ["#2c2e31", "#5d6166", "#9aa0a6", "#e1e3e4", "#3a4a5c", "#5b3b2e"], note: "\u30B7\u30E3\u30FC\u30D7\u3067\u30E2\u30C0\u30F3\u3002\u8EFD\u304F\u3066\u3055\u3073\u306B\u304F\u3044" },
    { id: "siding-stone", name: "\u7AAF\u696D\u7CFB\u30B5\u30A4\u30C7\u30A3\u30F3\u30B0\uFF08\u77F3\u7A4D\u307F\u8ABF\uFF09", category: "exterior", pattern: "stone", roughness: 0.85, metalness: 0, bump: 0.02, colors: ["#d8d2c4", "#b9ad98", "#8f8576", "#6b645c", "#4b4844"], note: "\u77F3\u3092\u7A4D\u3093\u3060\u3088\u3046\u306A\u91CD\u539A\u306A\u898B\u305F\u76EE" },
    { id: "siding-brick", name: "\u7AAF\u696D\u7CFB\u30B5\u30A4\u30C7\u30A3\u30F3\u30B0\uFF08\u30EC\u30F3\u30AC\u8ABF\uFF09", category: "exterior", pattern: "brick", roughness: 0.8, metalness: 0, bump: 0.015, colors: ["#b0563f", "#8a5a44", "#c9b9a0", "#6b5546", "#e8e2d6"], note: "\u624B\u3054\u308D\u306A\u5024\u6BB5\u3067\u30EC\u30F3\u30AC\u98A8\u306B" },
    { id: "metal-v", name: "\u91D1\u5C5E\u30B5\u30A4\u30C7\u30A3\u30F3\u30B0\uFF08\u7E26\u5F35\u308A\uFF09", category: "exterior", pattern: "sidingV", roughness: 0.45, metalness: 0.5, bump: 0.015, colors: ["#2c2e31", "#5d6166", "#e1e3e4", "#3a4a5c", "#5b3b2e", "#7a7f72"], note: "\u65AD\u71B1\u6750\u5165\u308A\u306E\u91D1\u5C5E\u677F\u3002\u8EFD\u304F\u3066\u4E08\u592B" },
    { id: "alc", name: "ALC\u30D1\u30CD\u30EB\uFF08\u8EFD\u91CF\u6C17\u6CE1\u30B3\u30F3\u30AF\u30EA\u30FC\u30C8\uFF09", category: "exterior", pattern: "alc", roughness: 0.9, metalness: 0, bump: 0.01, colors: ["#e9e6df", "#cfc9bd", "#a8a399", "#7a7772", "#4d4c4a"], note: "\u9244\u9AA8\u4F4F\u5B85\u3067\u4F7F\u3046\u539A\u3044\u677F\u3002\u706B\u3068\u97F3\u306B\u5F37\u3044" },
    { id: "brick", name: "\u672C\u30EC\u30F3\u30AC\u7A4D\u307F", category: "exterior", pattern: "brick", roughness: 0.85, metalness: 0, bump: 0.035, colors: ["#a9553c", "#8c4a35", "#c27a55", "#6e4434", "#d9c3a5"], note: "\u672C\u7269\u306E\u30EC\u30F3\u30AC\u3002\u5E74\u6708\u3068\u3068\u3082\u306B\u5473\u304C\u51FA\u308B" },
    { id: "concrete", name: "\u30B3\u30F3\u30AF\u30EA\u30FC\u30C8\u6253\u3061\u653E\u3057", category: "exterior", pattern: "concrete", roughness: 0.85, metalness: 0, bump: 0.012, colors: ["#bdbcb8", "#a5a49f", "#8d8c88", "#d2d0ca"], note: "\u578B\u67A0\u306E\u8DE1\u3092\u898B\u305B\u308B\u30C7\u30B6\u30A4\u30CA\u30FC\u30BA\u98A8" },
    { id: "yakisugi", name: "\u713C\u6749\u677F\uFF08\u4E0B\u898B\u677F\u5F35\u308A\uFF09", category: "exterior", pattern: "clapboard", roughness: 0.9, metalness: 0, bump: 0.025, colors: ["#2a2826", "#3d3833", "#4f4237", "#6b5a48"], note: "\u8868\u9762\u3092\u713C\u3044\u3066\u9577\u6301\u3061\u3055\u305B\u305F\u4F1D\u7D71\u306E\u677F" },
    { id: "cedar", name: "\u6749\u677F\uFF08\u4E0B\u898B\u677F\u5F35\u308A\uFF09", category: "exterior", pattern: "clapboard", roughness: 0.75, metalness: 0, bump: 0.025, colors: ["#c49a6c", "#a77b52", "#d8c09a", "#8a6240", "#e8dcc6"], note: "\u3042\u305F\u305F\u304B\u3044\u6728\u306E\u5916\u58C1\u3002\u5857\u308A\u76F4\u3057\u304C\u5FC5\u8981" },
    { id: "natural-stone", name: "\u5929\u7136\u77F3\u5F35\u308A", category: "exterior", pattern: "stone", roughness: 0.75, metalness: 0, bump: 0.04, colors: ["#cfc8bb", "#a69f93", "#8c7d6a", "#5f5a55", "#e3dccd"], note: "\u672C\u7269\u306E\u77F3\u3002\u91CD\u539A\u3067\u6700\u9AD8\u7D1A" },
    { id: "shikkui", name: "\u6F06\u55B0\uFF08\u3057\u3063\u304F\u3044\uFF09", category: "exterior", pattern: "stucco", roughness: 0.92, metalness: 0, bump: 6e-3, colors: ["#fbfaf6", "#f1ede3", "#e3dccb", "#d4d0c8"], note: "\u767D\u304F\u306A\u3081\u3089\u304B\u306A\u6614\u306A\u304C\u3089\u306E\u5857\u308A\u58C1" },
    { id: "lithin", name: "\u30E2\u30EB\u30BF\u30EB\u5439\u4ED8\u3051\uFF08\u30EA\u30B7\u30F3\uFF09", category: "exterior", pattern: "stucco", roughness: 0.98, metalness: 0, bump: 0.018, colors: ["#efeae0", "#d9d1c1", "#bfb6a5", "#9e9a92", "#7d7a74"], note: "\u3056\u3089\u3063\u3068\u3057\u305F\u8CEA\u611F\u3002\u8CBB\u7528\u3092\u304A\u3055\u3048\u305F\u3044\u3068\u304D\u306B" },
    { id: "border-tile", name: "\u30DC\u30FC\u30C0\u30FC\u30BF\u30A4\u30EB", category: "exterior", pattern: "border", roughness: 0.6, metalness: 0, bump: 0.02, colors: ["#e6e0d4", "#b8a68c", "#7d6a58", "#4a4643", "#2e2f31", "#c4b6a0"], note: "\u7D30\u9577\u3044\u30BF\u30A4\u30EB\u3067\u30B9\u30BF\u30A4\u30EA\u30C3\u30B7\u30E5\u306B" },
    { id: "deep-concrete", name: "\u5F6B\u308A\u306E\u6DF1\u3044\u30B3\u30F3\u30AF\u30EA\u30FC\u30C8\u5916\u58C1", category: "exterior", pattern: "stone", roughness: 0.9, metalness: 0, bump: 0.05, colors: ["#e3dccd", "#cbbfa8", "#a99c86", "#8b8478", "#5f5a55"], note: "\u539A\u3044\u30B3\u30F3\u30AF\u30EA\u30FC\u30C8\u306E\u677F\u306B\u6DF1\u3044\u5F6B\u308A\u3002\u9244\u9AA8\u306E\u5927\u624B\u30E1\u30FC\u30AB\u30FC\u4F4F\u5B85\u306E\u5B9A\u756A\u98A8" },
    { id: "ceramic-wall", name: "\u9676\u7248\u5916\u58C1\uFF08\u713C\u304D\u7269\u306E\u677F\uFF09", category: "exterior", pattern: "border", roughness: 0.65, metalness: 0, bump: 0.03, colors: ["#ece6da", "#cdbfa9", "#9b8670", "#6b5a4b", "#4a4643"], note: "\u571F\u3092\u713C\u3044\u305F\u9676\u677F\u3002\u8272\u3042\u305B\u305A\u6C5A\u308C\u3082\u96E8\u3067\u843D\u3061\u308B\u3002\u6728\u9020\u306E\u9AD8\u7D1A\u4F4F\u5B85\u5411\u3051" },
    { id: "wallpaper", name: "\u30D3\u30CB\u30FC\u30EB\u30AF\u30ED\u30B9", category: "interior", pattern: "fabric", roughness: 0.9, metalness: 0, bump: 4e-3, colors: ["#f7f5f0", "#efe9df", "#e3e7ea", "#dfe8dc", "#f0e0d8", "#5a5d61"], note: "\u5BA4\u5185\u306E\u5B9A\u756A\u3002\u5B89\u304F\u3066\u5F35\u308A\u66FF\u3048\u3082\u7C21\u5358" },
    { id: "plaster", name: "\u73EA\u85FB\u571F", category: "interior", pattern: "stucco", roughness: 0.95, metalness: 0, bump: 8e-3, colors: ["#f3efe6", "#e8dfcf", "#d9cdb7", "#cfd3cf"], note: "\u6E7F\u6C17\u3092\u5438\u3063\u305F\u308A\u5410\u3044\u305F\u308A\u3059\u308B\u5857\u308A\u58C1" },
    { id: "woodpanel", name: "\u677F\u5F35\u308A", category: "interior", pattern: "boardV", roughness: 0.7, metalness: 0, bump: 0.01, colors: ["#d8b98f", "#b88b5c", "#8a6240", "#e8d8bf"], note: "\u6728\u306E\u9999\u308A\u304C\u3059\u308B\u7E26\u5F35\u308A\u306E\u677F" },
    { id: "cloth-woven", name: "\u7E54\u7269\u30AF\u30ED\u30B9", category: "interior", pattern: "fabric", roughness: 0.95, metalness: 0, bump: 8e-3, colors: ["#f2ede2", "#e4dccb", "#d6d9d4", "#c9c2b6", "#e7d9cf"], note: "\u5E03\u306E\u7E54\u308A\u76EE\u304C\u3042\u308B\u4E0A\u54C1\u306A\u58C1\u7D19" },
    { id: "washi", name: "\u548C\u7D19\u30AF\u30ED\u30B9", category: "interior", pattern: "stucco", roughness: 0.95, metalness: 0, bump: 4e-3, colors: ["#f5f0e3", "#ece2cc", "#e0e3d8", "#d8cbb3"], note: "\u3084\u308F\u3089\u304B\u3044\u5149\u306E\u548C\u306E\u58C1\u7D19" },
    { id: "cloth-stone", name: "\u77F3\u76EE\u8ABF\u30AF\u30ED\u30B9", category: "interior", pattern: "stone", roughness: 0.9, metalness: 0, bump: 4e-3, colors: ["#efece6", "#d9d4cb", "#b9b3a9", "#8d8984"], note: "\u77F3\u306E\u3088\u3046\u306A\u67C4\u306E\u30A2\u30AF\u30BB\u30F3\u30C8\u58C1\u7D19" },
    { id: "shikkui-in", name: "\u6F06\u55B0\uFF08\u3057\u3063\u304F\u3044\uFF09", category: "interior", pattern: "stucco", roughness: 0.93, metalness: 0, bump: 6e-3, colors: ["#fbfaf6", "#f1ede3", "#e6e4dd", "#ece4d6"], note: "\u306B\u304A\u3044\u3092\u5438\u3046\u767D\u3044\u5857\u308A\u58C1" },
    { id: "paint", name: "\u5857\u88C5\uFF08\u6C34\u6027\u30DA\u30A4\u30F3\u30C8\uFF09", category: "interior", pattern: "stucco", roughness: 0.85, metalness: 0, bump: 2e-3, colors: ["#f6f5f1", "#e7e3da", "#cdd6d8", "#a9b6a3", "#d9b8a0", "#3e4a57"], note: "\u597D\u304D\u306A\u8272\u306B\u5857\u308C\u308B\u30B7\u30F3\u30D7\u30EB\u306A\u4ED5\u4E0A\u3052" },
    { id: "ecocarat", name: "\u8ABF\u6E7F\u30BF\u30A4\u30EB\uFF08\u30A8\u30B3\u30AB\u30E9\u30C3\u30C8\u98A8\uFF09", category: "interior", pattern: "border", roughness: 0.85, metalness: 0, bump: 0.025, colors: ["#e9e5dc", "#cbc3b4", "#9f978a", "#6d6862", "#43403d"], note: "\u51F9\u51F8\u306E\u3042\u308B\u58C1\u30BF\u30A4\u30EB\u3002\u6E7F\u6C17\u3068\u306B\u304A\u3044\u3092\u8ABF\u6574" },
    { id: "wall-tile", name: "\u58C1\u30BF\u30A4\u30EB\uFF08\u30AD\u30C3\u30C1\u30F3\u30FB\u6D74\u5BA4\uFF09", category: "interior", pattern: "mosaic", roughness: 0.25, metalness: 0, bump: 0.01, colors: ["#f5f5f2", "#dfe6e8", "#c8d3cf", "#3f4448", "#e8dccb"], note: "\u6C34\u3068\u6CB9\u306B\u5F37\u3044\u3064\u3084\u306E\u3042\u308B\u30BF\u30A4\u30EB" },
    { id: "accent-brick", name: "\u30EC\u30F3\u30AC\u30BF\u30A4\u30EB\uFF08\u5BA4\u5185\uFF09", category: "interior", pattern: "brick", roughness: 0.85, metalness: 0, bump: 0.025, colors: ["#b0563f", "#e8e2d6", "#8a7766", "#5a4b40"], note: "\u4E00\u9762\u3060\u3051\u8CBC\u3063\u3066\u30AB\u30D5\u30A7\u98A8\u306B" },
    { id: "shiplap", name: "\u677F\u5F35\u308A\uFF08\u6A2A\u5F35\u308A\uFF09", category: "interior", pattern: "clapboard", roughness: 0.7, metalness: 0, bump: 0.01, colors: ["#e8dcc6", "#c49a6c", "#8a6240", "#f2efe8", "#5b6b70"], note: "\u6A2A\u5411\u304D\u306E\u677F\u3067\u30CA\u30C1\u30E5\u30E9\u30EB\u306B" },
    { id: "concrete-in", name: "\u30B3\u30F3\u30AF\u30EA\u30FC\u30C8\u8ABF\u30D1\u30CD\u30EB", category: "interior", pattern: "concrete", roughness: 0.8, metalness: 0, bump: 8e-3, colors: ["#bdbcb8", "#a5a49f", "#d2d0ca", "#8d8c88"], note: "\u6253\u3061\u653E\u3057\u98A8\u306E\u30AF\u30FC\u30EB\u306A\u58C1" },
    { id: "kawara", name: "\u74E6", category: "roof", pattern: "kawara", roughness: 0.5, metalness: 0.1, bump: 0.04, colors: ["#3d4148", "#5a5f66", "#6b4a3a", "#8a8d90", "#2a2c30"], note: "\u548C\u98A8\u306E\u5BB6\u306E\u5B9A\u756A\u3002\u3068\u3066\u3082\u9577\u6301\u3061" },
    { id: "slate", name: "\u30B9\u30EC\u30FC\u30C8\uFF08\u30B3\u30ED\u30CB\u30A2\u30EB\uFF09", category: "roof", pattern: "slate", roughness: 0.75, metalness: 0, bump: 0.025, colors: ["#2f3133", "#4b4f54", "#5c4436", "#3f4a3d", "#344255"], note: "\u8584\u304F\u3066\u8EFD\u3044\u3002\u6D0B\u98A8\u306E\u5BB6\u306E\u5B9A\u756A" },
    { id: "standing", name: "\u30AC\u30EB\u30D0\u30EA\u30A6\u30E0\u7ACB\u5E73\u847A\u304D", category: "roof", pattern: "seam", roughness: 0.35, metalness: 0.65, bump: 0.02, colors: ["#2c2e31", "#6a6e73", "#a8adb2", "#3a4a5c", "#5b3b2e"], note: "\u3059\u3063\u304D\u308A\u3057\u305F\u91D1\u5C5E\u5C4B\u6839\u3002\u3086\u308B\u3044\u52FE\u914D\u306B\u3082" },
    { id: "sheet", name: "\u9632\u6C34\u30B7\u30FC\u30C8\uFF08\u9678\u5C4B\u6839\uFF09", category: "roof", pattern: "stucco", roughness: 0.9, metalness: 0, bump: 5e-3, colors: ["#8f9294", "#b3b5b5", "#6f7173"], note: "\u5E73\u3089\u306A\u5C4B\u6839\uFF08\u9678\u5C4B\u6839\uFF09\u306E\u9632\u6C34" },
    { id: "kawara-flat", name: "\u5E73\u677F\u74E6\uFF08F\u5F62\uFF09", category: "roof", pattern: "flatTile", roughness: 0.55, metalness: 0.05, bump: 0.035, colors: ["#2f3133", "#4b4f54", "#6b4a3a", "#8a8d90", "#3f4a3d"], note: "\u5E73\u3089\u306A\u5F62\u306E\u74E6\u3002\u548C\u306B\u3082\u6D0B\u306B\u3082\u5408\u3046" },
    { id: "kawara-s", name: "S\u5F62\u74E6\uFF08\u6D0B\u74E6\uFF09", category: "roof", pattern: "spanish", roughness: 0.6, metalness: 0, bump: 0.045, colors: ["#b5603f", "#a8714c", "#c98d5a", "#7a4a35", "#d1a77a"], note: "\u5357\u6B27\u98A8\u306E\u6CE2\u6253\u3064\u74E6" },
    { id: "shingle", name: "\u30A2\u30B9\u30D5\u30A1\u30EB\u30C8\u30B7\u30F3\u30B0\u30EB", category: "roof", pattern: "shingle", roughness: 0.95, metalness: 0, bump: 0.02, colors: ["#3b3d40", "#5a4a3e", "#6a6f63", "#7c3f32", "#46505c"], note: "\u5317\u7C73\u3067\u5B9A\u756A\u306E\u8EFD\u3044\u5C4B\u6839\u6750" },
    { id: "stone-coated", name: "\u81EA\u7136\u77F3\u7C92\u4ED5\u4E0A\u3052\u92FC\u677F", category: "roof", pattern: "flatTile", roughness: 0.95, metalness: 0.1, bump: 0.025, colors: ["#2f3133", "#4f4237", "#6b5546", "#3f4a3d", "#5d6166"], note: "\u92FC\u677F\u306B\u77F3\u306E\u7C92\u3092\u3064\u3051\u305F\u8EFD\u304F\u3066\u9759\u304B\u306A\u5C4B\u6839" },
    { id: "yokobuki", name: "\u30AC\u30EB\u30D0\u30EA\u30A6\u30E0\u6A2A\u847A\u304D", category: "roof", pattern: "clapboard", roughness: 0.35, metalness: 0.65, bump: 0.02, colors: ["#2c2e31", "#6a6e73", "#a8adb2", "#3a4a5c", "#5b3b2e"], note: "\u6A2A\u306E\u6BB5\u304C\u7F8E\u3057\u3044\u91D1\u5C5E\u5C4B\u6839" },
    { id: "copper", name: "\u9285\u677F\u847A\u304D", category: "roof", pattern: "slate", roughness: 0.35, metalness: 0.85, bump: 0.02, colors: ["#b87333", "#9c5a2a", "#5e8f7a", "#7fa894"], note: "\u5BFA\u793E\u3067\u3082\u4F7F\u3046\u9285\u3002\u5E74\u6708\u3067\u7DD1\u9752\u8272\u306B" },
    { id: "solar", name: "\u592A\u967D\u5149\u30D1\u30CD\u30EB\u4E00\u4F53\u578B\u5C4B\u6839", category: "roof", pattern: "solar", roughness: 0.2, metalness: 0.4, bump: 0.01, colors: ["#e6e9ee", "#cfd6e2", "#b8c0cc"], note: "\u5C4B\u6839\u5168\u4F53\u3067\u767A\u96FB\u3059\u308B\u30D1\u30CD\u30EB" },
    { id: "green-roof", name: "\u5C4B\u4E0A\u7DD1\u5316\uFF08\u829D\uFF09", category: "roof", pattern: "turf", roughness: 1, metalness: 0, bump: 0.03, colors: ["#6f8f4e", "#5b7d3f", "#8aa35d", "#4e6b39"], note: "\u5E73\u3089\u306A\u5C4B\u6839\u306B\u829D\u3002\u590F\u306E\u6691\u3055\u3092\u3084\u308F\u3089\u3052\u308B" },
    { id: "frp", name: "FRP\u9632\u6C34", category: "roof", pattern: "stucco", roughness: 0.5, metalness: 0, bump: 4e-3, colors: ["#a8aaa9", "#8f9294", "#c9cbca", "#6f7173"], note: "\u30D9\u30E9\u30F3\u30C0\u3084\u9678\u5C4B\u6839\u306E\u3064\u308B\u3063\u3068\u3057\u305F\u9632\u6C34" },
    { id: "flooring", name: "\u30D5\u30ED\u30FC\u30EA\u30F3\u30B0", category: "floor", pattern: "planks", roughness: 0.45, metalness: 0, bump: 6e-3, colors: ["#c8a57a", "#a77b52", "#7c5534", "#e0c9a6", "#5a4030", "#b9b2a6"], note: "\u5B9A\u756A\u306E\u5408\u677F\u30D5\u30ED\u30FC\u30EA\u30F3\u30B0" },
    { id: "tatami", name: "\u7573", category: "floor", pattern: "tatami", roughness: 0.85, metalness: 0, bump: 0.01, colors: ["#c7c48a", "#b5b07a", "#d7cf9a"], note: "\u3044\u8349\u306E\u9999\u308A\u306E\u548C\u5BA4" },
    { id: "floortile", name: "\u30BF\u30A4\u30EB", category: "floor", pattern: "tile", roughness: 0.3, metalness: 0, bump: 0.01, colors: ["#e9e6df", "#c9c4ba", "#8b8780", "#3f3f3f"], note: "\u6C34\u307E\u308F\u308A\u3084\u7384\u95A2\u306B\u5F37\u3044" },
    { id: "carpet", name: "\u30AB\u30FC\u30DA\u30C3\u30C8", category: "floor", pattern: "fabric", roughness: 1, metalness: 0, bump: 6e-3, colors: ["#8a8178", "#5d6a78", "#b8a998", "#6b7a5f"], note: "\u8DB3\u3056\u308F\u308A\u304C\u3084\u308F\u3089\u304B\u304F\u97F3\u3082\u9759\u304B" },
    { id: "solid-oak", name: "\u7121\u57A2\u30D5\u30ED\u30FC\u30EA\u30F3\u30B0\uFF08\u30AA\u30FC\u30AF\uFF09", category: "floor", pattern: "wideplank", roughness: 0.55, metalness: 0, bump: 8e-3, colors: ["#c8a57a", "#a77b52", "#7c5534", "#e0c9a6", "#5a4030"], note: "\u672C\u7269\u306E\u6728\u306E\u5E45\u5E83\u3044\u677F\u3002\u8DB3\u3056\u308F\u308A\u304C\u826F\u3044" },
    { id: "hinoki-floor", name: "\u7121\u57A2\u30D5\u30ED\u30FC\u30EA\u30F3\u30B0\uFF08\u6867\uFF09", category: "floor", pattern: "wideplank", roughness: 0.6, metalness: 0, bump: 6e-3, colors: ["#e6cfa3", "#d9bd8c", "#f0dfbd", "#c9a978"], note: "\u660E\u308B\u304F\u9999\u308A\u306E\u826F\u3044\u56FD\u7523\u306E\u6728" },
    { id: "walnut-floor", name: "\u7121\u57A2\u30D5\u30ED\u30FC\u30EA\u30F3\u30B0\uFF08\u30A6\u30A9\u30EB\u30CA\u30C3\u30C8\uFF09", category: "floor", pattern: "wideplank", roughness: 0.5, metalness: 0, bump: 6e-3, colors: ["#5a3e2b", "#6e4c35", "#4a3224", "#7d5a40"], note: "\u6DF1\u3044\u8336\u8272\u306E\u9AD8\u7D1A\u306A\u6728" },
    { id: "herringbone", name: "\u30D8\u30EA\u30F3\u30DC\u30FC\u30F3", category: "floor", pattern: "herringbone", roughness: 0.5, metalness: 0, bump: 8e-3, colors: ["#c8a57a", "#a77b52", "#7c5534", "#e0c9a6", "#5a4030"], note: "V\u5B57\u306B\u7D44\u3093\u3060\u677F\u5F35\u308A\u3002\u30E8\u30FC\u30ED\u30C3\u30D1\u98A8" },
    { id: "cushion-floor", name: "\u30AF\u30C3\u30B7\u30E7\u30F3\u30D5\u30ED\u30A2\uFF08\u6728\u76EE\uFF09", category: "floor", pattern: "planks", roughness: 0.55, metalness: 0, bump: 3e-3, colors: ["#c8a57a", "#a77b52", "#e0c9a6", "#b9b2a6", "#7c5534"], note: "\u6C34\u306B\u5F37\u304F\u5B89\u3044\u3002\u30C8\u30A4\u30EC\u3084\u6D17\u9762\u6240\u306B" },
    { id: "ryukyu", name: "\u7409\u7403\u7573\uFF08\u7E01\u306A\u3057\uFF09", category: "floor", pattern: "ryukyu", roughness: 0.85, metalness: 0, bump: 0.01, colors: ["#c7c48a", "#b5b07a", "#a9a69e", "#8c8c86", "#d7cf9a"], note: "\u534A\u7573\u3092\u5E02\u677E\u306B\u4E26\u3079\u305F\u30E2\u30C0\u30F3\u306A\u548C\u5BA4" },
    { id: "marble", name: "\u5927\u7406\u77F3", category: "floor", pattern: "marble", roughness: 0.15, metalness: 0, bump: 2e-3, colors: ["#f2efe9", "#e4ddd2", "#c9c6c2", "#2f2f31", "#d8c8b0"], note: "\u3064\u3084\u306E\u3042\u308B\u6700\u9AD8\u7D1A\u306E\u77F3\u306E\u5E8A" },
    { id: "big-tile", name: "\u5927\u5224\u30BF\u30A4\u30EB\uFF08600\xD71200\uFF09", category: "floor", pattern: "bigTile", roughness: 0.35, metalness: 0, bump: 6e-3, colors: ["#ece9e2", "#cfcac0", "#a7a39b", "#6a6762", "#3a3a3a"], note: "\u76EE\u5730\u304C\u5C11\u306A\u304F\u30DB\u30C6\u30EB\u306E\u3088\u3046\u306A\u5E8A" },
    { id: "mortar", name: "\u30E2\u30EB\u30BF\u30EB\uFF08\u571F\u9593\uFF09", category: "floor", pattern: "stucco", roughness: 0.8, metalness: 0, bump: 0.01, colors: ["#b5b3ad", "#9c9a95", "#c9c6be", "#8a8883"], note: "\u7384\u95A2\u3084\u571F\u9593\u306E\u30B7\u30F3\u30D7\u30EB\u306A\u5E8A" },
    { id: "cork", name: "\u30B3\u30EB\u30AF\u30BF\u30A4\u30EB", category: "floor", pattern: "tile", roughness: 0.9, metalness: 0, bump: 0.012, colors: ["#c49a6c", "#a77b52", "#d8b98f"], note: "\u3084\u308F\u3089\u304B\u304F\u6696\u304B\u3044\u3002\u5B50\u3069\u3082\u90E8\u5C4B\u306B" },
    { id: "deck", name: "\u30A6\u30C3\u30C9\u30C7\u30C3\u30AD", category: "floor", pattern: "wideplank", roughness: 0.8, metalness: 0, bump: 0.014, colors: ["#8a6447", "#a77b52", "#6b4a33", "#9c9488", "#c49a6c"], note: "\u5C4B\u5916\u306E\u30C6\u30E9\u30B9\u5411\u3051\u3002\u96E8\u306B\u5F37\u3044\u6A39\u8102\u6728\u30FB\u30CF\u30FC\u30C9\u30A6\u30C3\u30C9" },
    { id: "terrace-tile", name: "\u30C6\u30E9\u30B9\u30BF\u30A4\u30EB", category: "floor", pattern: "bigTile", roughness: 0.75, metalness: 0, bump: 0.01, colors: ["#c9c3b6", "#a8a196", "#8c8478", "#d9d2c4"], note: "\u5C4B\u5916\u7528\u306E\u6ED1\u308A\u306B\u304F\u3044\u77F3\u76EE\u306E\u30BF\u30A4\u30EB" },
    { id: "oak", name: "\u30AA\u30FC\u30AF\u6750", category: "wood", pattern: "grain", roughness: 0.55, metalness: 0, bump: 4e-3, colors: ["#c8a57a", "#a77b52", "#7c5534", "#4e3626", "#e8e3da"], note: "\u304B\u305F\u304F\u3066\u4E08\u592B\u306A\u5B9A\u756A\u306E\u6728" },
    { id: "walnut", name: "\u30A6\u30A9\u30EB\u30CA\u30C3\u30C8", category: "wood", pattern: "grain", roughness: 0.5, metalness: 0, bump: 4e-3, colors: ["#5a3e2b", "#6e4c35", "#4a3224", "#7d5a40"], note: "\u6DF1\u3044\u8336\u8272\u306E\u9AD8\u7D1A\u306A\u6728" },
    { id: "maple", name: "\u30E1\u30FC\u30D7\u30EB", category: "wood", pattern: "grain", roughness: 0.5, metalness: 0, bump: 3e-3, colors: ["#e3c9a0", "#d6b588", "#efdcbc"], note: "\u767D\u3063\u307D\u304F\u306A\u3081\u3089\u304B\u306A\u6728" },
    { id: "hinoki", name: "\u6867\uFF08\u3072\u306E\u304D\uFF09", category: "wood", pattern: "grain", roughness: 0.6, metalness: 0, bump: 3e-3, colors: ["#e6cfa3", "#d9bd8c", "#f0dfbd"], note: "\u9999\u308A\u306E\u826F\u3044\u56FD\u7523\u306E\u6728" },
    { id: "pine", name: "\u30D1\u30A4\u30F3", category: "wood", pattern: "grain", roughness: 0.65, metalness: 0, bump: 4e-3, colors: ["#e0bf8a", "#d1a76b", "#c2915a"], note: "\u7BC0\u306E\u3042\u308B\u7D20\u6734\u306A\u6728\u3002\u624B\u3054\u308D" },
    { id: "laminated", name: "\u96C6\u6210\u6750", category: "wood", pattern: "planks", roughness: 0.55, metalness: 0, bump: 4e-3, colors: ["#d8b98f", "#c8a57a", "#b88b5c"], note: "\u5C0F\u3055\u306A\u6728\u3092\u8CBC\u308A\u5408\u308F\u305B\u305F\u4E08\u592B\u306A\u6750" },
    { id: "wood-sheet", name: "\u30B7\u30FC\u30C8\u8CBC\u308A\uFF08\u6728\u76EE\u8ABF\uFF09", category: "wood", pattern: "grain", roughness: 0.45, metalness: 0, bump: 2e-3, colors: ["#c8a57a", "#a77b52", "#7c5534", "#4e3626", "#e8e3da", "#9a9a96"], note: "\u6728\u76EE\u3092\u5370\u5237\u3057\u305F\u30B7\u30FC\u30C8\u3002\u5B89\u304F\u3066\u50B7\u306B\u5F37\u3044" }
  ]
};

// src/catalog/openings.json
var openings_default = {
  types: [
    { id: "entrance", kind: "door", name: "\u7384\u95A2\u30C9\u30A2\uFF08\u7247\u958B\u304D\uFF09", width: 0.92, height: 2.33, sill: 0, style: "entrance" },
    { id: "entrance-wide", kind: "door", name: "\u7384\u95A2\u30C9\u30A2\uFF08\u89AA\u5B50\uFF09", width: 1.24, height: 2.33, sill: 0, style: "entranceDouble" },
    { id: "door", kind: "door", name: "\u5BA4\u5185\u30C9\u30A2", width: 0.78, height: 2, sill: 0, style: "swing" },
    { id: "slide-door", kind: "door", name: "\u5F15\u304D\u6238", width: 1.6, height: 2, sill: 0, style: "sliding" },
    { id: "sliding", kind: "window", name: "\u5F15\u304D\u9055\u3044\u7A93", width: 1.69, height: 1.17, sill: 0.9, style: "slidingWindow" },
    { id: "sliding-small", kind: "window", name: "\u5F15\u304D\u9055\u3044\u7A93\uFF08\u5C0F\uFF09", width: 0.78, height: 0.97, sill: 1, style: "slidingWindow" },
    { id: "patio", kind: "window", name: "\u6383\u304D\u51FA\u3057\u7A93", width: 1.69, height: 2.03, sill: 0, style: "slidingWindow" },
    { id: "casement", kind: "window", name: "\u7E26\u3059\u3079\u308A\u51FA\u3057\u7A93", width: 0.41, height: 1.17, sill: 0.9, style: "casement" },
    { id: "fix", kind: "window", name: "FIX\u7A93", width: 0.78, height: 0.78, sill: 1.3, style: "fix" },
    { id: "high", kind: "window", name: "\u9AD8\u7A93\uFF08\u6A2A\u9577\uFF09", width: 1.69, height: 0.37, sill: 1.95, style: "fix" },
    { id: "casement-tall", kind: "window", name: "\u7E26\u3059\u3079\u308A\u51FA\u3057\u7A93\uFF08\u7E26\u9577\uFF09", width: 0.41, height: 1.97, sill: 0.2, style: "casement" },
    { id: "big-fix", kind: "window", name: "\u5927\u958B\u53E3FIX\u7A93", width: 1.69, height: 1.97, sill: 0.2, style: "fix" },
    { id: "jimado", kind: "window", name: "\u5730\u7A93\uFF08\u8DB3\u5143\u306E\u6A2A\u9577\uFF09", width: 1.69, height: 0.47, sill: 0.1, style: "fix" }
  ],
  sashTypes: [
    { id: "alu", name: "\u30A2\u30EB\u30DF\u30B5\u30C3\u30B7", note: "\u8EFD\u304F\u3066\u5B89\u3044\u3002\u65AD\u71B1\u6027\u306F\u3075\u3064\u3046", priceRate: 1, roughness: 0.35, metalness: 0.6 },
    { id: "alu-resin", name: "\u30A2\u30EB\u30DF\u6A39\u8102\u8907\u5408\u30B5\u30C3\u30B7", note: "\u5916\u306F\u30A2\u30EB\u30DF\u3001\u5185\u306F\u6A39\u8102\u3002\u3044\u307E\u306E\u5B9A\u756A", priceRate: 1.3, roughness: 0.45, metalness: 0.35 },
    { id: "resin", name: "\u6A39\u8102\u30B5\u30C3\u30B7", note: "\u7D50\u9732\u3057\u306B\u304F\u304F\u65AD\u71B1\u6027\u304C\u9AD8\u3044", priceRate: 1.5, roughness: 0.6, metalness: 0 },
    { id: "resin-triple", name: "\u6A39\u8102\u30B5\u30C3\u30B7\uFF08\u30C8\u30EA\u30D7\u30EB\u30AC\u30E9\u30B9\uFF09", note: "\u30AC\u30E9\u30B93\u679A\u3067\u6700\u9AD8\u30AF\u30E9\u30B9\u306E\u65AD\u71B1", priceRate: 1.9, roughness: 0.6, metalness: 0 },
    { id: "wood", name: "\u6728\u88FD\u30B5\u30C3\u30B7", note: "\u6728\u306E\u306C\u304F\u3082\u308A\u3068\u9AD8\u3044\u65AD\u71B1\u3002\u624B\u5165\u308C\u304C\u5FC5\u8981", priceRate: 2.2, roughness: 0.6, metalness: 0, material: "oak" }
  ],
  sashColors: [
    { name: "\u30B7\u30EB\u30D0\u30FC", hex: "#b8bcc0" },
    { name: "\u30D6\u30E9\u30C3\u30AF", hex: "#26282b" },
    { name: "\u30DB\u30EF\u30A4\u30C8", hex: "#f1f1ef" },
    { name: "\u30D6\u30ED\u30F3\u30BA", hex: "#5a4636" },
    { name: "\u30B9\u30C6\u30F3", hex: "#8e9296" },
    { name: "\u30B7\u30E3\u30A4\u30F3\u30B0\u30EC\u30FC", hex: "#6f7377" },
    { name: "\u30C0\u30FC\u30AF\u30D6\u30E9\u30A6\u30F3", hex: "#3b2c22" },
    { name: "\u30CA\u30C1\u30E5\u30E9\u30EB\u6728\u76EE", hex: "#c8a57a" },
    { name: "\u30C1\u30FC\u30AF\u6728\u76EE", hex: "#7b4f2f" }
  ],
  panelColors: [
    { name: "\u30A6\u30A9\u30EB\u30CA\u30C3\u30C8", hex: "#5a3e2b" },
    { name: "\u30C1\u30A7\u30EA\u30FC", hex: "#8a5236" },
    { name: "\u30CA\u30C1\u30E5\u30E9\u30EB", hex: "#c8a57a" },
    { name: "\u30DB\u30EF\u30A4\u30C8", hex: "#efedea" },
    { name: "\u30D6\u30E9\u30C3\u30AF", hex: "#2a2b2d" },
    { name: "\u30CD\u30A4\u30D3\u30FC", hex: "#2d3b52" },
    { name: "\u30B0\u30EC\u30FC\u30B8\u30E5", hex: "#a69d92" },
    { name: "\u30AA\u30EA\u30FC\u30D6", hex: "#5f6b4a" },
    { name: "\u30EF\u30A4\u30F3\u30EC\u30C3\u30C9", hex: "#6b2a2e" }
  ]
};

// src/catalog/furniture.json
var furniture_default = {
  types: [
    {
      id: "bed-double",
      name: "\u30D9\u30C3\u30C9\uFF08\u30C0\u30D6\u30EB\uFF09",
      colors: [
        "#e9e4da",
        "#9aa7b3",
        "#c9b8a4",
        "#5d6670"
      ],
      parts: [
        {
          shape: "box",
          size: [
            1.44,
            0.3,
            2.06
          ],
          pos: [
            0,
            0.15,
            0
          ],
          paint: "wood"
        },
        {
          shape: "box",
          size: [
            1.4,
            0.22,
            1.98
          ],
          pos: [
            0,
            0.41,
            0.02
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            1.44,
            0.9,
            0.06
          ],
          pos: [
            0,
            0.45,
            -1
          ],
          paint: "wood"
        },
        {
          shape: "box",
          size: [
            0.55,
            0.12,
            0.35
          ],
          pos: [
            -0.35,
            0.58,
            -0.75
          ],
          paint: "white"
        },
        {
          shape: "box",
          size: [
            0.55,
            0.12,
            0.35
          ],
          pos: [
            0.35,
            0.58,
            -0.75
          ],
          paint: "white"
        }
      ]
    },
    {
      id: "bed-single",
      name: "\u30D9\u30C3\u30C9\uFF08\u30B7\u30F3\u30B0\u30EB\uFF09",
      colors: [
        "#e9e4da",
        "#9aa7b3",
        "#c9b8a4",
        "#5d6670"
      ],
      parts: [
        {
          shape: "box",
          size: [
            1,
            0.3,
            2.06
          ],
          pos: [
            0,
            0.15,
            0
          ],
          paint: "wood"
        },
        {
          shape: "box",
          size: [
            0.97,
            0.22,
            1.98
          ],
          pos: [
            0,
            0.41,
            0.02
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            1,
            0.9,
            0.06
          ],
          pos: [
            0,
            0.45,
            -1
          ],
          paint: "wood"
        },
        {
          shape: "box",
          size: [
            0.6,
            0.12,
            0.35
          ],
          pos: [
            0,
            0.58,
            -0.75
          ],
          paint: "white"
        }
      ]
    },
    {
      id: "sofa",
      name: "\u30BD\u30D5\u30A1\uFF083\u4EBA\u639B\u3051\uFF09",
      colors: [
        "#7d8a96",
        "#b9ab97",
        "#4f5b52",
        "#8a4f3d",
        "#3b3d42"
      ],
      parts: [
        {
          shape: "box",
          size: [
            2,
            0.2,
            0.9
          ],
          pos: [
            0,
            0.15,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            1.7,
            0.18,
            0.7
          ],
          pos: [
            0,
            0.34,
            0.08
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            2,
            0.5,
            0.2
          ],
          pos: [
            0,
            0.5,
            -0.35
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.15,
            0.4,
            0.9
          ],
          pos: [
            -0.925,
            0.45,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.15,
            0.4,
            0.9
          ],
          pos: [
            0.925,
            0.45,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            1.9,
            0.05,
            0.8
          ],
          pos: [
            0,
            0.025,
            0
          ],
          paint: "dark"
        }
      ]
    },
    {
      id: "dining",
      name: "\u30C0\u30A4\u30CB\u30F3\u30B0\u30C6\u30FC\u30D6\u30EB",
      colors: [
        "#c8a57a",
        "#7c5534",
        "#4e3626",
        "#e8e3da"
      ],
      parts: [
        {
          shape: "box",
          size: [
            1.6,
            0.04,
            0.85
          ],
          pos: [
            0,
            0.7,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.06,
            0.68,
            0.06
          ],
          pos: [
            -0.72,
            0.34,
            -0.35
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.06,
            0.68,
            0.06
          ],
          pos: [
            0.72,
            0.34,
            -0.35
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.06,
            0.68,
            0.06
          ],
          pos: [
            -0.72,
            0.34,
            0.35
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.06,
            0.68,
            0.06
          ],
          pos: [
            0.72,
            0.34,
            0.35
          ],
          paint: "main"
        }
      ]
    },
    {
      id: "chair",
      name: "\u30C1\u30A7\u30A2",
      colors: [
        "#c8a57a",
        "#7c5534",
        "#2f3133",
        "#e8e3da"
      ],
      parts: [
        {
          shape: "box",
          size: [
            0.44,
            0.04,
            0.44
          ],
          pos: [
            0,
            0.43,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.44,
            0.4,
            0.04
          ],
          pos: [
            0,
            0.65,
            -0.2
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.42,
            0.04
          ],
          pos: [
            -0.19,
            0.21,
            -0.19
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.42,
            0.04
          ],
          pos: [
            0.19,
            0.21,
            -0.19
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.42,
            0.04
          ],
          pos: [
            -0.19,
            0.21,
            0.19
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.42,
            0.04
          ],
          pos: [
            0.19,
            0.21,
            0.19
          ],
          paint: "main"
        }
      ]
    },
    {
      id: "tv",
      name: "\u30C6\u30EC\u30D3\u30DC\u30FC\u30C9\uFF0B\u30C6\u30EC\u30D3",
      colors: [
        "#4e3626",
        "#c8a57a",
        "#efedea",
        "#2f3133"
      ],
      parts: [
        {
          shape: "box",
          size: [
            1.8,
            0.4,
            0.42
          ],
          pos: [
            0,
            0.2,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            1.23,
            0.72,
            0.05
          ],
          pos: [
            0,
            0.86,
            -0.05
          ],
          paint: "black"
        },
        {
          shape: "box",
          size: [
            0.3,
            0.1,
            0.2
          ],
          pos: [
            0,
            0.45,
            -0.05
          ],
          paint: "black"
        }
      ]
    },
    {
      id: "desk",
      name: "\u30C7\u30B9\u30AF",
      colors: [
        "#c8a57a",
        "#7c5534",
        "#efedea",
        "#2f3133"
      ],
      parts: [
        {
          shape: "box",
          size: [
            1.2,
            0.03,
            0.6
          ],
          pos: [
            0,
            0.715,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.7,
            0.58
          ],
          pos: [
            -0.58,
            0.35,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.7,
            0.58
          ],
          pos: [
            0.58,
            0.35,
            0
          ],
          paint: "main"
        }
      ]
    },
    {
      id: "shelf",
      name: "\u672C\u68DA",
      colors: [
        "#c8a57a",
        "#7c5534",
        "#efedea",
        "#2f3133"
      ],
      parts: [
        {
          shape: "box",
          size: [
            0.9,
            1.8,
            0.03
          ],
          pos: [
            0,
            0.9,
            -0.14
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.03,
            1.8,
            0.3
          ],
          pos: [
            -0.435,
            0.9,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.03,
            1.8,
            0.3
          ],
          pos: [
            0.435,
            0.9,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.9,
            0.03,
            0.3
          ],
          pos: [
            0,
            0.015,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.9,
            0.03,
            0.3
          ],
          pos: [
            0,
            0.45,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.9,
            0.03,
            0.3
          ],
          pos: [
            0,
            0.9,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.9,
            0.03,
            0.3
          ],
          pos: [
            0,
            1.35,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.9,
            0.03,
            0.3
          ],
          pos: [
            0,
            1.785,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.7,
            0.28,
            0.2
          ],
          pos: [
            -0.05,
            1.05,
            0.02
          ],
          paint: "accent"
        },
        {
          shape: "box",
          size: [
            0.5,
            0.26,
            0.2
          ],
          pos: [
            0.1,
            0.6,
            0.02
          ],
          paint: "accent"
        }
      ]
    },
    {
      id: "kitchen",
      name: "\u30AD\u30C3\u30C1\u30F3\uFF08I\u578B\uFF09",
      colors: [
        "#efedea",
        "#2f3133",
        "#7c5534",
        "#5d6670"
      ],
      parts: [
        {
          shape: "box",
          size: [
            2.55,
            0.82,
            0.62
          ],
          pos: [
            0,
            0.41,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            2.57,
            0.03,
            0.65
          ],
          pos: [
            0,
            0.835,
            0
          ],
          paint: "counter"
        },
        {
          shape: "box",
          size: [
            0.7,
            0.02,
            0.4
          ],
          pos: [
            -0.6,
            0.85,
            0.02
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.6,
            0.02,
            0.45
          ],
          pos: [
            0.7,
            0.85,
            0.02
          ],
          paint: "black"
        },
        {
          shape: "box",
          size: [
            2.55,
            0.7,
            0.35
          ],
          pos: [
            0,
            1.95,
            -0.135
          ],
          paint: "main"
        }
      ]
    },
    {
      id: "fridge",
      name: "\u51B7\u8535\u5EAB",
      colors: [
        "#e8e8e6",
        "#9aa0a6",
        "#2f3133"
      ],
      parts: [
        {
          shape: "box",
          size: [
            0.68,
            1.82,
            0.7
          ],
          pos: [
            0,
            0.91,
            0
          ],
          paint: "main"
        }
      ]
    },
    {
      id: "bath",
      name: "\u30E6\u30CB\u30C3\u30C8\u30D0\u30B9\uFF08\u6D74\u69FD\uFF09",
      colors: [
        "#f4f4f2",
        "#dfe6ea",
        "#e8dfd2",
        "#5d6670"
      ],
      parts: [
        {
          shape: "box",
          size: [
            1.6,
            0.55,
            0.8
          ],
          pos: [
            0,
            0.275,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            1.4,
            0.04,
            0.6
          ],
          pos: [
            0,
            0.53,
            0
          ],
          paint: "white"
        },
        {
          shape: "box",
          size: [
            0.08,
            0.3,
            0.08
          ],
          pos: [
            0.65,
            0.7,
            -0.33
          ],
          paint: "steel"
        }
      ]
    },
    {
      id: "toilet",
      name: "\u30C8\u30A4\u30EC",
      colors: [
        "#f4f4f2",
        "#e8e3da",
        "#2f3133"
      ],
      parts: [
        {
          shape: "box",
          size: [
            0.38,
            0.4,
            0.5
          ],
          pos: [
            0,
            0.2,
            0.08
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.4,
            0.05,
            0.46
          ],
          pos: [
            0,
            0.42,
            0.1
          ],
          paint: "white"
        },
        {
          shape: "box",
          size: [
            0.42,
            0.42,
            0.2
          ],
          pos: [
            0,
            0.6,
            -0.22
          ],
          paint: "main"
        }
      ]
    },
    {
      id: "plant",
      name: "\u89B3\u8449\u690D\u7269",
      colors: [
        "#4f7a45",
        "#6c8f4e",
        "#3d5e3a"
      ],
      parts: [
        {
          shape: "cylinder",
          size: [
            0.32,
            0.38,
            0.32
          ],
          pos: [
            0,
            0.19,
            0
          ],
          paint: "white"
        },
        {
          shape: "sphere",
          size: [
            0.6,
            0.75,
            0.6
          ],
          pos: [
            0,
            0.85,
            0
          ],
          paint: "main"
        },
        {
          shape: "cylinder",
          size: [
            0.04,
            0.4,
            0.04
          ],
          pos: [
            0,
            0.45,
            0
          ],
          paint: "wood"
        }
      ]
    },
    {
      id: "rug",
      name: "\u30E9\u30B0",
      colors: [
        "#b9ab97",
        "#7d8a96",
        "#8a4f3d",
        "#e9e4da"
      ],
      parts: [
        {
          shape: "box",
          size: [
            2,
            0.015,
            1.4
          ],
          pos: [
            0,
            75e-4,
            0
          ],
          paint: "main"
        }
      ]
    },
    {
      id: "washbasin",
      name: "\u6D17\u9762\u5316\u7CA7\u53F0",
      colors: [
        "#f2f0eb",
        "#8a6a4c",
        "#3b3d40",
        "#9aa7b3"
      ],
      parts: [
        {
          shape: "box",
          size: [
            0.75,
            0.8,
            0.55
          ],
          pos: [
            0,
            0.4,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.77,
            0.04,
            0.57
          ],
          pos: [
            0,
            0.82,
            0
          ],
          paint: "counter"
        },
        {
          shape: "box",
          size: [
            0.45,
            0.06,
            0.34
          ],
          pos: [
            0,
            0.87,
            0.04
          ],
          paint: "white"
        },
        {
          shape: "box",
          size: [
            0.03,
            0.16,
            0.03
          ],
          pos: [
            0,
            0.94,
            -0.17
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.75,
            0.8,
            0.16
          ],
          pos: [
            0,
            1.55,
            -0.195
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.62,
            0.62,
            0.01
          ],
          pos: [
            0,
            1.55,
            -0.11
          ],
          paint: "steel"
        }
      ]
    },
    {
      id: "shoe-cabinet",
      name: "\u30B7\u30E5\u30FC\u30BA\u30DC\u30C3\u30AF\u30B9\uFF08\u4E0B\u99C4\u7BB1\uFF09",
      colors: [
        "#efedea",
        "#a0754d",
        "#5a3e2b",
        "#2f3133"
      ],
      parts: [
        {
          shape: "box",
          size: [
            1.2,
            0.88,
            0.4
          ],
          pos: [
            0,
            0.46,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            1.22,
            0.03,
            0.42
          ],
          pos: [
            0,
            0.915,
            0
          ],
          paint: "wood"
        },
        {
          shape: "box",
          size: [
            1.18,
            0.02,
            0.36
          ],
          pos: [
            0,
            0.01,
            0
          ],
          paint: "dark"
        },
        {
          shape: "box",
          size: [
            0.02,
            0.18,
            0.02
          ],
          pos: [
            -0.04,
            0.62,
            0.21
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.02,
            0.18,
            0.02
          ],
          pos: [
            0.04,
            0.62,
            0.21
          ],
          paint: "steel"
        }
      ]
    },
    {
      id: "kitchen-island",
      name: "\u5BFE\u9762\u30AD\u30C3\u30C1\u30F3\uFF08\u30DA\u30CB\u30F3\u30B7\u30E5\u30E9\uFF09",
      colors: [
        "#efedea",
        "#2f3133",
        "#7c5534",
        "#a69d92"
      ],
      parts: [
        {
          shape: "box",
          size: [
            2.55,
            0.85,
            0.75
          ],
          pos: [
            0,
            0.425,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            2.6,
            0.04,
            0.8
          ],
          pos: [
            0,
            0.87,
            0
          ],
          paint: "counter"
        },
        {
          shape: "box",
          size: [
            0.7,
            0.02,
            0.42
          ],
          pos: [
            0.45,
            0.895,
            -0.05
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.03,
            0.28,
            0.03
          ],
          pos: [
            0.45,
            1.03,
            -0.3
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.6,
            0.02,
            0.48
          ],
          pos: [
            -0.7,
            0.895,
            -0.04
          ],
          paint: "black"
        },
        {
          shape: "box",
          size: [
            2.55,
            0.18,
            0.06
          ],
          pos: [
            0,
            0.98,
            0.37
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.9,
            0.45,
            0.5
          ],
          pos: [
            -0.7,
            2.25,
            -0.1
          ],
          paint: "steel"
        }
      ]
    },
    {
      id: "cupboard",
      name: "\u98DF\u5668\u68DA",
      colors: [
        "#efedea",
        "#c8a57a",
        "#7c5534",
        "#2f3133"
      ],
      parts: [
        {
          shape: "box",
          size: [
            1.2,
            0.9,
            0.45
          ],
          pos: [
            0,
            0.45,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            1.22,
            0.03,
            0.47
          ],
          pos: [
            0,
            0.915,
            0
          ],
          paint: "counter"
        },
        {
          shape: "box",
          size: [
            1.2,
            1,
            0.35
          ],
          pos: [
            0,
            1.43,
            -0.05
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            1.1,
            0.8,
            0.01
          ],
          pos: [
            0,
            1.45,
            0.126
          ],
          paint: "white"
        },
        {
          shape: "box",
          size: [
            0.01,
            0.8,
            0.01
          ],
          pos: [
            0,
            1.45,
            0.13
          ],
          paint: "dark"
        }
      ]
    },
    {
      id: "low-table",
      name: "\u30ED\u30FC\u30C6\u30FC\u30D6\u30EB",
      colors: [
        "#c8a57a",
        "#7c5534",
        "#efedea",
        "#2f3133"
      ],
      parts: [
        {
          shape: "box",
          size: [
            1.1,
            0.04,
            0.6
          ],
          pos: [
            0,
            0.38,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            1,
            0.02,
            0.5
          ],
          pos: [
            0,
            0.12,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.05,
            0.36,
            0.05
          ],
          pos: [
            -0.5,
            0.18,
            -0.25
          ],
          paint: "wood"
        },
        {
          shape: "box",
          size: [
            0.05,
            0.36,
            0.05
          ],
          pos: [
            -0.5,
            0.18,
            0.25
          ],
          paint: "wood"
        },
        {
          shape: "box",
          size: [
            0.05,
            0.36,
            0.05
          ],
          pos: [
            0.5,
            0.18,
            -0.25
          ],
          paint: "wood"
        },
        {
          shape: "box",
          size: [
            0.05,
            0.36,
            0.05
          ],
          pos: [
            0.5,
            0.18,
            0.25
          ],
          paint: "wood"
        }
      ]
    },
    {
      id: "zataku",
      name: "\u5EA7\u5353\u3068\u5EA7\u5E03\u56E3\uFF08\u548C\u5BA4\uFF09",
      colors: [
        "#7a5535",
        "#4e3626",
        "#c8a57a"
      ],
      parts: [
        {
          shape: "box",
          size: [
            1.5,
            0.05,
            0.9
          ],
          pos: [
            0,
            0.33,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.08,
            0.31,
            0.08
          ],
          pos: [
            -0.66,
            0.155,
            -0.36
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.08,
            0.31,
            0.08
          ],
          pos: [
            -0.66,
            0.155,
            0.36
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.08,
            0.31,
            0.08
          ],
          pos: [
            0.66,
            0.155,
            -0.36
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.08,
            0.31,
            0.08
          ],
          pos: [
            0.66,
            0.155,
            0.36
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.5,
            0.07,
            0.5
          ],
          pos: [
            -0.4,
            0.035,
            -0.78
          ],
          paint: "accent"
        },
        {
          shape: "box",
          size: [
            0.5,
            0.07,
            0.5
          ],
          pos: [
            -0.4,
            0.035,
            0.78
          ],
          paint: "accent"
        },
        {
          shape: "box",
          size: [
            0.5,
            0.07,
            0.5
          ],
          pos: [
            0.4,
            0.035,
            -0.78
          ],
          paint: "accent"
        },
        {
          shape: "box",
          size: [
            0.5,
            0.07,
            0.5
          ],
          pos: [
            0.4,
            0.035,
            0.78
          ],
          paint: "accent"
        }
      ]
    },
    {
      id: "washer",
      name: "\u6D17\u6FEF\u6A5F\uFF08\u30C9\u30E9\u30E0\u5F0F\uFF09",
      colors: [
        "#f2f2f0",
        "#9aa0a6",
        "#2f3133"
      ],
      parts: [
        {
          shape: "box",
          size: [
            0.6,
            0.85,
            0.62
          ],
          pos: [
            0,
            0.425,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.36,
            0.36,
            0.02
          ],
          pos: [
            0,
            0.45,
            0.315
          ],
          paint: "dark"
        },
        {
          shape: "box",
          size: [
            0.5,
            0.06,
            0.02
          ],
          pos: [
            0,
            0.78,
            0.315
          ],
          paint: "steel"
        }
      ]
    },
    {
      id: "wardrobe",
      name: "\u30AF\u30ED\u30FC\u30BC\u30C3\u30C8\u53CE\u7D0D",
      colors: [
        "#efedea",
        "#c8a57a",
        "#7c5534",
        "#a69d92"
      ],
      parts: [
        {
          shape: "box",
          size: [
            1.6,
            2.2,
            0.6
          ],
          pos: [
            0,
            1.1,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.01,
            2.1,
            0.01
          ],
          pos: [
            0,
            1.1,
            0.305
          ],
          paint: "dark"
        },
        {
          shape: "box",
          size: [
            0.02,
            0.3,
            0.02
          ],
          pos: [
            -0.06,
            1.1,
            0.31
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.02,
            0.3,
            0.02
          ],
          pos: [
            0.06,
            1.1,
            0.31
          ],
          paint: "steel"
        }
      ]
    },
    {
      id: "curtain",
      name: "\u30AB\u30FC\u30C6\u30F3\uFF08\u7A93\u8FBA\uFF09",
      colors: [
        "#e9e4da",
        "#9aa7b3",
        "#c9b8a4",
        "#5f6b4a"
      ],
      parts: [
        {
          shape: "box",
          size: [
            2,
            0.03,
            0.05
          ],
          pos: [
            0,
            2.2,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.45,
            2.1,
            0.05
          ],
          pos: [
            -0.75,
            1.13,
            0.02
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.45,
            2.1,
            0.05
          ],
          pos: [
            0.75,
            1.13,
            0.02
          ],
          paint: "main"
        }
      ]
    },
    {
      id: "floor-lamp",
      name: "\u30D5\u30ED\u30A2\u30E9\u30A4\u30C8",
      colors: [
        "#efedea",
        "#c8a57a",
        "#2f3133"
      ],
      parts: [
        {
          shape: "cylinder",
          size: [
            0.3,
            0.03,
            0.3
          ],
          pos: [
            0,
            0.015,
            0
          ],
          paint: "dark"
        },
        {
          shape: "cylinder",
          size: [
            0.03,
            1.45,
            0.03
          ],
          pos: [
            0,
            0.75,
            0
          ],
          paint: "steel"
        },
        {
          shape: "cylinder",
          size: [
            0.42,
            0.3,
            0.42
          ],
          pos: [
            0,
            1.55,
            0
          ],
          paint: "main"
        }
      ]
    },
    {
      id: "aircon",
      name: "\u30A8\u30A2\u30B3\u30F3\uFF08\u58C1\u639B\u3051\uFF09",
      colors: [
        "#f4f4f2",
        "#e8e3da",
        "#2f3133"
      ],
      parts: [
        {
          shape: "box",
          size: [
            0.8,
            0.28,
            0.24
          ],
          pos: [
            0,
            2.4,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.7,
            0.03,
            0.02
          ],
          pos: [
            0,
            2.28,
            0.12
          ],
          paint: "dark"
        }
      ]
    },
    {
      id: "sofa-l",
      name: "L\u5B57\u30BD\u30D5\u30A1",
      colors: [
        "#b9ab97",
        "#7d8a96",
        "#4f5b52",
        "#e9e4da"
      ],
      parts: [
        {
          shape: "box",
          size: [
            2.2,
            0.42,
            0.9
          ],
          pos: [
            0,
            0.21,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            2.2,
            0.42,
            0.18
          ],
          pos: [
            0,
            0.62,
            -0.36
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.9,
            0.42,
            0.75
          ],
          pos: [
            0.65,
            0.21,
            0.82
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.18,
            0.6,
            0.9
          ],
          pos: [
            -1.01,
            0.3,
            0
          ],
          paint: "main"
        }
      ]
    },
    {
      id: "pool",
      name: "\u30D7\u30FC\u30EB",
      category: "outdoor",
      colors: [
        "#e8e6e0",
        "#cfd6dc",
        "#d9cbb5",
        "#9aa3a8"
      ],
      parts: [
        {
          shape: "box",
          size: [
            4,
            0.3,
            0.2
          ],
          pos: [
            0,
            0.15,
            -0.9
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            4,
            0.3,
            0.2
          ],
          pos: [
            0,
            0.15,
            0.9
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.2,
            0.3,
            1.6
          ],
          pos: [
            -1.9,
            0.15,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.2,
            0.3,
            1.6
          ],
          pos: [
            1.9,
            0.15,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            3.6,
            0.24,
            1.6
          ],
          pos: [
            0,
            0.12,
            0
          ],
          paint: "water"
        },
        {
          shape: "cylinder",
          size: [
            0.04,
            0.6,
            0.04
          ],
          pos: [
            1.65,
            0.45,
            -0.3
          ],
          paint: "steel"
        },
        {
          shape: "cylinder",
          size: [
            0.04,
            0.6,
            0.04
          ],
          pos: [
            1.65,
            0.45,
            0.3
          ],
          paint: "steel"
        }
      ]
    },
    {
      id: "flowerbed",
      name: "\u82B1\u58C7",
      category: "outdoor",
      colors: [
        "#e0465a",
        "#f2c230",
        "#f08fb3",
        "#f5f2ea",
        "#8a63c9"
      ],
      parts: [
        {
          shape: "box",
          size: [
            1.8,
            0.3,
            0.6
          ],
          pos: [
            0,
            0.15,
            0
          ],
          paint: "stone"
        },
        {
          shape: "box",
          size: [
            1.7,
            0.04,
            0.5
          ],
          pos: [
            0,
            0.31,
            0
          ],
          paint: "soil"
        },
        {
          shape: "sphere",
          size: [
            0.5,
            0.28,
            0.4
          ],
          pos: [
            -0.6,
            0.42,
            0
          ],
          paint: "green"
        },
        {
          shape: "sphere",
          size: [
            0.5,
            0.3,
            0.4
          ],
          pos: [
            0,
            0.43,
            0
          ],
          paint: "green"
        },
        {
          shape: "sphere",
          size: [
            0.5,
            0.28,
            0.4
          ],
          pos: [
            0.6,
            0.42,
            0
          ],
          paint: "green"
        },
        {
          shape: "sphere",
          size: [
            0.13,
            0.11,
            0.13
          ],
          pos: [
            -0.7,
            0.58,
            -0.12
          ],
          paint: "main"
        },
        {
          shape: "sphere",
          size: [
            0.13,
            0.11,
            0.13
          ],
          pos: [
            -0.45,
            0.58,
            0.1
          ],
          paint: "main"
        },
        {
          shape: "sphere",
          size: [
            0.13,
            0.11,
            0.13
          ],
          pos: [
            -0.2,
            0.58,
            -0.08
          ],
          paint: "main"
        },
        {
          shape: "sphere",
          size: [
            0.13,
            0.11,
            0.13
          ],
          pos: [
            0.05,
            0.58,
            0.12
          ],
          paint: "main"
        },
        {
          shape: "sphere",
          size: [
            0.13,
            0.11,
            0.13
          ],
          pos: [
            0.3,
            0.58,
            -0.1
          ],
          paint: "main"
        },
        {
          shape: "sphere",
          size: [
            0.13,
            0.11,
            0.13
          ],
          pos: [
            0.55,
            0.58,
            0.08
          ],
          paint: "main"
        },
        {
          shape: "sphere",
          size: [
            0.13,
            0.11,
            0.13
          ],
          pos: [
            0.75,
            0.58,
            -0.05
          ],
          paint: "main"
        }
      ]
    },
    {
      id: "flowerpot",
      name: "\u82B1\u306E\u9262\u690D\u3048",
      category: "outdoor",
      colors: [
        "#e0465a",
        "#f2c230",
        "#f08fb3",
        "#f5f2ea",
        "#8a63c9"
      ],
      parts: [
        {
          shape: "cylinder",
          size: [
            0.34,
            0.32,
            0.34
          ],
          pos: [
            0,
            0.16,
            0
          ],
          paint: "terracotta"
        },
        {
          shape: "sphere",
          size: [
            0.4,
            0.26,
            0.4
          ],
          pos: [
            0,
            0.42,
            0
          ],
          paint: "green"
        },
        {
          shape: "sphere",
          size: [
            0.11,
            0.1,
            0.11
          ],
          pos: [
            -0.08,
            0.55,
            -0.06
          ],
          paint: "main"
        },
        {
          shape: "sphere",
          size: [
            0.11,
            0.1,
            0.11
          ],
          pos: [
            0.09,
            0.55,
            -0.04
          ],
          paint: "main"
        },
        {
          shape: "sphere",
          size: [
            0.11,
            0.1,
            0.11
          ],
          pos: [
            0,
            0.55,
            0.09
          ],
          paint: "main"
        },
        {
          shape: "sphere",
          size: [
            0.11,
            0.1,
            0.11
          ],
          pos: [
            0.02,
            0.55,
            -0.01
          ],
          paint: "main"
        }
      ]
    },
    {
      id: "mailbox",
      name: "\u96C6\u5408\u30DD\u30B9\u30C8",
      category: "outdoor",
      colors: [
        "#9aa0a6",
        "#2f3133",
        "#efedea",
        "#7c5534"
      ],
      parts: [
        {
          shape: "box",
          size: [
            1.2,
            0.9,
            0.35
          ],
          pos: [
            0,
            1,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.32,
            0.02,
            0.02
          ],
          pos: [
            -0.4,
            0.75,
            0.18
          ],
          paint: "dark"
        },
        {
          shape: "box",
          size: [
            0.32,
            0.02,
            0.02
          ],
          pos: [
            -0.4,
            1.05,
            0.18
          ],
          paint: "dark"
        },
        {
          shape: "box",
          size: [
            0.32,
            0.02,
            0.02
          ],
          pos: [
            -0.4,
            1.3,
            0.18
          ],
          paint: "dark"
        },
        {
          shape: "box",
          size: [
            0.32,
            0.02,
            0.02
          ],
          pos: [
            0,
            0.75,
            0.18
          ],
          paint: "dark"
        },
        {
          shape: "box",
          size: [
            0.32,
            0.02,
            0.02
          ],
          pos: [
            0,
            1.05,
            0.18
          ],
          paint: "dark"
        },
        {
          shape: "box",
          size: [
            0.32,
            0.02,
            0.02
          ],
          pos: [
            0,
            1.3,
            0.18
          ],
          paint: "dark"
        },
        {
          shape: "box",
          size: [
            0.32,
            0.02,
            0.02
          ],
          pos: [
            0.4,
            0.75,
            0.18
          ],
          paint: "dark"
        },
        {
          shape: "box",
          size: [
            0.32,
            0.02,
            0.02
          ],
          pos: [
            0.4,
            1.05,
            0.18
          ],
          paint: "dark"
        },
        {
          shape: "box",
          size: [
            0.32,
            0.02,
            0.02
          ],
          pos: [
            0.4,
            1.3,
            0.18
          ],
          paint: "dark"
        },
        {
          shape: "box",
          size: [
            0.06,
            0.55,
            0.06
          ],
          pos: [
            -0.5,
            0.275,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.06,
            0.55,
            0.06
          ],
          pos: [
            0.5,
            0.275,
            0
          ],
          paint: "steel"
        }
      ]
    },
    {
      id: "tree",
      name: "\u5EAD\u6728\uFF08\u30B7\u30F3\u30DC\u30EB\u30C4\u30EA\u30FC\uFF09",
      category: "outdoor",
      colors: [
        "#4f7a45",
        "#6c8f4e",
        "#3d5e3a",
        "#8a9a3e"
      ],
      parts: [
        {
          shape: "cylinder",
          size: [
            0.2,
            1.9,
            0.2
          ],
          pos: [
            0,
            0.95,
            0
          ],
          paint: "wood"
        },
        {
          shape: "sphere",
          size: [
            1.7,
            1.6,
            1.7
          ],
          pos: [
            0,
            2.4,
            0
          ],
          paint: "main"
        },
        {
          shape: "sphere",
          size: [
            1.2,
            1.1,
            1.2
          ],
          pos: [
            0.25,
            3.2,
            -0.1
          ],
          paint: "main"
        },
        {
          shape: "sphere",
          size: [
            0.9,
            0.8,
            0.9
          ],
          pos: [
            -0.45,
            2.9,
            0.3
          ],
          paint: "main"
        }
      ]
    },
    {
      id: "hedge",
      name: "\u751F\u57A3",
      category: "outdoor",
      colors: [
        "#3d5e3a",
        "#4f7a45",
        "#6c8f4e"
      ],
      parts: [
        {
          shape: "box",
          size: [
            1.8,
            0.95,
            0.55
          ],
          pos: [
            0,
            0.5,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            1.7,
            0.2,
            0.45
          ],
          pos: [
            0,
            1.02,
            0
          ],
          paint: "main"
        }
      ]
    },
    {
      id: "nameplate-post",
      name: "\u9580\u67F1\u3068\u8868\u672D",
      category: "outdoor",
      colors: [
        "#f2efe8",
        "#2f2a26",
        "#b8a07a",
        "#c9c5bb"
      ],
      label: {
        pos: [
          0,
          0.95,
          0.161
        ],
        size: [
          0.34,
          0.12
        ]
      },
      parts: [
        {
          shape: "box",
          size: [
            0.5,
            1.2,
            0.3
          ],
          pos: [
            0,
            0.6,
            0
          ],
          paint: "stone"
        },
        {
          shape: "box",
          size: [
            0.38,
            0.15,
            0.02
          ],
          pos: [
            0,
            0.95,
            0.15
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.56,
            0.06,
            0.36
          ],
          pos: [
            0,
            1.23,
            0
          ],
          paint: "dark"
        }
      ]
    },
    {
      id: "nameplate",
      name: "\u8868\u672D\uFF08\u58C1\u4ED8\u3051\uFF09",
      category: "outdoor",
      colors: [
        "#f2efe8",
        "#2f2a26",
        "#b8a07a",
        "#5a4030"
      ],
      label: {
        pos: [
          0,
          1.6,
          0.0135
        ],
        size: [
          0.3,
          0.1
        ]
      },
      parts: [
        {
          shape: "box",
          size: [
            0.34,
            0.13,
            0.025
          ],
          pos: [
            0,
            1.6,
            0
          ],
          paint: "main"
        }
      ]
    },
    {
      id: "garage-paving",
      name: "\u30AC\u30EC\u30FC\u30B8\uFF1A\u571F\u9593\u30B3\u30F3\u30AF\u30EA\u30FC\u30C8 3\xD76m",
      parts: [
        {
          shape: "box",
          size: [
            3,
            0.06,
            6
          ],
          pos: [
            0,
            0.03,
            0
          ],
          paint: "stone"
        },
        {
          shape: "box",
          size: [
            0.06,
            5e-3,
            5
          ],
          pos: [
            1.2,
            0.063,
            0
          ],
          paint: "white"
        },
        {
          shape: "box",
          size: [
            0.06,
            5e-3,
            5
          ],
          pos: [
            -1.2,
            0.063,
            0
          ],
          paint: "white"
        }
      ],
      category: "outdoor",
      grounded: true,
      collisionParts: true,
      colors: [
        "#9ca4ac",
        "#383f45",
        "#eeeae0",
        "#765a40"
      ]
    },
    {
      id: "garage-wall",
      name: "\u30AC\u30EC\u30FC\u30B8\uFF1A\u92FC\u677F\u58C1 3m",
      parts: [
        {
          shape: "box",
          size: [
            3,
            2.5,
            0.1
          ],
          pos: [
            0,
            1.25,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.07,
            2.5,
            0.16
          ],
          pos: [
            -1.45,
            1.25,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.07,
            2.5,
            0.16
          ],
          pos: [
            0,
            1.25,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.07,
            2.5,
            0.16
          ],
          pos: [
            1.45,
            1.25,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.025,
            2.4,
            0.03
          ],
          pos: [
            -1.4,
            1.25,
            0.065
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.025,
            2.4,
            0.03
          ],
          pos: [
            -1.2,
            1.25,
            0.065
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.025,
            2.4,
            0.03
          ],
          pos: [
            -0.9999999999999999,
            1.25,
            0.065
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.025,
            2.4,
            0.03
          ],
          pos: [
            -0.7999999999999998,
            1.25,
            0.065
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.025,
            2.4,
            0.03
          ],
          pos: [
            -0.5999999999999999,
            1.25,
            0.065
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.025,
            2.4,
            0.03
          ],
          pos: [
            -0.3999999999999999,
            1.25,
            0.065
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.025,
            2.4,
            0.03
          ],
          pos: [
            -0.19999999999999973,
            1.25,
            0.065
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.025,
            2.4,
            0.03
          ],
          pos: [
            2220446049250313e-31,
            1.25,
            0.065
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.025,
            2.4,
            0.03
          ],
          pos: [
            0.20000000000000018,
            1.25,
            0.065
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.025,
            2.4,
            0.03
          ],
          pos: [
            0.40000000000000013,
            1.25,
            0.065
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.025,
            2.4,
            0.03
          ],
          pos: [
            0.6000000000000001,
            1.25,
            0.065
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.025,
            2.4,
            0.03
          ],
          pos: [
            0.8000000000000003,
            1.25,
            0.065
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.025,
            2.4,
            0.03
          ],
          pos: [
            1.0000000000000004,
            1.25,
            0.065
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.025,
            2.4,
            0.03
          ],
          pos: [
            1.2000000000000002,
            1.25,
            0.065
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.025,
            2.4,
            0.03
          ],
          pos: [
            1.4000000000000004,
            1.25,
            0.065
          ],
          paint: "steel"
        }
      ],
      category: "outdoor",
      grounded: true,
      collisionParts: true,
      colors: [
        "#9ca4ac",
        "#383f45",
        "#eeeae0",
        "#765a40"
      ]
    },
    {
      id: "garage-column",
      name: "\u30AC\u30EC\u30FC\u30B8\uFF1A\u67F1 2.6m",
      parts: [
        {
          shape: "box",
          size: [
            0.14,
            2.6,
            0.14
          ],
          pos: [
            0,
            1.3,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.3,
            0.08,
            0.3
          ],
          pos: [
            0,
            0.04,
            0
          ],
          paint: "stone"
        }
      ],
      category: "outdoor",
      grounded: true,
      collisionParts: true,
      colors: [
        "#9ca4ac",
        "#383f45",
        "#eeeae0",
        "#765a40"
      ]
    },
    {
      id: "garage-roof",
      name: "\u30AC\u30EC\u30FC\u30B8\uFF1A\u6298\u677F\u5C4B\u6839 3\xD76m",
      parts: [
        {
          shape: "box",
          size: [
            3,
            0.12,
            6
          ],
          pos: [
            0,
            2.66,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.08,
            0.18,
            5.8
          ],
          pos: [
            -1.3,
            2.52,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.08,
            0.18,
            5.8
          ],
          pos: [
            1.3,
            2.52,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.04,
            6
          ],
          pos: [
            -1.4,
            2.74,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.04,
            6
          ],
          pos: [
            -1.17,
            2.74,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.04,
            6
          ],
          pos: [
            -0.94,
            2.74,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.04,
            6
          ],
          pos: [
            -0.7099999999999999,
            2.74,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.04,
            6
          ],
          pos: [
            -0.47999999999999987,
            2.74,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.04,
            6
          ],
          pos: [
            -0.24999999999999978,
            2.74,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.04,
            6
          ],
          pos: [
            -0.019999999999999796,
            2.74,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.04,
            6
          ],
          pos: [
            0.2100000000000002,
            2.74,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.04,
            6
          ],
          pos: [
            0.44000000000000017,
            2.74,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.04,
            6
          ],
          pos: [
            0.6700000000000004,
            2.74,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.04,
            6
          ],
          pos: [
            0.9000000000000004,
            2.74,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.04,
            6
          ],
          pos: [
            1.1300000000000003,
            2.74,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.04,
            6
          ],
          pos: [
            1.3600000000000003,
            2.74,
            0
          ],
          paint: "steel"
        }
      ],
      category: "outdoor",
      grounded: true,
      collisionParts: true,
      colors: [
        "#9ca4ac",
        "#383f45",
        "#eeeae0",
        "#765a40"
      ]
    },
    {
      id: "garage-carport",
      name: "\u30AC\u30EC\u30FC\u30B8\uFF1A\u30AB\u30FC\u30DD\u30FC\u30C8\u4E00\u5F0F 3.6\xD76m",
      parts: [
        {
          shape: "box",
          size: [
            0.14,
            2.6,
            0.14
          ],
          pos: [
            -1.65,
            1.3,
            -2.5
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.14,
            2.6,
            0.14
          ],
          pos: [
            -1.65,
            1.3,
            2.5
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.14,
            2.6,
            0.14
          ],
          pos: [
            1.65,
            1.3,
            -2.5
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.14,
            2.6,
            0.14
          ],
          pos: [
            1.65,
            1.3,
            2.5
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            3.6,
            0.12,
            6
          ],
          pos: [
            0,
            2.66,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.05,
            6
          ],
          pos: [
            -1.65,
            2.74,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.05,
            6
          ],
          pos: [
            -1.415,
            2.74,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.05,
            6
          ],
          pos: [
            -1.18,
            2.74,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.05,
            6
          ],
          pos: [
            -0.945,
            2.74,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.05,
            6
          ],
          pos: [
            -0.71,
            2.74,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.05,
            6
          ],
          pos: [
            -0.4750000000000001,
            2.74,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.05,
            6
          ],
          pos: [
            -0.24,
            2.74,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.05,
            6
          ],
          pos: [
            -0.004999999999999893,
            2.74,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.05,
            6
          ],
          pos: [
            0.22999999999999998,
            2.74,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.05,
            6
          ],
          pos: [
            0.46499999999999986,
            2.74,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.05,
            6
          ],
          pos: [
            0.6999999999999997,
            2.74,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.05,
            6
          ],
          pos: [
            0.935,
            2.74,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.05,
            6
          ],
          pos: [
            1.17,
            2.74,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.05,
            6
          ],
          pos: [
            1.4049999999999998,
            2.74,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.04,
            0.05,
            6
          ],
          pos: [
            1.6400000000000001,
            2.74,
            0
          ],
          paint: "steel"
        }
      ],
      category: "outdoor",
      grounded: true,
      collisionParts: true,
      colors: [
        "#9ca4ac",
        "#383f45",
        "#eeeae0",
        "#765a40"
      ]
    },
    {
      id: "garage-shutter",
      name: "\u30AC\u30EC\u30FC\u30B8\uFF1A\u958B\u9589\u30B7\u30E3\u30C3\u30BF\u30FC\uFF08F\uFF09\u5E453m",
      parts: [
        {
          shape: "box",
          size: [
            0.12,
            2.6,
            0.18
          ],
          pos: [
            -1.58,
            1.3,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.12,
            2.6,
            0.18
          ],
          pos: [
            1.58,
            1.3,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            3.3,
            0.3,
            0.34
          ],
          pos: [
            0,
            2.68,
            0
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            3.04,
            0.12,
            0.07
          ],
          pos: [
            0,
            0.065,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            3.04,
            0.12,
            0.07
          ],
          pos: [
            0,
            0.19,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            3.04,
            0.12,
            0.07
          ],
          pos: [
            0,
            0.315,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            3.04,
            0.12,
            0.07
          ],
          pos: [
            0,
            0.44,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            3.04,
            0.12,
            0.07
          ],
          pos: [
            0,
            0.565,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            3.04,
            0.12,
            0.07
          ],
          pos: [
            0,
            0.69,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            3.04,
            0.12,
            0.07
          ],
          pos: [
            0,
            0.815,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            3.04,
            0.12,
            0.07
          ],
          pos: [
            0,
            0.94,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            3.04,
            0.12,
            0.07
          ],
          pos: [
            0,
            1.065,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            3.04,
            0.12,
            0.07
          ],
          pos: [
            0,
            1.19,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            3.04,
            0.12,
            0.07
          ],
          pos: [
            0,
            1.315,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            3.04,
            0.12,
            0.07
          ],
          pos: [
            0,
            1.44,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            3.04,
            0.12,
            0.07
          ],
          pos: [
            0,
            1.565,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            3.04,
            0.12,
            0.07
          ],
          pos: [
            0,
            1.69,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            3.04,
            0.12,
            0.07
          ],
          pos: [
            0,
            1.815,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            3.04,
            0.12,
            0.07
          ],
          pos: [
            0,
            1.94,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            3.04,
            0.12,
            0.07
          ],
          pos: [
            0,
            2.065,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            3.04,
            0.12,
            0.07
          ],
          pos: [
            0,
            2.19,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            3.04,
            0.12,
            0.07
          ],
          pos: [
            0,
            2.315,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            3.04,
            0.12,
            0.07
          ],
          pos: [
            0,
            2.44,
            0
          ],
          paint: "main"
        },
        {
          shape: "box",
          size: [
            0.4,
            0.04,
            0.05
          ],
          pos: [
            0,
            0.75,
            0.07
          ],
          paint: "black"
        }
      ],
      category: "outdoor",
      grounded: true,
      collisionParts: true,
      colors: [
        "#9ca4ac",
        "#383f45",
        "#eeeae0",
        "#765a40"
      ]
    }
  ]
};

// src/catalog/index.ts
var MATERIAL_CATEGORY_NAMES = materials_default.categories;
var MATERIALS = materials_default.materials;
var OPENINGS = openings_default.types;
var SASH_COLORS = openings_default.sashColors;
var PANEL_COLORS = openings_default.panelColors;
var SASH_TYPES = openings_default.sashTypes;
var FURNITURE = furniture_default.types;
var materialById = new Map(MATERIALS.map((m) => [m.id, m]));
var openingById = new Map(OPENINGS.map((o) => [o.id, o]));
var furnitureById = new Map(FURNITURE.map((f) => [f.id, f]));
function getSashType(id) {
  return SASH_TYPES.find((t) => t.id === id) ?? SASH_TYPES[0];
}
function getOpening(id) {
  const def = openingById.get(id);
  if (!def) throw new Error(`unknown opening type: ${id}`);
  return def;
}

// src/building/rules.ts
var idCounter = 0;
function newId(prefix) {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
function rectInsideLot(r) {
  return r.x0 >= 0 && r.z0 >= 0 && r.x1 <= lotSize.w && r.z1 <= lotSize.d && r.x1 > r.x0 && r.z1 > r.z0;
}
function rectsOverlap(a, b) {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
}
function wallsUnder(house, level, r) {
  return house.walls.some((w) => {
    if (w.level !== level || w.height && w.height !== "full") return false;
    const x0 = Math.min(w.x0, w.x1);
    const x1 = Math.max(w.x0, w.x1);
    const z0 = Math.min(w.z0, w.z1);
    const z1 = Math.max(w.z0, w.z1);
    return x0 <= r.x1 && x1 >= r.x0 && z0 <= r.z1 && z1 >= r.z0 && (x1 > r.x0 && x0 < r.x1 || z1 > r.z0 && z0 < r.z1);
  });
}
function canPlaceFloor(house, level, r) {
  if (!rectInsideLot(r)) return "\u571F\u5730\u306E\u5916\u306B\u306F\u7F6E\u3051\u307E\u305B\u3093";
  if (house.floors.some((f) => f.level === level && rectsOverlap(f, r))) return "\u3059\u3067\u306B\u5E8A\u304C\u3042\u308A\u307E\u3059";
  if (level > 0 && !wallsUnder(house, level - 1, r)) return "\u5E8A\u306F\u5730\u9762\u306E\u4E0A\u304B\u3001\u58C1\u306E\u4E0A\u306B\u5F35\u308C\u307E\u3059";
  return null;
}
function canPlaceRoof(house, level, r) {
  if (!rectInsideLot(r)) return "\u571F\u5730\u306E\u5916\u306B\u306F\u7F6E\u3051\u307E\u305B\u3093";
  if (house.roofs.some((f) => f.level === level && rectsOverlap(f, r))) return "\u3059\u3067\u306B\u5C4B\u6839\u304C\u3042\u308A\u307E\u3059";
  return null;
}
function wallHeight(w) {
  return w.height === "fence" ? 1.2 : w.height === "privacyFence" ? 1.8 : w.height === "half" ? WALL_HEIGHT / 2 : WALL_HEIGHT;
}
function canChangeWallHeight(house, wallId, height) {
  const top = wallHeight({ height }) - 0.05;
  const tooTall = house.openings.some((o) => {
    if (o.wallId !== wallId) return false;
    const d = getOpening(o.type);
    return d.sill + d.height > top;
  });
  return tooTall ? "\u4ED8\u3044\u3066\u3044\u308B\u7A93\u30FB\u30C9\u30A2\u304C\u53CE\u307E\u308A\u307E\u305B\u3093" : null;
}
function wallLength(w) {
  return Math.hypot(w.x1 - w.x0, w.z1 - w.z0) * GRID;
}
function wallDir(w) {
  const len = Math.hypot(w.x1 - w.x0, w.z1 - w.z0);
  return { dx: (w.x1 - w.x0) / len, dz: (w.z1 - w.z0) / len };
}
function segmentRange(w) {
  const horizontal = w.z0 === w.z1;
  return horizontal ? { horizontal, line: w.z0, lo: Math.min(w.x0, w.x1), hi: Math.max(w.x0, w.x1) } : { horizontal, line: w.x0, lo: Math.min(w.z0, w.z1), hi: Math.max(w.z0, w.z1) };
}
function wallsOverlap(a, b) {
  const ra = segmentRange(a);
  const rb = segmentRange(b);
  if (ra.horizontal !== rb.horizontal || ra.line !== rb.line) return false;
  return ra.lo < rb.hi && rb.lo < ra.hi;
}
function canPlaceWall(house, w) {
  if (w.x0 !== w.x1 && w.z0 !== w.z1) return "\u58C1\u306F\u7E26\u304B\u6A2A\u306B\u307E\u3063\u3059\u3050\u5F15\u3044\u3066\u304F\u3060\u3055\u3044";
  if (w.x0 === w.x1 && w.z0 === w.z1) return "\u58C1\u306E\u9577\u3055\u304C0\u3067\u3059";
  const pts = [w.x0, w.x1].every((x) => x >= 0 && x <= lotSize.w) && [w.z0, w.z1].every((z) => z >= 0 && z <= lotSize.d);
  if (!pts) return "\u571F\u5730\u306E\u5916\u306B\u306F\u5EFA\u3066\u3089\u308C\u307E\u305B\u3093";
  if (house.walls.some((o) => o.level === w.level && wallsOverlap(o, w))) return "\u3059\u3067\u306B\u58C1\u304C\u3042\u308A\u307E\u3059";
  return null;
}
function floorCovers(house, level, x, z, roomsOnly = false) {
  const gx = x / GRID;
  const gz = z / GRID;
  return house.floors.some(
    (f) => f.level === level && !(roomsOnly && f.kind === "terrace") && gx >= f.x0 && gx < f.x1 && gz >= f.z0 && gz < f.z1
  );
}
var enclosedCache = /* @__PURE__ */ new WeakMap();
function enclosedCells(house, level) {
  let byLevel = enclosedCache.get(house);
  if (!byLevel) enclosedCache.set(house, byLevel = /* @__PURE__ */ new Map());
  const LOT_W2 = lotSize.w;
  const LOT_D2 = lotSize.d;
  const key = `${level}:${LOT_W2}x${LOT_D2}`;
  const hit = byLevel.get(key);
  if (hit) return hit;
  const W = LOT_W2 + 2;
  const D = LOT_D2 + 2;
  const idx = (x, z) => (z + 1) * W + (x + 1);
  const vBlock = /* @__PURE__ */ new Set();
  const hBlock = /* @__PURE__ */ new Set();
  for (const w of house.walls) {
    if (w.level !== level || wallHeight(w) !== WALL_HEIGHT) continue;
    if (w.x0 === w.x1) for (let z = Math.min(w.z0, w.z1); z < Math.max(w.z0, w.z1); z++) vBlock.add(idx(w.x0, z));
    else for (let x = Math.min(w.x0, w.x1); x < Math.max(w.x0, w.x1); x++) hBlock.add(idx(x, w.z0));
  }
  const seen = new Uint8Array(W * D);
  const stack = [idx(-1, -1)];
  seen[stack[0]] = 1;
  while (stack.length) {
    const i = stack.pop();
    const x = i % W - 1;
    const z = Math.floor(i / W) - 1;
    const go = (nx, nz, blocked) => {
      if (blocked || nx < -1 || nz < -1 || nx > LOT_W2 || nz > LOT_D2) return;
      const j = idx(nx, nz);
      if (!seen[j]) {
        seen[j] = 1;
        stack.push(j);
      }
    };
    go(x + 1, z, vBlock.has(idx(x + 1, z)));
    go(x - 1, z, vBlock.has(idx(x, z)));
    go(x, z + 1, hBlock.has(idx(x, z + 1)));
    go(x, z - 1, hBlock.has(idx(x, z)));
  }
  const out = new Uint8Array(LOT_W2 * LOT_D2);
  for (let z = 0; z < LOT_D2; z++) for (let x = 0; x < LOT_W2; x++) if (!seen[idx(x, z)]) out[z * LOT_W2 + x] = 1;
  byLevel.set(key, out);
  return out;
}
function wallOutsideSide(house, w) {
  if (w.height === "fence" || w.height === "privacyFence") return 2;
  const { dx, dz } = wallDir(w);
  const probe = GRID / 2;
  const len = Math.round(Math.hypot(w.x1 - w.x0, w.z1 - w.z0));
  const enclosed = enclosedCells(house, w.level);
  const inside = (x, z) => {
    const cx = Math.floor(x / GRID);
    const cz = Math.floor(z / GRID);
    if (cx < 0 || cz < 0 || cx >= lotSize.w || cz >= lotSize.d || !enclosed[cz * lotSize.w + cx]) return false;
    return !house.floors.some((f) => f.level === w.level && f.kind === "terrace" && cx >= f.x0 && cx < f.x1 && cz >= f.z0 && cz < f.z1);
  };
  let leftIn = false;
  let rightIn = false;
  for (let i = 0; i < len; i++) {
    const mx = (w.x0 + dx * (i + 0.5)) * GRID;
    const mz = (w.z0 + dz * (i + 0.5)) * GRID;
    leftIn ||= inside(mx - dz * probe, mz + dx * probe);
    rightIn ||= inside(mx + dz * probe, mz - dx * probe);
  }
  if (!leftIn && !rightIn) {
    const mx = (w.x0 + w.x1) / 2 * GRID;
    const mz = (w.z0 + w.z1) / 2 * GRID;
    leftIn = floorCovers(house, w.level, mx - dz * probe, mz + dx * probe, true);
    rightIn = floorCovers(house, w.level, mx + dz * probe, mz - dx * probe, true);
  }
  if (leftIn && rightIn) return 0;
  if (leftIn) return -1;
  if (rightIn) return 1;
  return 2;
}
function canPlaceOpening(house, wallId, typeId, offset, ignoreId) {
  const wall = house.walls.find((w) => w.id === wallId);
  if (!wall) return "\u58C1\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093";
  const def = getOpening(typeId);
  const len = wallLength(wall);
  const lo = offset - def.width / 2;
  const hi = offset + def.width / 2;
  if (lo < 0.04 || hi > len - 0.04) return "\u58C1\u306B\u53CE\u307E\u308A\u307E\u305B\u3093\uFF08\u58C1\u3092\u9577\u304F\u3057\u3066\u304F\u3060\u3055\u3044\uFF09";
  if (def.sill + def.height > wallHeight(wall) - 0.05) return "\u58C1\u304C\u4F4E\u304F\u3066\u53CE\u307E\u308A\u307E\u305B\u3093";
  for (const o of house.openings) {
    if (o.wallId !== wallId || o.id === ignoreId) continue;
    const od = getOpening(o.type);
    const olo = o.offset - od.width / 2;
    const ohi = o.offset + od.width / 2;
    if (lo < ohi + 0.08 && olo < hi + 0.08) return "\u4ED6\u306E\u7A93\u30FB\u30C9\u30A2\u3068\u91CD\u306A\u308A\u307E\u3059";
  }
  return null;
}
function stairFootprint(s) {
  const rects = stairRects(s);
  return {
    x0: Math.min(...rects.map((r) => r.x0)),
    x1: Math.max(...rects.map((r) => r.x1)),
    z0: Math.min(...rects.map((r) => r.z0)),
    z1: Math.max(...rects.map((r) => r.z1))
  };
}
function canPlaceStair(house, s, ignoreId) {
  if (s.level >= MAX_LEVEL) return "\u3053\u306E\u968E\u3088\u308A\u4E0A\u306B\u306F\u968E\u6BB5\u3092\u67B6\u3051\u3089\u308C\u307E\u305B\u3093";
  const fp = stairFootprint(s);
  if (!rectInsideLot(fp)) return "\u571F\u5730\u306E\u5916\u306B\u306F\u7F6E\u3051\u307E\u305B\u3093";
  const stacked = (o) => Math.abs(o.level - s.level) === 1 && o.shape === "u" && s.shape === "u" && o.x === s.x && o.z === s.z && o.rot === s.rot;
  const clash = house.stairs.some(
    (o) => o.id !== ignoreId && (o.level === s.level || Math.abs(o.level - s.level) === 1) && !stacked(o) && stairRects(o).some((a) => stairRects(s).some((b) => rectsOverlap(a, b)))
  );
  if (clash) return "\u4ED6\u306E\u968E\u6BB5\u3068\u91CD\u306A\u308A\u307E\u3059";
  return null;
}
var HALF_WALL = WALL_THICKNESS / 2;

// src/building/sample.ts
var ext = { material: "siding", color: "#f2efe8" };
var accent = { material: "woodboard", color: "#7a5535" };
var inner = { material: "wallpaper", color: "#f7f5f0" };
function sampleHouse() {
  const walls = [];
  const openings = [];
  const wall = (level, x0, z0, x1, z1, exterior = ext) => {
    const w = { id: newId("wall"), level, x0, z0, x1, z1, exterior, interior: inner };
    walls.push(w);
    return w.id;
  };
  const open2 = (wallId, kind, type, offset, panelColor = "#5a3e2b") => {
    openings.push({ id: newId("opening"), wallId, kind, type, offset, sashColor: "#3a3c3f", panelColor });
  };
  const f1Front = wall(0, 6, 14, 16, 14);
  const f1Back = wall(0, 6, 6, 16, 6);
  const f1Left = wall(0, 6, 6, 6, 14);
  const f1Right = wall(0, 16, 6, 16, 14);
  const f1Inner = wall(0, 12, 6, 12, 14);
  open2(f1Front, "window", "patio", 1.365);
  open2(f1Front, "window", "patio", 3.64);
  open2(f1Front, "door", "entrance", 7.735);
  open2(f1Back, "window", "sliding-small", 2.73);
  open2(f1Back, "window", "high", 4.55);
  open2(f1Left, "window", "sliding", 3.64);
  open2(f1Right, "window", "casement", 5.46);
  open2(f1Inner, "door", "door", 6.37, "#efedea");
  const f2Front = wall(1, 6, 14, 16, 14);
  const f2Back = wall(1, 6, 6, 16, 6);
  const f2Left = wall(1, 6, 6, 6, 14);
  const f2Right = wall(1, 16, 6, 16, 14, accent);
  const f2Inner = wall(1, 11, 6, 11, 14);
  open2(f2Front, "window", "sliding", 2.275);
  open2(f2Front, "window", "sliding", 6.825);
  open2(f2Back, "window", "sliding-small", 1.82);
  open2(f2Back, "window", "sliding-small", 7.28);
  open2(f2Left, "window", "fix", 3.64);
  open2(f2Right, "window", "casement", 2.73);
  open2(f2Right, "window", "casement", 4.55);
  open2(f2Inner, "door", "door", 6.37, "#efedea");
  return {
    version: 1,
    floors: [
      { id: newId("floor"), level: 0, x0: 6, z0: 6, x1: 16, z1: 14, finish: { material: "flooring", color: "#c8a57a" } },
      { id: newId("floor"), level: 1, x0: 6, z0: 6, x1: 16, z1: 14, finish: { material: "flooring", color: "#a77b52" } }
    ],
    walls,
    openings,
    stairs: [{ id: newId("stair"), level: 0, x: 14, z: 7, rot: 0, finish: { material: "oak", color: "#a77b52" } }],
    roofs: [
      {
        id: newId("roof"),
        level: 1,
        x0: 6,
        z0: 6,
        x1: 16,
        z1: 14,
        type: "gable",
        axis: "x",
        flip: false,
        pitch: 4,
        overhang: 0.6,
        finish: { material: "slate", color: "#2f3133" },
        gableFinish: ext
      }
    ],
    furniture: [
      { id: newId("furniture"), level: 0, type: "tv", x: 5.75, z: 11, rotation: 90, color: "#4e3626" },
      { id: newId("furniture"), level: 0, type: "rug", x: 7, z: 11, rotation: 90, color: "#b9ab97" },
      { id: newId("furniture"), level: 0, type: "sofa", x: 8.3, z: 11, rotation: 270, color: "#7d8a96" },
      { id: newId("furniture"), level: 0, type: "dining", x: 8.6, z: 8, rotation: 0, color: "#c8a57a" },
      { id: newId("furniture"), level: 0, type: "chair", x: 8.2, z: 7.45, rotation: 0, color: "#2f3133" },
      { id: newId("furniture"), level: 0, type: "chair", x: 9, z: 7.45, rotation: 0, color: "#2f3133" },
      { id: newId("furniture"), level: 0, type: "chair", x: 8.2, z: 8.55, rotation: 180, color: "#2f3133" },
      { id: newId("furniture"), level: 0, type: "chair", x: 9, z: 8.55, rotation: 180, color: "#2f3133" },
      { id: newId("furniture"), level: 0, type: "kitchen", x: 8.6, z: 5.85, rotation: 0, color: "#efedea" },
      { id: newId("furniture"), level: 0, type: "fridge", x: 10.4, z: 6, rotation: 0, color: "#e8e8e6" },
      { id: newId("furniture"), level: 0, type: "plant", x: 10.4, z: 12.3, rotation: 0, color: "#4f7a45" },
      { id: newId("furniture"), level: 1, type: "bed-double", x: 7.8, z: 7, rotation: 0, color: "#e9e4da" },
      { id: newId("furniture"), level: 1, type: "shelf", x: 9.6, z: 5.75, rotation: 0, color: "#efedea" },
      { id: newId("furniture"), level: 1, type: "desk", x: 12, z: 12.4, rotation: 180, color: "#c8a57a" },
      { id: newId("furniture"), level: 1, type: "plant", x: 6, z: 12.4, rotation: 0, color: "#6c8f4e" }
    ]
  };
}

// src/catalog/prices.json
var prices_default = {
  note: "\u5358\u4FA1\uFF08\u5186\uFF09\u3002\u7D20\u6750\u306F 1m\xB2 \u3042\u305F\u308A\u3001\u30C9\u30A2\u30FB\u7A93\u30FB\u5BB6\u5177\u306F1\u3064\u3042\u305F\u308A\u3002\u30B5\u30C3\u30B7\u306E\u7A2E\u985E\u306F\u7A93\u30FB\u30C9\u30A2\u306E\u5024\u6BB5\u306B\u500D\u7387\u3092\u304B\u3051\u308B\u3002\u69CB\u9020\uFF08\u57FA\u790E\u30FB\u9AA8\u7D44\u307F\uFF09\u306E\u5358\u4FA1\u306F src/economy/pricing.ts \u306B\u3042\u308B",
  materials: {
    siding: 6e3,
    tile: 15e3,
    stucco: 9e3,
    woodboard: 11e3,
    galvalume: 8e3,
    wallpaper: 1500,
    plaster: 5e3,
    woodpanel: 7e3,
    kawara: 12e3,
    slate: 6e3,
    standing: 9e3,
    sheet: 7e3,
    flooring: 9e3,
    tatami: 12e3,
    floortile: 14e3,
    carpet: 7e3,
    oak: 1e4,
    "siding-stone": 7500,
    "siding-brick": 7e3,
    "metal-v": 9500,
    alc: 1e4,
    brick: 25e3,
    concrete: 2e4,
    yakisugi: 13e3,
    cedar: 1e4,
    "natural-stone": 3e4,
    shikkui: 12e3,
    lithin: 5e3,
    "border-tile": 18e3,
    "cloth-woven": 2500,
    washi: 3500,
    "cloth-stone": 2e3,
    "shikkui-in": 6e3,
    paint: 3e3,
    ecocarat: 16e3,
    "wall-tile": 12e3,
    "accent-brick": 1e4,
    shiplap: 8e3,
    "concrete-in": 9e3,
    "kawara-flat": 11e3,
    "kawara-s": 13e3,
    shingle: 6500,
    "stone-coated": 1e4,
    yokobuki: 9500,
    copper: 3e4,
    solar: 35e3,
    "green-roof": 2e4,
    frp: 8e3,
    "solid-oak": 15e3,
    "hinoki-floor": 14e3,
    "walnut-floor": 22e3,
    herringbone: 18e3,
    "cushion-floor": 3e3,
    ryukyu: 16e3,
    marble: 3e4,
    "big-tile": 16e3,
    mortar: 6e3,
    cork: 8e3,
    deck: 14e3,
    "terrace-tile": 12e3,
    walnut: 16e3,
    maple: 12e3,
    hinoki: 12e3,
    pine: 7e3,
    laminated: 6e3,
    "wood-sheet": 4e3,
    "deep-concrete": 18e3,
    "ceramic-wall": 2e4
  },
  openings: {
    entrance: 35e4,
    "entrance-wide": 55e4,
    door: 6e4,
    "slide-door": 9e4,
    sliding: 9e4,
    "sliding-small": 45e3,
    patio: 14e4,
    casement: 5e4,
    fix: 4e4,
    high: 6e4
  },
  furniture: {
    "bed-double": 12e4,
    "bed-single": 6e4,
    sofa: 15e4,
    dining: 8e4,
    chair: 2e4,
    tv: 18e4,
    desk: 4e4,
    shelf: 3e4,
    kitchen: 9e5,
    fridge: 2e5,
    bath: 1e6,
    toilet: 25e4,
    plant: 15e3,
    rug: 25e3,
    pool: 25e5,
    flowerbed: 4e4,
    flowerpot: 8e3,
    "nameplate-post": 18e4,
    nameplate: 2e4,
    washbasin: 12e4,
    "shoe-cabinet": 6e4,
    "kitchen-island": 9e5,
    cupboard: 9e4,
    "low-table": 3e4,
    zataku: 7e4,
    washer: 18e4,
    wardrobe: 15e4,
    curtain: 3e4,
    "floor-lamp": 2e4,
    aircon: 12e4,
    "sofa-l": 25e4,
    mailbox: 8e4,
    tree: 5e4,
    hedge: 15e3
  }
};

// src/economy/pricing.ts
var MATERIAL_PRICE = prices_default.materials;
var OPENING_PRICE = prices_default.openings;
var FURNITURE_PRICE = prices_default.furniture;
var STRUCTURE = {
  /** 1階の床（基礎こみ）、1m² あたり */
  groundFloor: 45e3,
  /** 2階の床、1m² あたり */
  upperFloor: 3e4,
  /** 壁の骨組み、壁面 1m² あたり */
  wall: 18e3,
  /** 屋根の下地、屋根面 1m² あたり */
  roof: 15e3,
  /** 階段1つ */
  stair: 4e5,
  /** 階段1つの踏み板・蹴込み板の面積（m²）。木部の素材の単価をかける */
  stairFinishArea: 5
};
var materialPrice = (id) => MATERIAL_PRICE[id] ?? 8e3;
var openingPrice = (type) => OPENING_PRICE[type] ?? 8e4;
var furniturePrice = (type) => FURNITURE_PRICE[type] ?? 5e4;
function partCosts(house) {
  const out = [];
  const area = (r) => Math.abs(r.x1 - r.x0) * Math.abs(r.z1 - r.z0) * GRID * GRID;
  for (const f of house.floors) {
    const unit = (f.level === 0 ? STRUCTURE.groundFloor : STRUCTURE.upperFloor) + materialPrice(f.finish.material);
    out.push({ category: "floor", id: f.id, cost: area(f) * unit, key: JSON.stringify(f) });
  }
  for (const w of house.walls) {
    const side = wallOutsideSide(house, w);
    const outsideFaces = side === 2 ? 2 : side === 0 ? 0 : 1;
    const finishUnit = outsideFaces * materialPrice(w.exterior.material) + (2 - outsideFaces) * materialPrice(w.interior.material);
    const face = wallLength(w) * wallHeight(w);
    out.push({ category: "wall", id: w.id, cost: face * (STRUCTURE.wall + finishUnit), key: JSON.stringify(w) });
  }
  for (const o of house.openings) {
    out.push({ category: "opening", id: o.id, cost: openingPrice(o.type) * getSashType(o.sash).priceRate, key: JSON.stringify(o) });
  }
  for (const s of house.stairs) {
    out.push({ category: "stair", id: s.id, cost: STRUCTURE.stair + STRUCTURE.stairFinishArea * materialPrice(s.finish.material), key: JSON.stringify(s) });
  }
  for (const r of house.roofs) {
    const w = Math.abs(r.x1 - r.x0) * GRID + 2 * r.overhang;
    const d = Math.abs(r.z1 - r.z0) * GRID + 2 * r.overhang;
    const slope = r.type === "flat" ? 1 : Math.hypot(1, r.pitch / 10);
    const unit = STRUCTURE.roof + materialPrice(r.finish.material);
    out.push({ category: "roof", id: r.id, cost: w * d * slope * unit, key: JSON.stringify(r) });
  }
  for (const f of house.furniture) {
    out.push({ category: "furniture", id: f.id, cost: furniturePrice(f.type), key: `${f.type}:${f.color}` });
  }
  for (const p of out) p.cost = Math.round(p.cost / 1e3) * 1e3;
  return out;
}
function sum(list) {
  const byCategory = { floor: 0, wall: 0, opening: 0, stair: 0, roof: 0, furniture: 0 };
  let total = 0;
  for (const p of list) {
    byCategory[p.category] += p.cost;
    total += p.cost;
  }
  return { total, byCategory, parts: list.length };
}
function estimateCost(house) {
  return sum(partCosts(house));
}
function renovationCost(built, design) {
  if (!built) return estimateCost(design);
  const before = new Map(partCosts(built).map((p) => [p.id, p]));
  const changed = partCosts(design).filter((p) => {
    const b = before.get(p.id);
    return !b || b.key !== p.key || p.category === "wall" && b.cost !== p.cost;
  });
  return sum(changed);
}

// src/economy/rng.ts
function gauss(rng) {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// src/economy/market.ts
var DAY_SECONDS = 60;
function stepMarket(index, rng) {
  const x = Math.log(index);
  const shock = rng() < 0.04 ? gauss(rng) * 0.12 : 0;
  const next = x - 0.06 * x + gauss(rng) * 0.035 + shock;
  return Math.round(Math.min(Math.max(Math.exp(next), 0.5), 2) * 1e3) / 1e3;
}

// src/economy/town.ts
var PLOT_PITCH = LOT_W * GRID + 4;
var DISTRICTS = [
  { location: "town", from: -9, to: -4, color: "#cfe3c0" },
  { location: "rural", from: -3, to: 2, color: "#e6ecd2" },
  { location: "station", from: 3, to: 8, color: "#d8e2f0" },
  { location: "city", from: 9, to: 22, color: "#ecdcea" }
];
var START_PLOT = 0;
var FIRST_PLOT = Math.min(...DISTRICTS.map((d) => d.from));
var LAST_PLOT = Math.max(...DISTRICTS.map((d) => d.to));
var BLOCK_COLUMNS = 4;
var BLOCK_ROWS = 2;
var LOTS_PER_BLOCK = 4;
var LOT_WIDTH = LOT_W * GRID;
var LOT_DEPTH = LOT_D * GRID;
var BLOCK_W = LOT_WIDTH * 2 + 4;
var BLOCK_D = LOT_DEPTH * 2 + 6;
var ROAD_WIDTH = 10;
function rawPlot(plot) {
  const index = plot - FIRST_PLOT, block = Math.floor(index / LOTS_PER_BLOCK), local = index % LOTS_PER_BLOCK;
  return {
    x: block % BLOCK_COLUMNS * (BLOCK_W + ROAD_WIDTH) + local % 2 * (LOT_WIDTH + 4),
    z: Math.floor(block / BLOCK_COLUMNS) * (BLOCK_D + ROAD_WIDTH) + Math.floor(local / 2) * (LOT_DEPTH + 6)
  };
}
var TOWN_BOUNDS = {
  x0: -rawPlot(START_PLOT).x,
  z0: -rawPlot(START_PLOT).z,
  x1: BLOCK_COLUMNS * BLOCK_W + (BLOCK_COLUMNS - 1) * ROAD_WIDTH - rawPlot(START_PLOT).x,
  z1: BLOCK_ROWS * BLOCK_D + (BLOCK_ROWS - 1) * ROAD_WIDTH - rawPlot(START_PLOT).z
};
var CIVIC_SITE = { x: TOWN_BOUNDS.x1 - LOT_WIDTH - 30, z: TOWN_BOUNDS.z1 - LOT_DEPTH };
var TOWN_ROADS = [
  ...Array.from({ length: BLOCK_COLUMNS + 1 }, (_, i) => {
    const x = i === 0 ? TOWN_BOUNDS.x0 - 5 : TOWN_BOUNDS.x0 + i * (BLOCK_W + ROAD_WIDTH) - 5;
    return { x0: x - 5, x1: x + 5, z0: TOWN_BOUNDS.z0 - 10, z1: TOWN_BOUNDS.z1 + 6.2 };
  }),
  ...Array.from({ length: BLOCK_ROWS + 1 }, (_, i) => {
    const z = i === 0 ? TOWN_BOUNDS.z0 - 5 : i === BLOCK_ROWS ? TOWN_BOUNDS.z1 + 3.2 : TOWN_BOUNDS.z0 + i * (BLOCK_D + ROAD_WIDTH) - 5;
    const half = i === BLOCK_ROWS ? 3 : 5;
    return { x0: TOWN_BOUNDS.x0 - 10, x1: TOWN_BOUNDS.x1 + 10, z0: z - half, z1: z + half };
  }),
  ...Array.from({ length: BLOCK_ROWS }, (_, i) => {
    const z = TOWN_BOUNDS.z0 + i * (BLOCK_D + ROAD_WIDTH) + LOT_DEPTH + 3;
    return { x0: TOWN_BOUNDS.x0 - 10, x1: TOWN_BOUNDS.x1 + 10, z0: z - 3, z1: z + 3 };
  })
];
var JOIN_SHIFT = Math.round((LOT_WIDTH + 4) / GRID);
var JOINED_W = JOIN_SHIFT + LOT_W;

// src/session/edits.ts
var PARTS = ["floors", "walls", "openings", "stairs", "roofs", "furniture"];
function applyChanges(house, delta) {
  if (!Array.isArray(delta) || !delta.length || delta.length > 3e3) throw new Error("\u5909\u66F4\u304C\u5927\u304D\u3059\u304E\u307E\u3059");
  const result = JSON.parse(JSON.stringify(house)), seen = /* @__PURE__ */ new Set();
  for (const c of delta) {
    if (!PARTS.includes(c.kind) || typeof c.id !== "string" || c.id.length > 120 || seen.has(c.kind + c.id)) throw new Error("\u5909\u66F4\u5185\u5BB9\u304C\u4E0D\u6B63\u3067\u3059");
    seen.add(c.kind + c.id);
    const list = result[c.kind], i = list.findIndex((p) => p.id === c.id), current = i < 0 ? null : list[i];
    if (JSON.stringify(current) !== JSON.stringify(c.before)) throw new Error("\u540C\u3058\u90E8\u54C1\u304C\u5148\u306B\u5909\u66F4\u3055\u308C\u307E\u3057\u305F\u3002\u6700\u65B0\u72B6\u614B\u3067\u3084\u308A\u76F4\u3057\u3066\u304F\u3060\u3055\u3044");
    if (c.after === null) {
      if (i >= 0) list.splice(i, 1);
    } else {
      if (!c.after || typeof c.after !== "object" || c.after.id !== c.id) throw new Error("\u90E8\u54C1\u304C\u4E0D\u6B63\u3067\u3059");
      if (i < 0) list.push(c.after);
      else list[i] = c.after;
    }
  }
  if (result.openings.some((o) => !result.walls.some((w) => w.id === o.wallId))) throw new Error("\u30C9\u30A2\u30FB\u7A93\u306E\u53D6\u308A\u4ED8\u3051\u5148\u304C\u5909\u308F\u308A\u307E\u3057\u305F");
  const scan = (v, depth = 0) => {
    if (depth > 12) throw new Error("\u90E8\u54C1\u304C\u4E0D\u6B63\u3067\u3059");
    if (typeof v === "number" && (!Number.isFinite(v) || Math.abs(v) > 1e7)) throw new Error("\u6570\u5024\u304C\u4E0D\u6B63\u3067\u3059");
    if (v && typeof v === "object") Object.values(v).forEach((x) => scan(x, depth + 1));
  };
  scan(result);
  for (const change of delta) {
    if (change.after === null) continue;
    let error = null;
    if (change.kind === "floors") {
      const p = result.floors.find((p2) => p2.id === change.id);
      error = canPlaceFloor({ ...result, floors: result.floors.filter((f) => f.id !== p.id) }, p.level, p);
    } else if (change.kind === "walls") {
      const p = result.walls.find((p2) => p2.id === change.id);
      error = canPlaceWall({ ...result, walls: result.walls.filter((w) => w.id !== p.id) }, p) || canChangeWallHeight(result, p.id, p.height ?? "full");
      if (!error) for (const o of result.openings.filter((o2) => o2.wallId === p.id)) error ||= canPlaceOpening(result, p.id, o.type, o.offset, o.id);
    } else if (change.kind === "roofs") {
      const p = result.roofs.find((p2) => p2.id === change.id);
      error = canPlaceRoof({ ...result, roofs: result.roofs.filter((r) => r.id !== p.id) }, p.level, p);
    } else if (change.kind === "openings") {
      const p = result.openings.find((p2) => p2.id === change.id);
      error = canPlaceOpening(result, p.wallId, p.type, p.offset, p.id);
    } else if (change.kind === "stairs") {
      const p = result.stairs.find((p2) => p2.id === change.id);
      error = canPlaceStair(result, p, p.id);
    }
    if (error) throw new Error(error);
  }
  const cost = renovationCost(house, result).total;
  if (!Number.isSafeInteger(cost) || cost < 0) throw new Error("\u8CBB\u7528\u3092\u8A08\u7B97\u3067\u304D\u307E\u305B\u3093");
  return result;
}

// src/server/sharedWorld.ts
var SHARED_LIMIT = 10;
function initialSharedWorld(id) {
  const square = {
    id: "shared-square",
    name: "\u307F\u3093\u306A\u306E\u5E83\u5834",
    location: "rural",
    variance: 1,
    built: sampleHouse(),
    design: null,
    construction: null,
    rented: false,
    invested: 0,
    plot: START_PLOT
  };
  return {
    worldId: id,
    doors: {},
    receipts: {},
    house: square.built ?? emptyHouse(),
    economy: { day: 1, clock: 0, market: 1, marketHistory: [1], lots: [square], currentLotId: square.id, offers: [] }
  };
}
function canBuildOn(lot, member) {
  return !lot.owner || lot.owner === member;
}
function houseOf(w, id) {
  const l = w.economy.lots.find((l2) => l2.id === id);
  return !l ? null : id === w.economy.currentLotId ? w.house : l.design ?? l.built;
}
function withHouse(w, id, house) {
  return {
    ...w,
    house: id === w.economy.currentLotId ? house : w.house,
    economy: { ...w.economy, lots: w.economy.lots.map((l) => l.id === id ? { ...l, built: house, design: null, construction: null } : l) }
  };
}
function applyCommand(w, sender, c) {
  const fail = (message) => ({ world: w, result: { id: c?.id, ok: false, message }, changed: false });
  if (!c || typeof c.id !== "string" || !c.id || c.id.length > 120) return fail("\u64CD\u4F5CID\u304C\u4E0D\u6B63\u3067\u3059");
  const receipts = w.receipts, prior = receipts[c.id];
  if (prior) {
    if (prior.sender !== sender) return fail("\u64CD\u4F5CID\u304C\u91CD\u8907\u3057\u307E\u3057\u305F");
    return prior.cancelled ? fail("\u672A\u78BA\u5B9A\u3060\u3063\u305F\u5EFA\u7BC9\u8CBB\u3092\u8FD4\u3057\u307E\u3057\u305F") : { world: w, result: { id: c.id, ok: true, cost: prior.cost }, changed: false };
  }
  if (c.settle) {
    return {
      world: { ...w, receipts: { ...receipts, [c.id]: { sender, cost: 0, cancelled: true } } },
      result: { id: c.id, ok: false, message: "\u672A\u78BA\u5B9A\u3060\u3063\u305F\u5EFA\u7BC9\u8CBB\u3092\u8FD4\u3057\u307E\u3057\u305F" },
      changed: true
    };
  }
  try {
    const lot = w.economy.lots.find((l) => l.id === c.lot), before = houseOf(w, c.lot);
    if (!lot || !before) return fail("\u7DE8\u96C6\u3059\u308B\u571F\u5730\u304C\u3042\u308A\u307E\u305B\u3093");
    if (!canBuildOn(lot, sender)) return fail("\u307B\u304B\u306E\u4EBA\u306E\u571F\u5730\u306B\u306F\u5EFA\u3066\u3089\u308C\u307E\u305B\u3093");
    if (lot.construction) return fail("\u5DE5\u4E8B\u306E\u5B8C\u4E86\u5F8C\u306B\u7DE8\u96C6\u3057\u3066\u304F\u3060\u3055\u3044");
    const undo = c.undoOf ? receipts[c.undoOf] : null;
    if (c.undoOf && (!undo || undo.sender !== sender || undo.undone || undo.cancelled || JSON.stringify(undo.delta?.map((x) => ({ ...x, before: x.after, after: x.before }))) !== JSON.stringify(c.delta))) return fail("\u81EA\u5206\u306E\u64CD\u4F5C\u3060\u3051\u3092\u4E00\u5EA6\u305A\u3064\u623B\u305B\u307E\u3059");
    const previous = { ...lotSize };
    let next, cost;
    try {
      Object.assign(lotSize, { w: typeof lot.joined === "number" ? JOINED_W : LOT_W, d: LOT_D });
      next = applyChanges(before, c.delta);
      cost = c.undoOf ? 0 : renovationCost(before, next).total;
    } finally {
      Object.assign(lotSize, previous);
    }
    if (!Number.isSafeInteger(c.reserved) || c.reserved < cost) return fail("\u8CBB\u7528\u304C\u5909\u308F\u308A\u307E\u3057\u305F\u3002\u6700\u65B0\u306E\u72B6\u614B\u3067\u3084\u308A\u76F4\u3057\u3066\u304F\u3060\u3055\u3044");
    const nextReceipts = { ...receipts, [c.id]: { sender, cost, delta: c.delta } };
    if (c.undoOf) nextReceipts[c.undoOf] = { ...undo, undone: true };
    const ids = Object.keys(nextReceipts);
    for (const id of ids.slice(0, -800)) if (nextReceipts[id].delta) nextReceipts[id] = { ...nextReceipts[id], delta: void 0 };
    const world = { ...withHouse(w, c.lot, next), receipts: nextReceipts };
    if (JSON.stringify(world).length > 18e5) return fail("\u30EF\u30FC\u30EB\u30C9\u306E\u4FDD\u5B58\u91CF\u304C\u4E0A\u9650\u306B\u9054\u3057\u305F\u305F\u3081\u3001\u3053\u306E\u5909\u66F4\u3092\u78BA\u5B9A\u3067\u304D\u307E\u305B\u3093");
    return { world, result: { id: c.id, ok: true, cost }, changed: true };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "\u5909\u66F4\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F");
  }
}
function tickWorld(w, dt, rng) {
  let { clock, day, market, marketHistory } = w.economy;
  clock += dt;
  if (clock < DAY_SECONDS) return { world: { ...w, economy: { ...w.economy, clock } }, newDay: false };
  clock -= DAY_SECONDS;
  day += 1;
  market = stepMarket(market, rng);
  marketHistory = [...marketHistory, market].slice(-60);
  return { world: { ...w, economy: { ...w.economy, clock, day, market, marketHistory } }, newDay: true };
}
function validSharedWorld(v) {
  const w = v;
  return !!w && typeof w.worldId === "string" && !!w.house && !!w.economy && Array.isArray(w.economy.lots) && [w.economy.day, w.economy.clock, w.economy.market].every(Number.isFinite) && !!w.receipts && typeof w.receipts === "object";
}

// server/relay.mjs
async function saveWorld(file, world) {
  if (!file) return;
  const tmp = file + ".tmp", handle = await open(tmp, "w");
  try {
    await handle.writeFile(JSON.stringify(world));
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(tmp, file);
}
async function loadWorld(file) {
  if (!file) return initialSharedWorld(randomUUID());
  let text;
  try {
    text = await readFile(file, "utf8");
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
    const world2 = initialSharedWorld(randomUUID());
    await saveWorld(file, world2);
    return world2;
  }
  const world = JSON.parse(text);
  if (!validSharedWorld(world)) throw Error("\u5171\u6709\u30EF\u30FC\u30EB\u30C9\u306E\u4FDD\u5B58\u30C7\u30FC\u30BF\u3092\u8AAD\u3081\u307E\u305B\u3093\uFF08\u4E0A\u66F8\u304D\u305B\u305A\u505C\u6B62\u3057\u307E\u3059\uFF09: " + file);
  return world;
}
function createRelay({ origins = [], graceMs = 3e4, worldFile = null, tickMs = 1e3 } = {}) {
  const rooms = /* @__PURE__ */ new Map();
  const identities = /* @__PURE__ */ new Map();
  const shared = { members: /* @__PURE__ */ new Map(), world: null, queue: Promise.resolve(), beat: 0 };
  const ready = loadWorld(worldFile).then((w) => {
    shared.world = w;
  });
  const sharedSend = (data) => shared.members.forEach((m) => send(m.socket, data));
  const sharedRoster = () => sharedSend({ type: "members", members: [...shared.members.values()].filter((m) => m.socket).map((m) => ({ id: m.id, name: m.name, host: false, canBuild: true })) });
  const clockOf = (w) => ({ day: w.economy.day, clock: w.economy.clock, market: w.economy.market, marketHistory: w.economy.marketHistory });
  const enqueue = (job) => shared.queue = shared.queue.then(job, job);
  const ticker = setInterval(() => {
    if (!shared.world) return;
    const t = tickWorld(shared.world, tickMs / 1e3, Math.random);
    shared.world = t.world;
    if (t.newDay) enqueue(() => saveWorld(worldFile, shared.world).catch((e) => console.error("save failed", e)));
    if (++shared.beat % 2 === 0) sharedSend({ type: "clock", clock: clockOf(shared.world) });
  }, tickMs);
  ticker.unref();
  const http = createServer((req, res) => {
    res.writeHead(req.url === "/health" ? 200 : 404);
    res.end(req.url === "/health" ? "ok" : "not found");
  });
  const wss = new import_websocket_server.default({
    server: http,
    maxPayload: 2 * 1024 * 1024,
    verifyClient: ({ origin }) => !origins.length || origins.includes(origin)
  });
  const send = (s, data) => {
    if (s?.readyState === import_websocket.default.OPEN) s.send(JSON.stringify(data));
  };
  const broadcast = (r, data) => r.members.forEach((m) => send(m.socket, data));
  const roster = (r) => broadcast(r, { type: "members", members: [...r.members.values()].map((m) => ({ id: m.id, name: m.name, host: m.id === r.host, canBuild: m.canBuild })) });
  const closeRoom = (code, room) => {
    clearTimeout(room.timer);
    broadcast(room, { type: "closed", message: "\u30DB\u30B9\u30C8\u304C\u9000\u51FA\u3057\u307E\u3057\u305F" });
    room.members.forEach((m) => {
      identities.delete(m.id);
      m.socket?.close();
    });
    rooms.delete(code);
  };
  wss.on("connection", (socket) => {
    let member, room, code, count = 0, bytes = 0, windowAt = Date.now();
    const handshake = setTimeout(() => socket.close(1008, "handshake timeout"), 1e4);
    socket.on("message", (raw) => {
      try {
        if (Date.now() - windowAt > 1e3) {
          count = 0;
          bytes = 0;
          windowAt = Date.now();
        }
        bytes += raw.length;
        if (++count > 60 || bytes > 6 * 1024 * 1024) return socket.close(1008, "rate limit");
        const data = JSON.parse(raw.toString());
        if (!member) {
          const id = data.id, name = data.name;
          if (typeof id !== "string" || id.length > 100 || typeof name !== "string" || !name.length || name.length > 24) throw Error("\u53C2\u52A0\u8005\u60C5\u5831\u304C\u4E0D\u6B63\u3067\u3059");
          if (data.type !== "resume" && identities.has(id)) throw Error("\u3053\u306E\u30B2\u30B9\u30C8\u306F\u3059\u3067\u306B\u5225\u306E\u30BF\u30D6\u3067\u53C2\u52A0\u3057\u3066\u3044\u307E\u3059");
          if (data.type === "shared") {
            if (!shared.world) throw Error("\u30EF\u30FC\u30EB\u30C9\u3092\u6E96\u5099\u3057\u3066\u3044\u307E\u3059\u3002\u5C11\u3057\u5F85\u3063\u3066\u304B\u3089\u3084\u308A\u76F4\u3057\u3066\u304F\u3060\u3055\u3044");
            const prev = shared.members.get(id);
            if (prev?.socket) throw Error("\u3053\u306E\u30B2\u30B9\u30C8\u306F\u3059\u3067\u306B\u5225\u306E\u30BF\u30D6\u3067\u53C2\u52A0\u3057\u3066\u3044\u307E\u3059");
            if (!prev && [...shared.members.values()].filter((m) => m.socket).length >= SHARED_LIMIT) throw Error(`\u307F\u3093\u306A\u306E\u30EF\u30FC\u30EB\u30C9\u306F${SHARED_LIMIT}\u4EBA\u307E\u3067\u3067\u3059`);
            member = prev ?? { id, shared: true };
            member.name = name;
            member.socket = socket;
            shared.members.set(id, member);
            clearTimeout(handshake);
            send(socket, { type: "welcome", code: "SHARED", token: randomUUID(), host: "", canBuild: true, shared: true });
            send(socket, { type: "world", world: shared.world });
            sharedRoster();
            return;
          }
          if (data.type === "create") {
            if (rooms.size >= 100) throw Error("\u90E8\u5C4B\u304C\u6E80\u54E1\u3067\u3059");
            do {
              code = randomBytes(4).toString("hex").toUpperCase();
            } while (rooms.has(code));
            room = { host: id, members: /* @__PURE__ */ new Map(), world: null, timer: null };
            rooms.set(code, room);
          } else {
            code = String(data.code).toUpperCase();
            room = rooms.get(code);
            if (!room) throw Error("\u90E8\u5C4B\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
          }
          const previous = room.members.get(id);
          if (data.type === "resume") {
            if (!previous || previous.token !== data.token || previous.socket) throw Error("\u518D\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093");
            member = previous;
          } else {
            if (!["create", "join"].includes(data.type)) throw Error("\u53C2\u52A0\u65B9\u6CD5\u304C\u4E0D\u6B63\u3067\u3059");
            if (previous) throw Error("\u3053\u306E\u30B2\u30B9\u30C8\u306F\u3059\u3067\u306B\u53C2\u52A0\u3057\u3066\u3044\u307E\u3059");
            if (room.members.size >= 4) throw Error("\u53C2\u52A0\u3067\u304D\u308B\u306E\u306F4\u4EBA\u307E\u3067\u3067\u3059");
            if (data.type === "join" && !room.members.get(room.host)?.socket) throw Error("\u30DB\u30B9\u30C8\u306E\u518D\u63A5\u7D9A\u3092\u5F85\u3063\u3066\u3044\u307E\u3059");
            member = { id, name, token: randomUUID(), socket: null, canBuild: id === room.host };
            room.members.set(id, member);
            identities.set(id, code);
          }
          clearTimeout(handshake);
          member.socket = socket;
          if (id === room.host) {
            clearTimeout(room.timer);
            room.timer = null;
          }
          send(socket, { type: "welcome", code, token: member.token, host: room.host, canBuild: member.canBuild });
          if (room.world) send(socket, { type: "world", world: room.world });
          roster(room);
          if (id === room.host) broadcast(room, { type: "resumed" });
          return;
        }
        if (member.shared) {
          if (data.type === "leave") {
            shared.members.delete(member.id);
            socket.close();
            sharedRoster();
            return;
          }
          if (data.type === "command" || data.type === "settle" && typeof data.id === "string") {
            const command = data.type === "settle" ? { id: data.id, settle: true } : data.command, who = member;
            enqueue(async () => {
              const r = applyCommand(shared.world, who.id, command);
              if (r.changed) {
                await saveWorld(worldFile, r.world);
                shared.world = { ...r.world, economy: { ...r.world.economy, ...clockOf(shared.world) } };
              }
              send(who.socket, { type: "result", result: r.result });
              if (r.changed) sharedSend({ type: "world", world: shared.world });
            }).catch(() => send(who.socket, { type: "result", result: { id: command?.id, ok: false, message: "\u30B5\u30FC\u30D0\u30FC\u306B\u4FDD\u5B58\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F" } }));
            return;
          }
          if (data.type === "pose") {
            shared.members.forEach((m) => {
              if (m !== member) send(m.socket, { type: "pose", sender: member.id, pose: data.pose });
            });
            return;
          }
          if (data.type === "door") sharedSend({ type: "door", sender: member.id, id: data.id, dir: data.dir });
          return;
        }
        if (data.type === "leave") {
          if (member.id === room.host) closeRoom(code, room);
          else {
            room.members.delete(member.id);
            identities.delete(member.id);
            socket.close();
            roster(room);
          }
          return;
        }
        if (data.type === "world" && member.id === room.host) {
          room.world = data.world;
          room.members.forEach((m) => {
            if (m !== member) send(m.socket, { type: "world", world: data.world });
          });
          return;
        }
        if (data.type === "permission" && member.id === room.host) {
          const target = room.members.get(data.target);
          if (target && target.id !== room.host) {
            target.canBuild = data.canBuild === true;
            roster(room);
          }
          return;
        }
        if (data.type === "command") {
          if (!member.canBuild || !room.members.get(room.host)?.socket) {
            send(socket, { type: "denied", id: data.command?.id, message: "\u5171\u540C\u5EFA\u7BC9\u304C\u8A31\u53EF\u3055\u308C\u3066\u3044\u307E\u305B\u3093" });
            return;
          }
          send(room.members.get(room.host).socket, { type: "command", sender: member.id, command: data.command });
          return;
        }
        if (data.type === "settle" && typeof data.id === "string") {
          send(room.members.get(room.host)?.socket, { type: "command", sender: member.id, command: { id: data.id, settle: true } });
          return;
        }
        if (data.type === "result" && member.id === room.host) {
          send(room.members.get(data.target)?.socket, { type: "result", result: data.result });
          return;
        }
        if (data.type === "clock" && member.id === room.host) {
          room.members.forEach((m) => {
            if (m !== member) send(m.socket, { type: "clock", clock: data.clock });
          });
          return;
        }
        if (data.type === "pose") {
          room.members.forEach((m) => {
            if (m !== member) send(m.socket, { type: "pose", sender: member.id, pose: data.pose });
          });
          return;
        }
        if (data.type === "trade") {
          const to = room.members.get(data.target);
          if (to && to !== member) send(to.socket, { type: "trade", sender: member.id, trade: data.trade });
          return;
        }
        if (data.type === "door") broadcast(room, { type: "door", sender: member.id, id: data.id, dir: data.dir });
      } catch (e) {
        send(socket, { type: "error", message: e.message });
        if (!member) socket.close(1008);
      }
    });
    socket.on("error", () => {
    });
    socket.on("close", () => {
      clearTimeout(handshake);
      if (member?.shared) {
        if (member.socket !== socket) return;
        member.socket = null;
        sharedRoster();
        const lost = member;
        setTimeout(() => {
          if (!lost.socket && shared.members.get(lost.id) === lost) shared.members.delete(lost.id);
        }, graceMs).unref();
        return;
      }
      if (!member || !room || rooms.get(code) !== room || room.members.get(member.id) !== member) return;
      member.socket = null;
      if (member.id === room.host) {
        broadcast(room, { type: "paused", message: "\u30DB\u30B9\u30C8\u3068\u306E\u63A5\u7D9A\u304C\u5207\u308C\u307E\u3057\u305F\u3002\u518D\u63A5\u7D9A\u3092\u5F85\u3063\u3066\u3044\u307E\u3059" });
        room.timer = setTimeout(() => closeRoom(code, room), graceMs);
      } else {
        const lost = member;
        setTimeout(() => {
          if (!lost.socket && rooms.get(code) === room && room.members.get(lost.id) === lost) {
            room.members.delete(lost.id);
            identities.delete(lost.id);
            roster(room);
          }
        }, graceMs).unref();
      }
    });
  });
  return { http, wss, ready, flush: () => shared.queue, world: () => shared.world, close: () => {
    clearInterval(ticker);
    rooms.forEach((r) => clearTimeout(r.timer));
    rooms.clear();
    identities.clear();
    wss.clients.forEach((s) => s.terminate());
    wss.close();
    http.close();
  } };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const origins = (process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean);
  if (process.env.NODE_ENV === "production" && !origins.length) throw Error("ALLOWED_ORIGINS is required in production");
  const relay = createRelay({ origins, worldFile: process.env.WORLD_FILE || new URL("./shared-world.json", import.meta.url).pathname });
  await relay.ready;
  relay.http.listen(Number(process.env.PORT || 8787), "0.0.0.0", () => console.log("World relay listening on", relay.http.address().port));
}
export {
  createRelay
};
