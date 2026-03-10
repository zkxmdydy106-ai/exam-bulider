import React from 'react';
import classes from './TableBlock.module.css';

interface TableBlockProps {
    tableData: { rows: number; cols: number; cells: string[][] };
    onChange: (tableData: { rows: number; cols: number; cells: string[][] }) => void;
}

const TableBlock: React.FC<TableBlockProps> = ({ tableData, onChange }) => {
    const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
        const newCells = [...tableData.cells];
        newCells[rowIndex] = [...newCells[rowIndex]];
        newCells[rowIndex][colIndex] = value;
        onChange({ ...tableData, cells: newCells });
    };

    const addRow = () => {
        const newRow = Array(tableData.cols).fill('');
        onChange({
            ...tableData,
            rows: tableData.rows + 1,
            cells: [...tableData.cells, newRow]
        });
    };

    const addCol = () => {
        const newCells = tableData.cells.map(row => [...row, '']);
        onChange({
            ...tableData,
            cols: tableData.cols + 1,
            cells: newCells
        });
    };

    return (
        <div className={classes.tableWrapper}>
            <div className={classes.tableControls}>
                <button onClick={addRow} className={classes.controlBtn}>+ 행 추가</button>
                <button onClick={addCol} className={classes.controlBtn}>+ 열 추가</button>
                <span className={classes.dimInfo}>(MVP: 셀 병합 미지원)</span>
            </div>
            <table className={classes.editorTable}>
                <tbody>
                    {tableData.cells.map((row, rIndex) => (
                        <tr key={rIndex}>
                            {row.map((cell, cIndex) => (
                                <td key={cIndex} className={classes.cell}>
                                    <input
                                        type="text"
                                        value={cell}
                                        onChange={(e) => handleCellChange(rIndex, cIndex, e.target.value)}
                                        className={classes.cellInput}
                                    />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default TableBlock;
