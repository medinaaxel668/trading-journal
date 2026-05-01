/* ========================================================================== 
 *                           dexie-cloud-addon.js
 * ==========================================================================
 *
 * Dexie addon that syncs IndexedDB with Dexie Cloud.
 *
 * By David Fahlander, david@dexie.org
 *
 * ==========================================================================
 *
 * Version 4.3.9, Thu Jan 29 2026
 *
 * https://dexie.org
 *
 * Apache License Version 2.0, January 2004, http://www.apache.org/licenses/
 * 
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('dexie'), require('rxjs'), require('rxjs/operators')) :
    typeof define === 'function' && define.amd ? define(['exports', 'dexie', 'rxjs', 'rxjs/operators'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.DexieCloud = {}, global.Dexie, global.rxjs, global.rxjs.operators));
})(this, (function (exports, Dexie, rxjs, operators) { 'use strict';

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise, SuppressedError, Symbol, Iterator */


    function __rest(s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    }

    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    function __values(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m) return m.call(o);
        if (o && typeof o.length === "number") return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    }

    function __await(v) {
        return this instanceof __await ? (this.v = v, this) : new __await(v);
    }

    function __asyncGenerator(thisArg, _arguments, generator) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var g = generator.apply(thisArg, _arguments || []), i, q = [];
        return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
        function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
        function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
        function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
        function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
        function fulfill(value) { resume("next", value); }
        function reject(value) { resume("throw", value); }
        function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
    }

    function __asyncValues(o) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator], i;
        return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
        function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
        function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
    }

    typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
        var e = new Error(message);
        return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
    };

    function assert(b) {
        if (!b)
            throw new Error('Assertion Failed');
    }
    const _hasOwn = {}.hasOwnProperty;
    function hasOwn(obj, prop) {
        return _hasOwn.call(obj, prop);
    }
    function setByKeyPath(obj, keyPath, value) {
        if (!obj || keyPath === undefined)
            return;
        if ('isFrozen' in Object && Object.isFrozen(obj))
            return;
        if (typeof keyPath !== 'string' && 'length' in keyPath) {
            assert(typeof value !== 'string' && 'length' in value);
            for (var i = 0, l = keyPath.length; i < l; ++i) {
                setByKeyPath(obj, keyPath[i], value[i]);
            }
        }
        else {
            var period = keyPath.indexOf('.');
            if (period !== -1) {
                var currentKeyPath = keyPath.substr(0, period);
                var remainingKeyPath = keyPath.substr(period + 1);
                if (remainingKeyPath === '')
                    if (value === undefined) {
                        if (Array.isArray(obj)) {
                            if (!isNaN(parseInt(currentKeyPath)))
                                obj.splice(parseInt(currentKeyPath), 1);
                        }
                        else
                            delete obj[currentKeyPath];
                        // @ts-ignore: even if currentKeyPath would be numeric string and obj would be array - it works.
                    }
                    else
                        obj[currentKeyPath] = value;
                else {
                    //@ts-ignore: even if currentKeyPath would be numeric string and obj would be array - it works.
                    var innerObj = obj[currentKeyPath];
                    //@ts-ignore: even if currentKeyPath would be numeric string and obj would be array - it works.
                    if (!innerObj || !hasOwn(obj, currentKeyPath))
                        innerObj = (obj[currentKeyPath] = {});
                    setByKeyPath(innerObj, remainingKeyPath, value);
                }
            }
            else {
                if (value === undefined) {
                    if (Array.isArray(obj) && !isNaN(parseInt(keyPath)))
                        // @ts-ignore: even if currentKeyPath would be numeric string and obj would be array - it works.
                        obj.splice(keyPath, 1);
                    //@ts-ignore: even if currentKeyPath would be numeric string and obj would be array - it works.
                    else
                        delete obj[keyPath];
                    //@ts-ignore: even if currentKeyPath would be numeric string and obj would be array - it works.
                }
                else
                    obj[keyPath] = value;
            }
        }
    }
    const randomString$1 = typeof self !== 'undefined' && typeof crypto !== 'undefined' ? (bytes, randomFill = crypto.getRandomValues.bind(crypto)) => {
        // Web
        const buf = new Uint8Array(bytes);
        randomFill(buf);
        return self.btoa(String.fromCharCode.apply(null, buf));
    } : typeof Buffer !== 'undefined' ? (bytes, randomFill = simpleRandomFill) => {
        // Node
        const buf = Buffer.alloc(bytes);
        randomFill(buf);
        return buf.toString("base64");
    } : () => { throw new Error("No implementation of randomString was found"); };
    function simpleRandomFill(buf) {
        for (let i = 0; i < buf.length; ++i) {
            buf[i] = Math.floor(Math.random() * 256);
        }
    }

    /** Verifies that given primary key is valid.
     * The reason we narrow validity for valid keys are twofold:
     *  1: Make sure to only support types that can be used as an object index in DBKeyMutationSet.
     *     For example, ArrayBuffer cannot be used (gives "object ArrayBuffer") but Uint8Array can be
     *     used (gives comma-delimited list of included bytes).
     *  2: Avoid using plain numbers and Dates as keys when they are synced, as they are not globally unique.
     *  3: Since we store the key as a VARCHAR server side in current version, try not promote types that stringifies to become very long server side.
     *
     * @param id
     * @returns
     */
    function isValidSyncableID(id) {
        if (typeof id === "string")
            return true;
        //if (validIDTypes[toStringTag(id)]) return true;
        //if (Array.isArray(id)) return id.every((part) => isValidSyncableID(part));
        if (Array.isArray(id) && id.some(key => isValidSyncableID(key)) && id.every(isValidSyncableIDPart))
            return true;
        return false;
    }
    /** Verifies that given key part is valid.
     *  1: Make sure that arrays of this types are stringified correclty and works with DBKeyMutationSet.
     *     For example, ArrayBuffer cannot be used (gives "object ArrayBuffer") but Uint8Array can be
     *     used (gives comma-delimited list of included bytes).
     *  2: Since we store the key as a VARCHAR server side in current version, try not promote types that stringifies to become very long server side.
    */
    function isValidSyncableIDPart(part) {
        return typeof part === "string" || typeof part === "number" || Array.isArray(part) && part.every(isValidSyncableIDPart);
    }
    function isValidAtID(id, idPrefix) {
        return !idPrefix || (typeof id === "string" && id.startsWith(idPrefix));
    }

    function applyOperation(target, table, op) {
        const tbl = target[table] || (target[table] = {});
        const keys = op.keys.map(key => typeof key === 'string' ? key : JSON.stringify(key));
        switch (op.type) {
            case "insert":
            // TODO: Don't treat insert and upsert the same?
            case "upsert":
                keys.forEach((key, idx) => {
                    tbl[key] = {
                        type: "ups",
                        val: op.values[idx],
                    };
                });
                break;
            case "update":
            case "modify": {
                keys.forEach((key, idx) => {
                    const changeSpec = op.type === "update"
                        ? op.changeSpecs[idx]
                        : op.changeSpec;
                    const entry = tbl[key];
                    if (!entry) {
                        tbl[key] = {
                            type: "upd",
                            mod: changeSpec,
                        };
                    }
                    else {
                        switch (entry.type) {
                            case "ups":
                                // Adjust the existing upsert with additional updates
                                for (const [propPath, value] of Object.entries(changeSpec)) {
                                    setByKeyPath(entry.val, propPath, value);
                                }
                                break;
                            case "del":
                                // No action.
                                break;
                            case "upd":
                                // Adjust existing update with additional updates
                                Object.assign(entry.mod, changeSpec); // May work for deep props as well - new keys is added later, right? Does the prop order persist along TSON and all? But it will not be 100% when combined with some server code (seach for "address.city": "Stockholm" comment)
                                break;
                        }
                    }
                });
                break;
            }
            case "delete":
                keys.forEach((key) => {
                    tbl[key] = {
                        type: "del",
                    };
                });
                break;
        }
        return target;
    }

    function applyOperations(target, ops) {
        for (const { table, muts } of ops) {
            for (const mut of muts) {
                applyOperation(target, table, mut);
            }
        }
    }

    function subtractChanges(target, // Server change set
    changesToSubtract // additional mutations on client during syncWithServer()
    ) {
        for (const [table, mutationSet] of Object.entries(changesToSubtract)) {
            for (const [key, mut] of Object.entries(mutationSet)) {
                switch (mut.type) {
                    case 'ups':
                        {
                            const targetMut = target[table]?.[key];
                            if (targetMut) {
                                switch (targetMut.type) {
                                    case 'ups':
                                        delete target[table][key];
                                        break;
                                    case 'del':
                                        // Leave delete operation.
                                        // (Don't resurrect objects unintenionally (using tx(get, put) pattern locally))
                                        break;
                                    case 'upd':
                                        delete target[table][key];
                                        break;
                                }
                            }
                        }
                        break;
                    case 'del':
                        delete target[table]?.[key];
                        break;
                    case 'upd': {
                        const targetMut = target[table]?.[key];
                        if (targetMut) {
                            switch (targetMut.type) {
                                case 'ups':
                                    // Adjust the server upsert with locally updated values.
                                    for (const [propPath, value] of Object.entries(mut.mod)) {
                                        setByKeyPath(targetMut.val, propPath, value);
                                    }
                                    break;
                                case 'del':
                                    // Leave delete.
                                    break;
                                case 'upd':
                                    // Remove the local update props from the server update mutation.
                                    for (const propPath of Object.keys(mut.mod)) {
                                        delete targetMut.mod[propPath];
                                    }
                                    break;
                            }
                        }
                        break;
                    }
                }
            }
        }
    }

    /** Convert a DBKeyMutationSet (which is an internal format capable of looking up changes per ID)
     * ...into a DBOperationsSet (which is more optimal for performing DB operations into DB (bulkAdd() etc))
     *
     * @param inSet
     * @returns DBOperationsSet representing inSet
     */
    function toDBOperationSet(inSet, txid) {
        // Convert data into a temporary map to collect mutations of same table and type
        const map = {};
        for (const [table, ops] of Object.entries(inSet)) {
            for (const [key, op] of Object.entries(ops)) {
                const mapEntry = map[table] || (map[table] = {});
                const ops = mapEntry[op.type] || (mapEntry[op.type] = []);
                ops.push({ key, ...op }); // DBKeyMutation doesn't contain key, so we need to bring it in.
            }
        }
        // Start computing the resulting format:
        const result = [];
        for (const [table, ops] of Object.entries(map)) {
            const resultEntry = {
                table,
                muts: [],
            };
            for (const [optype, muts] of Object.entries(ops)) {
                switch (optype) {
                    case "ups": {
                        const op = {
                            type: "upsert",
                            keys: muts.map(mut => mut.key),
                            values: muts.map(mut => mut.val),
                            txid
                        };
                        resultEntry.muts.push(op);
                        break;
                    }
                    case "upd": {
                        const op = {
                            type: "update",
                            keys: muts.map(mut => mut.key),
                            changeSpecs: muts.map(mut => mut.mod),
                            txid
                        };
                        resultEntry.muts.push(op);
                        break;
                    }
                    case "del": {
                        const op = {
                            type: "delete",
                            keys: muts.map(mut => mut.key),
                            txid,
                        };
                        resultEntry.muts.push(op);
                        break;
                    }
                }
            }
            result.push(resultEntry);
        }
        return result;
    }

    function getDbNameFromDbUrl(dbUrl) {
        const url = new URL(dbUrl);
        return url.pathname === "/"
            ? url.hostname.split('.')[0]
            : url.pathname.split('/')[1];
    }

    /**
     * Common Math expressions.
     *
     * @module math
     */

    const floor = Math.floor;
    const abs = Math.abs;

    /**
     * @function
     * @param {number} a
     * @param {number} b
     * @return {number} The smaller element of a and b
     */
    const min = (a, b) => a < b ? a : b;

    /**
     * @function
     * @param {number} a
     * @param {number} b
     * @return {number} The bigger element of a and b
     */
    const max = (a, b) => a > b ? a : b;

    /**
     * @param {number} n
     * @return {boolean} Wether n is negative. This function also differentiates between -0 and +0
     */
    const isNegativeZero = n => n !== 0 ? n < 0 : 1 / n < 0;

    /* eslint-env browser */

    /**
     * Binary data constants.
     *
     * @module binary
     */

    /**
     * n-th bit activated.
     *
     * @type {number}
     */
    const BIT1 = 1;
    const BIT2 = 2;
    const BIT3 = 4;
    const BIT4 = 8;
    const BIT6 = 32;
    const BIT7 = 64;
    const BIT8 = 128;
    const BITS5 = 31;
    const BITS6 = 63;
    const BITS7 = 127;
    /**
     * @type {number}
     */
    const BITS31 = 0x7FFFFFFF;

    /**
     * Utility helpers for working with numbers.
     *
     * @module number
     */


    const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

    /* c8 ignore next */
    const isInteger = Number.isInteger || (num => typeof num === 'number' && isFinite(num) && floor(num) === num);

    /**
     * Utility module to work with sets.
     *
     * @module set
     */

    const create$5 = () => new Set();

    /**
     * Utility module to work with Arrays.
     *
     * @module array
     */


    /**
     * Return the last element of an array. The element must exist
     *
     * @template L
     * @param {ArrayLike<L>} arr
     * @return {L}
     */
    const last = arr => arr[arr.length - 1];

    /**
     * Append elements from src to dest
     *
     * @template M
     * @param {Array<M>} dest
     * @param {Array<M>} src
     */
    const appendTo = (dest, src) => {
      for (let i = 0; i < src.length; i++) {
        dest.push(src[i]);
      }
    };

    /**
     * Transforms something array-like to an actual Array.
     *
     * @function
     * @template T
     * @param {ArrayLike<T>|Iterable<T>} arraylike
     * @return {T}
     */
    const from = Array.from;

    const isArray = Array.isArray;

    /**
     * @param {string} s
     * @return {string}
     */
    const toLowerCase = s => s.toLowerCase();

    const trimLeftRegex = /^\s*/g;

    /**
     * @param {string} s
     * @return {string}
     */
    const trimLeft = s => s.replace(trimLeftRegex, '');

    const fromCamelCaseRegex = /([A-Z])/g;

    /**
     * @param {string} s
     * @param {string} separator
     * @return {string}
     */
    const fromCamelCase = (s, separator) => trimLeft(s.replace(fromCamelCaseRegex, match => `${separator}${toLowerCase(match)}`));

    /**
     * @param {string} str
     * @return {Uint8Array}
     */
    const _encodeUtf8Polyfill = str => {
      const encodedString = unescape(encodeURIComponent(str));
      const len = encodedString.length;
      const buf = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        buf[i] = /** @type {number} */ (encodedString.codePointAt(i));
      }
      return buf
    };

    /* c8 ignore next */
    const utf8TextEncoder = /** @type {TextEncoder} */ (typeof TextEncoder !== 'undefined' ? new TextEncoder() : null);

    /**
     * @param {string} str
     * @return {Uint8Array}
     */
    const _encodeUtf8Native = str => utf8TextEncoder.encode(str);

    /**
     * @param {string} str
     * @return {Uint8Array}
     */
    /* c8 ignore next */
    const encodeUtf8 = utf8TextEncoder ? _encodeUtf8Native : _encodeUtf8Polyfill;

    /* c8 ignore next */
    let utf8TextDecoder = typeof TextDecoder === 'undefined' ? null : new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

    /* c8 ignore start */
    if (utf8TextDecoder && utf8TextDecoder.decode(new Uint8Array()).length === 1) {
      // Safari doesn't handle BOM correctly.
      // This fixes a bug in Safari 13.0.5 where it produces a BOM the first time it is called.
      // utf8TextDecoder.decode(new Uint8Array()).length === 1 on the first call and
      // utf8TextDecoder.decode(new Uint8Array()).length === 1 on the second call
      // Another issue is that from then on no BOM chars are recognized anymore
      /* c8 ignore next */
      utf8TextDecoder = null;
    }

    /**
     * Efficient schema-less binary encoding with support for variable length encoding.
     *
     * Use [lib0/encoding] with [lib0/decoding]. Every encoding function has a corresponding decoding function.
     *
     * Encodes numbers in little-endian order (least to most significant byte order)
     * and is compatible with Golang's binary encoding (https://golang.org/pkg/encoding/binary/)
     * which is also used in Protocol Buffers.
     *
     * ```js
     * // encoding step
     * const encoder = encoding.createEncoder()
     * encoding.writeVarUint(encoder, 256)
     * encoding.writeVarString(encoder, 'Hello world!')
     * const buf = encoding.toUint8Array(encoder)
     * ```
     *
     * ```js
     * // decoding step
     * const decoder = decoding.createDecoder(buf)
     * decoding.readVarUint(decoder) // => 256
     * decoding.readVarString(decoder) // => 'Hello world!'
     * decoding.hasContent(decoder) // => false - all data is read
     * ```
     *
     * @module encoding
     */


    /**
     * A BinaryEncoder handles the encoding to an Uint8Array.
     */
    class Encoder {
      constructor () {
        this.cpos = 0;
        this.cbuf = new Uint8Array(100);
        /**
         * @type {Array<Uint8Array>}
         */
        this.bufs = [];
      }
    }

    /**
     * @function
     * @return {Encoder}
     */
    const createEncoder = () => new Encoder();

    /**
     * The current length of the encoded data.
     *
     * @function
     * @param {Encoder} encoder
     * @return {number}
     */
    const length$1 = encoder => {
      let len = encoder.cpos;
      for (let i = 0; i < encoder.bufs.length; i++) {
        len += encoder.bufs[i].length;
      }
      return len
    };

    /**
     * Transform to Uint8Array.
     *
     * @function
     * @param {Encoder} encoder
     * @return {Uint8Array} The created ArrayBuffer.
     */
    const toUint8Array = encoder => {
      const uint8arr = new Uint8Array(length$1(encoder));
      let curPos = 0;
      for (let i = 0; i < encoder.bufs.length; i++) {
        const d = encoder.bufs[i];
        uint8arr.set(d, curPos);
        curPos += d.length;
      }
      uint8arr.set(new Uint8Array(encoder.cbuf.buffer, 0, encoder.cpos), curPos);
      return uint8arr
    };

    /**
     * Verify that it is possible to write `len` bytes wtihout checking. If
     * necessary, a new Buffer with the required length is attached.
     *
     * @param {Encoder} encoder
     * @param {number} len
     */
    const verifyLen = (encoder, len) => {
      const bufferLen = encoder.cbuf.length;
      if (bufferLen - encoder.cpos < len) {
        encoder.bufs.push(new Uint8Array(encoder.cbuf.buffer, 0, encoder.cpos));
        encoder.cbuf = new Uint8Array(max(bufferLen, len) * 2);
        encoder.cpos = 0;
      }
    };

    /**
     * Write one byte to the encoder.
     *
     * @function
     * @param {Encoder} encoder
     * @param {number} num The byte that is to be encoded.
     */
    const write = (encoder, num) => {
      const bufferLen = encoder.cbuf.length;
      if (encoder.cpos === bufferLen) {
        encoder.bufs.push(encoder.cbuf);
        encoder.cbuf = new Uint8Array(bufferLen * 2);
        encoder.cpos = 0;
      }
      encoder.cbuf[encoder.cpos++] = num;
    };

    /**
     * Write one byte as an unsigned integer.
     *
     * @function
     * @param {Encoder} encoder
     * @param {number} num The number that is to be encoded.
     */
    const writeUint8 = write;

    /**
     * Write a variable length unsigned integer. Max encodable integer is 2^53.
     *
     * @function
     * @param {Encoder} encoder
     * @param {number} num The number that is to be encoded.
     */
    const writeVarUint = (encoder, num) => {
      while (num > BITS7) {
        write(encoder, BIT8 | (BITS7 & num));
        num = floor(num / 128); // shift >>> 7
      }
      write(encoder, BITS7 & num);
    };

    /**
     * Write a variable length integer.
     *
     * We use the 7th bit instead for signaling that this is a negative number.
     *
     * @function
     * @param {Encoder} encoder
     * @param {number} num The number that is to be encoded.
     */
    const writeVarInt = (encoder, num) => {
      const isNegative = isNegativeZero(num);
      if (isNegative) {
        num = -num;
      }
      //             |- whether to continue reading         |- whether is negative     |- number
      write(encoder, (num > BITS6 ? BIT8 : 0) | (isNegative ? BIT7 : 0) | (BITS6 & num));
      num = floor(num / 64); // shift >>> 6
      // We don't need to consider the case of num === 0 so we can use a different
      // pattern here than above.
      while (num > 0) {
        write(encoder, (num > BITS7 ? BIT8 : 0) | (BITS7 & num));
        num = floor(num / 128); // shift >>> 7
      }
    };

    /**
     * A cache to store strings temporarily
     */
    const _strBuffer = new Uint8Array(30000);
    const _maxStrBSize = _strBuffer.length / 3;

    /**
     * Write a variable length string.
     *
     * @function
     * @param {Encoder} encoder
     * @param {String} str The string that is to be encoded.
     */
    const _writeVarStringNative = (encoder, str) => {
      if (str.length < _maxStrBSize) {
        // We can encode the string into the existing buffer
        /* c8 ignore next */
        const written = utf8TextEncoder.encodeInto(str, _strBuffer).written || 0;
        writeVarUint(encoder, written);
        for (let i = 0; i < written; i++) {
          write(encoder, _strBuffer[i]);
        }
      } else {
        writeVarUint8Array(encoder, encodeUtf8(str));
      }
    };

    /**
     * Write a variable length string.
     *
     * @function
     * @param {Encoder} encoder
     * @param {String} str The string that is to be encoded.
     */
    const _writeVarStringPolyfill = (encoder, str) => {
      const encodedString = unescape(encodeURIComponent(str));
      const len = encodedString.length;
      writeVarUint(encoder, len);
      for (let i = 0; i < len; i++) {
        write(encoder, /** @type {number} */ (encodedString.codePointAt(i)));
      }
    };

    /**
     * Write a variable length string.
     *
     * @function
     * @param {Encoder} encoder
     * @param {String} str The string that is to be encoded.
     */
    /* c8 ignore next */
    const writeVarString = (utf8TextEncoder && /** @type {any} */ (utf8TextEncoder).encodeInto) ? _writeVarStringNative : _writeVarStringPolyfill;

    /**
     * Write the content of another Encoder.
     *
     * @TODO: can be improved!
     *        - Note: Should consider that when appending a lot of small Encoders, we should rather clone than referencing the old structure.
     *                Encoders start with a rather big initial buffer.
     *
     * @function
     * @param {Encoder} encoder The enUint8Arr
     * @param {Encoder} append The BinaryEncoder to be written.
     */
    const writeBinaryEncoder = (encoder, append) => writeUint8Array(encoder, toUint8Array(append));

    /**
     * Append fixed-length Uint8Array to the encoder.
     *
     * @function
     * @param {Encoder} encoder
     * @param {Uint8Array} uint8Array
     */
    const writeUint8Array = (encoder, uint8Array) => {
      const bufferLen = encoder.cbuf.length;
      const cpos = encoder.cpos;
      const leftCopyLen = min(bufferLen - cpos, uint8Array.length);
      const rightCopyLen = uint8Array.length - leftCopyLen;
      encoder.cbuf.set(uint8Array.subarray(0, leftCopyLen), cpos);
      encoder.cpos += leftCopyLen;
      if (rightCopyLen > 0) {
        // Still something to write, write right half..
        // Append new buffer
        encoder.bufs.push(encoder.cbuf);
        // must have at least size of remaining buffer
        encoder.cbuf = new Uint8Array(max(bufferLen * 2, rightCopyLen));
        // copy array
        encoder.cbuf.set(uint8Array.subarray(leftCopyLen));
        encoder.cpos = rightCopyLen;
      }
    };

    /**
     * Append an Uint8Array to Encoder.
     *
     * @function
     * @param {Encoder} encoder
     * @param {Uint8Array} uint8Array
     */
    const writeVarUint8Array = (encoder, uint8Array) => {
      writeVarUint(encoder, uint8Array.byteLength);
      writeUint8Array(encoder, uint8Array);
    };

    /**
     * Create an DataView of the next `len` bytes. Use it to write data after
     * calling this function.
     *
     * ```js
     * // write float32 using DataView
     * const dv = writeOnDataView(encoder, 4)
     * dv.setFloat32(0, 1.1)
     * // read float32 using DataView
     * const dv = readFromDataView(encoder, 4)
     * dv.getFloat32(0) // => 1.100000023841858 (leaving it to the reader to find out why this is the correct result)
     * ```
     *
     * @param {Encoder} encoder
     * @param {number} len
     * @return {DataView}
     */
    const writeOnDataView = (encoder, len) => {
      verifyLen(encoder, len);
      const dview = new DataView(encoder.cbuf.buffer, encoder.cpos, len);
      encoder.cpos += len;
      return dview
    };

    /**
     * @param {Encoder} encoder
     * @param {number} num
     */
    const writeFloat32 = (encoder, num) => writeOnDataView(encoder, 4).setFloat32(0, num, false);

    /**
     * @param {Encoder} encoder
     * @param {number} num
     */
    const writeFloat64 = (encoder, num) => writeOnDataView(encoder, 8).setFloat64(0, num, false);

    /**
     * @param {Encoder} encoder
     * @param {bigint} num
     */
    const writeBigInt64 = (encoder, num) => /** @type {any} */ (writeOnDataView(encoder, 8)).setBigInt64(0, num, false);

    /**
     * @param {Encoder} encoder
     * @param {bigint} num
     */
    const writeBigUint64 = (encoder, num) => /** @type {any} */ (writeOnDataView(encoder, 8)).setBigUint64(0, num, false);

    const floatTestBed = new DataView(new ArrayBuffer(4));
    /**
     * Check if a number can be encoded as a 32 bit float.
     *
     * @param {number} num
     * @return {boolean}
     */
    const isFloat32 = num => {
      floatTestBed.setFloat32(0, num);
      return floatTestBed.getFloat32(0) === num
    };

    /**
     * Encode data with efficient binary format.
     *
     * Differences to JSON:
     * • Transforms data to a binary format (not to a string)
     * • Encodes undefined, NaN, and ArrayBuffer (these can't be represented in JSON)
     * • Numbers are efficiently encoded either as a variable length integer, as a
     *   32 bit float, as a 64 bit float, or as a 64 bit bigint.
     *
     * Encoding table:
     *
     * | Data Type           | Prefix   | Encoding Method    | Comment |
     * | ------------------- | -------- | ------------------ | ------- |
     * | undefined           | 127      |                    | Functions, symbol, and everything that cannot be identified is encoded as undefined |
     * | null                | 126      |                    | |
     * | integer             | 125      | writeVarInt        | Only encodes 32 bit signed integers |
     * | float32             | 124      | writeFloat32       | |
     * | float64             | 123      | writeFloat64       | |
     * | bigint              | 122      | writeBigInt64      | |
     * | boolean (false)     | 121      |                    | True and false are different data types so we save the following byte |
     * | boolean (true)      | 120      |                    | - 0b01111000 so the last bit determines whether true or false |
     * | string              | 119      | writeVarString     | |
     * | object<string,any>  | 118      | custom             | Writes {length} then {length} key-value pairs |
     * | array<any>          | 117      | custom             | Writes {length} then {length} json values |
     * | Uint8Array          | 116      | writeVarUint8Array | We use Uint8Array for any kind of binary data |
     *
     * Reasons for the decreasing prefix:
     * We need the first bit for extendability (later we may want to encode the
     * prefix with writeVarUint). The remaining 7 bits are divided as follows:
     * [0-30]   the beginning of the data range is used for custom purposes
     *          (defined by the function that uses this library)
     * [31-127] the end of the data range is used for data encoding by
     *          lib0/encoding.js
     *
     * @param {Encoder} encoder
     * @param {undefined|null|number|bigint|boolean|string|Object<string,any>|Array<any>|Uint8Array} data
     */
    const writeAny = (encoder, data) => {
      switch (typeof data) {
        case 'string':
          // TYPE 119: STRING
          write(encoder, 119);
          writeVarString(encoder, data);
          break
        case 'number':
          if (isInteger(data) && abs(data) <= BITS31) {
            // TYPE 125: INTEGER
            write(encoder, 125);
            writeVarInt(encoder, data);
          } else if (isFloat32(data)) {
            // TYPE 124: FLOAT32
            write(encoder, 124);
            writeFloat32(encoder, data);
          } else {
            // TYPE 123: FLOAT64
            write(encoder, 123);
            writeFloat64(encoder, data);
          }
          break
        case 'bigint':
          // TYPE 122: BigInt
          write(encoder, 122);
          writeBigInt64(encoder, data);
          break
        case 'object':
          if (data === null) {
            // TYPE 126: null
            write(encoder, 126);
          } else if (isArray(data)) {
            // TYPE 117: Array
            write(encoder, 117);
            writeVarUint(encoder, data.length);
            for (let i = 0; i < data.length; i++) {
              writeAny(encoder, data[i]);
            }
          } else if (data instanceof Uint8Array) {
            // TYPE 116: ArrayBuffer
            write(encoder, 116);
            writeVarUint8Array(encoder, data);
          } else {
            // TYPE 118: Object
            write(encoder, 118);
            const keys = Object.keys(data);
            writeVarUint(encoder, keys.length);
            for (let i = 0; i < keys.length; i++) {
              const key = keys[i];
              writeVarString(encoder, key);
              writeAny(encoder, data[key]);
            }
          }
          break
        case 'boolean':
          // TYPE 120/121: boolean (true/false)
          write(encoder, data ? 120 : 121);
          break
        default:
          // TYPE 127: undefined
          write(encoder, 127);
      }
    };

    /**
     * Now come a few stateful encoder that have their own classes.
     */

    /**
     * Basic Run Length Encoder - a basic compression implementation.
     *
     * Encodes [1,1,1,7] to [1,3,7,1] (3 times 1, 1 time 7). This encoder might do more harm than good if there are a lot of values that are not repeated.
     *
     * It was originally used for image compression. Cool .. article http://csbruce.com/cbm/transactor/pdfs/trans_v7_i06.pdf
     *
     * @note T must not be null!
     *
     * @template T
     */
    class RleEncoder extends Encoder {
      /**
       * @param {function(Encoder, T):void} writer
       */
      constructor (writer) {
        super();
        /**
         * The writer
         */
        this.w = writer;
        /**
         * Current state
         * @type {T|null}
         */
        this.s = null;
        this.count = 0;
      }

      /**
       * @param {T} v
       */
      write (v) {
        if (this.s === v) {
          this.count++;
        } else {
          if (this.count > 0) {
            // flush counter, unless this is the first value (count = 0)
            writeVarUint(this, this.count - 1); // since count is always > 0, we can decrement by one. non-standard encoding ftw
          }
          this.count = 1;
          // write first value
          this.w(this, v);
          this.s = v;
        }
      }
    }

    /**
     * @param {UintOptRleEncoder} encoder
     */
    const flushUintOptRleEncoder = encoder => {
      if (encoder.count > 0) {
        // flush counter, unless this is the first value (count = 0)
        // case 1: just a single value. set sign to positive
        // case 2: write several values. set sign to negative to indicate that there is a length coming
        writeVarInt(encoder.encoder, encoder.count === 1 ? encoder.s : -encoder.s);
        if (encoder.count > 1) {
          writeVarUint(encoder.encoder, encoder.count - 2); // since count is always > 1, we can decrement by one. non-standard encoding ftw
        }
      }
    };

    /**
     * Optimized Rle encoder that does not suffer from the mentioned problem of the basic Rle encoder.
     *
     * Internally uses VarInt encoder to write unsigned integers. If the input occurs multiple times, we write
     * write it as a negative number. The UintOptRleDecoder then understands that it needs to read a count.
     *
     * Encodes [1,2,3,3,3] as [1,2,-3,3] (once 1, once 2, three times 3)
     */
    class UintOptRleEncoder {
      constructor () {
        this.encoder = new Encoder();
        /**
         * @type {number}
         */
        this.s = 0;
        this.count = 0;
      }

      /**
       * @param {number} v
       */
      write (v) {
        if (this.s === v) {
          this.count++;
        } else {
          flushUintOptRleEncoder(this);
          this.count = 1;
          this.s = v;
        }
      }

      /**
       * Flush the encoded state and transform this to a Uint8Array.
       *
       * Note that this should only be called once.
       */
      toUint8Array () {
        flushUintOptRleEncoder(this);
        return toUint8Array(this.encoder)
      }
    }

    /**
     * @param {IntDiffOptRleEncoder} encoder
     */
    const flushIntDiffOptRleEncoder = encoder => {
      if (encoder.count > 0) {
        //          31 bit making up the diff | wether to write the counter
        // const encodedDiff = encoder.diff << 1 | (encoder.count === 1 ? 0 : 1)
        const encodedDiff = encoder.diff * 2 + (encoder.count === 1 ? 0 : 1);
        // flush counter, unless this is the first value (count = 0)
        // case 1: just a single value. set first bit to positive
        // case 2: write several values. set first bit to negative to indicate that there is a length coming
        writeVarInt(encoder.encoder, encodedDiff);
        if (encoder.count > 1) {
          writeVarUint(encoder.encoder, encoder.count - 2); // since count is always > 1, we can decrement by one. non-standard encoding ftw
        }
      }
    };

    /**
     * A combination of the IntDiffEncoder and the UintOptRleEncoder.
     *
     * The count approach is similar to the UintDiffOptRleEncoder, but instead of using the negative bitflag, it encodes
     * in the LSB whether a count is to be read. Therefore this Encoder only supports 31 bit integers!
     *
     * Encodes [1, 2, 3, 2] as [3, 1, 6, -1] (more specifically [(1 << 1) | 1, (3 << 0) | 0, -1])
     *
     * Internally uses variable length encoding. Contrary to normal UintVar encoding, the first byte contains:
     * * 1 bit that denotes whether the next value is a count (LSB)
     * * 1 bit that denotes whether this value is negative (MSB - 1)
     * * 1 bit that denotes whether to continue reading the variable length integer (MSB)
     *
     * Therefore, only five bits remain to encode diff ranges.
     *
     * Use this Encoder only when appropriate. In most cases, this is probably a bad idea.
     */
    class IntDiffOptRleEncoder {
      constructor () {
        this.encoder = new Encoder();
        /**
         * @type {number}
         */
        this.s = 0;
        this.count = 0;
        this.diff = 0;
      }

      /**
       * @param {number} v
       */
      write (v) {
        if (this.diff === v - this.s) {
          this.s = v;
          this.count++;
        } else {
          flushIntDiffOptRleEncoder(this);
          this.count = 1;
          this.diff = v - this.s;
          this.s = v;
        }
      }

      /**
       * Flush the encoded state and transform this to a Uint8Array.
       *
       * Note that this should only be called once.
       */
      toUint8Array () {
        flushIntDiffOptRleEncoder(this);
        return toUint8Array(this.encoder)
      }
    }

    /**
     * Optimized String Encoder.
     *
     * Encoding many small strings in a simple Encoder is not very efficient. The function call to decode a string takes some time and creates references that must be eventually deleted.
     * In practice, when decoding several million small strings, the GC will kick in more and more often to collect orphaned string objects (or maybe there is another reason?).
     *
     * This string encoder solves the above problem. All strings are concatenated and written as a single string using a single encoding call.
     *
     * The lengths are encoded using a UintOptRleEncoder.
     */
    class StringEncoder {
      constructor () {
        /**
         * @type {Array<string>}
         */
        this.sarr = [];
        this.s = '';
        this.lensE = new UintOptRleEncoder();
      }

      /**
       * @param {string} string
       */
      write (string) {
        this.s += string;
        if (this.s.length > 19) {
          this.sarr.push(this.s);
          this.s = '';
        }
        this.lensE.write(string.length);
      }

      toUint8Array () {
        const encoder = new Encoder();
        this.sarr.push(this.s);
        this.s = '';
        writeVarString(encoder, this.sarr.join(''));
        writeUint8Array(encoder, this.lensE.toUint8Array());
        return toUint8Array(encoder)
      }
    }

    function encodeYMessage(msg) {
        const encoder = new Encoder();
        writeVarString(encoder, msg.type);
        if ('table' in msg)
            writeVarString(encoder, msg.table);
        if ('prop' in msg)
            writeVarString(encoder, msg.prop);
        switch (msg.type) {
            case 'u-ack':
            case 'u-reject':
                writeBigUint64(encoder, BigInt(msg.i));
                break;
            case 'outdated-server-rev':
                break;
            case 'y-complete-sync-done':
                writeVarString(encoder, msg.yServerRev);
                break;
            default:
                writeAny(encoder, msg.k);
                switch (msg.type) {
                    case 'aware':
                        writeVarUint8Array(encoder, msg.u);
                        break;
                    case 'doc-open':
                        writeAny(encoder, msg.serverRev);
                        writeAny(encoder, msg.sv);
                        break;
                    case 'doc-close':
                        break;
                    case 'sv':
                        writeVarUint8Array(encoder, msg.sv);
                        break;
                    case 'u-c':
                        writeVarUint8Array(encoder, msg.u);
                        writeBigUint64(encoder, BigInt(msg.i));
                        break;
                    case 'u-s':
                        writeVarUint8Array(encoder, msg.u);
                        writeVarString(encoder, msg.r || '');
                        break;
                }
        }
        return toUint8Array(encoder);
    }

    /**
     * Error helpers.
     *
     * @module error
     */

    /**
     * @param {string} s
     * @return {Error}
     */
    /* c8 ignore next */
    const create$4 = s => new Error(s);

    /**
     * @throws {Error}
     * @return {never}
     */
    /* c8 ignore next 3 */
    const methodUnimplemented = () => {
      throw create$4('Method unimplemented')
    };

    /**
     * @throws {Error}
     * @return {never}
     */
    /* c8 ignore next 3 */
    const unexpectedCase = () => {
      throw create$4('Unexpected case')
    };

    /**
     * Efficient schema-less binary decoding with support for variable length encoding.
     *
     * Use [lib0/decoding] with [lib0/encoding]. Every encoding function has a corresponding decoding function.
     *
     * Encodes numbers in little-endian order (least to most significant byte order)
     * and is compatible with Golang's binary encoding (https://golang.org/pkg/encoding/binary/)
     * which is also used in Protocol Buffers.
     *
     * ```js
     * // encoding step
     * const encoder = encoding.createEncoder()
     * encoding.writeVarUint(encoder, 256)
     * encoding.writeVarString(encoder, 'Hello world!')
     * const buf = encoding.toUint8Array(encoder)
     * ```
     *
     * ```js
     * // decoding step
     * const decoder = decoding.createDecoder(buf)
     * decoding.readVarUint(decoder) // => 256
     * decoding.readVarString(decoder) // => 'Hello world!'
     * decoding.hasContent(decoder) // => false - all data is read
     * ```
     *
     * @module decoding
     */


    const errorUnexpectedEndOfArray = create$4('Unexpected end of array');
    const errorIntegerOutOfRange = create$4('Integer out of Range');

    /**
     * A Decoder handles the decoding of an Uint8Array.
     */
    class Decoder {
      /**
       * @param {Uint8Array} uint8Array Binary data to decode
       */
      constructor (uint8Array) {
        /**
         * Decoding target.
         *
         * @type {Uint8Array}
         */
        this.arr = uint8Array;
        /**
         * Current decoding position.
         *
         * @type {number}
         */
        this.pos = 0;
      }
    }

    /**
     * @function
     * @param {Uint8Array} uint8Array
     * @return {Decoder}
     */
    const createDecoder = uint8Array => new Decoder(uint8Array);

    /**
     * @function
     * @param {Decoder} decoder
     * @return {boolean}
     */
    const hasContent = decoder => decoder.pos !== decoder.arr.length;

    /**
     * Create an Uint8Array view of the next `len` bytes and advance the position by `len`.
     *
     * Important: The Uint8Array still points to the underlying ArrayBuffer. Make sure to discard the result as soon as possible to prevent any memory leaks.
     *            Use `buffer.copyUint8Array` to copy the result into a new Uint8Array.
     *
     * @function
     * @param {Decoder} decoder The decoder instance
     * @param {number} len The length of bytes to read
     * @return {Uint8Array}
     */
    const readUint8Array = (decoder, len) => {
      const view = new Uint8Array(decoder.arr.buffer, decoder.pos + decoder.arr.byteOffset, len);
      decoder.pos += len;
      return view
    };

    /**
     * Read variable length Uint8Array.
     *
     * Important: The Uint8Array still points to the underlying ArrayBuffer. Make sure to discard the result as soon as possible to prevent any memory leaks.
     *            Use `buffer.copyUint8Array` to copy the result into a new Uint8Array.
     *
     * @function
     * @param {Decoder} decoder
     * @return {Uint8Array}
     */
    const readVarUint8Array = decoder => readUint8Array(decoder, readVarUint(decoder));

    /**
     * Read one byte as unsigned integer.
     * @function
     * @param {Decoder} decoder The decoder instance
     * @return {number} Unsigned 8-bit integer
     */
    const readUint8 = decoder => decoder.arr[decoder.pos++];

    /**
     * Read unsigned integer (32bit) with variable length.
     * 1/8th of the storage is used as encoding overhead.
     *  * numbers < 2^7 is stored in one bytlength
     *  * numbers < 2^14 is stored in two bylength
     *
     * @function
     * @param {Decoder} decoder
     * @return {number} An unsigned integer.length
     */
    const readVarUint = decoder => {
      let num = 0;
      let mult = 1;
      const len = decoder.arr.length;
      while (decoder.pos < len) {
        const r = decoder.arr[decoder.pos++];
        // num = num | ((r & binary.BITS7) << len)
        num = num + (r & BITS7) * mult; // shift $r << (7*#iterations) and add it to num
        mult *= 128; // next iteration, shift 7 "more" to the left
        if (r < BIT8) {
          return num
        }
        /* c8 ignore start */
        if (num > MAX_SAFE_INTEGER) {
          throw errorIntegerOutOfRange
        }
        /* c8 ignore stop */
      }
      throw errorUnexpectedEndOfArray
    };

    /**
     * Read signed integer (32bit) with variable length.
     * 1/8th of the storage is used as encoding overhead.
     *  * numbers < 2^7 is stored in one bytlength
     *  * numbers < 2^14 is stored in two bylength
     * @todo This should probably create the inverse ~num if number is negative - but this would be a breaking change.
     *
     * @function
     * @param {Decoder} decoder
     * @return {number} An unsigned integer.length
     */
    const readVarInt = decoder => {
      let r = decoder.arr[decoder.pos++];
      let num = r & BITS6;
      let mult = 64;
      const sign = (r & BIT7) > 0 ? -1 : 1;
      if ((r & BIT8) === 0) {
        // don't continue reading
        return sign * num
      }
      const len = decoder.arr.length;
      while (decoder.pos < len) {
        r = decoder.arr[decoder.pos++];
        // num = num | ((r & binary.BITS7) << len)
        num = num + (r & BITS7) * mult;
        mult *= 128;
        if (r < BIT8) {
          return sign * num
        }
        /* c8 ignore start */
        if (num > MAX_SAFE_INTEGER) {
          throw errorIntegerOutOfRange
        }
        /* c8 ignore stop */
      }
      throw errorUnexpectedEndOfArray
    };

    /**
     * We don't test this function anymore as we use native decoding/encoding by default now.
     * Better not modify this anymore..
     *
     * Transforming utf8 to a string is pretty expensive. The code performs 10x better
     * when String.fromCodePoint is fed with all characters as arguments.
     * But most environments have a maximum number of arguments per functions.
     * For effiency reasons we apply a maximum of 10000 characters at once.
     *
     * @function
     * @param {Decoder} decoder
     * @return {String} The read String.
     */
    /* c8 ignore start */
    const _readVarStringPolyfill = decoder => {
      let remainingLen = readVarUint(decoder);
      if (remainingLen === 0) {
        return ''
      } else {
        let encodedString = String.fromCodePoint(readUint8(decoder)); // remember to decrease remainingLen
        if (--remainingLen < 100) { // do not create a Uint8Array for small strings
          while (remainingLen--) {
            encodedString += String.fromCodePoint(readUint8(decoder));
          }
        } else {
          while (remainingLen > 0) {
            const nextLen = remainingLen < 10000 ? remainingLen : 10000;
            // this is dangerous, we create a fresh array view from the existing buffer
            const bytes = decoder.arr.subarray(decoder.pos, decoder.pos + nextLen);
            decoder.pos += nextLen;
            // Starting with ES5.1 we can supply a generic array-like object as arguments
            encodedString += String.fromCodePoint.apply(null, /** @type {any} */ (bytes));
            remainingLen -= nextLen;
          }
        }
        return decodeURIComponent(escape(encodedString))
      }
    };
    /* c8 ignore stop */

    /**
     * @function
     * @param {Decoder} decoder
     * @return {String} The read String
     */
    const _readVarStringNative = decoder =>
      /** @type any */ (utf8TextDecoder).decode(readVarUint8Array(decoder));

    /**
     * Read string of variable length
     * * varUint is used to store the length of the string
     *
     * @function
     * @param {Decoder} decoder
     * @return {String} The read String
     *
     */
    /* c8 ignore next */
    const readVarString = utf8TextDecoder ? _readVarStringNative : _readVarStringPolyfill;

    /**
     * @param {Decoder} decoder
     * @param {number} len
     * @return {DataView}
     */
    const readFromDataView = (decoder, len) => {
      const dv = new DataView(decoder.arr.buffer, decoder.arr.byteOffset + decoder.pos, len);
      decoder.pos += len;
      return dv
    };

    /**
     * @param {Decoder} decoder
     */
    const readFloat32 = decoder => readFromDataView(decoder, 4).getFloat32(0, false);

    /**
     * @param {Decoder} decoder
     */
    const readFloat64 = decoder => readFromDataView(decoder, 8).getFloat64(0, false);

    /**
     * @param {Decoder} decoder
     */
    const readBigInt64 = decoder => /** @type {any} */ (readFromDataView(decoder, 8)).getBigInt64(0, false);

    /**
     * @param {Decoder} decoder
     */
    const readBigUint64 = decoder => /** @type {any} */ (readFromDataView(decoder, 8)).getBigUint64(0, false);

    /**
     * @type {Array<function(Decoder):any>}
     */
    const readAnyLookupTable = [
      decoder => undefined, // CASE 127: undefined
      decoder => null, // CASE 126: null
      readVarInt, // CASE 125: integer
      readFloat32, // CASE 124: float32
      readFloat64, // CASE 123: float64
      readBigInt64, // CASE 122: bigint
      decoder => false, // CASE 121: boolean (false)
      decoder => true, // CASE 120: boolean (true)
      readVarString, // CASE 119: string
      decoder => { // CASE 118: object<string,any>
        const len = readVarUint(decoder);
        /**
         * @type {Object<string,any>}
         */
        const obj = {};
        for (let i = 0; i < len; i++) {
          const key = readVarString(decoder);
          obj[key] = readAny(decoder);
        }
        return obj
      },
      decoder => { // CASE 117: array<any>
        const len = readVarUint(decoder);
        const arr = [];
        for (let i = 0; i < len; i++) {
          arr.push(readAny(decoder));
        }
        return arr
      },
      readVarUint8Array // CASE 116: Uint8Array
    ];

    /**
     * @param {Decoder} decoder
     */
    const readAny = decoder => readAnyLookupTable[127 - readUint8(decoder)](decoder);

    /**
     * T must not be null.
     *
     * @template T
     */
    class RleDecoder extends Decoder {
      /**
       * @param {Uint8Array} uint8Array
       * @param {function(Decoder):T} reader
       */
      constructor (uint8Array, reader) {
        super(uint8Array);
        /**
         * The reader
         */
        this.reader = reader;
        /**
         * Current state
         * @type {T|null}
         */
        this.s = null;
        this.count = 0;
      }

      read () {
        if (this.count === 0) {
          this.s = this.reader(this);
          if (hasContent(this)) {
            this.count = readVarUint(this) + 1; // see encoder implementation for the reason why this is incremented
          } else {
            this.count = -1; // read the current value forever
          }
        }
        this.count--;
        return /** @type {T} */ (this.s)
      }
    }

    class UintOptRleDecoder extends Decoder {
      /**
       * @param {Uint8Array} uint8Array
       */
      constructor (uint8Array) {
        super(uint8Array);
        /**
         * @type {number}
         */
        this.s = 0;
        this.count = 0;
      }

      read () {
        if (this.count === 0) {
          this.s = readVarInt(this);
          // if the sign is negative, we read the count too, otherwise count is 1
          const isNegative = isNegativeZero(this.s);
          this.count = 1;
          if (isNegative) {
            this.s = -this.s;
            this.count = readVarUint(this) + 2;
          }
        }
        this.count--;
        return /** @type {number} */ (this.s)
      }
    }

    class IntDiffOptRleDecoder extends Decoder {
      /**
       * @param {Uint8Array} uint8Array
       */
      constructor (uint8Array) {
        super(uint8Array);
        /**
         * @type {number}
         */
        this.s = 0;
        this.count = 0;
        this.diff = 0;
      }

      /**
       * @return {number}
       */
      read () {
        if (this.count === 0) {
          const diff = readVarInt(this);
          // if the first bit is set, we read more data
          const hasCount = diff & 1;
          this.diff = floor(diff / 2); // shift >> 1
          this.count = 1;
          if (hasCount) {
            this.count = readVarUint(this) + 2;
          }
        }
        this.s += this.diff;
        this.count--;
        return this.s
      }
    }

    class StringDecoder {
      /**
       * @param {Uint8Array} uint8Array
       */
      constructor (uint8Array) {
        this.decoder = new UintOptRleDecoder(uint8Array);
        this.str = readVarString(this.decoder);
        /**
         * @type {number}
         */
        this.spos = 0;
      }

      /**
       * @return {string}
       */
      read () {
        const end = this.spos + this.decoder.read();
        const res = this.str.slice(this.spos, end);
        this.spos = end;
        return res
      }
    }

    function decodeYMessage(a) {
        const decoder = new Decoder(a);
        const type = readVarString(decoder);
        if (type === 'outdated-server-rev') {
            return { type };
        }
        if (type === 'y-complete-sync-done') {
            return { type, yServerRev: readVarString(decoder) };
        }
        const table = readVarString(decoder);
        const prop = readVarString(decoder);
        switch (type) {
            case 'u-ack':
            case 'u-reject':
                return {
                    type,
                    table,
                    prop,
                    i: Number(readBigUint64(decoder)),
                };
            default: {
                const k = readAny(decoder);
                switch (type) {
                    case 'in-sync':
                        return { type, table, prop, k };
                    case 'aware':
                        return {
                            type,
                            table,
                            prop,
                            k,
                            u: readVarUint8Array(decoder),
                        };
                    case 'doc-open':
                        return {
                            type,
                            table,
                            prop,
                            k,
                            serverRev: readAny(decoder),
                            sv: readAny(decoder),
                        };
                    case 'doc-close':
                        return { type, table, prop, k };
                    case 'sv':
                        return {
                            type,
                            table,
                            prop,
                            k,
                            sv: readVarUint8Array(decoder),
                        };
                    case 'u-c':
                        return {
                            type,
                            table,
                            prop,
                            k,
                            u: readVarUint8Array(decoder),
                            i: Number(readBigUint64(decoder)),
                        };
                    case 'u-s':
                        return {
                            type,
                            table,
                            prop,
                            k,
                            u: readVarUint8Array(decoder),
                            r: (decoder.pos < decoder.arr.length && readVarString(decoder)) || undefined,
                        };
                    default:
                        throw new TypeError(`Unknown message type: ${type}`);
                }
            }
        }
    }

    async function asyncIterablePipeline(source, ...stages) {
        // Chain generators by sending outdata from one to another
        let result = source(); // Start with the source generator
        for (let i = 0; i < stages.length; i++) {
            result = stages[i](result); // Pass on the result to next generator
        }
        // Start running the machine. If the last stage is a sink, it will consume the data and never emit anything
        // to us here...
        for await (const chunk of result) { }
    }

    async function* consumeChunkedBinaryStream(source) {
        let state = 0;
        let sizeBuf = new Uint8Array(4);
        let sizeBufPos = 0;
        let bufs = [];
        let len = 0;
        for await (const chunk of source) {
            const dw = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
            let pos = 0;
            while (pos < chunk.byteLength) {
                switch (state) {
                    case 0:
                        // Beginning of a size header
                        if (pos + 4 > chunk.byteLength) {
                            for (const b of chunk.slice(pos)) {
                                if (sizeBufPos === 4)
                                    break;
                                sizeBuf[sizeBufPos++] = b;
                                ++pos;
                            }
                            if (sizeBufPos < 4) {
                                // Need more bytes in order to read length.
                                // Will go out from while loop as well because pos is defenitely = chunk.byteLength here.
                                break;
                            }
                        }
                        else if (sizeBufPos > 0 && sizeBufPos < 4) {
                            for (const b of chunk.slice(pos, pos + 4 - sizeBufPos)) {
                                sizeBuf[sizeBufPos++] = b;
                                ++pos;
                            }
                        }
                    // Intentional fall-through...
                    case 1:
                        len =
                            sizeBufPos === 4
                                ? new DataView(sizeBuf.buffer, 0, 4).getUint32(0, false)
                                : dw.getUint32(pos, false);
                        if (sizeBufPos)
                            sizeBufPos = 0; // in this case pos is already forwarded
                        else
                            pos += 4; // else pos is not yet forwarded - that's why we do it now
                    // Intentional fall-through...
                    case 2:
                        // Eat the chunk
                        if (pos >= chunk.byteLength) {
                            state = 2;
                            break;
                        }
                        if (pos + len > chunk.byteLength) {
                            bufs.push(chunk.slice(pos));
                            len -= (chunk.byteLength - pos);
                            state = 2;
                            pos = chunk.byteLength; // will break while loop.
                        }
                        else {
                            if (bufs.length > 0) {
                                const concats = new Uint8Array(bufs.reduce((p, c) => p + c.byteLength, len));
                                let p = 0;
                                for (const buf of bufs) {
                                    concats.set(buf, p);
                                    p += buf.byteLength;
                                }
                                concats.set(chunk.slice(pos, pos + len), p);
                                bufs = [];
                                yield concats;
                            }
                            else {
                                yield chunk.slice(pos, pos + len);
                            }
                            pos += len;
                            state = 0;
                        }
                        break;
                }
            }
        }
    }

    function getFetchResponseBodyGenerator(res) {
        return async function* () {
            if (!res.body)
                throw new Error("Response body is not readable");
            const reader = res.body.getReader();
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done)
                        return;
                    yield value;
                }
            }
            finally {
                reader.releaseLock();
            }
        };
    }

    //const hasSW = 'serviceWorker' in navigator;
    let hasComplainedAboutSyncEvent = false;
    function registerSyncEvent(db, purpose) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Send sync event to SW:
                const sw = yield navigator.serviceWorker.ready;
                if (purpose === "push" && sw.sync) {
                    yield sw.sync.register(`dexie-cloud:${db.name}`);
                }
                if (sw.active) {
                    // Use postMessage for pull syncs and for browsers not supporting sync event (Firefox, Safari).
                    // Also chromium based browsers with sw.sync as a fallback for sleepy sync events not taking action for a while.
                    sw.active.postMessage({
                        type: 'dexie-cloud-sync',
                        dbName: db.name,
                        purpose
                    });
                }
                else {
                    throw new Error(`Failed to trigger sync - there's no active service worker`);
                }
                return;
            }
            catch (e) {
                if (!hasComplainedAboutSyncEvent) {
                    console.debug(`Dexie Cloud: Could not register sync event`, e);
                    hasComplainedAboutSyncEvent = true;
                }
            }
        });
    }
    function registerPeriodicSyncEvent(db) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Register periodicSync event to SW:
                // @ts-ignore
                const { periodicSync } = yield navigator.serviceWorker.ready;
                if (periodicSync) {
                    try {
                        yield periodicSync.register(`dexie-cloud:${db.name}`, (_a = db.cloud.options) === null || _a === void 0 ? void 0 : _a.periodicSync);
                        console.debug(`Dexie Cloud: Successfully registered periodicsync event for ${db.name}`);
                    }
                    catch (e) {
                        console.debug(`Dexie Cloud: Failed to register periodic sync. Your PWA must be installed to allow background sync.`, e);
                    }
                }
                else {
                    console.debug(`Dexie Cloud: periodicSync not supported.`);
                }
            }
            catch (e) {
                console.debug(`Dexie Cloud: Could not register periodicSync for ${db.name}`, e);
            }
        });
    }

    function triggerSync(db, purpose) {
        if (db.cloud.usingServiceWorker) {
            console.debug('registering sync event');
            registerSyncEvent(db, purpose);
        }
        else {
            db.localSyncEvent.next({ purpose });
        }
    }

    const hasArrayBufferFromBase64 = "fromBase64" in Uint8Array; // https://github.com/tc39/proposal-arraybuffer-base64;
    const hasArrayBufferToBase64 = "toBase64" in Uint8Array.prototype; // https://github.com/tc39/proposal-arraybuffer-base64;
    const b64decode = typeof Buffer !== "undefined"
        ? (base64) => Buffer.from(base64, "base64") // Node
        : hasArrayBufferFromBase64
            ? // @ts-ignore: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/fromBase64
                (base64) => Uint8Array.fromBase64(base64) // Modern javascript standard
            : (base64) => {
                // Legacy DOM workaround
                const binary_string = atob(base64);
                const len = binary_string.length;
                const bytes = new Uint8Array(len);
                for (var i = 0; i < len; i++) {
                    bytes[i] = binary_string.charCodeAt(i);
                }
                return bytes;
            };
    const b64encode = typeof Buffer !== "undefined"
        ? (b) => {
            // Node
            if (ArrayBuffer.isView(b)) {
                return Buffer.from(b.buffer, b.byteOffset, b.byteLength).toString("base64");
            }
            else {
                return Buffer.from(b).toString("base64");
            }
        }
        : hasArrayBufferToBase64
            ? (b) => {
                // Uint8Array.prototype.toBase64 is available in modern browsers
                const u8a = ArrayBuffer.isView(b) ? b : new Uint8Array(b);
                // @ts-ignore: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/toBase64
                return u8a.toBase64();
            }
            : (b) => {
                // Legacy DOM workaround
                const u8a = ArrayBuffer.isView(b) ? b : new Uint8Array(b);
                const CHUNK_SIZE = 0x1000;
                const strs = [];
                for (let i = 0, l = u8a.length; i < l; i += CHUNK_SIZE) {
                    const chunk = u8a.subarray(i, i + CHUNK_SIZE);
                    strs.push(String.fromCharCode.apply(null, chunk));
                }
                return btoa(strs.join(""));
            };

    class TokenErrorResponseError extends Error {
        constructor({ title, message, messageCode, messageParams, }) {
            super(message);
            this.name = 'TokenErrorResponseError';
            this.title = title;
            this.messageCode = messageCode;
            this.messageParams = messageParams;
        }
    }

    /** Email/envelope icon data URL for OTP option */
    const EmailIcon = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#666666" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6L12 13 2 6"/></svg>')}`;
    /**
     * Converts an OAuthProviderInfo to a generic DXCOption.
     */
    function providerToOption(provider) {
        return {
            name: 'provider',
            value: provider.name,
            displayName: `Continue with ${provider.displayName}`,
            iconUrl: provider.iconUrl,
            styleHint: provider.type,
        };
    }
    function interactWithUser(userInteraction, req) {
        return new Promise((resolve, reject) => {
            const interactionProps = Object.assign(Object.assign({ submitLabel: 'Submit', cancelLabel: 'Cancel' }, req), { onSubmit: (res) => {
                    userInteraction.next(undefined);
                    resolve(res);
                }, onCancel: () => {
                    userInteraction.next(undefined);
                    reject(new Dexie.AbortError('User cancelled'));
                } });
            userInteraction.next(interactionProps);
            // Start subscribing for external updates to db.cloud.userInteraction, and if so, cancel this request.
            /*const subscription = userInteraction.subscribe((currentInteractionProps) => {
              if (currentInteractionProps !== interactionProps) {
                if (subscription) subscription.unsubscribe();
                if (!done) {
                  reject(new Dexie.AbortError("User cancelled"));
                }
              }
            });*/
        });
    }
    function alertUser(userInteraction, title, ...alerts) {
        return interactWithUser(userInteraction, {
            type: 'message-alert',
            title,
            alerts,
            fields: {},
            submitLabel: 'OK',
            cancelLabel: null,
        });
    }
    function promptForEmail(userInteraction, title, emailHint) {
        return __awaiter(this, void 0, void 0, function* () {
            let email = emailHint || '';
            // Regular expression for email validation
            // ^[\w-+.]+@([\w-]+\.)+[\w-]{2,10}(\sas\s[\w-+.]+@([\w-]+\.)+[\w-]{2,10})?$
            //
            // ^[\w-+.]+ : Matches the start of the string. Allows one or more word characters
            // (a-z, A-Z, 0-9, and underscore), hyphen, plus, or dot.
            //
            // @ : Matches the @ symbol.
            // ([\w-]+\.)+ : Matches one or more word characters or hyphens followed by a dot.
            //   The plus sign outside the parentheses means this pattern can repeat one or more times,
            //   allowing for subdomains.
            // [\w-]{2,10} : Matches between 2 and 10 word characters or hyphens. This is typically for
            //   the domain extension like .com, .net, etc.
            // (\sas\s[\w-+.]+@([\w-]+\.)+[\w-]{2,10})?$ : This part is optional (due to the ? at the end).
            //   If present, it matches " as " followed by another valid email address. This allows for the
            //   input to be either a single email address or two email addresses separated by " as ". 
            //
            // The use case for "<email1> as <email2>"" is for when a database owner with full access to the
            // database needs to impersonate another user in the database in order to troubleshoot. This
            // format will only be possible to use when email1 is the owner of an API client with GLOBAL_READ
            // and GLOBAL_WRITE permissions on the database. The email will be checked on the server before
            // allowing it and giving out a token for email2, using the OTP sent to email1.
            while (!email || !/^[\w-+.]+@([\w-]+\.)+[\w-]{2,10}(\sas\s[\w-+.]+@([\w-]+\.)+[\w-]{2,10})?$/.test(email)) {
                email = (yield interactWithUser(userInteraction, {
                    type: 'email',
                    title,
                    alerts: email
                        ? [
                            {
                                type: 'error',
                                messageCode: 'INVALID_EMAIL',
                                message: 'Please enter a valid email address',
                                messageParams: {},
                            },
                        ]
                        : [],
                    fields: {
                        email: {
                            type: 'email',
                            placeholder: 'you@somedomain.com',
                        },
                    },
                })).email;
            }
            return email;
        });
    }
    function promptForOTP(userInteraction, email, alert) {
        return __awaiter(this, void 0, void 0, function* () {
            const alerts = [
                {
                    type: 'info',
                    messageCode: 'OTP_SENT',
                    message: `A One-Time password has been sent to {email}`,
                    messageParams: { email },
                },
            ];
            if (alert) {
                alerts.push(alert);
            }
            const { otp } = yield interactWithUser(userInteraction, {
                type: 'otp',
                title: 'Enter OTP',
                alerts,
                fields: {
                    otp: {
                        type: 'otp',
                        label: 'OTP',
                        placeholder: 'Paste OTP here',
                    },
                },
            });
            return otp;
        });
    }
    function confirmLogout(userInteraction, currentUserId, numUnsyncedChanges) {
        return __awaiter(this, void 0, void 0, function* () {
            const alerts = [
                {
                    type: 'warning',
                    messageCode: 'LOGOUT_CONFIRMATION',
                    message: `{numUnsyncedChanges} unsynced changes will get lost!
                Logout anyway?`,
                    messageParams: {
                        currentUserId,
                        numUnsyncedChanges: numUnsyncedChanges.toString(),
                    }
                },
            ];
            return yield interactWithUser(userInteraction, {
                type: 'logout-confirmation',
                title: 'Confirm Logout',
                alerts,
                fields: {},
                submitLabel: 'Confirm logout',
                cancelLabel: 'Cancel'
            })
                .then(() => true)
                .catch(() => false);
        });
    }
    /**
     * Prompts the user to select an authentication method (OAuth provider or OTP).
     *
     * This function converts OAuth providers and OTP option into generic DXCOption[]
     * for the DXCSelect interaction, handling icon fetching and style hints.
     *
     * @param userInteraction - The user interaction BehaviorSubject
     * @param providers - Available OAuth providers
     * @param otpEnabled - Whether OTP is available
     * @param title - Dialog title
     * @param alerts - Optional alerts to display
     * @returns Promise resolving to the user's selection
     */
    function promptForProvider(userInteraction_1, providers_1, otpEnabled_1) {
        return __awaiter(this, arguments, void 0, function* (userInteraction, providers, otpEnabled, title = 'Choose login method', alerts = []) {
            // Convert providers to generic options
            const providerOptions = providers.map(providerToOption);
            // Build the options array
            const options = [...providerOptions];
            // Add OTP option if enabled
            if (otpEnabled) {
                options.push({
                    name: 'otp',
                    value: 'email',
                    displayName: 'Continue with email',
                    iconUrl: EmailIcon,
                    styleHint: 'otp',
                });
            }
            return new Promise((resolve, reject) => {
                const interactionProps = {
                    type: 'generic',
                    title,
                    alerts,
                    options,
                    fields: {},
                    submitLabel: '', // No submit button - just options
                    cancelLabel: 'Cancel',
                    onSubmit: (params) => {
                        userInteraction.next(undefined);
                        // Check which option was selected
                        if ('otp' in params) {
                            resolve({ type: 'otp' });
                        }
                        else if ('provider' in params) {
                            resolve({ type: 'provider', provider: params.provider });
                        }
                        else {
                            // Unknown - default to OTP
                            resolve({ type: 'otp' });
                        }
                    },
                    onCancel: () => {
                        userInteraction.next(undefined);
                        reject(new Dexie.AbortError('User cancelled'));
                    },
                };
                userInteraction.next(interactionProps);
            });
        });
    }

    /**
     * Error thrown when initiating an OAuth redirect.
     *
     * This is not a real error - it's used to signal that the page is
     * navigating away to an OAuth provider. It should be caught and
     * silently ignored at the appropriate level.
     */
    class OAuthRedirectError extends Error {
        constructor(provider) {
            super(`OAuth redirect initiated for provider: ${provider}`);
            this.name = 'OAuthRedirectError';
            this.provider = provider;
        }
    }

    function loadAccessToken(db) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const currentUser = yield db.getCurrentUser();
            const { accessToken, accessTokenExpiration, refreshToken, refreshTokenExpiration, claims, } = currentUser;
            if (!accessToken)
                return null;
            const expTime = (_a = accessTokenExpiration === null || accessTokenExpiration === void 0 ? void 0 : accessTokenExpiration.getTime()) !== null && _a !== void 0 ? _a : Infinity;
            if (expTime > Date.now() && (((_b = currentUser.license) === null || _b === void 0 ? void 0 : _b.status) || 'ok') === 'ok') {
                return currentUser;
            }
            if (!refreshToken) {
                throw new Error(`Refresh token missing`);
            }
            const refreshExpTime = (_c = refreshTokenExpiration === null || refreshTokenExpiration === void 0 ? void 0 : refreshTokenExpiration.getTime()) !== null && _c !== void 0 ? _c : Infinity;
            if (refreshExpTime <= Date.now()) {
                throw new Error(`Refresh token has expired`);
            }
            const refreshedLogin = yield refreshAccessToken(db.cloud.options.databaseUrl, currentUser);
            yield db.table('$logins').update(claims.sub, {
                accessToken: refreshedLogin.accessToken,
                accessTokenExpiration: refreshedLogin.accessTokenExpiration,
                claims: refreshedLogin.claims,
                license: refreshedLogin.license,
                data: refreshedLogin.data,
            });
            return refreshedLogin;
        });
    }
    function authenticate(url, context, fetchToken, userInteraction, hints) {
        return __awaiter(this, void 0, void 0, function* () {
            if (context.accessToken &&
                context.accessTokenExpiration.getTime() > Date.now()) {
                return context;
            }
            else if (context.refreshToken &&
                (!context.refreshTokenExpiration ||
                    context.refreshTokenExpiration.getTime() > Date.now())) {
                return yield refreshAccessToken(url, context);
            }
            else {
                return yield userAuthenticate(context, fetchToken, userInteraction, hints);
            }
        });
    }
    function refreshAccessToken(url, login) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!login.refreshToken)
                throw new Error(`Cannot refresh token - refresh token is missing.`);
            if (!login.nonExportablePrivateKey)
                throw new Error(`login.nonExportablePrivateKey is missing - cannot sign refresh token without a private key.`);
            const time_stamp = Date.now();
            const signing_algorithm = 'RSASSA-PKCS1-v1_5';
            const textEncoder = new TextEncoder();
            const data = textEncoder.encode(login.refreshToken + time_stamp);
            const binarySignature = yield crypto.subtle.sign(signing_algorithm, login.nonExportablePrivateKey, data);
            const signature = b64encode(binarySignature);
            const tokenRequest = {
                grant_type: 'refresh_token',
                refresh_token: login.refreshToken,
                scopes: ['ACCESS_DB'],
                signature,
                signing_algorithm,
                time_stamp,
            };
            const res = yield fetch(`${url}/token`, {
                body: JSON.stringify(tokenRequest),
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                mode: 'cors',
            });
            if (res.status !== 200)
                throw new Error(`RefreshToken: Status ${res.status} from ${url}/token`);
            const response = yield res.json();
            if (response.type === 'error') {
                throw new TokenErrorResponseError(response);
            }
            login.accessToken = response.accessToken;
            login.accessTokenExpiration = response.accessTokenExpiration
                ? new Date(response.accessTokenExpiration)
                : undefined;
            login.claims = response.claims;
            login.license = {
                type: response.userType,
                status: response.claims.license || 'ok',
            };
            if (response.evalDaysLeft != null) {
                login.license.evalDaysLeft = response.evalDaysLeft;
            }
            if (response.userValidUntil != null) {
                login.license.validUntil = new Date(response.userValidUntil);
            }
            if (response.data) {
                login.data = response.data;
            }
            return login;
        });
    }
    function userAuthenticate(context, fetchToken, userInteraction, hints) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!crypto.subtle) {
                if (typeof location !== 'undefined' && location.protocol === 'http:') {
                    throw new Error(`Dexie Cloud Addon needs to use WebCrypto, but your browser has disabled it due to being served from an insecure location. Please serve it from https or http://localhost:<port> (See https://stackoverflow.com/questions/46670556/how-to-enable-crypto-subtle-for-unsecure-origins-in-chrome/46671627#46671627)`);
                }
                else {
                    throw new Error(`This browser does not support WebCrypto.`);
                }
            }
            const { privateKey, publicKey } = yield crypto.subtle.generateKey({
                name: 'RSASSA-PKCS1-v1_5',
                modulusLength: 2048,
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                hash: { name: 'SHA-256' },
            }, false, // Non-exportable...
            ['sign', 'verify']);
            if (!privateKey || !publicKey)
                throw new Error(`Could not generate RSA keypair`); // Typings suggest these can be undefined...
            context.nonExportablePrivateKey = privateKey; //...but storable!
            const publicKeySPKI = yield crypto.subtle.exportKey('spki', publicKey);
            const publicKeyPEM = spkiToPEM(publicKeySPKI);
            context.publicKey = publicKey;
            try {
                const response2 = yield fetchToken({
                    public_key: publicKeyPEM,
                    hints,
                });
                if (response2.type === 'error') {
                    throw new TokenErrorResponseError(response2);
                }
                if (response2.type !== 'tokens')
                    throw new Error(`Unexpected response type from token endpoint: ${response2.type}`);
                /*const licenseStatus = response2.claims.license || 'ok';
                if (licenseStatus !== 'ok') {
                  throw new InvalidLicenseError(licenseStatus);
                }*/
                context.accessToken = response2.accessToken;
                context.accessTokenExpiration = new Date(response2.accessTokenExpiration);
                context.refreshToken = response2.refreshToken;
                if (response2.refreshTokenExpiration) {
                    context.refreshTokenExpiration = new Date(response2.refreshTokenExpiration);
                }
                context.userId = response2.claims.sub;
                context.email = response2.claims.email;
                context.name = response2.claims.name;
                context.claims = response2.claims;
                context.license = {
                    type: response2.userType,
                    status: response2.claims.license || 'ok',
                };
                context.data = response2.data;
                if (response2.evalDaysLeft != null) {
                    context.license.evalDaysLeft = response2.evalDaysLeft;
                }
                if (response2.userValidUntil != null) {
                    context.license.validUntil = new Date(response2.userValidUntil);
                }
                if (response2.alerts && response2.alerts.length > 0) {
                    yield interactWithUser(userInteraction, {
                        type: 'message-alert',
                        title: 'Authentication Alert',
                        fields: {},
                        alerts: response2.alerts,
                    });
                }
                return context;
            }
            catch (error) {
                // OAuth redirect is not an error - page is navigating away
                if (error instanceof OAuthRedirectError || (error === null || error === void 0 ? void 0 : error.name) === 'OAuthRedirectError') {
                    throw error; // Re-throw without logging
                }
                if (error instanceof TokenErrorResponseError) {
                    yield alertUser(userInteraction, error.title, {
                        type: 'error',
                        messageCode: error.messageCode,
                        message: error.message,
                        messageParams: {},
                    });
                    throw error;
                }
                let message = `We're having a problem authenticating right now.`;
                console.error(`Error authenticating`, error);
                if (error instanceof TypeError) {
                    const isOffline = typeof navigator !== undefined && !navigator.onLine;
                    if (isOffline) {
                        message = `You seem to be offline. Please connect to the internet and try again.`;
                    }
                    else if (Dexie.debug || (typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1'))) {
                        // The audience is most likely the developer. Suggest to whitelist the localhost origin:
                        message = `Could not connect to server. Please verify that your origin '${location.origin}' is whitelisted using \`npx dexie-cloud whitelist\``;
                    }
                    else {
                        message = `Could not connect to server. Please verify the connection.`;
                    }
                    yield alertUser(userInteraction, 'Authentication Failed', {
                        type: 'error',
                        messageCode: 'GENERIC_ERROR',
                        message,
                        messageParams: {},
                    }).catch(() => { });
                }
                throw error;
            }
        });
    }
    function spkiToPEM(keydata) {
        const keydataB64 = b64encode(keydata);
        const keydataB64Pem = formatAsPem(keydataB64);
        return keydataB64Pem;
    }
    function formatAsPem(str) {
        let finalString = '-----BEGIN PUBLIC KEY-----\n';
        while (str.length > 0) {
            finalString += str.substring(0, 64) + '\n';
            str = str.substring(64);
        }
        finalString = finalString + '-----END PUBLIC KEY-----';
        return finalString;
    }

    // Emulate true-private property db. Why? So it's not stored in DB.
    const wm$3 = new WeakMap();
    class AuthPersistedContext {
        constructor(db, userLogin) {
            wm$3.set(this, db);
            Object.assign(this, userLogin);
        }
        static load(db, userId) {
            return db
                .table("$logins")
                .get(userId)
                .then((userLogin) => new AuthPersistedContext(db, userLogin || {
                userId,
                claims: {
                    sub: userId
                },
                lastLogin: new Date(0)
            }));
        }
        save() {
            return __awaiter(this, void 0, void 0, function* () {
                const db = wm$3.get(this);
                db.table("$logins").put(this);
            });
        }
    }

    const UNAUTHORIZED_USER = {
        userId: "unauthorized",
        name: "Unauthorized",
        claims: {
            sub: "unauthorized",
        },
        lastLogin: new Date(0)
    };
    try {
        Object.freeze(UNAUTHORIZED_USER);
        Object.freeze(UNAUTHORIZED_USER.claims);
    }
    catch (_a) { }

    function waitUntil(o, // Works with Dexie's liveQuery observables if we'd need that
    predicate) {
        return rxjs.firstValueFrom(rxjs.from(o).pipe(rxjs.filter(predicate)));
    }

    function logout(db) {
        return __awaiter(this, void 0, void 0, function* () {
            const numUnsyncedChanges = yield _logout(db);
            if (numUnsyncedChanges) {
                if (yield confirmLogout(db.cloud.userInteraction, db.cloud.currentUserId, numUnsyncedChanges)) {
                    yield _logout(db, { deleteUnsyncedData: true });
                }
                else {
                    throw new Error(`User cancelled logout due to unsynced changes`);
                }
            }
        });
    }
    function _logout(db_1) {
        return __awaiter(this, arguments, void 0, function* (db, { deleteUnsyncedData = false } = {}) {
            // Clear the database without emptying configuration options.
            const [numUnsynced, loggedOut] = yield db.dx.transaction('rw', db.dx.tables, (tx) => __awaiter(this, void 0, void 0, function* () {
                // @ts-ignore
                const idbtrans = tx.idbtrans;
                idbtrans.disableChangeTracking = true;
                idbtrans.disableAccessControl = true;
                const mutationTables = tx.storeNames.filter((tableName) => tableName.endsWith('_mutations'));
                // Count unsynced changes
                const unsyncCounts = yield Promise.all(mutationTables.map((mutationTable) => tx.table(mutationTable).count()));
                const sumUnSynced = unsyncCounts.reduce((a, b) => a + b, 0);
                if (sumUnSynced > 0 && !deleteUnsyncedData) {
                    // Let caller ask user if they want to delete unsynced data.
                    return [sumUnSynced, false];
                }
                // Either there are no unsynched changes, or caller provided flag deleteUnsynchedData = true.
                // Clear all tables except $jobs and $syncState (except the persisted sync state which is
                // also cleared because we're going to rebuild it using a fresh sync).
                db.$syncState.delete('syncState');
                for (const table of db.dx.tables) {
                    if (table.name !== '$jobs' && table.name !== '$syncState') {
                        table.clear();
                    }
                }
                return [sumUnSynced, true];
            }));
            if (loggedOut) {
                // Wait for currentUser observable to emit UNAUTHORIZED_USER
                yield waitUntil(db.cloud.currentUser, (user) => user.userId === UNAUTHORIZED_USER.userId);
                // Then perform an initial sync
                yield db.cloud.sync({ purpose: 'pull', wait: true });
            }
            return numUnsynced;
        });
    }

    class HttpError extends Error {
        constructor(res, message) {
            super(message || `${res.status} ${res.statusText}`);
            this.httpStatus = res.status;
        }
        get name() {
            return "HttpError";
        }
    }

    /** User-friendly messages for OAuth error codes */
    const ERROR_MESSAGES = {
        access_denied: 'Access was denied by the authentication provider.',
        invalid_state: 'The authentication response could not be verified. Please try again.',
        email_not_verified: 'Your email address must be verified before you can log in.',
        expired_code: 'The authentication code has expired. Please try again.',
        provider_error: 'An error occurred with the authentication provider.',
        network_error: 'A network error occurred during authentication. Please check your connection and try again.',
    };
    /** Error class for OAuth-specific errors */
    class OAuthError extends Error {
        constructor(code, provider, customMessage) {
            super(customMessage || ERROR_MESSAGES[code]);
            this.name = 'OAuthError';
            this.code = code;
            this.provider = provider;
        }
        /** Get user-friendly message for this error */
        get userMessage() {
            return ERROR_MESSAGES[this.code] || this.message;
        }
    }

    /**
     * Exchanges a Dexie Cloud authorization code for access and refresh tokens.
     *
     * This is called after the OAuth callback delivers the authorization code
     * via postMessage (popup flow) or redirect.
     *
     * @param options - Exchange options
     * @returns Promise resolving to TokenFinalResponse
     * @throws OAuthError or TokenErrorResponseError on failure
     */
    function exchangeOAuthCode(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { databaseUrl, code, publicKey, scopes = ['ACCESS_DB'] } = options;
            const tokenRequest = {
                grant_type: 'authorization_code',
                code,
                public_key: publicKey,
                scopes,
            };
            try {
                const res = yield fetch(`${databaseUrl}/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(tokenRequest),
                    mode: 'cors',
                });
                if (!res.ok) {
                    // Read body once as text to avoid stream consumption issues
                    const bodyText = yield res.text().catch(() => res.statusText);
                    if (res.status === 400 || res.status === 401) {
                        // Try to parse error response as JSON
                        try {
                            const errorResponse = JSON.parse(bodyText);
                            if (errorResponse.type === 'error') {
                                // Check for specific error codes
                                if (errorResponse.messageCode === 'INVALID_OTP') {
                                    // In the context of OAuth, this likely means expired code
                                    throw new OAuthError('expired_code', undefined, errorResponse.message);
                                }
                                throw new TokenErrorResponseError(errorResponse);
                            }
                        }
                        catch (e) {
                            if (e instanceof OAuthError || e instanceof TokenErrorResponseError) {
                                throw e;
                            }
                            // Fall through to generic error
                        }
                    }
                    throw new OAuthError('provider_error', undefined, `Token exchange failed: ${res.status} ${bodyText}`);
                }
                const response = yield res.json();
                if (response.type === 'error') {
                    throw new TokenErrorResponseError(response);
                }
                if (response.type !== 'tokens') {
                    throw new OAuthError('provider_error', undefined, `Unexpected response type: ${response.type}`);
                }
                return response;
            }
            catch (error) {
                if (error instanceof OAuthError || error instanceof TokenErrorResponseError) {
                    throw error;
                }
                if (error instanceof TypeError) {
                    // Network error
                    throw new OAuthError('network_error');
                }
                throw error;
            }
        });
    }

    /** Default response when OAuth is disabled or unavailable */
    const OTP_ONLY_RESPONSE = {
        providers: [],
        otpEnabled: true,
    };
    /**
     * Fetches available authentication providers from the Dexie Cloud server.
     *
     * @param databaseUrl - The Dexie Cloud database URL
     * @param socialAuthEnabled - Whether social auth is enabled in client config (default: true)
     * @returns Promise resolving to AuthProvidersResponse
     *
     * Handles failures gracefully:
     * - 404 → Returns OTP-only (old server version)
     * - Network error → Returns OTP-only
     * - socialAuthEnabled: false → Returns OTP-only without fetching
     */
    function fetchAuthProviders(databaseUrl_1) {
        return __awaiter(this, arguments, void 0, function* (databaseUrl, socialAuthEnabled = true) {
            // If social auth is disabled, return OTP-only without fetching
            if (!socialAuthEnabled) {
                return OTP_ONLY_RESPONSE;
            }
            try {
                const res = yield fetch(`${databaseUrl}/auth-providers`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    mode: 'cors',
                });
                if (res.status === 404) {
                    // Old server version without OAuth support
                    console.debug('[dexie-cloud] Server does not support /auth-providers endpoint. Using OTP-only authentication.');
                    return OTP_ONLY_RESPONSE;
                }
                if (!res.ok) {
                    console.warn(`[dexie-cloud] Failed to fetch auth providers: ${res.status} ${res.statusText}`);
                    return OTP_ONLY_RESPONSE;
                }
                return yield res.json();
            }
            catch (error) {
                // Network error or other failure - fall back to OTP
                console.debug('[dexie-cloud] Could not fetch auth providers, falling back to OTP:', error);
                return OTP_ONLY_RESPONSE;
            }
        });
    }

    /** Build the OAuth login URL */
    function buildOAuthLoginUrl(options) {
        const url = new URL(`${options.databaseUrl}/oauth/login/${options.provider}`);
        // Set the redirect URI - defaults to current page URL for web SPAs
        const redirectUri = options.redirectUri ||
            (typeof window !== 'undefined' ? window.location.href : '');
        if (redirectUri) {
            url.searchParams.set('redirect_uri', redirectUri);
        }
        return url.toString();
    }
    /**
     * Initiates OAuth login via full page redirect.
     *
     * The page will navigate to the OAuth provider. After authentication,
     * the user is redirected back to the app with a `dxc-auth` query parameter
     * containing base64url-encoded JSON with the authorization code.
     *
     * The dexie-cloud-addon automatically detects and processes this parameter
     * when db.cloud.configure() is called on page load.
     *
     * @param options - OAuth redirect options
     *
     * @example
     * ```typescript
     * // Initiate OAuth login
     * startOAuthRedirect({
     *   databaseUrl: 'https://mydb.dexie.cloud',
     *   provider: 'google'
     * });
     * // Page navigates away, user authenticates, then returns with auth code
     * ```
     */
    function startOAuthRedirect(options) {
        if (typeof window === 'undefined') {
            throw new Error('OAuth redirect requires a browser environment');
        }
        const loginUrl = buildOAuthLoginUrl(options);
        window.location.href = loginUrl;
    }

    function otpFetchTokenCallback(db) {
        const { userInteraction } = db.cloud;
        return function otpAuthenticate(_a) {
            return __awaiter(this, arguments, void 0, function* ({ public_key, hints }) {
                var _b, _c;
                let tokenRequest;
                const url = (_b = db.cloud.options) === null || _b === void 0 ? void 0 : _b.databaseUrl;
                if (!url)
                    throw new Error(`No database URL given.`);
                // Handle OAuth code exchange (from redirect/deep link flows)
                if ((hints === null || hints === void 0 ? void 0 : hints.oauthCode) && hints.provider) {
                    return yield exchangeOAuthCode({
                        databaseUrl: url,
                        code: hints.oauthCode,
                        publicKey: public_key,
                        scopes: ['ACCESS_DB'],
                    });
                }
                // Handle OAuth provider login via redirect
                if (hints === null || hints === void 0 ? void 0 : hints.provider) {
                    let resolvedRedirectUri = undefined;
                    if (hints.redirectPath) {
                        // If redirectPath is absolute, use as is. If relative, resolve against current location
                        if (/^https?:\/\//i.test(hints.redirectPath)) {
                            resolvedRedirectUri = hints.redirectPath;
                        }
                        else if (typeof window !== 'undefined' && window.location) {
                            // Use URL constructor to resolve relative path
                            resolvedRedirectUri = new URL(hints.redirectPath, window.location.href).toString();
                        }
                        else if (typeof location !== 'undefined' && location.href) {
                            resolvedRedirectUri = new URL(hints.redirectPath, location.href).toString();
                        }
                    }
                    initiateOAuthRedirect(db, hints.provider, resolvedRedirectUri);
                    // This function never returns - page navigates away
                    throw new OAuthRedirectError(hints.provider);
                }
                if ((hints === null || hints === void 0 ? void 0 : hints.grant_type) === 'demo') {
                    const demo_user = yield promptForEmail(userInteraction, 'Enter a demo user email', (hints === null || hints === void 0 ? void 0 : hints.email) || (hints === null || hints === void 0 ? void 0 : hints.userId));
                    tokenRequest = {
                        demo_user,
                        grant_type: 'demo',
                        scopes: ['ACCESS_DB'],
                        public_key
                    };
                }
                else if ((hints === null || hints === void 0 ? void 0 : hints.otpId) && hints.otp) {
                    // User provided OTP ID and OTP code. This means that the OTP email
                    // has already gone out and the user may have clicked a magic link
                    // in the email with otp and otpId in query and the app has picked
                    // up those values and passed them to db.cloud.login().
                    tokenRequest = {
                        grant_type: 'otp',
                        otp_id: hints.otpId,
                        otp: hints.otp,
                        scopes: ['ACCESS_DB'],
                        public_key,
                    };
                }
                else if ((hints === null || hints === void 0 ? void 0 : hints.grant_type) === 'otp' || (hints === null || hints === void 0 ? void 0 : hints.email)) {
                    // User explicitly requested OTP flow - skip provider selection
                    const email = (hints === null || hints === void 0 ? void 0 : hints.email) || (yield promptForEmail(userInteraction, 'Enter email address'));
                    if (/@demo.local$/.test(email)) {
                        tokenRequest = {
                            demo_user: email,
                            grant_type: 'demo',
                            scopes: ['ACCESS_DB'],
                            public_key
                        };
                    }
                    else {
                        tokenRequest = {
                            email,
                            grant_type: 'otp',
                            scopes: ['ACCESS_DB'],
                        };
                    }
                }
                else {
                    // Check for available auth providers (OAuth + OTP)
                    const socialAuthEnabled = ((_c = db.cloud.options) === null || _c === void 0 ? void 0 : _c.socialAuth) !== false;
                    const authProviders = yield fetchAuthProviders(url, socialAuthEnabled);
                    // If we have OAuth providers available, prompt for selection
                    if (authProviders.providers.length > 0) {
                        const selection = yield promptForProvider(userInteraction, authProviders.providers, authProviders.otpEnabled, 'Sign in');
                        if (selection.type === 'provider') {
                            // User selected an OAuth provider - initiate redirect
                            initiateOAuthRedirect(db, selection.provider);
                            // This function never returns - page navigates away
                            throw new OAuthRedirectError(selection.provider);
                        }
                        // User chose OTP - continue with email prompt below
                    }
                    const email = yield promptForEmail(userInteraction, 'Enter email address', hints === null || hints === void 0 ? void 0 : hints.email);
                    if (/@demo.local$/.test(email)) {
                        tokenRequest = {
                            demo_user: email,
                            grant_type: 'demo',
                            scopes: ['ACCESS_DB'],
                            public_key
                        };
                    }
                    else {
                        tokenRequest = {
                            email,
                            grant_type: 'otp',
                            scopes: ['ACCESS_DB'],
                        };
                    }
                }
                const res1 = yield fetch(`${url}/token`, {
                    body: JSON.stringify(tokenRequest),
                    method: 'post',
                    headers: { 'Content-Type': 'application/json' },
                    mode: 'cors',
                });
                if (res1.status !== 200) {
                    const errMsg = yield res1.text();
                    yield alertUser(userInteraction, "Token request failed", {
                        type: 'error',
                        messageCode: 'GENERIC_ERROR',
                        message: errMsg,
                        messageParams: {}
                    }).catch(() => { });
                    throw new HttpError(res1, errMsg);
                }
                const response = yield res1.json();
                if (response.type === 'tokens' || response.type === 'error') {
                    // Demo user request can get a "tokens" response right away
                    // Error can also be returned right away.
                    return response;
                }
                else if (tokenRequest.grant_type === 'otp' && 'email' in tokenRequest) {
                    if (response.type !== 'otp-sent')
                        throw new Error(`Unexpected response from ${url}/token`);
                    const otp = yield promptForOTP(userInteraction, tokenRequest.email);
                    const tokenRequest2 = Object.assign(Object.assign({}, tokenRequest), { otp: otp || '', otp_id: response.otp_id, public_key });
                    let res2 = yield fetch(`${url}/token`, {
                        body: JSON.stringify(tokenRequest2),
                        method: 'post',
                        headers: { 'Content-Type': 'application/json' },
                        mode: 'cors',
                    });
                    while (res2.status === 401) {
                        const errorText = yield res2.text();
                        tokenRequest2.otp = yield promptForOTP(userInteraction, tokenRequest.email, {
                            type: 'error',
                            messageCode: 'INVALID_OTP',
                            message: errorText,
                            messageParams: {}
                        });
                        res2 = yield fetch(`${url}/token`, {
                            body: JSON.stringify(tokenRequest2),
                            method: 'post',
                            headers: { 'Content-Type': 'application/json' },
                            mode: 'cors',
                        });
                    }
                    if (res2.status !== 200) {
                        const errMsg = yield res2.text();
                        throw new HttpError(res2, errMsg);
                    }
                    const response2 = yield res2.json();
                    return response2;
                }
                else {
                    throw new Error(`Unexpected response from ${url}/token`);
                }
            });
        };
    }
    /**
     * Initiates OAuth login via full page redirect.
     *
     * The page will navigate away to the OAuth provider. After authentication,
     * the user is redirected back with a dxc-auth query parameter that is
     * automatically detected by db.cloud.configure().
     */
    function initiateOAuthRedirect(db, provider, redirectUriOverride) {
        var _a, _b;
        const url = (_a = db.cloud.options) === null || _a === void 0 ? void 0 : _a.databaseUrl;
        if (!url)
            throw new Error(`No database URL given.`);
        const redirectUri = redirectUriOverride ||
            ((_b = db.cloud.options) === null || _b === void 0 ? void 0 : _b.oauthRedirectUri) ||
            (typeof location !== 'undefined' ? location.href : undefined);
        // CodeRabbit suggested to fail fast here, but the only situation where
        // redirectUri would be undefined is in non-browser environments, and
        // in those environments OAuth redirect does not make sense anyway
        // and will fail fast in startOAuthRedirect().
        // Start OAuth redirect flow - page navigates away
        startOAuthRedirect({
            databaseUrl: url,
            provider,
            redirectUri,
        });
    }

    /** A way to log to console in production without terser stripping out
     * it from the release bundle.
     * This should be used very rarely and only in places where it's
     * absolutely necessary to log something in production.
     *
     * @param level
     * @param args
     */
    function prodLog(level, ...args) {
        globalThis["con" + "sole"][level](...args);
    }

    /** This function changes or sets the current user as requested.
     *
     * Use cases:
     * * Initially on db.ready after reading the current user from db.$logins.
     *   This will make sure that any unsynced operations from the previous user is synced before
     *   changing the user.
     * * Upon user request
     *
     * @param db
     * @param newUser
     */
    function setCurrentUser(db, user) {
        return __awaiter(this, void 0, void 0, function* () {
            const $logins = db.table('$logins');
            yield db.transaction('rw', $logins, (tx) => __awaiter(this, void 0, void 0, function* () {
                const existingLogins = yield $logins.toArray();
                yield Promise.all(existingLogins
                    .filter((login) => login.userId !== user.userId && login.isLoggedIn)
                    .map((login) => {
                    login.isLoggedIn = false;
                    return $logins.put(login);
                }));
                user.isLoggedIn = true;
                user.lastLogin = new Date();
                try {
                    yield user.save();
                }
                catch (e) {
                    try {
                        if (e.name === 'DataCloneError') {
                            // We've seen this buggy behavior in some browsers and in case it happens
                            // again we really need to collect the details to understand what's going on.
                            prodLog('debug', `Login context property names:`, Object.keys(user));
                            prodLog('debug', `Login context property names:`, Object.keys(user));
                            prodLog('debug', `Login context:`, user);
                            prodLog('debug', `Login context JSON:`, JSON.stringify(user));
                        }
                    }
                    catch (_a) { }
                    throw e;
                }
                console.debug('Saved new user', user.email);
            }));
            yield waitUntil(db.cloud.currentUser, (currentUser) => currentUser.userId === user.userId);
        });
    }

    function login(db, hints) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const currentUser = yield db.getCurrentUser();
            const origUserId = currentUser.userId;
            if (currentUser.isLoggedIn && (!hints || (!hints.email && !hints.userId))) {
                const licenseStatus = ((_a = currentUser.license) === null || _a === void 0 ? void 0 : _a.status) || 'ok';
                if (licenseStatus === 'ok' &&
                    currentUser.accessToken &&
                    (!currentUser.accessTokenExpiration ||
                        currentUser.accessTokenExpiration.getTime() > Date.now())) {
                    // Already authenticated according to given hints. And license is valid.
                    return false;
                }
                if (currentUser.refreshToken &&
                    (!currentUser.refreshTokenExpiration ||
                        currentUser.refreshTokenExpiration.getTime() > Date.now())) {
                    // Refresh the token
                    yield loadAccessToken(db);
                    return false;
                }
                // No refresh token - must re-authenticate:
            }
            const context = new AuthPersistedContext(db, {
                claims: {},
                lastLogin: new Date(0),
            });
            try {
                yield authenticate(db.cloud.options.databaseUrl, context, db.cloud.options.fetchTokens || otpFetchTokenCallback(db), db.cloud.userInteraction, hints);
            }
            catch (err) {
                if (err.name === 'OAuthRedirectError') {
                    return false; // Page is redirecting for OAuth login
                }
                throw err;
            }
            if (origUserId !== UNAUTHORIZED_USER.userId &&
                context.userId !== origUserId) {
                // User was logged in before, but now logged in as another user.
                yield logout(db);
            }
            /*try {
              await context.save();
            } catch (e) {
              try {
                if (e.name === 'DataCloneError') {
                  console.debug(`Login context property names:`, Object.keys(context));
                  console.debug(`Login context:`, context);
                  console.debug(`Login context JSON:`, JSON.stringify(context));
                }
              } catch {}
              throw e;
            }*/
            yield setCurrentUser(db, context);
            // Make sure to resync as the new login will be authorized
            // for new realms.
            triggerSync(db, 'pull');
            return context.userId !== origUserId;
        });
    }

    const swHolder = {};
    const swContainer = typeof self !== 'undefined' && self.document && // self.document is to verify we're not the SW ourself
        typeof navigator !== 'undefined' && navigator.serviceWorker;
    if (swContainer)
        swContainer.ready.then((registration) => (swHolder.registration = registration));
    if (typeof self !== 'undefined' && 'clients' in self && !self.document) {
        // We are the service worker. Propagate messages to all our clients.
        addEventListener('message', (ev) => {
            var _a, _b;
            if ((_b = (_a = ev.data) === null || _a === void 0 ? void 0 : _a.type) === null || _b === void 0 ? void 0 : _b.startsWith('sw-broadcast-')) {
                [...self['clients'].matchAll({ includeUncontrolled: true })].forEach((client) => { var _a; return client.id !== ((_a = ev.source) === null || _a === void 0 ? void 0 : _a.id) && client.postMessage(ev.data); });
            }
        });
    }
    /** This class is a fallback for browsers that lacks BroadcastChannel but have
     * service workers (which is Safari versions 11.1 through 15.3).
     * Safari 15.4 with BroadcastChannel was released on 2022-03-14.
     * We might be able to remove this class in a near future as Safari < 15.4 is
     * already very low in market share as of 2023-03-10.
     */
    class SWBroadcastChannel {
        constructor(name) {
            this.name = name;
        }
        subscribe(listener) {
            if (!swContainer)
                return () => { };
            const forwarder = (ev) => {
                var _a;
                if (((_a = ev.data) === null || _a === void 0 ? void 0 : _a.type) === `sw-broadcast-${this.name}`) {
                    listener(ev.data.message);
                }
            };
            swContainer.addEventListener('message', forwarder);
            return () => swContainer.removeEventListener('message', forwarder);
        }
        postMessage(message) {
            var _a;
            if (typeof self['clients'] === 'object') {
                // We're a service worker. Propagate to our browser clients.
                [...self['clients'].matchAll({ includeUncontrolled: true })].forEach((client) => client.postMessage({
                    type: `sw-broadcast-${this.name}`,
                    message,
                }));
            }
            else if (swHolder.registration) {
                // We're a client (browser window or other worker)
                // Post to SW so it can repost to all its clients and to itself
                (_a = swHolder.registration.active) === null || _a === void 0 ? void 0 : _a.postMessage({
                    type: `sw-broadcast-${this.name}`,
                    message,
                });
            }
        }
    }

    const events = globalThis['lbc-events'] || (globalThis['lbc-events'] = new Map());
    function addListener(name, listener) {
        if (events.has(name)) {
            events.get(name).push(listener);
        }
        else {
            events.set(name, [listener]);
        }
    }
    function removeListener(name, listener) {
        const listeners = events.get(name);
        if (listeners) {
            const idx = listeners.indexOf(listener);
            if (idx !== -1) {
                listeners.splice(idx, 1);
            }
        }
    }
    function dispatch(ev) {
        const listeners = events.get(ev.type);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(ev);
                }
                catch (_a) {
                }
            });
        }
    }
    class BroadcastedAndLocalEvent extends rxjs.Observable {
        constructor(name) {
            const bc = typeof BroadcastChannel === "undefined"
                ? new SWBroadcastChannel(name) : new BroadcastChannel(name);
            super(subscriber => {
                function onCustomEvent(ev) {
                    subscriber.next(ev.detail);
                }
                function onMessageEvent(ev) {
                    console.debug("BroadcastedAndLocalEvent: onMessageEvent", ev);
                    subscriber.next(ev.data);
                }
                let unsubscribe;
                //self.addEventListener(`lbc-${name}`, onCustomEvent); // Fails in service workers
                addListener(`lbc-${name}`, onCustomEvent); // Works better in service worker
                try {
                    if (bc instanceof SWBroadcastChannel) {
                        unsubscribe = bc.subscribe(message => subscriber.next(message));
                    }
                    else {
                        console.debug("BroadcastedAndLocalEvent: bc.addEventListener()", name, "bc is a", bc);
                        bc.addEventListener("message", onMessageEvent);
                    }
                }
                catch (err) {
                    // Service workers might fail to subscribe outside its initial script.
                    console.warn('Failed to subscribe to broadcast channel', err);
                }
                return () => {
                    //self.removeEventListener(`lbc-${name}`, onCustomEvent);
                    removeListener(`lbc-${name}`, onCustomEvent);
                    if (bc instanceof SWBroadcastChannel) {
                        unsubscribe();
                    }
                    else {
                        bc.removeEventListener("message", onMessageEvent);
                    }
                };
            });
            this.name = name;
            this.bc = bc;
        }
        next(message) {
            console.debug("BroadcastedAndLocalEvent: bc.postMessage()", Object.assign({}, message), "bc is a", this.bc);
            this.bc.postMessage(message);
            const ev = new CustomEvent(`lbc-${this.name}`, { detail: message });
            //self.dispatchEvent(ev);
            dispatch(ev);
        }
    }

    function computeRealmSetHash(_a) {
        return __awaiter(this, arguments, void 0, function* ({ realms, inviteRealms, }) {
            const data = JSON.stringify([
                ...realms.map((realmId) => ({ realmId, accepted: true })),
                ...inviteRealms.map((realmId) => ({ realmId, accepted: false })),
            ].sort((a, b) => a.realmId < b.realmId ? -1 : a.realmId > b.realmId ? 1 : 0));
            const byteArray = new TextEncoder().encode(data);
            const digestBytes = yield crypto.subtle.digest('SHA-1', byteArray);
            const base64 = b64encode(digestBytes);
            return base64;
        });
    }

    function getSyncableTables(db) {
        return Object.entries(db.cloud.schema || {})
            .filter(([, { markedForSync }]) => markedForSync)
            .map(([tbl]) => db.tables.filter(({ name }) => name === tbl)[0])
            .filter(cloudTableSchema => cloudTableSchema);
    }

    function getMutationTable(tableName) {
        return `$${tableName}_mutations`;
    }

    function getTableFromMutationTable(mutationTable) {
        var _a;
        const tableName = (_a = /^\$(.*)_mutations$/.exec(mutationTable)) === null || _a === void 0 ? void 0 : _a[1];
        if (!tableName)
            throw new Error(`Given mutationTable ${mutationTable} is not correct`);
        return tableName;
    }

    const concat = [].concat;
    function flatten(a) {
        return concat.apply([], a);
    }

    function listClientChanges(mutationTables_1, db_1) {
        return __awaiter(this, arguments, void 0, function* (mutationTables, db, { since = {}, limit = Infinity } = {}) {
            const allMutsOnTables = yield Promise.all(mutationTables.map((mutationTable) => __awaiter(this, void 0, void 0, function* () {
                const tableName = getTableFromMutationTable(mutationTable.name);
                const lastRevision = since[tableName];
                let query = lastRevision
                    ? mutationTable.where('rev').above(lastRevision)
                    : mutationTable;
                if (limit < Infinity)
                    query = query.limit(limit);
                let muts = yield query.toArray();
                muts = canonicalizeToUpdateOps(muts);
                muts = removeRedundantUpdateOps(muts);
                const rv = muts.map((mut) => ({
                    table: tableName,
                    mut,
                }));
                return rv;
            })));
            // Sort by time to get a true order of the operations (between tables)
            const sorted = flatten(allMutsOnTables).sort((a, b) => a.mut.txid === b.mut.txid
                ? a.mut.opNo - b.mut.opNo // Within same transaction, sort by opNo
                : a.mut.ts - b.mut.ts // Different transactions - sort by timestamp when mutation resolved
            );
            const result = [];
            let currentEntry = null;
            let currentTxid = null;
            for (const { table, mut } of sorted) {
                if (currentEntry &&
                    currentEntry.table === table &&
                    currentTxid === mut.txid) {
                    currentEntry.muts.push(mut);
                }
                else {
                    currentEntry = {
                        table,
                        muts: [mut],
                    };
                    currentTxid = mut.txid;
                    result.push(currentEntry);
                }
            }
            // Filter out those tables that doesn't have any mutations:
            return result;
        });
    }
    function removeRedundantUpdateOps(muts) {
        const updateCoverage = new Map();
        for (const mut of muts) {
            if (mut.type === 'update') {
                if (mut.keys.length !== 1 || mut.changeSpecs.length !== 1) {
                    continue; // Don't optimize multi-key updates
                }
                const strKey = '' + mut.keys[0];
                const changeSpecs = mut.changeSpecs[0];
                if (Object.values(changeSpecs).some(v => typeof v === "object" && v && "@@propmod" in v)) {
                    continue; // Cannot optimize if any PropModification is present
                }
                let keyCoverage = updateCoverage.get(strKey);
                if (keyCoverage) {
                    keyCoverage.push({ txid: mut.txid, updateSpec: changeSpecs });
                }
                else {
                    updateCoverage.set(strKey, [{ txid: mut.txid, updateSpec: changeSpecs }]);
                }
            }
        }
        muts = muts.filter(mut => {
            // Only apply optimization to update mutations that are single-key
            if (mut.type !== 'update')
                return true;
            if (mut.keys.length !== 1 || mut.changeSpecs.length !== 1)
                return true;
            // Check if this has PropModifications - if so, skip optimization
            const changeSpecs = mut.changeSpecs[0];
            if (Object.values(changeSpecs).some(v => typeof v === "object" && v && "@@propmod" in v)) {
                return true; // Cannot optimize if any PropModification is present
            }
            // Keep track of properties that aren't overlapped by later transactions
            const unoverlappedProps = new Set(Object.keys(mut.changeSpecs[0]));
            const strKey = '' + mut.keys[0];
            const keyCoverage = updateCoverage.get(strKey);
            if (!keyCoverage)
                return true; // No coverage info - cannot optimize
            for (let i = keyCoverage.length - 1; i >= 0; --i) {
                const { txid, updateSpec } = keyCoverage[i];
                if (txid === mut.txid)
                    break; // Stop when reaching own txid
                // If all changes in updateSpec are covered by all props on all mut.changeSpecs then
                // txid is redundant and can be removed.
                for (const keyPath of Object.keys(updateSpec)) {
                    unoverlappedProps.delete(keyPath);
                }
            }
            if (unoverlappedProps.size === 0) {
                // This operation is completely overlapped by later operations. It can be removed.
                return false;
            }
            return true;
        });
        return muts;
    }
    function canonicalizeToUpdateOps(muts) {
        muts = muts.map(mut => {
            if (mut.type === 'modify' && mut.criteria.index === null) {
                // The criteria is on primary key. Convert to an update operation instead.
                // It is simpler for the server to handle and also more efficient.
                const updateMut = Object.assign(Object.assign({}, mut), { criteria: undefined, changeSpec: undefined, type: 'update', keys: mut.keys, changeSpecs: [mut.changeSpec] });
                delete updateMut.criteria;
                delete updateMut.changeSpec;
                return updateMut;
            }
            return mut;
        });
        return muts;
    }

    function randomString(bytes) {
        const buf = new Uint8Array(bytes);
        if (typeof crypto !== 'undefined') {
            crypto.getRandomValues(buf);
        }
        else {
            for (let i = 0; i < bytes; i++)
                buf[i] = Math.floor(Math.random() * 256);
        }
        if (typeof Buffer !== 'undefined' && Buffer.from) {
            return Buffer.from(buf).toString('base64');
        }
        else if (typeof btoa !== 'undefined') {
            return btoa(String.fromCharCode.apply(null, buf));
        }
        else {
            throw new Error('No btoa or Buffer available');
        }
    }

    function listSyncifiedChanges(tablesToSyncify, currentUser, schema, alreadySyncedRealms) {
        return __awaiter(this, void 0, void 0, function* () {
            const txid = `upload-${randomString(8)}`;
            if (currentUser.isLoggedIn) {
                if (tablesToSyncify.length > 0) {
                    const ignoredRealms = new Set(alreadySyncedRealms || []);
                    const upserts = yield Promise.all(tablesToSyncify.map((table) => __awaiter(this, void 0, void 0, function* () {
                        const { extractKey } = table.core.schema.primaryKey;
                        if (!extractKey)
                            return { table: table.name, muts: [] }; // Outbound tables are not synced.
                        const dexieCloudTableSchema = schema[table.name];
                        const query = (dexieCloudTableSchema === null || dexieCloudTableSchema === void 0 ? void 0 : dexieCloudTableSchema.generatedGlobalId)
                            ? table.filter((item) => {
                                extractKey(item);
                                return (!ignoredRealms.has(item.realmId || '') &&
                                    //(id[0] !== '#' || !!item.$ts) && // Private obj need no sync if not changed
                                    isValidAtID(extractKey(item), dexieCloudTableSchema === null || dexieCloudTableSchema === void 0 ? void 0 : dexieCloudTableSchema.idPrefix));
                            })
                            : table.filter((item) => {
                                const id = extractKey(item);
                                return (!ignoredRealms.has(item.realmId || '') &&
                                    //(id[0] !== '#' || !!item.$ts) && // Private obj need no sync if not changed
                                    isValidSyncableID(id));
                            });
                        const unsyncedObjects = yield query.toArray();
                        if (unsyncedObjects.length > 0) {
                            const mut = {
                                type: 'upsert',
                                values: unsyncedObjects,
                                keys: unsyncedObjects.map(extractKey),
                                userId: currentUser.userId,
                                txid,
                            };
                            return {
                                table: table.name,
                                muts: [mut],
                            };
                        }
                        else {
                            return {
                                table: table.name,
                                muts: [],
                            };
                        }
                    })));
                    return upserts.filter((op) => op.muts.length > 0);
                }
            }
            return [];
        });
    }

    function getTablesToSyncify(db, syncState) {
        const syncedTables = (syncState === null || syncState === void 0 ? void 0 : syncState.syncedTables) || [];
        const syncableTables = getSyncableTables(db);
        const tablesToSyncify = syncableTables.filter((tbl) => !syncedTables.includes(tbl.name));
        return tablesToSyncify;
    }

    const { toString: toStr } = {};
    function getToStringTag(val) {
        return toStr.call(val).slice(8, -1);
    }
    function escapeDollarProps(value) {
        const keys = Object.keys(value);
        let dollarKeys = null;
        for (let i = 0, l = keys.length; i < l; ++i) {
            if (keys[i][0] === "$") {
                dollarKeys = dollarKeys || [];
                dollarKeys.push(keys[i]);
            }
        }
        if (!dollarKeys)
            return value;
        const clone = { ...value };
        for (const k of dollarKeys) {
            delete clone[k];
        }
        for (const k of dollarKeys) {
            clone["$" + k] = value[k];
        }
        return clone;
    }
    const ObjectDef = {
        replace: escapeDollarProps,
    };
    function TypesonSimplified(...typeDefsInputs) {
        const typeDefs = typeDefsInputs.reduce((p, c) => ({ ...p, ...c }), typeDefsInputs.reduce((p, c) => ({ ...c, ...p }), {}));
        const protoMap = new WeakMap();
        return {
            stringify(value, alternateChannel, space) {
                const json = JSON.stringify(value, function (key) {
                    const realVal = this[key];
                    const typeDef = getTypeDef(realVal);
                    return typeDef
                        ? typeDef.replace(realVal, alternateChannel, typeDefs)
                        : realVal;
                }, space);
                return json;
            },
            parse(tson, alternateChannel) {
                const stack = [];
                return JSON.parse(tson, function (key, value) {
                    //
                    // Parent Part
                    //
                    const type = value === null || value === void 0 ? void 0 : value.$t;
                    if (type) {
                        const typeDef = typeDefs[type];
                        value = typeDef
                            ? typeDef.revive(value, alternateChannel, typeDefs)
                            : value;
                    }
                    let top = stack[stack.length - 1];
                    if (top && top[0] === value) {
                        // Do what the kid told us to
                        // Unescape dollar props
                        value = { ...value };
                        // Delete keys that children wanted us to delete
                        for (const k of top[1])
                            delete value[k];
                        // Set keys that children wanted us to set
                        for (const [k, v] of Object.entries(top[2])) {
                            value[k] = v;
                        }
                        stack.pop();
                    }
                    //
                    // Child part
                    //
                    if (value === undefined || (key[0] === "$" && key !== "$t")) {
                        top = stack[stack.length - 1];
                        let deletes;
                        let mods;
                        if (top && top[0] === this) {
                            deletes = top[1];
                            mods = top[2];
                        }
                        else {
                            stack.push([this, (deletes = []), (mods = {})]);
                        }
                        if (key[0] === "$" && key !== "$t") {
                            // Unescape props (also preserves undefined if this is a combo)
                            deletes.push(key);
                            mods[key.substr(1)] = value;
                        }
                        else {
                            // Preserve undefined
                            mods[key] = undefined;
                        }
                    }
                    return value;
                });
            },
        };
        function getTypeDef(realVal) {
            const type = typeof realVal;
            switch (typeof realVal) {
                case "object":
                case "function": {
                    // "object", "function", null
                    if (realVal === null)
                        return null;
                    const proto = Object.getPrototypeOf(realVal);
                    if (!proto)
                        return ObjectDef;
                    let typeDef = protoMap.get(proto);
                    if (typeDef !== undefined)
                        return typeDef; // Null counts to! So the caching of Array.prototype also counts.
                    const toStringTag = getToStringTag(realVal);
                    const entry = Object.entries(typeDefs).find(([typeName, typeDef]) => { var _a, _b; return (_b = (_a = typeDef === null || typeDef === void 0 ? void 0 : typeDef.test) === null || _a === void 0 ? void 0 : _a.call(typeDef, realVal, toStringTag)) !== null && _b !== void 0 ? _b : typeName === toStringTag; });
                    typeDef = entry === null || entry === void 0 ? void 0 : entry[1];
                    if (!typeDef) {
                        typeDef = Array.isArray(realVal)
                            ? null
                            : typeof realVal === "function"
                                ? typeDefs.function || null
                                : ObjectDef;
                    }
                    protoMap.set(proto, typeDef);
                    return typeDef;
                }
                default:
                    return typeDefs[type];
            }
        }
    }

    const BisonBinaryTypes = {
        Blob: {
            test: (blob, toStringTag) => toStringTag === "Blob",
            replace: (blob, altChannel) => {
                const i = altChannel.length;
                altChannel.push(blob);
                return {
                    $t: "Blob",
                    mimeType: blob.type,
                    i,
                };
            },
            revive: ({ i, mimeType }, altChannel) => new Blob([altChannel[i]], { type: mimeType }),
        },
    };

    var numberDef = {
        number: {
            replace: (num) => {
                switch (true) {
                    case isNaN(num):
                        return { $t: "number", v: "NaN" };
                    case num === Infinity:
                        return { $t: "number", v: "Infinity" };
                    case num === -Infinity:
                        return { $t: "number", v: "-Infinity" };
                    default:
                        return num;
                }
            },
            revive: ({ v }) => Number(v),
        },
    };

    const bigIntDef$1 = {
        bigint: {
            replace: (realVal) => {
                return { $t: "bigint", v: "" + realVal };
            },
            revive: (obj) => BigInt(obj.v),
        },
    };

    var DateDef = {
        Date: {
            replace: (date) => ({
                $t: "Date",
                v: isNaN(date.getTime()) ? "NaN" : date.toISOString(),
            }),
            revive: ({ v }) => new Date(v === "NaN" ? NaN : Date.parse(v)),
        },
    };

    var SetDef = {
        Set: {
            replace: (set) => ({
                $t: "Set",
                v: Array.from(set.entries()),
            }),
            revive: ({ v }) => new Set(v),
        },
    };

    var MapDef = {
        Map: {
            replace: (map) => ({
                $t: "Map",
                v: Array.from(map.entries()),
            }),
            revive: ({ v }) => new Map(v),
        },
    };

    const _global = typeof globalThis !== "undefined" // All modern environments (node, bun, deno, browser, workers, webview etc)
        ? globalThis
        : typeof self !== "undefined" // Older browsers, workers, webview, window etc
            ? self
            : typeof global !== "undefined" // Older versions of node
                ? global
                : undefined; // Unsupported environment. No idea to return 'this' since we are in a module or a function scope anyway.

    var TypedArraysDefs = [
        "Int8Array",
        "Uint8Array",
        "Uint8ClampedArray",
        "Int16Array",
        "Uint16Array",
        "Int32Array",
        "Uint32Array",
        "Float32Array",
        "Float64Array",
        "DataView",
        "BigInt64Array",
        "BigUint64Array",
    ].reduce((specs, typeName) => ({
        ...specs,
        [typeName]: {
            // Replace passes the the typed array into $t, buffer so that
            // the ArrayBuffer typedef takes care of further handling of the buffer:
            // {$t:"Uint8Array",buffer:{$t:"ArrayBuffer",idx:0}}
            // CHANGED ABOVE! Now shortcutting that for more sparse format of the typed arrays
            // to contain the b64 property directly.
            replace: (a, _, typeDefs) => {
                const result = {
                    $t: typeName,
                    v: typeDefs.ArrayBuffer.replace(a.byteOffset === 0 && a.byteLength === a.buffer.byteLength
                        ? a.buffer
                        : a.buffer.slice(a.byteOffset, a.byteOffset + a.byteLength), _, typeDefs).v,
                };
                return result;
            },
            revive: ({ v }, _, typeDefs) => {
                const TypedArray = _global[typeName];
                return (TypedArray &&
                    new TypedArray(typeDefs.ArrayBuffer.revive({ v }, _, typeDefs)));
            },
        },
    }), {});

    function b64LexEncode(b) {
        return b64ToLex(b64encode(b));
    }
    function b64LexDecode(b64Lex) {
        return b64decode(lexToB64(b64Lex));
    }
    function b64ToLex(base64) {
        var encoded = "";
        for (var i = 0, length = base64.length; i < length; i++) {
            encoded += ENCODE_TABLE[base64[i]];
        }
        return encoded;
    }
    function lexToB64(base64lex) {
        // only accept string input
        if (typeof base64lex !== "string") {
            throw new Error("invalid decoder input: " + base64lex);
        }
        var base64 = "";
        for (var i = 0, length = base64lex.length; i < length; i++) {
            base64 += DECODE_TABLE[base64lex[i]];
        }
        return base64;
    }
    const DECODE_TABLE = {
        "-": "=",
        "0": "A",
        "1": "B",
        "2": "C",
        "3": "D",
        "4": "E",
        "5": "F",
        "6": "G",
        "7": "H",
        "8": "I",
        "9": "J",
        A: "K",
        B: "L",
        C: "M",
        D: "N",
        E: "O",
        F: "P",
        G: "Q",
        H: "R",
        I: "S",
        J: "T",
        K: "U",
        L: "V",
        M: "W",
        N: "X",
        O: "Y",
        P: "Z",
        Q: "a",
        R: "b",
        S: "c",
        T: "d",
        U: "e",
        V: "f",
        W: "g",
        X: "h",
        Y: "i",
        Z: "j",
        _: "k",
        a: "l",
        b: "m",
        c: "n",
        d: "o",
        e: "p",
        f: "q",
        g: "r",
        h: "s",
        i: "t",
        j: "u",
        k: "v",
        l: "w",
        m: "x",
        n: "y",
        o: "z",
        p: "0",
        q: "1",
        r: "2",
        s: "3",
        t: "4",
        u: "5",
        v: "6",
        w: "7",
        x: "8",
        y: "9",
        z: "+",
        "|": "/",
    };
    const ENCODE_TABLE = {};
    for (const c of Object.keys(DECODE_TABLE)) {
        ENCODE_TABLE[DECODE_TABLE[c]] = c;
    }

    var ArrayBufferDef = {
        ArrayBuffer: {
            replace: (ab) => ({
                $t: "ArrayBuffer",
                v: b64LexEncode(ab),
            }),
            revive: ({ v }) => {
                const ba = b64LexDecode(v);
                return ba.buffer.byteLength === ba.byteLength
                    ? ba.buffer
                    : ba.buffer.slice(ba.byteOffset, ba.byteOffset + ba.byteLength);
            },
        },
    };

    class FakeBlob {
        constructor(buf, type) {
            this.buf = buf;
            this.type = type;
        }
    }

    function readBlobSync(b) {
        const req = new XMLHttpRequest();
        req.overrideMimeType("text/plain; charset=x-user-defined");
        req.open("GET", URL.createObjectURL(b), false); // Sync
        req.send();
        if (req.status !== 200 && req.status !== 0) {
            throw new Error("Bad Blob access: " + req.status);
        }
        return req.responseText;
    }

    function string2ArrayBuffer(str) {
        const array = new Uint8Array(str.length);
        for (let i = 0; i < str.length; ++i) {
            array[i] = str.charCodeAt(i); // & 0xff;
        }
        return array.buffer;
    }

    var BlobDef = {
        Blob: {
            test: (blob, toStringTag) => toStringTag === "Blob" || blob instanceof FakeBlob,
            replace: (blob) => ({
                $t: "Blob",
                v: blob instanceof FakeBlob
                    ? b64encode(blob.buf)
                    : b64encode(string2ArrayBuffer(readBlobSync(blob))),
                type: blob.type,
            }),
            revive: ({ type, v }) => {
                const ab = b64decode(v);
                return typeof Blob !== undefined
                    ? new Blob([ab])
                    : new FakeBlob(ab.buffer, type);
            },
        },
    };

    const builtin = {
        ...numberDef,
        ...bigIntDef$1,
        ...DateDef,
        ...SetDef,
        ...MapDef,
        ...TypedArraysDefs,
        ...ArrayBufferDef,
        ...BlobDef, // Should be moved to another preset for DOM types (or universal? since it supports node as well with FakeBlob)
    };

    function Bison(...typeDefsInputs) {
        const tson = TypesonSimplified(builtin, BisonBinaryTypes, ...typeDefsInputs);
        return {
            toBinary(value) {
                const [blob, json] = this.stringify(value);
                const lenBuf = new ArrayBuffer(4);
                new DataView(lenBuf).setUint32(0, blob.size);
                return new Blob([lenBuf, blob, json]);
            },
            stringify(value) {
                const binaries = [];
                const json = tson.stringify(value, binaries);
                const blob = new Blob(binaries.map((b) => {
                    const lenBuf = new ArrayBuffer(4);
                    new DataView(lenBuf).setUint32(0, "byteLength" in b ? b.byteLength : b.size);
                    return new Blob([lenBuf, b]);
                }));
                return [blob, json];
            },
            async parse(json, binData) {
                let pos = 0;
                const arrayBuffers = [];
                const buf = await readBlobBinary(binData);
                const view = new DataView(buf);
                while (pos < buf.byteLength) {
                    const len = view.getUint32(pos);
                    pos += 4;
                    const ab = buf.slice(pos, pos + len);
                    pos += len;
                    arrayBuffers.push(ab);
                }
                return tson.parse(json, arrayBuffers);
            },
            async fromBinary(blob) {
                const len = new DataView(await readBlobBinary(blob.slice(0, 4))).getUint32(0);
                const binData = blob.slice(4, len + 4);
                const json = await readBlob(blob.slice(len + 4));
                return await this.parse(json, binData);
            },
        };
    }
    function readBlob(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onabort = (ev) => reject(new Error("file read aborted"));
            reader.onerror = (ev) => reject(ev.target.error);
            reader.onload = (ev) => resolve(ev.target.result);
            reader.readAsText(blob);
        });
    }
    function readBlobBinary(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onabort = (ev) => reject(new Error("file read aborted"));
            reader.onerror = (ev) => reject(ev.target.error);
            reader.onload = (ev) => resolve(ev.target.result);
            reader.readAsArrayBuffer(blob);
        });
    }

    /** The undefined type is not part of builtin but can be manually added.
     * The reason for supporting undefined is if the following object should be revived correctly:
     *
     *    {foo: undefined}
     *
     * Without including this typedef, the revived object would just be {}.
     * If including this typedef, the revived object would be {foo: undefined}.
     */
    var undefinedDef = {
        undefined: {
            replace: () => ({
                $t: "undefined"
            }),
            revive: () => undefined,
        },
    };

    var FileDef = {
        File: {
            test: (file, toStringTag) => toStringTag === "File",
            replace: (file) => ({
                $t: "File",
                v: b64encode(string2ArrayBuffer(readBlobSync(file))),
                type: file.type,
                name: file.name,
                lastModified: new Date(file.lastModified).toISOString(),
            }),
            revive: ({ type, v, name, lastModified }) => {
                const ab = b64decode(v);
                return new File([ab], name, {
                    type,
                    lastModified: new Date(lastModified).getTime(),
                });
            },
        },
    };

    // Since server revisions are stored in bigints, we need to handle clients without
    // bigint support to not fail when serverRevision is passed over to client.
    // We need to not fail when reviving it and we need to somehow store the information.
    // Since the revived version will later on be put into indexedDB we have another
    // issue: When reading it back from indexedDB we will get a poco object that we
    // cannot replace correctly when sending it to server. So we will also need
    // to do an explicit workaround in the protocol where a bigint is supported.
    // The workaround should be there regardless if browser supports BigInt or not, because
    // the serverRev might have been stored in IDB before the browser was upgraded to support bigint.
    //
    // if (typeof serverRev.rev !== "bigint")
    //   if (hasBigIntSupport)
    //     serverRev.rev = bigIntDef.bigint.revive(server.rev)
    //   else
    //     serverRev.rev = new FakeBigInt(server.rev)
    const hasBigIntSupport = typeof BigInt === 'function' && typeof BigInt(0) === 'bigint';
    class FakeBigInt {
        toString() {
            return this.v;
        }
        constructor(value) {
            this.v = value;
        }
    }
    const bigIntDef = hasBigIntSupport
        ? {}
        : {
            bigint: {
                test: (val) => val instanceof FakeBigInt,
                replace: (fakeBigInt) => {
                    return Object.assign({ $t: 'bigint' }, fakeBigInt);
                },
                revive: ({ v }) => new FakeBigInt(v),
            },
        };
    const defs = Object.assign(Object.assign(Object.assign(Object.assign({}, undefinedDef), bigIntDef), FileDef), { PropModification: {
            test: (val) => val instanceof Dexie.PropModification,
            replace: (propModification) => {
                return Object.assign({ $t: 'PropModification' }, propModification['@@propmod']);
            },
            revive: (_a) => {
                var { $t } = _a, // strip '$t'
                propModSpec = __rest(_a, ["$t"]) // keep the rest
                ;
                return new Dexie.PropModification(propModSpec);
            },
        } });
    const TSON = TypesonSimplified(builtin, defs);
    const BISON = Bison(defs);

    function encodeIdsForServer(schema, currentUser, changes) {
        const rv = [];
        for (let change of changes) {
            const { table, muts } = change;
            const tableSchema = schema.tables.find((t) => t.name === table);
            if (!tableSchema)
                throw new Error(`Internal error: table ${table} not found in DBCore schema`);
            const { primaryKey } = tableSchema;
            let changeClone = change;
            muts.forEach((mut, mutIndex) => {
                const rewriteValues = !primaryKey.outbound &&
                    (mut.type === 'upsert' || mut.type === 'insert');
                mut.keys.forEach((key, keyIndex) => {
                    if (Array.isArray(key)) {
                        // Server only support string keys. Dexie Cloud client support strings or array of strings.
                        if (changeClone === change)
                            changeClone = cloneChange(change, rewriteValues);
                        const mutClone = changeClone.muts[mutIndex];
                        const rewrittenKey = JSON.stringify(key);
                        mutClone.keys[keyIndex] = rewrittenKey;
                        /* Bug (#1777)
                          We should not rewrite values. It will fail because the key is array and the value is string.
                          Only the keys should be rewritten and it's already done on the server.
                          We should take another round of revieweing how key transformations are being done between
                          client and server and let the server do the key transformations entirely instead now that
                          we have the primary key schema on the server making it possible to do so.
                          if (rewriteValues) {
                          Dexie.setByKeyPath(
                            (mutClone as DBInsertOperation).values[keyIndex],
                            primaryKey.keyPath!,
                            rewrittenKey
                          );
                        }*/
                    }
                    else if (key[0] === '#') {
                        // Private ID - translate!
                        if (changeClone === change)
                            changeClone = cloneChange(change, rewriteValues);
                        const mutClone = changeClone.muts[mutIndex];
                        if (!currentUser.isLoggedIn)
                            throw new Error(`Internal error: Cannot sync private IDs before authenticated`);
                        const rewrittenKey = `${key}:${currentUser.userId}`;
                        mutClone.keys[keyIndex] = rewrittenKey;
                        if (rewriteValues) {
                            Dexie.setByKeyPath(mutClone.values[keyIndex], primaryKey.keyPath, rewrittenKey);
                        }
                    }
                });
            });
            rv.push(changeClone);
        }
        return rv;
    }
    function cloneChange(change, rewriteValues) {
        // clone on demand:
        return Object.assign(Object.assign({}, change), { muts: rewriteValues
                ? change.muts.map((m) => {
                    return (m.type === 'insert' || m.type === 'upsert') && m.values
                        ? Object.assign(Object.assign({}, m), { keys: m.keys.slice(), values: m.values.slice() }) : Object.assign(Object.assign({}, m), { keys: m.keys.slice() });
                })
                : change.muts.map((m) => (Object.assign(Object.assign({}, m), { keys: m.keys.slice() }))) });
    }

    // If we get Ratelimit-Limit and Ratelimit-Remaining where Ratelimit-Remaining is below
    // (Ratelimit-Limit / 2), we should delay the next sync by (Ratelimit-Reset / Ratelimit-Remaining)
    // seconds (given that there is a Ratelimit-Reset header).
    let syncRatelimitDelays = new WeakMap();
    function checkSyncRateLimitDelay(db) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const delatMilliseconds = ((_b = (_a = syncRatelimitDelays.get(db)) === null || _a === void 0 ? void 0 : _a.getTime()) !== null && _b !== void 0 ? _b : 0) - Date.now();
            if (delatMilliseconds > 0) {
                console.debug(`Stalling sync request ${delatMilliseconds} ms to spare ratelimits`);
                yield new Promise(resolve => setTimeout(resolve, delatMilliseconds));
            }
        });
    }
    function updateSyncRateLimitDelays(db, res) {
        const limit = res.headers.get('Ratelimit-Limit');
        const remaining = res.headers.get('Ratelimit-Remaining');
        const reset = res.headers.get('Ratelimit-Reset');
        if (limit && remaining && reset) {
            const limitNum = Number(limit);
            const remainingNum = Math.max(0, Number(remaining));
            const willResetInSeconds = Number(reset);
            if (remainingNum < limitNum / 2) {
                const delay = Math.ceil(willResetInSeconds / (remainingNum + 1));
                syncRatelimitDelays.set(db, new Date(Date.now() + delay * 1000));
                console.debug(`Sync ratelimit delay set to ${delay} seconds`);
            }
            else {
                syncRatelimitDelays.delete(db);
                console.debug(`Sync ratelimit delay cleared`);
            }
        }
    }

    //import {BisonWebStreamReader} from "dreambase-library/dist/typeson-simplified/BisonWebStreamReader";
    function syncWithServer(changes, y, syncState, baseRevs, db, databaseUrl, schema, clientIdentity, currentUser) {
        return __awaiter(this, void 0, void 0, function* () {
            //
            // Push changes to server using fetch
            //
            const headers = {
                Accept: 'application/json, application/x-bison, application/x-bison-stream',
                'Content-Type': 'application/tson',
            };
            const updatedUser = yield loadAccessToken(db);
            /*
            if (updatedUser?.license && changes.length > 0) {
              if (updatedUser.license.status === 'expired') {
                throw new Error(`License has expired`);
              }
              if (updatedUser.license.status === 'deactivated') {
                throw new Error(`License deactivated`);
              }
            }
            */
            const accessToken = updatedUser === null || updatedUser === void 0 ? void 0 : updatedUser.accessToken;
            if (accessToken) {
                headers.Authorization = `Bearer ${accessToken}`;
            }
            const syncRequest = {
                v: 2,
                dbID: syncState === null || syncState === void 0 ? void 0 : syncState.remoteDbId,
                clientIdentity,
                schema: schema || {},
                lastPull: syncState
                    ? {
                        serverRevision: syncState.serverRevision,
                        yServerRevision: syncState.yServerRevision,
                        realms: syncState.realms,
                        inviteRealms: syncState.inviteRealms,
                    }
                    : undefined,
                baseRevs,
                changes: encodeIdsForServer(db.dx.core.schema, currentUser, changes),
                y,
                dxcv: db.cloud.version
            };
            console.debug('Sync request', syncRequest);
            db.syncStateChangedEvent.next({
                phase: 'pushing',
            });
            const body = TSON.stringify(syncRequest);
            const res = yield fetch(`${databaseUrl}/sync`, {
                method: 'post',
                headers,
                credentials: 'include', // For Arr Affinity cookie only, for better Rate-Limit counting only.
                body,
            });
            //const contentLength = Number(res.headers.get('content-length'));
            db.syncStateChangedEvent.next({
                phase: 'pulling',
            });
            updateSyncRateLimitDelays(db, res);
            if (!res.ok) {
                throw new HttpError(res);
            }
            switch (res.headers.get('content-type')) {
                case 'application/x-bison':
                    return BISON.fromBinary(yield res.blob());
                case 'application/x-bison-stream': //return BisonWebStreamReader(BISON, res);
                default:
                case 'application/json': {
                    const text = yield res.text();
                    const syncRes = TSON.parse(text);
                    return syncRes;
                }
            }
        });
    }

    function modifyLocalObjectsWithNewUserId(syncifiedTables, currentUser, alreadySyncedRealms) {
        return __awaiter(this, void 0, void 0, function* () {
            const ignoredRealms = new Set(alreadySyncedRealms || []);
            for (const table of syncifiedTables) {
                if (table.name === "members") {
                    // members
                    yield table.toCollection().modify((member) => {
                        if (!ignoredRealms.has(member.realmId) && (!member.userId || member.userId === UNAUTHORIZED_USER.userId)) {
                            member.userId = currentUser.userId;
                        }
                    });
                }
                else if (table.name === "roles") ;
                else if (table.name === "realms") {
                    // realms
                    yield table.toCollection().modify((realm) => {
                        if (!ignoredRealms.has(realm.realmId) && (realm.owner === undefined || realm.owner === UNAUTHORIZED_USER.userId)) {
                            realm.owner = currentUser.userId;
                        }
                    });
                }
                else {
                    // application entities
                    yield table.toCollection().modify((obj) => {
                        if (!obj.realmId || !ignoredRealms.has(obj.realmId)) {
                            if (!obj.owner || obj.owner === UNAUTHORIZED_USER.userId)
                                obj.owner = currentUser.userId;
                            if (!obj.realmId || obj.realmId === UNAUTHORIZED_USER.userId) {
                                obj.realmId = currentUser.userId;
                            }
                        }
                    });
                }
            }
        });
    }

    function throwIfCancelled(cancelToken) {
        if (cancelToken === null || cancelToken === void 0 ? void 0 : cancelToken.cancelled)
            throw new Dexie.AbortError(`Operation was cancelled`);
    }

    /* Need this because navigator.onLine seems to say "false" when it is actually online.
      This function relies initially on navigator.onLine but then uses online and offline events
      which seem to be more reliable.
    */
    let isOnline = false;
    if (typeof self !== 'undefined' && typeof navigator !== 'undefined') {
        isOnline = navigator.onLine;
        self.addEventListener('online', () => isOnline = true);
        self.addEventListener('offline', () => isOnline = false);
    }

    function updateBaseRevs(db, schema, latestRevisions, serverRev) {
        return __awaiter(this, void 0, void 0, function* () {
            yield db.$baseRevs.bulkPut(Object.keys(schema)
                .filter((table) => schema[table].markedForSync)
                .map((tableName) => {
                const lastClientRevOnPreviousServerRev = latestRevisions[tableName] || 0;
                return {
                    tableName,
                    clientRev: lastClientRevOnPreviousServerRev + 1,
                    serverRev,
                };
            }));
            // Clean up baseRevs for tables that do not exist anymore or are no longer marked for sync
            // Resolve #2168 by also cleaning up baseRevs for tables that are not marked for sync
            yield db.$baseRevs.where('tableName').noneOf(Object.keys(schema).filter((table) => schema[table].markedForSync)).delete();
        });
    }

    function getLatestRevisionsPerTable(clientChangeSet, lastRevisions = {}) {
        for (const { table, muts } of clientChangeSet) {
            const lastRev = muts.length > 0 ? muts[muts.length - 1].rev : null;
            lastRevisions[table] = lastRev || lastRevisions[table] || 0;
        }
        return lastRevisions;
    }

    function bulkUpdate(table, keys, changeSpecs) {
        return __awaiter(this, void 0, void 0, function* () {
            const objs = yield table.bulkGet(keys);
            const resultKeys = [];
            const resultObjs = [];
            keys.forEach((key, idx) => {
                const obj = objs[idx];
                if (obj) {
                    for (const [keyPath, value] of Object.entries(changeSpecs[idx])) {
                        if (keyPath === table.schema.primKey.keyPath) {
                            if (Dexie.cmp(value, key) !== 0) {
                                throw new Error(`Cannot change primary key`);
                            }
                        }
                        else {
                            Dexie.setByKeyPath(obj, keyPath, value);
                        }
                    }
                    resultKeys.push(key);
                    resultObjs.push(obj);
                }
            });
            yield (table.schema.primKey.keyPath == null
                ? table.bulkPut(resultObjs, resultKeys)
                : table.bulkPut(resultObjs));
        });
    }

    function applyServerChanges(changes, db) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('Applying server changes', changes, Dexie.currentTransaction);
            for (const { table: tableName, muts } of changes) {
                if (!db.dx._allTables[tableName]) {
                    console.debug(`Server sent changes for table ${tableName} that we don't have. Ignoring.`);
                    continue;
                }
                const table = db.table(tableName);
                const { primaryKey } = table.core.schema;
                const keyDecoder = (key) => {
                    switch (key[0]) {
                        case '[':
                            // Decode JSON array
                            if (key.endsWith(']'))
                                try {
                                    // On server, array keys are transformed to JSON string representation
                                    return JSON.parse(key);
                                }
                                catch (_a) { }
                            return key;
                        case '#':
                            // Decode private ID (do the opposite from what's done in encodeIdsForServer())
                            if (key.endsWith(':' + db.cloud.currentUserId)) {
                                return key.substr(0, key.length - db.cloud.currentUserId.length - 1);
                            }
                            return key;
                        default:
                            return key;
                    }
                };
                for (const mut of muts) {
                    const keys = mut.keys.map(keyDecoder);
                    switch (mut.type) {
                        case 'insert':
                            if (primaryKey.outbound) {
                                yield table.bulkAdd(mut.values, keys);
                            }
                            else {
                                keys.forEach((key, i) => {
                                    // Make sure inbound keys are consistent
                                    Dexie.setByKeyPath(mut.values[i], primaryKey.keyPath, key);
                                });
                                yield table.bulkAdd(mut.values);
                            }
                            break;
                        case 'upsert':
                            if (primaryKey.outbound) {
                                yield table.bulkPut(mut.values, keys);
                            }
                            else {
                                keys.forEach((key, i) => {
                                    // Make sure inbound keys are consistent
                                    Dexie.setByKeyPath(mut.values[i], primaryKey.keyPath, key);
                                });
                                yield table.bulkPut(mut.values);
                            }
                            break;
                        case 'modify':
                            if (keys.length === 1) {
                                yield table.update(keys[0], mut.changeSpec);
                            }
                            else {
                                yield table.where(':id').anyOf(keys).modify(mut.changeSpec);
                            }
                            break;
                        case 'update':
                            yield bulkUpdate(table, keys, mut.changeSpecs);
                            break;
                        case 'delete':
                            yield table.bulkDelete(keys);
                            break;
                    }
                }
            }
        });
    }

    const DEXIE_CLOUD_SYNCER_ID = 'dexie-cloud-syncer';

    function listUpdatesSince(yTable, sinceIncluding) {
        return yTable
            .where('i')
            .between(sinceIncluding, Infinity, true)
            .toArray();
    }

    /**
     * Utility module to work with key-value stores.
     *
     * @module map
     */

    /**
     * Creates a new Map instance.
     *
     * @function
     * @return {Map<any, any>}
     *
     * @function
     */
    const create$3 = () => new Map();

    /**
     * Copy a Map object into a fresh Map object.
     *
     * @function
     * @template K,V
     * @param {Map<K,V>} m
     * @return {Map<K,V>}
     */
    const copy = m => {
      const r = create$3();
      m.forEach((v, k) => { r.set(k, v); });
      return r
    };

    /**
     * Get map property. Create T if property is undefined and set T on map.
     *
     * ```js
     * const listeners = map.setIfUndefined(events, 'eventName', set.create)
     * listeners.add(listener)
     * ```
     *
     * @function
     * @template {Map<any, any>} MAP
     * @template {MAP extends Map<any,infer V> ? function():V : unknown} CF
     * @param {MAP} map
     * @param {MAP extends Map<infer K,any> ? K : unknown} key
     * @param {CF} createT
     * @return {ReturnType<CF>}
     */
    const setIfUndefined = (map, key, createT) => {
      let set = map.get(key);
      if (set === undefined) {
        map.set(key, set = createT());
      }
      return set
    };

    /**
     * Creates an Array and populates it with the content of all key-value pairs using the `f(value, key)` function.
     *
     * @function
     * @template K
     * @template V
     * @template R
     * @param {Map<K,V>} m
     * @param {function(V,K):R} f
     * @return {Array<R>}
     */
    const map = (m, f) => {
      const res = [];
      for (const [key, value] of m) {
        res.push(f(value, key));
      }
      return res
    };

    /**
     * Tests whether any key-value pairs pass the test implemented by `f(value, key)`.
     *
     * @todo should rename to some - similarly to Array.some
     *
     * @function
     * @template K
     * @template V
     * @param {Map<K,V>} m
     * @param {function(V,K):boolean} f
     * @return {boolean}
     */
    const any = (m, f) => {
      for (const [key, value] of m) {
        if (f(value, key)) {
          return true
        }
      }
      return false
    };

    /**
     * Observable class prototype.
     *
     * @module observable
     */


    /**
     * Handles named events.
     * @experimental
     *
     * This is basically a (better typed) duplicate of Observable, which will replace Observable in the
     * next release.
     *
     * @template {{[key in keyof EVENTS]: function(...any):void}} EVENTS
     */
    class ObservableV2 {
      constructor () {
        /**
         * Some desc.
         * @type {Map<string, Set<any>>}
         */
        this._observers = create$3();
      }

      /**
       * @template {keyof EVENTS & string} NAME
       * @param {NAME} name
       * @param {EVENTS[NAME]} f
       */
      on (name, f) {
        setIfUndefined(this._observers, /** @type {string} */ (name), create$5).add(f);
        return f
      }

      /**
       * @template {keyof EVENTS & string} NAME
       * @param {NAME} name
       * @param {EVENTS[NAME]} f
       */
      once (name, f) {
        /**
         * @param  {...any} args
         */
        const _f = (...args) => {
          this.off(name, /** @type {any} */ (_f));
          f(...args);
        };
        this.on(name, /** @type {any} */ (_f));
      }

      /**
       * @template {keyof EVENTS & string} NAME
       * @param {NAME} name
       * @param {EVENTS[NAME]} f
       */
      off (name, f) {
        const observers = this._observers.get(name);
        if (observers !== undefined) {
          observers.delete(f);
          if (observers.size === 0) {
            this._observers.delete(name);
          }
        }
      }

      /**
       * Emit a named event. All registered event listeners that listen to the
       * specified name will receive the event.
       *
       * @todo This should catch exceptions
       *
       * @template {keyof EVENTS & string} NAME
       * @param {NAME} name The event name.
       * @param {Parameters<EVENTS[NAME]>} args The arguments that are applied to the event listener.
       */
      emit (name, args) {
        // copy all listeners to an array first to make sure that no event is emitted to listeners that are subscribed while the event handler is called.
        return from((this._observers.get(name) || create$3()).values()).forEach(f => f(...args))
      }

      destroy () {
        this._observers = create$3();
      }
    }

    /* c8 ignore start */
    /**
     * Handles named events.
     *
     * @deprecated
     * @template N
     */
    class Observable {
      constructor () {
        /**
         * Some desc.
         * @type {Map<N, any>}
         */
        this._observers = create$3();
      }

      /**
       * @param {N} name
       * @param {function} f
       */
      on (name, f) {
        setIfUndefined(this._observers, name, create$5).add(f);
      }

      /**
       * @param {N} name
       * @param {function} f
       */
      once (name, f) {
        /**
         * @param  {...any} args
         */
        const _f = (...args) => {
          this.off(name, _f);
          f(...args);
        };
        this.on(name, _f);
      }

      /**
       * @param {N} name
       * @param {function} f
       */
      off (name, f) {
        const observers = this._observers.get(name);
        if (observers !== undefined) {
          observers.delete(f);
          if (observers.size === 0) {
            this._observers.delete(name);
          }
        }
      }

      /**
       * Emit a named event. All registered event listeners that listen to the
       * specified name will receive the event.
       *
       * @todo This should catch exceptions
       *
       * @param {N} name The event name.
       * @param {Array<any>} args The arguments that are applied to the event listener.
       */
      emit (name, args) {
        // copy all listeners to an array first to make sure that no event is emitted to listeners that are subscribed while the event handler is called.
        return from((this._observers.get(name) || create$3()).values()).forEach(f => f(...args))
      }

      destroy () {
        this._observers = create$3();
      }
    }
    /* c8 ignore end */

    /* eslint-env browser */

    const getRandomValues = crypto.getRandomValues.bind(crypto);

    /**
     * Isomorphic module for true random numbers / buffers / uuids.
     *
     * Attention: falls back to Math.random if the browser does not support crypto.
     *
     * @module random
     */


    const uint32 = () => getRandomValues(new Uint32Array(1))[0];

    // @ts-ignore
    const uuidv4Template = [1e7] + -1e3 + -4e3 + -8e3 + -1e11;

    /**
     * @return {string}
     */
    const uuidv4 = () => uuidv4Template.replace(/[018]/g, /** @param {number} c */ c =>
      (c ^ uint32() & 15 >> c / 4).toString(16)
    );

    /**
     * Utility module to work with time.
     *
     * @module time
     */


    /**
     * Return current unix time.
     *
     * @return {number}
     */
    const getUnixTime = Date.now;

    /**
     * Utility helpers to work with promises.
     *
     * @module promise
     */


    /**
     * @template T
     * @callback PromiseResolve
     * @param {T|PromiseLike<T>} [result]
     */

    /**
     * @template T
     * @param {function(PromiseResolve<T>,function(Error):void):any} f
     * @return {Promise<T>}
     */
    const create$2 = f => /** @type {Promise<T>} */ (new Promise(f));

    /**
     * `Promise.all` wait for all promises in the array to resolve and return the result
     * @template {unknown[] | []} PS
     *
     * @param {PS} ps
     * @return {Promise<{ -readonly [P in keyof PS]: Awaited<PS[P]> }>}
     */
    Promise.all.bind(Promise);

    /**
     * Often used conditions.
     *
     * @module conditions
     */

    /**
     * @template T
     * @param {T|null|undefined} v
     * @return {T|null}
     */
    /* c8 ignore next */
    const undefinedToNull = v => v === undefined ? null : v;

    /* eslint-env browser */

    /**
     * Isomorphic variable storage.
     *
     * Uses LocalStorage in the browser and falls back to in-memory storage.
     *
     * @module storage
     */

    /* c8 ignore start */
    class VarStoragePolyfill {
      constructor () {
        this.map = new Map();
      }

      /**
       * @param {string} key
       * @param {any} newValue
       */
      setItem (key, newValue) {
        this.map.set(key, newValue);
      }

      /**
       * @param {string} key
       */
      getItem (key) {
        return this.map.get(key)
      }
    }
    /* c8 ignore stop */

    /**
     * @type {any}
     */
    let _localStorage = new VarStoragePolyfill();
    let usePolyfill = true;

    /* c8 ignore start */
    try {
      // if the same-origin rule is violated, accessing localStorage might thrown an error
      if (typeof localStorage !== 'undefined' && localStorage) {
        _localStorage = localStorage;
        usePolyfill = false;
      }
    } catch (e) { }
    /* c8 ignore stop */

    /**
     * This is basically localStorage in browser, or a polyfill in nodejs
     */
    /* c8 ignore next */
    const varStorage = _localStorage;

    /**
     * Utility functions for working with EcmaScript objects.
     *
     * @module object
     */


    /**
     * Object.assign
     */
    const assign = Object.assign;

    /**
     * @param {Object<string,any>} obj
     */
    const keys = Object.keys;

    /**
     * @template V
     * @param {{[k:string]:V}} obj
     * @param {function(V,string):any} f
     */
    const forEach = (obj, f) => {
      for (const key in obj) {
        f(obj[key], key);
      }
    };

    /**
     * @deprecated use object.size instead
     * @param {Object<string,any>} obj
     * @return {number}
     */
    const length = obj => keys(obj).length;

    /**
     * @param {Object<string,any>} obj
     * @return {number}
     */
    const size = obj => keys(obj).length;

    /**
     * @param {Object|null|undefined} obj
     */
    const isEmpty = obj => {
      // eslint-disable-next-line no-unreachable-loop
      for (const _k in obj) {
        return false
      }
      return true
    };

    /**
     * @template {{ [key:string|number|symbol]: any }} T
     * @param {T} obj
     * @param {(v:T[keyof T],k:keyof T)=>boolean} f
     * @return {boolean}
     */
    const every = (obj, f) => {
      for (const key in obj) {
        if (!f(obj[key], key)) {
          return false
        }
      }
      return true
    };

    /**
     * Calls `Object.prototype.hasOwnProperty`.
     *
     * @param {any} obj
     * @param {string|number|symbol} key
     * @return {boolean}
     */
    const hasProperty = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

    /**
     * @param {Object<string,any>} a
     * @param {Object<string,any>} b
     * @return {boolean}
     */
    const equalFlat = (a, b) => a === b || (size(a) === size(b) && every(a, (val, key) => (val !== undefined || hasProperty(b, key)) && b[key] === val));

    /**
     * Make an object immutable. This hurts performance and is usually not needed if you perform good
     * coding practices.
     */
    const freeze = Object.freeze;

    /**
     * Make an object and all its children immutable.
     * This *really* hurts performance and is usually not needed if you perform good coding practices.
     *
     * @template {any} T
     * @param {T} o
     * @return {Readonly<T>}
     */
    const deepFreeze = (o) => {
      for (const key in o) {
        const c = o[key];
        if (typeof c === 'object' || typeof c === 'function') {
          deepFreeze(o[key]);
        }
      }
      return freeze(o)
    };

    const EqualityTraitSymbol = Symbol('Equality');

    /**
     * @typedef {{ [EqualityTraitSymbol]:(other:EqualityTrait)=>boolean }} EqualityTrait
     */

    /**
     * Common functions and function call helpers.
     *
     * @module function
     */


    /**
     * Calls all functions in `fs` with args. Only throws after all functions were called.
     *
     * @param {Array<function>} fs
     * @param {Array<any>} args
     */
    const callAll = (fs, args, i = 0) => {
      try {
        for (; i < fs.length; i++) {
          fs[i](...args);
        }
      } finally {
        if (i < fs.length) {
          callAll(fs, args, i + 1);
        }
      }
    };

    /* c8 ignore start */

    /**
     * @param {any} a
     * @param {any} b
     * @return {boolean}
     */
    const equalityDeep = (a, b) => {
      if (a === b) {
        return true
      }
      if (a == null || b == null || a.constructor !== b.constructor) {
        return false
      }
      if (a[EqualityTraitSymbol] != null) {
        return a[EqualityTraitSymbol](b)
      }
      switch (a.constructor) {
        case ArrayBuffer:
          a = new Uint8Array(a);
          b = new Uint8Array(b);
        // eslint-disable-next-line no-fallthrough
        case Uint8Array: {
          if (a.byteLength !== b.byteLength) {
            return false
          }
          for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) {
              return false
            }
          }
          break
        }
        case Set: {
          if (a.size !== b.size) {
            return false
          }
          for (const value of a) {
            if (!b.has(value)) {
              return false
            }
          }
          break
        }
        case Map: {
          if (a.size !== b.size) {
            return false
          }
          for (const key of a.keys()) {
            if (!b.has(key) || !equalityDeep(a.get(key), b.get(key))) {
              return false
            }
          }
          break
        }
        case Object:
          if (length(a) !== length(b)) {
            return false
          }
          for (const key in a) {
            if (!hasProperty(a, key) || !equalityDeep(a[key], b[key])) {
              return false
            }
          }
          break
        case Array:
          if (a.length !== b.length) {
            return false
          }
          for (let i = 0; i < a.length; i++) {
            if (!equalityDeep(a[i], b[i])) {
              return false
            }
          }
          break
        default:
          return false
      }
      return true
    };

    /**
     * @template V
     * @template {V} OPTS
     *
     * @param {V} value
     * @param {Array<OPTS>} options
     */
    // @ts-ignore
    const isOneOf = (value, options) => options.includes(value);

    /**
     * Isomorphic module to work access the environment (query params, env variables).
     *
     * @module environment
     */


    /* c8 ignore next 2 */
    // @ts-ignore
    const isNode = typeof process !== 'undefined' && process.release && /node|io\.js/.test(process.release.name) && Object.prototype.toString.call(typeof process !== 'undefined' ? process : 0) === '[object process]';

    /**
     * @type {Map<string,string>}
     */
    let params;

    /* c8 ignore start */
    const computeParams = () => {
      if (params === undefined) {
        if (isNode) {
          params = create$3();
          const pargs = process.argv;
          let currParamName = null;
          for (let i = 0; i < pargs.length; i++) {
            const parg = pargs[i];
            if (parg[0] === '-') {
              if (currParamName !== null) {
                params.set(currParamName, '');
              }
              currParamName = parg;
            } else {
              if (currParamName !== null) {
                params.set(currParamName, parg);
                currParamName = null;
              }
            }
          }
          if (currParamName !== null) {
            params.set(currParamName, '');
          }
          // in ReactNative for example this would not be true (unless connected to the Remote Debugger)
        } else if (typeof location === 'object') {
          params = create$3(); // eslint-disable-next-line no-undef
          (location.search || '?').slice(1).split('&').forEach((kv) => {
            if (kv.length !== 0) {
              const [key, value] = kv.split('=');
              params.set(`--${fromCamelCase(key, '-')}`, value);
              params.set(`-${fromCamelCase(key, '-')}`, value);
            }
          });
        } else {
          params = create$3();
        }
      }
      return params
    };
    /* c8 ignore stop */

    /**
     * @param {string} name
     * @return {boolean}
     */
    /* c8 ignore next */
    const hasParam = (name) => computeParams().has(name);

    /**
     * @param {string} name
     * @return {string|null}
     */
    /* c8 ignore next 4 */
    const getVariable = (name) =>
      isNode
        ? undefinedToNull(process.env[name.toUpperCase().replaceAll('-', '_')])
        : undefinedToNull(varStorage.getItem(name));

    /**
     * @param {string} name
     * @return {boolean}
     */
    /* c8 ignore next 2 */
    const hasConf = (name) =>
      hasParam('--' + name) || getVariable(name) !== null;

    /* c8 ignore next */
    hasConf('production');

    /* c8 ignore next 2 */
    const forceColor = isNode &&
      isOneOf(process.env.FORCE_COLOR, ['true', '1', '2']);

    /* c8 ignore start */
    /**
     * Color is enabled by default if the terminal supports it.
     *
     * Explicitly enable color using `--color` parameter
     * Disable color using `--no-color` parameter or using `NO_COLOR=1` environment variable.
     * `FORCE_COLOR=1` enables color and takes precedence over all.
     */
    const supportsColor = forceColor || (
      !hasParam('--no-colors') && // @todo deprecate --no-colors
      !hasConf('no-color') &&
      (!isNode || process.stdout.isTTY) && (
        !isNode ||
        hasParam('--color') ||
        getVariable('COLORTERM') !== null ||
        (getVariable('TERM') || '').includes('color')
      )
    );
    /* c8 ignore stop */

    /**
     * Working with value pairs.
     *
     * @module pair
     */

    /**
     * @template L,R
     */
    class Pair {
      /**
       * @param {L} left
       * @param {R} right
       */
      constructor (left, right) {
        this.left = left;
        this.right = right;
      }
    }

    /**
     * @template L,R
     * @param {L} left
     * @param {R} right
     * @return {Pair<L,R>}
     */
    const create$1 = (left, right) => new Pair(left, right);

    /* eslint-env browser */


    /** @type {DOMParser} */ (typeof DOMParser !== 'undefined' ? new DOMParser() : null);

    /**
     * @param {Map<string,string>} m
     * @return {string}
     */
    const mapToStyleString = m => map(m, (value, key) => `${key}:${value};`).join('');
    /* c8 ignore stop */

    /**
     * Utility module to work with EcmaScript Symbols.
     *
     * @module symbol
     */

    /**
     * Return fresh symbol.
     */
    const create = Symbol;

    const BOLD = create();
    const UNBOLD = create();
    const BLUE = create();
    const GREY = create();
    const GREEN = create();
    const RED = create();
    const PURPLE = create();
    const ORANGE = create();
    const UNCOLOR = create();

    /* c8 ignore start */
    /**
     * @param {Array<undefined|string|Symbol|Object|number|function():any>} args
     * @return {Array<string|object|number|undefined>}
     */
    const computeNoColorLoggingArgs = args => {
      if (args.length === 1 && args[0]?.constructor === Function) {
        args = /** @type {Array<string|Symbol|Object|number>} */ (/** @type {[function]} */ (args)[0]());
      }
      const strBuilder = [];
      const logArgs = [];
      // try with formatting until we find something unsupported
      let i = 0;
      for (; i < args.length; i++) {
        const arg = args[i];
        if (arg === undefined) {
          break
        } else if (arg.constructor === String || arg.constructor === Number) {
          strBuilder.push(arg);
        } else if (arg.constructor === Object) {
          break
        }
      }
      if (i > 0) {
        // create logArgs with what we have so far
        logArgs.push(strBuilder.join(''));
      }
      // append the rest
      for (; i < args.length; i++) {
        const arg = args[i];
        if (!(arg instanceof Symbol)) {
          logArgs.push(arg);
        }
      }
      return logArgs
    };
    /* c8 ignore stop */

    /**
     * Isomorphic logging module with support for colors!
     *
     * @module logging
     */


    /**
     * @type {Object<Symbol,pair.Pair<string,string>>}
     */
    const _browserStyleMap = {
      [BOLD]: create$1('font-weight', 'bold'),
      [UNBOLD]: create$1('font-weight', 'normal'),
      [BLUE]: create$1('color', 'blue'),
      [GREEN]: create$1('color', 'green'),
      [GREY]: create$1('color', 'grey'),
      [RED]: create$1('color', 'red'),
      [PURPLE]: create$1('color', 'purple'),
      [ORANGE]: create$1('color', 'orange'), // not well supported in chrome when debugging node with inspector - TODO: deprecate
      [UNCOLOR]: create$1('color', 'black')
    };

    /**
     * @param {Array<string|Symbol|Object|number|function():any>} args
     * @return {Array<string|object|number>}
     */
    /* c8 ignore start */
    const computeBrowserLoggingArgs = (args) => {
      if (args.length === 1 && args[0]?.constructor === Function) {
        args = /** @type {Array<string|Symbol|Object|number>} */ (/** @type {[function]} */ (args)[0]());
      }
      const strBuilder = [];
      const styles = [];
      const currentStyle = create$3();
      /**
       * @type {Array<string|Object|number>}
       */
      let logArgs = [];
      // try with formatting until we find something unsupported
      let i = 0;
      for (; i < args.length; i++) {
        const arg = args[i];
        // @ts-ignore
        const style = _browserStyleMap[arg];
        if (style !== undefined) {
          currentStyle.set(style.left, style.right);
        } else {
          if (arg === undefined) {
            break
          }
          if (arg.constructor === String || arg.constructor === Number) {
            const style = mapToStyleString(currentStyle);
            if (i > 0 || style.length > 0) {
              strBuilder.push('%c' + arg);
              styles.push(style);
            } else {
              strBuilder.push(arg);
            }
          } else {
            break
          }
        }
      }
      if (i > 0) {
        // create logArgs with what we have so far
        logArgs = styles;
        logArgs.unshift(strBuilder.join(''));
      }
      // append the rest
      for (; i < args.length; i++) {
        const arg = args[i];
        if (!(arg instanceof Symbol)) {
          logArgs.push(arg);
        }
      }
      return logArgs
    };
    /* c8 ignore stop */

    /* c8 ignore start */
    const computeLoggingArgs = supportsColor
      ? computeBrowserLoggingArgs
      : computeNoColorLoggingArgs;
    /* c8 ignore stop */

    /**
     * @param {Array<string|Symbol|Object|number>} args
     */
    const print = (...args) => {
      console.log(...computeLoggingArgs(args));
      /* c8 ignore next */
      vconsoles.forEach((vc) => vc.print(args));
    };

    /* c8 ignore start */
    /**
     * @param {Array<string|Symbol|Object|number>} args
     */
    const warn = (...args) => {
      console.warn(...computeLoggingArgs(args));
      args.unshift(ORANGE);
      vconsoles.forEach((vc) => vc.print(args));
    };

    const vconsoles = create$5();

    /**
     * Utility module to create and manipulate Iterators.
     *
     * @module iterator
     */


    /**
     * @template T
     * @param {function():IteratorResult<T>} next
     * @return {IterableIterator<T>}
     */
    const createIterator = next => ({
      /**
       * @return {IterableIterator<T>}
       */
      [Symbol.iterator] () {
        return this
      },
      // @ts-ignore
      next
    });

    /**
     * @template T
     * @param {Iterator<T>} iterator
     * @param {function(T):boolean} filter
     */
    const iteratorFilter = (iterator, filter) => createIterator(() => {
      let res;
      do {
        res = iterator.next();
      } while (!res.done && !filter(res.value))
      return res
    });

    /**
     * @template T,M
     * @param {Iterator<T>} iterator
     * @param {function(T):M} fmap
     */
    const iteratorMap = (iterator, fmap) => createIterator(() => {
      const { done, value } = iterator.next();
      return { done, value: done ? undefined : fmap(value) }
    });

    class DeleteItem {
      /**
       * @param {number} clock
       * @param {number} len
       */
      constructor (clock, len) {
        /**
         * @type {number}
         */
        this.clock = clock;
        /**
         * @type {number}
         */
        this.len = len;
      }
    }

    /**
     * We no longer maintain a DeleteStore. DeleteSet is a temporary object that is created when needed.
     * - When created in a transaction, it must only be accessed after sorting, and merging
     *   - This DeleteSet is send to other clients
     * - We do not create a DeleteSet when we send a sync message. The DeleteSet message is created directly from StructStore
     * - We read a DeleteSet as part of a sync/update message. In this case the DeleteSet is already sorted and merged.
     */
    class DeleteSet {
      constructor () {
        /**
         * @type {Map<number,Array<DeleteItem>>}
         */
        this.clients = new Map();
      }
    }

    /**
     * Iterate over all structs that the DeleteSet gc's.
     *
     * @param {Transaction} transaction
     * @param {DeleteSet} ds
     * @param {function(GC|Item):void} f
     *
     * @function
     */
    const iterateDeletedStructs = (transaction, ds, f) =>
      ds.clients.forEach((deletes, clientid) => {
        const structs = /** @type {Array<GC|Item>} */ (transaction.doc.store.clients.get(clientid));
        if (structs != null) {
          const lastStruct = structs[structs.length - 1];
          const clockState = lastStruct.id.clock + lastStruct.length;
          for (let i = 0, del = deletes[i]; i < deletes.length && del.clock < clockState; del = deletes[++i]) {
            iterateStructs(transaction, structs, del.clock, del.len, f);
          }
        }
      });

    /**
     * @param {Array<DeleteItem>} dis
     * @param {number} clock
     * @return {number|null}
     *
     * @private
     * @function
     */
    const findIndexDS = (dis, clock) => {
      let left = 0;
      let right = dis.length - 1;
      while (left <= right) {
        const midindex = floor((left + right) / 2);
        const mid = dis[midindex];
        const midclock = mid.clock;
        if (midclock <= clock) {
          if (clock < midclock + mid.len) {
            return midindex
          }
          left = midindex + 1;
        } else {
          right = midindex - 1;
        }
      }
      return null
    };

    /**
     * @param {DeleteSet} ds
     * @param {ID} id
     * @return {boolean}
     *
     * @private
     * @function
     */
    const isDeleted = (ds, id) => {
      const dis = ds.clients.get(id.client);
      return dis !== undefined && findIndexDS(dis, id.clock) !== null
    };

    /**
     * @param {DeleteSet} ds
     *
     * @private
     * @function
     */
    const sortAndMergeDeleteSet = ds => {
      ds.clients.forEach(dels => {
        dels.sort((a, b) => a.clock - b.clock);
        // merge items without filtering or splicing the array
        // i is the current pointer
        // j refers to the current insert position for the pointed item
        // try to merge dels[i] into dels[j-1] or set dels[j]=dels[i]
        let i, j;
        for (i = 1, j = 1; i < dels.length; i++) {
          const left = dels[j - 1];
          const right = dels[i];
          if (left.clock + left.len >= right.clock) {
            left.len = max(left.len, right.clock + right.len - left.clock);
          } else {
            if (j < i) {
              dels[j] = right;
            }
            j++;
          }
        }
        dels.length = j;
      });
    };

    /**
     * @param {Array<DeleteSet>} dss
     * @return {DeleteSet} A fresh DeleteSet
     */
    const mergeDeleteSets = dss => {
      const merged = new DeleteSet();
      for (let dssI = 0; dssI < dss.length; dssI++) {
        dss[dssI].clients.forEach((delsLeft, client) => {
          if (!merged.clients.has(client)) {
            // Write all missing keys from current ds and all following.
            // If merged already contains `client` current ds has already been added.
            /**
             * @type {Array<DeleteItem>}
             */
            const dels = delsLeft.slice();
            for (let i = dssI + 1; i < dss.length; i++) {
              appendTo(dels, dss[i].clients.get(client) || []);
            }
            merged.clients.set(client, dels);
          }
        });
      }
      sortAndMergeDeleteSet(merged);
      return merged
    };

    /**
     * @param {DeleteSet} ds
     * @param {number} client
     * @param {number} clock
     * @param {number} length
     *
     * @private
     * @function
     */
    const addToDeleteSet = (ds, client, clock, length) => {
      setIfUndefined(ds.clients, client, () => /** @type {Array<DeleteItem>} */ ([])).push(new DeleteItem(clock, length));
    };

    /**
     * @param {DSEncoderV1 | DSEncoderV2} encoder
     * @param {DeleteSet} ds
     *
     * @private
     * @function
     */
    const writeDeleteSet = (encoder, ds) => {
      writeVarUint(encoder.restEncoder, ds.clients.size);

      // Ensure that the delete set is written in a deterministic order
      from(ds.clients.entries())
        .sort((a, b) => b[0] - a[0])
        .forEach(([client, dsitems]) => {
          encoder.resetDsCurVal();
          writeVarUint(encoder.restEncoder, client);
          const len = dsitems.length;
          writeVarUint(encoder.restEncoder, len);
          for (let i = 0; i < len; i++) {
            const item = dsitems[i];
            encoder.writeDsClock(item.clock);
            encoder.writeDsLen(item.len);
          }
        });
    };

    /**
     * @param {DSDecoderV1 | DSDecoderV2} decoder
     * @return {DeleteSet}
     *
     * @private
     * @function
     */
    const readDeleteSet = decoder => {
      const ds = new DeleteSet();
      const numClients = readVarUint(decoder.restDecoder);
      for (let i = 0; i < numClients; i++) {
        decoder.resetDsCurVal();
        const client = readVarUint(decoder.restDecoder);
        const numberOfDeletes = readVarUint(decoder.restDecoder);
        if (numberOfDeletes > 0) {
          const dsField = setIfUndefined(ds.clients, client, () => /** @type {Array<DeleteItem>} */ ([]));
          for (let i = 0; i < numberOfDeletes; i++) {
            dsField.push(new DeleteItem(decoder.readDsClock(), decoder.readDsLen()));
          }
        }
      }
      return ds
    };

    /**
     * @todo YDecoder also contains references to String and other Decoders. Would make sense to exchange YDecoder.toUint8Array for YDecoder.DsToUint8Array()..
     */

    /**
     * @param {DSDecoderV1 | DSDecoderV2} decoder
     * @param {Transaction} transaction
     * @param {StructStore} store
     * @return {Uint8Array|null} Returns a v2 update containing all deletes that couldn't be applied yet; or null if all deletes were applied successfully.
     *
     * @private
     * @function
     */
    const readAndApplyDeleteSet = (decoder, transaction, store) => {
      const unappliedDS = new DeleteSet();
      const numClients = readVarUint(decoder.restDecoder);
      for (let i = 0; i < numClients; i++) {
        decoder.resetDsCurVal();
        const client = readVarUint(decoder.restDecoder);
        const numberOfDeletes = readVarUint(decoder.restDecoder);
        const structs = store.clients.get(client) || [];
        const state = getState(store, client);
        for (let i = 0; i < numberOfDeletes; i++) {
          const clock = decoder.readDsClock();
          const clockEnd = clock + decoder.readDsLen();
          if (clock < state) {
            if (state < clockEnd) {
              addToDeleteSet(unappliedDS, client, state, clockEnd - state);
            }
            let index = findIndexSS(structs, clock);
            /**
             * We can ignore the case of GC and Delete structs, because we are going to skip them
             * @type {Item}
             */
            // @ts-ignore
            let struct = structs[index];
            // split the first item if necessary
            if (!struct.deleted && struct.id.clock < clock) {
              structs.splice(index + 1, 0, splitItem(transaction, struct, clock - struct.id.clock));
              index++; // increase we now want to use the next struct
            }
            while (index < structs.length) {
              // @ts-ignore
              struct = structs[index++];
              if (struct.id.clock < clockEnd) {
                if (!struct.deleted) {
                  if (clockEnd < struct.id.clock + struct.length) {
                    structs.splice(index, 0, splitItem(transaction, struct, clockEnd - struct.id.clock));
                  }
                  struct.delete(transaction);
                }
              } else {
                break
              }
            }
          } else {
            addToDeleteSet(unappliedDS, client, clock, clockEnd - clock);
          }
        }
      }
      if (unappliedDS.clients.size > 0) {
        const ds = new UpdateEncoderV2();
        writeVarUint(ds.restEncoder, 0); // encode 0 structs
        writeDeleteSet(ds, unappliedDS);
        return ds.toUint8Array()
      }
      return null
    };

    /**
     * @module Y
     */


    const generateNewClientId = uint32;

    /**
     * @typedef {Object} DocOpts
     * @property {boolean} [DocOpts.gc=true] Disable garbage collection (default: gc=true)
     * @property {function(Item):boolean} [DocOpts.gcFilter] Will be called before an Item is garbage collected. Return false to keep the Item.
     * @property {string} [DocOpts.guid] Define a globally unique identifier for this document
     * @property {string | null} [DocOpts.collectionid] Associate this document with a collection. This only plays a role if your provider has a concept of collection.
     * @property {any} [DocOpts.meta] Any kind of meta information you want to associate with this document. If this is a subdocument, remote peers will store the meta information as well.
     * @property {boolean} [DocOpts.autoLoad] If a subdocument, automatically load document. If this is a subdocument, remote peers will load the document as well automatically.
     * @property {boolean} [DocOpts.shouldLoad] Whether the document should be synced by the provider now. This is toggled to true when you call ydoc.load()
     */

    /**
     * @typedef {Object} DocEvents
     * @property {function(Doc):void} DocEvents.destroy
     * @property {function(Doc):void} DocEvents.load
     * @property {function(boolean, Doc):void} DocEvents.sync
     * @property {function(Uint8Array, any, Doc, Transaction):void} DocEvents.update
     * @property {function(Uint8Array, any, Doc, Transaction):void} DocEvents.updateV2
     * @property {function(Doc):void} DocEvents.beforeAllTransactions
     * @property {function(Transaction, Doc):void} DocEvents.beforeTransaction
     * @property {function(Transaction, Doc):void} DocEvents.beforeObserverCalls
     * @property {function(Transaction, Doc):void} DocEvents.afterTransaction
     * @property {function(Transaction, Doc):void} DocEvents.afterTransactionCleanup
     * @property {function(Doc, Array<Transaction>):void} DocEvents.afterAllTransactions
     * @property {function({ loaded: Set<Doc>, added: Set<Doc>, removed: Set<Doc> }, Doc, Transaction):void} DocEvents.subdocs
     */

    /**
     * A Yjs instance handles the state of shared data.
     * @extends ObservableV2<DocEvents>
     */
    class Doc extends ObservableV2 {
      /**
       * @param {DocOpts} opts configuration
       */
      constructor ({ guid = uuidv4(), collectionid = null, gc = true, gcFilter = () => true, meta = null, autoLoad = false, shouldLoad = true } = {}) {
        super();
        this.gc = gc;
        this.gcFilter = gcFilter;
        this.clientID = generateNewClientId();
        this.guid = guid;
        this.collectionid = collectionid;
        /**
         * @type {Map<string, AbstractType<YEvent<any>>>}
         */
        this.share = new Map();
        this.store = new StructStore();
        /**
         * @type {Transaction | null}
         */
        this._transaction = null;
        /**
         * @type {Array<Transaction>}
         */
        this._transactionCleanups = [];
        /**
         * @type {Set<Doc>}
         */
        this.subdocs = new Set();
        /**
         * If this document is a subdocument - a document integrated into another document - then _item is defined.
         * @type {Item?}
         */
        this._item = null;
        this.shouldLoad = shouldLoad;
        this.autoLoad = autoLoad;
        this.meta = meta;
        /**
         * This is set to true when the persistence provider loaded the document from the database or when the `sync` event fires.
         * Note that not all providers implement this feature. Provider authors are encouraged to fire the `load` event when the doc content is loaded from the database.
         *
         * @type {boolean}
         */
        this.isLoaded = false;
        /**
         * This is set to true when the connection provider has successfully synced with a backend.
         * Note that when using peer-to-peer providers this event may not provide very useful.
         * Also note that not all providers implement this feature. Provider authors are encouraged to fire
         * the `sync` event when the doc has been synced (with `true` as a parameter) or if connection is
         * lost (with false as a parameter).
         */
        this.isSynced = false;
        this.isDestroyed = false;
        /**
         * Promise that resolves once the document has been loaded from a persistence provider.
         */
        this.whenLoaded = create$2(resolve => {
          this.on('load', () => {
            this.isLoaded = true;
            resolve(this);
          });
        });
        const provideSyncedPromise = () => create$2(resolve => {
          /**
           * @param {boolean} isSynced
           */
          const eventHandler = (isSynced) => {
            if (isSynced === undefined || isSynced === true) {
              this.off('sync', eventHandler);
              resolve();
            }
          };
          this.on('sync', eventHandler);
        });
        this.on('sync', isSynced => {
          if (isSynced === false && this.isSynced) {
            this.whenSynced = provideSyncedPromise();
          }
          this.isSynced = isSynced === undefined || isSynced === true;
          if (this.isSynced && !this.isLoaded) {
            this.emit('load', [this]);
          }
        });
        /**
         * Promise that resolves once the document has been synced with a backend.
         * This promise is recreated when the connection is lost.
         * Note the documentation about the `isSynced` property.
         */
        this.whenSynced = provideSyncedPromise();
      }

      /**
       * Notify the parent document that you request to load data into this subdocument (if it is a subdocument).
       *
       * `load()` might be used in the future to request any provider to load the most current data.
       *
       * It is safe to call `load()` multiple times.
       */
      load () {
        const item = this._item;
        if (item !== null && !this.shouldLoad) {
          transact(/** @type {any} */ (item.parent).doc, transaction => {
            transaction.subdocsLoaded.add(this);
          }, null, true);
        }
        this.shouldLoad = true;
      }

      getSubdocs () {
        return this.subdocs
      }

      getSubdocGuids () {
        return new Set(from(this.subdocs).map(doc => doc.guid))
      }

      /**
       * Changes that happen inside of a transaction are bundled. This means that
       * the observer fires _after_ the transaction is finished and that all changes
       * that happened inside of the transaction are sent as one message to the
       * other peers.
       *
       * @template T
       * @param {function(Transaction):T} f The function that should be executed as a transaction
       * @param {any} [origin] Origin of who started the transaction. Will be stored on transaction.origin
       * @return T
       *
       * @public
       */
      transact (f, origin = null) {
        return transact(this, f, origin)
      }

      /**
       * Define a shared data type.
       *
       * Multiple calls of `ydoc.get(name, TypeConstructor)` yield the same result
       * and do not overwrite each other. I.e.
       * `ydoc.get(name, Y.Array) === ydoc.get(name, Y.Array)`
       *
       * After this method is called, the type is also available on `ydoc.share.get(name)`.
       *
       * *Best Practices:*
       * Define all types right after the Y.Doc instance is created and store them in a separate object.
       * Also use the typed methods `getText(name)`, `getArray(name)`, ..
       *
       * @template {typeof AbstractType<any>} Type
       * @example
       *   const ydoc = new Y.Doc(..)
       *   const appState = {
       *     document: ydoc.getText('document')
       *     comments: ydoc.getArray('comments')
       *   }
       *
       * @param {string} name
       * @param {Type} TypeConstructor The constructor of the type definition. E.g. Y.Text, Y.Array, Y.Map, ...
       * @return {InstanceType<Type>} The created type. Constructed with TypeConstructor
       *
       * @public
       */
      get (name, TypeConstructor = /** @type {any} */ (AbstractType)) {
        const type = setIfUndefined(this.share, name, () => {
          // @ts-ignore
          const t = new TypeConstructor();
          t._integrate(this, null);
          return t
        });
        const Constr = type.constructor;
        if (TypeConstructor !== AbstractType && Constr !== TypeConstructor) {
          if (Constr === AbstractType) {
            // @ts-ignore
            const t = new TypeConstructor();
            t._map = type._map;
            type._map.forEach(/** @param {Item?} n */ n => {
              for (; n !== null; n = n.left) {
                // @ts-ignore
                n.parent = t;
              }
            });
            t._start = type._start;
            for (let n = t._start; n !== null; n = n.right) {
              n.parent = t;
            }
            t._length = type._length;
            this.share.set(name, t);
            t._integrate(this, null);
            return /** @type {InstanceType<Type>} */ (t)
          } else {
            throw new Error(`Type with the name ${name} has already been defined with a different constructor`)
          }
        }
        return /** @type {InstanceType<Type>} */ (type)
      }

      /**
       * @template T
       * @param {string} [name]
       * @return {YArray<T>}
       *
       * @public
       */
      getArray (name = '') {
        return /** @type {YArray<T>} */ (this.get(name, YArray))
      }

      /**
       * @param {string} [name]
       * @return {YText}
       *
       * @public
       */
      getText (name = '') {
        return this.get(name, YText)
      }

      /**
       * @template T
       * @param {string} [name]
       * @return {YMap<T>}
       *
       * @public
       */
      getMap (name = '') {
        return /** @type {YMap<T>} */ (this.get(name, YMap))
      }

      /**
       * @param {string} [name]
       * @return {YXmlElement}
       *
       * @public
       */
      getXmlElement (name = '') {
        return /** @type {YXmlElement<{[key:string]:string}>} */ (this.get(name, YXmlElement))
      }

      /**
       * @param {string} [name]
       * @return {YXmlFragment}
       *
       * @public
       */
      getXmlFragment (name = '') {
        return this.get(name, YXmlFragment)
      }

      /**
       * Converts the entire document into a js object, recursively traversing each yjs type
       * Doesn't log types that have not been defined (using ydoc.getType(..)).
       *
       * @deprecated Do not use this method and rather call toJSON directly on the shared types.
       *
       * @return {Object<string, any>}
       */
      toJSON () {
        /**
         * @type {Object<string, any>}
         */
        const doc = {};

        this.share.forEach((value, key) => {
          doc[key] = value.toJSON();
        });

        return doc
      }

      /**
       * Emit `destroy` event and unregister all event handlers.
       */
      destroy () {
        this.isDestroyed = true;
        from(this.subdocs).forEach(subdoc => subdoc.destroy());
        const item = this._item;
        if (item !== null) {
          this._item = null;
          const content = /** @type {ContentDoc} */ (item.content);
          content.doc = new Doc({ guid: this.guid, ...content.opts, shouldLoad: false });
          content.doc._item = item;
          transact(/** @type {any} */ (item).parent.doc, transaction => {
            const doc = content.doc;
            if (!item.deleted) {
              transaction.subdocsAdded.add(doc);
            }
            transaction.subdocsRemoved.add(this);
          }, null, true);
        }
        // @ts-ignore
        this.emit('destroyed', [true]); // DEPRECATED!
        this.emit('destroy', [this]);
        super.destroy();
      }
    }

    class DSDecoderV2 {
      /**
       * @param {decoding.Decoder} decoder
       */
      constructor (decoder) {
        /**
         * @private
         */
        this.dsCurrVal = 0;
        this.restDecoder = decoder;
      }

      resetDsCurVal () {
        this.dsCurrVal = 0;
      }

      /**
       * @return {number}
       */
      readDsClock () {
        this.dsCurrVal += readVarUint(this.restDecoder);
        return this.dsCurrVal
      }

      /**
       * @return {number}
       */
      readDsLen () {
        const diff = readVarUint(this.restDecoder) + 1;
        this.dsCurrVal += diff;
        return diff
      }
    }

    class UpdateDecoderV2 extends DSDecoderV2 {
      /**
       * @param {decoding.Decoder} decoder
       */
      constructor (decoder) {
        super(decoder);
        /**
         * List of cached keys. If the keys[id] does not exist, we read a new key
         * from stringEncoder and push it to keys.
         *
         * @type {Array<string>}
         */
        this.keys = [];
        readVarUint(decoder); // read feature flag - currently unused
        this.keyClockDecoder = new IntDiffOptRleDecoder(readVarUint8Array(decoder));
        this.clientDecoder = new UintOptRleDecoder(readVarUint8Array(decoder));
        this.leftClockDecoder = new IntDiffOptRleDecoder(readVarUint8Array(decoder));
        this.rightClockDecoder = new IntDiffOptRleDecoder(readVarUint8Array(decoder));
        this.infoDecoder = new RleDecoder(readVarUint8Array(decoder), readUint8);
        this.stringDecoder = new StringDecoder(readVarUint8Array(decoder));
        this.parentInfoDecoder = new RleDecoder(readVarUint8Array(decoder), readUint8);
        this.typeRefDecoder = new UintOptRleDecoder(readVarUint8Array(decoder));
        this.lenDecoder = new UintOptRleDecoder(readVarUint8Array(decoder));
      }

      /**
       * @return {ID}
       */
      readLeftID () {
        return new ID(this.clientDecoder.read(), this.leftClockDecoder.read())
      }

      /**
       * @return {ID}
       */
      readRightID () {
        return new ID(this.clientDecoder.read(), this.rightClockDecoder.read())
      }

      /**
       * Read the next client id.
       * Use this in favor of readID whenever possible to reduce the number of objects created.
       */
      readClient () {
        return this.clientDecoder.read()
      }

      /**
       * @return {number} info An unsigned 8-bit integer
       */
      readInfo () {
        return /** @type {number} */ (this.infoDecoder.read())
      }

      /**
       * @return {string}
       */
      readString () {
        return this.stringDecoder.read()
      }

      /**
       * @return {boolean}
       */
      readParentInfo () {
        return this.parentInfoDecoder.read() === 1
      }

      /**
       * @return {number} An unsigned 8-bit integer
       */
      readTypeRef () {
        return this.typeRefDecoder.read()
      }

      /**
       * Write len of a struct - well suited for Opt RLE encoder.
       *
       * @return {number}
       */
      readLen () {
        return this.lenDecoder.read()
      }

      /**
       * @return {any}
       */
      readAny () {
        return readAny(this.restDecoder)
      }

      /**
       * @return {Uint8Array}
       */
      readBuf () {
        return readVarUint8Array(this.restDecoder)
      }

      /**
       * This is mainly here for legacy purposes.
       *
       * Initial we incoded objects using JSON. Now we use the much faster lib0/any-encoder. This method mainly exists for legacy purposes for the v1 encoder.
       *
       * @return {any}
       */
      readJSON () {
        return readAny(this.restDecoder)
      }

      /**
       * @return {string}
       */
      readKey () {
        const keyClock = this.keyClockDecoder.read();
        if (keyClock < this.keys.length) {
          return this.keys[keyClock]
        } else {
          const key = this.stringDecoder.read();
          this.keys.push(key);
          return key
        }
      }
    }

    class DSEncoderV1 {
      constructor () {
        this.restEncoder = createEncoder();
      }

      toUint8Array () {
        return toUint8Array(this.restEncoder)
      }

      resetDsCurVal () {
        // nop
      }

      /**
       * @param {number} clock
       */
      writeDsClock (clock) {
        writeVarUint(this.restEncoder, clock);
      }

      /**
       * @param {number} len
       */
      writeDsLen (len) {
        writeVarUint(this.restEncoder, len);
      }
    }

    class UpdateEncoderV1 extends DSEncoderV1 {
      /**
       * @param {ID} id
       */
      writeLeftID (id) {
        writeVarUint(this.restEncoder, id.client);
        writeVarUint(this.restEncoder, id.clock);
      }

      /**
       * @param {ID} id
       */
      writeRightID (id) {
        writeVarUint(this.restEncoder, id.client);
        writeVarUint(this.restEncoder, id.clock);
      }

      /**
       * Use writeClient and writeClock instead of writeID if possible.
       * @param {number} client
       */
      writeClient (client) {
        writeVarUint(this.restEncoder, client);
      }

      /**
       * @param {number} info An unsigned 8-bit integer
       */
      writeInfo (info) {
        writeUint8(this.restEncoder, info);
      }

      /**
       * @param {string} s
       */
      writeString (s) {
        writeVarString(this.restEncoder, s);
      }

      /**
       * @param {boolean} isYKey
       */
      writeParentInfo (isYKey) {
        writeVarUint(this.restEncoder, isYKey ? 1 : 0);
      }

      /**
       * @param {number} info An unsigned 8-bit integer
       */
      writeTypeRef (info) {
        writeVarUint(this.restEncoder, info);
      }

      /**
       * Write len of a struct - well suited for Opt RLE encoder.
       *
       * @param {number} len
       */
      writeLen (len) {
        writeVarUint(this.restEncoder, len);
      }

      /**
       * @param {any} any
       */
      writeAny (any) {
        writeAny(this.restEncoder, any);
      }

      /**
       * @param {Uint8Array} buf
       */
      writeBuf (buf) {
        writeVarUint8Array(this.restEncoder, buf);
      }

      /**
       * @param {any} embed
       */
      writeJSON (embed) {
        writeVarString(this.restEncoder, JSON.stringify(embed));
      }

      /**
       * @param {string} key
       */
      writeKey (key) {
        writeVarString(this.restEncoder, key);
      }
    }

    class DSEncoderV2 {
      constructor () {
        this.restEncoder = createEncoder(); // encodes all the rest / non-optimized
        this.dsCurrVal = 0;
      }

      toUint8Array () {
        return toUint8Array(this.restEncoder)
      }

      resetDsCurVal () {
        this.dsCurrVal = 0;
      }

      /**
       * @param {number} clock
       */
      writeDsClock (clock) {
        const diff = clock - this.dsCurrVal;
        this.dsCurrVal = clock;
        writeVarUint(this.restEncoder, diff);
      }

      /**
       * @param {number} len
       */
      writeDsLen (len) {
        if (len === 0) {
          unexpectedCase();
        }
        writeVarUint(this.restEncoder, len - 1);
        this.dsCurrVal += len;
      }
    }

    class UpdateEncoderV2 extends DSEncoderV2 {
      constructor () {
        super();
        /**
         * @type {Map<string,number>}
         */
        this.keyMap = new Map();
        /**
         * Refers to the next unique key-identifier to me used.
         * See writeKey method for more information.
         *
         * @type {number}
         */
        this.keyClock = 0;
        this.keyClockEncoder = new IntDiffOptRleEncoder();
        this.clientEncoder = new UintOptRleEncoder();
        this.leftClockEncoder = new IntDiffOptRleEncoder();
        this.rightClockEncoder = new IntDiffOptRleEncoder();
        this.infoEncoder = new RleEncoder(writeUint8);
        this.stringEncoder = new StringEncoder();
        this.parentInfoEncoder = new RleEncoder(writeUint8);
        this.typeRefEncoder = new UintOptRleEncoder();
        this.lenEncoder = new UintOptRleEncoder();
      }

      toUint8Array () {
        const encoder = createEncoder();
        writeVarUint(encoder, 0); // this is a feature flag that we might use in the future
        writeVarUint8Array(encoder, this.keyClockEncoder.toUint8Array());
        writeVarUint8Array(encoder, this.clientEncoder.toUint8Array());
        writeVarUint8Array(encoder, this.leftClockEncoder.toUint8Array());
        writeVarUint8Array(encoder, this.rightClockEncoder.toUint8Array());
        writeVarUint8Array(encoder, toUint8Array(this.infoEncoder));
        writeVarUint8Array(encoder, this.stringEncoder.toUint8Array());
        writeVarUint8Array(encoder, toUint8Array(this.parentInfoEncoder));
        writeVarUint8Array(encoder, this.typeRefEncoder.toUint8Array());
        writeVarUint8Array(encoder, this.lenEncoder.toUint8Array());
        // @note The rest encoder is appended! (note the missing var)
        writeUint8Array(encoder, toUint8Array(this.restEncoder));
        return toUint8Array(encoder)
      }

      /**
       * @param {ID} id
       */
      writeLeftID (id) {
        this.clientEncoder.write(id.client);
        this.leftClockEncoder.write(id.clock);
      }

      /**
       * @param {ID} id
       */
      writeRightID (id) {
        this.clientEncoder.write(id.client);
        this.rightClockEncoder.write(id.clock);
      }

      /**
       * @param {number} client
       */
      writeClient (client) {
        this.clientEncoder.write(client);
      }

      /**
       * @param {number} info An unsigned 8-bit integer
       */
      writeInfo (info) {
        this.infoEncoder.write(info);
      }

      /**
       * @param {string} s
       */
      writeString (s) {
        this.stringEncoder.write(s);
      }

      /**
       * @param {boolean} isYKey
       */
      writeParentInfo (isYKey) {
        this.parentInfoEncoder.write(isYKey ? 1 : 0);
      }

      /**
       * @param {number} info An unsigned 8-bit integer
       */
      writeTypeRef (info) {
        this.typeRefEncoder.write(info);
      }

      /**
       * Write len of a struct - well suited for Opt RLE encoder.
       *
       * @param {number} len
       */
      writeLen (len) {
        this.lenEncoder.write(len);
      }

      /**
       * @param {any} any
       */
      writeAny (any) {
        writeAny(this.restEncoder, any);
      }

      /**
       * @param {Uint8Array} buf
       */
      writeBuf (buf) {
        writeVarUint8Array(this.restEncoder, buf);
      }

      /**
       * This is mainly here for legacy purposes.
       *
       * Initial we incoded objects using JSON. Now we use the much faster lib0/any-encoder. This method mainly exists for legacy purposes for the v1 encoder.
       *
       * @param {any} embed
       */
      writeJSON (embed) {
        writeAny(this.restEncoder, embed);
      }

      /**
       * Property keys are often reused. For example, in y-prosemirror the key `bold` might
       * occur very often. For a 3d application, the key `position` might occur very often.
       *
       * We cache these keys in a Map and refer to them via a unique number.
       *
       * @param {string} key
       */
      writeKey (key) {
        const clock = this.keyMap.get(key);
        if (clock === undefined) {
          /**
           * @todo uncomment to introduce this feature finally
           *
           * Background. The ContentFormat object was always encoded using writeKey, but the decoder used to use readString.
           * Furthermore, I forgot to set the keyclock. So everything was working fine.
           *
           * However, this feature here is basically useless as it is not being used (it actually only consumes extra memory).
           *
           * I don't know yet how to reintroduce this feature..
           *
           * Older clients won't be able to read updates when we reintroduce this feature. So this should probably be done using a flag.
           *
           */
          // this.keyMap.set(key, this.keyClock)
          this.keyClockEncoder.write(this.keyClock++);
          this.stringEncoder.write(key);
        } else {
          this.keyClockEncoder.write(clock);
        }
      }
    }

    /**
     * @module encoding
     */
    /*
     * We use the first five bits in the info flag for determining the type of the struct.
     *
     * 0: GC
     * 1: Item with Deleted content
     * 2: Item with JSON content
     * 3: Item with Binary content
     * 4: Item with String content
     * 5: Item with Embed content (for richtext content)
     * 6: Item with Format content (a formatting marker for richtext content)
     * 7: Item with Type
     */


    /**
     * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
     * @param {Array<GC|Item>} structs All structs by `client`
     * @param {number} client
     * @param {number} clock write structs starting with `ID(client,clock)`
     *
     * @function
     */
    const writeStructs = (encoder, structs, client, clock) => {
      // write first id
      clock = max(clock, structs[0].id.clock); // make sure the first id exists
      const startNewStructs = findIndexSS(structs, clock);
      // write # encoded structs
      writeVarUint(encoder.restEncoder, structs.length - startNewStructs);
      encoder.writeClient(client);
      writeVarUint(encoder.restEncoder, clock);
      const firstStruct = structs[startNewStructs];
      // write first struct with an offset
      firstStruct.write(encoder, clock - firstStruct.id.clock);
      for (let i = startNewStructs + 1; i < structs.length; i++) {
        structs[i].write(encoder, 0);
      }
    };

    /**
     * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
     * @param {StructStore} store
     * @param {Map<number,number>} _sm
     *
     * @private
     * @function
     */
    const writeClientsStructs = (encoder, store, _sm) => {
      // we filter all valid _sm entries into sm
      const sm = new Map();
      _sm.forEach((clock, client) => {
        // only write if new structs are available
        if (getState(store, client) > clock) {
          sm.set(client, clock);
        }
      });
      getStateVector(store).forEach((_clock, client) => {
        if (!_sm.has(client)) {
          sm.set(client, 0);
        }
      });
      // write # states that were updated
      writeVarUint(encoder.restEncoder, sm.size);
      // Write items with higher client ids first
      // This heavily improves the conflict algorithm.
      from(sm.entries()).sort((a, b) => b[0] - a[0]).forEach(([client, clock]) => {
        writeStructs(encoder, /** @type {Array<GC|Item>} */ (store.clients.get(client)), client, clock);
      });
    };

    /**
     * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder The decoder object to read data from.
     * @param {Doc} doc
     * @return {Map<number, { i: number, refs: Array<Item | GC> }>}
     *
     * @private
     * @function
     */
    const readClientsStructRefs = (decoder, doc) => {
      /**
       * @type {Map<number, { i: number, refs: Array<Item | GC> }>}
       */
      const clientRefs = create$3();
      const numOfStateUpdates = readVarUint(decoder.restDecoder);
      for (let i = 0; i < numOfStateUpdates; i++) {
        const numberOfStructs = readVarUint(decoder.restDecoder);
        /**
         * @type {Array<GC|Item>}
         */
        const refs = new Array(numberOfStructs);
        const client = decoder.readClient();
        let clock = readVarUint(decoder.restDecoder);
        // const start = performance.now()
        clientRefs.set(client, { i: 0, refs });
        for (let i = 0; i < numberOfStructs; i++) {
          const info = decoder.readInfo();
          switch (BITS5 & info) {
            case 0: { // GC
              const len = decoder.readLen();
              refs[i] = new GC(createID(client, clock), len);
              clock += len;
              break
            }
            case 10: { // Skip Struct (nothing to apply)
              // @todo we could reduce the amount of checks by adding Skip struct to clientRefs so we know that something is missing.
              const len = readVarUint(decoder.restDecoder);
              refs[i] = new Skip(createID(client, clock), len);
              clock += len;
              break
            }
            default: { // Item with content
              /**
               * The optimized implementation doesn't use any variables because inlining variables is faster.
               * Below a non-optimized version is shown that implements the basic algorithm with
               * a few comments
               */
              const cantCopyParentInfo = (info & (BIT7 | BIT8)) === 0;
              // If parent = null and neither left nor right are defined, then we know that `parent` is child of `y`
              // and we read the next string as parentYKey.
              // It indicates how we store/retrieve parent from `y.share`
              // @type {string|null}
              const struct = new Item(
                createID(client, clock),
                null, // left
                (info & BIT8) === BIT8 ? decoder.readLeftID() : null, // origin
                null, // right
                (info & BIT7) === BIT7 ? decoder.readRightID() : null, // right origin
                cantCopyParentInfo ? (decoder.readParentInfo() ? doc.get(decoder.readString()) : decoder.readLeftID()) : null, // parent
                cantCopyParentInfo && (info & BIT6) === BIT6 ? decoder.readString() : null, // parentSub
                readItemContent(decoder, info) // item content
              );
              /* A non-optimized implementation of the above algorithm:

              // The item that was originally to the left of this item.
              const origin = (info & binary.BIT8) === binary.BIT8 ? decoder.readLeftID() : null
              // The item that was originally to the right of this item.
              const rightOrigin = (info & binary.BIT7) === binary.BIT7 ? decoder.readRightID() : null
              const cantCopyParentInfo = (info & (binary.BIT7 | binary.BIT8)) === 0
              const hasParentYKey = cantCopyParentInfo ? decoder.readParentInfo() : false
              // If parent = null and neither left nor right are defined, then we know that `parent` is child of `y`
              // and we read the next string as parentYKey.
              // It indicates how we store/retrieve parent from `y.share`
              // @type {string|null}
              const parentYKey = cantCopyParentInfo && hasParentYKey ? decoder.readString() : null

              const struct = new Item(
                createID(client, clock),
                null, // left
                origin, // origin
                null, // right
                rightOrigin, // right origin
                cantCopyParentInfo && !hasParentYKey ? decoder.readLeftID() : (parentYKey !== null ? doc.get(parentYKey) : null), // parent
                cantCopyParentInfo && (info & binary.BIT6) === binary.BIT6 ? decoder.readString() : null, // parentSub
                readItemContent(decoder, info) // item content
              )
              */
              refs[i] = struct;
              clock += struct.length;
            }
          }
        }
        // console.log('time to read: ', performance.now() - start) // @todo remove
      }
      return clientRefs
    };

    /**
     * Resume computing structs generated by struct readers.
     *
     * While there is something to do, we integrate structs in this order
     * 1. top element on stack, if stack is not empty
     * 2. next element from current struct reader (if empty, use next struct reader)
     *
     * If struct causally depends on another struct (ref.missing), we put next reader of
     * `ref.id.client` on top of stack.
     *
     * At some point we find a struct that has no causal dependencies,
     * then we start emptying the stack.
     *
     * It is not possible to have circles: i.e. struct1 (from client1) depends on struct2 (from client2)
     * depends on struct3 (from client1). Therefore the max stack size is equal to `structReaders.length`.
     *
     * This method is implemented in a way so that we can resume computation if this update
     * causally depends on another update.
     *
     * @param {Transaction} transaction
     * @param {StructStore} store
     * @param {Map<number, { i: number, refs: (GC | Item)[] }>} clientsStructRefs
     * @return { null | { update: Uint8Array, missing: Map<number,number> } }
     *
     * @private
     * @function
     */
    const integrateStructs = (transaction, store, clientsStructRefs) => {
      /**
       * @type {Array<Item | GC>}
       */
      const stack = [];
      // sort them so that we take the higher id first, in case of conflicts the lower id will probably not conflict with the id from the higher user.
      let clientsStructRefsIds = from(clientsStructRefs.keys()).sort((a, b) => a - b);
      if (clientsStructRefsIds.length === 0) {
        return null
      }
      const getNextStructTarget = () => {
        if (clientsStructRefsIds.length === 0) {
          return null
        }
        let nextStructsTarget = /** @type {{i:number,refs:Array<GC|Item>}} */ (clientsStructRefs.get(clientsStructRefsIds[clientsStructRefsIds.length - 1]));
        while (nextStructsTarget.refs.length === nextStructsTarget.i) {
          clientsStructRefsIds.pop();
          if (clientsStructRefsIds.length > 0) {
            nextStructsTarget = /** @type {{i:number,refs:Array<GC|Item>}} */ (clientsStructRefs.get(clientsStructRefsIds[clientsStructRefsIds.length - 1]));
          } else {
            return null
          }
        }
        return nextStructsTarget
      };
      let curStructsTarget = getNextStructTarget();
      if (curStructsTarget === null) {
        return null
      }

      /**
       * @type {StructStore}
       */
      const restStructs = new StructStore();
      const missingSV = new Map();
      /**
       * @param {number} client
       * @param {number} clock
       */
      const updateMissingSv = (client, clock) => {
        const mclock = missingSV.get(client);
        if (mclock == null || mclock > clock) {
          missingSV.set(client, clock);
        }
      };
      /**
       * @type {GC|Item}
       */
      let stackHead = /** @type {any} */ (curStructsTarget).refs[/** @type {any} */ (curStructsTarget).i++];
      // caching the state because it is used very often
      const state = new Map();

      const addStackToRestSS = () => {
        for (const item of stack) {
          const client = item.id.client;
          const inapplicableItems = clientsStructRefs.get(client);
          if (inapplicableItems) {
            // decrement because we weren't able to apply previous operation
            inapplicableItems.i--;
            restStructs.clients.set(client, inapplicableItems.refs.slice(inapplicableItems.i));
            clientsStructRefs.delete(client);
            inapplicableItems.i = 0;
            inapplicableItems.refs = [];
          } else {
            // item was the last item on clientsStructRefs and the field was already cleared. Add item to restStructs and continue
            restStructs.clients.set(client, [item]);
          }
          // remove client from clientsStructRefsIds to prevent users from applying the same update again
          clientsStructRefsIds = clientsStructRefsIds.filter(c => c !== client);
        }
        stack.length = 0;
      };

      // iterate over all struct readers until we are done
      while (true) {
        if (stackHead.constructor !== Skip) {
          const localClock = setIfUndefined(state, stackHead.id.client, () => getState(store, stackHead.id.client));
          const offset = localClock - stackHead.id.clock;
          if (offset < 0) {
            // update from the same client is missing
            stack.push(stackHead);
            updateMissingSv(stackHead.id.client, stackHead.id.clock - 1);
            // hid a dead wall, add all items from stack to restSS
            addStackToRestSS();
          } else {
            const missing = stackHead.getMissing(transaction, store);
            if (missing !== null) {
              stack.push(stackHead);
              // get the struct reader that has the missing struct
              /**
               * @type {{ refs: Array<GC|Item>, i: number }}
               */
              const structRefs = clientsStructRefs.get(/** @type {number} */ (missing)) || { refs: [], i: 0 };
              if (structRefs.refs.length === structRefs.i) {
                // This update message causally depends on another update message that doesn't exist yet
                updateMissingSv(/** @type {number} */ (missing), getState(store, missing));
                addStackToRestSS();
              } else {
                stackHead = structRefs.refs[structRefs.i++];
                continue
              }
            } else if (offset === 0 || offset < stackHead.length) {
              // all fine, apply the stackhead
              stackHead.integrate(transaction, offset);
              state.set(stackHead.id.client, stackHead.id.clock + stackHead.length);
            }
          }
        }
        // iterate to next stackHead
        if (stack.length > 0) {
          stackHead = /** @type {GC|Item} */ (stack.pop());
        } else if (curStructsTarget !== null && curStructsTarget.i < curStructsTarget.refs.length) {
          stackHead = /** @type {GC|Item} */ (curStructsTarget.refs[curStructsTarget.i++]);
        } else {
          curStructsTarget = getNextStructTarget();
          if (curStructsTarget === null) {
            // we are done!
            break
          } else {
            stackHead = /** @type {GC|Item} */ (curStructsTarget.refs[curStructsTarget.i++]);
          }
        }
      }
      if (restStructs.clients.size > 0) {
        const encoder = new UpdateEncoderV2();
        writeClientsStructs(encoder, restStructs, new Map());
        // write empty deleteset
        // writeDeleteSet(encoder, new DeleteSet())
        writeVarUint(encoder.restEncoder, 0); // => no need for an extra function call, just write 0 deletes
        return { missing: missingSV, update: encoder.toUint8Array() }
      }
      return null
    };

    /**
     * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
     * @param {Transaction} transaction
     *
     * @private
     * @function
     */
    const writeStructsFromTransaction = (encoder, transaction) => writeClientsStructs(encoder, transaction.doc.store, transaction.beforeState);

    /**
     * Read and apply a document update.
     *
     * This function has the same effect as `applyUpdate` but accepts a decoder.
     *
     * @param {decoding.Decoder} decoder
     * @param {Doc} ydoc
     * @param {any} [transactionOrigin] This will be stored on `transaction.origin` and `.on('update', (update, origin))`
     * @param {UpdateDecoderV1 | UpdateDecoderV2} [structDecoder]
     *
     * @function
     */
    const readUpdateV2 = (decoder, ydoc, transactionOrigin, structDecoder = new UpdateDecoderV2(decoder)) =>
      transact(ydoc, transaction => {
        // force that transaction.local is set to non-local
        transaction.local = false;
        let retry = false;
        const doc = transaction.doc;
        const store = doc.store;
        // let start = performance.now()
        const ss = readClientsStructRefs(structDecoder, doc);
        // console.log('time to read structs: ', performance.now() - start) // @todo remove
        // start = performance.now()
        // console.log('time to merge: ', performance.now() - start) // @todo remove
        // start = performance.now()
        const restStructs = integrateStructs(transaction, store, ss);
        const pending = store.pendingStructs;
        if (pending) {
          // check if we can apply something
          for (const [client, clock] of pending.missing) {
            if (clock < getState(store, client)) {
              retry = true;
              break
            }
          }
          if (restStructs) {
            // merge restStructs into store.pending
            for (const [client, clock] of restStructs.missing) {
              const mclock = pending.missing.get(client);
              if (mclock == null || mclock > clock) {
                pending.missing.set(client, clock);
              }
            }
            pending.update = mergeUpdatesV2([pending.update, restStructs.update]);
          }
        } else {
          store.pendingStructs = restStructs;
        }
        // console.log('time to integrate: ', performance.now() - start) // @todo remove
        // start = performance.now()
        const dsRest = readAndApplyDeleteSet(structDecoder, transaction, store);
        if (store.pendingDs) {
          // @todo we could make a lower-bound state-vector check as we do above
          const pendingDSUpdate = new UpdateDecoderV2(createDecoder(store.pendingDs));
          readVarUint(pendingDSUpdate.restDecoder); // read 0 structs, because we only encode deletes in pendingdsupdate
          const dsRest2 = readAndApplyDeleteSet(pendingDSUpdate, transaction, store);
          if (dsRest && dsRest2) {
            // case 1: ds1 != null && ds2 != null
            store.pendingDs = mergeUpdatesV2([dsRest, dsRest2]);
          } else {
            // case 2: ds1 != null
            // case 3: ds2 != null
            // case 4: ds1 == null && ds2 == null
            store.pendingDs = dsRest || dsRest2;
          }
        } else {
          // Either dsRest == null && pendingDs == null OR dsRest != null
          store.pendingDs = dsRest;
        }
        // console.log('time to cleanup: ', performance.now() - start) // @todo remove
        // start = performance.now()

        // console.log('time to resume delete readers: ', performance.now() - start) // @todo remove
        // start = performance.now()
        if (retry) {
          const update = /** @type {{update: Uint8Array}} */ (store.pendingStructs).update;
          store.pendingStructs = null;
          applyUpdateV2(transaction.doc, update);
        }
      }, transactionOrigin, false);

    /**
     * Apply a document update created by, for example, `y.on('update', update => ..)` or `update = encodeStateAsUpdate()`.
     *
     * This function has the same effect as `readUpdate` but accepts an Uint8Array instead of a Decoder.
     *
     * @param {Doc} ydoc
     * @param {Uint8Array} update
     * @param {any} [transactionOrigin] This will be stored on `transaction.origin` and `.on('update', (update, origin))`
     * @param {typeof UpdateDecoderV1 | typeof UpdateDecoderV2} [YDecoder]
     *
     * @function
     */
    const applyUpdateV2 = (ydoc, update, transactionOrigin, YDecoder = UpdateDecoderV2) => {
      const decoder = createDecoder(update);
      readUpdateV2(decoder, ydoc, transactionOrigin, new YDecoder(decoder));
    };

    /**
     * General event handler implementation.
     *
     * @template ARG0, ARG1
     *
     * @private
     */
    class EventHandler {
      constructor () {
        /**
         * @type {Array<function(ARG0, ARG1):void>}
         */
        this.l = [];
      }
    }

    /**
     * @template ARG0,ARG1
     * @returns {EventHandler<ARG0,ARG1>}
     *
     * @private
     * @function
     */
    const createEventHandler = () => new EventHandler();

    /**
     * Adds an event listener that is called when
     * {@link EventHandler#callEventListeners} is called.
     *
     * @template ARG0,ARG1
     * @param {EventHandler<ARG0,ARG1>} eventHandler
     * @param {function(ARG0,ARG1):void} f The event handler.
     *
     * @private
     * @function
     */
    const addEventHandlerListener = (eventHandler, f) =>
      eventHandler.l.push(f);

    /**
     * Removes an event listener.
     *
     * @template ARG0,ARG1
     * @param {EventHandler<ARG0,ARG1>} eventHandler
     * @param {function(ARG0,ARG1):void} f The event handler that was added with
     *                     {@link EventHandler#addEventListener}
     *
     * @private
     * @function
     */
    const removeEventHandlerListener = (eventHandler, f) => {
      const l = eventHandler.l;
      const len = l.length;
      eventHandler.l = l.filter(g => f !== g);
      if (len === eventHandler.l.length) {
        console.error('[yjs] Tried to remove event handler that doesn\'t exist.');
      }
    };

    /**
     * Call all event listeners that were added via
     * {@link EventHandler#addEventListener}.
     *
     * @template ARG0,ARG1
     * @param {EventHandler<ARG0,ARG1>} eventHandler
     * @param {ARG0} arg0
     * @param {ARG1} arg1
     *
     * @private
     * @function
     */
    const callEventHandlerListeners = (eventHandler, arg0, arg1) =>
      callAll(eventHandler.l, [arg0, arg1]);

    class ID {
      /**
       * @param {number} client client id
       * @param {number} clock unique per client id, continuous number
       */
      constructor (client, clock) {
        /**
         * Client id
         * @type {number}
         */
        this.client = client;
        /**
         * unique per client id, continuous number
         * @type {number}
         */
        this.clock = clock;
      }
    }

    /**
     * @param {ID | null} a
     * @param {ID | null} b
     * @return {boolean}
     *
     * @function
     */
    const compareIDs = (a, b) => a === b || (a !== null && b !== null && a.client === b.client && a.clock === b.clock);

    /**
     * @param {number} client
     * @param {number} clock
     *
     * @private
     * @function
     */
    const createID = (client, clock) => new ID(client, clock);

    /**
     * The top types are mapped from y.share.get(keyname) => type.
     * `type` does not store any information about the `keyname`.
     * This function finds the correct `keyname` for `type` and throws otherwise.
     *
     * @param {AbstractType<any>} type
     * @return {string}
     *
     * @private
     * @function
     */
    const findRootTypeKey = type => {
      // @ts-ignore _y must be defined, otherwise unexpected case
      for (const [key, value] of type.doc.share.entries()) {
        if (value === type) {
          return key
        }
      }
      throw unexpectedCase()
    };

    /**
     * @param {Item} item
     * @param {Snapshot|undefined} snapshot
     *
     * @protected
     * @function
     */
    const isVisible = (item, snapshot) => snapshot === undefined
      ? !item.deleted
      : snapshot.sv.has(item.id.client) && (snapshot.sv.get(item.id.client) || 0) > item.id.clock && !isDeleted(snapshot.ds, item.id);

    /**
     * @param {Transaction} transaction
     * @param {Snapshot} snapshot
     */
    const splitSnapshotAffectedStructs = (transaction, snapshot) => {
      const meta = setIfUndefined(transaction.meta, splitSnapshotAffectedStructs, create$5);
      const store = transaction.doc.store;
      // check if we already split for this snapshot
      if (!meta.has(snapshot)) {
        snapshot.sv.forEach((clock, client) => {
          if (clock < getState(store, client)) {
            getItemCleanStart(transaction, createID(client, clock));
          }
        });
        iterateDeletedStructs(transaction, snapshot.ds, _item => {});
        meta.add(snapshot);
      }
    };

    class StructStore {
      constructor () {
        /**
         * @type {Map<number,Array<GC|Item>>}
         */
        this.clients = new Map();
        /**
         * @type {null | { missing: Map<number, number>, update: Uint8Array }}
         */
        this.pendingStructs = null;
        /**
         * @type {null | Uint8Array}
         */
        this.pendingDs = null;
      }
    }

    /**
     * Return the states as a Map<client,clock>.
     * Note that clock refers to the next expected clock id.
     *
     * @param {StructStore} store
     * @return {Map<number,number>}
     *
     * @public
     * @function
     */
    const getStateVector = store => {
      const sm = new Map();
      store.clients.forEach((structs, client) => {
        const struct = structs[structs.length - 1];
        sm.set(client, struct.id.clock + struct.length);
      });
      return sm
    };

    /**
     * @param {StructStore} store
     * @param {number} client
     * @return {number}
     *
     * @public
     * @function
     */
    const getState = (store, client) => {
      const structs = store.clients.get(client);
      if (structs === undefined) {
        return 0
      }
      const lastStruct = structs[structs.length - 1];
      return lastStruct.id.clock + lastStruct.length
    };

    /**
     * @param {StructStore} store
     * @param {GC|Item} struct
     *
     * @private
     * @function
     */
    const addStruct = (store, struct) => {
      let structs = store.clients.get(struct.id.client);
      if (structs === undefined) {
        structs = [];
        store.clients.set(struct.id.client, structs);
      } else {
        const lastStruct = structs[structs.length - 1];
        if (lastStruct.id.clock + lastStruct.length !== struct.id.clock) {
          throw unexpectedCase()
        }
      }
      structs.push(struct);
    };

    /**
     * Perform a binary search on a sorted array
     * @param {Array<Item|GC>} structs
     * @param {number} clock
     * @return {number}
     *
     * @private
     * @function
     */
    const findIndexSS = (structs, clock) => {
      let left = 0;
      let right = structs.length - 1;
      let mid = structs[right];
      let midclock = mid.id.clock;
      if (midclock === clock) {
        return right
      }
      // @todo does it even make sense to pivot the search?
      // If a good split misses, it might actually increase the time to find the correct item.
      // Currently, the only advantage is that search with pivoting might find the item on the first try.
      let midindex = floor((clock / (midclock + mid.length - 1)) * right); // pivoting the search
      while (left <= right) {
        mid = structs[midindex];
        midclock = mid.id.clock;
        if (midclock <= clock) {
          if (clock < midclock + mid.length) {
            return midindex
          }
          left = midindex + 1;
        } else {
          right = midindex - 1;
        }
        midindex = floor((left + right) / 2);
      }
      // Always check state before looking for a struct in StructStore
      // Therefore the case of not finding a struct is unexpected
      throw unexpectedCase()
    };

    /**
     * Expects that id is actually in store. This function throws or is an infinite loop otherwise.
     *
     * @param {StructStore} store
     * @param {ID} id
     * @return {GC|Item}
     *
     * @private
     * @function
     */
    const find = (store, id) => {
      /**
       * @type {Array<GC|Item>}
       */
      // @ts-ignore
      const structs = store.clients.get(id.client);
      return structs[findIndexSS(structs, id.clock)]
    };

    /**
     * Expects that id is actually in store. This function throws or is an infinite loop otherwise.
     * @private
     * @function
     */
    const getItem = /** @type {function(StructStore,ID):Item} */ (find);

    /**
     * @param {Transaction} transaction
     * @param {Array<Item|GC>} structs
     * @param {number} clock
     */
    const findIndexCleanStart = (transaction, structs, clock) => {
      const index = findIndexSS(structs, clock);
      const struct = structs[index];
      if (struct.id.clock < clock && struct instanceof Item) {
        structs.splice(index + 1, 0, splitItem(transaction, struct, clock - struct.id.clock));
        return index + 1
      }
      return index
    };

    /**
     * Expects that id is actually in store. This function throws or is an infinite loop otherwise.
     *
     * @param {Transaction} transaction
     * @param {ID} id
     * @return {Item}
     *
     * @private
     * @function
     */
    const getItemCleanStart = (transaction, id) => {
      const structs = /** @type {Array<Item>} */ (transaction.doc.store.clients.get(id.client));
      return structs[findIndexCleanStart(transaction, structs, id.clock)]
    };

    /**
     * Expects that id is actually in store. This function throws or is an infinite loop otherwise.
     *
     * @param {Transaction} transaction
     * @param {StructStore} store
     * @param {ID} id
     * @return {Item}
     *
     * @private
     * @function
     */
    const getItemCleanEnd = (transaction, store, id) => {
      /**
       * @type {Array<Item>}
       */
      // @ts-ignore
      const structs = store.clients.get(id.client);
      const index = findIndexSS(structs, id.clock);
      const struct = structs[index];
      if (id.clock !== struct.id.clock + struct.length - 1 && struct.constructor !== GC) {
        structs.splice(index + 1, 0, splitItem(transaction, struct, id.clock - struct.id.clock + 1));
      }
      return struct
    };

    /**
     * Replace `item` with `newitem` in store
     * @param {StructStore} store
     * @param {GC|Item} struct
     * @param {GC|Item} newStruct
     *
     * @private
     * @function
     */
    const replaceStruct = (store, struct, newStruct) => {
      const structs = /** @type {Array<GC|Item>} */ (store.clients.get(struct.id.client));
      structs[findIndexSS(structs, struct.id.clock)] = newStruct;
    };

    /**
     * Iterate over a range of structs
     *
     * @param {Transaction} transaction
     * @param {Array<Item|GC>} structs
     * @param {number} clockStart Inclusive start
     * @param {number} len
     * @param {function(GC|Item):void} f
     *
     * @function
     */
    const iterateStructs = (transaction, structs, clockStart, len, f) => {
      if (len === 0) {
        return
      }
      const clockEnd = clockStart + len;
      let index = findIndexCleanStart(transaction, structs, clockStart);
      let struct;
      do {
        struct = structs[index++];
        if (clockEnd < struct.id.clock + struct.length) {
          findIndexCleanStart(transaction, structs, clockEnd);
        }
        f(struct);
      } while (index < structs.length && structs[index].id.clock < clockEnd)
    };

    /**
     * A transaction is created for every change on the Yjs model. It is possible
     * to bundle changes on the Yjs model in a single transaction to
     * minimize the number on messages sent and the number of observer calls.
     * If possible the user of this library should bundle as many changes as
     * possible. Here is an example to illustrate the advantages of bundling:
     *
     * @example
     * const ydoc = new Y.Doc()
     * const map = ydoc.getMap('map')
     * // Log content when change is triggered
     * map.observe(() => {
     *   console.log('change triggered')
     * })
     * // Each change on the map type triggers a log message:
     * map.set('a', 0) // => "change triggered"
     * map.set('b', 0) // => "change triggered"
     * // When put in a transaction, it will trigger the log after the transaction:
     * ydoc.transact(() => {
     *   map.set('a', 1)
     *   map.set('b', 1)
     * }) // => "change triggered"
     *
     * @public
     */
    class Transaction {
      /**
       * @param {Doc} doc
       * @param {any} origin
       * @param {boolean} local
       */
      constructor (doc, origin, local) {
        /**
         * The Yjs instance.
         * @type {Doc}
         */
        this.doc = doc;
        /**
         * Describes the set of deleted items by ids
         * @type {DeleteSet}
         */
        this.deleteSet = new DeleteSet();
        /**
         * Holds the state before the transaction started.
         * @type {Map<Number,Number>}
         */
        this.beforeState = getStateVector(doc.store);
        /**
         * Holds the state after the transaction.
         * @type {Map<Number,Number>}
         */
        this.afterState = new Map();
        /**
         * All types that were directly modified (property added or child
         * inserted/deleted). New types are not included in this Set.
         * Maps from type to parentSubs (`item.parentSub = null` for YArray)
         * @type {Map<AbstractType<YEvent<any>>,Set<String|null>>}
         */
        this.changed = new Map();
        /**
         * Stores the events for the types that observe also child elements.
         * It is mainly used by `observeDeep`.
         * @type {Map<AbstractType<YEvent<any>>,Array<YEvent<any>>>}
         */
        this.changedParentTypes = new Map();
        /**
         * @type {Array<AbstractStruct>}
         */
        this._mergeStructs = [];
        /**
         * @type {any}
         */
        this.origin = origin;
        /**
         * Stores meta information on the transaction
         * @type {Map<any,any>}
         */
        this.meta = new Map();
        /**
         * Whether this change originates from this doc.
         * @type {boolean}
         */
        this.local = local;
        /**
         * @type {Set<Doc>}
         */
        this.subdocsAdded = new Set();
        /**
         * @type {Set<Doc>}
         */
        this.subdocsRemoved = new Set();
        /**
         * @type {Set<Doc>}
         */
        this.subdocsLoaded = new Set();
        /**
         * @type {boolean}
         */
        this._needFormattingCleanup = false;
      }
    }

    /**
     * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
     * @param {Transaction} transaction
     * @return {boolean} Whether data was written.
     */
    const writeUpdateMessageFromTransaction = (encoder, transaction) => {
      if (transaction.deleteSet.clients.size === 0 && !any(transaction.afterState, (clock, client) => transaction.beforeState.get(client) !== clock)) {
        return false
      }
      sortAndMergeDeleteSet(transaction.deleteSet);
      writeStructsFromTransaction(encoder, transaction);
      writeDeleteSet(encoder, transaction.deleteSet);
      return true
    };

    /**
     * If `type.parent` was added in current transaction, `type` technically
     * did not change, it was just added and we should not fire events for `type`.
     *
     * @param {Transaction} transaction
     * @param {AbstractType<YEvent<any>>} type
     * @param {string|null} parentSub
     */
    const addChangedTypeToTransaction = (transaction, type, parentSub) => {
      const item = type._item;
      if (item === null || (item.id.clock < (transaction.beforeState.get(item.id.client) || 0) && !item.deleted)) {
        setIfUndefined(transaction.changed, type, create$5).add(parentSub);
      }
    };

    /**
     * @param {Array<AbstractStruct>} structs
     * @param {number} pos
     * @return {number} # of merged structs
     */
    const tryToMergeWithLefts = (structs, pos) => {
      let right = structs[pos];
      let left = structs[pos - 1];
      let i = pos;
      for (; i > 0; right = left, left = structs[--i - 1]) {
        if (left.deleted === right.deleted && left.constructor === right.constructor) {
          if (left.mergeWith(right)) {
            if (right instanceof Item && right.parentSub !== null && /** @type {AbstractType<any>} */ (right.parent)._map.get(right.parentSub) === right) {
              /** @type {AbstractType<any>} */ (right.parent)._map.set(right.parentSub, /** @type {Item} */ (left));
            }
            continue
          }
        }
        break
      }
      const merged = pos - i;
      if (merged) {
        // remove all merged structs from the array
        structs.splice(pos + 1 - merged, merged);
      }
      return merged
    };

    /**
     * @param {DeleteSet} ds
     * @param {StructStore} store
     * @param {function(Item):boolean} gcFilter
     */
    const tryGcDeleteSet = (ds, store, gcFilter) => {
      for (const [client, deleteItems] of ds.clients.entries()) {
        const structs = /** @type {Array<GC|Item>} */ (store.clients.get(client));
        for (let di = deleteItems.length - 1; di >= 0; di--) {
          const deleteItem = deleteItems[di];
          const endDeleteItemClock = deleteItem.clock + deleteItem.len;
          for (
            let si = findIndexSS(structs, deleteItem.clock), struct = structs[si];
            si < structs.length && struct.id.clock < endDeleteItemClock;
            struct = structs[++si]
          ) {
            const struct = structs[si];
            if (deleteItem.clock + deleteItem.len <= struct.id.clock) {
              break
            }
            if (struct instanceof Item && struct.deleted && !struct.keep && gcFilter(struct)) {
              struct.gc(store, false);
            }
          }
        }
      }
    };

    /**
     * @param {DeleteSet} ds
     * @param {StructStore} store
     */
    const tryMergeDeleteSet = (ds, store) => {
      // try to merge deleted / gc'd items
      // merge from right to left for better efficiency and so we don't miss any merge targets
      ds.clients.forEach((deleteItems, client) => {
        const structs = /** @type {Array<GC|Item>} */ (store.clients.get(client));
        for (let di = deleteItems.length - 1; di >= 0; di--) {
          const deleteItem = deleteItems[di];
          // start with merging the item next to the last deleted item
          const mostRightIndexToCheck = min(structs.length - 1, 1 + findIndexSS(structs, deleteItem.clock + deleteItem.len - 1));
          for (
            let si = mostRightIndexToCheck, struct = structs[si];
            si > 0 && struct.id.clock >= deleteItem.clock;
            struct = structs[si]
          ) {
            si -= 1 + tryToMergeWithLefts(structs, si);
          }
        }
      });
    };

    /**
     * @param {Array<Transaction>} transactionCleanups
     * @param {number} i
     */
    const cleanupTransactions = (transactionCleanups, i) => {
      if (i < transactionCleanups.length) {
        const transaction = transactionCleanups[i];
        const doc = transaction.doc;
        const store = doc.store;
        const ds = transaction.deleteSet;
        const mergeStructs = transaction._mergeStructs;
        try {
          sortAndMergeDeleteSet(ds);
          transaction.afterState = getStateVector(transaction.doc.store);
          doc.emit('beforeObserverCalls', [transaction, doc]);
          /**
           * An array of event callbacks.
           *
           * Each callback is called even if the other ones throw errors.
           *
           * @type {Array<function():void>}
           */
          const fs = [];
          // observe events on changed types
          transaction.changed.forEach((subs, itemtype) =>
            fs.push(() => {
              if (itemtype._item === null || !itemtype._item.deleted) {
                itemtype._callObserver(transaction, subs);
              }
            })
          );
          fs.push(() => {
            // deep observe events
            transaction.changedParentTypes.forEach((events, type) => {
              // We need to think about the possibility that the user transforms the
              // Y.Doc in the event.
              if (type._dEH.l.length > 0 && (type._item === null || !type._item.deleted)) {
                events = events
                  .filter(event =>
                    event.target._item === null || !event.target._item.deleted
                  );
                events
                  .forEach(event => {
                    event.currentTarget = type;
                    // path is relative to the current target
                    event._path = null;
                  });
                // sort events by path length so that top-level events are fired first.
                events
                  .sort((event1, event2) => event1.path.length - event2.path.length);
                // We don't need to check for events.length
                // because we know it has at least one element
                callEventHandlerListeners(type._dEH, events, transaction);
              }
            });
          });
          fs.push(() => doc.emit('afterTransaction', [transaction, doc]));
          callAll(fs, []);
          if (transaction._needFormattingCleanup) {
            cleanupYTextAfterTransaction(transaction);
          }
        } finally {
          // Replace deleted items with ItemDeleted / GC.
          // This is where content is actually remove from the Yjs Doc.
          if (doc.gc) {
            tryGcDeleteSet(ds, store, doc.gcFilter);
          }
          tryMergeDeleteSet(ds, store);

          // on all affected store.clients props, try to merge
          transaction.afterState.forEach((clock, client) => {
            const beforeClock = transaction.beforeState.get(client) || 0;
            if (beforeClock !== clock) {
              const structs = /** @type {Array<GC|Item>} */ (store.clients.get(client));
              // we iterate from right to left so we can safely remove entries
              const firstChangePos = max(findIndexSS(structs, beforeClock), 1);
              for (let i = structs.length - 1; i >= firstChangePos;) {
                i -= 1 + tryToMergeWithLefts(structs, i);
              }
            }
          });
          // try to merge mergeStructs
          // @todo: it makes more sense to transform mergeStructs to a DS, sort it, and merge from right to left
          //        but at the moment DS does not handle duplicates
          for (let i = mergeStructs.length - 1; i >= 0; i--) {
            const { client, clock } = mergeStructs[i].id;
            const structs = /** @type {Array<GC|Item>} */ (store.clients.get(client));
            const replacedStructPos = findIndexSS(structs, clock);
            if (replacedStructPos + 1 < structs.length) {
              if (tryToMergeWithLefts(structs, replacedStructPos + 1) > 1) {
                continue // no need to perform next check, both are already merged
              }
            }
            if (replacedStructPos > 0) {
              tryToMergeWithLefts(structs, replacedStructPos);
            }
          }
          if (!transaction.local && transaction.afterState.get(doc.clientID) !== transaction.beforeState.get(doc.clientID)) {
            print(ORANGE, BOLD, '[yjs] ', UNBOLD, RED, 'Changed the client-id because another client seems to be using it.');
            doc.clientID = generateNewClientId();
          }
          // @todo Merge all the transactions into one and provide send the data as a single update message
          doc.emit('afterTransactionCleanup', [transaction, doc]);
          if (doc._observers.has('update')) {
            const encoder = new UpdateEncoderV1();
            const hasContent = writeUpdateMessageFromTransaction(encoder, transaction);
            if (hasContent) {
              doc.emit('update', [encoder.toUint8Array(), transaction.origin, doc, transaction]);
            }
          }
          if (doc._observers.has('updateV2')) {
            const encoder = new UpdateEncoderV2();
            const hasContent = writeUpdateMessageFromTransaction(encoder, transaction);
            if (hasContent) {
              doc.emit('updateV2', [encoder.toUint8Array(), transaction.origin, doc, transaction]);
            }
          }
          const { subdocsAdded, subdocsLoaded, subdocsRemoved } = transaction;
          if (subdocsAdded.size > 0 || subdocsRemoved.size > 0 || subdocsLoaded.size > 0) {
            subdocsAdded.forEach(subdoc => {
              subdoc.clientID = doc.clientID;
              if (subdoc.collectionid == null) {
                subdoc.collectionid = doc.collectionid;
              }
              doc.subdocs.add(subdoc);
            });
            subdocsRemoved.forEach(subdoc => doc.subdocs.delete(subdoc));
            doc.emit('subdocs', [{ loaded: subdocsLoaded, added: subdocsAdded, removed: subdocsRemoved }, doc, transaction]);
            subdocsRemoved.forEach(subdoc => subdoc.destroy());
          }

          if (transactionCleanups.length <= i + 1) {
            doc._transactionCleanups = [];
            doc.emit('afterAllTransactions', [doc, transactionCleanups]);
          } else {
            cleanupTransactions(transactionCleanups, i + 1);
          }
        }
      }
    };

    /**
     * Implements the functionality of `y.transact(()=>{..})`
     *
     * @template T
     * @param {Doc} doc
     * @param {function(Transaction):T} f
     * @param {any} [origin=true]
     * @return {T}
     *
     * @function
     */
    const transact = (doc, f, origin = null, local = true) => {
      const transactionCleanups = doc._transactionCleanups;
      let initialCall = false;
      /**
       * @type {any}
       */
      let result = null;
      if (doc._transaction === null) {
        initialCall = true;
        doc._transaction = new Transaction(doc, origin, local);
        transactionCleanups.push(doc._transaction);
        if (transactionCleanups.length === 1) {
          doc.emit('beforeAllTransactions', [doc]);
        }
        doc.emit('beforeTransaction', [doc._transaction, doc]);
      }
      try {
        result = f(doc._transaction);
      } finally {
        if (initialCall) {
          const finishCleanup = doc._transaction === transactionCleanups[0];
          doc._transaction = null;
          if (finishCleanup) {
            // The first transaction ended, now process observer calls.
            // Observer call may create new transactions for which we need to call the observers and do cleanup.
            // We don't want to nest these calls, so we execute these calls one after
            // another.
            // Also we need to ensure that all cleanups are called, even if the
            // observes throw errors.
            // This file is full of hacky try {} finally {} blocks to ensure that an
            // event can throw errors and also that the cleanup is called.
            cleanupTransactions(transactionCleanups, 0);
          }
        }
      }
      return result
    };

    /**
     * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
     */
    function * lazyStructReaderGenerator (decoder) {
      const numOfStateUpdates = readVarUint(decoder.restDecoder);
      for (let i = 0; i < numOfStateUpdates; i++) {
        const numberOfStructs = readVarUint(decoder.restDecoder);
        const client = decoder.readClient();
        let clock = readVarUint(decoder.restDecoder);
        for (let i = 0; i < numberOfStructs; i++) {
          const info = decoder.readInfo();
          // @todo use switch instead of ifs
          if (info === 10) {
            const len = readVarUint(decoder.restDecoder);
            yield new Skip(createID(client, clock), len);
            clock += len;
          } else if ((BITS5 & info) !== 0) {
            const cantCopyParentInfo = (info & (BIT7 | BIT8)) === 0;
            // If parent = null and neither left nor right are defined, then we know that `parent` is child of `y`
            // and we read the next string as parentYKey.
            // It indicates how we store/retrieve parent from `y.share`
            // @type {string|null}
            const struct = new Item(
              createID(client, clock),
              null, // left
              (info & BIT8) === BIT8 ? decoder.readLeftID() : null, // origin
              null, // right
              (info & BIT7) === BIT7 ? decoder.readRightID() : null, // right origin
              // @ts-ignore Force writing a string here.
              cantCopyParentInfo ? (decoder.readParentInfo() ? decoder.readString() : decoder.readLeftID()) : null, // parent
              cantCopyParentInfo && (info & BIT6) === BIT6 ? decoder.readString() : null, // parentSub
              readItemContent(decoder, info) // item content
            );
            yield struct;
            clock += struct.length;
          } else {
            const len = decoder.readLen();
            yield new GC(createID(client, clock), len);
            clock += len;
          }
        }
      }
    }

    class LazyStructReader {
      /**
       * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
       * @param {boolean} filterSkips
       */
      constructor (decoder, filterSkips) {
        this.gen = lazyStructReaderGenerator(decoder);
        /**
         * @type {null | Item | Skip | GC}
         */
        this.curr = null;
        this.done = false;
        this.filterSkips = filterSkips;
        this.next();
      }

      /**
       * @return {Item | GC | Skip |null}
       */
      next () {
        // ignore "Skip" structs
        do {
          this.curr = this.gen.next().value || null;
        } while (this.filterSkips && this.curr !== null && this.curr.constructor === Skip)
        return this.curr
      }
    }

    class LazyStructWriter {
      /**
       * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
       */
      constructor (encoder) {
        this.currClient = 0;
        this.startClock = 0;
        this.written = 0;
        this.encoder = encoder;
        /**
         * We want to write operations lazily, but also we need to know beforehand how many operations we want to write for each client.
         *
         * This kind of meta-information (#clients, #structs-per-client-written) is written to the restEncoder.
         *
         * We fragment the restEncoder and store a slice of it per-client until we know how many clients there are.
         * When we flush (toUint8Array) we write the restEncoder using the fragments and the meta-information.
         *
         * @type {Array<{ written: number, restEncoder: Uint8Array }>}
         */
        this.clientStructs = [];
      }
    }

    /**
     * @param {Uint8Array} update
     * @param {typeof DSEncoderV1 | typeof DSEncoderV2} YEncoder
     * @param {typeof UpdateDecoderV1 | typeof UpdateDecoderV2} YDecoder
     * @return {Uint8Array}
     */
    const encodeStateVectorFromUpdateV2 = (update, YEncoder = DSEncoderV2, YDecoder = UpdateDecoderV2) => {
      const encoder = new YEncoder();
      const updateDecoder = new LazyStructReader(new YDecoder(createDecoder(update)), false);
      let curr = updateDecoder.curr;
      if (curr !== null) {
        let size = 0;
        let currClient = curr.id.client;
        let stopCounting = curr.id.clock !== 0; // must start at 0
        let currClock = stopCounting ? 0 : curr.id.clock + curr.length;
        for (; curr !== null; curr = updateDecoder.next()) {
          if (currClient !== curr.id.client) {
            if (currClock !== 0) {
              size++;
              // We found a new client
              // write what we have to the encoder
              writeVarUint(encoder.restEncoder, currClient);
              writeVarUint(encoder.restEncoder, currClock);
            }
            currClient = curr.id.client;
            currClock = 0;
            stopCounting = curr.id.clock !== 0;
          }
          // we ignore skips
          if (curr.constructor === Skip) {
            stopCounting = true;
          }
          if (!stopCounting) {
            currClock = curr.id.clock + curr.length;
          }
        }
        // write what we have
        if (currClock !== 0) {
          size++;
          writeVarUint(encoder.restEncoder, currClient);
          writeVarUint(encoder.restEncoder, currClock);
        }
        // prepend the size of the state vector
        const enc = createEncoder();
        writeVarUint(enc, size);
        writeBinaryEncoder(enc, encoder.restEncoder);
        encoder.restEncoder = enc;
        return encoder.toUint8Array()
      } else {
        writeVarUint(encoder.restEncoder, 0);
        return encoder.toUint8Array()
      }
    };

    /**
     * This method is intended to slice any kind of struct and retrieve the right part.
     * It does not handle side-effects, so it should only be used by the lazy-encoder.
     *
     * @param {Item | GC | Skip} left
     * @param {number} diff
     * @return {Item | GC}
     */
    const sliceStruct = (left, diff) => {
      if (left.constructor === GC) {
        const { client, clock } = left.id;
        return new GC(createID(client, clock + diff), left.length - diff)
      } else if (left.constructor === Skip) {
        const { client, clock } = left.id;
        return new Skip(createID(client, clock + diff), left.length - diff)
      } else {
        const leftItem = /** @type {Item} */ (left);
        const { client, clock } = leftItem.id;
        return new Item(
          createID(client, clock + diff),
          null,
          createID(client, clock + diff - 1),
          null,
          leftItem.rightOrigin,
          leftItem.parent,
          leftItem.parentSub,
          leftItem.content.splice(diff)
        )
      }
    };

    /**
     *
     * This function works similarly to `readUpdateV2`.
     *
     * @param {Array<Uint8Array>} updates
     * @param {typeof UpdateDecoderV1 | typeof UpdateDecoderV2} [YDecoder]
     * @param {typeof UpdateEncoderV1 | typeof UpdateEncoderV2} [YEncoder]
     * @return {Uint8Array}
     */
    const mergeUpdatesV2 = (updates, YDecoder = UpdateDecoderV2, YEncoder = UpdateEncoderV2) => {
      if (updates.length === 1) {
        return updates[0]
      }
      const updateDecoders = updates.map(update => new YDecoder(createDecoder(update)));
      let lazyStructDecoders = updateDecoders.map(decoder => new LazyStructReader(decoder, true));

      /**
       * @todo we don't need offset because we always slice before
       * @type {null | { struct: Item | GC | Skip, offset: number }}
       */
      let currWrite = null;

      const updateEncoder = new YEncoder();
      // write structs lazily
      const lazyStructEncoder = new LazyStructWriter(updateEncoder);

      // Note: We need to ensure that all lazyStructDecoders are fully consumed
      // Note: Should merge document updates whenever possible - even from different updates
      // Note: Should handle that some operations cannot be applied yet ()

      while (true) {
        // Write higher clients first ⇒ sort by clientID & clock and remove decoders without content
        lazyStructDecoders = lazyStructDecoders.filter(dec => dec.curr !== null);
        lazyStructDecoders.sort(
          /** @type {function(any,any):number} */ (dec1, dec2) => {
            if (dec1.curr.id.client === dec2.curr.id.client) {
              const clockDiff = dec1.curr.id.clock - dec2.curr.id.clock;
              if (clockDiff === 0) {
                // @todo remove references to skip since the structDecoders must filter Skips.
                return dec1.curr.constructor === dec2.curr.constructor
                  ? 0
                  : dec1.curr.constructor === Skip ? 1 : -1 // we are filtering skips anyway.
              } else {
                return clockDiff
              }
            } else {
              return dec2.curr.id.client - dec1.curr.id.client
            }
          }
        );
        if (lazyStructDecoders.length === 0) {
          break
        }
        const currDecoder = lazyStructDecoders[0];
        // write from currDecoder until the next operation is from another client or if filler-struct
        // then we need to reorder the decoders and find the next operation to write
        const firstClient = /** @type {Item | GC} */ (currDecoder.curr).id.client;

        if (currWrite !== null) {
          let curr = /** @type {Item | GC | null} */ (currDecoder.curr);
          let iterated = false;

          // iterate until we find something that we haven't written already
          // remember: first the high client-ids are written
          while (curr !== null && curr.id.clock + curr.length <= currWrite.struct.id.clock + currWrite.struct.length && curr.id.client >= currWrite.struct.id.client) {
            curr = currDecoder.next();
            iterated = true;
          }
          if (
            curr === null || // current decoder is empty
            curr.id.client !== firstClient || // check whether there is another decoder that has has updates from `firstClient`
            (iterated && curr.id.clock > currWrite.struct.id.clock + currWrite.struct.length) // the above while loop was used and we are potentially missing updates
          ) {
            continue
          }

          if (firstClient !== currWrite.struct.id.client) {
            writeStructToLazyStructWriter(lazyStructEncoder, currWrite.struct, currWrite.offset);
            currWrite = { struct: curr, offset: 0 };
            currDecoder.next();
          } else {
            if (currWrite.struct.id.clock + currWrite.struct.length < curr.id.clock) {
              // @todo write currStruct & set currStruct = Skip(clock = currStruct.id.clock + currStruct.length, length = curr.id.clock - self.clock)
              if (currWrite.struct.constructor === Skip) {
                // extend existing skip
                currWrite.struct.length = curr.id.clock + curr.length - currWrite.struct.id.clock;
              } else {
                writeStructToLazyStructWriter(lazyStructEncoder, currWrite.struct, currWrite.offset);
                const diff = curr.id.clock - currWrite.struct.id.clock - currWrite.struct.length;
                /**
                 * @type {Skip}
                 */
                const struct = new Skip(createID(firstClient, currWrite.struct.id.clock + currWrite.struct.length), diff);
                currWrite = { struct, offset: 0 };
              }
            } else { // if (currWrite.struct.id.clock + currWrite.struct.length >= curr.id.clock) {
              const diff = currWrite.struct.id.clock + currWrite.struct.length - curr.id.clock;
              if (diff > 0) {
                if (currWrite.struct.constructor === Skip) {
                  // prefer to slice Skip because the other struct might contain more information
                  currWrite.struct.length -= diff;
                } else {
                  curr = sliceStruct(curr, diff);
                }
              }
              if (!currWrite.struct.mergeWith(/** @type {any} */ (curr))) {
                writeStructToLazyStructWriter(lazyStructEncoder, currWrite.struct, currWrite.offset);
                currWrite = { struct: curr, offset: 0 };
                currDecoder.next();
              }
            }
          }
        } else {
          currWrite = { struct: /** @type {Item | GC} */ (currDecoder.curr), offset: 0 };
          currDecoder.next();
        }
        for (
          let next = currDecoder.curr;
          next !== null && next.id.client === firstClient && next.id.clock === currWrite.struct.id.clock + currWrite.struct.length && next.constructor !== Skip;
          next = currDecoder.next()
        ) {
          writeStructToLazyStructWriter(lazyStructEncoder, currWrite.struct, currWrite.offset);
          currWrite = { struct: next, offset: 0 };
        }
      }
      if (currWrite !== null) {
        writeStructToLazyStructWriter(lazyStructEncoder, currWrite.struct, currWrite.offset);
        currWrite = null;
      }
      finishLazyStructWriting(lazyStructEncoder);

      const dss = updateDecoders.map(decoder => readDeleteSet(decoder));
      const ds = mergeDeleteSets(dss);
      writeDeleteSet(updateEncoder, ds);
      return updateEncoder.toUint8Array()
    };

    /**
     * @param {LazyStructWriter} lazyWriter
     */
    const flushLazyStructWriter = lazyWriter => {
      if (lazyWriter.written > 0) {
        lazyWriter.clientStructs.push({ written: lazyWriter.written, restEncoder: toUint8Array(lazyWriter.encoder.restEncoder) });
        lazyWriter.encoder.restEncoder = createEncoder();
        lazyWriter.written = 0;
      }
    };

    /**
     * @param {LazyStructWriter} lazyWriter
     * @param {Item | GC} struct
     * @param {number} offset
     */
    const writeStructToLazyStructWriter = (lazyWriter, struct, offset) => {
      // flush curr if we start another client
      if (lazyWriter.written > 0 && lazyWriter.currClient !== struct.id.client) {
        flushLazyStructWriter(lazyWriter);
      }
      if (lazyWriter.written === 0) {
        lazyWriter.currClient = struct.id.client;
        // write next client
        lazyWriter.encoder.writeClient(struct.id.client);
        // write startClock
        writeVarUint(lazyWriter.encoder.restEncoder, struct.id.clock + offset);
      }
      struct.write(lazyWriter.encoder, offset);
      lazyWriter.written++;
    };
    /**
     * Call this function when we collected all parts and want to
     * put all the parts together. After calling this method,
     * you can continue using the UpdateEncoder.
     *
     * @param {LazyStructWriter} lazyWriter
     */
    const finishLazyStructWriting = (lazyWriter) => {
      flushLazyStructWriter(lazyWriter);

      // this is a fresh encoder because we called flushCurr
      const restEncoder = lazyWriter.encoder.restEncoder;

      /**
       * Now we put all the fragments together.
       * This works similarly to `writeClientsStructs`
       */

      // write # states that were updated - i.e. the clients
      writeVarUint(restEncoder, lazyWriter.clientStructs.length);

      for (let i = 0; i < lazyWriter.clientStructs.length; i++) {
        const partStructs = lazyWriter.clientStructs[i];
        /**
         * Works similarly to `writeStructs`
         */
        // write # encoded structs
        writeVarUint(restEncoder, partStructs.written);
        // write the rest of the fragment
        writeUint8Array(restEncoder, partStructs.restEncoder);
      }
    };

    const errorComputeChanges = 'You must not compute changes after the event-handler fired.';

    /**
     * @template {AbstractType<any>} T
     * YEvent describes the changes on a YType.
     */
    class YEvent {
      /**
       * @param {T} target The changed type.
       * @param {Transaction} transaction
       */
      constructor (target, transaction) {
        /**
         * The type on which this event was created on.
         * @type {T}
         */
        this.target = target;
        /**
         * The current target on which the observe callback is called.
         * @type {AbstractType<any>}
         */
        this.currentTarget = target;
        /**
         * The transaction that triggered this event.
         * @type {Transaction}
         */
        this.transaction = transaction;
        /**
         * @type {Object|null}
         */
        this._changes = null;
        /**
         * @type {null | Map<string, { action: 'add' | 'update' | 'delete', oldValue: any, newValue: any }>}
         */
        this._keys = null;
        /**
         * @type {null | Array<{ insert?: string | Array<any> | object | AbstractType<any>, retain?: number, delete?: number, attributes?: Object<string, any> }>}
         */
        this._delta = null;
        /**
         * @type {Array<string|number>|null}
         */
        this._path = null;
      }

      /**
       * Computes the path from `y` to the changed type.
       *
       * @todo v14 should standardize on path: Array<{parent, index}> because that is easier to work with.
       *
       * The following property holds:
       * @example
       *   let type = y
       *   event.path.forEach(dir => {
       *     type = type.get(dir)
       *   })
       *   type === event.target // => true
       */
      get path () {
        return this._path || (this._path = getPathTo(this.currentTarget, this.target))
      }

      /**
       * Check if a struct is deleted by this event.
       *
       * In contrast to change.deleted, this method also returns true if the struct was added and then deleted.
       *
       * @param {AbstractStruct} struct
       * @return {boolean}
       */
      deletes (struct) {
        return isDeleted(this.transaction.deleteSet, struct.id)
      }

      /**
       * @type {Map<string, { action: 'add' | 'update' | 'delete', oldValue: any, newValue: any }>}
       */
      get keys () {
        if (this._keys === null) {
          if (this.transaction.doc._transactionCleanups.length === 0) {
            throw create$4(errorComputeChanges)
          }
          const keys = new Map();
          const target = this.target;
          const changed = /** @type Set<string|null> */ (this.transaction.changed.get(target));
          changed.forEach(key => {
            if (key !== null) {
              const item = /** @type {Item} */ (target._map.get(key));
              /**
               * @type {'delete' | 'add' | 'update'}
               */
              let action;
              let oldValue;
              if (this.adds(item)) {
                let prev = item.left;
                while (prev !== null && this.adds(prev)) {
                  prev = prev.left;
                }
                if (this.deletes(item)) {
                  if (prev !== null && this.deletes(prev)) {
                    action = 'delete';
                    oldValue = last(prev.content.getContent());
                  } else {
                    return
                  }
                } else {
                  if (prev !== null && this.deletes(prev)) {
                    action = 'update';
                    oldValue = last(prev.content.getContent());
                  } else {
                    action = 'add';
                    oldValue = undefined;
                  }
                }
              } else {
                if (this.deletes(item)) {
                  action = 'delete';
                  oldValue = last(/** @type {Item} */ item.content.getContent());
                } else {
                  return // nop
                }
              }
              keys.set(key, { action, oldValue });
            }
          });
          this._keys = keys;
        }
        return this._keys
      }

      /**
       * This is a computed property. Note that this can only be safely computed during the
       * event call. Computing this property after other changes happened might result in
       * unexpected behavior (incorrect computation of deltas). A safe way to collect changes
       * is to store the `changes` or the `delta` object. Avoid storing the `transaction` object.
       *
       * @type {Array<{insert?: string | Array<any> | object | AbstractType<any>, retain?: number, delete?: number, attributes?: Object<string, any>}>}
       */
      get delta () {
        return this.changes.delta
      }

      /**
       * Check if a struct is added by this event.
       *
       * In contrast to change.deleted, this method also returns true if the struct was added and then deleted.
       *
       * @param {AbstractStruct} struct
       * @return {boolean}
       */
      adds (struct) {
        return struct.id.clock >= (this.transaction.beforeState.get(struct.id.client) || 0)
      }

      /**
       * This is a computed property. Note that this can only be safely computed during the
       * event call. Computing this property after other changes happened might result in
       * unexpected behavior (incorrect computation of deltas). A safe way to collect changes
       * is to store the `changes` or the `delta` object. Avoid storing the `transaction` object.
       *
       * @type {{added:Set<Item>,deleted:Set<Item>,keys:Map<string,{action:'add'|'update'|'delete',oldValue:any}>,delta:Array<{insert?:Array<any>|string, delete?:number, retain?:number}>}}
       */
      get changes () {
        let changes = this._changes;
        if (changes === null) {
          if (this.transaction.doc._transactionCleanups.length === 0) {
            throw create$4(errorComputeChanges)
          }
          const target = this.target;
          const added = create$5();
          const deleted = create$5();
          /**
           * @type {Array<{insert:Array<any>}|{delete:number}|{retain:number}>}
           */
          const delta = [];
          changes = {
            added,
            deleted,
            delta,
            keys: this.keys
          };
          const changed = /** @type Set<string|null> */ (this.transaction.changed.get(target));
          if (changed.has(null)) {
            /**
             * @type {any}
             */
            let lastOp = null;
            const packOp = () => {
              if (lastOp) {
                delta.push(lastOp);
              }
            };
            for (let item = target._start; item !== null; item = item.right) {
              if (item.deleted) {
                if (this.deletes(item) && !this.adds(item)) {
                  if (lastOp === null || lastOp.delete === undefined) {
                    packOp();
                    lastOp = { delete: 0 };
                  }
                  lastOp.delete += item.length;
                  deleted.add(item);
                } // else nop
              } else {
                if (this.adds(item)) {
                  if (lastOp === null || lastOp.insert === undefined) {
                    packOp();
                    lastOp = { insert: [] };
                  }
                  lastOp.insert = lastOp.insert.concat(item.content.getContent());
                  added.add(item);
                } else {
                  if (lastOp === null || lastOp.retain === undefined) {
                    packOp();
                    lastOp = { retain: 0 };
                  }
                  lastOp.retain += item.length;
                }
              }
            }
            if (lastOp !== null && lastOp.retain === undefined) {
              packOp();
            }
          }
          this._changes = changes;
        }
        return /** @type {any} */ (changes)
      }
    }

    /**
     * Compute the path from this type to the specified target.
     *
     * @example
     *   // `child` should be accessible via `type.get(path[0]).get(path[1])..`
     *   const path = type.getPathTo(child)
     *   // assuming `type instanceof YArray`
     *   console.log(path) // might look like => [2, 'key1']
     *   child === type.get(path[0]).get(path[1])
     *
     * @param {AbstractType<any>} parent
     * @param {AbstractType<any>} child target
     * @return {Array<string|number>} Path to the target
     *
     * @private
     * @function
     */
    const getPathTo = (parent, child) => {
      const path = [];
      while (child._item !== null && child !== parent) {
        if (child._item.parentSub !== null) {
          // parent is map-ish
          path.unshift(child._item.parentSub);
        } else {
          // parent is array-ish
          let i = 0;
          let c = /** @type {AbstractType<any>} */ (child._item.parent)._start;
          while (c !== child._item && c !== null) {
            if (!c.deleted && c.countable) {
              i += c.length;
            }
            c = c.right;
          }
          path.unshift(i);
        }
        child = /** @type {AbstractType<any>} */ (child._item.parent);
      }
      return path
    };

    /**
     * https://docs.yjs.dev/getting-started/working-with-shared-types#caveats
     */
    const warnPrematureAccess = () => { warn('Invalid access: Add Yjs type to a document before reading data.'); };

    const maxSearchMarker = 80;

    /**
     * A unique timestamp that identifies each marker.
     *
     * Time is relative,.. this is more like an ever-increasing clock.
     *
     * @type {number}
     */
    let globalSearchMarkerTimestamp = 0;

    class ArraySearchMarker {
      /**
       * @param {Item} p
       * @param {number} index
       */
      constructor (p, index) {
        p.marker = true;
        this.p = p;
        this.index = index;
        this.timestamp = globalSearchMarkerTimestamp++;
      }
    }

    /**
     * @param {ArraySearchMarker} marker
     */
    const refreshMarkerTimestamp = marker => { marker.timestamp = globalSearchMarkerTimestamp++; };

    /**
     * This is rather complex so this function is the only thing that should overwrite a marker
     *
     * @param {ArraySearchMarker} marker
     * @param {Item} p
     * @param {number} index
     */
    const overwriteMarker = (marker, p, index) => {
      marker.p.marker = false;
      marker.p = p;
      p.marker = true;
      marker.index = index;
      marker.timestamp = globalSearchMarkerTimestamp++;
    };

    /**
     * @param {Array<ArraySearchMarker>} searchMarker
     * @param {Item} p
     * @param {number} index
     */
    const markPosition = (searchMarker, p, index) => {
      if (searchMarker.length >= maxSearchMarker) {
        // override oldest marker (we don't want to create more objects)
        const marker = searchMarker.reduce((a, b) => a.timestamp < b.timestamp ? a : b);
        overwriteMarker(marker, p, index);
        return marker
      } else {
        // create new marker
        const pm = new ArraySearchMarker(p, index);
        searchMarker.push(pm);
        return pm
      }
    };

    /**
     * Search marker help us to find positions in the associative array faster.
     *
     * They speed up the process of finding a position without much bookkeeping.
     *
     * A maximum of `maxSearchMarker` objects are created.
     *
     * This function always returns a refreshed marker (updated timestamp)
     *
     * @param {AbstractType<any>} yarray
     * @param {number} index
     */
    const findMarker = (yarray, index) => {
      if (yarray._start === null || index === 0 || yarray._searchMarker === null) {
        return null
      }
      const marker = yarray._searchMarker.length === 0 ? null : yarray._searchMarker.reduce((a, b) => abs(index - a.index) < abs(index - b.index) ? a : b);
      let p = yarray._start;
      let pindex = 0;
      if (marker !== null) {
        p = marker.p;
        pindex = marker.index;
        refreshMarkerTimestamp(marker); // we used it, we might need to use it again
      }
      // iterate to right if possible
      while (p.right !== null && pindex < index) {
        if (!p.deleted && p.countable) {
          if (index < pindex + p.length) {
            break
          }
          pindex += p.length;
        }
        p = p.right;
      }
      // iterate to left if necessary (might be that pindex > index)
      while (p.left !== null && pindex > index) {
        p = p.left;
        if (!p.deleted && p.countable) {
          pindex -= p.length;
        }
      }
      // we want to make sure that p can't be merged with left, because that would screw up everything
      // in that cas just return what we have (it is most likely the best marker anyway)
      // iterate to left until p can't be merged with left
      while (p.left !== null && p.left.id.client === p.id.client && p.left.id.clock + p.left.length === p.id.clock) {
        p = p.left;
        if (!p.deleted && p.countable) {
          pindex -= p.length;
        }
      }

      // @todo remove!
      // assure position
      // {
      //   let start = yarray._start
      //   let pos = 0
      //   while (start !== p) {
      //     if (!start.deleted && start.countable) {
      //       pos += start.length
      //     }
      //     start = /** @type {Item} */ (start.right)
      //   }
      //   if (pos !== pindex) {
      //     debugger
      //     throw new Error('Gotcha position fail!')
      //   }
      // }
      // if (marker) {
      //   if (window.lengths == null) {
      //     window.lengths = []
      //     window.getLengths = () => window.lengths.sort((a, b) => a - b)
      //   }
      //   window.lengths.push(marker.index - pindex)
      //   console.log('distance', marker.index - pindex, 'len', p && p.parent.length)
      // }
      if (marker !== null && abs(marker.index - pindex) < /** @type {YText|YArray<any>} */ (p.parent).length / maxSearchMarker) {
        // adjust existing marker
        overwriteMarker(marker, p, pindex);
        return marker
      } else {
        // create new marker
        return markPosition(yarray._searchMarker, p, pindex)
      }
    };

    /**
     * Update markers when a change happened.
     *
     * This should be called before doing a deletion!
     *
     * @param {Array<ArraySearchMarker>} searchMarker
     * @param {number} index
     * @param {number} len If insertion, len is positive. If deletion, len is negative.
     */
    const updateMarkerChanges = (searchMarker, index, len) => {
      for (let i = searchMarker.length - 1; i >= 0; i--) {
        const m = searchMarker[i];
        if (len > 0) {
          /**
           * @type {Item|null}
           */
          let p = m.p;
          p.marker = false;
          // Ideally we just want to do a simple position comparison, but this will only work if
          // search markers don't point to deleted items for formats.
          // Iterate marker to prev undeleted countable position so we know what to do when updating a position
          while (p && (p.deleted || !p.countable)) {
            p = p.left;
            if (p && !p.deleted && p.countable) {
              // adjust position. the loop should break now
              m.index -= p.length;
            }
          }
          if (p === null || p.marker === true) {
            // remove search marker if updated position is null or if position is already marked
            searchMarker.splice(i, 1);
            continue
          }
          m.p = p;
          p.marker = true;
        }
        if (index < m.index || (len > 0 && index === m.index)) { // a simple index <= m.index check would actually suffice
          m.index = max(index, m.index + len);
        }
      }
    };

    /**
     * Call event listeners with an event. This will also add an event to all
     * parents (for `.observeDeep` handlers).
     *
     * @template EventType
     * @param {AbstractType<EventType>} type
     * @param {Transaction} transaction
     * @param {EventType} event
     */
    const callTypeObservers = (type, transaction, event) => {
      const changedType = type;
      const changedParentTypes = transaction.changedParentTypes;
      while (true) {
        // @ts-ignore
        setIfUndefined(changedParentTypes, type, () => []).push(event);
        if (type._item === null) {
          break
        }
        type = /** @type {AbstractType<any>} */ (type._item.parent);
      }
      callEventHandlerListeners(changedType._eH, event, transaction);
    };

    /**
     * @template EventType
     * Abstract Yjs Type class
     */
    class AbstractType {
      constructor () {
        /**
         * @type {Item|null}
         */
        this._item = null;
        /**
         * @type {Map<string,Item>}
         */
        this._map = new Map();
        /**
         * @type {Item|null}
         */
        this._start = null;
        /**
         * @type {Doc|null}
         */
        this.doc = null;
        this._length = 0;
        /**
         * Event handlers
         * @type {EventHandler<EventType,Transaction>}
         */
        this._eH = createEventHandler();
        /**
         * Deep event handlers
         * @type {EventHandler<Array<YEvent<any>>,Transaction>}
         */
        this._dEH = createEventHandler();
        /**
         * @type {null | Array<ArraySearchMarker>}
         */
        this._searchMarker = null;
      }

      /**
       * @return {AbstractType<any>|null}
       */
      get parent () {
        return this._item ? /** @type {AbstractType<any>} */ (this._item.parent) : null
      }

      /**
       * Integrate this type into the Yjs instance.
       *
       * * Save this struct in the os
       * * This type is sent to other client
       * * Observer functions are fired
       *
       * @param {Doc} y The Yjs instance
       * @param {Item|null} item
       */
      _integrate (y, item) {
        this.doc = y;
        this._item = item;
      }

      /**
       * @return {AbstractType<EventType>}
       */
      _copy () {
        throw methodUnimplemented()
      }

      /**
       * Makes a copy of this data type that can be included somewhere else.
       *
       * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
       *
       * @return {AbstractType<EventType>}
       */
      clone () {
        throw methodUnimplemented()
      }

      /**
       * @param {UpdateEncoderV1 | UpdateEncoderV2} _encoder
       */
      _write (_encoder) { }

      /**
       * The first non-deleted item
       */
      get _first () {
        let n = this._start;
        while (n !== null && n.deleted) {
          n = n.right;
        }
        return n
      }

      /**
       * Creates YEvent and calls all type observers.
       * Must be implemented by each type.
       *
       * @param {Transaction} transaction
       * @param {Set<null|string>} _parentSubs Keys changed on this type. `null` if list was modified.
       */
      _callObserver (transaction, _parentSubs) {
        if (!transaction.local && this._searchMarker) {
          this._searchMarker.length = 0;
        }
      }

      /**
       * Observe all events that are created on this type.
       *
       * @param {function(EventType, Transaction):void} f Observer function
       */
      observe (f) {
        addEventHandlerListener(this._eH, f);
      }

      /**
       * Observe all events that are created by this type and its children.
       *
       * @param {function(Array<YEvent<any>>,Transaction):void} f Observer function
       */
      observeDeep (f) {
        addEventHandlerListener(this._dEH, f);
      }

      /**
       * Unregister an observer function.
       *
       * @param {function(EventType,Transaction):void} f Observer function
       */
      unobserve (f) {
        removeEventHandlerListener(this._eH, f);
      }

      /**
       * Unregister an observer function.
       *
       * @param {function(Array<YEvent<any>>,Transaction):void} f Observer function
       */
      unobserveDeep (f) {
        removeEventHandlerListener(this._dEH, f);
      }

      /**
       * @abstract
       * @return {any}
       */
      toJSON () {}
    }

    /**
     * @param {AbstractType<any>} type
     * @param {number} start
     * @param {number} end
     * @return {Array<any>}
     *
     * @private
     * @function
     */
    const typeListSlice = (type, start, end) => {
      type.doc ?? warnPrematureAccess();
      if (start < 0) {
        start = type._length + start;
      }
      if (end < 0) {
        end = type._length + end;
      }
      let len = end - start;
      const cs = [];
      let n = type._start;
      while (n !== null && len > 0) {
        if (n.countable && !n.deleted) {
          const c = n.content.getContent();
          if (c.length <= start) {
            start -= c.length;
          } else {
            for (let i = start; i < c.length && len > 0; i++) {
              cs.push(c[i]);
              len--;
            }
            start = 0;
          }
        }
        n = n.right;
      }
      return cs
    };

    /**
     * @param {AbstractType<any>} type
     * @return {Array<any>}
     *
     * @private
     * @function
     */
    const typeListToArray = type => {
      type.doc ?? warnPrematureAccess();
      const cs = [];
      let n = type._start;
      while (n !== null) {
        if (n.countable && !n.deleted) {
          const c = n.content.getContent();
          for (let i = 0; i < c.length; i++) {
            cs.push(c[i]);
          }
        }
        n = n.right;
      }
      return cs
    };

    /**
     * Executes a provided function on once on every element of this YArray.
     *
     * @param {AbstractType<any>} type
     * @param {function(any,number,any):void} f A function to execute on every element of this YArray.
     *
     * @private
     * @function
     */
    const typeListForEach = (type, f) => {
      let index = 0;
      let n = type._start;
      type.doc ?? warnPrematureAccess();
      while (n !== null) {
        if (n.countable && !n.deleted) {
          const c = n.content.getContent();
          for (let i = 0; i < c.length; i++) {
            f(c[i], index++, type);
          }
        }
        n = n.right;
      }
    };

    /**
     * @template C,R
     * @param {AbstractType<any>} type
     * @param {function(C,number,AbstractType<any>):R} f
     * @return {Array<R>}
     *
     * @private
     * @function
     */
    const typeListMap = (type, f) => {
      /**
       * @type {Array<any>}
       */
      const result = [];
      typeListForEach(type, (c, i) => {
        result.push(f(c, i, type));
      });
      return result
    };

    /**
     * @param {AbstractType<any>} type
     * @return {IterableIterator<any>}
     *
     * @private
     * @function
     */
    const typeListCreateIterator = type => {
      let n = type._start;
      /**
       * @type {Array<any>|null}
       */
      let currentContent = null;
      let currentContentIndex = 0;
      return {
        [Symbol.iterator] () {
          return this
        },
        next: () => {
          // find some content
          if (currentContent === null) {
            while (n !== null && n.deleted) {
              n = n.right;
            }
            // check if we reached the end, no need to check currentContent, because it does not exist
            if (n === null) {
              return {
                done: true,
                value: undefined
              }
            }
            // we found n, so we can set currentContent
            currentContent = n.content.getContent();
            currentContentIndex = 0;
            n = n.right; // we used the content of n, now iterate to next
          }
          const value = currentContent[currentContentIndex++];
          // check if we need to empty currentContent
          if (currentContent.length <= currentContentIndex) {
            currentContent = null;
          }
          return {
            done: false,
            value
          }
        }
      }
    };

    /**
     * @param {AbstractType<any>} type
     * @param {number} index
     * @return {any}
     *
     * @private
     * @function
     */
    const typeListGet = (type, index) => {
      type.doc ?? warnPrematureAccess();
      const marker = findMarker(type, index);
      let n = type._start;
      if (marker !== null) {
        n = marker.p;
        index -= marker.index;
      }
      for (; n !== null; n = n.right) {
        if (!n.deleted && n.countable) {
          if (index < n.length) {
            return n.content.getContent()[index]
          }
          index -= n.length;
        }
      }
    };

    /**
     * @param {Transaction} transaction
     * @param {AbstractType<any>} parent
     * @param {Item?} referenceItem
     * @param {Array<Object<string,any>|Array<any>|boolean|number|null|string|Uint8Array>} content
     *
     * @private
     * @function
     */
    const typeListInsertGenericsAfter = (transaction, parent, referenceItem, content) => {
      let left = referenceItem;
      const doc = transaction.doc;
      const ownClientId = doc.clientID;
      const store = doc.store;
      const right = referenceItem === null ? parent._start : referenceItem.right;
      /**
       * @type {Array<Object|Array<any>|number|null>}
       */
      let jsonContent = [];
      const packJsonContent = () => {
        if (jsonContent.length > 0) {
          left = new Item(createID(ownClientId, getState(store, ownClientId)), left, left && left.lastId, right, right && right.id, parent, null, new ContentAny(jsonContent));
          left.integrate(transaction, 0);
          jsonContent = [];
        }
      };
      content.forEach(c => {
        if (c === null) {
          jsonContent.push(c);
        } else {
          switch (c.constructor) {
            case Number:
            case Object:
            case Boolean:
            case Array:
            case String:
              jsonContent.push(c);
              break
            default:
              packJsonContent();
              switch (c.constructor) {
                case Uint8Array:
                case ArrayBuffer:
                  left = new Item(createID(ownClientId, getState(store, ownClientId)), left, left && left.lastId, right, right && right.id, parent, null, new ContentBinary(new Uint8Array(/** @type {Uint8Array} */ (c))));
                  left.integrate(transaction, 0);
                  break
                case Doc:
                  left = new Item(createID(ownClientId, getState(store, ownClientId)), left, left && left.lastId, right, right && right.id, parent, null, new ContentDoc(/** @type {Doc} */ (c)));
                  left.integrate(transaction, 0);
                  break
                default:
                  if (c instanceof AbstractType) {
                    left = new Item(createID(ownClientId, getState(store, ownClientId)), left, left && left.lastId, right, right && right.id, parent, null, new ContentType(c));
                    left.integrate(transaction, 0);
                  } else {
                    throw new Error('Unexpected content type in insert operation')
                  }
              }
          }
        }
      });
      packJsonContent();
    };

    const lengthExceeded = () => create$4('Length exceeded!');

    /**
     * @param {Transaction} transaction
     * @param {AbstractType<any>} parent
     * @param {number} index
     * @param {Array<Object<string,any>|Array<any>|number|null|string|Uint8Array>} content
     *
     * @private
     * @function
     */
    const typeListInsertGenerics = (transaction, parent, index, content) => {
      if (index > parent._length) {
        throw lengthExceeded()
      }
      if (index === 0) {
        if (parent._searchMarker) {
          updateMarkerChanges(parent._searchMarker, index, content.length);
        }
        return typeListInsertGenericsAfter(transaction, parent, null, content)
      }
      const startIndex = index;
      const marker = findMarker(parent, index);
      let n = parent._start;
      if (marker !== null) {
        n = marker.p;
        index -= marker.index;
        // we need to iterate one to the left so that the algorithm works
        if (index === 0) {
          // @todo refactor this as it actually doesn't consider formats
          n = n.prev; // important! get the left undeleted item so that we can actually decrease index
          index += (n && n.countable && !n.deleted) ? n.length : 0;
        }
      }
      for (; n !== null; n = n.right) {
        if (!n.deleted && n.countable) {
          if (index <= n.length) {
            if (index < n.length) {
              // insert in-between
              getItemCleanStart(transaction, createID(n.id.client, n.id.clock + index));
            }
            break
          }
          index -= n.length;
        }
      }
      if (parent._searchMarker) {
        updateMarkerChanges(parent._searchMarker, startIndex, content.length);
      }
      return typeListInsertGenericsAfter(transaction, parent, n, content)
    };

    /**
     * Pushing content is special as we generally want to push after the last item. So we don't have to update
     * the search marker.
     *
     * @param {Transaction} transaction
     * @param {AbstractType<any>} parent
     * @param {Array<Object<string,any>|Array<any>|number|null|string|Uint8Array>} content
     *
     * @private
     * @function
     */
    const typeListPushGenerics = (transaction, parent, content) => {
      // Use the marker with the highest index and iterate to the right.
      const marker = (parent._searchMarker || []).reduce((maxMarker, currMarker) => currMarker.index > maxMarker.index ? currMarker : maxMarker, { index: 0, p: parent._start });
      let n = marker.p;
      if (n) {
        while (n.right) {
          n = n.right;
        }
      }
      return typeListInsertGenericsAfter(transaction, parent, n, content)
    };

    /**
     * @param {Transaction} transaction
     * @param {AbstractType<any>} parent
     * @param {number} index
     * @param {number} length
     *
     * @private
     * @function
     */
    const typeListDelete = (transaction, parent, index, length) => {
      if (length === 0) { return }
      const startIndex = index;
      const startLength = length;
      const marker = findMarker(parent, index);
      let n = parent._start;
      if (marker !== null) {
        n = marker.p;
        index -= marker.index;
      }
      // compute the first item to be deleted
      for (; n !== null && index > 0; n = n.right) {
        if (!n.deleted && n.countable) {
          if (index < n.length) {
            getItemCleanStart(transaction, createID(n.id.client, n.id.clock + index));
          }
          index -= n.length;
        }
      }
      // delete all items until done
      while (length > 0 && n !== null) {
        if (!n.deleted) {
          if (length < n.length) {
            getItemCleanStart(transaction, createID(n.id.client, n.id.clock + length));
          }
          n.delete(transaction);
          length -= n.length;
        }
        n = n.right;
      }
      if (length > 0) {
        throw lengthExceeded()
      }
      if (parent._searchMarker) {
        updateMarkerChanges(parent._searchMarker, startIndex, -startLength + length /* in case we remove the above exception */);
      }
    };

    /**
     * @param {Transaction} transaction
     * @param {AbstractType<any>} parent
     * @param {string} key
     *
     * @private
     * @function
     */
    const typeMapDelete = (transaction, parent, key) => {
      const c = parent._map.get(key);
      if (c !== undefined) {
        c.delete(transaction);
      }
    };

    /**
     * @param {Transaction} transaction
     * @param {AbstractType<any>} parent
     * @param {string} key
     * @param {Object|number|null|Array<any>|string|Uint8Array|AbstractType<any>} value
     *
     * @private
     * @function
     */
    const typeMapSet = (transaction, parent, key, value) => {
      const left = parent._map.get(key) || null;
      const doc = transaction.doc;
      const ownClientId = doc.clientID;
      let content;
      if (value == null) {
        content = new ContentAny([value]);
      } else {
        switch (value.constructor) {
          case Number:
          case Object:
          case Boolean:
          case Array:
          case String:
          case Date:
          case BigInt:
            content = new ContentAny([value]);
            break
          case Uint8Array:
            content = new ContentBinary(/** @type {Uint8Array} */ (value));
            break
          case Doc:
            content = new ContentDoc(/** @type {Doc} */ (value));
            break
          default:
            if (value instanceof AbstractType) {
              content = new ContentType(value);
            } else {
              throw new Error('Unexpected content type')
            }
        }
      }
      new Item(createID(ownClientId, getState(doc.store, ownClientId)), left, left && left.lastId, null, null, parent, key, content).integrate(transaction, 0);
    };

    /**
     * @param {AbstractType<any>} parent
     * @param {string} key
     * @return {Object<string,any>|number|null|Array<any>|string|Uint8Array|AbstractType<any>|undefined}
     *
     * @private
     * @function
     */
    const typeMapGet = (parent, key) => {
      parent.doc ?? warnPrematureAccess();
      const val = parent._map.get(key);
      return val !== undefined && !val.deleted ? val.content.getContent()[val.length - 1] : undefined
    };

    /**
     * @param {AbstractType<any>} parent
     * @return {Object<string,Object<string,any>|number|null|Array<any>|string|Uint8Array|AbstractType<any>|undefined>}
     *
     * @private
     * @function
     */
    const typeMapGetAll = (parent) => {
      /**
       * @type {Object<string,any>}
       */
      const res = {};
      parent.doc ?? warnPrematureAccess();
      parent._map.forEach((value, key) => {
        if (!value.deleted) {
          res[key] = value.content.getContent()[value.length - 1];
        }
      });
      return res
    };

    /**
     * @param {AbstractType<any>} parent
     * @param {string} key
     * @return {boolean}
     *
     * @private
     * @function
     */
    const typeMapHas = (parent, key) => {
      parent.doc ?? warnPrematureAccess();
      const val = parent._map.get(key);
      return val !== undefined && !val.deleted
    };

    /**
     * @param {AbstractType<any>} parent
     * @param {Snapshot} snapshot
     * @return {Object<string,Object<string,any>|number|null|Array<any>|string|Uint8Array|AbstractType<any>|undefined>}
     *
     * @private
     * @function
     */
    const typeMapGetAllSnapshot = (parent, snapshot) => {
      /**
       * @type {Object<string,any>}
       */
      const res = {};
      parent._map.forEach((value, key) => {
        /**
         * @type {Item|null}
         */
        let v = value;
        while (v !== null && (!snapshot.sv.has(v.id.client) || v.id.clock >= (snapshot.sv.get(v.id.client) || 0))) {
          v = v.left;
        }
        if (v !== null && isVisible(v, snapshot)) {
          res[key] = v.content.getContent()[v.length - 1];
        }
      });
      return res
    };

    /**
     * @param {AbstractType<any> & { _map: Map<string, Item> }} type
     * @return {IterableIterator<Array<any>>}
     *
     * @private
     * @function
     */
    const createMapIterator = type => {
      type.doc ?? warnPrematureAccess();
      return iteratorFilter(type._map.entries(), /** @param {any} entry */ entry => !entry[1].deleted)
    };

    /**
     * @module YArray
     */


    /**
     * Event that describes the changes on a YArray
     * @template T
     * @extends YEvent<YArray<T>>
     */
    class YArrayEvent extends YEvent {}

    /**
     * A shared Array implementation.
     * @template T
     * @extends AbstractType<YArrayEvent<T>>
     * @implements {Iterable<T>}
     */
    class YArray extends AbstractType {
      constructor () {
        super();
        /**
         * @type {Array<any>?}
         * @private
         */
        this._prelimContent = [];
        /**
         * @type {Array<ArraySearchMarker>}
         */
        this._searchMarker = [];
      }

      /**
       * Construct a new YArray containing the specified items.
       * @template {Object<string,any>|Array<any>|number|null|string|Uint8Array} T
       * @param {Array<T>} items
       * @return {YArray<T>}
       */
      static from (items) {
        /**
         * @type {YArray<T>}
         */
        const a = new YArray();
        a.push(items);
        return a
      }

      /**
       * Integrate this type into the Yjs instance.
       *
       * * Save this struct in the os
       * * This type is sent to other client
       * * Observer functions are fired
       *
       * @param {Doc} y The Yjs instance
       * @param {Item} item
       */
      _integrate (y, item) {
        super._integrate(y, item);
        this.insert(0, /** @type {Array<any>} */ (this._prelimContent));
        this._prelimContent = null;
      }

      /**
       * @return {YArray<T>}
       */
      _copy () {
        return new YArray()
      }

      /**
       * Makes a copy of this data type that can be included somewhere else.
       *
       * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
       *
       * @return {YArray<T>}
       */
      clone () {
        /**
         * @type {YArray<T>}
         */
        const arr = new YArray();
        arr.insert(0, this.toArray().map(el =>
          el instanceof AbstractType ? /** @type {typeof el} */ (el.clone()) : el
        ));
        return arr
      }

      get length () {
        this.doc ?? warnPrematureAccess();
        return this._length
      }

      /**
       * Creates YArrayEvent and calls observers.
       *
       * @param {Transaction} transaction
       * @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
       */
      _callObserver (transaction, parentSubs) {
        super._callObserver(transaction, parentSubs);
        callTypeObservers(this, transaction, new YArrayEvent(this, transaction));
      }

      /**
       * Inserts new content at an index.
       *
       * Important: This function expects an array of content. Not just a content
       * object. The reason for this "weirdness" is that inserting several elements
       * is very efficient when it is done as a single operation.
       *
       * @example
       *  // Insert character 'a' at position 0
       *  yarray.insert(0, ['a'])
       *  // Insert numbers 1, 2 at position 1
       *  yarray.insert(1, [1, 2])
       *
       * @param {number} index The index to insert content at.
       * @param {Array<T>} content The array of content
       */
      insert (index, content) {
        if (this.doc !== null) {
          transact(this.doc, transaction => {
            typeListInsertGenerics(transaction, this, index, /** @type {any} */ (content));
          });
        } else {
          /** @type {Array<any>} */ (this._prelimContent).splice(index, 0, ...content);
        }
      }

      /**
       * Appends content to this YArray.
       *
       * @param {Array<T>} content Array of content to append.
       *
       * @todo Use the following implementation in all types.
       */
      push (content) {
        if (this.doc !== null) {
          transact(this.doc, transaction => {
            typeListPushGenerics(transaction, this, /** @type {any} */ (content));
          });
        } else {
          /** @type {Array<any>} */ (this._prelimContent).push(...content);
        }
      }

      /**
       * Prepends content to this YArray.
       *
       * @param {Array<T>} content Array of content to prepend.
       */
      unshift (content) {
        this.insert(0, content);
      }

      /**
       * Deletes elements starting from an index.
       *
       * @param {number} index Index at which to start deleting elements
       * @param {number} length The number of elements to remove. Defaults to 1.
       */
      delete (index, length = 1) {
        if (this.doc !== null) {
          transact(this.doc, transaction => {
            typeListDelete(transaction, this, index, length);
          });
        } else {
          /** @type {Array<any>} */ (this._prelimContent).splice(index, length);
        }
      }

      /**
       * Returns the i-th element from a YArray.
       *
       * @param {number} index The index of the element to return from the YArray
       * @return {T}
       */
      get (index) {
        return typeListGet(this, index)
      }

      /**
       * Transforms this YArray to a JavaScript Array.
       *
       * @return {Array<T>}
       */
      toArray () {
        return typeListToArray(this)
      }

      /**
       * Returns a portion of this YArray into a JavaScript Array selected
       * from start to end (end not included).
       *
       * @param {number} [start]
       * @param {number} [end]
       * @return {Array<T>}
       */
      slice (start = 0, end = this.length) {
        return typeListSlice(this, start, end)
      }

      /**
       * Transforms this Shared Type to a JSON object.
       *
       * @return {Array<any>}
       */
      toJSON () {
        return this.map(c => c instanceof AbstractType ? c.toJSON() : c)
      }

      /**
       * Returns an Array with the result of calling a provided function on every
       * element of this YArray.
       *
       * @template M
       * @param {function(T,number,YArray<T>):M} f Function that produces an element of the new Array
       * @return {Array<M>} A new array with each element being the result of the
       *                 callback function
       */
      map (f) {
        return typeListMap(this, /** @type {any} */ (f))
      }

      /**
       * Executes a provided function once on every element of this YArray.
       *
       * @param {function(T,number,YArray<T>):void} f A function to execute on every element of this YArray.
       */
      forEach (f) {
        typeListForEach(this, f);
      }

      /**
       * @return {IterableIterator<T>}
       */
      [Symbol.iterator] () {
        return typeListCreateIterator(this)
      }

      /**
       * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
       */
      _write (encoder) {
        encoder.writeTypeRef(YArrayRefID);
      }
    }

    /**
     * @param {UpdateDecoderV1 | UpdateDecoderV2} _decoder
     *
     * @private
     * @function
     */
    const readYArray = _decoder => new YArray();

    /**
     * @module YMap
     */


    /**
     * @template T
     * @extends YEvent<YMap<T>>
     * Event that describes the changes on a YMap.
     */
    class YMapEvent extends YEvent {
      /**
       * @param {YMap<T>} ymap The YArray that changed.
       * @param {Transaction} transaction
       * @param {Set<any>} subs The keys that changed.
       */
      constructor (ymap, transaction, subs) {
        super(ymap, transaction);
        this.keysChanged = subs;
      }
    }

    /**
     * @template MapType
     * A shared Map implementation.
     *
     * @extends AbstractType<YMapEvent<MapType>>
     * @implements {Iterable<[string, MapType]>}
     */
    class YMap extends AbstractType {
      /**
       *
       * @param {Iterable<readonly [string, any]>=} entries - an optional iterable to initialize the YMap
       */
      constructor (entries) {
        super();
        /**
         * @type {Map<string,any>?}
         * @private
         */
        this._prelimContent = null;

        if (entries === undefined) {
          this._prelimContent = new Map();
        } else {
          this._prelimContent = new Map(entries);
        }
      }

      /**
       * Integrate this type into the Yjs instance.
       *
       * * Save this struct in the os
       * * This type is sent to other client
       * * Observer functions are fired
       *
       * @param {Doc} y The Yjs instance
       * @param {Item} item
       */
      _integrate (y, item) {
        super._integrate(y, item)
        ;/** @type {Map<string, any>} */ (this._prelimContent).forEach((value, key) => {
          this.set(key, value);
        });
        this._prelimContent = null;
      }

      /**
       * @return {YMap<MapType>}
       */
      _copy () {
        return new YMap()
      }

      /**
       * Makes a copy of this data type that can be included somewhere else.
       *
       * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
       *
       * @return {YMap<MapType>}
       */
      clone () {
        /**
         * @type {YMap<MapType>}
         */
        const map = new YMap();
        this.forEach((value, key) => {
          map.set(key, value instanceof AbstractType ? /** @type {typeof value} */ (value.clone()) : value);
        });
        return map
      }

      /**
       * Creates YMapEvent and calls observers.
       *
       * @param {Transaction} transaction
       * @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
       */
      _callObserver (transaction, parentSubs) {
        callTypeObservers(this, transaction, new YMapEvent(this, transaction, parentSubs));
      }

      /**
       * Transforms this Shared Type to a JSON object.
       *
       * @return {Object<string,any>}
       */
      toJSON () {
        this.doc ?? warnPrematureAccess();
        /**
         * @type {Object<string,MapType>}
         */
        const map = {};
        this._map.forEach((item, key) => {
          if (!item.deleted) {
            const v = item.content.getContent()[item.length - 1];
            map[key] = v instanceof AbstractType ? v.toJSON() : v;
          }
        });
        return map
      }

      /**
       * Returns the size of the YMap (count of key/value pairs)
       *
       * @return {number}
       */
      get size () {
        return [...createMapIterator(this)].length
      }

      /**
       * Returns the keys for each element in the YMap Type.
       *
       * @return {IterableIterator<string>}
       */
      keys () {
        return iteratorMap(createMapIterator(this), /** @param {any} v */ v => v[0])
      }

      /**
       * Returns the values for each element in the YMap Type.
       *
       * @return {IterableIterator<MapType>}
       */
      values () {
        return iteratorMap(createMapIterator(this), /** @param {any} v */ v => v[1].content.getContent()[v[1].length - 1])
      }

      /**
       * Returns an Iterator of [key, value] pairs
       *
       * @return {IterableIterator<[string, MapType]>}
       */
      entries () {
        return iteratorMap(createMapIterator(this), /** @param {any} v */ v => /** @type {any} */ ([v[0], v[1].content.getContent()[v[1].length - 1]]))
      }

      /**
       * Executes a provided function on once on every key-value pair.
       *
       * @param {function(MapType,string,YMap<MapType>):void} f A function to execute on every element of this YArray.
       */
      forEach (f) {
        this.doc ?? warnPrematureAccess();
        this._map.forEach((item, key) => {
          if (!item.deleted) {
            f(item.content.getContent()[item.length - 1], key, this);
          }
        });
      }

      /**
       * Returns an Iterator of [key, value] pairs
       *
       * @return {IterableIterator<[string, MapType]>}
       */
      [Symbol.iterator] () {
        return this.entries()
      }

      /**
       * Remove a specified element from this YMap.
       *
       * @param {string} key The key of the element to remove.
       */
      delete (key) {
        if (this.doc !== null) {
          transact(this.doc, transaction => {
            typeMapDelete(transaction, this, key);
          });
        } else {
          /** @type {Map<string, any>} */ (this._prelimContent).delete(key);
        }
      }

      /**
       * Adds or updates an element with a specified key and value.
       * @template {MapType} VAL
       *
       * @param {string} key The key of the element to add to this YMap
       * @param {VAL} value The value of the element to add
       * @return {VAL}
       */
      set (key, value) {
        if (this.doc !== null) {
          transact(this.doc, transaction => {
            typeMapSet(transaction, this, key, /** @type {any} */ (value));
          });
        } else {
          /** @type {Map<string, any>} */ (this._prelimContent).set(key, value);
        }
        return value
      }

      /**
       * Returns a specified element from this YMap.
       *
       * @param {string} key
       * @return {MapType|undefined}
       */
      get (key) {
        return /** @type {any} */ (typeMapGet(this, key))
      }

      /**
       * Returns a boolean indicating whether the specified key exists or not.
       *
       * @param {string} key The key to test.
       * @return {boolean}
       */
      has (key) {
        return typeMapHas(this, key)
      }

      /**
       * Removes all elements from this YMap.
       */
      clear () {
        if (this.doc !== null) {
          transact(this.doc, transaction => {
            this.forEach(function (_value, key, map) {
              typeMapDelete(transaction, map, key);
            });
          });
        } else {
          /** @type {Map<string, any>} */ (this._prelimContent).clear();
        }
      }

      /**
       * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
       */
      _write (encoder) {
        encoder.writeTypeRef(YMapRefID);
      }
    }

    /**
     * @param {UpdateDecoderV1 | UpdateDecoderV2} _decoder
     *
     * @private
     * @function
     */
    const readYMap = _decoder => new YMap();

    /**
     * @module YText
     */


    /**
     * @param {any} a
     * @param {any} b
     * @return {boolean}
     */
    const equalAttrs = (a, b) => a === b || (typeof a === 'object' && typeof b === 'object' && a && b && equalFlat(a, b));

    class ItemTextListPosition {
      /**
       * @param {Item|null} left
       * @param {Item|null} right
       * @param {number} index
       * @param {Map<string,any>} currentAttributes
       */
      constructor (left, right, index, currentAttributes) {
        this.left = left;
        this.right = right;
        this.index = index;
        this.currentAttributes = currentAttributes;
      }

      /**
       * Only call this if you know that this.right is defined
       */
      forward () {
        if (this.right === null) {
          unexpectedCase();
        }
        switch (this.right.content.constructor) {
          case ContentFormat:
            if (!this.right.deleted) {
              updateCurrentAttributes(this.currentAttributes, /** @type {ContentFormat} */ (this.right.content));
            }
            break
          default:
            if (!this.right.deleted) {
              this.index += this.right.length;
            }
            break
        }
        this.left = this.right;
        this.right = this.right.right;
      }
    }

    /**
     * @param {Transaction} transaction
     * @param {ItemTextListPosition} pos
     * @param {number} count steps to move forward
     * @return {ItemTextListPosition}
     *
     * @private
     * @function
     */
    const findNextPosition = (transaction, pos, count) => {
      while (pos.right !== null && count > 0) {
        switch (pos.right.content.constructor) {
          case ContentFormat:
            if (!pos.right.deleted) {
              updateCurrentAttributes(pos.currentAttributes, /** @type {ContentFormat} */ (pos.right.content));
            }
            break
          default:
            if (!pos.right.deleted) {
              if (count < pos.right.length) {
                // split right
                getItemCleanStart(transaction, createID(pos.right.id.client, pos.right.id.clock + count));
              }
              pos.index += pos.right.length;
              count -= pos.right.length;
            }
            break
        }
        pos.left = pos.right;
        pos.right = pos.right.right;
        // pos.forward() - we don't forward because that would halve the performance because we already do the checks above
      }
      return pos
    };

    /**
     * @param {Transaction} transaction
     * @param {AbstractType<any>} parent
     * @param {number} index
     * @param {boolean} useSearchMarker
     * @return {ItemTextListPosition}
     *
     * @private
     * @function
     */
    const findPosition = (transaction, parent, index, useSearchMarker) => {
      const currentAttributes = new Map();
      const marker = useSearchMarker ? findMarker(parent, index) : null;
      if (marker) {
        const pos = new ItemTextListPosition(marker.p.left, marker.p, marker.index, currentAttributes);
        return findNextPosition(transaction, pos, index - marker.index)
      } else {
        const pos = new ItemTextListPosition(null, parent._start, 0, currentAttributes);
        return findNextPosition(transaction, pos, index)
      }
    };

    /**
     * Negate applied formats
     *
     * @param {Transaction} transaction
     * @param {AbstractType<any>} parent
     * @param {ItemTextListPosition} currPos
     * @param {Map<string,any>} negatedAttributes
     *
     * @private
     * @function
     */
    const insertNegatedAttributes = (transaction, parent, currPos, negatedAttributes) => {
      // check if we really need to remove attributes
      while (
        currPos.right !== null && (
          currPos.right.deleted === true || (
            currPos.right.content.constructor === ContentFormat &&
            equalAttrs(negatedAttributes.get(/** @type {ContentFormat} */ (currPos.right.content).key), /** @type {ContentFormat} */ (currPos.right.content).value)
          )
        )
      ) {
        if (!currPos.right.deleted) {
          negatedAttributes.delete(/** @type {ContentFormat} */ (currPos.right.content).key);
        }
        currPos.forward();
      }
      const doc = transaction.doc;
      const ownClientId = doc.clientID;
      negatedAttributes.forEach((val, key) => {
        const left = currPos.left;
        const right = currPos.right;
        const nextFormat = new Item(createID(ownClientId, getState(doc.store, ownClientId)), left, left && left.lastId, right, right && right.id, parent, null, new ContentFormat(key, val));
        nextFormat.integrate(transaction, 0);
        currPos.right = nextFormat;
        currPos.forward();
      });
    };

    /**
     * @param {Map<string,any>} currentAttributes
     * @param {ContentFormat} format
     *
     * @private
     * @function
     */
    const updateCurrentAttributes = (currentAttributes, format) => {
      const { key, value } = format;
      if (value === null) {
        currentAttributes.delete(key);
      } else {
        currentAttributes.set(key, value);
      }
    };

    /**
     * @param {ItemTextListPosition} currPos
     * @param {Object<string,any>} attributes
     *
     * @private
     * @function
     */
    const minimizeAttributeChanges = (currPos, attributes) => {
      // go right while attributes[right.key] === right.value (or right is deleted)
      while (true) {
        if (currPos.right === null) {
          break
        } else if (currPos.right.deleted || (currPos.right.content.constructor === ContentFormat && equalAttrs(attributes[(/** @type {ContentFormat} */ (currPos.right.content)).key] ?? null, /** @type {ContentFormat} */ (currPos.right.content).value))) ; else {
          break
        }
        currPos.forward();
      }
    };

    /**
     * @param {Transaction} transaction
     * @param {AbstractType<any>} parent
     * @param {ItemTextListPosition} currPos
     * @param {Object<string,any>} attributes
     * @return {Map<string,any>}
     *
     * @private
     * @function
     **/
    const insertAttributes = (transaction, parent, currPos, attributes) => {
      const doc = transaction.doc;
      const ownClientId = doc.clientID;
      const negatedAttributes = new Map();
      // insert format-start items
      for (const key in attributes) {
        const val = attributes[key];
        const currentVal = currPos.currentAttributes.get(key) ?? null;
        if (!equalAttrs(currentVal, val)) {
          // save negated attribute (set null if currentVal undefined)
          negatedAttributes.set(key, currentVal);
          const { left, right } = currPos;
          currPos.right = new Item(createID(ownClientId, getState(doc.store, ownClientId)), left, left && left.lastId, right, right && right.id, parent, null, new ContentFormat(key, val));
          currPos.right.integrate(transaction, 0);
          currPos.forward();
        }
      }
      return negatedAttributes
    };

    /**
     * @param {Transaction} transaction
     * @param {AbstractType<any>} parent
     * @param {ItemTextListPosition} currPos
     * @param {string|object|AbstractType<any>} text
     * @param {Object<string,any>} attributes
     *
     * @private
     * @function
     **/
    const insertText = (transaction, parent, currPos, text, attributes) => {
      currPos.currentAttributes.forEach((_val, key) => {
        if (attributes[key] === undefined) {
          attributes[key] = null;
        }
      });
      const doc = transaction.doc;
      const ownClientId = doc.clientID;
      minimizeAttributeChanges(currPos, attributes);
      const negatedAttributes = insertAttributes(transaction, parent, currPos, attributes);
      // insert content
      const content = text.constructor === String ? new ContentString(/** @type {string} */ (text)) : (text instanceof AbstractType ? new ContentType(text) : new ContentEmbed(text));
      let { left, right, index } = currPos;
      if (parent._searchMarker) {
        updateMarkerChanges(parent._searchMarker, currPos.index, content.getLength());
      }
      right = new Item(createID(ownClientId, getState(doc.store, ownClientId)), left, left && left.lastId, right, right && right.id, parent, null, content);
      right.integrate(transaction, 0);
      currPos.right = right;
      currPos.index = index;
      currPos.forward();
      insertNegatedAttributes(transaction, parent, currPos, negatedAttributes);
    };

    /**
     * @param {Transaction} transaction
     * @param {AbstractType<any>} parent
     * @param {ItemTextListPosition} currPos
     * @param {number} length
     * @param {Object<string,any>} attributes
     *
     * @private
     * @function
     */
    const formatText = (transaction, parent, currPos, length, attributes) => {
      const doc = transaction.doc;
      const ownClientId = doc.clientID;
      minimizeAttributeChanges(currPos, attributes);
      const negatedAttributes = insertAttributes(transaction, parent, currPos, attributes);
      // iterate until first non-format or null is found
      // delete all formats with attributes[format.key] != null
      // also check the attributes after the first non-format as we do not want to insert redundant negated attributes there
      // eslint-disable-next-line no-labels
      iterationLoop: while (
        currPos.right !== null &&
        (length > 0 ||
          (
            negatedAttributes.size > 0 &&
            (currPos.right.deleted || currPos.right.content.constructor === ContentFormat)
          )
        )
      ) {
        if (!currPos.right.deleted) {
          switch (currPos.right.content.constructor) {
            case ContentFormat: {
              const { key, value } = /** @type {ContentFormat} */ (currPos.right.content);
              const attr = attributes[key];
              if (attr !== undefined) {
                if (equalAttrs(attr, value)) {
                  negatedAttributes.delete(key);
                } else {
                  if (length === 0) {
                    // no need to further extend negatedAttributes
                    // eslint-disable-next-line no-labels
                    break iterationLoop
                  }
                  negatedAttributes.set(key, value);
                }
                currPos.right.delete(transaction);
              } else {
                currPos.currentAttributes.set(key, value);
              }
              break
            }
            default:
              if (length < currPos.right.length) {
                getItemCleanStart(transaction, createID(currPos.right.id.client, currPos.right.id.clock + length));
              }
              length -= currPos.right.length;
              break
          }
        }
        currPos.forward();
      }
      // Quill just assumes that the editor starts with a newline and that it always
      // ends with a newline. We only insert that newline when a new newline is
      // inserted - i.e when length is bigger than type.length
      if (length > 0) {
        let newlines = '';
        for (; length > 0; length--) {
          newlines += '\n';
        }
        currPos.right = new Item(createID(ownClientId, getState(doc.store, ownClientId)), currPos.left, currPos.left && currPos.left.lastId, currPos.right, currPos.right && currPos.right.id, parent, null, new ContentString(newlines));
        currPos.right.integrate(transaction, 0);
        currPos.forward();
      }
      insertNegatedAttributes(transaction, parent, currPos, negatedAttributes);
    };

    /**
     * Call this function after string content has been deleted in order to
     * clean up formatting Items.
     *
     * @param {Transaction} transaction
     * @param {Item} start
     * @param {Item|null} curr exclusive end, automatically iterates to the next Content Item
     * @param {Map<string,any>} startAttributes
     * @param {Map<string,any>} currAttributes
     * @return {number} The amount of formatting Items deleted.
     *
     * @function
     */
    const cleanupFormattingGap = (transaction, start, curr, startAttributes, currAttributes) => {
      /**
       * @type {Item|null}
       */
      let end = start;
      /**
       * @type {Map<string,ContentFormat>}
       */
      const endFormats = create$3();
      while (end && (!end.countable || end.deleted)) {
        if (!end.deleted && end.content.constructor === ContentFormat) {
          const cf = /** @type {ContentFormat} */ (end.content);
          endFormats.set(cf.key, cf);
        }
        end = end.right;
      }
      let cleanups = 0;
      let reachedCurr = false;
      while (start !== end) {
        if (curr === start) {
          reachedCurr = true;
        }
        if (!start.deleted) {
          const content = start.content;
          switch (content.constructor) {
            case ContentFormat: {
              const { key, value } = /** @type {ContentFormat} */ (content);
              const startAttrValue = startAttributes.get(key) ?? null;
              if (endFormats.get(key) !== content || startAttrValue === value) {
                // Either this format is overwritten or it is not necessary because the attribute already existed.
                start.delete(transaction);
                cleanups++;
                if (!reachedCurr && (currAttributes.get(key) ?? null) === value && startAttrValue !== value) {
                  if (startAttrValue === null) {
                    currAttributes.delete(key);
                  } else {
                    currAttributes.set(key, startAttrValue);
                  }
                }
              }
              if (!reachedCurr && !start.deleted) {
                updateCurrentAttributes(currAttributes, /** @type {ContentFormat} */ (content));
              }
              break
            }
          }
        }
        start = /** @type {Item} */ (start.right);
      }
      return cleanups
    };

    /**
     * @param {Transaction} transaction
     * @param {Item | null} item
     */
    const cleanupContextlessFormattingGap = (transaction, item) => {
      // iterate until item.right is null or content
      while (item && item.right && (item.right.deleted || !item.right.countable)) {
        item = item.right;
      }
      const attrs = new Set();
      // iterate back until a content item is found
      while (item && (item.deleted || !item.countable)) {
        if (!item.deleted && item.content.constructor === ContentFormat) {
          const key = /** @type {ContentFormat} */ (item.content).key;
          if (attrs.has(key)) {
            item.delete(transaction);
          } else {
            attrs.add(key);
          }
        }
        item = item.left;
      }
    };

    /**
     * This function is experimental and subject to change / be removed.
     *
     * Ideally, we don't need this function at all. Formatting attributes should be cleaned up
     * automatically after each change. This function iterates twice over the complete YText type
     * and removes unnecessary formatting attributes. This is also helpful for testing.
     *
     * This function won't be exported anymore as soon as there is confidence that the YText type works as intended.
     *
     * @param {YText} type
     * @return {number} How many formatting attributes have been cleaned up.
     */
    const cleanupYTextFormatting = type => {
      let res = 0;
      transact(/** @type {Doc} */ (type.doc), transaction => {
        let start = /** @type {Item} */ (type._start);
        let end = type._start;
        let startAttributes = create$3();
        const currentAttributes = copy(startAttributes);
        while (end) {
          if (end.deleted === false) {
            switch (end.content.constructor) {
              case ContentFormat:
                updateCurrentAttributes(currentAttributes, /** @type {ContentFormat} */ (end.content));
                break
              default:
                res += cleanupFormattingGap(transaction, start, end, startAttributes, currentAttributes);
                startAttributes = copy(currentAttributes);
                start = end;
                break
            }
          }
          end = end.right;
        }
      });
      return res
    };

    /**
     * This will be called by the transaction once the event handlers are called to potentially cleanup
     * formatting attributes.
     *
     * @param {Transaction} transaction
     */
    const cleanupYTextAfterTransaction = transaction => {
      /**
       * @type {Set<YText>}
       */
      const needFullCleanup = new Set();
      // check if another formatting item was inserted
      const doc = transaction.doc;
      for (const [client, afterClock] of transaction.afterState.entries()) {
        const clock = transaction.beforeState.get(client) || 0;
        if (afterClock === clock) {
          continue
        }
        iterateStructs(transaction, /** @type {Array<Item|GC>} */ (doc.store.clients.get(client)), clock, afterClock, item => {
          if (
            !item.deleted && /** @type {Item} */ (item).content.constructor === ContentFormat && item.constructor !== GC
          ) {
            needFullCleanup.add(/** @type {any} */ (item).parent);
          }
        });
      }
      // cleanup in a new transaction
      transact(doc, (t) => {
        iterateDeletedStructs(transaction, transaction.deleteSet, item => {
          if (item instanceof GC || !(/** @type {YText} */ (item.parent)._hasFormatting) || needFullCleanup.has(/** @type {YText} */ (item.parent))) {
            return
          }
          const parent = /** @type {YText} */ (item.parent);
          if (item.content.constructor === ContentFormat) {
            needFullCleanup.add(parent);
          } else {
            // If no formatting attribute was inserted or deleted, we can make due with contextless
            // formatting cleanups.
            // Contextless: it is not necessary to compute currentAttributes for the affected position.
            cleanupContextlessFormattingGap(t, item);
          }
        });
        // If a formatting item was inserted, we simply clean the whole type.
        // We need to compute currentAttributes for the current position anyway.
        for (const yText of needFullCleanup) {
          cleanupYTextFormatting(yText);
        }
      });
    };

    /**
     * @param {Transaction} transaction
     * @param {ItemTextListPosition} currPos
     * @param {number} length
     * @return {ItemTextListPosition}
     *
     * @private
     * @function
     */
    const deleteText = (transaction, currPos, length) => {
      const startLength = length;
      const startAttrs = copy(currPos.currentAttributes);
      const start = currPos.right;
      while (length > 0 && currPos.right !== null) {
        if (currPos.right.deleted === false) {
          switch (currPos.right.content.constructor) {
            case ContentType:
            case ContentEmbed:
            case ContentString:
              if (length < currPos.right.length) {
                getItemCleanStart(transaction, createID(currPos.right.id.client, currPos.right.id.clock + length));
              }
              length -= currPos.right.length;
              currPos.right.delete(transaction);
              break
          }
        }
        currPos.forward();
      }
      if (start) {
        cleanupFormattingGap(transaction, start, currPos.right, startAttrs, currPos.currentAttributes);
      }
      const parent = /** @type {AbstractType<any>} */ (/** @type {Item} */ (currPos.left || currPos.right).parent);
      if (parent._searchMarker) {
        updateMarkerChanges(parent._searchMarker, currPos.index, -startLength + length);
      }
      return currPos
    };

    /**
     * The Quill Delta format represents changes on a text document with
     * formatting information. For more information visit {@link https://quilljs.com/docs/delta/|Quill Delta}
     *
     * @example
     *   {
     *     ops: [
     *       { insert: 'Gandalf', attributes: { bold: true } },
     *       { insert: ' the ' },
     *       { insert: 'Grey', attributes: { color: '#cccccc' } }
     *     ]
     *   }
     *
     */

    /**
      * Attributes that can be assigned to a selection of text.
      *
      * @example
      *   {
      *     bold: true,
      *     font-size: '40px'
      *   }
      *
      * @typedef {Object} TextAttributes
      */

    /**
     * @extends YEvent<YText>
     * Event that describes the changes on a YText type.
     */
    class YTextEvent extends YEvent {
      /**
       * @param {YText} ytext
       * @param {Transaction} transaction
       * @param {Set<any>} subs The keys that changed
       */
      constructor (ytext, transaction, subs) {
        super(ytext, transaction);
        /**
         * Whether the children changed.
         * @type {Boolean}
         * @private
         */
        this.childListChanged = false;
        /**
         * Set of all changed attributes.
         * @type {Set<string>}
         */
        this.keysChanged = new Set();
        subs.forEach((sub) => {
          if (sub === null) {
            this.childListChanged = true;
          } else {
            this.keysChanged.add(sub);
          }
        });
      }

      /**
       * @type {{added:Set<Item>,deleted:Set<Item>,keys:Map<string,{action:'add'|'update'|'delete',oldValue:any}>,delta:Array<{insert?:Array<any>|string, delete?:number, retain?:number}>}}
       */
      get changes () {
        if (this._changes === null) {
          /**
           * @type {{added:Set<Item>,deleted:Set<Item>,keys:Map<string,{action:'add'|'update'|'delete',oldValue:any}>,delta:Array<{insert?:Array<any>|string|AbstractType<any>|object, delete?:number, retain?:number}>}}
           */
          const changes = {
            keys: this.keys,
            delta: this.delta,
            added: new Set(),
            deleted: new Set()
          };
          this._changes = changes;
        }
        return /** @type {any} */ (this._changes)
      }

      /**
       * Compute the changes in the delta format.
       * A {@link https://quilljs.com/docs/delta/|Quill Delta}) that represents the changes on the document.
       *
       * @type {Array<{insert?:string|object|AbstractType<any>, delete?:number, retain?:number, attributes?: Object<string,any>}>}
       *
       * @public
       */
      get delta () {
        if (this._delta === null) {
          const y = /** @type {Doc} */ (this.target.doc);
          /**
           * @type {Array<{insert?:string|object|AbstractType<any>, delete?:number, retain?:number, attributes?: Object<string,any>}>}
           */
          const delta = [];
          transact(y, transaction => {
            const currentAttributes = new Map(); // saves all current attributes for insert
            const oldAttributes = new Map();
            let item = this.target._start;
            /**
             * @type {string?}
             */
            let action = null;
            /**
             * @type {Object<string,any>}
             */
            const attributes = {}; // counts added or removed new attributes for retain
            /**
             * @type {string|object}
             */
            let insert = '';
            let retain = 0;
            let deleteLen = 0;
            const addOp = () => {
              if (action !== null) {
                /**
                 * @type {any}
                 */
                let op = null;
                switch (action) {
                  case 'delete':
                    if (deleteLen > 0) {
                      op = { delete: deleteLen };
                    }
                    deleteLen = 0;
                    break
                  case 'insert':
                    if (typeof insert === 'object' || insert.length > 0) {
                      op = { insert };
                      if (currentAttributes.size > 0) {
                        op.attributes = {};
                        currentAttributes.forEach((value, key) => {
                          if (value !== null) {
                            op.attributes[key] = value;
                          }
                        });
                      }
                    }
                    insert = '';
                    break
                  case 'retain':
                    if (retain > 0) {
                      op = { retain };
                      if (!isEmpty(attributes)) {
                        op.attributes = assign({}, attributes);
                      }
                    }
                    retain = 0;
                    break
                }
                if (op) delta.push(op);
                action = null;
              }
            };
            while (item !== null) {
              switch (item.content.constructor) {
                case ContentType:
                case ContentEmbed:
                  if (this.adds(item)) {
                    if (!this.deletes(item)) {
                      addOp();
                      action = 'insert';
                      insert = item.content.getContent()[0];
                      addOp();
                    }
                  } else if (this.deletes(item)) {
                    if (action !== 'delete') {
                      addOp();
                      action = 'delete';
                    }
                    deleteLen += 1;
                  } else if (!item.deleted) {
                    if (action !== 'retain') {
                      addOp();
                      action = 'retain';
                    }
                    retain += 1;
                  }
                  break
                case ContentString:
                  if (this.adds(item)) {
                    if (!this.deletes(item)) {
                      if (action !== 'insert') {
                        addOp();
                        action = 'insert';
                      }
                      insert += /** @type {ContentString} */ (item.content).str;
                    }
                  } else if (this.deletes(item)) {
                    if (action !== 'delete') {
                      addOp();
                      action = 'delete';
                    }
                    deleteLen += item.length;
                  } else if (!item.deleted) {
                    if (action !== 'retain') {
                      addOp();
                      action = 'retain';
                    }
                    retain += item.length;
                  }
                  break
                case ContentFormat: {
                  const { key, value } = /** @type {ContentFormat} */ (item.content);
                  if (this.adds(item)) {
                    if (!this.deletes(item)) {
                      const curVal = currentAttributes.get(key) ?? null;
                      if (!equalAttrs(curVal, value)) {
                        if (action === 'retain') {
                          addOp();
                        }
                        if (equalAttrs(value, (oldAttributes.get(key) ?? null))) {
                          delete attributes[key];
                        } else {
                          attributes[key] = value;
                        }
                      } else if (value !== null) {
                        item.delete(transaction);
                      }
                    }
                  } else if (this.deletes(item)) {
                    oldAttributes.set(key, value);
                    const curVal = currentAttributes.get(key) ?? null;
                    if (!equalAttrs(curVal, value)) {
                      if (action === 'retain') {
                        addOp();
                      }
                      attributes[key] = curVal;
                    }
                  } else if (!item.deleted) {
                    oldAttributes.set(key, value);
                    const attr = attributes[key];
                    if (attr !== undefined) {
                      if (!equalAttrs(attr, value)) {
                        if (action === 'retain') {
                          addOp();
                        }
                        if (value === null) {
                          delete attributes[key];
                        } else {
                          attributes[key] = value;
                        }
                      } else if (attr !== null) { // this will be cleaned up automatically by the contextless cleanup function
                        item.delete(transaction);
                      }
                    }
                  }
                  if (!item.deleted) {
                    if (action === 'insert') {
                      addOp();
                    }
                    updateCurrentAttributes(currentAttributes, /** @type {ContentFormat} */ (item.content));
                  }
                  break
                }
              }
              item = item.right;
            }
            addOp();
            while (delta.length > 0) {
              const lastOp = delta[delta.length - 1];
              if (lastOp.retain !== undefined && lastOp.attributes === undefined) {
                // retain delta's if they don't assign attributes
                delta.pop();
              } else {
                break
              }
            }
          });
          this._delta = delta;
        }
        return /** @type {any} */ (this._delta)
      }
    }

    /**
     * Type that represents text with formatting information.
     *
     * This type replaces y-richtext as this implementation is able to handle
     * block formats (format information on a paragraph), embeds (complex elements
     * like pictures and videos), and text formats (**bold**, *italic*).
     *
     * @extends AbstractType<YTextEvent>
     */
    class YText extends AbstractType {
      /**
       * @param {String} [string] The initial value of the YText.
       */
      constructor (string) {
        super();
        /**
         * Array of pending operations on this type
         * @type {Array<function():void>?}
         */
        this._pending = string !== undefined ? [() => this.insert(0, string)] : [];
        /**
         * @type {Array<ArraySearchMarker>|null}
         */
        this._searchMarker = [];
        /**
         * Whether this YText contains formatting attributes.
         * This flag is updated when a formatting item is integrated (see ContentFormat.integrate)
         */
        this._hasFormatting = false;
      }

      /**
       * Number of characters of this text type.
       *
       * @type {number}
       */
      get length () {
        this.doc ?? warnPrematureAccess();
        return this._length
      }

      /**
       * @param {Doc} y
       * @param {Item} item
       */
      _integrate (y, item) {
        super._integrate(y, item);
        try {
          /** @type {Array<function>} */ (this._pending).forEach(f => f());
        } catch (e) {
          console.error(e);
        }
        this._pending = null;
      }

      _copy () {
        return new YText()
      }

      /**
       * Makes a copy of this data type that can be included somewhere else.
       *
       * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
       *
       * @return {YText}
       */
      clone () {
        const text = new YText();
        text.applyDelta(this.toDelta());
        return text
      }

      /**
       * Creates YTextEvent and calls observers.
       *
       * @param {Transaction} transaction
       * @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
       */
      _callObserver (transaction, parentSubs) {
        super._callObserver(transaction, parentSubs);
        const event = new YTextEvent(this, transaction, parentSubs);
        callTypeObservers(this, transaction, event);
        // If a remote change happened, we try to cleanup potential formatting duplicates.
        if (!transaction.local && this._hasFormatting) {
          transaction._needFormattingCleanup = true;
        }
      }

      /**
       * Returns the unformatted string representation of this YText type.
       *
       * @public
       */
      toString () {
        this.doc ?? warnPrematureAccess();
        let str = '';
        /**
         * @type {Item|null}
         */
        let n = this._start;
        while (n !== null) {
          if (!n.deleted && n.countable && n.content.constructor === ContentString) {
            str += /** @type {ContentString} */ (n.content).str;
          }
          n = n.right;
        }
        return str
      }

      /**
       * Returns the unformatted string representation of this YText type.
       *
       * @return {string}
       * @public
       */
      toJSON () {
        return this.toString()
      }

      /**
       * Apply a {@link Delta} on this shared YText type.
       *
       * @param {Array<any>} delta The changes to apply on this element.
       * @param {object}  opts
       * @param {boolean} [opts.sanitize] Sanitize input delta. Removes ending newlines if set to true.
       *
       *
       * @public
       */
      applyDelta (delta, { sanitize = true } = {}) {
        if (this.doc !== null) {
          transact(this.doc, transaction => {
            const currPos = new ItemTextListPosition(null, this._start, 0, new Map());
            for (let i = 0; i < delta.length; i++) {
              const op = delta[i];
              if (op.insert !== undefined) {
                // Quill assumes that the content starts with an empty paragraph.
                // Yjs/Y.Text assumes that it starts empty. We always hide that
                // there is a newline at the end of the content.
                // If we omit this step, clients will see a different number of
                // paragraphs, but nothing bad will happen.
                const ins = (!sanitize && typeof op.insert === 'string' && i === delta.length - 1 && currPos.right === null && op.insert.slice(-1) === '\n') ? op.insert.slice(0, -1) : op.insert;
                if (typeof ins !== 'string' || ins.length > 0) {
                  insertText(transaction, this, currPos, ins, op.attributes || {});
                }
              } else if (op.retain !== undefined) {
                formatText(transaction, this, currPos, op.retain, op.attributes || {});
              } else if (op.delete !== undefined) {
                deleteText(transaction, currPos, op.delete);
              }
            }
          });
        } else {
          /** @type {Array<function>} */ (this._pending).push(() => this.applyDelta(delta));
        }
      }

      /**
       * Returns the Delta representation of this YText type.
       *
       * @param {Snapshot} [snapshot]
       * @param {Snapshot} [prevSnapshot]
       * @param {function('removed' | 'added', ID):any} [computeYChange]
       * @return {any} The Delta representation of this type.
       *
       * @public
       */
      toDelta (snapshot, prevSnapshot, computeYChange) {
        this.doc ?? warnPrematureAccess();
        /**
         * @type{Array<any>}
         */
        const ops = [];
        const currentAttributes = new Map();
        const doc = /** @type {Doc} */ (this.doc);
        let str = '';
        let n = this._start;
        function packStr () {
          if (str.length > 0) {
            // pack str with attributes to ops
            /**
             * @type {Object<string,any>}
             */
            const attributes = {};
            let addAttributes = false;
            currentAttributes.forEach((value, key) => {
              addAttributes = true;
              attributes[key] = value;
            });
            /**
             * @type {Object<string,any>}
             */
            const op = { insert: str };
            if (addAttributes) {
              op.attributes = attributes;
            }
            ops.push(op);
            str = '';
          }
        }
        const computeDelta = () => {
          while (n !== null) {
            if (isVisible(n, snapshot) || (prevSnapshot !== undefined && isVisible(n, prevSnapshot))) {
              switch (n.content.constructor) {
                case ContentString: {
                  const cur = currentAttributes.get('ychange');
                  if (snapshot !== undefined && !isVisible(n, snapshot)) {
                    if (cur === undefined || cur.user !== n.id.client || cur.type !== 'removed') {
                      packStr();
                      currentAttributes.set('ychange', computeYChange ? computeYChange('removed', n.id) : { type: 'removed' });
                    }
                  } else if (prevSnapshot !== undefined && !isVisible(n, prevSnapshot)) {
                    if (cur === undefined || cur.user !== n.id.client || cur.type !== 'added') {
                      packStr();
                      currentAttributes.set('ychange', computeYChange ? computeYChange('added', n.id) : { type: 'added' });
                    }
                  } else if (cur !== undefined) {
                    packStr();
                    currentAttributes.delete('ychange');
                  }
                  str += /** @type {ContentString} */ (n.content).str;
                  break
                }
                case ContentType:
                case ContentEmbed: {
                  packStr();
                  /**
                   * @type {Object<string,any>}
                   */
                  const op = {
                    insert: n.content.getContent()[0]
                  };
                  if (currentAttributes.size > 0) {
                    const attrs = /** @type {Object<string,any>} */ ({});
                    op.attributes = attrs;
                    currentAttributes.forEach((value, key) => {
                      attrs[key] = value;
                    });
                  }
                  ops.push(op);
                  break
                }
                case ContentFormat:
                  if (isVisible(n, snapshot)) {
                    packStr();
                    updateCurrentAttributes(currentAttributes, /** @type {ContentFormat} */ (n.content));
                  }
                  break
              }
            }
            n = n.right;
          }
          packStr();
        };
        if (snapshot || prevSnapshot) {
          // snapshots are merged again after the transaction, so we need to keep the
          // transaction alive until we are done
          transact(doc, transaction => {
            if (snapshot) {
              splitSnapshotAffectedStructs(transaction, snapshot);
            }
            if (prevSnapshot) {
              splitSnapshotAffectedStructs(transaction, prevSnapshot);
            }
            computeDelta();
          }, 'cleanup');
        } else {
          computeDelta();
        }
        return ops
      }

      /**
       * Insert text at a given index.
       *
       * @param {number} index The index at which to start inserting.
       * @param {String} text The text to insert at the specified position.
       * @param {TextAttributes} [attributes] Optionally define some formatting
       *                                    information to apply on the inserted
       *                                    Text.
       * @public
       */
      insert (index, text, attributes) {
        if (text.length <= 0) {
          return
        }
        const y = this.doc;
        if (y !== null) {
          transact(y, transaction => {
            const pos = findPosition(transaction, this, index, !attributes);
            if (!attributes) {
              attributes = {};
              // @ts-ignore
              pos.currentAttributes.forEach((v, k) => { attributes[k] = v; });
            }
            insertText(transaction, this, pos, text, attributes);
          });
        } else {
          /** @type {Array<function>} */ (this._pending).push(() => this.insert(index, text, attributes));
        }
      }

      /**
       * Inserts an embed at a index.
       *
       * @param {number} index The index to insert the embed at.
       * @param {Object | AbstractType<any>} embed The Object that represents the embed.
       * @param {TextAttributes} [attributes] Attribute information to apply on the
       *                                    embed
       *
       * @public
       */
      insertEmbed (index, embed, attributes) {
        const y = this.doc;
        if (y !== null) {
          transact(y, transaction => {
            const pos = findPosition(transaction, this, index, !attributes);
            insertText(transaction, this, pos, embed, attributes || {});
          });
        } else {
          /** @type {Array<function>} */ (this._pending).push(() => this.insertEmbed(index, embed, attributes || {}));
        }
      }

      /**
       * Deletes text starting from an index.
       *
       * @param {number} index Index at which to start deleting.
       * @param {number} length The number of characters to remove. Defaults to 1.
       *
       * @public
       */
      delete (index, length) {
        if (length === 0) {
          return
        }
        const y = this.doc;
        if (y !== null) {
          transact(y, transaction => {
            deleteText(transaction, findPosition(transaction, this, index, true), length);
          });
        } else {
          /** @type {Array<function>} */ (this._pending).push(() => this.delete(index, length));
        }
      }

      /**
       * Assigns properties to a range of text.
       *
       * @param {number} index The position where to start formatting.
       * @param {number} length The amount of characters to assign properties to.
       * @param {TextAttributes} attributes Attribute information to apply on the
       *                                    text.
       *
       * @public
       */
      format (index, length, attributes) {
        if (length === 0) {
          return
        }
        const y = this.doc;
        if (y !== null) {
          transact(y, transaction => {
            const pos = findPosition(transaction, this, index, false);
            if (pos.right === null) {
              return
            }
            formatText(transaction, this, pos, length, attributes);
          });
        } else {
          /** @type {Array<function>} */ (this._pending).push(() => this.format(index, length, attributes));
        }
      }

      /**
       * Removes an attribute.
       *
       * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
       *
       * @param {String} attributeName The attribute name that is to be removed.
       *
       * @public
       */
      removeAttribute (attributeName) {
        if (this.doc !== null) {
          transact(this.doc, transaction => {
            typeMapDelete(transaction, this, attributeName);
          });
        } else {
          /** @type {Array<function>} */ (this._pending).push(() => this.removeAttribute(attributeName));
        }
      }

      /**
       * Sets or updates an attribute.
       *
       * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
       *
       * @param {String} attributeName The attribute name that is to be set.
       * @param {any} attributeValue The attribute value that is to be set.
       *
       * @public
       */
      setAttribute (attributeName, attributeValue) {
        if (this.doc !== null) {
          transact(this.doc, transaction => {
            typeMapSet(transaction, this, attributeName, attributeValue);
          });
        } else {
          /** @type {Array<function>} */ (this._pending).push(() => this.setAttribute(attributeName, attributeValue));
        }
      }

      /**
       * Returns an attribute value that belongs to the attribute name.
       *
       * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
       *
       * @param {String} attributeName The attribute name that identifies the
       *                               queried value.
       * @return {any} The queried attribute value.
       *
       * @public
       */
      getAttribute (attributeName) {
        return /** @type {any} */ (typeMapGet(this, attributeName))
      }

      /**
       * Returns all attribute name/value pairs in a JSON Object.
       *
       * @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
       *
       * @return {Object<string, any>} A JSON Object that describes the attributes.
       *
       * @public
       */
      getAttributes () {
        return typeMapGetAll(this)
      }

      /**
       * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
       */
      _write (encoder) {
        encoder.writeTypeRef(YTextRefID);
      }
    }

    /**
     * @param {UpdateDecoderV1 | UpdateDecoderV2} _decoder
     * @return {YText}
     *
     * @private
     * @function
     */
    const readYText = _decoder => new YText();

    /**
     * @module YXml
     */


    /**
     * Define the elements to which a set of CSS queries apply.
     * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors|CSS_Selectors}
     *
     * @example
     *   query = '.classSelector'
     *   query = 'nodeSelector'
     *   query = '#idSelector'
     *
     * @typedef {string} CSS_Selector
     */

    /**
     * Dom filter function.
     *
     * @callback domFilter
     * @param {string} nodeName The nodeName of the element
     * @param {Map} attributes The map of attributes.
     * @return {boolean} Whether to include the Dom node in the YXmlElement.
     */

    /**
     * Represents a subset of the nodes of a YXmlElement / YXmlFragment and a
     * position within them.
     *
     * Can be created with {@link YXmlFragment#createTreeWalker}
     *
     * @public
     * @implements {Iterable<YXmlElement|YXmlText|YXmlElement|YXmlHook>}
     */
    class YXmlTreeWalker {
      /**
       * @param {YXmlFragment | YXmlElement} root
       * @param {function(AbstractType<any>):boolean} [f]
       */
      constructor (root, f = () => true) {
        this._filter = f;
        this._root = root;
        /**
         * @type {Item}
         */
        this._currentNode = /** @type {Item} */ (root._start);
        this._firstCall = true;
        root.doc ?? warnPrematureAccess();
      }

      [Symbol.iterator] () {
        return this
      }

      /**
       * Get the next node.
       *
       * @return {IteratorResult<YXmlElement|YXmlText|YXmlHook>} The next node.
       *
       * @public
       */
      next () {
        /**
         * @type {Item|null}
         */
        let n = this._currentNode;
        let type = n && n.content && /** @type {any} */ (n.content).type;
        if (n !== null && (!this._firstCall || n.deleted || !this._filter(type))) { // if first call, we check if we can use the first item
          do {
            type = /** @type {any} */ (n.content).type;
            if (!n.deleted && (type.constructor === YXmlElement || type.constructor === YXmlFragment) && type._start !== null) {
              // walk down in the tree
              n = type._start;
            } else {
              // walk right or up in the tree
              while (n !== null) {
                /**
                 * @type {Item | null}
                 */
                const nxt = n.next;
                if (nxt !== null) {
                  n = nxt;
                  break
                } else if (n.parent === this._root) {
                  n = null;
                } else {
                  n = /** @type {AbstractType<any>} */ (n.parent)._item;
                }
              }
            }
          } while (n !== null && (n.deleted || !this._filter(/** @type {ContentType} */ (n.content).type)))
        }
        this._firstCall = false;
        if (n === null) {
          // @ts-ignore
          return { value: undefined, done: true }
        }
        this._currentNode = n;
        return { value: /** @type {any} */ (n.content).type, done: false }
      }
    }

    /**
     * Represents a list of {@link YXmlElement}.and {@link YXmlText} types.
     * A YxmlFragment is similar to a {@link YXmlElement}, but it does not have a
     * nodeName and it does not have attributes. Though it can be bound to a DOM
     * element - in this case the attributes and the nodeName are not shared.
     *
     * @public
     * @extends AbstractType<YXmlEvent>
     */
    class YXmlFragment extends AbstractType {
      constructor () {
        super();
        /**
         * @type {Array<any>|null}
         */
        this._prelimContent = [];
      }

      /**
       * @type {YXmlElement|YXmlText|null}
       */
      get firstChild () {
        const first = this._first;
        return first ? first.content.getContent()[0] : null
      }

      /**
       * Integrate this type into the Yjs instance.
       *
       * * Save this struct in the os
       * * This type is sent to other client
       * * Observer functions are fired
       *
       * @param {Doc} y The Yjs instance
       * @param {Item} item
       */
      _integrate (y, item) {
        super._integrate(y, item);
        this.insert(0, /** @type {Array<any>} */ (this._prelimContent));
        this._prelimContent = null;
      }

      _copy () {
        return new YXmlFragment()
      }

      /**
       * Makes a copy of this data type that can be included somewhere else.
       *
       * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
       *
       * @return {YXmlFragment}
       */
      clone () {
        const el = new YXmlFragment();
        // @ts-ignore
        el.insert(0, this.toArray().map(item => item instanceof AbstractType ? item.clone() : item));
        return el
      }

      get length () {
        this.doc ?? warnPrematureAccess();
        return this._prelimContent === null ? this._length : this._prelimContent.length
      }

      /**
       * Create a subtree of childNodes.
       *
       * @example
       * const walker = elem.createTreeWalker(dom => dom.nodeName === 'div')
       * for (let node in walker) {
       *   // `node` is a div node
       *   nop(node)
       * }
       *
       * @param {function(AbstractType<any>):boolean} filter Function that is called on each child element and
       *                          returns a Boolean indicating whether the child
       *                          is to be included in the subtree.
       * @return {YXmlTreeWalker} A subtree and a position within it.
       *
       * @public
       */
      createTreeWalker (filter) {
        return new YXmlTreeWalker(this, filter)
      }

      /**
       * Returns the first YXmlElement that matches the query.
       * Similar to DOM's {@link querySelector}.
       *
       * Query support:
       *   - tagname
       * TODO:
       *   - id
       *   - attribute
       *
       * @param {CSS_Selector} query The query on the children.
       * @return {YXmlElement|YXmlText|YXmlHook|null} The first element that matches the query or null.
       *
       * @public
       */
      querySelector (query) {
        query = query.toUpperCase();
        // @ts-ignore
        const iterator = new YXmlTreeWalker(this, element => element.nodeName && element.nodeName.toUpperCase() === query);
        const next = iterator.next();
        if (next.done) {
          return null
        } else {
          return next.value
        }
      }

      /**
       * Returns all YXmlElements that match the query.
       * Similar to Dom's {@link querySelectorAll}.
       *
       * @todo Does not yet support all queries. Currently only query by tagName.
       *
       * @param {CSS_Selector} query The query on the children
       * @return {Array<YXmlElement|YXmlText|YXmlHook|null>} The elements that match this query.
       *
       * @public
       */
      querySelectorAll (query) {
        query = query.toUpperCase();
        // @ts-ignore
        return from(new YXmlTreeWalker(this, element => element.nodeName && element.nodeName.toUpperCase() === query))
      }

      /**
       * Creates YXmlEvent and calls observers.
       *
       * @param {Transaction} transaction
       * @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
       */
      _callObserver (transaction, parentSubs) {
        callTypeObservers(this, transaction, new YXmlEvent(this, parentSubs, transaction));
      }

      /**
       * Get the string representation of all the children of this YXmlFragment.
       *
       * @return {string} The string representation of all children.
       */
      toString () {
        return typeListMap(this, xml => xml.toString()).join('')
      }

      /**
       * @return {string}
       */
      toJSON () {
        return this.toString()
      }

      /**
       * Creates a Dom Element that mirrors this YXmlElement.
       *
       * @param {Document} [_document=document] The document object (you must define
       *                                        this when calling this method in
       *                                        nodejs)
       * @param {Object<string, any>} [hooks={}] Optional property to customize how hooks
       *                                             are presented in the DOM
       * @param {any} [binding] You should not set this property. This is
       *                               used if DomBinding wants to create a
       *                               association to the created DOM type.
       * @return {Node} The {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}
       *
       * @public
       */
      toDOM (_document = document, hooks = {}, binding) {
        const fragment = _document.createDocumentFragment();
        if (binding !== undefined) {
          binding._createAssociation(fragment, this);
        }
        typeListForEach(this, xmlType => {
          fragment.insertBefore(xmlType.toDOM(_document, hooks, binding), null);
        });
        return fragment
      }

      /**
       * Inserts new content at an index.
       *
       * @example
       *  // Insert character 'a' at position 0
       *  xml.insert(0, [new Y.XmlText('text')])
       *
       * @param {number} index The index to insert content at
       * @param {Array<YXmlElement|YXmlText>} content The array of content
       */
      insert (index, content) {
        if (this.doc !== null) {
          transact(this.doc, transaction => {
            typeListInsertGenerics(transaction, this, index, content);
          });
        } else {
          // @ts-ignore _prelimContent is defined because this is not yet integrated
          this._prelimContent.splice(index, 0, ...content);
        }
      }

      /**
       * Inserts new content at an index.
       *
       * @example
       *  // Insert character 'a' at position 0
       *  xml.insert(0, [new Y.XmlText('text')])
       *
       * @param {null|Item|YXmlElement|YXmlText} ref The index to insert content at
       * @param {Array<YXmlElement|YXmlText>} content The array of content
       */
      insertAfter (ref, content) {
        if (this.doc !== null) {
          transact(this.doc, transaction => {
            const refItem = (ref && ref instanceof AbstractType) ? ref._item : ref;
            typeListInsertGenericsAfter(transaction, this, refItem, content);
          });
        } else {
          const pc = /** @type {Array<any>} */ (this._prelimContent);
          const index = ref === null ? 0 : pc.findIndex(el => el === ref) + 1;
          if (index === 0 && ref !== null) {
            throw create$4('Reference item not found')
          }
          pc.splice(index, 0, ...content);
        }
      }

      /**
       * Deletes elements starting from an index.
       *
       * @param {number} index Index at which to start deleting elements
       * @param {number} [length=1] The number of elements to remove. Defaults to 1.
       */
      delete (index, length = 1) {
        if (this.doc !== null) {
          transact(this.doc, transaction => {
            typeListDelete(transaction, this, index, length);
          });
        } else {
          // @ts-ignore _prelimContent is defined because this is not yet integrated
          this._prelimContent.splice(index, length);
        }
      }

      /**
       * Transforms this YArray to a JavaScript Array.
       *
       * @return {Array<YXmlElement|YXmlText|YXmlHook>}
       */
      toArray () {
        return typeListToArray(this)
      }

      /**
       * Appends content to this YArray.
       *
       * @param {Array<YXmlElement|YXmlText>} content Array of content to append.
       */
      push (content) {
        this.insert(this.length, content);
      }

      /**
       * Prepends content to this YArray.
       *
       * @param {Array<YXmlElement|YXmlText>} content Array of content to prepend.
       */
      unshift (content) {
        this.insert(0, content);
      }

      /**
       * Returns the i-th element from a YArray.
       *
       * @param {number} index The index of the element to return from the YArray
       * @return {YXmlElement|YXmlText}
       */
      get (index) {
        return typeListGet(this, index)
      }

      /**
       * Returns a portion of this YXmlFragment into a JavaScript Array selected
       * from start to end (end not included).
       *
       * @param {number} [start]
       * @param {number} [end]
       * @return {Array<YXmlElement|YXmlText>}
       */
      slice (start = 0, end = this.length) {
        return typeListSlice(this, start, end)
      }

      /**
       * Executes a provided function on once on every child element.
       *
       * @param {function(YXmlElement|YXmlText,number, typeof self):void} f A function to execute on every element of this YArray.
       */
      forEach (f) {
        typeListForEach(this, f);
      }

      /**
       * Transform the properties of this type to binary and write it to an
       * BinaryEncoder.
       *
       * This is called when this Item is sent to a remote peer.
       *
       * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder The encoder to write data to.
       */
      _write (encoder) {
        encoder.writeTypeRef(YXmlFragmentRefID);
      }
    }

    /**
     * @param {UpdateDecoderV1 | UpdateDecoderV2} _decoder
     * @return {YXmlFragment}
     *
     * @private
     * @function
     */
    const readYXmlFragment = _decoder => new YXmlFragment();

    /**
     * @typedef {Object|number|null|Array<any>|string|Uint8Array|AbstractType<any>} ValueTypes
     */

    /**
     * An YXmlElement imitates the behavior of a
     * https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element
     *
     * * An YXmlElement has attributes (key value pairs)
     * * An YXmlElement has childElements that must inherit from YXmlElement
     *
     * @template {{ [key: string]: ValueTypes }} [KV={ [key: string]: string }]
     */
    class YXmlElement extends YXmlFragment {
      constructor (nodeName = 'UNDEFINED') {
        super();
        this.nodeName = nodeName;
        /**
         * @type {Map<string, any>|null}
         */
        this._prelimAttrs = new Map();
      }

      /**
       * @type {YXmlElement|YXmlText|null}
       */
      get nextSibling () {
        const n = this._item ? this._item.next : null;
        return n ? /** @type {YXmlElement|YXmlText} */ (/** @type {ContentType} */ (n.content).type) : null
      }

      /**
       * @type {YXmlElement|YXmlText|null}
       */
      get prevSibling () {
        const n = this._item ? this._item.prev : null;
        return n ? /** @type {YXmlElement|YXmlText} */ (/** @type {ContentType} */ (n.content).type) : null
      }

      /**
       * Integrate this type into the Yjs instance.
       *
       * * Save this struct in the os
       * * This type is sent to other client
       * * Observer functions are fired
       *
       * @param {Doc} y The Yjs instance
       * @param {Item} item
       */
      _integrate (y, item) {
        super._integrate(y, item)
        ;(/** @type {Map<string, any>} */ (this._prelimAttrs)).forEach((value, key) => {
          this.setAttribute(key, value);
        });
        this._prelimAttrs = null;
      }

      /**
       * Creates an Item with the same effect as this Item (without position effect)
       *
       * @return {YXmlElement}
       */
      _copy () {
        return new YXmlElement(this.nodeName)
      }

      /**
       * Makes a copy of this data type that can be included somewhere else.
       *
       * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
       *
       * @return {YXmlElement<KV>}
       */
      clone () {
        /**
         * @type {YXmlElement<KV>}
         */
        const el = new YXmlElement(this.nodeName);
        const attrs = this.getAttributes();
        forEach(attrs, (value, key) => {
          if (typeof value === 'string') {
            el.setAttribute(key, value);
          }
        });
        // @ts-ignore
        el.insert(0, this.toArray().map(item => item instanceof AbstractType ? item.clone() : item));
        return el
      }

      /**
       * Returns the XML serialization of this YXmlElement.
       * The attributes are ordered by attribute-name, so you can easily use this
       * method to compare YXmlElements
       *
       * @return {string} The string representation of this type.
       *
       * @public
       */
      toString () {
        const attrs = this.getAttributes();
        const stringBuilder = [];
        const keys = [];
        for (const key in attrs) {
          keys.push(key);
        }
        keys.sort();
        const keysLen = keys.length;
        for (let i = 0; i < keysLen; i++) {
          const key = keys[i];
          stringBuilder.push(key + '="' + attrs[key] + '"');
        }
        const nodeName = this.nodeName.toLocaleLowerCase();
        const attrsString = stringBuilder.length > 0 ? ' ' + stringBuilder.join(' ') : '';
        return `<${nodeName}${attrsString}>${super.toString()}</${nodeName}>`
      }

      /**
       * Removes an attribute from this YXmlElement.
       *
       * @param {string} attributeName The attribute name that is to be removed.
       *
       * @public
       */
      removeAttribute (attributeName) {
        if (this.doc !== null) {
          transact(this.doc, transaction => {
            typeMapDelete(transaction, this, attributeName);
          });
        } else {
          /** @type {Map<string,any>} */ (this._prelimAttrs).delete(attributeName);
        }
      }

      /**
       * Sets or updates an attribute.
       *
       * @template {keyof KV & string} KEY
       *
       * @param {KEY} attributeName The attribute name that is to be set.
       * @param {KV[KEY]} attributeValue The attribute value that is to be set.
       *
       * @public
       */
      setAttribute (attributeName, attributeValue) {
        if (this.doc !== null) {
          transact(this.doc, transaction => {
            typeMapSet(transaction, this, attributeName, attributeValue);
          });
        } else {
          /** @type {Map<string, any>} */ (this._prelimAttrs).set(attributeName, attributeValue);
        }
      }

      /**
       * Returns an attribute value that belongs to the attribute name.
       *
       * @template {keyof KV & string} KEY
       *
       * @param {KEY} attributeName The attribute name that identifies the
       *                               queried value.
       * @return {KV[KEY]|undefined} The queried attribute value.
       *
       * @public
       */
      getAttribute (attributeName) {
        return /** @type {any} */ (typeMapGet(this, attributeName))
      }

      /**
       * Returns whether an attribute exists
       *
       * @param {string} attributeName The attribute name to check for existence.
       * @return {boolean} whether the attribute exists.
       *
       * @public
       */
      hasAttribute (attributeName) {
        return /** @type {any} */ (typeMapHas(this, attributeName))
      }

      /**
       * Returns all attribute name/value pairs in a JSON Object.
       *
       * @param {Snapshot} [snapshot]
       * @return {{ [Key in Extract<keyof KV,string>]?: KV[Key]}} A JSON Object that describes the attributes.
       *
       * @public
       */
      getAttributes (snapshot) {
        return /** @type {any} */ (snapshot ? typeMapGetAllSnapshot(this, snapshot) : typeMapGetAll(this))
      }

      /**
       * Creates a Dom Element that mirrors this YXmlElement.
       *
       * @param {Document} [_document=document] The document object (you must define
       *                                        this when calling this method in
       *                                        nodejs)
       * @param {Object<string, any>} [hooks={}] Optional property to customize how hooks
       *                                             are presented in the DOM
       * @param {any} [binding] You should not set this property. This is
       *                               used if DomBinding wants to create a
       *                               association to the created DOM type.
       * @return {Node} The {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}
       *
       * @public
       */
      toDOM (_document = document, hooks = {}, binding) {
        const dom = _document.createElement(this.nodeName);
        const attrs = this.getAttributes();
        for (const key in attrs) {
          const value = attrs[key];
          if (typeof value === 'string') {
            dom.setAttribute(key, value);
          }
        }
        typeListForEach(this, yxml => {
          dom.appendChild(yxml.toDOM(_document, hooks, binding));
        });
        if (binding !== undefined) {
          binding._createAssociation(dom, this);
        }
        return dom
      }

      /**
       * Transform the properties of this type to binary and write it to an
       * BinaryEncoder.
       *
       * This is called when this Item is sent to a remote peer.
       *
       * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder The encoder to write data to.
       */
      _write (encoder) {
        encoder.writeTypeRef(YXmlElementRefID);
        encoder.writeKey(this.nodeName);
      }
    }

    /**
     * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
     * @return {YXmlElement}
     *
     * @function
     */
    const readYXmlElement = decoder => new YXmlElement(decoder.readKey());

    /**
     * @extends YEvent<YXmlElement|YXmlText|YXmlFragment>
     * An Event that describes changes on a YXml Element or Yxml Fragment
     */
    class YXmlEvent extends YEvent {
      /**
       * @param {YXmlElement|YXmlText|YXmlFragment} target The target on which the event is created.
       * @param {Set<string|null>} subs The set of changed attributes. `null` is included if the
       *                   child list changed.
       * @param {Transaction} transaction The transaction instance with which the
       *                                  change was created.
       */
      constructor (target, subs, transaction) {
        super(target, transaction);
        /**
         * Whether the children changed.
         * @type {Boolean}
         * @private
         */
        this.childListChanged = false;
        /**
         * Set of all changed attributes.
         * @type {Set<string>}
         */
        this.attributesChanged = new Set();
        subs.forEach((sub) => {
          if (sub === null) {
            this.childListChanged = true;
          } else {
            this.attributesChanged.add(sub);
          }
        });
      }
    }

    /**
     * You can manage binding to a custom type with YXmlHook.
     *
     * @extends {YMap<any>}
     */
    class YXmlHook extends YMap {
      /**
       * @param {string} hookName nodeName of the Dom Node.
       */
      constructor (hookName) {
        super();
        /**
         * @type {string}
         */
        this.hookName = hookName;
      }

      /**
       * Creates an Item with the same effect as this Item (without position effect)
       */
      _copy () {
        return new YXmlHook(this.hookName)
      }

      /**
       * Makes a copy of this data type that can be included somewhere else.
       *
       * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
       *
       * @return {YXmlHook}
       */
      clone () {
        const el = new YXmlHook(this.hookName);
        this.forEach((value, key) => {
          el.set(key, value);
        });
        return el
      }

      /**
       * Creates a Dom Element that mirrors this YXmlElement.
       *
       * @param {Document} [_document=document] The document object (you must define
       *                                        this when calling this method in
       *                                        nodejs)
       * @param {Object.<string, any>} [hooks] Optional property to customize how hooks
       *                                             are presented in the DOM
       * @param {any} [binding] You should not set this property. This is
       *                               used if DomBinding wants to create a
       *                               association to the created DOM type
       * @return {Element} The {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}
       *
       * @public
       */
      toDOM (_document = document, hooks = {}, binding) {
        const hook = hooks[this.hookName];
        let dom;
        if (hook !== undefined) {
          dom = hook.createDom(this);
        } else {
          dom = document.createElement(this.hookName);
        }
        dom.setAttribute('data-yjs-hook', this.hookName);
        if (binding !== undefined) {
          binding._createAssociation(dom, this);
        }
        return dom
      }

      /**
       * Transform the properties of this type to binary and write it to an
       * BinaryEncoder.
       *
       * This is called when this Item is sent to a remote peer.
       *
       * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder The encoder to write data to.
       */
      _write (encoder) {
        encoder.writeTypeRef(YXmlHookRefID);
        encoder.writeKey(this.hookName);
      }
    }

    /**
     * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
     * @return {YXmlHook}
     *
     * @private
     * @function
     */
    const readYXmlHook = decoder =>
      new YXmlHook(decoder.readKey());

    /**
     * Represents text in a Dom Element. In the future this type will also handle
     * simple formatting information like bold and italic.
     */
    class YXmlText extends YText {
      /**
       * @type {YXmlElement|YXmlText|null}
       */
      get nextSibling () {
        const n = this._item ? this._item.next : null;
        return n ? /** @type {YXmlElement|YXmlText} */ (/** @type {ContentType} */ (n.content).type) : null
      }

      /**
       * @type {YXmlElement|YXmlText|null}
       */
      get prevSibling () {
        const n = this._item ? this._item.prev : null;
        return n ? /** @type {YXmlElement|YXmlText} */ (/** @type {ContentType} */ (n.content).type) : null
      }

      _copy () {
        return new YXmlText()
      }

      /**
       * Makes a copy of this data type that can be included somewhere else.
       *
       * Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
       *
       * @return {YXmlText}
       */
      clone () {
        const text = new YXmlText();
        text.applyDelta(this.toDelta());
        return text
      }

      /**
       * Creates a Dom Element that mirrors this YXmlText.
       *
       * @param {Document} [_document=document] The document object (you must define
       *                                        this when calling this method in
       *                                        nodejs)
       * @param {Object<string, any>} [hooks] Optional property to customize how hooks
       *                                             are presented in the DOM
       * @param {any} [binding] You should not set this property. This is
       *                               used if DomBinding wants to create a
       *                               association to the created DOM type.
       * @return {Text} The {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}
       *
       * @public
       */
      toDOM (_document = document, hooks, binding) {
        const dom = _document.createTextNode(this.toString());
        if (binding !== undefined) {
          binding._createAssociation(dom, this);
        }
        return dom
      }

      toString () {
        // @ts-ignore
        return this.toDelta().map(delta => {
          const nestedNodes = [];
          for (const nodeName in delta.attributes) {
            const attrs = [];
            for (const key in delta.attributes[nodeName]) {
              attrs.push({ key, value: delta.attributes[nodeName][key] });
            }
            // sort attributes to get a unique order
            attrs.sort((a, b) => a.key < b.key ? -1 : 1);
            nestedNodes.push({ nodeName, attrs });
          }
          // sort node order to get a unique order
          nestedNodes.sort((a, b) => a.nodeName < b.nodeName ? -1 : 1);
          // now convert to dom string
          let str = '';
          for (let i = 0; i < nestedNodes.length; i++) {
            const node = nestedNodes[i];
            str += `<${node.nodeName}`;
            for (let j = 0; j < node.attrs.length; j++) {
              const attr = node.attrs[j];
              str += ` ${attr.key}="${attr.value}"`;
            }
            str += '>';
          }
          str += delta.insert;
          for (let i = nestedNodes.length - 1; i >= 0; i--) {
            str += `</${nestedNodes[i].nodeName}>`;
          }
          return str
        }).join('')
      }

      /**
       * @return {string}
       */
      toJSON () {
        return this.toString()
      }

      /**
       * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
       */
      _write (encoder) {
        encoder.writeTypeRef(YXmlTextRefID);
      }
    }

    /**
     * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
     * @return {YXmlText}
     *
     * @private
     * @function
     */
    const readYXmlText = decoder => new YXmlText();

    class AbstractStruct {
      /**
       * @param {ID} id
       * @param {number} length
       */
      constructor (id, length) {
        this.id = id;
        this.length = length;
      }

      /**
       * @type {boolean}
       */
      get deleted () {
        throw methodUnimplemented()
      }

      /**
       * Merge this struct with the item to the right.
       * This method is already assuming that `this.id.clock + this.length === this.id.clock`.
       * Also this method does *not* remove right from StructStore!
       * @param {AbstractStruct} right
       * @return {boolean} whether this merged with right
       */
      mergeWith (right) {
        return false
      }

      /**
       * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder The encoder to write data to.
       * @param {number} offset
       * @param {number} encodingRef
       */
      write (encoder, offset, encodingRef) {
        throw methodUnimplemented()
      }

      /**
       * @param {Transaction} transaction
       * @param {number} offset
       */
      integrate (transaction, offset) {
        throw methodUnimplemented()
      }
    }

    const structGCRefNumber = 0;

    /**
     * @private
     */
    class GC extends AbstractStruct {
      get deleted () {
        return true
      }

      delete () {}

      /**
       * @param {GC} right
       * @return {boolean}
       */
      mergeWith (right) {
        if (this.constructor !== right.constructor) {
          return false
        }
        this.length += right.length;
        return true
      }

      /**
       * @param {Transaction} transaction
       * @param {number} offset
       */
      integrate (transaction, offset) {
        if (offset > 0) {
          this.id.clock += offset;
          this.length -= offset;
        }
        addStruct(transaction.doc.store, this);
      }

      /**
       * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
       * @param {number} offset
       */
      write (encoder, offset) {
        encoder.writeInfo(structGCRefNumber);
        encoder.writeLen(this.length - offset);
      }

      /**
       * @param {Transaction} transaction
       * @param {StructStore} store
       * @return {null | number}
       */
      getMissing (transaction, store) {
        return null
      }
    }

    class ContentBinary {
      /**
       * @param {Uint8Array} content
       */
      constructor (content) {
        this.content = content;
      }

      /**
       * @return {number}
       */
      getLength () {
        return 1
      }

      /**
       * @return {Array<any>}
       */
      getContent () {
        return [this.content]
      }

      /**
       * @return {boolean}
       */
      isCountable () {
        return true
      }

      /**
       * @return {ContentBinary}
       */
      copy () {
        return new ContentBinary(this.content)
      }

      /**
       * @param {number} offset
       * @return {ContentBinary}
       */
      splice (offset) {
        throw methodUnimplemented()
      }

      /**
       * @param {ContentBinary} right
       * @return {boolean}
       */
      mergeWith (right) {
        return false
      }

      /**
       * @param {Transaction} transaction
       * @param {Item} item
       */
      integrate (transaction, item) {}
      /**
       * @param {Transaction} transaction
       */
      delete (transaction) {}
      /**
       * @param {StructStore} store
       */
      gc (store) {}
      /**
       * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
       * @param {number} offset
       */
      write (encoder, offset) {
        encoder.writeBuf(this.content);
      }

      /**
       * @return {number}
       */
      getRef () {
        return 3
      }
    }

    /**
     * @param {UpdateDecoderV1 | UpdateDecoderV2 } decoder
     * @return {ContentBinary}
     */
    const readContentBinary = decoder => new ContentBinary(decoder.readBuf());

    class ContentDeleted {
      /**
       * @param {number} len
       */
      constructor (len) {
        this.len = len;
      }

      /**
       * @return {number}
       */
      getLength () {
        return this.len
      }

      /**
       * @return {Array<any>}
       */
      getContent () {
        return []
      }

      /**
       * @return {boolean}
       */
      isCountable () {
        return false
      }

      /**
       * @return {ContentDeleted}
       */
      copy () {
        return new ContentDeleted(this.len)
      }

      /**
       * @param {number} offset
       * @return {ContentDeleted}
       */
      splice (offset) {
        const right = new ContentDeleted(this.len - offset);
        this.len = offset;
        return right
      }

      /**
       * @param {ContentDeleted} right
       * @return {boolean}
       */
      mergeWith (right) {
        this.len += right.len;
        return true
      }

      /**
       * @param {Transaction} transaction
       * @param {Item} item
       */
      integrate (transaction, item) {
        addToDeleteSet(transaction.deleteSet, item.id.client, item.id.clock, this.len);
        item.markDeleted();
      }

      /**
       * @param {Transaction} transaction
       */
      delete (transaction) {}
      /**
       * @param {StructStore} store
       */
      gc (store) {}
      /**
       * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
       * @param {number} offset
       */
      write (encoder, offset) {
        encoder.writeLen(this.len - offset);
      }

      /**
       * @return {number}
       */
      getRef () {
        return 1
      }
    }

    /**
     * @private
     *
     * @param {UpdateDecoderV1 | UpdateDecoderV2 } decoder
     * @return {ContentDeleted}
     */
    const readContentDeleted = decoder => new ContentDeleted(decoder.readLen());

    /**
     * @param {string} guid
     * @param {Object<string, any>} opts
     */
    const createDocFromOpts = (guid, opts) => new Doc({ guid, ...opts, shouldLoad: opts.shouldLoad || opts.autoLoad || false });

    /**
     * @private
     */
    class ContentDoc {
      /**
       * @param {Doc} doc
       */
      constructor (doc) {
        if (doc._item) {
          console.error('This document was already integrated as a sub-document. You should create a second instance instead with the same guid.');
        }
        /**
         * @type {Doc}
         */
        this.doc = doc;
        /**
         * @type {any}
         */
        const opts = {};
        this.opts = opts;
        if (!doc.gc) {
          opts.gc = false;
        }
        if (doc.autoLoad) {
          opts.autoLoad = true;
        }
        if (doc.meta !== null) {
          opts.meta = doc.meta;
        }
      }

      /**
       * @return {number}
       */
      getLength () {
        return 1
      }

      /**
       * @return {Array<any>}
       */
      getContent () {
        return [this.doc]
      }

      /**
       * @return {boolean}
       */
      isCountable () {
        return true
      }

      /**
       * @return {ContentDoc}
       */
      copy () {
        return new ContentDoc(createDocFromOpts(this.doc.guid, this.opts))
      }

      /**
       * @param {number} offset
       * @return {ContentDoc}
       */
      splice (offset) {
        throw methodUnimplemented()
      }

      /**
       * @param {ContentDoc} right
       * @return {boolean}
       */
      mergeWith (right) {
        return false
      }

      /**
       * @param {Transaction} transaction
       * @param {Item} item
       */
      integrate (transaction, item) {
        // this needs to be reflected in doc.destroy as well
        this.doc._item = item;
        transaction.subdocsAdded.add(this.doc);
        if (this.doc.shouldLoad) {
          transaction.subdocsLoaded.add(this.doc);
        }
      }

      /**
       * @param {Transaction} transaction
       */
      delete (transaction) {
        if (transaction.subdocsAdded.has(this.doc)) {
          transaction.subdocsAdded.delete(this.doc);
        } else {
          transaction.subdocsRemoved.add(this.doc);
        }
      }

      /**
       * @param {StructStore} store
       */
      gc (store) { }

      /**
       * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
       * @param {number} offset
       */
      write (encoder, offset) {
        encoder.writeString(this.doc.guid);
        encoder.writeAny(this.opts);
      }

      /**
       * @return {number}
       */
      getRef () {
        return 9
      }
    }

    /**
     * @private
     *
     * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
     * @return {ContentDoc}
     */
    const readContentDoc = decoder => new ContentDoc(createDocFromOpts(decoder.readString(), decoder.readAny()));

    /**
     * @private
     */
    class ContentEmbed {
      /**
       * @param {Object} embed
       */
      constructor (embed) {
        this.embed = embed;
      }

      /**
       * @return {number}
       */
      getLength () {
        return 1
      }

      /**
       * @return {Array<any>}
       */
      getContent () {
        return [this.embed]
      }

      /**
       * @return {boolean}
       */
      isCountable () {
        return true
      }

      /**
       * @return {ContentEmbed}
       */
      copy () {
        return new ContentEmbed(this.embed)
      }

      /**
       * @param {number} offset
       * @return {ContentEmbed}
       */
      splice (offset) {
        throw methodUnimplemented()
      }

      /**
       * @param {ContentEmbed} right
       * @return {boolean}
       */
      mergeWith (right) {
        return false
      }

      /**
       * @param {Transaction} transaction
       * @param {Item} item
       */
      integrate (transaction, item) {}
      /**
       * @param {Transaction} transaction
       */
      delete (transaction) {}
      /**
       * @param {StructStore} store
       */
      gc (store) {}
      /**
       * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
       * @param {number} offset
       */
      write (encoder, offset) {
        encoder.writeJSON(this.embed);
      }

      /**
       * @return {number}
       */
      getRef () {
        return 5
      }
    }

    /**
     * @private
     *
     * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
     * @return {ContentEmbed}
     */
    const readContentEmbed = decoder => new ContentEmbed(decoder.readJSON());

    /**
     * @private
     */
    class ContentFormat {
      /**
       * @param {string} key
       * @param {Object} value
       */
      constructor (key, value) {
        this.key = key;
        this.value = value;
      }

      /**
       * @return {number}
       */
      getLength () {
        return 1
      }

      /**
       * @return {Array<any>}
       */
      getContent () {
        return []
      }

      /**
       * @return {boolean}
       */
      isCountable () {
        return false
      }

      /**
       * @return {ContentFormat}
       */
      copy () {
        return new ContentFormat(this.key, this.value)
      }

      /**
       * @param {number} _offset
       * @return {ContentFormat}
       */
      splice (_offset) {
        throw methodUnimplemented()
      }

      /**
       * @param {ContentFormat} _right
       * @return {boolean}
       */
      mergeWith (_right) {
        return false
      }

      /**
       * @param {Transaction} _transaction
       * @param {Item} item
       */
      integrate (_transaction, item) {
        // @todo searchmarker are currently unsupported for rich text documents
        const p = /** @type {YText} */ (item.parent);
        p._searchMarker = null;
        p._hasFormatting = true;
      }

      /**
       * @param {Transaction} transaction
       */
      delete (transaction) {}
      /**
       * @param {StructStore} store
       */
      gc (store) {}
      /**
       * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
       * @param {number} offset
       */
      write (encoder, offset) {
        encoder.writeKey(this.key);
        encoder.writeJSON(this.value);
      }

      /**
       * @return {number}
       */
      getRef () {
        return 6
      }
    }

    /**
     * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
     * @return {ContentFormat}
     */
    const readContentFormat = decoder => new ContentFormat(decoder.readKey(), decoder.readJSON());

    /**
     * @private
     */
    class ContentJSON {
      /**
       * @param {Array<any>} arr
       */
      constructor (arr) {
        /**
         * @type {Array<any>}
         */
        this.arr = arr;
      }

      /**
       * @return {number}
       */
      getLength () {
        return this.arr.length
      }

      /**
       * @return {Array<any>}
       */
      getContent () {
        return this.arr
      }

      /**
       * @return {boolean}
       */
      isCountable () {
        return true
      }

      /**
       * @return {ContentJSON}
       */
      copy () {
        return new ContentJSON(this.arr)
      }

      /**
       * @param {number} offset
       * @return {ContentJSON}
       */
      splice (offset) {
        const right = new ContentJSON(this.arr.slice(offset));
        this.arr = this.arr.slice(0, offset);
        return right
      }

      /**
       * @param {ContentJSON} right
       * @return {boolean}
       */
      mergeWith (right) {
        this.arr = this.arr.concat(right.arr);
        return true
      }

      /**
       * @param {Transaction} transaction
       * @param {Item} item
       */
      integrate (transaction, item) {}
      /**
       * @param {Transaction} transaction
       */
      delete (transaction) {}
      /**
       * @param {StructStore} store
       */
      gc (store) {}
      /**
       * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
       * @param {number} offset
       */
      write (encoder, offset) {
        const len = this.arr.length;
        encoder.writeLen(len - offset);
        for (let i = offset; i < len; i++) {
          const c = this.arr[i];
          encoder.writeString(c === undefined ? 'undefined' : JSON.stringify(c));
        }
      }

      /**
       * @return {number}
       */
      getRef () {
        return 2
      }
    }

    /**
     * @private
     *
     * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
     * @return {ContentJSON}
     */
    const readContentJSON = decoder => {
      const len = decoder.readLen();
      const cs = [];
      for (let i = 0; i < len; i++) {
        const c = decoder.readString();
        if (c === 'undefined') {
          cs.push(undefined);
        } else {
          cs.push(JSON.parse(c));
        }
      }
      return new ContentJSON(cs)
    };

    const isDevMode = getVariable('node_env') === 'development';

    class ContentAny {
      /**
       * @param {Array<any>} arr
       */
      constructor (arr) {
        /**
         * @type {Array<any>}
         */
        this.arr = arr;
        isDevMode && deepFreeze(arr);
      }

      /**
       * @return {number}
       */
      getLength () {
        return this.arr.length
      }

      /**
       * @return {Array<any>}
       */
      getContent () {
        return this.arr
      }

      /**
       * @return {boolean}
       */
      isCountable () {
        return true
      }

      /**
       * @return {ContentAny}
       */
      copy () {
        return new ContentAny(this.arr)
      }

      /**
       * @param {number} offset
       * @return {ContentAny}
       */
      splice (offset) {
        const right = new ContentAny(this.arr.slice(offset));
        this.arr = this.arr.slice(0, offset);
        return right
      }

      /**
       * @param {ContentAny} right
       * @return {boolean}
       */
      mergeWith (right) {
        this.arr = this.arr.concat(right.arr);
        return true
      }

      /**
       * @param {Transaction} transaction
       * @param {Item} item
       */
      integrate (transaction, item) {}
      /**
       * @param {Transaction} transaction
       */
      delete (transaction) {}
      /**
       * @param {StructStore} store
       */
      gc (store) {}
      /**
       * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
       * @param {number} offset
       */
      write (encoder, offset) {
        const len = this.arr.length;
        encoder.writeLen(len - offset);
        for (let i = offset; i < len; i++) {
          const c = this.arr[i];
          encoder.writeAny(c);
        }
      }

      /**
       * @return {number}
       */
      getRef () {
        return 8
      }
    }

    /**
     * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
     * @return {ContentAny}
     */
    const readContentAny = decoder => {
      const len = decoder.readLen();
      const cs = [];
      for (let i = 0; i < len; i++) {
        cs.push(decoder.readAny());
      }
      return new ContentAny(cs)
    };

    /**
     * @private
     */
    class ContentString {
      /**
       * @param {string} str
       */
      constructor (str) {
        /**
         * @type {string}
         */
        this.str = str;
      }

      /**
       * @return {number}
       */
      getLength () {
        return this.str.length
      }

      /**
       * @return {Array<any>}
       */
      getContent () {
        return this.str.split('')
      }

      /**
       * @return {boolean}
       */
      isCountable () {
        return true
      }

      /**
       * @return {ContentString}
       */
      copy () {
        return new ContentString(this.str)
      }

      /**
       * @param {number} offset
       * @return {ContentString}
       */
      splice (offset) {
        const right = new ContentString(this.str.slice(offset));
        this.str = this.str.slice(0, offset);

        // Prevent encoding invalid documents because of splitting of surrogate pairs: https://github.com/yjs/yjs/issues/248
        const firstCharCode = this.str.charCodeAt(offset - 1);
        if (firstCharCode >= 0xD800 && firstCharCode <= 0xDBFF) {
          // Last character of the left split is the start of a surrogate utf16/ucs2 pair.
          // We don't support splitting of surrogate pairs because this may lead to invalid documents.
          // Replace the invalid character with a unicode replacement character (� / U+FFFD)
          this.str = this.str.slice(0, offset - 1) + '�';
          // replace right as well
          right.str = '�' + right.str.slice(1);
        }
        return right
      }

      /**
       * @param {ContentString} right
       * @return {boolean}
       */
      mergeWith (right) {
        this.str += right.str;
        return true
      }

      /**
       * @param {Transaction} transaction
       * @param {Item} item
       */
      integrate (transaction, item) {}
      /**
       * @param {Transaction} transaction
       */
      delete (transaction) {}
      /**
       * @param {StructStore} store
       */
      gc (store) {}
      /**
       * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
       * @param {number} offset
       */
      write (encoder, offset) {
        encoder.writeString(offset === 0 ? this.str : this.str.slice(offset));
      }

      /**
       * @return {number}
       */
      getRef () {
        return 4
      }
    }

    /**
     * @private
     *
     * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
     * @return {ContentString}
     */
    const readContentString = decoder => new ContentString(decoder.readString());

    /**
     * @type {Array<function(UpdateDecoderV1 | UpdateDecoderV2):AbstractType<any>>}
     * @private
     */
    const typeRefs = [
      readYArray,
      readYMap,
      readYText,
      readYXmlElement,
      readYXmlFragment,
      readYXmlHook,
      readYXmlText
    ];

    const YArrayRefID = 0;
    const YMapRefID = 1;
    const YTextRefID = 2;
    const YXmlElementRefID = 3;
    const YXmlFragmentRefID = 4;
    const YXmlHookRefID = 5;
    const YXmlTextRefID = 6;

    /**
     * @private
     */
    class ContentType {
      /**
       * @param {AbstractType<any>} type
       */
      constructor (type) {
        /**
         * @type {AbstractType<any>}
         */
        this.type = type;
      }

      /**
       * @return {number}
       */
      getLength () {
        return 1
      }

      /**
       * @return {Array<any>}
       */
      getContent () {
        return [this.type]
      }

      /**
       * @return {boolean}
       */
      isCountable () {
        return true
      }

      /**
       * @return {ContentType}
       */
      copy () {
        return new ContentType(this.type._copy())
      }

      /**
       * @param {number} offset
       * @return {ContentType}
       */
      splice (offset) {
        throw methodUnimplemented()
      }

      /**
       * @param {ContentType} right
       * @return {boolean}
       */
      mergeWith (right) {
        return false
      }

      /**
       * @param {Transaction} transaction
       * @param {Item} item
       */
      integrate (transaction, item) {
        this.type._integrate(transaction.doc, item);
      }

      /**
       * @param {Transaction} transaction
       */
      delete (transaction) {
        let item = this.type._start;
        while (item !== null) {
          if (!item.deleted) {
            item.delete(transaction);
          } else if (item.id.clock < (transaction.beforeState.get(item.id.client) || 0)) {
            // This will be gc'd later and we want to merge it if possible
            // We try to merge all deleted items after each transaction,
            // but we have no knowledge about that this needs to be merged
            // since it is not in transaction.ds. Hence we add it to transaction._mergeStructs
            transaction._mergeStructs.push(item);
          }
          item = item.right;
        }
        this.type._map.forEach(item => {
          if (!item.deleted) {
            item.delete(transaction);
          } else if (item.id.clock < (transaction.beforeState.get(item.id.client) || 0)) {
            // same as above
            transaction._mergeStructs.push(item);
          }
        });
        transaction.changed.delete(this.type);
      }

      /**
       * @param {StructStore} store
       */
      gc (store) {
        let item = this.type._start;
        while (item !== null) {
          item.gc(store, true);
          item = item.right;
        }
        this.type._start = null;
        this.type._map.forEach(/** @param {Item | null} item */ (item) => {
          while (item !== null) {
            item.gc(store, true);
            item = item.left;
          }
        });
        this.type._map = new Map();
      }

      /**
       * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
       * @param {number} offset
       */
      write (encoder, offset) {
        this.type._write(encoder);
      }

      /**
       * @return {number}
       */
      getRef () {
        return 7
      }
    }

    /**
     * @private
     *
     * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
     * @return {ContentType}
     */
    const readContentType = decoder => new ContentType(typeRefs[decoder.readTypeRef()](decoder));

    /**
     * Split leftItem into two items
     * @param {Transaction} transaction
     * @param {Item} leftItem
     * @param {number} diff
     * @return {Item}
     *
     * @function
     * @private
     */
    const splitItem = (transaction, leftItem, diff) => {
      // create rightItem
      const { client, clock } = leftItem.id;
      const rightItem = new Item(
        createID(client, clock + diff),
        leftItem,
        createID(client, clock + diff - 1),
        leftItem.right,
        leftItem.rightOrigin,
        leftItem.parent,
        leftItem.parentSub,
        leftItem.content.splice(diff)
      );
      if (leftItem.deleted) {
        rightItem.markDeleted();
      }
      if (leftItem.keep) {
        rightItem.keep = true;
      }
      if (leftItem.redone !== null) {
        rightItem.redone = createID(leftItem.redone.client, leftItem.redone.clock + diff);
      }
      // update left (do not set leftItem.rightOrigin as it will lead to problems when syncing)
      leftItem.right = rightItem;
      // update right
      if (rightItem.right !== null) {
        rightItem.right.left = rightItem;
      }
      // right is more specific.
      transaction._mergeStructs.push(rightItem);
      // update parent._map
      if (rightItem.parentSub !== null && rightItem.right === null) {
        /** @type {AbstractType<any>} */ (rightItem.parent)._map.set(rightItem.parentSub, rightItem);
      }
      leftItem.length = diff;
      return rightItem
    };

    /**
     * Abstract class that represents any content.
     */
    class Item extends AbstractStruct {
      /**
       * @param {ID} id
       * @param {Item | null} left
       * @param {ID | null} origin
       * @param {Item | null} right
       * @param {ID | null} rightOrigin
       * @param {AbstractType<any>|ID|null} parent Is a type if integrated, is null if it is possible to copy parent from left or right, is ID before integration to search for it.
       * @param {string | null} parentSub
       * @param {AbstractContent} content
       */
      constructor (id, left, origin, right, rightOrigin, parent, parentSub, content) {
        super(id, content.getLength());
        /**
         * The item that was originally to the left of this item.
         * @type {ID | null}
         */
        this.origin = origin;
        /**
         * The item that is currently to the left of this item.
         * @type {Item | null}
         */
        this.left = left;
        /**
         * The item that is currently to the right of this item.
         * @type {Item | null}
         */
        this.right = right;
        /**
         * The item that was originally to the right of this item.
         * @type {ID | null}
         */
        this.rightOrigin = rightOrigin;
        /**
         * @type {AbstractType<any>|ID|null}
         */
        this.parent = parent;
        /**
         * If the parent refers to this item with some kind of key (e.g. YMap, the
         * key is specified here. The key is then used to refer to the list in which
         * to insert this item. If `parentSub = null` type._start is the list in
         * which to insert to. Otherwise it is `parent._map`.
         * @type {String | null}
         */
        this.parentSub = parentSub;
        /**
         * If this type's effect is redone this type refers to the type that undid
         * this operation.
         * @type {ID | null}
         */
        this.redone = null;
        /**
         * @type {AbstractContent}
         */
        this.content = content;
        /**
         * bit1: keep
         * bit2: countable
         * bit3: deleted
         * bit4: mark - mark node as fast-search-marker
         * @type {number} byte
         */
        this.info = this.content.isCountable() ? BIT2 : 0;
      }

      /**
       * This is used to mark the item as an indexed fast-search marker
       *
       * @type {boolean}
       */
      set marker (isMarked) {
        if (((this.info & BIT4) > 0) !== isMarked) {
          this.info ^= BIT4;
        }
      }

      get marker () {
        return (this.info & BIT4) > 0
      }

      /**
       * If true, do not garbage collect this Item.
       */
      get keep () {
        return (this.info & BIT1) > 0
      }

      set keep (doKeep) {
        if (this.keep !== doKeep) {
          this.info ^= BIT1;
        }
      }

      get countable () {
        return (this.info & BIT2) > 0
      }

      /**
       * Whether this item was deleted or not.
       * @type {Boolean}
       */
      get deleted () {
        return (this.info & BIT3) > 0
      }

      set deleted (doDelete) {
        if (this.deleted !== doDelete) {
          this.info ^= BIT3;
        }
      }

      markDeleted () {
        this.info |= BIT3;
      }

      /**
       * Return the creator clientID of the missing op or define missing items and return null.
       *
       * @param {Transaction} transaction
       * @param {StructStore} store
       * @return {null | number}
       */
      getMissing (transaction, store) {
        if (this.origin && this.origin.client !== this.id.client && this.origin.clock >= getState(store, this.origin.client)) {
          return this.origin.client
        }
        if (this.rightOrigin && this.rightOrigin.client !== this.id.client && this.rightOrigin.clock >= getState(store, this.rightOrigin.client)) {
          return this.rightOrigin.client
        }
        if (this.parent && this.parent.constructor === ID && this.id.client !== this.parent.client && this.parent.clock >= getState(store, this.parent.client)) {
          return this.parent.client
        }

        // We have all missing ids, now find the items

        if (this.origin) {
          this.left = getItemCleanEnd(transaction, store, this.origin);
          this.origin = this.left.lastId;
        }
        if (this.rightOrigin) {
          this.right = getItemCleanStart(transaction, this.rightOrigin);
          this.rightOrigin = this.right.id;
        }
        if ((this.left && this.left.constructor === GC) || (this.right && this.right.constructor === GC)) {
          this.parent = null;
        } else if (!this.parent) {
          // only set parent if this shouldn't be garbage collected
          if (this.left && this.left.constructor === Item) {
            this.parent = this.left.parent;
            this.parentSub = this.left.parentSub;
          } else if (this.right && this.right.constructor === Item) {
            this.parent = this.right.parent;
            this.parentSub = this.right.parentSub;
          }
        } else if (this.parent.constructor === ID) {
          const parentItem = getItem(store, this.parent);
          if (parentItem.constructor === GC) {
            this.parent = null;
          } else {
            this.parent = /** @type {ContentType} */ (parentItem.content).type;
          }
        }
        return null
      }

      /**
       * @param {Transaction} transaction
       * @param {number} offset
       */
      integrate (transaction, offset) {
        if (offset > 0) {
          this.id.clock += offset;
          this.left = getItemCleanEnd(transaction, transaction.doc.store, createID(this.id.client, this.id.clock - 1));
          this.origin = this.left.lastId;
          this.content = this.content.splice(offset);
          this.length -= offset;
        }

        if (this.parent) {
          if ((!this.left && (!this.right || this.right.left !== null)) || (this.left && this.left.right !== this.right)) {
            /**
             * @type {Item|null}
             */
            let left = this.left;

            /**
             * @type {Item|null}
             */
            let o;
            // set o to the first conflicting item
            if (left !== null) {
              o = left.right;
            } else if (this.parentSub !== null) {
              o = /** @type {AbstractType<any>} */ (this.parent)._map.get(this.parentSub) || null;
              while (o !== null && o.left !== null) {
                o = o.left;
              }
            } else {
              o = /** @type {AbstractType<any>} */ (this.parent)._start;
            }
            // TODO: use something like DeleteSet here (a tree implementation would be best)
            // @todo use global set definitions
            /**
             * @type {Set<Item>}
             */
            const conflictingItems = new Set();
            /**
             * @type {Set<Item>}
             */
            const itemsBeforeOrigin = new Set();
            // Let c in conflictingItems, b in itemsBeforeOrigin
            // ***{origin}bbbb{this}{c,b}{c,b}{o}***
            // Note that conflictingItems is a subset of itemsBeforeOrigin
            while (o !== null && o !== this.right) {
              itemsBeforeOrigin.add(o);
              conflictingItems.add(o);
              if (compareIDs(this.origin, o.origin)) {
                // case 1
                if (o.id.client < this.id.client) {
                  left = o;
                  conflictingItems.clear();
                } else if (compareIDs(this.rightOrigin, o.rightOrigin)) {
                  // this and o are conflicting and point to the same integration points. The id decides which item comes first.
                  // Since this is to the left of o, we can break here
                  break
                } // else, o might be integrated before an item that this conflicts with. If so, we will find it in the next iterations
              } else if (o.origin !== null && itemsBeforeOrigin.has(getItem(transaction.doc.store, o.origin))) { // use getItem instead of getItemCleanEnd because we don't want / need to split items.
                // case 2
                if (!conflictingItems.has(getItem(transaction.doc.store, o.origin))) {
                  left = o;
                  conflictingItems.clear();
                }
              } else {
                break
              }
              o = o.right;
            }
            this.left = left;
          }
          // reconnect left/right + update parent map/start if necessary
          if (this.left !== null) {
            const right = this.left.right;
            this.right = right;
            this.left.right = this;
          } else {
            let r;
            if (this.parentSub !== null) {
              r = /** @type {AbstractType<any>} */ (this.parent)._map.get(this.parentSub) || null;
              while (r !== null && r.left !== null) {
                r = r.left;
              }
            } else {
              r = /** @type {AbstractType<any>} */ (this.parent)._start
              ;/** @type {AbstractType<any>} */ (this.parent)._start = this;
            }
            this.right = r;
          }
          if (this.right !== null) {
            this.right.left = this;
          } else if (this.parentSub !== null) {
            // set as current parent value if right === null and this is parentSub
            /** @type {AbstractType<any>} */ (this.parent)._map.set(this.parentSub, this);
            if (this.left !== null) {
              // this is the current attribute value of parent. delete right
              this.left.delete(transaction);
            }
          }
          // adjust length of parent
          if (this.parentSub === null && this.countable && !this.deleted) {
            /** @type {AbstractType<any>} */ (this.parent)._length += this.length;
          }
          addStruct(transaction.doc.store, this);
          this.content.integrate(transaction, this);
          // add parent to transaction.changed
          addChangedTypeToTransaction(transaction, /** @type {AbstractType<any>} */ (this.parent), this.parentSub);
          if ((/** @type {AbstractType<any>} */ (this.parent)._item !== null && /** @type {AbstractType<any>} */ (this.parent)._item.deleted) || (this.parentSub !== null && this.right !== null)) {
            // delete if parent is deleted or if this is not the current attribute value of parent
            this.delete(transaction);
          }
        } else {
          // parent is not defined. Integrate GC struct instead
          new GC(this.id, this.length).integrate(transaction, 0);
        }
      }

      /**
       * Returns the next non-deleted item
       */
      get next () {
        let n = this.right;
        while (n !== null && n.deleted) {
          n = n.right;
        }
        return n
      }

      /**
       * Returns the previous non-deleted item
       */
      get prev () {
        let n = this.left;
        while (n !== null && n.deleted) {
          n = n.left;
        }
        return n
      }

      /**
       * Computes the last content address of this Item.
       */
      get lastId () {
        // allocating ids is pretty costly because of the amount of ids created, so we try to reuse whenever possible
        return this.length === 1 ? this.id : createID(this.id.client, this.id.clock + this.length - 1)
      }

      /**
       * Try to merge two items
       *
       * @param {Item} right
       * @return {boolean}
       */
      mergeWith (right) {
        if (
          this.constructor === right.constructor &&
          compareIDs(right.origin, this.lastId) &&
          this.right === right &&
          compareIDs(this.rightOrigin, right.rightOrigin) &&
          this.id.client === right.id.client &&
          this.id.clock + this.length === right.id.clock &&
          this.deleted === right.deleted &&
          this.redone === null &&
          right.redone === null &&
          this.content.constructor === right.content.constructor &&
          this.content.mergeWith(right.content)
        ) {
          const searchMarker = /** @type {AbstractType<any>} */ (this.parent)._searchMarker;
          if (searchMarker) {
            searchMarker.forEach(marker => {
              if (marker.p === right) {
                // right is going to be "forgotten" so we need to update the marker
                marker.p = this;
                // adjust marker index
                if (!this.deleted && this.countable) {
                  marker.index -= this.length;
                }
              }
            });
          }
          if (right.keep) {
            this.keep = true;
          }
          this.right = right.right;
          if (this.right !== null) {
            this.right.left = this;
          }
          this.length += right.length;
          return true
        }
        return false
      }

      /**
       * Mark this Item as deleted.
       *
       * @param {Transaction} transaction
       */
      delete (transaction) {
        if (!this.deleted) {
          const parent = /** @type {AbstractType<any>} */ (this.parent);
          // adjust the length of parent
          if (this.countable && this.parentSub === null) {
            parent._length -= this.length;
          }
          this.markDeleted();
          addToDeleteSet(transaction.deleteSet, this.id.client, this.id.clock, this.length);
          addChangedTypeToTransaction(transaction, parent, this.parentSub);
          this.content.delete(transaction);
        }
      }

      /**
       * @param {StructStore} store
       * @param {boolean} parentGCd
       */
      gc (store, parentGCd) {
        if (!this.deleted) {
          throw unexpectedCase()
        }
        this.content.gc(store);
        if (parentGCd) {
          replaceStruct(store, this, new GC(this.id, this.length));
        } else {
          this.content = new ContentDeleted(this.length);
        }
      }

      /**
       * Transform the properties of this type to binary and write it to an
       * BinaryEncoder.
       *
       * This is called when this Item is sent to a remote peer.
       *
       * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder The encoder to write data to.
       * @param {number} offset
       */
      write (encoder, offset) {
        const origin = offset > 0 ? createID(this.id.client, this.id.clock + offset - 1) : this.origin;
        const rightOrigin = this.rightOrigin;
        const parentSub = this.parentSub;
        const info = (this.content.getRef() & BITS5) |
          (origin === null ? 0 : BIT8) | // origin is defined
          (rightOrigin === null ? 0 : BIT7) | // right origin is defined
          (parentSub === null ? 0 : BIT6); // parentSub is non-null
        encoder.writeInfo(info);
        if (origin !== null) {
          encoder.writeLeftID(origin);
        }
        if (rightOrigin !== null) {
          encoder.writeRightID(rightOrigin);
        }
        if (origin === null && rightOrigin === null) {
          const parent = /** @type {AbstractType<any>} */ (this.parent);
          if (parent._item !== undefined) {
            const parentItem = parent._item;
            if (parentItem === null) {
              // parent type on y._map
              // find the correct key
              const ykey = findRootTypeKey(parent);
              encoder.writeParentInfo(true); // write parentYKey
              encoder.writeString(ykey);
            } else {
              encoder.writeParentInfo(false); // write parent id
              encoder.writeLeftID(parentItem.id);
            }
          } else if (parent.constructor === String) { // this edge case was added by differential updates
            encoder.writeParentInfo(true); // write parentYKey
            encoder.writeString(parent);
          } else if (parent.constructor === ID) {
            encoder.writeParentInfo(false); // write parent id
            encoder.writeLeftID(parent);
          } else {
            unexpectedCase();
          }
          if (parentSub !== null) {
            encoder.writeString(parentSub);
          }
        }
        this.content.write(encoder, offset);
      }
    }

    /**
     * @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
     * @param {number} info
     */
    const readItemContent = (decoder, info) => contentRefs[info & BITS5](decoder);

    /**
     * A lookup map for reading Item content.
     *
     * @type {Array<function(UpdateDecoderV1 | UpdateDecoderV2):AbstractContent>}
     */
    const contentRefs = [
      () => { unexpectedCase(); }, // GC is not ItemContent
      readContentDeleted, // 1
      readContentJSON, // 2
      readContentBinary, // 3
      readContentString, // 4
      readContentEmbed, // 5
      readContentFormat, // 6
      readContentType, // 7
      readContentAny, // 8
      readContentDoc, // 9
      () => { unexpectedCase(); } // 10 - Skip is not ItemContent
    ];

    const structSkipRefNumber = 10;

    /**
     * @private
     */
    class Skip extends AbstractStruct {
      get deleted () {
        return true
      }

      delete () {}

      /**
       * @param {Skip} right
       * @return {boolean}
       */
      mergeWith (right) {
        if (this.constructor !== right.constructor) {
          return false
        }
        this.length += right.length;
        return true
      }

      /**
       * @param {Transaction} transaction
       * @param {number} offset
       */
      integrate (transaction, offset) {
        // skip structs cannot be integrated
        unexpectedCase();
      }

      /**
       * @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
       * @param {number} offset
       */
      write (encoder, offset) {
        encoder.writeInfo(structSkipRefNumber);
        // write as VarUint because Skips can't make use of predictable length-encoding
        writeVarUint(encoder.restEncoder, this.length - offset);
      }

      /**
       * @param {Transaction} transaction
       * @param {StructStore} store
       * @return {null | number}
       */
      getMissing (transaction, store) {
        return null
      }
    }

    /** eslint-env browser */


    const glo = /** @type {any} */ (typeof globalThis !== 'undefined'
      ? globalThis
      : typeof window !== 'undefined'
        ? window
        // @ts-ignore
        : typeof global !== 'undefined' ? global : {});

    const importIdentifier = '__ $YJS$ __';

    if (glo[importIdentifier] === true) {
      /**
       * Dear reader of this message. Please take this seriously.
       *
       * If you see this message, make sure that you only import one version of Yjs. In many cases,
       * your package manager installs two versions of Yjs that are used by different packages within your project.
       * Another reason for this message is that some parts of your project use the commonjs version of Yjs
       * and others use the EcmaScript version of Yjs.
       *
       * This often leads to issues that are hard to debug. We often need to perform constructor checks,
       * e.g. `struct instanceof GC`. If you imported different versions of Yjs, it is impossible for us to
       * do the constructor checks anymore - which might break the CRDT algorithm.
       *
       * https://github.com/yjs/yjs/issues/438
       */
      console.error('Yjs was already imported. This breaks constructor checks and will lead to issues! - https://github.com/yjs/yjs/issues/438');
    }
    glo[importIdentifier] = true;

    /** Queries the local database for YMessages to send to server.
     *
     * There are 2 messages that this function can provide:
     *   YUpdateFromClientRequest ( for local updates )
     *   YStateVector ( for state vector of foreign updates so that server can reduce the number of udpates to send back )
     *
     * Notice that we do not do a step 1 sync phase here to get a state vector from the server. Reason we can avoid
     * the 2-step sync is that we are client-server and not client-client here and we keep track of the client changes
     * sent to server by letting server acknowledge them. There is always a chance that some client update has already
     * been sent and that the client failed to receive the ack. However, if this happens it does not matter - the change
     * would be sent again and Yjs handles duplicate changes anyway. And it's rare so we earn the cost of roundtrips by
     * avoiding the step1 sync and instead keep track of this in the `unsentFrom` property of the SyncState.
     *
     * @param db
     * @returns
     */
    function listYClientMessagesAndStateVector(db, tablesToSync) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = [];
            const lastUpdateIds = {};
            for (const table of tablesToSync) {
                if (table.schema.yProps) {
                    for (const yProp of table.schema.yProps) {
                        const yTable = db.table(yProp.updatesTable); // the updates-table for this combo of table+propName
                        const syncState = (yield yTable.get(DEXIE_CLOUD_SYNCER_ID));
                        // unsentFrom = the `i` value of updates that aren't yet sent to server (or at least not acked by the server yet)
                        const unsentFrom = (syncState === null || syncState === void 0 ? void 0 : syncState.unsentFrom) || 1;
                        // receivedUntil = the `i` value of updates that both we and the server knows we already have (we know it by the outcome from last syncWithServer() because server keep track of its revision numbers
                        const receivedUntil = (syncState === null || syncState === void 0 ? void 0 : syncState.receivedUntil) || 0;
                        // Compute the least value of these two (but since receivedUntil is inclusive we need to add +1 to it)
                        const unsyncedFrom = Math.min(unsentFrom, receivedUntil + 1);
                        // Query all these updates for all docs of this table+prop combination
                        const updates = yield listUpdatesSince(yTable, unsyncedFrom);
                        if (updates.length > 0)
                            lastUpdateIds[yTable.name] = updates[updates.length - 1].i;
                        // Now sort them by document and whether they are local or not + ignore local updates already sent:
                        const perDoc = {};
                        for (const update of updates) {
                            // Sort updates into buckets of the doc primary key + the flag (whether it's local or foreign)
                            const isLocal = ((update.f || 0) & 0x01) === 0x01;
                            if (isLocal && update.i < unsentFrom)
                                continue; // This local update has already been sent and acked.
                            const docKey = JSON.stringify(update.k) + '/' + isLocal;
                            let entry = perDoc[docKey];
                            if (!entry) {
                                perDoc[docKey] = entry = {
                                    i: update.i,
                                    k: update.k,
                                    isLocal,
                                    u: [],
                                };
                                entry.u.push(update.u);
                            }
                            else {
                                entry.u.push(update.u);
                                entry.i = Math.max(update.i, entry.i);
                            }
                        }
                        // Now, go through all these and:
                        // * For local updates, compute a merged update per document.
                        // * For foreign updates, compute a state vector to pass to server, so that server can
                        //   avoid re-sending updates that we already have (they might have been sent of websocket
                        //   and when that happens, we do not mark them in any way nor do we update receivedUntil -
                        //   we only update receivedUntil after a "full sync" (syncWithServer()))
                        for (const { k, isLocal, u, i } of Object.values(perDoc)) {
                            const mergedUpdate = u.length === 1 ? u[0] : mergeUpdatesV2(u);
                            if (isLocal) {
                                result.push({
                                    type: 'u-c',
                                    table: table.name,
                                    prop: yProp.prop,
                                    k,
                                    u: mergedUpdate,
                                    i,
                                });
                            }
                            else {
                                const stateVector = encodeStateVectorFromUpdateV2(mergedUpdate);
                                result.push({
                                    type: 'sv',
                                    table: table.name,
                                    prop: yProp.prop,
                                    k,
                                    sv: stateVector,
                                });
                            }
                        }
                    }
                }
            }
            return {
                yMessages: result,
                lastUpdateIds
            };
        });
    }

    function getUpdatesTable(db, table, ydocProp) {
        var _a, _b, _c;
        if (!db.dx._allTables[table])
            return undefined;
        const utbl = (_c = (_b = (_a = db.table(table)) === null || _a === void 0 ? void 0 : _a.schema.yProps) === null || _b === void 0 ? void 0 : _b.find(p => p.prop === ydocProp)) === null || _c === void 0 ? void 0 : _c.updatesTable;
        if (!utbl) {
            console.debug(`No updatesTable found for ${table}.${ydocProp}`);
            return undefined;
        }
        if (!db.dx._allTables[utbl])
            return undefined;
        return db.table(utbl);
    }

    /* ========================================================================== 
     *                           y-dexie.js
     * ==========================================================================
     *
     * Dexie addon that integrates Dexie with Y.js
     *
     * By David Fahlander, david@dexie.org
     *
     * ==========================================================================
     *
     * Version 4.2.2, Thu Jan 29 2026
     *
     * https://dexie.org
     *
     * Apache License Version 2.0, January 2004, http://www.apache.org/licenses/
     * 
     */


    // The finalization registry
    const docRegistry = new FinalizationRegistry(({ cache, key }) => {
        delete cache[key];
    });
    // The Y.Doc cache containing all active documents
    function getDocCache(db) {
        var _a;
        var _b;
        return (_a = (_b = db._novip)['_docCache']) !== null && _a !== void 0 ? _a : (_b['_docCache'] = {
            cache: {},
            get size() {
                return Object.keys(this.cache).length;
            },
            find(table, primaryKey, ydocProp) {
                const cacheKey = getYDocCacheKey(table, primaryKey, ydocProp);
                const docRef = this.cache[cacheKey];
                return docRef ? docRef.deref() : undefined;
            },
            add(doc) {
                var _a;
                const { parentTable, parentId, parentProp } = doc.meta;
                if (!parentTable || !parentProp || parentId == null)
                    throw new Error(`Missing Dexie-related metadata in Y.Doc`);
                const cacheKey = getYDocCacheKey(parentTable, parentId, parentProp);
                const existingDoc = (_a = this.cache[cacheKey]) === null || _a === void 0 ? void 0 : _a.deref();
                if (existingDoc) {
                    docRegistry.unregister(existingDoc); // Don't run garbage collection on this doc as it is being replaced.
                }
                this.cache[cacheKey] = new WeakRef(doc);
                docRegistry.register(doc, { cache: this.cache, key: cacheKey }, doc);
            },
            delete(doc) {
                docRegistry.unregister(doc); // Don't run garbage collection on this doc as it is being deleted here and now.
                const cacheKey = getYDocCacheKey(doc.meta.parentTable, doc.meta.parentId, doc.meta.parentProp);
                const cacheEntry = this.cache[cacheKey];
                if ((cacheEntry === null || cacheEntry === void 0 ? void 0 : cacheEntry.deref()) === doc) {
                    delete this.cache[cacheKey]; // Remove the entry from the cache only if it is the same doc.
                }
            },
        });
    }
    // Emulate a private boolean property "destroyed" on Y.Doc instances that we manage
    // in createYDocProperty.ts:
    const destroyedDocs = new WeakSet();
    function throwIfDestroyed(doc) {
        if (destroyedDocs.has(doc))
            throw new Error(`Y.Doc ${doc.meta.parentId} has been destroyed`);
    }
    function getYDocCacheKey(table, primaryKey, ydocProp) {
        return `${table}[${primaryKey}].${ydocProp}`;
    }

    function getOrCreateDocument(db, docCache, tableName, prop, updatesTable, id) {
        let doc = docCache.find(tableName, id, prop);
        if (doc)
            return doc;
        doc = new Doc({
            meta: {
                db,
                updatesTable,
                parentProp: prop,
                parentTable: tableName,
                parentId: id,
            },
        });
        docCache.add(doc);
        doc.on('destroy', () => {
            destroyedDocs.add(doc);
            docCache.delete(doc);
        });
        return doc;
    }

    const { getByKeyPath } = Dexie.Dexie;

    let currentUpdateRow = null;
    function setCurrentUpdateRow(row) {
        currentUpdateRow = row;
    }

    function observeYDocUpdates(provider, doc, db, parentTableName, updatesTableName, parentId) {
        let lastUpdateId = 0;
        let initial = true;
        const subscription = Dexie.liveQuery(() => {
            throwIfDestroyed(doc);
            const updatesTable = db.table(updatesTableName);
            return Promise.all([
                (lastUpdateId > 0
                    ? updatesTable
                        .where('i')
                        .between(lastUpdateId, Infinity, false)
                        .toArray()
                        .then((updates) => updates.filter((update) => Dexie.cmp(update.k, parentId) === 0))
                    : updatesTable.where({ k: parentId }).toArray()).then((updates) => {
                    return updates;
                }),
                db.table(parentTableName).where(':id').equals(parentId).toArray(), // Why not just count() or get()? Because of cache only works with toArray() currently (optimization)
            ]);
        }).subscribe(([updates, parentRow]) => {
            if (updates.length > 0)
                lastUpdateId = updates[updates.length - 1].i;
            if (parentRow.length === 0) {
                // Row deleted. Destroy Y.Doc.
                doc.destroy();
                return;
            }
            throwIfDestroyed(doc);
            if (updates.length > 0) {
                transact(doc, () => {
                    updates.forEach((update) => {
                        try {
                            setCurrentUpdateRow(update);
                            applyUpdateV2(doc, update.u);
                        }
                        finally {
                            setCurrentUpdateRow(null);
                        }
                    });
                }, provider, false);
            }
            if (initial) {
                initial = false;
                doc.emit('load', [doc]);
            }
        }, (error) => {
            provider.on('error').fire(error);
        });
        const onUpdate = (update, origin) => {
            if (origin === provider)
                return; // Already applied.
            db.table(updatesTableName)
                .add({
                k: parentId,
                u: update,
                f: 1, // Flag as local update (to be included when syncing)
            })
                .then((i) => {
                // Optimization (not critical): Don't query for this update to put it back into the doc.
                // However, skip this optimization if the lastUpdateId is behind the current update.
                // In that case, next liveQuery emission will include also this update and re-apply it into doc,
                // but it will not be an issue because Y.Doc will ignore duplicate updates.
                if (i === lastUpdateId - 1)
                    ++lastUpdateId;
            })
                .catch((error) => {
                provider.on('error').fire(error);
            });
        };
        const stopObserving = () => {
            subscription.unsubscribe();
            doc.off('updateV2', onUpdate);
            doc.off('destroy', stopObserving);
        };
        doc.on('updateV2', onUpdate);
        doc.on('destroy', stopObserving);
        return stopObserving;
    }

    function nop() { }

    function promisableChain(f1, f2) {
        if (f1 === nop)
            return f2;
        return function () {
            var res = f1.apply(this, arguments);
            if (res && typeof res.then === 'function') {
                var thiz = this, i = arguments.length, args = new Array(i);
                while (i--)
                    args[i] = arguments[i];
                return res.then(function () {
                    return f2.apply(thiz, args);
                });
            }
            return f2.apply(this, arguments);
        };
    }

    function nonStoppableEventChain(f1, f2) {
        if (f1 === nop)
            return f2;
        return function () {
            f1.apply(this, arguments);
            f2.apply(this, arguments);
        };
    }

    const wm$2 = new WeakMap();
    function createEvents() {
        return Dexie.Dexie.Events(null, 'load', 'sync', 'error');
    }
    class DexieYProvider {
        static getOrCreateDocument(db, table, prop, id) {
            var _a, _b;
            const docCache = getDocCache(db);
            const updatesTable = (_b = (_a = db
                .table(table)
                .schema.yProps) === null || _a === void 0 ? void 0 : _a.find((p) => p.prop === prop)) === null || _b === void 0 ? void 0 : _b.updatesTable;
            if (!updatesTable) {
                throw new Error(`Updates table for ${table}.${prop} not found`);
            }
            // Get or create the Y.Doc for the given table, prop, and id
            return getOrCreateDocument(db, docCache, table, prop, updatesTable, id);
        }
        static load(doc, options) {
            var _a;
            let p = wm$2.get(doc);
            if (p) {
                ++p.refCount;
                if ((options === null || options === void 0 ? void 0 : options.gracePeriod) != null &&
                    p.graceTimeout < options.gracePeriod) {
                    p.graceTimeout = options.gracePeriod;
                }
                if (p.graceTimer) {
                    clearTimeout(p.graceTimer);
                    p.graceTimer = null;
                }
            }
            else {
                p = new DexieYProvider(doc);
                p.graceTimeout = (_a = options === null || options === void 0 ? void 0 : options.gracePeriod) !== null && _a !== void 0 ? _a : -1;
                wm$2.set(doc, p);
            }
            return p;
        }
        static release(doc) {
            if (!doc || destroyedDocs.has(doc))
                return; // Document already destroyed.
            const p = wm$2.get(doc);
            if (p) {
                // There is a provider connected to the doc
                if (--p.refCount <= 0) {
                    // No references to this provider anymore. Time to release it.
                    if (p.graceTimeout < 0) {
                        // No grace period here or from previous release. Release immediately.
                        p._release();
                    }
                    else if (!p.graceTimer) {
                        p.graceTimer = setTimeout(() => {
                            p.graceTimer = null;
                            if (p.refCount === 0) {
                                // Release only if refCount is still zero
                                p._release();
                            }
                        }, p.graceTimeout // Grace period to optimize for unload/reload scenarios
                        );
                    }
                }
            }
            else {
                doc.destroy();
            }
        }
        _release() {
            // Allow a listener to beforeunload event to execute while the provider and the document
            // are still alive and loaded if it needs to compute something from the full document.
            // Also, in case the event listener uses DexieYProvider.load() without calling DexieYProvider.release(),
            // it must prevent the release to happen until the provider is finally released.
            if (!this.doc)
                return;
            Promise.resolve(DexieYProvider.on('beforeunload').fire(this)).finally(() => {
                var _a;
                // Re-check that refCount is zero before actually destroying the document (which
                // leads to provider.destroy() through the destroy-event on the doc).
                if (this.refCount === 0) {
                    (_a = this.doc) === null || _a === void 0 ? void 0 : _a.destroy();
                }
                // If refCount is not zero, it means that DexieYProvider.load() has been called from the listener
                // and the listener has prevented the release from happening. The listener must call DexieYProvider.release()
                // when it's done with the document.
            });
        }
        static for(doc) {
            return wm$2.get(doc);
        }
        static get currentUpdateRow() {
            return currentUpdateRow;
        }
        // Use a getter to avoid unhandled rejections when no one bothers about it.
        get whenLoaded() {
            if (!this._whenLoaded) {
                this._whenLoaded = new Promise((resolve, reject) => {
                    if (!this.doc) {
                        reject(new Error('No Y.Doc associated with this provider'));
                        return;
                    }
                    if (this.doc.isLoaded)
                        resolve();
                    else if (this._error)
                        reject(this._error);
                    else if (destroyedDocs.has(this.doc)) {
                        reject(new Dexie.Dexie.AbortError('Document was destroyed before loaded'));
                    }
                    else {
                        this.on('load', resolve);
                        this.on('error', reject);
                        this.doc.on('destroy', () => reject(new Dexie.Dexie.AbortError('Document was destroyed before loaded')));
                    }
                });
            }
            return this._whenLoaded;
        }
        // Use a getter to avoid unhandled rejections when no one bothers about it.
        get whenSynced() {
            if (!this._whenSynced) {
                this._whenSynced = new Promise((resolve, reject) => {
                    if (!this.doc) {
                        reject(new Error('No Y.Doc associated with this provider'));
                        return;
                    }
                    if (this.doc.isSynced)
                        resolve();
                    else if (this._error)
                        reject(this._error);
                    else if (destroyedDocs.has(this.doc)) {
                        reject(new Dexie.Dexie.AbortError('Document was destroyed before synced'));
                    }
                    else {
                        this.on('sync', resolve);
                        this.on('error', reject);
                        this.doc.on('destroy', () => reject(new Dexie.Dexie.AbortError('Document was destroyed before synced')));
                    }
                });
            }
            return this._whenSynced;
        }
        constructor(doc) {
            this.refCount = 1;
            this.cleanupHandlers = [];
            this.graceTimeout = -1;
            this.doc = null;
            this.destroyed = false;
            this.on = createEvents();
            this.doc = doc;
            this.off = (name, f) => { var _a; return (_a = this.on[name]) === null || _a === void 0 ? void 0 : _a.unsubscribe(f); };
            if ('dispose' in Symbol) {
                // @ts-ignore
                this[Symbol.dispose] = () => DexieYProvider.release(doc);
            }
            doc.on('load', () => this.on('load').fire());
            doc.on('sync', (sync) => sync !== false && this.on('sync').fire());
            doc.on('destroy', this.destroy.bind(this));
            this.on('error', (error) => {
                // In case error happens before awaiting provider.whenLoaded or provider.whenSynced.
                this._error = error;
            });
            const { db, parentTable, parentId, updatesTable } = doc.meta || {};
            if (!db || !parentTable || !updatesTable) {
                throw new Error(`Missing Dexie-related metadata in Y.Doc. Documents need to be obtained through Y.Doc properties from dexie queries.`);
            }
            // This doc is from Dexie
            if (!db.table(parentTable) || !db.table(updatesTable)) {
                throw new Error(`Table ${parentTable} or ${updatesTable} not found in db`);
            }
            throwIfDestroyed(doc);
            this.stopObserving = observeYDocUpdates(this, doc, db, parentTable, updatesTable, parentId);
            DexieYProvider.on("new").fire(this); // Allow for addons to invoke their sync- and awareness providers here.
        }
        destroy() {
            var _a, _b, _c;
            console.debug(`Y.Doc ${(_b = (_a = this.doc) === null || _a === void 0 ? void 0 : _a.meta) === null || _b === void 0 ? void 0 : _b.parentId} was destroyed`);
            wm$2.delete(this.doc);
            this.doc = null;
            this.destroyed = true;
            this.refCount = 0;
            (_c = this.stopObserving) === null || _c === void 0 ? void 0 : _c.call(this);
            this.on = createEvents(); // Releases listeners for GC
            this.cleanupHandlers.forEach((cleanup) => cleanup());
        }
        addCleanupHandler(cleanupHandler) {
            this.cleanupHandlers.push(typeof cleanupHandler === 'function'
                ? cleanupHandler
                : () => cleanupHandler.unsubscribe());
        }
    }
    DexieYProvider.on = Dexie.Dexie.Events(null, {
        new: [nonStoppableEventChain],
        beforeunload: [promisableChain],
    });
    DexieYProvider.getDocCache = getDocCache;
    //
    // Eliminate dual package hazard 
    //
    // Since we're holding static state, make sure to singletonize DexieYProvider
    //
    if (Dexie.Dexie["DexieYProvider"]) {
        // @ts-ignore
        DexieYProvider = Dexie.Dexie["DexieYProvider"] || DexieYProvider;
    }
    else {
        Dexie.Dexie["DexieYProvider"] = DexieYProvider;
    }

    function applyYServerMessages(yMessages, db) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const receivedUntils = {};
            let resyncNeeded = false;
            let yServerRevision;
            for (const m of yMessages) {
                try {
                    switch (m.type) {
                        case 'u-s': {
                            const utbl = getUpdatesTable(db, m.table, m.prop);
                            if (utbl) {
                                const updateRow = {
                                    k: m.k,
                                    u: m.u,
                                };
                                if (m.r) {
                                    // @ts-ignore
                                    updateRow.r = m.r;
                                    yServerRevision = m.r;
                                }
                                receivedUntils[utbl.name] = yield utbl.add(updateRow);
                            }
                            break;
                        }
                        case 'u-ack': {
                            const utbl = getUpdatesTable(db, m.table, m.prop);
                            if (utbl) {
                                yield db.transaction('rw', utbl, (tx) => __awaiter(this, void 0, void 0, function* () {
                                    let syncer = (yield tx
                                        .table(utbl.name)
                                        .get(DEXIE_CLOUD_SYNCER_ID));
                                    yield tx.table(utbl.name).put(Object.assign(Object.assign({}, (syncer || { i: DEXIE_CLOUD_SYNCER_ID })), { unsentFrom: Math.max((syncer === null || syncer === void 0 ? void 0 : syncer.unsentFrom) || 1, m.i + 1) }));
                                }));
                            }
                            break;
                        }
                        case 'u-reject': {
                            // Acces control or constraint rejected the update.
                            // We delete it. It's not going to be sent again.
                            // What's missing is a way to notify consumers, such as Tiptap editor, that the update was rejected.
                            // This is only an issue when the document is open. We could find the open document and
                            // in a perfect world, we should send a reverse update to the open document to undo the change.
                            // See my question in https://discuss.yjs.dev/t/generate-an-inverse-update/2765
                            console.debug(`Y update rejected. Deleting it.`);
                            const utbl = getUpdatesTable(db, m.table, m.prop);
                            if (!utbl)
                                break;
                            // Delete the rejected update and all local updates since (avoid holes in the CRDT)
                            // and destroy it's open document if there is one.
                            const primaryKey = (_a = (yield utbl.get(m.i))) === null || _a === void 0 ? void 0 : _a.k;
                            if (primaryKey != null) {
                                yield db.transaction('rw', utbl, (tx) => {
                                    // @ts-ignore
                                    tx.idbtrans._rejecting_y_ypdate = true; // Inform ydoc triggers that we delete because of a rejection and not GC
                                    return utbl
                                        .where('i')
                                        .aboveOrEqual(m.i)
                                        .filter((u) => Dexie.cmp(u.k, primaryKey) === 0 && ((u.f || 0) & 1) === 1)
                                        .delete();
                                });
                                // Destroy active doc
                                const activeDoc = DexieYProvider.getDocCache(db.dx).find(m.table, primaryKey, m.prop);
                                if (activeDoc)
                                    activeDoc.destroy(); // Destroy the document so that editors don't continue to work on it
                            }
                            break;
                        }
                        case 'in-sync': {
                            const doc = DexieYProvider.getDocCache(db.dx).find(m.table, m.k, m.prop);
                            if (doc && !doc.isSynced) {
                                doc.emit('sync', [true, doc]);
                            }
                            break;
                        }
                        case 'y-complete-sync-done': {
                            yServerRevision = m.yServerRev;
                            break;
                        }
                        case 'outdated-server-rev':
                            resyncNeeded = true;
                            break;
                    }
                }
                catch (e) {
                    console.error(`Failed to apply YMessage`, m, e);
                }
            }
            return {
                receivedUntils,
                resyncNeeded,
                yServerRevision,
            };
        });
    }

    function updateYSyncStates(lastUpdateIdsBeforeSync, receivedUntilsAfterSync, db) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            // We want to update unsentFrom for each yTable to the value specified in first argument
            //  because we got those values before we synced with server and here we are back from server
            //  that has successfully received all those messages - no matter if the last update was a client or server update,
            //  we can safely store unsentFrom to a value of the last update + 1 here.
            // We also want to update receivedUntil for each yTable to the value specified in the second argument,
            //  because that contains the highest resulted id of each update from server after storing it.
            // We could do these two tasks separately, but that would require two update calls on the same YSyncState, so
            // to optimize the dexie calls, we merge these two maps into a single one so we can do a single update request
            // per yTable.
            const mergedSpec = {};
            for (const [yTable, lastUpdateId] of Object.entries(lastUpdateIdsBeforeSync)) {
                (_a = mergedSpec[yTable]) !== null && _a !== void 0 ? _a : (mergedSpec[yTable] = {});
                mergedSpec[yTable].unsentFrom = lastUpdateId + 1;
            }
            for (const [yTable, lastUpdateId] of Object.entries(receivedUntilsAfterSync)) {
                (_b = mergedSpec[yTable]) !== null && _b !== void 0 ? _b : (mergedSpec[yTable] = {});
                mergedSpec[yTable].receivedUntil = lastUpdateId;
            }
            // Now go through all yTables and update their YSyncStates:
            const allYTables = Object.values(db.dx._dbSchema)
                .filter((tblSchema) => tblSchema.yProps)
                .map((tblSchema) => tblSchema.yProps.map((yProp) => yProp.updatesTable))
                .flat();
            for (const yTable of allYTables) {
                const mergedEntry = mergedSpec[yTable];
                const unsentFrom = (_c = mergedEntry === null || mergedEntry === void 0 ? void 0 : mergedEntry.unsentFrom) !== null && _c !== void 0 ? _c : 1;
                const receivedUntil = (_e = (_d = mergedEntry === null || mergedEntry === void 0 ? void 0 : mergedEntry.receivedUntil) !== null && _d !== void 0 ? _d : 
                // from local because we are in the same parent transaction (in sync.ts) that
                // applied all updates from the server
                (yield db
                    .table(yTable)
                    .where('i')
                    .between(1, Infinity) // Because i might be string DEXIE_CLOUD_SYNCER_ID if not a number.
                    .reverse()
                    .limit(1)
                    .primaryKeys())[0]) !== null && _e !== void 0 ? _e : 0;
                // We're already in a transaction, but for the sake of
                // code readability and correctness, let's launch an atomic sub transaction:
                yield db.transaction('rw', yTable, () => __awaiter(this, void 0, void 0, function* () {
                    const state = yield db
                        .table(yTable)
                        .get(DEXIE_CLOUD_SYNCER_ID);
                    if (!state) {
                        yield db.table(yTable).add({
                            i: DEXIE_CLOUD_SYNCER_ID,
                            unsentFrom,
                            receivedUntil
                        });
                    }
                    else {
                        state.unsentFrom = Math.max(unsentFrom, state.unsentFrom || 1);
                        state.receivedUntil = Math.max(receivedUntil, state.receivedUntil || 0);
                        yield db.table(yTable).put(state);
                    }
                }));
            }
        });
    }

    const BINSTREAM_TYPE_REALMID = 1;
    const BINSTREAM_TYPE_TABLE_AND_PROP = 2;
    const BINSTREAM_TYPE_DOCUMENT = 3;
    function downloadYDocsFromServer(db_1, databaseUrl_1, _a) {
        return __awaiter(this, arguments, void 0, function* (db, databaseUrl, { yDownloadedRealms, realms }) {
            if (yDownloadedRealms &&
                realms &&
                realms.every((realmId) => yDownloadedRealms[realmId] === '*')) {
                return; // Already done!
            }
            console.debug('Downloading Y.Docs from added realms');
            const user = yield loadAccessToken(db);
            const headers = {
                'Content-Type': 'application/json',
                Accept: 'application/octet-stream',
            };
            if (user) {
                headers.Authorization = `Bearer ${user.accessToken}`;
            }
            const res = yield fetch(`${databaseUrl}/y/download`, {
                body: TSON.stringify({ downloadedRealms: yDownloadedRealms || {} }),
                method: 'POST',
                headers,
                credentials: 'include',
            });
            if (!res.ok) {
                throw new Error(`Failed to download Yjs documents from server. Status: ${res.status}`);
            }
            yield asyncIterablePipeline(getFetchResponseBodyGenerator(res), consumeChunkedBinaryStream, consumeDownloadChunks);
            function consumeDownloadChunks(chunks) {
                return __asyncGenerator(this, arguments, function* consumeDownloadChunks_1() {
                    var _a, e_1, _b, _c;
                    let currentRealmId = null;
                    let currentTable = null;
                    let currentProp = null;
                    let docsToInsert = [];
                    function storeCollectedDocs(completedRealm) {
                        return __awaiter(this, void 0, void 0, function* () {
                            const lastDoc = docsToInsert[docsToInsert.length - 1];
                            if (docsToInsert.length > 0) {
                                if (!currentRealmId || !currentTable || !currentProp) {
                                    throw new Error(`Protocol error from ${databaseUrl}/y/download`);
                                }
                                const yTable = getUpdatesTable(db, currentTable, currentProp);
                                if (yTable) {
                                    yield yTable.bulkAdd(docsToInsert);
                                }
                                docsToInsert = [];
                            }
                            if (currentRealmId &&
                                ((currentTable && currentProp && lastDoc) || completedRealm)) {
                                yield db.$syncState.update('syncState', (syncState) => {
                                    const yDownloadedRealms = syncState.yDownloadedRealms || {};
                                    yDownloadedRealms[currentRealmId] = completedRealm
                                        ? '*'
                                        : {
                                            tbl: currentTable,
                                            prop: currentProp,
                                            key: lastDoc.k,
                                        };
                                    syncState.yDownloadedRealms = yDownloadedRealms;
                                });
                            }
                        });
                    }
                    try {
                        try {
                            for (var _d = true, chunks_1 = __asyncValues(chunks), chunks_1_1; chunks_1_1 = yield __await(chunks_1.next()), _a = chunks_1_1.done, !_a; _d = true) {
                                _c = chunks_1_1.value;
                                _d = false;
                                const chunk = _c;
                                const decoder = new Decoder(chunk);
                                while (hasContent(decoder)) {
                                    switch (readUint8(decoder)) {
                                        case BINSTREAM_TYPE_REALMID:
                                            yield __await(storeCollectedDocs(true));
                                            currentRealmId = readVarString(decoder);
                                            break;
                                        case BINSTREAM_TYPE_TABLE_AND_PROP:
                                            yield __await(storeCollectedDocs(false)); // still on same realm
                                            currentTable = readVarString(decoder);
                                            currentProp = readVarString(decoder);
                                            break;
                                        case BINSTREAM_TYPE_DOCUMENT: {
                                            const k = readAny(decoder);
                                            const u = readVarUint8Array(decoder);
                                            docsToInsert.push({
                                                k,
                                                u,
                                            });
                                            break;
                                        }
                                    }
                                }
                                yield __await(storeCollectedDocs(false)); // Chunk full - migth still be on same realm
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (!_d && !_a && (_b = chunks_1.return)) yield __await(_b.call(chunks_1));
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                        yield __await(storeCollectedDocs(true)); // Everything downloaded - finalize last downloaded realm to "*"
                    }
                    catch (error) {
                        if (!(error instanceof Dexie.DexieError)) {
                            // Network error might have happened.
                            // Store what we've collected so far:
                            yield __await(storeCollectedDocs(false));
                        }
                        throw error;
                    }
                });
            }
        });
    }

    const CURRENT_SYNC_WORKER = 'currentSyncWorker';
    function sync(db, options, schema, syncOptions) {
        return _sync(db, options, schema, syncOptions)
            .then((result) => {
            if (!(syncOptions === null || syncOptions === void 0 ? void 0 : syncOptions.justCheckIfNeeded)) { // && syncOptions?.purpose !== 'push') {
                db.syncStateChangedEvent.next({
                    phase: 'in-sync',
                });
            }
            return result;
        })
            .catch((error) => __awaiter(this, void 0, void 0, function* () {
            if (syncOptions === null || syncOptions === void 0 ? void 0 : syncOptions.justCheckIfNeeded)
                return Promise.reject(error); // Just rethrow.
            console.debug('Error from _sync', {
                isOnline,
                syncOptions,
                error,
            });
            if (isOnline &&
                (syncOptions === null || syncOptions === void 0 ? void 0 : syncOptions.retryImmediatelyOnFetchError) &&
                (error === null || error === void 0 ? void 0 : error.name) === 'TypeError' &&
                /fetch/.test(error === null || error === void 0 ? void 0 : error.message)) {
                db.syncStateChangedEvent.next({
                    phase: 'error',
                    error,
                });
                // Retry again in 500 ms but if it fails again, don't retry.
                yield new Promise((resolve) => setTimeout(resolve, 500));
                return yield sync(db, options, schema, Object.assign(Object.assign({}, syncOptions), { retryImmediatelyOnFetchError: false }));
            }
            // Make sure that no matter whether sync() explodes or not,
            // always update the timestamp. Also store the error.
            yield db.$syncState.update('syncState', {
                timestamp: new Date(),
                error: '' + error,
            });
            db.syncStateChangedEvent.next({
                phase: isOnline ? 'error' : 'offline',
                error: new Error('' + (error === null || error === void 0 ? void 0 : error.message) || error),
            });
            return Promise.reject(error);
        }));
    }
    function _sync(db_1, options_1, schema_1) {
        return __awaiter(this, arguments, void 0, function* (db, options, schema, { isInitialSync, cancelToken, justCheckIfNeeded, purpose } = {
            isInitialSync: false,
        }) {
            var _a;
            if (!justCheckIfNeeded) {
                console.debug('SYNC STARTED', { isInitialSync, purpose });
            }
            if (!((_a = db.cloud.options) === null || _a === void 0 ? void 0 : _a.databaseUrl))
                throw new Error(`Internal error: sync must not be called when no databaseUrl is configured`);
            const { databaseUrl } = options;
            const currentUser = yield db.getCurrentUser(); // Keep same value across entire sync flow:
            const tablesToSync = currentUser.isLoggedIn ? getSyncableTables(db) : [];
            const mutationTables = tablesToSync.map((tbl) => db.table(getMutationTable(tbl.name)));
            // If this is not the initial sync,
            // go through tables that were previously not synced but should now be according to
            // logged in state and the sync table whitelist in db.cloud.options.
            //
            // Prepare for syncification by modifying locally unauthorized objects:
            //
            const persistedSyncState = yield db.getPersistedSyncState();
            const readyForSyncification = currentUser.isLoggedIn;
            const tablesToSyncify = readyForSyncification
                ? getTablesToSyncify(db, persistedSyncState)
                : [];
            throwIfCancelled(cancelToken);
            const doSyncify = tablesToSyncify.length > 0;
            if (doSyncify) {
                if (justCheckIfNeeded)
                    return true;
                //console.debug('sync doSyncify is true');
                yield db.transaction('rw', tablesToSyncify, (tx) => __awaiter(this, void 0, void 0, function* () {
                    // @ts-ignore
                    tx.idbtrans.disableChangeTracking = true;
                    // @ts-ignore
                    tx.idbtrans.disableAccessControl = true; // TODO: Take care of this flag in access control middleware!
                    yield modifyLocalObjectsWithNewUserId(tablesToSyncify, currentUser, persistedSyncState === null || persistedSyncState === void 0 ? void 0 : persistedSyncState.realms);
                }));
                throwIfCancelled(cancelToken);
            }
            //
            // List changes to sync
            //
            const [clientChangeSet, syncState, baseRevs, { yMessages, lastUpdateIds }] = yield db.transaction('r', db.tables, () => __awaiter(this, void 0, void 0, function* () {
                const syncState = yield db.getPersistedSyncState();
                let baseRevs = yield db.$baseRevs.toArray();
                // Resolve #2168
                baseRevs = baseRevs.filter(br => tablesToSync.some(tbl => tbl.name === br.tableName));
                let clientChanges = yield listClientChanges(mutationTables, db);
                const yResults = yield listYClientMessagesAndStateVector(db, tablesToSync);
                throwIfCancelled(cancelToken);
                if (doSyncify) {
                    const alreadySyncedRealms = [
                        ...((persistedSyncState === null || persistedSyncState === void 0 ? void 0 : persistedSyncState.realms) || []),
                        ...((persistedSyncState === null || persistedSyncState === void 0 ? void 0 : persistedSyncState.inviteRealms) || []),
                    ];
                    const syncificationInserts = yield listSyncifiedChanges(tablesToSyncify, currentUser, schema, alreadySyncedRealms);
                    throwIfCancelled(cancelToken);
                    clientChanges = clientChanges.concat(syncificationInserts);
                    return [clientChanges, syncState, baseRevs, yResults];
                }
                return [clientChanges, syncState, baseRevs, yResults];
            }));
            const pushSyncIsNeeded = clientChangeSet.some((set) => set.muts.some((mut) => mut.keys.length > 0)) || yMessages.some(m => m.type === 'u-c');
            if (justCheckIfNeeded) {
                console.debug('Sync is needed:', pushSyncIsNeeded);
                return pushSyncIsNeeded;
            }
            if (purpose === 'push' && !pushSyncIsNeeded) {
                // The purpose of this request was to push changes
                return false;
            }
            const latestRevisions = getLatestRevisionsPerTable(clientChangeSet, syncState === null || syncState === void 0 ? void 0 : syncState.latestRevisions);
            const clientIdentity = (syncState === null || syncState === void 0 ? void 0 : syncState.clientIdentity) || randomString$1(16);
            //
            // Push changes to server
            //
            throwIfCancelled(cancelToken);
            const res = yield syncWithServer(clientChangeSet, yMessages, syncState, baseRevs, db, databaseUrl, schema, clientIdentity, currentUser);
            console.debug('Sync response', res);
            //
            // Apply changes locally and clear old change entries:
            //
            const { done, newSyncState } = yield db.transaction('rw', db.tables, (tx) => __awaiter(this, void 0, void 0, function* () {
                // @ts-ignore
                tx.idbtrans.disableChangeTracking = true;
                // @ts-ignore
                tx.idbtrans.disableAccessControl = true; // TODO: Take care of this flag in access control middleware!
                // Update db.cloud.schema from server response.
                // Local schema MAY include a subset of tables, so do not force all tables into local schema.
                for (const tableName of Object.keys(schema)) {
                    if (res.schema[tableName]) {
                        // Write directly into configured schema. This code can only be executed alone.
                        schema[tableName] = res.schema[tableName];
                    }
                }
                yield db.$syncState.put(schema, 'schema');
                // List mutations that happened during our exchange with the server:
                const addedClientChanges = yield listClientChanges(mutationTables, db, {
                    since: latestRevisions,
                });
                //
                // Delete changes now as server has return success
                // (but keep changes that haven't reached server yet)
                //
                for (const mutTable of mutationTables) {
                    const tableName = getTableFromMutationTable(mutTable.name);
                    if (!addedClientChanges.some((ch) => ch.table === tableName && ch.muts.length > 0)) {
                        // No added mutations for this table during the time we sent changes
                        // to the server.
                        // It is therefore safe to clear all changes (which is faster than
                        // deleting a range)
                        yield Promise.all([
                            mutTable.clear(),
                            db.$baseRevs.where({ tableName }).delete(),
                        ]);
                    }
                    else if (latestRevisions[tableName]) {
                        const latestRev = latestRevisions[tableName] || 0;
                        yield Promise.all([
                            mutTable.where('rev').belowOrEqual(latestRev).delete(),
                            db.$baseRevs
                                .where(':id')
                                .between([tableName, -Infinity], [tableName, latestRev + 1], true, true)
                                .reverse()
                                .offset(1) // Keep one entry (the one mapping muts that came during fetch --> previous server revision)
                                .delete(),
                        ]);
                    }
                    else ;
                }
                // Update latestRevisions object according to additional changes:
                getLatestRevisionsPerTable(addedClientChanges, latestRevisions);
                // Update/add new entries into baseRevs map.
                // * On tables without mutations since last serverRevision,
                //   this will update existing entry.
                // * On tables where mutations have been recorded since last
                //   serverRevision, this will create a new entry.
                // The purpose of this operation is to mark a start revision (per table)
                // so that all client-mutations that come after this, will be mapped to current
                // server revision.
                yield updateBaseRevs(db, schema, latestRevisions, res.serverRevision);
                const syncState = yield db.getPersistedSyncState();
                //
                // Delete objects from removed realms
                //
                yield deleteObjectsFromRemovedRealms(db, res, syncState);
                //
                // Update syncState
                //
                const newSyncState = syncState || {
                    syncedTables: [],
                    latestRevisions: {},
                    realms: [],
                    inviteRealms: [],
                    clientIdentity,
                };
                if (readyForSyncification) {
                    newSyncState.syncedTables = tablesToSync
                        .map((tbl) => tbl.name)
                        .concat(tablesToSyncify.map((tbl) => tbl.name));
                }
                newSyncState.latestRevisions = latestRevisions;
                newSyncState.remoteDbId = res.dbId;
                newSyncState.initiallySynced = true;
                newSyncState.realms = res.realms;
                newSyncState.inviteRealms = res.inviteRealms;
                newSyncState.serverRevision = res.serverRevision;
                newSyncState.yServerRevision = res.serverRevision;
                newSyncState.timestamp = new Date();
                delete newSyncState.error;
                const filteredChanges = filterServerChangesThroughAddedClientChanges(res.changes, addedClientChanges);
                //
                // apply server changes
                //
                yield applyServerChanges(filteredChanges, db);
                if (res.yMessages) {
                    //
                    // apply yMessages
                    //
                    const { receivedUntils, resyncNeeded, yServerRevision } = yield applyYServerMessages(res.yMessages, db);
                    if (yServerRevision) {
                        newSyncState.yServerRevision = yServerRevision;
                    }
                    //
                    // update Y SyncStates
                    //
                    yield updateYSyncStates(lastUpdateIds, receivedUntils, db);
                    if (resyncNeeded) {
                        newSyncState.yDownloadedRealms = {}; // Will trigger a full download of Y-documents below...
                    }
                }
                //
                // Update regular syncState
                //
                db.$syncState.put(newSyncState, 'syncState');
                return {
                    done: addedClientChanges.length === 0,
                    newSyncState
                };
            }));
            if (!done) {
                console.debug('MORE SYNC NEEDED. Go for it again!');
                yield checkSyncRateLimitDelay(db);
                return yield _sync(db, options, schema, { isInitialSync, cancelToken });
            }
            const usingYProps = Object.values(schema).some(tbl => { var _a; return (_a = tbl.yProps) === null || _a === void 0 ? void 0 : _a.length; });
            const serverSupportsYprops = !!res.yMessages;
            if (usingYProps && serverSupportsYprops) {
                try {
                    yield downloadYDocsFromServer(db, databaseUrl, newSyncState);
                }
                catch (error) {
                    console.error('Failed to download Yjs documents from server', error);
                }
            }
            console.debug('SYNC DONE', { isInitialSync });
            db.syncCompleteEvent.next();
            return false; // Not needed anymore
        });
    }
    function deleteObjectsFromRemovedRealms(db, res, syncState) {
        return __awaiter(this, void 0, void 0, function* () {
            const deletedRealms = new Set();
            const rejectedRealms = new Set();
            const previousRealmSet = syncState ? syncState.realms : [];
            const previousInviteRealmSet = syncState ? syncState.inviteRealms : [];
            const updatedRealmSet = new Set(res.realms);
            const updatedTotalRealmSet = new Set(res.realms.concat(res.inviteRealms));
            for (const realmId of previousRealmSet) {
                if (!updatedRealmSet.has(realmId)) {
                    rejectedRealms.add(realmId);
                    if (!updatedTotalRealmSet.has(realmId)) {
                        deletedRealms.add(realmId);
                    }
                }
            }
            for (const realmId of previousInviteRealmSet.concat(previousRealmSet)) {
                if (!updatedTotalRealmSet.has(realmId)) {
                    deletedRealms.add(realmId);
                }
            }
            if (deletedRealms.size > 0 || rejectedRealms.size > 0) {
                const tables = getSyncableTables(db);
                for (const table of tables) {
                    let realmsToDelete = ['realms', 'members', 'roles'].includes(table.name)
                        ? deletedRealms // These tables should spare rejected ones.
                        : rejectedRealms; // All other tables shoudl delete rejected+deleted ones
                    if (realmsToDelete.size === 0)
                        continue;
                    if (table.schema.indexes.some((idx) => idx.keyPath === 'realmId' ||
                        (Array.isArray(idx.keyPath) && idx.keyPath[0] === 'realmId'))) {
                        // There's an index to use:
                        //console.debug(`REMOVAL: deleting all ${table.name} where realmId anyOf `, JSON.stringify([...realmsToDelete]));
                        yield table
                            .where('realmId')
                            .anyOf([...realmsToDelete])
                            .delete();
                    }
                    else {
                        // No index to use:
                        //console.debug(`REMOVAL: deleting all ${table.name} where realmId is any of `, JSON.stringify([...realmsToDelete]), realmsToDelete.size);
                        yield table
                            .filter((obj) => !!(obj === null || obj === void 0 ? void 0 : obj.realmId) && realmsToDelete.has(obj.realmId))
                            .delete();
                    }
                }
            }
            if (rejectedRealms.size > 0 && (syncState === null || syncState === void 0 ? void 0 : syncState.yDownloadedRealms)) {
                for (const realmId of rejectedRealms) {
                    delete syncState.yDownloadedRealms[realmId];
                }
            }
        });
    }
    function filterServerChangesThroughAddedClientChanges(serverChanges, addedClientChanges) {
        const changes = {};
        applyOperations(changes, serverChanges);
        const localPostChanges = {};
        applyOperations(localPostChanges, addedClientChanges);
        subtractChanges(changes, localPostChanges);
        return toDBOperationSet(changes);
    }

    const LIMIT_NUM_MESSAGES_PER_TIME = 10; // Allow a maximum of 10 messages per...
    const TIME_WINDOW = 10000; // ...10 seconds.
    const PAUSE_PERIOD = 1000; // Pause for 1 second if reached
    function MessagesFromServerConsumer(db) {
        const queue = [];
        const readyToServe = new rxjs.BehaviorSubject(true);
        const event = new rxjs.BehaviorSubject(null);
        let isWorking = false;
        let loopDetection = new Array(LIMIT_NUM_MESSAGES_PER_TIME).fill(0);
        event.subscribe(() => __awaiter(this, void 0, void 0, function* () {
            if (isWorking)
                return;
            if (queue.length > 0) {
                isWorking = true;
                loopDetection.shift();
                loopDetection.push(Date.now());
                readyToServe.next(false);
                try {
                    yield consumeQueue();
                }
                finally {
                    if (loopDetection[loopDetection.length - 1] - loopDetection[0] <
                        TIME_WINDOW) {
                        // Ten loops within 10 seconds. Slow down!
                        // This is a one-time event. Just pause 10 seconds.
                        console.warn(`Slowing down websocket loop for ${PAUSE_PERIOD} milliseconds`);
                        yield new Promise((resolve) => setTimeout(resolve, PAUSE_PERIOD));
                    }
                    isWorking = false;
                    readyToServe.next(true);
                }
            }
        }));
        function enqueue(msg) {
            queue.push(msg);
            event.next(null);
        }
        function consumeQueue() {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c, _d, _e, _f;
                while (queue.length > 0) {
                    const msg = queue.shift();
                    try {
                        // If the sync worker or service worker is syncing, wait 'til thei're done.
                        // It's no need to have two channels at the same time - even though it wouldnt
                        // be a problem - this is an optimization.
                        yield rxjs.firstValueFrom(db.cloud.syncState.pipe(operators.filter(({ phase }) => phase === 'in-sync' || phase === 'error')));
                        console.debug('processing msg', msg);
                        const persistedSyncState = db.cloud.persistedSyncState.value;
                        //syncState.
                        if (!msg)
                            continue;
                        switch (msg.type) {
                            case 'token-expired':
                                console.debug('WebSocket observable: Token expired. Refreshing token...');
                                const user = db.cloud.currentUser.value;
                                // Refresh access token
                                const refreshedLogin = yield refreshAccessToken(db.cloud.options.databaseUrl, user);
                                // Persist updated access token
                                yield db.table('$logins').update(user.userId, {
                                    accessToken: refreshedLogin.accessToken,
                                    accessTokenExpiration: refreshedLogin.accessTokenExpiration,
                                    claims: refreshedLogin.claims,
                                    license: refreshedLogin.license,
                                    data: refreshedLogin.data,
                                });
                                // Updating $logins will trigger emission of db.cloud.currentUser observable, which
                                // in turn will lead to that connectWebSocket.ts will reconnect the socket with the
                                // new token. So we don't need to do anything more here.
                                break;
                            case 'realm-added':
                                if (!((_a = persistedSyncState === null || persistedSyncState === void 0 ? void 0 : persistedSyncState.realms) === null || _a === void 0 ? void 0 : _a.includes(msg.realm)) &&
                                    !((_b = persistedSyncState === null || persistedSyncState === void 0 ? void 0 : persistedSyncState.inviteRealms) === null || _b === void 0 ? void 0 : _b.includes(msg.realm))) {
                                    yield db.cloud.sync({ purpose: 'pull', wait: true });
                                    //triggerSync(db, 'pull');
                                }
                                break;
                            case 'realm-accepted':
                                if (!((_c = persistedSyncState === null || persistedSyncState === void 0 ? void 0 : persistedSyncState.realms) === null || _c === void 0 ? void 0 : _c.includes(msg.realm))) {
                                    yield db.cloud.sync({ purpose: 'pull', wait: true });
                                    //triggerSync(db, 'pull');
                                }
                                break;
                            case 'realm-removed':
                                if (((_d = persistedSyncState === null || persistedSyncState === void 0 ? void 0 : persistedSyncState.realms) === null || _d === void 0 ? void 0 : _d.includes(msg.realm)) ||
                                    ((_e = persistedSyncState === null || persistedSyncState === void 0 ? void 0 : persistedSyncState.inviteRealms) === null || _e === void 0 ? void 0 : _e.includes(msg.realm))) {
                                    yield db.cloud.sync({ purpose: 'pull', wait: true });
                                    //triggerSync(db, 'pull');
                                }
                                break;
                            case 'realms-changed':
                                //triggerSync(db, 'pull');
                                yield db.cloud.sync({ purpose: 'pull', wait: true });
                                break;
                            case 'changes':
                                console.debug('changes');
                                if (((_f = db.cloud.syncState.value) === null || _f === void 0 ? void 0 : _f.phase) === 'error') {
                                    triggerSync(db, 'pull');
                                    break;
                                }
                                yield db.transaction('rw', db.dx.tables, (tx) => __awaiter(this, void 0, void 0, function* () {
                                    // @ts-ignore
                                    tx.idbtrans.disableChangeTracking = true;
                                    // @ts-ignore
                                    tx.idbtrans.disableAccessControl = true;
                                    const [schema, syncState, currentUser] = yield Promise.all([
                                        db.getSchema(),
                                        db.getPersistedSyncState(),
                                        db.getCurrentUser(),
                                    ]);
                                    console.debug('ws message queue: in transaction');
                                    if (!syncState || !schema || !currentUser) {
                                        console.debug('required vars not present', {
                                            syncState,
                                            schema,
                                            currentUser,
                                        });
                                        return; // Initial sync must have taken place - otherwise, ignore this.
                                    }
                                    // Verify again in ACID tx that we're on same server revision.
                                    if (msg.baseRev !== syncState.serverRevision) {
                                        console.debug(`baseRev (${msg.baseRev}) differs from our serverRevision in syncState (${syncState.serverRevision})`);
                                        // Should we trigger a sync now? No. This is a normal case
                                        // when another local peer (such as the SW or a websocket channel on other tab) has
                                        // updated syncState from new server information but we are not aware yet. It would
                                        // be unnescessary to do a sync in that case. Instead, the caller of this consumeQueue()
                                        // function will do readyToServe.next(true) right after this return, which will lead
                                        // to a "ready" message being sent to server with the new accurate serverRev we have,
                                        // so that the next message indeed will be correct.
                                        if (typeof msg.baseRev === 'string' && // v2 format
                                            (typeof syncState.serverRevision === 'bigint' || // v1 format
                                                typeof syncState.serverRevision === 'object') // v1 format old browser
                                        ) {
                                            // The reason for the diff seems to be that server has migrated the revision format.
                                            // Do a full sync to update revision format.
                                            // If we don't do a sync request now, we could stuck in an endless loop.
                                            triggerSync(db, 'pull');
                                        }
                                        return; // Ignore message
                                    }
                                    // Verify also that the message is based on the exact same set of realms
                                    const ourRealmSetHash = yield Dexie.waitFor(
                                    // Keep TX in non-IDB work
                                    computeRealmSetHash(syncState));
                                    console.debug('ourRealmSetHash', ourRealmSetHash);
                                    if (ourRealmSetHash !== msg.realmSetHash) {
                                        console.debug('not same realmSetHash', msg.realmSetHash);
                                        triggerSync(db, 'pull');
                                        // The message isn't based on the same realms.
                                        // Trigger a sync instead to resolve all things up.
                                        return;
                                    }
                                    // Get clientChanges
                                    let clientChanges = [];
                                    if (currentUser.isLoggedIn) {
                                        const mutationTables = getSyncableTables(db).map((tbl) => db.table(getMutationTable(tbl.name)));
                                        clientChanges = yield listClientChanges(mutationTables, db);
                                        console.debug('msg queue: client changes', clientChanges);
                                    }
                                    if (msg.changes.length > 0) {
                                        const filteredChanges = filterServerChangesThroughAddedClientChanges(msg.changes, clientChanges);
                                        //
                                        // apply server changes
                                        //
                                        console.debug('applying filtered server changes', filteredChanges);
                                        yield applyServerChanges(filteredChanges, db);
                                    }
                                    // Update latest revisions per table in case there are unsynced changes
                                    // This can be a real case in future when we allow non-eagery sync.
                                    // And it can actually be realistic now also, but very rare.
                                    syncState.latestRevisions = getLatestRevisionsPerTable(clientChanges, syncState.latestRevisions);
                                    syncState.serverRevision = msg.newRev;
                                    // Update base revs
                                    console.debug('Updating baseRefs', syncState.latestRevisions);
                                    yield updateBaseRevs(db, schema, syncState.latestRevisions, msg.newRev);
                                    //
                                    // Update syncState
                                    //
                                    console.debug('Updating syncState', syncState);
                                    yield db.$syncState.put(syncState, 'syncState');
                                }));
                                console.debug('msg queue: done with rw transaction');
                                break;
                        }
                    }
                    catch (error) {
                        console.error(`Error in msg queue`, error);
                    }
                }
            });
        }
        return {
            enqueue,
            readyToServe,
        };
    }

    const wm$1 = new WeakMap();
    const DEXIE_CLOUD_SCHEMA = {
        members: '@id, [userId+realmId], [email+realmId], realmId',
        roles: '[realmId+name]',
        realms: '@realmId',
        $jobs: '',
        $syncState: '',
        $baseRevs: '[tableName+clientRev]',
        $logins: 'claims.sub, lastLogin',
    };
    let static_counter = 0;
    function DexieCloudDB(dx) {
        if ('vip' in dx)
            dx = dx['vip']; // Avoid race condition. Always map to a vipped dexie that don't block during db.on.ready().
        let db = wm$1.get(dx.cloud);
        if (!db) {
            const localSyncEvent = new rxjs.Subject();
            let syncStateChangedEvent = new BroadcastedAndLocalEvent(`syncstatechanged-${dx.name}`);
            let syncCompleteEvent = new BroadcastedAndLocalEvent(`synccomplete-${dx.name}`);
            localSyncEvent['id'] = ++static_counter;
            let initiallySynced = false;
            db = {
                get name() {
                    return dx.name;
                },
                close() {
                    return dx.close();
                },
                transaction: dx.transaction.bind(dx),
                table: dx.table.bind(dx),
                get tables() {
                    return dx.tables;
                },
                cloud: dx.cloud,
                get $jobs() {
                    return dx.table('$jobs');
                },
                get $syncState() {
                    return dx.table('$syncState');
                },
                get $baseRevs() {
                    return dx.table('$baseRevs');
                },
                get $logins() {
                    return dx.table('$logins');
                },
                get realms() {
                    return dx.realms;
                },
                get members() {
                    return dx.members;
                },
                get roles() {
                    return dx.roles;
                },
                get initiallySynced() {
                    return initiallySynced;
                },
                localSyncEvent,
                get syncStateChangedEvent() {
                    return syncStateChangedEvent;
                },
                get syncCompleteEvent() {
                    return syncCompleteEvent;
                },
                dx,
            };
            const helperMethods = {
                getCurrentUser() {
                    return db.$logins
                        .toArray()
                        .then((logins) => logins.find((l) => l.isLoggedIn) || UNAUTHORIZED_USER);
                },
                getPersistedSyncState() {
                    return db.$syncState.get('syncState');
                },
                getSchema() {
                    return db.$syncState.get('schema').then((schema) => {
                        if (schema) {
                            for (const table of db.tables) {
                                if (table.schema.primKey && table.schema.primKey.keyPath && schema[table.name]) {
                                    schema[table.name].primaryKey = nameFromKeyPath(table.schema.primKey.keyPath);
                                }
                            }
                        }
                        return schema;
                    });
                },
                getOptions() {
                    return db.$syncState.get('options');
                },
                setInitiallySynced(value) {
                    initiallySynced = value;
                },
                reconfigure() {
                    syncStateChangedEvent = new BroadcastedAndLocalEvent(`syncstatechanged-${dx.name}`);
                    syncCompleteEvent = new BroadcastedAndLocalEvent(`synccomplete-${dx.name}`);
                },
            };
            Object.assign(db, helperMethods);
            db.messageConsumer = MessagesFromServerConsumer(db);
            db.messageProducer = new rxjs.Subject();
            wm$1.set(dx.cloud, db);
        }
        return db;
    }
    function nameFromKeyPath(keyPath) {
        return typeof keyPath === 'string' ?
            keyPath :
            keyPath ? ('[' + [].join.call(keyPath, '+') + ']') : "";
    }

    // @ts-ignore
    const isFirefox = typeof InstallTrigger !== 'undefined';

    const isSafari = typeof navigator !== 'undefined' &&
        /Safari\//.test(navigator.userAgent) &&
        !/Chrom(e|ium)\/|Edge\//.test(navigator.userAgent);
    const safariVersion = isSafari
        ? // @ts-ignore
            [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1]
        : NaN;

    // What we know: Safari 14.1 (version 605) crashes when using dexie-cloud's service worker.
    // We don't know what exact call is causing this. Have tried safari-14-idb-fix with no luck.
    // Something we do in the service worker is triggering the crash.
    // When next Safari version (606) is out we will start enabling SW again, hoping that the bug is solved.
    // If not, we might increment 605 to 606.
    const DISABLE_SERVICEWORKER_STRATEGY = (isSafari && safariVersion <= 605) || // Disable for Safari for now.
        isFirefox; // Disable for Firefox for now. Seems to have a bug in reading CryptoKeys from IDB from service workers

    const IS_SERVICE_WORKER = typeof self !== "undefined" && "clients" in self && !self.document;

    function throwVersionIncrementNeeded() {
        throw new Dexie.SchemaError(`Version increment needed to allow dexie-cloud change tracking`);
    }

    const { toString } = {};
    function toStringTag(o) {
        return toString.call(o).slice(8, -1);
    }
    function getEffectiveKeys(primaryKey, req) {
        var _a;
        if (req.type === 'delete')
            return req.keys;
        return ((_a = req.keys) === null || _a === void 0 ? void 0 : _a.slice()) || req.values.map(primaryKey.extractKey);
    }
    function applyToUpperBitFix(orig, bits) {
        return ((bits & 1 ? orig[0].toUpperCase() : orig[0].toLowerCase()) +
            (bits & 2 ? orig[1].toUpperCase() : orig[1].toLowerCase()) +
            (bits & 4 ? orig[2].toUpperCase() : orig[2].toLowerCase()));
    }
    const consonants = /b|c|d|f|g|h|j|k|l|m|n|p|q|r|s|t|v|x|y|z/i;
    function isUpperCase(ch) {
        return ch >= 'A' && ch <= 'Z';
    }
    function generateTablePrefix(tableName, allPrefixes) {
        let rv = tableName[0].toLocaleLowerCase(); // "users" = "usr", "friends" = "frn", "realms" = "rlm", etc.
        for (let i = 1, l = tableName.length; i < l && rv.length < 3; ++i) {
            if (consonants.test(tableName[i]) || isUpperCase(tableName[i]))
                rv += tableName[i].toLowerCase();
        }
        while (allPrefixes.has(rv)) {
            if (/\d/g.test(rv)) {
                rv = rv.substr(0, rv.length - 1) + (rv[rv.length - 1] + 1);
                if (rv.length > 3)
                    rv = rv.substr(0, 3);
                else
                    continue;
            }
            else if (rv.length < 3) {
                rv = rv + '2';
                continue;
            }
            let bitFix = 1;
            let upperFixed = rv;
            while (allPrefixes.has(upperFixed) && bitFix < 8) {
                upperFixed = applyToUpperBitFix(rv, bitFix);
                ++bitFix;
            }
            if (bitFix < 8)
                rv = upperFixed;
            else {
                let nextChar = (rv.charCodeAt(2) + 1) & 127;
                rv = rv.substr(0, 2) + String.fromCharCode(nextChar);
                // Here, in theory we could get an infinite loop if having 127*8 table names with identical 3 first consonants.
            }
        }
        return rv;
    }
    let time = 0;
    /**
     *
     * @param prefix A unique 3-letter short-name of the table.
     * @param shardKey 3 last letters from another ID if colocation is requested. Verified on server on inserts - guarantees unique IDs across shards.
     *  The shardKey part of the key represent the shardId where it was first created. An object with this
     *  primary key can later on be moved to another shard without being altered. The reason for having
     *  the origin shardKey as part of the key, is that the server will not need to check uniqueness constraint
     *  across all shards on every insert. Updates / moves across shards are already controlled by the server
     *  in the sense that the objects needs to be there already - we only need this part for inserts.
     * @returns
     */
    function generateKey(prefix, shardKey) {
        const a = new Uint8Array(18);
        const timePart = new Uint8Array(a.buffer, 0, 6);
        const now = Date.now(); // Will fit into 6 bytes until year 10 895.
        if (time >= now) {
            // User is bulk-creating objects the same millisecond.
            // Increment the time part by one millisecond for each item.
            // If bulk-creating 1,000,000 rows client-side in 10 seconds,
            // the last time-stamp will be 990 seconds in future, which is no biggie at all.
            // The point is to create a nice order of the generated IDs instead of
            // using random ids.
            ++time;
        }
        else {
            time = now;
        }
        timePart[0] = time / 1099511627776; // Normal division (no bitwise operator) --> works with >= 32 bits.
        timePart[1] = time / 4294967296;
        timePart[2] = time / 16777216;
        timePart[3] = time / 65536;
        timePart[4] = time / 256;
        timePart[5] = time;
        const randomPart = new Uint8Array(a.buffer, 6);
        crypto.getRandomValues(randomPart);
        const id = new Uint8Array(a.buffer);
        return prefix + b64LexEncode(id) + (shardKey || '');
    }

    function createIdGenerationMiddleware(db) {
        return {
            stack: 'dbcore',
            name: 'idGenerationMiddleware',
            level: 1,
            create: (core) => {
                return Object.assign(Object.assign({}, core), { table: (tableName) => {
                        const table = core.table(tableName);
                        function generateOrVerifyAtKeys(req, idPrefix) {
                            let valueClones = null;
                            const keys = getEffectiveKeys(table.schema.primaryKey, req);
                            keys.forEach((key, idx) => {
                                if (key === undefined) {
                                    // Generate the key
                                    const colocatedId = req.values[idx].realmId || db.cloud.currentUserId;
                                    const shardKey = colocatedId.substr(colocatedId.length - 3);
                                    keys[idx] = generateKey(idPrefix, shardKey);
                                    if (!table.schema.primaryKey.outbound) {
                                        if (!valueClones)
                                            valueClones = req.values.slice();
                                        valueClones[idx] = Dexie.deepClone(valueClones[idx]);
                                        Dexie.setByKeyPath(valueClones[idx], table.schema.primaryKey.keyPath, keys[idx]);
                                    }
                                }
                                else if (typeof key !== 'string' ||
                                    (!key.startsWith(idPrefix) && !key.startsWith('#' + idPrefix))) {
                                    // Key was specified by caller. Verify it complies with id prefix.
                                    throw new Dexie.ConstraintError(`The ID "${key}" is not valid for table "${tableName}". ` +
                                        `Primary '@' keys requires the key to be prefixed with "${idPrefix}" (or "#${idPrefix}).\n` +
                                        `If you want to generate IDs programmatically, remove '@' from the schema to get rid of this constraint. Dexie Cloud supports custom IDs as long as they are random and globally unique.`);
                                }
                            });
                            return table.mutate(Object.assign(Object.assign({}, req), { keys, values: valueClones || req.values }));
                        }
                        return Object.assign(Object.assign({}, table), { mutate: (req) => {
                                var _a, _b;
                                const idbtrans = req.trans;
                                if (idbtrans.mode === 'versionchange') {
                                    // Tell all the other middlewares to skip bothering. We're in versionchange mode.
                                    // dexie-cloud is not initialized yet.
                                    idbtrans.disableChangeTracking = true;
                                    idbtrans.disableAccessControl = true;
                                }
                                if (idbtrans.disableChangeTracking) {
                                    // Disable ID policy checks and ID generation
                                    return table.mutate(req);
                                }
                                if (req.type === 'add' || req.type === 'put') {
                                    const cloudTableSchema = (_a = db.cloud.schema) === null || _a === void 0 ? void 0 : _a[tableName];
                                    if (!(cloudTableSchema === null || cloudTableSchema === void 0 ? void 0 : cloudTableSchema.generatedGlobalId)) {
                                        if (cloudTableSchema === null || cloudTableSchema === void 0 ? void 0 : cloudTableSchema.markedForSync) {
                                            // Just make sure primary key is of a supported type:
                                            const keys = getEffectiveKeys(table.schema.primaryKey, req);
                                            keys.forEach((key, idx) => {
                                                if (!isValidSyncableID(key)) {
                                                    const type = Array.isArray(key)
                                                        ? key.map(toStringTag).join(',')
                                                        : toStringTag(key);
                                                    throw new Dexie.ConstraintError(`Invalid primary key type ${type} for table ${tableName}. Tables marked for sync has primary keys of type string or Array of string (and optional numbers)`);
                                                }
                                            });
                                        }
                                    }
                                    else {
                                        if (((_b = db.cloud.options) === null || _b === void 0 ? void 0 : _b.databaseUrl) && !db.initiallySynced) {
                                            // A database URL is configured but no initial sync has been performed.
                                            const keys = getEffectiveKeys(table.schema.primaryKey, req);
                                            // Check if the operation would yield any INSERT. If so, complain! We never want wrong ID prefixes stored.
                                            return table
                                                .getMany({ keys, trans: req.trans, cache: 'immutable' })
                                                .then((results) => {
                                                if (results.length < keys.length) {
                                                    // At least one of the given objects would be created. Complain since
                                                    // the generated ID would be based on a locally computed ID prefix only - we wouldn't
                                                    // know if the server would give the same ID prefix until an initial sync has been
                                                    // performed.
                                                    throw new Error(`Unable to create new objects without an initial sync having been performed.`);
                                                }
                                                return table.mutate(req);
                                            });
                                        }
                                        return generateOrVerifyAtKeys(req, cloudTableSchema.idPrefix);
                                    }
                                }
                                return table.mutate(req);
                            } });
                    } });
            },
        };
    }

    function createImplicitPropSetterMiddleware(db) {
        return {
            stack: 'dbcore',
            name: 'implicitPropSetterMiddleware',
            level: 1,
            create: (core) => {
                return Object.assign(Object.assign({}, core), { table: (tableName) => {
                        const table = core.table(tableName);
                        return Object.assign(Object.assign({}, table), { mutate: (req) => {
                                var _a, _b, _c, _d, _e, _f;
                                const trans = req.trans;
                                if (trans.disableChangeTracking) {
                                    return table.mutate(req);
                                }
                                const currentUserId = (_b = (_a = trans.currentUser) === null || _a === void 0 ? void 0 : _a.userId) !== null && _b !== void 0 ? _b : UNAUTHORIZED_USER.userId;
                                if ((_d = (_c = db.cloud.schema) === null || _c === void 0 ? void 0 : _c[tableName]) === null || _d === void 0 ? void 0 : _d.markedForSync) {
                                    if (req.type === 'add' || req.type === 'put') {
                                        if (tableName === 'members') {
                                            for (const member of req.values) {
                                                if (typeof member.email === 'string') {
                                                    // Resolve https://github.com/dexie/dexie-cloud/issues/4
                                                    // If adding a member, make sure email is lowercase and trimmed.
                                                    // This is to avoid issues where the APP does not check this
                                                    // and just allows the user to enter an email address that might
                                                    // have been pasted by the user from a source that had a trailing
                                                    // space or was in uppercase. We want to avoid that the user
                                                    // creates a new member with a different email address than
                                                    // the one he/she intended to create.
                                                    member.email = member.email.trim().toLowerCase();
                                                }
                                            }
                                        }
                                        // No matter if user is logged in or not, make sure "owner" and "realmId" props are set properly.
                                        // If not logged in, this will be changed upon syncification of the tables (next sync after login),
                                        // however, application code will work better if we can always rely on that the properties realmId
                                        // and owner are set. Application code may index them and query them based on db.cloud.currentUserId,
                                        // and expect them to be returned. That scenario must work also when db.cloud.currentUserId === 'unauthorized'.
                                        for (const obj of req.values) {
                                            if (!obj.owner) {
                                                obj.owner = currentUserId;
                                            }
                                            if (!obj.realmId) {
                                                obj.realmId = currentUserId;
                                            }
                                            const key = (_f = (_e = table.schema.primaryKey).extractKey) === null || _f === void 0 ? void 0 : _f.call(_e, obj);
                                            if (typeof key === 'string' && key[0] === '#') {
                                                // Add $ts prop for put operations and
                                                // disable update operations as well as consistent
                                                // modify operations. Reason: Server may not have
                                                // the object. Object should be created on server only
                                                // if is being updated. An update operation won't create it
                                                // so we must delete req.changeSpec to degrade operation to
                                                // an upsert operation with timestamp so that it will be created.
                                                // We must also degrade from consistent modify operations for the
                                                // same reason - object might be there on server. Must but put up instead.
                                                // FUTURE: This clumpsy behavior of private IDs could be refined later.
                                                // Suggestion is to in future, treat private IDs as we treat all objects 
                                                // and sync operations normally. Only that deletions should become soft deletes
                                                // for them - so that server knows when a private ID has been deleted on server
                                                // not accept insert/upserts on them.
                                                if (req.type === 'put') {
                                                    delete req.criteria;
                                                    delete req.changeSpec;
                                                    if (!req.upsert)
                                                        delete req.updates;
                                                    obj.$ts = Date.now();
                                                }
                                            }
                                        }
                                    }
                                }
                                return table.mutate(req);
                            } });
                    } });
            },
        };
    }

    function allSettled(possiblePromises) {
        return new Promise(resolve => {
            if (possiblePromises.length === 0)
                resolve([]);
            let remaining = possiblePromises.length;
            const results = new Array(remaining);
            possiblePromises.forEach((p, i) => Promise.resolve(p).then(value => results[i] = { status: "fulfilled", value }, reason => results[i] = { status: "rejected", reason })
                .then(() => --remaining || resolve(results)));
        });
    }

    let counter$1 = 0;
    function guardedTable(table) {
        const prop = "$lock" + (++counter$1);
        return Object.assign(Object.assign({}, table), { count: readLock(table.count, prop), get: readLock(table.get, prop), getMany: readLock(table.getMany, prop), openCursor: readLock(table.openCursor, prop), query: readLock(table.query, prop), mutate: writeLock(table.mutate, prop) });
    }
    function readLock(fn, prop) {
        return function readLocker(req) {
            const { readers, writers, } = req.trans[prop] || (req.trans[prop] = { writers: [], readers: [] });
            const numWriters = writers.length;
            const promise = (numWriters > 0
                ? writers[numWriters - 1].then(() => fn(req), () => fn(req))
                : fn(req)).finally(() => { readers.splice(readers.indexOf(promise)); });
            readers.push(promise);
            return promise;
        };
    }
    function writeLock(fn, prop) {
        return function writeLocker(req) {
            const { readers, writers, } = req.trans[prop] || (req.trans[prop] = { writers: [], readers: [] });
            let promise = (writers.length > 0
                ? writers[writers.length - 1].then(() => fn(req), () => fn(req))
                : readers.length > 0
                    ? allSettled(readers).then(() => fn(req))
                    : fn(req)).finally(() => { writers.shift(); });
            writers.push(promise);
            return promise;
        };
    }

    const outstandingTransactions = new rxjs.BehaviorSubject(new Set());

    function isEagerSyncDisabled(db) {
        var _a, _b, _c, _d;
        return (((_a = db.cloud.options) === null || _a === void 0 ? void 0 : _a.disableEagerSync) ||
            ((_c = (_b = db.cloud.currentUser.value) === null || _b === void 0 ? void 0 : _b.license) === null || _c === void 0 ? void 0 : _c.status) !== 'ok' ||
            !((_d = db.cloud.options) === null || _d === void 0 ? void 0 : _d.databaseUrl));
    }

    /** Tracks all mutations in the same transaction as the mutations -
     * so it is guaranteed that no mutation goes untracked - and if transaction
     * aborts, the mutations won't be tracked.
     *
     * The sync job will use the tracked mutations as the source of truth when pushing
     * changes to server and cleanup the tracked mutations once the server has
     * ackowledged that it got them.
     */
    function createMutationTrackingMiddleware({ currentUserObservable, db, }) {
        return {
            stack: 'dbcore',
            name: 'MutationTrackingMiddleware',
            level: 1,
            create: (core) => {
                const allTableNames = new Set(core.schema.tables.map((t) => t.name));
                const ordinaryTables = core.schema.tables.filter((t) => !/^\$/.test(t.name));
                const mutTableMap = new Map();
                for (const tbl of ordinaryTables) {
                    const mutationTableName = `$${tbl.name}_mutations`;
                    if (allTableNames.has(mutationTableName)) {
                        mutTableMap.set(tbl.name, core.table(mutationTableName));
                    }
                }
                return Object.assign(Object.assign({}, core), { transaction: (tables, mode) => {
                        let tx;
                        if (mode === 'readwrite') {
                            const mutationTables = tables
                                .filter((tbl) => { var _a, _b; return (_b = (_a = db.cloud.schema) === null || _a === void 0 ? void 0 : _a[tbl]) === null || _b === void 0 ? void 0 : _b.markedForSync; })
                                .map((tbl) => getMutationTable(tbl));
                            tx = core.transaction([...tables, ...mutationTables], mode);
                        }
                        else {
                            tx = core.transaction(tables, mode);
                        }
                        if (mode === 'readwrite') {
                            // Give each transaction a globally unique id.
                            tx.txid = randomString(16);
                            tx.opCount = 0;
                            // Introduce the concept of current user that lasts through the entire transaction.
                            // This is important because the tracked mutations must be connected to the user.
                            tx.currentUser = currentUserObservable.value;
                            outstandingTransactions.value.add(tx);
                            outstandingTransactions.next(outstandingTransactions.value);
                            const removeTransaction = () => {
                                tx.removeEventListener('complete', txComplete);
                                tx.removeEventListener('error', removeTransaction);
                                tx.removeEventListener('abort', removeTransaction);
                                outstandingTransactions.value.delete(tx);
                                outstandingTransactions.next(outstandingTransactions.value);
                            };
                            const txComplete = () => {
                                if (tx.mutationsAdded && !isEagerSyncDisabled(db)) {
                                    triggerSync(db, 'push');
                                }
                                removeTransaction();
                            };
                            tx.addEventListener('complete', txComplete);
                            tx.addEventListener('error', removeTransaction);
                            tx.addEventListener('abort', removeTransaction);
                        }
                        return tx;
                    }, table: (tableName) => {
                        const table = core.table(tableName);
                        if (/^\$/.test(tableName)) {
                            if (tableName.endsWith('_mutations')) {
                                // In case application code adds items to ..._mutations tables,
                                // make sure to set the mutationsAdded flag on transaction.
                                // This is also done in mutateAndLog() as that function talks to a
                                // lower level DBCore and wouldn't be catched by this code.
                                return Object.assign(Object.assign({}, table), { mutate: (req) => {
                                        if (req.type === 'add' || req.type === 'put') {
                                            req.trans.mutationsAdded = true;
                                        }
                                        return table.mutate(req);
                                    } });
                            }
                            else if (tableName === '$logins') {
                                return Object.assign(Object.assign({}, table), { mutate: (req) => {
                                        //console.debug('Mutating $logins table', req);
                                        return table
                                            .mutate(req)
                                            .then((res) => {
                                            //console.debug('Mutating $logins');
                                            req.trans.mutationsAdded = true;
                                            //console.debug('$logins mutated');
                                            return res;
                                        })
                                            .catch((err) => {
                                            console.debug('Failed mutation $logins', err);
                                            return Promise.reject(err);
                                        });
                                    } });
                            }
                            else {
                                return table;
                            }
                        }
                        const { schema } = table;
                        const mutsTable = mutTableMap.get(tableName);
                        if (!mutsTable) {
                            // We cannot track mutations on this table because there is no mutations table for it.
                            // This might happen in upgraders that executes before cloud schema is applied.
                            return table;
                        }
                        return guardedTable(Object.assign(Object.assign({}, table), { mutate: (req) => {
                                var _a, _b, _c;
                                const trans = req.trans;
                                if (!trans.txid)
                                    return table.mutate(req); // Upgrade transactions not guarded by us.
                                if (trans.disableChangeTracking)
                                    return table.mutate(req);
                                if (!((_b = (_a = db.cloud.schema) === null || _a === void 0 ? void 0 : _a[tableName]) === null || _b === void 0 ? void 0 : _b.markedForSync))
                                    return table.mutate(req);
                                if (!((_c = trans.currentUser) === null || _c === void 0 ? void 0 : _c.isLoggedIn)) {
                                    // Unauthorized user should not log mutations.
                                    // Instead, after login all local data should be logged at once.
                                    return table.mutate(req);
                                }
                                return req.type === 'deleteRange'
                                    ? table
                                        // Query the actual keys (needed for server sending correct rollback to us)
                                        .query({
                                        query: { range: req.range, index: schema.primaryKey },
                                        trans: req.trans,
                                        values: false,
                                    })
                                        // Do a delete request instead, but keep the criteria info for the server to execute
                                        .then((res) => {
                                        return mutateAndLog({
                                            type: 'delete',
                                            keys: res.result,
                                            trans: req.trans,
                                            criteria: { index: null, range: req.range },
                                        });
                                    })
                                    : mutateAndLog(req);
                            } }));
                        function mutateAndLog(req) {
                            var _a, _b;
                            const trans = req.trans;
                            const unsyncedProps = (_b = (_a = db.cloud.options) === null || _a === void 0 ? void 0 : _a.unsyncedProperties) === null || _b === void 0 ? void 0 : _b[tableName];
                            const { txid, currentUser: { userId }, } = trans;
                            const { type } = req;
                            const opNo = ++trans.opCount;
                            function stripChangeSpec(changeSpec) {
                                if (!unsyncedProps)
                                    return changeSpec;
                                let rv = changeSpec;
                                for (const keyPath of Object.keys(changeSpec)) {
                                    if (unsyncedProps.some((p) => keyPath === p || keyPath.startsWith(p + '.'))) {
                                        if (rv === changeSpec)
                                            rv = Object.assign({}, changeSpec); // clone on demand
                                        delete rv[keyPath];
                                    }
                                }
                                return rv;
                            }
                            return table.mutate(req).then((res) => {
                                var _a;
                                const { numFailures: hasFailures, failures } = res;
                                let keys = type === 'delete' ? req.keys : res.results;
                                let values = 'values' in req ? req.values : [];
                                let changeSpec = 'changeSpec' in req ? req.changeSpec : undefined;
                                let updates = 'updates' in req ? req.updates : undefined;
                                let upsert = updates && 'upsert' in req ? req.upsert : false;
                                if (hasFailures) {
                                    keys = keys.filter((_, idx) => !failures[idx]);
                                    values = values.filter((_, idx) => !failures[idx]);
                                }
                                if (unsyncedProps) {
                                    // Filter out unsynced properties
                                    values = values.map((value) => {
                                        const newValue = Object.assign({}, value);
                                        for (const prop of unsyncedProps) {
                                            delete newValue[prop];
                                        }
                                        return newValue;
                                    });
                                    if (changeSpec) {
                                        // modify operation with criteria and changeSpec.
                                        // We must strip out unsynced properties from changeSpec.
                                        // We deal with criteria later.
                                        changeSpec = stripChangeSpec(changeSpec);
                                        if (Object.keys(changeSpec).length === 0) {
                                            // Nothing to change on server
                                            return res;
                                        }
                                    }
                                    if (updates) {
                                        let strippedChangeSpecs = updates.changeSpecs.map(stripChangeSpec);
                                        let newUpdates = {
                                            keys: [],
                                            changeSpecs: [],
                                        };
                                        const validKeys = new Dexie.RangeSet();
                                        let anyChangeSpecBecameEmpty = false;
                                        if (!upsert) {
                                            for (let i = 0, l = strippedChangeSpecs.length; i < l; ++i) {
                                                if (Object.keys(strippedChangeSpecs[i]).length > 0) {
                                                    newUpdates.keys.push(updates.keys[i]);
                                                    newUpdates.changeSpecs.push(strippedChangeSpecs[i]);
                                                    validKeys.addKey(updates.keys[i]);
                                                }
                                                else {
                                                    anyChangeSpecBecameEmpty = true;
                                                }
                                            }
                                            updates = newUpdates;
                                            if (anyChangeSpecBecameEmpty) {
                                                // Some keys were stripped. We must also strip them from keys and values
                                                // unless this is an upsert operation in which case we want to send them all.
                                                let newKeys = [];
                                                let newValues = [];
                                                for (let i = 0, l = keys.length; i < l; ++i) {
                                                    if (validKeys.hasKey(keys[i])) {
                                                        newKeys.push(keys[i]);
                                                        newValues.push(values[i]);
                                                    }
                                                }
                                                keys = newKeys;
                                                values = newValues;
                                            }
                                        }
                                    }
                                }
                                const ts = Date.now();
                                // Canonicalize req.criteria.index to null if it's on the primary key.
                                let criteria = 'criteria' in req && req.criteria
                                    ? Object.assign(Object.assign({}, req.criteria), { index: req.criteria.index === schema.primaryKey.keyPath // Use null to inform server that criteria is on primary key
                                            ? null // This will disable the server from trying to log consistent operations where it shouldnt.
                                            : req.criteria.index }) : undefined;
                                if (unsyncedProps && (criteria === null || criteria === void 0 ? void 0 : criteria.index)) {
                                    const keyPaths = (_a = schema.indexes.find((idx) => idx.name === criteria.index)) === null || _a === void 0 ? void 0 : _a.keyPath;
                                    const involvedProps = keyPaths
                                        ? typeof keyPaths === 'string'
                                            ? [keyPaths]
                                            : keyPaths
                                        : [];
                                    if (involvedProps.some((p) => unsyncedProps === null || unsyncedProps === void 0 ? void 0 : unsyncedProps.includes(p))) {
                                        // Don't log criteria on unsynced properties as the server could not test them.
                                        criteria = undefined;
                                    }
                                }
                                const mut = req.type === 'delete'
                                    ? {
                                        type: 'delete',
                                        ts,
                                        opNo,
                                        keys,
                                        criteria,
                                        txid,
                                        userId,
                                    }
                                    : req.type === 'add'
                                        ? {
                                            type: 'insert',
                                            ts,
                                            opNo,
                                            keys,
                                            txid,
                                            userId,
                                            values,
                                        }
                                        : upsert && updates ? {
                                            type: 'upsert',
                                            ts,
                                            opNo,
                                            keys,
                                            values,
                                            changeSpecs: updates.changeSpecs.filter((_, idx) => !failures[idx]),
                                            txid,
                                            userId,
                                        }
                                            : criteria && changeSpec
                                                ? {
                                                    // Common changeSpec for all keys
                                                    type: 'modify',
                                                    ts,
                                                    opNo,
                                                    keys,
                                                    criteria,
                                                    changeSpec,
                                                    txid,
                                                    userId,
                                                }
                                                : changeSpec
                                                    ? {
                                                        // In case criteria involved an unsynced property, we go for keys instead.
                                                        type: 'update',
                                                        ts,
                                                        opNo,
                                                        keys,
                                                        changeSpecs: keys.map(() => changeSpec),
                                                        txid,
                                                        userId,
                                                    }
                                                    : updates
                                                        ? {
                                                            // One changeSpec per key
                                                            type: 'update',
                                                            ts,
                                                            opNo,
                                                            keys: updates.keys,
                                                            changeSpecs: updates.changeSpecs,
                                                            txid,
                                                            userId,
                                                        }
                                                        : {
                                                            type: 'upsert',
                                                            ts,
                                                            opNo,
                                                            keys,
                                                            values,
                                                            txid,
                                                            userId,
                                                        };
                                if ('isAdditionalChunk' in req && req.isAdditionalChunk) {
                                    mut.isAdditionalChunk = true;
                                }
                                return keys.length > 0 || criteria
                                    ? mutsTable
                                        .mutate({ type: 'add', trans, values: [mut] }) // Log entry
                                        .then(() => {
                                        trans.mutationsAdded = true; // Mark transaction as having added mutations to trigger eager sync
                                        return res; // Return original response
                                    })
                                    : res;
                            });
                        }
                    } });
            },
        };
    }

    function overrideParseStoresSpec(origFunc, dexie) {
        return function (stores, dbSchema) {
            var _a;
            const storesClone = Object.assign(Object.assign({}, DEXIE_CLOUD_SCHEMA), stores);
            // Merge indexes of DEXIE_CLOUD_SCHEMA with stores
            Object.keys(DEXIE_CLOUD_SCHEMA).forEach((tableName) => {
                const schemaSrc = storesClone[tableName];
                // Verify that they don't try to delete a table that is needed for access control of Dexie Cloud
                if (schemaSrc == null) {
                    // They try to delete one of the built-in schema tables.
                    throw new Error(`Cannot delete table ${tableName} as it is needed for access control of Dexie Cloud`);
                }
                // If not trying to override a built-in table, then we can skip this and continue to next table.
                if (!stores[tableName]) {
                    // They haven't tried to declare this table. No need to merge indexes.
                    return; // Continue
                }
                // They have declared this table. Merge indexes in case they didn't declare all indexes we need.
                const requestedIndexes = schemaSrc.split(',').map(spec => spec.trim());
                const builtInIndexes = DEXIE_CLOUD_SCHEMA[tableName].split(',').map(spec => spec.trim());
                const requestedIndexSet = new Set(requestedIndexes.map(index => index.replace(/([&*]|\+\+)/g, "")));
                // Verify that primary key is unchanged
                if (requestedIndexes[0] !== builtInIndexes[0]) {
                    // Primary key must match exactly
                    throw new Error(`Cannot override primary key of table ${tableName}. Please declare it as {${tableName}: ${JSON.stringify(DEXIE_CLOUD_SCHEMA[tableName])}`);
                }
                // Merge indexes
                for (let i = 1; i < builtInIndexes.length; ++i) {
                    const builtInIndex = builtInIndexes[i];
                    if (!requestedIndexSet.has(builtInIndex.replace(/([&*]|\+\+)/g, ""))) {
                        // Add built-in index if not already requested
                        storesClone[tableName] += `,${builtInIndex}`;
                    }
                }
            });
            // Populate dexie.cloud.schema
            const cloudSchema = dexie.cloud.schema || (dexie.cloud.schema = {});
            const allPrefixes = new Set();
            Object.keys(storesClone).forEach(tableName => {
                var _a;
                const schemaSrc = (_a = storesClone[tableName]) === null || _a === void 0 ? void 0 : _a.trim();
                const cloudTableSchema = cloudSchema[tableName] || (cloudSchema[tableName] = {});
                if (schemaSrc != null) {
                    if (/^\@/.test(schemaSrc)) {
                        storesClone[tableName] = storesClone[tableName].substr(1);
                        cloudTableSchema.generatedGlobalId = true;
                        cloudTableSchema.idPrefix = generateTablePrefix(tableName, allPrefixes);
                        allPrefixes.add(cloudTableSchema.idPrefix);
                    }
                    if (!/^\$/.test(tableName)) {
                        storesClone[`$${tableName}_mutations`] = '++rev';
                        cloudTableSchema.markedForSync = true;
                    }
                    if (cloudTableSchema.deleted) {
                        cloudTableSchema.deleted = false;
                    }
                }
                else {
                    cloudTableSchema.deleted = true;
                    cloudTableSchema.markedForSync = false;
                    storesClone[`$${tableName}_mutations`] = null;
                }
            });
            const rv = origFunc.call(this, storesClone, dbSchema);
            for (const [tableName, spec] of Object.entries(dbSchema)) {
                if ((_a = spec.yProps) === null || _a === void 0 ? void 0 : _a.length) {
                    const cloudTableSchema = cloudSchema[tableName];
                    if (cloudTableSchema) {
                        cloudTableSchema.yProps = spec.yProps.map((yProp) => yProp.prop);
                    }
                }
            }
            return rv;
        };
    }

    function performGuardedJob(db, jobName, job) {
        if (typeof navigator === 'undefined' || !navigator.locks) {
            // No support for guarding jobs. IE11, node.js, etc.
            return job();
        }
        // @ts-expect-error - LockManager callback type inference issue with generics
        return navigator.locks.request(db.name + '|' + jobName, job);
    }

    function performInitialSync(db, cloudOptions, cloudSchema) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('Performing initial sync');
            yield performGuardedJob(db, CURRENT_SYNC_WORKER, () => sync(db, cloudOptions, cloudSchema, { isInitialSync: true }));
            console.debug('Done initial sync');
        });
    }

    const USER_INACTIVITY_TIMEOUT = 180000; // 3 minutes
    const INACTIVE_WAIT_TIME = 20000;
    // This observable will be emitted to later down....
    const userIsActive = new rxjs.BehaviorSubject(true);
    // A refined version that waits before changing state:
    // * Wait another INACTIVE_WAIT_TIME before accepting that the user is inactive.
    //   Reason 1: Spare resources - no need to setup the entire websocket flow when
    //             switching tabs back and forth.
    //   Reason 2: Less flickering for the end user when switching tabs back and forth.
    // * Wait another ACTIVE_WAIT_TIME before accepting that the user is active.
    //   Possible reason to have a value here: Sparing resources if users often temporary click the tab
    //   for just a short time.
    const userIsReallyActive = new rxjs.BehaviorSubject(true);
    userIsActive
        .pipe(operators.switchMap((isActive) => {
        //console.debug('SyncStatus: DUBB: isActive changed to', isActive);
        return isActive
            ? rxjs.of(true)
            : rxjs.of(false).pipe(operators.delay(INACTIVE_WAIT_TIME))
                ;
    }), operators.distinctUntilChanged())
        .subscribe(userIsReallyActive);
    //
    // First create some corner-stone observables to build the flow on
    //
    // document.onvisibilitychange:
    const visibilityStateIsChanged = typeof document !== 'undefined'
        ? rxjs.fromEvent(document, 'visibilitychange')
        : rxjs.of({});
    // document.onvisibilitychange makes document hidden:
    const documentBecomesHidden = visibilityStateIsChanged.pipe(operators.filter(() => document.visibilityState === 'hidden'));
    // document.onvisibilitychange makes document visible
    const documentBecomesVisible = visibilityStateIsChanged.pipe(operators.filter(() => document.visibilityState === 'visible'));
    // Any of various user-activity-related events happen:
    const userDoesSomething = typeof window !== 'undefined'
        ? rxjs.merge(documentBecomesVisible, rxjs.fromEvent(window, 'mousedown'), rxjs.fromEvent(window, 'mousemove'), rxjs.fromEvent(window, 'keydown'), rxjs.fromEvent(window, 'wheel'), rxjs.fromEvent(window, 'touchmove'))
        : rxjs.of({});
    if (typeof document !== 'undefined') {
        //
        // Now, create a final observable and start subscribing to it in order
        // to make it emit values to userIsActive BehaviourSubject (which is the
        // most important global hot observable we have here)
        //
        // Live test: https://jsitor.com/LboCDHgbn
        //
        rxjs.merge(rxjs.of(true), // Make sure something is always emitted from start
        documentBecomesHidden, // so that we can eagerly emit false!
        userDoesSomething)
            .pipe(
        // No matter event source, compute whether user is visible using visibilityState:
        operators.map(() => document.visibilityState === 'visible'), 
        // Make sure to emit it
        operators.tap((isActive) => {
            if (userIsActive.value !== isActive) {
                // Emit new value unless it already has that value
                userIsActive.next(isActive);
            }
        }), 
        // Now, if true was emitted, make sure to set a timeout to emit false
        // unless new user activity things happen (in that case, the timeout will be cancelled!)
        operators.switchMap((isActive) => isActive
            ? rxjs.of(0).pipe(operators.delay(USER_INACTIVITY_TIMEOUT - INACTIVE_WAIT_TIME), operators.tap(() => userIsActive.next(false)))
            : rxjs.of(0)))
            .subscribe(() => { }); // Unless we subscribe nothing will be propagated to userIsActive observable
    }

    class TokenExpiredError extends Error {
        constructor() {
            super(...arguments);
            this.name = "TokenExpiredError";
        }
    }

    function createYClientUpdateObservable(db) {
        const yTableRecords = flatten(db.tables
            .filter((table) => { var _a, _b; return ((_b = (_a = db.cloud.schema) === null || _a === void 0 ? void 0 : _a[table.name]) === null || _b === void 0 ? void 0 : _b.markedForSync) && table.schema.yProps; })
            .map((table) => table.schema.yProps.map((p) => ({
            table: table.name,
            ydocProp: p.prop,
            updatesTable: p.updatesTable,
        }))));
        return rxjs.merge(...yTableRecords.map(({ table, ydocProp, updatesTable }) => {
            // Per updates table (table+prop combo), we first read syncer.unsentFrom,
            // and then start listening for updates since that number.
            const yTbl = db.table(updatesTable);
            return rxjs.from(yTbl.get(DEXIE_CLOUD_SYNCER_ID)).pipe(rxjs.switchMap((syncer) => {
                let currentUnsentFrom = (syncer === null || syncer === void 0 ? void 0 : syncer.unsentFrom) || 1;
                return rxjs.from(Dexie.liveQuery(() => __awaiter(this, void 0, void 0, function* () {
                    const addedUpdates = yield listUpdatesSince(yTbl, currentUnsentFrom);
                    return addedUpdates
                        .filter((update) => update.f && update.f & 1) // Only include local updates
                        .map((update) => {
                        return {
                            type: 'u-c',
                            table,
                            prop: ydocProp,
                            k: update.k,
                            u: update.u,
                            i: update.i,
                        };
                    });
                }))).pipe(rxjs.tap((addedUpdates) => {
                    // Update currentUnsentFrom to only listen for updates that will be newer than the ones we emitted.
                    // (Before, we did this within the liveQuery, but that caused a bug because
                    // a cancelled emittion of a liveQuery would update the currentUnsentFrom without
                    // emitting anything, leading to that we jumped over some updates. Here we update it
                    // after the liveQuery has emitted its updates)
                    if (addedUpdates.length > 0) {
                        currentUnsentFrom = addedUpdates.at(-1).i + 1;
                    }
                }));
            }));
        })).pipe(
        // Flatten the array of messages.
        // If messageProducer emits empty array, nothing is emitted
        // but if messageProducer emits array of messages, they are
        // emitted one by one.
        rxjs.mergeMap((messages) => messages));
    }

    const awarenessWeakMap = new WeakMap();
    const getDocAwareness = (doc) => awarenessWeakMap.get(doc);

    /**
     * @module awareness-protocol
     */


    const outdatedTimeout = 30000;

    /**
     * @typedef {Object} MetaClientState
     * @property {number} MetaClientState.clock
     * @property {number} MetaClientState.lastUpdated unix timestamp
     */

    /**
     * The Awareness class implements a simple shared state protocol that can be used for non-persistent data like awareness information
     * (cursor, username, status, ..). Each client can update its own local state and listen to state changes of
     * remote clients. Every client may set a state of a remote peer to `null` to mark the client as offline.
     *
     * Each client is identified by a unique client id (something we borrow from `doc.clientID`). A client can override
     * its own state by propagating a message with an increasing timestamp (`clock`). If such a message is received, it is
     * applied if the known state of that client is older than the new state (`clock < newClock`). If a client thinks that
     * a remote client is offline, it may propagate a message with
     * `{ clock: currentClientClock, state: null, client: remoteClient }`. If such a
     * message is received, and the known clock of that client equals the received clock, it will override the state with `null`.
     *
     * Before a client disconnects, it should propagate a `null` state with an updated clock.
     *
     * Awareness states must be updated every 30 seconds. Otherwise the Awareness instance will delete the client state.
     *
     * @extends {Observable<string>}
     */
    class Awareness extends Observable {
      /**
       * @param {Y.Doc} doc
       */
      constructor (doc) {
        super();
        this.doc = doc;
        /**
         * @type {number}
         */
        this.clientID = doc.clientID;
        /**
         * Maps from client id to client state
         * @type {Map<number, Object<string, any>>}
         */
        this.states = new Map();
        /**
         * @type {Map<number, MetaClientState>}
         */
        this.meta = new Map();
        this._checkInterval = /** @type {any} */ (setInterval(() => {
          const now = getUnixTime();
          if (this.getLocalState() !== null && (outdatedTimeout / 2 <= now - /** @type {{lastUpdated:number}} */ (this.meta.get(this.clientID)).lastUpdated)) {
            // renew local clock
            this.setLocalState(this.getLocalState());
          }
          /**
           * @type {Array<number>}
           */
          const remove = [];
          this.meta.forEach((meta, clientid) => {
            if (clientid !== this.clientID && outdatedTimeout <= now - meta.lastUpdated && this.states.has(clientid)) {
              remove.push(clientid);
            }
          });
          if (remove.length > 0) {
            removeAwarenessStates(this, remove, 'timeout');
          }
        }, floor(outdatedTimeout / 10)));
        doc.on('destroy', () => {
          this.destroy();
        });
        this.setLocalState({});
      }

      destroy () {
        this.emit('destroy', [this]);
        this.setLocalState(null);
        super.destroy();
        clearInterval(this._checkInterval);
      }

      /**
       * @return {Object<string,any>|null}
       */
      getLocalState () {
        return this.states.get(this.clientID) || null
      }

      /**
       * @param {Object<string,any>|null} state
       */
      setLocalState (state) {
        const clientID = this.clientID;
        const currLocalMeta = this.meta.get(clientID);
        const clock = currLocalMeta === undefined ? 0 : currLocalMeta.clock + 1;
        const prevState = this.states.get(clientID);
        if (state === null) {
          this.states.delete(clientID);
        } else {
          this.states.set(clientID, state);
        }
        this.meta.set(clientID, {
          clock,
          lastUpdated: getUnixTime()
        });
        const added = [];
        const updated = [];
        const filteredUpdated = [];
        const removed = [];
        if (state === null) {
          removed.push(clientID);
        } else if (prevState == null) {
          if (state != null) {
            added.push(clientID);
          }
        } else {
          updated.push(clientID);
          if (!equalityDeep(prevState, state)) {
            filteredUpdated.push(clientID);
          }
        }
        if (added.length > 0 || filteredUpdated.length > 0 || removed.length > 0) {
          this.emit('change', [{ added, updated: filteredUpdated, removed }, 'local']);
        }
        this.emit('update', [{ added, updated, removed }, 'local']);
      }

      /**
       * @param {string} field
       * @param {any} value
       */
      setLocalStateField (field, value) {
        const state = this.getLocalState();
        if (state !== null) {
          this.setLocalState({
            ...state,
            [field]: value
          });
        }
      }

      /**
       * @return {Map<number,Object<string,any>>}
       */
      getStates () {
        return this.states
      }
    }

    /**
     * Mark (remote) clients as inactive and remove them from the list of active peers.
     * This change will be propagated to remote clients.
     *
     * @param {Awareness} awareness
     * @param {Array<number>} clients
     * @param {any} origin
     */
    const removeAwarenessStates = (awareness, clients, origin) => {
      const removed = [];
      for (let i = 0; i < clients.length; i++) {
        const clientID = clients[i];
        if (awareness.states.has(clientID)) {
          awareness.states.delete(clientID);
          if (clientID === awareness.clientID) {
            const curMeta = /** @type {MetaClientState} */ (awareness.meta.get(clientID));
            awareness.meta.set(clientID, {
              clock: curMeta.clock + 1,
              lastUpdated: getUnixTime()
            });
          }
          removed.push(clientID);
        }
      }
      if (removed.length > 0) {
        awareness.emit('change', [{ added: [], updated: [], removed }, origin]);
        awareness.emit('update', [{ added: [], updated: [], removed }, origin]);
      }
    };

    /**
     * @param {Awareness} awareness
     * @param {Array<number>} clients
     * @return {Uint8Array}
     */
    const encodeAwarenessUpdate = (awareness, clients, states = awareness.states) => {
      const len = clients.length;
      const encoder = createEncoder();
      writeVarUint(encoder, len);
      for (let i = 0; i < len; i++) {
        const clientID = clients[i];
        const state = states.get(clientID) || null;
        const clock = /** @type {MetaClientState} */ (awareness.meta.get(clientID)).clock;
        writeVarUint(encoder, clientID);
        writeVarUint(encoder, clock);
        writeVarString(encoder, JSON.stringify(state));
      }
      return toUint8Array(encoder)
    };

    /**
     * @param {Awareness} awareness
     * @param {Uint8Array} update
     * @param {any} origin This will be added to the emitted change event
     */
    const applyAwarenessUpdate = (awareness, update, origin) => {
      const decoder = createDecoder(update);
      const timestamp = getUnixTime();
      const added = [];
      const updated = [];
      const filteredUpdated = [];
      const removed = [];
      const len = readVarUint(decoder);
      for (let i = 0; i < len; i++) {
        const clientID = readVarUint(decoder);
        let clock = readVarUint(decoder);
        const state = JSON.parse(readVarString(decoder));
        const clientMeta = awareness.meta.get(clientID);
        const prevState = awareness.states.get(clientID);
        const currClock = clientMeta === undefined ? 0 : clientMeta.clock;
        if (currClock < clock || (currClock === clock && state === null && awareness.states.has(clientID))) {
          if (state === null) {
            // never let a remote client remove this local state
            if (clientID === awareness.clientID && awareness.getLocalState() != null) {
              // remote client removed the local state. Do not remote state. Broadcast a message indicating
              // that this client still exists by increasing the clock
              clock++;
            } else {
              awareness.states.delete(clientID);
            }
          } else {
            awareness.states.set(clientID, state);
          }
          awareness.meta.set(clientID, {
            clock,
            lastUpdated: timestamp
          });
          if (clientMeta === undefined && state !== null) {
            added.push(clientID);
          } else if (clientMeta !== undefined && state === null) {
            removed.push(clientID);
          } else if (state !== null) {
            if (!equalityDeep(state, prevState)) {
              filteredUpdated.push(clientID);
            }
            updated.push(clientID);
          }
        }
      }
      if (added.length > 0 || filteredUpdated.length > 0 || removed.length > 0) {
        awareness.emit('change', [{
          added, updated: filteredUpdated, removed
        }, origin]);
      }
      if (added.length > 0 || updated.length > 0 || removed.length > 0) {
        awareness.emit('update', [{
          added, updated, removed
        }, origin]);
      }
    };

    const wm = new WeakMap();
    /** A property (package-private) on Y.Doc that is used
     * to signal that the server wants us to send a 'doc-open' message
     * to the server for this document.
     *
     * @param doc
     * @returns
     */
    function getOpenDocSignal(doc) {
        let signal = wm.get(doc);
        if (!signal) {
            signal = new rxjs.Subject();
            wm.set(doc, signal);
        }
        return signal;
    }

    const SERVER_PING_TIMEOUT = 20000;
    const CLIENT_PING_INTERVAL = 30000;
    const FAIL_RETRY_WAIT_TIME = 60000;
    class WSObservable extends rxjs.Observable {
        constructor(db, rev, yrev, realmSetHash, clientIdentity, messageProducer, webSocketStatus, user) {
            super((subscriber) => new WSConnection(db, rev, yrev, realmSetHash, clientIdentity, user, subscriber, messageProducer, webSocketStatus));
        }
    }
    let counter = 0;
    class WSConnection extends rxjs.Subscription {
        constructor(db, rev, yrev, realmSetHash, clientIdentity, user, subscriber, messageProducer, webSocketStatus) {
            super(() => this.teardown());
            this.id = ++counter;
            this.subscriptions = new Set();
            this.reconnecting = false;
            console.debug('New WebSocket Connection', this.id, user.accessToken ? 'authorized' : 'unauthorized');
            this.db = db;
            this.databaseUrl = db.cloud.options.databaseUrl;
            this.rev = rev;
            this.yrev = yrev;
            this.realmSetHash = realmSetHash;
            this.clientIdentity = clientIdentity;
            this.user = user;
            this.subscriber = subscriber;
            this.lastUserActivity = new Date();
            this.messageProducer = messageProducer;
            this.webSocketStatus = webSocketStatus;
            this.connect();
        }
        teardown() {
            console.debug('Teardown WebSocket Connection', this.id);
            this.disconnect();
        }
        disconnect() {
            this.webSocketStatus.next('disconnected');
            if (this.pinger) {
                clearInterval(this.pinger);
                this.pinger = null;
            }
            if (this.ws) {
                try {
                    this.ws.close();
                }
                catch (_a) { }
            }
            this.ws = null;
            for (const sub of this.subscriptions) {
                sub.unsubscribe();
            }
            this.subscriptions.clear();
        }
        reconnect() {
            if (this.reconnecting)
                return;
            this.reconnecting = true;
            try {
                this.disconnect();
            }
            catch (_a) { }
            this.connect()
                .catch(() => { })
                .then(() => (this.reconnecting = false)); // finally()
        }
        connect() {
            return __awaiter(this, void 0, void 0, function* () {
                this.lastServerActivity = new Date();
                if (this.pauseUntil && this.pauseUntil > new Date()) {
                    console.debug('WS not reconnecting just yet', {
                        id: this.id,
                        pauseUntil: this.pauseUntil,
                    });
                    return;
                }
                if (this.ws) {
                    throw new Error(`Called connect() when a connection is already open`);
                }
                if (!this.databaseUrl)
                    throw new Error(`Cannot connect without a database URL`);
                if (this.closed) {
                    //console.debug('SyncStatus: DUBB: Ooops it was closed!');
                    return;
                }
                const tokenExpiration = this.user.accessTokenExpiration;
                if (tokenExpiration && tokenExpiration < new Date()) {
                    this.subscriber.error(new TokenExpiredError()); // Will be handled in connectWebSocket.ts.
                    return;
                }
                this.webSocketStatus.next('connecting');
                this.pinger = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                    // setInterval here causes unnecessary pings when server is proved active anyway.
                    // TODO: Use setTimout() here instead. When triggered, check if we really need to ping.
                    // In case we've had server activity, we don't need to ping. Then schedule then next ping
                    // to the time when we should ping next time (based on lastServerActivity + CLIENT_PING_INTERVAL).
                    // Else, ping now and schedule next ping to CLIENT_PING_INTERVAL from now.
                    if (this.closed) {
                        console.debug('pinger check', this.id, 'CLOSED.');
                        this.teardown();
                        return;
                    }
                    if (this.ws) {
                        try {
                            this.ws.send(JSON.stringify({ type: 'ping' }));
                            setTimeout(() => {
                                console.debug('pinger setTimeout', this.id, this.pinger ? `alive` : 'dead');
                                if (!this.pinger)
                                    return;
                                if (this.closed) {
                                    console.debug('pinger setTimeout', this.id, 'subscription is closed');
                                    this.teardown();
                                    return;
                                }
                                if (this.lastServerActivity <
                                    new Date(Date.now() - SERVER_PING_TIMEOUT)) {
                                    // Server inactive. Reconnect if user is active.
                                    console.debug('pinger: server is inactive');
                                    console.debug('pinger reconnecting');
                                    this.reconnect();
                                }
                                else {
                                    console.debug('pinger: server still active');
                                }
                            }, SERVER_PING_TIMEOUT);
                        }
                        catch (_a) {
                            console.debug('pinger catch error', this.id, 'reconnecting');
                            this.reconnect();
                        }
                    }
                    else {
                        console.debug('pinger', this.id, 'reconnecting');
                        this.reconnect();
                    }
                }), CLIENT_PING_INTERVAL);
                // The following vars are needed because we must know which callback to ack when server sends it's ack to us.
                const wsUrl = new URL(this.databaseUrl);
                wsUrl.protocol = wsUrl.protocol === 'http:' ? 'ws' : 'wss';
                const searchParams = new URLSearchParams();
                if (this.subscriber.closed)
                    return;
                searchParams.set('v', '2');
                if (this.rev)
                    searchParams.set('rev', this.rev);
                if (this.yrev)
                    searchParams.set('yrev', this.yrev);
                searchParams.set('realmsHash', this.realmSetHash);
                searchParams.set('clientId', this.clientIdentity);
                searchParams.set('dxcv', this.db.cloud.version);
                if (this.user.accessToken) {
                    searchParams.set('token', this.user.accessToken);
                }
                // Connect the WebSocket to given url:
                console.debug('dexie-cloud WebSocket create');
                const ws = (this.ws = new WebSocket(`${wsUrl}/changes?${searchParams}`));
                ws.binaryType = "arraybuffer";
                ws.onclose = (event) => {
                    if (!this.pinger)
                        return;
                    console.debug('dexie-cloud WebSocket onclosed', this.id);
                    this.reconnect();
                };
                ws.onmessage = (event) => {
                    if (!this.pinger)
                        return;
                    this.lastServerActivity = new Date();
                    try {
                        const msg = typeof event.data === 'string'
                            ? TSON.parse(event.data)
                            : decodeYMessage(new Uint8Array(event.data));
                        console.debug('dexie-cloud WebSocket onmessage', msg.type, msg);
                        if (msg.type === 'error') {
                            throw new Error(`Error message from dexie-cloud: ${msg.error}`);
                        }
                        else if (msg.type === 'aware') {
                            const docCache = DexieYProvider.getDocCache(this.db.dx);
                            const doc = docCache.find(msg.table, msg.k, msg.prop);
                            if (doc) {
                                const awareness = getDocAwareness(doc);
                                if (awareness) {
                                    applyAwarenessUpdate(awareness, msg.u, 'server');
                                }
                            }
                        }
                        else if (msg.type === 'pong') {
                            // Do nothing
                        }
                        else if (msg.type === 'doc-open') {
                            const docCache = DexieYProvider.getDocCache(this.db.dx);
                            const doc = docCache.find(msg.table, msg.k, msg.prop);
                            if (doc) {
                                getOpenDocSignal(doc).next(); // Make yHandler reopen the document on server.
                            }
                        }
                        else if (msg.type === 'u-ack' || msg.type === 'u-reject' || msg.type === 'u-s' || msg.type === 'in-sync' || msg.type === 'outdated-server-rev' || msg.type === 'y-complete-sync-done') {
                            applyYServerMessages([msg], this.db).then((_a) => __awaiter(this, [_a], void 0, function* ({ resyncNeeded, yServerRevision, receivedUntils }) {
                                if (yServerRevision) {
                                    yield this.db.$syncState.update('syncState', { yServerRevision: yServerRevision });
                                }
                                if (msg.type === 'u-s' && receivedUntils) {
                                    const utbl = getUpdatesTable(this.db, msg.table, msg.prop);
                                    if (utbl) {
                                        const receivedUntil = receivedUntils[utbl.name];
                                        if (receivedUntil) {
                                            yield utbl.update(DEXIE_CLOUD_SYNCER_ID, { receivedUntil });
                                        }
                                    }
                                }
                                if (resyncNeeded) {
                                    yield this.db.cloud.sync({ purpose: 'pull', wait: true });
                                }
                            }));
                        }
                        else {
                            // Forward the request to our subscriber, wich is in messageFromServerQueue.ts (via connectWebSocket's subscribe() at the end!)
                            this.subscriber.next(msg);
                        }
                    }
                    catch (e) {
                        this.subscriber.error(e);
                    }
                };
                try {
                    let everConnected = false;
                    yield new Promise((resolve, reject) => {
                        ws.onopen = (event) => {
                            console.debug('dexie-cloud WebSocket onopen');
                            everConnected = true;
                            resolve(null);
                        };
                        ws.onerror = (event) => {
                            if (!everConnected) {
                                const error = event.error || new Error('WebSocket Error');
                                this.subscriber.error(error);
                                this.webSocketStatus.next('error');
                                reject(error);
                            }
                            else {
                                this.reconnect();
                            }
                        };
                    });
                    this.subscriptions.add(this.messageProducer.subscribe((msg) => {
                        var _a, _b;
                        if (!this.closed) {
                            if (msg.type === 'ready' &&
                                this.webSocketStatus.value !== 'connected') {
                                this.webSocketStatus.next('connected');
                            }
                            console.debug('dexie-cloud WebSocket send', msg.type, msg);
                            if (msg.type === 'ready') {
                                // Ok, we are certain to have stored everything up until revision msg.rev.
                                // Update this.rev in case of reconnect - remember where we were and don't just start over!
                                this.rev = msg.rev;
                                // ... and then send along the request to the server so it would also be updated!
                                (_a = this.ws) === null || _a === void 0 ? void 0 : _a.send(TSON.stringify(msg));
                            }
                            else {
                                // If it's not a "ready" message, it's an YMessage.
                                // YMessages can be sent binary encoded.
                                (_b = this.ws) === null || _b === void 0 ? void 0 : _b.send(encodeYMessage(msg));
                            }
                        }
                    }));
                    if (this.user.isLoggedIn && !isEagerSyncDisabled(this.db)) {
                        this.subscriptions.add(createYClientUpdateObservable(this.db).subscribe(this.db.messageProducer));
                    }
                }
                catch (error) {
                    this.pauseUntil = new Date(Date.now() + FAIL_RETRY_WAIT_TIME);
                }
            });
        }
    }

    class InvalidLicenseError extends Error {
        constructor(license) {
            super(license === 'expired'
                ? `License expired`
                : license === 'deactivated'
                    ? `User deactivated`
                    : 'Invalid license');
            this.name = 'InvalidLicenseError';
            if (license) {
                this.license = license;
            }
        }
    }

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    function waitAndReconnectWhenUserDoesSomething(error) {
        return __awaiter(this, void 0, void 0, function* () {
            console.error(`WebSocket observable: error but revive when user does some active thing...`, error);
            // Sleep some seconds...
            yield sleep(3000);
            // Wait til user does something (move mouse, tap, scroll, click etc)
            console.debug('waiting for someone to do something');
            yield rxjs.firstValueFrom(userDoesSomething);
            console.debug('someone did something!');
        });
    }
    function connectWebSocket(db) {
        var _a;
        if (!((_a = db.cloud.options) === null || _a === void 0 ? void 0 : _a.databaseUrl)) {
            throw new Error(`No database URL to connect WebSocket to`);
        }
        const readyForChangesMessage = db.messageConsumer.readyToServe.pipe(operators.filter((isReady) => isReady), // When consumer is ready for new messages, produce such a message to inform server about it
        operators.switchMap(() => db.getPersistedSyncState()), // We need the info on which server revision we are at:
        operators.filter((syncState) => syncState && syncState.serverRevision), // We wont send anything to server before inital sync has taken place
        operators.switchMap((syncState) => __awaiter(this, void 0, void 0, function* () {
            return ({
                // Produce the message to trigger server to send us new messages to consume:
                type: 'ready',
                rev: syncState.serverRevision,
                realmSetHash: yield computeRealmSetHash(syncState)
            });
        })));
        const messageProducer = rxjs.merge(readyForChangesMessage, db.messageProducer);
        function createObservable() {
            return db.cloud.persistedSyncState.pipe(operators.filter((syncState) => syncState === null || syncState === void 0 ? void 0 : syncState.serverRevision), // Don't connect before there's no initial sync performed.
            operators.take(1), // Don't continue waking up whenever syncState change
            operators.switchMap((syncState) => db.cloud.currentUser.pipe(operators.map((userLogin) => [userLogin, syncState]))), operators.switchMap(([userLogin, syncState]) => {
                /*if (userLogin.license?.status && userLogin.license.status !== 'ok') {
                  throw new InvalidLicenseError();
                }*/
                return userIsReallyActive.pipe(operators.map((isActive) => [isActive ? userLogin : null, syncState]));
            }), operators.switchMap(([userLogin, syncState]) => {
                if ((userLogin === null || userLogin === void 0 ? void 0 : userLogin.isLoggedIn) && !(syncState === null || syncState === void 0 ? void 0 : syncState.realms.includes(userLogin.userId))) {
                    // We're in an in-between state when user is logged in but the user's realms are not yet synced.
                    // Don't make this change reconnect the websocket just yet. Wait till syncState is updated
                    // to iclude the user's realm.
                    return db.cloud.persistedSyncState.pipe(operators.filter((syncState) => (syncState === null || syncState === void 0 ? void 0 : syncState.realms.includes(userLogin.userId)) || false), operators.take(1), operators.map((syncState) => [userLogin, syncState]));
                }
                return new rxjs.BehaviorSubject([userLogin, syncState]);
            }), operators.switchMap((_a) => __awaiter(this, [_a], void 0, function* ([userLogin, syncState]) { return [userLogin, yield computeRealmSetHash(syncState)]; })), operators.distinctUntilChanged(([prevUser, prevHash], [currUser, currHash]) => prevUser === currUser && prevHash === currHash), operators.switchMap(([userLogin, realmSetHash]) => {
                var _a;
                if (!((_a = db.cloud.persistedSyncState) === null || _a === void 0 ? void 0 : _a.value)) {
                    // Restart the flow if persistedSyncState is not yet available.
                    return createObservable();
                }
                // Let server end query changes from last entry of same client-ID and forward.
                // If no new entries, server won't bother the client. If new entries, server sends only those
                // and the baseRev of the last from same client-ID.
                if (userLogin) {
                    return new WSObservable(db, db.cloud.persistedSyncState.value.serverRevision, db.cloud.persistedSyncState.value.yServerRevision, realmSetHash, db.cloud.persistedSyncState.value.clientIdentity, messageProducer, db.cloud.webSocketStatus, userLogin);
                }
                else {
                    return rxjs.from([]);
                }
            }), operators.catchError((error) => {
                if ((error === null || error === void 0 ? void 0 : error.name) === 'TokenExpiredError') {
                    console.debug('WebSocket observable: Token expired. Refreshing token...');
                    return rxjs.of(true).pipe(operators.switchMap(() => __awaiter(this, void 0, void 0, function* () {
                        // Refresh access token
                        const user = yield db.getCurrentUser();
                        const refreshedLogin = yield refreshAccessToken(db.cloud.options.databaseUrl, user);
                        // Persist updated access token
                        yield db.table('$logins').update(user.userId, {
                            accessToken: refreshedLogin.accessToken,
                            accessTokenExpiration: refreshedLogin.accessTokenExpiration,
                            claims: refreshedLogin.claims,
                            license: refreshedLogin.license,
                            data: refreshedLogin.data
                        });
                    })), operators.switchMap(() => createObservable()));
                }
                else {
                    return rxjs.throwError(() => error);
                }
            }), operators.catchError((error) => {
                db.cloud.webSocketStatus.next("error");
                if (error instanceof InvalidLicenseError) {
                    // Don't retry. Just throw and don't try connect again.
                    return rxjs.throwError(() => error);
                }
                return rxjs.from(waitAndReconnectWhenUserDoesSomething(error)).pipe(operators.switchMap(() => createObservable()));
            }));
        }
        return createObservable().subscribe({
            next: (msg) => {
                if (msg) {
                    console.debug('WS got message', msg);
                    db.messageConsumer.enqueue(msg);
                }
            },
            error: (error) => {
                console.error('WS got error', error);
            },
            complete: () => {
                console.debug('WS observable completed');
            },
        });
    }

    function isSyncNeeded(db) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            return ((_a = db.cloud.options) === null || _a === void 0 ? void 0 : _a.databaseUrl) && db.cloud.schema
                ? yield sync(db, db.cloud.options, db.cloud.schema, { justCheckIfNeeded: true })
                : false;
        });
    }

    const ongoingSyncs = new WeakMap();
    function syncIfPossible(db, cloudOptions, cloudSchema, options) {
        const ongoing = ongoingSyncs.get(db);
        if (ongoing) {
            if (ongoing.pull || (options === null || options === void 0 ? void 0 : options.purpose) === 'push') {
                console.debug('syncIfPossible(): returning the ongoing sync promise.');
                return ongoing.promise;
            }
            else {
                // Ongoing sync may never do anything in case there are no outstanding changes
                // to sync (because its purpose was "push" not "pull")
                // Now, however, we are asked to do a sync with the purpose of "pull"
                // We want to optimize here. We must wait for the ongoing to complete
                // and then, if the ongoing sync never resulted in a sync request,
                // we must redo the sync.
                // To inspect what is happening in the ongoing request, let's subscribe
                // to db.cloud.syncState and look for if it is doing any "pulling" phase:
                let hasPullTakenPlace = false;
                const subscription = db.cloud.syncState.subscribe((syncState) => {
                    if (syncState.phase === 'pulling') {
                        hasPullTakenPlace = true;
                    }
                });
                // Ok, so now we are watching. At the same time, wait for the ongoing to complete
                // and when it has completed, check if we're all set or if we need to redo
                // the call:
                return (ongoing.promise
                    // This is a finally block but we are still running tests on
                    // browsers that don't support it, so need to do it like this:
                    .then(() => {
                    subscription.unsubscribe();
                })
                    .catch((error) => {
                    subscription.unsubscribe();
                    return Promise.reject(error);
                })
                    .then(() => {
                    if (!hasPullTakenPlace) {
                        // No pull took place in the ongoing sync but the caller had "pull" as
                        // an explicit purpose of this call - so we need to redo the call!
                        return syncIfPossible(db, cloudOptions, cloudSchema, options);
                    }
                }));
            }
        }
        const promise = _syncIfPossible();
        ongoingSyncs.set(db, { promise, pull: (options === null || options === void 0 ? void 0 : options.purpose) !== 'push' });
        return promise;
        function _syncIfPossible() {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    // Check if should delay sync due to ratelimit:
                    yield checkSyncRateLimitDelay(db);
                    yield performGuardedJob(db, CURRENT_SYNC_WORKER, () => sync(db, cloudOptions, cloudSchema, options));
                    ongoingSyncs.delete(db);
                    console.debug('Done sync');
                }
                catch (error) {
                    ongoingSyncs.delete(db);
                    console.error(`Failed to sync client changes`, error);
                    throw error; // Make sure we rethrow error so that sync event is retried.
                    // I don't think we should setTimout or so here.
                    // Unless server tells us to in some response.
                    // Then we could follow that advice but not by waiting here but by registering
                    // Something that triggers an event listened to in startPushWorker()
                }
            });
        }
    }

    const SECONDS = 1000;

    function LocalSyncWorker(db, cloudOptions, cloudSchema) {
        let localSyncEventSubscription = null;
        let cancelToken = { cancelled: false };
        let nextRetryTime = 0;
        let syncStartTime = 0;
        function syncAndRetry(retryNum = 1) {
            // Use setTimeout() to get onto a clean stack and
            // break free from possible active transaction:
            setTimeout(() => {
                const purpose = pullSignalled ? 'pull' : 'push';
                syncStartTime = Date.now();
                syncIfPossible(db, cloudOptions, cloudSchema, {
                    cancelToken,
                    retryImmediatelyOnFetchError: true, // workaround for "net::ERR_NETWORK_CHANGED" in chrome.
                    purpose,
                }).then(() => {
                    if (cancelToken.cancelled) {
                        stop();
                    }
                    else {
                        if (pullSignalled || pushSignalled) {
                            // If we have signalled for more sync, do it now.
                            pullSignalled = false;
                            pushSignalled = false;
                            return syncAndRetry();
                        }
                    }
                    ongoingSync = false;
                    nextRetryTime = 0;
                    syncStartTime = 0;
                }).catch((error) => {
                    console.error('error in syncIfPossible()', error);
                    if (cancelToken.cancelled) {
                        stop();
                        ongoingSync = false;
                        nextRetryTime = 0;
                        syncStartTime = 0;
                    }
                    else if (retryNum < 5) {
                        // Mimic service worker sync event but a bit more eager: retry 4 times
                        // * first retry after 20 seconds
                        // * second retry 40 seconds later
                        // * third retry 5 minutes later
                        // * last retry 15 minutes later
                        const retryIn = [0, 20, 40, 300, 900][retryNum] * SECONDS;
                        nextRetryTime = Date.now() + retryIn;
                        syncStartTime = 0;
                        setTimeout(() => syncAndRetry(retryNum + 1), retryIn);
                    }
                    else {
                        ongoingSync = false;
                        nextRetryTime = 0;
                        syncStartTime = 0;
                    }
                });
            }, 0);
        }
        let pullSignalled = false;
        let pushSignalled = false;
        let ongoingSync = false;
        const consumer = (purpose) => {
            if (cancelToken.cancelled)
                return;
            if (purpose === 'pull') {
                pullSignalled = true;
            }
            if (purpose === 'push') {
                pushSignalled = true;
            }
            if (ongoingSync) {
                if (nextRetryTime) {
                    console.debug(`Sync is paused until ${new Date(nextRetryTime).toISOString()} due to error in last sync attempt`);
                }
                else if (syncStartTime > 0 && Date.now() - syncStartTime > 20 * SECONDS) {
                    console.debug(`An existing sync operation is taking more than 20 seconds. Will resync when done.`);
                }
                return;
            }
            ongoingSync = true;
            syncAndRetry();
        };
        const start = () => {
            // Sync eagerly whenever a change has happened (+ initially when there's no syncState yet)
            // This initial subscribe will also trigger an sync also now.
            console.debug('Starting LocalSyncWorker', db.localSyncEvent['id']);
            localSyncEventSubscription = db.localSyncEvent.subscribe(({ purpose }) => {
                consumer(purpose || 'pull');
            });
        };
        const stop = () => {
            console.debug('Stopping LocalSyncWorker');
            cancelToken.cancelled = true;
            if (localSyncEventSubscription)
                localSyncEventSubscription.unsubscribe();
        };
        return {
            start,
            stop,
        };
    }

    function updateSchemaFromOptions(schema, options) {
        if (schema && options) {
            if (options.unsyncedTables) {
                for (const tableName of options.unsyncedTables) {
                    if (schema[tableName]) {
                        schema[tableName].markedForSync = false;
                    }
                }
            }
        }
    }

    function verifySchema(db) {
        var _a, _b;
        for (const table of db.tables) {
            if ((_b = (_a = db.cloud.schema) === null || _a === void 0 ? void 0 : _a[table.name]) === null || _b === void 0 ? void 0 : _b.markedForSync) {
                if (table.schema.primKey.auto) {
                    throw new Dexie.SchemaError(`Table ${table.name} is both autoIncremented and synced. ` +
                        `Use db.cloud.configure({unsyncedTables: [${JSON.stringify(table.name)}]}) to blacklist it from sync`);
                }
                if (!table.schema.primKey.keyPath) {
                    throw new Dexie.SchemaError(`Table ${table.name} cannot be both synced and outbound. ` +
                        `Use db.cloud.configure({unsyncedTables: [${JSON.stringify(table.name)}]}) to blacklist it from sync`);
                }
            }
        }
    }

    var n,l$1,u$1,i$1,r$1,o$1,e$1,f$1,c$1,s$1,a$1,p$1={},v$1=[],y=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,w$1=Array.isArray;function d$1(n,l){for(var u in l)n[u]=l[u];return n}function g(n){n&&n.parentNode&&n.parentNode.removeChild(n);}function _$1(l,u,t){var i,r,o,e={};for(o in u)"key"==o?i=u[o]:"ref"==o?r=u[o]:e[o]=u[o];if(arguments.length>2&&(e.children=arguments.length>3?n.call(arguments,2):t),"function"==typeof l&&null!=l.defaultProps)for(o in l.defaultProps) void 0===e[o]&&(e[o]=l.defaultProps[o]);return m$1(l,e,i,r,null)}function m$1(n,t,i,r,o){var e={type:n,props:t,key:i,ref:r,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:null==o?++u$1:o,__i:-1,__u:0};return null==o&&null!=l$1.vnode&&l$1.vnode(e),e}function k$1(n){return n.children}function x(n,l){this.props=n,this.context=l;}function S(n,l){if(null==l)return n.__?S(n.__,n.__i+1):null;for(var u;l<n.__k.length;l++)if(null!=(u=n.__k[l])&&null!=u.__e)return u.__e;return "function"==typeof n.type?S(n):null}function C$1(n){var l,u;if(null!=(n=n.__)&&null!=n.__c){for(n.__e=n.__c.base=null,l=0;l<n.__k.length;l++)if(null!=(u=n.__k[l])&&null!=u.__e){n.__e=n.__c.base=u.__e;break}return C$1(n)}}function M(n){(!n.__d&&(n.__d=true)&&i$1.push(n)&&!$.__r++||r$1!=l$1.debounceRendering)&&((r$1=l$1.debounceRendering)||o$1)($);}function $(){for(var n,u,t,r,o,f,c,s=1;i$1.length;)i$1.length>s&&i$1.sort(e$1),n=i$1.shift(),s=i$1.length,n.__d&&(t=void 0,r=void 0,o=(r=(u=n).__v).__e,f=[],c=[],u.__P&&((t=d$1({},r)).__v=r.__v+1,l$1.vnode&&l$1.vnode(t),O(u.__P,t,r,u.__n,u.__P.namespaceURI,32&r.__u?[o]:null,f,null==o?S(r):o,!!(32&r.__u),c),t.__v=r.__v,t.__.__k[t.__i]=t,N(f,t,c),r.__e=r.__=null,t.__e!=o&&C$1(t)));$.__r=0;}function I(n,l,u,t,i,r,o,e,f,c,s){var a,h,y,w,d,g,_,m=t&&t.__k||v$1,b=l.length;for(f=P(u,l,m,f,b),a=0;a<b;a++)null!=(y=u.__k[a])&&(h=-1==y.__i?p$1:m[y.__i]||p$1,y.__i=a,g=O(n,y,h,i,r,o,e,f,c,s),w=y.__e,y.ref&&h.ref!=y.ref&&(h.ref&&B$1(h.ref,null,y),s.push(y.ref,y.__c||w,y)),null==d&&null!=w&&(d=w),(_=!!(4&y.__u))||h.__k===y.__k?f=A$1(y,f,n,_):"function"==typeof y.type&&void 0!==g?f=g:w&&(f=w.nextSibling),y.__u&=-7);return u.__e=d,f}function P(n,l,u,t,i){var r,o,e,f,c,s=u.length,a=s,h=0;for(n.__k=new Array(i),r=0;r<i;r++)null!=(o=l[r])&&"boolean"!=typeof o&&"function"!=typeof o?("string"==typeof o||"number"==typeof o||"bigint"==typeof o||o.constructor==String?o=n.__k[r]=m$1(null,o,null,null,null):w$1(o)?o=n.__k[r]=m$1(k$1,{children:o},null,null,null):null==o.constructor&&o.__b>0?o=n.__k[r]=m$1(o.type,o.props,o.key,o.ref?o.ref:null,o.__v):n.__k[r]=o,f=r+h,o.__=n,o.__b=n.__b+1,-1!=(c=o.__i=L(o,u,f,a))&&(a--,(e=u[c])&&(e.__u|=2)),null==e||null==e.__v?(-1==c&&(i>s?h--:i<s&&h++),"function"!=typeof o.type&&(o.__u|=4)):c!=f&&(c==f-1?h--:c==f+1?h++:(c>f?h--:h++,o.__u|=4))):n.__k[r]=null;if(a)for(r=0;r<s;r++)null!=(e=u[r])&&0==(2&e.__u)&&(e.__e==t&&(t=S(e)),D$1(e,e));return t}function A$1(n,l,u,t){var i,r;if("function"==typeof n.type){for(i=n.__k,r=0;i&&r<i.length;r++)i[r]&&(i[r].__=n,l=A$1(i[r],l,u,t));return l}n.__e!=l&&(t&&(l&&n.type&&!l.parentNode&&(l=S(n)),u.insertBefore(n.__e,l||null)),l=n.__e);do{l=l&&l.nextSibling;}while(null!=l&&8==l.nodeType);return l}function L(n,l,u,t){var i,r,o,e=n.key,f=n.type,c=l[u],s=null!=c&&0==(2&c.__u);if(null===c&&null==e||s&&e==c.key&&f==c.type)return u;if(t>(s?1:0))for(i=u-1,r=u+1;i>=0||r<l.length;)if(null!=(c=l[o=i>=0?i--:r++])&&0==(2&c.__u)&&e==c.key&&f==c.type)return o;return  -1}function T$1(n,l,u){"-"==l[0]?n.setProperty(l,null==u?"":u):n[l]=null==u?"":"number"!=typeof u||y.test(l)?u:u+"px";}function j$1(n,l,u,t,i){var r,o;n:if("style"==l)if("string"==typeof u)n.style.cssText=u;else {if("string"==typeof t&&(n.style.cssText=t=""),t)for(l in t)u&&l in u||T$1(n.style,l,"");if(u)for(l in u)t&&u[l]==t[l]||T$1(n.style,l,u[l]);}else if("o"==l[0]&&"n"==l[1])r=l!=(l=l.replace(f$1,"$1")),o=l.toLowerCase(),l=o in n||"onFocusOut"==l||"onFocusIn"==l?o.slice(2):l.slice(2),n.l||(n.l={}),n.l[l+r]=u,u?t?u.u=t.u:(u.u=c$1,n.addEventListener(l,r?a$1:s$1,r)):n.removeEventListener(l,r?a$1:s$1,r);else {if("http://www.w3.org/2000/svg"==i)l=l.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if("width"!=l&&"height"!=l&&"href"!=l&&"list"!=l&&"form"!=l&&"tabIndex"!=l&&"download"!=l&&"rowSpan"!=l&&"colSpan"!=l&&"role"!=l&&"popover"!=l&&l in n)try{n[l]=null==u?"":u;break n}catch(n){}"function"==typeof u||(null==u||false===u&&"-"!=l[4]?n.removeAttribute(l):n.setAttribute(l,"popover"==l&&1==u?"":u));}}function F(n){return function(u){if(this.l){var t=this.l[u.type+n];if(null==u.t)u.t=c$1++;else if(u.t<t.u)return;return t(l$1.event?l$1.event(u):u)}}}function O(n,u,t,i,r,o,e,f,c,s){var a,h,p,v,y,_,m,b,S,C,M,$,P,A,H,L,T,j=u.type;if(null!=u.constructor)return null;128&t.__u&&(c=!!(32&t.__u),o=[f=u.__e=t.__e]),(a=l$1.__b)&&a(u);n:if("function"==typeof j)try{if(b=u.props,S="prototype"in j&&j.prototype.render,C=(a=j.contextType)&&i[a.__c],M=a?C?C.props.value:a.__:i,t.__c?m=(h=u.__c=t.__c).__=h.__E:(S?u.__c=h=new j(b,M):(u.__c=h=new x(b,M),h.constructor=j,h.render=E),C&&C.sub(h),h.state||(h.state={}),h.__n=i,p=h.__d=!0,h.__h=[],h._sb=[]),S&&null==h.__s&&(h.__s=h.state),S&&null!=j.getDerivedStateFromProps&&(h.__s==h.state&&(h.__s=d$1({},h.__s)),d$1(h.__s,j.getDerivedStateFromProps(b,h.__s))),v=h.props,y=h.state,h.__v=u,p)S&&null==j.getDerivedStateFromProps&&null!=h.componentWillMount&&h.componentWillMount(),S&&null!=h.componentDidMount&&h.__h.push(h.componentDidMount);else {if(S&&null==j.getDerivedStateFromProps&&b!==v&&null!=h.componentWillReceiveProps&&h.componentWillReceiveProps(b,M),u.__v==t.__v||!h.__e&&null!=h.shouldComponentUpdate&&!1===h.shouldComponentUpdate(b,h.__s,M)){for(u.__v!=t.__v&&(h.props=b,h.state=h.__s,h.__d=!1),u.__e=t.__e,u.__k=t.__k,u.__k.some(function(n){n&&(n.__=u);}),$=0;$<h._sb.length;$++)h.__h.push(h._sb[$]);h._sb=[],h.__h.length&&e.push(h);break n}null!=h.componentWillUpdate&&h.componentWillUpdate(b,h.__s,M),S&&null!=h.componentDidUpdate&&h.__h.push(function(){h.componentDidUpdate(v,y,_);});}if(h.context=M,h.props=b,h.__P=n,h.__e=!1,P=l$1.__r,A=0,S){for(h.state=h.__s,h.__d=!1,P&&P(u),a=h.render(h.props,h.state,h.context),H=0;H<h._sb.length;H++)h.__h.push(h._sb[H]);h._sb=[];}else do{h.__d=!1,P&&P(u),a=h.render(h.props,h.state,h.context),h.state=h.__s;}while(h.__d&&++A<25);h.state=h.__s,null!=h.getChildContext&&(i=d$1(d$1({},i),h.getChildContext())),S&&!p&&null!=h.getSnapshotBeforeUpdate&&(_=h.getSnapshotBeforeUpdate(v,y)),L=a,null!=a&&a.type===k$1&&null==a.key&&(L=V(a.props.children)),f=I(n,w$1(L)?L:[L],u,t,i,r,o,e,f,c,s),h.base=u.__e,u.__u&=-161,h.__h.length&&e.push(h),m&&(h.__E=h.__=null);}catch(n){if(u.__v=null,c||null!=o)if(n.then){for(u.__u|=c?160:128;f&&8==f.nodeType&&f.nextSibling;)f=f.nextSibling;o[o.indexOf(f)]=null,u.__e=f;}else {for(T=o.length;T--;)g(o[T]);z$1(u);}else u.__e=t.__e,u.__k=t.__k,n.then||z$1(u);l$1.__e(n,u,t);}else null==o&&u.__v==t.__v?(u.__k=t.__k,u.__e=t.__e):f=u.__e=q(t.__e,u,t,i,r,o,e,c,s);return (a=l$1.diffed)&&a(u),128&u.__u?void 0:f}function z$1(n){n&&n.__c&&(n.__c.__e=true),n&&n.__k&&n.__k.forEach(z$1);}function N(n,u,t){for(var i=0;i<t.length;i++)B$1(t[i],t[++i],t[++i]);l$1.__c&&l$1.__c(u,n),n.some(function(u){try{n=u.__h,u.__h=[],n.some(function(n){n.call(u);});}catch(n){l$1.__e(n,u.__v);}});}function V(n){return "object"!=typeof n||null==n||n.__b&&n.__b>0?n:w$1(n)?n.map(V):d$1({},n)}function q(u,t,i,r,o,e,f,c,s){var a,h,v,y,d,_,m,b=i.props||p$1,k=t.props,x=t.type;if("svg"==x?o="http://www.w3.org/2000/svg":"math"==x?o="http://www.w3.org/1998/Math/MathML":o||(o="http://www.w3.org/1999/xhtml"),null!=e)for(a=0;a<e.length;a++)if((d=e[a])&&"setAttribute"in d==!!x&&(x?d.localName==x:3==d.nodeType)){u=d,e[a]=null;break}if(null==u){if(null==x)return document.createTextNode(k);u=document.createElementNS(o,x,k.is&&k),c&&(l$1.__m&&l$1.__m(t,e),c=false),e=null;}if(null==x)b===k||c&&u.data==k||(u.data=k);else {if(e=e&&n.call(u.childNodes),!c&&null!=e)for(b={},a=0;a<u.attributes.length;a++)b[(d=u.attributes[a]).name]=d.value;for(a in b)if(d=b[a],"children"==a);else if("dangerouslySetInnerHTML"==a)v=d;else if(!(a in k)){if("value"==a&&"defaultValue"in k||"checked"==a&&"defaultChecked"in k)continue;j$1(u,a,null,d,o);}for(a in k)d=k[a],"children"==a?y=d:"dangerouslySetInnerHTML"==a?h=d:"value"==a?_=d:"checked"==a?m=d:c&&"function"!=typeof d||b[a]===d||j$1(u,a,d,b[a],o);if(h)c||v&&(h.__html==v.__html||h.__html==u.innerHTML)||(u.innerHTML=h.__html),t.__k=[];else if(v&&(u.innerHTML=""),I("template"==t.type?u.content:u,w$1(y)?y:[y],t,i,r,"foreignObject"==x?"http://www.w3.org/1999/xhtml":o,e,f,e?e[0]:i.__k&&S(i,0),c,s),null!=e)for(a=e.length;a--;)g(e[a]);c||(a="value","progress"==x&&null==_?u.removeAttribute("value"):null!=_&&(_!==u[a]||"progress"==x&&!_||"option"==x&&_!=b[a])&&j$1(u,a,_,b[a],o),a="checked",null!=m&&m!=u[a]&&j$1(u,a,m,b[a],o));}return u}function B$1(n,u,t){try{if("function"==typeof n){var i="function"==typeof n.__u;i&&n.__u(),i&&null==u||(n.__u=n(u));}else n.current=u;}catch(n){l$1.__e(n,t);}}function D$1(n,u,t){var i,r;if(l$1.unmount&&l$1.unmount(n),(i=n.ref)&&(i.current&&i.current!=n.__e||B$1(i,null,u)),null!=(i=n.__c)){if(i.componentWillUnmount)try{i.componentWillUnmount();}catch(n){l$1.__e(n,u);}i.base=i.__P=null;}if(i=n.__k)for(r=0;r<i.length;r++)i[r]&&D$1(i[r],u,t||"function"!=typeof n.type);t||g(n.__e),n.__c=n.__=n.__e=void 0;}function E(n,l,u){return this.constructor(n,u)}function G(u,t,i){var r,o,e,f;t==document&&(t=document.documentElement),l$1.__&&l$1.__(u,t),o=(r="function"=="undefined")?null:t.__k,e=[],f=[],O(t,u=(t).__k=_$1(k$1,null,[u]),o||p$1,p$1,t.namespaceURI,o?null:t.firstChild?n.call(t.childNodes):null,e,o?o.__e:t.firstChild,r,f),N(e,u,f);}n=v$1.slice,l$1={__e:function(n,l,u,t){for(var i,r,o;l=l.__;)if((i=l.__c)&&!i.__)try{if((r=i.constructor)&&null!=r.getDerivedStateFromError&&(i.setState(r.getDerivedStateFromError(n)),o=i.__d),null!=i.componentDidCatch&&(i.componentDidCatch(n,t||{}),o=i.__d),o)return i.__E=i}catch(l){n=l;}throw n}},u$1=0,x.prototype.setState=function(n,l){var u;u=null!=this.__s&&this.__s!=this.state?this.__s:this.__s=d$1({},this.state),"function"==typeof n&&(n=n(d$1({},u),this.props)),n&&d$1(u,n),null!=n&&this.__v&&(l&&this._sb.push(l),M(this));},x.prototype.forceUpdate=function(n){this.__v&&(this.__e=true,n&&this.__h.push(n),M(this));},x.prototype.render=k$1,i$1=[],o$1="function"==typeof Promise?Promise.prototype.then.bind(Promise.resolve()):setTimeout,e$1=function(n,l){return n.__v.__b-l.__v.__b},$.__r=0,f$1=/(PointerCapture)$|Capture$/i,c$1=0,s$1=F(false),a$1=F(true);

    const Styles = {
        Alert: {
            error: {
                color: "red",
                fontWeight: "bold"
            },
            warning: {
                color: "#f80",
                fontWeight: "bold"
            },
            info: {
                color: "black"
            }
        },
        Darken: {
            position: "fixed",
            top: 0,
            left: 0,
            opacity: 0.5,
            backgroundColor: "#000",
            width: "100vw",
            height: "100vh",
            zIndex: 150,
            webkitBackdropFilter: "blur(2px)",
            backdropFilter: "blur(2px)",
        },
        DialogOuter: {
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 150,
            alignItems: "center",
            display: "flex",
            justifyContent: "center",
            padding: "16px",
            boxSizing: "border-box"
        },
        DialogInner: {
            position: "relative",
            color: "#222",
            backgroundColor: "#fff",
            padding: "24px",
            marginBottom: "2em",
            maxWidth: "400px",
            width: "100%",
            maxHeight: "90%",
            overflowY: "auto",
            border: "3px solid #3d3d5d",
            borderRadius: "8px",
            boxShadow: "0 0 80px 10px #666",
            fontFamily: "sans-serif",
            boxSizing: "border-box"
        },
        Input: {
            height: "35px",
            width: "100%",
            maxWidth: "100%",
            borderColor: "#ccf4",
            outline: "none",
            fontSize: "16px",
            padding: "8px",
            boxSizing: "border-box",
            backgroundColor: "#f9f9f9",
            borderRadius: "4px",
            border: "1px solid #ccc",
            marginTop: "6px",
            fontFamily: "inherit"
        },
        Button: {
            padding: "10px 20px",
            margin: "0 4px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            backgroundColor: "#ffffff",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
            color: "#374151",
            transition: "all 0.2s ease"
        },
        PrimaryButton: {
            padding: "10px 20px",
            margin: "0 4px",
            border: "1px solid #3b82f6",
            borderRadius: "6px",
            backgroundColor: "#3b82f6",
            color: "white",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
            transition: "all 0.2s ease"
        },
        ButtonsDiv: {
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            marginTop: "24px",
            paddingTop: "20px"
        },
        Label: {
            display: "block",
            marginBottom: "12px",
            fontSize: "14px",
            fontWeight: "500",
            color: "#333"
        },
        WindowHeader: {
            margin: "0 0 20px 0",
            fontSize: "18px",
            fontWeight: "600",
            color: "#333",
            borderBottom: "1px solid #eee",
            paddingBottom: "10px"
        },
        // OAuth Provider Button Styles
        ProviderButton: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            padding: "12px 16px",
            marginBottom: "10px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            backgroundColor: "#ffffff",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
            color: "#374151",
            transition: "all 0.2s ease",
            gap: "12px"
        },
        ProviderButtonIcon: {
            width: "20px",
            height: "20px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
        },
        ProviderButtonText: {
            flex: 1,
            textAlign: "left"
        },
        // Provider-specific colors
        ProviderGoogle: {
            backgroundColor: "#ffffff",
            border: "1px solid #dadce0",
            color: "#3c4043"
        },
        ProviderGitHub: {
            backgroundColor: "#ffffff",
            border: "1px solid #dadce0",
            color: "#181717"
        },
        ProviderMicrosoft: {
            backgroundColor: "#ffffff",
            border: "1px solid #dadce0",
            color: "#5e5e5e"
        },
        ProviderApple: {
            backgroundColor: "#000000",
            border: "1px solid #000000",
            color: "#ffffff"
        },
        ProviderCustom: {
            backgroundColor: "#ffffff",
            border: "1px solid #dadce0",
            color: "#181717"
        },
        // Divider styles
        Divider: {
            display: "flex",
            alignItems: "center",
            margin: "20px 0",
            color: "#6b7280",
            fontSize: "13px"
        },
        DividerLine: {
            flex: 1,
            height: "1px",
            backgroundColor: "#e5e7eb"
        },
        DividerText: {
            padding: "0 12px",
            color: "#9ca3af"
        },
        // OTP Button (Continue with email)
        OtpButton: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            padding: "12px 16px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            backgroundColor: "#f9fafb",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
            color: "#374151",
            transition: "all 0.2s ease",
            gap: "12px"
        }};

    function Dialog({ children, className }) {
        return (_$1("div", { className: `dexie-dialog ${className || ''}` },
            _$1("div", { style: Styles.Darken }),
            _$1("div", { style: Styles.DialogOuter },
                _$1("div", { style: Styles.DialogInner }, children))));
    }

    var t,r,u,i,o=0,f=[],c=l$1,e=c.__b,a=c.__r,v=c.diffed,l=c.__c,m=c.unmount,s=c.__;function p(n,t){c.__h&&c.__h(r,n,o||t),o=0;var u=r.__H||(r.__H={__:[],__h:[]});return n>=u.__.length&&u.__.push({}),u.__[n]}function d(n){return o=1,h(D,n)}function h(n,u,i){var o=p(t++,2);if(o.t=n,!o.__c&&(o.__=[D(void 0,u),function(n){var t=o.__N?o.__N[0]:o.__[0],r=o.t(t,n);t!==r&&(o.__N=[r,o.__[1]],o.__c.setState({}));}],o.__c=r,!r.__f)){var f=function(n,t,r){if(!o.__c.__H)return  true;var u=o.__c.__H.__.filter(function(n){return !!n.__c});if(u.every(function(n){return !n.__N}))return !c||c.call(this,n,t,r);var i=o.__c.props!==n;return u.forEach(function(n){if(n.__N){var t=n.__[0];n.__=n.__N,n.__N=void 0,t!==n.__[0]&&(i=true);}}),c&&c.call(this,n,t,r)||i};r.__f=true;var c=r.shouldComponentUpdate,e=r.componentWillUpdate;r.componentWillUpdate=function(n,t,r){if(this.__e){var u=c;c=void 0,f(n,t,r),c=u;}e&&e.call(this,n,t,r);},r.shouldComponentUpdate=f;}return o.__N||o.__}function _(n,u){var i=p(t++,4);!c.__s&&C(i.__H,u)&&(i.__=n,i.u=u,r.__h.push(i));}function A(n){return o=5,T(function(){return {current:n}},[])}function T(n,r){var u=p(t++,7);return C(u.__H,r)&&(u.__=n(),u.__H=r,u.__h=n),u.__}function j(){for(var n;n=f.shift();)if(n.__P&&n.__H)try{n.__H.__h.forEach(z),n.__H.__h.forEach(B),n.__H.__h=[];}catch(t){n.__H.__h=[],c.__e(t,n.__v);}}c.__b=function(n){r=null,e&&e(n);},c.__=function(n,t){n&&t.__k&&t.__k.__m&&(n.__m=t.__k.__m),s&&s(n,t);},c.__r=function(n){a&&a(n),t=0;var i=(r=n.__c).__H;i&&(u===r?(i.__h=[],r.__h=[],i.__.forEach(function(n){n.__N&&(n.__=n.__N),n.u=n.__N=void 0;})):(i.__h.forEach(z),i.__h.forEach(B),i.__h=[],t=0)),u=r;},c.diffed=function(n){v&&v(n);var t=n.__c;t&&t.__H&&(t.__H.__h.length&&(1!==f.push(t)&&i===c.requestAnimationFrame||((i=c.requestAnimationFrame)||w)(j)),t.__H.__.forEach(function(n){n.u&&(n.__H=n.u),n.u=void 0;})),u=r=null;},c.__c=function(n,t){t.some(function(n){try{n.__h.forEach(z),n.__h=n.__h.filter(function(n){return !n.__||B(n)});}catch(r){t.some(function(n){n.__h&&(n.__h=[]);}),t=[],c.__e(r,n.__v);}}),l&&l(n,t);},c.unmount=function(n){m&&m(n);var t,r=n.__c;r&&r.__H&&(r.__H.__.forEach(function(n){try{z(n);}catch(n){t=n;}}),r.__H=void 0,t&&c.__e(t,r.__v));};var k="function"==typeof requestAnimationFrame;function w(n){var t,r=function(){clearTimeout(u),k&&cancelAnimationFrame(t),setTimeout(n);},u=setTimeout(r,35);k&&(t=requestAnimationFrame(r));}function z(n){var t=r,u=n.__c;"function"==typeof u&&(n.__c=void 0,u()),r=t;}function B(n){var t=r;n.__c=n.__(),r=t;}function C(n,t){return !n||n.length!==t.length||t.some(function(t,r){return t!==n[r]})}function D(n,t){return "function"==typeof t?t(n):t}

    /** Resolve a message template with parameters.
     *
     * Example:
     *  resolveText({
     *    message: "Hello {name}!",
     *    messageCode: "HELLO",
     *    messageParams: {name: "David"}
     *  }) => "Hello David!"
     *
     * @param message Template message with {vars} in it.
     * @param messageCode Unique code for the message. Can be used for translation.
     * @param messageParams Parameters to be used in the message.
     * @returns A final message where parameters have been replaced with values.
     */
    function resolveText({ message, messageCode, messageParams }) {
        return message.replace(/\{\w+\}/ig, n => messageParams[n.substring(1, n.length - 1)]);
    }

    /** Get style based on styleHint (for provider branding, etc.) */
    function getOptionStyle(styleHint) {
        const baseStyle = Object.assign({}, Styles.ProviderButton);
        if (!styleHint) {
            return baseStyle;
        }
        switch (styleHint) {
            case 'google':
                return Object.assign(Object.assign({}, baseStyle), Styles.ProviderGoogle);
            case 'github':
                return Object.assign(Object.assign({}, baseStyle), Styles.ProviderGitHub);
            case 'microsoft':
                return Object.assign(Object.assign({}, baseStyle), Styles.ProviderMicrosoft);
            case 'apple':
                return Object.assign(Object.assign({}, baseStyle), Styles.ProviderApple);
            case 'otp':
                return Object.assign({}, Styles.OtpButton);
            case 'custom-oauth2':
                return Object.assign(Object.assign({}, baseStyle), Styles.ProviderCustom);
            default:
                return baseStyle;
        }
    }
    /**
     * Generic button component for selectable options.
     * Displays the option's icon and display name.
     *
     * Style is determined by the styleHint property for branding purposes.
     */
    function OptionButton({ option, onClick }) {
        const { displayName, iconUrl, styleHint } = option;
        const style = getOptionStyle(styleHint);
        return (_$1("button", { type: "button", style: style, onClick: onClick, class: `dxc-option-btn${styleHint ? ` dxc-option-${styleHint}` : ''}`, "aria-label": displayName },
            iconUrl && (_$1("img", { src: iconUrl, alt: "", style: Styles.ProviderButtonIcon, "aria-hidden": "true" })),
            _$1("span", { style: Styles.ProviderButtonText }, displayName)));
    }
    /**
     * Visual divider with "or" text.
     */
    function Divider() {
        return (_$1("div", { style: Styles.Divider },
            _$1("div", { style: Styles.DividerLine }),
            _$1("span", { style: Styles.DividerText }, "or"),
            _$1("div", { style: Styles.DividerLine })));
    }

    const OTP_LENGTH = 8;
    /**
     * Generic dialog that can render:
     * - Form fields (text inputs)
     * - Selectable options (buttons)
     * - Or both together
     *
     * When an option is clicked, calls onSubmit({ [option.name]: option.value }).
     * This unified approach means the same callback handles both form submission
     * and option selection.
     */
    function LoginDialog({ title, alerts, fields, options, submitLabel, cancelLabel, onCancel, onSubmit, }) {
        const [params, setParams] = d({});
        const firstFieldRef = A(null);
        _(() => { var _a; return (_a = firstFieldRef.current) === null || _a === void 0 ? void 0 : _a.focus(); }, []);
        const fieldEntries = Object.entries(fields || {});
        const hasFields = fieldEntries.length > 0;
        const hasOptions = options && options.length > 0;
        // Group options by name to detect if we have multiple groups
        const optionGroups = new Map();
        if (options) {
            for (const option of options) {
                const group = optionGroups.get(option.name) || [];
                group.push(option);
                optionGroups.set(option.name, group);
            }
        }
        const hasMultipleGroups = optionGroups.size > 1;
        // Handler for option clicks - calls onSubmit with { [option.name]: option.value }
        const handleOptionClick = (option) => {
            onSubmit({ [option.name]: option.value });
        };
        return (_$1(Dialog, { className: "dxc-login-dlg" },
            _$1(k$1, null,
                _$1("h3", { style: Styles.WindowHeader }, title),
                alerts.map((alert, idx) => (_$1("p", { key: idx, style: Styles.Alert[alert.type] }, resolveText(alert)))),
                hasOptions && (_$1("div", { class: "dxc-options" }, hasMultipleGroups ? (
                // Render with dividers between groups
                Array.from(optionGroups.entries()).map(([groupName, groupOptions], groupIdx) => (_$1(k$1, { key: groupName },
                    groupIdx > 0 && _$1(Divider, null),
                    groupOptions.map((option) => (_$1(OptionButton, { key: `${option.name}-${option.value}`, option: option, onClick: () => handleOptionClick(option) }))))))) : (
                // Simple case: all options in one group
                options.map((option) => (_$1(OptionButton, { key: `${option.name}-${option.value}`, option: option, onClick: () => handleOptionClick(option) })))))),
                hasOptions && hasFields && _$1(Divider, null),
                hasFields && (_$1("form", { onSubmit: (ev) => {
                        ev.preventDefault();
                        onSubmit(params);
                    } }, fieldEntries.map(([fieldName, { type, label, placeholder }], idx) => (_$1("label", { style: Styles.Label, key: idx },
                    label ? `${label}: ` : '',
                    _$1("input", { ref: idx === 0 ? firstFieldRef : undefined, type: type, name: fieldName, autoComplete: "on", style: Styles.Input, autoFocus: true, placeholder: placeholder, value: params[fieldName] || '', onInput: (ev) => {
                            var _a;
                            const value = valueTransformer(type, (_a = ev.target) === null || _a === void 0 ? void 0 : _a['value']);
                            let updatedParams = Object.assign(Object.assign({}, params), { [fieldName]: value });
                            setParams(updatedParams);
                            if (type === 'otp' && (value === null || value === void 0 ? void 0 : value.trim().length) === OTP_LENGTH) {
                                // Auto-submit when OTP is filled in.
                                onSubmit(updatedParams);
                            }
                        } }))))))),
            _$1("div", { style: Styles.ButtonsDiv },
                _$1(k$1, null,
                    submitLabel && (hasFields || (!hasOptions && !hasFields)) && (_$1("button", { type: "submit", style: Styles.PrimaryButton, onClick: () => onSubmit(params) }, submitLabel)),
                    cancelLabel && (_$1("button", { style: Styles.Button, onClick: onCancel }, cancelLabel))))));
    }
    function valueTransformer(type, value) {
        switch (type) {
            case 'email':
                return value.toLowerCase();
            case 'otp':
                return value.toUpperCase();
            default:
                return value;
        }
    }

    class LoginGui extends x {
        constructor(props) {
            super(props);
            this.observer = (userInteraction) => this.setState({ userInteraction });
            this.state = { userInteraction: undefined };
        }
        componentDidMount() {
            this.subscription = rxjs.from(this.props.db.cloud.userInteraction).subscribe(this.observer);
        }
        componentWillUnmount() {
            if (this.subscription) {
                this.subscription.unsubscribe();
                delete this.subscription;
            }
        }
        render(props, { userInteraction }) {
            if (!userInteraction)
                return null;
            // LoginDialog handles all interaction types uniformly
            // (forms with fields, options, or both)
            return _$1(LoginDialog, Object.assign({}, userInteraction));
        }
    }
    function setupDefaultGUI(db) {
        let closed = false;
        const el = document.createElement('div');
        if (document.body) {
            document.body.appendChild(el);
            G(_$1(LoginGui, { db: db.vip }), el);
        }
        else {
            addEventListener('DOMContentLoaded', () => {
                if (!closed) {
                    document.body.appendChild(el);
                    G(_$1(LoginGui, { db: db.vip }), el);
                }
            });
        }
        return {
            unsubscribe() {
                try {
                    el.remove();
                }
                catch (_a) { }
                closed = true;
            },
            get closed() {
                return closed;
            }
        };
    }

    function associate(factory) {
        const wm = new WeakMap();
        return (x) => {
            let rv = wm.get(x);
            if (!rv) {
                rv = factory(x);
                wm.set(x, rv);
            }
            return rv;
        };
    }

    const getCurrentUserEmitter = associate((db) => new rxjs.BehaviorSubject(Object.assign(Object.assign({}, UNAUTHORIZED_USER), { isLoading: true })));

    function computeSyncState(db) {
        let _prevStatus = db.cloud.webSocketStatus.value;
        const lazyWebSocketStatus = db.cloud.webSocketStatus.pipe(operators.switchMap((status) => {
            const prevStatus = _prevStatus;
            _prevStatus = status;
            const rv = rxjs.of(status);
            switch (status) {
                // A normal scenario is that the WS reconnects and falls shortly in disconnected-->connection-->connected.
                // Don't distract user with this unless these things take more time than normal:
                // Only show disconnected if disconnected more than 500ms, or if we can
                // see that the user is indeed not active.
                case 'disconnected':
                    return userIsActive.value ? rv.pipe(operators.debounceTime(500)) : rv;
                // Only show connecting if previous state was 'not-started' or 'error', or if
                // the time it takes to connect goes beyond 4 seconds.
                case 'connecting':
                    return prevStatus === 'not-started' || prevStatus === 'error'
                        ? rv
                        : rv.pipe(operators.debounceTime(4000));
                default:
                    return rv;
            }
        }));
        return rxjs.combineLatest([
            lazyWebSocketStatus,
            db.syncStateChangedEvent.pipe(operators.startWith({ phase: 'initial' })),
            getCurrentUserEmitter(db.dx._novip),
            userIsReallyActive
        ]).pipe(operators.map(([status, syncState, user, userIsActive]) => {
            var _a;
            if (((_a = user.license) === null || _a === void 0 ? void 0 : _a.status) && user.license.status !== 'ok') {
                return {
                    phase: 'offline',
                    status: 'offline',
                    license: user.license.status
                };
            }
            let { phase, error, progress } = syncState;
            let adjustedStatus = status;
            if (phase === 'error') {
                // Let users only rely on the status property to display an icon.
                // If there's an error in the sync phase, let it show on that
                // status icon also.
                adjustedStatus = 'error';
            }
            if (status === 'not-started') {
                // If websocket isn't yet connected becase we're doing
                // the startup sync, let the icon show the symbol for connecting.
                if (phase === 'pushing' || phase === 'pulling') {
                    adjustedStatus = 'connecting';
                }
            }
            const previousPhase = db.cloud.syncState.value.phase;
            //const previousStatus = db.cloud.syncState.value.status;
            if (previousPhase === 'error' && (syncState.phase === 'pushing' || syncState.phase === 'pulling')) {
                // We were in an errored state but is now doing sync. Show "connecting" icon.
                adjustedStatus = 'connecting';
            }
            /*if (syncState.phase === 'in-sync' && adjustedStatus === 'connecting') {
              adjustedStatus = 'connected';
            }*/
            if (!userIsActive) {
                adjustedStatus = 'disconnected';
            }
            const retState = {
                phase,
                error,
                progress,
                status: isOnline ? adjustedStatus : 'offline',
                license: 'ok'
            };
            return retState;
        }));
    }

    function createSharedValueObservable(o, defaultValue) {
        let currentValue = defaultValue;
        let shared = rxjs.from(o).pipe(rxjs.map((x) => (currentValue = x)), rxjs.share({ resetOnRefCountZero: () => rxjs.timer(1000) }));
        const rv = new rxjs.Observable((observer) => {
            let didEmit = false;
            const subscription = shared.subscribe({
                next(value) {
                    didEmit = true;
                    observer.next(value);
                },
                error(error) {
                    observer.error(error);
                },
                complete() {
                    observer.complete();
                }
            });
            if (!didEmit && !subscription.closed) {
                observer.next(currentValue);
            }
            return subscription;
        });
        rv.getValue = () => currentValue;
        return rv;
    }

    const getGlobalRolesObservable = associate((db) => {
        return createSharedValueObservable(Dexie.liveQuery(() => db.roles
            .where({ realmId: 'rlm-public' })
            .toArray()
            .then((roles) => {
            const rv = {};
            for (const role of roles
                .slice()
                .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))) {
                rv[role.name] = role;
            }
            return rv;
        })), {});
    });

    const getInternalAccessControlObservable = associate((db) => {
        return createSharedValueObservable(getCurrentUserEmitter(db._novip).pipe(operators.switchMap((currentUser) => Dexie.liveQuery(() => db.transaction('r', 'realms', 'members', () => Promise.all([
            db.members.where({ userId: currentUser.userId }).toArray(),
            db.realms.toArray(),
            currentUser.userId,
        ]).then(([selfMembers, realms, userId]) => {
            //console.debug(`PERMS: Result from liveQUery():`, JSON.stringify({selfMembers, realms, userId}, null, 2))
            return { selfMembers, realms, userId };
        }))))), {
            selfMembers: [],
            realms: [],
            get userId() {
                return db.cloud.currentUserId;
            },
        });
        /* let refCount = 0;
        return new Observable(observer => {
          const subscription = o.subscribe(observer);
          console.debug ('PERMS subscribe', ++refCount);
          return {
            unsubscribe() {
              console.debug ('PERMS unsubscribe', --refCount);
              subscription.unsubscribe();
            }
          }
        })*/
    });

    function mapValueObservable(o, mapper) {
        let currentValue;
        const rv = o.pipe(rxjs.map((x) => (currentValue = mapper(x))));
        rv.getValue = () => currentValue !== undefined
            ? currentValue
            : (currentValue = mapper(o.getValue()));
        return rv;
    }

    // TODO: Move to dexie-cloud-common
    function mergePermissions(...permissions) {
        if (permissions.length === 0)
            return {};
        const reduced = permissions.reduce((result, next) => {
            const ret = Object.assign({}, result);
            for (const [verb, rights] of Object.entries(next)) {
                if (verb in ret && ret[verb]) {
                    if (ret[verb] === '*')
                        continue;
                    if (rights === '*') {
                        ret[verb] = '*';
                    }
                    else if (Array.isArray(rights) && Array.isArray(ret[verb])) {
                        // Both are arrays (verb is 'add' or 'manage')
                        const r = ret;
                        const retVerb = r[verb]; // "!" because Array.isArray(ret[verb])
                        r[verb] = [...new Set([...retVerb, ...rights])];
                    }
                    else if (typeof rights === 'object' &&
                        rights &&
                        typeof ret[verb] === 'object') {
                        // Both are objects (verb is 'update')
                        const mergedRights = ret[verb]; // because we've checked that typeof ret[verb] === 'object' and earlier that not ret[verb] === '*'.
                        for (const [tableName, tableRights] of Object.entries(rights)) {
                            if (mergedRights[tableName] === '*')
                                continue;
                            if (tableRights === '*') {
                                mergedRights[tableName] = '*';
                            }
                            else if (Array.isArray(mergedRights[tableName]) &&
                                Array.isArray(tableRights)) {
                                mergedRights[tableName] = [
                                    ...new Set([...mergedRights[tableName], ...tableRights]),
                                ];
                            }
                        }
                    }
                }
                else {
                    /* This compiles without type assertions. Keeping the comment to
                       explain why we do tsignore on the next statement.
                    if (verb === "add") {
                      ret[verb] = next[verb];
                    } else if (verb === "update") {
                      ret[verb] = next[verb];
                    } else if (verb === "manage") {
                      ret[verb] = next[verb];
                    } else {
                      ret[verb] = next[verb];
                    }
                    */
                    //@ts-ignore
                    ret[verb] = next[verb];
                }
            }
            return ret;
        });
        return reduced;
    }

    const getPermissionsLookupObservable = associate((db) => {
        const o = createSharedValueObservable(rxjs.combineLatest([
            getInternalAccessControlObservable(db._novip),
            getGlobalRolesObservable(db._novip),
        ]).pipe(operators.map(([{ selfMembers, realms, userId }, globalRoles]) => ({
            selfMembers,
            realms,
            userId,
            globalRoles,
        }))), {
            selfMembers: [],
            realms: [],
            userId: UNAUTHORIZED_USER.userId,
            globalRoles: {},
        });
        return mapValueObservable(o, ({ selfMembers, realms, userId, globalRoles }) => {
            const rv = realms
                .map((realm) => {
                const selfRealmMembers = selfMembers.filter((m) => m.realmId === realm.realmId);
                const directPermissionSets = selfRealmMembers
                    .map((m) => m.permissions)
                    .filter((p) => p);
                const rolePermissionSets = flatten(selfRealmMembers.map((m) => m.roles).filter((roleName) => roleName))
                    .map((role) => globalRoles[role])
                    .filter((role) => role)
                    .map((role) => role.permissions);
                return Object.assign(Object.assign({}, realm), { permissions: realm.owner === userId
                        ? { manage: '*' }
                        : mergePermissions(...directPermissionSets, ...rolePermissionSets) });
            })
                .reduce((p, c) => (Object.assign(Object.assign({}, p), { [c.realmId]: c })), {
                [userId]: {
                    realmId: userId,
                    owner: userId,
                    name: userId,
                    permissions: { manage: '*' },
                },
            });
            return rv;
        });
    });

    class PermissionChecker {
        constructor(permissions, tableName, isOwner) {
            this.permissions = permissions || {};
            this.tableName = tableName;
            this.isOwner = isOwner;
        }
        add(...tableNames) {
            var _a;
            // If user can manage the whole realm, return true.
            if (this.permissions.manage === '*')
                return true;
            // If user can manage given table in realm, return true
            if ((_a = this.permissions.manage) === null || _a === void 0 ? void 0 : _a.includes(this.tableName))
                return true;
            // If user can add any type, return true
            if (this.permissions.add === '*')
                return true;
            // If user can add objects into given table names in the realm, return true
            if (tableNames.every((tableName) => { var _a; return (_a = this.permissions.add) === null || _a === void 0 ? void 0 : _a.includes(tableName); })) {
                return true;
            }
            return false;
        }
        update(...props) {
            var _a, _b;
            // If user is owner of this object, or if user can manage the whole realm, return true.
            if (this.isOwner || this.permissions.manage === '*')
                return true;
            // If user can manage given table in realm, return true
            if ((_a = this.permissions.manage) === null || _a === void 0 ? void 0 : _a.includes(this.tableName))
                return true;
            // If user can update any prop in any table in this realm, return true unless
            // it regards to ownership change:
            if (this.permissions.update === '*') {
                // @ts-ignore
                return props.every((prop) => prop !== 'owner');
            }
            const tablePermissions = (_b = this.permissions.update) === null || _b === void 0 ? void 0 : _b[this.tableName];
            // If user can update any prop in table and realm, return true unless
            // accessing special props owner or realmId
            if (tablePermissions === '*')
                return props.every((prop) => prop !== 'owner');
            // Explicitely listed properties to allow updates on:
            return props.every((prop) => tablePermissions === null || tablePermissions === void 0 ? void 0 : tablePermissions.some((permittedProp) => permittedProp === prop || (permittedProp === '*' && prop !== 'owner')));
        }
        delete() {
            var _a;
            // If user is owner of this object, or if user can manage the whole realm, return true.
            if (this.isOwner || this.permissions.manage === '*')
                return true;
            // If user can manage given table in realm, return true
            if ((_a = this.permissions.manage) === null || _a === void 0 ? void 0 : _a.includes(this.tableName))
                return true;
            return false;
        }
    }

    function permissions(dexie, obj, tableName) {
        if (!obj)
            throw new TypeError(`Cannot check permissions of undefined or null. A Dexie Cloud object with realmId and owner expected.`);
        const { owner, realmId } = obj;
        if (!tableName) {
            if (typeof obj.table !== 'function') {
                throw new TypeError(`Missing 'table' argument to permissions and table could not be extracted from entity`);
            }
            tableName = obj.table();
        }
        const source = getPermissionsLookupObservable(dexie);
        const mapper = (permissionsLookup) => {
            // If realmId is undefined, it can be due to that the object is not yet syncified - it exists
            // locally only as the user might not yet be authenticated. This is ok and we shall treat it
            // as if the realmId is dexie.cloud.currentUserId (which is "unauthorized" by the way)
            const realm = permissionsLookup[realmId || dexie.cloud.currentUserId];
            if (!realm)
                return new PermissionChecker({}, tableName, !owner || owner === dexie.cloud.currentUserId);
            return new PermissionChecker(realm.permissions, tableName, realmId === undefined || realmId === dexie.cloud.currentUserId || owner === dexie.cloud.currentUserId);
        };
        const o = source.pipe(operators.map(mapper));
        o.getValue = () => mapper(source.getValue());
        return o;
    }

    const getInvitesObservable = associate((db) => {
        const membersByEmail = getCurrentUserEmitter(db._novip).pipe(operators.switchMap((currentUser) => Dexie.liveQuery(() => db.members.where({ email: currentUser.email || '' }).toArray())));
        const permissions = getPermissionsLookupObservable(db._novip);
        const accessControl = getInternalAccessControlObservable(db._novip);
        return createSharedValueObservable(rxjs.combineLatest([membersByEmail, accessControl, permissions]).pipe(operators.map(([membersByEmail, accessControl, realmLookup]) => {
            const reducer = (result, m) => (Object.assign(Object.assign({}, result), { [m.id]: Object.assign(Object.assign({}, m), { realm: realmLookup[m.realmId] }) }));
            const emailMembersById = membersByEmail.reduce(reducer, {});
            const membersById = accessControl.selfMembers.reduce(reducer, emailMembersById);
            return Object.values(membersById)
                .filter((invite) => !invite.accepted)
                .map((invite) => (Object.assign(Object.assign({}, invite), { accept() {
                    return __awaiter(this, void 0, void 0, function* () {
                        yield db.members.update(invite.id, { accepted: new Date() });
                    });
                },
                reject() {
                    return __awaiter(this, void 0, void 0, function* () {
                        yield db.members.update(invite.id, { rejected: new Date() });
                    });
                } })));
        })), []);
    });

    function createYHandler(db) {
        return (provider) => {
            var _a;
            const doc = provider.doc;
            if (!doc) {
                throw new Error('Internal error: DexieYProvider.createYHandler called without a doc. This is unexpected.');
            }
            const { parentTable } = doc.meta || {};
            if (!((_a = db.cloud.schema) === null || _a === void 0 ? void 0 : _a[parentTable].markedForSync)) {
                return; // The table that holds the doc is not marked for sync - leave it to dexie. No syncing, no awareness.
            }
            let awareness;
            Object.defineProperty(provider, 'awareness', {
                get() {
                    if (awareness)
                        return awareness;
                    awareness = createAwareness(db, doc, provider);
                    awarenessWeakMap.set(doc, awareness);
                    return awareness;
                },
            });
        };
    }
    function createAwareness(db, doc, provider) {
        const { parentTable, parentId, parentProp, updatesTable } = doc.meta;
        const awareness = new Awareness(doc);
        const reopenDocSignal = getOpenDocSignal(doc);
        awareness.on('update', ({ added, updated, removed }, origin) => {
            // Send the update
            const changedClients = added.concat(updated).concat(removed);
            const user = db.cloud.currentUser.value;
            if (origin !== 'server' && user.isLoggedIn && !isEagerSyncDisabled(db)) {
                const update = encodeAwarenessUpdate(awareness, changedClients);
                db.messageProducer.next({
                    type: 'aware',
                    table: parentTable,
                    prop: parentProp,
                    k: doc.meta.parentId,
                    u: update,
                });
                if (provider.destroyed) {
                    // We're called from awareness.on('destroy') that did
                    // removeAwarenessStates.
                    // It's time to also send the doc-close message that dexie-cloud understands
                    // and uses to stop subscribing for updates and awareness updates and brings
                    // down the cached information in memory on the WS connection for this.
                    db.messageProducer.next({
                        type: 'doc-close',
                        table: parentTable,
                        prop: parentProp,
                        k: doc.meta.parentId,
                    });
                }
            }
        });
        awareness.on('destroy', () => {
            // Signal to server that this provider is destroyed (the update event will be triggered, which
            // in turn will trigger db.messageProducer that will send the message to the server if WS is connected)
            removeAwarenessStates(awareness, [doc.clientID], 'provider destroyed');
        });
        // Open the document on the server
        (() => __awaiter(this, void 0, void 0, function* () {
            if (provider.destroyed)
                return;
            let connected = false;
            let currentFlowId = 1;
            const subscription = rxjs.combineLatest([
                db.cloud.webSocketStatus, // Wake up when webSocket status changes
                reopenDocSignal.pipe(rxjs.startWith(null)), // Wake up when reopenDocSignal emits
            ]).subscribe(([wsStatus]) => {
                if (provider.destroyed)
                    return;
                // Keep "connected" state in a variable so we can check it after async operations
                connected = wsStatus === 'connected';
                // We are or got connected. Open the document on the server.
                const user = db.cloud.currentUser.value;
                if (wsStatus === 'connected' &&
                    user.isLoggedIn &&
                    !isEagerSyncDisabled(db)) {
                    ++currentFlowId;
                    openDocumentOnServer().catch((error) => {
                        console.warn(`Error catched in createYHandler.ts: ${error}`);
                    });
                }
            });
            // Wait until WebSocket is connected
            provider.addCleanupHandler(subscription);
            /** Sends an 'doc-open' message to server whenever websocket becomes
             * connected, or if it is already connected.
             * The flow is aborted in case websocket is disconnected while querying
             * information required to compute the state vector. Flow is also
             * aborted in case document or provider has been destroyed during
             * the async parts of the task.
             *
             * The state vector is only computed from the updates that have occured
             * after the last full sync - which could very often be zero - in which
             * case no state vector is sent (then the server already knows us by
             * revision)
             *
             * When server gets the doc-open message, it will authorize us for
             * whether we are allowed to read / write to this document, and then
             * keep the cached information in memory on the WS connection for this
             * particular document, as well as subscribe to updates and awareness updates
             * from other clients on the document.
             */
            function openDocumentOnServer() {
                return __awaiter(this, void 0, void 0, function* () {
                    const myFlow = currentFlowId; // So we can abort when a new flow is started
                    const yTbl = db.table(updatesTable);
                    const syncStateTbl = db.$syncState;
                    const [receivedUntil, yServerRev] = yield db.transaction('r', syncStateTbl, yTbl, () => __awaiter(this, void 0, void 0, function* () {
                        const syncState = yield yTbl.get(DEXIE_CLOUD_SYNCER_ID);
                        const persistedSyncState = yield syncStateTbl.get('syncState');
                        return [
                            (syncState === null || syncState === void 0 ? void 0 : syncState.receivedUntil) || 0,
                            (persistedSyncState === null || persistedSyncState === void 0 ? void 0 : persistedSyncState.yServerRevision) ||
                                (persistedSyncState === null || persistedSyncState === void 0 ? void 0 : persistedSyncState.serverRevision),
                        ];
                    }));
                    // After every await, check if we still should be working on this task.
                    if (provider.destroyed || currentFlowId !== myFlow || !connected)
                        return;
                    const docOpenMsg = {
                        type: 'doc-open',
                        table: parentTable,
                        prop: parentProp,
                        k: parentId,
                        serverRev: yServerRev,
                    };
                    const serverUpdatesSinceLastSync = yield yTbl
                        .where('i')
                        .between(receivedUntil, Infinity, false)
                        .filter((update) => Dexie.cmp(update.k, parentId) === 0 && // Only updates for this document
                        ((update.f || 0) & 1) === 0 // Don't include local changes
                    )
                        .toArray();
                    // After every await, check if we still should be working on this task.
                    if (provider.destroyed || currentFlowId !== myFlow || !connected)
                        return;
                    if (serverUpdatesSinceLastSync.length > 0) {
                        const mergedUpdate = mergeUpdatesV2(serverUpdatesSinceLastSync.map((update) => update.u));
                        const stateVector = encodeStateVectorFromUpdateV2(mergedUpdate);
                        docOpenMsg.sv = stateVector;
                    }
                    db.messageProducer.next(docOpenMsg);
                });
            }
        }))();
        return awareness;
    }

    /**
     * Decodes a base64url-encoded string to a regular string.
     * Base64url uses - instead of + and _ instead of /, and may omit padding.
     */
    function decodeBase64Url(encoded) {
        // Add padding if needed
        const padded = encoded + '='.repeat((4 - (encoded.length % 4)) % 4);
        // Convert base64url to base64
        const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
        return atob(base64);
    }
    /**
     * Parses OAuth callback parameters from the dxc-auth query parameter.
     *
     * The dxc-auth parameter contains base64url-encoded JSON with the following structure:
     * - On success: { "code": "...", "provider": "...", "state": "..." }
     * - On error: { "error": "...", "provider": "...", "state": "..." }
     *
     * @param url - The URL to parse (defaults to window.location.href)
     * @returns OAuthCallbackParams if valid callback, null otherwise
     * @throws OAuthError if there's an error in the callback
     */
    function parseOAuthCallback(url) {
        const targetUrl = (typeof window !== 'undefined' ? window.location.href : '');
        if (!targetUrl) {
            return null;
        }
        const parsed = new URL(targetUrl);
        const encoded = parsed.searchParams.get('dxc-auth');
        if (!encoded) {
            return null; // Not an OAuth callback URL
        }
        let payload;
        try {
            const json = decodeBase64Url(encoded);
            payload = JSON.parse(json);
        }
        catch (e) {
            console.warn('[dexie-cloud] Failed to parse dxc-auth parameter:', e);
            return null;
        }
        const { code, provider, state, error } = payload;
        // Check for error first
        if (error) {
            if (error.toLowerCase().includes('access_denied') || error.toLowerCase().includes('access denied')) {
                throw new OAuthError('access_denied', provider, error);
            }
            if (error.toLowerCase().includes('email') && error.toLowerCase().includes('verif')) {
                throw new OAuthError('email_not_verified', provider, error);
            }
            throw new OAuthError('provider_error', provider, error);
        }
        // Validate required fields for success case
        if (!code || !provider || !state) {
            console.warn('[dexie-cloud] Invalid dxc-auth payload: missing required fields');
            return null;
        }
        return { code, provider, state };
    }
    /**
     * Cleans up the dxc-auth query parameter from the URL.
     * Call this after successfully handling the callback to clean up the browser URL.
     */
    function cleanupOAuthUrl() {
        var _a;
        if (typeof window === 'undefined' || !((_a = window.history) === null || _a === void 0 ? void 0 : _a.replaceState)) {
            return;
        }
        const url = new URL(window.location.href);
        if (!url.searchParams.has('dxc-auth')) {
            return;
        }
        url.searchParams.delete('dxc-auth');
        const cleanUrl = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '') + url.hash;
        window.history.replaceState(null, '', cleanUrl);
    }

    function getTiedRealmId(objectId) {
        return 'rlm~' + objectId;
    }
    function getTiedObjectId(realmId) {
        return realmId.startsWith('rlm~') ? realmId.substr(4) : null;
    }

    const ydocTriggers = {};
    const middlewares = new WeakMap();
    const txRunner = TriggerRunner("tx"); // Trigger registry for transaction completion. Avoids open docs.
    const unloadRunner = TriggerRunner("unload"); // Trigger registry for unload. Runs when a document is closed.
    function TriggerRunner(name) {
        let triggerExecPromise = null;
        let triggerScheduled = false;
        let registry = new Map();
        function execute(registryCopy) {
            return __awaiter(this, void 0, void 0, function* () {
                for (const { db, parentId, triggers, parentTable, prop, } of registryCopy.values()) {
                    const yDoc = DexieYProvider.getOrCreateDocument(db, parentTable, prop, parentId);
                    try {
                        const provider = DexieYProvider.load(yDoc); // If doc is open, this would just be a ++refount
                        yield provider.whenLoaded; // If doc is loaded, this would resolve immediately
                        for (const trigger of triggers) {
                            yield trigger(yDoc, parentId);
                        }
                    }
                    catch (error) {
                        if ((error === null || error === void 0 ? void 0 : error.name) === 'AbortError') ;
                        else {
                            console.error(`Error in YDocTrigger ${error}`);
                        }
                    }
                    finally {
                        DexieYProvider.release(yDoc);
                    }
                }
            });
        }
        return {
            name,
            run() {
                return __awaiter(this, void 0, void 0, function* () {
                    console.log(`Running trigger (${name})?`, triggerScheduled, registry.size, !!triggerExecPromise);
                    if (!triggerScheduled && registry.size > 0) {
                        triggerScheduled = true;
                        if (triggerExecPromise)
                            yield triggerExecPromise.catch(() => { });
                        setTimeout(() => {
                            // setTimeout() is to escape from Promise.PSD zones and never run within liveQueries or transaction scopes
                            console.log("Running trigger really!", name);
                            triggerScheduled = false;
                            const registryCopy = registry;
                            registry = new Map();
                            triggerExecPromise = execute(registryCopy).finally(() => {
                                triggerExecPromise = null;
                            });
                        }, 0);
                    }
                });
            },
            enqueue(db, parentTable, parentId, prop, trigger) {
                const key = `${db.name}:${parentTable}:${parentId}:${prop}`;
                let entry = registry.get(key);
                if (!entry) {
                    entry = {
                        db,
                        parentTable,
                        parentId,
                        prop,
                        triggers: new Set(),
                    };
                    console.log(`Adding trigger ${key}`);
                    registry.set(key, entry);
                }
                entry.triggers.add(trigger);
            },
        };
    }
    const createMiddleware = (db) => ({
        stack: 'dbcore',
        level: 10,
        name: 'yTriggerMiddleware',
        create: (down) => {
            return Object.assign(Object.assign({}, down), { transaction: (stores, mode, options) => {
                    const idbtrans = down.transaction(stores, mode, options);
                    if (mode === 'readonly')
                        return idbtrans;
                    if (!stores.some((store) => ydocTriggers[store]))
                        return idbtrans;
                    idbtrans.addEventListener('complete', onTransactionCommitted);
                    return idbtrans;
                }, table: (updatesTable) => {
                    const coreTable = down.table(updatesTable);
                    const triggerSpec = ydocTriggers[updatesTable];
                    if (!triggerSpec)
                        return coreTable;
                    const { trigger, parentTable, prop } = triggerSpec;
                    return Object.assign(Object.assign({}, coreTable), { mutate(req) {
                            var _a;
                            switch (req.type) {
                                case 'add': {
                                    for (const yUpdateRow of req.values) {
                                        if (yUpdateRow.k == undefined)
                                            continue; // A syncer or garbage collection state does not point to a key
                                        const primaryKey = yUpdateRow.k;
                                        const doc = DexieYProvider.getDocCache(db).find(parentTable, primaryKey, prop);
                                        const runner = doc && ((_a = DexieYProvider.for(doc)) === null || _a === void 0 ? void 0 : _a.refCount)
                                            ? unloadRunner // Document is open. Wait with trigger until it's closed.
                                            : txRunner; // Document is closed. Run trigger immediately after transaction commits.
                                        runner.enqueue(db, parentTable, primaryKey, prop, trigger);
                                    }
                                    break;
                                }
                                case 'delete':
                                    // @ts-ignore
                                    if (req.trans._rejecting_y_ypdate) {
                                        // The deletion came from a rejection, not garbage collection.
                                        // When that happens, let the triggers run to compute new values
                                        // based on the deleted updates.
                                        coreTable
                                            .getMany({
                                            keys: req.keys,
                                            trans: req.trans,
                                            cache: 'immutable',
                                        })
                                            .then((updates) => {
                                            const keySet = new Dexie.RangeSet();
                                            for (const { k } of updates) {
                                                if (k != undefined)
                                                    keySet.addKey(k);
                                            }
                                            for (const interval of keySet) {
                                                txRunner.enqueue(db, parentTable, interval.from, prop, trigger);
                                            }
                                        });
                                    }
                                    break;
                            }
                            return coreTable.mutate(req);
                        } });
                } });
        },
    });
    function onTransactionCommitted() {
        txRunner.run();
    }
    function beforeProviderUnload() {
        unloadRunner.run();
    }
    function defineYDocTrigger(table, prop, trigger) {
        var _a, _b;
        const updatesTable = (_b = (_a = table.schema.yProps) === null || _a === void 0 ? void 0 : _a.find((p) => p.prop === prop)) === null || _b === void 0 ? void 0 : _b.updatesTable;
        if (!updatesTable)
            throw new Error(`Table ${table.name} does not have a Yjs property named ${prop}`);
        ydocTriggers[updatesTable] = {
            trigger,
            parentTable: table.name,
            prop,
        };
        const db = table.db._novip;
        let mw = middlewares.get(db);
        if (!mw) {
            mw = createMiddleware(db);
            middlewares.set(db, mw);
        }
        db.use(mw);
        {
            DexieYProvider.on('beforeunload', beforeProviderUnload);
        }
    }

    const DEFAULT_OPTIONS = {
        nameSuffix: true,
    };
    function dexieCloud(dexie) {
        const origIdbName = dexie.name;
        //
        //
        //
        const currentUserEmitter = getCurrentUserEmitter(dexie);
        const subscriptions = [];
        let configuredProgramatically = false;
        // Pending OAuth auth code from dxc-auth redirect (detected in configure())
        let pendingOAuthCode = null;
        // Pending OAuth error from dxc-auth redirect (detected in configure())
        let pendingOAuthError = null;
        // local sync worker - used when there's no service worker.
        let localSyncWorker = null;
        dexie.on('ready', (dexie) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield onDbReady(dexie);
            }
            catch (error) {
                console.error(error);
                // Make sure to succeed with database open even if network is down.
            }
        }), true // true = sticky
        );
        /** Void starting subscribers after a close has happened. */
        let closed = false;
        function throwIfClosed() {
            if (closed)
                throw new Dexie.DatabaseClosedError();
        }
        dexie.once('close', () => {
            subscriptions.forEach((subscription) => subscription.unsubscribe());
            subscriptions.splice(0, subscriptions.length);
            closed = true;
            localSyncWorker && localSyncWorker.stop();
            localSyncWorker = null;
            currentUserEmitter.next(UNAUTHORIZED_USER);
        });
        const syncComplete = new rxjs.Subject();
        dexie.cloud = {
            // @ts-ignore
            version: "4.3.9",
            options: Object.assign({}, DEFAULT_OPTIONS),
            schema: null,
            get currentUserId() {
                return currentUserEmitter.value.userId || UNAUTHORIZED_USER.userId;
            },
            currentUser: currentUserEmitter,
            syncState: new rxjs.BehaviorSubject({
                phase: 'initial',
                status: 'not-started',
            }),
            events: {
                syncComplete,
            },
            persistedSyncState: new rxjs.BehaviorSubject(undefined),
            userInteraction: new rxjs.BehaviorSubject(undefined),
            webSocketStatus: new rxjs.BehaviorSubject('not-started'),
            login(hint) {
                return __awaiter(this, void 0, void 0, function* () {
                    const db = DexieCloudDB(dexie);
                    yield db.cloud.sync();
                    yield login(db, hint);
                });
            },
            invites: getInvitesObservable(dexie),
            roles: getGlobalRolesObservable(dexie),
            configure(options) {
                options = dexie.cloud.options = Object.assign(Object.assign({}, dexie.cloud.options), options);
                configuredProgramatically = true;
                if (options.databaseUrl && options.nameSuffix) {
                    // @ts-ignore
                    dexie.name = `${origIdbName}-${getDbNameFromDbUrl(options.databaseUrl)}`;
                    DexieCloudDB(dexie).reconfigure(); // Update observable from new dexie.name
                }
                updateSchemaFromOptions(dexie.cloud.schema, dexie.cloud.options);
                // Check for OAuth callback (dxc-auth query parameter)
                // Only check in DOM environment, not workers
                if (typeof window !== 'undefined' && window.location) {
                    try {
                        const callback = parseOAuthCallback();
                        if (callback) {
                            // Store the pending auth code for processing when db is ready
                            pendingOAuthCode = { code: callback.code, provider: callback.provider };
                            console.debug('[dexie-cloud] OAuth callback detected, auth code stored for processing');
                        }
                    }
                    catch (error) {
                        // parseOAuthCallback throws OAuthError on error callbacks
                        if (error instanceof OAuthError) {
                            pendingOAuthError = error;
                            console.error('[dexie-cloud] OAuth callback error:', error.message);
                        }
                        else {
                            console.error('[dexie-cloud] OAuth callback error:', error);
                        }
                    }
                }
            },
            logout() {
                return __awaiter(this, arguments, void 0, function* ({ force } = {}) {
                    force
                        ? yield _logout(DexieCloudDB(dexie), { deleteUnsyncedData: true })
                        : yield logout(DexieCloudDB(dexie));
                });
            },
            getAuthProviders() {
                return __awaiter(this, void 0, void 0, function* () {
                    const options = dexie.cloud.options;
                    if (!(options === null || options === void 0 ? void 0 : options.databaseUrl)) {
                        throw new Error('Dexie Cloud not configured. Call db.cloud.configure() first.');
                    }
                    const socialAuthEnabled = options.socialAuth !== false;
                    return fetchAuthProviders(options.databaseUrl, socialAuthEnabled);
                });
            },
            sync() {
                return __awaiter(this, arguments, void 0, function* ({ wait, purpose } = { wait: true, purpose: 'push' }) {
                    var _a;
                    if (wait === undefined)
                        wait = true;
                    const db = DexieCloudDB(dexie);
                    const licenseStatus = ((_a = db.cloud.currentUser.value.license) === null || _a === void 0 ? void 0 : _a.status) || 'ok';
                    if (licenseStatus !== 'ok') {
                        // Refresh access token to check for updated license
                        yield loadAccessToken(db);
                    }
                    if (purpose === 'pull') {
                        const syncState = db.cloud.persistedSyncState.value;
                        triggerSync(db, purpose);
                        if (wait) {
                            const newSyncState = yield rxjs.firstValueFrom(db.cloud.persistedSyncState.pipe(operators.filter((newSyncState) => (newSyncState === null || newSyncState === void 0 ? void 0 : newSyncState.timestamp) != null &&
                                (!syncState || newSyncState.timestamp > syncState.timestamp))));
                            if (newSyncState === null || newSyncState === void 0 ? void 0 : newSyncState.error) {
                                throw new Error(`Sync error: ` + newSyncState.error);
                            }
                        }
                    }
                    else if (yield isSyncNeeded(db)) {
                        const syncState = db.cloud.persistedSyncState.value;
                        triggerSync(db, purpose);
                        if (wait) {
                            console.debug('db.cloud.login() is waiting for sync completion...');
                            yield rxjs.firstValueFrom(rxjs.from(Dexie.liveQuery(() => __awaiter(this, void 0, void 0, function* () {
                                const syncNeeded = yield isSyncNeeded(db);
                                const newSyncState = yield db.getPersistedSyncState();
                                if ((newSyncState === null || newSyncState === void 0 ? void 0 : newSyncState.timestamp) !== (syncState === null || syncState === void 0 ? void 0 : syncState.timestamp) &&
                                    (newSyncState === null || newSyncState === void 0 ? void 0 : newSyncState.error))
                                    throw new Error(`Sync error: ` + newSyncState.error);
                                return syncNeeded;
                            }))).pipe(operators.filter((isNeeded) => !isNeeded)));
                            console.debug('Done waiting for sync completion because we have nothing to push anymore');
                        }
                    }
                });
            },
            permissions(obj, tableName) {
                return permissions(dexie._novip, obj, tableName);
            },
        };
        dexie.Version.prototype['_parseStoresSpec'] = Dexie.override(dexie.Version.prototype['_parseStoresSpec'], (origFunc) => overrideParseStoresSpec(origFunc, dexie));
        dexie.Table.prototype.newId = function ({ colocateWith } = {}) {
            const shardKey = colocateWith && colocateWith.substr(colocateWith.length - 3);
            return generateKey(dexie.cloud.schema[this.name].idPrefix || '', shardKey);
        };
        dexie.Table.prototype.idPrefix = function () {
            var _a, _b;
            return ((_b = (_a = this.db.cloud.schema) === null || _a === void 0 ? void 0 : _a[this.name]) === null || _b === void 0 ? void 0 : _b.idPrefix) || '';
        };
        dexie.use(createMutationTrackingMiddleware({
            currentUserObservable: dexie.cloud.currentUser,
            db: DexieCloudDB(dexie),
        }));
        dexie.use(createImplicitPropSetterMiddleware(DexieCloudDB(dexie)));
        dexie.use(createIdGenerationMiddleware(DexieCloudDB(dexie)));
        function onDbReady(dexie) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c, _d, _e, _f, _g;
                closed = false; // As Dexie calls us, we are not closed anymore. Maybe reopened? Remember db.ready event is registered with sticky flag!
                const db = DexieCloudDB(dexie);
                // Setup default GUI:
                if (typeof window !== 'undefined' && typeof document !== 'undefined') {
                    if (!((_a = db.cloud.options) === null || _a === void 0 ? void 0 : _a.customLoginGui)) {
                        subscriptions.push(setupDefaultGUI(dexie));
                    }
                }
                if (!db.cloud.isServiceWorkerDB) {
                    subscriptions.push(computeSyncState(db).subscribe(dexie.cloud.syncState));
                }
                // Forward db.syncCompleteEvent to be publicly consumable via db.cloud.events.syncComplete:
                subscriptions.push(db.syncCompleteEvent.subscribe(syncComplete));
                //verifyConfig(db.cloud.options); Not needed (yet at least!)
                // Verify the user has allowed version increment.
                if (!db.tables.every((table) => table.core)) {
                    throwVersionIncrementNeeded();
                }
                const swRegistrations = 'serviceWorker' in navigator
                    ? yield navigator.serviceWorker.getRegistrations()
                    : [];
                const [initiallySynced, lastSyncedRealms] = yield db.transaction('rw', db.$syncState, () => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b;
                    const { options, schema } = db.cloud;
                    const [persistedOptions, persistedSchema, persistedSyncState] = yield Promise.all([
                        db.getOptions(),
                        db.getSchema(),
                        db.getPersistedSyncState(),
                    ]);
                    if (!configuredProgramatically) {
                        // Options not specified programatically (use case for SW!)
                        // Take persisted options:
                        db.cloud.options = persistedOptions || null;
                    }
                    else if (!persistedOptions ||
                        JSON.stringify(persistedOptions) !== JSON.stringify(options)) {
                        // Update persisted options:
                        if (!options)
                            throw new Error(`Internal error`); // options cannot be null if configuredProgramatically is set.
                        const newPersistedOptions = Object.assign({}, options);
                        delete newPersistedOptions.fetchTokens;
                        delete newPersistedOptions.awarenessProtocol;
                        yield db.$syncState.put(newPersistedOptions, 'options');
                    }
                    if (((_a = db.cloud.options) === null || _a === void 0 ? void 0 : _a.tryUseServiceWorker) &&
                        'serviceWorker' in navigator &&
                        swRegistrations.length > 0 &&
                        !DISABLE_SERVICEWORKER_STRATEGY) {
                        // * Configured for using service worker if available.
                        // * Browser supports service workers
                        // * There are at least one service worker registration
                        console.debug('Dexie Cloud Addon: Using service worker');
                        db.cloud.usingServiceWorker = true;
                    }
                    else {
                        // Not configured for using service worker or no service worker
                        // registration exists. Don't rely on service worker to do any job.
                        // Use LocalSyncWorker instead.
                        if (((_b = db.cloud.options) === null || _b === void 0 ? void 0 : _b.tryUseServiceWorker) &&
                            !db.cloud.isServiceWorkerDB) {
                            console.debug('dexie-cloud-addon: Not using service worker.', swRegistrations.length === 0
                                ? 'No SW registrations found.'
                                : 'serviceWorker' in navigator && DISABLE_SERVICEWORKER_STRATEGY
                                    ? 'Avoiding SW background sync and SW periodic bg sync for this browser due to browser bugs.'
                                    : 'navigator.serviceWorker not present');
                        }
                        db.cloud.usingServiceWorker = false;
                    }
                    updateSchemaFromOptions(schema, db.cloud.options);
                    updateSchemaFromOptions(persistedSchema, db.cloud.options);
                    if (!schema) {
                        // Database opened dynamically (use case for SW!)
                        // Take persisted schema:
                        db.cloud.schema = persistedSchema || null;
                    }
                    else if (!persistedSchema ||
                        JSON.stringify(persistedSchema) !== JSON.stringify(schema)) {
                        // Update persisted schema (but don't overwrite table prefixes)
                        const newPersistedSchema = persistedSchema || {};
                        for (const [table, tblSchema] of Object.entries(schema)) {
                            const newTblSchema = newPersistedSchema[table];
                            if (!newTblSchema) {
                                newPersistedSchema[table] = Object.assign({}, tblSchema);
                            }
                            else {
                                newTblSchema.markedForSync = tblSchema.markedForSync;
                                tblSchema.deleted = newTblSchema.deleted;
                                newTblSchema.generatedGlobalId = tblSchema.generatedGlobalId;
                            }
                        }
                        yield db.$syncState.put(newPersistedSchema, 'schema');
                        // Make sure persisted table prefixes are being used instead of computed ones:
                        // Let's assign all props as the newPersistedSchems should be what we should be working with.
                        Object.assign(schema, newPersistedSchema);
                    }
                    return [persistedSyncState === null || persistedSyncState === void 0 ? void 0 : persistedSyncState.initiallySynced, persistedSyncState === null || persistedSyncState === void 0 ? void 0 : persistedSyncState.realms];
                }));
                if (initiallySynced) {
                    db.setInitiallySynced(true);
                }
                verifySchema(db);
                // Manage CurrentUser observable:
                throwIfClosed();
                if (!db.cloud.isServiceWorkerDB) {
                    subscriptions.push(Dexie.liveQuery(() => db.getCurrentUser().then(user => {
                        if (!user.isLoggedIn && typeof location !== 'undefined' && /dxc-auth\=/.test(location.search)) {
                            // Still loading user because OAuth redirect just happened.
                            // Keep isLoading true.
                            return Object.assign(Object.assign({}, user), { isLoading: true });
                        }
                        return user;
                    })).subscribe(currentUserEmitter));
                    // Manage PersistendSyncState observable:
                    subscriptions.push(Dexie.liveQuery(() => db.getPersistedSyncState()).subscribe(db.cloud.persistedSyncState));
                    // Wait till currentUser and persistedSyncState gets populated
                    // with things from the database and not just the default values.
                    // This is so that when db.open() completes, user should be safe
                    // to subscribe to these observables and get actual data.
                    yield rxjs.firstValueFrom(rxjs.combineLatest([
                        currentUserEmitter.pipe(operators.skip(1), operators.take(1)),
                        db.cloud.persistedSyncState.pipe(operators.skip(1), operators.take(1)),
                    ]));
                    const yHandler = createYHandler(db);
                    DexieYProvider.on.new.subscribe(yHandler);
                    db.dx.once('close', () => {
                        DexieYProvider.on.new.unsubscribe(yHandler);
                    });
                }
                // HERE: If requireAuth, do athentication now.
                let changedUser = false;
                let user = yield db.getCurrentUser();
                // Show pending OAuth error if present (from dxc-auth redirect)
                if (pendingOAuthError && !db.cloud.isServiceWorkerDB) {
                    const error = pendingOAuthError;
                    pendingOAuthError = null; // Clear pending error
                    console.debug('[dexie-cloud] Showing OAuth error:', error.message);
                    // Show alert to user about the OAuth error
                    // Guard so UI errors don't abort initialization
                    try {
                        yield alertUser(db.cloud.userInteraction, 'Authentication Error', {
                            type: 'error',
                            messageCode: 'GENERIC_ERROR',
                            message: error.message,
                            messageParams: { provider: error.provider || 'unknown' }
                        });
                        // Clean up URL (remove dxc-auth param)
                        cleanupOAuthUrl();
                    }
                    catch (uiError) {
                        console.error('[dexie-cloud] Failed to show OAuth error alert:', uiError);
                    }
                }
                // Process pending OAuth callback if present (from dxc-auth redirect)
                if (pendingOAuthCode && !db.cloud.isServiceWorkerDB) {
                    const { code, provider } = pendingOAuthCode;
                    pendingOAuthCode = null; // Clear pending code
                    console.debug('[dexie-cloud] Processing OAuth callback, provider:', provider);
                    try {
                        changedUser = yield login(db, { oauthCode: code, provider });
                        user = yield db.getCurrentUser();
                        // Clean up URL (remove dxc-auth param)
                        cleanupOAuthUrl();
                    }
                    catch (error) {
                        console.error('[dexie-cloud] OAuth login failed:', error);
                        // Continue with normal flow - user can try again
                    }
                }
                const requireAuth = (_b = db.cloud.options) === null || _b === void 0 ? void 0 : _b.requireAuth;
                if (requireAuth) {
                    if (db.cloud.isServiceWorkerDB) {
                        // If this is a service worker DB, we can't do authentication here,
                        // we just wait until the application has done it.
                        console.debug('Dexie Cloud Service worker. Waiting for application to authenticate.');
                        yield rxjs.firstValueFrom(currentUserEmitter.pipe(operators.filter((user) => !!user.isLoggedIn), operators.take(1)));
                        console.debug('Dexie Cloud Service worker. Application has authenticated.');
                    }
                    else {
                        if (typeof requireAuth === 'object') {
                            // requireAuth contains login hints. Check if we already fulfil it:
                            if (!user.isLoggedIn ||
                                (requireAuth.userId && user.userId !== requireAuth.userId) ||
                                (requireAuth.email && user.email !== requireAuth.email)) {
                                // If not, login the configured user:
                                changedUser = yield login(db, requireAuth);
                            }
                        }
                        else if (!user.isLoggedIn) {
                            // requireAuth is true and user is not logged in
                            changedUser = yield login(db);
                        }
                    }
                }
                if (user.isLoggedIn && (!lastSyncedRealms || !lastSyncedRealms.includes(user.userId))) {
                    // User has been logged in but this is not reflected in the sync state.
                    // This can happen if page is reloaded after login but before the sync call following
                    // the login was complete.
                    // The user is to be viewed as changed becuase current syncState does not reflect the presence
                    // of the logged-in user.
                    changedUser = true; // Set changedUser to true to trigger a pull-sync later down.
                }
                if (localSyncWorker)
                    localSyncWorker.stop();
                localSyncWorker = null;
                throwIfClosed();
                const doInitialSync = ((_c = db.cloud.options) === null || _c === void 0 ? void 0 : _c.databaseUrl) && (!initiallySynced || changedUser);
                if (doInitialSync) {
                    // Do the initial sync directly in the browser thread no matter if we are using service worker or not.
                    yield performInitialSync(db, db.cloud.options, db.cloud.schema);
                    db.setInitiallySynced(true);
                }
                throwIfClosed();
                if (db.cloud.usingServiceWorker && ((_d = db.cloud.options) === null || _d === void 0 ? void 0 : _d.databaseUrl)) {
                    if (!doInitialSync) {
                        registerSyncEvent(db, 'push').catch(() => { });
                    }
                    registerPeriodicSyncEvent(db).catch(() => { });
                }
                else if (((_e = db.cloud.options) === null || _e === void 0 ? void 0 : _e.databaseUrl) &&
                    db.cloud.schema &&
                    !db.cloud.isServiceWorkerDB) {
                    // There's no SW. Start SyncWorker instead.
                    localSyncWorker = LocalSyncWorker(db, db.cloud.options, db.cloud.schema);
                    localSyncWorker.start();
                    if (!doInitialSync) {
                        triggerSync(db, 'push');
                    }
                }
                // Listen to online event and do sync.
                throwIfClosed();
                if (!db.cloud.isServiceWorkerDB) {
                    subscriptions.push(rxjs.fromEvent(self, 'online').subscribe(() => {
                        console.debug('online!');
                        db.syncStateChangedEvent.next({
                            phase: 'not-in-sync',
                        });
                        if (!isEagerSyncDisabled(db)) {
                            triggerSync(db, 'push');
                        }
                    }), rxjs.fromEvent(self, 'offline').subscribe(() => {
                        console.debug('offline!');
                        db.syncStateChangedEvent.next({
                            phase: 'offline',
                        });
                    }));
                }
                // Connect WebSocket unless we are in a service worker or websocket is disabled.
                if (((_f = db.cloud.options) === null || _f === void 0 ? void 0 : _f.databaseUrl) &&
                    !((_g = db.cloud.options) === null || _g === void 0 ? void 0 : _g.disableWebSocket) &&
                    !IS_SERVICE_WORKER) {
                    subscriptions.push(connectWebSocket(db));
                }
            });
        }
    }
    // @ts-ignore
    dexieCloud.version = "4.3.9";
    Dexie.Cloud = dexieCloud;

    exports.default = dexieCloud;
    exports.defineYDocTrigger = defineYDocTrigger;
    exports.dexieCloud = dexieCloud;
    exports.getTiedObjectId = getTiedObjectId;
    exports.getTiedRealmId = getTiedRealmId;
    exports.resolveText = resolveText;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=dexie-cloud-addon.js.map
