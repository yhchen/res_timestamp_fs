
// get object member count
export function count(o: any) {
	let t = typeof o;
	if (t == 'string') {
		return o.length;
	} else if (t == 'object') {
		let n = 0;
		for (let _ in o) {
			n++;
		}
		return n;
	}
	return 0;
}

export function compareStr(a: string, b: string): number {
	if (a.length != b.length) return a.length > b.length ? 1 : -1;
	if (a == b) return 0;
	for (let i = Math.min(a.length, b.length) - 1; i > -1; --i) {
		const aa = a.charCodeAt(i);
		const bb = b.charCodeAt(i);
		if (aa != bb) return aa - bb;
	}
	return 0;
}

export class AsyncWorkMonitor {
	public addWork(cnt: number = 1) {
		this._leftCnt += cnt;
	}
	public decWork(cnt: number = 1) {
		this._leftCnt -= cnt;
	}
	public async WaitAllWorkDone(): Promise<boolean> {
		if (this._leftCnt <= 0)
			return true;
		while (true) {
			if (this._leftCnt <= 0) {
				return true;
			}
			await this.delay()
		}
	}
	public async delay(ms: number = 0) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
	private _leftCnt = 0;
}
