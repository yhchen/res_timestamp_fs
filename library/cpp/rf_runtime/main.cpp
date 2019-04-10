#include "rf_runtime.h"
#include <ctime>

int main(const char** args, int argc)
{
	rf_runtime::setDefaultLogFunc(nullptr);

	const auto startTick = clock();
	rf_runtime::rf_helper helper;
	helper.read_from_file("../../../test/res.timestamp");
	const auto endTick = clock();
	const auto totalUseTick = endTick - startTick;
	printf("read file total use tick %d ms\n", totalUseTick);

	return 0;
}
