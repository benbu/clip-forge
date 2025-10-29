import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Clock, RotateCcw, Trash2 } from 'lucide-react';
import { persistenceService } from '@/services/persistenceService';

export function SessionRecoveryModal({ isOpen, onClose, onRestore }) {
  const [backups, setBackups] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const backupList = persistenceService.getBackups();
      setBackups(backupList);
    }
  }, [isOpen]);

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Unknown time';
    }
  };

  const handleRestore = async (backup) => {
    await persistenceService.restoreBackup(backup);
    if (onRestore) onRestore();
    onClose();
  };

  const handleDelete = async (backupId) => {
    setDeletingId(backupId);
    try {
      persistenceService.deleteBackup(backupId);
      setBackups((prev) => prev.filter((b) => b.id !== backupId));
      
      // If we deleted the last backup, close the modal
      const remaining = backups.filter((b) => b.id !== backupId);
      if (remaining.length === 0) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to delete backup:', error);
    } finally {
      setDeletingId(null);
    }
  };

  if (backups.length === 0) {
    return null;
  }

  const clipCount = (backup) => {
    return backup?.data?.timeline?.clips?.length || 0;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Recovery Sessions Available"
      size="lg"
    >
      <div className="space-y-4">
        <p className="text-sm text-zinc-400">
          ClipForge did not close cleanly. You can restore from one of these autosaved sessions or continue without restoring.
        </p>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {backups.map((backup) => (
            <div
              key={backup.id}
              className="flex items-center justify-between p-3 rounded-md border border-white/10 bg-zinc-800/50 hover:bg-zinc-800 transition"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Clock className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-100 truncate">
                    {formatTimestamp(backup.timestamp)}
                  </div>
                  <div className="text-xs text-zinc-400">
                    {clipCount(backup)} clip{clipCount(backup) !== 1 ? 's' : ''} • {backup.id.slice(0, 8)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 className="h-4 w-4" />}
                  iconOnly
                  onClick={() => handleDelete(backup.id)}
                  disabled={deletingId === backup.id}
                  ariaLabel="Delete session"
                />
                <Button
                  variant="primary"
                  size="sm"
                  icon={<RotateCcw className="h-4 w-4" />}
                  onClick={() => handleRestore(backup)}
                >
                  Restore
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
          <Button variant="ghost" onClick={onClose}>
            Continue Without Restoring
          </Button>
        </div>
      </div>
    </Modal>
  );
}
