import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useCreateCategory } from '@/lib/hooks/useCategories';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

export default function CreateCategoryModal({ isOpen, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const createCategory = useCreateCategory();

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!name || name.trim().length < 2) {
      toast.error("Category name must be at least 2 characters long");
      return;
    }

    createCategory.mutate(name.trim(), {
      onSuccess: (newCat) => {
        console.log('[CreateCategoryModal] Mutate onSuccess raw response:', newCat);
        toast.success("Category created successfully");
        setName('');
        console.log('[CreateCategoryModal] Invoking parent onSuccess...');
        if (onSuccess) onSuccess(newCat);
        onClose();
      },
      onError: (err) => {
        toast.error(err.message || "Failed to create category");
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Category"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Category Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Documentation, Client Meeting"
          required
          disabled={createCategory.isPending}
          className="bg-surface-card text-primary-text border-hairline focus:border-[#cc785c]"
        />
        
        <div className="flex justify-end gap-3 pt-5 border-t border-hairline bg-surface-card text-primary-text">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={createCategory.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={createCategory.isPending}
          >
            Create category
          </Button>
        </div>
      </form>
    </Modal>
  );
}
