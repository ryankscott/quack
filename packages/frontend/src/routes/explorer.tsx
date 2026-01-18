import { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { FileList } from '@/components/FileList';
import { TableList } from '@/components/TableList';
import { TablePreview } from '@/components/TablePreview';

export function ExplorerPage() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <div className="w-80 border-r border-quack-dark border-opacity-10 flex flex-col overflow-hidden bg-white">
        <FileUpload />
        <div className="flex-1 min-h-0 overflow-auto">
          <FileList onTableCreated={setSelectedTable} />
          <TableList selectedTable={selectedTable} onSelectTable={setSelectedTable} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 overflow-hidden bg-quack-gold_bg">
        <TablePreview tableName={selectedTable} />
      </div>
    </div>
  );
}
