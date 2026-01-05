// ============================================
// 컨텐츠 관리 훅 - SWR 기반 데이터 페칭
// ============================================
// FastAPI 백엔드 연동

import useSWR, { mutate as globalMutate } from 'swr';
import { swrFetcher, apiClient } from '@/lib/api-client';
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

// 검색 필터를 쿼리스트링으로 변환
function filtersToQuery(
  filters: ContentSearchFilters,
  sort: SortConfig,
  page: number,
  pageSize: number
): string {
  const params = new URLSearchParams();
  
  console.log('[filtersToQuery] filters:', filters);
  console.log('[filtersToQuery] category_ids:', filters.category_ids);
  
  if (filters.title) params.append('title', filters.title);
  if (filters.category_id) params.append('category_id', String(filters.category_id));
  if (filters.category_ids?.length) params.append('category_ids', filters.category_ids.join(','));
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

// 계층 구조 카테고리 타입
interface HierarchicalCategory {
  id: number;
  category_type: string;
  category_name: string;
  parent_id: number | null;
  display_order: number;
  children?: HierarchicalCategory[];
}

interface ContentCategoryResponse {
  success: boolean;
  data: HierarchicalCategory[];
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
    `/admin/contents?${queryString}`,
    swrFetcher,
    {
      revalidateOnFocus: false,
    }
  );

  // 카테고리 목록도 함께 로드 (계층 구조)
  const { data: categoriesData } = useSWR<ContentCategoryResponse>(
    '/admin/content-categories/list',
    swrFetcher,
    {
      revalidateOnFocus: false,
    }
  );

  // 컨텐츠 삭제 함수
  const deleteContents = async (ids: string[]): Promise<void> => {
    await apiClient.post('/admin/contents/batch-delete', { ids });
  };

  return {
    contents: data?.data || [],
    pagination: data?.pagination || null,
    categories: categoriesData?.data || [],
    isLoading,
    error,
    refetch: mutate,
    deleteContents,
  };
}

// 컨텐츠 상세 조회 훅
export function useContentDetail(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ContentDetailResponse>(
    id ? `/admin/contents/${id}` : null,
    swrFetcher,
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

// 컨텐츠 카테고리 목록 조회 훅 (계층 구조)
export function useContentCategories() {
  const { data, error, isLoading, mutate } = useSWR<ContentCategoryResponse>(
    '/admin/content-categories/list',
    swrFetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    categories: data?.data || [],
    isLoading,
    error,
    refetch: mutate,
  };
}

// 컨텐츠 등록 함수
export async function createContent(form: ContentForm): Promise<ApiResponse<ContentDetail>> {
  const result = await apiClient.post<ContentDetail>('/admin/contents', form);
  // 목록 캐시 갱신
  globalMutate((key: string) => typeof key === 'string' && key.startsWith('/admin/contents'), undefined, { revalidate: true });
  return result;
}

// 컨텐츠 수정 함수
export async function updateContent(id: string, form: ContentForm): Promise<ApiResponse<ContentDetail>> {
  const result = await apiClient.put<ContentDetail>(`/admin/contents/${id}`, form);
  // 상세 및 목록 캐시 갱신
  globalMutate(`/admin/contents/${id}`);
  globalMutate((key: string) => typeof key === 'string' && key.startsWith('/admin/contents'), undefined, { revalidate: true });
  return result;
}
