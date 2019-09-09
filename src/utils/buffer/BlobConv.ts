// Blob -> ArrayBuffer, BinaryString, DataURL, text
export class BlobConv {
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

	public static async arrayBuffer(blob: Blob): Promise<ArrayBuffer> {
		return await BlobConv.AsyncCall<ArrayBuffer>((fr) => { fr.readAsArrayBuffer(blob); });
	}
	public static async binaryString(blob: Blob) {
		return await BlobConv.AsyncCall<string>((fr) => { fr.readAsBinaryString(blob); });
	}
	public static async dataURL(blob: Blob) {
		return await BlobConv.AsyncCall<string>((fr) => { fr.readAsDataURL(blob); });
	}
	public static async text(blob: Blob) {
		return await BlobConv.AsyncCall<string>((fr) => { fr.readAsText(blob); });
	}

	private static async AsyncCall<_Ty>(callFunc: (fr: FileReader) => void): Promise<_Ty> {
		let promise = new Promise<_Ty>(__resolve__ => {
			let fr = new FileReader();
			fr.onload = _ => {
				__resolve__(<_Ty><any>fr.result);
			}
			callFunc(fr);
		});
		return promise;
	}

}
