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

// node_modules/react/cjs/react.production.min.js
var require_react_production_min = __commonJS({
  "node_modules/react/cjs/react.production.min.js"(exports) {
    "use strict";
    var l = Symbol.for("react.element");
    var n = Symbol.for("react.portal");
    var p = Symbol.for("react.fragment");
    var q = Symbol.for("react.strict_mode");
    var r = Symbol.for("react.profiler");
    var t = Symbol.for("react.provider");
    var u = Symbol.for("react.context");
    var v = Symbol.for("react.forward_ref");
    var w = Symbol.for("react.suspense");
    var x = Symbol.for("react.memo");
    var y = Symbol.for("react.lazy");
    var z = Symbol.iterator;
    function A(a) {
      if (null === a || "object" !== typeof a) return null;
      a = z && a[z] || a["@@iterator"];
      return "function" === typeof a ? a : null;
    }
    var B = { isMounted: function() {
      return false;
    }, enqueueForceUpdate: function() {
    }, enqueueReplaceState: function() {
    }, enqueueSetState: function() {
    } };
    var C = Object.assign;
    var D = {};
    function E(a, b, e) {
      this.props = a;
      this.context = b;
      this.refs = D;
      this.updater = e || B;
    }
    E.prototype.isReactComponent = {};
    E.prototype.setState = function(a, b) {
      if ("object" !== typeof a && "function" !== typeof a && null != a) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
      this.updater.enqueueSetState(this, a, b, "setState");
    };
    E.prototype.forceUpdate = function(a) {
      this.updater.enqueueForceUpdate(this, a, "forceUpdate");
    };
    function F() {
    }
    F.prototype = E.prototype;
    function G(a, b, e) {
      this.props = a;
      this.context = b;
      this.refs = D;
      this.updater = e || B;
    }
    var H = G.prototype = new F();
    H.constructor = G;
    C(H, E.prototype);
    H.isPureReactComponent = true;
    var I = Array.isArray;
    var J = Object.prototype.hasOwnProperty;
    var K = { current: null };
    var L = { key: true, ref: true, __self: true, __source: true };
    function M(a, b, e) {
      var d, c = {}, k = null, h = null;
      if (null != b) for (d in void 0 !== b.ref && (h = b.ref), void 0 !== b.key && (k = "" + b.key), b) J.call(b, d) && !L.hasOwnProperty(d) && (c[d] = b[d]);
      var g = arguments.length - 2;
      if (1 === g) c.children = e;
      else if (1 < g) {
        for (var f = Array(g), m = 0; m < g; m++) f[m] = arguments[m + 2];
        c.children = f;
      }
      if (a && a.defaultProps) for (d in g = a.defaultProps, g) void 0 === c[d] && (c[d] = g[d]);
      return { $$typeof: l, type: a, key: k, ref: h, props: c, _owner: K.current };
    }
    function N(a, b) {
      return { $$typeof: l, type: a.type, key: b, ref: a.ref, props: a.props, _owner: a._owner };
    }
    function O(a) {
      return "object" === typeof a && null !== a && a.$$typeof === l;
    }
    function escape(a) {
      var b = { "=": "=0", ":": "=2" };
      return "$" + a.replace(/[=:]/g, function(a2) {
        return b[a2];
      });
    }
    var P = /\/+/g;
    function Q(a, b) {
      return "object" === typeof a && null !== a && null != a.key ? escape("" + a.key) : b.toString(36);
    }
    function R(a, b, e, d, c) {
      var k = typeof a;
      if ("undefined" === k || "boolean" === k) a = null;
      var h = false;
      if (null === a) h = true;
      else switch (k) {
        case "string":
        case "number":
          h = true;
          break;
        case "object":
          switch (a.$$typeof) {
            case l:
            case n:
              h = true;
          }
      }
      if (h) return h = a, c = c(h), a = "" === d ? "." + Q(h, 0) : d, I(c) ? (e = "", null != a && (e = a.replace(P, "$&/") + "/"), R(c, b, e, "", function(a2) {
        return a2;
      })) : null != c && (O(c) && (c = N(c, e + (!c.key || h && h.key === c.key ? "" : ("" + c.key).replace(P, "$&/") + "/") + a)), b.push(c)), 1;
      h = 0;
      d = "" === d ? "." : d + ":";
      if (I(a)) for (var g = 0; g < a.length; g++) {
        k = a[g];
        var f = d + Q(k, g);
        h += R(k, b, e, f, c);
      }
      else if (f = A(a), "function" === typeof f) for (a = f.call(a), g = 0; !(k = a.next()).done; ) k = k.value, f = d + Q(k, g++), h += R(k, b, e, f, c);
      else if ("object" === k) throw b = String(a), Error("Objects are not valid as a React child (found: " + ("[object Object]" === b ? "object with keys {" + Object.keys(a).join(", ") + "}" : b) + "). If you meant to render a collection of children, use an array instead.");
      return h;
    }
    function S(a, b, e) {
      if (null == a) return a;
      var d = [], c = 0;
      R(a, d, "", "", function(a2) {
        return b.call(e, a2, c++);
      });
      return d;
    }
    function T(a) {
      if (-1 === a._status) {
        var b = a._result;
        b = b();
        b.then(function(b2) {
          if (0 === a._status || -1 === a._status) a._status = 1, a._result = b2;
        }, function(b2) {
          if (0 === a._status || -1 === a._status) a._status = 2, a._result = b2;
        });
        -1 === a._status && (a._status = 0, a._result = b);
      }
      if (1 === a._status) return a._result.default;
      throw a._result;
    }
    var U = { current: null };
    var V = { transition: null };
    var W = { ReactCurrentDispatcher: U, ReactCurrentBatchConfig: V, ReactCurrentOwner: K };
    function X() {
      throw Error("act(...) is not supported in production builds of React.");
    }
    exports.Children = { map: S, forEach: function(a, b, e) {
      S(a, function() {
        b.apply(this, arguments);
      }, e);
    }, count: function(a) {
      var b = 0;
      S(a, function() {
        b++;
      });
      return b;
    }, toArray: function(a) {
      return S(a, function(a2) {
        return a2;
      }) || [];
    }, only: function(a) {
      if (!O(a)) throw Error("React.Children.only expected to receive a single React element child.");
      return a;
    } };
    exports.Component = E;
    exports.Fragment = p;
    exports.Profiler = r;
    exports.PureComponent = G;
    exports.StrictMode = q;
    exports.Suspense = w;
    exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = W;
    exports.act = X;
    exports.cloneElement = function(a, b, e) {
      if (null === a || void 0 === a) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + a + ".");
      var d = C({}, a.props), c = a.key, k = a.ref, h = a._owner;
      if (null != b) {
        void 0 !== b.ref && (k = b.ref, h = K.current);
        void 0 !== b.key && (c = "" + b.key);
        if (a.type && a.type.defaultProps) var g = a.type.defaultProps;
        for (f in b) J.call(b, f) && !L.hasOwnProperty(f) && (d[f] = void 0 === b[f] && void 0 !== g ? g[f] : b[f]);
      }
      var f = arguments.length - 2;
      if (1 === f) d.children = e;
      else if (1 < f) {
        g = Array(f);
        for (var m = 0; m < f; m++) g[m] = arguments[m + 2];
        d.children = g;
      }
      return { $$typeof: l, type: a.type, key: c, ref: k, props: d, _owner: h };
    };
    exports.createContext = function(a) {
      a = { $$typeof: u, _currentValue: a, _currentValue2: a, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null };
      a.Provider = { $$typeof: t, _context: a };
      return a.Consumer = a;
    };
    exports.createElement = M;
    exports.createFactory = function(a) {
      var b = M.bind(null, a);
      b.type = a;
      return b;
    };
    exports.createRef = function() {
      return { current: null };
    };
    exports.forwardRef = function(a) {
      return { $$typeof: v, render: a };
    };
    exports.isValidElement = O;
    exports.lazy = function(a) {
      return { $$typeof: y, _payload: { _status: -1, _result: a }, _init: T };
    };
    exports.memo = function(a, b) {
      return { $$typeof: x, type: a, compare: void 0 === b ? null : b };
    };
    exports.startTransition = function(a) {
      var b = V.transition;
      V.transition = {};
      try {
        a();
      } finally {
        V.transition = b;
      }
    };
    exports.unstable_act = X;
    exports.useCallback = function(a, b) {
      return U.current.useCallback(a, b);
    };
    exports.useContext = function(a) {
      return U.current.useContext(a);
    };
    exports.useDebugValue = function() {
    };
    exports.useDeferredValue = function(a) {
      return U.current.useDeferredValue(a);
    };
    exports.useEffect = function(a, b) {
      return U.current.useEffect(a, b);
    };
    exports.useId = function() {
      return U.current.useId();
    };
    exports.useImperativeHandle = function(a, b, e) {
      return U.current.useImperativeHandle(a, b, e);
    };
    exports.useInsertionEffect = function(a, b) {
      return U.current.useInsertionEffect(a, b);
    };
    exports.useLayoutEffect = function(a, b) {
      return U.current.useLayoutEffect(a, b);
    };
    exports.useMemo = function(a, b) {
      return U.current.useMemo(a, b);
    };
    exports.useReducer = function(a, b, e) {
      return U.current.useReducer(a, b, e);
    };
    exports.useRef = function(a) {
      return U.current.useRef(a);
    };
    exports.useState = function(a) {
      return U.current.useState(a);
    };
    exports.useSyncExternalStore = function(a, b, e) {
      return U.current.useSyncExternalStore(a, b, e);
    };
    exports.useTransition = function() {
      return U.current.useTransition();
    };
    exports.version = "18.3.1";
  }
});

