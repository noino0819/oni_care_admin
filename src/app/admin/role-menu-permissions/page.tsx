'use client';

// ============================================
// 역할별 메뉴권한 관리 페이지
// ============================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { AdminLayout } from '@/components/layout';
import {
  Button,
  AlertModal,
  ConfirmModal,
  Checkbox,
} from '@/components/common';
import { RefreshCw } from 'lucide-react';
import type { Role, RoleMenuPermission, AdminMenu } from '@/types';

// 메뉴 트리 구조로 변환
interface MenuTreeNode extends AdminMenu {
  children?: MenuTreeNode[];
  permission?: RoleMenuPermission;
}

function buildMenuTreeWithPermissions(
  menus: AdminMenu[], 
  permissions: RoleMenuPermission[]
): MenuTreeNode[] {
  const permissionMap = new Map<number, RoleMenuPermission>();
  permissions.forEach(p => permissionMap.set(p.menu_id, p));

  const menuMap = new Map<number, MenuTreeNode>();
  const roots: MenuTreeNode[] = [];

  // 모든 메뉴를 맵에 저장
  menus.forEach(menu => {
    menuMap.set(menu.id, { 
      ...menu, 
      children: [],
      permission: permissionMap.get(menu.id),
    });
  });

  // 트리 구조 생성
  menus.forEach(menu => {
    const menuNode = menuMap.get(menu.id)!;
    if (menu.parent_id === null) {
      roots.push(menuNode);
    } else {
      const parent = menuMap.get(menu.parent_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(menuNode);
      }
    }
  });

  return roots;
}

