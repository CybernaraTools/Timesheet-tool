import React from "react";

const TablePartContext = React.createContext({ isHeader: false });

/**
 * Table — follows the Anthropic design system.
 *
 * Surface: canvas bg, hairline dividers, surface-soft header row.
 * Typography: body-sm (14px/400) for cells, caption (13px/500) for headers.
 * Border: 1px hairline, rounded-lg container (12px) with overflow hidden.
 * Layout: Uses border-separate & border-spacing-0 to prevent collapsed border bugs on rounded corners.
 */
export default function Table({ children, className = "", ...props }) {
  return (
    <div className="w-full overflow-x-auto border border-[#e6dfd8] dark:border-[#3c3c3c]  overflow-hidden">
      <table
        className={`w-full border-separate border-spacing-0 text-left bg-[#faf9f5] dark:bg-[#181715] ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

Table.Header = function TableHeader({ children, className = "", ...props }) {
  return (
    <TablePartContext.Provider value={{ isHeader: true }}>
      <thead
        className={`bg-[#f5f0e8] dark:bg-[#1f1e1b] ${className}`}
        {...props}
      >
        {children}
      </thead>
    </TablePartContext.Provider>
  );
};

Table.Body = function TableBody({ children, className = "", ...props }) {
  return (
    <TablePartContext.Provider value={{ isHeader: false }}>
      <tbody className={className} {...props}>
        {children}
      </tbody>
    </TablePartContext.Provider>
  );
};

Table.Row = function TableRow({ children, className = "", hover, ...props }) {
  const { isHeader } = React.useContext(TablePartContext);
  const shouldHover = hover !== undefined ? hover : !isHeader;

  return (
    <tr
      className={[
        "group",
        shouldHover ? "hover:bg-[#f5f0e8] dark:hover:bg-[#1f1e1b] transition-colors duration-100" : "",
        className
      ].join(" ")}
      {...props}
    >
      {children}
    </tr>
  );
};

Table.Head = function TableHead({ children, className = "", ...props }) {
  return (
    <th
      className={`px-5 py-3 text-[12px] font-semibold text-[#6c6a64] dark:text-[#8e8b82] whitespace-nowrap select-none border-b border-[#e6dfd8] dark:border-[#3c3c3c] first:rounded-tl-xl last:rounded-tr-xl ${className}`}
      {...props}
    >
      {children}
    </th>
  );
};

Table.Cell = function TableCell({ children, className = "", ...props }) {
  return (
    <td
      className={`px-5 py-4 text-[14px] font-normal text-[#3d3d3a] dark:text-[#a09d96] align-middle border-b border-[#e6dfd8] dark:border-[#3c3c3c] group-last:border-b-0 group-last:first:rounded-bl-xl group-last:last:rounded-br-xl ${className}`}
      {...props}
    >
      {children}
    </td>
  );
};
