import { Table, type TableProps } from 'antd';

export function DataTable<RecordType extends object>(props: TableProps<RecordType>) {
    return (
        <div className="cms-table overflow-x-auto">
            <Table<RecordType>
                size="small"
                scroll={{ x: 'max-content' }}
                {...props}
            />
        </div>
    );
}
