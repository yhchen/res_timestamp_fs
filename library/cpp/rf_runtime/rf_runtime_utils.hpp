#pragma once

#include <stdarg.h>
#include <stdio.h>

#if defined(_WIN32)
#	include <windows.h>
#endif

namespace rf_runtime_inn_impl
{
	typedef void(logFuncFmt(const char const* fmt, ...));
	extern logFuncFmt* log;
}