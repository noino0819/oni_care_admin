'use client';

// ============================================
// 어드민 메뉴 관리 페이지
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { AdminLayout } from '@/components/layout';
import {
  Button,
  AlertModal,
} from '@/components/common';
import { RefreshCw, Plus } from 'lucide-react';
import type { AdminMenu } from '@/types';

// 메뉴 모달 컴포넌트
interface MenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<AdminMenu>) => void;
  initialData?: AdminMenu | null;
  parentId?: number | null;
  depth: number;
  isLoading?: boolean;
}

function MenuModal({ isOpen, onClose, onSave, initialData, parentId, depth, isLoading }: MenuModalProps) {
  const [formData, setFormData] = useState({
    menu_name: '',
    menu_path: '',
    sort_order: 1,
    is_active: true,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        menu_name: initialData.menu_name || '',
        menu_path: initialData.menu_path || '',
        sort_order: initialData.sort_order || 1,
        is_active: initialData.is_active ?? true,
      });
    } else {
      setFormData({
        menu_name: '',
        menu_path: '',
        sort_order: 1,
        is_active: true,
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">
            {initialData ? '메뉴 수정' : `${depth}Depth 메뉴 추가`}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            <div className="w-[100px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
              메뉴명
            </div>
            <input
              type="text"
              value={formData.menu_name}
              onChange={(e) => setFormData({ ...formData, menu_name: e.target.value })}
              className="flex-1 px-3 py-2 text-[14px] focus:outline-none"
              placeholder="메뉴명 입력"
            />
          </div>
          {depth === 3 && (
            <div className="flex items-center border border-gray-200 rounded overflow-hidden">
              <div className="w-[100px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
                경로
              </div>
              <input
                type="text"
                value={formData.menu_path}
                onChange={(e) => setFormData({ ...formData, menu_path: e.target.value })}
                className="flex-1 px-3 py-2 text-[14px] focus:outline-none"
                placeholder="/path/to/menu"
              />
            </div>
          )}
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            <div className="w-[100px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
              정렬순서
            </div>
            <input
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 1 })}
              className="flex-1 px-3 py-2 text-[14px] focus:outline-none"
              min="1"
            />
          </div>
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            <div className="w-[100px] bg-gray-50 px-3 py-2 text-center text-[14px] font-medium border-r">
              사용여부
            </div>
            <div className="flex-1 px-3 py-2 flex items-center gap-4">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active === true}
                  onChange={() => setFormData({ ...formData, is_active: true })}
                  className="w-4 h-4"
                />
                <span className="text-[14px]">Y</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active === false}
                  onChange={() => setFormData({ ...formData, is_active: false })}
                  className="w-4 h-4"
                />
                <span className="text-[14px]">N</span>
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-3 px-6 py-4 border-t">
          <Button variant="secondary" onClick={onClose} className="min-w-[100px]">
            취소
          </Button>
          <Button 
            onClick={() => onSave({ ...formData, parent_id: parentId, depth })} 
            isLoading={isLoading} 
            className="min-w-[100px]"
          >
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminMenusPage() {
  // 메뉴 상태 (각 Depth별)
  const [depth1Menus, setDepth1Menus] = useState<AdminMenu[]>([]);
  const [depth2Menus, setDepth2Menus] = useState<AdminMenu[]>([]);
  const [depth3Menus, setDepth3Menus] = useState<AdminMenu[]>([]);
  
  // 선택 상태
  const [selectedDepth1, setSelectedDepth1] = useState<AdminMenu | null>(null);
  const [selectedDepth2, setSelectedDepth2] = useState<AdminMenu | null>(null);
  
  // 모달 상태
  const [menuModal, setMenuModal] = useState<{
    isOpen: boolean;
    data: AdminMenu | null;
    parentId: number | null;
    depth: number;
  }>({ isOpen: false, data: null, parentId: null, depth: 1 });
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  
  // 로딩 상태
  const [isSaving, setIsSaving] = useState(false);

  // 1Depth 메뉴 조회
  const fetchDepth1Menus = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/menus?depth=1&flat=true');
      const result = await response.json();
      if (result.success) {
        setDepth1Menus(result.data || []);
      }
    } catch {
      console.error('1Depth 메뉴 조회 실패');
    }
  }, []);

  // 2Depth 메뉴 조회
  const fetchDepth2Menus = useCallback(async (parentId: number) => {
    try {
      const response = await fetch(`/api/admin/menus?parent_id=${parentId}&flat=true`);
      const result = await response.json();
      if (result.success) {
        setDepth2Menus(result.data || []);
      }
    } catch {
      console.error('2Depth 메뉴 조회 실패');
    }
  }, []);

  // 3Depth 메뉴 조회
  const fetchDepth3Menus = useCallback(async (parentId: number) => {
    try {
      const response = await fetch(`/api/admin/menus?parent_id=${parentId}&flat=true`);
      const result = await response.json();
      if (result.success) {
        setDepth3Menus(result.data || []);
      }
    } catch {
      console.error('3Depth 메뉴 조회 실패');
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    fetchDepth1Menus();
  }, [fetchDepth1Menus]);

  // 1Depth 선택
  const handleDepth1Select = (menu: AdminMenu) => {
    setSelectedDepth1(menu);
    setSelectedDepth2(null);
    setDepth3Menus([]);
    fetchDepth2Menus(menu.id);
  };

  // 2Depth 선택
  const handleDepth2Select = (menu: AdminMenu) => {
    setSelectedDepth2(menu);
    fetchDepth3Menus(menu.id);
  };

  // 메뉴 저장
  const handleSaveMenu = async (data: Partial<AdminMenu>) => {
    if (!data.menu_name) {
      setAlertMessage('메뉴명은 필수입니다.');
      return;
    }

    setIsSaving(true);
    try {
      const isEdit = !!menuModal.data;
      const url = isEdit 
        ? `/api/admin/menus/${menuModal.data!.id}`
        : '/api/admin/menus';
      
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (result.success) {
        setAlertMessage(isEdit ? '수정되었습니다.' : '추가되었습니다.');
        setMenuModal({ isOpen: false, data: null, parentId: null, depth: 1 });
        
        // 해당 Depth 새로고침
        if (data.depth === 1) {
          fetchDepth1Menus();
        } else if (data.depth === 2 && selectedDepth1) {
          fetchDepth2Menus(selectedDepth1.id);
        } else if (data.depth === 3 && selectedDepth2) {
          fetchDepth3Menus(selectedDepth2.id);
        }
      } else {
        setAlertMessage(result.error?.message || '저장 중 오류가 발생했습니다.');
      }
    } catch {
      setAlertMessage('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 초기화
  const handleRefresh = () => {
    fetchDepth1Menus();
    setSelectedDepth1(null);
    setSelectedDepth2(null);
    setDepth2Menus([]);
    setDepth3Menus([]);
  };

  // 메뉴 테이블 렌더링
  const renderMenuTable = (
    menus: AdminMenu[],
    depth: number,
    selectedMenu: AdminMenu | null,
    onSelect: (menu: AdminMenu) => void,
    onAdd: () => void,
    onEdit: (menu: AdminMenu) => void
  ) => (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[14px] font-semibold text-black">▶ {depth}Depth</h3>
        <button
          onClick={onAdd}
          className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-700 border border-gray-300 rounded"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
      <div className="border rounded overflow-hidden max-h-[500px] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-[#f5f0e1]">
            <tr>
              <th className="px-3 py-2 text-[13px] font-semibold text-left">메뉴명</th>
              <th className="px-3 py-2 text-[13px] font-semibold text-center w-[60px]">정렬순서</th>
              <th className="px-3 py-2 text-[13px] font-semibold text-center w-[60px]">사용여부</th>
              <th className="px-3 py-2 text-[13px] font-semibold text-center w-[50px]">관리</th>
            </tr>
          </thead>
          <tbody>
            {menus.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-[13px] text-gray-400">
                  {depth === 1 ? '메뉴가 없습니다.' : '상위 메뉴를 선택해주세요.'}
                </td>
              </tr>
            ) : (
              menus.map((menu) => (
                <tr
                  key={menu.id}
                  onClick={() => onSelect(menu)}
                  className={`border-b last:border-0 cursor-pointer transition-colors ${
                    selectedMenu?.id === menu.id 
                      ? 'bg-[#f5f0e1]' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-3 py-2 text-[13px]">{menu.menu_name}</td>
                  <td className="px-3 py-2 text-[13px] text-center">{menu.sort_order}</td>
                  <td className="px-3 py-2 text-[13px] text-center">{menu.is_active ? 'Y' : 'N'}</td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(menu);
                      }}
                      className="px-2 py-1 text-[12px] border border-gray-300 rounded hover:bg-gray-100"
                    >
                      수정
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[18px] font-bold text-black">어드민 메뉴 관리</h1>
            <span className="text-[13px] text-[#888]">
              어드민 관리 &gt; 어드민 메뉴 관리 &gt; 메뉴 관리
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">
              저장
            </Button>
            <Button 
              variant="secondary" 
              onClick={handleRefresh}
              size="sm"
              className="w-[32px] h-[28px] px-0 flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 메뉴 관리 */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-[16px] font-bold text-black mb-4">메뉴 관리</h2>
          
          <div className="flex gap-4">
            {/* 1Depth */}
            {renderMenuTable(
              depth1Menus,
              1,
              selectedDepth1,
              handleDepth1Select,
              () => setMenuModal({ isOpen: true, data: null, parentId: null, depth: 1 }),
              (menu) => setMenuModal({ isOpen: true, data: menu, parentId: null, depth: 1 })
            )}

            {/* 2Depth */}
            {renderMenuTable(
              depth2Menus,
              2,
              selectedDepth2,
              handleDepth2Select,
              () => selectedDepth1 && setMenuModal({ isOpen: true, data: null, parentId: selectedDepth1.id, depth: 2 }),
              (menu) => setMenuModal({ isOpen: true, data: menu, parentId: selectedDepth1?.id || null, depth: 2 })
            )}

            {/* 3Depth */}
            {renderMenuTable(
              depth3Menus,
              3,
              null,
              () => {},
              () => selectedDepth2 && setMenuModal({ isOpen: true, data: null, parentId: selectedDepth2.id, depth: 3 }),
              (menu) => setMenuModal({ isOpen: true, data: menu, parentId: selectedDepth2?.id || null, depth: 3 })
            )}
          </div>
        </div>
      </div>

      {/* 메뉴 모달 */}
      <MenuModal
        isOpen={menuModal.isOpen}
        onClose={() => setMenuModal({ isOpen: false, data: null, parentId: null, depth: 1 })}
        onSave={handleSaveMenu}
        initialData={menuModal.data}
        parentId={menuModal.parentId}
        depth={menuModal.depth}
        isLoading={isSaving}
      />

      {/* 알럿 모달 */}
      <AlertModal
        isOpen={!!alertMessage}
        onClose={() => setAlertMessage(null)}
        message={alertMessage || ''}
      />
    </AdminLayout>
  );
}


