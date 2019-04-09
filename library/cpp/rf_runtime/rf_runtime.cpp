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
		for (auto& rInfo : _vInfos)
		{
			delete rInfo;
		}
		_vInfos.clear();
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
		rf_runtime_impl::CSampleBufferReader reader(data, size, 0);
		reader.readBuffer(&header.IDENT, sizeof(header.IDENT));
		if (header.IDENT.ui != FILE_IDENT.ui) {
			printf("file ident incorrect! expcet : [%s] current : [%4s]", FILE_IDENT.s, header.IDENT.s);
			return false;
		}

		reader.readAtom(header.littleEndian);
		reader.setLittleEndian(header.littleEndian);
		printf("file endian mode : %s", header.littleEndian ? "Little endian" : "Big endian");
		reader.readAtom(header.compressType);
		reader.readBuffer(header.__reserve, sizeof(header.__reserve));
		reader.readAtom((unsigned int&)header.fileVersion);
		if (header.fileVersion != EFileVersion::VCURRENT) {
			printf("file version : %x not match target file version :%x", header.fileVersion, EFileVersion::VCURRENT);
			return false;
		}

		reader.readAtom(header.originDataSize);
		reader.readAtom(header.compressionDataSize);
		reader.readAtom(header.stringDataSize);
		reader.readAtom(header.stringDataCount);
		reader.readAtom(header.fileInfoDataSize);
		reader.readAtom(header.fileInfoDataCount);
		reader.setOffset(sizeof(RFHeaderData));

		// FIXME £ºadd code here
		if (header.compressType != 0)
		{
			if (reader.available() != header.compressionDataSize)
			{
				printf("uncompress file size not match(current : %d expect : %d).", reader.available(), header.originDataSize);
				return false;
			}
			rf_runtime_impl_miniz::decompress_zip(reader.offsetPtr(), header.compressionDataSize, 0);
			return false;
		}
		if (reader.available() != header.originDataSize)
		{
			printf("file size not match(current : %d expect : %d).", reader.available(), header.originDataSize);
			return false;
		}
		// read string table
		std::vector<const char*> vStringTable(header.stringDataCount);
		const char** stringData = vStringTable.data();
		{
			for (unsigned int i = 0; i < header.stringDataCount; ++i)
			{
				const char* p = reader.readStrLT255();
				if (p == nullptr)
				{
					printf("string table data error.");
					return false;
				}
				stringData[i] = p;
			}
		}
		// read file info
		if (reader.available() < header.fileInfoDataSize)
		{
			printf("file data size not match(current : %d expect : %d).", reader.available(), header.fileInfoDataSize);
			return false;
		}
		{
			RFFileInfo* infoLst = new RFFileInfo[header.fileInfoDataCount];
			_vInfos.resize(header.fileInfoDataCount);
			const RFFileInfo** fileData = (const RFFileInfo**)_vInfos.data();
			for (unsigned int i = 0; i < header.fileInfoDataCount; ++i) {
				auto* pData = &infoLst[i];
				unsigned short nPathIdx = 0, nNameIdx = 0;
				reader.readAtom(nPathIdx).readAtom(nNameIdx).readAtom(pData->crcvalue).readAtom(pData->filesize);
				pData->spath = stringData[nPathIdx];
				pData->sname = stringData[nNameIdx];
				fileData[i] = pData;
			}
		}

		return true;
	}

	bool rf_helper::compare(rf_helper& other, /*OUT*/CompareDiff& diff)
	{
		// FIXME £ºadd code here
		return false;
	}
}