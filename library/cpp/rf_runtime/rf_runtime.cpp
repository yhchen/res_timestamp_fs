#include "rf_runtime.h"
#include "rf_runtime_utils.hpp"
#include "rf_runtime_imp.hpp"
#include "compression_utils.hpp"

#if defined(_WIN32)
#	include <windows.h>
#endif

#if !defined(__max)
#	define __max(x, y) ((x) > (y) ? (x) : (y))
#endif //!defined(__max)

namespace rf_runtime_inn_impl
{
	void defaultPrintfFunc(const char * const fmt, ...)
	{
		static const size_t TmpStrSize = 1024;
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

	logFuncFmt* log = &defaultPrintfFunc;
}

namespace rf_runtime
{
	enum class EFileVersion : unsigned int
	{
		V1 = 0x01190404,

		VCURRENT = V1
	};

	union IDENT_Type
	{
		char s[4];
		unsigned int ui;
	};

	enum EUncompressType
	{
		None = 0,
		Zip = 1,
		Inflate = 2,
		GZip = 3,
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
		unsigned long long hash = 0;
		unsigned int crcvalue = 0;
		unsigned int filesize = 0;
	};
	inline int compareFileInfo(const rf_helper::RFFileInfo& f1, const rf_helper::RFFileInfo& f2)
	{
		return rf_runtime_inn_impl::compareFilePath(f1.spath, f2.spath, f1.sname, f2.sname);
	}

	rf_helper::rf_helper()
		: _pHeader(new RFHeaderData())
	{ }

	rf_helper::~rf_helper()
	{
		_vInfos.clear();
		if (_stringBuffers)
		{
			free((void*)_stringBuffers);
			_stringBuffers = nullptr;
		}
		delete _pHeader; _pHeader = nullptr;
	}

	bool rf_helper::read_from_file(const char* file)
	{
		FILE* fd = fopen(file, "rb");
		if (!fd)
			return false;
		fseek(fd, 0L, SEEK_END);
		const auto filesize = ftell(fd);
		fseek(fd, 0L, SEEK_SET);
		auto buffer = rf_runtime_inn_impl::CAutoRelBuffer(filesize);
		fread(buffer, filesize, 1, fd);
		fclose(fd); fd = nullptr;
		return read_from_data(buffer, filesize);
	}

	bool rf_helper::read_from_data(const void* data, const size_t size)
	{
		if (size < sizeof(_pHeader))
		{
			rf_runtime_inn_impl::log("file size incorrect(header size not enought)!");
			return false;
		}
		rf_runtime_inn_impl::CSampleBufferReader headerReader(data, size, 0);
		headerReader.readBuffer(&_pHeader->IDENT, sizeof(_pHeader->IDENT));
		if (_pHeader->IDENT.ui != FILE_IDENT.ui)
		{
			rf_runtime_inn_impl::log("file ident incorrect! expcet : [%s] current : [%4s]", FILE_IDENT.s, _pHeader->IDENT.s);
			return false;
		}

		headerReader.readAtom(_pHeader->littleEndian);
		headerReader.setLittleEndian(_pHeader->littleEndian);
		rf_runtime_inn_impl::log("Endian Mode : %s", _pHeader->littleEndian ? "Little endian" : "Big endian");
		headerReader.readAtom(_pHeader->compressType);
		headerReader.readBuffer(_pHeader->__reserve, sizeof(_pHeader->__reserve));
		headerReader.readAtom((unsigned int&)_pHeader->fileVersion);
		if (_pHeader->fileVersion != EFileVersion::VCURRENT)
		{
			rf_runtime_inn_impl::log("file version : %x not match target file version :%x", _pHeader->fileVersion, EFileVersion::VCURRENT);
			return false;
		}

		headerReader.readAtom(_pHeader->originDataSize);
		headerReader.readAtom(_pHeader->compressionDataSize);
		headerReader.readAtom(_pHeader->stringDataSize);
		headerReader.readAtom(_pHeader->stringDataCount);
		headerReader.readAtom(_pHeader->fileInfoDataSize);
		headerReader.readAtom(_pHeader->fileInfoDataCount);
		headerReader.setOffset(sizeof(RFHeaderData));

		const void* data_buffer = headerReader.offsetPtr();
		unsigned int data_size = (unsigned int)headerReader.available();
		bool need_free_buffer = false;
		if (_pHeader->compressType != 0)
		{
			if (headerReader.available() != _pHeader->compressionDataSize)
			{
				rf_runtime_inn_impl::log("uncompress file size not match(current : %d expect : %d).", headerReader.available(), _pHeader->originDataSize);
				return false;
			}
			const void* decompression_buffer = headerReader.offsetPtr();
			unsigned int decompression_size = (unsigned int)headerReader.available();
			switch (_pHeader->compressType)
			{
			case EUncompressType::Zip:
				if (!rf_runtime_impl_miniz::decompress_zip_stream(headerReader.offsetPtr(), 
																  _pHeader->compressionDataSize, 
																  decompression_size, 
																  &decompression_buffer, 0))
					return false;
				break;
			case EUncompressType::GZip:
			case EUncompressType::Inflate:
				if (!rf_runtime_impl_miniz::inflate_stream(headerReader.offsetPtr(), 
														   _pHeader->compressionDataSize, 
														   _pHeader->originDataSize,
														   decompression_size, 
														   &decompression_buffer, 0))
					return false;
			}
			data_buffer = decompression_buffer;
			data_size = decompression_size;
			need_free_buffer = true;
		}

		if (data_size != _pHeader->originDataSize)
		{
			rf_runtime_inn_impl::log("file size not match(current : %d expect : %d).", data_size, _pHeader->originDataSize);
			return false;
		}
		// read string table
		std::vector<const char*> vStringTable(_pHeader->stringDataCount);
		_stringBuffers = (const char*)malloc(_pHeader->stringDataSize);
		memcpy((void*)_stringBuffers, data_buffer, _pHeader->stringDataSize);
		auto stringReader = rf_runtime_inn_impl::CSampleBufferReader(_stringBuffers, _pHeader->stringDataSize);
		rf_runtime_inn_impl::log("total load string count : %d			size : %d", _pHeader->stringDataCount, _pHeader->stringDataSize);
		const char** stringData = vStringTable.data();
		{
			for (unsigned int i = 0; i < _pHeader->stringDataCount; ++i)
			{
				const char* p = stringReader.readStrLT255();
				if (p == nullptr)
				{
					rf_runtime_inn_impl::log("string table data error.");
					return false;
				}
				stringData[i] = p;
			}
		}
		// read file info
		rf_runtime_inn_impl::CSampleBufferReader dataReader(data_buffer, _pHeader->fileInfoDataSize, _pHeader->stringDataSize, _pHeader->littleEndian);
		if (dataReader.available() < _pHeader->fileInfoDataSize)
		{
			rf_runtime_inn_impl::log("file data size not match(current : %d expect : %d).", dataReader.available(), _pHeader->fileInfoDataSize);
			return false;
		}
		rf_runtime_inn_impl::log("total load file info count : %d			size : %d", _pHeader->fileInfoDataCount, _pHeader->fileInfoDataSize);
		{
			_vInfos.resize(_pHeader->fileInfoDataCount);
			RFFileInfo* infoLst = (RFFileInfo*)_vInfos.data();
			for (unsigned int i = 0; i < _pHeader->fileInfoDataCount; ++i)
			{
				auto* pData = &infoLst[i];
				unsigned short nPathIdx = 0, nNameIdx = 0;
				dataReader.readAtom(nPathIdx).readAtom(nNameIdx).readAtom(pData->crcvalue).readAtom(pData->filesize);
				pData->spath = stringData[nPathIdx];
				pData->sname = stringData[nNameIdx];
			}
		}
		if (need_free_buffer)
		{
			free((void*)data_buffer); data_buffer = nullptr;
		}
		return true;
	}

