#include "rf_runtime.h"

int main(const char** args, int argc) {
	rf_runtime::rf_helper helper;
	helper.read_from_file("../../../test/res.timestamp");
	return 0;
}
