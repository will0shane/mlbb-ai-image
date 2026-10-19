import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "../components/Navbar";
import { SummaryCards } from "../components/SummaryCards";
import { KeyTable } from "../components/KeyTable";
import { CreateKeysModal } from "../components/CreateKeysModal";
import { IconUploadSection } from "../components/IconUploadSection";
import { ActionDialog, ActionType } from "../components/ActionDialog";
import { Toast } from "../components/Toast";
import { KeyItem, SummaryStats, ToastMessage } from "../types";
import {
  fnListKeys,
  fnRevokeKey,
  fnRestoreKey,
  fnResetDevice,
  fnExtendKey,
  fnDeleteKey,
} from "../firebase";

export const DashboardPage: React.FC = () => {
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Search & Filter
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Pagination
  const [cursors, setCursors] = useState<string[]>([]);
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);

  // Modals & Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [selectedKeyItem, setSelectedKeyItem] = useState<KeyItem | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Summary metrics computed across fetched data / active keys
  const [stats, setStats] = useState<SummaryStats>({
    total: 0,
    active: 0,
    expiringSoon: 0,
    unused: 0,
  });

  const showToast = useCallback((type: "success" | "error" | "info", message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPageIndex(0);
      setCursors([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch keys
  const fetchKeys = useCallback(
    async (cursorVal?: string, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const res = await fnListKeys({
          search: debouncedSearch.trim() || undefined,
          status: statusFilter || undefined,
          limit: 50,
          cursor: cursorVal,
        });

        const fetchedKeys = res.data.keys || [];
        setKeys(fetchedKeys);
        setHasMore(!!res.data.nextCursor);

        // Compute summary metrics
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        let activeCount = 0;
        let expiringCount = 0;
        let unusedCount = 0;

        fetchedKeys.forEach((k) => {
          if (k.status === "active") activeCount++;
          if (k.status === "unused") unusedCount++;
          if (
            (k.status === "active" || k.status === "available") &&
            k.timeLeftMs !== null &&
            k.timeLeftMs > 0 &&
            k.timeLeftMs <= threeDaysMs
          ) {
            expiringCount++;
          }
        });

        setStats({
          total: fetchedKeys.length,
          active: activeCount,
          expiringSoon: expiringCount,
          unused: unusedCount,
        });
      } catch (err: any) {
        showToast("error", err.message || "Failed to load keys.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedSearch, statusFilter, showToast]
  );

  useEffect(() => {
    const currentCursor = pageIndex > 0 ? cursors[pageIndex - 1] : undefined;
    fetchKeys(currentCursor);
  }, [fetchKeys, pageIndex]);

  const handleNextPage = () => {
    if (keys.length > 0 && hasMore) {
      const lastKey = keys[keys.length - 1].key;
      setCursors((prev) => {
        const next = [...prev];
        next[pageIndex] = lastKey;
        return next;
      });
      setPageIndex((p) => p + 1);
    }
  };

  const handlePrevPage = () => {
    if (pageIndex > 0) {
      setPageIndex((p) => p - 1);
    }
  };

  const handleActionClick = (action: ActionType, item: KeyItem) => {
    setSelectedKeyItem(item);
    setActiveAction(action);
  };

  const handleConfirmAction = async (
    action: ActionType,
    key: string,
    extraDays?: number
  ) => {
    try {
      if (action === "revoke") {
        await fnRevokeKey({ key });
        showToast("success", `Key revoked successfully.`);
      } else if (action === "restore") {
        await fnRestoreKey({ key });
        showToast("success", `Key restored successfully.`);
      } else if (action === "resetDevice") {
        await fnResetDevice({ key });
        showToast("success", `Device binding reset.`);
      } else if (action === "extend") {
        await fnExtendKey({ key, days: extraDays || 7 });
        showToast("success", `Key extended by ${extraDays} days.`);
      } else if (action === "delete") {
        await fnDeleteKey({ key });
        showToast("success", `Key deleted.`);
      }
      // Refresh list
      const currentCursor = pageIndex > 0 ? cursors[pageIndex - 1] : undefined;
      fetchKeys(currentCursor, true);
    } catch (err: any) {
      showToast("error", err.message || `Failed to execute ${action}.`);
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">
      <Navbar
        onRefresh={() => {
          const currentCursor = pageIndex > 0 ? cursors[pageIndex - 1] : undefined;
          fetchKeys(currentCursor, true);
        }}
        refreshing={refreshing}
        onOpenCreateModal={() => setIsCreateOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Metric Cards */}
        <SummaryCards stats={stats} loading={loading && keys.length === 0} />

        {/* App Icon Upload */}
        <IconUploadSection showToast={showToast} />

        {/* Table & Actions */}
        <KeyTable
          keys={keys}
          loading={loading}
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={(val) => {
            setStatusFilter(val);
            setPageIndex(0);
            setCursors([]);
          }}
          onActionClick={handleActionClick}
          hasMore={hasMore}
          onNextPage={handleNextPage}
          onPrevPage={handlePrevPage}
          pageIndex={pageIndex}
        />
      </main>

      {/* Create Keys Modal */}
      <CreateKeysModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => {
          setPageIndex(0);
          setCursors([]);
          fetchKeys(undefined, true);
        }}
        showToast={showToast}
      />

      {/* Row Action Confirmation Dialog */}
      <ActionDialog
        isOpen={activeAction !== null}
        action={activeAction}
        keyItem={selectedKeyItem}
        onClose={() => {
          setActiveAction(null);
          setSelectedKeyItem(null);
        }}
        onConfirm={handleConfirmAction}
      />

      {/* Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
