'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/stores/authStore';
import {
  useClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient
} from '@/lib/hooks/useClients';
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
import { Briefcase, Plus, Edit2, Trash2 } from 'lucide-react';

export default function ClientsPage() {
  const { user } = useAuthStore();
  const role = user?.role || 'employee';
  const isAdmin = role === 'admin';

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Queries & Mutations
  const { data: clients = [], isLoading, refetch } = useClients({ include_inactive: 'true' });
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  // Reset page when clients length changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [clients.length]);

  const totalPages = Math.ceil(clients.length / itemsPerPage);
  const paginatedClients = clients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenAdd = () => {
    setEditingClient(null);
    setName('');
    setIsActive(true);
    setIsOpen(true);
  };

  const handleOpenEdit = (client) => {
    setEditingClient(client);
    setName(client.name);
    setIsActive(client.is_active);
    setIsOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || name.trim().length < 2) {
      toast.error("Client name must be at least 2 characters long");
      return;
    }

    if (editingClient) {
      updateClient.mutate({
        id: editingClient.id,
        data: { name: name.trim(), is_active: isActive }
      }, {
        onSuccess: () => {
          toast.success("Client updated successfully");
          setIsOpen(false);
          refetch();
        },
        onError: (err) => {
          toast.error(err.message || "Failed to update client");
        }
      });
    } else {
      createClient.mutate(name.trim(), {
        onSuccess: () => {
          toast.success("Client created successfully");
          setIsOpen(false);
          refetch();
        },
        onError: (err) => {
          toast.error(err.message || "Failed to create client");
        }
      });
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this client? This operation cannot be undone.")) {
      deleteClient.mutate(id, {
        onSuccess: () => {
          toast.success("Client deleted successfully");
          refetch();
        },
        onError: (err) => {
          toast.error(err.message || "Failed to delete client");
        }
      });
    }
  };

  const handleToggleStatus = (client) => {
    updateClient.mutate({
      id: client.id,
      data: { name: client.name, is_active: !client.is_active }
    }, {
      onSuccess: () => {
        toast.success(`Client ${!client.is_active ? 'activated' : 'deactivated'} successfully`);
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
          Only managers and administrators are authorized to manage client portfolios.
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
      <Plus size={14} className=" inline" /> Add Client
    </Button>
  );

  const isPending = createClient.isPending || updateClient.isPending || deleteClient.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Accounts"
        description="Configure client names and activity toggles linked to daily task reports."
        actions={actions}
      />

      {isLoading ? (
        <SkeletonTable rows={5} cols={3} />
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No Clients Logged"
          description="Create client records to associate them with timesheet tasks."
          action={
            <Button variant="primary" onClick={handleOpenAdd} className="text-xs">
              Add Your First Client
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="border border-hairline bg-canvas rounded-md overflow-hidden">
            <Table>
              <Table.Header>
                <Table.Row className="bg-surface-soft">
                  <Table.Head>Client Name</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head className="text-right">Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {paginatedClients.map((client) => (
                  <Table.Row key={client.id}>
                    <Table.Cell className="font-bold text-primary-text  tracking-[0.5px]">
                      {client.name}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant={client.is_active ? 'success' : 'muted'}>
                        {client.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Button
                          variant="secondary"
                          onClick={() => handleToggleStatus(client)}
                          disabled={isPending}
                          className="text-[10px] h-8 px-2.5"
                        >
                          {client.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <button
                          onClick={() => handleOpenEdit(client)}
                          className="p-2 text-muted-text hover:text-primary-text transition-colors"
                          disabled={isPending}
                          title="Edit Client"
                        >
                          <Edit2 size={16} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(client.id)}
                            className="p-2 text-muted-text hover:text-m-red transition-colors"
                            disabled={isPending}
                            title="Delete Client"
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
        title={editingClient ? "Edit Client" : "Add Client"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Client Name"
            type="text"
            placeholder="Enter client name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
          />

          {editingClient && (
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
                Client is active and accepting entries
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
              {editingClient ? 'Save Changes' : 'Create Client'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