// node_modules/react/cjs/react.development.js
var require_react_development = __commonJS({
  "node_modules/react/cjs/react.development.js"(exports, module) {
    "use strict";
    if (process.env.NODE_ENV !== "production") {
      (function() {
        "use strict";
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart === "function") {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(new Error());
        }
        var ReactVersion = "18.3.1";
        var REACT_ELEMENT_TYPE = Symbol.for("react.element");
        var REACT_PORTAL_TYPE = Symbol.for("react.portal");
        var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
        var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
        var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
        var REACT_PROVIDER_TYPE = Symbol.for("react.provider");
        var REACT_CONTEXT_TYPE = Symbol.for("react.context");
        var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
        var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
        var REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list");
        var REACT_MEMO_TYPE = Symbol.for("react.memo");
        var REACT_LAZY_TYPE = Symbol.for("react.lazy");
        var REACT_OFFSCREEN_TYPE = Symbol.for("react.offscreen");
        var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
        var FAUX_ITERATOR_SYMBOL = "@@iterator";
        function getIteratorFn(maybeIterable) {
          if (maybeIterable === null || typeof maybeIterable !== "object") {
            return null;
          }
          var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];
          if (typeof maybeIterator === "function") {
            return maybeIterator;
          }
          return null;
        }
        var ReactCurrentDispatcher = {
          /**
           * @internal
           * @type {ReactComponent}
           */
          current: null
        };
        var ReactCurrentBatchConfig = {
          transition: null
        };
        var ReactCurrentActQueue = {
          current: null,
          // Used to reproduce behavior of `batchedUpdates` in legacy mode.
          isBatchingLegacy: false,
          didScheduleLegacyUpdate: false
        };
        var ReactCurrentOwner = {
          /**
           * @internal
           * @type {ReactComponent}
           */
          current: null
        };
        var ReactDebugCurrentFrame = {};
        var currentExtraStackFrame = null;
        function setExtraStackFrame(stack) {
          {
            currentExtraStackFrame = stack;
          }
        }
        {
          ReactDebugCurrentFrame.setExtraStackFrame = function(stack) {
            {
              currentExtraStackFrame = stack;
            }
          };
          ReactDebugCurrentFrame.getCurrentStack = null;
          ReactDebugCurrentFrame.getStackAddendum = function() {
            var stack = "";
            if (currentExtraStackFrame) {
              stack += currentExtraStackFrame;
            }
            var impl = ReactDebugCurrentFrame.getCurrentStack;
            if (impl) {
              stack += impl() || "";
            }
            return stack;
          };
        }
        var enableScopeAPI = false;
        var enableCacheElement = false;
        var enableTransitionTracing = false;
        var enableLegacyHidden = false;
        var enableDebugTracing = false;
        var ReactSharedInternals = {
          ReactCurrentDispatcher,
          ReactCurrentBatchConfig,
          ReactCurrentOwner
        };
        {
          ReactSharedInternals.ReactDebugCurrentFrame = ReactDebugCurrentFrame;
          ReactSharedInternals.ReactCurrentActQueue = ReactCurrentActQueue;
        }
        function warn(format) {
          {
            {
              for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
              }
              printWarning("warn", format, args);
            }
          }
        }
        function error(format) {
          {
            {
              for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                args[_key2 - 1] = arguments[_key2];
              }
              printWarning("error", format, args);
            }
          }
        }
        function printWarning(level, format, args) {
          {
            var ReactDebugCurrentFrame2 = ReactSharedInternals.ReactDebugCurrentFrame;
            var stack = ReactDebugCurrentFrame2.getStackAddendum();
            if (stack !== "") {
              format += "%s";
              args = args.concat([stack]);
            }
            var argsWithFormat = args.map(function(item) {
              return String(item);
            });
            argsWithFormat.unshift("Warning: " + format);
            Function.prototype.apply.call(console[level], console, argsWithFormat);
          }
        }
        var didWarnStateUpdateForUnmountedComponent = {};
        function warnNoop(publicInstance, callerName) {
          {
            var _constructor = publicInstance.constructor;
            var componentName = _constructor && (_constructor.displayName || _constructor.name) || "ReactClass";
            var warningKey = componentName + "." + callerName;
            if (didWarnStateUpdateForUnmountedComponent[warningKey]) {
              return;
            }
            error("Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.", callerName, componentName);
            didWarnStateUpdateForUnmountedComponent[warningKey] = true;
          }
        }
        var ReactNoopUpdateQueue = {
          /**
           * Checks whether or not this composite component is mounted.
           * @param {ReactClass} publicInstance The instance we want to test.
           * @return {boolean} True if mounted, false otherwise.
           * @protected
           * @final
           */
          isMounted: function(publicInstance) {
            return false;
          },
          /**
           * Forces an update. This should only be invoked when it is known with
           * certainty that we are **not** in a DOM transaction.
           *
           * You may want to call this when you know that some deeper aspect of the
           * component's state has changed but `setState` was not called.
           *
           * This will not invoke `shouldComponentUpdate`, but it will invoke
           * `componentWillUpdate` and `componentDidUpdate`.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {?function} callback Called after component is updated.
           * @param {?string} callerName name of the calling function in the public API.
           * @internal
           */
          enqueueForceUpdate: function(publicInstance, callback, callerName) {
            warnNoop(publicInstance, "forceUpdate");
          },
          /**
           * Replaces all of the state. Always use this or `setState` to mutate state.
           * You should treat `this.state` as immutable.
           *
           * There is no guarantee that `this.state` will be immediately updated, so
           * accessing `this.state` after calling this method may return the old value.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {object} completeState Next state.
           * @param {?function} callback Called after component is updated.
           * @param {?string} callerName name of the calling function in the public API.
           * @internal
           */
          enqueueReplaceState: function(publicInstance, completeState, callback, callerName) {
            warnNoop(publicInstance, "replaceState");
          },
          /**
           * Sets a subset of the state. This only exists because _pendingState is
           * internal. This provides a merging strategy that is not available to deep
           * properties which is confusing. TODO: Expose pendingState or don't use it
           * during the merge.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {object} partialState Next partial state to be merged with state.
           * @param {?function} callback Called after component is updated.
           * @param {?string} Name of the calling function in the public API.
           * @internal
           */
          enqueueSetState: function(publicInstance, partialState, callback, callerName) {
            warnNoop(publicInstance, "setState");
          }
        };
        var assign = Object.assign;
        var emptyObject = {};
        {
          Object.freeze(emptyObject);
        }
        function Component(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        Component.prototype.isReactComponent = {};
        Component.prototype.setState = function(partialState, callback) {
          if (typeof partialState !== "object" && typeof partialState !== "function" && partialState != null) {
            throw new Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
          }
          this.updater.enqueueSetState(this, partialState, callback, "setState");
        };
        Component.prototype.forceUpdate = function(callback) {
          this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
        };
        {
          var deprecatedAPIs = {
            isMounted: ["isMounted", "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."],
            replaceState: ["replaceState", "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."]
          };
          var defineDeprecationWarning = function(methodName, info) {
            Object.defineProperty(Component.prototype, methodName, {
              get: function() {
                warn("%s(...) is deprecated in plain JavaScript React classes. %s", info[0], info[1]);
                return void 0;
              }
            });
          };
          for (var fnName in deprecatedAPIs) {
            if (deprecatedAPIs.hasOwnProperty(fnName)) {
              defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
            }
          }
        }
        function ComponentDummy() {
        }
        ComponentDummy.prototype = Component.prototype;
        function PureComponent(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
        pureComponentPrototype.constructor = PureComponent;
        assign(pureComponentPrototype, Component.prototype);
        pureComponentPrototype.isPureReactComponent = true;
        function createRef() {
          var refObject = {
            current: null
          };
          {
            Object.seal(refObject);
          }
          return refObject;
        }
        var isArrayImpl = Array.isArray;
        function isArray(a) {
          return isArrayImpl(a);
        }
        function typeName(value) {
          {
            var hasToStringTag = typeof Symbol === "function" && Symbol.toStringTag;
            var type = hasToStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            return type;
          }
        }
        function willCoercionThrow(value) {
          {
            try {
              testStringCoercion(value);
              return false;
            } catch (e) {
              return true;
            }
          }
        }
        function testStringCoercion(value) {
          return "" + value;
        }
        function checkKeyStringCoercion(value) {
          {
            if (willCoercionThrow(value)) {
              error("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", typeName(value));
              return testStringCoercion(value);
            }
          }
        }
        function getWrappedName(outerType, innerType, wrapperName) {
          var displayName = outerType.displayName;
          if (displayName) {
            return displayName;
          }
          var functionName = innerType.displayName || innerType.name || "";
          return functionName !== "" ? wrapperName + "(" + functionName + ")" : wrapperName;
        }
        function getContextName(type) {
          return type.displayName || "Context";
        }
        function getComponentNameFromType(type) {
          if (type == null) {
            return null;
          }
          {
            if (typeof type.tag === "number") {
              error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue.");
            }
          }
          if (typeof type === "function") {
            return type.displayName || type.name || null;
          }
          if (typeof type === "string") {
            return type;
          }
          switch (type) {
            case REACT_FRAGMENT_TYPE:
              return "Fragment";
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_PROFILER_TYPE:
              return "Profiler";
            case REACT_STRICT_MODE_TYPE:
              return "StrictMode";
            case REACT_SUSPENSE_TYPE:
              return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
              return "SuspenseList";
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_CONTEXT_TYPE:
                var context = type;
                return getContextName(context) + ".Consumer";
              case REACT_PROVIDER_TYPE:
                var provider = type;
                return getContextName(provider._context) + ".Provider";
              case REACT_FORWARD_REF_TYPE:
                return getWrappedName(type, type.render, "ForwardRef");
              case REACT_MEMO_TYPE:
                var outerName = type.displayName || null;
                if (outerName !== null) {
                  return outerName;
                }
                return getComponentNameFromType(type.type) || "Memo";
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init = lazyComponent._init;
                try {
                  return getComponentNameFromType(init(payload));
                } catch (x) {
                  return null;
                }
              }
            }
          }
          return null;
        }
        var hasOwnProperty = Object.prototype.hasOwnProperty;
        var RESERVED_PROPS = {
          key: true,
          ref: true,
          __self: true,
          __source: true
        };
        var specialPropKeyWarningShown, specialPropRefWarningShown, didWarnAboutStringRefs;
        {
          didWarnAboutStringRefs = {};
        }
        function hasValidRef(config) {
          {
            if (hasOwnProperty.call(config, "ref")) {
              var getter = Object.getOwnPropertyDescriptor(config, "ref").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.ref !== void 0;
        }
        function hasValidKey(config) {
          {
            if (hasOwnProperty.call(config, "key")) {
              var getter = Object.getOwnPropertyDescriptor(config, "key").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.key !== void 0;
        }
        function defineKeyPropWarningGetter(props, displayName) {
          var warnAboutAccessingKey = function() {
            {
              if (!specialPropKeyWarningShown) {
                specialPropKeyWarningShown = true;
                error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            }
          };
          warnAboutAccessingKey.isReactWarning = true;
          Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: true
          });
        }
        function defineRefPropWarningGetter(props, displayName) {
          var warnAboutAccessingRef = function() {
            {
              if (!specialPropRefWarningShown) {
                specialPropRefWarningShown = true;
                error("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            }
          };
          warnAboutAccessingRef.isReactWarning = true;
          Object.defineProperty(props, "ref", {
            get: warnAboutAccessingRef,
            configurable: true
          });
        }
        function warnIfStringRefCannotBeAutoConverted(config) {
          {
            if (typeof config.ref === "string" && ReactCurrentOwner.current && config.__self && ReactCurrentOwner.current.stateNode !== config.__self) {
              var componentName = getComponentNameFromType(ReactCurrentOwner.current.type);
              if (!didWarnAboutStringRefs[componentName]) {
                error('Component "%s" contains the string ref "%s". Support for string refs will be removed in a future major release. This case cannot be automatically converted to an arrow function. We ask you to manually fix this case by using useRef() or createRef() instead. Learn more about using refs safely here: https://reactjs.org/link/strict-mode-string-ref', componentName, config.ref);
                didWarnAboutStringRefs[componentName] = true;
              }
            }
          }
        }
        var ReactElement = function(type, key, ref, self, source, owner, props) {
          var element = {
            // This tag allows us to uniquely identify this as a React Element
            $$typeof: REACT_ELEMENT_TYPE,
            // Built-in properties that belong on the element
            type,
            key,
            ref,
            props,
            // Record the component responsible for creating this element.
            _owner: owner
          };
          {
            element._store = {};
            Object.defineProperty(element._store, "validated", {
              configurable: false,
              enumerable: false,
              writable: true,
              value: false
            });
            Object.defineProperty(element, "_self", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: self
            });
            Object.defineProperty(element, "_source", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: source
            });
            if (Object.freeze) {
              Object.freeze(element.props);
              Object.freeze(element);
            }
          }
          return element;
        };
        function createElement(type, config, children) {
          var propName;
          var props = {};
          var key = null;
          var ref = null;
          var self = null;
          var source = null;
          if (config != null) {
            if (hasValidRef(config)) {
              ref = config.ref;
              {
                warnIfStringRefCannotBeAutoConverted(config);
              }
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            self = config.__self === void 0 ? null : config.__self;
            source = config.__source === void 0 ? null : config.__source;
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                props[propName] = config[propName];
              }
            }
          }
          var childrenLength = arguments.length - 2;
          if (childrenLength === 1) {
            props.children = children;
          } else if (childrenLength > 1) {
            var childArray = Array(childrenLength);
            for (var i = 0; i < childrenLength; i++) {
              childArray[i] = arguments[i + 2];
            }
            {
              if (Object.freeze) {
                Object.freeze(childArray);
              }
            }
            props.children = childArray;
          }
          if (type && type.defaultProps) {
            var defaultProps = type.defaultProps;
            for (propName in defaultProps) {
              if (props[propName] === void 0) {
                props[propName] = defaultProps[propName];
              }
            }
          }
          {
            if (key || ref) {
              var displayName = typeof type === "function" ? type.displayName || type.name || "Unknown" : type;
              if (key) {
                defineKeyPropWarningGetter(props, displayName);
              }
              if (ref) {
                defineRefPropWarningGetter(props, displayName);
              }
            }
          }
          return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props);
        }
        function cloneAndReplaceKey(oldElement, newKey) {
          var newElement = ReactElement(oldElement.type, newKey, oldElement.ref, oldElement._self, oldElement._source, oldElement._owner, oldElement.props);
          return newElement;
        }
        function cloneElement(element, config, children) {
          if (element === null || element === void 0) {
            throw new Error("React.cloneElement(...): The argument must be a React element, but you passed " + element + ".");
          }
          var propName;
          var props = assign({}, element.props);
          var key = element.key;
          var ref = element.ref;
          var self = element._self;
          var source = element._source;
          var owner = element._owner;
          if (config != null) {
            if (hasValidRef(config)) {
              ref = config.ref;
              owner = ReactCurrentOwner.current;
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            var defaultProps;
            if (element.type && element.type.defaultProps) {
              defaultProps = element.type.defaultProps;
            }
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                if (config[propName] === void 0 && defaultProps !== void 0) {
                  props[propName] = defaultProps[propName];
                } else {
                  props[propName] = config[propName];
                }
              }
            }
          }
          var childrenLength = arguments.length - 2;
          if (childrenLength === 1) {
            props.children = children;
          } else if (childrenLength > 1) {
            var childArray = Array(childrenLength);
            for (var i = 0; i < childrenLength; i++) {
              childArray[i] = arguments[i + 2];
            }
            props.children = childArray;
          }
          return ReactElement(element.type, key, ref, self, source, owner, props);
        }
        function isValidElement(object) {
          return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
        }
        var SEPARATOR = ".";
        var SUBSEPARATOR = ":";
        function escape(key) {
          var escapeRegex = /[=:]/g;
          var escaperLookup = {
            "=": "=0",
            ":": "=2"
          };
          var escapedString = key.replace(escapeRegex, function(match) {
            return escaperLookup[match];
          });
          return "$" + escapedString;
        }
        var didWarnAboutMaps = false;
        var userProvidedKeyEscapeRegex = /\/+/g;
        function escapeUserProvidedKey(text) {
          return text.replace(userProvidedKeyEscapeRegex, "$&/");
        }
        function getElementKey(element, index) {
          if (typeof element === "object" && element !== null && element.key != null) {
            {
              checkKeyStringCoercion(element.key);
            }
            return escape("" + element.key);
          }
          return index.toString(36);
        }
        function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
          var type = typeof children;
          if (type === "undefined" || type === "boolean") {
            children = null;
          }
          var invokeCallback = false;
          if (children === null) {
            invokeCallback = true;
          } else {
            switch (type) {
              case "string":
              case "number":
                invokeCallback = true;
                break;
              case "object":
                switch (children.$$typeof) {
                  case REACT_ELEMENT_TYPE:
                  case REACT_PORTAL_TYPE:
                    invokeCallback = true;
                }
            }
          }
          if (invokeCallback) {
            var _child = children;
            var mappedChild = callback(_child);
            var childKey = nameSoFar === "" ? SEPARATOR + getElementKey(_child, 0) : nameSoFar;
            if (isArray(mappedChild)) {
              var escapedChildKey = "";
              if (childKey != null) {
                escapedChildKey = escapeUserProvidedKey(childKey) + "/";
              }
              mapIntoArray(mappedChild, array, escapedChildKey, "", function(c) {
                return c;
              });
            } else if (mappedChild != null) {
              if (isValidElement(mappedChild)) {
                {
                  if (mappedChild.key && (!_child || _child.key !== mappedChild.key)) {
                    checkKeyStringCoercion(mappedChild.key);
                  }
                }
                mappedChild = cloneAndReplaceKey(
                  mappedChild,
                  // Keep both the (mapped) and old keys if they differ, just as
                  // traverseAllChildren used to do for objects as children
                  escapedPrefix + // $FlowFixMe Flow incorrectly thinks React.Portal doesn't have a key
                  (mappedChild.key && (!_child || _child.key !== mappedChild.key) ? (
                    // $FlowFixMe Flow incorrectly thinks existing element's key can be a number
                    // eslint-disable-next-line react-internal/safe-string-coercion
                    escapeUserProvidedKey("" + mappedChild.key) + "/"
                  ) : "") + childKey
                );
              }
              array.push(mappedChild);
            }
            return 1;
          }
          var child;
          var nextName;
          var subtreeCount = 0;
          var nextNamePrefix = nameSoFar === "" ? SEPARATOR : nameSoFar + SUBSEPARATOR;
          if (isArray(children)) {
            for (var i = 0; i < children.length; i++) {
              child = children[i];
              nextName = nextNamePrefix + getElementKey(child, i);
              subtreeCount += mapIntoArray(child, array, escapedPrefix, nextName, callback);
            }
          } else {
            var iteratorFn = getIteratorFn(children);
            if (typeof iteratorFn === "function") {
              var iterableChildren = children;
              {
                if (iteratorFn === iterableChildren.entries) {
                  if (!didWarnAboutMaps) {
                    warn("Using Maps as children is not supported. Use an array of keyed ReactElements instead.");
                  }
                  didWarnAboutMaps = true;
                }
              }
              var iterator = iteratorFn.call(iterableChildren);
              var step;
              var ii = 0;
              while (!(step = iterator.next()).done) {
                child = step.value;
                nextName = nextNamePrefix + getElementKey(child, ii++);
                subtreeCount += mapIntoArray(child, array, escapedPrefix, nextName, callback);
              }
            } else if (type === "object") {
              var childrenString = String(children);
              throw new Error("Objects are not valid as a React child (found: " + (childrenString === "[object Object]" ? "object with keys {" + Object.keys(children).join(", ") + "}" : childrenString) + "). If you meant to render a collection of children, use an array instead.");
            }
          }
          return subtreeCount;
        }
        function mapChildren(children, func, context) {
          if (children == null) {
            return children;
          }
          var result = [];
          var count = 0;
          mapIntoArray(children, result, "", "", function(child) {
            return func.call(context, child, count++);
          });
          return result;
        }
        function countChildren(children) {
          var n = 0;
          mapChildren(children, function() {
            n++;
          });
          return n;
        }
        function forEachChildren(children, forEachFunc, forEachContext) {
          mapChildren(children, function() {
            forEachFunc.apply(this, arguments);
          }, forEachContext);
        }
        function toArray(children) {
          return mapChildren(children, function(child) {
            return child;
          }) || [];
        }
        function onlyChild(children) {
          if (!isValidElement(children)) {
            throw new Error("React.Children.only expected to receive a single React element child.");
          }
          return children;
        }
        function createContext(defaultValue) {
          var context = {
            $$typeof: REACT_CONTEXT_TYPE,
            // As a workaround to support multiple concurrent renderers, we categorize
            // some renderers as primary and others as secondary. We only expect
            // there to be two concurrent renderers at most: React Native (primary) and
            // Fabric (secondary); React DOM (primary) and React ART (secondary).
            // Secondary renderers store their context values on separate fields.
            _currentValue: defaultValue,
            _currentValue2: defaultValue,
            // Used to track how many concurrent renderers this context currently
            // supports within in a single renderer. Such as parallel server rendering.
            _threadCount: 0,
            // These are circular
            Provider: null,
            Consumer: null,
            // Add these to use same hidden class in VM as ServerContext
            _defaultValue: null,
            _globalName: null
          };
          context.Provider = {
            $$typeof: REACT_PROVIDER_TYPE,
            _context: context
          };
          var hasWarnedAboutUsingNestedContextConsumers = false;
          var hasWarnedAboutUsingConsumerProvider = false;
          var hasWarnedAboutDisplayNameOnConsumer = false;
          {
            var Consumer = {
              $$typeof: REACT_CONTEXT_TYPE,
              _context: context
            };
            Object.defineProperties(Consumer, {
              Provider: {
                get: function() {
                  if (!hasWarnedAboutUsingConsumerProvider) {
                    hasWarnedAboutUsingConsumerProvider = true;
                    error("Rendering <Context.Consumer.Provider> is not supported and will be removed in a future major release. Did you mean to render <Context.Provider> instead?");
                  }
                  return context.Provider;
                },
                set: function(_Provider) {
                  context.Provider = _Provider;
                }
              },
              _currentValue: {
                get: function() {
                  return context._currentValue;
                },
                set: function(_currentValue) {
                  context._currentValue = _currentValue;
                }
              },
              _currentValue2: {
                get: function() {
                  return context._currentValue2;
                },
                set: function(_currentValue2) {
                  context._currentValue2 = _currentValue2;
                }
              },
              _threadCount: {
                get: function() {
                  return context._threadCount;
                },
                set: function(_threadCount) {
                  context._threadCount = _threadCount;
                }
              },
              Consumer: {
                get: function() {
                  if (!hasWarnedAboutUsingNestedContextConsumers) {
                    hasWarnedAboutUsingNestedContextConsumers = true;
                    error("Rendering <Context.Consumer.Consumer> is not supported and will be removed in a future major release. Did you mean to render <Context.Consumer> instead?");
                  }
                  return context.Consumer;
                }
              },
              displayName: {
                get: function() {
                  return context.displayName;
                },
                set: function(displayName) {
                  if (!hasWarnedAboutDisplayNameOnConsumer) {
                    warn("Setting `displayName` on Context.Consumer has no effect. You should set it directly on the context with Context.displayName = '%s'.", displayName);
                    hasWarnedAboutDisplayNameOnConsumer = true;
                  }
                }
              }
            });
            context.Consumer = Consumer;
          }
          {
            context._currentRenderer = null;
            context._currentRenderer2 = null;
          }
          return context;
        }
        var Uninitialized = -1;
        var Pending = 0;
        var Resolved = 1;
        var Rejected = 2;
        function lazyInitializer(payload) {
          if (payload._status === Uninitialized) {
            var ctor = payload._result;
            var thenable = ctor();
            thenable.then(function(moduleObject2) {
              if (payload._status === Pending || payload._status === Uninitialized) {
                var resolved = payload;
                resolved._status = Resolved;
                resolved._result = moduleObject2;
              }
            }, function(error2) {
              if (payload._status === Pending || payload._status === Uninitialized) {
                var rejected = payload;
                rejected._status = Rejected;
                rejected._result = error2;
              }
            });
            if (payload._status === Uninitialized) {
              var pending = payload;
              pending._status = Pending;
              pending._result = thenable;
            }
          }
          if (payload._status === Resolved) {
            var moduleObject = payload._result;
            {
              if (moduleObject === void 0) {
                error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?", moduleObject);
              }
            }
            {
              if (!("default" in moduleObject)) {
                error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))", moduleObject);
              }
            }
            return moduleObject.default;
          } else {
            throw payload._result;
          }
        }
        function lazy(ctor) {
          var payload = {
            // We use these fields to store the result.
            _status: Uninitialized,
            _result: ctor
          };
          var lazyType = {
            $$typeof: REACT_LAZY_TYPE,
            _payload: payload,
            _init: lazyInitializer
          };
          {
            var defaultProps;
            var propTypes;
            Object.defineProperties(lazyType, {
              defaultProps: {
                configurable: true,
                get: function() {
                  return defaultProps;
                },
                set: function(newDefaultProps) {
                  error("React.lazy(...): It is not supported to assign `defaultProps` to a lazy component import. Either specify them where the component is defined, or create a wrapping component around it.");
                  defaultProps = newDefaultProps;
                  Object.defineProperty(lazyType, "defaultProps", {
                    enumerable: true
                  });
                }
              },
              propTypes: {
                configurable: true,
                get: function() {
                  return propTypes;
                },
                set: function(newPropTypes) {
                  error("React.lazy(...): It is not supported to assign `propTypes` to a lazy component import. Either specify them where the component is defined, or create a wrapping component around it.");
                  propTypes = newPropTypes;
                  Object.defineProperty(lazyType, "propTypes", {
                    enumerable: true
                  });
                }
              }
            });
          }
          return lazyType;
        }
        function forwardRef(render) {
          {
            if (render != null && render.$$typeof === REACT_MEMO_TYPE) {
              error("forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...)).");
            } else if (typeof render !== "function") {
              error("forwardRef requires a render function but was given %s.", render === null ? "null" : typeof render);
            } else {
              if (render.length !== 0 && render.length !== 2) {
                error("forwardRef render functions accept exactly two parameters: props and ref. %s", render.length === 1 ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined.");
              }
            }
            if (render != null) {
              if (render.defaultProps != null || render.propTypes != null) {
                error("forwardRef render functions do not support propTypes or defaultProps. Did you accidentally pass a React component?");
              }
            }
          }
          var elementType = {
            $$typeof: REACT_FORWARD_REF_TYPE,
            render
          };
          {
            var ownName;
            Object.defineProperty(elementType, "displayName", {
              enumerable: false,
              configurable: true,
              get: function() {
                return ownName;
              },
              set: function(name) {
                ownName = name;
                if (!render.name && !render.displayName) {
                  render.displayName = name;
                }
              }
            });
          }
          return elementType;
        }
        var REACT_MODULE_REFERENCE;
        {
          REACT_MODULE_REFERENCE = Symbol.for("react.module.reference");
        }
        function isValidElementType(type) {
          if (typeof type === "string" || typeof type === "function") {
            return true;
          }
          if (type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || enableDebugTracing || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || enableLegacyHidden || type === REACT_OFFSCREEN_TYPE || enableScopeAPI || enableCacheElement || enableTransitionTracing) {
            return true;
          }
          if (typeof type === "object" && type !== null) {
            if (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || // This needs to include all possible module reference object
            // types supported by any Flight configuration anywhere since
            // we don't know which Flight build this will end up being used
            // with.
            type.$$typeof === REACT_MODULE_REFERENCE || type.getModuleId !== void 0) {
              return true;
            }
          }
          return false;
        }
        function memo(type, compare) {
          {
            if (!isValidElementType(type)) {
              error("memo: The first argument must be a component. Instead received: %s", type === null ? "null" : typeof type);
            }
          }
          var elementType = {
            $$typeof: REACT_MEMO_TYPE,
            type,
            compare: compare === void 0 ? null : compare
          };
          {
            var ownName;
            Object.defineProperty(elementType, "displayName", {
              enumerable: false,
              configurable: true,
              get: function() {
                return ownName;
              },
              set: function(name) {
                ownName = name;
                if (!type.name && !type.displayName) {
                  type.displayName = name;
                }
              }
            });
          }
          return elementType;
        }
        function resolveDispatcher() {
          var dispatcher = ReactCurrentDispatcher.current;
          {
            if (dispatcher === null) {
              error("Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://reactjs.org/link/invalid-hook-call for tips about how to debug and fix this problem.");
            }
          }
          return dispatcher;
        }
        function useContext(Context) {
          var dispatcher = resolveDispatcher();
          {
            if (Context._context !== void 0) {
              var realContext = Context._context;
              if (realContext.Consumer === Context) {
                error("Calling useContext(Context.Consumer) is not supported, may cause bugs, and will be removed in a future major release. Did you mean to call useContext(Context) instead?");
              } else if (realContext.Provider === Context) {
                error("Calling useContext(Context.Provider) is not supported. Did you mean to call useContext(Context) instead?");
              }
            }
          }
          return dispatcher.useContext(Context);
        }
        function useState(initialState) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useState(initialState);
        }
        function useReducer(reducer, initialArg, init) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useReducer(reducer, initialArg, init);
        }
        function useRef(initialValue) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useRef(initialValue);
        }
        function useEffect(create2, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useEffect(create2, deps);
        }
        function useInsertionEffect(create2, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useInsertionEffect(create2, deps);
        }
        function useLayoutEffect(create2, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useLayoutEffect(create2, deps);
        }
        function useCallback(callback, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useCallback(callback, deps);
        }
        function useMemo(create2, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useMemo(create2, deps);
        }
        function useImperativeHandle(ref, create2, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useImperativeHandle(ref, create2, deps);
        }
        function useDebugValue2(value, formatterFn) {
          {
            var dispatcher = resolveDispatcher();
            return dispatcher.useDebugValue(value, formatterFn);
          }
        }
        function useTransition() {
          var dispatcher = resolveDispatcher();
          return dispatcher.useTransition();
        }
        function useDeferredValue(value) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useDeferredValue(value);
        }
        function useId() {
          var dispatcher = resolveDispatcher();
          return dispatcher.useId();
        }
        function useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
        }
        var disabledDepth = 0;
        var prevLog;
        var prevInfo;
        var prevWarn;
        var prevError;
        var prevGroup;
        var prevGroupCollapsed;
        var prevGroupEnd;
        function disabledLog() {
        }
        disabledLog.__reactDisabledLog = true;
        function disableLogs() {
          {
            if (disabledDepth === 0) {
              prevLog = console.log;
              prevInfo = console.info;
              prevWarn = console.warn;
              prevError = console.error;
              prevGroup = console.group;
              prevGroupCollapsed = console.groupCollapsed;
              prevGroupEnd = console.groupEnd;
              var props = {
                configurable: true,
                enumerable: true,
                value: disabledLog,
                writable: true
              };
              Object.defineProperties(console, {
                info: props,
                log: props,
                warn: props,
                error: props,
                group: props,
                groupCollapsed: props,
                groupEnd: props
              });
            }
            disabledDepth++;
          }
        }
        function reenableLogs() {
          {
            disabledDepth--;
            if (disabledDepth === 0) {
              var props = {
                configurable: true,
                enumerable: true,
                writable: true
              };
              Object.defineProperties(console, {
                log: assign({}, props, {
                  value: prevLog
                }),
                info: assign({}, props, {
                  value: prevInfo
                }),
                warn: assign({}, props, {
                  value: prevWarn
                }),
                error: assign({}, props, {
                  value: prevError
                }),
                group: assign({}, props, {
                  value: prevGroup
                }),
                groupCollapsed: assign({}, props, {
                  value: prevGroupCollapsed
                }),
                groupEnd: assign({}, props, {
                  value: prevGroupEnd
                })
              });
            }
            if (disabledDepth < 0) {
              error("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
            }
          }
        }
        var ReactCurrentDispatcher$1 = ReactSharedInternals.ReactCurrentDispatcher;
        var prefix;
        function describeBuiltInComponentFrame(name, source, ownerFn) {
          {
            if (prefix === void 0) {
              try {
                throw Error();
              } catch (x) {
                var match = x.stack.trim().match(/\n( *(at )?)/);
                prefix = match && match[1] || "";
              }
            }
            return "\n" + prefix + name;
          }
        }
        var reentry = false;
        var componentFrameCache;
        {
          var PossiblyWeakMap = typeof WeakMap === "function" ? WeakMap : Map;
          componentFrameCache = new PossiblyWeakMap();
        }
        function describeNativeComponentFrame(fn, construct) {
          if (!fn || reentry) {
            return "";
          }
          {
            var frame = componentFrameCache.get(fn);
            if (frame !== void 0) {
              return frame;
            }
          }
          var control;
          reentry = true;
          var previousPrepareStackTrace = Error.prepareStackTrace;
          Error.prepareStackTrace = void 0;
          var previousDispatcher;
          {
            previousDispatcher = ReactCurrentDispatcher$1.current;
            ReactCurrentDispatcher$1.current = null;
            disableLogs();
          }
          try {
            if (construct) {
              var Fake = function() {
                throw Error();
              };
              Object.defineProperty(Fake.prototype, "props", {
                set: function() {
                  throw Error();
                }
              });
              if (typeof Reflect === "object" && Reflect.construct) {
                try {
                  Reflect.construct(Fake, []);
                } catch (x) {
                  control = x;
                }
                Reflect.construct(fn, [], Fake);
              } else {
                try {
                  Fake.call();
                } catch (x) {
                  control = x;
                }
                fn.call(Fake.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (x) {
                control = x;
              }
              fn();
            }
          } catch (sample) {
            if (sample && control && typeof sample.stack === "string") {
              var sampleLines = sample.stack.split("\n");
              var controlLines = control.stack.split("\n");
              var s = sampleLines.length - 1;
              var c = controlLines.length - 1;
              while (s >= 1 && c >= 0 && sampleLines[s] !== controlLines[c]) {
                c--;
              }
              for (; s >= 1 && c >= 0; s--, c--) {
                if (sampleLines[s] !== controlLines[c]) {
                  if (s !== 1 || c !== 1) {
                    do {
                      s--;
                      c--;
                      if (c < 0 || sampleLines[s] !== controlLines[c]) {
                        var _frame = "\n" + sampleLines[s].replace(" at new ", " at ");
                        if (fn.displayName && _frame.includes("<anonymous>")) {
                          _frame = _frame.replace("<anonymous>", fn.displayName);
                        }
                        {
                          if (typeof fn === "function") {
                            componentFrameCache.set(fn, _frame);
                          }
                        }
                        return _frame;
                      }
                    } while (s >= 1 && c >= 0);
                  }
                  break;
                }
              }
            }
          } finally {
            reentry = false;
            {
              ReactCurrentDispatcher$1.current = previousDispatcher;
              reenableLogs();
            }
            Error.prepareStackTrace = previousPrepareStackTrace;
          }
          var name = fn ? fn.displayName || fn.name : "";
          var syntheticFrame = name ? describeBuiltInComponentFrame(name) : "";
          {
            if (typeof fn === "function") {
              componentFrameCache.set(fn, syntheticFrame);
            }
          }
          return syntheticFrame;
        }
        function describeFunctionComponentFrame(fn, source, ownerFn) {
          {
            return describeNativeComponentFrame(fn, false);
          }
        }
        function shouldConstruct(Component2) {
          var prototype = Component2.prototype;
          return !!(prototype && prototype.isReactComponent);
        }
        function describeUnknownElementTypeFrameInDEV(type, source, ownerFn) {
          if (type == null) {
            return "";
          }
          if (typeof type === "function") {
            {
              return describeNativeComponentFrame(type, shouldConstruct(type));
            }
          }
          if (typeof type === "string") {
            return describeBuiltInComponentFrame(type);
          }
          switch (type) {
            case REACT_SUSPENSE_TYPE:
              return describeBuiltInComponentFrame("Suspense");
            case REACT_SUSPENSE_LIST_TYPE:
              return describeBuiltInComponentFrame("SuspenseList");
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_FORWARD_REF_TYPE:
                return describeFunctionComponentFrame(type.render);
              case REACT_MEMO_TYPE:
                return describeUnknownElementTypeFrameInDEV(type.type, source, ownerFn);
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init = lazyComponent._init;
                try {
                  return describeUnknownElementTypeFrameInDEV(init(payload), source, ownerFn);
                } catch (x) {
                }
              }
            }
          }
          return "";
        }
        var loggedTypeFailures = {};
        var ReactDebugCurrentFrame$1 = ReactSharedInternals.ReactDebugCurrentFrame;
        function setCurrentlyValidatingElement(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              ReactDebugCurrentFrame$1.setExtraStackFrame(stack);
            } else {
              ReactDebugCurrentFrame$1.setExtraStackFrame(null);
            }
          }
        }
        function checkPropTypes(typeSpecs, values, location, componentName, element) {
          {
            var has = Function.call.bind(hasOwnProperty);
            for (var typeSpecName in typeSpecs) {
              if (has(typeSpecs, typeSpecName)) {
                var error$1 = void 0;
                try {
                  if (typeof typeSpecs[typeSpecName] !== "function") {
                    var err = Error((componentName || "React class") + ": " + location + " type `" + typeSpecName + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof typeSpecs[typeSpecName] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                    err.name = "Invariant Violation";
                    throw err;
                  }
                  error$1 = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
                } catch (ex) {
                  error$1 = ex;
                }
                if (error$1 && !(error$1 instanceof Error)) {
                  setCurrentlyValidatingElement(element);
                  error("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", componentName || "React class", location, typeSpecName, typeof error$1);
                  setCurrentlyValidatingElement(null);
                }
                if (error$1 instanceof Error && !(error$1.message in loggedTypeFailures)) {
                  loggedTypeFailures[error$1.message] = true;
                  setCurrentlyValidatingElement(element);
                  error("Failed %s type: %s", location, error$1.message);
                  setCurrentlyValidatingElement(null);
                }
              }
            }
          }
        }
        function setCurrentlyValidatingElement$1(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              setExtraStackFrame(stack);
            } else {
              setExtraStackFrame(null);
            }
          }
        }
        var propTypesMisspellWarningShown;
        {
          propTypesMisspellWarningShown = false;
        }
        function getDeclarationErrorAddendum() {
          if (ReactCurrentOwner.current) {
            var name = getComponentNameFromType(ReactCurrentOwner.current.type);
            if (name) {
              return "\n\nCheck the render method of `" + name + "`.";
            }
          }
          return "";
        }
        function getSourceInfoErrorAddendum(source) {
          if (source !== void 0) {
            var fileName = source.fileName.replace(/^.*[\\\/]/, "");
            var lineNumber = source.lineNumber;
            return "\n\nCheck your code at " + fileName + ":" + lineNumber + ".";
          }
          return "";
        }
        function getSourceInfoErrorAddendumForProps(elementProps) {
          if (elementProps !== null && elementProps !== void 0) {
            return getSourceInfoErrorAddendum(elementProps.__source);
          }
          return "";
        }
        var ownerHasKeyUseWarning = {};
        function getCurrentComponentErrorInfo(parentType) {
          var info = getDeclarationErrorAddendum();
          if (!info) {
            var parentName = typeof parentType === "string" ? parentType : parentType.displayName || parentType.name;
            if (parentName) {
              info = "\n\nCheck the top-level render call using <" + parentName + ">.";
            }
          }
          return info;
        }
        function validateExplicitKey(element, parentType) {
          if (!element._store || element._store.validated || element.key != null) {
            return;
          }
          element._store.validated = true;
          var currentComponentErrorInfo = getCurrentComponentErrorInfo(parentType);
          if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
            return;
          }
          ownerHasKeyUseWarning[currentComponentErrorInfo] = true;
          var childOwner = "";
          if (element && element._owner && element._owner !== ReactCurrentOwner.current) {
            childOwner = " It was passed a child from " + getComponentNameFromType(element._owner.type) + ".";
          }
          {
            setCurrentlyValidatingElement$1(element);
            error('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', currentComponentErrorInfo, childOwner);
            setCurrentlyValidatingElement$1(null);
          }
        }
        function validateChildKeys(node, parentType) {
          if (typeof node !== "object") {
            return;
          }
          if (isArray(node)) {
            for (var i = 0; i < node.length; i++) {
              var child = node[i];
              if (isValidElement(child)) {
                validateExplicitKey(child, parentType);
              }
            }
          } else if (isValidElement(node)) {
            if (node._store) {
              node._store.validated = true;
            }
          } else if (node) {
            var iteratorFn = getIteratorFn(node);
            if (typeof iteratorFn === "function") {
              if (iteratorFn !== node.entries) {
                var iterator = iteratorFn.call(node);
                var step;
                while (!(step = iterator.next()).done) {
                  if (isValidElement(step.value)) {
                    validateExplicitKey(step.value, parentType);
                  }
                }
              }
            }
          }
        }
        function validatePropTypes(element) {
          {
            var type = element.type;
            if (type === null || type === void 0 || typeof type === "string") {
              return;
            }
            var propTypes;
            if (typeof type === "function") {
              propTypes = type.propTypes;
            } else if (typeof type === "object" && (type.$$typeof === REACT_FORWARD_REF_TYPE || // Note: Memo only checks outer props here.
            // Inner props are checked in the reconciler.
            type.$$typeof === REACT_MEMO_TYPE)) {
              propTypes = type.propTypes;
            } else {
              return;
            }
            if (propTypes) {
              var name = getComponentNameFromType(type);
              checkPropTypes(propTypes, element.props, "prop", name, element);
            } else if (type.PropTypes !== void 0 && !propTypesMisspellWarningShown) {
              propTypesMisspellWarningShown = true;
              var _name = getComponentNameFromType(type);
              error("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", _name || "Unknown");
            }
            if (typeof type.getDefaultProps === "function" && !type.getDefaultProps.isReactClassApproved) {
              error("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
            }
          }
        }
        function validateFragmentProps(fragment) {
          {
            var keys = Object.keys(fragment.props);
            for (var i = 0; i < keys.length; i++) {
              var key = keys[i];
              if (key !== "children" && key !== "key") {
                setCurrentlyValidatingElement$1(fragment);
                error("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", key);
                setCurrentlyValidatingElement$1(null);
                break;
              }
            }
            if (fragment.ref !== null) {
              setCurrentlyValidatingElement$1(fragment);
              error("Invalid attribute `ref` supplied to `React.Fragment`.");
              setCurrentlyValidatingElement$1(null);
            }
          }
        }
        function createElementWithValidation(type, props, children) {
          var validType = isValidElementType(type);
          if (!validType) {
            var info = "";
            if (type === void 0 || typeof type === "object" && type !== null && Object.keys(type).length === 0) {
              info += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.";
            }
            var sourceInfo = getSourceInfoErrorAddendumForProps(props);
            if (sourceInfo) {
              info += sourceInfo;
            } else {
              info += getDeclarationErrorAddendum();
            }
            var typeString;
            if (type === null) {
              typeString = "null";
            } else if (isArray(type)) {
              typeString = "array";
            } else if (type !== void 0 && type.$$typeof === REACT_ELEMENT_TYPE) {
              typeString = "<" + (getComponentNameFromType(type.type) || "Unknown") + " />";
              info = " Did you accidentally export a JSX literal instead of a component?";
            } else {
              typeString = typeof type;
            }
            {
              error("React.createElement: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", typeString, info);
            }
          }
          var element = createElement.apply(this, arguments);
          if (element == null) {
            return element;
          }
          if (validType) {
            for (var i = 2; i < arguments.length; i++) {
              validateChildKeys(arguments[i], type);
            }
          }
          if (type === REACT_FRAGMENT_TYPE) {
            validateFragmentProps(element);
          } else {
            validatePropTypes(element);
          }
          return element;
        }
        var didWarnAboutDeprecatedCreateFactory = false;
        function createFactoryWithValidation(type) {
          var validatedFactory = createElementWithValidation.bind(null, type);
          validatedFactory.type = type;
          {
            if (!didWarnAboutDeprecatedCreateFactory) {
              didWarnAboutDeprecatedCreateFactory = true;
              warn("React.createFactory() is deprecated and will be removed in a future major release. Consider using JSX or use React.createElement() directly instead.");
            }
            Object.defineProperty(validatedFactory, "type", {
              enumerable: false,
              get: function() {
                warn("Factory.type is deprecated. Access the class directly before passing it to createFactory.");
                Object.defineProperty(this, "type", {
                  value: type
                });
                return type;
              }
            });
          }
          return validatedFactory;
        }
        function cloneElementWithValidation(element, props, children) {
          var newElement = cloneElement.apply(this, arguments);
          for (var i = 2; i < arguments.length; i++) {
            validateChildKeys(arguments[i], newElement.type);
          }
          validatePropTypes(newElement);
          return newElement;
        }
        function startTransition(scope, options) {
          var prevTransition = ReactCurrentBatchConfig.transition;
          ReactCurrentBatchConfig.transition = {};
          var currentTransition = ReactCurrentBatchConfig.transition;
          {
            ReactCurrentBatchConfig.transition._updatedFibers = /* @__PURE__ */ new Set();
          }
          try {
            scope();
          } finally {
            ReactCurrentBatchConfig.transition = prevTransition;
            {
              if (prevTransition === null && currentTransition._updatedFibers) {
                var updatedFibersCount = currentTransition._updatedFibers.size;
                if (updatedFibersCount > 10) {
                  warn("Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table.");
                }
                currentTransition._updatedFibers.clear();
              }
            }
          }
        }
        var didWarnAboutMessageChannel = false;
        var enqueueTaskImpl = null;
        function enqueueTask(task) {
          if (enqueueTaskImpl === null) {
            try {
              var requireString = ("require" + Math.random()).slice(0, 7);
              var nodeRequire = module && module[requireString];
              enqueueTaskImpl = nodeRequire.call(module, "timers").setImmediate;
            } catch (_err) {
              enqueueTaskImpl = function(callback) {
                {
                  if (didWarnAboutMessageChannel === false) {
                    didWarnAboutMessageChannel = true;
                    if (typeof MessageChannel === "undefined") {
                      error("This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning.");
                    }
                  }
                }
                var channel = new MessageChannel();
                channel.port1.onmessage = callback;
                channel.port2.postMessage(void 0);
              };
            }
          }
          return enqueueTaskImpl(task);
        }
        var actScopeDepth = 0;
        var didWarnNoAwaitAct = false;
        function act(callback) {
          {
            var prevActScopeDepth = actScopeDepth;
            actScopeDepth++;
            if (ReactCurrentActQueue.current === null) {
              ReactCurrentActQueue.current = [];
            }
            var prevIsBatchingLegacy = ReactCurrentActQueue.isBatchingLegacy;
            var result;
            try {
              ReactCurrentActQueue.isBatchingLegacy = true;
              result = callback();
              if (!prevIsBatchingLegacy && ReactCurrentActQueue.didScheduleLegacyUpdate) {
                var queue = ReactCurrentActQueue.current;
                if (queue !== null) {
                  ReactCurrentActQueue.didScheduleLegacyUpdate = false;
                  flushActQueue(queue);
                }
              }
            } catch (error2) {
              popActScope(prevActScopeDepth);
              throw error2;
            } finally {
              ReactCurrentActQueue.isBatchingLegacy = prevIsBatchingLegacy;
            }
            if (result !== null && typeof result === "object" && typeof result.then === "function") {
              var thenableResult = result;
              var wasAwaited = false;
              var thenable = {
                then: function(resolve, reject) {
                  wasAwaited = true;
                  thenableResult.then(function(returnValue2) {
                    popActScope(prevActScopeDepth);
                    if (actScopeDepth === 0) {
                      recursivelyFlushAsyncActWork(returnValue2, resolve, reject);
                    } else {
                      resolve(returnValue2);
                    }
                  }, function(error2) {
                    popActScope(prevActScopeDepth);
                    reject(error2);
                  });
                }
              };
              {
                if (!didWarnNoAwaitAct && typeof Promise !== "undefined") {
                  Promise.resolve().then(function() {
                  }).then(function() {
                    if (!wasAwaited) {
                      didWarnNoAwaitAct = true;
                      error("You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);");
                    }
                  });
                }
              }
              return thenable;
            } else {
              var returnValue = result;
              popActScope(prevActScopeDepth);
              if (actScopeDepth === 0) {
                var _queue = ReactCurrentActQueue.current;
                if (_queue !== null) {
                  flushActQueue(_queue);
                  ReactCurrentActQueue.current = null;
                }
                var _thenable = {
                  then: function(resolve, reject) {
                    if (ReactCurrentActQueue.current === null) {
                      ReactCurrentActQueue.current = [];
                      recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                    } else {
                      resolve(returnValue);
                    }
                  }
                };
                return _thenable;
              } else {
                var _thenable2 = {
                  then: function(resolve, reject) {
                    resolve(returnValue);
                  }
                };
                return _thenable2;
              }
            }
          }
        }
        function popActScope(prevActScopeDepth) {
          {
            if (prevActScopeDepth !== actScopeDepth - 1) {
              error("You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. ");
            }
            actScopeDepth = prevActScopeDepth;
          }
        }
        function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
          {
            var queue = ReactCurrentActQueue.current;
            if (queue !== null) {
              try {
                flushActQueue(queue);
                enqueueTask(function() {
                  if (queue.length === 0) {
                    ReactCurrentActQueue.current = null;
                    resolve(returnValue);
                  } else {
                    recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                  }
                });
              } catch (error2) {
                reject(error2);
              }
            } else {
              resolve(returnValue);
            }
          }
        }
        var isFlushing = false;
        function flushActQueue(queue) {
          {
            if (!isFlushing) {
              isFlushing = true;
              var i = 0;
              try {
                for (; i < queue.length; i++) {
                  var callback = queue[i];
                  do {
                    callback = callback(true);
                  } while (callback !== null);
                }
                queue.length = 0;
              } catch (error2) {
                queue = queue.slice(i + 1);
                throw error2;
              } finally {
                isFlushing = false;
              }
            }
          }
        }
        var createElement$1 = createElementWithValidation;
        var cloneElement$1 = cloneElementWithValidation;
        var createFactory = createFactoryWithValidation;
        var Children = {
          map: mapChildren,
          forEach: forEachChildren,
          count: countChildren,
          toArray,
          only: onlyChild
        };
        exports.Children = Children;
        exports.Component = Component;
        exports.Fragment = REACT_FRAGMENT_TYPE;
        exports.Profiler = REACT_PROFILER_TYPE;
        exports.PureComponent = PureComponent;
        exports.StrictMode = REACT_STRICT_MODE_TYPE;
        exports.Suspense = REACT_SUSPENSE_TYPE;
        exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = ReactSharedInternals;
        exports.act = act;
        exports.cloneElement = cloneElement$1;
        exports.createContext = createContext;
        exports.createElement = createElement$1;
        exports.createFactory = createFactory;
        exports.createRef = createRef;
        exports.forwardRef = forwardRef;
        exports.isValidElement = isValidElement;
        exports.lazy = lazy;
        exports.memo = memo;
        exports.startTransition = startTransition;
        exports.unstable_act = act;
        exports.useCallback = useCallback;
        exports.useContext = useContext;
        exports.useDebugValue = useDebugValue2;
        exports.useDeferredValue = useDeferredValue;
        exports.useEffect = useEffect;
        exports.useId = useId;
        exports.useImperativeHandle = useImperativeHandle;
        exports.useInsertionEffect = useInsertionEffect;
        exports.useLayoutEffect = useLayoutEffect;
        exports.useMemo = useMemo;
        exports.useReducer = useReducer;
        exports.useRef = useRef;
        exports.useState = useState;
        exports.useSyncExternalStore = useSyncExternalStore;
        exports.useTransition = useTransition;
        exports.version = ReactVersion;
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop === "function") {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(new Error());
        }
      })();
    }
  }
});

