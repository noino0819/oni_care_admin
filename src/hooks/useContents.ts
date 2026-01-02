// ============================================
// 컨텐츠 관리 훅 - SWR 기반 데이터 페칭
// ============================================

import useSWR, { mutate as globalMutate } from 'swr';
import type {
  ContentListItem,
  ContentDetail,
  ContentSearchFilters,
  ContentForm,
  ContentCategory,
  SortConfig,
  ApiResponse,
  PaginationInfo,
} from '@/types';

// 인증 토큰을 포함한 fetcher
const fetcher = async (url: string) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  
  if (!res.ok) {
    throw new Error('데이터를 불러오는데 실패했습니다.');
  }
  
  return res.json();
};

// 검색 필터를 쿼리스트링으로 변환
function filtersToQuery(
  filters: ContentSearchFilters,
  sort: SortConfig,
  page: number,
  pageSize: number
): string {
  const params = new URLSearchParams();
  
  if (filters.title) params.append('title', filters.title);
  if (filters.category_id) params.append('category_id', String(filters.category_id));
  if (filters.tag) params.append('tag', filters.tag);
  if (filters.visibility_scope?.length) params.append('visibility_scope', filters.visibility_scope.join(','));
  if (filters.company_code) params.append('company_code', filters.company_code);
  if (filters.updated_from) params.append('updated_from', filters.updated_from);
  if (filters.updated_to) params.append('updated_to', filters.updated_to);
  if (filters.start_from) params.append('start_from', filters.start_from);
  if (filters.start_to) params.append('start_to', filters.start_to);
  if (filters.has_quote) params.append('has_quote', filters.has_quote);
  
  if (sort.field) {
    params.append('sort_field', sort.field);
    params.append('sort_direction', sort.direction || 'asc');
  }
  
  params.append('page', String(page));
  params.append('page_size', String(pageSize));
  
  return params.toString();
}

interface ContentListResponse {
  success: boolean;
  data: ContentListItem[];
  pagination: PaginationInfo;
}

interface ContentDetailResponse {
  success: boolean;
  data: ContentDetail;
}

interface ContentCategoryResponse {
  success: boolean;
  data: {
    categories: ContentCategory[];
    subcategories: unknown[];
  };
}

// 컨텐츠 목록 조회 훅
export function useContents(
  filters: ContentSearchFilters,
  sort: SortConfig,
  page: number,
  pageSize: number = 20
) {
  const queryString = filtersToQuery(filters, sort, page, pageSize);
  const { data, error, isLoading, mutate } = useSWR<ContentListResponse>(
    `/api/admin/contents?${queryString}`,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  // 카테고리 목록도 함께 로드
  const { data: categoriesData } = useSWR<ContentCategoryResponse>(
    '/api/admin/content-categories',
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  // 컨텐츠 삭제 함수
  const deleteContents = async (ids: string[]): Promise<void> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    const response = await fetch('/api/admin/contents/batch-delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      throw new Error('삭제에 실패했습니다.');
    }
  };

  return {
    contents: data?.data || [],
    pagination: data?.pagination || null,
    categories: categoriesData?.data?.categories || [],
    isLoading,
    error,
    refetch: mutate,
    deleteContents,
  };
}

// 컨텐츠 상세 조회 훅
export function useContentDetail(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ContentDetailResponse>(
    id ? `/api/admin/contents/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    content: data?.data || null,
    isLoading,
    error,
    refetch: mutate,
  };
}

// 컨텐츠 카테고리 목록 조회 훅
export function useContentCategories() {
  const { data, error, isLoading, mutate } = useSWR<ContentCategoryResponse>(
    '/api/admin/content-categories',
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    categories: data?.data?.categories || [],
    isLoading,
    error,
    refetch: mutate,
  };
}

// 컨텐츠 등록 함수
export async function createContent(form: ContentForm): Promise<ApiResponse<ContentDetail>> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const response = await fetch('/api/admin/contents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(form),
  });

  if (!response.ok) {
    throw new Error('컨텐츠 등록에 실패했습니다.');
  }

  const result = await response.json();
  // 목록 캐시 갱신
  globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/admin/contents'), undefined, { revalidate: true });
  return result;
}

// 컨텐츠 수정 함수
export async function updateContent(id: string, form: ContentForm): Promise<ApiResponse<ContentDetail>> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const response = await fetch(`/api/admin/contents/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(form),
  });

  if (!response.ok) {
    throw new Error('컨텐츠 수정에 실패했습니다.');
  }

  const result = await response.json();
  // 상세 및 목록 캐시 갱신
  globalMutate(`/api/admin/contents/${id}`);
  globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/admin/contents'), undefined, { revalidate: true });
  return result;
}


