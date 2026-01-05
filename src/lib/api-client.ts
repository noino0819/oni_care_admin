// ============================================
// API 클라이언트 설정
// ============================================
// FastAPI 백엔드 연동

// API 기본 URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

// API 버전 접두사
const API_VERSION = '/api/v1';

/**
 * API 요청 옵션 타입
 */
interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * API 응답 타입
 */
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 토큰 가져오기
 */
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

/**
 * 토큰 설정하기
 */
export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('admin_token', token);
  }
}

/**
 * 토큰 삭제하기
 */
export function removeToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('admin_token');
  }
}

/**
 * 쿼리 파라미터를 URL 문자열로 변환
 */
function buildQueryString(params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return '';
  
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * API 요청 함수
 */
async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { body, params, headers: customHeaders, ...restOptions } = options;
  
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...customHeaders,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  const url = `${API_BASE_URL}${API_VERSION}${endpoint}${buildQueryString(params)}`;
  
  const response = await fetch(url, {
    ...restOptions,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  // 401 에러 시 토큰 삭제 및 로그인 페이지로 이동
  if (response.status === 401) {
    removeToken();
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    throw new Error('인증이 필요합니다.');
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || data.detail?.message || '요청 처리 중 오류가 발생했습니다.');
  }
  
  return data;
}

/**
 * API 클라이언트 객체
 */
export const apiClient = {
  /**
   * GET 요청
   */
  get: <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined | null>) =>
    request<T>(endpoint, { method: 'GET', params }),
  
  /**
   * POST 요청
   */
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'POST', body }),
  
  /**
   * PUT 요청
   */
  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PUT', body }),
  
  /**
   * PATCH 요청
   */
  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body }),
  
  /**
   * DELETE 요청
   */
  delete: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'DELETE', body }),
};

/**
 * SWR용 fetcher 함수
 */
export const swrFetcher = async (url: string) => {
  const token = getToken();
  
  const response = await fetch(`${API_BASE_URL}${API_VERSION}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  
  if (response.status === 401) {
    removeToken();
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    throw new Error('인증이 필요합니다.');
  }
  
  if (!response.ok) {
    throw new Error('데이터를 불러오는데 실패했습니다.');
  }
  
  return response.json();
};

/**
 * API 기본 URL 반환
 */
export function getApiBaseUrl(): string {
  return `${API_BASE_URL}${API_VERSION}`;
}

export default apiClient;

