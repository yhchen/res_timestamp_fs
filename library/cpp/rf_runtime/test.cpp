#if defined(WIN32)
#	define CRTDBG_MAP_ALLOC  
#	include <stdlib.h>  
#	include <crtdbg.h>  
#	ifdef _DEBUG
#		define new   new(_NORMAL_BLOCK, __FILE__, __LINE__)
#	endif
auto __salkdfjalsdjfkasldj = _CrtSetDbgFlag(_CrtSetDbgFlag(_CRTDBG_REPORT_FLAG) | _CRTDBG_LEAK_CHECK_DF);
#endif // defined(WIN32)

#include "rf_runtime.h"
#include <ctime>

int main(const char** args, int argc)
{
	rf_runtime::setDefaultLogFunc(nullptr);

	const auto startTick = clock();
	rf_runtime::rf_helper helper_old;
	helper_old.read_from_file("../../../test/1.timestamp");

	rf_runtime::rf_helper helper_new;
	helper_new.read_from_file("../../../test/2.timestamp");

	rf_runtime::CompareDiff diffData;
	helper_old.compare(helper_new, diffData);

	const auto endTick = clock();
	const auto totalUseTick = endTick - startTick;
	printf("read file total use tick %d ms\n", totalUseTick);
	return 0;
}