	bool rf_helper::compare(const rf_helper& rNewVerHelper, /*OUT*/CompareDiff& diff) const
	{
		thread_local static char stmp[512] = {};
		// 'o' is short for "old". 'n' is short for "new"
		const auto oSZ = _vInfos.size();
		const auto nSZ = rNewVerHelper._vInfos.size();
		size_t oIdx = 0, nIdx = 0;
		bool oEnd = oIdx >= oSZ, nEnd = nIdx >= nSZ;
		const auto oFileInfoList = _vInfos.data();
		const auto nFileInfoList = rNewVerHelper._vInfos.data();

// 		rf_runtime_inn_impl::log("-----------------------------------------------------\n");
// 		for (auto& t : newVerHelper._vInfos)
// 		{
// 			rf_runtime_inn_impl::log("%s/%s\t\t%ud\t\t%ud", t->spath, t->sname, t->crcvalue, t->filesize);
// 		}
// 		rf_runtime_inn_impl::log("-----------------------------------------------------\n");
// 		for (auto& t : _vInfos)
// 		{
// 			rf_runtime_inn_impl::log("%s/%s\t\t%ud\t\t%ud", t->spath, t->sname, t->crcvalue, t->filesize);
// 		}

		while (!nEnd)
		{
			if (!oEnd && !nEnd)
			{
				const auto& oFileInfo = oFileInfoList[oIdx];
				const auto& nFileInfo = nFileInfoList[nIdx];
				const auto cmp = compareFileInfo(oFileInfo, nFileInfo);
				if (cmp == 0)
				{
					if (oFileInfo.crcvalue != nFileInfo.crcvalue || oFileInfo.filesize != nFileInfo.filesize)
					{
						snprintf(stmp, sizeof(stmp), "%s/%s", nFileInfo.spath, nFileInfo.sname);
						diff.vChangedFiles.push_back(CompareDiff::FileInfo({ stmp, nFileInfo.filesize, nFileInfo.crcvalue }));
					}
					++oIdx; ++nIdx;
				}
				else if (cmp > 0)
				{
					snprintf(stmp, sizeof(stmp), "%s/%s", nFileInfo.spath, nFileInfo.sname);
					diff.vNewFiles.push_back(CompareDiff::FileInfo({ stmp, nFileInfo.filesize, nFileInfo.crcvalue }));
					++nIdx;
				}
				else if (cmp < 0)
				{
					++oIdx;
				}
			}
			else if (oEnd)
			{
				const auto& npD = nFileInfoList[nIdx];
				snprintf(stmp, sizeof(stmp), "%s/%s", npD.spath, npD.sname);
				diff.vNewFiles.push_back(CompareDiff::FileInfo({stmp, npD.filesize, npD.crcvalue}));
				++nIdx;
			}
			else
			{
				return false;
			}
			oEnd = oIdx >= oSZ;
			nEnd = nIdx >= nSZ;
		}

		return true;
	}

	void setDefaultLogFunc(logFunc *funcPtr) {
		if (funcPtr) {
			rf_runtime_inn_impl::log = reinterpret_cast<rf_runtime_inn_impl::logFuncFmt*>(funcPtr);
		}
	}
}