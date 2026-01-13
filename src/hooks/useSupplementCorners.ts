// ============================================
// 영양제 코너 관리 Hook
// ============================================

import { useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { swrFetcher, apiClient } from '@/lib/api-client';

// 코너 타입
export interface SupplementCorner {
  id: number;
  corner_name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  product_count: number;
  created_at: string;
  updated_at: string;
}

// 코너별 영양제 타입
export interface CornerProduct {
  mapping_id: number;
  product_id: string;
  product_name: string;
  brand_name: string | null;
  interest_tags: string[];
  is_for_sale: boolean;
  display_order: number;
}

// 검색용 영양제 타입
export interface SearchProduct {
  product_id: string;
  product_name: string;
  brand_name: string | null;
  interest_tags: string[];
  is_for_sale: boolean;
}

interface CornerListResponse {
  success: boolean;
  data: SupplementCorner[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface CornerProductListResponse {
  success: boolean;
  data: CornerProduct[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface SearchProductListResponse {
  success: boolean;
  data: SearchProduct[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// 코너 목록 조회
export function useSupplementCorners(
  cornerName?: string,
  isForSale?: string,
  page: number = 1,
  pageSize: number = 20
) {
  const params = new URLSearchParams();
  if (cornerName) params.set('corner_name', cornerName);
  if (isForSale) params.set('is_for_sale', isForSale);
  params.set('page', String(page));
  params.set('page_size', String(pageSize));

  const { data, error, isLoading, mutate } = useSWR<CornerListResponse>(
    `/admin/supplement-corners?${params.toString()}`,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  return {
    corners: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch: () => mutate(),
  };
}

// 코너별 영양제 목록 조회
export function useCornerProducts(
  cornerId: number | null,
  page: number = 1,
  pageSize: number = 20
) {
  const { data, error, isLoading, mutate } = useSWR<CornerProductListResponse>(
    cornerId ? `/admin/supplement-corners/${cornerId}/products?page=${page}&page_size=${pageSize}` : null,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  return {
    products: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch: () => mutate(),
  };
}

// 영양제 검색 (팝업용)
export function useSearchProducts(
  productName?: string,
  productId?: string,
  interestTag?: string,
  page: number = 1,
  pageSize: number = 10
) {
  const params = new URLSearchParams();
  if (productName) params.set('product_name', productName);
  if (productId) params.set('product_id', productId);
  if (interestTag) params.set('interest_tag', interestTag);
  params.set('page', String(page));
  params.set('page_size', String(pageSize));

  const { data, error, isLoading, mutate } = useSWR<SearchProductListResponse>(
    `/admin/supplement-corners/search/products?${params.toString()}`,
    swrFetcher,
    { revalidateOnFocus: false }
  );

  return {
    products: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch: () => mutate(),
  };
}

// 코너 생성
export function useCreateCorner() {
  const [isCreating, setIsCreating] = useState(false);

  const createCorner = async (data: {
    corner_name: string;
    description?: string;
    display_order?: number;
    is_active?: boolean;
  }) => {
    setIsCreating(true);
    try {
      const result = await apiClient.post<{ id: number }>('/admin/supplement-corners', data);
      globalMutate((key: string) => typeof key === 'string' && key.startsWith('/admin/supplement-corners'), undefined, { revalidate: true });
      return result;
    } finally {
      setIsCreating(false);
    }
  };

  return { createCorner, isCreating };
}

// 코너 수정
export function useUpdateCorner() {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateCorner = async (cornerId: number, data: {
    corner_name?: string;
    description?: string;
    display_order?: number;
    is_active?: boolean;
  }) => {
    setIsUpdating(true);
    try {
      const result = await apiClient.put<{ id: number }>(`/admin/supplement-corners/${cornerId}`, data);
      globalMutate((key: string) => typeof key === 'string' && key.startsWith('/admin/supplement-corners'), undefined, { revalidate: true });
      return result;
    } finally {
      setIsUpdating(false);
    }
  };

  return { updateCorner, isUpdating };
}

// 코너 삭제
export function useDeleteCorners() {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteCorners = async (ids: number[]) => {
    setIsDeleting(true);
    try {
      const params = new URLSearchParams();
      ids.forEach(id => params.append('ids', String(id)));
      const result = await apiClient.delete(`/admin/supplement-corners?${params.toString()}`);
      globalMutate((key: string) => typeof key === 'string' && key.startsWith('/admin/supplement-corners'), undefined, { revalidate: true });
      return result;
    } finally {
      setIsDeleting(false);
    }
  };

  return { deleteCorners, isDeleting };
}

// 코너에 영양제 추가
export function useAddCornerProducts(cornerId: number | null) {
  const [isAdding, setIsAdding] = useState(false);

  const addProducts = async (products: { product_id: string; display_order?: number }[]) => {
    if (!cornerId) return;
    setIsAdding(true);
    try {
      const result = await apiClient.post(`/admin/supplement-corners/${cornerId}/products`, {
        products: products.map(p => ({
          product_id: p.product_id,
          display_order: p.display_order || 999
        }))
      });
      globalMutate((key: string) => typeof key === 'string' && key.includes(`/admin/supplement-corners/${cornerId}/products`), undefined, { revalidate: true });
      return result;
    } finally {
      setIsAdding(false);
    }
  };

  return { addProducts, isAdding };
}

// 코너에서 영양제 삭제
export function useRemoveCornerProducts(cornerId: number | null) {
  const [isRemoving, setIsRemoving] = useState(false);

  const removeProducts = async (productIds: string[]) => {
    if (!cornerId) return;
    setIsRemoving(true);
    try {
      const params = new URLSearchParams();
      productIds.forEach(id => params.append('product_ids', id));
      const result = await apiClient.delete(`/admin/supplement-corners/${cornerId}/products?${params.toString()}`);
      globalMutate((key: string) => typeof key === 'string' && key.includes(`/admin/supplement-corners/${cornerId}/products`), undefined, { revalidate: true });
      return result;
    } finally {
      setIsRemoving(false);
    }
  };

  return { removeProducts, isRemoving };
}

