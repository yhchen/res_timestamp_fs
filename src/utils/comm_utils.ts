
// get object member count
export function count(o: any) {
	let t = typeof o;
	if(t == 'string') {
			return o.length;
	}else if(t == 'object') {
			let n = 0;
			for(let _ in o) {
					n++;
			}
			return n;
	}
	return 0;
}
