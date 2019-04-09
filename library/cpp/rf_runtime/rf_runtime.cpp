#include "rf_runtime.h"
#include "rf_runtime_imp.hpp"
#include "compression_utils.hpp"

namespace rf_runtime
{
	enum class EFileVersion : unsigned int
	{
		V1 = 0x01190404,

		VCURRENT = V1
	};

	union IDENT_Type {
		char s[4];
		unsigned int ui;
	};

	static const IDENT_Type FILE_IDENT = {"FTS"};

	struct RFHeaderData
	{
		IDENT_Type IDENT;
		char littleEndian = 0;
		char compressType = 0;
		char __reserve[2] = {}; // reserve
		EFileVersion fileVersion = EFileVersion::VCURRENT;
		unsigned int originDataSize = 0;
		unsigned int compressionDataSize = 0;
		unsigned int stringDataSize = 0;
		unsigned int stringDataCount = 0;
		unsigned int fileInfoDataSize = 0;
		unsigned int fileInfoDataCount = 0;
		char __reserve_end[28] = {};
	};
	static_assert(sizeof(RFHeaderData) == 64, "header size must be 64");

	struct rf_helper::RFFileInfo
	{
		const char* spath = nullptr;
		const char* sname = nullptr;
		unsigned int crcvalue = 0;
		unsigned int filesize = 0;
	};

	rf_helper::rf_helper()
	{
	}

	rf_helper::~rf_helper()
	{
		while (_alloc_list)
		{
			free(_alloc_list->data);
			const auto curr_node = _alloc_list;
			_alloc_list = _alloc_list->prev;
			free(curr_node);
		}
		_vInfos.clear();
		if (_stringBuffers) {
			free((void*)_stringBuffers);
			_stringBuffers = nullptr;
		}
	}

	bool rf_helper::read_from_file(const char* file)
	{
		FILE* fd = fopen(file, "rb");
		if (!fd) {
			return false;
		}
		fseek(fd, 0L, SEEK_END);
		const auto filesize = ftell(fd);
		fseek(fd, 0L, SEEK_SET);
		auto buffer = rf_runtime_impl::CAutoRelBuffer(filesize);
		fread(buffer, filesize, 1, fd);
		fclose(fd); fd = nullptr;
		return read_from_data(buffer, filesize);
	}

	bool rf_helper::read_from_data(const void* data, const size_t size)
	{
		RFHeaderData header;
		if (size < sizeof(header)) {
			printf("file size incorrect(header size not enought)!");
			return false;
		}
		rf_runtime_impl::CSampleBufferReader headerReader(data, size, 0);
		headerReader.readBuffer(&header.IDENT, sizeof(header.IDENT));
		if (header.IDENT.ui != FILE_IDENT.ui) {
			printf("file ident incorrect! expcet : [%s] current : [%4s]", FILE_IDENT.s, header.IDENT.s);
			return false;
		}

		headerReader.readAtom(header.littleEndian);
		headerReader.setLittleEndian(header.littleEndian);
		printf("file endian mode : %s", header.littleEndian ? "Little endian" : "Big endian");
		headerReader.readAtom(header.compressType);
		headerReader.readBuffer(header.__reserve, sizeof(header.__reserve));
		headerReader.readAtom((unsigned int&)header.fileVersion);
		if (header.fileVersion != EFileVersion::VCURRENT) {
			printf("file version : %x not match target file version :%x", header.fileVersion, EFileVersion::VCURRENT);
			return false;
		}

		headerReader.readAtom(header.originDataSize);
		headerReader.readAtom(header.compressionDataSize);
		headerReader.readAtom(header.stringDataSize);
		headerReader.readAtom(header.stringDataCount);
		headerReader.readAtom(header.fileInfoDataSize);
		headerReader.readAtom(header.fileInfoDataCount);
		headerReader.setOffset(sizeof(RFHeaderData));

		// FIXME £ºadd code here
		const void* data_buffer = headerReader.offsetPtr();
		unsigned int data_size = headerReader.available();
		bool need_free_buffer = false;
		if (header.compressType != 0)
		{
			if (headerReader.available() != header.compressionDataSize)
			{
				printf("uncompress file size not match(current : %d expect : %d).", headerReader.available(), header.originDataSize);
				return false;
			}
			const void* decompression_buffer = headerReader.offsetPtr();
			unsigned int decompression_size = headerReader.available();
			if (!rf_runtime_impl_miniz::decompress_zip_stream(headerReader.offsetPtr(), header.compressionDataSize, decompression_size, &decompression_buffer, 0)) {
				return false;
			}
			data_buffer = decompression_buffer;
			data_size = decompression_size;
			need_free_buffer = true;
		}

		if (data_size != header.originDataSize)
		{
			printf("file size not match(current : %d expect : %d).", data_size, header.originDataSize);
			return false;
		}
		// read string table
		std::vector<const char*> vStringTable(header.stringDataCount);
		_stringBuffers = (const char*)malloc(header.stringDataSize);
		memcpy((void*)_stringBuffers, data_buffer, header.stringDataSize);
		auto stringReader = rf_runtime_impl::CSampleBufferReader(_stringBuffers, header.stringDataSize);
		const char** stringData = vStringTable.data();
		{
			for (unsigned int i = 0; i < header.stringDataCount; ++i)
			{
				const char* p = stringReader.readStrLT255();
				if (p == nullptr)
				{
					printf("string table data error.");
					return false;
				}
				stringData[i] = p;
			}
		}
		// read file info
		rf_runtime_impl::CSampleBufferReader dataReader(data_buffer, header.fileInfoDataSize, header.stringDataSize, header.littleEndian);
		if (dataReader.available() < header.fileInfoDataSize)
		{
			printf("file data size not match(current : %d expect : %d).", dataReader.available(), header.fileInfoDataSize);
			return false;
		}
		{
			RFFileInfo* infoLst = allocFileInfo(header.fileInfoDataCount);
			_vInfos.resize(header.fileInfoDataCount);
			const RFFileInfo** fileData = (const RFFileInfo**)_vInfos.data();
			for (unsigned int i = 0; i < header.fileInfoDataCount; ++i) {
				auto* pData = &infoLst[i];
				unsigned short nPathIdx = 0, nNameIdx = 0;
				dataReader.readAtom(nPathIdx).readAtom(nNameIdx).readAtom(pData->crcvalue).readAtom(pData->filesize);
				pData->spath = stringData[nPathIdx];
				pData->sname = stringData[nNameIdx];
				fileData[i] = pData;
			}
		}
		if (need_free_buffer) {
			free((void*)data_buffer); data_buffer = nullptr;
		}
		return true;
	}

	bool rf_helper::compare(rf_helper& other, /*OUT*/CompareDiff& diff)
	{
		// FIXME £ºadd code here
		return false;
	}

	rf_helper::RFFileInfo* rf_helper::allocFileInfo(int count, bool auto_memset/* = false*/)
	{
		const size_t mem_size = sizeof(RFFileInfo) * count;
		RFFileInfo* infoLst = (RFFileInfo*)malloc(mem_size);
		auto new_node = (alloc_list*)malloc(sizeof(alloc_list));
		if (_alloc_list == nullptr) {
			_alloc_list = new_node;
			new_node->prev = nullptr;
		}
		else {
			new_node->prev = _alloc_list;
			_alloc_list = new_node;
		}
		new_node->data = infoLst;
		if (auto_memset) memset(infoLst, 0, mem_size);
		return infoLst;
	}
}