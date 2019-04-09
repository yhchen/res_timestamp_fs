"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 二进制数据读取类
class BufferWriter {
    constructor(initSize = 8 /*init buffer size*/, appendSize = 32 /*buffer append size*/) {
        this._buffer_expand_size = 32;
        this._pos = 0;
        this._littleEndian = false;
        this._buffer_expand_size = appendSize;
        this._uint8arry = new Uint8Array(initSize);
        this._dataview = new DataView(this._uint8arry.buffer);
    }
    // set little endian or big endian
    setLittleEndianMode(v) { this._littleEndian = v; }
    // buffer size
    get byteLength() { return this._pos; }
    get capacity() { return this._uint8arry.byteLength; }
    get avaliableLength() { return this._uint8arry.byteLength - this._pos; }
    // current read position
    get position() { return this._pos; }
    set position(pos) { this._pos = Math.min(pos, this._uint8arry.byteLength); }
    // get ArrayBuffer
    get buffer() { return new Uint8Array(this._uint8arry.buffer, 0, this._pos); }
    // get DataView
    get dataView() { return this._dataview; }
    writeInt8(value) { this._writeNumber(value, 1, this._dataview.setInt8); }
    writeUint8(value) { this._writeNumber(value, 1, this._dataview.setUint8); }
    writeInt16(value) { this._writeNumber(value, 2, this._dataview.setInt16); }
    writeUint16(value) { this._writeNumber(value, 2, this._dataview.setUint16); }
    writeFloat32(value) { this._writeNumber(value, 4, this._dataview.setFloat32); }
    writeFloat64(value) { this._writeNumber(value, 8, this._dataview.setFloat64); }
    writeInt32(value) { this._writeNumber(value, 4, this._dataview.setInt32); }
    writeUint32(value) { this._writeNumber(value, 4, this._dataview.setUint32); }
    writeBuffer(buffer, offset, length) {
        const wbuffer = new Uint8Array((buffer instanceof Uint8Array) ? buffer : buffer, offset || 0, length);
        const wlength = wbuffer.byteLength;
        this._validateBuffer(wlength);
        this._uint8arry.set(wbuffer, this._pos);
        this._pos += wlength;
    }
    writeString(s, offset, length) {
        const wbuffer = new Buffer(offset != undefined ? s.substr(offset, length) : s);
        const old_pos = this._pos;
        this.writeUint16(0);
        let stringLen = wbuffer.byteLength;
        this.writeBuffer(wbuffer);
        // write string end character '\0'
        this.writeUint8(0);
        // record string length
        this._dataview.setUint16(old_pos, stringLen, this._littleEndian);
    }
    // write string length less than 255
    writeStringLT255(s, offset, length) {
        const wbuffer = new Buffer(offset != undefined ? s.substr(offset, length) : s);
        if (wbuffer.byteLength >= 256) {
            console.error(`call "writeStringLT255" failure. string length must be less than 255. current length is ${wbuffer.byteLength}`);
        }
        const old_pos = this._pos;
        this.writeUint8(0);
        let stringLen = wbuffer.byteLength;
        this.writeBuffer(wbuffer);
        // write string end character '\0'
        this.writeUint8(0);
        // record string length
        this._dataview.setUint8(old_pos, stringLen);
    }
    // -------------------- private side --------------------
    _writeNumber(value, size, readfunc) {
        this._validateBuffer(size);
        const old_pos = this._pos;
        this._pos += size;
        readfunc.call(this._dataview, old_pos, value, this._littleEndian);
    }
    _validateBuffer(len) {
        const data_size = len + this._pos;
        if (this._dataview.byteLength < data_size) {
            const be = this._buffer_expand_size;
            var new_buffer = (be == 0) ? new Uint8Array(data_size) : new Uint8Array(((data_size / be >> 0) + 1) * be);
            new_buffer.set(this._uint8arry);
            this._uint8arry = new_buffer;
            this._dataview = new DataView(new_buffer.buffer);
        }
    }
    ;
}
exports.BufferWriter = BufferWriter;
//# sourceMappingURL=BufferWriter.js.map