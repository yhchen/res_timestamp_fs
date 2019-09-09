#pragma once

#include "miniz/miniz.h"
#include "miniz/miniz_zip.h"
#include "rf_runtime_imp.hpp"

namespace rf_runtime_impl_miniz
{
	static const char* ZipStreamFileName = "ZipBytes";

	bool decompress_zip_stream(const void* pMem, size_t size, unsigned int& decompress_size, const void** decompression_buffer, mz_uint flags, mz_zip_error* pErr = nullptr)
	{
		mz_zip_archive zip;
		mz_zip_error actual_err = MZ_ZIP_NO_ERROR;
		if (pErr == nullptr) pErr = &actual_err;

		if (!mz_zip_validate_mem_archive(pMem, size, flags, pErr))
		{
			rf_runtime_inn_impl::log("zip file invalid(%s)", mz_zip_get_error_string(*pErr));
			return false;
		}

		if ((!pMem) || (!size))
		{
			if (pErr)
				*pErr = MZ_ZIP_INVALID_PARAMETER;
			return false;
		}

		mz_zip_zero_struct(&zip);

		if (!mz_zip_reader_init_mem(&zip, pMem, size, flags))
		{
			if (pErr)
				*pErr = zip.m_last_error;
			return false;
		}
		int file_idx = mz_zip_reader_locate_file(&zip, ZipStreamFileName, nullptr, 0);
		if (file_idx < 0) {
			rf_runtime_inn_impl::log("file name \"%s\" not exist!", ZipStreamFileName);
			return false;
		}
		size_t tmpsz = 0;
		const void* buffers = mz_zip_reader_extract_to_heap(&zip, file_idx, &tmpsz, flags);
		decompress_size = (unsigned int)(tmpsz);
		if (buffers == nullptr) {
			rf_runtime_inn_impl::log("read file \"%s\" failure.(%s)", ZipStreamFileName, mz_zip_get_error_string(mz_zip_get_last_error(&zip)));
			return false;
		}
		*decompression_buffer = buffers;

		mz_zip_reader_end(&zip);

		return true;
	}

	bool inflate_stream(const void* pMem, mz_ulong mem_size, unsigned int origin_size, unsigned int& decompress_size, const void** decompression_buffer, mz_uint flags, mz_zip_error* pErr = nullptr)
	{
		mz_ulong _outsize = origin_size;
		unsigned char* buffers = (unsigned char*)malloc(_outsize);
		const auto is_ok = mz_uncompress(buffers, &_outsize, (const unsigned char*)pMem, mem_size);
		if (is_ok != MZ_OK) {
			rf_runtime_inn_impl::log("decompress zip failure.(%s)", mz_error(is_ok));
			free((void*)buffers);
			return false;
		}
		decompress_size = (unsigned int)_outsize;
		*decompression_buffer = buffers;
		return true;
	}
}