import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) throw new Error('GOOGLE_API_KEY not found in .env');

const client = new GoogleGenAI({ apiKey });

// ============ 타입 정의 ============

interface InteractionOutput {
	type: string;
	text?: string;
}

interface InteractionResponse {
	id?: string;
	outputs?: InteractionOutput[];
}

export interface GeminiResult {
	text: string;
	interactionId: string;
}

// ============ 헬퍼 함수 ============

function extractTextAndId(response: InteractionResponse): GeminiResult {
	const outputs = response.outputs || [];
	for (const output of outputs) {
		if (output.type === 'text' && output.text) {
			return {
				text: output.text,
				interactionId: response.id || ''
			};
		}
	}
	throw new Error('No text output from Gemini');
}

// ============ 검색 API ============

/**
 * 탐색기 검색 (Google Search)
 */
export async function searchBrands(
	query: string,
	systemPrompt: string,
	temperature?: number
): Promise<GeminiResult> {
	const response = await client.interactions.create({
		model: 'gemini-flash-latest',
		input: `검색어: ${query}\n\n위 검색어와 관련된 브랜드와 회사를 찾아주세요.`,
		system_instruction: systemPrompt,
		tools: [{ type: 'google_search' }],
		stream: false,
		...(temperature !== undefined && { temperature })
	}) as InteractionResponse;

	return extractTextAndId(response);
}

// ============ 분석 API - Phase 1 ============

/**
 * 홈페이지 URL 탐색 (Google Search)
 */
export async function findHomepage(
	brandName: string,
	systemPrompt: string,
	previousInteractionId?: string,
	temperature?: number
): Promise<GeminiResult> {
	const response = await client.interactions.create({
		model: 'gemini-flash-latest',
		input: `브랜드명: ${brandName}\n\n이 브랜드의 공식 홈페이지 URL을 찾아주세요.`,
		system_instruction: systemPrompt,
		tools: [{ type: 'google_search' }],
		stream: false,
		...(previousInteractionId && { previous_interaction_id: previousInteractionId }),
		...(temperature !== undefined && { temperature })
	}) as InteractionResponse;

	return extractTextAndId(response);
}

/**
 * 사이트 내 URL 탐색 (Google Search site: 검색)
 */
export async function discoverSiteUrls(
	domain: string,
	systemPrompt: string,
	previousInteractionId?: string,
	temperature?: number
): Promise<GeminiResult> {
	const response = await client.interactions.create({
		model: 'gemini-flash-latest',
		input: `도메인: ${domain}\n\n이 사이트에서 브랜드 정보(소개, 연혁, 수상, 인증 등)가 담긴 페이지 URL을 찾아주세요.\n\n검색 쿼리 예시: site:${domain} about OR history OR brand OR company OR story OR awards`,
		system_instruction: systemPrompt,
		tools: [{ type: 'google_search' }],
		stream: false,
		...(previousInteractionId && { previous_interaction_id: previousInteractionId }),
		...(temperature !== undefined && { temperature })
	}) as InteractionResponse;

	return extractTextAndId(response);
}

// ============ 분석 API - Phase 2 ============

/**
 * 다중 URL 분석 (URL Context)
 */
export async function analyzeUrls(
	brandName: string,
	urls: string[],
	systemPrompt: string,
	previousInteractionId?: string,
	temperature?: number
): Promise<GeminiResult> {
	const urlList = urls.join('\n');

	const response = await client.interactions.create({
		model: 'gemini-flash-latest',
		input: `브랜드명: ${brandName}\n\n분석할 URL 목록:\n${urlList}\n\n위 페이지들에서 브랜드 상세 정보를 추출해주세요.`,
		system_instruction: systemPrompt,
		tools: [{ type: 'url_context' }],
		stream: false,
		...(previousInteractionId && { previous_interaction_id: previousInteractionId }),
		...(temperature !== undefined && { temperature })
	}) as InteractionResponse;

	return extractTextAndId(response);
}

// ============ 분석 API - Phase 3 ============

/**
 * 빈 필드 보충 (Google Search)
 */
export async function fillGaps(
	brandName: string,
	emptyFields: string[],
	systemPrompt: string,
	previousInteractionId: string,
	temperature?: number
): Promise<GeminiResult> {
	const fieldsStr = emptyFields.join(', ');

	const response = await client.interactions.create({
		model: 'gemini-flash-latest',
		input: `브랜드명: ${brandName}\n\n다음 필드가 비어있습니다: ${fieldsStr}\n\n웹 검색으로 이 정보들을 찾아주세요.`,
		system_instruction: systemPrompt,
		tools: [{ type: 'google_search' }],
		stream: false,
		previous_interaction_id: previousInteractionId,
		...(temperature !== undefined && { temperature })
	}) as InteractionResponse;

	return extractTextAndId(response);
}
