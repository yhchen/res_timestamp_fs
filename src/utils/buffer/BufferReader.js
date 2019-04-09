"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 二进制数据读取类
class BufferReader {
    constructor(buffer, byteOffset, byteLength) {
        this._dataview = BufferReader.__zero_data_view;
        this._pos = 0;
        this._littleEndian = false;
        if (buffer) {
            let arrybuf = (buffer instanceof Uint8Array) ? buffer.buffer : buffer;
            this._dataview = new DataView(arrybuf, byteOffset, byteLength);
        }
    }
    // buffer size
    get byteLength() { return this._dataview.byteLength; }
    get avaliableLength() { return this._dataview.byteLength - this._pos; }
    // current read position
    get position() { return this._pos; }
    set position(pos) { this._pos = Math.min(pos, this._dataview.byteLength); }
    // get ArrayBuffer
    get buffer() { return this._dataview.buffer; }
    //get relation position from begin of Buffer()
    get bufferPosition() { return this._pos + this._dataview.byteOffset; }
    // get DataView
    get dataView() { return this._dataview; }
    getInt8() { return this._getNumber(1, this._dataview.getInt8); }
    getUint8() { return this._getNumber(1, this._dataview.getUint8); }
    getInt16() { return this._getNumber(2, this._dataview.getInt16); }
    getUint16() { return this._getNumber(2, this._dataview.getUint16); }
    getFloat32() { return this._getNumber(4, this._dataview.getFloat32); }
    getFloat64() { return this._getNumber(8, this._dataview.getFloat64); }
    getInt32() { return this._getNumber(4, this._dataview.getInt32); }
    getUint32() { return this._getNumber(4, this._dataview.getUint32); }
    getBuffer(buffSize) {
        if (this._pos + buffSize > this._dataview.byteLength) {
            console.error(`read buffer failure. available length not enought.[${this.avaliableLength}:${buffSize}]`);
        }
        else {
            const start_pos = this._dataview.byteOffset + this._pos;
            if (this._dataview.byteOffset)
                this._pos += buffSize;
            return this._dataview.buffer.slice(start_pos, start_pos + buffSize);
        }
        return new ArrayBuffer(0);
    }
    // -------------------- private side --------------------
    _getNumber(size, readfunc) {
        if (this.avaliableLength < size) {
            console.error(`read buffer failure. available length not enought.[${this.avaliableLength}:${size}]`);
        }
        else {
            const old_pos = this._pos;
            this._pos += size;
            return readfunc.call(this._dataview, old_pos, this._littleEndian);
        }
        return 0;
    }
}
BufferReader.__zero_data_view = new DataView(new ArrayBuffer(0));
exports.BufferReader = BufferReader;
//# sourceMappingURL=BufferReader.js.map