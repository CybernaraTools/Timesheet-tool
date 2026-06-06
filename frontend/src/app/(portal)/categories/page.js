'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/stores/authStore';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory
} from '@/lib/hooks/useCategories';
import PageHeader from '@/components/layout/PageHeader';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Tag, Plus, Edit2, Trash2, Lock } from 'lucide-react';

export default function CategoriesPage() {
  const { user } = useAuthStore();
  const role = user?.role || 'employee';
  const isAdmin = role === 'admin';

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Queries & Mutations
  const { data: categories = [], isLoading, refetch } = useCategories({ include_inactive: 'true' });
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  // Reset page when categories length changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [categories.length]);

  const totalPages = Math.ceil(categories.length / itemsPerPage);
  const paginatedCategories = categories.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName('');
    setIsActive(true);
    setIsOpen(true);
  };

  const handleOpenEdit = (category) => {
    if (category.is_system) {
      toast.error("System categories cannot be edited");
      return;
    }
    setEditingCategory(category);
    setName(category.name);
    setIsActive(category.is_active);
    setIsOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || name.trim().length < 2) {
      toast.error("Category name must be at least 2 characters long");
      return;
    }

    if (editingCategory) {
      updateCategory.mutate({
        id: editingCategory.id,
        data: { name: name.trim(), is_active: isActive }
      }, {
        onSuccess: () => {
          toast.success("Category updated successfully");
          setIsOpen(false);
          refetch();
        },
        onError: (err) => {
          toast.error(err.message || "Failed to update category");
        }
      });
    } else {
      createCategory.mutate(name.trim(), {
        onSuccess: () => {
          toast.success("Category created successfully");
          setIsOpen(false);
          refetch();
        },
        onError: (err) => {
          toast.error(err.message || "Failed to create category");
        }
      });
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this category? This operation cannot be undone.")) {
      deleteCategory.mutate(id, {
        onSuccess: () => {
          toast.success("Category deleted successfully");
          refetch();
        },
        onError: (err) => {
          toast.error(err.message || "Failed to delete category");
        }
      });
    }
  };

  const handleToggleStatus = (category) => {
    if (category.is_system) {
      toast.error("System categories status cannot be modified");
      return;
    }
    updateCategory.mutate({
      id: category.id,
      data: { name: category.name, is_active: !category.is_active }
    }, {
      onSuccess: () => {
        toast.success(`Category ${!category.is_active ? 'activated' : 'deactivated'} successfully`);
        refetch();
      },
      onError: (err) => {
        toast.error(err.message || "Failed to update status");
      }
    });
  };

  // Client-side guard
  if (!['manager', 'admin'].includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-surface-card border border-hairline rounded-md">
        <h3 className="text-xl font-bold uppercase tracking-[1.5px] text-m-red">
          403 — Access Denied
        </h3>
        <p className="text-sm font-light text-muted-text mt-2">
          Only managers and administrators are authorized to manage category specifications.
        </p>
      </div>
    );
  }

  const actions = (
    <Button
      variant="primary"
      onClick={handleOpenAdd}
      className="text-xs h-10"
    >
      <Plus size={14} className=" inline" /> Add Category
    </Button>
  );

  const isPending = createCategory.isPending || updateCategory.isPending || deleteCategory.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Task Categories"
        description="Configure work categories linked to daily logs. System categories are locked and protected."
        actions={actions}
      />

      {isLoading ? (
        <SkeletonTable rows={5} cols={4} />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No Categories Logged"
          description="Create task categories to associate them with timesheet logs."
          action={
            <Button variant="primary" onClick={handleOpenAdd} className="text-xs">
              Add Your First Category
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="border border-hairline bg-canvas rounded-md overflow-hidden">
            <Table>
              <Table.Header>
                <Table.Row className="bg-surface-soft">
                  <Table.Head>Category Name</Table.Head>
                  <Table.Head>Type</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head className="text-right">Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {paginatedCategories.map((category) => (
                  <Table.Row key={category.id}>
                    <Table.Cell className="font-bold text-primary-text  tracking-[0.5px]">
                      <div className="flex items-center gap-2">
                        {category.name}
                        {category.is_system && (
                          <Lock size={12} className="text-muted-text" title="System Locked" />
                        )}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-xs font-light capitalize text-body-text">
                        {category.is_system ? 'system' : 'custom'}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant={category.is_active ? 'success' : 'muted'}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        {!category.is_system && (
                          <Button
                            variant="secondary"
                            onClick={() => handleToggleStatus(category)}
                            disabled={isPending}
                            className="text-[10px] h-8 px-2.5"
                          >
                            {category.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(category)}
                          className={`p-2 transition-colors ${
                            category.is_system ? 'text-hairline cursor-not-allowed' : 'text-muted-text hover:text-primary-text'
                          }`}
                          disabled={category.is_system || isPending}
                          title={category.is_system ? "System locked" : "Edit Category"}
                        >
                          <Edit2 size={16} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(category.id)}
                            className={`p-2 transition-colors ${
                              category.is_system ? 'text-hairline cursor-not-allowed' : 'text-muted-text hover:text-m-red'
                            }`}
                            disabled={category.is_system || isPending}
                            title={category.is_system ? "System locked" : "Delete Category"}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center pt-2">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(p) => setCurrentPage(p)}
              />
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editingCategory ? "Edit Category" : "Add Category"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Category Name"
            type="text"
            placeholder="Enter category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
          />

          {editingCategory && (
            <div className="flex items-center gap-3 py-2 select-none">
              <input
                type="checkbox"
                id="is_active_checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded-sm border border-hairline bg-canvas accent-bmw-blue focus:ring-bmw-blue/30"
                disabled={isPending}
              />
              <label htmlFor="is_active_checkbox" className="text-sm text-body-text cursor-pointer hover:text-primary-text">
                Category is active and accepting entries
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-hairline">
            <Button
              variant="secondary"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isPending}
            >
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
