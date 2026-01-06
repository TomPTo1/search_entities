#!/usr/bin/env npx tsx

import { searchBrands } from './lib/gemini-client';
import { SYSTEM_PROMPT_BRAND_SEARCH } from './lib/prompts';
import type { BrandSearchResult, BrandSearchResponse } from './lib/types';
import { jsonrepair } from 'jsonrepair';

async function main() {
	const query = process.argv[2];

	if (!query) {
		console.error('Usage: npx tsx scripts/brand/search.ts <검색어>');
		console.error('Example: npx tsx scripts/brand/search.ts "설화수"');
		process.exit(1);
	}

	console.error(`[INFO] 검색어: ${query}`);
	console.error('[INFO] Gemini API 호출 중...');

	try {
		const { text, interactionId } = await searchBrands(query, SYSTEM_PROMPT_BRAND_SEARCH);

		// JSON 추출 및 복구
		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error('JSON not found in response');
		}

		const repairedJson = jsonrepair(jsonMatch[0]);
		const result: BrandSearchResult = JSON.parse(repairedJson);

		// 응답에 interactionId 포함
		const response: BrandSearchResponse = {
			result,
			interactionId
		};

		// 결과 출력 (stdout)
		console.log(JSON.stringify(response, null, 2));

		console.error(`[INFO] 브랜드 ${result.brands.length}개, 회사 ${result.companies.length}개 발견`);
		console.error(`[INFO] interactionId: ${interactionId}`);
	} catch (error) {
		console.error('[ERROR]', error instanceof Error ? error.message : error);
		process.exit(1);
	}
}

main();
