/**
 * ROI breakdown bar chart component.
 *
 * Renders a horizontal bar chart showing profit/ROI by category
 * (site, game type, or buy-in bracket).
 *
 * @component ROIBreakdown
 */
"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

interface BreakdownItem {
  group: string;
  count: number;
  invested: number;
  profit: number;
  roi: number;
}

interface ROIBreakdownProps {
  data: BreakdownItem[];
  title: string;
}

export function ROIBreakdown({ data, title }: ROIBreakdownProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No data
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 5, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: "#888" }}
              tickFormatter={(v) => `$${v}`}
            />
            <YAxis
              dataKey="group"
              type="category"
              tick={{ fontSize: 10, fill: "#888" }}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1c1c1e",
                border: "1px solid #333",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value, name) => [
                `$${Number(value).toFixed(2)}`,
                name === "profit" ? "Profit" : String(name),
              ]}
            />
            <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.profit >= 0 ? "#22c55e" : "#ef4444"}
                  fillOpacity={0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table below chart */}
      <div className="mt-2 text-xs">
        <table className="w-full">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-1">Category</th>
              <th className="text-right py-1">Games</th>
              <th className="text-right py-1">Invested</th>
              <th className="text-right py-1">Profit</th>
              <th className="text-right py-1">ROI</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.group} className="border-b border-border/50">
                <td className="py-1">{d.group}</td>
                <td className="text-right tabular-nums">{d.count}</td>
                <td className="text-right tabular-nums">${d.invested.toFixed(0)}</td>
                <td
                  className={`text-right tabular-nums font-medium ${
                    d.profit >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {d.profit >= 0 ? "+" : ""}${d.profit.toFixed(0)}
                </td>
                <td
                  className={`text-right tabular-nums ${
                    d.roi >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {d.roi.toFixed(0)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
