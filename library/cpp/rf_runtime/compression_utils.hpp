#pragma once

#include "miniz/miniz.h"
#include "miniz/miniz_zip.h"

namespace rf_runtime_impl_miniz
{
	bool decompress_zip(const void* pMem, size_t size, mz_uint flags, mz_zip_error* pErr = nullptr)
	{

		mz_zip_archive zip;
		mz_bool success = MZ_TRUE;
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
			return MZ_FALSE;
		}

		mz_zip_zero_struct(&zip);

		if (!mz_zip_reader_init_mem(&zip, pMem, size, flags))
		{
			if (pErr)
				*pErr = zip.m_last_error;
			return MZ_FALSE;
		}
		mz_zip_reader_end(&zip);

		return true;
	}
}