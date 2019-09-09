#pragma once

#include <stdarg.h>
#include <stdio.h>

namespace rf_runtime_inn_impl
{
	typedef void(logFuncFmt(const char*const fmt, ...));
	extern logFuncFmt* log;
}