// node_modules/react/index.js
var require_react = __commonJS({
  "node_modules/react/index.js"(exports, module) {
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module.exports = require_react_production_min();
    } else {
      module.exports = require_react_development();
    }
  }
});

// node_modules/use-sync-external-store/cjs/use-sync-external-store-shim.production.js
var require_use_sync_external_store_shim_production = __commonJS({
  "node_modules/use-sync-external-store/cjs/use-sync-external-store-shim.production.js"(exports) {
    "use strict";
    var React = require_react();
    function is(x, y) {
      return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
    }
    var objectIs = "function" === typeof Object.is ? Object.is : is;
    var useState = React.useState;
    var useEffect = React.useEffect;
    var useLayoutEffect = React.useLayoutEffect;
    var useDebugValue2 = React.useDebugValue;
    function useSyncExternalStore$2(subscribe, getSnapshot) {
      var value = getSnapshot(), _useState = useState({ inst: { value, getSnapshot } }), inst = _useState[0].inst, forceUpdate = _useState[1];
      useLayoutEffect(
        function() {
          inst.value = value;
          inst.getSnapshot = getSnapshot;
          checkIfSnapshotChanged(inst) && forceUpdate({ inst });
        },
        [subscribe, value, getSnapshot]
      );
      useEffect(
        function() {
          checkIfSnapshotChanged(inst) && forceUpdate({ inst });
          return subscribe(function() {
            checkIfSnapshotChanged(inst) && forceUpdate({ inst });
          });
        },
        [subscribe]
      );
      useDebugValue2(value);
      return value;
    }
    function checkIfSnapshotChanged(inst) {
      var latestGetSnapshot = inst.getSnapshot;
      inst = inst.value;
      try {
        var nextValue = latestGetSnapshot();
        return !objectIs(inst, nextValue);
      } catch (error) {
        return true;
      }
    }
    function useSyncExternalStore$1(subscribe, getSnapshot) {
      return getSnapshot();
    }
    var shim = "undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement ? useSyncExternalStore$1 : useSyncExternalStore$2;
    exports.useSyncExternalStore = void 0 !== React.useSyncExternalStore ? React.useSyncExternalStore : shim;
  }
});

