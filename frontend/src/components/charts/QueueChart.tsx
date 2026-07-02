import { Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface QueueChartProps {
  data: Array<{ name: string; value: number }>;
}

export function QueueChart({ data }: QueueChartProps) {
  return (
    <div className="chart-card">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100} paddingAngle={2} stroke="#0f172a">
            <Tooltip />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