export default function RoleMenuPermissionsPage() {
  // 역할 상태
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  // 권한 상태
  const [permissions, setPermissions] = useState<RoleMenuPermission[]>([]);
  const [menus, setMenus] = useState<AdminMenu[]>([]);
  const [menuTree, setMenuTree] = useState<MenuTreeNode[]>([]);
  
  // 상태 관리
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const initialPermissionsRef = useRef<string>('');
  
  // 모달 상태
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 역할 조회
  const fetchRoles = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/roles?limit=100');
      const result = await response.json();
      if (result.success) {
        setRoles(result.data || []);
      }
    } catch {
      console.error('역할 조회 실패');
    }
  }, []);

  // 메뉴 조회
  const fetchMenus = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/menus?flat=true');
      const result = await response.json();
      if (result.success) {
        setMenus(result.data || []);
      }
    } catch {
      console.error('메뉴 조회 실패');
    }
  }, []);

  // 역할별 권한 조회
  const fetchPermissions = useCallback(async (roleId: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/roles/${roleId}/menu-permissions`);
      const result = await response.json();
      if (result.success) {
        const perms = result.data || [];
        setPermissions(perms);
        initialPermissionsRef.current = JSON.stringify(perms);
        setHasChanges(false);
      }
    } catch {
      setAlertMessage('권한 조회 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    fetchRoles();
    fetchMenus();
  }, [fetchRoles, fetchMenus]);

  // 메뉴 트리 업데이트
  useEffect(() => {
    if (menus.length > 0) {
      const tree = buildMenuTreeWithPermissions(menus, permissions);
      setMenuTree(tree);
    }
  }, [menus, permissions]);

  // 역할 선택
  const handleRoleSelect = (role: Role) => {
    if (hasChanges) {
      setConfirmModal({
        isOpen: true,
        message: '저장하지 않은 변경사항이 있습니다. 계속하시겠습니까?',
        onConfirm: () => {
          setConfirmModal(null);
          setSelectedRole(role);
          fetchPermissions(role.id);
        },
      });
    } else {
      setSelectedRole(role);
      fetchPermissions(role.id);
    }
  };

  // 권한 변경
  const handlePermissionChange = (
    menuId: number,
    field: 'is_active' | 'can_read' | 'can_write' | 'can_update' | 'can_delete' | 'can_export',
    value: boolean
  ) => {
    setPermissions(prev => 
      prev.map(p => 
        p.menu_id === menuId ? { ...p, [field]: value } : p
      )
    );
    setHasChanges(true);
  };

  // 저장
  const handleSave = async () => {
    if (!selectedRole) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/roles/${selectedRole.id}/menu-permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      });

      const result = await response.json();
      if (result.success) {
        setAlertMessage('저장되었습니다.');
        initialPermissionsRef.current = JSON.stringify(permissions);
        setHasChanges(false);
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
    if (selectedRole) {
      fetchPermissions(selectedRole.id);
    }
    fetchRoles();
    fetchMenus();
  };

  // 메뉴 행 렌더링
  const renderMenuRow = (menu: MenuTreeNode, level: number = 0) => {
    const perm = permissions.find(p => p.menu_id === menu.id);
    const indent = level * 20;

    return (
      <tr key={menu.id} className="border-b last:border-0">
        <td className="px-3 py-2 text-[13px]" style={{ paddingLeft: `${12 + indent}px` }}>
          {menu.menu_name}
        </td>
        <td className="px-3 py-2 text-center">
          <Checkbox
            checked={perm?.is_active ?? true}
            onChange={(checked) => handlePermissionChange(menu.id, 'is_active', checked)}
          />
        </td>
        <td className="px-3 py-2 text-center">
          <Checkbox
            checked={perm?.can_read ?? false}
            onChange={(checked) => handlePermissionChange(menu.id, 'can_read', checked)}
          />
        </td>
        <td className="px-3 py-2 text-center">
          <Checkbox
            checked={perm?.can_write ?? false}
            onChange={(checked) => handlePermissionChange(menu.id, 'can_write', checked)}
          />
        </td>
        <td className="px-3 py-2 text-center">
          <Checkbox
            checked={perm?.can_update ?? false}
            onChange={(checked) => handlePermissionChange(menu.id, 'can_update', checked)}
          />
        </td>
        <td className="px-3 py-2 text-center">
          <Checkbox
            checked={perm?.can_delete ?? false}
            onChange={(checked) => handlePermissionChange(menu.id, 'can_delete', checked)}
          />
        </td>
        <td className="px-3 py-2 text-center">
          <Checkbox
            checked={perm?.can_export ?? false}
            onChange={(checked) => handlePermissionChange(menu.id, 'can_export', checked)}
          />
        </td>
      </tr>
    );
  };

  // 메뉴 트리 렌더링
  const renderMenuTree = (nodes: MenuTreeNode[], level: number = 0): React.ReactNode[] => {
    const rows: React.ReactNode[] = [];
    nodes.forEach(node => {
      rows.push(renderMenuRow(node, level));
      if (node.children && node.children.length > 0) {
        rows.push(...renderMenuTree(node.children, level + 1));
      }
    });
    return rows;
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[18px] font-bold text-black">역할별 메뉴권한 관리</h1>
            <span className="text-[13px] text-[#888]">
              어드민 관리 &gt; 권한 관리 &gt; 역할별 메뉴권한 관리
            </span>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm" isLoading={isSaving}>
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

        {/* 메뉴 권한 설정 */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-[16px] font-bold text-black mb-4">메뉴 권한 설정</h2>
          
          <div className="flex gap-4">
            {/* 좌측: 역할 목록 */}
            <div className="w-[250px] flex-shrink-0">
              <h3 className="text-[14px] font-semibold text-black mb-2">▶ 역할</h3>
              <div className="border rounded overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#f5f0e1]">
                      <th className="px-3 py-2 text-[13px] font-semibold text-left">역할명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((role) => (
                      <tr
                        key={role.id}
                        onClick={() => handleRoleSelect(role)}
                        className={`border-b last:border-0 cursor-pointer transition-colors ${
                          selectedRole?.id === role.id 
                            ? 'bg-[#f5f0e1]' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-3 py-2 text-[13px]">{role.role_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 우측: 권한 관리 */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[14px] font-semibold text-black">▶ 권한 관리</h3>
                <Button onClick={handleSave} size="sm" isLoading={isSaving}>
                  저장
                </Button>
              </div>
              <div className="border rounded overflow-hidden max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-[#f5f0e1]">
                    <tr>
                      <th className="px-3 py-2 text-[13px] font-semibold text-left min-w-[200px]">메뉴명</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-center w-[70px]">사용여부</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-center w-[70px]">읽기</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-center w-[70px]">쓰기</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-center w-[70px]">수정</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-center w-[70px]">삭제</th>
                      <th className="px-3 py-2 text-[13px] font-semibold text-center w-[70px]">엑셀</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-[13px] text-gray-400">
                          로딩 중...
                        </td>
                      </tr>
                    ) : !selectedRole ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-[13px] text-gray-400">
                          좌측에서 역할을 선택해주세요.
                        </td>
                      </tr>
                    ) : permissions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-[13px] text-gray-400">
                          등록된 메뉴가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      renderMenuTree(menuTree)
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 알럿 모달 */}
      <AlertModal
        isOpen={!!alertMessage}
        onClose={() => setAlertMessage(null)}
        message={alertMessage || ''}
      />

      {/* 확인 모달 */}
      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(null)}
          onConfirm={confirmModal.onConfirm}
          message={confirmModal.message}
          confirmText="확인"
          cancelText="취소"
        />
      )}
    </AdminLayout>
  );
}

