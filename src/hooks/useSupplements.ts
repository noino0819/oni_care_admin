// ============================================
// 영양제 DB 관리 Hook
// ============================================

import useSWR, { mutate as globalMutate } from 'swr';
import { swrFetcher, apiClient } from '@/lib/api-client';

// 영양제 검색 필터 타입
export interface SupplementSearchFilters {
  product_name?: string;
  report_number?: string;
  ingredient_name?: string;
  functionality?: string;
  default_intake_amount?: string;
  default_intake_time?: string;
  product_form?: string;
  manufacturer?: string;
  is_active?: string;
}

// 영양제 타입
export interface Supplement {
  id: string;
  product_report_number: string | null;
  product_name: string;
  product_form: string | null;
  dosage: number | null;
  dosage_unit: string | null;
  intake_method: string | null;
  default_intake_time: string | null;
  default_intake_amount: number | null;
  default_intake_unit: string | null;
  manufacturer: string | null;
  image_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 영양제-성분 매핑 타입
export interface SupplementIngredient {
  mapping_id: number;
  ingredient_id: number;
  ingredient_code: string | null;
  internal_name: string;
  external_name: string;
  indicator_component: string | null;
  content_amount: number;
  content_unit: string;
  display_order: number;
}

// 영양제-기능성 내용 타입
export interface SupplementFunctionality {
  functionality_id: number;
  functionality_code: string;
  content: string;
  ingredient_names: string[];
}

interface SupplementListResponse {
  success: boolean;
  data: Supplement[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface SupplementDetailResponse {
  success: boolean;
  data: Supplement;
}

interface SupplementIngredientResponse {
  success: boolean;
  data: SupplementIngredient[];
}

interface SupplementFunctionalityResponse {
  success: boolean;
  data: SupplementFunctionality[];
}

// 필터를 쿼리스트링으로 변환
function filtersToQuery(
  filters: SupplementSearchFilters,
  page: number,
  pageSize: number
): string {
  const params = new URLSearchParams();

  if (filters.product_name) params.append('product_name', filters.product_name);
  if (filters.report_number) params.append('report_number', filters.report_number);
  if (filters.ingredient_name) params.append('ingredient_name', filters.ingredient_name);
  if (filters.functionality) params.append('functionality', filters.functionality);
  if (filters.default_intake_amount) params.append('default_intake_amount', filters.default_intake_amount);
  if (filters.default_intake_time) params.append('default_intake_time', filters.default_intake_time);
  if (filters.product_form) params.append('product_form', filters.product_form);
  if (filters.manufacturer) params.append('manufacturer', filters.manufacturer);
  if (filters.is_active) params.append('is_active', filters.is_active);

  params.append('page', String(page));
  params.append('page_size', String(pageSize));

  return params.toString();
}

// Next.js API 라우트용 fetcher (내부 API)
const internalFetcher = async (url: string) => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn(`[useSupplements] API 에러: ${response.status}`, errorData);
      // 에러를 throw하지 않고 빈 데이터 반환
      return { success: false, data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
    
    return response.json();
  } catch (error) {
    console.warn('[useSupplements] 네트워크 에러:', error);
    return { success: false, data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  }
};

// 내부 API 요청 함수
async function internalRequest<T>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: unknown
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
      if (!window.location.pathname.includes('/login')) {
        window.location.replace('/login');
      }
    }
    throw new Error('인증이 필요합니다.');
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || '요청 처리 중 오류가 발생했습니다.');
  }
  
  return data;
}

// 영양제 목록 조회
export function useSupplements(
  filters: SupplementSearchFilters,
  page: number = 1,
  pageSize: number = 20
) {
  const queryString = filtersToQuery(filters, page, pageSize);
  const { data, error, isLoading, mutate } = useSWR<SupplementListResponse>(
    `/api/admin/supplements?${queryString}`,
    internalFetcher,
    { revalidateOnFocus: false }
  );

  return {
    supplements: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch: () => mutate(),
  };
}

