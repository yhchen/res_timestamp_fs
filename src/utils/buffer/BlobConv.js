"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// Blob -> ArrayBuffer, BinaryString, DataURL, text
class BlobConv {
    // public static async arrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    // 	let promise = new Promise<ArrayBuffer>(resolve => {
    // 		let fr = new FileReader();
    // 		fr.onload = eve => {
    // 			resolve(<ArrayBuffer>fr.result);
    // 		}
    // 		fr.readAsArrayBuffer(blob);
    // 	});
    // 	return promise;
    // }
    static arrayBuffer(blob) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield BlobConv.AsyncCall((fr) => { fr.readAsArrayBuffer(blob); });
        });
    }
    static binaryString(blob) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield BlobConv.AsyncCall((fr) => { fr.readAsBinaryString(blob); });
        });
    }
    static dataURL(blob) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield BlobConv.AsyncCall((fr) => { fr.readAsDataURL(blob); });
        });
    }
    static text(blob) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield BlobConv.AsyncCall((fr) => { fr.readAsText(blob); });
        });
    }
    static AsyncCall(callFunc) {
        return __awaiter(this, void 0, void 0, function* () {
            let promise = new Promise(__resolve__ => {
                let fr = new FileReader();
                fr.onload = _ => {
                    __resolve__(fr.result);
                };
                callFunc(fr);
            });
            return promise;
        });
    }
}
exports.BlobConv = BlobConv;
//# sourceMappingURL=BlobConv.js.map