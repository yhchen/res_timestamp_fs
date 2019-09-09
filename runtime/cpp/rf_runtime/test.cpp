#if defined(WIN32)
#	define CRTDBG_MAP_ALLOC  
#	include <windows.h>
#	include <stdlib.h>  
#	include <crtdbg.h>  
#	ifdef _DEBUG
#		define new   new(_NORMAL_BLOCK, __FILE__, __LINE__)
#	endif
auto __salkdfjalsdjfkasldj = _CrtSetDbgFlag(_CrtSetDbgFlag(_CRTDBG_REPORT_FLAG) | _CRTDBG_LEAK_CHECK_DF);
#endif // defined(WIN32)

#include "rf_runtime.h"
#include <assert.h>
#include <ctime>

void debugLog(const char* fmt, ...)
{
	static const size_t TmpStrSize = 4096;
	thread_local static char outstr[TmpStrSize] = {};

	va_list args;
	va_start(args, fmt);
	int result = vsnprintf(outstr, TmpStrSize, fmt, args);
	va_end(args);
	if (result + 1 < TmpStrSize) {
		outstr[result] = '\n';
		outstr[result + 1] = '\0';
	}

#if defined(_WIN32)
	OutputDebugStringA(outstr);
#endif
	printf(outstr);
}

int main(const char** args, int argc)
{
	rf_runtime::setDefaultLogFunc(nullptr);

	auto startReadDataTime = clock();
	rf_runtime::rf_helper helper_old;
	assert(helper_old.read_from_file("../../../test/old.timestamp"));

	rf_runtime::rf_helper helper_new;
	assert(helper_new.read_from_file("../../../test/new.timestamp"));
	auto endReadTime = clock();
	const auto totalReadDataUseTick = endReadTime - startReadDataTime;
	debugLog("* read file total use tick %d ms", totalReadDataUseTick);

	auto startCompareTime = clock();
	rf_runtime::CompareDiff diffData;
	helper_old.compare(helper_new, diffData);
	auto endCompareTime = clock();
	const auto totalCompareUseTick = endCompareTime - startCompareTime;
	debugLog("* compare file total use tick %d ms\n\n", totalCompareUseTick);
	debugLog("compare total found changed file : %d. new file : %d.", diffData.vChangedFiles.size(), diffData.vNewFiles.size());

	printf("new file list : \n");
	for (auto change : diffData.vNewFiles)
	{
		printf("file : [%s] size : %d crc : %u\n", change.filename.c_str(), change.size, change.crc);
	}
	printf("change file list : \n");
	for (auto change : diffData.vChangedFiles)
	{
		printf("file : [%s] size : %d crc : %u\n", change.filename.c_str(), change.size, change.crc);
	}
	return 0;
}