// 영양제 상세 조회
export function useSupplementDetail(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<SupplementDetailResponse>(
    id ? `/api/admin/supplements/${id}` : null,
    internalFetcher,
    { revalidateOnFocus: false }
  );

  return {
    supplement: data?.data,
    isLoading,
    error,
    refetch: () => mutate(),
  };
}

// 영양제 성분 목록 조회
export function useSupplementIngredients(productId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<SupplementIngredientResponse>(
    productId ? `/api/admin/supplements/${productId}/ingredients` : null,
    internalFetcher,
    { revalidateOnFocus: false }
  );

  return {
    ingredients: data?.data || [],
    isLoading,
    error,
    refetch: () => mutate(),
  };
}

// 영양제 기능성 내용 조회
export function useSupplementFunctionalities(productId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<SupplementFunctionalityResponse>(
    productId ? `/api/admin/supplements/${productId}/functionalities` : null,
    internalFetcher,
    { revalidateOnFocus: false }
  );

  return {
    functionalities: data?.data || [],
    isLoading,
    error,
    refetch: () => mutate(),
  };
}

// 영양제 생성
export function useCreateSupplement() {
  const [isCreating, setIsCreating] = useState(false);

  const createSupplement = async (data: Partial<Supplement>) => {
    setIsCreating(true);
    try {
      const result = await internalRequest<{ success: boolean; data: { id: string } }>(
        '/api/admin/supplements',
        'POST',
        data
      );
      globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/admin/supplements'), undefined, { revalidate: true });
      return result;
    } finally {
      setIsCreating(false);
    }
  };

  return { createSupplement, isCreating };
}

// 영양제 수정
export function useUpdateSupplement(id: string | null) {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateSupplement = async (data: Partial<Supplement>) => {
    if (!id) return;
    setIsUpdating(true);
    try {
      const result = await internalRequest<{ success: boolean; data: { id: string } }>(
        `/api/admin/supplements/${id}`,
        'PUT',
        data
      );
      globalMutate(`/api/admin/supplements/${id}`);
      globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/admin/supplements'), undefined, { revalidate: true });
      return result;
    } finally {
      setIsUpdating(false);
    }
  };

  return { updateSupplement, isUpdating };
}

// 영양제 삭제
export function useDeleteSupplements() {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteSupplements = async (data: { ids: string[] }) => {
    setIsDeleting(true);
    try {
      const result = await internalRequest<{ success: boolean }>(
        '/api/admin/supplements',
        'DELETE',
        data
      );
      globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/admin/supplements'), undefined, { revalidate: true });
      return result;
    } finally {
      setIsDeleting(false);
    }
  };

  return { deleteSupplements, isDeleting };
}

// 영양제 성분 매핑 저장
export function useSaveSupplementIngredients(productId: string | null) {
  const [isSaving, setIsSaving] = useState(false);

  const saveIngredients = async (data: { ingredients: Array<{ ingredient_id: number; content_amount: number; content_unit: string; display_order: number }> }) => {
    if (!productId) return;
    setIsSaving(true);
    try {
      const result = await internalRequest<{ success: boolean }>(
        `/api/admin/supplements/${productId}/ingredients`,
        'POST',
        data
      );
      globalMutate(`/api/admin/supplements/${productId}/ingredients`);
      globalMutate(`/api/admin/supplements/${productId}/functionalities`);
      return result;
    } finally {
      setIsSaving(false);
    }
  };

  return { saveIngredients, isSaving };
}

// 영양제 성분 매핑 삭제
export function useDeleteSupplementIngredients(productId: string | null) {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteIngredients = async (data: { mapping_ids: number[] }) => {
    if (!productId) return;
    setIsDeleting(true);
    try {
      const result = await internalRequest<{ success: boolean }>(
        `/api/admin/supplements/${productId}/ingredients`,
        'DELETE',
        data
      );
      globalMutate(`/api/admin/supplements/${productId}/ingredients`);
      globalMutate(`/api/admin/supplements/${productId}/functionalities`);
      return result;
    } finally {
      setIsDeleting(false);
    }
  };

  return { deleteIngredients, isDeleting };
}

// useState import 추가
import { useState } from 'react';
