// ============================================
// 1:1 문의 관리 훅 - SWR 기반 데이터 페칭
// ============================================

import useSWR, { mutate as globalMutate } from 'swr';
import { swrFetcher, apiClient } from '@/lib/api-client';
import type { ApiResponse, PaginationInfo } from '@/types';

// 문의 타입
export interface Inquiry {
  id: string;
  user_id: string;
  inquiry_type_id: number;
  inquiry_type_name: string;
  content: string;
  answer: string | null;
  status: 'pending' | 'answered';
  status_display: string;
  answered_by: string | null;
  created_at: string;
  answered_at: string | null;
  customer_email: string;
  customer_name: string;
  customer_id_masked: string;
  customer_name_display: string;
  is_new?: boolean;
}

// 문의 상세 타입
export interface InquiryDetail extends Inquiry {
  customer_name_masked: string;
  updated_at: string;
}

// 문의 유형 타입
export interface InquiryType {
  id: number;
  name: string;
  display_order: number;
  is_active: boolean;
}

// 검색 필터 타입
export interface InquirySearchFilters {
  customer_id?: string;
  customer_name?: string;
  inquiry_type_id?: number | null;
  content?: string;
  status?: string[];  // ['answered', 'pending']
  created_from?: string;
  created_to?: string;
  answered_from?: string;
  answered_to?: string;
  answered_by?: string;
}

// 검색 필터를 쿼리스트링으로 변환
function filtersToQuery(
  filters: InquirySearchFilters,
  page: number,
  pageSize: number
): string {
  const params = new URLSearchParams();
  
  if (filters.customer_id) params.append('customer_id', filters.customer_id);
  if (filters.customer_name) params.append('customer_name', filters.customer_name);
  if (filters.inquiry_type_id) params.append('inquiry_type_id', String(filters.inquiry_type_id));
  if (filters.content) params.append('content', filters.content);
  if (filters.status?.length) params.append('status', filters.status.join(','));
  if (filters.created_from) params.append('created_from', filters.created_from);
  if (filters.created_to) params.append('created_to', filters.created_to);
  if (filters.answered_from) params.append('answered_from', filters.answered_from);
  if (filters.answered_to) params.append('answered_to', filters.answered_to);
  if (filters.answered_by) params.append('answered_by', filters.answered_by);
  
  params.append('page', String(page));
  params.append('page_size', String(pageSize));
  
  return params.toString();
}

interface InquiryListResponse {
  success: boolean;
  data: Inquiry[];
  pagination: PaginationInfo;
}

interface InquiryDetailResponse {
  success: boolean;
  data: InquiryDetail;
}

interface InquiryTypesResponse {
  success: boolean;
  data: InquiryType[];
}

// 문의 목록 조회 훅
export function useInquiries(
  filters: InquirySearchFilters,
  page: number,
  pageSize: number = 20
) {
  const queryString = filtersToQuery(filters, page, pageSize);
  const { data, error, isLoading, mutate } = useSWR<InquiryListResponse>(
    `/admin/inquiries?${queryString}`,
    swrFetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    inquiries: data?.data || [],
    pagination: data?.pagination || null,
    isLoading,
    error,
    refetch: mutate,
  };
}

// 문의 상세 조회 훅
export function useInquiryDetail(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<InquiryDetailResponse>(
    id ? `/admin/inquiries/${id}` : null,
    swrFetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    inquiry: data?.data || null,
    isLoading,
    error,
    refetch: mutate,
  };
}

// 문의 유형 목록 조회 훅
export function useInquiryTypes() {
  const { data, error, isLoading } = useSWR<InquiryTypesResponse>(
    '/admin/inquiries/types',
    swrFetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    types: data?.data || [],
    isLoading,
    error,
  };
}

// 문의 답변 등록/수정 함수
export async function answerInquiry(id: string, answer: string): Promise<ApiResponse<InquiryDetail>> {
  const result = await apiClient.put<InquiryDetail>(`/admin/inquiries/${id}/answer`, { answer });
  globalMutate(`/admin/inquiries/${id}`);
  globalMutate((key: string) => typeof key === 'string' && key.startsWith('/admin/inquiries'), undefined, { revalidate: true });
  return result;
}

export default useInquiries;

