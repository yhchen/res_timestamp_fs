#pragma once

#include <iostream>
#include "convert_endian.hpp"

namespace rf_runtime_impl
{
	// auto release buffer
	class CAutoRelBuffer
	{
	public:
		CAutoRelBuffer(const size_t len) { _buffer = malloc(len); }
		~CAutoRelBuffer() { if (!_buffer) { free(_buffer); _buffer = nullptr; } }
		operator void* () { return _buffer; }
	private:
		void* _buffer = nullptr;
	};

	// buffer reader
	class CSampleBufferReader
	{
	public:
		CSampleBufferReader(const void* buffer, size_t size, size_t offset = 0, bool littleEndian = true)
			: _data((char*)buffer), _end(_data + size), _offset(_data + offset), _littleEndian(littleEndian)
		{ }

		template<typename _Ty> CSampleBufferReader& readAtom(_Ty& ty)
		{
			if ((_end - _offset) < sizeof(_Ty))
				return *this;
			memcpy(&ty, _offset, sizeof(ty));
			_offset += sizeof(ty);
			ty = _littleEndian ? LEtoNative(ty) : BEtoNative(ty);
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
}
