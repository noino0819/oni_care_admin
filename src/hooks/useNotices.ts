// ============================================
// 공지사항 관리 훅 - SWR 기반 데이터 페칭
// ============================================
// FastAPI 백엔드 연동

import useSWR, { mutate as globalMutate } from 'swr';
import { swrFetcher, apiClient } from '@/lib/api-client';
import type {
  NoticeListItem,
  NoticeDetail,
  NoticeSearchFilters,
  NoticeForm,
  SortConfig,
  ApiResponse,
  PaginationInfo,
} from '@/types';

// 검색 필터를 쿼리스트링으로 변환
function filtersToQuery(
  filters: NoticeSearchFilters,
  sort: SortConfig,
  page: number,
  pageSize: number
): string {
  const params = new URLSearchParams();
  
  if (filters.title) params.append('title', filters.title);
  if (filters.status?.length) params.append('status', filters.status.join(','));
  if (filters.visibility_scope?.length) params.append('visibility_scope', filters.visibility_scope.join(','));
  if (filters.company_code) params.append('company_code', filters.company_code);
  if (filters.created_from) params.append('created_from', filters.created_from);
  if (filters.created_to) params.append('created_to', filters.created_to);
  
  if (sort.field) {
    params.append('sort_field', sort.field);
    params.append('sort_direction', sort.direction || 'asc');
  }
  
  params.append('page', String(page));
  params.append('page_size', String(pageSize));
  
  return params.toString();
}

interface NoticeListResponse {
  success: boolean;
  data: NoticeListItem[];
  pagination: PaginationInfo;
}

interface NoticeDetailResponse {
  success: boolean;
  data: NoticeDetail;
}

// 공지사항 목록 조회 훅
export function useNotices(
  filters: NoticeSearchFilters,
  sort: SortConfig,
  page: number,
  pageSize: number = 20
) {
  const queryString = filtersToQuery(filters, sort, page, pageSize);
  const { data, error, isLoading, mutate } = useSWR<NoticeListResponse>(
    `/admin/notices?${queryString}`,
    swrFetcher,
    {
      revalidateOnFocus: false,
    }
  );

  // 공지사항 삭제 함수
  const deleteNotices = async (ids: string[]): Promise<void> => {
    await apiClient.post('/admin/notices/batch-delete', { ids });
  };

  return {
    notices: data?.data || [],
    pagination: data?.pagination || null,
    isLoading,
    error,
    refetch: mutate,
    deleteNotices,
  };
}

// 공지사항 상세 조회 훅
export function useNoticeDetail(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<NoticeDetailResponse>(
    id ? `/admin/notices/${id}` : null,
    swrFetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    notice: data?.data || null,
    isLoading,
    error,
    refetch: mutate,
  };
}

// 공지사항 등록 함수
export async function createNotice(form: NoticeForm): Promise<ApiResponse<NoticeDetail>> {
  const result = await apiClient.post<NoticeDetail>('/admin/notices', form);
  globalMutate((key: string) => typeof key === 'string' && key.startsWith('/admin/notices'), undefined, { revalidate: true });
  return result;
}

// 공지사항 수정 함수
export async function updateNotice(id: string, form: NoticeForm): Promise<ApiResponse<NoticeDetail>> {
  const result = await apiClient.put<NoticeDetail>(`/admin/notices/${id}`, form);
  globalMutate(`/admin/notices/${id}`);
  globalMutate((key: string) => typeof key === 'string' && key.startsWith('/admin/notices'), undefined, { revalidate: true });
  return result;
}
