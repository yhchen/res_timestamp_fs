#pragma once

#include <vector>
#include <string.h>

namespace rf_runtime
{
	struct CompareDiff
	{
		struct FileInfo
		{
			std::string filename;
			unsigned int size;
			unsigned int crc;
		};

		std::vector<FileInfo> vNewFiles;
		std::vector<FileInfo> vChangedFiles;
	};

	class rf_helper
	{
	public:
		rf_helper();
		~rf_helper();

	public:
		bool read_from_file(const char* file);
		bool read_from_data(const void* data, const size_t size);
		bool compare(rf_helper& other, /*OUT*/CompareDiff& diff);

		struct RFFileInfo;
	private:
		std::vector<RFFileInfo*> _vInfos;
	};
}