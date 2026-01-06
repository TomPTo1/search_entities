// 탐색기 검색 결과
export interface BrandSearchResult {
	brands: Brand[];
	companies: Company[];
}

export interface Brand {
	brandName: string;
	brandNameKo: string | null;
	brandNameEn: string | null;
	ownerCompany: string;
	country: string;
	category: string;
	homepage: string | null;
	relationship: '검색대상' | '자매브랜드' | '경쟁브랜드' | '유통브랜드';
}

export interface Company {
	companyName: string;
	companyNameKo: string | null;
	companyNameEn: string | null;
	role: '소유사' | '제조사' | '유통사' | '수입사' | '본사' | '자회사';
	country: string;
	ownedBrands: string[] | null;
	relationship: '검색대상' | '모회사' | '자회사' | '제조사' | '유통사' | '경쟁사';
}

// 분석페이지 결과
export interface BrandAnalyzeResult {
	brandName: string;
	ownerCompany: string;
	foundedYear: number | null;
	brandOverview: string;
	brandConcept: string | null;
	mainExportCountries: string[];
	mainCategories: string[];
	awards: string[];
	certifications: string[];
	country: string;
	manufacturingCountry: string | null;
	homepage: string;
	manufacturingType: '자체생산' | 'OEM' | 'ODM' | '혼합' | null;
	history: { year: number; event: string }[];
}

// 검색 응답 (interactionId 포함)
export interface BrandSearchResponse {
	result: BrandSearchResult;
	interactionId: string;
}

// 분석 응답 (interactionId 포함)
export interface BrandAnalyzeResponse {
	result: BrandAnalyzeResult;
	interactionId: string;
}
