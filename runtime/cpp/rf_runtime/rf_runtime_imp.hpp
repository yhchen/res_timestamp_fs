#pragma once

#include <iostream>
#include "convert_endian.hpp"
#include "rf_runtime_utils.hpp"

namespace rf_runtime_inn_impl
{
	// auto release buffer
	class CAutoRelBuffer
	{
	public:
		CAutoRelBuffer(const size_t len) { _buffer = malloc(len); }
		~CAutoRelBuffer() { if (_buffer) { free(_buffer); _buffer = nullptr; } }
		operator void* () { return _buffer; }
	private:
		void* _buffer = nullptr;
	};

	// buffer reader
	class CSampleBufferReader
	{
	public:
		CSampleBufferReader(const void* buffer, size_t size, size_t offset = 0, bool littleEndian = true)
			: _data((char*)buffer+offset), _end(_data + size), _offset(_data), _littleEndian(littleEndian)
		{ }

		template<typename _Ty> CSampleBufferReader& readAtom(_Ty& ty)
		{
			if ((_end - _offset) < sizeof(_Ty))
				return *this;
			memcpy(&ty, _offset, sizeof(ty));
			_offset += sizeof(ty);
			ty = _littleEndian ? LEtoNative<_Ty>(ty) : BEtoNative<_Ty>(ty);
			return *this;
		}

		const char* readString() {
			unsigned short l = 0;
			readAtom(l);
			++l;
			if (available() < l) return "";
			const char* ptr = _offset;
			_offset += l;
			return ptr;
		}

		void readBuffer(void* buff, size_t size)
		{
			if (available() < size) {
				memset(buff, 0, size);
				return;
			}
			memcpy(buff, _offset, size);
			_offset += size;
		}

		const char* readStrLT255() {
			unsigned char l = 0;
			readAtom(l);
			++l;
			if (available() < l) return "";
			const char* ptr = _offset;
			_offset += l;
			return ptr;
		}

		inline void setOffset(size_t offset) {
			_offset = _data + offset;
			if (_offset > _end) _offset = _end;
		}

		inline const void* ptr() const { return this->_data; }
		inline const void* offsetPtr() const { return this->_offset; }
		inline const size_t available() const { return this->_end - this->_offset; }
		inline const void setLittleEndian(bool v) { this->_littleEndian = v; }

	private:
		const char* _data;
		const char* _offset;
		const char* _end;
		bool _littleEndian;
	};

	inline unsigned int stringHash(const char* s)
	{
		unsigned int hash = 5381;
		int c = 0;
		while (c = *s++)
			hash = ((hash << 5) + hash) + c; /* hash * 33 + c */
		return hash;
	}

	template <typename _Ty> inline _Ty _min(const _Ty& x, const _Ty&y) { return x > y ? y : x; }
	template <typename _Ty> inline _Ty _max(const _Ty& x, const _Ty&y) { return x > y ? x : y; }

	inline int compareStr(const char* a, const char* b)
	{
		size_t alen = 0;
		if (a) alen = strlen(a);
		size_t blen = 0;
		if (b) blen = strlen(b);

		if (alen != blen)
			return ((alen > blen) ? 1 : -1);

		for (int i = (int)_min(alen, blen) - 1; i > -1; --i)
		{
			const auto aa = a[i];
			const auto bb = b[i];
			if (aa != bb) return aa - bb;
		}
		return 0;
	}

	inline int compareFilePath(const char* tdir, const char* sdir, const char* tname, const char* sname)
	{
		const auto cmp = compareStr(tdir, sdir);
		if (cmp != 0) return cmp;
		return compareStr(tname, sname);
	}
}
