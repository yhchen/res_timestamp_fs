#pragma once

#include "miniz/miniz.h"
#include "miniz/miniz_zip.h"

namespace rf_runtime_impl_miniz
{
	static const char* ZipStreamFileName = "ZipBytes";

	bool decompress_zip_stream(const void* pMem, size_t size, unsigned int& decompress_size, const void** decompression_buffer, mz_uint flags, mz_zip_error* pErr = nullptr)
	{
		mz_zip_archive zip;
		mz_zip_error actual_err = MZ_ZIP_NO_ERROR;
		if (pErr == nullptr) pErr = &actual_err;

		if (!mz_zip_validate_mem_archive(pMem, size, flags, pErr)) {
			printf("zip file invalid(%s)", mz_zip_get_error_string(*pErr));
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
			printf("file name \"%s\" not exist!", ZipStreamFileName);
			return false;
		}
		const void* buffers = mz_zip_reader_extract_to_heap(&zip, file_idx, &decompress_size, flags);
		if (buffers == nullptr) {
			printf("read file \"%s\" failure.(%s)", ZipStreamFileName, mz_zip_get_error_string(mz_zip_get_last_error(&zip)));
			return false;
		}
		*decompression_buffer = buffers;

		mz_zip_reader_end(&zip);

		return true;
	}
}