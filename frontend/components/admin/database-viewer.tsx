'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDatabase, ColumnFilter, ColumnInfo } from '@/hooks/useDatabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Database,
  Table2,
  Search,
  Play,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Terminal,
  HardDrive,
  Rows3,
  Clock,
  Copy,
  Check,
  RefreshCw,
  Eye,
  Code2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function DatabaseViewer() {
  const {
    tables,
    currentTable,
    tableData,
    queryResult,
    stats,
    isLoading,
    isExecuting,
    error,
    fetchTables,
    fetchTableSchema,
    fetchTableData,
    executeQuery,
    fetchStats,
    clearError,
    clearQueryResult,
  } = useDatabase();

  const [selectedTable, setSelectedTable] = useState<string>('');
  const [sqlQuery, setSqlQuery] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('ASC');
  const [filters, setFilters] = useState<ColumnFilter[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'sql'>('table');
  const [cellDetailDialog, setCellDetailDialog] = useState<{ column: string; value: any } | null>(null);

  useEffect(() => {
    fetchTables();
    fetchStats();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchTableSchema(selectedTable);
      loadTableData();
    }
  }, [selectedTable]);

  useEffect(() => {
    if (selectedTable) {
      loadTableData();
    }
  }, [page, pageSize, sortColumn, sortDirection, filters]);

  const loadTableData = useCallback(() => {
    if (!selectedTable) return;
    fetchTableData({
      table: selectedTable,
      page,
      page_size: pageSize,
      sort_column: sortColumn || undefined,
      sort_direction: sortDirection,
      filters: filters.length > 0 ? filters : undefined,
    });
  }, [selectedTable, page, pageSize, sortColumn, sortDirection, filters]);

  const handleExecuteQuery = async () => {
    if (!sqlQuery.trim()) return;
    await executeQuery(sqlQuery);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortColumn(column);
      setSortDirection('ASC');
    }
    setPage(1);
  };

  const addFilter = () => {
    if (currentTable?.columns.length) {
      setFilters([...filters, { column: currentTable.columns[0].name, operator: 'eq', value: '' }]);
    }
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, field: keyof ColumnFilter, value: string) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    setFilters(newFilters);
  };

  const applyFilters = () => {
    setPage(1);
    loadTableData();
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedCell(id);
    setTimeout(() => setCopiedCell(null), 2000);
  };

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const truncateValue = (value: any, maxLen: number = 50): string => {
    const str = formatCellValue(value);
    if (str.length > maxLen) return str.substring(0, maxLen) + '...';
    return str;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getSampleQueries = useMemo(() => {
    if (!selectedTable || !currentTable) return [];
    const cols = currentTable.columns.map(c => c.name).slice(0, 5).join(', ');
    return [
      `SELECT * FROM "${selectedTable}" LIMIT 10`,
      `SELECT COUNT(*) FROM "${selectedTable}"`,
      `SELECT ${cols} FROM "${selectedTable}" ORDER BY ${currentTable.columns[0]?.name || 'id'} DESC LIMIT 20`,
      `PRAGMA table_info("${selectedTable}")`,
    ];
  }, [selectedTable, currentTable]);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Таблицы</p>
                  <p className="text-2xl font-bold">{stats?.total_tables || 0}</p>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-full">
                  <Table2 className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Всего записей</p>
                  <p className="text-2xl font-bold">{stats?.total_rows?.toLocaleString() || 0}</p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-full">
                  <Rows3 className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Размер БД</p>
                  <p className="text-2xl font-bold">{formatBytes(stats?.database_size_bytes || 0)}</p>
                </div>
                <div className="p-3 bg-purple-500/20 rounded-full">
                  <HardDrive className="h-6 w-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Выбрано</p>
                  <p className="text-2xl font-bold truncate">{selectedTable || '-'}</p>
                </div>
                <div className="p-3 bg-orange-500/20 rounded-full">
                  <Database className="h-6 w-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tables List */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1"
        >
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Таблицы
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { fetchTables(); fetchStats(); }}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full px-4 pb-4">
                <div className="space-y-1">
                  {tables.map((table, index) => (
                    <motion.div
                      key={table.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <button
                        onClick={() => {
                          setSelectedTable(table.name);
                          setPage(1);
                          setFilters([]);
                          setSortColumn('');
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200",
                          "hover:bg-accent/50",
                          selectedTable === table.name
                            ? "bg-primary/10 border border-primary/30 shadow-sm"
                            : "bg-muted/30"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Table2 className={cn(
                            "h-4 w-4 flex-shrink-0",
                            selectedTable === table.name ? "text-primary" : "text-muted-foreground"
                          )} />
                          <span className="truncate text-sm font-medium">{table.name}</span>
                        </div>
                        <Badge variant="secondary" className="ml-2 flex-shrink-0">
                          {table.row_count.toLocaleString()}
                        </Badge>
                      </button>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3"
        >
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'sql')}>
            <Card className="min-h-[600px] flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <TabsList>
                      <TabsTrigger value="table" className="gap-2">
                        <Eye className="h-4 w-4" />
                        Просмотр
                      </TabsTrigger>
                      <TabsTrigger value="sql" className="gap-2">
                        <Terminal className="h-4 w-4" />
                        SQL
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {viewMode === 'table' && selectedTable && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                        className="gap-2"
                      >
                        <Filter className="h-4 w-4" />
                        Фильтры
                        {filters.length > 0 && (
                          <Badge variant="secondary" className="ml-1">
                            {filters.length}
                          </Badge>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadTableData}
                        disabled={isLoading}
                        className="gap-2"
                      >
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        Обновить
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col overflow-hidden">
                <TabsContent value="table" className="flex-1 flex flex-col m-0 overflow-hidden">
                  {!selectedTable ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <Database className="h-16 w-16 mx-auto mb-4 opacity-20" />
                        <p>Выберите таблицу для просмотра данных</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Filters Panel */}
                      <AnimatePresence>
                        {showFilters && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mb-4 overflow-hidden"
                          >
                            <Card className="bg-muted/30">
                              <CardContent className="pt-4 space-y-3">
                                {filters.map((filter, index) => (
                                  <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-2 flex-wrap"
                                  >
                                    <Select
                                      value={filter.column}
                                      onValueChange={(v) => updateFilter(index, 'column', v)}
                                    >
                                      <SelectTrigger className="w-[180px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {currentTable?.columns.map((col) => (
                                          <SelectItem key={col.name} value={col.name}>
                                            {col.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>

                                    <Select
                                      value={filter.operator}
                                      onValueChange={(v) => updateFilter(index, 'operator', v)}
                                    >
                                      <SelectTrigger className="w-[140px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="eq">=</SelectItem>
                                        <SelectItem value="neq">!=</SelectItem>
                                        <SelectItem value="gt">&gt;</SelectItem>
                                        <SelectItem value="lt">&lt;</SelectItem>
                                        <SelectItem value="gte">&gt;=</SelectItem>
                                        <SelectItem value="lte">&lt;=</SelectItem>
                                        <SelectItem value="like">LIKE</SelectItem>
                                        <SelectItem value="is_null">IS NULL</SelectItem>
                                        <SelectItem value="is_not_null">IS NOT NULL</SelectItem>
                                      </SelectContent>
                                    </Select>

                                    {!['is_null', 'is_not_null'].includes(filter.operator) && (
                                      <Input
                                        value={filter.value || ''}
                                        onChange={(e) => updateFilter(index, 'value', e.target.value)}
                                        placeholder="Значение..."
                                        className="w-[200px]"
                                      />
                                    )}

                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeFilter(index)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </motion.div>
                                ))}

                                <div className="flex items-center gap-2">
                                  <Button variant="outline" size="sm" onClick={addFilter}>
                                    + Добавить фильтр
                                  </Button>
                                  {filters.length > 0 && (
                                    <Button size="sm" onClick={applyFilters}>
                                      Применить
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Table Data */}
                      <div className="flex-1 overflow-auto border rounded-lg">
                        {isLoading ? (
                          <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          </div>
                        ) : tableData?.rows.length === 0 ? (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            <div className="text-center">
                              <Rows3 className="h-12 w-12 mx-auto mb-2 opacity-20" />
                              <p>Нет данных</p>
                            </div>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader className="sticky top-0 bg-background z-10">
                              <TableRow>
                                {tableData?.columns.map((col) => (
                                  <TableHead
                                    key={col.name}
                                    className="cursor-pointer hover:bg-muted/50 whitespace-nowrap"
                                    onClick={() => handleSort(col.name)}
                                  >
                                    <div className="flex items-center gap-1">
                                      <span>{col.name}</span>
                                      <Badge variant="outline" className="text-[10px] px-1 py-0 font-normal">
                                        {col.column_type}
                                      </Badge>
                                      {sortColumn === col.name ? (
                                        sortDirection === 'ASC' ? (
                                          <ArrowUp className="h-3 w-3 text-primary" />
                                        ) : (
                                          <ArrowDown className="h-3 w-3 text-primary" />
                                        )
                                      ) : (
                                        <ArrowUpDown className="h-3 w-3 opacity-30" />
                                      )}
                                    </div>
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {tableData?.rows.map((row, rowIndex) => (
                                <motion.tr
                                  key={rowIndex}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: rowIndex * 0.02 }}
                                  className="hover:bg-muted/30 transition-colors"
                                >
                                  {row.map((cell, colIndex) => {
                                    const cellId = `${rowIndex}-${colIndex}`;
                                    const fullValue = formatCellValue(cell);
                                    const isLong = fullValue.length > 50;

                                    return (
                                      <TableCell
                                        key={colIndex}
                                        className={cn(
                                          "font-mono text-sm max-w-[300px] group relative",
                                          cell === null && "text-muted-foreground italic"
                                        )}
                                      >
                                        <div className="flex items-center gap-1">
                                          <span className="truncate">
                                            {truncateValue(cell)}
                                          </span>
                                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                            {isLong && (
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => setCellDetailDialog({
                                                  column: tableData.columns[colIndex].name,
                                                  value: cell
                                                })}
                                              >
                                                <Eye className="h-3 w-3" />
                                              </Button>
                                            )}
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6"
                                              onClick={() => copyToClipboard(fullValue, cellId)}
                                            >
                                              {copiedCell === cellId ? (
                                                <Check className="h-3 w-3 text-green-500" />
                                              ) : (
                                                <Copy className="h-3 w-3" />
                                              )}
                                            </Button>
                                          </div>
                                        </div>
                                      </TableCell>
                                    );
                                  })}
                                </motion.tr>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>

                      {/* Pagination */}
                      {tableData && tableData.total_pages > 1 && (
                        <div className="flex items-center justify-between pt-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              Показано {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, tableData.total_rows)} из {tableData.total_rows}
                            </span>
                            <Select
                              value={pageSize.toString()}
                              onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
                            >
                              <SelectTrigger className="w-[80px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setPage(page - 1)}
                              disabled={page <= 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm px-3">
                              {page} / {tableData.total_pages}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setPage(page + 1)}
                              disabled={page >= tableData.total_pages}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="sql" className="flex-1 flex flex-col m-0 space-y-4">
                  {/* SQL Editor */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">SQL Запрос</span>
                      {selectedTable && getSampleQueries.length > 0 && (
                        <Select onValueChange={(v) => setSqlQuery(v)}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Примеры запросов..." />
                          </SelectTrigger>
                          <SelectContent>
                            {getSampleQueries.map((q, i) => (
                              <SelectItem key={i} value={q}>
                                {q.substring(0, 40)}...
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <Textarea
                      value={sqlQuery}
                      onChange={(e) => setSqlQuery(e.target.value)}
                      placeholder="SELECT * FROM table_name WHERE ..."
                      className="font-mono min-h-[120px] bg-muted/30"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleExecuteQuery}
                        disabled={isExecuting || !sqlQuery.trim()}
                        className="gap-2"
                      >
                        {isExecuting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        Выполнить
                      </Button>
                      {queryResult && (
                        <Button variant="outline" onClick={clearQueryResult}>
                          Очистить
                        </Button>
                      )}
                      {queryResult && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
                          <Clock className="h-4 w-4" />
                          {queryResult.execution_time_ms} мс
                          <span className="mx-2">|</span>
                          <Rows3 className="h-4 w-4" />
                          {queryResult.row_count} записей
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Query Result */}
                  <div className="flex-1 overflow-auto border rounded-lg">
                    {error ? (
                      <div className="flex items-center justify-center h-full p-4">
                        <div className="text-center text-destructive">
                          <X className="h-8 w-8 mx-auto mb-2" />
                          <p className="font-medium">Ошибка выполнения</p>
                          <p className="text-sm mt-1">{error}</p>
                          <Button variant="outline" size="sm" className="mt-2" onClick={clearError}>
                            Закрыть
                          </Button>
                        </div>
                      </div>
                    ) : queryResult ? (
                      queryResult.rows.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <div className="text-center">
                            <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
                            <p>Запрос выполнен успешно</p>
                            <p className="text-sm">Результат пуст</p>
                          </div>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow>
                              {queryResult.columns.map((col, i) => (
                                <TableHead key={i} className="whitespace-nowrap">
                                  {col}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {queryResult.rows.map((row, rowIndex) => (
                              <motion.tr
                                key={rowIndex}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: rowIndex * 0.02 }}
                                className="hover:bg-muted/30"
                              >
                                {row.map((cell, colIndex) => (
                                  <TableCell
                                    key={colIndex}
                                    className={cn(
                                      "font-mono text-sm max-w-[300px]",
                                      cell === null && "text-muted-foreground italic"
                                    )}
                                  >
                                    {truncateValue(cell)}
                                  </TableCell>
                                ))}
                              </motion.tr>
                            ))}
                          </TableBody>
                        </Table>
                      )
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                          <Code2 className="h-12 w-12 mx-auto mb-2 opacity-20" />
                          <p>Введите SQL запрос и нажмите "Выполнить"</p>
                          <p className="text-sm mt-1">Разрешены только SELECT, PRAGMA и EXPLAIN запросы</p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </motion.div>
      </div>

      {/* Cell Detail Dialog */}
      <Dialog open={!!cellDetailDialog} onOpenChange={() => setCellDetailDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              {cellDetailDialog?.column}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <pre className="font-mono text-sm bg-muted/50 p-4 rounded-lg whitespace-pre-wrap break-all">
              {formatCellValue(cellDetailDialog?.value)}
            </pre>
          </ScrollArea>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => copyToClipboard(formatCellValue(cellDetailDialog?.value), 'dialog')}
            >
              <Copy className="h-4 w-4 mr-2" />
              Копировать
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
