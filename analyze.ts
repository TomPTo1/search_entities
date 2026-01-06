#!/usr/bin/env npx tsx

import {
	findHomepage,
	discoverSiteUrls,
	analyzeUrls,
	fillGaps
} from './lib/gemini-client';
import {
	SYSTEM_PROMPT_FIND_HOMEPAGE,
	SYSTEM_PROMPT_DISCOVER_URLS,
	SYSTEM_PROMPT_BRAND_ANALYZE,
	SYSTEM_PROMPT_FILL_GAPS
} from './lib/prompts';
import type { BrandAnalyzeResult, BrandAnalyzeResponse } from './lib/types';
import { jsonrepair } from 'jsonrepair';

// 빈 필드 검사 대상
const OPTIONAL_FIELDS = [
	'foundedYear',
	'brandConcept',
	'mainExportCountries',
	'awards',
	'certifications',
	'manufacturingCountry',
	'manufacturingType',
	'history'
];

function getEmptyFields(result: BrandAnalyzeResult): string[] {
	const emptyFields: string[] = [];

	for (const field of OPTIONAL_FIELDS) {
		const value = result[field as keyof BrandAnalyzeResult];
		if (value === null || value === undefined) {
			emptyFields.push(field);
		} else if (Array.isArray(value) && value.length === 0) {
			emptyFields.push(field);
		}
	}

	return emptyFields;
}

function extractDomain(url: string): string {
	try {
		const parsed = new URL(url);
		return parsed.hostname;
	} catch {
		return url;
	}
}

async function main() {
	const brandName = process.argv[2];
	let homepageUrl = process.argv[3];
	const previousInteractionId = process.argv[4];

	if (!brandName) {
		console.error('Usage: npx tsx scripts/brand/analyze.ts <브랜드명> [홈페이지URL] [interactionId]');
		console.error('Example: npx tsx scripts/brand/analyze.ts "설화수" "https://www.sulwhasoo.com"');
		console.error('Example: npx tsx scripts/brand/analyze.ts "설화수"  # URL 자동 탐색');
		console.error('Example: npx tsx scripts/brand/analyze.ts "설화수" "" "interaction_xxx"  # 검색 연결');
		process.exit(1);
	}

	console.error(`[INFO] 브랜드명: ${brandName}`);
	if (previousInteractionId) {
		console.error(`[INFO] 이전 interactionId: ${previousInteractionId}`);
	}

	try {
		let currentInteractionId = previousInteractionId;

		// ============ Phase 1: URL 확보 ============

		// 1-1. 홈페이지 URL이 없으면 탐색
		if (!homepageUrl) {
			console.error('[Phase 1-1] 홈페이지 URL 탐색 중...');
			const homepageResult = await findHomepage(
				brandName,
				SYSTEM_PROMPT_FIND_HOMEPAGE,
				currentInteractionId
			);

			const urlMatch = homepageResult.text.match(/https?:\/\/[^\s"'<>]+/);
			if (!urlMatch) {
				throw new Error('공식 홈페이지를 찾을 수 없습니다.');
			}

			homepageUrl = urlMatch[0];
			currentInteractionId = homepageResult.interactionId;
			console.error(`[Phase 1-1] 홈페이지 발견: ${homepageUrl}`);
		}

		// 1-2. site: 검색으로 관련 URL 탐색
		console.error('[Phase 1-2] 사이트 내 URL 탐색 중...');
		const domain = extractDomain(homepageUrl);
		const urlsResult = await discoverSiteUrls(
			domain,
			SYSTEM_PROMPT_DISCOVER_URLS,
			currentInteractionId
		);
		currentInteractionId = urlsResult.interactionId;

		// URL 목록 추출
		let urls: string[] = [homepageUrl];
		try {
			const urlsJson = urlsResult.text.match(/\{[\s\S]*\}/);
			if (urlsJson) {
				const parsed = JSON.parse(jsonrepair(urlsJson[0]));
				if (Array.isArray(parsed.urls)) {
					urls = [...new Set([homepageUrl, ...parsed.urls])];
				}
			}
		} catch {
			console.error('[Phase 1-2] URL 파싱 실패, 홈페이지만 분석');
		}

		console.error(`[Phase 1-2] 분석할 URL ${urls.length}개`);
		urls.slice(0, 5).forEach(u => console.error(`  - ${u}`));
		if (urls.length > 5) console.error(`  ... 외 ${urls.length - 5}개`);

		// ============ Phase 2: URL Context 분석 ============

		console.error('[Phase 2] URL Context 분석 중...');
		const analyzeResult = await analyzeUrls(
			brandName,
			urls.slice(0, 10),
			SYSTEM_PROMPT_BRAND_ANALYZE,
			currentInteractionId
		);
		currentInteractionId = analyzeResult.interactionId;

		// 1차 결과 파싱
		const jsonMatch = analyzeResult.text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error('JSON not found in response');
		}
		let result: BrandAnalyzeResult = JSON.parse(jsonrepair(jsonMatch[0]));
		console.error('[Phase 2] 1차 분석 완료');

		// ============ Phase 3: 빈 필드 보충 ============

		const emptyFields = getEmptyFields(result);

		if (emptyFields.length > 0) {
			console.error(`[Phase 3] 빈 필드 보충 중: ${emptyFields.join(', ')}`);

			const fillResult = await fillGaps(
				brandName,
				emptyFields,
				SYSTEM_PROMPT_FILL_GAPS,
				currentInteractionId
			);
			currentInteractionId = fillResult.interactionId;

			// 보충 결과 병합
			try {
				const fillJson = fillResult.text.match(/\{[\s\S]*\}/);
				if (fillJson) {
					const filled = JSON.parse(jsonrepair(fillJson[0]));
					result = { ...result, ...filled };
				}
			} catch {
				console.error('[Phase 3] 보충 결과 파싱 실패');
			}

			console.error('[Phase 3] 보충 완료');
		} else {
			console.error('[Phase 3] 빈 필드 없음, 보충 생략');
		}

		// ============ 최종 출력 ============

		const response: BrandAnalyzeResponse = {
			result,
			interactionId: currentInteractionId
		};

		console.log(JSON.stringify(response, null, 2));
		console.error(`[INFO] 분석 완료: ${result.brandName} (${result.country})`);
		console.error(`[INFO] 최종 interactionId: ${currentInteractionId}`);

	} catch (error) {
		console.error('[ERROR]', error instanceof Error ? error.message : error);
		process.exit(1);
	}
}

main();