// node_modules/use-sync-external-store/cjs/use-sync-external-store-shim.development.js
var require_use_sync_external_store_shim_development = __commonJS({
  "node_modules/use-sync-external-store/cjs/use-sync-external-store-shim.development.js"(exports) {
    "use strict";
    "production" !== process.env.NODE_ENV && function() {
      function is(x, y) {
        return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
      }
      function useSyncExternalStore$2(subscribe, getSnapshot) {
        didWarnOld18Alpha || void 0 === React.startTransition || (didWarnOld18Alpha = true, console.error(
          "You are using an outdated, pre-release alpha of React 18 that does not support useSyncExternalStore. The use-sync-external-store shim will not work correctly. Upgrade to a newer pre-release."
        ));
        var value = getSnapshot();
        if (!didWarnUncachedGetSnapshot) {
          var cachedValue = getSnapshot();
          objectIs(value, cachedValue) || (console.error(
            "The result of getSnapshot should be cached to avoid an infinite loop"
          ), didWarnUncachedGetSnapshot = true);
        }
        cachedValue = useState({
          inst: { value, getSnapshot }
        });
        var inst = cachedValue[0].inst, forceUpdate = cachedValue[1];
        useLayoutEffect(
          function() {
            inst.value = value;
            inst.getSnapshot = getSnapshot;
            checkIfSnapshotChanged(inst) && forceUpdate({ inst });
          },
          [subscribe, value, getSnapshot]
        );
        useEffect(
          function() {
            checkIfSnapshotChanged(inst) && forceUpdate({ inst });
            return subscribe(function() {
              checkIfSnapshotChanged(inst) && forceUpdate({ inst });
            });
          },
          [subscribe]
        );
        useDebugValue2(value);
        return value;
      }
      function checkIfSnapshotChanged(inst) {
        var latestGetSnapshot = inst.getSnapshot;
        inst = inst.value;
        try {
          var nextValue = latestGetSnapshot();
          return !objectIs(inst, nextValue);
        } catch (error) {
          return true;
        }
      }
      function useSyncExternalStore$1(subscribe, getSnapshot) {
        return getSnapshot();
      }
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
      var React = require_react(), objectIs = "function" === typeof Object.is ? Object.is : is, useState = React.useState, useEffect = React.useEffect, useLayoutEffect = React.useLayoutEffect, useDebugValue2 = React.useDebugValue, didWarnOld18Alpha = false, didWarnUncachedGetSnapshot = false, shim = "undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement ? useSyncExternalStore$1 : useSyncExternalStore$2;
      exports.useSyncExternalStore = void 0 !== React.useSyncExternalStore ? React.useSyncExternalStore : shim;
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
    }();
  }
});

// node_modules/use-sync-external-store/shim/index.js
var require_shim = __commonJS({
  "node_modules/use-sync-external-store/shim/index.js"(exports, module) {
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module.exports = require_use_sync_external_store_shim_production();
    } else {
      module.exports = require_use_sync_external_store_shim_development();
    }
  }
});

// node_modules/use-sync-external-store/cjs/use-sync-external-store-shim/with-selector.production.js
var require_with_selector_production = __commonJS({
  "node_modules/use-sync-external-store/cjs/use-sync-external-store-shim/with-selector.production.js"(exports) {
    "use strict";
    var React = require_react();
    var shim = require_shim();
    function is(x, y) {
      return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
    }
    var objectIs = "function" === typeof Object.is ? Object.is : is;
    var useSyncExternalStore = shim.useSyncExternalStore;
    var useRef = React.useRef;
    var useEffect = React.useEffect;
    var useMemo = React.useMemo;
    var useDebugValue2 = React.useDebugValue;
    exports.useSyncExternalStoreWithSelector = function(subscribe, getSnapshot, getServerSnapshot, selector, isEqual) {
      var instRef = useRef(null);
      if (null === instRef.current) {
        var inst = { hasValue: false, value: null };
        instRef.current = inst;
      } else inst = instRef.current;
      instRef = useMemo(
        function() {
          function memoizedSelector(nextSnapshot) {
            if (!hasMemo) {
              hasMemo = true;
              memoizedSnapshot = nextSnapshot;
              nextSnapshot = selector(nextSnapshot);
              if (void 0 !== isEqual && inst.hasValue) {
                var currentSelection = inst.value;
                if (isEqual(currentSelection, nextSnapshot))
                  return memoizedSelection = currentSelection;
              }
              return memoizedSelection = nextSnapshot;
            }
            currentSelection = memoizedSelection;
            if (objectIs(memoizedSnapshot, nextSnapshot)) return currentSelection;
            var nextSelection = selector(nextSnapshot);
            if (void 0 !== isEqual && isEqual(currentSelection, nextSelection))
              return memoizedSnapshot = nextSnapshot, currentSelection;
            memoizedSnapshot = nextSnapshot;
            return memoizedSelection = nextSelection;
          }
          var hasMemo = false, memoizedSnapshot, memoizedSelection, maybeGetServerSnapshot = void 0 === getServerSnapshot ? null : getServerSnapshot;
          return [
            function() {
              return memoizedSelector(getSnapshot());
            },
            null === maybeGetServerSnapshot ? void 0 : function() {
              return memoizedSelector(maybeGetServerSnapshot());
            }
          ];
        },
        [getSnapshot, getServerSnapshot, selector, isEqual]
      );
      var value = useSyncExternalStore(subscribe, instRef[0], instRef[1]);
      useEffect(
        function() {
          inst.hasValue = true;
          inst.value = value;
        },
        [value]
      );
      useDebugValue2(value);
      return value;
    };
  }
});

// node_modules/use-sync-external-store/cjs/use-sync-external-store-shim/with-selector.development.js
var require_with_selector_development = __commonJS({
  "node_modules/use-sync-external-store/cjs/use-sync-external-store-shim/with-selector.development.js"(exports) {
    "use strict";
    "production" !== process.env.NODE_ENV && function() {
      function is(x, y) {
        return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
      }
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
      var React = require_react(), shim = require_shim(), objectIs = "function" === typeof Object.is ? Object.is : is, useSyncExternalStore = shim.useSyncExternalStore, useRef = React.useRef, useEffect = React.useEffect, useMemo = React.useMemo, useDebugValue2 = React.useDebugValue;
      exports.useSyncExternalStoreWithSelector = function(subscribe, getSnapshot, getServerSnapshot, selector, isEqual) {
        var instRef = useRef(null);
        if (null === instRef.current) {
          var inst = { hasValue: false, value: null };
          instRef.current = inst;
        } else inst = instRef.current;
        instRef = useMemo(
          function() {
            function memoizedSelector(nextSnapshot) {
              if (!hasMemo) {
                hasMemo = true;
                memoizedSnapshot = nextSnapshot;
                nextSnapshot = selector(nextSnapshot);
                if (void 0 !== isEqual && inst.hasValue) {
                  var currentSelection = inst.value;
                  if (isEqual(currentSelection, nextSnapshot))
                    return memoizedSelection = currentSelection;
                }
                return memoizedSelection = nextSnapshot;
              }
              currentSelection = memoizedSelection;
              if (objectIs(memoizedSnapshot, nextSnapshot))
                return currentSelection;
              var nextSelection = selector(nextSnapshot);
              if (void 0 !== isEqual && isEqual(currentSelection, nextSelection))
                return memoizedSnapshot = nextSnapshot, currentSelection;
              memoizedSnapshot = nextSnapshot;
              return memoizedSelection = nextSelection;
            }
            var hasMemo = false, memoizedSnapshot, memoizedSelection, maybeGetServerSnapshot = void 0 === getServerSnapshot ? null : getServerSnapshot;
            return [
              function() {
                return memoizedSelector(getSnapshot());
              },
              null === maybeGetServerSnapshot ? void 0 : function() {
                return memoizedSelector(maybeGetServerSnapshot());
              }
            ];
          },
          [getSnapshot, getServerSnapshot, selector, isEqual]
        );
        var value = useSyncExternalStore(subscribe, instRef[0], instRef[1]);
        useEffect(
          function() {
            inst.hasValue = true;
            inst.value = value;
          },
          [value]
        );
        useDebugValue2(value);
        return value;
      };
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
    }();
  }
});

// node_modules/use-sync-external-store/shim/with-selector.js
var require_with_selector = __commonJS({
  "node_modules/use-sync-external-store/shim/with-selector.js"(exports, module) {
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module.exports = require_with_selector_production();
    } else {
      module.exports = require_with_selector_development();
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

// src/economy/rng.ts
function randInt(rng, n) {
  return Math.floor(rng() * n);
}
function gauss(rng) {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function pick(rng, list) {
  return list[randInt(rng, list.length)];
}

// src/economy/market.ts
var DAY_SECONDS = 60;
function stepMarket(index, rng, bias = 1) {
  const x = Math.log(index) - Math.log(bias);
  const shock = rng() < 0.04 ? gauss(rng) * 0.12 : 0;
  const next = Math.log(bias) + x - 0.06 * x + gauss(rng) * 0.035 + shock;
  return Math.round(Math.min(Math.max(Math.exp(next), 0.5), 2) * 1e3) / 1e3;
}
var LOCATIONS = [
  { id: "rural", name: "\u90CA\u5916\u306E\u4F4F\u5B85\u5730", land: 5e6, factor: 0.9 },
  { id: "town", name: "\u9759\u304B\u306A\u4F4F\u5B85\u8857", land: 12e6, factor: 1 },
  { id: "station", name: "\u99C5\u8FD1", land: 25e6, factor: 1.15 },
  { id: "city", name: "\u90FD\u5FC3\u306E\u4E00\u7B49\u5730", land: 6e7, factor: 1.3 }
];
function getLocation(id2) {
  return LOCATIONS.find((l) => l.id === id2) ?? LOCATIONS[0];
}
var TOWNS = ["\u685C\u53F0", "\u7DD1\u30F6\u4E18", "\u6E2F\u5357", "\u6771\u753A", "\u82E5\u8449", "\u65ED", "\u672C\u753A", "\u9752\u8449\u53F0", "\u661F\u5DDD", "\u5927\u548C\u7530", "\u5149\u304C\u4E18", "\u4E2D\u592E"];
function landOffers(day, rng) {
  return LOCATIONS.map((loc, i) => ({
    id: `land-${day}-${i}-${randInt(rng, 1e6).toString(36)}`,
    name: `${pick(rng, TOWNS)}${randInt(rng, 5) + 1}\u4E01\u76EE`,
    location: loc.id,
    variance: Math.round((0.85 + rng() * 0.35) * 100) / 100
  }));
}
function landPrice(location, variance, market, density = 1) {
  return Math.round(getLocation(location).land * variance * density * market / 1e4) * 1e4;
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
var CASINO_PLOT = 0;
var TOWN_HOUSE_PLOTS = {
  // 静かな住宅街
  [-9]: "japanese",
  [-8]: "wood-ceramic",
  [-6]: "hiraya",
  [-5]: "provence",
  // 郊外の住宅地
  [-3]: "steel-family",
  [-1]: "cube",
  [2]: "nordic",
  // 駅近
  [3]: "wood-apartment",
  [5]: "steel-apartment",
  [6]: "narrow",
  [8]: "wood-apartment",
  // 都心
  [9]: "mansion",
  [10]: "residence",
  [11]: "designers",
  [12]: "tower",
  [14]: "mansion",
  [15]: "tower",
  [16]: "designers",
  [18]: "residence"
};
var FIRST_PLOT = Math.min(...DISTRICTS.map((d) => d.from));
var LAST_PLOT = Math.max(...DISTRICTS.map((d) => d.to));
function plotX(plot) {
  return rawPlot(plot).x - rawPlot(START_PLOT).x;
}
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
function plotZ(plot) {
  return rawPlot(plot).z - rawPlot(START_PLOT).z;
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
function plotsOf(location) {
  const d = DISTRICTS.find((x) => x.location === location);
  if (!d) return [];
  const out = [];
  for (let i = d.from; i <= d.to; i++) out.push(i);
  return out;
}
function freePlot(location, taken, rng) {
  const used = new Set(taken);
  const free = plotsOf(location).filter((p) => !TOWN_HOUSE_PLOTS[p]).filter((p) => !used.has(p));
  if (free.length === 0) return null;
  if (rng) return free[randInt(rng, free.length)];
  return free.reduce((a, b) => Math.abs(b - CASINO_PLOT) < Math.abs(a - CASINO_PLOT) ? b : a);
}
var JOIN_SHIFT = Math.round((LOT_WIDTH + 4) / GRID);
var JOINED_W = JOIN_SHIFT + LOT_W;

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
    },
    {
      id: "register",
      name: "\u30EC\u30B8\uFF08\u304A\u5E97\u306E\u30AB\u30A6\u30F3\u30BF\u30FC\uFF09",
      colors: [
        "#f2efe8",
        "#3c4650",
        "#b07a4a",
        "#2f6f5e"
      ],
      parts: [
        {
          shape: "box",
          size: [
            1.2,
            0.9,
            0.55
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
            1.26,
            0.04,
            0.6
          ],
          pos: [
            0,
            0.92,
            0
          ],
          paint: "wood"
        },
        {
          shape: "box",
          size: [
            0.36,
            0.12,
            0.3
          ],
          pos: [
            -0.25,
            0.99,
            0.02
          ],
          paint: "steel"
        },
        {
          shape: "box",
          size: [
            0.3,
            0.22,
            0.04
          ],
          pos: [
            -0.25,
            1.15,
            -0.08
          ],
          paint: "dark"
        },
        {
          shape: "box",
          size: [
            0.06,
            0.18,
            0.06
          ],
          pos: [
            -0.25,
            1,
            -0.08
          ],
          paint: "steel"
        }
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
function getSashType(id2) {
  return SASH_TYPES.find((t) => t.id === id2) ?? SASH_TYPES[0];
}
function getOpening(id2) {
  const def = openingById.get(id2);
  if (!def) throw new Error(`unknown opening type: ${id2}`);
  return def;
}
var designById = /* @__PURE__ */ new Map();
function registerDesign(def) {
  designById.set(def.id, def);
}
function getFurniture(id2) {
  return furnitureById.get(id2) ?? designById.get(id2) ?? FURNITURE[0];
}
function furnitureDef(item) {
  if (item.design && item.design.id === item.type) {
    if (!designById.has(item.type)) registerDesign(item.design);
    return item.design;
  }
  return getFurniture(item.type ?? "");
}

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

// src/building/rules.ts
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

// src/building/boutiques.ts
var BOUTIQUE_IDS = ["maison", "atelier", "urban", "daily"];
var BOUTIQUE_INFO = {
  maison: { name: "MAISON V\xC9RANE", tagline: "PARIS \xB7 TOKYO", tier: "\u30CF\u30A4\u30D6\u30E9\u30F3\u30C9", floor: "#d9d2c4", wall: "#f3efe6", trim: "#b89a5a", facade: "#1b1a1c", sign: "#1b1a1c", signText: "#d9bd7a", frame: "#b89a5a", height: 6 },
  atelier: { name: "ATELIER KOU", tagline: "DESIGNERS & SELECT", tier: "\u30C7\u30B6\u30A4\u30CA\u30FC\u30BA", floor: "#b99a76", wall: "#ece4d7", trim: "#6e5640", facade: "#8b6d50", sign: "#efe7da", signText: "#4a3a2b", frame: "#4a3a2b", height: 5 },
  urban: { name: "URBAN THREAD", tagline: "CASUAL & STREET", tier: "\u30AB\u30B8\u30E5\u30A2\u30EB", floor: "#9fa6a8", wall: "#e8ecec", trim: "#2f6d8e", facade: "#2f6d8e", sign: "#ffffff", signText: "#2f6d8e", frame: "#24485c", height: 4.6 },
  daily: { name: "DAILY WEAR", tagline: "\u6BCE\u65E5\u306E\u670D\u3092\u3001\u6BCE\u65E5\u306E\u5024\u6BB5\u3067", tier: "\u30D5\u30A1\u30B9\u30C8\u30D5\u30A1\u30C3\u30B7\u30E7\u30F3", floor: "#e4e1d8", wall: "#ffffff", trim: "#d6332f", facade: "#f4f1ea", sign: "#d6332f", signText: "#ffffff", frame: "#8c8c8c", height: 4.6 }
};
var lotD = LOT_D * GRID;
var BOUTIQUE_W = 9.5;
var BOUTIQUE_D = 9;
var BOUTIQUE_GAP = 2;
var ROW_WEST = -90 - CIVIC_SITE.x;
var BOUTIQUES = Object.fromEntries(
  BOUTIQUE_IDS.map((id2, i) => {
    const x0 = ROW_WEST + i * (BOUTIQUE_W + BOUTIQUE_GAP);
    return [id2, { x0, x1: x0 + BOUTIQUE_W, z0: lotD + 9, z1: lotD + 9 + BOUTIQUE_D }];
  })
);
var BOUTIQUE_DOOR = { width: 2.2, height: 2.6 };
var BOUTIQUE_ACTIONS = [
  { id: "browse", label: "\u670D\u3092\u898B\u308B\u30FB\u8CB7\u3046", x: 0, z: -1.6 },
  { id: "rack-l", label: "\u670D\u3092\u898B\u308B\u30FB\u8CB7\u3046", x: -2.9, z: 0.6 },
  { id: "rack-r", label: "\u670D\u3092\u898B\u308B\u30FB\u8CB7\u3046", x: 2.9, z: 0.6 },
  { id: "register", label: "\u30EC\u30B8\u3067\u670D\u3092\u8CB7\u3046", x: -1.4, z: 2.6 },
  { id: "fitting", label: "\u8A66\u7740\u5BA4\u3067\u7740\u66FF\u3048\u308B", x: 3.35, z: 2.4 }
];

// src/building/landmarks.ts
var lotW = LOT_W * GRID;
var lotD2 = LOT_D * GRID;
var CASINO = {
  x0: lotW / 2 - 12,
  x1: lotW / 2 + 12,
  z0: lotD2 + 9,
  z1: lotD2 + 23,
  height: 9,
  /** 入口（正面の真ん中） */
  door: { x: lotW / 2, width: 4.2, height: 3.4 },
  /** 入口のひさし（柱2本で支える） */
  canopyDepth: 3.6
};
var CASINO_PLAZA = { x0: CASINO.x0 - 2, x1: CASINO.x1 + 2, z0: lotD2 + 6.2, z1: CASINO.z0 };
var PILLAR = 0.25;
var ESTATE = {
  x0: lotW / 2 + PLOT_PITCH - 5,
  x1: lotW / 2 + PLOT_PITCH + 5,
  z0: lotD2 + 9,
  z1: lotD2 + 17,
  height: 4.5,
  door: { x: lotW / 2 + PLOT_PITCH, width: 2.2 }
};
var CASINO_PILLARS = [-1, 1].map((s) => ({
  x: CASINO.door.x + s * (CASINO.door.width / 2 + 1.2),
  z: CASINO.z0 - CASINO.canopyDepth + 0.4
}));
var CASINO_PLANTERS = [-1, 1].map((s) => {
  const x = CASINO.door.x + s * 6.5;
  return { x0: x - 1.3, x1: x + 1.3, z0: CASINO.z0 - 1.8, z1: CASINO.z0 - 0.6 };
});
var LANDMARK_COLLIDERS = [
  ...[-1, 1].map((side) => ({ x0: CASINO.door.x + side * 9 - 1.15, x1: CASINO.door.x + side * 9 + 1.15, z0: CASINO.z0 - 2.75, z1: CASINO.z0 - 0.45 })),
  { x0: ESTATE.x0, x1: ESTATE.x1, z0: ESTATE.z0, z1: ESTATE.z1 },
  { x0: CASINO.x0, x1: CASINO.x1, z0: CASINO.z0, z1: CASINO.z1 },
  ...BOUTIQUE_IDS.map((id2) => ({ ...BOUTIQUES[id2] })),
  ...CASINO_PLANTERS,
  ...CASINO_PILLARS.map((p) => ({ x0: p.x - PILLAR, x1: p.x + PILLAR, z0: p.z - PILLAR, z1: p.z + PILLAR }))
];
var CASINO_ARRIVAL = { x: CASINO.door.x, z: CASINO.z0 - 1.6, yaw: Math.PI };

// src/building/dealer.ts
var LOT_WIDTH2 = 17;
var GAP = 1.5;
var WIDTH = 18;
var X1 = CASINO.x0 - 3 - LOT_WIDTH2 - GAP;
var DEALER = { x0: X1 - WIDTH, x1: X1, z0: CASINO.z0, z1: CASINO.z0 + 12, height: 5.2 };
var DEALER_LOT = { x0: DEALER.x1 + GAP, x1: DEALER.x1 + GAP + LOT_WIDTH2, z0: DEALER.z0 - 0.5, z1: DEALER.z0 + 16 };
var BAY_DEPTH = 5.5;
var BAY_WIDTH = 3.1;
var DEALER_BAYS = Array.from({ length: 10 }, (_, i) => {
  const left = i < 5, row = i % 5;
  return { x: left ? DEALER_LOT.x0 + BAY_DEPTH / 2 : DEALER_LOT.x1 - BAY_DEPTH / 2, z: DEALER_LOT.z0 + 0.5 + BAY_WIDTH * (row + 0.5), yaw: left ? -Math.PI / 2 : Math.PI / 2 };
});

// src/building/tuner.ts
var GAP2 = 2;
var WIDTH2 = 16;
var DEPTH = 12;
var TUNER = { x0: DEALER.x0 - GAP2 - WIDTH2, x1: DEALER.x0 - GAP2, z0: DEALER.z0, z1: DEALER.z0 + DEPTH, height: 5.4 };

// src/building/exchange.ts
var GAP3 = 2;
var WIDTH3 = 11;
var DEPTH2 = 12;
var EXCHANGE = { x0: TUNER.x0 - GAP3 - WIDTH3, x1: TUNER.x0 - GAP3, z0: TUNER.z0, z1: TUNER.z0 + DEPTH2, height: 7 };

// src/building/venues.ts
var boutiqueVenue = (id2) => ({ ...BOUTIQUES[id2], name: BOUTIQUE_INFO[id2].name, floor: BOUTIQUE_INFO[id2].floor, wall: BOUTIQUE_INFO[id2].wall, trim: BOUTIQUE_INFO[id2].trim });
var VENUES = {
  casino: { ...CASINO, name: "GRAND STRIP CASINO", floor: "#b5a487", wall: "#352c30", trim: "#bda065" },
  estate: { ...ESTATE, name: "\u307E\u3061\u306E\u4E0D\u52D5\u7523", floor: "#d3c1a0", wall: "#f0eee5", trim: "#397e7c" },
  dealer: { ...DEALER, name: "AVENUE MOTORS", floor: "#8797a0", wall: "#dce3e6", trim: "#203e50" },
  tuner: { ...TUNER, name: "STANCE GARAGE", floor: "#5d6166", wall: "#2b2e33", trim: "#e0b400" },
  exchange: { ...EXCHANGE, name: "\u307E\u3061\u8A3C\u5238\u53D6\u5F15\u6240", floor: "#c9c2b4", wall: "#eeebe3", trim: "#1e4d8c" },
  maison: boutiqueVenue("maison"),
  atelier: boutiqueVenue("atelier"),
  urban: boutiqueVenue("urban"),
  daily: boutiqueVenue("daily")
};
var VENUE_ACTIONS = {
  casino: [{ id: "slots", label: "\u30B9\u30ED\u30C3\u30C8\u3067\u904A\u3076", x: -6, z: -3.2, game: "slots" }, { id: "roulette", label: "\u30EB\u30FC\u30EC\u30C3\u30C8\u3067\u904A\u3076", x: -6, z: 2.6, game: "roulette" }, { id: "highlow", label: "\u30CF\u30A4\uFF06\u30ED\u30FC\u3067\u904A\u3076", x: 6, z: 2.6, game: "highlow" }, { id: "horse", label: "\u7AF6\u99AC\u3067\u904A\u3076", x: 4, z: -3.2, game: "horse" }, { id: "keirin", label: "\u7AF6\u8F2A\u3067\u904A\u3076", x: 6, z: -3.2, game: "keirin" }, { id: "boat", label: "\u30DC\u30FC\u30C8\u30EC\u30FC\u30B9\u3067\u904A\u3076", x: 8, z: -3.2, game: "boat" }, { id: "lobby", label: "\u30B2\u30FC\u30E0\u4E00\u89A7\u3092\u898B\u308B", x: 0, z: 2.7 }],
  estate: [{ id: "land", label: "\u571F\u5730\u3092\u898B\u308B", x: 0, z: 0.5 }],
  exchange: [{ id: "trade", label: "\u682A\u3092\u58F2\u8CB7\u3059\u308B", x: 0, z: 0.6 }],
  ...Object.fromEntries(BOUTIQUE_IDS.map((id2) => [id2, BOUTIQUE_ACTIONS])),
  tuner: [
    { id: "custom", label: "\u30AB\u30B9\u30BF\u30E0\u306E\u76F8\u8AC7\u3092\u3059\u308B", x: 0, z: 3.2, tab: "paint" },
    { id: "paint", label: "\u5857\u88C5\u30FB\u30C7\u30B6\u30A4\u30F3\u3092\u9078\u3076", x: -5.5, z: 3.7, tab: "paint" },
    { id: "chassis", label: "\u8ECA\u9AD8\u30FB\u30AD\u30E3\u30F3\u30D0\u30FC\u3092\u8ABF\u6574\u3059\u308B", x: -2.5, z: 0.5, tab: "chassis" },
    { id: "wheels", label: "\u30DB\u30A4\u30FC\u30EB\u3092\u9078\u3076", x: 6.2, z: 0, tab: "wheels" },
    { id: "engine", label: "\u30A8\u30F3\u30B8\u30F3\u3092\u9078\u3076", x: 4.5, z: -2, tab: "engine" },
    { id: "aero", label: "\u30EA\u30A2\u30A6\u30A3\u30F3\u30B0\u3092\u9078\u3076", x: 4.6, z: 4.4, tab: "aero" }
  ],
  dealer: [{ id: "catalog", label: "\u30AB\u30BF\u30ED\u30B0\u3092\u898B\u308B", x: 0, z: 2.7 }, { id: "moco", label: "MOCO 660 \xB7 \u3053\u308C\u3092\u8CB7\u3046", x: -5.7, z: -2.8, model: "moco" }, { id: "ridge", label: "RIDGE AWD \xB7 \u3053\u308C\u3092\u8CB7\u3046", x: 0, z: -2.8, model: "ridge" }, { id: "raven", label: "RAVEN GT \xB7 \u3053\u308C\u3092\u8CB7\u3046", x: 5.7, z: -2.8, model: "raven" }]
};
var VENUE_KINDS = ["casino", "estate", "dealer", "tuner", "exchange", ...BOUTIQUE_IDS];
var VENUE_DOORS = {
  casino: { x: CASINO.door.x, width: CASINO.door.width, height: CASINO.door.height },
  estate: { x: ESTATE.door.x, width: ESTATE.door.width, height: 2.6 },
  dealer: { x: (DEALER.x0 + DEALER.x1) / 2, width: 2.2, height: 2.6 },
  tuner: { x: (TUNER.x0 + TUNER.x1) / 2, width: 2.2, height: 2.6 },
  exchange: { x: (EXCHANGE.x0 + EXCHANGE.x1) / 2, width: 2.2, height: 2.8 },
  ...Object.fromEntries(BOUTIQUE_IDS.map((id2) => [id2, { x: (BOUTIQUES[id2].x0 + BOUTIQUES[id2].x1) / 2, ...BOUTIQUE_DOOR }]))
};

// src/economy/neighborhood.ts
var NEIGHBOR_RADIUS = 80;
var TOWN_HOUSE_WEIGHT = {
  "wood-apartment": 1.5,
  "steel-apartment": 1.5,
  narrow: 1.2,
  mansion: 2.5,
  residence: 2.5,
  designers: 2,
  tower: 3.5
};
var VENUE_WEIGHT = (v) => v === "casino" ? 6 : 4;
function plotCenter(plot) {
  return { x: plotX(plot) + LOT_W * GRID / 2, z: plotZ(plot) + LOT_D * GRID / 2 };
}
var FIXED_BUILDINGS = [
  ...Object.entries(TOWN_HOUSE_PLOTS).map(([p, id2]) => ({ ...plotCenter(Number(p)), weight: TOWN_HOUSE_WEIGHT[id2] ?? 1 })),
  ...VENUE_KINDS.map((v) => {
    const b = VENUES[v];
    return { x: (b.x0 + b.x1) / 2, z: (b.z0 + b.z1) / 2, weight: VENUE_WEIGHT(v) };
  })
];
function playerHouseWeight(levels) {
  return levels > 1 ? 1.5 : 1;
}
function neighborScore(plot, buildings) {
  const c = plotCenter(plot);
  const own = TOWN_HOUSE_PLOTS[plot] ? plotCenter(plot) : null;
  let score = 0;
  for (const b of buildings) {
    if (own && b.x === own.x && b.z === own.z) continue;
    const d = Math.hypot(b.x - c.x, b.z - c.z);
    if (d < 1 || d >= NEIGHBOR_RADIUS) continue;
    score += b.weight * (1 - d / NEIGHBOR_RADIUS);
  }
  return score;
}
function densityFactor(score) {
  return Math.round(Math.min(1.6, Math.max(0.8, 0.8 + score * 0.033)) * 100) / 100;
}
function lotsDensity(plot, lots) {
  const houses = lots.flatMap((l) => {
    if (!l.built || typeof l.plot !== "number" || l.plot === plot) return [];
    const levels = new Set(l.built.floors.map((f) => f.level)).size;
    return [{ ...plotCenter(l.plot), weight: playerHouseWeight(levels) }];
  });
  return densityFactor(neighborScore(plot, [...FIXED_BUILDINGS, ...houses]));
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
    hedge: 15e3,
    register: 15e4
  }
};

// node_modules/zustand/esm/vanilla.mjs
var createStoreImpl = (createState) => {
  let state;
  const listeners = /* @__PURE__ */ new Set();
  const setState = (partial, replace) => {
    const nextState = typeof partial === "function" ? partial(state) : partial;
    if (!Object.is(nextState, state)) {
      const previousState = state;
      state = (replace != null ? replace : typeof nextState !== "object" || nextState === null) ? nextState : Object.assign({}, state, nextState);
      listeners.forEach((listener) => listener(state, previousState));
    }
  };
  const getState = () => state;
  const getInitialState = () => initialState;
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const destroy = () => {
    if ((import.meta.env ? import.meta.env.MODE : void 0) !== "production") {
      console.warn(
        "[DEPRECATED] The `destroy` method will be unsupported in a future version. Instead use unsubscribe function returned by subscribe. Everything will be garbage-collected if store is garbage-collected."
      );
    }
    listeners.clear();
  };
  const api = { setState, getState, getInitialState, subscribe, destroy };
  const initialState = state = createState(setState, getState, api);
  return api;
};
var createStore = (createState) => createState ? createStoreImpl(createState) : createStoreImpl;

// node_modules/zustand/esm/index.mjs
var import_react = __toESM(require_react(), 1);
var import_with_selector = __toESM(require_with_selector(), 1);
var { useDebugValue } = import_react.default;
var { useSyncExternalStoreWithSelector } = import_with_selector.default;
var didWarnAboutEqualityFn = false;
var identity = (arg) => arg;
function useStore(api, selector = identity, equalityFn) {
  if ((import.meta.env ? import.meta.env.MODE : void 0) !== "production" && equalityFn && !didWarnAboutEqualityFn) {
    console.warn(
      "[DEPRECATED] Use `createWithEqualityFn` instead of `create` or use `useStoreWithEqualityFn` instead of `useStore`. They can be imported from 'zustand/traditional'. https://github.com/pmndrs/zustand/discussions/1937"
    );
    didWarnAboutEqualityFn = true;
  }
  const slice = useSyncExternalStoreWithSelector(
    api.subscribe,
    api.getState,
    api.getServerState || api.getInitialState,
    selector,
    equalityFn
  );
  useDebugValue(slice);
  return slice;
}
var createImpl = (createState) => {
  if ((import.meta.env ? import.meta.env.MODE : void 0) !== "production" && typeof createState !== "function") {
    console.warn(
      "[DEPRECATED] Passing a vanilla store will be unsupported in a future version. Instead use `import { useStore } from 'zustand'`."
    );
  }
  const api = typeof createState === "function" ? createStore(createState) : createState;
  const useBoundStore = (selector, equalityFn) => useStore(api, selector, equalityFn);
  Object.assign(useBoundStore, api);
  return useBoundStore;
};
var create = (createState) => createState ? createImpl(createState) : createImpl;

// src/catalog/designs.ts
var DESIGN_PREFIX = "design:";
var STORAGE_KEY = "open-world:furniture-designs";
var MAX_PARTS = 40;
var PAINTS = [
  { id: "main", name: "\u30E1\u30A4\u30F3\u8272" },
  { id: "wood", name: "\u6728" },
  { id: "white", name: "\u767D" },
  { id: "black", name: "\u9ED2\uFF08\u3064\u3084\uFF09" },
  { id: "dark", name: "\u30B0\u30EC\u30FC" },
  { id: "accent", name: "\u30EC\u30B6\u30FC" },
  { id: "steel", name: "\u30B9\u30C6\u30F3\u30EC\u30B9" },
  { id: "counter", name: "\u4EBA\u5DE5\u5927\u7406\u77F3" },
  { id: "stone", name: "\u77F3" },
  { id: "green", name: "\u690D\u7269" }
];
var leg = (x, z, h, paint = "wood") => ({ shape: "box", size: [0.04, h, 0.04], pos: [x, h / 2, z], paint });
var TEMPLATES = [
  { name: "\u4F55\u3082\u306A\u3044", def: { name: "\u65B0\u3057\u3044\u5BB6\u5177", colors: ["#c9b8a4"], parts: [] } },
  {
    name: "\u6905\u5B50",
    def: {
      name: "\u308F\u305F\u3057\u306E\u6905\u5B50",
      colors: ["#7b8f6a"],
      seat: { height: 0.47, z: 0 },
      parts: [
        leg(-0.2, -0.2, 0.42),
        leg(0.2, -0.2, 0.42),
        leg(-0.2, 0.2, 0.42),
        leg(0.2, 0.2, 0.42),
        { shape: "box", size: [0.46, 0.03, 0.46], pos: [0, 0.435, 0], paint: "wood" },
        { shape: "box", size: [0.44, 0.05, 0.44], pos: [0, 0.475, 0], paint: "main" },
        { shape: "box", size: [0.44, 0.42, 0.03], pos: [0, 0.72, -0.215], paint: "wood" }
      ]
    }
  },
  {
    name: "\u30C6\u30FC\u30D6\u30EB",
    def: {
      name: "\u308F\u305F\u3057\u306E\u30C6\u30FC\u30D6\u30EB",
      colors: ["#7a5535"],
      parts: [
        leg(-0.65, -0.35, 0.69),
        leg(0.65, -0.35, 0.69),
        leg(-0.65, 0.35, 0.69),
        leg(0.65, 0.35, 0.69),
        { shape: "box", size: [1.4, 0.03, 0.8], pos: [0, 0.705, 0], paint: "main" }
      ]
    }
  },
  {
    name: "\u30C1\u30A7\u30B9\u30C8",
    def: {
      name: "\u308F\u305F\u3057\u306E\u30C1\u30A7\u30B9\u30C8",
      colors: ["#e9e4da"],
      parts: [
        { shape: "box", size: [0.8, 0.8, 0.42], pos: [0, 0.42, -0.02], paint: "wood" },
        { shape: "box", size: [0.76, 0.22, 0.4], pos: [0, 0.17, 0.02], paint: "main", move: "drawer" },
        { shape: "box", size: [0.76, 0.22, 0.4], pos: [0, 0.42, 0.02], paint: "main", move: "drawer" },
        { shape: "box", size: [0.76, 0.22, 0.4], pos: [0, 0.67, 0.02], paint: "main", move: "drawer" }
      ]
    }
  },
  {
    name: "\u98DF\u5668\u68DA",
    def: {
      name: "\u308F\u305F\u3057\u306E\u98DF\u5668\u68DA",
      colors: ["#5d6670"],
      parts: [
        { shape: "box", size: [0.9, 1.8, 0.4], pos: [0, 0.9, -0.02], paint: "wood" },
        { shape: "box", size: [0.44, 1.7, 0.02], pos: [-0.22, 0.9, 0.19], paint: "main", move: "door-l" },
        { shape: "box", size: [0.44, 1.7, 0.02], pos: [0.22, 0.9, 0.19], paint: "main", move: "door-r" }
      ]
    }
  },
  {
    name: "\u30BD\u30D5\u30A1",
    def: {
      name: "\u308F\u305F\u3057\u306E\u30BD\u30D5\u30A1",
      colors: ["#9aa7b3"],
      seat: { height: 0.44, z: 0.05 },
      parts: [
        { shape: "box", size: [1.6, 0.3, 0.8], pos: [0, 0.2, 0], paint: "main" },
        { shape: "box", size: [1.4, 0.12, 0.6], pos: [0, 0.38, 0.08], paint: "main" },
        { shape: "box", size: [1.6, 0.45, 0.18], pos: [0, 0.55, -0.31], paint: "main" },
        { shape: "box", size: [0.12, 0.3, 0.8], pos: [-0.74, 0.5, 0], paint: "main" },
        { shape: "box", size: [0.12, 0.3, 0.8], pos: [0.74, 0.5, 0], paint: "main" },
        leg(-0.7, -0.32, 0.05, "black"),
        leg(0.7, -0.32, 0.05, "black"),
        leg(-0.7, 0.32, 0.05, "black"),
        leg(0.7, 0.32, 0.05, "black")
      ]
    }
  }
];
var clamp = (v, lo, hi, fallback) => typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
var vec = (v, lo, hi, fallback) => Array.isArray(v) ? [0, 1, 2].map((i) => +clamp(v[i], lo, hi, fallback).toFixed(3)) : [fallback, fallback, fallback];
var HEX = /^#[0-9a-f]{6}$/i;
function sanitizeDesign(raw) {
  if (!raw || typeof raw !== "object") return null;
  const r = raw;
  if (typeof r.id !== "string" || !r.id.startsWith(DESIGN_PREFIX) || r.id.length > 60) return null;
  const parts = (Array.isArray(r.parts) ? r.parts : []).slice(0, MAX_PARTS).flatMap((p) => {
    if (!p || typeof p !== "object") return [];
    const shape = ["box", "cylinder", "sphere"].includes(p.shape) ? p.shape : "box";
    const paint = PAINTS.some((x) => x.id === p.paint) ? p.paint : "main";
    const piece = { shape, size: vec(p.size, 0.01, 3, 0.1), pos: vec(p.pos, -2, 3, 0), paint };
    if (p.move === "drawer" || p.move === "door-l" || p.move === "door-r") piece.move = p.move;
    return [piece];
  });
  const colors = (Array.isArray(r.colors) ? r.colors : []).filter((c) => typeof c === "string" && HEX.test(c)).slice(0, 8);
  const def = {
    id: r.id,
    name: (typeof r.name === "string" ? r.name : "").trim().slice(0, 30) || "\u30C7\u30B6\u30A4\u30F3\u5BB6\u5177",
    colors: colors.length ? colors : ["#c9b8a4"],
    parts
  };
  if (r.seat && typeof r.seat === "object") def.seat = { height: +clamp(r.seat.height, 0.2, 1.2, 0.45).toFixed(3), z: +clamp(r.seat.z, -1, 1, 0).toFixed(3) };
  return def;
}
function designPrice(def) {
  let yen = 5e3;
  for (const p of def.parts) yen += 2e3 + p.size[0] * p.size[1] * p.size[2] * 3e4 + (p.move ? 4e3 : 0);
  return Math.round(Math.min(yen, 2e6) / 1e3) * 1e3;
}
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.map(sanitizeDesign).filter((d) => !!d) : [];
  } catch {
    return [];
  }
}
function persist(designs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(designs));
  } catch {
  }
}
var useDesigns = create((set, get) => {
  const designs = typeof localStorage === "undefined" ? [] : load();
  designs.forEach(registerDesign);
  return {
    designs,
    save: (raw) => {
      const def = sanitizeDesign(raw);
      if (!def) return null;
      registerDesign(def);
      const list = get().designs.some((d) => d.id === def.id) ? get().designs.map((d) => d.id === def.id ? def : d) : [...get().designs, def];
      persist(list);
      set({ designs: list });
      return def;
    },
    remove: (id2) => {
      const list = get().designs.filter((d) => d.id !== id2);
      persist(list);
      set({ designs: list });
    }
  };
});
var useDesigner = create(() => ({ draft: null }));

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
var materialPrice = (id2) => MATERIAL_PRICE[id2] ?? 8e3;
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
    out.push({ category: "furniture", id: f.id, cost: f.design ? designPrice(furnitureDef(f)) : furniturePrice(f.type), key: `${f.type}:${f.color}` });
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

// src/economy/shop.ts
var ITEM_KINDS = [
  { id: "goods", name: "\u7269\u30FB\u30B5\u30FC\u30D3\u30B9" },
  { id: "ticket", name: "\u5165\u5834\u5238" },
  { id: "reservation", name: "\u4E88\u7D04" },
  { id: "membership", name: "\u4F1A\u54E1\u6A29" }
];
var RESERVE_AHEAD = 30;
var SHOP_LIMITS = { items: 12, name: 24, itemName: 30, description: 200, photo: 6e4, sales: 100, price: 1e10, sign: 16, flyer: 120, eventTitle: 30, eventNote: 120 };
var kindOf = (v) => ITEM_KINDS.some((k) => k.id === v) ? v : "goods";
var daysOf = (v) => Number.isSafeInteger(v) && v >= 1 && v <= 365 ? v : 30;
function typed(i) {
  const kind = kindOf(i.kind);
  return kind === "goods" ? {} : kind === "membership" ? { kind, days: daysOf(i.days) } : { kind };
}
var str = (v, max) => typeof v === "string" ? v.trim().slice(0, max) : "";
var photo = (v) => typeof v === "string" && v.length <= SHOP_LIMITS.photo && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(v) ? v : void 0;
function priceError(price) {
  if (!Number.isSafeInteger(price) || price < 1) return "\u5024\u6BB5\u306F1\u5186\u4EE5\u4E0A\u306E\u6574\u6570\u306B\u3057\u3066\u304F\u3060\u3055\u3044";
  if (price > SHOP_LIMITS.price) return "\u5024\u6BB5\u304C\u9AD8\u3059\u304E\u307E\u3059\uFF08100\u5104\u5186\u307E\u3067\uFF09";
  return null;
}
function cleanShop(v) {
  if (!v || typeof v !== "object") return null;
  const s = v;
  const items = (Array.isArray(s.items) ? s.items : []).slice(0, SHOP_LIMITS.items).flatMap((i) => {
    if (!i || typeof i !== "object" || typeof i.id !== "string" || i.id.length > 80) return [];
    const name = str(i.name, SHOP_LIMITS.itemName);
    if (!name || priceError(i.price)) return [];
    const p = photo(i.photo);
    return [{ id: i.id, name, price: i.price, description: str(i.description, SHOP_LIMITS.description), ...typed(i), ...p ? { photo: p } : {} }];
  });
  const sales = (Array.isArray(s.sales) ? s.sales : []).slice(-SHOP_LIMITS.sales).flatMap(
    (x) => x && typeof x.id === "string" && Number.isFinite(x.day) && Number.isSafeInteger(x.price) ? [{
      id: x.id,
      day: x.day,
      buyer: str(x.buyer, 24),
      item: str(x.item, SHOP_LIMITS.itemName),
      price: x.price,
      ...x.kind && x.kind !== "goods" ? { kind: kindOf(x.kind) } : {},
      ...typeof x.buyerId === "string" && x.buyerId.length <= 100 ? { buyerId: x.buyerId } : {},
      ...Number.isSafeInteger(x.until) ? { until: x.until } : {},
      ...Number.isSafeInteger(x.forDay) ? { forDay: x.forDay } : {}
    }] : []
  );
  return { name: str(s.name, SHOP_LIMITS.name) || "\u304A\u5E97", items, sales, revenue: Number.isSafeInteger(s.revenue) ? s.revenue : 0, ...cleanPromo(s) };
}
function cleanPromo(s) {
  const sign = str(s.sign, SHOP_LIMITS.sign), flyer = str(s.flyer, SHOP_LIMITS.flyer);
  const e = s.event && typeof s.event === "object" ? s.event : null;
  const title = e ? str(e.title, SHOP_LIMITS.eventTitle) : "";
  return {
    ...sign ? { sign } : {},
    ...flyer ? { flyer } : {},
    ...s.pin === true ? { pin: true } : {},
    ...e && title && Number.isSafeInteger(e.day) && e.day >= 0 ? { event: { title, day: e.day, note: str(e.note, SHOP_LIMITS.eventNote) } } : {}
  };
}
function recordSale(shop, sale) {
  const item = shop.items.find((i) => i.id === sale.itemId);
  if (!item) return "\u3053\u306E\u5546\u54C1\u306F\u58F2\u308A\u5207\u308C\u304B\u3001\u53D6\u308A\u4E0B\u3052\u3089\u308C\u307E\u3057\u305F";
  if (item.price !== sale.price) return "\u5024\u6BB5\u304C\u5909\u308F\u308A\u307E\u3057\u305F\u3002\u3082\u3046\u4E00\u5EA6\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044";
  const kind = kindOf(item.kind);
  if (kind === "reservation" && !(Number.isSafeInteger(sale.forDay) && sale.forDay >= sale.day && sale.forDay <= sale.day + RESERVE_AHEAD)) return `\u4E88\u7D04\u3059\u308B\u65E5\u3092\u4ECA\u65E5\u304B\u3089${RESERVE_AHEAD}\u65E5\u4EE5\u5185\u3067\u9078\u3093\u3067\u304F\u3060\u3055\u3044`;
  const entry = {
    id: sale.id,
    day: sale.day,
    buyer: str(sale.buyer, 24) || "\u304A\u5BA2\u3055\u3093",
    item: item.name,
    price: item.price,
    ...kind !== "goods" ? { kind } : {},
    ...sale.buyerId ? { buyerId: sale.buyerId } : {},
    ...kind === "membership" ? { until: sale.day + daysOf(item.days) - 1 } : {},
    ...kind === "reservation" ? { forDay: sale.forDay } : {}
  };
  return { item, shop: { ...shop, sales: [...shop.sales, entry].slice(-SHOP_LIMITS.sales), revenue: shop.revenue + item.price } };
}

// src/economy/requests.ts
var REQUEST_LIMITS = { perLot: 6, title: 30, description: 200, reward: 1e10 };
var str2 = (v, max) => typeof v === "string" ? v.trim().slice(0, max) : "";
var id = (v) => typeof v === "string" && v.length > 0 && v.length <= 100 ? v : "";
function cleanRequests(v) {
  return (Array.isArray(v) ? v : []).slice(0, REQUEST_LIMITS.perLot).flatMap((r) => {
    if (!r || typeof r !== "object") return [];
    const title = str2(r.title, REQUEST_LIMITS.title), poster = id(r.poster);
    if (!id(r.id) || !title || !poster || !Number.isSafeInteger(r.reward) || r.reward < 1 || !Number.isSafeInteger(r.day)) return [];
    const worker = id(r.worker);
    return [{
      id: r.id,
      title,
      description: str2(r.description, REQUEST_LIMITS.description),
      reward: r.reward,
      poster,
      posterName: str2(r.posterName, 24) || "\u3060\u308C\u304B",
      day: r.day,
      ...worker ? { worker, workerName: str2(r.workerName, 24) || "\u3060\u308C\u304B" } : {}
    }];
  });
}
function requestError(r) {
  if (!str2(r.title, REQUEST_LIMITS.title)) return "\u4F9D\u983C\u306E\u540D\u524D\u3092\u5165\u308C\u3066\u304F\u3060\u3055\u3044";
  if (!Number.isSafeInteger(r.reward) || r.reward < 1) return "\u5831\u916C\u306F1\u5186\u4EE5\u4E0A\u306E\u6574\u6570\u306B\u3057\u3066\u304F\u3060\u3055\u3044";
  if (r.reward > REQUEST_LIMITS.reward) return "\u5831\u916C\u304C\u9AD8\u3059\u304E\u307E\u3059\uFF08100\u5104\u5186\u307E\u3067\uFF09";
  return null;
}
function stepRequest(list, reqId, op, who, name) {
  const r = list.find((x) => x.id === reqId);
  if (!r) return "\u305D\u306E\u4F9D\u983C\u306F\u3082\u3046\u3042\u308A\u307E\u305B\u3093";
  const rest = list.filter((x) => x.id !== reqId);
  if (op === "take") {
    if (r.poster === who) return "\u81EA\u5206\u306E\u4F9D\u983C\u306F\u5F15\u304D\u53D7\u3051\u3089\u308C\u307E\u305B\u3093";
    if (r.worker) return "\u3082\u3046\u307B\u304B\u306E\u4EBA\u304C\u5F15\u304D\u53D7\u3051\u3066\u3044\u307E\u3059";
    return { list: list.map((x) => x.id === reqId ? { ...x, worker: who, workerName: str2(name, 24) || "\u3060\u308C\u304B" } : x), message: `\u300C${r.title}\u300D\u3092\u5F15\u304D\u53D7\u3051\u307E\u3057\u305F` };
  }
  if (op === "quit") {
    if (r.worker !== who) return "\u5F15\u304D\u53D7\u3051\u3066\u3044\u308B\u4F9D\u983C\u3067\u306F\u3042\u308A\u307E\u305B\u3093";
    const { worker: _w, workerName: _n, ...open2 } = r;
    return { list: list.map((x) => x.id === reqId ? open2 : x), message: `\u300C${r.title}\u300D\u3092\u3084\u3081\u307E\u3057\u305F` };
  }
  if (r.poster !== who) return "\u4F9D\u983C\u3057\u305F\u4EBA\u3060\u3051\u304C\u3067\u304D\u307E\u3059";
  if (op === "done") {
    if (!r.worker) return "\u307E\u3060\u3060\u308C\u3082\u5F15\u304D\u53D7\u3051\u3066\u3044\u307E\u305B\u3093";
    return { list: rest, pay: { to: r.worker, amount: r.reward, label: `\u4F9D\u983C\u306E\u5831\u916C\uFF1A${r.title}\uFF08${r.posterName}\u3055\u3093\uFF09` }, message: `${r.workerName}\u3055\u3093\u306B\u5831\u916C\u3092\u6E21\u3057\u307E\u3057\u305F` };
  }
  if (r.worker) return "\u5F15\u304D\u53D7\u3051\u305F\u4EBA\u304C\u3044\u308B\u9593\u306F\u53D6\u308A\u4E0B\u3052\u3089\u308C\u307E\u305B\u3093\uFF08\u5B8C\u4E86\u3092\u78BA\u8A8D\u3059\u308B\u304B\u3001\u76F8\u624B\u306B\u3084\u3081\u3066\u3082\u3089\u3063\u3066\u304F\u3060\u3055\u3044\uFF09";
  return { list: rest, pay: { to: r.poster, amount: r.reward, label: `\u4F9D\u983C\u306E\u53D6\u308A\u4E0B\u3052\uFF1A${r.title}` }, message: "\u4F9D\u983C\u3092\u53D6\u308A\u4E0B\u3052\u307E\u3057\u305F\uFF08\u5831\u916C\u306F\u623B\u308A\u307E\u3057\u305F\uFF09" };
}

// src/server/sharedWorld.ts
var SHARED_START_MONEY = 1e6;
var SHARED_LIMIT = 10;
function initialSharedWorld(id2) {
  const w = {
    worldId: id2,
    doors: {},
    receipts: {},
    accounts: {},
    house: emptyHouse(),
    economy: { day: 1, clock: 0, market: 1, marketHistory: [1], lots: [], currentLotId: null, offers: [] }
  };
  w.economy.offers = sharedOffers(w, Math.random);
  return w;
}
function withAccount(w, id2, name) {
  const a = w.accounts?.[id2];
  if (a && a.name === name) return w;
  return { ...w, accounts: { ...w.accounts, [id2]: a ? { ...a, name } : { name, money: SHARED_START_MONEY, ledger: [{ day: w.economy.day, label: "\u306F\u3058\u3081\u306E\u6240\u6301\u91D1", amount: SHARED_START_MONEY }], cars: [] } } };
}
function charge(w, id2, amount, label) {
  const a = w.accounts?.[id2];
  if (!a) return "\u53E3\u5EA7\u304C\u3042\u308A\u307E\u305B\u3093";
  if (amount > 0 && a.money < amount) return "\u304A\u91D1\u304C\u8DB3\u308A\u307E\u305B\u3093";
  if (!amount) return w;
  return { ...w, accounts: { ...w.accounts, [id2]: { ...a, money: a.money - amount, ledger: [{ day: w.economy.day, label, amount: -amount }, ...a.ledger].slice(0, 50) } } };
}
function publicWorld(w) {
  const { accounts: _hidden, ...rest } = w;
  return rest;
}
var plotsOfLots = (lots) => lots.flatMap((l) => [l.plot, l.joined].filter((p) => typeof p === "number"));
function sharedOffers(w, rng) {
  const taken = new Set(plotsOfLots(w.economy.lots));
  return landOffers(w.economy.day, rng).flatMap((o) => {
    const plot = freePlot(o.location, taken, rng);
    if (plot === null) return [];
    taken.add(plot);
    return [{ ...o, plot }];
  });
}
function applyAction(w, sender, name, c, a) {
  const lots = w.economy.lots, lot = lots.find((l) => l.id === c.lot);
  if (a.type === "money") {
    if (!Number.isSafeInteger(a.delta) || Math.abs(a.delta) > 1e13 || typeof a.label !== "string") return "\u91D1\u984D\u304C\u4E0D\u6B63\u3067\u3059";
    const paid2 = charge(w, sender, -a.delta, a.label.slice(0, 60));
    return typeof paid2 === "string" ? paid2 : { world: paid2, cost: 0, message: "" };
  }
  if (a.type === "stocks") {
    if (!a.holdings || typeof a.holdings !== "object" || JSON.stringify(a.holdings).length > 2e4) return "\u682A\u306E\u60C5\u5831\u304C\u4E0D\u6B63\u3067\u3059";
    const acc = w.accounts?.[sender];
    if (!acc) return "\u53E3\u5EA7\u304C\u3042\u308A\u307E\u305B\u3093";
    return { world: { ...w, accounts: { ...w.accounts, [sender]: { ...acc, stocks: a.holdings } } }, cost: 0, message: "" };
  }
  if (a.type === "cars") {
    if (!Array.isArray(a.cars) || a.cars.length > 10 || JSON.stringify(a.cars).length > 2e4) return "\u8ECA\u306E\u60C5\u5831\u304C\u4E0D\u6B63\u3067\u3059";
    const acc = w.accounts?.[sender];
    if (!acc) return "\u53E3\u5EA7\u304C\u3042\u308A\u307E\u305B\u3093";
    return { world: { ...w, accounts: { ...w.accounts, [sender]: { ...acc, cars: a.cars } } }, cost: 0, message: "" };
  }
  const withLots = (next2) => ({ ...w, economy: { ...w.economy, lots: next2 } });
  if (a.type === "buyLand") {
    const offer = w.economy.offers.find((o) => o.id === a.offer);
    if (!offer || typeof offer.plot !== "number") return "\u305D\u306E\u571F\u5730\u306F\u3082\u3046\u58F2\u308C\u3066\u3057\u307E\u3044\u307E\u3057\u305F";
    if (plotsOfLots(lots).includes(offer.plot)) return "\u305D\u306E\u533A\u753B\u306F\u3082\u3046\u4F7F\u308F\u308C\u3066\u3044\u307E\u3059";
    if (lots.length >= 90) return "\u3053\u306E\u753A\u306B\u306F\u3082\u3046\u571F\u5730\u3092\u5897\u3084\u305B\u307E\u305B\u3093";
    const price2 = landPrice(offer.location, offer.variance, w.economy.market, lotsDensity(offer.plot, lots));
    if (!Number.isSafeInteger(c.reserved) || c.reserved < price2) return "\u5024\u6BB5\u304C\u5909\u308F\u308A\u307E\u3057\u305F\u3002\u6700\u65B0\u306E\u72B6\u614B\u3067\u3084\u308A\u76F4\u3057\u3066\u304F\u3060\u3055\u3044";
    const bought = {
      id: "lot-" + c.id.slice(0, 40),
      name: `${offer.name}\uFF08${getLocation(offer.location).name}\uFF09`,
      location: offer.location,
      variance: offer.variance,
      built: null,
      design: null,
      construction: null,
      rented: false,
      invested: price2,
      plot: offer.plot,
      owner: sender,
      ownerName: name
    };
    const paid2 = charge(w, sender, price2, "\u571F\u5730\u306E\u8CFC\u5165\uFF08" + bought.name + "\uFF09");
    if (typeof paid2 === "string") return paid2;
    const current = w.economy.currentLotId ?? bought.id;
    return { world: { ...paid2, economy: { ...w.economy, lots: [...lots, bought], currentLotId: current, offers: w.economy.offers.filter((o) => o.id !== offer.id) } }, cost: price2, message: bought.name + "\u3092\u8CB7\u3044\u307E\u3057\u305F" };
  }
  if (!lot) return "\u305D\u306E\u571F\u5730\u306F\u3042\u308A\u307E\u305B\u3093";
  if (a.type === "list") {
    if (lot.owner !== sender) return "\u81EA\u5206\u306E\u571F\u5730\u3060\u3051\u58F2\u308A\u306B\u51FA\u305B\u307E\u3059";
    if (lot.construction) return "\u5DE5\u4E8B\u4E2D\u306F\u58F2\u308A\u306B\u51FA\u305B\u307E\u305B\u3093";
    if (a.price !== null && cleanRequests(lot.requests).length) return "\u4ED5\u4E8B\u306E\u4F9D\u983C\u304C\u6B8B\u3063\u3066\u3044\u308B\u9593\u306F\u58F2\u308A\u306B\u51FA\u305B\u307E\u305B\u3093";
    if (a.price !== null && !(Number.isSafeInteger(a.price) && a.price > 0 && a.price <= 1e13)) return "\u5024\u6BB5\u304C\u4E0D\u6B63\u3067\u3059";
    const next2 = lots.map((l) => l.id === lot.id ? { ...l, listing: a.price === null ? void 0 : { price: a.price } } : l);
    return { world: withLots(next2), cost: 0, message: a.price === null ? "\u58F2\u308A\u306B\u51FA\u3059\u306E\u3092\u3084\u3081\u307E\u3057\u305F" : "\u58F2\u308A\u306B\u51FA\u3057\u307E\u3057\u305F" };
  }
  if (a.type === "offerRent") {
    if (lot.owner !== sender) return "\u81EA\u5206\u306E\u5BB6\u3060\u3051\u8CB8\u3057\u51FA\u305B\u307E\u3059";
    if (lot.tenant) return "\u8CB8\u3057\u3066\u3044\u308B\u9593\u306F\u5BB6\u8CC3\u3092\u5909\u3048\u3089\u308C\u307E\u305B\u3093";
    if (a.rent !== null && !(Number.isSafeInteger(a.rent) && a.rent > 0 && a.rent <= 1e11)) return "\u5BB6\u8CC3\u304C\u4E0D\u6B63\u3067\u3059";
    const next2 = lots.map((l) => l.id === lot.id ? { ...l, rentOffer: a.rent === null ? void 0 : { rent: a.rent } } : l);
    return { world: withLots(next2), cost: 0, message: a.rent === null ? "\u8CB8\u3057\u51FA\u3057\u3092\u3084\u3081\u307E\u3057\u305F" : "\u501F\u308A\u308B\u4EBA\u3092\u52DF\u96C6\u3057\u307E\u3057\u305F" };
  }
  if (a.type === "rentLot") {
    if (!lot.rentOffer || !lot.owner) return "\u305D\u306E\u5BB6\u306F\u8CB8\u3057\u51FA\u3055\u308C\u3066\u3044\u307E\u305B\u3093";
    if (lot.tenant) return "\u305D\u306E\u5BB6\u306F\u3082\u3046\u501F\u308A\u3089\u308C\u3066\u3044\u307E\u3059";
    if (lot.owner === sender) return "\u81EA\u5206\u306E\u5BB6\u306F\u501F\u308A\u3089\u308C\u307E\u305B\u3093";
    if (lots.some((l) => l.tenant === sender)) return "\u501F\u308A\u3089\u308C\u308B\u5BB6\u306F1\u8ED2\u307E\u3067\u3067\u3059";
    const rent = lot.rentOffer.rent;
    const paid2 = charge(w, sender, rent, `\u5BB6\u8CC3\uFF08${lot.name}\uFF09`);
    if (typeof paid2 === "string") return paid2;
    const received2 = paid2.accounts?.[lot.owner] ? charge(paid2, lot.owner, -rent, `\u5BB6\u8CC3\u53CE\u5165\uFF08${lot.name}\u30FB${name}\u3055\u3093\uFF09`) : paid2;
    if (typeof received2 === "string") return received2;
    const next2 = lots.map((l) => l.id === lot.id ? { ...l, tenant: sender, tenantName: name } : l);
    return { world: { ...received2, economy: { ...received2.economy, lots: next2 } }, cost: rent, message: lot.name + "\u3092\u501F\u308A\u307E\u3057\u305F" };
  }
  if (a.type === "shop") {
    if (lot.owner !== sender) return "\u81EA\u5206\u306E\u571F\u5730\u3060\u3051\u304A\u5E97\u306B\u3067\u304D\u307E\u3059";
    const { shop: _old, ...rest } = lot;
    if (a.shop === null) return { world: withLots(lots.map((l) => l.id === lot.id ? rest : l)), cost: 0, message: "\u304A\u5E97\u3092\u9589\u3058\u307E\u3057\u305F" };
    const shop = cleanShop(a.shop);
    if (!shop) return "\u304A\u5E97\u306E\u5185\u5BB9\u304C\u4E0D\u6B63\u3067\u3059";
    const kept = cleanShop(lot.shop);
    const next2 = { ...shop, sales: kept?.sales ?? [], revenue: kept?.revenue ?? 0 };
    if (JSON.stringify(next2).length > 9e5) return "\u304A\u5E97\u306E\u5199\u771F\u304C\u591A\u3059\u304E\u307E\u3059";
    return { world: withLots(lots.map((l) => l.id === lot.id ? { ...rest, shop: next2 } : l)), cost: 0, message: "" };
  }
  if (a.type === "purchase") {
    const shop = cleanShop(lot.shop);
    if (!shop || !lot.owner) return "\u3053\u306E\u304A\u5E97\u306F\u9589\u307E\u3063\u3066\u3044\u307E\u3059";
    if (lot.owner === sender) return "\u81EA\u5206\u306E\u304A\u5E97\u3067\u306F\u8CB7\u3048\u307E\u305B\u3093";
    if (typeof a.item !== "string" || !Number.isSafeInteger(c.reserved) || c.reserved < a.price) return "\u5024\u6BB5\u304C\u5909\u308F\u308A\u307E\u3057\u305F\u3002\u3082\u3046\u4E00\u5EA6\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044";
    const sale = recordSale(shop, { id: c.id, day: w.economy.day, buyer: name, buyerId: sender, itemId: a.item, price: a.price, forDay: a.day });
    if (typeof sale === "string") return sale;
    const paid2 = charge(w, sender, sale.item.price, `\u8CB7\u3044\u7269\uFF1A${sale.item.name}\uFF08${shop.name}\uFF09`);
    if (typeof paid2 === "string") return paid2;
    const received2 = paid2.accounts?.[lot.owner] ? charge(paid2, lot.owner, -sale.item.price, `\u304A\u5E97\u306E\u58F2\u4E0A\uFF1A${sale.item.name}\uFF08${name}\u3055\u3093\uFF09`) : paid2;
    if (typeof received2 === "string") return received2;
    const next2 = received2.economy.lots.map((l) => l.id === lot.id ? { ...l, shop: sale.shop } : l);
    return { world: { ...received2, economy: { ...received2.economy, lots: next2 } }, cost: sale.item.price, message: `\u300C${sale.item.name}\u300D\u3092\u8CB7\u3044\u307E\u3057\u305F` };
  }
  if (a.type === "request") {
    if (lot.owner !== sender) return "\u81EA\u5206\u306E\u571F\u5730\u304B\u3089\u4F9D\u983C\u3092\u51FA\u3057\u3066\u304F\u3060\u3055\u3044";
    if (lot.listing) return "\u58F2\u308A\u306B\u51FA\u3057\u3066\u3044\u308B\u571F\u5730\u304B\u3089\u306F\u4F9D\u983C\u3092\u51FA\u305B\u307E\u305B\u3093";
    const list = cleanRequests(lot.requests);
    if (list.length >= REQUEST_LIMITS.perLot) return `\u4F9D\u983C\u306F1\u3064\u306E\u571F\u5730\u306B${REQUEST_LIMITS.perLot}\u4EF6\u307E\u3067\u3067\u3059`;
    const err = requestError(a);
    if (err) return err;
    if (!Number.isSafeInteger(c.reserved) || c.reserved < a.reward) return "\u5831\u916C\u306E\u9810\u304B\u308A\u304C\u8DB3\u308A\u307E\u305B\u3093";
    const req = cleanRequests([{ id: c.id, title: a.title, description: a.description, reward: a.reward, poster: sender, posterName: name, day: w.economy.day }])[0];
    const held = charge(w, sender, a.reward, `\u4F9D\u983C\u306E\u5831\u916C\u3092\u9810\u3051\u305F\uFF1A${req.title}`);
    if (typeof held === "string") return held;
    const next2 = held.economy.lots.map((l) => l.id === lot.id ? { ...l, requests: [...list, req] } : l);
    return { world: { ...held, economy: { ...held.economy, lots: next2 } }, cost: a.reward, message: `\u300C${req.title}\u300D\u3092\u4F9D\u983C\u3057\u307E\u3057\u305F\uFF08\u5831\u916C\u306F\u9810\u304B\u308A\u307E\u3057\u305F\uFF09` };
  }
  if (a.type === "requestStep") {
    const step = stepRequest(cleanRequests(lot.requests), String(a.request), a.op, sender, name);
    if (typeof step === "string") return step;
    const paid2 = step.pay && w.accounts?.[step.pay.to] ? charge(w, step.pay.to, -step.pay.amount, step.pay.label) : w;
    if (typeof paid2 === "string") return paid2;
    const next2 = paid2.economy.lots.map((l) => l.id === lot.id ? { ...l, requests: step.list.length ? step.list : void 0 } : l);
    return { world: { ...paid2, economy: { ...paid2.economy, lots: next2 } }, cost: 0, message: step.message };
  }
  if (a.type === "endLease") {
    if (!lot.tenant || lot.tenant !== sender && lot.owner !== sender) return "\u501F\u308A\u3066\u3044\u308B\u5BB6\u3067\u306F\u3042\u308A\u307E\u305B\u3093";
    const next2 = lots.map((l) => l.id === lot.id ? { ...l, tenant: void 0, tenantName: void 0 } : l);
    return { world: withLots(next2), cost: 0, message: "\u8CC3\u8CB8\u3092\u7D42\u4E86\u3057\u307E\u3057\u305F" };
  }
  if (!lot.listing || !lot.owner) return "\u305D\u306E\u571F\u5730\u306F\u58F2\u308A\u306B\u51FA\u3066\u3044\u307E\u305B\u3093";
  if (lot.owner === sender) return "\u81EA\u5206\u306E\u571F\u5730\u306F\u8CB7\u3048\u307E\u305B\u3093";
  const price = lot.listing.price, seller = lot.owner;
  if (!Number.isSafeInteger(c.reserved) || c.reserved < price) return "\u5024\u6BB5\u304C\u5909\u308F\u308A\u307E\u3057\u305F\u3002\u6700\u65B0\u306E\u72B6\u614B\u3067\u3084\u308A\u76F4\u3057\u3066\u304F\u3060\u3055\u3044";
  const paid = charge(w, sender, price, `${lot.name}\u306E\u8CFC\u5165`);
  if (typeof paid === "string") return paid;
  const received = paid.accounts?.[seller] ? charge(paid, seller, -price, `${lot.name}\u304C${name}\u3055\u3093\u306B\u58F2\u308C\u307E\u3057\u305F`) : paid;
  if (typeof received === "string") return received;
  const next = lots.map((l) => l.id === lot.id ? { ...l, owner: sender, ownerName: name, listing: void 0, invested: price, rented: false } : l);
  return { world: { ...received, economy: { ...received.economy, lots: next } }, cost: price, message: lot.name + "\u3092\u8CB7\u3044\u307E\u3057\u305F" };
}
function canBuildOn(lot, member) {
  return !lot.owner || lot.owner === member;
}
function houseOf(w, id2) {
  const l = w.economy.lots.find((l2) => l2.id === id2);
  return !l ? null : id2 === w.economy.currentLotId ? w.house : l.design ?? l.built ?? emptyHouse();
}
function withHouse(w, id2, house) {
  return {
    ...w,
    house: id2 === w.economy.currentLotId ? house : w.house,
    economy: { ...w.economy, lots: w.economy.lots.map((l) => l.id === id2 ? { ...l, built: house, design: null, construction: null } : l) }
  };
}
function applyCommand(w, sender, c, name = "\u30B2\u30B9\u30C8") {
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
  if (c.action) {
    const done = applyAction(w, sender, name, c, c.action);
    if (typeof done === "string") return fail(done);
    const world = { ...done.world, receipts: { ...receipts, [c.id]: { sender, cost: done.cost } } };
    return { world, result: { id: c.id, ok: true, cost: done.cost, message: done.message }, changed: true };
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
      cost = 0;
    } finally {
      Object.assign(lotSize, previous);
    }
    if (!Number.isSafeInteger(c.reserved) || c.reserved < cost) return fail("\u8CBB\u7528\u304C\u5909\u308F\u308A\u307E\u3057\u305F\u3002\u6700\u65B0\u306E\u72B6\u614B\u3067\u3084\u308A\u76F4\u3057\u3066\u304F\u3060\u3055\u3044");
    const charged = charge(w, sender, cost, "\u5EFA\u7BC9\uFF08" + lot.name + "\uFF09");
    if (typeof charged === "string") return fail(charged);
    const nextReceipts = { ...receipts, [c.id]: { sender, cost, delta: c.delta } };
    if (c.undoOf) nextReceipts[c.undoOf] = { ...undo, undone: true };
    const ids = Object.keys(nextReceipts);
    for (const id2 of ids.slice(0, -800)) if (nextReceipts[id2].delta) nextReceipts[id2] = { ...nextReceipts[id2], delta: void 0 };
    const world = { ...withHouse(charged, c.lot, next), receipts: nextReceipts };
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
  let next = { ...w, economy: { ...w.economy, clock, day, market, marketHistory } };
  next = collectRent(next);
  return { world: { ...next, economy: { ...next.economy, offers: sharedOffers(next, rng) } }, newDay: true };
}
function collectRent(w) {
  let out = w;
  for (const lot of w.economy.lots) {
    if (!lot.tenant || !lot.rentOffer || !lot.owner) continue;
    const paid = charge(out, lot.tenant, lot.rentOffer.rent, `\u5BB6\u8CC3\uFF08${lot.name}\uFF09`);
    if (typeof paid === "string") {
      out = { ...out, economy: { ...out.economy, lots: out.economy.lots.map((l) => l.id === lot.id ? { ...l, tenant: void 0, tenantName: void 0 } : l) } };
      continue;
    }
    const received = paid.accounts?.[lot.owner] ? charge(paid, lot.owner, -lot.rentOffer.rent, `\u5BB6\u8CC3\u53CE\u5165\uFF08${lot.name}\u30FB${lot.tenantName ?? ""}\u3055\u3093\uFF09`) : paid;
    out = typeof received === "string" ? paid : received;
  }
  return out;
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
  const accounts = () => shared.members.forEach((m) => send(m.socket, { type: "account", account: shared.world.accounts?.[m.id] ?? null }));
  const clockOf = (w) => ({ day: w.economy.day, clock: w.economy.clock, market: w.economy.market, marketHistory: w.economy.marketHistory });
  const enqueue = (job) => shared.queue = shared.queue.then(job, job);
  const ticker = setInterval(() => {
    if (!shared.world) return;
    const t = tickWorld(shared.world, tickMs / 1e3, Math.random);
    shared.world = t.world;
    if (t.newDay) {
      enqueue(() => saveWorld(worldFile, shared.world).catch((e) => console.error("save failed", e)));
      sharedSend({ type: "world", world: publicWorld(shared.world) });
      accounts();
    }
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
          const id2 = data.id, name = data.name;
          if (typeof id2 !== "string" || id2.length > 100 || typeof name !== "string" || !name.length || name.length > 24) throw Error("\u53C2\u52A0\u8005\u60C5\u5831\u304C\u4E0D\u6B63\u3067\u3059");
          if (data.type !== "resume" && identities.has(id2)) throw Error("\u3053\u306E\u30B2\u30B9\u30C8\u306F\u3059\u3067\u306B\u5225\u306E\u30BF\u30D6\u3067\u53C2\u52A0\u3057\u3066\u3044\u307E\u3059");
          if (data.type === "shared") {
            if (!shared.world) throw Error("\u30EF\u30FC\u30EB\u30C9\u3092\u6E96\u5099\u3057\u3066\u3044\u307E\u3059\u3002\u5C11\u3057\u5F85\u3063\u3066\u304B\u3089\u3084\u308A\u76F4\u3057\u3066\u304F\u3060\u3055\u3044");
            const prev = shared.members.get(id2);
            if (prev?.socket) throw Error("\u3053\u306E\u30B2\u30B9\u30C8\u306F\u3059\u3067\u306B\u5225\u306E\u30BF\u30D6\u3067\u53C2\u52A0\u3057\u3066\u3044\u307E\u3059");
            if (!prev && [...shared.members.values()].filter((m) => m.socket).length >= SHARED_LIMIT) throw Error(`\u307F\u3093\u306A\u306E\u30EF\u30FC\u30EB\u30C9\u306F${SHARED_LIMIT}\u4EBA\u307E\u3067\u3067\u3059`);
            member = prev ?? { id: id2, shared: true };
            member.name = name;
            member.socket = socket;
            shared.members.set(id2, member);
            clearTimeout(handshake);
            const joined = withAccount(shared.world, id2, name);
            if (joined !== shared.world) {
              shared.world = joined;
              enqueue(() => saveWorld(worldFile, shared.world).catch((e) => console.error("save failed", e)));
            }
            send(socket, { type: "welcome", code: "SHARED", token: randomUUID(), host: "", canBuild: true, shared: true });
            send(socket, { type: "world", world: publicWorld(shared.world) });
            send(socket, { type: "account", account: shared.world.accounts[id2] });
            sharedRoster();
            return;
          }
          if (data.type === "create") {
            if (rooms.size >= 100) throw Error("\u90E8\u5C4B\u304C\u6E80\u54E1\u3067\u3059");
            do {
              code = randomBytes(4).toString("hex").toUpperCase();
            } while (rooms.has(code));
            room = { host: id2, members: /* @__PURE__ */ new Map(), world: null, timer: null };
            rooms.set(code, room);
          } else {
            code = String(data.code).toUpperCase();
            room = rooms.get(code);
            if (!room) throw Error("\u90E8\u5C4B\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093");
          }
          const previous = room.members.get(id2);
          if (data.type === "resume") {
            if (!previous || previous.token !== data.token || previous.socket) throw Error("\u518D\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093");
            member = previous;
          } else {
            if (!["create", "join"].includes(data.type)) throw Error("\u53C2\u52A0\u65B9\u6CD5\u304C\u4E0D\u6B63\u3067\u3059");
            if (previous) throw Error("\u3053\u306E\u30B2\u30B9\u30C8\u306F\u3059\u3067\u306B\u53C2\u52A0\u3057\u3066\u3044\u307E\u3059");
            if (room.members.size >= 4) throw Error("\u53C2\u52A0\u3067\u304D\u308B\u306E\u306F4\u4EBA\u307E\u3067\u3067\u3059");
            if (data.type === "join" && !room.members.get(room.host)?.socket) throw Error("\u30DB\u30B9\u30C8\u306E\u518D\u63A5\u7D9A\u3092\u5F85\u3063\u3066\u3044\u307E\u3059");
            member = { id: id2, name, token: randomUUID(), socket: null, canBuild: id2 === room.host };
            room.members.set(id2, member);
            identities.set(id2, code);
          }
          clearTimeout(handshake);
          member.socket = socket;
          if (id2 === room.host) {
            clearTimeout(room.timer);
            room.timer = null;
          }
          send(socket, { type: "welcome", code, token: member.token, host: room.host, canBuild: member.canBuild });
          if (room.world) send(socket, { type: "world", world: room.world });
          roster(room);
          if (id2 === room.host) broadcast(room, { type: "resumed" });
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
              const r = applyCommand(shared.world, who.id, command, who.name);
              if (r.changed) {
                await saveWorld(worldFile, r.world);
                shared.world = { ...r.world, economy: { ...r.world.economy, ...clockOf(shared.world) } };
              }
              send(who.socket, { type: "result", result: r.result });
              if (r.changed) {
                if (!["money", "cars", "stocks"].includes(command?.action?.type)) sharedSend({ type: "world", world: publicWorld(shared.world) });
                accounts();
              }
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
/*! Bundled license information:

react/cjs/react.production.min.js:
  (**
   * @license React
   * react.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react.development.js:
  (**
   * @license React
   * react.development.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

use-sync-external-store/cjs/use-sync-external-store-shim.production.js:
  (**
   * @license React
   * use-sync-external-store-shim.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

use-sync-external-store/cjs/use-sync-external-store-shim.development.js:
  (**
   * @license React
   * use-sync-external-store-shim.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

use-sync-external-store/cjs/use-sync-external-store-shim/with-selector.production.js:
  (**
   * @license React
   * use-sync-external-store-shim/with-selector.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

use-sync-external-store/cjs/use-sync-external-store-shim/with-selector.development.js:
  (**
   * @license React
   * use-sync-external-store-shim/with-selector.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
